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
import { BlockchainEnvironmentExplorerProvider } from '../../src/explorer/runtimeOpsExplorer';
import { ChannelTreeItem } from '../../src/explorer/model/ChannelTreeItem';
import { PeerTreeItem } from '../../src/explorer/runtimeOps/PeerTreeItem';
import { ExtensionUtil } from '../../src/util/ExtensionUtil';
import { TestUtil } from '../TestUtil';
import { RuntimeTreeItem } from '../../src/explorer/runtimeOps/RuntimeTreeItem';
import { FabricRuntimeManager } from '../../src/fabric/FabricRuntimeManager';
import { InstantiatedChaincodeTreeItem } from '../../src/explorer/model/InstantiatedChaincodeTreeItem';
import { VSCodeBlockchainOutputAdapter } from '../../src/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../../src/logging/OutputAdapter';
import { SmartContractsTreeItem } from '../../src/explorer/runtimeOps/SmartContractsTreeItem';
import { ChannelsOpsTreeItem } from '../../src/explorer/runtimeOps/ChannelsOpsTreeItem';
import { NodesTreeItem } from '../../src/explorer/runtimeOps/NodesTreeItem';
import { OrganizationsTreeItem } from '../../src/explorer/runtimeOps/OrganizationsTreeItem';
import { InstantiateCommandTreeItem } from '../../src/explorer/runtimeOps/InstantiateCommandTreeItem';
import { OrgTreeItem } from '../../src/explorer/runtimeOps/OrgTreeItem';
import { ExtensionCommands } from '../../ExtensionCommands';
import { MetadataUtil } from '../../src/util/MetadataUtil';
import { CertificateAuthorityTreeItem } from '../../src/explorer/runtimeOps/CertificateAuthorityTreeItem';
import { OrdererTreeItem } from '../../src/explorer/runtimeOps/OrdererTreeItem';
import { FabricEnvironmentConnection } from '../../src/fabric/FabricEnvironmentConnection';
import { FabricNode } from '../../src/fabric/FabricNode';
import { FabricEnvironmentManager } from '../../src/fabric/FabricEnvironmentManager';
import { FabricEnvironmentRegistryEntry } from '../../src/fabric/FabricEnvironmentRegistryEntry';
import { FabricRuntimeUtil } from '../../src/fabric/FabricRuntimeUtil';
import { FabricWalletUtil } from '../../src/fabric/FabricWalletUtil';

chai.use(sinonChai);
chai.should();

// tslint:disable no-unused-expression
describe('runtimeOpsExplorer', () => {
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

            it('should display a stopped runtime tree item', async () => {
                const blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider = myExtension.getBlockchainEnvironmentExplorerProvider();
                const allChildren: BlockchainTreeItem[] = await blockchainRuntimeExplorerProvider.getChildren();

                allChildren.length.should.equal(1);
                allChildren[0].label.should.equal('Local Fabric  ○ (click to start)');

                executeCommandSpy.should.have.been.calledWith('setContext', 'blockchain-runtime-connected', false);
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

                await ExtensionUtil.activateExtension();
            });

            afterEach(() => {
                mySandBox.restore();
            });

            it('should error if gRPC cant connect to Fabric', async () => {
                fabricConnection.getAllPeerNames.returns(['peerOne']);
                fabricConnection.createChannelMap.throws(new Error('Cannot connect to Fabric: Received http2 header with status: 503'));
                const blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider = myExtension.getBlockchainEnvironmentExplorerProvider();
                const allChildren: BlockchainTreeItem[] = await blockchainRuntimeExplorerProvider.getChildren();
                const smartcontractsChildren: BlockchainTreeItem[] = await blockchainRuntimeExplorerProvider.getChildren(allChildren[0]);
                await blockchainRuntimeExplorerProvider.getChildren(smartcontractsChildren[1]);

                logSpy.should.have.been.calledOnceWith(LogType.ERROR, 'Error populating instantiated smart contracts view: Cannot connect to Fabric: Received http2 header with status: 503', 'Error populating instantiated smart contracts view: Cannot connect to Fabric: Received http2 header with status: 503');
            });

            it('should error if getAllChannelsForPeer errors with message when populating channels view', async () => {
                fabricConnection.getAllPeerNames.returns(['peerOne']);
                fabricConnection.createChannelMap.throws(new Error('Error creating channel map: some error'));

                const blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider = myExtension.getBlockchainEnvironmentExplorerProvider();
                const allChildren: BlockchainTreeItem[] = await blockchainRuntimeExplorerProvider.getChildren();
                await blockchainRuntimeExplorerProvider.getChildren(allChildren[1]);

                logSpy.should.have.been.calledOnceWith(LogType.ERROR, 'Error populating channel view: Error creating channel map: some error', 'Error populating channel view: Error: Error creating channel map: some error');
            });

            it('should error if populating nodes view fails', async () => {
                fabricConnection.getAllPeerNames.throws({ message: 'some error' });

                const blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider = myExtension.getBlockchainEnvironmentExplorerProvider();
                const allChildren: BlockchainTreeItem[] = await blockchainRuntimeExplorerProvider.getChildren();
                await blockchainRuntimeExplorerProvider.getChildren(allChildren[2]);

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

                fabricConnection.getAllOrdererNames.returns(['orderer1']);

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

                allChildren.length.should.equal(4);

                const smartContracts: SmartContractsTreeItem = allChildren[0] as SmartContractsTreeItem;
                smartContracts.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Expanded);
                smartContracts.contextValue.should.equal('blockchain-runtime-smart-contracts-item');
                smartContracts.label.should.equal('Smart Contracts');

                const channels: ChannelsOpsTreeItem = allChildren[1] as ChannelsOpsTreeItem;
                channels.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                channels.contextValue.should.equal('blockchain-runtime-channels-item');
                channels.label.should.equal('Channels');

                const nodes: NodesTreeItem = allChildren[2] as NodesTreeItem;
                nodes.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                nodes.contextValue.should.equal('blockchain-runtime-nodes-item');
                nodes.label.should.equal('Nodes');

                const orgs: OrganizationsTreeItem = allChildren[3] as OrganizationsTreeItem;
                orgs.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                orgs.contextValue.should.equal('blockchain-runtime-organizations-item');
                orgs.label.should.equal('Organizations');

                executeCommandSpy.should.have.been.calledWith('setContext', 'blockchain-runtime-connected', true);
            });

            it('should set context to false if not local runtime', async () => {
                const otherEnvironmentRegistry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
                otherEnvironmentRegistry.name = 'myFabric';
                otherEnvironmentRegistry.managedRuntime = false;

                environmentStub.returns(otherEnvironmentRegistry);

                allChildren = await blockchainRuntimeExplorerProvider.getChildren();

                executeCommandSpy.should.have.been.calledWith('setContext', 'blockchain-runtime-connected', false);
            });

            it('should create channels children correctly', async () => {

                allChildren.length.should.equal(4);
                const channels: ChannelsOpsTreeItem = allChildren[1] as ChannelsOpsTreeItem;
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
                fabricConnection.getNode.withArgs('ca-name').returns(FabricNode.newCertificateAuthority('ca-name', 'ca-name', 'http://localhost:7054', 'ca_name', 'wallet', 'identity', 'Org1MSP'));
                fabricConnection.getNode.withArgs('orderer1').returns(FabricNode.newOrderer('orderer1', 'orderer1', 'grpc://localhost:7050', 'wallet', 'identity', 'Org1MSP'));

                allChildren = await blockchainRuntimeExplorerProvider.getChildren();
                allChildren.length.should.equal(4);

                const items: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(allChildren[2]);
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
                orderer.label.should.equal('orderer1');
                orderer.node.api_url.should.equal('grpc://localhost:7050');

                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should error if there is a problem with displaying instantiated chaincodes', async () => {
                fabricConnection.getInstantiatedChaincode.withArgs(['peerOne'], 'channelOne').rejects({ message: 'some error' });

                allChildren = await blockchainRuntimeExplorerProvider.getChildren();

                allChildren.length.should.equal(4);

                const channels: ChannelsOpsTreeItem = allChildren[1] as ChannelsOpsTreeItem;
                const channelsArray: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(channels);
                channelsArray.length.should.equal(2);

                const contractTreeItems: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(allChildren[0]);
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

                allChildren.length.should.equal(4);

                const contractTreeItems: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(allChildren[0]);
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

                allChildren.length.should.equal(4);

                const channels: ChannelsOpsTreeItem = allChildren[1] as ChannelsOpsTreeItem;
                const channelsArray: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(channels);
                channelsArray.length.should.equal(2);

                const contractTreeItems: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(allChildren[0]);
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

                allChildren.length.should.equal(4);

                const contractTreeItems: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(allChildren[0]);
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

                allChildren.length.should.equal(4);

                const channels: ChannelsOpsTreeItem = allChildren[1] as ChannelsOpsTreeItem;
                const channelsArray: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(channels);
                channelsArray.length.should.equal(2);

                const contractTreeItems: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(allChildren[0]);
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
                allChildren.length.should.equal(4);

                const orgs: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(allChildren[3]);
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

        beforeEach(async () => {

            await ExtensionUtil.activateExtension();
        });

        afterEach(() => {
            mySandBox.restore();
        });

        it('should test the tree is refreshed when the refresh command is run', async () => {

            const blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider = myExtension.getBlockchainEnvironmentExplorerProvider();

            const onDidChangeTreeDataSpy: sinon.SinonSpy = mySandBox.spy(blockchainRuntimeExplorerProvider['_onDidChangeTreeData'], 'fire');

            await vscode.commands.executeCommand(ExtensionCommands.REFRESH_LOCAL_OPS);

            onDidChangeTreeDataSpy.should.have.been.called;
        });

        it('should test the tree is refreshed when the refresh command is run', async () => {

            const mockTreeItem: sinon.SinonStubbedInstance<ChannelTreeItem> = sinon.createStubInstance(ChannelTreeItem);

            const blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider = myExtension.getBlockchainEnvironmentExplorerProvider();

            const onDidChangeTreeDataSpy: sinon.SinonSpy = mySandBox.spy(blockchainRuntimeExplorerProvider['_onDidChangeTreeData'], 'fire');

            await vscode.commands.executeCommand(ExtensionCommands.REFRESH_LOCAL_OPS, mockTreeItem);

            onDidChangeTreeDataSpy.should.have.been.calledOnceWithExactly(mockTreeItem);
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
