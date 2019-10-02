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
import * as path from 'path';
import * as fs from 'fs-extra';
import { UserInputUtil, IBlockchainQuickPickItem } from './UserInputUtil';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../logging/OutputAdapter';
import { SettingConfigurations } from '../../SettingConfigurations';
import { FabricRuntimeUtil } from '../fabric/FabricRuntimeUtil';
import { FabricEnvironmentTreeItem } from '../explorer/runtimeOps/disconnectedTree/FabricEnvironmentTreeItem';
import { FabricEnvironmentRegistryEntry } from '../registries/FabricEnvironmentRegistryEntry';
import { FabricEnvironmentRegistry } from '../registries/FabricEnvironmentRegistry';
import { FabricEnvironmentManager } from '../fabric/FabricEnvironmentManager';
import { ExtensionCommands } from '../../ExtensionCommands';

export async function deleteEnvironment(environment: FabricEnvironmentTreeItem | FabricEnvironmentRegistryEntry, force: boolean = false): Promise<void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, `delete environment`);

    try {
        let environmentRegistryEntry: FabricEnvironmentRegistryEntry;
        if (!environment) {
            // If called from command palette
            // Ask for environment to delete
            // First check there is at least one that isn't local_fabric
            const environments: Array<FabricEnvironmentRegistryEntry> = FabricEnvironmentRegistry.instance().getAll();
            if (environments.length === 0) {
                outputAdapter.log(LogType.ERROR, `No environments to delete. ${FabricRuntimeUtil.LOCAL_FABRIC} cannot be deleted.`);
                return;
            }

            const chosenEnvironment: IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry> = await UserInputUtil.showFabricEnvironmentQuickPickBox('Choose the environment that you want to delete');
            if (!chosenEnvironment) {
                return;
            }

            environmentRegistryEntry = chosenEnvironment.data;
        } else {
            if (environment instanceof FabricEnvironmentTreeItem) {
                environmentRegistryEntry = environment.environmentRegistryEntry;
            } else {
                environmentRegistryEntry = environment;
            }
        }

        if (!force) {
            const reallyDoIt: boolean = await UserInputUtil.showConfirmationWarningMessage(`This will remove the environment. Do you want to continue?`);
            if (!reallyDoIt) {
                return;
            }
        }

        const connectedRegistry: FabricEnvironmentRegistryEntry = FabricEnvironmentManager.instance().getEnvironmentRegistryEntry();

        if (connectedRegistry && connectedRegistry.name === environmentRegistryEntry.name) {
            await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT_ENVIRONMENT);
        }

        const extDir: string = vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_DIRECTORY);
        const homeExtDir: string = UserInputUtil.getDirPath(extDir);
        const environmentPath: string = path.join(homeExtDir, 'environments', environmentRegistryEntry.name);
        await fs.remove(environmentPath);

        await FabricEnvironmentRegistry.instance().delete(environmentRegistryEntry.name);
        outputAdapter.log(LogType.SUCCESS, `Successfully deleted ${environmentRegistryEntry.name} environment`);
    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Error deleting environment: ${error.message}`, `Error deleting environment: ${error.toString()}`);
    }
}
