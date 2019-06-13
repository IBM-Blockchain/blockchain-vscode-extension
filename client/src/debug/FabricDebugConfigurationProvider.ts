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
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../logging/OutputAdapter';
import { ExtensionCommands } from '../../ExtensionCommands';
import { IFabricRuntimeConnection } from '../fabric/IFabricRuntimeConnection';
import { FabricRuntimeUtil } from '../fabric/FabricRuntimeUtil';
import { URL } from 'url';
import { ExtensionUtil } from '../util/ExtensionUtil';

export abstract class FabricDebugConfigurationProvider implements vscode.DebugConfigurationProvider {

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

                // Error but allow the user to select to run the command
                outputAdapter.log(LogType.INFO, undefined, `The ${FabricRuntimeUtil.LOCAL_FABRIC} peer is not in development mode`);
                const prompt: string = 'Toggle development mode';
                const answer: string = await vscode.window.showErrorMessage(`The ${FabricRuntimeUtil.LOCAL_FABRIC} peer is not in development mode.`, prompt);

                if (answer === prompt) {

                    await vscode.commands.executeCommand(ExtensionCommands.TOGGLE_FABRIC_DEV_MODE);
                    if (!this.runtime.isDevelopmentMode()) {
                        // It didn't work so return
                        outputAdapter.log(LogType.ERROR, `Failed to toggle development mode`, `Failed to toggle development mode`);
                        return;
                    }

                } else {
                    return;
                }
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
                chaincodeName = await this.getChaincodeName(folder);
                if (!chaincodeName) {
                    // User probably cancelled the prompt for the name.
                    return;
                }
                // Determine what smart contracts are installed already
                const connection: IFabricRuntimeConnection = await FabricRuntimeManager.instance().getConnection();
                const peerNames: string[] = connection.getAllPeerNames();
                // Assume local_fabric has one peer
                const allInstalledContracts: Map<string, string[]> = await connection.getInstalledChaincode(peerNames[0]);
                const smartContractVersionNames: string[] = allInstalledContracts.get(chaincodeName);
                let debugSmartContractNames: string[];
                let latestSmartContractVersion: number;
                if (smartContractVersionNames) {
                    debugSmartContractNames = smartContractVersionNames.filter((contractName: string) => {
                        // Get debug packages only
                        return contractName.startsWith(ExtensionUtil.DEBUG_PACKAGE_PREFIX);
                    });
                    if (debugSmartContractNames.length > 0) {
                        // debug package of chaincodeName is already installed - so get the latest
                        const smartContractVersions: number[] = [];
                        for (let version of debugSmartContractNames) {
                            version = version.replace(/[^0-9]/g, ''); // strip non-numerical characters
                            smartContractVersions.push(parseFloat(version)); // parse to float and push to number[]
                        }
                        latestSmartContractVersion = Math.max(...smartContractVersions); // get the latest installed version
                        chaincodeVersion = `${ExtensionUtil.DEBUG_PACKAGE_PREFIX}-${latestSmartContractVersion}`;
                    }
                }
                if (!chaincodeVersion) {
                    // Not found an existing debug package to use, so get a new version
                    chaincodeVersion = await ExtensionUtil.getNewDebugVersion();
                }
                config.env.CORE_CHAINCODE_ID_NAME = `${chaincodeName}:${chaincodeVersion}`;
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
        // Need to strip off the protocol (grpc:// or grpcs://).
        const url: string = await this.runtime.getPeerChaincodeURL();
        const parsedURL: URL = new URL(url);
        return parsedURL.host;
    }

    protected abstract async resolveDebugConfigurationInner(folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration, token?: vscode.CancellationToken): Promise<vscode.DebugConfiguration>;

}
