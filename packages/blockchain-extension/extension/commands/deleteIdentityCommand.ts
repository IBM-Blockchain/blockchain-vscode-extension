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
import * as fs from 'fs-extra';
import * as vscode from 'vscode';
import * as path from 'path';
import { UserInputUtil, IBlockchainQuickPickItem } from './UserInputUtil';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../logging/OutputAdapter';
import { FabricWalletRegistryEntry } from '../registries/FabricWalletRegistryEntry';
import { FabricWalletRegistry } from '../registries/FabricWalletRegistry';
import { IdentityTreeItem } from '../explorer/model/IdentityTreeItem';
import { IFabricWallet } from 'ibm-blockchain-platform-common';
import { IFabricWalletGenerator } from '../fabric/IFabricWalletGenerator';
import { FabricWalletGeneratorFactory } from '../fabric/FabricWalletGeneratorFactory';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricWalletUtil } from '../fabric/FabricWalletUtil';
import { FabricRuntimeUtil } from 'ibm-blockchain-platform-common';

export async function deleteIdentity(treeItem: IdentityTreeItem): Promise<void> {

    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, `deleteIdentity`);

    let walletPath: string;
    let identitiesToDelete: string[];
    if (!treeItem) {
        // Called from command palette
        const chosenWallet: IBlockchainQuickPickItem<FabricWalletRegistryEntry> = await UserInputUtil.showWalletsQuickPickBox('Choose the wallet containing the identity that you want to delete', false, true) as IBlockchainQuickPickItem<FabricWalletRegistryEntry>;
        if (!chosenWallet) {
            return;
        }

        // Get identities in that wallet
        const walletGenerator: IFabricWalletGenerator = FabricWalletGeneratorFactory.createFabricWalletGenerator();
        const wallet: IFabricWallet = await walletGenerator.getWallet(chosenWallet.data.name);
        walletPath = wallet.getWalletPath();
        let identityNames: string[] = await wallet.getIdentityNames();

        if (chosenWallet.label === FabricWalletUtil.LOCAL_WALLET_DISPLAY_NAME) {
            // If the local wallet was selected, we should filter out the admin identity
            identityNames = identityNames.filter((identity: string) => {
                return identity !== FabricRuntimeUtil.ADMIN_USER;
            });
        }

        if (chosenWallet.label === FabricWalletUtil.LOCAL_WALLET_DISPLAY_NAME && identityNames.length === 0) {
            outputAdapter.log(LogType.ERROR, `No identities to delete in wallet: ${chosenWallet.label}. The ${FabricRuntimeUtil.ADMIN_USER} identity cannot be deleted.`, `No identities to delete in wallet: ${chosenWallet.label}. The ${FabricRuntimeUtil.ADMIN_USER} identity cannot be deleted.`);
            return;
        } else if (identityNames.length === 0) {
            outputAdapter.log(LogType.ERROR, `No identities in wallet: ${walletPath}`, `No identities in wallet: ${walletPath}`);
            return;
        }

        identitiesToDelete = await UserInputUtil.showIdentitiesQuickPickBox('Choose the identities to delete', true, identityNames) as string[];
        if (!identitiesToDelete || identitiesToDelete.length === 0) {
            return;
        }

    } else {
        // Called from the tree
        if (treeItem.walletName === FabricWalletUtil.LOCAL_WALLET_DISPLAY_NAME) {
           const _wallet: IFabricWallet = await FabricWalletGeneratorFactory.createFabricWalletGenerator().getWallet(FabricWalletUtil.LOCAL_WALLET);
           walletPath = _wallet.getWalletPath();

        } else {
            const walletRegistryEntry: FabricWalletRegistryEntry =  await FabricWalletRegistry.instance().get(treeItem.walletName);
            walletPath = walletRegistryEntry.walletPath;
        }

        identitiesToDelete = [treeItem.label];
    }

    let areYouSure: boolean;

    if (identitiesToDelete.length > 1) {
        areYouSure = await UserInputUtil.showConfirmationWarningMessage(`This will delete the selected identities from your file system. Do you want to continue?`);
    } else {
        areYouSure = await UserInputUtil.showConfirmationWarningMessage(`This will delete ${identitiesToDelete[0]} from your file system. Do you want to continue?`);
    }

    if (!areYouSure) {
        return;
    }
    for (const _identity of identitiesToDelete) {
        await fs.remove(path.join(walletPath, _identity));
        await vscode.commands.executeCommand(ExtensionCommands.REFRESH_WALLETS);
    }

    if (identitiesToDelete.length > 1) {
        outputAdapter.log(LogType.SUCCESS, `Successfully deleted selected identities.`);
    } else {
        outputAdapter.log(LogType.SUCCESS, `Successfully deleted identity: ${identitiesToDelete[0]}`);
    }

    return;
}
