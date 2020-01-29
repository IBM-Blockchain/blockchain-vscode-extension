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
import * as path from 'path';
import * as vscode from 'vscode';
import { UserInputUtil, IBlockchainQuickPickItem } from './UserInputUtil';
import {Reporter} from '../util/Reporter';
import {VSCodeBlockchainOutputAdapter} from '../logging/VSCodeBlockchainOutputAdapter';
import {
    FabricEnvironmentRegistry,
    FabricEnvironmentRegistryEntry,
    FabricRuntimeUtil,
    LogType,
    EnvironmentType
} from 'ibm-blockchain-platform-common';
import {ExtensionCommands} from '../../ExtensionCommands';
import {ModuleUtil} from '../util/ModuleUtil';
import {FabricEnvironment} from '../fabric/FabricEnvironment';

export async function addEnvironment(): Promise<void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    const fabricEnvironmentEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
    const fabricEnvironmentRegistry: FabricEnvironmentRegistry = FabricEnvironmentRegistry.instance();
    try {
        outputAdapter.log(LogType.INFO, undefined, 'Add environment');
        let certificatePath: vscode.Uri;
        const separator: string = process.platform === 'win32' ? '\\' : '/';

        const items: IBlockchainQuickPickItem<string>[] = [{label: UserInputUtil.ADD_ENVIRONMENT_FROM_DIR, data: UserInputUtil.ADD_ENVIRONMENT_FROM_DIR, description: UserInputUtil.ADD_ENVIRONMENT_FROM_DIR_DESCRIPTION}, {label: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS, data: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS, description: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS_DESCRIPTION}, {label: UserInputUtil.ADD_ENVIRONMENT_FROM_NODES, data: UserInputUtil.ADD_ENVIRONMENT_FROM_NODES, description: UserInputUtil.ADD_ENVIRONMENT_FROM_NODES_DESCRIPTION}];
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

            const GET_ALL_COMPONENTS: string = '/ak/api/v1/components';
            const url: string = await UserInputUtil.showInputBox('Enter the url of the ops tools you want to connect to');
            if (!url) {
                return;
            }
            const apiKey: string = await UserInputUtil.showInputBox('Enter the api key of the ops tools you want to connect to');
            if (!apiKey) {
                return;
            }
            const apiSecret: string = await UserInputUtil.showInputBox('Enter the api secret of the ops tools you want to connect to');
            if (!apiSecret) {
                return;
            }

            const api: string = url.replace(/\/$/, '') + GET_ALL_COMPONENTS;
            const requestOptions: any = {
                headers: {'Content-Type': 'application/json'},
                auth: {username: apiKey, password: apiSecret}
            };
            try {
                await Axios.get(api, requestOptions);
            } catch (error) {
                // This needs to be fixed - exactly what codes can we get that will require this behaviour?
                if (error.code === 'DEPTH_ZERO_SELF_SIGNED_CERT') {
                    let caCertificate: string;
                    const certificateUsage: string = await UserInputUtil.showQuickPick('Unable to perform certificate verification. Please choose how to proceed', [UserInputUtil.ADD_CA_CERT_CHAIN, UserInputUtil.CONNECT_NO_CA_CERT_CHAIN]) as string;
                    if (!certificateUsage) {
                        return;
                    } else if (certificateUsage === UserInputUtil.ADD_CA_CERT_CHAIN) {
                        const quickPickItems: string[] = [UserInputUtil.BROWSE_LABEL];
                        const browseOptions: vscode.OpenDialogOptions = {
                            canSelectFiles: true,
                            canSelectFolders: false,
                            canSelectMany: false,
                            openLabel: 'Select',
                            filters: {
                                Certificates: ['pem']
                            }
                        };
                        certificatePath = await UserInputUtil.browse('Select CA certificate chain (.pem) file', quickPickItems, browseOptions, true) as vscode.Uri;
                        if (certificatePath === undefined) {
                            return;
                        } else if (Array.isArray(certificatePath)) {
                            certificatePath = certificatePath[0];
                        }
                        caCertificate = await fs.readFile(certificatePath.fsPath, 'utf8');
                        requestOptions.httpsAgent = new https.Agent({ca: caCertificate});
                    } else {
                        requestOptions.httpsAgent = new https.Agent({rejectUnauthorized: false});
                    }
                    await Axios.get(api, requestOptions);
                    try {
                        await keytar.setPassword('blockchain-vscode-ext', url, `${apiKey}:${apiSecret}`);
                    } catch (error) {
                        throw new Error(`Unable to store the required credentials: ${error.message}`);
                    }
                } else {
                    throw error;
                }
            }

            fabricEnvironmentEntry.url = url;
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

        if (createMethod === UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS && certificatePath) {
            try {
                const environment: FabricEnvironment = new FabricEnvironment(fabricEnvironmentEntry.name);
                const caCertificateCopy: string = path.join(path.resolve(environment.getPath()), certificatePath.fsPath.split(separator).pop());
                await fs.copy(certificatePath.fsPath, caCertificateCopy, {overwrite: true});
            } catch (error) {
                throw new Error(`Unable to store the CA certificate chain file: ${error.message}`);
            }
        }

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
            const environment: FabricEnvironment = new FabricEnvironment(fabricEnvironmentEntry.name);
            const nodes: FabricNode[] = await environment.getNodes();
            if (nodes.length === 0) {
                outputAdapter.log(LogType.SUCCESS, `Successfully added a new environment. No available nodes included in current filters, click ${fabricEnvironmentEntry.name} to edit filters`);
            } else {
                outputAdapter.log(LogType.SUCCESS, 'Successfully added a new environment');
            }
            } else {
                outputAdapter.log(LogType.WARNING, 'Added a new environment, but some nodes could not be added');
            }
        } else {
            await vscode.commands.executeCommand(ExtensionCommands.REFRESH_WALLETS);
            await vscode.commands.executeCommand(ExtensionCommands.REFRESH_GATEWAYS);
            outputAdapter.log(LogType.SUCCESS, 'Successfully added a new environment');
        }
        Reporter.instance().sendTelemetryEvent('addEnvironmentCommand');
    } catch (error) {
        await fabricEnvironmentRegistry.delete(fabricEnvironmentEntry.name, true);
        outputAdapter.log(LogType.ERROR, `Failed to add a new environment: ${error.message}`, `Failed to add a new environment: ${error.toString()}`);
    }
}
