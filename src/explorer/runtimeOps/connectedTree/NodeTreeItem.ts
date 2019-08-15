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

import { BlockchainTreeItem } from '../../model/BlockchainTreeItem';
import { FabricNode } from '../../../fabric/FabricNode';
import { BlockchainExplorerProvider } from '../../BlockchainExplorerProvider';
import * as vscode from 'vscode';

export abstract class NodeTreeItem extends BlockchainTreeItem {

    private orginalLabel: string;

    constructor(provider: BlockchainExplorerProvider, label: string, public readonly node: FabricNode, public readonly command?: vscode.Command) {
        super(provider, label, vscode.TreeItemCollapsibleState.None);

        this.orginalLabel = label;

        this.updateProperties();
    }

    protected updateProperties(): void {
        let newLabel: string = this.orginalLabel;

        if (!this.node.wallet || !this.node.identity) {
            newLabel += '   ⚠';
        }

        this.setLabel(newLabel);
        this.refresh();
    }

    private setLabel(label: string): void {
        // label is readonly so make it less readonly
        (this as any).label = label;
    }
}
