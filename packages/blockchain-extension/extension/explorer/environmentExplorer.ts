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
import { BlockchainExplorerProvider } from './BlockchainExplorerProvider';
import { RuntimeTreeItem } from './runtimeOps/disconnectedTree/RuntimeTreeItem';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { NodesTreeItem } from './runtimeOps/connectedTree/NodesTreeItem';
import { OrganizationsTreeItem } from './runtimeOps/connectedTree/OrganizationsTreeItem';
import { OrgTreeItem } from './runtimeOps/connectedTree/OrgTreeItem';
import { ExtensionCommands } from '../../ExtensionCommands';
import { CertificateAuthorityTreeItem } from './runtimeOps/connectedTree/CertificateAuthorityTreeItem';
import { OrdererTreeItem } from './runtimeOps/connectedTree/OrdererTreeItem';
import { FabricEnvironmentManager, ConnectedState } from '../fabric/environments/FabricEnvironmentManager';
import { FabricEnvironmentRegistry, FabricEnvironmentRegistryEntry, FabricNode, FabricNodeType, FabricRuntimeUtil, IFabricEnvironmentConnection, LogType, FabricEnvironment, EnvironmentType, FabricCommittedSmartContract } from 'ibm-blockchain-platform-common';
import { FabricEnvironmentTreeItem } from './runtimeOps/disconnectedTree/FabricEnvironmentTreeItem';
import { SetupTreeItem } from './runtimeOps/identitySetupTree/SetupTreeItem';
import { EnvironmentConnectedTreeItem } from './runtimeOps/connectedTree/EnvironmentConnectedTreeItem';
import { TextTreeItem } from './model/TextTreeItem';
import { EnvironmentFactory } from '../fabric/environments/EnvironmentFactory';
import { EditFiltersTreeItem } from './runtimeOps/connectedTree/EditFiltersTreeItem';
import { LocalEnvironment } from '../fabric/environments/LocalEnvironment';
import { LocalEnvironmentManager } from '../fabric/environments/LocalEnvironmentManager';
import { ManagedAnsibleEnvironmentManager } from '../fabric/environments/ManagedAnsibleEnvironmentManager';
import { ManagedAnsibleEnvironment } from '../fabric/environments/ManagedAnsibleEnvironment';
import { CommittedContractTreeItem } from './runtimeOps/connectedTree/CommittedSmartContractTreeItem';
import { DeployTreeItem } from './runtimeOps/connectedTree/DeployTreeItem';

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
            if (element instanceof ChannelTreeItem) {
                this.tree = await this.createCommittedTree(element);
            }
            if (element instanceof NodesTreeItem) {
                this.tree = await this.createNodesTree();
            }
            if (element instanceof OrganizationsTreeItem) {
                this.tree = await this.createOrganizationsTree();
            }

        } else if (FabricEnvironmentManager.instance().getState() === ConnectedState.SETUP) {
            // need to do identity setup
            await vscode.commands.executeCommand('setContext', 'blockchain-environment-setup', true);
            const environmentRegistryEntry: FabricEnvironmentRegistryEntry = FabricEnvironmentManager.instance().getEnvironmentRegistryEntry();

            this.tree = await this.setupIdentities(environmentRegistryEntry);
        } else if (FabricEnvironmentManager.instance().getState() === ConnectedState.CONNECTING || FabricEnvironmentManager.instance().getState() === ConnectedState.CONNECTED) {
            const environmentRegistryEntry: FabricEnvironmentRegistryEntry = FabricEnvironmentManager.instance().getEnvironmentRegistryEntry();
            if (environmentRegistryEntry.managedRuntime) {
                await vscode.commands.executeCommand('setContext', 'blockchain-runtime-connected', true);
                await vscode.commands.executeCommand('setContext', 'blockchain-ansible-connected', true);
            } else if (environmentRegistryEntry.environmentType === EnvironmentType.ANSIBLE_ENVIRONMENT) {
                await vscode.commands.executeCommand('setContext', 'blockchain-runtime-connected', false);
                await vscode.commands.executeCommand('setContext', 'blockchain-ansible-connected', true);
            } else {
                if (environmentRegistryEntry.environmentType === EnvironmentType.OPS_TOOLS_ENVIRONMENT || environmentRegistryEntry.environmentType === EnvironmentType.SAAS_OPS_TOOLS_ENVIRONMENT) {
                    if (FabricEnvironmentManager.instance().getState() === ConnectedState.CONNECTED) {
                        await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);
                        if (FabricEnvironmentManager.instance().getState() !== ConnectedState.DISCONNECTED) {
                            // If the user did not hide all nodes and therefore we are still connecting, update the tree
                            this.tree = await this.createConnectedTree(environmentRegistryEntry);
                        } else {
                            this.tree = await this.createConnectionTree();
                        }
                        return this.tree;
                    }
                    await vscode.commands.executeCommand('setContext', 'blockchain-opstool-connected', true);
                }

                await vscode.commands.executeCommand('setContext', 'blockchain-runtime-connected', false);
                await vscode.commands.executeCommand('setContext', 'blockchain-ansible-connected', false);
            }
            await vscode.commands.executeCommand('setContext', 'blockchain-environment-connected', true);
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
            await vscode.commands.executeCommand('setContext', 'blockchain-ansible-connected', false);

            this.tree = await this.createConnectionTree();
        }

        return this.tree;
    }

    private async setupIdentities(environmentRegistryEntry: FabricEnvironmentRegistryEntry): Promise<BlockchainTreeItem[]> {
        const tree: BlockchainTreeItem[] = [];

        const environment: FabricEnvironment = EnvironmentFactory.getEnvironment(environmentRegistryEntry);

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
                const command: vscode.Command = {
                    command: ExtensionCommands.ADD_ENVIRONMENT,
                    title: '',
                    arguments: []
                };
                tree.push(new TextTreeItem(this, 'Click + to add environments', command));
            } else {
                for (const environmentEntry of environmentEntries) {
                    if (environmentEntry.managedRuntime) {

                        let runtime: LocalEnvironment | ManagedAnsibleEnvironment;
                        if (environmentEntry.environmentType === EnvironmentType.LOCAL_ENVIRONMENT) {
                            runtime = await LocalEnvironmentManager.instance().ensureRuntime(environmentEntry.name, undefined, environmentEntry.numberOfOrgs);
                        } else {
                            // Managed ansible
                            runtime = ManagedAnsibleEnvironmentManager.instance().ensureRuntime(environmentEntry.name, environmentEntry.environmentDirectory);
                        }

                        const treeItem: RuntimeTreeItem = await RuntimeTreeItem.newRuntimeTreeItem(this,
                            runtime.getName(),
                            environmentEntry,
                            {
                                command: ExtensionCommands.CONNECT_TO_ENVIRONMENT,
                                title: '',
                                arguments: [environmentEntry]
                            },
                            runtime
                        );

                        const isRunning: boolean = await runtime.isRunning();
                        if (isRunning) {
                            treeItem.contextValue = 'blockchain-runtime-item-running';
                        }

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

        const name: string = environmentRegistryEntry.name;

        tree.push(new EnvironmentConnectedTreeItem(this, `Connected to environment: ${name}`));

        const channels: BlockchainTreeItem[] = await this.createChannelsTree();

        tree.push(...channels);

        tree.push(new NodesTreeItem(this, vscode.TreeItemCollapsibleState.Collapsed));

        tree.push(new OrganizationsTreeItem(this, vscode.TreeItemCollapsibleState.Collapsed));

        return tree;
    }

    private async createChannelsTree(): Promise<Array<BlockchainTreeItem>> {
        const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
        const tree: Array<BlockchainTreeItem> = [];
        const connection: IFabricEnvironmentConnection = FabricEnvironmentManager.instance().getConnection();

        try {
            const channelMap: Map<string, Array<string>> = await connection.createChannelMap();
            const channels: Array<string> = Array.from(channelMap.keys());

            for (const channel of channels) {
                const peers: Array<string> = channelMap.get(channel);

                const smartContracts: FabricCommittedSmartContract[] = await connection.getCommittedSmartContracts(peers, channel);

                tree.push(new ChannelTreeItem(this, channel, peers, smartContracts, vscode.TreeItemCollapsibleState.Collapsed));
            }
        } catch (error) {
            outputAdapter.log(LogType.ERROR, `Error populating channel view: ${error.message}`, `Error populating channel view: ${error.toString()}`);
            return tree;
        }
        return tree;
    }

    private async createCommittedTree(element: ChannelTreeItem): Promise<BlockchainTreeItem[]> {
        const tree: Array<BlockchainTreeItem> = [];

        for (const smartContract of element.chaincodes) {
            tree.push(new CommittedContractTreeItem(this, `${smartContract.name}@${smartContract.version}`));
        }

        const fabricEnvironmentRegistryEntry: FabricEnvironmentRegistryEntry = FabricEnvironmentManager.instance().getEnvironmentRegistryEntry();

        const command: vscode.Command = {
            command: ExtensionCommands.OPEN_DEPLOY_PAGE,
            title: '',
            arguments: [fabricEnvironmentRegistryEntry, element.label]
        };

        tree.push(new DeployTreeItem(this, command));

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

                if (environmentEntry.environmentType === EnvironmentType.OPS_TOOLS_ENVIRONMENT || environmentEntry.environmentType === EnvironmentType.SAAS_OPS_TOOLS_ENVIRONMENT) {
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
        const connection: IFabricEnvironmentConnection = FabricEnvironmentManager.instance().getConnection();
        const orgNames: string[] = connection.getAllOrganizationNames();
        return orgNames.map((organizationName: string) => new OrgTreeItem(this, organizationName));
    }
}
