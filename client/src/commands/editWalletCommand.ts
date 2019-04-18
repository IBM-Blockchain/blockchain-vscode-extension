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
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../logging/OutputAdapter';
import { WalletTreeItem } from '../explorer/wallets/WalletTreeItem';
import { FabricWalletRegistryEntry } from '../fabric/FabricWalletRegistryEntry';

export async function editWalletCommand(treeItem: WalletTreeItem): Promise<void> {

    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, `editWallet`);

    let walletName: string;

    if (!treeItem) {
        // If called from command palette
        // Ask for wallet to edit
        const chosenWallet: IBlockchainQuickPickItem<FabricWalletRegistryEntry> = await UserInputUtil.showWalletsQuickPickBox('Choose the wallet that you want to edit', false);
        if (!chosenWallet) {
            return;
        }
        walletName = chosenWallet.data.name;
    } else {
        // If called using tree item
        walletName = treeItem.name;
    }
    await UserInputUtil.openUserSettings(walletName, true);
    return;

}
