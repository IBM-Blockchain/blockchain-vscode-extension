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
import { FabricCertificate, Attribute, FabricWalletRegistry, FabricWalletRegistryEntry, FabricRuntimeUtil, IFabricWalletGenerator, IFabricWallet, LogType, FabricWalletGeneratorFactory, FabricNode, FabricEnvironmentRegistryEntry, FabricEnvironmentRegistry, FabricEnvironment, EnvironmentType } from 'ibm-blockchain-platform-common';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { IdentityTreeItem } from './model/IdentityTreeItem';
import { AdminIdentityTreeItem } from './model/AdminIdentityTreeItem';
import { TextTreeItem } from './model/TextTreeItem';
import { WalletGroupTreeItem } from './model/WalletGroupTreeItem';
import { ExplorerUtil } from '../util/ExplorerUtil';
import { EnvironmentFactory } from '../fabric/environments/EnvironmentFactory';
import { LocalEnvironmentManager } from '../fabric/environments/LocalEnvironmentManager';

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

        let walletRegistryEntries: FabricWalletRegistryEntry[] = await FabricWalletRegistry.instance().getAll();
        walletRegistryEntries = await this.updateWalletEnvironmentGroups(walletRegistryEntries);

        const walletGroups: any[] = [];
        const otherWallets: Array<FabricWalletRegistryEntry | FabricWalletRegistryEntry[]> = [];

        let totalWallets: number = walletRegistryEntries.length;
        // iterate through wallets and group them until there are none left
        while (0 < totalWallets) {
            const wallet: FabricWalletRegistryEntry = walletRegistryEntries[0];
            if (!wallet.fromEnvironment && (!wallet.environmentGroups || wallet.environmentGroups.length < 1)) {
                // group wallets that don't belong to environments
                // don't add wallet if it doesn't have a wallet path
                if (wallet.walletPath) {
                    otherWallets.push(wallet);
                }

                // remove wallet from array as it's already been grouped
                walletRegistryEntries.splice(0, 1);
                totalWallets--;
            } else {
                // create new group for this wallet
                const group: FabricWalletRegistryEntry[] = [wallet];

                // flag to determine if this group should be pushed to otherWallets
                let pushToOtherWallets: boolean = false;
                if (wallet.environmentGroups) {
                    pushToOtherWallets = (wallet.environmentGroups.length > 1) ? true : false;
                }

                // search for wallets that also belong to this group
                let otherGroupWallets: FabricWalletRegistryEntry[] = [];

                if (!wallet.environmentGroups) {
                    otherGroupWallets = walletRegistryEntries.filter((entry: FabricWalletRegistryEntry, index: number) => {
                        if (index > 0 && entry.environmentGroups) {
                            if (wallet.fromEnvironment === entry.environmentGroups[0] || wallet.fromEnvironment === entry.fromEnvironment) {
                                if (!pushToOtherWallets) {
                                    // if any wallets in the group have been used for another environment then we should push the whole group to otherWallets
                                    pushToOtherWallets = (entry.environmentGroups.length > 1) ? true : false;
                                    if (entry.environmentGroups.length > 1 || (entry.fromEnvironment && entry.fromEnvironment !== entry.environmentGroups[0])) {
                                        pushToOtherWallets = true;
                                    }
                                }
                                return true;
                            }
                        } else if (index > 0 && entry.fromEnvironment) {
                            return wallet.fromEnvironment === entry.fromEnvironment;
                        }
                    });
                } else {
                    otherGroupWallets = walletRegistryEntries.filter((entry: FabricWalletRegistryEntry, index: number) => {
                        if (index > 0 && entry.environmentGroups) {
                            if (wallet.environmentGroups[0] === entry.environmentGroups[0]) {
                                if (!pushToOtherWallets) {
                                    // if any wallets in the group have been used for another environment then we should push the whole group to otherWallets
                                     pushToOtherWallets = (entry.environmentGroups.length > 1) ? true : false;
                                }
                                return true;
                            }
                        } else if (index > 0 && entry.fromEnvironment) {
                            return wallet.environmentGroups[0] === entry.fromEnvironment;
                        }
                    });
                }
                group.push(...otherGroupWallets);
                pushToOtherWallets === true ? otherWallets.push(group) : walletGroups.push(group);

                // remove wallets that have already been grouped
                walletRegistryEntries = walletRegistryEntries.filter((entry: FabricWalletRegistryEntry) => {
                    return !group.includes(entry);
                });
                totalWallets = totalWallets - group.length;
            }
        }

        // push the otherWallets group to the main wallet group array if it isn't empty
        if (otherWallets.length > 0) {
            walletGroups.push(otherWallets);
        }

        if (walletGroups.length === 0) {
            tree.push(new TextTreeItem(this, 'No wallets found'));
        } else {

            const otherWalletsGroupName: string = 'Other/shared wallets';

            for (const group of walletGroups) {
                let groupName: string;
                if (group[0].fromEnvironment) {
                    groupName = group[0].fromEnvironment;
                } else if (group[0].environmentGroups && group[0].environmentGroups.length === 1) {
                    groupName = group[0].environmentGroups[0];
                } else {
                    groupName = otherWalletsGroupName;
                }

                const groupTreeItem: WalletGroupTreeItem = new WalletGroupTreeItem(this, groupName, group, vscode.TreeItemCollapsibleState.Expanded);
                if (groupName !== otherWalletsGroupName) {
                    groupTreeItem.iconPath = await ExplorerUtil.getGroupIcon(groupName);
                }
                tree.push(groupTreeItem);
            }
        }

        return tree;
    }

    private async populateWallets(walletItems: Array<FabricWalletRegistryEntry | FabricWalletRegistryEntry[]>): Promise<Array<BlockchainTreeItem>> {
        const tree: Array<BlockchainTreeItem> = [];
        for (const walletItem of walletItems) {
            // if we've got an array then it's a group of wallets, so push a WalletGroupTreeItem instead
            if (Array.isArray(walletItem)) {
                const groupName: string = walletItem[0].fromEnvironment ? walletItem[0].fromEnvironment : walletItem[0].environmentGroups[0];
                const groupTreeItem: WalletGroupTreeItem = new WalletGroupTreeItem(this, groupName, walletItem, vscode.TreeItemCollapsibleState.Expanded);
                groupTreeItem.iconPath = await ExplorerUtil.getGroupIcon(groupName);
                tree.push(groupTreeItem);
            } else {
                // get identityNames in the wallet
                const walletGenerator: IFabricWalletGenerator = FabricWalletGeneratorFactory.getFabricWalletGenerator();
                const wallet: IFabricWallet = await walletGenerator.getWallet(walletItem);
                const identityNames: string[] = await wallet.getIdentityNames();

                // Collapse if there are identities, otherwise the expanded tree takes up a lot of room in the panel
                const treeState: vscode.TreeItemCollapsibleState = identityNames.length > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None; //

                if (walletItem.managedWallet) {
                    tree.push(new LocalWalletTreeItem(this, walletItem.name, identityNames, treeState, walletItem));
                } else {
                    tree.push(new WalletTreeItem(this, walletItem.name, identityNames, treeState, walletItem));
                }
            }
        }
        return tree;
    }

    private async createIdentityTree(walletTreeItem: WalletTreeItem | LocalWalletTreeItem): Promise<BlockchainTreeItem[]> {
        const tree: Array<BlockchainTreeItem> = [];

        // Populate the tree with the identity names
        const fabricWalletGenerator: IFabricWalletGenerator = FabricWalletGeneratorFactory.getFabricWalletGenerator();
        const wallet: IFabricWallet = await fabricWalletGenerator.getWallet(walletTreeItem.registryEntry);
        const identities: any[] = await wallet.getIdentities();

        for (const identity of identities) {
            let isAdminIdentity: boolean = false;
            if (walletTreeItem instanceof LocalWalletTreeItem) {
                // Check 'admin' in local_fabric
                if (identity.name === FabricRuntimeUtil.ADMIN_USER) {
                    isAdminIdentity = true;
                }
            }

            // Get attributes fcn
            const certificate: FabricCertificate = new FabricCertificate(identity.enrollment.identity.certificate);
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

    private async updateWalletEnvironmentGroups(walletRegistryEntries: FabricWalletRegistryEntry[]): Promise<FabricWalletRegistryEntry[]> {
        const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
        for (const wallet of walletRegistryEntries) {

            if (wallet.environmentGroups) {
                const updatedGroups: string [] = [];

                for (const env of wallet.environmentGroups) {

                    if (await FabricEnvironmentRegistry.instance().exists(env)) {
                        try {
                            const fabricEnvironmentRegistryEntry: FabricEnvironmentRegistryEntry = await FabricEnvironmentRegistry.instance().get(env);
                            if (fabricEnvironmentRegistryEntry.environmentType === EnvironmentType.LOCAL_ENVIRONMENT) {
                                await LocalEnvironmentManager.instance().ensureRuntime(fabricEnvironmentRegistryEntry.name, undefined, fabricEnvironmentRegistryEntry.numberOfOrgs);
                            }
                            const environment: FabricEnvironment = EnvironmentFactory.getEnvironment(fabricEnvironmentRegistryEntry);
                            const nodes: FabricNode[] = await environment.getNodes();
                            const associatedNodes: boolean = nodes.some((node: FabricNode) => {
                                return node.wallet === wallet.name;
                            });

                            if (associatedNodes) {
                                updatedGroups.push(env);
                            }
                        } catch (error) {
                            outputAdapter.log(LogType.ERROR, `Error displaying Fabric Wallets: ${error.message}`, `Error displaying Fabric Wallets: ${error.message}`);
                        }
                    }
                }

                // if the arrays aren't the same length then something has changed - update the wallet registry entry
                if (wallet.environmentGroups.length !== updatedGroups.length) {
                    wallet.environmentGroups = updatedGroups;
                    await FabricWalletRegistry.instance().update(wallet);
                }
            }
        }

        return walletRegistryEntries;
    }
}
