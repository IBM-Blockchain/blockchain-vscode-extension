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
import * as myExtension from '../../src/extension';
import * as vscode from 'vscode';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';

import { FabricConnection } from '../../src/fabric/FabricConnection';
import { BlockchainTreeItem } from '../../src/explorer/model/BlockchainTreeItem';
import { BlockchainEnvironmentExplorerProvider } from '../../src/explorer/environmentExplorer';
import { ChannelTreeItem } from '../../src/explorer/model/ChannelTreeItem';
import { PeerTreeItem } from '../../src/explorer/runtimeOps/connectedTree/PeerTreeItem';
import { ExtensionUtil } from '../../src/util/ExtensionUtil';
import { TestUtil } from '../TestUtil';
import { RuntimeTreeItem } from '../../src/explorer/runtimeOps/disconnectedTree/RuntimeTreeItem';
import { FabricRuntimeManager } from '../../src/fabric/FabricRuntimeManager';
import { InstantiatedChaincodeTreeItem } from '../../src/explorer/model/InstantiatedChaincodeTreeItem';
import { VSCodeBlockchainOutputAdapter } from '../../src/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../../src/logging/OutputAdapter';
import { SmartContractsTreeItem } from '../../src/explorer/runtimeOps/connectedTree/SmartContractsTreeItem';
import { ChannelsOpsTreeItem } from '../../src/explorer/runtimeOps/connectedTree/ChannelsOpsTreeItem';
import { NodesTreeItem } from '../../src/explorer/runtimeOps/connectedTree/NodesTreeItem';
import { OrganizationsTreeItem } from '../../src/explorer/runtimeOps/connectedTree/OrganizationsTreeItem';
import { InstantiateCommandTreeItem } from '../../src/explorer/runtimeOps/connectedTree/InstantiateCommandTreeItem';
import { OrgTreeItem } from '../../src/explorer/runtimeOps/connectedTree/OrgTreeItem';
import { ExtensionCommands } from '../../ExtensionCommands';
import { MetadataUtil } from '../../src/util/MetadataUtil';
import { CertificateAuthorityTreeItem } from '../../src/explorer/runtimeOps/connectedTree/CertificateAuthorityTreeItem';
import { OrdererTreeItem } from '../../src/explorer/runtimeOps/connectedTree/OrdererTreeItem';
import { FabricEnvironmentConnection } from '../../src/fabric/FabricEnvironmentConnection';
import { FabricNode } from '../../src/fabric/FabricNode';
import { FabricEnvironmentManager } from '../../src/fabric/FabricEnvironmentManager';
import { FabricEnvironmentRegistryEntry } from '../../src/fabric/FabricEnvironmentRegistryEntry';
import { FabricRuntimeUtil } from '../../src/fabric/FabricRuntimeUtil';
import { FabricWalletUtil } from '../../src/fabric/FabricWalletUtil';
import { FabricEnvironmentRegistry } from '../../src/fabric/FabricEnvironmentRegistry';
import { FabricEnvironmentTreeItem } from '../../src/explorer/runtimeOps/disconnectedTree/FabricEnvironmentTreeItem';
import { FabricEnvironment } from '../../src/fabric/FabricEnvironment';
import { EnvironmentConnectedTreeItem } from '../../src/explorer/runtimeOps/connectedTree/EnvironmentConnectedTreeItem';

chai.use(sinonChai);
const should: Chai.Should = chai.should();

// tslint:disable no-unused-expression
describe('environmentExplorer', () => {
    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();
    before(async () => {
        await TestUtil.storeGatewaysConfig();
        await TestUtil.storeRuntimesConfig();
        await TestUtil.setupTests(mySandBox);
    });

    after(async () => {
        await TestUtil.restoreGatewaysConfig();
        await TestUtil.restoreRuntimesConfig();
    });

    describe('getChildren', () => {
        describe('unconnected tree', () => {
            let executeCommandSpy: sinon.SinonSpy;
            let logSpy: sinon.SinonSpy;

            beforeEach(async () => {
                mySandBox.stub(FabricEnvironmentManager.instance(), 'getConnection').returns(undefined);

                logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');

                await ExtensionUtil.activateExtension();

                executeCommandSpy = mySandBox.spy(vscode.commands, 'executeCommand');
            });

            afterEach(() => {
                mySandBox.restore();
            });

            it('should display all environments', async () => {
                const registryEntryOne: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
                registryEntryOne.name = 'myFabric';
                registryEntryOne.managedRuntime = false;

                const registryEntryTwo: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
                registryEntryTwo.name = 'myFabric2';
                registryEntryTwo.managedRuntime = false;

                mySandBox.stub(FabricEnvironmentRegistry.instance(), 'getAll').returns([registryEntryOne, registryEntryTwo]);
                const blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider = myExtension.getBlockchainEnvironmentExplorerProvider();
                const allChildren: BlockchainTreeItem[] = await blockchainRuntimeExplorerProvider.getChildren();

                allChildren.length.should.equal(3);
                allChildren[0].label.should.equal('Local Fabric  ○ (click to start)');
                allChildren[0].tooltip.should.equal('Creates a local development runtime using Hyperledger Fabric Docker images');
                allChildren[1].label.should.equal('myFabric');
                allChildren[1].tooltip.should.equal('myFabric');
                allChildren[2].label.should.equal('myFabric2');
                allChildren[2].tooltip.should.equal('myFabric2');

                executeCommandSpy.should.have.been.calledWith('setContext', 'blockchain-runtime-connected', false);
                executeCommandSpy.should.have.been.calledWith('setContext', 'blockchain-local-runtime-connected', false);
            });

            it('should handle errors populating the tree with runtimeTreeItems', async () => {
                const error: Error = new Error('some error');
                mySandBox.stub(RuntimeTreeItem, 'newRuntimeTreeItem').rejects(error);

                const blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider = myExtension.getBlockchainEnvironmentExplorerProvider();
                await blockchainRuntimeExplorerProvider.getChildren();

                logSpy.should.have.been.calledWith(LogType.ERROR, `Error populating Fabric Environment Panel: ${error.message}`, `Error populating Fabric Environment Panel: ${error.toString()}`);
            });

        });

        describe('connecting tree', () => {

            let getConnectionStub: sinon.SinonStub;
            let environmentRegistryStub: sinon.SinonStub;
            let fabricConnection: sinon.SinonStubbedInstance<FabricEnvironmentConnection>;
            let logSpy: sinon.SinonSpy;
            let commandStub: sinon.SinonStub;

            beforeEach(async () => {
                getConnectionStub = mySandBox.stub(FabricEnvironmentManager.instance(), 'getConnection');
                fabricConnection = sinon.createStubInstance(FabricEnvironmentConnection);
                getConnectionStub.returns((fabricConnection as any) as FabricEnvironmentConnection);

                const environmentRegistry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
                environmentRegistry.name = FabricRuntimeUtil.LOCAL_FABRIC;
                environmentRegistry.managedRuntime = true;
                environmentRegistry.associatedWallet = FabricWalletUtil.LOCAL_WALLET;

                environmentRegistryStub = mySandBox.stub(FabricEnvironmentManager.instance(), 'getEnvironmentRegistryEntry');
                environmentRegistryStub.returns(environmentRegistry);

                logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');

                commandStub = mySandBox.stub(vscode.commands, 'executeCommand');

                await ExtensionUtil.activateExtension();
            });

            afterEach(() => {
                mySandBox.restore();
            });

            it('should display setup tree if not setup', async () => {

                const peerNode: FabricNode = FabricNode.newPeer('peer1', 'peer1.org1.example.com', 'http://peer.sample.org', undefined, undefined, undefined);
                const ordererNode: FabricNode = FabricNode.newOrderer('orderer', 'orderer.example.com', 'http://orderer.sample.org', undefined, undefined, undefined, undefined);
                const caNode: FabricNode = FabricNode.newCertificateAuthority('ca1', 'ca1.org1.example.com', 'http://ca.sample.org', undefined, undefined, undefined, undefined, undefined, undefined);

                mySandBox.stub(FabricEnvironment.prototype, 'getNodes').resolves([peerNode, ordererNode, caNode]);

                const environmentRegistry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
                environmentRegistry.name = 'myEnvironment';
                environmentRegistry.managedRuntime = false;

                const command: vscode.Command = {
                    command: ExtensionCommands.CONNECT_TO_ENVIRONMENT,
                    title: '',
                    arguments: []
                };

                const blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider = myExtension.getBlockchainEnvironmentExplorerProvider();
                const environmentTreeItem: FabricEnvironmentTreeItem = new FabricEnvironmentTreeItem(blockchainRuntimeExplorerProvider, environmentRegistry.name, environmentRegistry, command);

                blockchainRuntimeExplorerProvider['fabricEnvironmentToSetUp'] = environmentTreeItem;

                const children: BlockchainTreeItem[] = await blockchainRuntimeExplorerProvider.getChildren();

                commandStub.should.have.been.calledWith('setContext', 'blockchain-environment-setup', true);
                should.not.exist(blockchainRuntimeExplorerProvider['fabricEnvironmentToSetUp']);

                children.length.should.equal(5);
                children[0].label.should.equal(`Setting up: ${environmentRegistry.name}`);
                children[1].label.should.equal(`(Click each node to perform setup)`);
                children[2].label.should.equal('peer1.org1.example.com   ⚠');
                children[2].command.command.should.equal(ExtensionCommands.ASSOCIATE_IDENTITY_NODE);
                children[2].command.arguments.should.deep.equal([environmentRegistry, peerNode]);
                children[3].label.should.equal('orderer.example.com   ⚠');
                children[3].command.command.should.equal(ExtensionCommands.ASSOCIATE_IDENTITY_NODE);
                children[3].command.arguments.should.deep.equal([environmentRegistry, ordererNode]);
                children[4].label.should.equal('ca1.org1.example.com   ⚠');
                children[4].command.command.should.equal(ExtensionCommands.ASSOCIATE_IDENTITY_NODE);
                children[4].command.arguments.should.deep.equal([environmentRegistry, caNode]);
            });

            it('should display setup tree if not setup with orderer cluster name', async () => {

                const peerNode: FabricNode = FabricNode.newPeer('peer1', 'peer1.org1.example.com', 'http://peer.sample.org', undefined, undefined, undefined);
                const ordererNode: FabricNode = FabricNode.newOrderer('orderer', 'orderer.example.com', 'http://orderer.sample.org', undefined, undefined, undefined, 'Ordering Service');
                const ordererNode1: FabricNode = FabricNode.newOrderer('orderer1', 'orderer1.example.com', 'http://orderer.sample.org', undefined, undefined, undefined, 'Ordering Service');

                const caNode: FabricNode = FabricNode.newCertificateAuthority('ca1', 'ca1.org1.example.com', 'http://ca.sample.org', undefined, undefined, undefined, undefined, undefined, undefined);

                mySandBox.stub(FabricEnvironment.prototype, 'getNodes').resolves([peerNode, ordererNode, ordererNode1, caNode]);

                const environmentRegistry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
                environmentRegistry.name = 'myEnvironment';
                environmentRegistry.managedRuntime = false;

                const command: vscode.Command = {
                    command: ExtensionCommands.CONNECT_TO_ENVIRONMENT,
                    title: '',
                    arguments: []
                };

                const blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider = myExtension.getBlockchainEnvironmentExplorerProvider();
                const environmentTreeItem: FabricEnvironmentTreeItem = new FabricEnvironmentTreeItem(blockchainRuntimeExplorerProvider, environmentRegistry.name, environmentRegistry, command);

                blockchainRuntimeExplorerProvider['fabricEnvironmentToSetUp'] = environmentTreeItem;

                const children: BlockchainTreeItem[] = await blockchainRuntimeExplorerProvider.getChildren();

                commandStub.should.have.been.calledWith('setContext', 'blockchain-environment-setup', true);
                should.not.exist(blockchainRuntimeExplorerProvider['fabricEnvironmentToSetUp']);

                children.length.should.equal(5);
                children[0].label.should.equal(`Setting up: ${environmentRegistry.name}`);
                children[1].label.should.equal(`(Click each node to perform setup)`);
                children[2].label.should.equal('peer1.org1.example.com   ⚠');
                children[2].command.command.should.equal(ExtensionCommands.ASSOCIATE_IDENTITY_NODE);
                children[2].command.arguments.should.deep.equal([environmentRegistry, peerNode]);
                children[3].label.should.equal('Ordering Service   ⚠');
                children[3].command.command.should.equal(ExtensionCommands.ASSOCIATE_IDENTITY_NODE);
                children[3].command.arguments.should.deep.equal([environmentRegistry, ordererNode]);
                children[4].label.should.equal('ca1.org1.example.com   ⚠');
                children[4].command.command.should.equal(ExtensionCommands.ASSOCIATE_IDENTITY_NODE);
                children[4].command.arguments.should.deep.equal([environmentRegistry, caNode]);
            });

            it('should display setup tree with multiple ordering services', async () => {

                const peerNode: FabricNode = FabricNode.newPeer('peer1', 'peer1.org1.example.com', 'http://peer.sample.org', undefined, undefined, undefined);
                const ordererNode: FabricNode = FabricNode.newOrderer('orderer', 'orderer.example.com', 'http://orderer.sample.org', undefined, undefined, undefined, 'Ordering Service');
                const ordererNode1: FabricNode = FabricNode.newOrderer('orderer1', 'orderer1.example.com', 'http://orderer.sample.org', undefined, undefined, undefined, 'Ordering Service');
                const ordererNode2: FabricNode = FabricNode.newOrderer('orderer2', 'orderer2.example.com', 'http://orderer.sample.org', undefined, undefined, undefined, 'Another Ordering Service');
                const ordererNode3: FabricNode = FabricNode.newOrderer('orderer3', 'orderer3.example.com', 'http://orderer.sample.org', undefined, undefined, undefined, 'Another Ordering Service');

                const caNode: FabricNode = FabricNode.newCertificateAuthority('ca1', 'ca1.org1.example.com', 'http://ca.sample.org', undefined, undefined, undefined, undefined, undefined, undefined);

                mySandBox.stub(FabricEnvironment.prototype, 'getNodes').resolves([peerNode, ordererNode, ordererNode1, ordererNode2, ordererNode3, caNode]);

                const environmentRegistry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
                environmentRegistry.name = 'myEnvironment';
                environmentRegistry.managedRuntime = false;

                const command: vscode.Command = {
                    command: ExtensionCommands.CONNECT_TO_ENVIRONMENT,
                    title: '',
                    arguments: []
                };

                const blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider = myExtension.getBlockchainEnvironmentExplorerProvider();
                const environmentTreeItem: FabricEnvironmentTreeItem = new FabricEnvironmentTreeItem(blockchainRuntimeExplorerProvider, environmentRegistry.name, environmentRegistry, command);

                blockchainRuntimeExplorerProvider['fabricEnvironmentToSetUp'] = environmentTreeItem;

                const children: BlockchainTreeItem[] = await blockchainRuntimeExplorerProvider.getChildren();

                commandStub.should.have.been.calledWith('setContext', 'blockchain-environment-setup', true);
                should.not.exist(blockchainRuntimeExplorerProvider['fabricEnvironmentToSetUp']);

                children.length.should.equal(6);
                children[0].label.should.equal(`Setting up: ${environmentRegistry.name}`);
                children[1].label.should.equal(`(Click each node to perform setup)`);
                children[2].label.should.equal('peer1.org1.example.com   ⚠');
                children[2].command.command.should.equal(ExtensionCommands.ASSOCIATE_IDENTITY_NODE);
                children[2].command.arguments.should.deep.equal([environmentRegistry, peerNode]);
                children[3].label.should.equal('Ordering Service   ⚠');
                children[3].command.command.should.equal(ExtensionCommands.ASSOCIATE_IDENTITY_NODE);
                children[3].command.arguments.should.deep.equal([environmentRegistry, ordererNode]);
                children[4].label.should.equal('Another Ordering Service   ⚠');
                children[4].command.command.should.equal(ExtensionCommands.ASSOCIATE_IDENTITY_NODE);
                children[4].command.arguments.should.deep.equal([environmentRegistry, ordererNode2]);
                children[5].label.should.equal('ca1.org1.example.com   ⚠');
                children[5].command.command.should.equal(ExtensionCommands.ASSOCIATE_IDENTITY_NODE);
                children[5].command.arguments.should.deep.equal([environmentRegistry, caNode]);
            });

            it('should connect if all setup', async () => {
                mySandBox.stub(FabricEnvironment.prototype, 'getNodes').resolves([]);

                const environmentRegistry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
                environmentRegistry.name = 'myEnvironment';
                environmentRegistry.managedRuntime = false;

                const command: vscode.Command = {
                    command: ExtensionCommands.CONNECT_TO_ENVIRONMENT,
                    title: '',
                    arguments: []
                };

                const blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider = myExtension.getBlockchainEnvironmentExplorerProvider();
                const environmentTreeItem: FabricEnvironmentTreeItem = new FabricEnvironmentTreeItem(blockchainRuntimeExplorerProvider, environmentRegistry.name, environmentRegistry, command);

                blockchainRuntimeExplorerProvider['fabricEnvironmentToSetUp'] = environmentTreeItem;

                const children: BlockchainTreeItem[] = await blockchainRuntimeExplorerProvider.getChildren();

                commandStub.should.have.been.calledWith('setContext', 'blockchain-environment-setup', false);
                should.not.exist(blockchainRuntimeExplorerProvider['fabricEnvironmentToSetUp']);

                children.length.should.equal(0);
                commandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT);
            });

            it('should error if gRPC cant connect to Fabric', async () => {
                fabricConnection.getAllPeerNames.returns(['peerOne']);
                fabricConnection.createChannelMap.throws(new Error('Cannot connect to Fabric: Received http2 header with status: 503'));
                const blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider = myExtension.getBlockchainEnvironmentExplorerProvider();
                const allChildren: BlockchainTreeItem[] = await blockchainRuntimeExplorerProvider.getChildren();
                const smartcontractsChildren: BlockchainTreeItem[] = await blockchainRuntimeExplorerProvider.getChildren(allChildren[1]);
                await blockchainRuntimeExplorerProvider.getChildren(smartcontractsChildren[1]);

                logSpy.should.have.been.calledOnceWith(LogType.ERROR, 'Error populating instantiated smart contracts view: Cannot connect to Fabric: Received http2 header with status: 503', 'Error populating instantiated smart contracts view: Cannot connect to Fabric: Received http2 header with status: 503');
            });

            it('should error if getAllChannelsForPeer errors with message when populating channels view', async () => {
                fabricConnection.getAllPeerNames.returns(['peerOne']);
                fabricConnection.createChannelMap.throws(new Error('Error creating channel map: some error'));

                const blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider = myExtension.getBlockchainEnvironmentExplorerProvider();
                const allChildren: BlockchainTreeItem[] = await blockchainRuntimeExplorerProvider.getChildren();
                await blockchainRuntimeExplorerProvider.getChildren(allChildren[2]);

                logSpy.should.have.been.calledOnceWith(LogType.ERROR, 'Error populating channel view: Error creating channel map: some error', 'Error populating channel view: Error: Error creating channel map: some error');
            });

            it('should error if populating nodes view fails', async () => {
                fabricConnection.getAllPeerNames.throws({ message: 'some error' });

                const blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider = myExtension.getBlockchainEnvironmentExplorerProvider();
                const allChildren: BlockchainTreeItem[] = await blockchainRuntimeExplorerProvider.getChildren();
                await blockchainRuntimeExplorerProvider.getChildren(allChildren[3]);

                logSpy.should.have.been.calledOnceWith(LogType.ERROR, 'Error populating nodes view: some error');
            });
        });

        describe('connected tree', () => {

            let allChildren: Array<BlockchainTreeItem>;
            let blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider;
            let fabricConnection: sinon.SinonStubbedInstance<FabricEnvironmentConnection>;
            let logSpy: sinon.SinonSpy;
            let executeCommandSpy: sinon.SinonSpy;
            let environmentStub: sinon.SinonStub;

            beforeEach(async () => {

                logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');

                await ExtensionUtil.activateExtension();

                executeCommandSpy = mySandBox.spy(vscode.commands, 'executeCommand');

                fabricConnection = sinon.createStubInstance(FabricEnvironmentConnection);

                fabricConnection.getAllPeerNames.returns(['peerOne', 'peerTwo']);

                const installedChaincodeMapOne: Map<string, Array<string>> = new Map<string, Array<string>>();
                installedChaincodeMapOne.set('sample-car-network', ['1.0', '1.2']);
                installedChaincodeMapOne.set('sample-food-network', ['0.6']);

                fabricConnection.getInstalledChaincode.withArgs('peerOne').returns(installedChaincodeMapOne);

                const installedChaincodeMapTwo: Map<string, Array<string>> = new Map<string, Array<string>>();
                installedChaincodeMapTwo.set('biscuit-network', ['0.7']);
                fabricConnection.getInstalledChaincode.withArgs('peerTwo').returns(installedChaincodeMapTwo);

                fabricConnection.getInstantiatedChaincode.withArgs(['peerOne'], 'channelOne').resolves([{
                    name: 'biscuit-network',
                    version: '0.7'
                }]);
                fabricConnection.getInstantiatedChaincode.withArgs(['peerOne', 'peerTwo'], 'channelTwo').resolves([{
                    name: 'cake-network',
                    version: '0.10'
                }, {
                    name: 'legacy-network',
                    version: '2.34'
                }]);

                fabricConnection.getAllOrganizationNames.returns(['Org1', 'Org2']);

                fabricConnection.getAllOrdererNames.returns(['orderer1', 'orderer2']);

                const map: Map<string, Array<string>> = new Map<string, Array<string>>();
                map.set('channelOne', ['peerOne']);
                map.set('channelTwo', ['peerOne', 'peerTwo']);
                fabricConnection.createChannelMap.resolves(map);

                const environmentRegistry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
                environmentRegistry.name = FabricRuntimeUtil.LOCAL_FABRIC;
                environmentRegistry.managedRuntime = true;
                environmentRegistry.associatedWallet = FabricWalletUtil.LOCAL_WALLET;

                environmentStub = mySandBox.stub(FabricEnvironmentManager.instance(), 'getEnvironmentRegistryEntry').returns(environmentRegistry);

                blockchainRuntimeExplorerProvider = myExtension.getBlockchainEnvironmentExplorerProvider();
                const fabricRuntimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
                mySandBox.stub(FabricEnvironmentManager.instance(), 'getConnection').returns((fabricConnection as any) as FabricConnection);
                mySandBox.stub(fabricRuntimeManager.getRuntime(), 'isRunning').resolves(true);
                allChildren = await blockchainRuntimeExplorerProvider.getChildren();

                const getTransactionNamesStub: sinon.SinonStub = mySandBox.stub(MetadataUtil, 'getTransactionNames');
                getTransactionNamesStub.withArgs(sinon.match.any, 'biscuit-network', sinon.match.any).resolves(new Map<string, string[]>());
                getTransactionNamesStub.withArgs(sinon.match.any, 'cake-network', sinon.match.any).resolves(new Map<string, string[]>());
                getTransactionNamesStub.withArgs(sinon.match.any, 'legacy-network', sinon.match.any).resolves(null);
            });

            afterEach(() => {
                mySandBox.restore();
            });

            it('should create a connected tree if there is a connection', async () => {

                allChildren.length.should.equal(5);

                const connectedTo: EnvironmentConnectedTreeItem = allChildren[0] as EnvironmentConnectedTreeItem;
                connectedTo.label.should.equal(`Connected to environment: ${FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME}`);

                const smartContracts: SmartContractsTreeItem = allChildren[1] as SmartContractsTreeItem;
                smartContracts.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Expanded);
                smartContracts.contextValue.should.equal('blockchain-runtime-smart-contracts-item');
                smartContracts.label.should.equal('Smart Contracts');

                const channels: ChannelsOpsTreeItem = allChildren[2] as ChannelsOpsTreeItem;
                channels.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                channels.contextValue.should.equal('blockchain-runtime-channels-item');
                channels.label.should.equal('Channels');

                const nodes: NodesTreeItem = allChildren[3] as NodesTreeItem;
                nodes.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                nodes.contextValue.should.equal('blockchain-runtime-nodes-item');
                nodes.label.should.equal('Nodes');

                const orgs: OrganizationsTreeItem = allChildren[4] as OrganizationsTreeItem;
                orgs.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                orgs.contextValue.should.equal('blockchain-runtime-organizations-item');
                orgs.label.should.equal('Organizations');

                executeCommandSpy.should.have.been.calledWith('setContext', 'blockchain-runtime-connected', true);
                executeCommandSpy.should.have.been.calledWith('setContext', 'blockchain-local-runtime-connected', true);
            });

            it('should set correct context if not local runtime', async () => {
                const otherEnvironmentRegistry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
                otherEnvironmentRegistry.name = 'myFabric';
                otherEnvironmentRegistry.managedRuntime = false;

                environmentStub.returns(otherEnvironmentRegistry);

                allChildren = await blockchainRuntimeExplorerProvider.getChildren();

                const connectedTo: EnvironmentConnectedTreeItem = allChildren[0] as EnvironmentConnectedTreeItem;
                connectedTo.label.should.equal(`Connected to environment: myFabric`);

                executeCommandSpy.should.have.been.calledWith('setContext', 'blockchain-runtime-connected', true);
                executeCommandSpy.should.have.been.calledWith('setContext', 'blockchain-local-runtime-connected', false);
            });

            it('should create channels children correctly', async () => {

                allChildren.length.should.equal(5);
                const channels: ChannelsOpsTreeItem = allChildren[2] as ChannelsOpsTreeItem;
                const channelsArray: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(channels);
                channelsArray.length.should.equal(2);

                const channelOne: ChannelTreeItem = channelsArray[0] as ChannelTreeItem;
                channelOne.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                channelOne.contextValue.should.equal('blockchain-channel-item');
                channelOne.label.should.equal('channelOne');

                const channelTwo: ChannelTreeItem = channelsArray[1] as ChannelTreeItem;
                channelTwo.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                channelTwo.contextValue.should.equal('blockchain-channel-item');
                channelTwo.label.should.equal('channelTwo');
            });

            it('should show peers, certificate authorities, and orderer nodes correctly', async () => {
                fabricConnection.getAllCertificateAuthorityNames.returns(['ca-name']);
                fabricConnection.getNode.withArgs('peerOne').returns(FabricNode.newPeer('peerOne', 'peerOne', 'grpc://localhost:7051', 'wallet', 'identity', 'Org1MSP'));
                fabricConnection.getNode.withArgs('peerTwo').returns(FabricNode.newPeer('peerTwo', 'peerTwo', 'grpc://localhost:8051', 'wallet', 'identity', 'Org1MSP'));
                fabricConnection.getNode.withArgs('ca-name').returns(FabricNode.newCertificateAuthority('ca-name', 'ca-name', 'http://localhost:7054', 'ca_name', 'wallet', 'identity', 'Org1MSP', 'admin', 'adminpw'));
                fabricConnection.getNode.withArgs('orderer1').returns(FabricNode.newOrderer('orderer1', 'orderer1', 'grpc://localhost:7050', 'wallet', 'identity', 'Org1MSP', undefined));
                fabricConnection.getNode.withArgs('orderer2').returns(FabricNode.newOrderer('orderer2', 'orderer2', 'grpc://localhost:7050', 'wallet', 'identity', 'Org1MSP', undefined));

                allChildren = await blockchainRuntimeExplorerProvider.getChildren();
                allChildren.length.should.equal(5);

                const items: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(allChildren[3]);
                items.length.should.equal(5);
                const peerOne: PeerTreeItem = items[0] as PeerTreeItem;
                peerOne.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                peerOne.contextValue.should.equal('blockchain-peer-item');
                peerOne.label.should.equal('peerOne');
                peerOne.node.api_url.should.equal('grpc://localhost:7051');

                const peerTwo: PeerTreeItem = items[1] as PeerTreeItem;
                peerTwo.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                peerTwo.contextValue.should.equal('blockchain-peer-item');
                peerTwo.label.should.equal('peerTwo');
                peerTwo.node.api_url.should.equal('grpc://localhost:8051');

                const ca: CertificateAuthorityTreeItem = items[2] as CertificateAuthorityTreeItem;
                ca.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                ca.contextValue.should.equal('blockchain-runtime-certificate-authority-item');
                ca.label.should.equal('ca-name');
                ca.node.api_url.should.equal('http://localhost:7054');

                const orderer: OrdererTreeItem = items[3] as OrdererTreeItem;
                orderer.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                orderer.contextValue.should.equal('blockchain-runtime-orderer-item');
                orderer.label.should.equal('orderer1');
                orderer.node.api_url.should.equal('grpc://localhost:7050');

                const orderer2: OrdererTreeItem = items[4] as OrdererTreeItem;
                orderer2.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                orderer2.contextValue.should.equal('blockchain-runtime-orderer-item');
                orderer2.label.should.equal('orderer2');
                orderer2.node.api_url.should.equal('grpc://localhost:7050');

                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should show peers, certificate authorities, and orderer nodes correctly with cluster name', async () => {
                fabricConnection.getAllCertificateAuthorityNames.returns(['ca-name']);
                fabricConnection.getNode.withArgs('peerOne').returns(FabricNode.newPeer('peerOne', 'peerOne', 'grpc://localhost:7051', 'wallet', 'identity', 'Org1MSP'));
                fabricConnection.getNode.withArgs('peerTwo').returns(FabricNode.newPeer('peerTwo', 'peerTwo', 'grpc://localhost:8051', 'wallet', 'identity', 'Org1MSP'));
                fabricConnection.getNode.withArgs('ca-name').returns(FabricNode.newCertificateAuthority('ca-name', 'ca-name', 'http://localhost:7054', 'ca_name', 'wallet', 'identity', 'Org1MSP', 'admin', 'adminpw'));
                fabricConnection.getNode.withArgs('orderer1').returns(FabricNode.newOrderer('orderer1', 'orderer1', 'grpc://localhost:7050', 'wallet', 'identity', 'Org1MSP', 'my ordering service'));
                fabricConnection.getNode.withArgs('orderer2').returns(FabricNode.newOrderer('orderer2', 'orderer2', 'grpc://localhost:7050', 'wallet', 'identity', 'Org1MSP', 'my ordering service'));

                allChildren = await blockchainRuntimeExplorerProvider.getChildren();
                allChildren.length.should.equal(5);

                const items: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(allChildren[3]);
                items.length.should.equal(4);
                const peerOne: PeerTreeItem = items[0] as PeerTreeItem;
                peerOne.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                peerOne.contextValue.should.equal('blockchain-peer-item');
                peerOne.label.should.equal('peerOne');
                peerOne.node.api_url.should.equal('grpc://localhost:7051');

                const peerTwo: PeerTreeItem = items[1] as PeerTreeItem;
                peerTwo.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                peerTwo.contextValue.should.equal('blockchain-peer-item');
                peerTwo.label.should.equal('peerTwo');
                peerTwo.node.api_url.should.equal('grpc://localhost:8051');

                const ca: CertificateAuthorityTreeItem = items[2] as CertificateAuthorityTreeItem;
                ca.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                ca.contextValue.should.equal('blockchain-runtime-certificate-authority-item');
                ca.label.should.equal('ca-name');
                ca.node.api_url.should.equal('http://localhost:7054');

                const orderer: OrdererTreeItem = items[3] as OrdererTreeItem;
                orderer.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                orderer.contextValue.should.equal('blockchain-runtime-orderer-item');
                orderer.label.should.equal('my ordering service');
                orderer.node.api_url.should.equal('grpc://localhost:7050');

                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should show peers, certificate authorities, and multiple orderer nodes correctly with cluster name', async () => {
                fabricConnection.getAllCertificateAuthorityNames.returns(['ca-name']);
                fabricConnection.getAllOrdererNames.returns(['orderer1', 'orderer2', 'orderer3', 'orderer4']);
                fabricConnection.getNode.withArgs('peerOne').returns(FabricNode.newPeer('peerOne', 'peerOne', 'grpc://localhost:7051', 'wallet', 'identity', 'Org1MSP'));
                fabricConnection.getNode.withArgs('peerTwo').returns(FabricNode.newPeer('peerTwo', 'peerTwo', 'grpc://localhost:8051', 'wallet', 'identity', 'Org1MSP'));
                fabricConnection.getNode.withArgs('ca-name').returns(FabricNode.newCertificateAuthority('ca-name', 'ca-name', 'http://localhost:7054', 'ca_name', 'wallet', 'identity', 'Org1MSP', 'admin', 'adminpw'));
                fabricConnection.getNode.withArgs('orderer1').returns(FabricNode.newOrderer('orderer1', 'orderer1', 'grpc://localhost:7050', 'wallet', 'identity', 'Org1MSP', 'my ordering service'));
                fabricConnection.getNode.withArgs('orderer2').returns(FabricNode.newOrderer('orderer2', 'orderer2', 'grpc://localhost:7050', 'wallet', 'identity', 'Org1MSP', 'my ordering service'));
                fabricConnection.getNode.withArgs('orderer3').returns(FabricNode.newOrderer('orderer3', 'orderer3', 'grpc://localhost:7050', 'wallet', 'identity', 'Org1MSP', 'my other ordering service'));
                fabricConnection.getNode.withArgs('orderer4').returns(FabricNode.newOrderer('orderer4', 'orderer4', 'grpc://localhost:7050', 'wallet', 'identity', 'Org1MSP', 'my other ordering service'));

                allChildren = await blockchainRuntimeExplorerProvider.getChildren();
                allChildren.length.should.equal(5);

                const items: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(allChildren[3]);
                items.length.should.equal(5);
                const peerOne: PeerTreeItem = items[0] as PeerTreeItem;
                peerOne.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                peerOne.contextValue.should.equal('blockchain-peer-item');
                peerOne.label.should.equal('peerOne');
                peerOne.node.api_url.should.equal('grpc://localhost:7051');

                const peerTwo: PeerTreeItem = items[1] as PeerTreeItem;
                peerTwo.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                peerTwo.contextValue.should.equal('blockchain-peer-item');
                peerTwo.label.should.equal('peerTwo');
                peerTwo.node.api_url.should.equal('grpc://localhost:8051');

                const ca: CertificateAuthorityTreeItem = items[2] as CertificateAuthorityTreeItem;
                ca.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                ca.contextValue.should.equal('blockchain-runtime-certificate-authority-item');
                ca.label.should.equal('ca-name');
                ca.node.api_url.should.equal('http://localhost:7054');

                const orderer: OrdererTreeItem = items[3] as OrdererTreeItem;
                orderer.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                orderer.contextValue.should.equal('blockchain-runtime-orderer-item');
                orderer.label.should.equal('my ordering service');
                orderer.node.api_url.should.equal('grpc://localhost:7050');

                const orderer2: OrdererTreeItem = items[4] as OrdererTreeItem;
                orderer2.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                orderer2.contextValue.should.equal('blockchain-runtime-orderer-item');
                orderer2.label.should.equal('my other ordering service');
                orderer2.node.api_url.should.equal('grpc://localhost:7050');

                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should error if there is a problem with displaying instantiated chaincodes', async () => {
                fabricConnection.getInstantiatedChaincode.withArgs(['peerOne'], 'channelOne').rejects({ message: 'some error' });

                allChildren = await blockchainRuntimeExplorerProvider.getChildren();

                allChildren.length.should.equal(5);

                const channels: ChannelsOpsTreeItem = allChildren[1] as ChannelsOpsTreeItem;
                const channelsArray: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(channels);
                channelsArray.length.should.equal(2);

                const contractTreeItems: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(allChildren[1]);
                const instantiatedChaincodes: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(contractTreeItems[1]);
                instantiatedChaincodes.length.should.equal(1);
                const instantiateCommandTreeItem: InstantiateCommandTreeItem = instantiatedChaincodes[0] as InstantiateCommandTreeItem;
                instantiateCommandTreeItem.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                instantiateCommandTreeItem.contextValue.should.equal('blockchain-runtime-instantiate-command-item');
                instantiateCommandTreeItem.label.should.equal('+ Instantiate');

                const installedContractsTree: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(contractTreeItems[0]);
                installedContractsTree.length.should.equal(5);

                logSpy.should.have.been.calledOnceWith(LogType.ERROR, `Error populating instantiated smart contracts view: some error`, `Error populating instantiated smart contracts view: some error`);

            });

            it('should create the installed chaincode tree correctly', async () => {

                allChildren = await blockchainRuntimeExplorerProvider.getChildren();

                allChildren.length.should.equal(5);

                const contractTreeItems: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(allChildren[1]);
                const installedContractsTree: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(contractTreeItems[0]);
                installedContractsTree.length.should.equal(5);
                const installedContractOne: InstantiateCommandTreeItem = installedContractsTree[0] as InstantiateCommandTreeItem;
                installedContractOne.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                installedContractOne.contextValue.should.equal('blockchain-runtime-installed-chaincode-item');
                installedContractOne.label.should.equal('sample-car-network@1.0');
                installedContractOne.tooltip.should.equal('Installed on: peerOne');
                const installedContractTwo: InstantiateCommandTreeItem = installedContractsTree[1] as InstantiateCommandTreeItem;
                installedContractTwo.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                installedContractTwo.contextValue.should.equal('blockchain-runtime-installed-chaincode-item');
                installedContractTwo.label.should.equal('sample-car-network@1.2');
                installedContractTwo.tooltip.should.equal('Installed on: peerOne');
                const installedContractThree: InstantiateCommandTreeItem = installedContractsTree[2] as InstantiateCommandTreeItem;
                installedContractThree.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                installedContractThree.contextValue.should.equal('blockchain-runtime-installed-chaincode-item');
                installedContractThree.label.should.equal('sample-food-network@0.6');
                installedContractThree.tooltip.should.equal('Installed on: peerOne');
                const installedContractFour: InstantiateCommandTreeItem = installedContractsTree[3] as InstantiateCommandTreeItem;
                installedContractFour.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                installedContractFour.contextValue.should.equal('blockchain-runtime-installed-chaincode-item');
                installedContractFour.label.should.equal('biscuit-network@0.7');
                const installCommandTreeItem: InstantiateCommandTreeItem = installedContractsTree[4] as InstantiateCommandTreeItem;
                installCommandTreeItem.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                installCommandTreeItem.contextValue.should.equal('blockchain-runtime-installed-command-item');
                installCommandTreeItem.label.should.equal('+ Install');

                logSpy.should.not.have.been.called;
            });

            it('should handle no installed chaincodes', async () => {
                fabricConnection.getInstalledChaincode.withArgs('peerOne').resolves(new Map<string, Array<string>>());

                allChildren = await blockchainRuntimeExplorerProvider.getChildren();

                allChildren.length.should.equal(5);

                const channels: ChannelsOpsTreeItem = allChildren[2] as ChannelsOpsTreeItem;
                const channelsArray: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(channels);
                channelsArray.length.should.equal(2);

                const contractTreeItems: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(allChildren[1]);
                const installedContractsTree: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(contractTreeItems[0]);
                installedContractsTree.length.should.equal(2);

                const installedContractOne: InstantiateCommandTreeItem = installedContractsTree[0] as InstantiateCommandTreeItem;
                installedContractOne.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                installedContractOne.contextValue.should.equal('blockchain-runtime-installed-chaincode-item');
                installedContractOne.label.should.equal('biscuit-network@0.7');

                const installCommandTreeItem: InstantiateCommandTreeItem = installedContractsTree[1] as InstantiateCommandTreeItem;
                installCommandTreeItem.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                installCommandTreeItem.contextValue.should.equal('blockchain-runtime-installed-command-item');
                installCommandTreeItem.label.should.equal('+ Install');

                const instantiatedChaincodes: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(contractTreeItems[1]);
                instantiatedChaincodes.length.should.equal(4);

                logSpy.should.not.have.been.called;
            });

            it('should handle errror getting installed chaincodes', async () => {
                fabricConnection.getInstalledChaincode.withArgs('peerOne').rejects({ message: 'some error' });

                allChildren = await blockchainRuntimeExplorerProvider.getChildren();

                allChildren.length.should.equal(5);

                const contractTreeItems: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(allChildren[1]);
                const installedContractsTree: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(contractTreeItems[0]);
                installedContractsTree.length.should.equal(1);

                const installCommandTreeItem: InstantiateCommandTreeItem = installedContractsTree[0] as InstantiateCommandTreeItem;
                installCommandTreeItem.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                installCommandTreeItem.contextValue.should.equal('blockchain-runtime-installed-command-item');
                installCommandTreeItem.label.should.equal('+ Install');

                const instantiatedChaincodes: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(contractTreeItems[1]);
                instantiatedChaincodes.length.should.equal(4);

                logSpy.should.have.been.calledOnceWith(LogType.ERROR, `Error populating installed smart contracts view: some error`, `Error populating installed smart contracts view: some error`);
            });

            it('should create instantiated chaincode correctly', async () => {
                allChildren = await blockchainRuntimeExplorerProvider.getChildren();

                allChildren.length.should.equal(5);

                const channels: ChannelsOpsTreeItem = allChildren[1] as ChannelsOpsTreeItem;
                const channelsArray: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(channels);
                channelsArray.length.should.equal(2);

                const contractTreeItems: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(allChildren[1]);
                const instantiatedChaincodes: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(contractTreeItems[1]);
                instantiatedChaincodes.length.should.equal(4);
                const instantiatedChaincodeOne: InstantiatedChaincodeTreeItem = instantiatedChaincodes[0] as InstantiatedChaincodeTreeItem;
                instantiatedChaincodeOne.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                instantiatedChaincodeOne.contextValue.should.equal('blockchain-instantiated-chaincode-item');
                instantiatedChaincodeOne.label.should.equal('biscuit-network@0.7');
                instantiatedChaincodeOne.tooltip.should.equal('Instantiated on: channelOne');
                const instantiatedChaincodeTwo: InstantiatedChaincodeTreeItem = instantiatedChaincodes[1] as InstantiatedChaincodeTreeItem;
                instantiatedChaincodeTwo.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                instantiatedChaincodeTwo.contextValue.should.equal('blockchain-instantiated-chaincode-item');
                instantiatedChaincodeTwo.label.should.equal('cake-network@0.10');
                instantiatedChaincodeTwo.tooltip.should.equal('Instantiated on: channelTwo');
                const instantiatedChaincodeThree: InstantiatedChaincodeTreeItem = instantiatedChaincodes[2] as InstantiatedChaincodeTreeItem;
                instantiatedChaincodeThree.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                instantiatedChaincodeThree.contextValue.should.equal('blockchain-instantiated-chaincode-item');
                instantiatedChaincodeThree.label.should.equal('legacy-network@2.34');
                instantiatedChaincodeThree.tooltip.should.equal('Instantiated on: channelTwo');
                const instantiateCommandTreeItem: InstantiateCommandTreeItem = instantiatedChaincodes[3] as InstantiateCommandTreeItem;
                instantiateCommandTreeItem.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                instantiateCommandTreeItem.contextValue.should.equal('blockchain-runtime-instantiate-command-item');
                instantiateCommandTreeItem.label.should.equal('+ Instantiate');

                const installedContractsTree: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(contractTreeItems[0]);
                installedContractsTree.length.should.equal(5);

                logSpy.should.not.have.been.called;
            });

            it('should show organizations correctly', async () => {

                allChildren = await blockchainRuntimeExplorerProvider.getChildren();
                allChildren.length.should.equal(5);

                const orgs: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(allChildren[4]);
                orgs.length.should.equal(2);
                const orgOne: OrgTreeItem = orgs[0] as OrgTreeItem;
                orgOne.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                orgOne.contextValue.should.equal('blockchain-runtime-org-item');
                orgOne.label.should.equal('Org1');

                const orgTwo: OrgTreeItem = orgs[1] as OrgTreeItem;
                orgTwo.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                orgTwo.contextValue.should.equal('blockchain-runtime-org-item');
                orgTwo.label.should.equal('Org2');

                logSpy.should.not.have.been.called;
            });
        });
    });

    describe('refresh', () => {

        let registryEntry: FabricEnvironmentRegistryEntry;

        beforeEach(async () => {

            await ExtensionUtil.activateExtension();

            registryEntry = new FabricEnvironmentRegistryEntry();
            registryEntry.name = FabricRuntimeUtil.LOCAL_FABRIC;
            registryEntry.managedRuntime = true;
            registryEntry.associatedWallet = FabricWalletUtil.LOCAL_WALLET;
            mySandBox.stub(FabricEnvironmentManager.instance(), 'getEnvironmentRegistryEntry').returns(registryEntry);
        });

        afterEach(() => {
            mySandBox.restore();
        });

        it('should test the tree is refreshed when the refresh command is run', async () => {

            const blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider = myExtension.getBlockchainEnvironmentExplorerProvider();

            const onDidChangeTreeDataSpy: sinon.SinonSpy = mySandBox.spy(blockchainRuntimeExplorerProvider['_onDidChangeTreeData'], 'fire');

            await vscode.commands.executeCommand(ExtensionCommands.REFRESH_ENVIRONMENTS);

            onDidChangeTreeDataSpy.should.have.been.called;
        });

        it('should test the tree is refreshed when the refresh command is run', async () => {

            const mockTreeItem: sinon.SinonStubbedInstance<ChannelTreeItem> = sinon.createStubInstance(ChannelTreeItem);

            const blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider = myExtension.getBlockchainEnvironmentExplorerProvider();

            const onDidChangeTreeDataSpy: sinon.SinonSpy = mySandBox.spy(blockchainRuntimeExplorerProvider['_onDidChangeTreeData'], 'fire');

            await vscode.commands.executeCommand(ExtensionCommands.REFRESH_ENVIRONMENTS, mockTreeItem);

            onDidChangeTreeDataSpy.should.have.been.calledOnceWithExactly(mockTreeItem);
        });

        it('should set fabricEnvironmentToSetup if a FabricEnvironmentTreeItem is passed in', async () => {
            const mockTreeItem: sinon.SinonStubbedInstance<FabricEnvironmentTreeItem> = sinon.createStubInstance(FabricEnvironmentTreeItem);

            const blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider = myExtension.getBlockchainEnvironmentExplorerProvider();

            const onDidChangeTreeDataSpy: sinon.SinonSpy = mySandBox.spy(blockchainRuntimeExplorerProvider['_onDidChangeTreeData'], 'fire');

            await vscode.commands.executeCommand(ExtensionCommands.REFRESH_ENVIRONMENTS, mockTreeItem);

            onDidChangeTreeDataSpy.should.have.been.calledOnce;
            // should not be called with the tree item otherwise get children won't be called as the collapsible state will be none
            onDidChangeTreeDataSpy.should.not.have.been.calledWith(mockTreeItem);

            blockchainRuntimeExplorerProvider['fabricEnvironmentToSetUp'].should.equal(mockTreeItem);
        });

        it('should not set fabricEnvironmentToSetup if a FabriRuntimeTreeItem is passed in', async () => {
            const blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider = myExtension.getBlockchainEnvironmentExplorerProvider();
            blockchainRuntimeExplorerProvider['fabricEnvironmentToSetUp'] = undefined;

            const treeItem: RuntimeTreeItem = await RuntimeTreeItem.newRuntimeTreeItem(blockchainRuntimeExplorerProvider, FabricRuntimeUtil.LOCAL_FABRIC, registryEntry, {
                command: ExtensionCommands.CONNECT_TO_ENVIRONMENT,
                title: ''
            });

            const onDidChangeTreeDataSpy: sinon.SinonSpy = mySandBox.spy(blockchainRuntimeExplorerProvider['_onDidChangeTreeData'], 'fire');

            await vscode.commands.executeCommand(ExtensionCommands.REFRESH_ENVIRONMENTS, treeItem);

            onDidChangeTreeDataSpy.should.have.been.calledOnceWithExactly(treeItem);

            should.not.exist(blockchainRuntimeExplorerProvider['fabricEnvironmentToSetUp']);
        });

        it('should refresh on connect event', async () => {
            const blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider = myExtension.getBlockchainEnvironmentExplorerProvider();

            const connectStub: sinon.SinonStub = mySandBox.stub(blockchainRuntimeExplorerProvider, 'connect').resolves();

            FabricEnvironmentManager.instance().emit('connected');

            connectStub.should.have.been.called;
        });

        it('should refresh on disconnect event', async () => {
            const blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider = myExtension.getBlockchainEnvironmentExplorerProvider();

            const disconnectStub: sinon.SinonStub = mySandBox.stub(blockchainRuntimeExplorerProvider, 'disconnect').resolves();

            FabricEnvironmentManager.instance().emit('disconnected');

            disconnectStub.should.have.been.called;
        });
    });

    describe('connect', () => {

        beforeEach(async () => {
            await ExtensionUtil.activateExtension();
        });

        afterEach(() => {
            mySandBox.restore();
        });

        it('should set the current client connection', async () => {

            const blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider = myExtension.getBlockchainEnvironmentExplorerProvider();

            const onDidChangeTreeDataSpy: sinon.SinonSpy = mySandBox.spy(blockchainRuntimeExplorerProvider['_onDidChangeTreeData'], 'fire');

            const executeCommandSpy: sinon.SinonSpy = mySandBox.spy(vscode.commands, 'executeCommand');

            await blockchainRuntimeExplorerProvider.connect();

            onDidChangeTreeDataSpy.should.have.been.called;

            executeCommandSpy.should.have.been.calledOnce;
            executeCommandSpy.getCall(0).should.have.been.calledWith('setContext', 'blockchain-environment-connected', true);
        });
    });

    describe('disconnect', () => {

        beforeEach(async () => {
            await ExtensionUtil.activateExtension();
        });

        afterEach(() => {
            mySandBox.restore();
        });

        it('should disconnect the runtime connection', async () => {
            const blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider = myExtension.getBlockchainEnvironmentExplorerProvider();

            const onDidChangeTreeDataSpy: sinon.SinonSpy = mySandBox.spy(blockchainRuntimeExplorerProvider['_onDidChangeTreeData'], 'fire');

            const executeCommandSpy: sinon.SinonSpy = mySandBox.spy(vscode.commands, 'executeCommand');

            await blockchainRuntimeExplorerProvider.disconnect();

            onDidChangeTreeDataSpy.should.have.been.called;

            executeCommandSpy.should.have.been.calledOnce;
            executeCommandSpy.getCall(0).should.have.been.calledWith('setContext', 'blockchain-environment-connected', false);
        });
    });

    describe('getTreeItem', () => {

        beforeEach(async () => {
            await ExtensionUtil.activateExtension();
        });

        afterEach(() => {
            mySandBox.restore();
        });

        it('should get a tree item', async () => {
            mySandBox.stub(FabricRuntimeManager.instance().getRuntime(), 'isRunning').resolves(false);
            const blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider = myExtension.getBlockchainEnvironmentExplorerProvider();
            const allChildren: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren();

            const result: RuntimeTreeItem = blockchainRuntimeExplorerProvider.getTreeItem(allChildren[0]) as RuntimeTreeItem;

            result.label.should.equal('Local Fabric  ○ (click to start)');
        });
    });
});
