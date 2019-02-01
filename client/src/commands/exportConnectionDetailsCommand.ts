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
import { LogType } from '../logging/OutputAdapter';

export async function exportConnectionDetails(connectionTreeItem?: ConnectionTreeItem): Promise<void> {
    const outputAdapter: VSCodeOutputAdapter = VSCodeOutputAdapter.instance();

    const fabricRuntime: FabricRuntime = FabricRuntimeManager.instance().get('local_fabric');
    // if (connectionTreeItem) {
    //     const connectionRegistry: FabricConnectionRegistryEntry = connectionTreeItem.connection;
    //     fabricRuntime = FabricRuntimeManager.instance().get(connectionRegistry.name);
    // } else {
    //     fabricRuntime = FabricRuntimeManager.instance().get('local_fabric');
    // }

    let dir: string;
    const workspaceFolders: Array<vscode.WorkspaceFolder> = UserInputUtil.getWorkspaceFolders();
    if (!workspaceFolders || workspaceFolders.length === 0) {
        VSCodeOutputAdapter.instance().log(LogType.ERROR, 'A folder must be open to export connection details to');
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

    try {
        await fabricRuntime.exportConnectionDetails(VSCodeOutputAdapter.instance(), dir);
    } catch (error) {
        outputAdapter.log(LogType.ERROR, 'Issue exporting connection details, see output channel for more information');
        return;
    }
    outputAdapter.log(LogType.SUCCESS, `Successfully exported connection details to ${path.join(dir, fabricRuntime.getName())}`);
}
