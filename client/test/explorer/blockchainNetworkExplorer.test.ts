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
import * as path from 'path';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';

import { ConnectionTreeItem } from '../../src/explorer/model/ConnectionTreeItem';
import { ConnectionIdentityTreeItem } from '../../src/explorer/model/ConnectionIdentityTreeItem';
import { AddConnectionTreeItem } from '../../src/explorer/model/AddConnectionTreeItem';
import { FabricConnection } from '../../src/fabric/FabricConnection';
import { BlockchainTreeItem } from '../../src/explorer/model/BlockchainTreeItem';
import { BlockchainNetworkExplorerProvider } from '../../src/explorer/BlockchainNetworkExplorer';
import { ChannelTreeItem } from '../../src/explorer/model/ChannelTreeItem';
import { PeersTreeItem } from '../../src/explorer/model/PeersTreeItem';
import { InstantiatedChainCodesTreeItem } from '../../src/explorer/model/InstantiatedChaincodesTreeItem';
import { PeerTreeItem } from '../../src/explorer/model/PeerTreeItem';
import { ChainCodeTreeItem } from '../../src/explorer/model/ChainCodeTreeItem';
import { InstalledChainCodeTreeItem } from '../../src/explorer/model/InstalledChainCodeTreeItem';
import { InstalledChainCodeVersionTreeItem } from '../../src/explorer/model/InstalledChaincodeVersionTreeItem';
import { FabricConnectionManager } from '../../src/fabric/FabricConnectionManager';
import { ExtensionUtil } from '../../src/util/ExtensionUtil';
import { TestUtil } from '../TestUtil';
import { RuntimeTreeItem } from '../../src/explorer/model/RuntimeTreeItem';

chai.use(sinonChai);
const should = chai.should();

class TestFabricConnection extends FabricConnection {

    async connect(): Promise<void> {
        return;
    }
}

// tslint:disable no-unused-expression
describe('BlockchainNetworkExplorer', () => {

    before(async () => {
        await TestUtil.setupTests();
    });

    describe('constructor', () => {

        let mySandBox: sinon.SinonSandbox;

        beforeEach(async () => {
            mySandBox = sinon.createSandbox();
        });

        afterEach(() => {
            mySandBox.restore();
        });

        it('should register for connected events from the connection manager', async () => {
            const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
            mySandBox.stub(blockchainNetworkExplorerProvider, 'connect').resolves();
            mySandBox.stub(blockchainNetworkExplorerProvider, 'disconnect').resolves();
            const mockConnection: sinon.SinonStubbedInstance<TestFabricConnection> = sinon.createStubInstance(TestFabricConnection);
            const connectionManager: FabricConnectionManager = FabricConnectionManager.instance();
            connectionManager.emit('connected', mockConnection);
            blockchainNetworkExplorerProvider.connect.should.have.been.calledOnceWithExactly(mockConnection);
        });

        it('should display errors from connected events', async () => {
            const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
            mySandBox.stub(blockchainNetworkExplorerProvider, 'connect').rejects(new Error('wow such error'));
            mySandBox.stub(blockchainNetworkExplorerProvider, 'disconnect').resolves();
            const mockConnection: sinon.SinonStubbedInstance<TestFabricConnection> = sinon.createStubInstance(TestFabricConnection);
            const connectionManager: FabricConnectionManager = FabricConnectionManager.instance();
            const showErrorMessageSpy: sinon.SinonSpy = mySandBox.spy(vscode.window, 'showErrorMessage');
            connectionManager.emit('connected', mockConnection);
            // Need to ensure the event handler gets a chance to run.
            await new Promise((resolve, reject) => setTimeout(resolve, 50));
            blockchainNetworkExplorerProvider.connect.should.have.been.calledOnceWithExactly(mockConnection);
            showErrorMessageSpy.should.have.been.calledOnceWithExactly('Error handling connected event: wow such error');
        });

        it('should register for disconnected events from the connection manager', async () => {
            const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
            mySandBox.stub(blockchainNetworkExplorerProvider, 'connect').resolves();
            mySandBox.stub(blockchainNetworkExplorerProvider, 'disconnect').resolves();
            const connectionManager: FabricConnectionManager = FabricConnectionManager.instance();
            connectionManager.emit('disconnected');
            blockchainNetworkExplorerProvider.disconnect.should.have.been.calledOnceWithExactly();
        });

        it('should display errors from disconnected events', async () => {
            const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
            mySandBox.stub(blockchainNetworkExplorerProvider, 'connect').resolves();
            mySandBox.stub(blockchainNetworkExplorerProvider, 'disconnect').rejects(new Error('wow such error'));
            const connectionManager: FabricConnectionManager = FabricConnectionManager.instance();
            const showErrorMessageSpy: sinon.SinonSpy = mySandBox.spy(vscode.window, 'showErrorMessage');
            connectionManager.emit('disconnected');
            // Need to ensure the event handler gets a chance to run.
            await new Promise((resolve, reject) => setTimeout(resolve, 50));
            blockchainNetworkExplorerProvider.disconnect.should.have.been.calledOnceWithExactly();
            showErrorMessageSpy.should.have.been.calledOnceWithExactly('Error handling disconnected event: wow such error');
        });
    });

    describe('getChildren', () => {

        describe('unconnected tree', () => {

            let mySandBox;

            beforeEach(async () => {
                mySandBox = sinon.createSandbox();

                await ExtensionUtil.activateExtension();
            });

            afterEach(() => {
                mySandBox.restore();
            });

            it('should test a connection tree is created with add connection at the end', async () => {
                const blockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
                const allChildren = await blockchainNetworkExplorerProvider.getChildren();

                const addNetwork = allChildren[allChildren.length - 1];

                addNetwork.should.be.instanceOf(AddConnectionTreeItem);

                addNetwork.tooltip.should.equal('Add new connection');
                addNetwork.label.should.equal('Add new connection');
            });

            it('should display connection that has been added in alphabetical order', async () => {
                const connections: Array<any> = [];

                const rootPath = path.dirname(__dirname);

                connections.push({
                    name: 'myConnectionB',
                    connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json'),
                    identities: [{
                        certificatePath: path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'),
                        privateKeyPath: path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey')
                    }]
                });

                connections.push({
                    name: 'myConnectionC',
                    connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                    identities: [{
                        certificatePath: path.join(rootPath, '../../test/data/connectionOne/credentials/certificate'),
                        privateKeyPath: path.join(rootPath, '../../test/data/connectionOne/credentials/privateKey')
                    }]
                });

                connections.push({
                    name: 'myConnectionA',
                    connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json'),
                    identities: [{
                        certificatePath: path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'),
                        privateKeyPath: path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey')
                    }]
                });

                connections.push({
                    name: 'myConnectionA',
                    connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json'),
                    identities: [{
                        certificatePath: path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'),
                        privateKeyPath: path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey')
                    }]
                });

                await vscode.workspace.getConfiguration().update('fabric.connections', connections, vscode.ConfigurationTarget.Global);

                const blockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
                const allChildren = await blockchainNetworkExplorerProvider.getChildren();

                allChildren.length.should.equal(5);
                allChildren[0].label.should.equal('myConnectionA');
                allChildren[1].label.should.equal('myConnectionA');
                allChildren[2].label.should.equal('myConnectionB');
                allChildren[3].label.should.equal('myConnectionC');
                allChildren[4].label.should.equal('Add new connection');
            });

            it('should display connections with single identities', async () => {
                const connections: Array<any> = [];

                const rootPath = path.dirname(__dirname);

                const myConnection = {
                    name: 'myConnection',
                    connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json'),
                    identities: [{
                        certificatePath: path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'),
                        privateKeyPath: path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey')
                    }]
                };

                connections.push(myConnection);

                await vscode.workspace.getConfiguration().update('fabric.connections', connections, vscode.ConfigurationTarget.Global);

                const blockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
                const allChildren = await blockchainNetworkExplorerProvider.getChildren();

                const myCommand = {
                    command: 'blockchainExplorer.connectEntry',
                    title: '',
                    arguments: ['myConnection']
                };

                allChildren.length.should.equal(2);
                const connectionTreeItem = allChildren[0] as ConnectionTreeItem;
                connectionTreeItem.label.should.equal('myConnection');
                connectionTreeItem.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                connectionTreeItem.connection.should.deep.equal(myConnection);
                connectionTreeItem.command.should.deep.equal(myCommand);
                allChildren[1].label.should.equal('Add new connection');
            });

            it('should display connections with multiple identities', async () => {
                const connections: Array<any> = [];

                const rootPath = path.dirname(__dirname);

                const myConnection = {
                    name: 'myConnection',
                    connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json'),
                    identities: [{
                        certificatePath: path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'),
                        privateKeyPath: path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey')
                    },
                        {
                            certificatePath: path.join(rootPath, '../../test/data/connectionOne/credentials/certificate'),
                            privateKeyPath: path.join(rootPath, '../../test/data/connectionOne/credentials/privateKey')
                        }]
                };

                connections.push(myConnection);

                await vscode.workspace.getConfiguration().update('fabric.connections', connections, vscode.ConfigurationTarget.Global);

                const blockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
                const allChildren = await blockchainNetworkExplorerProvider.getChildren();

                allChildren.length.should.equal(2);
                allChildren.length.should.equal(2);
                const connectionTreeItem = allChildren[0] as ConnectionTreeItem;
                connectionTreeItem.label.should.equal('myConnection');
                connectionTreeItem.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                connectionTreeItem.connection.should.deep.equal(myConnection);
                should.not.exist(connectionTreeItem.command);
                allChildren[1].label.should.equal('Add new connection');

                const myCommandOne = {
                    command: 'blockchainExplorer.connectEntry',
                    title: '',
                    arguments: ['myConnection', 'Admin@org1.example.com']
                };

                const myCommandTwo = {
                    command: 'blockchainExplorer.connectEntry',
                    title: '',
                    arguments: ['myConnection', 'Admin@org1.example.com']
                };

                const identityChildren = await blockchainNetworkExplorerProvider.getChildren(connectionTreeItem);
                identityChildren.length.should.equal(2);

                const identityChildOne = identityChildren[0] as ConnectionIdentityTreeItem;
                identityChildOne.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                identityChildOne.contextValue.should.equal('blockchain-connection-identity-item');
                identityChildOne.label.should.equal('Admin@org1.example.com');
                identityChildOne.command.should.deep.equal(myCommandOne);

                const identityChildTwo = identityChildren[1] as ConnectionIdentityTreeItem;
                identityChildTwo.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                identityChildTwo.contextValue.should.equal('blockchain-connection-identity-item');
                identityChildTwo.label.should.equal('Admin@org1.example.com');
                identityChildTwo.command.should.deep.equal(myCommandTwo);
            });

            it('should throw an error if cert can\'t be parsed with multiple identities', async () => {
                const connections: Array<any> = [];

                const rootPath = path.dirname(__dirname);

                const myConnection = {
                    name: 'myConnection',
                    connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json'),
                    identities: [{
                        certificatePath: path.join(rootPath, '../../test/data/connectionTwo/credentials/badPath/certificate'),
                        privateKeyPath: path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey')
                    },
                        {
                            certificatePath: path.join(rootPath, '../../test/data/connectionOne/credentials/certificate'),
                            privateKeyPath: path.join(rootPath, '../../test/data/connectionOne/credentials/privateKey')
                        }]
                };

                connections.push(myConnection);

                await vscode.workspace.getConfiguration().update('fabric.connections', connections, vscode.ConfigurationTarget.Global);

                const blockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
                const allChildren = await blockchainNetworkExplorerProvider.getChildren();

                allChildren.length.should.equal(2);
                allChildren.length.should.equal(2);

                const connectionTreeItem = allChildren[0] as ConnectionTreeItem;

                connectionTreeItem.label.should.equal('myConnection');
                connectionTreeItem.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                connectionTreeItem.connection.should.deep.equal(myConnection);
                should.not.exist(connectionTreeItem.command);
                allChildren[1].label.should.equal('Add new connection');

                const errorSpy = mySandBox.spy(vscode.window, 'showErrorMessage');

                await blockchainNetworkExplorerProvider.getChildren(connectionTreeItem);

                errorSpy.should.have.been.calledWith(sinon.match((value) => {
                    return value.startsWith('Error parsing certificate ENOENT: no such file or directory');
                }));
            });

            it('should handle error with tree', async () => {
                const connections: Array<any> = [];

                const rootPath = path.dirname(__dirname);

                const myConnection = {
                    name: 'myConnection',
                    connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json'),
                    identities: [{
                        certificatePath: path.join(rootPath, '../../test/data/connectionTwo/credentials/badPath/certificate'),
                        privateKeyPath: path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey')
                    }]
                };

                connections.push(myConnection);

                await vscode.workspace.getConfiguration().update('fabric.connections', connections, vscode.ConfigurationTarget.Global);

                const blockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();

                const errorSpy = mySandBox.spy(vscode.window, 'showErrorMessage');

                mySandBox.stub(blockchainNetworkExplorerProvider, 'createConnectionTree').rejects({message: 'some error'});

                await blockchainNetworkExplorerProvider.getChildren();

                errorSpy.should.have.been.calledWith('some error');
            });

            it('should display managed runtimes with single identities', async () => {
                const connections: Array<any> = [];

                const myConnection = {
                    name: 'myRuntimeConnection',
                    managedRuntime: true
                };

                connections.push(myConnection);

                await vscode.workspace.getConfiguration().update('fabric.connections', connections, vscode.ConfigurationTarget.Global);

                const blockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
                const allChildren = await blockchainNetworkExplorerProvider.getChildren();

                const myCommand = {
                    command: 'blockchainExplorer.connectEntry',
                    title: '',
                    arguments: ['myRuntimeConnection']
                };

                allChildren.length.should.equal(2);
                allChildren[0].should.be.an.instanceOf(RuntimeTreeItem);
                const runtimeTreeItem = allChildren[0] as RuntimeTreeItem;
                runtimeTreeItem.label.should.equal('myRuntimeConnection');
                runtimeTreeItem.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                runtimeTreeItem.connection.should.deep.equal(myConnection);
                runtimeTreeItem.command.should.deep.equal(myCommand);
                allChildren[1].label.should.equal('Add new connection');
            });

        });

        describe('connected tree', () => {

            let mySandBox: sinon.SinonSandbox;
            let allChildren: Array<BlockchainTreeItem>;
            let blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider;
            let fabricConnection;

            beforeEach(async () => {
                mySandBox = sinon.createSandbox();

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

                blockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
                blockchainNetworkExplorerProvider['connection'] = ((fabricConnection as any) as FabricConnection);

                allChildren = await blockchainNetworkExplorerProvider.getChildren();
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

                const channelChildrenOne: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren(channelOne);
                channelChildrenOne.length.should.equal(2);

                const peersItemOne: PeersTreeItem = channelChildrenOne[0] as PeersTreeItem;
                peersItemOne.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                peersItemOne.contextValue.should.equal('blockchain-peers-item');
                peersItemOne.label.should.equal('Peers');
                peersItemOne.peers.should.deep.equal(['peerOne']);

                const instantiatedTreeItemOne: InstantiatedChainCodesTreeItem = channelChildrenOne[1] as InstantiatedChainCodesTreeItem;
                instantiatedTreeItemOne.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                instantiatedTreeItemOne.chaincodes.should.deep.equal([{name: 'biscuit-network', version: '0.7'}]);
                instantiatedTreeItemOne.contextValue.should.equal('blockchain-instantiated-chaincodes-item');
                instantiatedTreeItemOne.label.should.equal('Instantiated Chaincodes');

                const channelTwo: ChannelTreeItem = allChildren[1] as ChannelTreeItem;
                const channelChildrenTwo: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren(channelTwo);
                channelChildrenTwo.length.should.equal(2);

                const peersItemTwo: PeersTreeItem = channelChildrenTwo[0] as PeersTreeItem;
                peersItemTwo.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                peersItemTwo.contextValue.should.equal('blockchain-peers-item');
                peersItemTwo.label.should.equal('Peers');
                peersItemTwo.peers.should.deep.equal(['peerOne', 'peerTwo']);

                const instantiatedTreeItemTwo: InstantiatedChainCodesTreeItem = channelChildrenTwo[1] as InstantiatedChainCodesTreeItem;
                instantiatedTreeItemTwo.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                instantiatedTreeItemTwo.chaincodes.should.deep.equal([{name: 'cake-network', version: '0.10'}]);
                instantiatedTreeItemTwo.contextValue.should.equal('blockchain-instantiated-chaincodes-item');
                instantiatedTreeItemTwo.label.should.equal('Instantiated Chaincodes');
            });

            it('should not create anything if no peers', async () => {

                fabricConnection.getAllPeerNames.returns([]);

                allChildren = await blockchainNetworkExplorerProvider.getChildren();

                allChildren.length.should.equal(0);
            });

            it('should not create instantiated chaincodes if no chaincodes', async () => {

                fabricConnection.getInstantiatedChaincode.withArgs('channelOne').resolves([]);

                allChildren = await blockchainNetworkExplorerProvider.getChildren();

                allChildren.length.should.equal(2);

                const channelOne: ChannelTreeItem = allChildren[0] as ChannelTreeItem;
                channelOne.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);

                const channelChildrenOne: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren(channelOne);
                channelChildrenOne.length.should.equal(1);

                const peersItemOne: PeersTreeItem = channelChildrenOne[0] as PeersTreeItem;
                peersItemOne.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                peersItemOne.contextValue.should.equal('blockchain-peers-item');
                peersItemOne.label.should.equal('Peers');
                peersItemOne.peers.should.deep.equal(['peerOne']);

                const channelTwo: ChannelTreeItem = allChildren[1] as ChannelTreeItem;
                const channelChildrenTwo: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren(channelTwo);
                channelChildrenTwo.length.should.equal(2);

                const peersItemTwo: PeersTreeItem = channelChildrenTwo[0] as PeersTreeItem;
                peersItemTwo.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                peersItemTwo.contextValue.should.equal('blockchain-peers-item');
                peersItemTwo.label.should.equal('Peers');
                peersItemTwo.peers.should.deep.equal(['peerOne', 'peerTwo']);

                const instantiatedTreeItemTwo: InstantiatedChainCodesTreeItem = channelChildrenTwo[1] as InstantiatedChainCodesTreeItem;
                instantiatedTreeItemTwo.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                instantiatedTreeItemTwo.chaincodes.should.deep.equal([{name: 'cake-network', version: '0.10'}]);
                instantiatedTreeItemTwo.contextValue.should.equal('blockchain-instantiated-chaincodes-item');
                instantiatedTreeItemTwo.label.should.equal('Instantiated Chaincodes');
            });

            it('should error if problem with instatiate chaincodes', async () => {

                fabricConnection.getInstantiatedChaincode.withArgs('channelOne').rejects({message: 'some error'});

                const errorSpy = mySandBox.spy(vscode.window, 'showErrorMessage');

                allChildren = await blockchainNetworkExplorerProvider.getChildren();

                errorSpy.should.have.been.calledWith('Error getting instantiated chaincode for channel channelOne some error');

                allChildren.length.should.equal(2);

                const channelOne: ChannelTreeItem = allChildren[0] as ChannelTreeItem;

                const channelChildrenOne: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren(channelOne);
                channelChildrenOne.length.should.equal(1);

                const peersItemOne: PeersTreeItem = channelChildrenOne[0] as PeersTreeItem;
                peersItemOne.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                peersItemOne.contextValue.should.equal('blockchain-peers-item');
                peersItemOne.label.should.equal('Peers');
                peersItemOne.peers.should.deep.equal(['peerOne']);

                const channelTwo: ChannelTreeItem = allChildren[1] as ChannelTreeItem;
                const channelChildrenTwo: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren(channelTwo);
                channelChildrenTwo.length.should.equal(2);

                const peersItemTwo: PeersTreeItem = channelChildrenTwo[0] as PeersTreeItem;
                peersItemTwo.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                peersItemTwo.contextValue.should.equal('blockchain-peers-item');
                peersItemTwo.label.should.equal('Peers');
                peersItemTwo.peers.should.deep.equal(['peerOne', 'peerTwo']);
            });

            it('should create the peers correctly', async () => {

                const channelOne: ChannelTreeItem = allChildren[0] as ChannelTreeItem;

                const channelChildrenOne: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren(channelOne);
                channelChildrenOne.length.should.equal(2);

                const peersItemOne: PeersTreeItem = channelChildrenOne[0] as PeersTreeItem;

                const peerItems: Array<PeerTreeItem> = await blockchainNetworkExplorerProvider.getChildren(peersItemOne) as Array<PeerTreeItem>;

                peerItems.length.should.equal(1);
                peerItems[0].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                peerItems[0].contextValue.should.equal('blockchain-peer-item');
                peerItems[0].label.should.equal('peerOne');

                const channelTwo: ChannelTreeItem = allChildren[1] as ChannelTreeItem;

                const channelChildrenTwo: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren(channelTwo);
                channelChildrenTwo.length.should.equal(2);

                const peersItemTwo: PeersTreeItem = channelChildrenTwo[0] as PeersTreeItem;

                const peerItemsTwo: Array<PeerTreeItem> = await blockchainNetworkExplorerProvider.getChildren(peersItemTwo) as Array<PeerTreeItem>;

                peerItemsTwo.length.should.equal(2);
                peerItemsTwo[0].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                peerItemsTwo[0].contextValue.should.equal('blockchain-peer-item');
                peerItemsTwo[0].label.should.equal('peerOne');

                peerItemsTwo[1].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                peerItemsTwo[1].contextValue.should.equal('blockchain-peer-item');
                peerItemsTwo[1].label.should.equal('peerTwo');
            });

            it('should create the install chaincode correctly', async () => {

                const channelTwo: ChannelTreeItem = allChildren[1] as ChannelTreeItem;

                const channelChildrenTwo: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren(channelTwo);
                channelChildrenTwo.length.should.equal(2);

                const peersItemOne: PeersTreeItem = channelChildrenTwo[0] as PeersTreeItem;

                const peerItems: Array<PeerTreeItem> = await blockchainNetworkExplorerProvider.getChildren(peersItemOne) as Array<PeerTreeItem>;

                const chaincodeItems: Array<InstalledChainCodeTreeItem> = await blockchainNetworkExplorerProvider.getChildren(peerItems[0]) as Array<InstalledChainCodeTreeItem>;

                chaincodeItems.length.should.equal(2);
                chaincodeItems[0].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                chaincodeItems[0].contextValue.should.equal('blockchain-installed-chaincode-item');
                chaincodeItems[0].label.should.equal('sample-car-network');

                chaincodeItems[1].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                chaincodeItems[1].contextValue.should.equal('blockchain-installed-chaincode-item');
                chaincodeItems[1].label.should.equal('sample-food-network');

                const chaincodeItemsTwo: Array<ChainCodeTreeItem> = await blockchainNetworkExplorerProvider.getChildren(peerItems[1]) as Array<ChainCodeTreeItem>;

                chaincodeItemsTwo.length.should.equal(1);
                chaincodeItemsTwo[0].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                chaincodeItemsTwo[0].contextValue.should.equal('blockchain-installed-chaincode-item');
                chaincodeItemsTwo[0].label.should.equal('biscuit-network');
            });

            it('should handle no installed chaincodes', async () => {

                fabricConnection.getInstalledChaincode.withArgs('peerOne').resolves(new Map<string, Array<string>>());

                allChildren = await blockchainNetworkExplorerProvider.getChildren();

                const channelTwo: ChannelTreeItem = allChildren[1] as ChannelTreeItem;

                const channelChildrenTwo: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren(channelTwo);
                channelChildrenTwo.length.should.equal(2);

                const peersItemOne: PeersTreeItem = channelChildrenTwo[0] as PeersTreeItem;

                const peerItems: Array<PeerTreeItem> = await blockchainNetworkExplorerProvider.getChildren(peersItemOne) as Array<PeerTreeItem>;

                peerItems[0].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);

                const chaincodeItems: Array<InstalledChainCodeTreeItem> = await blockchainNetworkExplorerProvider.getChildren(peerItems[0]) as Array<InstalledChainCodeTreeItem>;

                chaincodeItems.length.should.equal(0);

                const chaincodeItemsTwo: Array<ChainCodeTreeItem> = await blockchainNetworkExplorerProvider.getChildren(peerItems[1]) as Array<ChainCodeTreeItem>;

                chaincodeItemsTwo.length.should.equal(1);
                chaincodeItemsTwo[0].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                chaincodeItemsTwo[0].contextValue.should.equal('blockchain-installed-chaincode-item');
                chaincodeItemsTwo[0].label.should.equal('biscuit-network');
            });

            it('should handle errror getting installed chaincodes', async () => {

                fabricConnection.getInstalledChaincode.withArgs('peerOne').rejects({message: 'some error'});

                const errorSpy = mySandBox.spy(vscode.window, 'showErrorMessage');

                allChildren = await blockchainNetworkExplorerProvider.getChildren();

                const channelTwo: ChannelTreeItem = allChildren[1] as ChannelTreeItem;

                const channelChildrenTwo: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren(channelTwo);
                channelChildrenTwo.length.should.equal(2);

                const peersItemOne: PeersTreeItem = channelChildrenTwo[0] as PeersTreeItem;

                const peerItems: Array<PeerTreeItem> = await blockchainNetworkExplorerProvider.getChildren(peersItemOne) as Array<PeerTreeItem>;

                peerItems[0].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);

                errorSpy.should.have.been.calledWith('Error when getting installed chaincodes for peer peerOne some error');

                const chaincodeItems: Array<InstalledChainCodeTreeItem> = await blockchainNetworkExplorerProvider.getChildren(peerItems[0]) as Array<InstalledChainCodeTreeItem>;

                chaincodeItems.length.should.equal(0);

                const chaincodeItemsTwo: Array<ChainCodeTreeItem> = await blockchainNetworkExplorerProvider.getChildren(peerItems[1]) as Array<ChainCodeTreeItem>;

                chaincodeItemsTwo.length.should.equal(1);
                chaincodeItemsTwo[0].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                chaincodeItemsTwo[0].contextValue.should.equal('blockchain-installed-chaincode-item');
                chaincodeItemsTwo[0].label.should.equal('biscuit-network');
            });

            it('should create the installed versions correctly', async () => {
                const channelTwo: ChannelTreeItem = allChildren[1] as ChannelTreeItem;

                const channelChildrenTwo: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren(channelTwo);
                channelChildrenTwo.length.should.equal(2);

                const peersItemOne: PeersTreeItem = channelChildrenTwo[0] as PeersTreeItem;

                const peerItems: Array<PeerTreeItem> = await blockchainNetworkExplorerProvider.getChildren(peersItemOne) as Array<PeerTreeItem>;

                const chaincodeItems: Array<InstalledChainCodeTreeItem> = await blockchainNetworkExplorerProvider.getChildren(peerItems[0]) as Array<InstalledChainCodeTreeItem>;

                const versionsItemsOne: Array<InstalledChainCodeVersionTreeItem> = await blockchainNetworkExplorerProvider.getChildren(chaincodeItems[0]) as Array<InstalledChainCodeVersionTreeItem>;
                versionsItemsOne.length.should.equal(2);
                versionsItemsOne[0].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                versionsItemsOne[0].contextValue.should.equal('blockchain-installed-chaincode-version-item');
                versionsItemsOne[0].label.should.equal('1.0');

                versionsItemsOne[1].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                versionsItemsOne[1].contextValue.should.equal('blockchain-installed-chaincode-version-item');
                versionsItemsOne[1].label.should.equal('1.2');

                const versionsItemsTwo: Array<InstalledChainCodeVersionTreeItem> = await blockchainNetworkExplorerProvider.getChildren(chaincodeItems[1]) as Array<InstalledChainCodeVersionTreeItem>;

                versionsItemsTwo.length.should.equal(1);
                versionsItemsTwo[0].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                versionsItemsTwo[0].contextValue.should.equal('blockchain-installed-chaincode-version-item');
                versionsItemsTwo[0].label.should.equal('0.6');

            });

            it('should create instantiated chaincode correctly', async () => {

                const channelOne: ChannelTreeItem = allChildren[0] as ChannelTreeItem;

                const channelChildrenOne: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren(channelOne);
                channelChildrenOne.length.should.equal(2);

                const instatiateChaincodesItemOne: InstantiatedChainCodesTreeItem = channelChildrenOne[1] as InstantiatedChainCodesTreeItem;

                const instantiatedChainItemsOne: Array<ChainCodeTreeItem> = await blockchainNetworkExplorerProvider.getChildren(instatiateChaincodesItemOne) as Array<ChainCodeTreeItem>;

                instantiatedChainItemsOne.length.should.equal(1);
                instantiatedChainItemsOne[0].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                instantiatedChainItemsOne[0].contextValue.should.equal('blockchain-chaincode-item');
                instantiatedChainItemsOne[0].label.should.equal('biscuit-network - 0.7');

                const channelTwo: ChannelTreeItem = allChildren[1] as ChannelTreeItem;

                const channelChildrenTwo: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren(channelTwo);
                channelChildrenTwo.length.should.equal(2);

                const instatiateChaincodesItemTwo: InstantiatedChainCodesTreeItem = channelChildrenTwo[1] as InstantiatedChainCodesTreeItem;

                const instantiatedChainItemsTwo: Array<ChainCodeTreeItem> = await blockchainNetworkExplorerProvider.getChildren(instatiateChaincodesItemTwo) as Array<ChainCodeTreeItem>;

                instantiatedChainItemsTwo.length.should.equal(1);
                instantiatedChainItemsTwo[0].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                instantiatedChainItemsTwo[0].contextValue.should.equal('blockchain-chaincode-item');
                instantiatedChainItemsTwo[0].label.should.equal('cake-network - 0.10');
            });
        });
    });

    describe('refresh', () => {

        let mySandBox;

        beforeEach(async () => {
            mySandBox = sinon.createSandbox();

            await ExtensionUtil.activateExtension();
        });

        afterEach(() => {
            mySandBox.restore();
        });

        it('should test the tree is refreshed when the refresh command is run', async () => {

            const blockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();

            const onDidChangeTreeDataSpy = mySandBox.spy(blockchainNetworkExplorerProvider['_onDidChangeTreeData'], 'fire');

            await vscode.commands.executeCommand('blockchainExplorer.refreshEntry');

            onDidChangeTreeDataSpy.should.have.been.called;
        });

        it('should test the tree is refreshed when the refresh command is run', async () => {

            const mockTreeItem = sinon.createStubInstance(ConnectionTreeItem);

            const blockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();

            const onDidChangeTreeDataSpy = mySandBox.spy(blockchainNetworkExplorerProvider['_onDidChangeTreeData'], 'fire');

            await vscode.commands.executeCommand('blockchainExplorer.refreshEntry', mockTreeItem);

            onDidChangeTreeDataSpy.should.have.been.calledOnceWithExactly(mockTreeItem);
        });
    });

    describe('connect', () => {

        let mySandBox: sinon.SinonSandbox;

        beforeEach(async () => {
            mySandBox = sinon.createSandbox();

            await ExtensionUtil.activateExtension();
        });

        afterEach(() => {
            mySandBox.restore();
        });

        it('should set the current client connection', async () => {

            const blockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();

            const onDidChangeTreeDataSpy = mySandBox.spy(blockchainNetworkExplorerProvider['_onDidChangeTreeData'], 'fire');

            const myConnection = new TestFabricConnection();

            const executeCommandSpy = mySandBox.spy(vscode.commands, 'executeCommand');

            await blockchainNetworkExplorerProvider.connect(myConnection);

            onDidChangeTreeDataSpy.should.have.been.called;

            blockchainNetworkExplorerProvider['connection'].should.deep.equal(myConnection);

            executeCommandSpy.should.have.been.calledOnce;
            executeCommandSpy.getCall(0).should.have.been.calledWith('setContext', 'blockchain-connected', true);
        });
    });

    describe('disconnect', () => {

        let mySandBox;

        beforeEach(async () => {
            mySandBox = sinon.createSandbox();

            await ExtensionUtil.activateExtension();
        });

        afterEach(() => {
            mySandBox.restore();
        });

        it('should disconnect the client connection', async () => {
            const myConnection = new TestFabricConnection();

            const blockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
            blockchainNetworkExplorerProvider['connection'] = myConnection;

            const onDidChangeTreeDataSpy = mySandBox.spy(blockchainNetworkExplorerProvider['_onDidChangeTreeData'], 'fire');

            const executeCommandSpy = mySandBox.spy(vscode.commands, 'executeCommand');

            await blockchainNetworkExplorerProvider.disconnect();

            onDidChangeTreeDataSpy.should.have.been.called;

            should.not.exist(blockchainNetworkExplorerProvider['connection']);

            executeCommandSpy.should.have.been.calledOnce;
            executeCommandSpy.getCall(0).should.have.been.calledWith('setContext', 'blockchain-connected', false);
        });
    });

    describe('getTreeItem', () => {

        let mySandBox;

        beforeEach(async () => {
            mySandBox = sinon.createSandbox();

            await ExtensionUtil.activateExtension();
        });

        afterEach(() => {
            mySandBox.restore();
        });

        it('should get a tree item', async () => {
            const connections: Array<any> = [];

            const rootPath = path.dirname(__dirname);

            const myConnection = {
                name: 'myConnection',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json'),
                identities: [{
                    certificatePath: path.join(rootPath, '../../test/data/connectionTwo/credentials/badPath/certificate'),
                    privateKeyPath: path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey')
                },
                    {
                        certificatePath: path.join(rootPath, '../../test/data/connectionOne/credentials/certificate'),
                        privateKeyPath: path.join(rootPath, '../../test/data/connectionOne/credentials/privateKey')
                    }]
            };

            connections.push(myConnection);

            await vscode.workspace.getConfiguration().update('fabric.connections', connections, vscode.ConfigurationTarget.Global);

            const blockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
            const allChildren: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren();

            const result: ConnectionTreeItem = blockchainNetworkExplorerProvider.getTreeItem(allChildren[0]) as ConnectionTreeItem;

            result.label.should.equal('myConnection');
        });
    });
});
