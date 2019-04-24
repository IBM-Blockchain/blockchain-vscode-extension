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
import { FabricRuntimeManager } from '../fabric/FabricRuntimeManager';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import * as path from 'path';
import { LogType } from '../logging/OutputAdapter';
import { FabricGatewayRegistryEntry } from '../fabric/FabricGatewayRegistryEntry';
import * as fs from 'fs-extra';
import { FabricRuntimeUtil } from '../fabric/FabricRuntimeUtil';

export async function exportConnectionProfile(): Promise<void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();

    // Assume there's only one registry entry for now.
    const runtimeGatewayRegistryEntries: FabricGatewayRegistryEntry[] = await FabricRuntimeManager.instance().getGatewayRegistryEntries();
    const runtimeGatewayRegistryEntry: FabricGatewayRegistryEntry = runtimeGatewayRegistryEntries[0];

    let dir: string;
    const workspaceFolders: Array<vscode.WorkspaceFolder> = UserInputUtil.getWorkspaceFolders();
    if (!workspaceFolders || workspaceFolders.length === 0) {
        VSCodeBlockchainOutputAdapter.instance().log(LogType.ERROR, 'A folder must be open to export connection profile to');
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
        dir = path.resolve(dir, FabricRuntimeUtil.LOCAL_FABRIC);
        await fs.ensureDir(dir);
        const targetConnectionProfilePath: string = path.resolve(dir, 'connection.json');
        await fs.copyFile(runtimeGatewayRegistryEntry.connectionProfilePath, targetConnectionProfilePath);
    } catch (error) {
        outputAdapter.log(LogType.ERROR, 'Issue exporting connection profile, see output channel for more information');
        return;
    }
    outputAdapter.log(LogType.SUCCESS, `Successfully exported connection profile to ${dir}`);
}
