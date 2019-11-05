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
import { FabricRuntimeManager } from '../fabric/FabricRuntimeManager';
import { FabricRuntime } from '../fabric/FabricRuntime';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../logging/OutputAdapter';
import { ExtensionCommands } from '../../ExtensionCommands';
import { IFabricEnvironmentConnection } from '../fabric/IFabricEnvironmentConnection';
import { FabricRuntimeUtil } from '../fabric/FabricRuntimeUtil';
import { URL } from 'url';
import { FabricEnvironmentManager } from '../fabric/FabricEnvironmentManager';
import { FabricEnvironmentRegistryEntry } from '../registries/FabricEnvironmentRegistryEntry';
import { GlobalState, ExtensionData } from '../util/GlobalState';
import { FabricChaincode } from '../fabric/FabricChaincode';
import { FabricEnvironmentRegistry } from '../registries/FabricEnvironmentRegistry';
import { SettingConfigurations } from '../../configurations';
import { ExtensionUtil } from '../util/ExtensionUtil';

export abstract class FabricDebugConfigurationProvider implements vscode.DebugConfigurationProvider {

    static readonly debugEvent: string = 'contractDebugging';

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
    private static async getConnection(): Promise<IFabricEnvironmentConnection> {
        // check we are connected to the local fabric
        let connection: IFabricEnvironmentConnection = await FabricEnvironmentManager.instance().getConnection();
        if (connection) {
            let environmentRegistryEntry: FabricEnvironmentRegistryEntry = FabricEnvironmentManager.instance().getEnvironmentRegistryEntry();
            if (!environmentRegistryEntry.managedRuntime) {
                await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT_ENVIRONMENT);
                environmentRegistryEntry = await FabricEnvironmentRegistry.instance().get(FabricRuntimeUtil.LOCAL_FABRIC);
                await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);
                connection = await FabricEnvironmentManager.instance().getConnection();

            }
        } else {
            const environmentRegistryEntry: FabricEnvironmentRegistryEntry = await FabricEnvironmentRegistry.instance().get(FabricRuntimeUtil.LOCAL_FABRIC);
            await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);
            connection = await FabricEnvironmentManager.instance().getConnection();
        }

        if (!connection) {
            throw new Error(`Could not create connection to ${FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME}`);
        }

        return connection;
    }

    private runtime: FabricRuntime;

    public async resolveDebugConfiguration(folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration, token?: vscode.CancellationToken): Promise<vscode.DebugConfiguration> {
        const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
        try {
            const localFabricEnabled: boolean = ExtensionUtil.getExtensionLocalFabricSetting();
            if (!localFabricEnabled) {
                outputAdapter.log(LogType.ERROR, `Setting '${SettingConfigurations.EXTENSION_LOCAL_FABRIC}' must be set to 'true' to enable debugging.`);
                return;
            }

            const extensionData: ExtensionData = GlobalState.get();

            // Stop debug if not got late enough version
            if (!extensionData.generatorVersion || semver.lt(extensionData.generatorVersion, '0.0.36')) {
                outputAdapter.log(LogType.ERROR, `To debug a smart contract, you must update the ${FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME} runtime. Teardown and start the ${FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME} runtime, and try again.`);
                return;
            }

            this.runtime = FabricRuntimeManager.instance().getRuntime();

            const isRunning: boolean = await this.runtime.isRunning();

            if (!isRunning) {
                outputAdapter.log(LogType.ERROR, `Please ensure "${FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME}" is running before trying to debug a smart contract`);
                return;
            }

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

            // Launch a *new* debug session with the resolved configuration.
            // If we leave the name in there, it uses the *old* launch.json configuration with the *new* debug
            // configuration provider, for example a fabric:go configuration with the go debug configuration
            // provider. This results in errors and we need to just force it to use our configuration as-is.
            delete resolvedConfig.name;

            // We need this in order to differentiate between debug events
            resolvedConfig.debugEvent = FabricDebugConfigurationProvider.debugEvent;

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
        const url: string = await this.runtime.getPeerChaincodeURL();
        const parsedURL: URL = new URL(url);
        return parsedURL.host;
    }

    protected abstract async resolveDebugConfigurationInner(folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration, token?: vscode.CancellationToken): Promise<vscode.DebugConfiguration>;
}
