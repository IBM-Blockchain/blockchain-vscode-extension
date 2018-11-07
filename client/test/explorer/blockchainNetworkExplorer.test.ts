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
import { InstantiatedChaincodeParentTreeItem } from '../../src/explorer/model/InstantiatedChaincodeParentTreeItem';
import { PeerTreeItem } from '../../src/explorer/model/PeerTreeItem';
import { InstalledChainCodeTreeItem } from '../../src/explorer/model/InstalledChainCodeTreeItem';
import { InstalledChainCodeVersionTreeItem } from '../../src/explorer/model/InstalledChaincodeVersionTreeItem';
import { FabricConnectionManager } from '../../src/fabric/FabricConnectionManager';
import { ExtensionUtil } from '../../src/util/ExtensionUtil';
import { TestUtil } from '../TestUtil';
import { RuntimeTreeItem } from '../../src/explorer/model/RuntimeTreeItem';
import { FabricRuntime } from '../../src/fabric/FabricRuntime';
import { FabricRuntimeManager } from '../../src/fabric/FabricRuntimeManager';
import { FabricConnectionRegistry } from '../../src/fabric/FabricConnectionRegistry';
import { FabricConnectionRegistryEntry } from '../../src/fabric/FabricConnectionRegistryEntry';
import { FabricConnectionHelper } from '../../src/fabric/FabricConnectionHelper';
import { ConnectionPropertyTreeItem } from '../../src/explorer/model/ConnectionPropertyTreeItem';
import { TransactionTreeItem } from '../../src/explorer/model/TransactionTreeItem';
import { InstantiatedChaincodeChildTreeItem } from '../../src/explorer/model/InstantiatedChaincodeChildTreeItem';

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
describe('BlockchainNetworkExplorer', () => {

    before(async () => {
        await TestUtil.setupTests();
        await TestUtil.storeConnectionsConfig();
        await TestUtil.storeRuntimesConfig();
    });

    after(async () => {
        await TestUtil.restoreConnectionsConfig();
        await TestUtil.restoreRuntimesConfig();
    });

    beforeEach(async () => {
        await vscode.workspace.getConfiguration().update('fabric.runtimes', [], vscode.ConfigurationTarget.Global);
        await vscode.workspace.getConfiguration().update('fabric.connections', [], vscode.ConfigurationTarget.Global);
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
            await new Promise((resolve: any): any => setTimeout(resolve, 50));
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
            await new Promise((resolve: any): any => setTimeout(resolve, 50));
            blockchainNetworkExplorerProvider.disconnect.should.have.been.calledOnceWithExactly();
            showErrorMessageSpy.should.have.been.calledOnceWithExactly('Error handling disconnected event: wow such error');
        });
    });

    describe('getChildren', () => {

        describe('unconnected tree', () => {

            let mySandBox: sinon.SinonSandbox;
            let getConnectionStub: sinon.SinonStub;
            beforeEach(async () => {
                mySandBox = sinon.createSandbox();
                getConnectionStub = mySandBox.stub(FabricConnectionManager.instance(), 'getConnection');

                await ExtensionUtil.activateExtension();
            });

            afterEach(() => {
                mySandBox.restore();
            });

            it('should test a connection tree is created with add connection at the end', async () => {
                const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
                const allChildren: BlockchainTreeItem[] = await blockchainNetworkExplorerProvider.getChildren();

                const addNetwork: BlockchainTreeItem = allChildren[allChildren.length - 1];

                addNetwork.should.be.instanceOf(AddConnectionTreeItem);

                addNetwork.tooltip.should.equal('+ Add new connection');
                addNetwork.label.should.equal('+ Add new connection');
            });

            it('should display connection that has been added in alphabetical order', async () => {
                const connections: Array<any> = [];

                const rootPath: string = path.dirname(__dirname);

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

                const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
                const allChildren: BlockchainTreeItem[] = await blockchainNetworkExplorerProvider.getChildren();

                allChildren.length.should.equal(5);
                allChildren[0].label.should.equal('myConnectionA');
                allChildren[1].label.should.equal('myConnectionA');
                allChildren[2].label.should.equal('myConnectionB');
                allChildren[3].label.should.equal('myConnectionC');
                allChildren[4].label.should.equal('+ Add new connection');
            });

            it('should display connections with single identities', async () => {
                const connections: Array<any> = [];

                const rootPath: string = path.dirname(__dirname);

                const myConnection: any = {
                    name: 'myConnection',
                    connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json'),
                    identities: [{
                        certificatePath: path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'),
                        privateKeyPath: path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey')
                    }]
                };

                connections.push(myConnection);

                await vscode.workspace.getConfiguration().update('fabric.connections', connections, vscode.ConfigurationTarget.Global);

                const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
                const allChildren: BlockchainTreeItem[] = await blockchainNetworkExplorerProvider.getChildren();

                const myCommand: vscode.Command = {
                    command: 'blockchainExplorer.connectEntry',
                    title: '',
                    arguments: [FabricConnectionRegistry.instance().get('myConnection')]
                };

                allChildren.length.should.equal(2);
                const connectionTreeItem: ConnectionTreeItem = allChildren[0] as ConnectionTreeItem;
                connectionTreeItem.label.should.equal('myConnection');
                connectionTreeItem.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                connectionTreeItem.connection.should.deep.equal(FabricConnectionRegistry.instance().get('myConnection'));
                connectionTreeItem.command.should.deep.equal(myCommand);
                allChildren[1].label.should.equal('+ Add new connection');
            });

            it('should display connections with multiple identities', async () => {
                const connections: Array<any> = [];

                const rootPath: string = path.dirname(__dirname);

                const myConnection: any = {
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

                const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
                const allChildren: BlockchainTreeItem[] = await blockchainNetworkExplorerProvider.getChildren();

                allChildren.length.should.equal(2);
                allChildren.length.should.equal(2);
                const connectionTreeItem: ConnectionTreeItem = allChildren[0] as ConnectionTreeItem;
                connectionTreeItem.label.should.equal('myConnection');
                connectionTreeItem.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                connectionTreeItem.connection.should.deep.equal(FabricConnectionRegistry.instance().get('myConnection'));
                should.not.exist(connectionTreeItem.command);
                allChildren[1].label.should.equal('+ Add new connection');

                const connection: FabricConnectionRegistryEntry = FabricConnectionRegistry.instance().get('myConnection');

                const myCommandOne: vscode.Command = {
                    command: 'blockchainExplorer.connectEntry',
                    title: '',
                    arguments: [connection, connection.identities[0]]
                };

                const myCommandTwo: vscode.Command = {
                    command: 'blockchainExplorer.connectEntry',
                    title: '',
                    arguments: [connection, connection.identities[1]]
                };

                const identityChildren: BlockchainTreeItem[] = await blockchainNetworkExplorerProvider.getChildren(connectionTreeItem);
                identityChildren.length.should.equal(2);

                const identityChildOne: ConnectionIdentityTreeItem = identityChildren[0] as ConnectionIdentityTreeItem;
                identityChildOne.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                identityChildOne.contextValue.should.equal('blockchain-connection-identity-item');
                identityChildOne.label.should.equal('Admin@org1.example.com');
                identityChildOne.command.should.deep.equal(myCommandOne);

                const identityChildTwo: ConnectionIdentityTreeItem = identityChildren[1] as ConnectionIdentityTreeItem;
                identityChildTwo.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                identityChildTwo.contextValue.should.equal('blockchain-connection-identity-item');
                identityChildTwo.label.should.equal('Admin@org1.example.com');
                identityChildTwo.command.should.deep.equal(myCommandTwo);
            });

            it('should throw an error if cert can\'t be parsed with multiple identities', async () => {
                const connections: Array<any> = [];

                const rootPath: string = path.dirname(__dirname);

                const myConnection: any = {
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

                const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
                const allChildren: BlockchainTreeItem[] = await blockchainNetworkExplorerProvider.getChildren();

                allChildren.length.should.equal(2);
                allChildren.length.should.equal(2);

                const connectionTreeItem: ConnectionTreeItem = allChildren[0] as ConnectionTreeItem;

                connectionTreeItem.label.should.equal('myConnection');
                connectionTreeItem.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                connectionTreeItem.connection.should.deep.equal(myConnection);
                should.not.exist(connectionTreeItem.command);
                allChildren[1].label.should.equal('+ Add new connection');

                const errorSpy: sinon.SinonSpy = mySandBox.spy(vscode.window, 'showErrorMessage');

                await blockchainNetworkExplorerProvider.getChildren(connectionTreeItem);

                errorSpy.should.have.been.calledWith(sinon.match((value: string) => {
                    return value.startsWith('Error parsing certificate ENOENT: no such file or directory');
                }));
            });

            it('should handle error with tree', async () => {
                const connections: Array<any> = [];

                const rootPath: string = path.dirname(__dirname);

                const myConnection: any = {
                    name: 'myConnection',
                    connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json'),
                    identities: [{
                        certificatePath: path.join(rootPath, '../../test/data/connectionTwo/credentials/badPath/certificate'),
                        privateKeyPath: path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey')
                    }]
                };

                connections.push(myConnection);

                await vscode.workspace.getConfiguration().update('fabric.connections', connections, vscode.ConfigurationTarget.Global);

                const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();

                const errorSpy: sinon.SinonSpy = mySandBox.spy(vscode.window, 'showErrorMessage');

                // @ts-ignore
                mySandBox.stub(blockchainNetworkExplorerProvider, 'createConnectionTree').rejects({message: 'some error'});

                await blockchainNetworkExplorerProvider.getChildren();

                errorSpy.should.have.been.calledWith('some error');
            });

            it('should handle errors populating the tree with runtimeTreeItems', async () => {
                mySandBox.stub(FabricConnectionHelper, 'isCompleted').returns(true);

                const runtimes: any = [{
                    name: 'myBrokenRuntime',
                    developmentMode: false
                }];

                await vscode.workspace.getConfiguration().update('fabric.connections', [], vscode.ConfigurationTarget.Global);
                await vscode.workspace.getConfiguration().update('fabric.runtimes', runtimes, vscode.ConfigurationTarget.Global);

                mySandBox.stub(RuntimeTreeItem, 'newRuntimeTreeItem').rejects({message: 'some error'});
                const errorSpy: sinon.SinonSpy = mySandBox.spy(vscode.window, 'showErrorMessage');

                const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
                const allChildren: BlockchainTreeItem[] = await blockchainNetworkExplorerProvider.getChildren();

                errorSpy.should.have.been.calledWith('Error populating Blockchain Explorer View: some error');
                allChildren[0].label.should.equal('+ Add new connection');
            });

            it('should display managed runtimes with single identities', async () => {
                mySandBox.stub(FabricConnectionHelper, 'isCompleted').returns(true);

                const runtimes: any = [{
                    name: 'myRuntime',
                    developmentMode: false
                }];

                // reset the available connections
                await vscode.workspace.getConfiguration().update('fabric.connections', [], vscode.ConfigurationTarget.Global);
                await vscode.workspace.getConfiguration().update('fabric.runtimes', runtimes, vscode.ConfigurationTarget.Global);

                const mockRuntime: sinon.SinonStubbedInstance<FabricRuntime> = sinon.createStubInstance(FabricRuntime);
                mockRuntime.getName.returns('myRuntime');
                mockRuntime.isBusy.returns(false);
                mockRuntime.isRunning.resolves(true);
                mySandBox.stub(FabricRuntimeManager.instance(), 'get').withArgs('myRuntime').returns(mockRuntime);

                const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
                const allChildren: BlockchainTreeItem[] = await blockchainNetworkExplorerProvider.getChildren();
                await new Promise((resolve: any): any => {
                    setTimeout(resolve, 0);
                });

                const connection: FabricConnectionRegistryEntry = new FabricConnectionRegistryEntry();
                connection.name = 'myRuntime';
                connection.managedRuntime = true;
                const myCommand: vscode.Command = {
                    command: 'blockchainExplorer.connectEntry',
                    title: '',
                    arguments: [connection]
                };

                allChildren.length.should.equal(2);
                allChildren[0].should.be.an.instanceOf(RuntimeTreeItem);
                const runtimeTreeItem: RuntimeTreeItem = allChildren[0] as RuntimeTreeItem;
                runtimeTreeItem.label.should.equal('myRuntime  ●');
                runtimeTreeItem.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                runtimeTreeItem.connection.should.deep.equal(connection);
                runtimeTreeItem.command.should.deep.equal(myCommand);
                allChildren[1].label.should.equal('+ Add new connection');
            });

            it('should display unfinished connetions', async () => {
                mySandBox.stub(FabricConnectionHelper, 'isCompleted').returns(false);
                const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
                const connectionTreeItem: ConnectionTreeItem = new ConnectionTreeItem(blockchainNetworkExplorerProvider, 'unfinished_connection', new FabricConnectionRegistryEntry(), 0);
                const createConnectionUncompleteTreeStub: sinon.SinonStub = mySandBox.stub(blockchainNetworkExplorerProvider, 'createConnectionUncompleteTree').resolves();
                await blockchainNetworkExplorerProvider.getChildren(connectionTreeItem);
                createConnectionUncompleteTreeStub.should.have.been.calledWith(connectionTreeItem);
            });

            it('should detect uncompleted connection', async () => {
                const blockchainNetworkExplorer: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();

                const entry: FabricConnectionRegistryEntry = new FabricConnectionRegistryEntry();
                entry.name = 'uncompletedConnection';
                entry.connectionProfilePath = FabricConnectionHelper.CONNECTION_PROFILE_PATH_DEFAULT;
                entry.identities = [{
                    certificatePath: FabricConnectionHelper.CERTIFICATE_PATH_DEFAULT,
                    privateKeyPath: FabricConnectionHelper.PRIVATE_KEY_PATH_DEFAULT
                }];

                const FabricConnectionRegistryEntryArray: FabricConnectionRegistryEntry[] = [entry];

                mySandBox.stub(FabricConnectionRegistry.instance(), 'getAll').returns(FabricConnectionRegistryEntryArray);

                const result: BlockchainTreeItem[] = await blockchainNetworkExplorer.getChildren();

                result[0].collapsibleState.should.equal(2); // Should be an expanded tree item
                result[0].label.should.equal('uncompletedConnection');
            });

            it('should delete any managed runtimes from fabric.connections', async () => {

                const rootPath: string = path.dirname(__dirname);
                const deleteSpy: sinon.SinonSpy = mySandBox.spy(FabricConnectionRegistry.instance(), 'delete');

                const connectionA: any = {
                    name: 'myConnection',
                    connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json'),
                    identities: [{
                        certificatePath: path.join(rootPath, '../../test/data/connectionTwo/credentials/badPath/certificate'),
                        privateKeyPath: path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey')
                    }]
                };
                const connectionB: any = {
                    name: 'local_fabric',
                    managedRuntime: true
                };

                const connections: Array<any> = [connectionA, connectionB];

                await vscode.workspace.getConfiguration().update('fabric.connections', connections, vscode.ConfigurationTarget.Global);

                const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();

                const treeItems: BlockchainTreeItem[] = await blockchainNetworkExplorerProvider.getChildren();

                deleteSpy.should.have.been.calledWith(connectionB.name);

                treeItems.length.should.equal(2);
                treeItems.indexOf(connectionB).should.equal(-1);
            });

            it('should handle errors thrown when connection fails (with message)', async () => {

                const fabricConnection: sinon.SinonStubbedInstance<FabricConnection> = sinon.createStubInstance(TestFabricConnection);

                const fabricConnectionManager: FabricConnectionManager = FabricConnectionManager.instance();

                getConnectionStub.returns((fabricConnection as any) as FabricConnection );
                getConnectionStub.onCall(3).returns(undefined);
                fabricConnection.getAllPeerNames.returns(['peerTwo']);
                fabricConnection.getAllChannelsForPeer.throws({message: 'cannot connect'});

                const disconnnectStub: sinon.SinonStub = mySandBox.stub(fabricConnectionManager, 'disconnect').resolves();
                const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
                const errorSpy: sinon.SinonSpy = mySandBox.spy(vscode.window, 'showErrorMessage');
                const oldChildren: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren();

                const allChildren: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren();

                disconnnectStub.should.have.been.calledOnce;
                oldChildren.should.not.equal(allChildren);

                errorSpy.should.have.been.calledOnceWith('Error creating channel map: cannot connect');
            });

            it('should handle errors thrown when connection fails (no message)', async () => {

                const fabricConnection: sinon.SinonStubbedInstance<FabricConnection> = sinon.createStubInstance(TestFabricConnection);

                const fabricConnectionManager: FabricConnectionManager = FabricConnectionManager.instance();
                getConnectionStub.returns((fabricConnection as any) as FabricConnection );
                getConnectionStub.onCall(3).returns(undefined);
                fabricConnection.getAllPeerNames.returns(['peerTwo']);
                fabricConnection.getAllChannelsForPeer.throws('some error');
                const disconnnectStub: sinon.SinonStub = mySandBox.stub(fabricConnectionManager, 'disconnect').resolves();
                const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
                const errorSpy: sinon.SinonSpy = mySandBox.spy(vscode.window, 'showErrorMessage');
                const oldChildren: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren();

                const allChildren: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren();

                disconnnectStub.should.have.been.calledOnce;
                oldChildren.should.not.equal(allChildren);

                errorSpy.should.have.been.calledOnceWith('some error');
            });

            it('should error if gRPC cant connect to Fabric', async () => {
                const errorSpy: sinon.SinonSpy = mySandBox.spy(vscode.window, 'showErrorMessage');

                const fabricConnection: sinon.SinonStubbedInstance<FabricConnection> = sinon.createStubInstance(TestFabricConnection);
                const fabricConnectionManager: FabricConnectionManager = FabricConnectionManager.instance();
                getConnectionStub.returns((fabricConnection as any) as FabricConnection);
                fabricConnection.getAllPeerNames.returns(['peerOne']);
                fabricConnection.getAllChannelsForPeer.throws({message: 'Received http2 header with status: 503'});
                const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
                const oldChildren: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren();

                const disconnectSpy: sinon.SinonSpy = mySandBox.spy(blockchainNetworkExplorerProvider, 'disconnect');

                const allChildren: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren();

                disconnectSpy.should.have.been.called;
                oldChildren.should.deep.equal(allChildren);

                errorSpy.should.have.been.calledWith('Cannot connect to Fabric: Received http2 header with status: 503');
            });
        });

        describe('connected tree', () => {

            let mySandBox: sinon.SinonSandbox;
            let allChildren: Array<BlockchainTreeItem>;
            let blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider;
            let fabricConnection: sinon.SinonStubbedInstance<FabricConnection>;

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

                fabricConnection.getMetadata.withArgs('biscuit-network', 'channelOne').resolves({'': {
                    functions: ['tradeBiscuits']
                }});

                fabricConnection.getMetadata.withArgs('cake-network', 'channelTwo').resolves({'': {
                    functions: []
                }});

                blockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
                const fabricConnectionManager: FabricConnectionManager = FabricConnectionManager.instance();
                const getConnectionStub: sinon.SinonStub = mySandBox.stub(fabricConnectionManager, 'getConnection').returns((fabricConnection as any) as FabricConnection );

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
                const instantiatedTreeItemOne: InstantiatedChaincodeParentTreeItem = channelChildrenOne[1] as InstantiatedChaincodeParentTreeItem;
                instantiatedTreeItemOne.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                instantiatedTreeItemOne.chaincodes.should.deep.equal([{name: 'biscuit-network', version: '0.7'}]);
                instantiatedTreeItemOne.contextValue.should.equal('blockchain-instantiated-chaincodes-item');
                instantiatedTreeItemOne.label.should.equal('Instantiated Smart Contracts');
                instantiatedTreeItemOne.channel.should.equal(channelOne);

                const channelTwo: ChannelTreeItem = allChildren[1] as ChannelTreeItem;
                const channelChildrenTwo: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren(channelTwo);
                channelChildrenTwo.length.should.equal(2);

                const peersItemTwo: PeersTreeItem = channelChildrenTwo[0] as PeersTreeItem;
                peersItemTwo.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                peersItemTwo.contextValue.should.equal('blockchain-peers-item');
                peersItemTwo.label.should.equal('Peers');
                peersItemTwo.peers.should.deep.equal(['peerOne', 'peerTwo']);

                const instantiatedTreeItemTwo: InstantiatedChaincodeParentTreeItem = channelChildrenTwo[1] as InstantiatedChaincodeParentTreeItem;
                instantiatedTreeItemTwo.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                instantiatedTreeItemTwo.chaincodes.should.deep.equal([{name: 'cake-network', version: '0.10'}]);
                instantiatedTreeItemTwo.contextValue.should.equal('blockchain-instantiated-chaincodes-item');
                instantiatedTreeItemTwo.label.should.equal('Instantiated Smart Contracts');
                instantiatedTreeItemTwo.channel.should.equal(channelTwo);
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

                const instantiatedTreeItemTwo: InstantiatedChaincodeParentTreeItem = channelChildrenTwo[1] as InstantiatedChaincodeParentTreeItem;
                instantiatedTreeItemTwo.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                instantiatedTreeItemTwo.chaincodes.should.deep.equal([{name: 'cake-network', version: '0.10'}]);
                instantiatedTreeItemTwo.contextValue.should.equal('blockchain-instantiated-chaincodes-item');
                instantiatedTreeItemTwo.label.should.equal('Instantiated Smart Contracts');
                instantiatedTreeItemTwo.channel.should.equal(channelTwo);
            });

            it('should error if problem with instatiate chaincodes', async () => {

                fabricConnection.getInstantiatedChaincode.withArgs('channelOne').rejects({message: 'some error'});

                const errorSpy: sinon.SinonSpy = mySandBox.spy(vscode.window, 'showErrorMessage');

                allChildren = await blockchainNetworkExplorerProvider.getChildren();

                errorSpy.should.have.been.calledWith('Error getting instantiated smart contracts for channel channelOne some error');

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

                const chaincodeItemsTwo: Array<InstalledChainCodeTreeItem> = await blockchainNetworkExplorerProvider.getChildren(peerItems[1]) as Array<InstalledChainCodeTreeItem>;

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

                const chaincodeItemsTwo: Array<InstalledChainCodeTreeItem> = await blockchainNetworkExplorerProvider.getChildren(peerItems[1]) as Array<InstalledChainCodeTreeItem>;

                chaincodeItemsTwo.length.should.equal(1);
                chaincodeItemsTwo[0].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                chaincodeItemsTwo[0].contextValue.should.equal('blockchain-installed-chaincode-item');
                chaincodeItemsTwo[0].label.should.equal('biscuit-network');
            });

            it('should handle errror getting installed chaincodes', async () => {

                fabricConnection.getInstalledChaincode.withArgs('peerOne').rejects({message: 'some error'});

                const errorSpy: sinon.SinonSpy = mySandBox.spy(vscode.window, 'showErrorMessage');

                allChildren = await blockchainNetworkExplorerProvider.getChildren();

                const channelTwo: ChannelTreeItem = allChildren[1] as ChannelTreeItem;

                const channelChildrenTwo: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren(channelTwo);
                channelChildrenTwo.length.should.equal(2);

                const peersItemOne: PeersTreeItem = channelChildrenTwo[0] as PeersTreeItem;

                const peerItems: Array<PeerTreeItem> = await blockchainNetworkExplorerProvider.getChildren(peersItemOne) as Array<PeerTreeItem>;

                peerItems[0].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);

                errorSpy.should.have.been.calledWith('Error when getting installed smart contracts for peer peerOne some error');

                const chaincodeItems: Array<InstalledChainCodeTreeItem> = await blockchainNetworkExplorerProvider.getChildren(peerItems[0]) as Array<InstalledChainCodeTreeItem>;

                chaincodeItems.length.should.equal(0);

                const chaincodeItemsTwo: Array<InstalledChainCodeTreeItem> = await blockchainNetworkExplorerProvider.getChildren(peerItems[1]) as Array<InstalledChainCodeTreeItem>;

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

                const instatiateChaincodesItemOne: InstantiatedChaincodeParentTreeItem = channelChildrenOne[1] as InstantiatedChaincodeParentTreeItem;

                const instantiatedChainItemsOne: Array<InstantiatedChaincodeChildTreeItem> = await blockchainNetworkExplorerProvider.getChildren(instatiateChaincodesItemOne) as Array<InstantiatedChaincodeChildTreeItem>;

                instantiatedChainItemsOne[0].should.deep.equal({channel: channelOne, collapsibleState: vscode.TreeItemCollapsibleState.Collapsed, contextValue: 'blockchain-instantiated-chaincode-item', label: 'biscuit-network@0.7', name: 'biscuit-network', provider: blockchainNetworkExplorerProvider, version: '0.7', transactions: ['tradeBiscuits']});

                instantiatedChainItemsOne.length.should.equal(1);
                instantiatedChainItemsOne[0].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                instantiatedChainItemsOne[0].contextValue.should.equal('blockchain-instantiated-chaincode-item');
                instantiatedChainItemsOne[0].label.should.equal('biscuit-network@0.7');
                instantiatedChainItemsOne[0].channel.should.equal(channelOne);
                instantiatedChainItemsOne[0].version.should.equal('0.7');

                const channelTwo: ChannelTreeItem = allChildren[1] as ChannelTreeItem;

                const channelChildrenTwo: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren(channelTwo);
                channelChildrenTwo.length.should.equal(2);

                const instatiateChaincodesItemTwo: InstantiatedChaincodeParentTreeItem = channelChildrenTwo[1] as InstantiatedChaincodeParentTreeItem;

                const instantiatedChainItemsTwo: Array<InstantiatedChaincodeChildTreeItem> = await blockchainNetworkExplorerProvider.getChildren(instatiateChaincodesItemTwo) as Array<InstantiatedChaincodeChildTreeItem>;

                instantiatedChainItemsTwo.length.should.equal(1);
                instantiatedChainItemsTwo[0].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                instantiatedChainItemsTwo[0].contextValue.should.equal('blockchain-instantiated-chaincode-item');
                instantiatedChainItemsTwo[0].label.should.equal('cake-network@0.10');
                instantiatedChainItemsTwo[0].channel.should.equal(channelTwo);
                instantiatedChainItemsTwo[0].version.should.equal('0.10');
            });

            it('should create the transactions correctly', async () => {

                const channelOne: ChannelTreeItem = allChildren[0] as ChannelTreeItem;

                const channelChildrenOne: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren(channelOne);
                channelChildrenOne.length.should.equal(2);

                const instatiateChaincodesItemOne: InstantiatedChaincodeParentTreeItem = channelChildrenOne[1] as InstantiatedChaincodeParentTreeItem;

                const instantiatedChainItemsOne: Array<InstantiatedChaincodeChildTreeItem> = await blockchainNetworkExplorerProvider.getChildren(instatiateChaincodesItemOne) as Array<InstantiatedChaincodeChildTreeItem>;

                const transactionsOne: Array<TransactionTreeItem> = await blockchainNetworkExplorerProvider.getChildren(instantiatedChainItemsOne[0]) as Array<TransactionTreeItem>;

                transactionsOne.length.should.equal(1);
                transactionsOne[0].label.should.equal('tradeBiscuits');
                transactionsOne[0].chaincodeName.should.equal('biscuit-network');
                transactionsOne[0].channelName.should.equal('channelOne');
                transactionsOne[0].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);

                const channelTwo: ChannelTreeItem = allChildren[1] as ChannelTreeItem;

                const channelChildrenTwo: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren(channelTwo);
                channelChildrenTwo.length.should.equal(2);

                const instatiateChaincodesItemTwo: InstantiatedChaincodeParentTreeItem = channelChildrenTwo[1] as InstantiatedChaincodeParentTreeItem;

                const instantiatedChainItemsTwo: Array<InstantiatedChaincodeChildTreeItem> = await blockchainNetworkExplorerProvider.getChildren(instatiateChaincodesItemTwo) as Array<InstantiatedChaincodeChildTreeItem>;
                instantiatedChainItemsTwo[0].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
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

            const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();

            const onDidChangeTreeDataSpy: sinon.SinonSpy = mySandBox.spy(blockchainNetworkExplorerProvider['_onDidChangeTreeData'], 'fire');

            await vscode.commands.executeCommand('blockchainExplorer.refreshEntry');

            onDidChangeTreeDataSpy.should.have.been.called;
        });

        it('should test the tree is refreshed when the refresh command is run', async () => {

            const mockTreeItem: sinon.SinonStubbedInstance<ConnectionTreeItem> = sinon.createStubInstance(ConnectionTreeItem);

            const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();

            const onDidChangeTreeDataSpy: sinon.SinonSpy = mySandBox.spy(blockchainNetworkExplorerProvider['_onDidChangeTreeData'], 'fire');

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

            const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();

            const onDidChangeTreeDataSpy: sinon.SinonSpy = mySandBox.spy(blockchainNetworkExplorerProvider['_onDidChangeTreeData'], 'fire');

            const myConnection: TestFabricConnection = new TestFabricConnection();

            const executeCommandSpy: sinon.SinonSpy = mySandBox.spy(vscode.commands, 'executeCommand');

            await blockchainNetworkExplorerProvider.connect(myConnection);

            onDidChangeTreeDataSpy.should.have.been.called;

            executeCommandSpy.should.have.been.calledOnce;
            executeCommandSpy.getCall(0).should.have.been.calledWith('setContext', 'blockchain-connected', true);
        });
    });

    describe('disconnect', () => {

        let mySandBox: sinon.SinonSandbox;

        beforeEach(async () => {
            mySandBox = sinon.createSandbox();

            await ExtensionUtil.activateExtension();
        });

        afterEach(() => {
            mySandBox.restore();
        });

        it('should disconnect the client connection', async () => {
            const myConnection: TestFabricConnection = new TestFabricConnection();

            const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();

            const onDidChangeTreeDataSpy: sinon.SinonSpy = mySandBox.spy(blockchainNetworkExplorerProvider['_onDidChangeTreeData'], 'fire');

            const executeCommandSpy: sinon.SinonSpy = mySandBox.spy(vscode.commands, 'executeCommand');

            await blockchainNetworkExplorerProvider.disconnect();

            onDidChangeTreeDataSpy.should.have.been.called;

            executeCommandSpy.should.have.been.calledOnce;
            executeCommandSpy.getCall(0).should.have.been.calledWith('setContext', 'blockchain-connected', false);
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
            const connections: Array<any> = [];

            const rootPath: string = path.dirname(__dirname);

            const myConnection: any = {
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

            const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
            const allChildren: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren();

            const result: ConnectionTreeItem = blockchainNetworkExplorerProvider.getTreeItem(allChildren[0]) as ConnectionTreeItem;

            result.label.should.equal('myConnection');
        });
    });

    describe('createConnectionUncompleteTree', () => {

        let mySandBox: sinon.SinonSandbox;

        beforeEach(async () => {
            mySandBox = sinon.createSandbox();

            await ExtensionUtil.activateExtension();
        });

        afterEach(() => {
            mySandBox.restore();
        });

        it('should show uncompleted connection', async () => {
            const blockchainNetworkExplorer: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
            const element: ConnectionTreeItem = new ConnectionTreeItem(blockchainNetworkExplorer, 'connection', {} as FabricConnectionRegistryEntry, 0);
            mySandBox.stub(FabricConnectionHelper, 'connectionProfilePathComplete').returns(false);
            mySandBox.stub(FabricConnectionHelper, 'certificatePathComplete').returns(false);
            mySandBox.stub(FabricConnectionHelper, 'privateKeyPathComplete').returns(false);

            const result: ConnectionPropertyTreeItem[] = await blockchainNetworkExplorer.createConnectionUncompleteTree(element);

            result[0].label.should.equal('+ Connection Profile');
            result[1].label.should.equal('+ Certificate');
            result[2].label.should.equal('+ Private Key');
        });

        it('should show completed connection profile path', async () => {
            const blockchainNetworkExplorer: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
            const element: ConnectionTreeItem = new ConnectionTreeItem(blockchainNetworkExplorer, 'connection', {} as FabricConnectionRegistryEntry, 0);
            mySandBox.stub(FabricConnectionHelper, 'connectionProfilePathComplete').returns(true);
            mySandBox.stub(FabricConnectionHelper, 'certificatePathComplete').returns(false);
            mySandBox.stub(FabricConnectionHelper, 'privateKeyPathComplete').returns(false);

            const result: ConnectionPropertyTreeItem[] = await blockchainNetworkExplorer.createConnectionUncompleteTree(element);

            result[0].label.should.equal('✓ Connection Profile');
            result[1].label.should.equal('+ Certificate');
            result[2].label.should.equal('+ Private Key');
        });

        it('should show completed certificate path', async () => {
            const blockchainNetworkExplorer: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
            const element: ConnectionTreeItem = new ConnectionTreeItem(blockchainNetworkExplorer, 'connection', {} as FabricConnectionRegistryEntry, 0);
            mySandBox.stub(FabricConnectionHelper, 'connectionProfilePathComplete').returns(false);
            mySandBox.stub(FabricConnectionHelper, 'certificatePathComplete').returns(true);
            mySandBox.stub(FabricConnectionHelper, 'privateKeyPathComplete').returns(false);

            const result: ConnectionPropertyTreeItem[] = await blockchainNetworkExplorer.createConnectionUncompleteTree(element);

            result[0].label.should.equal('+ Connection Profile');
            result[1].label.should.equal('✓ Certificate');
            result[2].label.should.equal('+ Private Key');
        });

        it('should show completed private key path', async () => {
            const blockchainNetworkExplorer: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
            const element: ConnectionTreeItem = new ConnectionTreeItem(blockchainNetworkExplorer, 'connection', {} as FabricConnectionRegistryEntry, 0);
            mySandBox.stub(FabricConnectionHelper, 'connectionProfilePathComplete').returns(false);
            mySandBox.stub(FabricConnectionHelper, 'certificatePathComplete').returns(false);
            mySandBox.stub(FabricConnectionHelper, 'privateKeyPathComplete').returns(true);

            const result: ConnectionPropertyTreeItem[] = await blockchainNetworkExplorer.createConnectionUncompleteTree(element);

            result[0].label.should.equal('+ Connection Profile');
            result[1].label.should.equal('+ Certificate');
            result[2].label.should.equal('✓ Private Key');
        });
    });
});
