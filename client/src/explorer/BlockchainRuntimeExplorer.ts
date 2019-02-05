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

// tslint:disable max-classes-per-file
'use strict';
import * as vscode from 'vscode';

import { IFabricConnection } from '../fabric/IFabricConnection';
import { PeerTreeItem } from './runtimeOps/PeerTreeItem';
import { ChannelTreeItem } from './model/ChannelTreeItem';
import { BlockchainTreeItem } from './model/BlockchainTreeItem';
import { FabricRuntimeManager } from '../fabric/FabricRuntimeManager';
import { BlockchainExplorerProvider } from './BlockchainExplorerProvider';
import { FabricConnectionRegistryEntry } from '../fabric/FabricConnectionRegistryEntry';
import { RuntimeTreeItem } from './runtimeOps/RuntimeTreeItem';
import { FabricRuntimeRegistryEntry } from '../fabric/FabricRuntimeRegistryEntry';
import { FabricRuntimeRegistry } from '../fabric/FabricRuntimeRegistry';
import { InstantiatedChaincodeTreeItem } from './model/InstantiatedChaincodeTreeItem';
import { VSCodeOutputAdapter } from '../logging/VSCodeOutputAdapter';
import { LogType } from '../logging/OutputAdapter';
import { SmartContractsTreeItem } from './runtimeOps/SmartContractsTreeItem';
import { ChannelsOpsTreeItem } from './runtimeOps/ChannelsOpsTreeItem';
import { NodesTreeItem } from './runtimeOps/NodesTreeItem';
import { OrganizationsTreeItem } from './runtimeOps/OrganizationsTreeItem';
import { InstalledTreeItem } from './runtimeOps/InstalledTreeItem';
import { InstantiatedTreeItem } from './runtimeOps/InstantiatedTreeItem';
import { InstalledChainCodeOpsTreeItem } from './runtimeOps/InstalledChainCodeOpsTreeItem';
import { InstantiateCommandTreeItem } from './runtimeOps/InstantiateCommandTreeItem';
import { InstallCommandTreeItem } from './runtimeOps/InstallCommandTreeItem';
import { OrgTreeItem } from './runtimeOps/OrgTreeItem';

export class BlockchainRuntimeExplorerProvider implements BlockchainExplorerProvider {

    // only for testing so can get the updated tree
    public tree: Array<BlockchainTreeItem> = [];

    // tslint:disable-next-line member-ordering
    private _onDidChangeTreeData: vscode.EventEmitter<any | undefined> = new vscode.EventEmitter<any | undefined>();

    // tslint:disable-next-line member-ordering
    readonly onDidChangeTreeData: vscode.Event<any | undefined> = this._onDidChangeTreeData.event;

    private runtimeRegistryManager: FabricRuntimeRegistry = FabricRuntimeRegistry.instance();

    constructor() {
        const outputAdapter: VSCodeOutputAdapter = VSCodeOutputAdapter.instance();
        FabricRuntimeManager.instance().get('local_fabric').on('busy', () => {
            this.refresh();
        });
    }

    async refresh(element?: BlockchainTreeItem): Promise<void> {
        this._onDidChangeTreeData.fire(element);
    }

    getTreeItem(element: BlockchainTreeItem): vscode.TreeItem {
        console.log('getTreeItem', element);
        return element;
    }

    async getChildren(element?: BlockchainTreeItem): Promise<BlockchainTreeItem[]> {
        console.log('getChildren', element);
        const outputAdapter: VSCodeOutputAdapter = VSCodeOutputAdapter.instance();

        try {

            const isBusy: boolean = FabricRuntimeManager.instance().get('local_fabric').isBusy();
            const isRunning: boolean = await FabricRuntimeManager.instance().get('local_fabric').isRunning();
            if (isRunning) {
                await vscode.commands.executeCommand('setContext', 'blockchain-started', true);
            } else {
                await vscode.commands.executeCommand('setContext', 'blockchain-started', false);
            }

            if (element) {
                if (element instanceof SmartContractsTreeItem) {
                    this.tree = await this.createSmartContractsTree(element as SmartContractsTreeItem);
                }
                if (element instanceof ChannelsOpsTreeItem) {
                    this.tree = await this.createChannelsTree(element as ChannelsOpsTreeItem);
                }
                if (element instanceof NodesTreeItem) {
                    this.tree = await this.createNodesTree(element as NodesTreeItem);
                }
                if (element instanceof OrganizationsTreeItem) {
                    this.tree = await this.createOrganizationsTree(element as OrganizationsTreeItem);
                }
                if (element instanceof InstantiatedTreeItem) {
                    this.tree = await this.createInstantiatedTree(element as InstantiatedTreeItem);
                }
                if (element instanceof InstalledTreeItem) {
                    this.tree = await this.createInstalledTree(element as InstalledTreeItem);
                }

                return this.tree;
            }

            if (isRunning && !isBusy) {
                this.tree = await this.createConnectedTree();
                await FabricRuntimeManager.instance().getConnection();
            } else {
                this.tree = await this.createConnectionTree();
            }

        } catch (error) {
            outputAdapter.log(LogType.ERROR, `Error populating Local Fabric Control Panel: ${error.message}`, `Error populating Local Fabric Control Panel: ${error.message}`);
        }

        return this.tree;
    }

    private async createConnectionTree(): Promise<BlockchainTreeItem[]> {
        console.log('createdConnectionTree');
        const outputAdapter: VSCodeOutputAdapter = VSCodeOutputAdapter.instance();

        const tree: BlockchainTreeItem[] = [];

        const runtimeRegistryEntry: FabricRuntimeRegistryEntry = this.runtimeRegistryManager.get('local_fabric');

        try {
            const connection: FabricConnectionRegistryEntry = new FabricConnectionRegistryEntry();
            connection.name = runtimeRegistryEntry.name;
            connection.managedRuntime = true;

            const treeItem: RuntimeTreeItem = await RuntimeTreeItem.newRuntimeTreeItem(this,
                runtimeRegistryEntry.name,
                connection,
                vscode.TreeItemCollapsibleState.None,
                {
                    command: 'blockchainARuntimeExplorer.startFabricRuntime',
                    title: '',
                    arguments: []
                });
            tree.push(treeItem);
        } catch (error) {
            outputAdapter.log(LogType.ERROR, `Error populating Local Fabric Control Panel: ${error.message}`, `Error populating Local Fabric Control Panel: ${error.toString()}`);
        }

        return tree;
    }

    private async createConnectedTree(): Promise<Array<BlockchainTreeItem>> {
        console.log('createConnectedTree');
        const tree: Array<BlockchainTreeItem> = [];

        tree.push(new SmartContractsTreeItem(this, vscode.TreeItemCollapsibleState.Expanded));

        tree.push(new ChannelsOpsTreeItem(this, vscode.TreeItemCollapsibleState.Collapsed));

        tree.push(new NodesTreeItem(this, vscode.TreeItemCollapsibleState.Collapsed));

        tree.push(new OrganizationsTreeItem(this, vscode.TreeItemCollapsibleState.Collapsed));

        return tree;
    }

    private async createChannelMap(): Promise<Map<string, Array<string>>> {
        console.log('createChannelMap');

        const connection: IFabricConnection = await FabricRuntimeManager.instance().getConnection();
        const allPeerNames: Array<string> = connection.getAllPeerNames();

        const channelMap: Map<string, Array<string>> = new Map<string, Array<string>>();
        return allPeerNames.reduce((promise: Promise<void>, peerName: string) => {
            return promise.then(() => {
                return connection.getAllChannelsForPeer(peerName);
            }).then((channels: Array<any>) => {
                channels.forEach((channelName: string) => {
                    let peers: Array<string> = channelMap.get(channelName);
                    if (peers) {
                        peers.push(peerName);
                        channelMap.set(channelName, peers);
                    } else {
                        peers = [peerName];
                        channelMap.set(channelName, peers);
                    }
                });
            }).catch((error: Error) => {
                if (!error.message) {
                    return Promise.reject(error);
                } else if (error.message.includes('Received http2 header with status: 503')) { // If gRPC can't connect to Fabric
                    return Promise.reject(`Cannot connect to Fabric: ${error.message}`);
                } else {
                    return Promise.reject(`Error creating channel map: ${error.message}`);
                }
            });
        }, Promise.resolve()).then(() => {
            return channelMap;
        }, (error: string) => {
            throw new Error(error);
        });
    }

    // TODO: remove parameter if not needed
    private async createSmartContractsTree(smartContracts: SmartContractsTreeItem): Promise<Array<BlockchainTreeItem>> {
        const tree: Array<BlockchainTreeItem> = [];

        tree.push(new InstantiatedTreeItem(this, vscode.TreeItemCollapsibleState.Expanded));

        tree.push(new InstalledTreeItem(this, vscode.TreeItemCollapsibleState.Expanded));

        return tree;
    }

    private async createChannelsTree(channelsItem: ChannelsOpsTreeItem): Promise<Array<BlockchainTreeItem>> {
        const outputAdapter: VSCodeOutputAdapter = VSCodeOutputAdapter.instance();
        const tree: Array<BlockchainTreeItem> = [];

        try {
            const channelMap: Map<string, Array<string>> = await this.createChannelMap();
            const channels: Array<string> = Array.from(channelMap.keys());

            for (const channel of channels) {
                const peers: Array<string> = channelMap.get(channel);
                tree.push(new ChannelTreeItem(this, channel, peers, [], vscode.TreeItemCollapsibleState.None));
            }
        } catch (error) {
            outputAdapter.log(LogType.ERROR, `Error populating channel view: ${error.message}`, `Error populating channels view: ${error.toString()}`);
            return tree;
        }
        return tree;
    }

    private async createNodesTree(nodesTreeItem: NodesTreeItem): Promise<Array<BlockchainTreeItem>> {
        const outputAdapter: VSCodeOutputAdapter = VSCodeOutputAdapter.instance();
        const tree: Array<BlockchainTreeItem> = [];

        try {
            const connection: IFabricConnection = await FabricRuntimeManager.instance().getConnection();
            const allPeerNames: Array<string> = connection.getAllPeerNames();

            for (const peer of allPeerNames) {
                const chaincodes: Map<string, Array<string>> = null;
                const peerTreeItem: PeerTreeItem = await PeerTreeItem.newPeerTreeItem(this, peer, chaincodes, vscode.TreeItemCollapsibleState.None, true);
                tree.push(peerTreeItem);
            }
        } catch (error) {
            outputAdapter.log(LogType.ERROR, `Error populating nodes view: ${error.message}`, `Error populating nodes view: ${error.toString()}`);
            return tree;
        }
        return tree;

    }

    private async createOrganizationsTree(orgTreeItem: OrganizationsTreeItem): Promise<Array<BlockchainTreeItem>> {
        const outputAdapter: VSCodeOutputAdapter = VSCodeOutputAdapter.instance();
        const tree: Array<BlockchainTreeItem> = [];

        try {
            const connection: IFabricConnection = await FabricRuntimeManager.instance().getConnection();
            const channelMap: Map<string, Array<string>> = await this.createChannelMap();
            const channels: Array<string> = Array.from(channelMap.keys());
            for (const channel of channels) {
                const channelOrgs: any[] = await connection.getOrganizations(channel);
                for (const org of channelOrgs) {
                    tree.push(new OrgTreeItem(this, org.id));
                }
            }

        } catch (error) {
            outputAdapter.log(LogType.ERROR, `Error populating organizations view: ${error.message}`, `Error populating organizations view: ${error.toString()}`);
            return tree;
        }
        return tree;

    }

    private async createInstantiatedTree(instantiatedTreeItem: InstantiatedTreeItem): Promise<Array<BlockchainTreeItem>> {
        const outputAdapter: VSCodeOutputAdapter = VSCodeOutputAdapter.instance();
        const tree: Array<BlockchainTreeItem> = [];

        const command: vscode.Command = {
            command: 'blockchainExplorer.instantiateSmartContractEntry',
            title: '',
            arguments: []
        };

        try {
            const connection: IFabricConnection = await FabricRuntimeManager.instance().getConnection();
            const channelMap: Map<string, Array<string>> = await this.createChannelMap();
            const channels: Array<string> = Array.from(channelMap.keys());
            for (const channel of channels) {
                const chaincodes: any[] = await connection.getInstantiatedChaincode(channel);
                const peers: Array<string> = channelMap.get(channel);
                const channelTreeItem: ChannelTreeItem = new ChannelTreeItem(this, channel, peers, chaincodes, vscode.TreeItemCollapsibleState.None);
                for (const chaincode of chaincodes) {
                    tree.push(new InstantiatedChaincodeTreeItem(this, chaincode.name, channelTreeItem, chaincode.version, vscode.TreeItemCollapsibleState.None, null, false));
                }
            }
        } catch (error) {
            outputAdapter.log(LogType.ERROR, `Error populating instantiated smart contracts view: ${error.message}`, `Error populating instantiated smart contracts view: ${error.message}`);

        } finally {
            tree.push(new InstantiateCommandTreeItem(this, command));
        }
        return tree;
    }

    private async createInstalledTree(installedTreeItem: InstalledTreeItem): Promise<Array<BlockchainTreeItem>> {
        const outputAdapter: VSCodeOutputAdapter = VSCodeOutputAdapter.instance();
        const tree: Array<BlockchainTreeItem> = [];
        let command: vscode.Command;
        try {
            const connection: IFabricConnection = await FabricRuntimeManager.instance().getConnection();
            const allPeerNames: Array<string> = connection.getAllPeerNames();
            for (const peer of allPeerNames) {
                const chaincodes: Map<string, Array<string>> = await connection.getInstalledChaincode(peer);
                chaincodes.forEach((versions: Array<string>, name: string) => {
                    for (const version of versions) {
                        tree.push(new InstalledChainCodeOpsTreeItem(this, name, version, peer));
                    }
                });
            }

            command = {
                command: 'blockchainExplorer.installSmartContractEntry',
                title: '',
                arguments: [installedTreeItem]
            };

        } catch (error) {
            outputAdapter.log(LogType.ERROR, `Error populating installed smart contracts view: ${error.message}`, `Error populating installed smart contracts view: ${error.message}`);
        } finally {
            tree.push(new InstallCommandTreeItem(this, command));
        }
        return tree;
    }
}
