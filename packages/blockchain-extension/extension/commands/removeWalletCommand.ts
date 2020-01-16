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
import { WalletTreeItem } from '../explorer/wallets/WalletTreeItem';
import { UserInputUtil, IBlockchainQuickPickItem } from './UserInputUtil';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { FabricWalletRegistry, FabricWalletRegistryEntry, LogType, FabricRuntimeUtil } from 'ibm-blockchain-platform-common';
import { FabricGatewayRegistry } from '../registries/FabricGatewayRegistry';
import { FabricGatewayRegistryEntry } from '../registries/FabricGatewayRegistryEntry';

export async function removeWallet(treeItem: WalletTreeItem): Promise<void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, `removeWallet`);

    let walletsToDelete: FabricWalletRegistryEntry[];

    if (!treeItem) {
        // If called from command palette
        // Ask for wallet to remove
        // First check there is at least one that isn't local_fabric_wallet
        let wallets: Array<FabricWalletRegistryEntry> = [];
        wallets = await FabricWalletRegistry.instance().getAll(false);
        if (wallets.length === 0) {
            outputAdapter.log(LogType.ERROR, `No wallets to remove. ${FabricRuntimeUtil.LOCAL_FABRIC} wallets cannot be removed.`, `No wallets to remove. ${FabricRuntimeUtil.LOCAL_FABRIC} wallets cannot be removed.`);
            return;
        }

        const chosenWallet: IBlockchainQuickPickItem<FabricWalletRegistryEntry>[] = await UserInputUtil.showWalletsQuickPickBox('Choose the wallet(s) that you want to remove', true, false) as IBlockchainQuickPickItem<FabricWalletRegistryEntry>[];
        if (!chosenWallet || chosenWallet.length === 0) {
            return;
        }
        walletsToDelete = chosenWallet.map((_wallet: IBlockchainQuickPickItem<FabricWalletRegistryEntry>) => {
            return _wallet.data;
        });

    } else {
        walletsToDelete = [treeItem.registryEntry];
    }

    const deleteFsWallet: string = await vscode.window.showWarningMessage(`This will remove the wallet(s). Do you want to continue?`, 'Yes', 'No');

    if (deleteFsWallet === undefined) { // warning box was cancelled - do nothing
        return;
    } else if (deleteFsWallet === 'Yes') {
        for (const _wallet of walletsToDelete) {

            await FabricWalletRegistry.instance().delete(_wallet.name);

            const gateways: FabricGatewayRegistryEntry[] =  await FabricGatewayRegistry.instance().getAll(false);
            for (const gateway of gateways) {
                if (gateway.associatedWallet === _wallet.name) {
                    gateway.associatedWallet = ''; // If the gateway uses the newly removed wallet, dissociate it from the gateway
                    await FabricGatewayRegistry.instance().update(gateway);
                }
            }

        }

        if (walletsToDelete.length > 1) {
            outputAdapter.log(LogType.SUCCESS, `Successfully removed wallets`);
        } else {
            outputAdapter.log(LogType.SUCCESS, `Successfully removed ${walletsToDelete[0].name} wallet`);
        }
    }

    // Else, do nothing.
}
