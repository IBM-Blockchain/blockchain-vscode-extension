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
import * as path from 'path';
import * as fs from 'fs-extra';
import { FabricWallet } from './FabricWallet';
import { UserInputUtil } from '../commands/UserInputUtil';
import { IFabricWalletGenerator } from './IFabricWalletGenerator';
import { SettingConfigurations } from '../../SettingConfigurations';
import { FabricWalletUtil } from './FabricWalletUtil';
import { FabricWalletRegistryEntry } from '../registries/FabricWalletRegistryEntry';
import { FabricWalletRegistry } from '../registries/FabricWalletRegistry';

export class FabricWalletGenerator implements IFabricWalletGenerator {

    public static instance(): FabricWalletGenerator {
        return FabricWalletGenerator._instance;
    }

    private static _instance: FabricWalletGenerator = new FabricWalletGenerator();

    public async getWallet(walletName: string): Promise<FabricWallet> {

        const walletExists: boolean = FabricWalletRegistry.instance().exists(walletName);
        if (walletName === FabricWalletUtil.LOCAL_WALLET || !walletExists) {
            return await this.createWallet(walletName);
        } else {
            const walletRegistryEntry: FabricWalletRegistryEntry = FabricWalletRegistry.instance().get(walletName);
            return new FabricWallet(walletRegistryEntry.walletPath);
        }
    }

    public async deleteLocalWallet(walletName: string): Promise<void> {

        const extDir: string = vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_DIRECTORY);
        const homeExtDir: string = UserInputUtil.getDirPath(extDir);
        const walletPath: string = path.join(homeExtDir, 'wallets', walletName);
        const walletExists: boolean = await fs.pathExists(walletPath);

        if (walletExists) {
            await fs.remove(walletPath);
        }

    }

    private async createWallet(walletName: string): Promise<FabricWallet> {
        const extDir: string = vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_DIRECTORY);
        const homeExtDir: string = UserInputUtil.getDirPath(extDir);
        const walletPath: string = path.join(homeExtDir, 'wallets', walletName);
        const walletExists: boolean = await fs.pathExists(walletPath);
        if (!walletExists) {
            await fs.ensureDir(walletPath);
        }
        return new FabricWallet(walletPath);
    }
}
