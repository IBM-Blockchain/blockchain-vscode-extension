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
import { BlockchainTreeItem } from '../model/BlockchainTreeItem';
import { BlockchainExplorerProvider } from '../BlockchainExplorerProvider';
import { FabricRuntimeManager } from '../../fabric/FabricRuntimeManager';
import { FabricRuntime } from '../../fabric/FabricRuntime';
import { VSCodeOutputAdapter } from '../../logging/VSCodeOutputAdapter';
import { LogType } from '../../logging/OutputAdapter';

export class PeerTreeItem extends BlockchainTreeItem {

    static async newPeerTreeItem(provider: BlockchainExplorerProvider, peerName: string, chaincodes: Map<string, Array<string>>, collapsibleState: vscode.TreeItemCollapsibleState, removeIcon?: boolean): Promise<PeerTreeItem> {
        const treeItem: PeerTreeItem = new PeerTreeItem(provider, peerName, chaincodes, collapsibleState, removeIcon);
        await treeItem.updateProperties();
        return treeItem;
    }

    contextValue: string = 'blockchain-peer-item';

    iconPath: { light: string, dark: string } = {
        light: path.join(__filename, '..', '..', '..', '..', '..', 'resources', 'light', 'node.svg'),
        dark: path.join(__filename, '..', '..', '..', '..', '..', 'resources', 'dark', 'node.svg')
    };

    private runtime: FabricRuntime;

    constructor(provider: BlockchainExplorerProvider, public readonly peerName: string, public readonly chaincodes: Map<string, Array<string>>, collapsibleState: vscode.TreeItemCollapsibleState, removeIcon?: boolean) {
        super(provider, peerName, collapsibleState);

        const runtimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
        this.runtime = runtimeManager.get('local_fabric');

        if (removeIcon) {
            this.iconPath = null;
        }

        this.safelyUpdateProperties();
    }

    private safelyUpdateProperties(): void {
        const outputAdapter: VSCodeOutputAdapter = VSCodeOutputAdapter.instance();

        this.updateProperties().catch((error: Error) => {
            outputAdapter.log(LogType.ERROR, error.message, error.toString());
        });
    }

    private async updateProperties(): Promise<void> {
        const developmentMode: boolean = this.runtime.isDevelopmentMode();
        let newLabel: string = this.peerName;

        if (developmentMode) {
            newLabel += '   ∞';
        }
        this.setLabel(newLabel);
        this.refresh();
    }

    private setLabel(label: string): void {
        // label is readonly so make it less readonly
        (this as any).label = label;
    }
}
