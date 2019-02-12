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
import { ChannelTreeItem } from './model/ChannelTreeItem';
import { GatewayIdentityTreeItem } from './model/GatewayIdentityTreeItem';
import { BlockchainTreeItem } from './model/BlockchainTreeItem';
import { GatewayTreeItem } from './model/GatewayTreeItem';
import { FabricConnectionManager } from '../fabric/FabricConnectionManager';
import { BlockchainExplorerProvider } from './BlockchainExplorerProvider';
import { FabricGatewayRegistryEntry } from '../fabric/FabricGatewayRegistryEntry';
import { FabricRuntimeRegistryEntry } from '../fabric/FabricRuntimeRegistryEntry';
import { FabricRuntimeRegistry } from '../fabric/FabricRuntimeRegistry';
import { TransactionTreeItem } from './model/TransactionTreeItem';
import { InstantiatedChaincodeTreeItem } from './model/InstantiatedChaincodeTreeItem';
import { ConnectedTreeItem } from './model/ConnectedTreeItem';
import { MetadataUtil } from '../util/MetadataUtil';
import { ContractTreeItem } from './model/ContractTreeItem';
import { VSCodeOutputAdapter } from '../logging/VSCodeOutputAdapter';
import { LogType } from '../logging/OutputAdapter';
import { IFabricWalletGenerator } from '../fabric/IFabricWalletGenerator';
import { FabricWalletGeneratorFactory } from '../fabric/FabricWalletGeneratorFactory';
import { FabricRuntimeManager } from '../fabric/FabricRuntimeManager';
import { FabricRuntime } from '../fabric/FabricRuntime';
import { IFabricWallet } from '../fabric/IFabricWallet';
import { FabricGatewayHelper } from '../fabric/FabricGatewayHelper';
import { GatewayPropertyTreeItem } from './model/GatewayPropertyTreeItem';
import { LocalGatewayTreeItem } from './model/LocalGatewayTreeItem';
import { FabricGatewayRegistry } from '../fabric/FabricGatewayRegistry';
import { ConnectionTreeItem } from './model/ConnectionTreeItem';

export class BlockchainNetworkExplorerProvider implements BlockchainExplorerProvider {

    // only for testing so can get the updated tree
    public tree: Array<BlockchainTreeItem> = [];

    // tslint:disable-next-line member-ordering
    private _onDidChangeTreeData: vscode.EventEmitter<any | undefined> = new vscode.EventEmitter<any | undefined>();

    // tslint:disable-next-line member-ordering
    readonly onDidChangeTreeData: vscode.Event<any | undefined> = this._onDidChangeTreeData.event;

    private fabricGatewayRegistry: FabricGatewayRegistry = FabricGatewayRegistry.instance();

    private runtimeRegistryManager: FabricRuntimeRegistry = FabricRuntimeRegistry.instance();

    constructor() {
        const outputAdapter: VSCodeOutputAdapter = VSCodeOutputAdapter.instance();

        FabricConnectionManager.instance().on('connected', async (connection: IFabricConnection) => {
            try {
                await this.connect(connection);
            } catch (error) {
                outputAdapter.log(LogType.ERROR, `Error handling connected event: ${error.message}`, `Error handling connected event: ${error.toString()}`);
            }
        });
        FabricConnectionManager.instance().on('disconnected', async () => {
            try {
                await this.disconnect();
            } catch (error) {
                outputAdapter.log(LogType.ERROR, `Error handling disconnected event: ${error.message}`, `Error handling disconnected event: ${error.toString()}`);
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
        const outputAdapter: VSCodeOutputAdapter = VSCodeOutputAdapter.instance();

        try {

            if (element) {
                if ((element instanceof GatewayTreeItem || element instanceof LocalGatewayTreeItem) && FabricGatewayHelper.isCompleted(element.gateway)) {
                    this.tree = await this.createGatewayIdentityTree(element as GatewayTreeItem); // Identities for completed gateway
                }
                if (element instanceof GatewayTreeItem && !FabricGatewayHelper.isCompleted(element.gateway)) {
                    this.tree = await this.createGatewayUncompleteTree(element as GatewayTreeItem); // Uncomplete gateway, wallet and connection profile are required
                }

                if (element instanceof GatewayPropertyTreeItem && element.label.includes('Wallet') && !FabricGatewayHelper.walletPathComplete(element.gateway)) {
                    this.tree = await this.createWalletUncompleteTree(element as GatewayPropertyTreeItem); // Incomplete wallet
                }

                // This won't be called before connecting to a gatewawy
                if (element instanceof ChannelTreeItem) {
                    this.tree = [];
                    const channelElement: ChannelTreeItem = element as ChannelTreeItem;

                    if (channelElement.chaincodes.length > 0) {
                        const instantiatedChaincodes: Array<InstantiatedChaincodeTreeItem> = await this.createInstantiatedChaincodeTree(element as ChannelTreeItem);
                        this.tree.push(...instantiatedChaincodes);
                    }
                }

                if (element instanceof ConnectedTreeItem && element.connectionName === 'Channels') {
                    try {
                        this.tree = await this.getChannelsTree();
                    } catch (error) {
                        // Added this as it was connecting, but couldn't create channel map and kept erroring.
                        // This reverts the view back to the unconnected tree.
                        this.tree = await this.createConnectionTree();

                        outputAdapter.log(LogType.ERROR, `Could not connect to gateway: ${error.message}`);
                    }
                }

                // This won't be called before connecting to a gatewawy
                if (element instanceof InstantiatedChaincodeTreeItem) {
                    this.tree = await this.createContractTree(element as InstantiatedChaincodeTreeItem);
                }

                // This won't be called before connecting to a gatewawy
                if (element instanceof ContractTreeItem) {
                    this.tree = await this.createTransactionsChaincodeTree(element as ContractTreeItem);
                }

                return this.tree;
            }

            if (FabricConnectionManager.instance().getConnection()) {
                // If connected to a gateway
                this.tree = await this.createConnectedTree();
            } else {
                // If not connected to a gateway
                this.tree = await this.createConnectionTree();
            }

        } catch (error) {
            outputAdapter.log(LogType.ERROR, error.message);
        }

        return this.tree;
    }

    public async createGatewayUncompleteTree(element: GatewayTreeItem|LocalGatewayTreeItem): Promise<GatewayPropertyTreeItem[]> {
        console.log('createGatewayUncompleteTree', element);

        let profileLabel: string = 'Connection Profile';
        let walletLabel: string = 'Wallet';

        profileLabel = ((FabricGatewayHelper.connectionProfilePathComplete(element.gateway)) ? '✓ ' : '+ ') + profileLabel;
        walletLabel = ((FabricGatewayHelper.walletPathComplete(element.gateway)) ? '✓ ' : '+ ') + walletLabel;

        let command: vscode.Command;
        let treeState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None;

        const tree: GatewayPropertyTreeItem[] = [];

        for (const label of [profileLabel, walletLabel]) {
            if (label === '+ Wallet') {
                treeState = vscode.TreeItemCollapsibleState.Collapsed;
            }
            command = {
                command: 'blockchainConnectionsExplorer.editGatewayEntry',
                title: '',
                arguments: [{ label: label, gateway: element.gateway }]
            };
            tree.push(new GatewayPropertyTreeItem(this, label, element.gateway, treeState, command));
        }

        return tree;
    }

    public async createWalletUncompleteTree(element: GatewayPropertyTreeItem): Promise<GatewayPropertyTreeItem[]> {
        console.log('createWalletUncompleteTree', element);

        const identityLabel: string = '+ Identity';
        let command: vscode.Command;
        const tree: GatewayPropertyTreeItem[] = [];

        command = {
            command: 'blockchainExplorer.editGatewayEntry',
            title: '',
            arguments: [{ label: identityLabel, gateway: element.gateway }]
        };
        tree.push(new GatewayPropertyTreeItem(this, identityLabel, element.gateway, vscode.TreeItemCollapsibleState.None, command));

        return tree;
    }

    private async createConnectionTree(): Promise<BlockchainTreeItem[]> {
        console.log('createdConnectionTree');
        const outputAdapter: VSCodeOutputAdapter = VSCodeOutputAdapter.instance();

        const tree: BlockchainTreeItem[] = [];

        const allGateways: FabricGatewayRegistryEntry[] = this.fabricGatewayRegistry.getAll();

        const allRuntimes: FabricRuntimeRegistryEntry[] = this.runtimeRegistryManager.getAll();

        for (const runtimeEntry of allRuntimes) {
            try {
                const gateway: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
                gateway.name = runtimeEntry.name;
                gateway.managedRuntime = true;

                const runtime: FabricRuntime = FabricRuntimeManager.instance().get(runtimeEntry.name);

                const fabricWallet: IFabricWallet = await FabricWalletGeneratorFactory.createFabricWalletGenerator().createLocalWallet(runtime.getName());
                const walletPath: string = fabricWallet.getWalletPath();
                gateway.walletPath = walletPath;

                const treeItem: LocalGatewayTreeItem = await LocalGatewayTreeItem.newLocalGatewayTreeItem(
                    this,
                    gateway.name,
                    gateway,
                    vscode.TreeItemCollapsibleState.Expanded,
                    undefined
                );

                tree.push(treeItem);

            } catch (error) {
                outputAdapter.log(LogType.ERROR, `Error populating Blockchain Explorer View: ${error.message}`, `Error populating Blockchain Explorer View: ${error.toString()}`);
            }
        }

        for (const gateway of allGateways) {
            // Cleanup any managed runtimes which shouldn't be in the fabric.gateways
            if (gateway.managedRuntime) {
                await this.fabricGatewayRegistry.delete(gateway.name); // Delete managed runtime
                continue; // Iterate to next connection
            }

            const command: vscode.Command = undefined;

            if (!FabricGatewayHelper.isCompleted(gateway)) {
                tree.push(new GatewayTreeItem(this,
                    gateway.name,
                    gateway,
                    vscode.TreeItemCollapsibleState.Expanded));
            } else {
                tree.push(new GatewayTreeItem(this,
                    gateway.name,
                    gateway,
                    vscode.TreeItemCollapsibleState.Expanded,
                    command));
            }
        }

        tree.sort((connectionA: GatewayTreeItem, connectionB: GatewayTreeItem) => {
            if (connectionA.label > connectionB.label) {
                return 1;
            } else if (connectionA.label < connectionB.label) {
                return -1;
            } else {
                return 0;
            }
        });

        return tree;
    }

    private async createInstantiatedChaincodeTree(channelTreeElement: ChannelTreeItem): Promise<Array<InstantiatedChaincodeTreeItem>> {
        console.log('createInstantiatedChaincodeTree', channelTreeElement);
        const tree: Array<InstantiatedChaincodeTreeItem> = [];

        for (const instantiatedChaincode of channelTreeElement.chaincodes) {
            const connection: IFabricConnection = await FabricConnectionManager.instance().getConnection();
            const contracts: Array<string> = await MetadataUtil.getContractNames(connection, instantiatedChaincode.name, channelTreeElement.label);
            let collapsedState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
            if (contracts.length === 0) {
                collapsedState = vscode.TreeItemCollapsibleState.None;
            }
            tree.push(new InstantiatedChaincodeTreeItem(this, instantiatedChaincode.name, channelTreeElement, instantiatedChaincode.version, collapsedState, contracts, true));
        }

        return tree;
    }

    private async createContractTree(chainCodeElement: InstantiatedChaincodeTreeItem): Promise<Array<ContractTreeItem>> {
        console.log('createContractsTree', chainCodeElement);
        const tree: Array<any> = [];
        for (const contract of chainCodeElement.contracts) {
            const connection: IFabricConnection = await FabricConnectionManager.instance().getConnection();
            const transactionNamesMap: Map<string, string[]> = await MetadataUtil.getTransactionNames(connection, chainCodeElement.name, chainCodeElement.channel.label);
            const transactionNames: string[] = transactionNamesMap.get(contract);
            if (contract === '' || chainCodeElement.contracts.length === 1) {
                for (const transaction of transactionNames) {
                    tree.push(new TransactionTreeItem(this, transaction, chainCodeElement.name, chainCodeElement.channel.label, contract));
                }
            } else {
                tree.push(new ContractTreeItem(this, contract, vscode.TreeItemCollapsibleState.Collapsed, chainCodeElement, transactionNames));
            }
        }
        return tree;
    }

    private async createTransactionsChaincodeTree(contractTreeElement: ContractTreeItem): Promise<Array<TransactionTreeItem>> {
        const tree: Array<TransactionTreeItem> = [];
        console.log('createTransactionsChaincodeTree', contractTreeElement);
        contractTreeElement.transactions.forEach((transaction: string) => {
            tree.push(new TransactionTreeItem(this, transaction, contractTreeElement.instantiatedChaincode.name, contractTreeElement.instantiatedChaincode.channel.label, contractTreeElement.name));
        });

        return tree;
    }

    private async createConnectedTree(): Promise<Array<BlockchainTreeItem>> {
        const outputAdapter: VSCodeOutputAdapter = VSCodeOutputAdapter.instance();

        try {
            console.log('createConnectedTree');
            const tree: Array<BlockchainTreeItem> = [];

            const connection: IFabricConnection = await FabricConnectionManager.instance().getConnection();
            const gatewayRegistryEntry: FabricGatewayRegistryEntry = FabricConnectionManager.instance().getGatewayRegistryEntry();
            tree.push(new ConnectedTreeItem(this, `Connected via gateway: ${gatewayRegistryEntry.name}`, gatewayRegistryEntry, 0));
            tree.push(new ConnectedTreeItem(this, `Using ID: ${connection.identityName}`, gatewayRegistryEntry, 0));
            tree.push(new ConnectedTreeItem(this, `Channels`, gatewayRegistryEntry, vscode.TreeItemCollapsibleState.Expanded));

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
                if (error.message && error.message.includes('Received http2 header with status: 503')) { // If gRPC can't connect to Fabric
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

    private async createGatewayIdentityTree(element: GatewayTreeItem|LocalGatewayTreeItem): Promise<GatewayIdentityTreeItem[]> {
        console.log('createConnectionIdentityTree', element);
        const outputAdapter: VSCodeOutputAdapter = VSCodeOutputAdapter.instance();

        const tree: Array<GatewayIdentityTreeItem> = [];

        // get identityNames in the wallet
        const FabricWalletGenerator: IFabricWalletGenerator = FabricWalletGeneratorFactory.createFabricWalletGenerator();
        const identityNames: string[] = await FabricWalletGenerator.getIdentityNames(element.gateway.name, element.gateway.walletPath);

        for (const identityName of identityNames) {
            const command: vscode.Command = {
                command: 'blockchainConnectionsExplorer.connectEntry',
                title: '',
                arguments: [element.gateway, identityName]
            };

            tree.push(new GatewayIdentityTreeItem(this, identityName, command));
        }

        return tree;
    }

    private async getChannelsTree(): Promise<ChannelTreeItem[]> {
        const outputAdapter: VSCodeOutputAdapter = VSCodeOutputAdapter.instance();
        try {
            const channelMap: Map<string, Array<string>> = await this.createChannelMap();

            const channels: Array<string> = Array.from(channelMap.keys());

            const tree: Array<ChannelTreeItem> = [];

            for (const channel of channels) {
                let chaincodes: Array<{ name: string, version: string }>;
                const peers: Array<string> = channelMap.get(channel);
                try {
                    chaincodes = await FabricConnectionManager.instance().getConnection().getInstantiatedChaincode(channel);
                    if (chaincodes.length > 0) {
                        tree.push(new ChannelTreeItem(this, channel, peers, chaincodes, vscode.TreeItemCollapsibleState.Collapsed));
                    } else {
                        tree.push(new ChannelTreeItem(this, channel, peers, chaincodes, vscode.TreeItemCollapsibleState.None));
                    }
                } catch (error) {
                    tree.push(new ChannelTreeItem(this, channel, peers, [], vscode.TreeItemCollapsibleState.None));
                    outputAdapter.log(LogType.ERROR, `Error getting instantiated smart contracts for channel ${channel} ${error.message}`);
                }
            }
            return tree;
        } catch (error) {
            await FabricConnectionManager.instance().disconnect();

            throw error;
        }
    }
}
