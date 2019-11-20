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
import { BlockchainTreeItem } from '../../model/BlockchainTreeItem';
import { BlockchainExplorerProvider } from '../../BlockchainExplorerProvider';

export class InstalledChainCodeOpsTreeItem extends BlockchainTreeItem {
    contextValue: string = 'blockchain-runtime-installed-chaincode-item';

    constructor(provider: BlockchainExplorerProvider, public readonly name: string, public readonly version: string, public peerNames: string[]) {
        super(provider, `${name}@${version}`, vscode.TreeItemCollapsibleState.None);

        this.tooltip = `Installed on:`;
        for (let i: number = 0; i < peerNames.length; i++) {
            if (i === peerNames.length - 1) {
                this.tooltip += ` ${peerNames[i]}`;
            } else {
                this.tooltip += ` ${peerNames[i]},`;
            }
        }
    }
}
