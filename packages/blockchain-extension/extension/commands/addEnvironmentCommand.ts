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
import { UserInputUtil } from './UserInputUtil';
import { Reporter } from '../util/Reporter';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { FabricEnvironmentRegistry, FabricEnvironmentRegistryEntry, FabricRuntimeUtil, LogType, EnvironmentType } from 'ibm-blockchain-platform-common';
import { ExtensionCommands } from '../../ExtensionCommands';

export async function addEnvironment(): Promise<void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    const fabricEnvironmentEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
    const fabricEnvironmentRegistry: FabricEnvironmentRegistry = FabricEnvironmentRegistry.instance();
    try {
        outputAdapter.log(LogType.INFO, undefined, 'Add environment');

        const createMethod: string = await UserInputUtil.showQuickPick('Choose a method to import nodes to an environment', [UserInputUtil.ADD_ENVIRONMENT_FROM_NODES, UserInputUtil.ADD_ENVIRONMENT_FROM_DIR]) as string;

        let envDir: string;
        if (!createMethod) {
            return;
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
        fabricEnvironmentEntry.name = environmentName;

        if (createMethod === UserInputUtil.ADD_ENVIRONMENT_FROM_DIR) {
            fabricEnvironmentEntry.environmentDirectory = envDir;

            // JAKE TODO put this back in
            // const files: string[] = await fs.readdir(envDir);
            // if (files.includes('start.sh')) {
            //     fabricEnvironmentEntry.managedRuntime = true;
            // }
            fabricEnvironmentEntry.environmentType = EnvironmentType.ANSIBLE_ENVIRONMENT;
        }
        await fabricEnvironmentRegistry.add(fabricEnvironmentEntry);

        if (createMethod !== UserInputUtil.ADD_ENVIRONMENT_FROM_DIR) {

            const addedAllNodes: boolean = await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, fabricEnvironmentEntry, true, createMethod) as boolean;
            if (addedAllNodes === undefined) {
                await fabricEnvironmentRegistry.delete(fabricEnvironmentEntry.name);
                return;
            }

            if (addedAllNodes) {
                outputAdapter.log(LogType.SUCCESS, 'Successfully added a new environment');
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
