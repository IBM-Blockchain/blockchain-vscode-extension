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
import { FabricConnectionRegistry } from '../fabric/FabricConnectionRegistry';
import { FabricConnectionRegistryEntry } from '../fabric/FabricConnectionRegistryEntry';
import { ConnectionTreeItem } from '../explorer/model/ConnectionTreeItem';

export async function addConnectionIdentity(connectionItem: ConnectionTreeItem): Promise<{} | void> {
    let connectionRegistryEntry: FabricConnectionRegistryEntry;
    console.log('addConnectionIdentity');

    if (!connectionItem) {
        const chosenEntry: IBlockchainQuickPickItem<FabricConnectionRegistryEntry> = await UserInputUtil.showConnectionQuickPickBox('Choose a connection to add an identity to');
        if (!chosenEntry) {
            return;
        }

        connectionRegistryEntry = chosenEntry.data;
    } else {
        connectionRegistryEntry = connectionItem.connection;
    }

    const certificatePath: string = await UserInputUtil.showInputBox('Enter a file path to the certificate file');

    if (!certificatePath) {
        return Promise.resolve();
    }

    const privateKeyPath: string = await UserInputUtil.showInputBox('Enter a file path to the private key file');

    if (!privateKeyPath) {
        return Promise.resolve();
    }

    connectionRegistryEntry.identities.push({certificatePath, privateKeyPath});

    return FabricConnectionRegistry.instance().update(connectionRegistryEntry);
}
