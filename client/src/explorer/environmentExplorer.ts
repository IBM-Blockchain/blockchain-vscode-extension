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
import { FabricRuntimeManager } from '../fabric/FabricRuntimeManager';
import { BlockchainExplorerProvider } from './BlockchainExplorerProvider';
import { RuntimeTreeItem } from './runtimeOps/disconnectedTree/RuntimeTreeItem';
import { FabricRuntime } from '../fabric/FabricRuntime';
import { InstantiatedChaincodeTreeItem } from './model/InstantiatedChaincodeTreeItem';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../logging/OutputAdapter';
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
import { IFabricEnvironmentConnection } from '../fabric/IFabricEnvironmentConnection';
import { FabricNode, FabricNodeType } from '../fabric/FabricNode';
import { FabricEnvironmentRegistryEntry } from '../fabric/FabricEnvironmentRegistryEntry';
import { FabricEnvironmentManager } from '../fabric/FabricEnvironmentManager';
import { FabricRuntimeUtil } from '../fabric/FabricRuntimeUtil';
import { FabricEnvironmentRegistry } from '../fabric/FabricEnvironmentRegistry';
import { FabricEnvironmentTreeItem } from './runtimeOps/disconnectedTree/FabricEnvironmentTreeItem';
import { SetupTreeItem } from './runtimeOps/identitySetupTree/SetupTreeItem';
import { FabricEnvironment } from '../fabric/FabricEnvironment';

export class BlockchainEnvironmentExplorerProvider implements BlockchainExplorerProvider {

    // only for testing so can get the updated tree
    public tree: Array<BlockchainTreeItem> = [];

    // tslint:disable-next-line member-ordering
    private _onDidChangeTreeData: vscode.EventEmitter<any | undefined> = new vscode.EventEmitter<any | undefined>();

    private fabricEnvironmentToSetUp: FabricEnvironmentTreeItem;

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
        if (element && element instanceof FabricEnvironmentTreeItem && !(element instanceof RuntimeTreeItem)) {
            this.fabricEnvironmentToSetUp = element;
            // need to do this or won't call get children
            element = undefined;
        }
        this._onDidChangeTreeData.fire(element);
    }

    async connect(): Promise<void> {
        // This controls which menu buttons appear
        await vscode.commands.executeCommand('setContext', 'blockchain-environment-connected', true);
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

            return this.tree;
        } else if (this.fabricEnvironmentToSetUp) {
            // need to do identity setup
            // set back to empty so next time won't go in here
            const tempTreeItem: FabricEnvironmentTreeItem = this.fabricEnvironmentToSetUp;
            this.fabricEnvironmentToSetUp = undefined;
            await vscode.commands.executeCommand('setContext', 'blockchain-environment-setup', true);
            this.tree = await this.setupIdentities(tempTreeItem as FabricEnvironmentTreeItem);
            return this.tree;
        } else if (FabricEnvironmentManager.instance().getConnection()) {
            const environmentRegistryEntry: FabricEnvironmentRegistryEntry = FabricEnvironmentManager.instance().getEnvironmentRegistryEntry();
            if (environmentRegistryEntry.name === FabricRuntimeUtil.LOCAL_FABRIC) {
                await vscode.commands.executeCommand('setContext', 'blockchain-runtime-connected', true);
            } else {
                await vscode.commands.executeCommand('setContext', 'blockchain-runtime-connected', false);
            }
            await vscode.commands.executeCommand('setContext', 'blockchain-environment-setup', false);
            this.tree = await this.createConnectedTree();
        } else {
            await vscode.commands.executeCommand('setContext', 'blockchain-environment-setup', false);
            await vscode.commands.executeCommand('setContext', 'blockchain-runtime-connected', false);
            this.tree = await this.createConnectionTree();
        }

        return this.tree;
    }

    private async setupIdentities(environmentTreeItem: FabricEnvironmentTreeItem): Promise<BlockchainTreeItem[]> {
        const tree: BlockchainTreeItem[] = [];

        const environment: FabricEnvironment = new FabricEnvironment(environmentTreeItem.label);

        const nodes: FabricNode[] = await environment.getNodes(true);

        if (nodes.length === 0) {
            await vscode.commands.executeCommand('setContext', 'blockchain-environment-setup', false);
            await vscode.commands.executeCommand(environmentTreeItem.command.command, ...environmentTreeItem.command.arguments);
            return tree;
        }

        tree.push(new SetupTreeItem(this, `Setting up: ${environmentTreeItem.label}`));
        tree.push(new SetupTreeItem(this, ('(Click each node to perform setup)')));

        for (const node of nodes) {
            const command: vscode.Command = {
                command: ExtensionCommands.ASSOCIATE_IDENTITY_NODE,
                title: '',
                arguments: [environmentTreeItem.environmentRegistryEntry, node]
            };

            if (node.type === FabricNodeType.PEER) {
                const peerTreeItem: PeerTreeItem = new PeerTreeItem(this, node.name, node, command);
                tree.push(peerTreeItem);
            }

            if (node.type === FabricNodeType.CERTIFICATE_AUTHORITY) {
                const certificateAuthorityTreeItem: CertificateAuthorityTreeItem = new CertificateAuthorityTreeItem(this, node.name, node, command);
                tree.push(certificateAuthorityTreeItem);
            }

            if (node.type === FabricNodeType.ORDERER) {
                const ordererTreeItem: OrdererTreeItem = new OrdererTreeItem(this, node.name, node, command);
                tree.push(ordererTreeItem);
            }
        }

        return tree;
    }

    private async createConnectionTree(): Promise<BlockchainTreeItem[]> {
        const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();

        const tree: BlockchainTreeItem[] = [];

        const runtime: FabricRuntime = FabricRuntimeManager.instance().getRuntime();

        try {
            const fabricEnvironmentRegistryEntry: FabricEnvironmentRegistryEntry = FabricRuntimeManager.instance().getEnvironmentRegistryEntry();

            const treeItem: RuntimeTreeItem = await RuntimeTreeItem.newRuntimeTreeItem(this,
                runtime.getName(),
                fabricEnvironmentRegistryEntry,
                {
                    command: ExtensionCommands.CONNECT_TO_ENVIRONMENT,
                    title: '',
                    arguments: [fabricEnvironmentRegistryEntry]
                }
            );
            tree.push(treeItem);

            const environmentEntries: FabricEnvironmentRegistryEntry[] = await FabricEnvironmentRegistry.instance().getAll();
            for (const environmentEntry of environmentEntries) {
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
        } catch (error) {
            outputAdapter.log(LogType.ERROR, `Error populating Fabric Environment Panel: ${error.message}`, `Error populating Fabric Environment Panel: ${error.toString()}`);
        }

        return tree;
    }

    private async createConnectedTree(): Promise<Array<BlockchainTreeItem>> {
        const tree: Array<BlockchainTreeItem> = [];

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
            const connection: IFabricEnvironmentConnection = await FabricEnvironmentManager.instance().getConnection();
            const peerNames: Array<string> = connection.getAllPeerNames();

            for (const peerName of peerNames) {
                const node: FabricNode = connection.getNode(peerName);
                const peerTreeItem: PeerTreeItem = new PeerTreeItem(this, peerName, node);
                tree.push(peerTreeItem);
            }

            // Push Certificate Authority tree item
            const certificateAuthorityNames: Array<string> = connection.getAllCertificateAuthorityNames();
            for (const certificateAuthorityName of certificateAuthorityNames) {
                const node: FabricNode = connection.getNode(certificateAuthorityName);
                const caTreeItem: CertificateAuthorityTreeItem = new CertificateAuthorityTreeItem(this, certificateAuthorityName, node);
                tree.push(caTreeItem);
            }

            const ordererNames: Array<string> = connection.getAllOrdererNames();
            for (const ordererName of ordererNames) {
                const node: FabricNode = connection.getNode(ordererName);
                tree.push(new OrdererTreeItem(this, ordererName, node));
            }

        } catch (error) {
            outputAdapter.log(LogType.ERROR, `Error populating nodes view: ${error.message}`, `Error populating nodes view: ${error.toString()}`);
            return tree;
        }
        return tree;

    }

    private async createOrganizationsTree(): Promise<Array<BlockchainTreeItem>> {
        const connection: IFabricEnvironmentConnection = await FabricEnvironmentManager.instance().getConnection();
        return connection.getAllOrganizationNames().map((organizationName: string) => new OrgTreeItem(this, organizationName));
    }

    private async createInstantiatedTree(): Promise<Array<BlockchainTreeItem>> {
        const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
        const tree: Array<BlockchainTreeItem> = [];

        const command: vscode.Command = {
            command: ExtensionCommands.INSTANTIATE_SMART_CONTRACT,
            title: '',
            arguments: []
        };

        try {
            const connection: IFabricEnvironmentConnection = await FabricEnvironmentManager.instance().getConnection();
            const channelMap: Map<string, Array<string>> = await connection.createChannelMap();
            for (const [channelName, peerNames] of channelMap) {
                const chaincodes: any[] = await connection.getInstantiatedChaincode(peerNames, channelName);
                const channelTreeItem: ChannelTreeItem = new ChannelTreeItem(this, channelName, peerNames, chaincodes, vscode.TreeItemCollapsibleState.None);
                for (const chaincode of chaincodes) {
                    // Doesn't matter if this is a chaincode or a contract as this is the ops view, and
                    // we shouldn't be exposing contracts or transaction functions in the ops view.
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
        const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
        const tree: Array<BlockchainTreeItem> = [];
        let command: vscode.Command;
        try {
            const connection: IFabricEnvironmentConnection = await FabricEnvironmentManager.instance().getConnection();
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
                command: ExtensionCommands.INSTALL_SMART_CONTRACT,
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
