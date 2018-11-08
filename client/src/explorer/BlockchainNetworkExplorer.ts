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
import { ParsedCertificate } from '../fabric/ParsedCertificate';

import { PeerTreeItem } from './model/PeerTreeItem';
import { ChannelTreeItem } from './model/ChannelTreeItem';
import { AddConnectionTreeItem } from './model/AddConnectionTreeItem';
import { ConnectionIdentityTreeItem } from './model/ConnectionIdentityTreeItem';
import { BlockchainTreeItem } from './model/BlockchainTreeItem';
import { ConnectionTreeItem } from './model/ConnectionTreeItem';
import { ChainCodeTreeItem } from './model/ChainCodeTreeItem';
import { InstantiatedChainCodesTreeItem } from './model/InstantiatedChaincodesTreeItem';
import { PeersTreeItem } from './model/PeersTreeItem';
import { InstalledChainCodeTreeItem } from './model/InstalledChainCodeTreeItem';
import { InstalledChainCodeVersionTreeItem } from './model/InstalledChaincodeVersionTreeItem';
import { FabricConnectionManager } from '../fabric/FabricConnectionManager';
import { BlockchainExplorerProvider } from './BlockchainExplorerProvider';
import { FabricConnectionRegistryEntry } from '../fabric/FabricConnectionRegistryEntry';
import { FabricConnectionHelper } from '../fabric/FabricConnectionHelper';
import { FabricConnectionRegistry } from '../fabric/FabricConnectionRegistry';
import { RuntimeTreeItem } from './model/RuntimeTreeItem';
import { ConnectionPropertyTreeItem } from './model/ConnectionPropertyTreeItem';
import { FabricRuntimeRegistryEntry } from '../fabric/FabricRuntimeRegistryEntry';
import { FabricRuntimeRegistry } from '../fabric/FabricRuntimeRegistry';

export class BlockchainNetworkExplorerProvider implements BlockchainExplorerProvider {

    // only for testing so can get the updated tree
    public tree: Array<BlockchainTreeItem> = [];

    // tslint:disable-next-line member-ordering
    private _onDidChangeTreeData: vscode.EventEmitter<any | undefined> = new vscode.EventEmitter<any | undefined>();

    // tslint:disable-next-line member-ordering
    readonly onDidChangeTreeData: vscode.Event<any | undefined> = this._onDidChangeTreeData.event;

    private connection: IFabricConnection = null;

    private connectionRegistryManager: FabricConnectionRegistry = FabricConnectionRegistry.instance();

    private runtimeRegistryManager: FabricRuntimeRegistry = FabricRuntimeRegistry.instance();

    constructor() {
        FabricConnectionManager.instance().on('connected', async (connection: IFabricConnection) => {
            try {
                await this.connect(connection);
            } catch (error) {
                vscode.window.showErrorMessage(`Error handling connected event: ${error.message}`);
            }
        });
        FabricConnectionManager.instance().on('disconnected', async () => {
            try {
                await this.disconnect();
            } catch (error) {
                vscode.window.showErrorMessage(`Error handling disconnected event: ${error.message}`);
            }
        });
    }

    async refresh(element?: BlockchainTreeItem): Promise<void> {
        this._onDidChangeTreeData.fire(element);
    }

    async connect(connection: IFabricConnection): Promise<void> {
        console.log('connect', connection);
        // This controls which menu buttons appear
        await vscode.commands.executeCommand('setContext', 'blockchain-connected', true);
        await this.refresh();
    }

    async disconnect(): Promise<void> {
        console.log('disconnect');
        // This controls which menu buttons appear
        await vscode.commands.executeCommand('setContext', 'blockchain-connected', false);
        await this.refresh();
    }

    getTreeItem(element: BlockchainTreeItem): vscode.TreeItem {
        console.log('getTreeItem', element);
        return element;
    }

    async getChildren(element?: BlockchainTreeItem): Promise<BlockchainTreeItem[]> {
        console.log('getChildren', element);

        try {

            if (element) {
                if (element instanceof ConnectionTreeItem && FabricConnectionHelper.isCompleted(element.connection)) {
                    this.tree = await this.createConnectionIdentityTree(element as ConnectionTreeItem);
                }
                if (element instanceof ConnectionTreeItem && !FabricConnectionHelper.isCompleted(element.connection)) {
                    this.tree = await this.createConnectionUncompleteTree(element as ConnectionTreeItem);
                }

                if (element instanceof ChannelTreeItem) {
                    this.tree = [];
                    const channelElement: ChannelTreeItem = element as ChannelTreeItem;

                    this.tree.push(new PeersTreeItem(this, 'Peers', channelElement.peers));

                    if (channelElement.chaincodes.length > 0) {
                        this.tree.push(new InstantiatedChainCodesTreeItem(this, 'Instantiated Smart Contracts', element.chaincodes, channelElement));
                    }
                }

                if (element instanceof PeersTreeItem) {
                    this.tree = await this.createPeerTree(element as PeersTreeItem);
                }

                if (element instanceof PeerTreeItem) {
                    this.tree = await this.createInstalledChaincodeTree(element as PeerTreeItem);
                }

                if (element instanceof InstantiatedChainCodesTreeItem) {
                    this.tree = await this.createInstantiatedChaincodeTree(element as InstantiatedChainCodesTreeItem);
                }

                if (element instanceof InstalledChainCodeTreeItem) {
                    this.tree = await this.createInstalledChaincodeVersionTree(element as InstalledChainCodeTreeItem);
                }

                return this.tree;
            }

            if (FabricConnectionManager.instance().getConnection()) {
                this.tree = await this.createConnectedTree();
            } else {
                this.tree = await this.createConnectionTree();
            }

        } catch (error) {
            vscode.window.showErrorMessage(error.message);
        }

        return this.tree;
    }

    public async createConnectionUncompleteTree(element: ConnectionTreeItem): Promise<ConnectionPropertyTreeItem[]> {
        console.log('createConnectionUncompleteTree', element);

        let profileLabel: string = 'Connection Profile';
        let certLabel: string = 'Certificate';
        let keyLabel: string = 'Private Key';

        profileLabel = ((FabricConnectionHelper.connectionProfilePathComplete(element.connection)) ? '✓ ' : '+ ') + profileLabel;
        certLabel = ((FabricConnectionHelper.certificatePathComplete(element.connection)) ? '✓ ' : '+ ') + certLabel;
        keyLabel = ((FabricConnectionHelper.privateKeyPathComplete(element.connection)) ? '✓ ' : '+ ') + keyLabel;

        let command: vscode.Command;

        // tslint:disable-next-line
        let tree: ConnectionPropertyTreeItem[] = [];

        for (const label of [profileLabel, certLabel, keyLabel]) {
            console.log('Label is', label);
            command = {command: 'blockchainExplorer.editConnectionEntry', title: '', arguments: [{label: label, connection: element.connection}]};
            tree.push(new ConnectionPropertyTreeItem(this, label, element.connection, vscode.TreeItemCollapsibleState.None, command));
        }

        return tree;
    }

    private async createConnectionTree(): Promise<BlockchainTreeItem[]> {
        console.log('createdConnectionTree');
        const tree: BlockchainTreeItem[] = [];

        const allConnections: FabricConnectionRegistryEntry[] = this.connectionRegistryManager.getAll();
        const allRuntimes: FabricRuntimeRegistryEntry[] = this.runtimeRegistryManager.getAll();

        for (const runtime of allRuntimes) {
            try {
                const connection: FabricConnectionRegistryEntry = new FabricConnectionRegistryEntry();
                connection.name = runtime.name;
                connection.managedRuntime = true;

                const treeItem: RuntimeTreeItem = await RuntimeTreeItem.newRuntimeTreeItem(this,
                    runtime.name,
                    connection,
                    vscode.TreeItemCollapsibleState.None,
                    {
                        command: 'blockchainExplorer.connectEntry',
                        title: '',
                        arguments: [connection]
                    });
                tree.push(treeItem);
            } catch (error) {
                vscode.window.showErrorMessage(`Error populating Blockchain Explorer View: ${error.message}`);
            }
        }

        for (const connection of allConnections) {
            let collapsibleState: vscode.TreeItemCollapsibleState;
            let command: vscode.Command;

            // Cleanup any managed runtimes which shouldn't be in the fabric.connections anymore
            if (connection.managedRuntime) {
                await this.connectionRegistryManager.delete(connection.name); // Delete managed runtime
                continue; // Iterate to next connection
            }

            if (connection.identities && connection.identities.length > 1) {
                collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
            } else if (!FabricConnectionHelper.isCompleted(connection)) {
                collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
            } else {
                collapsibleState = vscode.TreeItemCollapsibleState.None;
                command = {
                    command: 'blockchainExplorer.connectEntry',
                    title: '',
                    arguments: [connection]
                };
            }

            if (!FabricConnectionHelper.isCompleted(connection)) {
                tree.push(new ConnectionTreeItem(this,
                    connection.name,
                    connection,
                    collapsibleState));
            } else {
                tree.push(new ConnectionTreeItem(this,
                    connection.name,
                    connection,
                    collapsibleState,
                    command));
            }
        }

        tree.sort((connectionA: ConnectionTreeItem, connectionB: ConnectionTreeItem) => {
            if (connectionA.label > connectionB.label) {
                return 1;
            } else if (connectionA.label < connectionB.label) {
                return -1;
            } else {
                return 0;
            }
        });

        tree.push(new AddConnectionTreeItem(this, '+ Add new connection', {
            command: 'blockchainExplorer.addConnectionEntry',
            title: ''
        }));

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

    private async createInstantiatedChaincodeTree(instantiatedChainCodesElement: InstantiatedChainCodesTreeItem): Promise<Array<ChainCodeTreeItem>> {
        console.log('createInstantiatedChaincodeTree', instantiatedChainCodesElement);
        const tree: Array<ChainCodeTreeItem> = [];
        const channel: ChannelTreeItem = instantiatedChainCodesElement.channel;

        instantiatedChainCodesElement.chaincodes.forEach((instantiatedChaincode: { name: string, version: string}) => {
            tree.push(new ChainCodeTreeItem(this, instantiatedChaincode.name, channel, instantiatedChaincode.version));
        });

        return tree;
    }

    private async createPeerTree(peersElement: PeersTreeItem): Promise<Array<PeerTreeItem>> {
        console.log('createPeerTree', peersElement);
        const tree: Array<PeerTreeItem> = [];

        for (const peer of peersElement.peers) {
            try {
                const chaincodes: Map<string, Array<string>> = await FabricConnectionManager.instance().getConnection().getInstalledChaincode(peer);
                const collapsibleState: vscode.TreeItemCollapsibleState = chaincodes.size > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None;
                tree.push(new PeerTreeItem(this, peer, chaincodes, collapsibleState));
            } catch (error) {
                tree.push(new PeerTreeItem(this, peer, new Map<string, Array<string>>(), vscode.TreeItemCollapsibleState.None));
                vscode.window.showErrorMessage('Error when getting installed smart contracts for peer ' + peer + ' ' + error.message);
            }
        }

        return tree;
    }

    private async createConnectedTree(): Promise<Array<ChannelTreeItem>> {
        try {
            console.log('createConnectedTree');
            const tree: Array<ChannelTreeItem> = [];

            const channelMap: Map<string, Array<string>> = await this.createChannelMap();
            const channels: Array<string> = Array.from(channelMap.keys());

            for (const channel of channels) {
                let chaincodes: Array<string>;
                const peers: Array<string> = channelMap.get(channel);
                try {
                    chaincodes = await FabricConnectionManager.instance().getConnection().getInstantiatedChaincode(channel);
                    tree.push(new ChannelTreeItem(this, channel, peers, chaincodes, vscode.TreeItemCollapsibleState.Collapsed));
                } catch (error) {
                    tree.push(new ChannelTreeItem(this, channel, peers, [], vscode.TreeItemCollapsibleState.Collapsed));
                    vscode.window.showErrorMessage('Error getting instantiated smart contracts for channel ' + channel + ' ' + error.message);
                }
            }

            return tree;
        } catch (error) {
            await FabricConnectionManager.instance().disconnect();
            throw error;
        }
    }

    private async createChannelMap(): Promise<Map<string, Array<string>>> {
        console.log('createChannelMap');
        const allPeerNames: Array<string> = await FabricConnectionManager.instance().getConnection().getAllPeerNames();

        const channelMap: Map<string, Array<string>> = new Map<string, Array<string>>();
        return allPeerNames.reduce((promise: Promise<void>, peerName: string) => {
            return promise.then(() => {
                return FabricConnectionManager.instance().getConnection().getAllChannelsForPeer(peerName);
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

    private async createConnectionIdentityTree(element: ConnectionTreeItem): Promise<ConnectionIdentityTreeItem[]> {
        console.log('createConnectionIdentityTree', element);
        const tree: Array<ConnectionIdentityTreeItem> = [];

        for (const identity of element.connection.identities) {
            try {
                const cert: ParsedCertificate = new ParsedCertificate(identity.certificatePath);
                const commonName: string = cert.getCommonName();

                const command: vscode.Command = {
                    command: 'blockchainExplorer.connectEntry',
                    title: '',
                    arguments: [element.connection, identity]
                };

                tree.push(new ConnectionIdentityTreeItem(this, commonName, command));

            } catch (error) {
                vscode.window.showErrorMessage('Error parsing certificate ' + error.message);
            }
        }

        return tree;
    }
}
