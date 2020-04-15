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
import { BlockchainTreeItem } from './BlockchainTreeItem';
import * as vscode from 'vscode';
import * as path from 'path';
import { BlockchainExplorerProvider } from '../BlockchainExplorerProvider';
import { FabricWalletRegistryEntry } from 'ibm-blockchain-platform-common';

export class IdentityTreeItem extends BlockchainTreeItem {
    contextValue: string = 'blockchain-identity-item';
    iconPath: { light: string, dark: string } = {
        light: path.join(__filename, '..', '..', '..', '..', '..', 'resources', 'light', 'identification.svg'),
        dark: path.join(__filename, '..', '..', '..', '..', '..', 'resources', 'dark', 'identification.svg')
    };
    constructor(provider: BlockchainExplorerProvider, public readonly label: string, public readonly walletName: string, public readonly attributes: any = {}, public readonly registryEntry: FabricWalletRegistryEntry) {
        super(provider, label, vscode.TreeItemCollapsibleState.None);
        this.tooltip = `Attributes:\n`;
        if (Object.keys(attributes).length > 0) {
            for (const attr of Object.keys(attributes)) {
                this.tooltip += `\n${attr}:${attributes[attr]}`;
            }
        } else {
            this.tooltip += `\nNone`;
        }
    }
}
