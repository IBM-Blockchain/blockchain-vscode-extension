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
import { PeerTreeItem } from './model/PeerTreeItem';
import { ChannelTreeItem } from './model/ChannelTreeItem';
import { BlockchainTreeItem } from './model/BlockchainTreeItem';
import { InstalledChainCodeTreeItem } from './model/InstalledChainCodeTreeItem';
import { InstalledChainCodeVersionTreeItem } from './model/InstalledChaincodeVersionTreeItem';
import { FabricRuntimeManager } from '../fabric/FabricRuntimeManager';
import { BlockchainExplorerProvider } from './BlockchainExplorerProvider';
import { FabricConnectionRegistryEntry } from '../fabric/FabricConnectionRegistryEntry';
import { RuntimeTreeItem } from './model/RuntimeTreeItem';
import { FabricRuntimeRegistryEntry } from '../fabric/FabricRuntimeRegistryEntry';
import { FabricRuntimeRegistry } from '../fabric/FabricRuntimeRegistry';
import { TransactionTreeItem } from './model/TransactionTreeItem';
import { InstantiatedChaincodeTreeItem } from './model/InstantiatedChaincodeTreeItem';
import { MetadataUtil } from '../util/MetadataUtil';
import { ContractTreeItem } from './model/ContractTreeItem';
import { VSCodeOutputAdapter } from '../logging/VSCodeOutputAdapter';
import { LogType } from '../logging/OutputAdapter';

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

            if (element) {
                if (element instanceof ChannelTreeItem) {
                    this.tree = [];
                    const channelElement: ChannelTreeItem = element as ChannelTreeItem;
                    this.tree = await this.createPeerTree(element as ChannelTreeItem);

                    if (channelElement.chaincodes.length > 0) {
                        const instantiatedChaincodes: Array<InstantiatedChaincodeTreeItem> = await this.createInstantiatedChaincodeTree(element as ChannelTreeItem);
                        this.tree.push(...instantiatedChaincodes);
                    }
                }

                if (element instanceof PeerTreeItem) {
                    this.tree = await this.createInstalledChaincodeTree(element as PeerTreeItem);
                }

                if (element instanceof InstalledChainCodeTreeItem) {
                    this.tree = await this.createInstalledChaincodeVersionTree(element as InstalledChainCodeTreeItem);
                }

                return this.tree;
            }

            const isRunning: boolean = await FabricRuntimeManager.instance().get('local_fabric').isRunning();
            if (isRunning) {
                this.tree = await this.createConnectedTree();
            } else {
                this.tree = await this.createConnectionTree();
            }

        } catch (error) {
            outputAdapter.log(LogType.ERROR, error.message);
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
                    command: 'blockchainExplorer.connectEntry',
                    title: '',
                    arguments: [connection]
                });
            tree.push(treeItem);
        } catch (error) {
            outputAdapter.log(LogType.ERROR, `Error populating Local Fabric Control Panel: ${error.message}`, `Error populating Local Fabric Control Panel: ${error.toString()}`);
        }

        return tree;
    }

    private createInstalledChaincodeVersionTree(chaincodeElement: InstalledChainCodeTreeItem): Promise<Array<InstalledChainCodeVersionTreeItem>> {
        console.log('createInstalledChaincodeVersionTree', chaincodeElement);
        const tree: Array<InstalledChainCodeVersionTreeItem> = [];

        chaincodeElement.versions.forEach((version: string) => {
            tree.push(new InstalledChainCodeVersionTreeItem(this, version));
        });

        return Promise.resolve(tree);
    }

    private async createInstalledChaincodeTree(peerElement: PeerTreeItem): Promise<Array<InstalledChainCodeTreeItem>> {
        console.log('createInstalledChaincodeTree', peerElement);
        const tree: Array<InstalledChainCodeTreeItem> = [];

        peerElement.chaincodes.forEach((versions: Array<string>, name: string) => {
            tree.push(new InstalledChainCodeTreeItem(this, name, versions));
        });

        return tree;
    }

    private async createInstantiatedChaincodeTree(channelTreeElement: ChannelTreeItem): Promise<Array<InstantiatedChaincodeTreeItem>> {
        console.log('createInstantiatedChaincodeTree', channelTreeElement);
        const tree: Array<InstantiatedChaincodeTreeItem> = [];

        for (const instantiatedChaincode of channelTreeElement.chaincodes) {
            tree.push(new InstantiatedChaincodeTreeItem(this, instantiatedChaincode.name, channelTreeElement, instantiatedChaincode.version, vscode.TreeItemCollapsibleState.None));
        }

        return tree;
    }

    private async createPeerTree(channelElement: ChannelTreeItem): Promise<Array<PeerTreeItem>> {
        const outputAdapter: VSCodeOutputAdapter = VSCodeOutputAdapter.instance();

        const tree: Array<PeerTreeItem> = [];

        for (const peer of channelElement.peers) {
            try {
                const connection: IFabricConnection = await FabricRuntimeManager.instance().getConnection();
                const chaincodes: Map<string, Array<string>> = await connection.getInstalledChaincode(peer);
                const collapsibleState: vscode.TreeItemCollapsibleState = chaincodes.size > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None;
                tree.push(new PeerTreeItem(this, peer, chaincodes, collapsibleState));
            } catch (error) {
                tree.push(new PeerTreeItem(this, peer, new Map<string, Array<string>>(), vscode.TreeItemCollapsibleState.None));
                outputAdapter.log(LogType.ERROR, `Error when getting installed smart contracts for peer ${peer} ${error.message}`, `Error when getting installed smart contracts for peer ${peer} ${error.toString()}`);
            }
        }

        return tree;
    }

    private async createConnectedTree(): Promise<Array<BlockchainTreeItem>> {
        const outputAdapter: VSCodeOutputAdapter = VSCodeOutputAdapter.instance();

        try {
            console.log('createConnectedTree');
            const tree: Array<BlockchainTreeItem> = [];

            const channelMap: Map<string, Array<string>> = await this.createChannelMap();
            const channels: Array<string> = Array.from(channelMap.keys());

            const connection: IFabricConnection = await FabricRuntimeManager.instance().getConnection();

            for (const channel of channels) {
                let chaincodes: Array<{ name: string, version: string }>;
                const peers: Array<string> = channelMap.get(channel);
                try {
                    chaincodes = await connection.getInstantiatedChaincode(channel);
                    tree.push(new ChannelTreeItem(this, channel, peers, chaincodes, vscode.TreeItemCollapsibleState.Collapsed));
                } catch (error) {
                    tree.push(new ChannelTreeItem(this, channel, peers, [], vscode.TreeItemCollapsibleState.Collapsed));
                    outputAdapter.log(LogType.ERROR, `Error getting instantiated smart contracts for channel ${channel} ${error.message}`);
                }
            }

            return tree;
        } catch (error) {
            throw error;
        }
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
}
