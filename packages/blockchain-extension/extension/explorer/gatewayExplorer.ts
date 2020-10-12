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
import { ChannelTreeItem } from './model/ChannelTreeItem';
import { BlockchainTreeItem } from './model/BlockchainTreeItem';
import { GatewayAssociatedTreeItem } from './model/GatewayAssociatedTreeItem';
import { GatewayDissociatedTreeItem } from './model/GatewayDissociatedTreeItem';
import { FabricGatewayConnectionManager } from '../fabric/FabricGatewayConnectionManager';
import { BlockchainExplorerProvider } from './BlockchainExplorerProvider';
import { TransactionTreeItem } from './model/TransactionTreeItem';
import { InstantiatedChaincodeTreeItem } from './model/InstantiatedChaincodeTreeItem';
import { ConnectedTreeItem } from './model/ConnectedTreeItem';
import { MetadataUtil } from '../util/MetadataUtil';
import { ContractTreeItem } from './model/ContractTreeItem';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { LocalGatewayTreeItem } from './model/LocalGatewayTreeItem';
import { ExtensionCommands } from '../../ExtensionCommands';
import { InstantiatedContractTreeItem } from './model/InstantiatedContractTreeItem';
import { InstantiatedTreeItem } from './model/InstantiatedTreeItem';
import { FabricChaincode, IFabricGatewayConnection, LogType, FabricGatewayRegistryEntry, FabricGatewayRegistry, FabricEnvironmentRegistryEntry, FabricEnvironmentRegistry, EnvironmentType } from 'ibm-blockchain-platform-common';
import { InstantiatedMultiContractTreeItem } from './model/InstantiatedMultiContractTreeItem';
import { InstantiatedUnknownTreeItem } from './model/InstantiatedUnknownTreeItem';
import { InstantiatedAssociatedTreeItem } from './model/InstantiatedAssociatedTreeItem';
import { InstantiatedAssociatedContractTreeItem } from './model/InstantiatedAssociatedContractTreeItem';
import { InstantiatedAssociatedChaincodeTreeItem } from './model/InstantiatedAssociatedChaincodeTreeItem';
import { InstantiatedAssociatedMultiContractTreeItem } from './model/InstantiatedAssociatedMultiContractTreeItem';
import { TextTreeItem } from './model/TextTreeItem';
import { LocalEnvironmentManager } from '../fabric/environments/LocalEnvironmentManager';
import { LocalEnvironment } from '../fabric/environments/LocalEnvironment';
import { ManagedAnsibleEnvironmentManager } from '../fabric/environments/ManagedAnsibleEnvironmentManager';
import { ManagedAnsibleEnvironment } from '../fabric/environments/ManagedAnsibleEnvironment';
import { GatewayTreeItem } from './model/GatewayTreeItem';
import { GatewayGroupTreeItem } from './model/GatewayGroupTreeItem';
import { ExplorerUtil } from '../util/ExplorerUtil';

export class BlockchainGatewayExplorerProvider implements BlockchainExplorerProvider {

    // only for testing so can get the updated tree
    public tree: Array<BlockchainTreeItem> = [];

    // tslint:disable-next-line member-ordering
    private _onDidChangeTreeData: vscode.EventEmitter<any | undefined> = new vscode.EventEmitter<any | undefined>();

    // tslint:disable-next-line member-ordering
    readonly onDidChangeTreeData: vscode.Event<any | undefined> = this._onDidChangeTreeData.event;

    private fabricGatewayRegistry: FabricGatewayRegistry = FabricGatewayRegistry.instance();

    private instantiatedChaincodeTreeItems: Array<any> = [];

    constructor() {
        const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();

        FabricGatewayConnectionManager.instance().on('connected', async () => {
            try {
                await this.connect();
            } catch (error) {
                outputAdapter.log(LogType.ERROR, `Error handling connected event: ${error.message}`, `Error handling connected event: ${error.toString()}`);
            }
        });
        FabricGatewayConnectionManager.instance().on('disconnected', async () => {
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

    async connect(): Promise<void> {
        // This controls which menu buttons appear
        await vscode.commands.executeCommand('setContext', 'blockchain-gateway-connected', true);
        await this.refresh();
    }

    async disconnect(): Promise<void> {
        // This controls which menu buttons appear
        await vscode.commands.executeCommand('setContext', 'blockchain-gateway-connected', false);
        await this.refresh();
    }

    getTreeItem(element: BlockchainTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: BlockchainTreeItem): Promise<BlockchainTreeItem[]> {
        const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();

        try {

            if (element) {

                if (element instanceof GatewayGroupTreeItem) {
                    this.tree = await this.populateGateways(element.gateways);
                }

                // This won't be called before connecting to a gatewawy
                if (element instanceof ChannelTreeItem) {
                    this.tree = [];
                    const channelElement: ChannelTreeItem = element;

                    if (channelElement.chaincodes.length > 0) {
                        this.tree = await this.createInstantiatedChaincodeTree(element);
                    }
                }

                if (element instanceof ConnectedTreeItem && element.label === 'Channels') {
                    try {
                        this.tree = await this.getChannelsTree();
                    } catch (error) {
                        // Added this as it was connecting, but couldn't create channel map and kept erroring.
                        // This reverts the view back to the unconnected tree.
                        this.tree = await this.createConnectionTree();

                        outputAdapter.log(LogType.ERROR, `Could not connect to gateway: ${error.message}`);
                    }
                }

                if (element instanceof InstantiatedUnknownTreeItem) {
                    // Populate the tree with correct instantiated tree items
                    await this.populateInstantiatedTreeItems(element);
                    // Calls getChildren on channelTreeItem
                    await this.refresh(element.channels[0]);
                    return;
                }

                // This won't be called before connecting to a gateway
                if (element instanceof InstantiatedContractTreeItem) {
                    this.tree = await this.createContractTree(element);
                }

                // This won't be called before connecting to a gatewawy
                if (element instanceof ContractTreeItem) {
                    this.tree = await this.createTransactionsChaincodeTree(element);
                }

                return this.tree;
            } else {
                // Reset the store of instantiatedChaincodeTreeItems
                this.instantiatedChaincodeTreeItems = [];
            }

            if (FabricGatewayConnectionManager.instance().getConnection()) {
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

    private async createConnectionTree(): Promise<BlockchainTreeItem[]> {

        const tree: BlockchainTreeItem[] = [];

        let allGateways: FabricGatewayRegistryEntry[] = await this.fabricGatewayRegistry.getAll();
        allGateways = await this.updateGatewayEnvironmentGroup(allGateways);

        const gatewayGroups: Array<FabricGatewayRegistryEntry[]> = [];
        const otherGateways: Array<FabricGatewayRegistryEntry> = [];
        for (const gateway of allGateways) {
            if (gatewayGroups.length === 0) {
                if (gateway.fromEnvironment || gateway.environmentGroup) {
                    gatewayGroups.push([gateway]);
                } else {
                    otherGateways.push(gateway);
                }
                continue;
            }

            // Used to check if group exists already
            const groupIndex: number = gatewayGroups.findIndex((group: FabricGatewayRegistryEntry[]) => {
                if (gateway.fromEnvironment) {
                    return gateway.fromEnvironment === group[0].fromEnvironment || gateway.fromEnvironment === group[0].environmentGroup;
                } else if (gateway.environmentGroup) {
                    return gateway.environmentGroup === group[0].fromEnvironment || gateway.environmentGroup === group[0].environmentGroup;
                }
            });

            if (groupIndex !== -1) {
                // If a group with the same fromEnvironment exists, then push gateway to the group
                gatewayGroups[groupIndex].push(gateway);
            } else {
                if (gateway.fromEnvironment || gateway.environmentGroup) {
                    // Create new group
                    gatewayGroups.push([gateway]);
                } else {
                    // group gateways that don't belong to environments
                    otherGateways.push(gateway);
                }
            }
        }
        if (otherGateways.length > 0) {
            gatewayGroups.push(otherGateways);
        }

        if (gatewayGroups.length === 0) {
            tree.push(new TextTreeItem(this, 'No gateways found'));
        } else {

            for (const group of gatewayGroups) {
                let groupName: string = 'Other gateways';
                if (group[0].fromEnvironment) {
                    groupName = group[0].fromEnvironment;
                } else if (group[0].environmentGroup) {
                    groupName = group[0].environmentGroup;
                }
                const groupTreeItem: GatewayGroupTreeItem = new GatewayGroupTreeItem(this, groupName, group, vscode.TreeItemCollapsibleState.Expanded);
                if (groupName !== 'Other gateways') {
                    groupTreeItem.iconPath = await ExplorerUtil.getGroupIcon(groupName);
                }
                tree.push(groupTreeItem);
            }
        }

        return tree;

    }

    private async createInstantiatedChaincodeTree(channelTreeElement: ChannelTreeItem): Promise<Array<InstantiatedTreeItem>> {
        const tree: Array<InstantiatedTreeItem> = [];

        for (const chaincode of channelTreeElement.chaincodes) {
            // Is the chaincode in the this.instantiatedChaincodeTreeItems store?
            const index: number = this.instantiatedChaincodeTreeItems.findIndex((treeItem: InstantiatedTreeItem) => {
                return `${chaincode.name}@${chaincode.version}` === treeItem.label && treeItem.channels[0].label === channelTreeElement.label;
            });
            if (index !== -1) {
                // Push the stored tree item to the tree
                tree.push(this.instantiatedChaincodeTreeItems[index]);
            } else {
                // Chaincode isn't stored
                // Populate tree with generic instantiatedUnknownTreeItem or instantiatedAssociatedTreeItem and type them properly when vscode calls getTreeItem on each one
                const gateway: FabricGatewayRegistryEntry = await FabricGatewayConnectionManager.instance().getGatewayRegistryEntry();
                if (!gateway.transactionDataDirectories || gateway.transactionDataDirectories.length === 0) {
                    tree.push(new InstantiatedUnknownTreeItem(this, chaincode.name, [channelTreeElement], chaincode.version, vscode.TreeItemCollapsibleState.Collapsed, undefined, true));
                } else {
                    if (this.checkForTxdataAssociations(gateway, chaincode.name, [channelTreeElement])) {
                        tree.push(new InstantiatedAssociatedTreeItem(this, chaincode.name, [channelTreeElement], chaincode.version, vscode.TreeItemCollapsibleState.Collapsed, undefined, true));
                    } else {
                        tree.push(new InstantiatedUnknownTreeItem(this, chaincode.name, [channelTreeElement], chaincode.version, vscode.TreeItemCollapsibleState.Collapsed, undefined, true));
                    }
                }
            }
        }
        return tree;
    }

    private async populateInstantiatedTreeItems(unknownTreeItem: InstantiatedAssociatedTreeItem): Promise<void> {
        // Determine contracts for each instantiated chaincode and properly assign element
        const connection: IFabricGatewayConnection = FabricGatewayConnectionManager.instance().getConnection();
        const gateway: FabricGatewayRegistryEntry = await FabricGatewayConnectionManager.instance().getGatewayRegistryEntry();
        const contracts: Array<string> = await MetadataUtil.getContractNames(connection, unknownTreeItem.name, unknownTreeItem.channels[0].label);
        let newElement: BlockchainTreeItem;
        if (!contracts) {
            newElement = (this.checkForTxdataAssociations(gateway, unknownTreeItem.name, unknownTreeItem.channels)) ?
                new InstantiatedAssociatedChaincodeTreeItem(this, unknownTreeItem.name, unknownTreeItem.channels, unknownTreeItem.version, vscode.TreeItemCollapsibleState.None, undefined, true) :
                new InstantiatedChaincodeTreeItem(this, unknownTreeItem.name, unknownTreeItem.channels, unknownTreeItem.version, vscode.TreeItemCollapsibleState.None, undefined, true);
        } else if (contracts.length === 0) {
            newElement = (this.checkForTxdataAssociations(gateway, unknownTreeItem.name, unknownTreeItem.channels)) ?
                new InstantiatedAssociatedContractTreeItem(this, unknownTreeItem.name, unknownTreeItem.channels, unknownTreeItem.version, vscode.TreeItemCollapsibleState.None, contracts, true) :
                new InstantiatedContractTreeItem(this, unknownTreeItem.name, unknownTreeItem.channels, unknownTreeItem.version, vscode.TreeItemCollapsibleState.None, contracts, true);
        } else if (contracts.length === 1) {
            newElement = (this.checkForTxdataAssociations(gateway, unknownTreeItem.name, unknownTreeItem.channels)) ?
                new InstantiatedAssociatedContractTreeItem(this, unknownTreeItem.name, unknownTreeItem.channels, unknownTreeItem.version, vscode.TreeItemCollapsibleState.Collapsed, contracts, true) :
                new InstantiatedContractTreeItem(this, unknownTreeItem.name, unknownTreeItem.channels, unknownTreeItem.version, vscode.TreeItemCollapsibleState.Collapsed, contracts, true);
        } else {
            newElement = (this.checkForTxdataAssociations(gateway, unknownTreeItem.name, unknownTreeItem.channels)) ?
                new InstantiatedAssociatedMultiContractTreeItem(this, unknownTreeItem.name, unknownTreeItem.channels, unknownTreeItem.version, vscode.TreeItemCollapsibleState.Collapsed, contracts, true) :
                new InstantiatedMultiContractTreeItem(this, unknownTreeItem.name, unknownTreeItem.channels, unknownTreeItem.version, vscode.TreeItemCollapsibleState.Collapsed, contracts, true);
        }

        // Populate and store instantiatedChaincodeTreeItems with correct tree items
        this.instantiatedChaincodeTreeItems.push(newElement);
    }

    private async createContractTree(chainCodeElement: InstantiatedChaincodeTreeItem): Promise<Array<ContractTreeItem>> {
        const tree: Array<any> = [];
        for (const contract of chainCodeElement.contracts) {
            const connection: IFabricGatewayConnection = FabricGatewayConnectionManager.instance().getConnection();
            const transactionNamesMap: Map<string, string[]> = await MetadataUtil.getTransactionNames(connection, chainCodeElement.name, chainCodeElement.channels[0].label);
            const transactionNames: string[] = transactionNamesMap.get(contract);
            if (contract === '' || chainCodeElement.contracts.length === 1) {
                for (const transaction of transactionNames) {
                    tree.push(new TransactionTreeItem(this, transaction, chainCodeElement.name, chainCodeElement.channels[0].label, contract));
                }
            } else {
                tree.push(new ContractTreeItem(this, contract, vscode.TreeItemCollapsibleState.Collapsed, chainCodeElement, transactionNames, chainCodeElement.channels[0].label));
            }
        }
        return tree;
    }

    private async createTransactionsChaincodeTree(contractTreeElement: ContractTreeItem): Promise<Array<TransactionTreeItem>> {
        const tree: Array<TransactionTreeItem> = [];
        contractTreeElement.transactions.forEach((transaction: string) => {
            tree.push(new TransactionTreeItem(this, transaction, contractTreeElement.instantiatedChaincode.name, contractTreeElement.instantiatedChaincode.channels[0].label, contractTreeElement.name));
        });

        return tree;
    }

    private async populateGateways(gateways: FabricGatewayRegistryEntry[]): Promise<Array<GatewayTreeItem>> {

        const tree: Array<GatewayTreeItem> = [];
        for (const gateway of gateways) {
            const command: vscode.Command = {
                command: ExtensionCommands.CONNECT_TO_GATEWAY,
                title: '',
                arguments: [gateway]
            };

            const gatewayName: string = gateway.displayName ? gateway.displayName : gateway.name;

            let environmentEntry: FabricEnvironmentRegistryEntry;
            let runtime: LocalEnvironment | ManagedAnsibleEnvironment;
            if (gateway.fromEnvironment) {
                environmentEntry = await FabricEnvironmentRegistry.instance().get(gateway.fromEnvironment);

            }

            if (environmentEntry && environmentEntry.managedRuntime) {

                if (environmentEntry.environmentType === EnvironmentType.LOCAL_ENVIRONMENT) {
                    runtime = await LocalEnvironmentManager.instance().ensureRuntime(environmentEntry.name, undefined, environmentEntry.numberOfOrgs);
                } else {
                    runtime = ManagedAnsibleEnvironmentManager.instance().ensureRuntime(environmentEntry.name, environmentEntry.environmentDirectory);
                }

                const treeItem: LocalGatewayTreeItem = await LocalGatewayTreeItem.newLocalGatewayTreeItem(
                    this,
                    gatewayName,
                    gateway,
                    vscode.TreeItemCollapsibleState.None,
                    runtime,
                    command
                );

                tree.push(treeItem);
            } else if (gateway.associatedWallet) {
                tree.push(new GatewayAssociatedTreeItem(this,
                    gatewayName,
                    gateway,
                    vscode.TreeItemCollapsibleState.None,
                    command)
                );
            } else {
                tree.push(new GatewayDissociatedTreeItem(this,
                    gatewayName,
                    gateway,
                    vscode.TreeItemCollapsibleState.None,
                    command)
                );
            }
        }

        return tree;
    }

    private async createConnectedTree(): Promise<Array<BlockchainTreeItem>> {

        try {
            const tree: Array<BlockchainTreeItem> = [];

            const connection: IFabricGatewayConnection = FabricGatewayConnectionManager.instance().getConnection();
            const gateway: FabricGatewayRegistryEntry = await FabricGatewayConnectionManager.instance().getGatewayRegistryEntry();
            const gatewayName: string = gateway.name;

            tree.push(new ConnectedTreeItem(this, `Connected via gateway: ${gatewayName}`, gateway, 0));
            tree.push(new ConnectedTreeItem(this, `Using ID: ${connection.identityName}`, gateway, 0));
            tree.push(new ConnectedTreeItem(this, `Channels`, gateway, vscode.TreeItemCollapsibleState.Expanded));

            return tree;
        } catch (error) {
            FabricGatewayConnectionManager.instance().disconnect();
            throw error;
        }
    }

    private async getChannelsTree(): Promise<ChannelTreeItem[]> {
        const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
        try {
            const connection: IFabricGatewayConnection = FabricGatewayConnectionManager.instance().getConnection();

            const createChannelsResult: {channelMap: Map<string, string[]>, v2channels: string[]}  = await connection.createChannelMap();
            const channelMap: Map<string, Array<string>> = createChannelsResult.channelMap;
            const channels: Array<string> = Array.from(channelMap.keys());

            const tree: Array<ChannelTreeItem> = [];

            for (const channel of channels) {
                let chaincodes: Array<FabricChaincode>;
                const peers: Array<string> = channelMap.get(channel);
                try {
                    chaincodes = await connection.getInstantiatedChaincode(channel);
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
            FabricGatewayConnectionManager.instance().disconnect();

            throw error;
        }
    }

    private checkForTxdataAssociations(gateway: FabricGatewayRegistryEntry, chaincodeName: string, channels: Array<ChannelTreeItem>): boolean {
        if (!gateway.transactionDataDirectories || gateway.transactionDataDirectories.length === 0) {
            return false;
        } else {
            return gateway.transactionDataDirectories.some((association: any) => {
                for (const channel of channels) {
                    return association.chaincodeName === chaincodeName && association.channelName === channel.label;
                }
            });
        }
    }

    private async updateGatewayEnvironmentGroup(gatewayRegistryEntries: FabricGatewayRegistryEntry[]): Promise<FabricGatewayRegistryEntry[]> {
        for (const gateway of gatewayRegistryEntries) {
            if (gateway.environmentGroup) {
                const envExists: boolean = await FabricEnvironmentRegistry.instance().exists(gateway.environmentGroup);
                if (!envExists) {
                    delete gateway.environmentGroup;
                    await FabricGatewayRegistry.instance().update(gateway);
                }
            }
        }
        return gatewayRegistryEntries;
    }
}
