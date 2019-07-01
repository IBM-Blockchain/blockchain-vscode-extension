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
import { SettingConfigurations } from '../../SettingConfigurations';
import * as path from 'path';
import * as fs from 'fs-extra';

export class FabricWalletUtil {
    static readonly LOCAL_WALLET: string = 'local_fabric_wallet';

    public static async tidyWalletSettings(): Promise<void> {
        // Get wallets from user settings
        const wallets: any = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_WALLETS);
        const extDir: string = vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_DIRECTORY);
        const walletsExtDir: string = path.join(extDir, 'wallets');
        let newWalletDir: string;

        for (const wallet of wallets) {
            // delete the managedWallet boolean
            delete wallet.managedWallet;

            // Ensure all wallets are stored under wallets subdirectory
            if ( wallet.walletPath.includes(extDir) && !wallet.walletPath.includes(walletsExtDir)) {
                newWalletDir = path.join(walletsExtDir, path.basename(wallet.walletPath) );
                try {
                    await fs.copy(wallet.walletPath, newWalletDir);
                } catch (error) {
                    throw new Error(`Issue copying ${wallet.walletPath} to ${newWalletDir}: ${error.message}`);
                }
                // Only remove the walletPath if the copy worked
                await fs.remove(wallet.walletPath);
                wallet.walletPath = newWalletDir;
            }

        }
        // Rewrite the updated wallets to the user settings
        await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_WALLETS, wallets, vscode.ConfigurationTarget.Global);

        // Migrate local_fabric_wallet if it exists
        const localFabricWalletPath: string = path.join(extDir, FabricWalletUtil.LOCAL_WALLET);
        const localWalletExists: boolean = await fs.pathExists(localFabricWalletPath);
        if (localWalletExists) {
            try {
                newWalletDir = path.join(walletsExtDir, FabricWalletUtil.LOCAL_WALLET);
                await fs.copy(localFabricWalletPath, newWalletDir);
            } catch (error) {
                throw new Error(`Issue copying ${localFabricWalletPath} to ${newWalletDir}: ${error.message}`);
            }
            // Only remove the walletPath if the copy worked
            await fs.remove(localFabricWalletPath);
        }

    }
}
