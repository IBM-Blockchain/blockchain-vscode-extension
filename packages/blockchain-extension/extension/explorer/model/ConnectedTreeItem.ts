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
import { BlockchainExplorerProvider } from '../BlockchainExplorerProvider';
import * as path from 'path';
import { FabricRuntimeUtil, FabricGatewayRegistryEntry } from 'ibm-blockchain-platform-common';

export class ConnectedTreeItem extends BlockchainTreeItem {
    contextValue: string = 'blockchain-connected-item';

    iconPath: {light: string, dark: string} = {
        light: path.join(__filename, '..', '..', '..', '..', '..', 'resources', 'light', 'channel.svg'),
        dark: path.join(__filename, '..', '..', '..',  '..', '..', 'resources', 'dark', 'channel.svg')
    };

    constructor(provider: BlockchainExplorerProvider, public readonly label: string, public readonly connection: FabricGatewayRegistryEntry, public readonly collapsibleState: vscode.TreeItemCollapsibleState) {
        super(provider, label, collapsibleState);

        if (connection.name && connection.name.includes(`${FabricRuntimeUtil.LOCAL_FABRIC} - `)) {
            this.contextValue = 'blockchain-connected-runtime-item';
        }

        if (label.includes('Connected via gateway') || label.includes('Using ID')) {
            this.iconPath = null;
        }
    }
}
