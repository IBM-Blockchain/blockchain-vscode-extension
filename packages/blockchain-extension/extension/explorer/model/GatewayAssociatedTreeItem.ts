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
// import * as path from 'path';
import { BlockchainExplorerProvider } from '../BlockchainExplorerProvider';
import { FabricGatewayRegistryEntry } from 'ibm-blockchain-platform-common';
import { GatewayTreeItem } from './GatewayTreeItem';

export class GatewayAssociatedTreeItem extends GatewayTreeItem {
    contextValue: string = 'blockchain-gateway-associated-item';

    constructor(provider: BlockchainExplorerProvider, public readonly label: string, public readonly gateway: FabricGatewayRegistryEntry, public readonly collapsableState: vscode.TreeItemCollapsibleState, public readonly command?: vscode.Command) {
        super(provider, label, gateway, collapsableState, command);
        // Have to keep tool tip formatted like this, as otherwise it doesn't display over two lines
        this.tooltip = `ⓘ Associated wallet:
    ${gateway.associatedWallet}`;
        this.label += ' ⧉';
    }
}
