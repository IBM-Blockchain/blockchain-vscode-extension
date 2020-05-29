/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
*/

import * as vscode from 'vscode';
import * as semver from 'semver';
import { LocalEnvironmentManager } from '../fabric/environments/LocalEnvironmentManager';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricChaincode, FabricEnvironmentRegistry, FabricEnvironmentRegistryEntry, IFabricEnvironmentConnection, LogType, IFabricGatewayConnection, FabricGatewayRegistry, EnvironmentType } from 'ibm-blockchain-platform-common';
import { URL } from 'url';
import { FabricEnvironmentManager } from '../fabric/environments/FabricEnvironmentManager';
import { GlobalState, ExtensionData } from '../util/GlobalState';
import { SettingConfigurations } from '../../configurations';
import { ExtensionUtil } from '../util/ExtensionUtil';
import { LocalEnvironment } from '../fabric/environments/LocalEnvironment';
import { UserInputUtil, IBlockchainQuickPickItem } from '../commands/UserInputUtil';
import { FabricGatewayConnectionManager } from '../fabric/FabricGatewayConnectionManager';
import { FabricGatewayRegistryEntry } from 'ibm-blockchain-platform-common/src/registries/FabricGatewayRegistryEntry';

export abstract class FabricDebugConfigurationProvider implements vscode.DebugConfigurationProvider {

    static readonly debugEvent: string = 'contractDebugging';

    // As we can't detect when a debug session has restarted but instead started, stopped and changed (which includes start/stop), we never set environmentName to undefined.
    // Instead, we always set environmentName when a user starts a new debug session.
    // In places such as submitTransaction, we should check there is a correct debug session (with the debugEvent config value) before ever attempting to read environmentName.
    static environmentName: string;

    static orgName: string;

    public static async getInstantiatedChaincode(chaincodeName: string): Promise<FabricChaincode> {
        // Determine what smart contracts are instantiated already
        // Assume Local Fabric has one peer
        const connection: IFabricEnvironmentConnection = await this.getConnection();
        const allInstantiatedContracts: FabricChaincode[] = await connection.getAllInstantiatedChaincodes();
        const smartContractVersionName: FabricChaincode = allInstantiatedContracts.find((contract: FabricChaincode) => {
            return contract.name === chaincodeName;
        });

        return smartContractVersionName;
    }

    public static async connectToGateway(): Promise<boolean> {

        const gatewayConnection: IFabricGatewayConnection = FabricGatewayConnectionManager.instance().getConnection();
        // Get connected gateway registry entry
        const fabricGatewayRegistryEntry: FabricGatewayRegistryEntry = await FabricGatewayConnectionManager.instance().getGatewayRegistryEntry();

        if (!gatewayConnection) {
            // Connect to local_fabric gateway before submitting/evaluating transaction
            const runtimeGateway: FabricGatewayRegistryEntry = await FabricGatewayRegistry.instance().get(`${FabricDebugConfigurationProvider.environmentName} - ${FabricDebugConfigurationProvider.orgName}`);
            // Assume one runtime gateway registry entry
            await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_GATEWAY, runtimeGateway);
            if (!FabricGatewayConnectionManager.instance().getConnection()) {
                // either the user cancelled or ther was an error so don't carry on
                return false;
            }
        } else if (fabricGatewayRegistryEntry && fabricGatewayRegistryEntry.name !== `${FabricDebugConfigurationProvider.environmentName} - ${FabricDebugConfigurationProvider.orgName}`) {
            // Connect to the gateway the user selected initially (for their chosen org)
            const runtimeGateway: FabricGatewayRegistryEntry = await FabricGatewayRegistry.instance().get(`${FabricDebugConfigurationProvider.environmentName} - ${FabricDebugConfigurationProvider.orgName}`);
            await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT_GATEWAY);
            await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_GATEWAY, runtimeGateway);
            if (!FabricGatewayConnectionManager.instance().getConnection()) {
                // either the user cancelled or ther was an error so don't carry on
                return false;
            }
        }

        return true;
    }

    private static async getConnection(): Promise<IFabricEnvironmentConnection> {
        // check we are connected to the a local fabric
        let connection: IFabricEnvironmentConnection = FabricEnvironmentManager.instance().getConnection();
        if (connection) {
            let environmentRegistryEntry: FabricEnvironmentRegistryEntry = FabricEnvironmentManager.instance().getEnvironmentRegistryEntry();
            if (environmentRegistryEntry.name !== FabricDebugConfigurationProvider.environmentName || environmentRegistryEntry.environmentType !== EnvironmentType.LOCAL_ENVIRONMENT) {
                await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT_ENVIRONMENT);
                environmentRegistryEntry = await FabricEnvironmentRegistry.instance().get(FabricDebugConfigurationProvider.environmentName);
                await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);

            }

            connection = FabricEnvironmentManager.instance().getConnection();
        } else {
            const environmentRegistryEntry: FabricEnvironmentRegistryEntry = await FabricEnvironmentRegistry.instance().get(FabricDebugConfigurationProvider.environmentName);
            await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);
            connection = FabricEnvironmentManager.instance().getConnection();
        }

        if (!connection) {
            throw new Error(`Could not create connection to ${FabricDebugConfigurationProvider.environmentName}`);
        }

        return connection;
    }

    private runtime: LocalEnvironment;

    public async resolveDebugConfiguration(folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration, token?: vscode.CancellationToken): Promise<vscode.DebugConfiguration> {
        const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
        try {
            // If we're running on Eclipse Che, this is not a supported feature.
            if (ExtensionUtil.isChe()) {
                outputAdapter.log(LogType.ERROR, 'Debugging smart contracts is not supported in Eclipse Che or Red Hat CodeReady Workspaces.');
                return;
            }

            const localFabricEnabled: boolean = ExtensionUtil.getExtensionLocalFabricSetting();
            if (!localFabricEnabled) {
                outputAdapter.log(LogType.ERROR, `Setting '${SettingConfigurations.EXTENSION_LOCAL_FABRIC}' must be set to 'true' to enable debugging.`);
                return;
            }

            const extensionData: ExtensionData = GlobalState.get();

            // Stop debug if not got late enough version
            if (!extensionData.generatorVersion || semver.lt(extensionData.generatorVersion, '0.0.36')) {
                outputAdapter.log(LogType.ERROR, `To debug a smart contract, you must update the local runtimes. Teardown all local runtimes, start the runtime to debug, and try again.`);
                return;
            }

            const localRuntimes: IBlockchainQuickPickItem<LocalEnvironment>[] = [];
            const environmentEntries: FabricEnvironmentRegistryEntry[] = await FabricEnvironmentRegistry.instance().getAll(true, true); // Get only local entries

            for (const entry of environmentEntries) {
                const runtime: LocalEnvironment = await LocalEnvironmentManager.instance().ensureRuntime(entry.name, undefined, entry.numberOfOrgs);
                const isRunning: boolean = await runtime.isRunning();
                if (isRunning) {
                    localRuntimes.push({label: entry.name, data: runtime});
                }
            }

            if (localRuntimes.length === 0) {
                outputAdapter.log(LogType.ERROR, `No local environments found for debugging.`);
                return;
            }

            const chosenEnvironment: IBlockchainQuickPickItem<LocalEnvironment> = await UserInputUtil.showQuickPickItem('Select a local environment to debug', localRuntimes) as IBlockchainQuickPickItem<LocalEnvironment>;
            if (!chosenEnvironment) {
                return;
            }

            this.runtime = chosenEnvironment.data;
            FabricDebugConfigurationProvider.environmentName = this.runtime.getName();

            if (!config.env) {
                config.env = {};
            }

            let chaincodeVersion: string;
            let chaincodeName: string;

            if (config.env.CORE_CHAINCODE_ID_NAME) {
                // User has edited their debug configuration - use their version
                chaincodeName = config.env.CORE_CHAINCODE_ID_NAME.split(':')[0];
                chaincodeVersion = config.env.CORE_CHAINCODE_ID_NAME.split(':')[1];
            } else {
                const nameAndVersion: FabricChaincode = await this.getChaincodeNameAndVersion(folder);

                if (!nameAndVersion || !nameAndVersion.name || !nameAndVersion.version) {
                    // User probably cancelled the prompt for the name.
                    return;
                }
                chaincodeName = nameAndVersion.name;
                chaincodeVersion = nameAndVersion.version;
            }

            const replaceRegex: RegExp = /@.*?\//;
            chaincodeName = chaincodeName.replace(replaceRegex, '');

            const smartContract: FabricChaincode = await FabricDebugConfigurationProvider.getInstantiatedChaincode(chaincodeName);

            if (smartContract) {
                const isContainerRunning: boolean = await this.runtime.isRunning([smartContract.name, smartContract.version]);
                if (isContainerRunning) {
                    await vscode.window.withProgress({
                        location: vscode.ProgressLocation.Notification,
                        title: 'IBM Blockchain Platform Extension',
                        cancellable: false
                    }, async (progress: vscode.Progress<{ message: string }>) => {
                        progress.report({ message: 'Removing chaincode container' });
                        await this.runtime.killChaincode([smartContract.name, smartContract.version]);
                    });
                }
            }
            config.env.CORE_CHAINCODE_ID_NAME = `${chaincodeName}:${chaincodeVersion}`;

            // Allow the language specific class to resolve the configuration.
            const resolvedConfig: vscode.DebugConfiguration = await this.resolveDebugConfigurationInner(folder, config, token);

            if (!resolvedConfig) {
                // Cancel if user hasn't selected an org to debug for.
                // Will this break anything else?
                return;
            }

            // Launch a *new* debug session with the resolved configuration.
            // If we leave the name in there, it uses the *old* launch.json configuration with the *new* debug
            // configuration provider, for example a fabric:go configuration with the go debug configuration
            // provider. This results in errors and we need to just force it to use our configuration as-is.
            delete resolvedConfig.name;

            // We need this in order to differentiate between debug events
            resolvedConfig.debugEvent = FabricDebugConfigurationProvider.debugEvent;

            // If the user is connected to a gateway, we should probably disconnect so that if they submit transactions from the tree or command (but not the debug bar).
            // This will ensure that they submit transactions from the correct gateway.
            const connected: boolean = await FabricDebugConfigurationProvider.connectToGateway();
            if (!connected) {
                return;
            }

            await vscode.commands.executeCommand('setContext', 'blockchain-debug', true);
            vscode.debug.startDebugging(folder, resolvedConfig);

            // Cancel the current debug session - the user will never know!
            return undefined;

        } catch (error) {
            outputAdapter.log(LogType.ERROR, `Failed to launch debug: ${error.message}`);
            return;
        }
    }

    protected abstract async getChaincodeNameAndVersion(folder: vscode.WorkspaceFolder | undefined): Promise<FabricChaincode>;

    protected async getChaincodeAddress(): Promise<string> {
        // Need to strip off the protocol (grpc:// or grpcs://).

        if (this.runtime.numberOfOrgs > 1) {
            const orgNames: string[] = await this.runtime.getAllOrganizationNames(false);
            const mspName: string = await UserInputUtil.showQuickPick('Select the organization to debug for', orgNames) as string;
            if (!mspName) {
                FabricDebugConfigurationProvider.orgName = undefined;
                return;
            }
            const _orgName: string = mspName.substr(0, mspName.indexOf('MSP')); // Strip off 'MSP' so it makes getting the gateway easier.
            FabricDebugConfigurationProvider.orgName = _orgName;
        } else {
            FabricDebugConfigurationProvider.orgName = 'Org1'; // It is unlikely this will change.
        }

        const url: string = await this.runtime.getPeerChaincodeURL(FabricDebugConfigurationProvider.orgName);
        const parsedURL: URL = new URL(url);
        return parsedURL.host;
    }

    protected abstract async resolveDebugConfigurationInner(folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration, token?: vscode.CancellationToken): Promise<vscode.DebugConfiguration>;
}
