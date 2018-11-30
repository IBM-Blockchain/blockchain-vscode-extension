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
import { IBlockchainQuickPickItem, UserInputUtil } from './UserInputUtil';
import { ConnectionTreeItem } from '../explorer/model/ConnectionTreeItem';
import { FabricConnectionRegistryEntry } from '../fabric/FabricConnectionRegistryEntry';
import { FabricRuntimeManager } from '../fabric/FabricRuntimeManager';
import { FabricRuntime } from '../fabric/FabricRuntime';
import { VSCodeOutputAdapter } from '../logging/VSCodeOutputAdapter';
import * as path from 'path';

export async function exportConnectionDetails(connectionTreeItem?: ConnectionTreeItem): Promise<void> {
    let fabricRuntime: FabricRuntime;
    if (connectionTreeItem) {
        const connectionRegistry: FabricConnectionRegistryEntry = connectionTreeItem.connection;
        fabricRuntime = FabricRuntimeManager.instance().get(connectionRegistry.name);
    } else {
        const allRuntimes: Array<FabricRuntime> = FabricRuntimeManager.instance().getAll();
        if (allRuntimes.length > 1) {
            const chosenRuntime: IBlockchainQuickPickItem<FabricRuntime> = await UserInputUtil.showRuntimeQuickPickBox('Choose the runtime you want to export the connection profile from') as IBlockchainQuickPickItem<FabricRuntime>;
            if (!chosenRuntime) {
                return;
            }
            fabricRuntime = chosenRuntime.data;
        } else {
            fabricRuntime = allRuntimes[0];
        }
    }

    let dir: string;
    const workspaceFolders: Array<vscode.WorkspaceFolder> = UserInputUtil.getWorkspaceFolders();
    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('A folder must be open to export connection details to');
        VSCodeOutputAdapter.instance().error('A folder must be open to export connection details to');
        return;
    } else if (workspaceFolders.length > 1) {
        const chosenFolder: IBlockchainQuickPickItem<vscode.WorkspaceFolder> = await UserInputUtil.showWorkspaceQuickPickBox('Choose which folder to save the connection profile to');
        if (!chosenFolder) {
            return;
        }

        dir = chosenFolder.data.uri.fsPath;
    } else {
        dir = workspaceFolders[0].uri.fsPath;
    }

    await fabricRuntime.exportConnectionDetails(VSCodeOutputAdapter.instance(), dir);
    vscode.window.showInformationMessage('Successfully exported connection details to ' + path.join(dir, fabricRuntime.getName()));
}
