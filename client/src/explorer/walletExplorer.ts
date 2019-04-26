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
import { LocalWalletTreeItem } from './wallets/LocalWalletTreeItem';
import { IFabricWallet } from '../fabric/IFabricWallet';
import { FabricWalletGeneratorFactory } from '../fabric/FabricWalletGeneratorFactory';
import { FabricWalletRegistry } from '../fabric/FabricWalletRegistry';
import { FabricWalletRegistryEntry } from '../fabric/FabricWalletRegistryEntry';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../logging/OutputAdapter';
import { IdentityTreeItem } from './model/IdentityTreeItem';
import { IFabricWalletGenerator } from '../fabric/IFabricWalletGenerator';
import { AdminIdentityTreeItem } from './model/AdminIdentityTreeItem';
import { FabricRuntimeManager } from '../fabric/FabricRuntimeManager';
import { FabricIdentity } from '../fabric/FabricIdentity';

export class BlockchainWalletExplorerProvider implements BlockchainExplorerProvider {

    // only for testing so can get the updated tree
    public tree: Array<BlockchainTreeItem> = [];

    // tslint:disable-next-line member-ordering
    private _onDidChangeTreeData: vscode.EventEmitter<any | undefined> = new vscode.EventEmitter<any | undefined>();

    // tslint:disable-next-line member-ordering
    readonly onDidChangeTreeData: vscode.Event<any | undefined> = this._onDidChangeTreeData.event;

    getTreeItem(element: BlockchainTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: BlockchainTreeItem): Promise<BlockchainTreeItem[]> {
        console.log('BlockchainWalletExplorer: getChildren');
        const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
        try {
            if (element instanceof WalletTreeItem || element instanceof LocalWalletTreeItem) {
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
        this._onDidChangeTreeData.fire(element);
    }

    private async createWalletTree(): Promise<BlockchainTreeItem[]> {
        console.log('BlockchainWalletExplorer: createWalletTree');
        const tree: Array<BlockchainTreeItem> = [];

        const walletRegistryEntries: FabricWalletRegistryEntry[] = FabricWalletRegistry.instance().getAll();
        const runtimeWalletRegistryEntries: FabricWalletRegistryEntry[] = await FabricRuntimeManager.instance().getWalletRegistryEntries();
        const allWalletRegistryEntires: FabricWalletRegistryEntry[] = [].concat(runtimeWalletRegistryEntries, walletRegistryEntries);

        // Populate the tree with the name of each wallet
        for (const walletRegistryEntry of allWalletRegistryEntires) {

            if (walletRegistryEntry.walletPath) {
                // get identityNames in the wallet
                const walletGenerator: IFabricWalletGenerator = FabricWalletGeneratorFactory.createFabricWalletGenerator();
                const wallet: IFabricWallet = walletGenerator.getNewWallet(walletRegistryEntry.walletPath);
                const identityNames: string[] = await wallet.getIdentityNames();

                const treeState: vscode.TreeItemCollapsibleState = identityNames.length > 0 ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None;

                if (walletRegistryEntry.managedWallet) {
                    tree.push(new LocalWalletTreeItem(this, walletRegistryEntry.name, identityNames, treeState, walletRegistryEntry));
                } else {
                    tree.push(new WalletTreeItem(this, walletRegistryEntry.name, identityNames, treeState, walletRegistryEntry));
                }
            }
        }

        return tree;
    }

    private async createIdentityTree(walletTreeItem: WalletTreeItem | LocalWalletTreeItem): Promise<BlockchainTreeItem[]> {
        const tree: Array<BlockchainTreeItem> = [];

        // Populate the tree with the identity names
        const walletName: string = walletTreeItem.name;
        for (const identityName of walletTreeItem.identities) {
            let isAdminIdentity: boolean = false;
            if (walletTreeItem instanceof LocalWalletTreeItem) {
                const adminIdentities: FabricIdentity[] = await FabricRuntimeManager.instance().getRuntime().getIdentities(walletName);
                isAdminIdentity = adminIdentities.some((adminIdentity: FabricIdentity): boolean => adminIdentity.name === identityName);
            }
            if (isAdminIdentity) {
                // User can't delete this!
                tree.push(new AdminIdentityTreeItem(this, identityName, walletName));
            } else {
                tree.push(new IdentityTreeItem(this, identityName, walletName));
            }
        }
        return tree;
    }
}
