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
'use strict';
import Axios from 'axios';
import * as fs from 'fs-extra';
import * as https from 'https';
import * as vscode from 'vscode';
import { UserInputUtil, IBlockchainQuickPickItem } from './UserInputUtil';
import { Reporter } from '../util/Reporter';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { FabricEnvironmentRegistry, FabricEnvironmentRegistryEntry, FabricRuntimeUtil, LogType, EnvironmentType, FabricEnvironment, FabricNode } from 'ibm-blockchain-platform-common';
import { ExtensionCommands } from '../../ExtensionCommands';
import { ModuleUtil } from '../util/ModuleUtil';
import { EnvironmentFactory } from '../fabric/environments/EnvironmentFactory';

export async function addEnvironment(): Promise<void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    const fabricEnvironmentEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
    const fabricEnvironmentRegistry: FabricEnvironmentRegistry = FabricEnvironmentRegistry.instance();
    try {
        outputAdapter.log(LogType.INFO, undefined, 'Add environment');

        const items: IBlockchainQuickPickItem<string>[] = [{ label: UserInputUtil.ADD_ENVIRONMENT_FROM_DIR, data: UserInputUtil.ADD_ENVIRONMENT_FROM_DIR, description: UserInputUtil.ADD_ENVIRONMENT_FROM_DIR_DESCRIPTION }, { label: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS, data: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS, description: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS_DESCRIPTION }, { label: UserInputUtil.ADD_ENVIRONMENT_FROM_NODES, data: UserInputUtil.ADD_ENVIRONMENT_FROM_NODES, description: UserInputUtil.ADD_ENVIRONMENT_FROM_NODES_DESCRIPTION }];
        const chosenMethod: IBlockchainQuickPickItem<string> = await UserInputUtil.showQuickPickItem('Select a method to add an environment', items) as IBlockchainQuickPickItem<string>;

        let envDir: string;
        if (!chosenMethod) {
            return;
        }

        const createMethod: string = chosenMethod.data;

        if (createMethod === UserInputUtil.ADD_ENVIRONMENT_FROM_DIR) {
            const options: vscode.OpenDialogOptions = {
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                openLabel: 'Select'
            };

            const chosenUri: vscode.Uri = await UserInputUtil.openFileBrowser(options, true) as vscode.Uri;

            if (!chosenUri) {
                return;
            }

            envDir = chosenUri.fsPath;
        } else if (createMethod === UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS) {
            const keytar: any = ModuleUtil.getCoreNodeModule('keytar');
            if (!keytar) {
                throw new Error('Error importing the keytar module');
            }

            const HEALTH_CHECK: string = '/ak/api/v1/health';
            const GET_ALL_COMPONENTS: string = '/ak/api/v1/components';
            const url: string = await UserInputUtil.showInputBox('Enter the URL of the IBM Blockchain Platform Console you want to connect to');
            if (!url) {
                return;
            }
            const apiKey: string = await UserInputUtil.showInputBox('Enter the API key of the IBM Blockchain Platform Console you want to connect to');
            if (!apiKey) {
                return;
            }
            const apiSecret: string = await UserInputUtil.showInputBox('Enter the API secret of the IBM Blockchain Platform Console you want to connect to');
            if (!apiSecret) {
                return;
            }

            const healthUrl: string = url.replace(/\/$/, '') + HEALTH_CHECK;
            const api: string = url.replace(/\/$/, '') + GET_ALL_COMPONENTS;
            const requestOptions: any = { headers: { 'Content-Type': 'application/json' } };
            requestOptions.httpsAgent = new https.Agent( {rejectUnauthorized: true});

            try {
                await Axios.get(healthUrl, requestOptions);
            } catch (errorWithAuth) {
                // error indicates a certificate verification is needed (response.status === 401), proceed with real connection.
                if (!errorWithAuth.response || !errorWithAuth.response.status || errorWithAuth.response.status !== 401) {
                    // Otherwise, try again to connect to health end point.
                    try {
                        requestOptions.httpsAgent.options.rejectUnauthorized = false;
                        await Axios.get(healthUrl, requestOptions);
                    } catch (errorWithoutAuth) {
                        if (errorWithoutAuth.response && errorWithoutAuth.response.status && errorWithoutAuth.response.status === 401) {
                            // This indicates a certificate verification is needed. Ask the user if they wish to proceed insecurely or cancel.
                            const options: IBlockchainQuickPickItem<string>[] = [{ label: UserInputUtil.CONNECT_NO_CA_CERT_CHAIN, data: UserInputUtil.CONNECT_NO_CA_CERT_CHAIN }, { label: UserInputUtil.CANCEL_NO_CERT_CHAIN, data: UserInputUtil.CANCEL_NO_CERT_CHAIN, description: UserInputUtil.CANCEL_NO_CERT_CHAIN_DESCRIPTION }];
                            const certificateUsage: IBlockchainQuickPickItem<string> = await UserInputUtil.showQuickPickItem('Unable to perform certificate verification. Please choose how to proceed', options) as IBlockchainQuickPickItem<string>;
                            if (!certificateUsage || certificateUsage.label === UserInputUtil.CANCEL_NO_CERT_CHAIN) {
                                return;
                            }
                        } else {
                            // There is a connection problem other than certificate related. Throw error.
                            throw new Error(`Unable to connect to the IBM Blockchain Platform network: ${errorWithoutAuth.message}`);
                        }
                    }
                }
            }
            // We will now atempt to connect using key and secret. If it fails, there is a problem with the key and secret provided.
            try {
                requestOptions.auth = { username: apiKey, password: apiSecret };
                await Axios.get(api, requestOptions);
            } catch (errorConnecting) {
                throw new Error(`Problem detected with API key and/or secret: ${errorConnecting.message}`);
            }
            // Securely store API key and secret
            try {
                await keytar.setPassword('blockchain-vscode-ext', url, `${apiKey}:${apiSecret}:${requestOptions.httpsAgent.options.rejectUnauthorized}`);
            } catch (errorStorePass) {
                throw new Error(`Unable to store the required credentials: ${errorStorePass.message}`);
            }

            fabricEnvironmentEntry.url = url;
            fabricEnvironmentEntry.environmentType = EnvironmentType.OPS_TOOLS_ENVIRONMENT;
        }

        const environmentName: string = await UserInputUtil.showInputBox('Enter a name for the environment');
        if (!environmentName) {
            return;
        }

        const exists: boolean = await fabricEnvironmentRegistry.exists(environmentName);
        if (exists || environmentName === FabricRuntimeUtil.LOCAL_FABRIC) {
            // Environment already exists
            throw new Error('An environment with this name already exists.');
        }

        // Create environment
        if (createMethod === UserInputUtil.ADD_ENVIRONMENT_FROM_DIR) {
            fabricEnvironmentEntry.environmentDirectory = envDir;

            const files: string[] = await fs.readdir(envDir);
            if (files.includes('start.sh')) {
                fabricEnvironmentEntry.managedRuntime = true;
            }
            fabricEnvironmentEntry.environmentType = EnvironmentType.ANSIBLE_ENVIRONMENT;
        }

        fabricEnvironmentEntry.name = environmentName;
        await fabricEnvironmentRegistry.add(fabricEnvironmentEntry);

        if (createMethod !== UserInputUtil.ADD_ENVIRONMENT_FROM_DIR) {

            let addedAllNodes: boolean;

            if (createMethod === UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS) {
                addedAllNodes = await vscode.commands.executeCommand(ExtensionCommands.EDIT_NODE_FILTERS, fabricEnvironmentEntry, true, createMethod);
            } else {
                addedAllNodes = await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, fabricEnvironmentEntry, true, createMethod);
            }

            if (addedAllNodes === undefined) {
                await fabricEnvironmentRegistry.delete(fabricEnvironmentEntry.name);
                return;
            } else if (addedAllNodes) {
                const environment: FabricEnvironment = EnvironmentFactory.getEnvironment(fabricEnvironmentEntry);
                const nodes: FabricNode[] = await environment.getNodes();
                if (nodes.length === 0) {
                    outputAdapter.log(LogType.SUCCESS, `Successfully added a new environment. No nodes included in current filters, click ${fabricEnvironmentEntry.name} to edit filters`);
                } else {
                    outputAdapter.log(LogType.SUCCESS, 'Successfully added a new environment');
                }
            } else {
                outputAdapter.log(LogType.WARNING, 'Added a new environment, but some nodes could not be added');
            }
        } else {
            outputAdapter.log(LogType.SUCCESS, 'Successfully added a new environment');
        }
        Reporter.instance().sendTelemetryEvent('addEnvironmentCommand');
    } catch (error) {
        await fabricEnvironmentRegistry.delete(fabricEnvironmentEntry.name, true);
        outputAdapter.log(LogType.ERROR, `Failed to add a new environment: ${error.message}`, `Failed to add a new environment: ${error.toString()}`);
    }
}
