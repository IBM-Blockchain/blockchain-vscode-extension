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
import { BlockchainExplorerProvider } from '../BlockchainExplorerProvider';
import * as vscode from 'vscode';
import * as path from 'path';

export class ChannelTreeItem extends BlockchainTreeItem {
    contextValue: string = 'blockchain-channel-item';

    iconPath: { light: string, dark: string } = {
        light: path.join(__filename, '..', '..', '..', '..', '..', 'resources', 'light', 'channel.svg'),
        dark: path.join(__filename, '..', '..', '..', '..', '..', 'resources', 'dark', 'channel.svg')
    };

    constructor(provider: BlockchainExplorerProvider, channelName: string, public readonly peers: Array<string>, public readonly chaincodes: Array<any>, public readonly capability: string, public readonly collapsibleState: vscode.TreeItemCollapsibleState) {
        super(provider, channelName, collapsibleState);

        this.tooltip = `Associated peers:`;
        for (let i: number = 0; i < peers.length; i++) {
            if (i === peers.length - 1) {
                this.tooltip += ` ${peers[i]}`;
            } else {
                this.tooltip += ` ${peers[i]},`;
            }
        }

        this.tooltip += `\nChannel capabilities: ${capability}`;

    }
}
