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
import { FabricEnvironmentRegistryEntry } from '../fabric/FabricEnvironmentRegistryEntry';
import { FabricEnvironmentRegistry } from '../fabric/FabricEnvironmentRegistry';

export async function deleteEnvironment(environmentTreeItem: FabricEnvironmentTreeItem, force: boolean = false): Promise<void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, `delete environment`);
    let environmentsToDelete: FabricEnvironmentRegistryEntry[];

    if (!environmentTreeItem) {
        // If called from command palette
        // Ask for environment to delete
        // First check there is at least one that isn't local_fabric
        const environments: Array<FabricEnvironmentRegistryEntry> = FabricEnvironmentRegistry.instance().getAll();
        if (environments.length === 0) {
            outputAdapter.log(LogType.ERROR, `No environments to delete. ${FabricRuntimeUtil.LOCAL_FABRIC} cannot be deleted.`);
            return;
        }

        const chosenEnvironment: IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>[] = await UserInputUtil.showFabricEnvironmentQuickPickBox('Choose the environment(s) that you want to delete', true) as IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>[];
        if (!chosenEnvironment || chosenEnvironment.length === 0) {
            return;
        }

        environmentsToDelete = chosenEnvironment.map((_environment: IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>) => {
            return _environment.data;
        });

    } else {
        environmentsToDelete = [environmentTreeItem.environmentRegistryEntry];
    }

    const reallyDoIt: boolean = await UserInputUtil.showConfirmationWarningMessage(`This will remove the environment(s). Do you want to continue?`);
    if (!reallyDoIt) {
        return;
    }

    const extDir: string = vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_DIRECTORY);
    const homeExtDir: string = UserInputUtil.getDirPath(extDir);

    for (const _environment of environmentsToDelete) {
        const environmentPath: string = path.join(homeExtDir, 'environments', _environment.name);
        await fs.remove(environmentPath);

        await FabricEnvironmentRegistry.instance().delete(_environment.name);
    }

    if (environmentsToDelete.length > 1) {
        outputAdapter.log(LogType.SUCCESS, `Successfully deleted environments`);
        return;
    } else {
        outputAdapter.log(LogType.SUCCESS, `Successfully deleted ${environmentsToDelete[0].name} environment`);
        return;
    }
}
