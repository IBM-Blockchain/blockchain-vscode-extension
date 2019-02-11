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
import { FabricConnectionRegistryEntry } from '../../fabric/FabricConnectionRegistryEntry';
import * as path from 'path';

export class ConnectedTreeItem extends BlockchainTreeItem {
    contextValue: string = 'blockchain-connected-item';

    iconPath: {light: string, dark: string} = {
        light: path.join(__filename, '..', '..', '..', '..', '..', 'resources', 'light', 'channel.svg'),
        dark: path.join(__filename, '..', '..', '..',  '..', '..', 'resources', 'dark', 'channel.svg')
    };

    constructor(provider: BlockchainExplorerProvider, private readonly connectionName: string, public readonly connection: FabricConnectionRegistryEntry) {
        super(provider, connectionName, vscode.TreeItemCollapsibleState.None);

        if (connection.managedRuntime) {
            this.contextValue = 'blockchain-connected-runtime-item';
        }

        if (connectionName.includes('Connected via gateway') || connectionName.includes('Using ID')) {
            this.iconPath = null;
        }
    }
}
