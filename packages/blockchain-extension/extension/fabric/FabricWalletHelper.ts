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
import { SettingConfigurations } from '../configurations';
import { FileConfigurations, FileSystemUtil } from 'ibm-blockchain-platform-common';
import * as path from 'path';

export class FabricWalletHelper {
    static readonly LOCAL_WALLET_DISPLAY_NAME: string = 'Local Fabric Wallet';

    public static getWalletPath(walletName: string): string {
        const extDir: string = SettingConfigurations.getExtensionDir();
        const homeExtDir: string = FileSystemUtil.getDirPath(extDir);
        return path.join(homeExtDir, FileConfigurations.FABRIC_WALLETS, walletName);
    }
}
