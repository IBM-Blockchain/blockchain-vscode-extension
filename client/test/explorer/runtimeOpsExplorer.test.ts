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
import { BlockchainRuntimeExplorerProvider } from '../../src/explorer/runtimeOpsExplorer';
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
import { FabricRuntime } from '../../src/fabric/FabricRuntime';
import { ExtensionCommands } from '../../ExtensionCommands';
import { MetadataUtil } from '../../src/util/MetadataUtil';
import { InstantiatedContractTreeItem } from '../../src/explorer/model/InstantiatedContractTreeItem';
import { CertificateAuthorityTreeItem } from '../../src/explorer/runtimeOps/CertificateAuthorityTreeItem';
import { OrdererTreeItem } from '../../src/explorer/runtimeOps/OrdererTreeItem';

chai.use(sinonChai);
chai.should();

class TestFabricConnection extends FabricConnection {

    async connect(): Promise<void> {
        return;
    }

    async getConnectionDetails(): Promise<any> {
        return;
    }
}

// tslint:disable no-unused-expression
describe('runtimeOpsExplorer', () => {

    before(async () => {
        await TestUtil.storeGatewaysConfig();
        await TestUtil.storeRuntimesConfig();
        await TestUtil.setupTests();
    });

    after(async () => {
        await TestUtil.restoreGatewaysConfig();
        await TestUtil.restoreRuntimesConfig();
    });

    describe('getChildren', () => {
        describe('unconnected tree', () => {

            let mySandBox: sinon.SinonSandbox;
            let getConnectionStub: sinon.SinonStub;
            let logSpy: sinon.SinonSpy;
            let isRunningStub: sinon.SinonStub;
            let runtime: FabricRuntime;

            beforeEach(async () => {
                mySandBox = sinon.createSandbox();
                getConnectionStub = mySandBox.stub(FabricRuntimeManager.instance(), 'getConnection');
                logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');

                runtime = await FabricRuntimeManager.instance().getRuntime();
                isRunningStub = mySandBox.stub(FabricRuntimeManager.instance().getRuntime(), 'isRunning').resolves(false);
                await ExtensionUtil.activateExtension();
            });

            afterEach(() => {
                mySandBox.restore();
            });

            it('should display a stopped runtime tree item', async () => {
                const blockchainRuntimeExplorerProvider: BlockchainRuntimeExplorerProvider = myExtension.getBlockchainRuntimeExplorerProvider();
                const allChildren: BlockchainTreeItem[] = await blockchainRuntimeExplorerProvider.getChildren();

                allChildren.length.should.equal(1);
                allChildren[0].label.should.equal('Local Fabric runtime is stopped. Click to start.');
            });

            it('should refresh when local_fabric is busy', async () => {
                const blockchainRuntimeExplorerProvider: BlockchainRuntimeExplorerProvider = myExtension.getBlockchainRuntimeExplorerProvider();
                mySandBox.stub(blockchainRuntimeExplorerProvider, 'refresh').resolves();
                runtime.emit('busy', true);

                blockchainRuntimeExplorerProvider.refresh.should.have.been.calledOnce;
            });

            it('should handle errors populating the tree with runtimeTreeItems', async () => {
                mySandBox.stub(RuntimeTreeItem, 'newRuntimeTreeItem').rejects({ message: 'some error' });

                const blockchainRuntimeExplorerProvider: BlockchainRuntimeExplorerProvider = myExtension.getBlockchainRuntimeExplorerProvider();
                await blockchainRuntimeExplorerProvider.getChildren();

                logSpy.should.have.been.calledWith(LogType.ERROR, 'Error populating Local Fabric Control Panel: some error');
            });

            it('should handle errors populating the tree ', async () => {
                isRunningStub.rejects({ message: 'some error' });

                const blockchainRuntimeExplorerProvider: BlockchainRuntimeExplorerProvider = myExtension.getBlockchainRuntimeExplorerProvider();
                await blockchainRuntimeExplorerProvider.getChildren();

                logSpy.should.have.been.calledWith(LogType.ERROR, 'Error populating Local Fabric Control Panel: some error');
            });

            it('should error if gRPC cant connect to Fabric', async () => {
                isRunningStub.resolves(true);
                const fabricConnection: sinon.SinonStubbedInstance<FabricConnection> = sinon.createStubInstance(TestFabricConnection);
                getConnectionStub.returns((fabricConnection as any) as FabricConnection);
                fabricConnection.getAllPeerNames.returns(['peerOne']);
                fabricConnection.getAllChannelsForPeer.throws({ message: 'Received http2 header with status: 503' });

                const blockchainRuntimeExplorerProvider: BlockchainRuntimeExplorerProvider = myExtension.getBlockchainRuntimeExplorerProvider();
                const allChildren: BlockchainTreeItem[] = await blockchainRuntimeExplorerProvider.getChildren();
                const smartcontractsChildren: BlockchainTreeItem[] = await blockchainRuntimeExplorerProvider.getChildren(allChildren[0]);
                await blockchainRuntimeExplorerProvider.getChildren(smartcontractsChildren[0]);

                logSpy.should.have.been.calledOnceWith(LogType.ERROR, 'Error populating instantiated smart contracts view: Cannot connect to Fabric: Received http2 header with status: 503', 'Error populating instantiated smart contracts view: Cannot connect to Fabric: Received http2 header with status: 503');
            });

            it('should error if getAllChannelsForPeer errors with message when populating channels view', async () => {
                isRunningStub.resolves(true);
                const fabricConnection: sinon.SinonStubbedInstance<FabricConnection> = sinon.createStubInstance(TestFabricConnection);
                getConnectionStub.returns((fabricConnection as any) as FabricConnection);
                fabricConnection.getAllPeerNames.returns(['peerOne']);
                fabricConnection.getAllChannelsForPeer.throws({ message: 'some error' });

                const blockchainRuntimeExplorerProvider: BlockchainRuntimeExplorerProvider = myExtension.getBlockchainRuntimeExplorerProvider();
                const allChildren: BlockchainTreeItem[] = await blockchainRuntimeExplorerProvider.getChildren();
                await blockchainRuntimeExplorerProvider.getChildren(allChildren[1]);

                logSpy.should.have.been.calledOnceWith(LogType.ERROR, 'Error populating channel view: Error creating channel map: some error', 'Error populating channel view: Error: Error creating channel map: some error');
            });

            it('should error if getAllChannelsForPeer errors without a message when populating organizations view', async () => {
                isRunningStub.resolves(true);
                const fabricConnection: sinon.SinonStubbedInstance<FabricConnection> = sinon.createStubInstance(TestFabricConnection);
                getConnectionStub.returns((fabricConnection as any) as FabricConnection);
                fabricConnection.getAllPeerNames.returns(['peerOne']);
                fabricConnection.getAllChannelsForPeer.throws('an error with no message');

                const blockchainRuntimeExplorerProvider: BlockchainRuntimeExplorerProvider = myExtension.getBlockchainRuntimeExplorerProvider();
                const allChildren: BlockchainTreeItem[] = await blockchainRuntimeExplorerProvider.getChildren();
                await blockchainRuntimeExplorerProvider.getChildren(allChildren[3]);

                logSpy.should.have.been.calledOnceWith(LogType.ERROR, 'Error populating organizations view: an error with no message', 'Error populating organizations view: Error: an error with no message');
            });

            it('should error if populating nodes view fails', async () => {
                isRunningStub.resolves(true);
                const fabricConnection: sinon.SinonStubbedInstance<FabricConnection> = sinon.createStubInstance(TestFabricConnection);
                getConnectionStub.returns((fabricConnection as any) as FabricConnection);
                fabricConnection.getAllPeerNames.throws({ message: 'some error' });

                const blockchainRuntimeExplorerProvider: BlockchainRuntimeExplorerProvider = myExtension.getBlockchainRuntimeExplorerProvider();
                const allChildren: BlockchainTreeItem[] = await blockchainRuntimeExplorerProvider.getChildren();
                await blockchainRuntimeExplorerProvider.getChildren(allChildren[2]);

                logSpy.should.have.been.calledOnceWith(LogType.ERROR, 'Error populating nodes view: some error');
            });
        });

        describe('connected tree', () => {

            let mySandBox: sinon.SinonSandbox;
            let allChildren: Array<BlockchainTreeItem>;
            let blockchainRuntimeExplorerProvider: BlockchainRuntimeExplorerProvider;
            let fabricConnection: sinon.SinonStubbedInstance<FabricConnection>;
            let logSpy: sinon.SinonSpy;

            beforeEach(async () => {
                mySandBox = sinon.createSandbox();

                mySandBox.stub(FabricRuntimeManager.instance().getRuntime(), 'isDevelopmentMode').returns(false);
                logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');

                await ExtensionUtil.activateExtension();

                fabricConnection = sinon.createStubInstance(TestFabricConnection);

                fabricConnection.getAllPeerNames.returns(['peerOne', 'peerTwo']);

                fabricConnection.getAllPeerNames.returns(['peerOne', 'peerTwo']);
                fabricConnection.getAllChannelsForPeer.withArgs('peerOne').resolves(['channelOne', 'channelTwo']);
                fabricConnection.getAllChannelsForPeer.withArgs('peerTwo').resolves(['channelTwo']);

                const installedChaincodeMapOne: Map<string, Array<string>> = new Map<string, Array<string>>();
                installedChaincodeMapOne.set('sample-car-network', ['1.0', '1.2']);
                installedChaincodeMapOne.set('sample-food-network', ['0.6']);

                fabricConnection.getInstalledChaincode.withArgs('peerOne').returns(installedChaincodeMapOne);

                const installedChaincodeMapTwo: Map<string, Array<string>> = new Map<string, Array<string>>();
                installedChaincodeMapTwo.set('biscuit-network', ['0.7']);
                fabricConnection.getInstalledChaincode.withArgs('peerTwo').returns(installedChaincodeMapTwo);

                fabricConnection.getInstantiatedChaincode.withArgs('channelOne').resolves([{
                    name: 'biscuit-network',
                    version: '0.7'
                }]);
                fabricConnection.getInstantiatedChaincode.withArgs('channelTwo').resolves([{
                    name: 'cake-network',
                    version: '0.10'
                }, {
                    name: 'legacy-network',
                    version: '2.34'
                }]);

                fabricConnection.getOrganizations.withArgs('channelOne').resolves([
                    {
                        id: 'Org1'
                    },
                    {
                        id: 'Org2'
                    }
                ]);
                fabricConnection.getOrganizations.withArgs('channelTwo').resolves([
                    {
                        id: 'Org3'
                    }
                ]);

                fabricConnection.getOrderers.resolves(new Set(['orderer1']));

                blockchainRuntimeExplorerProvider = myExtension.getBlockchainRuntimeExplorerProvider();
                const fabricRuntimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
                mySandBox.stub(fabricRuntimeManager, 'getConnection').returns((fabricConnection as any) as FabricConnection);
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

            it('should show peers (nodes) correctly', async () => {
                fabricConnection.getCertificateAuthorityName.returns('ca-name');

                allChildren = await blockchainRuntimeExplorerProvider.getChildren();
                allChildren.length.should.equal(4);

                const items: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(allChildren[2]);
                items.length.should.equal(4);
                const peerOne: PeerTreeItem = items[0] as PeerTreeItem;
                peerOne.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                peerOne.contextValue.should.equal('blockchain-peer-item');
                peerOne.label.should.equal('peerOne');

                const peerTwo: PeerTreeItem = items[1] as PeerTreeItem;
                peerTwo.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                peerTwo.contextValue.should.equal('blockchain-peer-item');
                peerTwo.label.should.equal('peerTwo');

                const ca: CertificateAuthorityTreeItem = items[2] as CertificateAuthorityTreeItem;
                ca.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                ca.contextValue.should.equal('blockchain-runtime-certificate-authority-item');
                ca.label.should.equal('ca-name');

                const orderer: OrdererTreeItem = items[3] as OrdererTreeItem;
                orderer.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                orderer.contextValue.should.equal('blockchain-runtime-orderer-item');
                orderer.label.should.equal('orderer1');

                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should error if there is a problem with displaying instantiated chaincodes', async () => {
                fabricConnection.getInstantiatedChaincode.withArgs('channelOne').rejects({ message: 'some error' });

                allChildren = await blockchainRuntimeExplorerProvider.getChildren();

                allChildren.length.should.equal(4);

                const channels: ChannelsOpsTreeItem = allChildren[1] as ChannelsOpsTreeItem;
                const channelsArray: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(channels);
                channelsArray.length.should.equal(2);

                const contractTreeItems: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(allChildren[0]);
                const instantiatedChaincodes: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(contractTreeItems[0]);
                instantiatedChaincodes.length.should.equal(1);
                const instantiateCommandTreeItem: InstantiateCommandTreeItem = instantiatedChaincodes[0] as InstantiateCommandTreeItem;
                instantiateCommandTreeItem.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                instantiateCommandTreeItem.contextValue.should.equal('blockchain-runtime-instantiate-command-item');
                instantiateCommandTreeItem.label.should.equal('+ Instantiate');

                const installedContractsTree: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(contractTreeItems[1]);
                installedContractsTree.length.should.equal(5);

                logSpy.should.have.been.calledOnceWith(LogType.ERROR, `Error populating instantiated smart contracts view: some error`, `Error populating instantiated smart contracts view: some error`);

            });

            it('should create the installed chaincode tree correctly', async () => {

                allChildren = await blockchainRuntimeExplorerProvider.getChildren();

                allChildren.length.should.equal(4);

                const contractTreeItems: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(allChildren[0]);
                const installedContractsTree: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(contractTreeItems[1]);
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
                const installedContractsTree: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(contractTreeItems[1]);
                installedContractsTree.length.should.equal(2);

                const installedContractOne: InstantiateCommandTreeItem = installedContractsTree[0] as InstantiateCommandTreeItem;
                installedContractOne.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                installedContractOne.contextValue.should.equal('blockchain-runtime-installed-chaincode-item');
                installedContractOne.label.should.equal('biscuit-network@0.7');

                const installCommandTreeItem: InstantiateCommandTreeItem = installedContractsTree[1] as InstantiateCommandTreeItem;
                installCommandTreeItem.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                installCommandTreeItem.contextValue.should.equal('blockchain-runtime-installed-command-item');
                installCommandTreeItem.label.should.equal('+ Install');

                const instantiatedChaincodes: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(contractTreeItems[0]);
                instantiatedChaincodes.length.should.equal(4);

                logSpy.should.not.have.been.called;
            });

            it('should handle errror getting installed chaincodes', async () => {
                fabricConnection.getInstalledChaincode.withArgs('peerOne').rejects({ message: 'some error' });

                allChildren = await blockchainRuntimeExplorerProvider.getChildren();

                allChildren.length.should.equal(4);

                const contractTreeItems: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(allChildren[0]);
                const installedContractsTree: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(contractTreeItems[1]);
                installedContractsTree.length.should.equal(1);

                const installCommandTreeItem: InstantiateCommandTreeItem = installedContractsTree[0] as InstantiateCommandTreeItem;
                installCommandTreeItem.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                installCommandTreeItem.contextValue.should.equal('blockchain-runtime-installed-command-item');
                installCommandTreeItem.label.should.equal('+ Install');

                const instantiatedChaincodes: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(contractTreeItems[0]);
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
                const instantiatedChaincodes: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(contractTreeItems[0]);
                instantiatedChaincodes.length.should.equal(4);
                const instantiatedChaincodeOne: InstantiatedContractTreeItem = instantiatedChaincodes[0] as InstantiatedContractTreeItem;
                instantiatedChaincodeOne.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                instantiatedChaincodeOne.contextValue.should.equal('blockchain-instantiated-contract-item');
                instantiatedChaincodeOne.label.should.equal('biscuit-network@0.7');
                instantiatedChaincodeOne.tooltip.should.equal('Instantiated on: channelOne');
                const instantiatedChaincodeTwo: InstantiatedContractTreeItem = instantiatedChaincodes[1] as InstantiatedContractTreeItem;
                instantiatedChaincodeTwo.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                instantiatedChaincodeTwo.contextValue.should.equal('blockchain-instantiated-contract-item');
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

                const installedContractsTree: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(contractTreeItems[1]);
                installedContractsTree.length.should.equal(5);

                logSpy.should.not.have.been.called;
            });

            it('should show organizations correctly', async () => {

                allChildren = await blockchainRuntimeExplorerProvider.getChildren();
                allChildren.length.should.equal(4);

                const orgs: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(allChildren[3]);
                orgs.length.should.equal(3);
                const orgOne: OrgTreeItem = orgs[0] as OrgTreeItem;
                orgOne.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                orgOne.contextValue.should.equal('blockchain-runtime-org-item');
                orgOne.label.should.equal('Org1');

                const orgTwo: OrgTreeItem = orgs[1] as OrgTreeItem;
                orgTwo.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                orgTwo.contextValue.should.equal('blockchain-runtime-org-item');
                orgTwo.label.should.equal('Org2');

                const orgThree: OrgTreeItem = orgs[2] as OrgTreeItem;
                orgThree.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                orgThree.contextValue.should.equal('blockchain-runtime-org-item');
                orgThree.label.should.equal('Org3');

                logSpy.should.not.have.been.called;
            });
        });
    });

    describe('refresh', () => {

        let mySandBox: sinon.SinonSandbox;

        beforeEach(async () => {
            mySandBox = sinon.createSandbox();

            await ExtensionUtil.activateExtension();
        });

        afterEach(() => {
            mySandBox.restore();
        });

        it('should test the tree is refreshed when the refresh command is run', async () => {

            const blockchainRuntimeExplorerProvider: BlockchainRuntimeExplorerProvider = myExtension.getBlockchainRuntimeExplorerProvider();

            const onDidChangeTreeDataSpy: sinon.SinonSpy = mySandBox.spy(blockchainRuntimeExplorerProvider['_onDidChangeTreeData'], 'fire');

            await vscode.commands.executeCommand(ExtensionCommands.REFRESH_LOCAL_OPS);

            onDidChangeTreeDataSpy.should.have.been.called;
        });

        it('should test the tree is refreshed when the refresh command is run', async () => {

            const mockTreeItem: sinon.SinonStubbedInstance<ChannelTreeItem> = sinon.createStubInstance(ChannelTreeItem);

            const blockchainRuntimeExplorerProvider: BlockchainRuntimeExplorerProvider = myExtension.getBlockchainRuntimeExplorerProvider();

            const onDidChangeTreeDataSpy: sinon.SinonSpy = mySandBox.spy(blockchainRuntimeExplorerProvider['_onDidChangeTreeData'], 'fire');

            await vscode.commands.executeCommand(ExtensionCommands.REFRESH_LOCAL_OPS, mockTreeItem);

            onDidChangeTreeDataSpy.should.have.been.calledOnceWithExactly(mockTreeItem);
        });
    });

    describe('getTreeItem', () => {

        let mySandBox: sinon.SinonSandbox;

        beforeEach(async () => {
            mySandBox = sinon.createSandbox();

            await ExtensionUtil.activateExtension();
        });

        afterEach(() => {
            mySandBox.restore();
        });

        it('should get a tree item', async () => {
            mySandBox.stub(FabricRuntimeManager.instance().getRuntime(), 'isRunning').resolves(false);
            const blockchainRuntimeExplorerProvider: BlockchainRuntimeExplorerProvider = myExtension.getBlockchainRuntimeExplorerProvider();
            const allChildren: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren();

            const result: RuntimeTreeItem = blockchainRuntimeExplorerProvider.getTreeItem(allChildren[0]) as RuntimeTreeItem;

            result.label.should.equal('Local Fabric runtime is stopped. Click to start.');
        });
    });
});
