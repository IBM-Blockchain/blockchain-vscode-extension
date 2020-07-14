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
import * as vscode from 'vscode';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { FabricEnvironmentRegistry, FabricEnvironmentRegistryEntry, LogType, EnvironmentType } from 'ibm-blockchain-platform-common';
import { ExtensionsInteractionUtil } from '../util/ExtensionsInteractionUtil';
import { ExtensionCommands } from '../../ExtensionCommands';
import { SettingConfigurations } from '../../configurations';

export async function logInAndDiscover(): Promise<void> {
    const fabricEnvironmentRegistry: FabricEnvironmentRegistry = FabricEnvironmentRegistry.instance();
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();

    outputAdapter.log(LogType.INFO, undefined, 'Log in and discover');

    // update setting configurations
    await vscode.workspace.getConfiguration().update(SettingConfigurations.DISCOVER_SAAS_ENVS, true, vscode.ConfigurationTarget.Global);

    // this function will handle both logging in and retrieving resources from IBP
    const ibpResources: any = await ExtensionsInteractionUtil.cloudAccountGetIbpResources();

    if (ibpResources.length === 0) {
        // refresh tree so that create new instance item is displayed
        await vscode.commands.executeCommand(ExtensionCommands.REFRESH_ENVIRONMENTS);
        return;
    }

    let addedResources: number = 0;

    const accessToken: string = await ExtensionsInteractionUtil.cloudAccountGetAccessToken();
    if (!accessToken) {
        return;
    }

    for (const resource of ibpResources) {

        try {
            const fabricEnvironmentEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();

            const environmentName: string = resource.name;
            const allEnvironments: FabricEnvironmentRegistryEntry[] = await fabricEnvironmentRegistry.getAll(true);
            const dockerName: string = environmentName.replace(/[^A-Za-z0-9]/g, ''); // Create docker name

            for (const _environment of allEnvironments) {
                const _environmentDockerName: string = _environment.name.replace(/[^A-Za-z0-9]/g, '');
                if (_environment.name === environmentName || _environmentDockerName === dockerName) {
                    throw new Error('An environment with this name already exists or is too similar.');
                }
            }

            const accessInfo: string = await ExtensionsInteractionUtil.cloudAccountGetApiEndpoint(resource, accessToken);
            if (accessInfo) {
                // Create environment
                fabricEnvironmentEntry.name = environmentName;
                fabricEnvironmentEntry.url = accessInfo;
                fabricEnvironmentEntry.environmentType = EnvironmentType.SAAS_OPS_TOOLS_ENVIRONMENT;
                await fabricEnvironmentRegistry.add(fabricEnvironmentEntry);
                addedResources++;
            }
        } catch (error) {
            outputAdapter.log(LogType.ERROR, `Failed to add a new environment: ${error.message}`, `Failed to add a new environment: ${error.toString()}`);
        }
    }

    outputAdapter.log(LogType.SUCCESS, `Automatically added ${addedResources} environment(s) from IBM Cloud`);

    // update setting configurations
    await vscode.workspace.getConfiguration().update(SettingConfigurations.DISCOVER_SAAS_ENVS, false, vscode.ConfigurationTarget.Global);
}
