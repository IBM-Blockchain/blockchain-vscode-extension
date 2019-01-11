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
import { FabricConnectionRegistryEntry } from '../fabric/FabricConnectionRegistryEntry';
import { FabricConnectionRegistry } from '../fabric/FabricConnectionRegistry';
import { ConnectionTreeItem } from '../explorer/model/ConnectionTreeItem';
import { VSCodeOutputAdapter } from '../logging/VSCodeOutputAdapter';
import { LogType } from '../logging/OutputAdapter';

export async function deleteConnection(connectionTreeItem: ConnectionTreeItem): Promise<{} | void> {
    const outputAdapter: VSCodeOutputAdapter = VSCodeOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, `deleteConnection ${connectionTreeItem}`);
    let connectionRegistryEntry: FabricConnectionRegistryEntry;
    if (!connectionTreeItem) {
        const chosenConnection: IBlockchainQuickPickItem<FabricConnectionRegistryEntry> = await UserInputUtil.showConnectionQuickPickBox('Choose the connection that you want to delete', false);
        if (!chosenConnection) {
            return;
        }

        connectionRegistryEntry = chosenConnection.data;
    } else {
        connectionRegistryEntry = connectionTreeItem.connection;
    }

    const reallyDoIt: boolean = await UserInputUtil.showConfirmationWarningMessage(`This will remove the connection. Do you want to continue?`);
    if (!reallyDoIt) {
        return;
    }

    // If extension owns the wallet, delete the containing folder, which deletes the wallet and identities
    if (connectionRegistryEntry.walletPath.includes('fabric-vscode')) {

        const extDir: string = vscode.workspace.getConfiguration().get('blockchain.ext.directory');
        const homeExtDir: string = await UserInputUtil.getDirPath(extDir);
        const connectionPath: string = path.join(homeExtDir, connectionRegistryEntry.name);
        await fs.remove(connectionPath);

    }

    await FabricConnectionRegistry.instance().delete(connectionRegistryEntry.name);
    outputAdapter.log(LogType.SUCCESS, `Successfully deleted ${connectionRegistryEntry.name} connection`);
    return;
}
