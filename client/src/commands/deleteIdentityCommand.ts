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
import { FabricWalletRegistryEntry } from '../fabric/FabricWalletRegistryEntry';
import { FabricWalletRegistry } from '../fabric/FabricWalletRegistry';
import { IdentityTreeItem } from '../explorer/model/IdentityTreeItem';
import { IFabricWallet } from '../fabric/IFabricWallet';
import { IFabricWalletGenerator } from '../fabric/IFabricWalletGenerator';
import { FabricWalletGeneratorFactory } from '../fabric/FabricWalletGeneratorFactory';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricWalletUtil } from '../fabric/FabricWalletUtil';
import { FabricRuntimeUtil } from '../fabric/FabricRuntimeUtil';

export async function deleteIdentity(treeItem: IdentityTreeItem): Promise<void> {

    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, `deleteIdentity`);

    let walletPath: string;
    let identityName: string;
    if (!treeItem) {
        // Called from command palette
        const chosenWallet: IBlockchainQuickPickItem<FabricWalletRegistryEntry> = await UserInputUtil.showWalletsQuickPickBox('Choose the wallet containing the identity that you want to delete', true);
        if (!chosenWallet) {
            return;
        }
        walletPath = chosenWallet.data.walletPath;

        // Get identities in that wallet
        const walletGenerator: IFabricWalletGenerator = FabricWalletGeneratorFactory.createFabricWalletGenerator();
        const wallet: IFabricWallet = walletGenerator.getNewWallet(walletPath);
        let identityNames: string[] = await wallet.getIdentityNames();

        if (chosenWallet.label === FabricWalletUtil.LOCAL_WALLET) {
            // If the local wallet was selected, we should filter out the admin identity
            identityNames = identityNames.filter((identity: string) => {
                return identity !== FabricRuntimeUtil.ADMIN_USER;
            });
        }

        if (identityNames.length === 0) {
            outputAdapter.log(LogType.ERROR, `No identities in wallet: ${walletPath}`, `No identities in wallet: ${walletPath}`);
            return;
        }

        identityName = await UserInputUtil.showIdentitiesQuickPickBox('Choose the identity to delete', identityNames);
        if (!identityName) {
            return;
        }

    } else {
        // Called from the tree
        if (treeItem.walletName === FabricWalletUtil.LOCAL_WALLET) {
           const _wallet: IFabricWallet = await FabricWalletGeneratorFactory.createFabricWalletGenerator().createLocalWallet(FabricWalletUtil.LOCAL_WALLET);
           walletPath = _wallet.getWalletPath();

        } else {
            walletPath = FabricWalletRegistry.instance().get(treeItem.walletName).walletPath;
        }

        identityName = treeItem.label;
    }

    const areYouSure: boolean = await UserInputUtil.showConfirmationWarningMessage(`This will delete ${identityName} from your file system. Do you want to continue?`);

    if (areYouSure) {
        await fs.remove(path.join(walletPath, identityName));
        await vscode.commands.executeCommand(ExtensionCommands.REFRESH_WALLETS);
        outputAdapter.log(LogType.SUCCESS, `Successfully deleted identity: ${identityName}`, `Successfully deleted identity: ${identityName}`);
    }
    return;
}
