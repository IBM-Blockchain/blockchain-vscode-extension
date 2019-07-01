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
import * as path from 'path';
import * as fs from 'fs-extra';
import * as vscode from 'vscode';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../logging/OutputAdapter';
import { UserInputUtil } from './UserInputUtil';
import { FabricWalletRegistry } from '../fabric/FabricWalletRegistry';
import { FabricWalletRegistryEntry } from '../fabric/FabricWalletRegistryEntry';
import { ExtensionCommands } from '../../ExtensionCommands';
import { IFabricWallet } from '../fabric/IFabricWallet';
import { FabricWalletGeneratorFactory } from '../fabric/FabricWalletGeneratorFactory';
import { IFabricWalletGenerator } from '../fabric/IFabricWalletGenerator';
import { FabricWalletUtil } from '../fabric/FabricWalletUtil';

export async function addWallet(): Promise<void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, 'addWallet');

    let walletName: string;
    let walletPath: string;
    let walletUri: vscode.Uri;
    let wallet: IFabricWallet;
    let identities: string[];
    const fabricWalletRegistry: FabricWalletRegistry = FabricWalletRegistry.instance();

    try {
        // Ask for method to add wallet
        const walletMethod: string = await UserInputUtil.showAddWalletOptionsQuickPick('Choose a method to add a wallet:');
        if (!walletMethod) {
            // User cancelled dialog box
            return;
        }
        if (walletMethod === UserInputUtil.IMPORT_WALLET) {
            // User has a wallet - get the path
            const quickPickItems: string[] = [UserInputUtil.BROWSE_LABEL];
            const openDialogOptions: vscode.OpenDialogOptions = {
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                openLabel: 'Select',
            };
            walletUri = await UserInputUtil.browse('Enter a file path to a wallet directory', quickPickItems, openDialogOptions, true) as vscode.Uri;
            if (!walletUri) {
                // User cancelled dialog box
                return;
            }
            walletPath = walletUri.fsPath;
            walletName = path.basename(walletPath);

            // Check if a wallet with the same name already exists
            if (fabricWalletRegistry.exists(walletName) || walletName === FabricWalletUtil.LOCAL_WALLET) {
                throw new Error('A wallet with this name already exists.');
            }

            // Check it contains identities
            const fabricWalletGenerator: IFabricWalletGenerator = FabricWalletGeneratorFactory.createFabricWalletGenerator();
            wallet = fabricWalletGenerator.getNewWallet(walletPath);
            identities = await wallet.getIdentityNames();
            if (identities.length === 0) {
                throw new Error(`No identities found in wallet: ${walletPath}`);
            }

        } else {
            // Ask for wallet name
            walletName = await UserInputUtil.showInputBox('Enter a name for the wallet');
            if (!walletName) {
                // User cancelled dialog box
                return;
            }

            // Check if a wallet with the same name already exists
            if (fabricWalletRegistry.exists(walletName) || walletName === FabricWalletUtil.LOCAL_WALLET) {
                throw new Error('A wallet with this name already exists.');
            }

            // Create a local file system wallet
            wallet = await FabricWalletGeneratorFactory.createFabricWalletGenerator().createLocalWallet(walletName);
            walletPath = wallet.getWalletPath();
            // Add identity to wallet
            await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET_IDENTITY, wallet);

            // Did it work?
            identities = await wallet.getIdentityNames();
            if (identities.length === 0) {
                // No identity added, so remove the wallet and return
                await fs.remove(walletPath);
                return;
            }

        }

        // Add the wallet to the registry
        const fabricWalletRegistryEntry: FabricWalletRegistryEntry = new FabricWalletRegistryEntry();
        fabricWalletRegistryEntry.name = walletName;
        fabricWalletRegistryEntry.walletPath = walletPath;
        await fabricWalletRegistry.add(fabricWalletRegistryEntry);

        outputAdapter.log(LogType.SUCCESS, 'Successfully added a new wallet');

    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Failed to add a new wallet: ${error.message}`, `Failed to add a new wallet: ${error.message}`);
    }
}
