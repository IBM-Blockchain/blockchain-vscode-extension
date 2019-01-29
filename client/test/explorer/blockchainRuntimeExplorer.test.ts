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
import { BlockchainRuntimeExplorerProvider } from '../../src/explorer/BlockchainRuntimeExplorer';
import { ChannelTreeItem } from '../../src/explorer/model/ChannelTreeItem';
import { PeerTreeItem } from '../../src/explorer/model/PeerTreeItem';
import { InstalledChainCodeTreeItem } from '../../src/explorer/model/InstalledChainCodeTreeItem';
import { InstalledChainCodeVersionTreeItem } from '../../src/explorer/model/InstalledChaincodeVersionTreeItem';
import { ExtensionUtil } from '../../src/util/ExtensionUtil';
import { TestUtil } from '../TestUtil';
import { RuntimeTreeItem } from '../../src/explorer/model/RuntimeTreeItem';
import { FabricRuntimeManager } from '../../src/fabric/FabricRuntimeManager';
import { TransactionTreeItem } from '../../src/explorer/model/TransactionTreeItem';
import { InstantiatedChaincodeTreeItem } from '../../src/explorer/model/InstantiatedChaincodeTreeItem';
import { ContractTreeItem } from '../../src/explorer/model/ContractTreeItem';

chai.use(sinonChai);
const should: Chai.Should = chai.should();

class TestFabricConnection extends FabricConnection {

    async connect(): Promise<void> {
        return;
    }

    async getConnectionDetails(): Promise<any> {
        return;
    }
}

// tslint:disable no-unused-expression
describe('BlockchainRuntimeExplorer', () => {

    before(async () => {
        await TestUtil.storeConnectionsConfig();
        await TestUtil.storeRuntimesConfig();
        await TestUtil.setupTests();
    });

    after(async () => {
        await TestUtil.restoreConnectionsConfig();
        await TestUtil.restoreRuntimesConfig();
    });

    describe('getChildren', () => {
        describe('unconnected tree', () => {

            let mySandBox: sinon.SinonSandbox;
            let getConnectionStub: sinon.SinonStub;
            let errorSpy: sinon.SinonSpy;
            let isRunningStub: sinon.SinonStub;

            beforeEach(async () => {
                mySandBox = sinon.createSandbox();
                getConnectionStub = mySandBox.stub(FabricRuntimeManager.instance(), 'getConnection');
                errorSpy = mySandBox.spy(vscode.window, 'showErrorMessage');

                isRunningStub = mySandBox.stub(FabricRuntimeManager.instance().get('local_fabric'), 'isRunning').resolves(false);

                await ExtensionUtil.activateExtension();
            });

            afterEach(() => {
                mySandBox.restore();
            });

            it('should display a stopped runtime tree item', async () => {
                const blockchainRuntimeExplorerProvider: BlockchainRuntimeExplorerProvider = myExtension.getBlockchainRuntimeExplorerProvider();
                const allChildren: BlockchainTreeItem[] = await blockchainRuntimeExplorerProvider.getChildren();

                allChildren.length.should.equal(1);
                allChildren[0].label.should.equal('Local fabric runtime is stopped. Click to start.');
            });

            it('should handle errors populating the tree with runtimeTreeItems', async () => {
                mySandBox.stub(RuntimeTreeItem, 'newRuntimeTreeItem').rejects({message: 'some error'});

                const blockchainRuntimeExplorerProvider: BlockchainRuntimeExplorerProvider = myExtension.getBlockchainRuntimeExplorerProvider();
                const allChildren: BlockchainTreeItem[] = await blockchainRuntimeExplorerProvider.getChildren();

                errorSpy.should.have.been.calledWith('Error populating Local Fabric Control Panel: some error');
            });

            it('should handle errors thrown when connection fails (no message)', async () => {

                const fabricConnection: sinon.SinonStubbedInstance<FabricConnection> = sinon.createStubInstance(TestFabricConnection);

                getConnectionStub.returns((fabricConnection as any) as FabricConnection);
                getConnectionStub.onCall(3).returns(undefined);
                fabricConnection.getAllPeerNames.returns(['peerTwo']);
                fabricConnection.getAllChannelsForPeer.throws('some error');

                isRunningStub.resolves(true);

                const blockchainRuntimeExplorerProvider: BlockchainRuntimeExplorerProvider = myExtension.getBlockchainRuntimeExplorerProvider();

                const allChildren: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren();

                errorSpy.should.have.been.calledOnceWith('some error');
            });

            it('should handle errors thrown when connection fails (with message)', async () => {
                const fabricConnection: sinon.SinonStubbedInstance<FabricConnection> = sinon.createStubInstance(TestFabricConnection);

                getConnectionStub.returns((fabricConnection as any) as FabricConnection);
                getConnectionStub.onCall(3).returns(undefined);

                fabricConnection.getAllPeerNames.returns(['peerTwo']);
                fabricConnection.getAllChannelsForPeer.throws({message: 'cannot connect'});

                const blockchainRuntimeExplorerProvider: BlockchainRuntimeExplorerProvider = myExtension.getBlockchainRuntimeExplorerProvider();

                isRunningStub.resolves(true);

                await blockchainRuntimeExplorerProvider.getChildren();

                errorSpy.should.have.been.calledOnceWith('Error creating channel map: cannot connect');
            });

            it('should error if gRPC cant connect to Fabric', async () => {
                const fabricConnection: sinon.SinonStubbedInstance<FabricConnection> = sinon.createStubInstance(TestFabricConnection);
                const fabricRuntimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
                getConnectionStub.returns((fabricConnection as any) as FabricConnection);
                fabricConnection.getAllPeerNames.returns(['peerOne']);
                fabricConnection.getAllChannelsForPeer.throws({message: 'Received http2 header with status: 503'});

                const blockchainRuntimeExplorerProvider: BlockchainRuntimeExplorerProvider = myExtension.getBlockchainRuntimeExplorerProvider();

                isRunningStub.resolves(true);

                const allChildren: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren();

                errorSpy.should.have.been.calledWith('Cannot connect to Fabric: Received http2 header with status: 503');
            });
        });

        describe('connected tree', () => {

            let mySandBox: sinon.SinonSandbox;
            let allChildren: Array<BlockchainTreeItem>;
            let blockchainRuntimeExplorerProvider: BlockchainRuntimeExplorerProvider;
            let fabricConnection: sinon.SinonStubbedInstance<FabricConnection>;
            let errorSpy: sinon.SinonSpy;

            beforeEach(async () => {
                mySandBox = sinon.createSandbox();
                errorSpy = mySandBox.spy(vscode.window, 'showErrorMessage');

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
                }]);

                blockchainRuntimeExplorerProvider = myExtension.getBlockchainRuntimeExplorerProvider();
                const fabricRuntimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
                const getConnectionStub: sinon.SinonStub = mySandBox.stub(fabricRuntimeManager, 'getConnection').returns((fabricConnection as any) as FabricConnection);
                mySandBox.stub(fabricRuntimeManager.get('local_fabric'), 'isRunning').resolves(true);
                allChildren = await blockchainRuntimeExplorerProvider.getChildren();
            });

            afterEach(() => {
                mySandBox.restore();
            });

            it('should create a connected tree if there is a connection', async () => {

                allChildren.length.should.equal(2);

                const channelOne: ChannelTreeItem = allChildren[0] as ChannelTreeItem;
                channelOne.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                channelOne.contextValue.should.equal('blockchain-channel-item');
                channelOne.label.should.equal('channelOne');
                channelOne.peers.should.deep.equal(['peerOne']);

                const channelTwo: ChannelTreeItem = allChildren[1] as ChannelTreeItem;
                channelTwo.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                channelTwo.contextValue.should.equal('blockchain-channel-item');
                channelTwo.label.should.equal('channelTwo');
                channelTwo.peers.should.deep.equal(['peerOne', 'peerTwo']);
            });

            it('should create channel children correctly', async () => {

                allChildren.length.should.equal(2);
                const channelOne: ChannelTreeItem = allChildren[0] as ChannelTreeItem;

                const channelChildrenOne: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(channelOne);
                channelChildrenOne.length.should.equal(2);

                let peerItemOne: PeerTreeItem = channelChildrenOne[0] as PeerTreeItem;

                peerItemOne.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                peerItemOne.contextValue.should.equal('blockchain-peer-item');
                peerItemOne.label.should.equal('peerOne');

                const instantiatedTreeItemOne: InstantiatedChaincodeTreeItem = channelChildrenOne[1] as InstantiatedChaincodeTreeItem;
                instantiatedTreeItemOne.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                instantiatedTreeItemOne.name.should.equal('biscuit-network');
                instantiatedTreeItemOne.version.should.equal('0.7');
                instantiatedTreeItemOne.label.should.equal('biscuit-network@0.7');
                instantiatedTreeItemOne.contextValue.should.equal('blockchain-instantiated-chaincode-item');
                instantiatedTreeItemOne.channel.should.equal(channelOne);

                const channelTwo: ChannelTreeItem = allChildren[1] as ChannelTreeItem;

                const channelChildrenTwo: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(channelTwo);
                channelChildrenTwo.length.should.equal(3);

                peerItemOne = channelChildrenTwo[0] as PeerTreeItem;

                peerItemOne.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                peerItemOne.contextValue.should.equal('blockchain-peer-item');
                peerItemOne.label.should.equal('peerOne');

                const peerItemTwo: PeerTreeItem = channelChildrenTwo[1] as PeerTreeItem;

                peerItemTwo.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                peerItemTwo.contextValue.should.equal('blockchain-peer-item');
                peerItemTwo.label.should.equal('peerTwo');

                const instantiatedTreeItemTwo: InstantiatedChaincodeTreeItem = channelChildrenTwo[2] as InstantiatedChaincodeTreeItem;
                instantiatedTreeItemTwo.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                instantiatedTreeItemTwo.name.should.equal('cake-network');
                instantiatedTreeItemTwo.version.should.equal('0.10');
                instantiatedTreeItemTwo.label.should.equal('cake-network@0.10');
                instantiatedTreeItemTwo.contextValue.should.equal('blockchain-instantiated-chaincode-item');
                instantiatedTreeItemTwo.channel.should.equal(channelTwo);
            });

            it('should not create anything if no peers', async () => {

                fabricConnection.getAllPeerNames.returns([]);

                allChildren = await blockchainRuntimeExplorerProvider.getChildren();

                allChildren.length.should.equal(0);
            });

            it('should error if problem with instantiate chaincodes', async () => {

                fabricConnection.getInstantiatedChaincode.withArgs('channelOne').rejects({message: 'some error'});

                allChildren = await blockchainRuntimeExplorerProvider.getChildren();

                errorSpy.should.have.been.calledWith('Error getting instantiated smart contracts for channel channelOne some error');

                allChildren.length.should.equal(2);

                const channelOne: ChannelTreeItem = allChildren[0] as ChannelTreeItem;

                const channelChildrenOne: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(channelOne);
                channelChildrenOne.length.should.equal(1);

                const peerItemOne: PeerTreeItem = channelChildrenOne[0] as PeerTreeItem;

                peerItemOne.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                peerItemOne.contextValue.should.equal('blockchain-peer-item');
                peerItemOne.label.should.equal('peerOne');
            });

            it('should create the install chaincode correctly', async () => {

                const channelTwo: ChannelTreeItem = allChildren[1] as ChannelTreeItem;

                const channelChildrenTwo: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(channelTwo);
                channelChildrenTwo.length.should.equal(3);

                const peerItem: PeerTreeItem = channelChildrenTwo[0] as PeerTreeItem;

                const chaincodeItems: Array<InstalledChainCodeTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(peerItem) as Array<InstalledChainCodeTreeItem>;

                chaincodeItems.length.should.equal(2);
                chaincodeItems[0].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                chaincodeItems[0].contextValue.should.equal('blockchain-installed-chaincode-item');
                chaincodeItems[0].label.should.equal('sample-car-network');

                chaincodeItems[1].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                chaincodeItems[1].contextValue.should.equal('blockchain-installed-chaincode-item');
                chaincodeItems[1].label.should.equal('sample-food-network');

                const peerItemTwo: PeerTreeItem = channelChildrenTwo[1] as PeerTreeItem;

                const chaincodeItemsTwo: Array<InstalledChainCodeTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(peerItemTwo) as Array<InstalledChainCodeTreeItem>;

                chaincodeItemsTwo.length.should.equal(1);
                chaincodeItemsTwo[0].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                chaincodeItemsTwo[0].contextValue.should.equal('blockchain-installed-chaincode-item');
                chaincodeItemsTwo[0].label.should.equal('biscuit-network');
            });

            it('should handle no installed chaincodes', async () => {

                fabricConnection.getInstalledChaincode.withArgs('peerOne').resolves(new Map<string, Array<string>>());

                allChildren = await blockchainRuntimeExplorerProvider.getChildren();

                const channelTwo: ChannelTreeItem = allChildren[1] as ChannelTreeItem;

                const channelChildrenTwo: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(channelTwo);
                channelChildrenTwo.length.should.equal(3);

                const peerItemOne: PeerTreeItem = channelChildrenTwo[0] as PeerTreeItem;

                peerItemOne.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);

                const chaincodeItems: Array<InstalledChainCodeTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(peerItemOne) as Array<InstalledChainCodeTreeItem>;

                chaincodeItems.length.should.equal(0);

                const peerItemTwo: PeerTreeItem = channelChildrenTwo[1] as PeerTreeItem;

                const chaincodeItemsTwo: Array<InstalledChainCodeTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(peerItemTwo) as Array<InstalledChainCodeTreeItem>;

                chaincodeItemsTwo.length.should.equal(1);
                chaincodeItemsTwo[0].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                chaincodeItemsTwo[0].contextValue.should.equal('blockchain-installed-chaincode-item');
                chaincodeItemsTwo[0].label.should.equal('biscuit-network');
            });

            it('should handle errror getting installed chaincodes', async () => {

                fabricConnection.getInstalledChaincode.withArgs('peerOne').rejects({message: 'some error'});

                allChildren = await blockchainRuntimeExplorerProvider.getChildren();

                const channelTwo: ChannelTreeItem = allChildren[1] as ChannelTreeItem;

                const channelChildrenTwo: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(channelTwo);
                channelChildrenTwo.length.should.equal(3);

                const peerItemOne: PeerTreeItem = channelChildrenTwo[0] as PeerTreeItem;

                peerItemOne.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);

                errorSpy.should.have.been.calledWith('Error when getting installed smart contracts for peer peerOne some error');

                const chaincodeItems: Array<InstalledChainCodeTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(peerItemOne) as Array<InstalledChainCodeTreeItem>;

                chaincodeItems.length.should.equal(0);

                const peerItemTwo: PeerTreeItem = channelChildrenTwo[1] as PeerTreeItem;

                const chaincodeItemsTwo: Array<InstalledChainCodeTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(peerItemTwo) as Array<InstalledChainCodeTreeItem>;

                chaincodeItemsTwo.length.should.equal(1);
                chaincodeItemsTwo[0].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                chaincodeItemsTwo[0].contextValue.should.equal('blockchain-installed-chaincode-item');
                chaincodeItemsTwo[0].label.should.equal('biscuit-network');
            });

            it('should create the installed versions correctly', async () => {
                const channelTwo: ChannelTreeItem = allChildren[1] as ChannelTreeItem;

                const channelChildrenTwo: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(channelTwo);
                channelChildrenTwo.length.should.equal(3);

                const peerItemOne: PeerTreeItem = channelChildrenTwo[0] as PeerTreeItem;

                const chaincodeItems: Array<InstalledChainCodeTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(peerItemOne) as Array<InstalledChainCodeTreeItem>;

                const versionsItemsOne: Array<InstalledChainCodeVersionTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(chaincodeItems[0]) as Array<InstalledChainCodeVersionTreeItem>;
                versionsItemsOne.length.should.equal(2);
                versionsItemsOne[0].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                versionsItemsOne[0].contextValue.should.equal('blockchain-installed-chaincode-version-item');
                versionsItemsOne[0].label.should.equal('1.0');

                versionsItemsOne[1].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                versionsItemsOne[1].contextValue.should.equal('blockchain-installed-chaincode-version-item');
                versionsItemsOne[1].label.should.equal('1.2');

                const versionsItemsTwo: Array<InstalledChainCodeVersionTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(chaincodeItems[1]) as Array<InstalledChainCodeVersionTreeItem>;

                versionsItemsTwo.length.should.equal(1);
                versionsItemsTwo[0].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                versionsItemsTwo[0].contextValue.should.equal('blockchain-installed-chaincode-version-item');
                versionsItemsTwo[0].label.should.equal('0.6');
            });

            it('should create instantiated chaincode correctly', async () => {

                const channelOne: ChannelTreeItem = allChildren[0] as ChannelTreeItem;

                const channelChildrenOne: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(channelOne);
                channelChildrenOne.length.should.equal(2);

                const instantiatedChaincodeItemOne: InstantiatedChaincodeTreeItem = channelChildrenOne[1] as InstantiatedChaincodeTreeItem;

                instantiatedChaincodeItemOne.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                instantiatedChaincodeItemOne.contextValue.should.equal('blockchain-instantiated-chaincode-item');
                instantiatedChaincodeItemOne.label.should.equal('biscuit-network@0.7');
                instantiatedChaincodeItemOne.channel.should.equal(channelOne);
                instantiatedChaincodeItemOne.version.should.equal('0.7');

                const channelTwo: ChannelTreeItem = allChildren[1] as ChannelTreeItem;

                const channelChildrenTwo: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(channelTwo);
                channelChildrenTwo.length.should.equal(3);

                const instantiatedChaincodeItemTwo: InstantiatedChaincodeTreeItem = channelChildrenTwo[2] as InstantiatedChaincodeTreeItem;

                instantiatedChaincodeItemTwo.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                instantiatedChaincodeItemTwo.contextValue.should.equal('blockchain-instantiated-chaincode-item');
                instantiatedChaincodeItemTwo.label.should.equal('cake-network@0.10');
                instantiatedChaincodeItemTwo.channel.should.equal(channelTwo);
                instantiatedChaincodeItemTwo.version.should.equal('0.10');

                errorSpy.should.not.have.been.called;
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

            await vscode.commands.executeCommand('blockchainARuntimeExplorer.refreshEntry');

            onDidChangeTreeDataSpy.should.have.been.called;
        });

        it('should test the tree is refreshed when the refresh command is run', async () => {

            const mockTreeItem: sinon.SinonStubbedInstance<ChannelTreeItem> = sinon.createStubInstance(ChannelTreeItem);

            const blockchainRuntimeExplorerProvider: BlockchainRuntimeExplorerProvider = myExtension.getBlockchainRuntimeExplorerProvider();

            const onDidChangeTreeDataSpy: sinon.SinonSpy = mySandBox.spy(blockchainRuntimeExplorerProvider['_onDidChangeTreeData'], 'fire');

            await vscode.commands.executeCommand('blockchainARuntimeExplorer.refreshEntry', mockTreeItem);

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
            mySandBox.stub(FabricRuntimeManager.instance().get('local_fabric'), 'isRunning').resolves(false);
            const blockchainRuntimeExplorerProvider: BlockchainRuntimeExplorerProvider = myExtension.getBlockchainRuntimeExplorerProvider();
            const allChildren: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren();

            const result: RuntimeTreeItem = blockchainRuntimeExplorerProvider.getTreeItem(allChildren[0]) as RuntimeTreeItem;

            result.label.should.equal('Local fabric runtime is stopped. Click to start.');
        });
    });
});
