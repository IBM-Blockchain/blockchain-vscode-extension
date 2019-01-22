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

export class PeerTreeItem extends BlockchainTreeItem {
    contextValue: string = 'blockchain-peer-item';

    iconPath: {light: string, dark: string} = {
        light: path.join(__filename, '..', '..', '..', '..', '..', 'resources', 'light', 'node.svg'),
        dark: path.join(__filename, '..', '..', '..',  '..', '..', 'resources', 'dark', 'node.svg')
    };

    constructor(provider: BlockchainExplorerProvider, public readonly peerName: any, public readonly chaincodes: Map<string, Array<string>>, collapsibleState: vscode.TreeItemCollapsibleState) {
        super(provider, peerName, collapsibleState);
    }
}
