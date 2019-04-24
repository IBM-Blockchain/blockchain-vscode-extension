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

export class FabricWalletGenerator implements IFabricWalletGenerator {

    public static instance(): FabricWalletGenerator {
        return FabricWalletGenerator._instance;
    }

    private static _instance: FabricWalletGenerator = new FabricWalletGenerator();

    public async createLocalWallet(walletName: string): Promise<FabricWallet> {

        const extDir: string = vscode.workspace.getConfiguration().get('blockchain.ext.directory');
        const homeExtDir: string = UserInputUtil.getDirPath(extDir);
        const walletPath: string = path.join(homeExtDir, walletName);
        const walletExists: boolean = await fs.pathExists(walletPath);

        if (!walletExists) {
            await fs.ensureDir(walletPath);
        }

        return new FabricWallet(walletPath);
    }

    public async deleteLocalWallet(walletName: string): Promise<void> {

        const extDir: string = vscode.workspace.getConfiguration().get('blockchain.ext.directory');
        const homeExtDir: string = UserInputUtil.getDirPath(extDir);
        const walletPath: string = path.join(homeExtDir, walletName);
        const walletExists: boolean = await fs.pathExists(walletPath);

        if (walletExists) {
            await fs.remove(walletPath);
        }

    }

    public getNewWallet(walletPath: string): FabricWallet {
        return new FabricWallet(walletPath);
    }
}
