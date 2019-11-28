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
import { UserInputUtil, IBlockchainQuickPickItem } from './UserInputUtil';
import { FabricWalletRegistryEntry, LogType } from 'ibm-blockchain-platform-common';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import { Reporter } from '../util/Reporter';
import { WalletTreeItem } from '../explorer/wallets/WalletTreeItem';

export async function exportWallet(walletTreeItem?: WalletTreeItem): Promise<void> {

    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, 'exportWalletCommand');

    let exportedWalletRegistryEntry: FabricWalletRegistryEntry;

    if (!walletTreeItem) {
        // called from command palette - ask for wallet to export
        const chosenWallet: IBlockchainQuickPickItem<FabricWalletRegistryEntry> = await UserInputUtil.showWalletsQuickPickBox('Choose a wallet to export', false, true) as IBlockchainQuickPickItem<FabricWalletRegistryEntry>;
        if (!chosenWallet) {
            // User cancelled dialog box
            return;
        }
        exportedWalletRegistryEntry = chosenWallet.data;
    } else {
        // Called from the tree
        exportedWalletRegistryEntry = walletTreeItem.registryEntry;
    }

    // Ask the user where they want to export it to
    // set the default path to be the first open workspace folder
    let defaultPath: string;
    const workspaceFolders: Array<vscode.WorkspaceFolder> = UserInputUtil.getWorkspaceFolders();
    if (workspaceFolders.length > 0) {
        defaultPath = path.join(workspaceFolders[0].uri.fsPath, exportedWalletRegistryEntry.name);
    } else {
        defaultPath = path.join(os.homedir(), exportedWalletRegistryEntry.name);
    }

    const walletUri: vscode.Uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(defaultPath),
        saveLabel: 'Export'
    });
    if (!walletUri) {
        // User cancelled save dialog box
        return;
    }

    // Copy the wallet to the chosen location
    try {
        await fs.copy(exportedWalletRegistryEntry.walletPath, walletUri.fsPath, { overwrite: true });
    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Issue exporting wallet: ${error.message}`, `Issue exporting wallet: ${error.toString()}`);
        return;
    }
    outputAdapter.log(LogType.SUCCESS, `Successfully exported wallet ${exportedWalletRegistryEntry.name} to ${walletUri.fsPath}`);
    Reporter.instance().sendTelemetryEvent('exportWallet');
}
