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
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../logging/OutputAdapter';
import { UserInputUtil } from './UserInputUtil';
import * as vscode from 'vscode';
import { FabricWalletRegistry } from '../fabric/FabricWalletRegistry';
import { FabricWalletRegistryEntry } from '../fabric/FabricWalletRegistryEntry';

export async function addWallet(): Promise<void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, 'addWallet');

    try {
        // Ask for wallet name
        const walletName: string = await UserInputUtil.showInputBox('Enter a name for the wallet');
        if (!walletName) {
            // User cancelled dialog box
            return Promise.resolve();
        }
        // TODO: correct user flows for different methods to add a wallet
        // User has a wallet - get the path - ask them to browse for it
        const quickPickItems: string[] = [UserInputUtil.BROWSE_LABEL];
        const openDialogOptions: vscode.OpenDialogOptions = {
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'Select',
        };
        const walletPath: string = await UserInputUtil.browseEdit('Enter a file path to a wallet directory', quickPickItems, openDialogOptions) as string;
        if (!walletPath) {
            // User cancelled dialog box
            return Promise.resolve();
        }

        // Add the wallet to the registry
        const fabricWalletRegistry: FabricWalletRegistry = FabricWalletRegistry.instance();
        const fabricWalletRegistryEntry: FabricWalletRegistryEntry = new FabricWalletRegistryEntry();
        fabricWalletRegistryEntry.name = walletName;
        fabricWalletRegistryEntry.walletPath = walletPath;
        await fabricWalletRegistry.add(fabricWalletRegistryEntry);

        outputAdapter.log(LogType.SUCCESS, 'Successfully added a new wallet');

    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Failed to add a new wallet: ${error.message}`, `Failed to add a new wallet: ${error.message}`);
    }
}
