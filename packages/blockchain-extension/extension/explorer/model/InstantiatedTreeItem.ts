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
import { ChannelTreeItem } from './ChannelTreeItem';

export abstract class InstantiatedTreeItem extends BlockchainTreeItem {

    iconPath: { light: string, dark: string } = {
        light: path.join(__filename, '..', '..', '..', '..', '..', 'resources', 'light', 'smart-contract.svg'),
        dark: path.join(__filename, '..', '..', '..', '..', '..', 'resources', 'dark', 'smart-contract.svg')
    };
    instantiatedChaincode: { name: string, version: string };

    constructor(provider: BlockchainExplorerProvider, public readonly name: string, public readonly channels: ChannelTreeItem[], public readonly version: string, public readonly collapsibleState: vscode.TreeItemCollapsibleState, public readonly contracts?: string[], public readonly showIcon?: boolean) {
        super(provider, `${name}@${version}`, collapsibleState);

        this.tooltip = `Instantiated on:`;
        for (let i: number = 0; i < channels.length; i++) {
            if (i === channels.length - 1) {
                this.tooltip += ` ${channels[i].label}`;
            } else {
                this.tooltip += ` ${channels[i].label},`;
            }
        }

        if (!showIcon) {
            this.iconPath = null;
        }
    }
}
