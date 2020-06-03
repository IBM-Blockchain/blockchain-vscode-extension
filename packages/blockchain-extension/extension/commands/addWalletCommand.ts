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
import * as vscode from 'vscode';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { UserInputUtil } from './UserInputUtil';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricWalletRegistry, FabricWalletRegistryEntry, IFabricWallet, IFabricWalletGenerator, LogType, FabricWalletGeneratorFactory } from 'ibm-blockchain-platform-common';
import { FabricWalletHelper} from '../fabric/FabricWalletHelper';

export async function addWallet(createIdentity: boolean = true, environmentGroup?: string): Promise<FabricWalletRegistryEntry> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, 'addWallet');

    let walletName: string;
    let walletPath: string;
    let walletUri: vscode.Uri;
    let wallet: IFabricWallet;
    let identities: string[];
    const fabricWalletRegistry: FabricWalletRegistry = FabricWalletRegistry.instance();
    const fabricWalletRegistryEntry: FabricWalletRegistryEntry = new FabricWalletRegistryEntry();

    try {
        // Ask for method to add wallet
        const walletMethod: string = await UserInputUtil.showAddWalletOptionsQuickPick('Choose a method to add a wallet:', createIdentity);
        if (!walletMethod) {
            // User cancelled dialog box
            return;
    }
        if (walletMethod === UserInputUtil.IMPORT_WALLET) {
            // User has a wallet - get the path
            const openDialogOptions: vscode.OpenDialogOptions = {
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                openLabel: 'Select',
            };
            walletUri = await UserInputUtil.browse('Enter a file path to a wallet directory', UserInputUtil.BROWSE_LABEL, openDialogOptions, true) as vscode.Uri;
            if (!walletUri) {
                // User cancelled dialog box
                return;
            }
            walletPath = walletUri.fsPath;
            walletName = path.basename(walletPath);

            // Check if a wallet with the same name already exists
            const exists: boolean = await fabricWalletRegistry.exists(walletName);
            if (exists) {
                outputAdapter.log(LogType.ERROR, `A wallet with this name already exists.`);
                return;
            }

            // Add the wallet to the registry
            fabricWalletRegistryEntry.name = walletName;
            fabricWalletRegistryEntry.walletPath = walletPath;
            if (environmentGroup) {
                fabricWalletRegistryEntry.environmentGroups = [environmentGroup];
            }
            await fabricWalletRegistry.add(fabricWalletRegistryEntry);

            // Check it contains identities
            const fabricWalletGenerator: IFabricWalletGenerator = FabricWalletGeneratorFactory.getFabricWalletGenerator();
            wallet = await fabricWalletGenerator.getWallet(fabricWalletRegistryEntry);
            identities = await wallet.getIdentityNames();
            if (identities.length === 0) {
                await fabricWalletRegistry.delete(walletName);
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
            const exists: boolean = await fabricWalletRegistry.exists(walletName);
            if (exists) {
                outputAdapter.log(LogType.ERROR, `A wallet with this name already exists.`);
                return;
            }

            // Add the wallet to the registry
            fabricWalletRegistryEntry.name = walletName;
            fabricWalletRegistryEntry.walletPath = FabricWalletHelper.getWalletPath(walletName);
            if (environmentGroup) {
                fabricWalletRegistryEntry.environmentGroups = [environmentGroup];
            }
            await fabricWalletRegistry.add(fabricWalletRegistryEntry);

            if (createIdentity) {
                // Add identity to wallet
                await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET_IDENTITY, fabricWalletRegistryEntry);

                // Did it work?
                const fabricWalletGenerator: IFabricWalletGenerator = FabricWalletGeneratorFactory.getFabricWalletGenerator();
                wallet = await fabricWalletGenerator.getWallet(fabricWalletRegistryEntry);
                identities = await wallet.getIdentityNames();
                if (identities.length === 0) {
                    // No identity added, so remove the wallet and return
                    await FabricWalletRegistry.instance().delete(walletName);
                    return;
                }
            }
        }

        outputAdapter.log(LogType.SUCCESS, 'Successfully added a new wallet');
        return fabricWalletRegistryEntry;

    } catch (error) {
        await FabricWalletRegistry.instance().delete(walletName, true);
        outputAdapter.log(LogType.ERROR, `Failed to add a new wallet: ${error.message}`, `Failed to add a new wallet: ${error.message}`);
    }
}
