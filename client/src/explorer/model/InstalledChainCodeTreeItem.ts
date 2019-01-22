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
import { BlockchainTreeItem } from './BlockchainTreeItem';
import { BlockchainExplorerProvider } from '../BlockchainExplorerProvider';

export class InstalledChainCodeTreeItem extends BlockchainTreeItem {
    contextValue: string = 'blockchain-installed-chaincode-item';

    iconPath: {light: string, dark: string} = {
        light: path.join(__filename, '..', '..', '..', '..', '..', 'resources', 'light', 'smart-contract.svg'),
        dark: path.join(__filename, '..', '..', '..',  '..', '..', 'resources', 'dark', 'smart-contract.svg')
    };

    constructor(provider: BlockchainExplorerProvider, private readonly name: string, public readonly versions: Array<string>) {
        super(provider, name, vscode.TreeItemCollapsibleState.Collapsed);
    }
}
