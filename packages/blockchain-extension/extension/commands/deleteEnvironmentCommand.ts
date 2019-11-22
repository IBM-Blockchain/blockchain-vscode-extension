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
import { UserInputUtil, IBlockchainQuickPickItem } from './UserInputUtil';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../logging/OutputAdapter';
import { FabricRuntimeUtil } from '../fabric/FabricRuntimeUtil';
import { FabricEnvironmentTreeItem } from '../explorer/runtimeOps/disconnectedTree/FabricEnvironmentTreeItem';
import { FabricEnvironmentRegistryEntry } from '../registries/FabricEnvironmentRegistryEntry';
import { FabricEnvironmentRegistry } from '../registries/FabricEnvironmentRegistry';
import { FabricEnvironmentManager } from '../fabric/FabricEnvironmentManager';
import { ExtensionCommands } from '../../ExtensionCommands';

export async function deleteEnvironment(environment: FabricEnvironmentTreeItem | FabricEnvironmentRegistryEntry, force: boolean = false): Promise<void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, `delete environment`);
    let environmentsToDelete: FabricEnvironmentRegistryEntry[];

    try {
        if (!environment) {
            // If called from command palette
            // Ask for environment to delete
            // First check there is at least one that isn't local_fabric
            const environments: Array<FabricEnvironmentRegistryEntry> = await FabricEnvironmentRegistry.instance().getAll(false);
            if (environments.length === 0) {
                outputAdapter.log(LogType.ERROR, `No environments to delete. ${FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME} cannot be deleted.`);
                return;
            }

            const chosenEnvironment: IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>[] = await UserInputUtil.showFabricEnvironmentQuickPickBox('Choose the environment(s) that you want to delete', true, false) as IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>[];
            if (!chosenEnvironment || chosenEnvironment.length === 0) {
                return;
            }

            environmentsToDelete = chosenEnvironment.map((_environment: IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>) => {
                return _environment.data;
            });

        } else {
            if (environment instanceof FabricEnvironmentTreeItem) {
                environmentsToDelete = [environment.environmentRegistryEntry];
            } else {
                environmentsToDelete = [environment];
            }
        }

        if (!force) {
            const reallyDoIt: boolean = await UserInputUtil.showConfirmationWarningMessage(`This will remove the environment(s). Do you want to continue?`);
            if (!reallyDoIt) {
                return;
            }
        }

        const connectedRegistry: FabricEnvironmentRegistryEntry = FabricEnvironmentManager.instance().getEnvironmentRegistryEntry();
        for (const _environment of environmentsToDelete) {
            if (connectedRegistry && connectedRegistry.name === _environment.name) {
                await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            }

            await FabricEnvironmentRegistry.instance().delete(_environment.name);
        }

        if (environmentsToDelete.length > 1) {
            outputAdapter.log(LogType.SUCCESS, `Successfully deleted environments`);
            return;
        } else {
            outputAdapter.log(LogType.SUCCESS, `Successfully deleted ${environmentsToDelete[0].name} environment`);
            return;
        }
    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Error deleting environment: ${error.message}`, `Error deleting environment: ${error.toString()}`);
    }
}
