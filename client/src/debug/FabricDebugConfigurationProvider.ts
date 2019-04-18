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
import { FabricRuntimeManager } from '../fabric/FabricRuntimeManager';
import { FabricRuntime } from '../fabric/FabricRuntime';
import * as dateFormat from 'dateformat';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { PackageRegistryEntry } from '../packages/PackageRegistryEntry';
import { FabricGatewayRegistryEntry } from '../fabric/FabricGatewayRegistryEntry';
import { LogType } from '../logging/OutputAdapter';
import { ExtensionCommands } from '../../ExtensionCommands';
import { IFabricRuntimeConnection } from '../fabric/IFabricRuntimeConnection';
import { UserInputUtil, IBlockchainQuickPickItem } from '../commands/UserInputUtil';
import { FabricRuntimeUtil } from '../fabric/FabricRuntimeUtil';

export abstract class FabricDebugConfigurationProvider implements vscode.DebugConfigurationProvider {

    private PREFIX: string = 'vscode-debug';
    private runtime: FabricRuntime;

    public async resolveDebugConfiguration(folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration, token?: vscode.CancellationToken): Promise<vscode.DebugConfiguration> {
        const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
        try {
            this.runtime = FabricRuntimeManager.instance().getRuntime();

            const isRunning: boolean = await this.runtime.isRunning();

            if (!isRunning) {
                outputAdapter.log(LogType.ERROR, `Please ensure "${FabricRuntimeUtil.LOCAL_FABRIC}" is running before trying to debug a smart contract`);
                return;
            }

            if (!this.runtime.isDevelopmentMode()) {
                outputAdapter.log(LogType.ERROR, `Please ensure "${FabricRuntimeUtil.LOCAL_FABRIC}" is in development mode before trying to debug a smart contract`);
                return;
            }

            if (!config.env) {
                config.env = {};
            }

            // Check if the user wants to package and install their contract
            const packageInstall: IBlockchainQuickPickItem<boolean> = await UserInputUtil.packageAndInstallQuestion();
            if (packageInstall === undefined) {
                return;
            }

            let chaincodeName: string;
            let chaincodeVersion: string;
            if (!config.env.CORE_CHAINCODE_ID_NAME) {

                chaincodeName = await this.getChaincodeName(folder);

                if (!chaincodeName) {
                    // User probably cancelled the prompt for the name.
                    return;
                }

                // Get instantiated chaincode. Check if chaincode exists with chaincodeName already.

                const connection: IFabricRuntimeConnection = await FabricRuntimeManager.instance().getConnection();
                if (!connection) {
                    return;
                }

                // If the user doesn't want to package and install
                if (packageInstall.data === false) {
                    const chaincodes: Array<{ name: string, version: string }> = await connection.getAllInstantiatedChaincodes();

                    const chaincode: { name: string, version: string } = chaincodes.find((_chaincode: { name: string, version: string }) => {
                        return _chaincode.name === chaincodeName;
                    });

                    if (chaincode) {
                        chaincodeVersion = chaincode.version;
                    }
                }

                // If a chaincode does not exist with that name, get a new verison.
                if (!chaincodeVersion) {
                    chaincodeVersion = this.getNewVersion();
                }

                config.env.CORE_CHAINCODE_ID_NAME = `${chaincodeName}:${chaincodeVersion}`;
            } else {
                chaincodeName = config.env.CORE_CHAINCODE_ID_NAME.split(':')[0];
                chaincodeVersion = config.env.CORE_CHAINCODE_ID_NAME.split(':')[1];
            }

            if (!config.env.CORE_CHAINCODE_EXECUTETIMEOUT) {
                config.env.CORE_CHAINCODE_EXECUTETIMEOUT = '540s';
            }

            // Only need to package and install the first time they run debug OR if they change their instantiation function
            if (packageInstall.data === true) {
                const newPackage: PackageRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT, folder, chaincodeName, chaincodeVersion) as PackageRegistryEntry;
                if (!newPackage) {
                    // package command failed
                    return;
                }

                const peersToIntallOn: Array<string> = await this.getPeersToInstallOn();
                if (peersToIntallOn.length === 0) {
                    return;
                }

                const packageEntry: {} = await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT, null, new Set(peersToIntallOn), newPackage);
                if (!packageEntry) {
                    // install command failed
                    return;
                }
            }

            // Allow the language specific class to resolve the configuration.
            const resolvedConfig: vscode.DebugConfiguration = await this.resolveDebugConfigurationInner(folder, config, token);

            // Launch a *new* debug session with the resolved configuration.
            // If we leave the name in there, it uses the *old* launch.json configuration with the *new* debug
            // configuration provider, for example a fabric:go configuration with the go debug configuration
            // provider. This results in errors and we need to just force it to use our configuration as-is.
            delete resolvedConfig.name;
            await vscode.commands.executeCommand('setContext', 'blockchain-debug', true);
            vscode.debug.startDebugging(folder, resolvedConfig);

            // Cancel the current debug session - the user will never know!
            return undefined;

        } catch (error) {
            outputAdapter.log(LogType.ERROR, `Failed to launch debug: ${error.message}`);
            return;
        }
    }

    protected abstract async getChaincodeName(folder: vscode.WorkspaceFolder | undefined): Promise<string>;

    protected async getChaincodeAddress(): Promise<string> {
        return this.runtime.getChaincodeAddress();
    }

    protected abstract async resolveDebugConfigurationInner(folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration, token?: vscode.CancellationToken): Promise<vscode.DebugConfiguration>;

    private getNewVersion(): string {
        const date: Date = new Date();
        const formattedDate: string = dateFormat(date, 'yyyymmddHHMMss');
        return `${this.PREFIX}-${formattedDate}`;
    }

    private async getPeersToInstallOn(): Promise<Array<string>> {
        const gatewayRegistryEntries: Array<FabricGatewayRegistryEntry> = await FabricRuntimeManager.instance().getGatewayRegistryEntries();

        await vscode.commands.executeCommand(ExtensionCommands.CONNECT, gatewayRegistryEntries[0]);
        const connection: IFabricRuntimeConnection = await FabricRuntimeManager.instance().getConnection();
        return connection.getAllPeerNames();
    }
}
