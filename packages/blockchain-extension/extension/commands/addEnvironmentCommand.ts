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
import * as path from 'path';
import { UserInputUtil, IBlockchainQuickPickItem } from './UserInputUtil';
import { Reporter } from '../util/Reporter';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { FabricEnvironmentRegistry, FabricEnvironmentRegistryEntry, LogType, EnvironmentType, FabricEnvironment, FabricNode, FabricRuntimeUtil, FileSystemUtil, FileConfigurations } from 'ibm-blockchain-platform-common';
import { ExtensionCommands } from '../../ExtensionCommands';
import { EnvironmentFactory } from '../fabric/environments/EnvironmentFactory';
import { LocalEnvironmentManager } from '../fabric/environments/LocalEnvironmentManager';
import { SettingConfigurations } from '../../configurations';
import { ExtensionUtil } from '../util/ExtensionUtil';
import { GlobalState, ExtensionData } from '../util/GlobalState';
import { ExtensionsInteractionUtil } from '../util/ExtensionsInteractionUtil';
import { FeatureFlagManager } from '../util/FeatureFlags';
import { SecureStore } from '../util/SecureStore';
import { SecureStoreFactory } from '../util/SecureStoreFactory';

export async function addEnvironment(): Promise<void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    const fabricEnvironmentEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
    const fabricEnvironmentRegistry: FabricEnvironmentRegistry = FabricEnvironmentRegistry.instance();
    let createMethod: string;
    try {
        outputAdapter.log(LogType.INFO, undefined, 'Add environment');

        const items: IBlockchainQuickPickItem<string>[] = [{
            label: UserInputUtil.ADD_ENVIRONMENT_FROM_DIR,
            data: UserInputUtil.ADD_ENVIRONMENT_FROM_DIR,
            description: UserInputUtil.ADD_ENVIRONMENT_FROM_DIR_DESCRIPTION
        }, {
            label: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS,
            data: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS,
            description: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS_DESCRIPTION
        }, {
            label: UserInputUtil.ADD_ENVIRONMENT_FROM_NODES,
            data: UserInputUtil.ADD_ENVIRONMENT_FROM_NODES,
            description: UserInputUtil.ADD_ENVIRONMENT_FROM_NODES_DESCRIPTION
        }];

        // Can only create from template if Docker is enabled.
        const localFabricEnabled: boolean = ExtensionUtil.getExtensionLocalFabricSetting();
        if (localFabricEnabled) {
            items.unshift({
                label: UserInputUtil.ADD_ENVIRONMENT_FROM_TEMPLATE,
                data: UserInputUtil.ADD_ENVIRONMENT_FROM_TEMPLATE,
                description: UserInputUtil.ADD_ENVIRONMENT_FROM_TEMPLATE_DESCRIPTION
            });
        }

        // Can only create Microfab environments if feature flag is enabled.
        const microfabEnabled: boolean = await FeatureFlagManager.enabled(FeatureFlagManager.MICROFAB);
        if (microfabEnabled) {
            items.push({
                label: UserInputUtil.ADD_ENVIRONMENT_FROM_MICROFAB,
                data: UserInputUtil.ADD_ENVIRONMENT_FROM_MICROFAB,
                description: UserInputUtil.ADD_ENVIRONMENT_FROM_MICROFAB_DESCRIPTION
            });
        }

        const chosenMethod: IBlockchainQuickPickItem<string> = await UserInputUtil.showQuickPickItem('Select a method to add an environment', items) as IBlockchainQuickPickItem<string>;

        let envDir: string;
        if (!chosenMethod) {
            return;
        }

        createMethod = chosenMethod.data;

        let configurationChosen: number; // Configuration chosen (e.g. 1 Org, 2 Org)
        let defaultName: string = '';

        if (createMethod === UserInputUtil.ADD_ENVIRONMENT_FROM_TEMPLATE) {

            const templateItems: IBlockchainQuickPickItem<number>[] = [{label: UserInputUtil.ONE_ORG_TEMPLATE, data: 1}, {label: UserInputUtil.TWO_ORG_TEMPLATE, data: 2}, {label: UserInputUtil.CREATE_ADDITIONAL_LOCAL_NETWORKS, data: UserInputUtil.CREATE_ADDITIONAL_LOCAL_NETWORKS_DATA}];

            // TODO: Add this back in when the tutorial is created
            const chosenTemplate: IBlockchainQuickPickItem<number> = await UserInputUtil.showQuickPickItem('Choose a configuration for a new local network', templateItems) as IBlockchainQuickPickItem<number>;
            if (!chosenTemplate) {
                return;
            }

            configurationChosen = chosenTemplate.data;

            if (configurationChosen === UserInputUtil.CREATE_ADDITIONAL_LOCAL_NETWORKS_DATA) {
                // Open 'create custom tutorial'
                const extensionPath: string = ExtensionUtil.getExtensionPath();
                const tutorialPath: string = path.join(extensionPath, 'tutorials', 'developer-tutorials', 'create-custom-networks.md');
                const uri: vscode.Uri = vscode.Uri.file(tutorialPath);

                await vscode.commands.executeCommand('markdown.showPreview', uri);

                return;
            }

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

            const isSaaS: string = await UserInputUtil.showQuickPickYesNo('Are you connecting to an IBM Blockchain Platform service instance on IBM Cloud?');
            if (!isSaaS) {
                return;
            } else if (isSaaS === UserInputUtil.NO) {
                const url: string = await getOpsToolsAccessInfo();
                if (!url) {
                    return;
                }
                fabricEnvironmentEntry.url = url;
                fabricEnvironmentEntry.environmentType = EnvironmentType.OPS_TOOLS_ENVIRONMENT;
            } else {
                const accessInfo: string[] = await getOpsToolsAccessInfoSaaS();
                if (!accessInfo) {
                    return;
                }
                fabricEnvironmentEntry.url = accessInfo[0];
                fabricEnvironmentEntry.environmentType = EnvironmentType.SAAS_OPS_TOOLS_ENVIRONMENT;
                defaultName = accessInfo[1];
            }
        } else if (createMethod === UserInputUtil.ADD_ENVIRONMENT_FROM_MICROFAB) {
            const url: string = await UserInputUtil.showInputBox(
                'Enter the URL of the Microfab network you want to connect to',
                'http://console.127-0-0-1.nip.io:8080'
            );
            if (!url) {
                return;
            }
            fabricEnvironmentEntry.url = url;
            fabricEnvironmentEntry.environmentType = EnvironmentType.MICROFAB_ENVIRONMENT;
        }

        const environmentName: string = await UserInputUtil.showInputBox('Enter a name for the environment', defaultName);
        if (!environmentName) {
            return;
        }

        // const exists: boolean = await fabricEnvironmentRegistry.exists(environmentName);

        const allEnvironments: FabricEnvironmentRegistryEntry[] = await fabricEnvironmentRegistry.getAll(true);

        const dockerName: string = environmentName.replace(/[^A-Za-z0-9]/g, ''); // Create docker name

        for (const _environment of allEnvironments) {
            const _environmentDockerName: string = _environment.name.replace(/[^A-Za-z0-9]/g, '');
            if (_environment.name === environmentName || _environmentDockerName === dockerName) {
                throw new Error('An environment with this name already exists or is too similar.');
            }
        }

        // Create environment
        fabricEnvironmentEntry.name = environmentName;

        if (createMethod === UserInputUtil.ADD_ENVIRONMENT_FROM_TEMPLATE) {

            await LocalEnvironmentManager.instance().initialize(environmentName, configurationChosen);

            const environmentEntry: FabricEnvironmentRegistryEntry = await FabricEnvironmentRegistry.instance().get(environmentName);
            // Generate all nodes, gateways and wallets
            await vscode.commands.executeCommand(ExtensionCommands.START_FABRIC, environmentEntry);

            if (environmentName === FabricRuntimeUtil.LOCAL_FABRIC) {
                // If the user has deleted their 1 Org Local Fabric and wants to recreate it, we need to set this flag to true.
                // This means that after toggling the local functionality off and back on again, the 1 Org Local Fabric will recreate.
                const extensionData: ExtensionData = GlobalState.get();
                extensionData.deletedOneOrgLocalFabric = false;
                await GlobalState.update(extensionData);
            }

        }

        if (createMethod === UserInputUtil.ADD_ENVIRONMENT_FROM_DIR) {
            fabricEnvironmentEntry.environmentDirectory = envDir;

            const files: string[] = await fs.readdir(envDir);
            if (files.includes('start.sh')) {
                fabricEnvironmentEntry.managedRuntime = true;
            }
            fabricEnvironmentEntry.environmentType = EnvironmentType.ANSIBLE_ENVIRONMENT;
        }

        if (createMethod === UserInputUtil.ADD_ENVIRONMENT_FROM_MICROFAB) {
            const extDir: string = vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_DIRECTORY);
            const resolvedExtDir: string = FileSystemUtil.getDirPath(extDir);
            envDir = path.join(resolvedExtDir, FileConfigurations.FABRIC_ENVIRONMENTS, environmentName);
            fabricEnvironmentEntry.environmentDirectory = envDir;
        }

        if (createMethod !== UserInputUtil.ADD_ENVIRONMENT_FROM_TEMPLATE) {
            // We don't want to add an entry if creating from a template, as the initialize handles this.
            await fabricEnvironmentRegistry.add(fabricEnvironmentEntry);
        }

        if (createMethod !== UserInputUtil.ADD_ENVIRONMENT_FROM_DIR && createMethod !== UserInputUtil.ADD_ENVIRONMENT_FROM_TEMPLATE && createMethod !== UserInputUtil.ADD_ENVIRONMENT_FROM_MICROFAB) {

            let addedAllNodes: boolean;

            if (createMethod === UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS) {
                addedAllNodes = await vscode.commands.executeCommand(ExtensionCommands.EDIT_NODE_FILTERS, fabricEnvironmentEntry, true, createMethod);
            } else {
                addedAllNodes = await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, fabricEnvironmentEntry, true, createMethod);
            }

            if (addedAllNodes === undefined) {
                await fabricEnvironmentRegistry.delete(fabricEnvironmentEntry.name);
                // No need to try and delete from LocalEnvironmentManager, as it can't be a LocalEnvironment entry.
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

        if (fabricEnvironmentEntry.name) {

            if (createMethod === UserInputUtil.ADD_ENVIRONMENT_FROM_TEMPLATE) {

                // If attempting to create a new environment from a template fails, we should delete the setting if it was set.
                const _settings: any = await vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_RUNTIME, vscode.ConfigurationTarget.Global);
                const localSettings: any = JSON.parse(JSON.stringify(_settings));

                if (localSettings[fabricEnvironmentEntry.name]) {
                    delete localSettings[fabricEnvironmentEntry.name];
                    await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, localSettings, vscode.ConfigurationTarget.Global);

                }

                try {
                    await vscode.commands.executeCommand(ExtensionCommands.TEARDOWN_FABRIC, undefined, true, fabricEnvironmentEntry.name);
                } catch (err) {
                    // Try to delete anything related to the container if possible.
                    // This is because containers might have been started but then another step in the playbook fails.
                    // This is assuming that the error thrown from the playbook is detailed enough that a user won't need to look at broken/stopped containers.
                }

            }

            // If we error after providing a valid name
            await fabricEnvironmentRegistry.delete(fabricEnvironmentEntry.name, true);

            if (createMethod === UserInputUtil.ADD_ENVIRONMENT_FROM_TEMPLATE) {
                // Can only be a LocalEnvironment if created using template.
                // Need to remove runtime after deleting entry.
                LocalEnvironmentManager.instance().removeRuntime(fabricEnvironmentEntry.name);
            }

        }
        outputAdapter.log(LogType.ERROR, `Failed to add a new environment: ${error.message}`, `Failed to add a new environment: ${error.toString()}`);
    }

    async function getOpsToolsAccessInfo(): Promise<string> {
        const secureStore: SecureStore = await SecureStoreFactory.getSecureStore();

        const HEALTH_CHECK: string = '/ak/api/v2/health';
        const GET_ALL_COMPONENTS: string = '/ak/api/v2/components';
        let url: string;
        const userUrl: string = await UserInputUtil.showInputBox('Enter the URL of the IBM Blockchain Platform Console you want to connect to');
        if (!userUrl) {
            return;
        } else {
            url = userUrl.split('/', 3).join('/');
        }

        const userAuth1: string = await UserInputUtil.showInputBox('Enter the API key or the User ID of the IBM Blockchain Platform Console you want to connect to');
        if (!userAuth1) {
            return;
        }
        const userAuth2: string = await UserInputUtil.showInputBox('Enter the API secret or the password of the IBM Blockchain Platform Console you want to connect to');
        if (!userAuth2) {
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
            requestOptions.auth = { username: userAuth1, password: userAuth2 };
            await Axios.get(api, requestOptions);
        } catch (errorConnecting) {
            throw new Error(`Problem detected with the authentication information provided: ${errorConnecting.message}`);
        }
        // Securely store API key and secret
        try {
            await secureStore.setPassword('blockchain-vscode-ext', url, `${userAuth1}:${userAuth2}:${requestOptions.httpsAgent.options.rejectUnauthorized}`);
        } catch (errorStorePass) {
            throw new Error(`Unable to store the required credentials: ${errorStorePass.message}`);
        }

        return url;
    }

    async function getOpsToolsAccessInfoSaaS(): Promise<string[]> {
        const accessToken: string = await ExtensionsInteractionUtil.cloudAccountGetAccessToken();
        if (!accessToken) {
            return;
        }

        const ibpResources: any[] = await ExtensionsInteractionUtil.cloudAccountGetIbpResources();
        let chosenIbp: IBlockchainQuickPickItem<any>;
        if (ibpResources.length === 0) {
            throw new Error('There are no IBM Blockchain Platform service instances associated with the chosen account');
        } else {
            const ibpResourceItems: IBlockchainQuickPickItem<string>[] = [];
            for (const resource of ibpResources) {
                ibpResourceItems.push({
                    label: resource.name,
                    description: resource.guid,
                    data: resource
                });
            }

            if (ibpResources.length === 1) {
                chosenIbp = ibpResourceItems[0];
            } else {
                chosenIbp = await UserInputUtil.showQuickPickItem('Select an IBM Blockchain Platform service instance', ibpResourceItems) as IBlockchainQuickPickItem<any>;
                if (!chosenIbp) {
                    return;
                }
            }
        }

        const apiEndpoint: string = await ExtensionsInteractionUtil.cloudAccountGetApiEndpoint(chosenIbp.data, accessToken);
        return [apiEndpoint, chosenIbp.label];
    }

}
