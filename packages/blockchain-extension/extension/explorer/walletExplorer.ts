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
import { FabricCertificate, Attribute, FabricWalletRegistry, FabricWalletRegistryEntry, FabricRuntimeUtil, IFabricWalletGenerator, IFabricWallet, LogType, FabricWalletGeneratorFactory, FabricIdentity } from 'ibm-blockchain-platform-common';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { IdentityTreeItem } from './model/IdentityTreeItem';
import { AdminIdentityTreeItem } from './model/AdminIdentityTreeItem';
import { TextTreeItem } from './model/TextTreeItem';
import { WalletGroupTreeItem } from './model/WalletGroupTreeItem';
import { ExplorerUtil } from '../util/ExplorerUtil';

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
        const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
        try {
            if (element) {

                if (element instanceof WalletTreeItem || element instanceof LocalWalletTreeItem) {
                    this.tree = await this.createIdentityTree(element);
                }

                if (element instanceof WalletGroupTreeItem) {
                    this.tree = await this.populateWallets(element.wallets);
                }

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
        const tree: Array<BlockchainTreeItem> = [];

        const walletRegistryEntries: FabricWalletRegistryEntry[] = await FabricWalletRegistry.instance().getAll();

        const walletGroups: Array<FabricWalletRegistryEntry[]> = [];
        const otherWallets: Array<FabricWalletRegistryEntry> = [];
        // Populate the tree with the name of each wallet
        for (const walletRegistryEntry of walletRegistryEntries) {

            if (walletGroups.length === 0) {
                if (walletRegistryEntry.fromEnvironment) {
                    walletGroups.push([walletRegistryEntry]);
                } else {
                    otherWallets.push(walletRegistryEntry);
                }
                continue;
            }

            // Used to check if group exists already
            const groupIndex: number = walletGroups.findIndex((group: FabricWalletRegistryEntry[]) => {
                return group[0].fromEnvironment && group[0].fromEnvironment === walletRegistryEntry.fromEnvironment;
            });

            if (groupIndex !== -1) {
                // If a group with the same fromEnvironment exists, then push gateway to the group
                walletGroups[groupIndex].push(walletRegistryEntry);
            } else {
                // Create new group
                if (walletRegistryEntry.fromEnvironment) {
                    walletGroups.push([walletRegistryEntry]);
                } else {
                    // group wallets that don't belong to environments
                    // don't add wallet if it doesn't have a wallet path
                    if (walletRegistryEntry.walletPath) {
                        otherWallets.push(walletRegistryEntry);
                    }
                }
            }
        }
        if (otherWallets.length > 0) {
            walletGroups.push(otherWallets);
        }

        if (walletGroups.length === 0) {
            tree.push(new TextTreeItem(this, 'No wallets found'));
        } else {

            for (const group of walletGroups) {
                const groupName: string = group[0].fromEnvironment ? group[0].fromEnvironment : 'Other wallets';
                const groupTreeItem: WalletGroupTreeItem = new WalletGroupTreeItem(this, groupName, group, vscode.TreeItemCollapsibleState.Expanded);
                if (group[0].fromEnvironment) {
                    groupTreeItem.iconPath = await ExplorerUtil.getGroupIcon(group[0]);
                }
                tree.push(groupTreeItem);
            }
        }

        return tree;
    }

    private async populateWallets(walletRegistryEntries: FabricWalletRegistryEntry[]): Promise<Array<WalletTreeItem>> {
        const tree: Array<WalletTreeItem> = [];
        for (const walletRegistryEntry of walletRegistryEntries) {
            // get identityNames in the wallet
            const walletGenerator: IFabricWalletGenerator = FabricWalletGeneratorFactory.getFabricWalletGenerator();
            const wallet: IFabricWallet = await walletGenerator.getWallet(walletRegistryEntry);
            const identityNames: string[] = await wallet.getIdentityNames();

            // Collapse if there are identities, otherwise the expanded tree takes up a lot of room in the panel
            const treeState: vscode.TreeItemCollapsibleState = identityNames.length > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None; //

            if (walletRegistryEntry.managedWallet) {
                tree.push(new LocalWalletTreeItem(this, walletRegistryEntry.name, identityNames, treeState, walletRegistryEntry));
            } else {
                tree.push(new WalletTreeItem(this, walletRegistryEntry.name, identityNames, treeState, walletRegistryEntry));
            }
        }
        return tree;
    }

    private async createIdentityTree(walletTreeItem: WalletTreeItem | LocalWalletTreeItem): Promise<BlockchainTreeItem[]> {
        const tree: Array<BlockchainTreeItem> = [];

        // Populate the tree with the identity names
        const fabricWalletGenerator: IFabricWalletGenerator = FabricWalletGeneratorFactory.getFabricWalletGenerator();
        const wallet: IFabricWallet = await fabricWalletGenerator.getWallet(walletTreeItem.registryEntry);
        const identities: FabricIdentity[] = await wallet.getIdentities();

        for (const identity of identities) {
            let isAdminIdentity: boolean = false;
            if (walletTreeItem instanceof LocalWalletTreeItem) {
                // Check 'admin' in local_fabric
                if (identity.name === FabricRuntimeUtil.ADMIN_USER) {
                    isAdminIdentity = true;
                }
            }

            // Get attributes fcn
            const certificate: FabricCertificate = new FabricCertificate(identity.cert);
            const attributes: Attribute[] = certificate.getAttributes();

            if (isAdminIdentity) {
                // User can't delete this!
                tree.push(new AdminIdentityTreeItem(this, identity.name, walletTreeItem.name, attributes, walletTreeItem.registryEntry));
            } else {

                tree.push(new IdentityTreeItem(this, identity.name, walletTreeItem.name, attributes, walletTreeItem.registryEntry));
            }
        }
        return tree;
    }
}
