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
import { BlockchainTreeItem } from './model/BlockchainTreeItem';
import { BlockchainExplorerProvider } from './BlockchainExplorerProvider';
import { WalletTreeItem } from './wallets/WalletTreeItem';
import { IFabricWallet } from '../fabric/IFabricWallet';
import { FabricWalletGeneratorFactory } from '../fabric/FabricWalletGeneratorFactory';
import { FabricWalletRegistry } from '../fabric/FabricWalletRegistry';
import { FabricWalletRegistryEntry } from '../fabric/FabricWalletRegistryEntry';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../logging/OutputAdapter';
import { IdentityTreeItem } from './model/IdentityTreeItem';
import { IFabricWalletGenerator } from '../fabric/IFabricWalletGenerator';

export class BlockchainWalletExplorerProvider implements BlockchainExplorerProvider {

    // only for testing so can get the updated tree
    public tree: Array<BlockchainTreeItem> = [];

    // tslint:disable-next-line member-ordering
    private _onDidChangeTreeData: vscode.EventEmitter<any | undefined> = new vscode.EventEmitter<any | undefined>();

    // tslint:disable-next-line member-ordering
    readonly onDidChangeTreeData: vscode.Event<any | undefined> = this._onDidChangeTreeData.event;

    getTreeItem(element: BlockchainTreeItem): vscode.TreeItem {
        console.log('BlockchainWalletExplorer: getTreeItem', element);
        return element;
    }

    async getChildren(element?: BlockchainTreeItem): Promise<BlockchainTreeItem[]> {
        console.log('BlockchainWalletExplorer: getChildren');
        const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
        try {
            if (element instanceof WalletTreeItem) {
                this.tree = await this.createIdentityTree(element);
            } else {
                // Get the wallets from the registry and create a wallet tree
                this.tree = await this.createWalletTree();
            }
        } catch (error) {
            outputAdapter.log(LogType.ERROR, `Error displaying Fabric Wallets: ${error.message}`, `Error displaying Fabric Wallets: ${error.message}`);
        }

        return this.tree;
    }

    async refresh(element?: BlockchainTreeItem): Promise<void> {
        console.log('BlockchainWalletExplorer: refresh');
        this._onDidChangeTreeData.fire(element);
    }

    private async createWalletTree(): Promise<BlockchainTreeItem[]> {
        console.log('BlockchainWalletExplorer: createWalletTree');
        const tree: Array<BlockchainTreeItem> = [];

        const walletRegistryEntries: FabricWalletRegistryEntry[] = await FabricWalletRegistry.instance().getAll();
        // Populate the tree with the name of each wallet
        for (const walletRegistryEntry of walletRegistryEntries) {

            if (walletRegistryEntry.walletPath) {
                // get identityNames in the wallet
                const walletGenerator: IFabricWalletGenerator = FabricWalletGeneratorFactory.createFabricWalletGenerator();
                const wallet: IFabricWallet = walletGenerator.getNewWallet(walletRegistryEntry.walletPath);
                const identityNames: string[] = await wallet.getIdentityNames();

                const treeState: vscode.TreeItemCollapsibleState = identityNames.length > 0 ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None;

                tree.push(new WalletTreeItem(this, walletRegistryEntry.name, identityNames, treeState));
            }
        }

        return tree;
    }

    private async createIdentityTree(walletTreeItem: WalletTreeItem): Promise<BlockchainTreeItem[]> {
        console.log('BlockchainWalletExplorer: createPackageTree');
        const tree: Array<BlockchainTreeItem> = [];

        // Populate the tree with the identity names
        for (const identityName of walletTreeItem.identities) {
            tree.push(new IdentityTreeItem(this, identityName, undefined));
        }
        return tree;
    }
}
