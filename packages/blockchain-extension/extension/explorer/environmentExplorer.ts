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
import { PeerTreeItem } from './runtimeOps/connectedTree/PeerTreeItem';
import { ChannelTreeItem } from './model/ChannelTreeItem';
import { BlockchainTreeItem } from './model/BlockchainTreeItem';
import { ImportNodesTreeItem } from './runtimeOps/connectedTree/ImportNodesTreeItem';
import { FabricRuntimeManager } from '../fabric/FabricRuntimeManager';
import { BlockchainExplorerProvider } from './BlockchainExplorerProvider';
import { RuntimeTreeItem } from './runtimeOps/disconnectedTree/RuntimeTreeItem';
import { FabricRuntime } from '../fabric/FabricRuntime';
import { InstantiatedChaincodeTreeItem } from './model/InstantiatedChaincodeTreeItem';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { SmartContractsTreeItem } from './runtimeOps/connectedTree/SmartContractsTreeItem';
import { ChannelsOpsTreeItem } from './runtimeOps/connectedTree/ChannelsOpsTreeItem';
import { NodesTreeItem } from './runtimeOps/connectedTree/NodesTreeItem';
import { OrganizationsTreeItem } from './runtimeOps/connectedTree/OrganizationsTreeItem';
import { InstalledTreeItem } from './runtimeOps/connectedTree/InstalledTreeItem';
import { InstantiatedTreeItem } from './runtimeOps/connectedTree/InstantiatedTreeItem';
import { InstalledChainCodeOpsTreeItem } from './runtimeOps/connectedTree/InstalledChainCodeOpsTreeItem';
import { InstantiateCommandTreeItem } from './runtimeOps/connectedTree/InstantiateCommandTreeItem';
import { InstallCommandTreeItem } from './runtimeOps/connectedTree/InstallCommandTreeItem';
import { OrgTreeItem } from './runtimeOps/connectedTree/OrgTreeItem';
import { ExtensionCommands } from '../../ExtensionCommands';
import { CertificateAuthorityTreeItem } from './runtimeOps/connectedTree/CertificateAuthorityTreeItem';
import { OrdererTreeItem } from './runtimeOps/connectedTree/OrdererTreeItem';
import { FabricEnvironmentManager, ConnectedState } from '../fabric/FabricEnvironmentManager';
import { FabricChaincode, FabricEnvironmentRegistry, FabricEnvironmentRegistryEntry, FabricNode, FabricNodeType, FabricRuntimeUtil, IFabricEnvironmentConnection, LogType } from 'ibm-blockchain-platform-common';
import { FabricEnvironmentTreeItem } from './runtimeOps/disconnectedTree/FabricEnvironmentTreeItem';
import { SetupTreeItem } from './runtimeOps/identitySetupTree/SetupTreeItem';
import { FabricEnvironment } from '../fabric/FabricEnvironment';
import { EnvironmentConnectedTreeItem } from './runtimeOps/connectedTree/EnvironmentConnectedTreeItem';
import { TextTreeItem } from './model/TextTreeItem';
import { EditFiltersTreeItem } from './runtimeOps/connectedTree/EditFiltersTreeItem';

export class BlockchainEnvironmentExplorerProvider implements BlockchainExplorerProvider {

    // only for testing so can get the updated tree
    public tree: Array<BlockchainTreeItem> = [];

    // tslint:disable-next-line member-ordering
    private _onDidChangeTreeData: vscode.EventEmitter<any | undefined> = new vscode.EventEmitter<any | undefined>();

    // tslint:disable-next-line member-ordering
    readonly onDidChangeTreeData: vscode.Event<any | undefined> = this._onDidChangeTreeData.event;

    constructor() {
        FabricEnvironmentManager.instance().on('connected', async () => {
            await this.connect();
        });

        FabricEnvironmentManager.instance().on('disconnected', async () => {
            await this.disconnect();
        });
    }

    async refresh(element?: BlockchainTreeItem): Promise<void> {
        this._onDidChangeTreeData.fire(element);
    }

    async connect(): Promise<void> {
        await this.refresh();
    }

    async disconnect(): Promise<void> {
        // This controls which menu buttons appear
        await vscode.commands.executeCommand('setContext', 'blockchain-environment-connected', false);
        await this.refresh();
    }

    getTreeItem(element: BlockchainTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: BlockchainTreeItem): Promise<BlockchainTreeItem[]> {
        if (element) {
            if (element instanceof SmartContractsTreeItem) {
                this.tree = await this.createSmartContractsTree();
            }
            if (element instanceof ChannelsOpsTreeItem) {
                this.tree = await this.createChannelsTree();
            }
            if (element instanceof NodesTreeItem) {
                this.tree = await this.createNodesTree();
            }
            if (element instanceof OrganizationsTreeItem) {
                this.tree = await this.createOrganizationsTree();
            }
            if (element instanceof InstantiatedTreeItem) {
                this.tree = await this.createInstantiatedTree();
            }
            if (element instanceof InstalledTreeItem) {
                this.tree = await this.createInstalledTree(element as InstalledTreeItem);
            }

        } else if (FabricEnvironmentManager.instance().getState() === ConnectedState.SETUP) {
            // need to do identity setup
            await vscode.commands.executeCommand('setContext', 'blockchain-environment-setup', true);
            const environmentRegistryEntry: FabricEnvironmentRegistryEntry = FabricEnvironmentManager.instance().getEnvironmentRegistryEntry();

            this.tree = await this.setupIdentities(environmentRegistryEntry);
        } else if (FabricEnvironmentManager.instance().getState() === ConnectedState.CONNECTING || FabricEnvironmentManager.instance().getState() === ConnectedState.CONNECTED) {
            const environmentRegistryEntry: FabricEnvironmentRegistryEntry = FabricEnvironmentManager.instance().getEnvironmentRegistryEntry();
            if (environmentRegistryEntry.name === FabricRuntimeUtil.LOCAL_FABRIC) {
                await vscode.commands.executeCommand('setContext', 'blockchain-environment-connected', true);
                await vscode.commands.executeCommand('setContext', 'blockchain-runtime-connected', true);
            } else {
                if (environmentRegistryEntry.url) {
                    if (FabricEnvironmentManager.instance().getState() === ConnectedState.CONNECTED) {
                        await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);
                        this.tree = await this.createConnectedTree(environmentRegistryEntry);
                        return this.tree;
                    }
                    await vscode.commands.executeCommand('setContext', 'blockchain-opstool-connected', true);
                }
                await vscode.commands.executeCommand('setContext', 'blockchain-environment-connected', true);
                await vscode.commands.executeCommand('setContext', 'blockchain-runtime-connected', false);
            }
            await vscode.commands.executeCommand('setContext', 'blockchain-environment-setup', false);

            this.tree = await this.createConnectedTree(environmentRegistryEntry);
            if (FabricEnvironmentManager.instance().getState() === ConnectedState.CONNECTING) {
                FabricEnvironmentManager.instance().setState(ConnectedState.CONNECTED);
            }
        } else {
            await vscode.commands.executeCommand('setContext', 'blockchain-opstool-connected', false);
            await vscode.commands.executeCommand('setContext', 'blockchain-environment-setup', false);
            await vscode.commands.executeCommand('setContext', 'blockchain-runtime-connected', false);
            await vscode.commands.executeCommand('setContext', 'blockchain-environment-connected', false);

            this.tree = await this.createConnectionTree();
        }

        return this.tree;
    }

    private async setupIdentities(environmentRegistryEntry: FabricEnvironmentRegistryEntry): Promise<BlockchainTreeItem[]> {
        const tree: BlockchainTreeItem[] = [];

        const environment: FabricEnvironment = new FabricEnvironment(environmentRegistryEntry.name);

        const nodes: FabricNode[] = await environment.getNodes(true);

        tree.push(new SetupTreeItem(this, `Setting up: ${environmentRegistryEntry.name}`));
        tree.push(new SetupTreeItem(this, ('(Click each node to perform setup)')));

        for (const node of nodes) {
            const command: vscode.Command = {
                command: ExtensionCommands.ASSOCIATE_IDENTITY_NODE,
                title: '',
                arguments: [environmentRegistryEntry, node]
            };

            if (node.type === FabricNodeType.PEER) {
                const peerTreeItem: PeerTreeItem = new PeerTreeItem(this, node.name, node.name, environmentRegistryEntry, node, command);
                tree.push(peerTreeItem);
            }

            if (node.type === FabricNodeType.CERTIFICATE_AUTHORITY) {
                const certificateAuthorityTreeItem: CertificateAuthorityTreeItem = new CertificateAuthorityTreeItem(this, node.name, node.name, environmentRegistryEntry, node, command);
                tree.push(certificateAuthorityTreeItem);
            }

            if (node.type === FabricNodeType.ORDERER) {
                if (node.cluster_name) {
                    const foundTreeItem: BlockchainTreeItem = tree.find((treeItem: OrdererTreeItem) => treeItem.node && treeItem.node.type === FabricNodeType.ORDERER && node.cluster_name === treeItem.node.cluster_name);
                    if (!foundTreeItem) {
                        tree.push(new OrdererTreeItem(this, node.cluster_name, node.cluster_name, environmentRegistryEntry, node, command));
                    }
                } else {
                    tree.push(new OrdererTreeItem(this, node.name, node.name, environmentRegistryEntry, node, command));
                }
            }
        }

        return tree;
    }

    private async createConnectionTree(): Promise<BlockchainTreeItem[]> {
        const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();

        const tree: BlockchainTreeItem[] = [];

        try {
            const environmentEntries: FabricEnvironmentRegistryEntry[] = await FabricEnvironmentRegistry.instance().getAll();

            if (environmentEntries.length === 0) {
                tree.push(new TextTreeItem(this, 'No environments found'));
            } else {
                for (const environmentEntry of environmentEntries) {
                    if (environmentEntry.name === FabricRuntimeUtil.LOCAL_FABRIC) {
                        const runtime: FabricRuntime = FabricRuntimeManager.instance().getRuntime();
                        const treeItem: RuntimeTreeItem = await RuntimeTreeItem.newRuntimeTreeItem(this,
                            runtime.getName(),
                            environmentEntry,
                            {
                                command: ExtensionCommands.CONNECT_TO_ENVIRONMENT,
                                title: '',
                                arguments: [environmentEntry]
                            }
                        );
                        tree.push(treeItem);

                    } else {
                        const environmentTreeItem: FabricEnvironmentTreeItem = new FabricEnvironmentTreeItem(this,
                            environmentEntry.name,
                            environmentEntry,
                            {
                                command: ExtensionCommands.CONNECT_TO_ENVIRONMENT,
                                title: '',
                                arguments: [environmentEntry]
                            }
                        );

                        tree.push(environmentTreeItem);
                    }
                }
            }

        } catch (error) {
            outputAdapter.log(LogType.ERROR, `Error populating Fabric Environment Panel: ${error.message}`, `Error populating Fabric Environment Panel: ${error.toString()}`);
        }

        return tree;
    }

    private async createConnectedTree(environmentRegistryEntry: FabricEnvironmentRegistryEntry): Promise<Array<BlockchainTreeItem>> {
        const tree: Array<BlockchainTreeItem> = [];

        let name: string;
        if (environmentRegistryEntry.name === FabricRuntimeUtil.LOCAL_FABRIC) {
            name = FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME;
        } else {
            name = environmentRegistryEntry.name;
        }

        tree.push(new EnvironmentConnectedTreeItem(this, `Connected to environment: ${name}`));

        tree.push(new SmartContractsTreeItem(this, vscode.TreeItemCollapsibleState.Expanded));

        tree.push(new ChannelsOpsTreeItem(this, vscode.TreeItemCollapsibleState.Collapsed));

        tree.push(new NodesTreeItem(this, vscode.TreeItemCollapsibleState.Collapsed));

        tree.push(new OrganizationsTreeItem(this, vscode.TreeItemCollapsibleState.Collapsed));

        return tree;
    }

    private async createSmartContractsTree(): Promise<Array<BlockchainTreeItem>> {
        const tree: Array<BlockchainTreeItem> = [];

        tree.push(new InstalledTreeItem(this, vscode.TreeItemCollapsibleState.Expanded));

        tree.push(new InstantiatedTreeItem(this, vscode.TreeItemCollapsibleState.Expanded));

        return tree;
    }

    private async createChannelsTree(): Promise<Array<BlockchainTreeItem>> {
        const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
        const tree: Array<BlockchainTreeItem> = [];
        const connection: IFabricEnvironmentConnection = await FabricEnvironmentManager.instance().getConnection();

        try {
            const channelMap: Map<string, Array<string>> = await connection.createChannelMap();
            const channels: Array<string> = Array.from(channelMap.keys());

            for (const channel of channels) {
                const peers: Array<string> = channelMap.get(channel);
                tree.push(new ChannelTreeItem(this, channel, peers, [], vscode.TreeItemCollapsibleState.None));
            }
        } catch (error) {
            outputAdapter.log(LogType.ERROR, `Error populating channel view: ${error.message}`, `Error populating channel view: ${error.toString()}`);
            return tree;
        }
        return tree;
    }

    private async createNodesTree(): Promise<Array<BlockchainTreeItem>> {
        const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
        const tree: Array<BlockchainTreeItem> = [];

        try {
            const connection: IFabricEnvironmentConnection = FabricEnvironmentManager.instance().getConnection();
            const environmentRegistryEntry: FabricEnvironmentRegistryEntry = FabricEnvironmentManager.instance().getEnvironmentRegistryEntry();
            const peerNames: Array<string> = connection.getAllPeerNames();

            for (const peerName of peerNames) {
                const node: FabricNode = connection.getNode(peerName);
                const tooltip: string = `Name: ${node.name}\nMSPID: ${node.msp_id}\nAssociated Identity:\n${node.identity}`;
                const peerTreeItem: PeerTreeItem = new PeerTreeItem(this, peerName, tooltip, environmentRegistryEntry, node);
                tree.push(peerTreeItem);
            }

            // Push Certificate Authority tree item
            const certificateAuthorityNames: Array<string> = connection.getAllCertificateAuthorityNames();
            for (const certificateAuthorityName of certificateAuthorityNames) {
                const node: FabricNode = connection.getNode(certificateAuthorityName);
                const tooltip: string = `Name: ${node.name}\nAssociated Identity:\n${node.identity}`;
                const caTreeItem: CertificateAuthorityTreeItem = new CertificateAuthorityTreeItem(this, certificateAuthorityName, tooltip, environmentRegistryEntry, node);
                tree.push(caTreeItem);
            }

            const ordererNames: Array<string> = connection.getAllOrdererNames();

            for (const ordererName of ordererNames) {
                const node: FabricNode = connection.getNode(ordererName);
                if (node.cluster_name) {
                    const foundTreeItem: BlockchainTreeItem = tree.find((treeItem: OrdererTreeItem) => node.type === FabricNodeType.ORDERER && node.cluster_name === treeItem.node.cluster_name);
                    if (!foundTreeItem) {
                        const tooltip: string = `Name: ${node.cluster_name}\nMSPID: ${node.msp_id}\nAssociated Identity:\n${node.identity}`;
                        tree.push(new OrdererTreeItem(this, node.cluster_name, tooltip, environmentRegistryEntry, node));
                    }
                } else {
                    const tooltip: string = `Name: ${node.name}\nMSPID: ${node.msp_id}\nAssociated Identity:\n${node.identity}`;
                    tree.push(new OrdererTreeItem(this, node.name, tooltip, environmentRegistryEntry, node));
                }
            }

            const environmentEntry: FabricEnvironmentRegistryEntry = FabricEnvironmentManager.instance().getEnvironmentRegistryEntry();

            if (environmentEntry.name !== FabricRuntimeUtil.LOCAL_FABRIC) {

                if (environmentEntry.url) {
                    tree.push(new EditFiltersTreeItem(this, {
                        command: ExtensionCommands.EDIT_NODE_FILTERS,
                        title: '',
                        arguments: [environmentEntry],
                    }));
                } else {
                    tree.push(new ImportNodesTreeItem(this, {
                        command: ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT,
                        title: '',
                        arguments: [environmentEntry]
                    }));
                }
            }

        } catch (error) {
            outputAdapter.log(LogType.ERROR, `Error populating nodes view: ${error.message}`, `Error populating nodes view: ${error.toString()}`);
            return tree;
        }
        return tree;

    }

    private async createOrganizationsTree(): Promise<Array<BlockchainTreeItem>> {
        const connection: IFabricEnvironmentConnection = await FabricEnvironmentManager.instance().getConnection();
        const orgNames: string[] = await connection.getAllOrganizationNames();
        return orgNames.map((organizationName: string) => new OrgTreeItem(this, organizationName));
    }

    private async createInstantiatedTree(): Promise<Array<BlockchainTreeItem>> {
        const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
        const tree: Array<BlockchainTreeItem> = [];
        const tempTree: InstantiatedChaincodeTreeItem[] = [];

        const command: vscode.Command = {
            command: ExtensionCommands.INSTANTIATE_SMART_CONTRACT,
            title: '',
            arguments: []
        };

        try {
            const connection: IFabricEnvironmentConnection = await FabricEnvironmentManager.instance().getConnection();
            const channelMap: Map<string, Array<string>> = await connection.createChannelMap();
            for (const [channelName, peerNames] of channelMap) {
                const chaincodes: FabricChaincode[] = await connection.getInstantiatedChaincode(peerNames, channelName);
                const channelTreeItem: ChannelTreeItem = new ChannelTreeItem(this, channelName, peerNames, chaincodes, vscode.TreeItemCollapsibleState.None);
                for (const chaincode of chaincodes) {
                    // Doesn't matter if this is a chaincode or a contract as this is the ops view, and
                    // we shouldn't be exposing contracts or transaction functions in the ops view.
                    const foundTreeItemNum: number = tempTree.findIndex((treeItem: InstantiatedChaincodeTreeItem) => {
                        return treeItem.name === chaincode.name && treeItem.version === chaincode.version;
                    });

                    if (foundTreeItemNum > -1) {
                        const tempTreeItem: InstantiatedChaincodeTreeItem = tempTree[foundTreeItemNum];
                        const channels: ChannelTreeItem[] = tempTreeItem.channels;
                        channels.push(channelTreeItem);
                        tempTree.splice(foundTreeItemNum, 1);

                        tempTree.push(new InstantiatedChaincodeTreeItem(this, chaincode.name, channels, chaincode.version, vscode.TreeItemCollapsibleState.None, null, false));
                    } else {
                        tempTree.push(new InstantiatedChaincodeTreeItem(this, chaincode.name, [channelTreeItem], chaincode.version, vscode.TreeItemCollapsibleState.None, null, false));
                    }
                }
            }
        } catch (error) {
            outputAdapter.log(LogType.ERROR, `Error populating instantiated smart contracts view: ${error.message}`, `Error populating instantiated smart contracts view: ${error.message}`);

        } finally {
            tree.push(...tempTree);
            tree.push(new InstantiateCommandTreeItem(this, command));
        }
        return tree;
    }

    private async createInstalledTree(installedTreeItem: InstalledTreeItem): Promise<Array<BlockchainTreeItem>> {
        const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
        const tree: Array<BlockchainTreeItem> = [];
        const tempTree: InstalledChainCodeOpsTreeItem[] = [];
        let command: vscode.Command;
        try {
            const connection: IFabricEnvironmentConnection = await FabricEnvironmentManager.instance().getConnection();
            const allPeerNames: Array<string> = connection.getAllPeerNames();
            for (const peer of allPeerNames) {
                const chaincodes: Map<string, Array<string>> = await connection.getInstalledChaincode(peer);
                chaincodes.forEach((versions: Array<string>, name: string) => {

                    for (const version of versions) {
                        const foundTreeItemNum: number = tempTree.findIndex((treeItem: InstalledChainCodeOpsTreeItem) => {
                            return treeItem.name === name && treeItem.version === version;
                        });

                        if (foundTreeItemNum > -1) {
                            const tempTreeItem: InstalledChainCodeOpsTreeItem = tempTree[foundTreeItemNum];
                            const peerNames: string[] = tempTreeItem.peerNames;
                            peerNames.push(peer);
                            tempTree.splice(foundTreeItemNum, 1);

                            tempTree.push(new InstalledChainCodeOpsTreeItem(this, name, version, peerNames));
                        } else {
                            tempTree.push(new InstalledChainCodeOpsTreeItem(this, name, version, [peer]));
                        }
                    }
                });
            }

            command = {
                command: ExtensionCommands.INSTALL_SMART_CONTRACT,
                title: '',
                arguments: [installedTreeItem]
            };

        } catch (error) {
            outputAdapter.log(LogType.ERROR, `Error populating installed smart contracts view: ${error.message}`, `Error populating installed smart contracts view: ${error.message}`);
        } finally {
            tree.push(...tempTree);
            tree.push(new InstallCommandTreeItem(this, command));
        }
        return tree;
    }
}
