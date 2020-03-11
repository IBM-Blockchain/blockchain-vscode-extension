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
import { SettingConfigurations } from '../../configurations';
import { FabricWalletRegistry, FabricWalletRegistryEntry, FileConfigurations, FileSystemUtil } from 'ibm-blockchain-platform-common';
import * as path from 'path';
import * as fs from 'fs-extra';

export class FabricWalletHelper {
    static readonly OLD_LOCAL_WALLET: string = 'local_fabric_wallet';
    static readonly LOCAL_WALLET_DISPLAY_NAME: string = 'Local Fabric Wallet';

    public static async tidyWalletSettings(): Promise<void> {
        // Get wallets from user settings
        const _wallets: FabricWalletRegistryEntry[] = vscode.workspace.getConfiguration().get(SettingConfigurations.OLD_FABRIC_WALLETS);
        const wallets: any = JSON.parse(JSON.stringify(_wallets));
        const extDir: string = vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_DIRECTORY);
        const resolvedExtDir: string = FileSystemUtil.getDirPath(extDir);
        const walletsExtDir: string = path.join(resolvedExtDir, FileConfigurations.FABRIC_WALLETS);
        let newWalletDir: string;

        for (const wallet of wallets) {
            // delete the managedWallet boolean
            delete wallet.managedWallet;

            // need to make sure the config is written
            const walletRegistryEntry: FabricWalletRegistryEntry = new FabricWalletRegistryEntry();
            walletRegistryEntry.name = wallet.name;
            walletRegistryEntry.walletPath = wallet.walletPath;

            const exists: boolean = await FabricWalletRegistry.instance().exists(wallet.name);

            if (!exists) {
                await FabricWalletRegistry.instance().add(walletRegistryEntry);
            }

            // Ensure all wallets are stored under wallets subdirectory
            if (wallet.walletPath && wallet.walletPath.includes(extDir) && !wallet.walletPath.includes(walletsExtDir)) {
                newWalletDir = path.join(walletsExtDir, path.basename(wallet.walletPath));
                try {
                    await fs.copy(wallet.walletPath, newWalletDir);
                } catch (error) {
                    throw new Error(`Issue copying ${wallet.walletPath} to ${newWalletDir}: ${error.message}`);
                }
                // Only remove the walletPath if the copy worked
                await fs.remove(wallet.walletPath);
            }
        }

        // Rewrite the updated wallets to the user settings
        await vscode.workspace.getConfiguration().update(SettingConfigurations.OLD_FABRIC_WALLETS, [], vscode.ConfigurationTarget.Global);

        // Delete local_fabric_wallet if it exists
        const localFabricWalletPath: string = path.join(resolvedExtDir, FabricWalletHelper.OLD_LOCAL_WALLET);
        const localWalletExists: boolean = await fs.pathExists(localFabricWalletPath);
        if (localWalletExists) {
            await fs.remove(localFabricWalletPath);
        }
    }

    public static getWalletPath(walletName: string): string {
        const extDir: string = vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_DIRECTORY);
        const homeExtDir: string = FileSystemUtil.getDirPath(extDir);
        return path.join(homeExtDir, FileConfigurations.FABRIC_WALLETS, walletName);
    }
}
