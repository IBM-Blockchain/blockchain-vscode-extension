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
import { UserInputUtil, IBlockchainQuickPickItem } from './UserInputUtil';
import { FabricConnectionRegistryEntry } from '../fabric/FabricConnectionRegistryEntry';
import { FabricConnectionRegistry } from '../fabric/FabricConnectionRegistry';
import { ConnectionTreeItem } from '../explorer/model/ConnectionTreeItem';

export async function deleteConnection(connectionTreeItem: ConnectionTreeItem): Promise<{} | void> {
    console.log('deleteConnection', connectionTreeItem);

    let connectionRegistryEntry: FabricConnectionRegistryEntry;
    if (!connectionTreeItem) {
        const chosenConnection: IBlockchainQuickPickItem<FabricConnectionRegistryEntry> = await UserInputUtil.showConnectionQuickPickBox('Choose the connection that you want to delete');
        if (!chosenConnection) {
            return;
        }

        connectionRegistryEntry = chosenConnection.data;
    } else {
        connectionRegistryEntry = connectionTreeItem.connection;
    }

    return FabricConnectionRegistry.instance().delete(connectionRegistryEntry.name);
}
