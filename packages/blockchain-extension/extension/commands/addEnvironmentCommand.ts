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
import * as path from 'path';
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
import { LocalEnvironmentManager } from '../fabric/environments/LocalEnvironmentManager';
import { LocalEnvironment } from '../fabric/environments/LocalEnvironment';
import { SettingConfigurations } from '../../configurations';

export async function addEnvironment(): Promise<void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    const fabricEnvironmentEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
    const fabricEnvironmentRegistry: FabricEnvironmentRegistry = FabricEnvironmentRegistry.instance();
    let createMethod: string;
    try {
        outputAdapter.log(LogType.INFO, undefined, 'Add environment');

        const items: IBlockchainQuickPickItem<string>[] = [{label: UserInputUtil.ADD_ENVIRONMENT_FROM_TEMPLATE, data: UserInputUtil.ADD_ENVIRONMENT_FROM_TEMPLATE, description: UserInputUtil.ADD_ENVIRONMENT_FROM_TEMPLATE_DESCRIPTION}, { label: UserInputUtil.ADD_ENVIRONMENT_FROM_DIR, data: UserInputUtil.ADD_ENVIRONMENT_FROM_DIR, description: UserInputUtil.ADD_ENVIRONMENT_FROM_DIR_DESCRIPTION }, { label: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS, data: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS, description: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS_DESCRIPTION }, { label: UserInputUtil.ADD_ENVIRONMENT_FROM_NODES, data: UserInputUtil.ADD_ENVIRONMENT_FROM_NODES, description: UserInputUtil.ADD_ENVIRONMENT_FROM_NODES_DESCRIPTION }];
        const chosenMethod: IBlockchainQuickPickItem<string> = await UserInputUtil.showQuickPickItem('Select a method to add an environment', items) as IBlockchainQuickPickItem<string>;

        let envDir: string;
        if (!chosenMethod) {
            return;
        }

        createMethod = chosenMethod.data;

        let configurationChosen: string; // Configuration chosen (e.g. 1 Org, 2 Org)

        if (createMethod === UserInputUtil.ADD_ENVIRONMENT_FROM_TEMPLATE) {

            const templateItems: IBlockchainQuickPickItem<string>[] = [{label: UserInputUtil.ONE_ORG_TEMPLATE, data: UserInputUtil.ONE_ORG_TEMPLATE}, {label: UserInputUtil.TWO_ORG_TEMPLATE, data: UserInputUtil.TWO_ORG_TEMPLATE}];

            // TODO: Add this back in when the tutorial is created
            // const templateItems: IBlockchainQuickPickItem<string>[] = [{label: UserInputUtil.ONE_ORG_TEMPLATE, data: UserInputUtil.ONE_ORG_TEMPLATE}, {label: UserInputUtil.TWO_ORG_TEMPLATE, data: UserInputUtil.TWO_ORG_TEMPLATE}, {label: UserInputUtil.CREATE_ADDITIONAL_LOCAL_NETWORKS, data: UserInputUtil.CREATE_ADDITIONAL_LOCAL_NETWORKS}];
            const chosenTemplate: IBlockchainQuickPickItem<string> = await UserInputUtil.showQuickPickItem('Choose a configuration for a new local network', templateItems) as IBlockchainQuickPickItem<string>;
            if (!chosenTemplate) {
                return;
            }

            configurationChosen = chosenTemplate.data;

            // TODO: Add this back in when the tutorial is created
            // if (configurationChosen === UserInputUtil.CREATE_ADDITIONAL_LOCAL_NETWORKS) {
            //     // Open create additional networks tutorial
            //     const extensionPath: string = ExtensionUtil.getExtensionPath();
            //     // TODO JAKE: Change this to whatever the path ends up being!
            //     const releaseNotes: string = path.join(extensionPath, 'packages', 'blockchain-extension', 'tutorials', 'developer-tutorials', 'create-additional-local-networks.md');
            //     const uri: vscode.Uri = vscode.Uri.file(releaseNotes);
            //     await vscode.commands.executeCommand('markdown.showPreview', uri);

            //     return;
            // }

        } else if (createMethod === UserInputUtil.ADD_ENVIRONMENT_FROM_DIR) {
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

        let namePrompt: string;
        if (configurationChosen) {
            namePrompt = 'Provide a name for this Fabric Environment (avoid duplicating an existing name)';
        } else {
            namePrompt = 'Enter a name for the environment';
        }

        const environmentName: string = await UserInputUtil.showInputBox(namePrompt);
        if (!environmentName) {
            return;
        }

        const exists: boolean = await fabricEnvironmentRegistry.exists(environmentName);
        if (exists || environmentName === FabricRuntimeUtil.LOCAL_FABRIC) {
            // Environment already exists
            throw new Error('An environment with this name already exists.');
        }

        // Create environment
        fabricEnvironmentEntry.name = environmentName;

        if (createMethod === UserInputUtil.ADD_ENVIRONMENT_FROM_TEMPLATE) {
            // create it!!

            let numberOfOrgs: number;
            if (configurationChosen === UserInputUtil.ONE_ORG_TEMPLATE) {
                numberOfOrgs = 1;
            } else {
                // User chose TWO_ORG_TEMPLATE
                numberOfOrgs = 2;
            }

            await LocalEnvironmentManager.instance().initialize(environmentName, numberOfOrgs);

            const environment: LocalEnvironment = await LocalEnvironmentManager.instance().getRuntime(environmentName);
            // Generate all nodes, gateways and wallets
            await environment.generate(outputAdapter);

        }

        if (createMethod === UserInputUtil.ADD_ENVIRONMENT_FROM_DIR) {
            fabricEnvironmentEntry.environmentDirectory = envDir;

            const files: string[] = await fs.readdir(envDir);
            if (files.includes('start.sh')) {
                fabricEnvironmentEntry.managedRuntime = true;
            }
            fabricEnvironmentEntry.environmentType = EnvironmentType.ANSIBLE_ENVIRONMENT;
        }

        // await fabricEnvironmentRegistry.add(fabricEnvironmentEntry);

        if (createMethod !== UserInputUtil.ADD_ENVIRONMENT_FROM_TEMPLATE) {
            // We don't want to add an entry if creating from a template, as the initialize handles this.
            await fabricEnvironmentRegistry.add(fabricEnvironmentEntry);
        }

        if (createMethod !== UserInputUtil.ADD_ENVIRONMENT_FROM_DIR && createMethod !== UserInputUtil.ADD_ENVIRONMENT_FROM_TEMPLATE) {

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

        if (createMethod === UserInputUtil.ADD_ENVIRONMENT_FROM_TEMPLATE) {
            // If attempting to create a new environment from a template fails, we should delete the setting if it was set.
            const settings: any = await vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_RUNTIME, vscode.ConfigurationTarget.Global);
            if (settings[fabricEnvironmentEntry.name]) {
                delete settings[fabricEnvironmentEntry.name];
                await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, settings, vscode.ConfigurationTarget.Global);

            }

            try {
                await vscode.commands.executeCommand(ExtensionCommands.TEARDOWN_FABRIC, undefined, true, fabricEnvironmentEntry.name);
            } catch (err) {
                // Try to delete anything related to the container if possible.
                // This is because containers might have been started but then another step in the playbook fails.
                // This is assuming that the error thrown from the playbook is detailed enough that a user won't need to look at broken/stopped containers.
            }
        }
        outputAdapter.log(LogType.ERROR, `Failed to add a new environment: ${error.message}`, `Failed to add a new environment: ${error.toString()}`);
    }
}
