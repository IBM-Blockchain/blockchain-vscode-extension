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

export class FabricWalletUtil {
    static readonly LOCAL_WALLET: string = 'local_fabric_wallet';

    public static async tidyWalletSettings(): Promise<void> {
        // Get wallets from user settings
        const wallets: any = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_WALLETS);
        for (const wallet of wallets) {
            // delete the managedWallet boolean
            delete wallet.managedWallet;
        }
        // Rewrite the updated wallets to the user settings
        await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_WALLETS, wallets, vscode.ConfigurationTarget.Global);

    }
}
