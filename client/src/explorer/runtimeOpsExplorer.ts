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
import { PeerTreeItem } from './runtimeOps/PeerTreeItem';
import { ChannelTreeItem } from './model/ChannelTreeItem';
import { BlockchainTreeItem } from './model/BlockchainTreeItem';
import { FabricRuntimeManager } from '../fabric/FabricRuntimeManager';
import { BlockchainExplorerProvider } from './BlockchainExplorerProvider';
import { RuntimeTreeItem } from './runtimeOps/RuntimeTreeItem';
import { FabricGatewayRegistryEntry } from '../fabric/FabricGatewayRegistryEntry';
import { FabricRuntime } from '../fabric/FabricRuntime';
import { InstantiatedChaincodeTreeItem } from './model/InstantiatedChaincodeTreeItem';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
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
import { ExtensionCommands } from '../../ExtensionCommands';
import { CertificateAuthorityTreeItem } from './runtimeOps/CertificateAuthorityTreeItem';
import { OrdererTreeItem } from './runtimeOps/OrdererTreeItem';
import { IFabricRuntimeConnection } from '../fabric/IFabricRuntimeConnection';
import { FabricWalletUtil } from '../fabric/FabricWalletUtil';
import { FabricNode } from '../fabric/FabricNode';

export class BlockchainRuntimeExplorerProvider implements BlockchainExplorerProvider {

    // only for testing so can get the updated tree
    public tree: Array<BlockchainTreeItem> = [];

    // tslint:disable-next-line member-ordering
    private _onDidChangeTreeData: vscode.EventEmitter<any | undefined> = new vscode.EventEmitter<any | undefined>();

    // tslint:disable-next-line member-ordering
    readonly onDidChangeTreeData: vscode.Event<any | undefined> = this._onDidChangeTreeData.event;

    constructor() {
        FabricRuntimeManager.instance().getRuntime().on('busy', () => {
            // tslint:disable-next-line: no-floating-promises
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
        const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();

        try {

            const isBusy: boolean = FabricRuntimeManager.instance().getRuntime().isBusy();
            const isRunning: boolean = await FabricRuntimeManager.instance().getRuntime().isRunning();
            if (isRunning) {
                await vscode.commands.executeCommand('setContext', 'blockchain-started', true);
            } else {
                await vscode.commands.executeCommand('setContext', 'blockchain-started', false);
            }

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
            }

            if (isRunning && !isBusy) {
                this.tree = await this.createConnectedTree();
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
        const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();

        const tree: BlockchainTreeItem[] = [];

        const runtime: FabricRuntime = FabricRuntimeManager.instance().getRuntime();

        try {
            const connection: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
            connection.name = runtime.getName();
            connection.managedRuntime = true;
            connection.associatedWallet = FabricWalletUtil.LOCAL_WALLET;

            const treeItem: RuntimeTreeItem = await RuntimeTreeItem.newRuntimeTreeItem(this,
                runtime.getName(),
                connection,
                vscode.TreeItemCollapsibleState.None,
                {
                    command: ExtensionCommands.START_FABRIC,
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

    private async createSmartContractsTree(): Promise<Array<BlockchainTreeItem>> {
        const tree: Array<BlockchainTreeItem> = [];

        tree.push(new InstalledTreeItem(this, vscode.TreeItemCollapsibleState.Expanded));

        tree.push(new InstantiatedTreeItem(this, vscode.TreeItemCollapsibleState.Expanded));

        return tree;
    }

    private async createChannelsTree(): Promise<Array<BlockchainTreeItem>> {
        const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
        const tree: Array<BlockchainTreeItem> = [];
        const connection: IFabricRuntimeConnection = await FabricRuntimeManager.instance().getConnection();

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
            const connection: IFabricRuntimeConnection = await FabricRuntimeManager.instance().getConnection();
            const peerNames: Array<string> = connection.getAllPeerNames();

            for (const peerName of peerNames) {
                const node: FabricNode = connection.getNode(peerName);
                const chaincodes: Map<string, Array<string>> = null;
                const peerTreeItem: PeerTreeItem = await PeerTreeItem.newPeerTreeItem(this, peerName, chaincodes, vscode.TreeItemCollapsibleState.None, node, true);
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
        const connection: IFabricRuntimeConnection = await FabricRuntimeManager.instance().getConnection();
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
            const connection: IFabricRuntimeConnection = await FabricRuntimeManager.instance().getConnection();
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
            const connection: IFabricRuntimeConnection = await FabricRuntimeManager.instance().getConnection();
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
