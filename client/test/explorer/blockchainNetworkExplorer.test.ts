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
import { GatewayIdentityTreeItem } from '../../src/explorer/model/GatewayIdentityTreeItem';
import { FabricConnection } from '../../src/fabric/FabricConnection';
import { BlockchainTreeItem } from '../../src/explorer/model/BlockchainTreeItem';
import { BlockchainNetworkExplorerProvider } from '../../src/explorer/BlockchainNetworkExplorer';
import { ChannelTreeItem } from '../../src/explorer/model/ChannelTreeItem';
import { FabricConnectionManager } from '../../src/fabric/FabricConnectionManager';
import { ExtensionUtil } from '../../src/util/ExtensionUtil';
import { TestUtil } from '../TestUtil';
import { FabricRuntime } from '../../src/fabric/FabricRuntime';
import { FabricRuntimeManager } from '../../src/fabric/FabricRuntimeManager';
import { FabricGatewayRegistry } from '../../src/fabric/FabricGatewayRegistry';
import { FabricGatewayRegistryEntry } from '../../src/fabric/FabricGatewayRegistryEntry';
import { FabricGatewayHelper } from '../../src/fabric/FabricGatewayHelper';
import { TransactionTreeItem } from '../../src/explorer/model/TransactionTreeItem';
import { InstantiatedChaincodeTreeItem } from '../../src/explorer/model/InstantiatedChaincodeTreeItem';
import { ConnectedTreeItem } from '../../src/explorer/model/ConnectedTreeItem';
import { ContractTreeItem } from '../../src/explorer/model/ContractTreeItem';
import { GatewayPropertyTreeItem } from '../../src/explorer/model/GatewayPropertyTreeItem';
import { LocalGatewayTreeItem } from '../../src/explorer/model/LocalGatewayTreeItem';
import { VSCodeOutputAdapter } from '../../src/logging/VSCodeOutputAdapter';
import { LogType } from '../../src/logging/OutputAdapter';
import { FabricWalletGenerator } from '../../src/fabric/FabricWalletGenerator';
import { FabricWallet } from '../../src/fabric/FabricWallet';

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

    const rootPath: string = path.dirname(__dirname);

    before(async () => {
        await TestUtil.setupTests();
        await TestUtil.storeGatewaysConfig();
        await TestUtil.storeRuntimesConfig();
    });

    after(async () => {
        await TestUtil.restoreGatewaysConfig();
        await TestUtil.restoreRuntimesConfig();
    });

    beforeEach(async () => {
        await vscode.workspace.getConfiguration().update('fabric.runtimes', [], vscode.ConfigurationTarget.Global);
        await vscode.workspace.getConfiguration().update('fabric.gateways', [], vscode.ConfigurationTarget.Global);
    });

    describe('constructor', () => {

        let mySandBox: sinon.SinonSandbox;
        let errorSpy: sinon.SinonSpy;

        beforeEach(async () => {
            mySandBox = sinon.createSandbox();
            errorSpy = mySandBox.spy(vscode.window, 'showErrorMessage');
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
            connectionManager.emit('connected', mockConnection);
            // Need to ensure the event handler gets a chance to run.
            await new Promise((resolve: any): any => setTimeout(resolve, 50));
            blockchainNetworkExplorerProvider.connect.should.have.been.calledOnceWithExactly(mockConnection);
            errorSpy.should.have.been.calledOnceWithExactly('Error handling connected event: wow such error');
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
            connectionManager.emit('disconnected');
            // Need to ensure the event handler gets a chance to run.
            await new Promise((resolve: any): any => setTimeout(resolve, 50));
            blockchainNetworkExplorerProvider.disconnect.should.have.been.calledOnceWithExactly();
            errorSpy.should.have.been.calledOnceWithExactly('Error handling disconnected event: wow such error');
        });
    });

    describe('getChildren', () => {

        describe('unconnected tree', () => {

            let mySandBox: sinon.SinonSandbox;
            let getConnectionStub: sinon.SinonStub;
            let errorSpy: sinon.SinonSpy;

            beforeEach(async () => {
                mySandBox = sinon.createSandbox();
                getConnectionStub = mySandBox.stub(FabricConnectionManager.instance(), 'getConnection');
                errorSpy = mySandBox.spy(vscode.window, 'showErrorMessage');

                await ExtensionUtil.activateExtension();
            });

            afterEach(() => {
                mySandBox.restore();
            });

            it('should display gateway that has been added in alphabetical order', async () => {
                const gateways: Array<any> = [];

                gateways.push({
                    name: 'myGatewayB',
                    connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json'),
                    walletPath: path.join(rootPath, '../../test/data/walletDir/wallet')
                });

                gateways.push({
                    name: 'myGatewayC',
                    connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                    walletPath: path.join(rootPath, '../../test/data//walletDir/wallet')
                });

                gateways.push({
                    name: 'myGatewayA',
                    connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json'),
                    walletPath: path.join(rootPath, '../../test/data//walletDir/wallet')
                });

                gateways.push({
                    name: 'myGatewayA',
                    connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json'),
                    walletPath: path.join(rootPath, '../../test/data//walletDir/wallet')
                });

                await vscode.workspace.getConfiguration().update('fabric.gateways', gateways, vscode.ConfigurationTarget.Global);

                const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
                const allChildren: BlockchainTreeItem[] = await blockchainNetworkExplorerProvider.getChildren();

                allChildren.length.should.equal(4);
                allChildren[0].label.should.equal('myGatewayA');
                allChildren[1].label.should.equal('myGatewayA');
                allChildren[2].label.should.equal('myGatewayB');
                allChildren[3].label.should.equal('myGatewayC');
            });

            it('should display gateways with single identities', async () => {
                const gateways: Array<any> = [];

                const myGateway: any = {
                    name: 'myGateway',
                    connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                    walletPath: path.join(rootPath, '../../test/data/walletDir/otherWallet')
                };

                const identities: any = [
                    {
                        label: 'Admin@org1.example.com',
                        identifier: 'cd96d5260ad4757551ed4a5a991e62130f8008a0bf996e4e4b84cd097a747fec',
                        mspId: 'Org1MSP'
                    }
                ];

                gateways.push(myGateway);

                await vscode.workspace.getConfiguration().update('fabric.gateways', gateways, vscode.ConfigurationTarget.Global);

                const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
                const allChildren: BlockchainTreeItem[] = await blockchainNetworkExplorerProvider.getChildren();
                const gateway: FabricGatewayRegistryEntry = FabricGatewayRegistry.instance().get('myGateway');

                const myIdentityCommand: vscode.Command = {
                    command: 'blockchainConnectionsExplorer.connectEntry',
                    title: '',
                    arguments: [gateway, identities[0].label]
                };

                allChildren.length.should.equal(1);
                const connectionTreeItem: ConnectionTreeItem = allChildren[0] as ConnectionTreeItem;
                connectionTreeItem.label.should.equal('myGateway');
                connectionTreeItem.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Expanded);
                connectionTreeItem.gateway.should.deep.equal(gateway);

                const identityChildren: BlockchainTreeItem[] = await blockchainNetworkExplorerProvider.getChildren(connectionTreeItem);
                identityChildren.length.should.equal(1);

                const identityChildOne: GatewayIdentityTreeItem = identityChildren[0] as GatewayIdentityTreeItem;
                identityChildOne.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                identityChildOne.contextValue.should.equal('blockchain-gateway-identity-item');
                identityChildOne.label.should.equal('Admin@org1.example.com');
                identityChildOne.command.should.deep.equal(myIdentityCommand);
            });

            it('should display gateways with multiple identities', async () => {
                const gateways: Array<any> = [];

                const myGateway: any = {
                    name: 'myGateway',
                    connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json'),
                    walletPath: path.join(rootPath, '../../test/data/walletDir/wallet')
                };

                const identities: any = [
                    {
                        label: 'Admin@org1.example.com',
                        identifier: 'cd96d5260ad4757551ed4a5a991e62130f8008a0bf996e4e4b84cd097a747fec',
                        mspId: 'Org1MSP'
                    },
                    {
                        label: 'Test@org1.example.com',
                        identifier: 'cd96d5260ad4757551ed4a5a991e62130f8008a0bf996e4e4b84cd097a747fec',
                        mspId: 'Org1MSP'
                    }
                ];

                gateways.push(myGateway);

                await vscode.workspace.getConfiguration().update('fabric.gateways', gateways, vscode.ConfigurationTarget.Global);

                const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
                const allChildren: BlockchainTreeItem[] = await blockchainNetworkExplorerProvider.getChildren();
                const gateway: FabricGatewayRegistryEntry = FabricGatewayRegistry.instance().get('myGateway');

                allChildren.length.should.equal(1);
                const connectionTreeItem: ConnectionTreeItem = allChildren[0] as ConnectionTreeItem;
                connectionTreeItem.label.should.equal('myGateway');
                connectionTreeItem.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Expanded);
                connectionTreeItem.gateway.should.deep.equal(gateway);
                // should.exist(connectionTreeItem.command);

                const myCommandOne: vscode.Command = {
                    command: 'blockchainConnectionsExplorer.connectEntry',
                    title: '',
                    arguments: [gateway, identities[0].label]
                };

                const myCommandTwo: vscode.Command = {
                    command: 'blockchainConnectionsExplorer.connectEntry',
                    title: '',
                    arguments: [gateway, identities[1].label]
                };

                const identityChildren: BlockchainTreeItem[] = await blockchainNetworkExplorerProvider.getChildren(connectionTreeItem);
                identityChildren.length.should.equal(2);

                const identityChildOne: GatewayIdentityTreeItem = identityChildren[0] as GatewayIdentityTreeItem;
                identityChildOne.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                identityChildOne.contextValue.should.equal('blockchain-gateway-identity-item');
                identityChildOne.label.should.equal('Admin@org1.example.com');
                identityChildOne.command.should.deep.equal(myCommandOne);

                const identityChildTwo: GatewayIdentityTreeItem = identityChildren[1] as GatewayIdentityTreeItem;
                identityChildTwo.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                identityChildTwo.contextValue.should.equal('blockchain-gateway-identity-item');
                identityChildTwo.label.should.equal('Test@org1.example.com');
                identityChildTwo.command.should.deep.equal(myCommandTwo);
            });

            it('should handle error with tree', async () => {
                const gateways: Array<any> = [];

                const myGateway: any = {
                    name: 'myGateway',
                    connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json'),
                    walletPath: path.join(rootPath, '../../test/data/walletDir/wallet')
                };

                gateways.push(myGateway);

                await vscode.workspace.getConfiguration().update('fabric.gateways', gateways, vscode.ConfigurationTarget.Global);

                const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();

                // @ts-ignore
                mySandBox.stub(blockchainNetworkExplorerProvider, 'createConnectionTree').rejects({ message: 'some error' });

                await blockchainNetworkExplorerProvider.getChildren();

                errorSpy.should.have.been.calledWith('some error');
            });

            it('should handle errors populating the tree with localGatewayTreeItems', async () => {
                mySandBox.stub(FabricGatewayHelper, 'isCompleted').returns(true);

                const runtimes: any = [{
                    name: 'myBrokenRuntime',
                    developmentMode: false
                }];

                await vscode.workspace.getConfiguration().update('fabric.gateways', [], vscode.ConfigurationTarget.Global);
                await vscode.workspace.getConfiguration().update('fabric.runtimes', runtimes, vscode.ConfigurationTarget.Global);

                const testFabricWallet: FabricWallet = new FabricWallet('myConnection', path.join(rootPath, '../../test/data/walletDir/emptyWallet'));
                mySandBox.stub(FabricWalletGenerator.instance(), 'createLocalWallet').resolves(testFabricWallet);
                mySandBox.stub(testFabricWallet, 'getWalletPath').returns(path.join(rootPath, '../../test/data/walletDir/emptyWallet'));

                mySandBox.stub(LocalGatewayTreeItem, 'newLocalGatewayTreeItem').rejects({ message: 'some error' });

                const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
                const allChildren: BlockchainTreeItem[] = await blockchainNetworkExplorerProvider.getChildren();

                errorSpy.should.have.been.calledWith('Error populating Blockchain Explorer View: some error');
            });

            it('should display managed runtimes with single identities', async () => {
                mySandBox.stub(FabricGatewayHelper, 'isCompleted').returns(true);

                const runtimes: any = [{
                    name: 'myRuntime',
                    developmentMode: false
                }];

                // reset the available gateways
                await vscode.workspace.getConfiguration().update('fabric.gateways', [], vscode.ConfigurationTarget.Global);
                await vscode.workspace.getConfiguration().update('fabric.runtimes', runtimes, vscode.ConfigurationTarget.Global);

                const mockRuntime: sinon.SinonStubbedInstance<FabricRuntime> = sinon.createStubInstance(FabricRuntime);
                mockRuntime.getName.returns('myRuntime');
                mockRuntime.isBusy.returns(false);
                mockRuntime.isRunning.resolves(true);
                mySandBox.stub(FabricRuntimeManager.instance(), 'get').withArgs('myRuntime').returns(mockRuntime);

                const testFabricWallet: FabricWallet = new FabricWallet('myConnection', path.join(rootPath, '../../test/data/walletDir/emptyWallet'));
                const walletGenerator: FabricWalletGenerator = await FabricWalletGenerator.instance();
                mySandBox.stub(FabricWalletGenerator.instance(), 'createLocalWallet').resolves(testFabricWallet);
                mySandBox.stub(walletGenerator, 'getIdentityNames').resolves(['Admin@org1.example.com']);
                mySandBox.stub(testFabricWallet, 'getWalletPath').returns(path.join(rootPath, '../../test/data/walletDir/emptyWallet'));

                const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
                const allChildren: BlockchainTreeItem[] = await blockchainNetworkExplorerProvider.getChildren();
                await new Promise((resolve: any): any => {
                    setTimeout(resolve, 0);
                });

                const gateway: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
                gateway.name = 'myRuntime';
                gateway.managedRuntime = true;
                gateway.walletPath = path.join(rootPath, '../../test/data/walletDir/emptyWallet');
                const myCommand: vscode.Command = {
                    command: 'blockchainConnectionsExplorer.connectEntry',
                    title: '',
                    arguments: [gateway, 'Admin@org1.example.com']
                };

                allChildren.length.should.equal(1);
                allChildren[0].should.be.an.instanceOf(LocalGatewayTreeItem);
                const localGatewayTreeItem: LocalGatewayTreeItem = allChildren[0] as LocalGatewayTreeItem;
                localGatewayTreeItem.label.should.equal('myRuntime  ●');
                localGatewayTreeItem.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Expanded);
                localGatewayTreeItem.gateway.should.deep.equal(gateway);
                const gatewayChildren: BlockchainTreeItem[] = await blockchainNetworkExplorerProvider.getChildren(localGatewayTreeItem);
                gatewayChildren.length.should.equal(1);
                const identity: GatewayIdentityTreeItem = gatewayChildren[0] as GatewayIdentityTreeItem;
                identity.command.should.deep.equal(myCommand);
                identity.label.should.equal('Admin@org1.example.com');
                identity.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
            });

            it('should detect uncompleted gateway', async () => {
                const blockchainNetworkExplorer: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();

                const entry: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
                entry.name = 'uncompletedGateway';
                entry.connectionProfilePath = FabricGatewayHelper.CONNECTION_PROFILE_PATH_DEFAULT;
                entry.walletPath = FabricGatewayHelper.WALLET_PATH_DEFAULT;

                const gateways: FabricGatewayRegistryEntry[] = [entry];

                await vscode.workspace.getConfiguration().update('fabric.gateways', gateways, vscode.ConfigurationTarget.Global);

                const result: BlockchainTreeItem[] = await blockchainNetworkExplorer.getChildren();

                result[0].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Expanded); // Should be an expanded tree item
                result[0].label.should.equal('uncompletedGateway');
            });

            it('should delete any managed runtimes from fabric.gateways', async () => {

                const deleteSpy: sinon.SinonSpy = mySandBox.spy(FabricGatewayRegistry.instance(), 'delete');

                const myGatewayA: any = {
                    name: 'myGateway',
                    connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json'),
                    walletPath: path.join(rootPath, '../../test/data/walletDir/wallet')
                };
                const myGatewayB: any = {
                    name: 'local_fabric',
                    managedRuntime: true
                };

                const gateways: Array<any> = [myGatewayA, myGatewayB];

                await vscode.workspace.getConfiguration().update('fabric.gateways', gateways, vscode.ConfigurationTarget.Global);

                const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();

                const treeItems: BlockchainTreeItem[] = await blockchainNetworkExplorerProvider.getChildren();

                deleteSpy.should.have.been.calledWith(myGatewayB.name);

                treeItems.length.should.equal(1);
                treeItems.indexOf(myGatewayB).should.equal(-1);
            });

            it('should handle errors thrown when connection fails', async () => {
                const logStub: sinon.SinonStub = mySandBox.stub(VSCodeOutputAdapter.instance(), 'log');
                const fabricConnection: sinon.SinonStubbedInstance<FabricConnection> = sinon.createStubInstance(TestFabricConnection);

                const fabricConnectionManager: FabricConnectionManager = FabricConnectionManager.instance();

                getConnectionStub.returns((fabricConnection as any) as FabricConnection);
                getConnectionStub.onCall(1).throws({ message: 'cannot connect'});

                const disconnnectStub: sinon.SinonStub = mySandBox.stub(fabricConnectionManager, 'disconnect').resolves();
                const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
                await blockchainNetworkExplorerProvider.getChildren();

                disconnnectStub.should.have.been.calledOnce;
                logStub.should.have.been.calledWith(LogType.ERROR, `cannot connect`);
            });

            it('should error if getAllChannelsForPeer fails', async () => {

                const fabricConnection: sinon.SinonStubbedInstance<FabricConnection> = sinon.createStubInstance(TestFabricConnection);
                const fabricConnectionManager: FabricConnectionManager = FabricConnectionManager.instance();
                getConnectionStub.returns((fabricConnection as any) as FabricConnection);
                fabricConnection.getAllPeerNames.returns(['peerOne']);
                fabricConnection.getAllChannelsForPeer.throws({ message: 'some error' });

                const registryEntry: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
                registryEntry.name = 'myGateway';
                registryEntry.connectionProfilePath = 'myPath';
                registryEntry.managedRuntime = false;
                mySandBox.stub(FabricConnectionManager.instance(), 'getGatewayRegistryEntry').returns(registryEntry);

                const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();

                const disconnectSpy: sinon.SinonSpy = mySandBox.spy(blockchainNetworkExplorerProvider, 'disconnect');

                const allChildren: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren();

                const logStub: sinon.SinonStub = mySandBox.stub(VSCodeOutputAdapter.instance(), 'log');

                await blockchainNetworkExplorerProvider.getChildren(allChildren[2]);

                disconnectSpy.should.have.been.called;
                logStub.should.have.been.calledWith(LogType.ERROR, `Could not connect to gateway: Error creating channel map: some error`);

            });

            it('should error if gRPC cant connect to Fabric', async () => {

                const fabricConnection: sinon.SinonStubbedInstance<FabricConnection> = sinon.createStubInstance(TestFabricConnection);
                const fabricConnectionManager: FabricConnectionManager = FabricConnectionManager.instance();
                getConnectionStub.returns((fabricConnection as any) as FabricConnection);
                fabricConnection.getAllPeerNames.returns(['peerOne']);
                fabricConnection.getAllChannelsForPeer.throws({ message: 'Received http2 header with status: 503' });

                const registryEntry: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
                registryEntry.name = 'myGateway';
                registryEntry.connectionProfilePath = 'myPath';
                registryEntry.managedRuntime = false;
                mySandBox.stub(FabricConnectionManager.instance(), 'getGatewayRegistryEntry').returns(registryEntry);

                const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();

                const disconnectSpy: sinon.SinonSpy = mySandBox.spy(blockchainNetworkExplorerProvider, 'disconnect');

                const allChildren: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren();

                const logStub: sinon.SinonStub = mySandBox.stub(VSCodeOutputAdapter.instance(), 'log');

                await blockchainNetworkExplorerProvider.getChildren(allChildren[2]);

                disconnectSpy.should.have.been.called;
                logStub.should.have.been.calledWith(LogType.ERROR, `Could not connect to gateway: Cannot connect to Fabric: Received http2 header with status: 503`);

            });
        });

        describe('connected tree', () => {

            let mySandBox: sinon.SinonSandbox;
            let allChildren: Array<BlockchainTreeItem>;
            let blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider;
            let fabricConnection: sinon.SinonStubbedInstance<FabricConnection>;
            let registryEntry: FabricGatewayRegistryEntry;
            let getGatewayRegistryEntryStub: sinon.SinonStub;
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

                fabricConnection.getInstantiatedChaincode.withArgs('channelOne').resolves([{
                    name: 'biscuit-network',
                    version: '0.7'
                }]);
                fabricConnection.getInstantiatedChaincode.withArgs('channelTwo').resolves([{
                    name: 'cake-network',
                    version: '0.10'
                }]);

                fabricConnection.getMetadata.withArgs('biscuit-network', 'channelOne').resolves(
                    {
                        contracts: {
                            'my-contract': {
                                name: 'my-contract',
                                transactions: [
                                    {
                                        name: 'tradeBiscuits'
                                    },
                                    {
                                        name: 'bourbons'
                                    }
                                ],
                            },
                            'someOtherContract': {
                                name: 'someOtherContract',
                                transactions: [
                                    {
                                        name: 'shortbread'
                                    },
                                    {
                                        name: 'hobnobs'
                                    }
                                ],
                            }
                        }
                    }
                );

                fabricConnection.getMetadata.withArgs('cake-network', 'channelTwo').resolves(
                    {
                        contracts: {
                            'my-contract': {
                                name: 'my-contract',
                                transactions: [],
                            }
                        }
                    }
                );

                blockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
                const fabricConnectionManager: FabricConnectionManager = FabricConnectionManager.instance();
                const getConnectionStub: sinon.SinonStub = mySandBox.stub(fabricConnectionManager, 'getConnection').returns((fabricConnection as any) as FabricConnection);

                registryEntry = new FabricGatewayRegistryEntry();
                registryEntry.name = 'myGateway';
                registryEntry.connectionProfilePath = 'myPath';
                registryEntry.managedRuntime = false;
                getGatewayRegistryEntryStub = mySandBox.stub(FabricConnectionManager.instance(), 'getGatewayRegistryEntry').returns(registryEntry);
                allChildren = await blockchainNetworkExplorerProvider.getChildren();
            });

            afterEach(() => {
                mySandBox.restore();
            });

            it('should create a connected tree if there is a connection', async () => {
                allChildren.length.should.equal(3);

                const connectedItem: ConnectedTreeItem = allChildren[0] as ConnectedTreeItem;
                connectedItem.label.should.equal('Connected via gateway: myGateway');
                connectedItem.contextValue.should.equal('blockchain-connected-item');
                connectedItem.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                connectedItem.connection.name.should.equal('myGateway');

                const channels: Array<ChannelTreeItem> = await blockchainNetworkExplorerProvider.getChildren(allChildren[2]) as Array<ChannelTreeItem>;
                const channelOne: ChannelTreeItem = channels[0];

                channelOne.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                channelOne.contextValue.should.equal('blockchain-channel-item');
                channelOne.label.should.equal('channelOne');
                channelOne.peers.should.deep.equal(['peerOne']);

                const channelTwo: ChannelTreeItem = channels[1];
                channelTwo.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                channelTwo.contextValue.should.equal('blockchain-channel-item');
                channelTwo.label.should.equal('channelTwo');
                channelTwo.peers.should.deep.equal(['peerOne', 'peerTwo']);
            });

            it('should update connected to context value if managed runtime', async () => {
                registryEntry.managedRuntime = true;
                getGatewayRegistryEntryStub.returns(registryEntry);
                allChildren = await myExtension.getBlockchainNetworkExplorerProvider().getChildren();

                allChildren.length.should.equal(3);

                const connectedItem: ConnectedTreeItem = allChildren[0] as ConnectedTreeItem;
                connectedItem.label.should.equal('Connected via gateway: myGateway');
                connectedItem.contextValue.should.equal('blockchain-connected-runtime-item');
                connectedItem.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                connectedItem.connection.name.should.equal('myGateway');

                const channels: Array<ChannelTreeItem> = await blockchainNetworkExplorerProvider.getChildren(allChildren[2]) as Array<ChannelTreeItem>;
                const channelOne: ChannelTreeItem = channels[0];

                channelOne.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                channelOne.contextValue.should.equal('blockchain-channel-item');
                channelOne.label.should.equal('channelOne');
                channelOne.peers.should.deep.equal(['peerOne']);

                const channelTwo: ChannelTreeItem = channels[1];

                channelTwo.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                channelTwo.contextValue.should.equal('blockchain-channel-item');
                channelTwo.label.should.equal('channelTwo');
                channelTwo.peers.should.deep.equal(['peerOne', 'peerTwo']);
            });

            it('should create channel children correctly', async () => {

                allChildren.length.should.equal(3);
                const channels: Array<ChannelTreeItem> = await blockchainNetworkExplorerProvider.getChildren(allChildren[2]) as Array<ChannelTreeItem>;

                const channelChildrenOne: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren(channels[0]);
                channelChildrenOne.length.should.equal(1);

                const instantiatedTreeItemOne: InstantiatedChaincodeTreeItem = channelChildrenOne[0] as InstantiatedChaincodeTreeItem;
                instantiatedTreeItemOne.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                instantiatedTreeItemOne.name.should.equal('biscuit-network');
                instantiatedTreeItemOne.version.should.equal('0.7');
                instantiatedTreeItemOne.label.should.equal('biscuit-network@0.7');
                instantiatedTreeItemOne.contextValue.should.equal('blockchain-instantiated-chaincode-item');
                instantiatedTreeItemOne.channel.label.should.equal('channelOne');

                const channelChildrenTwo: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren(channels[1]);
                channelChildrenTwo.length.should.equal(1);

                const instantiatedTreeItemTwo: InstantiatedChaincodeTreeItem = channelChildrenTwo[0] as InstantiatedChaincodeTreeItem;
                instantiatedTreeItemTwo.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                instantiatedTreeItemTwo.name.should.equal('cake-network');
                instantiatedTreeItemTwo.version.should.equal('0.10');
                instantiatedTreeItemTwo.label.should.equal('cake-network@0.10');
                instantiatedTreeItemTwo.contextValue.should.equal('blockchain-instantiated-chaincode-item');
                instantiatedTreeItemTwo.channel.label.should.equal('channelTwo');
            });

            it('should not create anything if no peers', async () => {

                fabricConnection.getAllPeerNames.returns([]);

                allChildren = await blockchainNetworkExplorerProvider.getChildren();

                allChildren.length.should.equal(3);
                allChildren[0].label.should.equal('Connected via gateway: myGateway');
            });

            it('should error if problem with instantiate chaincodes', async () => {

                fabricConnection.getInstantiatedChaincode.withArgs('channelOne').rejects({ message: 'some error' });

                allChildren = await blockchainNetworkExplorerProvider.getChildren();
                allChildren.length.should.equal(3);

                const channels: Array<ChannelTreeItem> = await blockchainNetworkExplorerProvider.getChildren(allChildren[2]) as Array<ChannelTreeItem>;

                channels.length.should.equal(2);
                errorSpy.should.have.been.calledWith('Error getting instantiated smart contracts for channel channelOne some error');

                const channelOne: ChannelTreeItem = channels[0] as ChannelTreeItem;
                channelOne.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                const channelChildrenOne: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren(channelOne);
                channelChildrenOne.length.should.equal(0);
            });

            it('should handle no instantiated chaincodes', async () => {

                fabricConnection.getInstantiatedChaincode.withArgs('channelOne').resolves([]);

                allChildren = await blockchainNetworkExplorerProvider.getChildren();
                allChildren.length.should.equal(3);

                const channels: Array<ChannelTreeItem> = await blockchainNetworkExplorerProvider.getChildren(allChildren[2]) as Array<ChannelTreeItem>;
                channels.length.should.equal(2);

                const channelOne: ChannelTreeItem = channels[0] as ChannelTreeItem;
                channelOne.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                channelOne.contextValue.should.equal('blockchain-channel-item');
                channelOne.label.should.equal('channelOne');
                channelOne.peers.should.deep.equal(['peerOne']);
                const channelChildrenOne: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren(channelOne);
                channelChildrenOne.length.should.equal(0);

                const channelTwo: ChannelTreeItem = channels[1];
                channelTwo.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                channelTwo.contextValue.should.equal('blockchain-channel-item');
                channelTwo.label.should.equal('channelTwo');
                channelTwo.peers.should.deep.equal(['peerOne', 'peerTwo']);
                const channelChildrenTwo: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren(channelTwo);
                channelChildrenTwo.length.should.equal(1);

                const instantiatedTreeItemTwo: InstantiatedChaincodeTreeItem = channelChildrenTwo[0] as InstantiatedChaincodeTreeItem;
                instantiatedTreeItemTwo.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                instantiatedTreeItemTwo.name.should.equal('cake-network');
                instantiatedTreeItemTwo.version.should.equal('0.10');
                instantiatedTreeItemTwo.label.should.equal('cake-network@0.10');
                instantiatedTreeItemTwo.contextValue.should.equal('blockchain-instantiated-chaincode-item');
                instantiatedTreeItemTwo.channel.label.should.equal('channelTwo');

                errorSpy.should.not.have.been.called;
            });

            it('should create instantiated chaincode correctly', async () => {

                allChildren = await blockchainNetworkExplorerProvider.getChildren();
                allChildren.length.should.equal(3);

                const channels: Array<ChannelTreeItem> = await blockchainNetworkExplorerProvider.getChildren(allChildren[2]) as Array<ChannelTreeItem>;

                const channelOne: ChannelTreeItem = channels[0] as ChannelTreeItem;

                const channelChildrenOne: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren(channelOne);
                channelChildrenOne.length.should.equal(1);

                const instantiatedChaincodeItemOne: InstantiatedChaincodeTreeItem = channelChildrenOne[0] as InstantiatedChaincodeTreeItem;

                instantiatedChaincodeItemOne.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                instantiatedChaincodeItemOne.contextValue.should.equal('blockchain-instantiated-chaincode-item');
                instantiatedChaincodeItemOne.label.should.equal('biscuit-network@0.7');
                instantiatedChaincodeItemOne.channel.should.equal(channelOne);
                instantiatedChaincodeItemOne.version.should.equal('0.7');
                instantiatedChaincodeItemOne.contracts.should.deep.equal(['my-contract', 'someOtherContract']);

                const channelTwo: ChannelTreeItem = channels[1] as ChannelTreeItem;

                const channelChildrenTwo: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren(channelTwo);
                channelChildrenTwo.length.should.equal(1);

                const instantiatedChaincodeItemTwo: InstantiatedChaincodeTreeItem = channelChildrenTwo[0] as InstantiatedChaincodeTreeItem;

                instantiatedChaincodeItemTwo.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                instantiatedChaincodeItemTwo.contextValue.should.equal('blockchain-instantiated-chaincode-item');
                instantiatedChaincodeItemTwo.label.should.equal('cake-network@0.10');
                instantiatedChaincodeItemTwo.channel.should.equal(channelTwo);
                instantiatedChaincodeItemTwo.version.should.equal('0.10');
                instantiatedChaincodeItemTwo.contracts.should.deep.equal([]);

                errorSpy.should.not.have.been.called;
            });

            it('should create the contract tree correctly', async () => {
                allChildren = await blockchainNetworkExplorerProvider.getChildren();
                allChildren.length.should.equal(3);

                const channels: Array<ChannelTreeItem> = await blockchainNetworkExplorerProvider.getChildren(allChildren[2]) as Array<ChannelTreeItem>;

                const channelOne: ChannelTreeItem = channels[0] as ChannelTreeItem;

                const channelChildrenOne: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren(channelOne);
                channelChildrenOne.length.should.equal(1);

                const instantiatedChaincodeItemOne: InstantiatedChaincodeTreeItem = channelChildrenOne[0] as InstantiatedChaincodeTreeItem;

                const contractsOne: Array<ContractTreeItem> = await blockchainNetworkExplorerProvider.getChildren(instantiatedChaincodeItemOne) as Array<ContractTreeItem>;
                contractsOne.length.should.equal(2);
                contractsOne[0].label.should.equal('my-contract');
                contractsOne[0].instantiatedChaincode.name.should.equal('biscuit-network');
                contractsOne[0].instantiatedChaincode.channel.label.should.equal('channelOne');
                contractsOne[0].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                contractsOne[1].label.should.equal('someOtherContract');
                contractsOne[1].instantiatedChaincode.name.should.equal('biscuit-network');
                contractsOne[1].instantiatedChaincode.channel.label.should.equal('channelOne');
                contractsOne[1].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);

                const channelTwo: ChannelTreeItem = channels[1] as ChannelTreeItem;

                const channelChildrenTwo: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren(channelTwo);
                channelChildrenTwo.length.should.equal(1);

                const instantiatedChaincodeItemTwo: InstantiatedChaincodeTreeItem = channelChildrenTwo[0] as InstantiatedChaincodeTreeItem;
                const contractsTwo: Array<ContractTreeItem> = await blockchainNetworkExplorerProvider.getChildren(instantiatedChaincodeItemTwo) as Array<ContractTreeItem>;
                contractsTwo.should.deep.equal([]);
                instantiatedChaincodeItemTwo.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);

                errorSpy.should.not.have.been.called;
            });

            it('should show the transactions and not contracts if the contract name is empty', async () => {
                fabricConnection.getMetadata.withArgs('biscuit-network', 'channelOne').resolves(
                    {
                        contracts: {
                            '': {
                                name: '',
                                transactions: [
                                    {
                                        name: 'tradeBiscuits'
                                    },
                                    {
                                        name: 'bourbons'
                                    }
                                ],
                            }
                        }
                    }
                );

                allChildren = await blockchainNetworkExplorerProvider.getChildren();
                allChildren.length.should.equal(3);

                const channels: Array<ChannelTreeItem> = await blockchainNetworkExplorerProvider.getChildren(allChildren[2]) as Array<ChannelTreeItem>;

                const channelOne: ChannelTreeItem = channels[0] as ChannelTreeItem;

                const channelChildrenOne: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren(channelOne);
                channelChildrenOne.length.should.equal(1);

                const instantiatedChaincodeItemOne: InstantiatedChaincodeTreeItem = channelChildrenOne[0] as InstantiatedChaincodeTreeItem;

                const transactions: Array<TransactionTreeItem> = await blockchainNetworkExplorerProvider.getChildren(instantiatedChaincodeItemOne) as Array<TransactionTreeItem>;
                transactions.length.should.equal(2);
                transactions[0].label.should.equal('tradeBiscuits');
                transactions[0].chaincodeName.should.equal('biscuit-network');
                transactions[0].channelName.should.equal('channelOne');
                transactions[0].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                transactions[0].contractName.should.equal('');
                transactions[1].label.should.equal('bourbons');
                transactions[1].chaincodeName.should.equal('biscuit-network');
                transactions[1].channelName.should.equal('channelOne');
                transactions[1].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                transactions[1].contractName.should.equal('');

                errorSpy.should.not.have.been.called;
            });

            it('should show the transactions and not contracts if there is only one contract', async () => {
                fabricConnection.getMetadata.withArgs('cake-network', 'channelTwo').resolves(
                    {
                        contracts: {
                            'my-contract': {
                                name: 'my-contract',
                                transactions: [
                                    {
                                        name: 'garabaldi'
                                    },
                                    {
                                        name: 'shortbread'
                                    }
                                ],
                            }
                        }
                    }
                );
                const channels: ChannelTreeItem = allChildren[2] as ChannelTreeItem;

                const channelChildren: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren(channels);
                const channelChildrenTwo: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren(channelChildren[1]);

                const instantiatedChaincodeItemOne: InstantiatedChaincodeTreeItem = channelChildrenTwo[0] as InstantiatedChaincodeTreeItem;

                const transactions: Array<TransactionTreeItem> = await blockchainNetworkExplorerProvider.getChildren(instantiatedChaincodeItemOne) as Array<TransactionTreeItem>;
                transactions.length.should.equal(2);
                transactions[0].label.should.equal('garabaldi');
                transactions[0].chaincodeName.should.equal('cake-network');
                transactions[0].channelName.should.equal('channelTwo');
                transactions[0].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                transactions[0].contractName.should.equal('my-contract');
                transactions[1].label.should.equal('shortbread');
                transactions[1].chaincodeName.should.equal('cake-network');
                transactions[1].channelName.should.equal('channelTwo');
                transactions[1].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                transactions[1].contractName.should.equal('my-contract');

                errorSpy.should.not.have.been.called;
            });

            it('should create the transactions correctly', async () => {

                allChildren = await blockchainNetworkExplorerProvider.getChildren();
                allChildren.length.should.equal(3);

                const channels: Array<ChannelTreeItem> = await blockchainNetworkExplorerProvider.getChildren(allChildren[2]) as Array<ChannelTreeItem>;

                const channelOne: ChannelTreeItem = channels[0] as ChannelTreeItem;

                const channelChildrenOne: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren(channelOne);
                channelChildrenOne.length.should.equal(1);

                const instantiatedChaincodeItemOne: InstantiatedChaincodeTreeItem = channelChildrenOne[0] as InstantiatedChaincodeTreeItem;

                const contractsOne: Array<ContractTreeItem> = await blockchainNetworkExplorerProvider.getChildren(instantiatedChaincodeItemOne) as Array<ContractTreeItem>;

                const transactionsOneMyContract: Array<TransactionTreeItem> = await blockchainNetworkExplorerProvider.getChildren(contractsOne[0]) as Array<TransactionTreeItem>;

                transactionsOneMyContract.length.should.equal(2);
                transactionsOneMyContract[0].label.should.equal('tradeBiscuits');
                transactionsOneMyContract[0].chaincodeName.should.equal('biscuit-network');
                transactionsOneMyContract[0].channelName.should.equal('channelOne');
                transactionsOneMyContract[0].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                transactionsOneMyContract[0].contractName.should.equal('my-contract');
                transactionsOneMyContract[1].label.should.equal('bourbons');
                transactionsOneMyContract[1].chaincodeName.should.equal('biscuit-network');
                transactionsOneMyContract[1].channelName.should.equal('channelOne');
                transactionsOneMyContract[1].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                transactionsOneMyContract[1].contractName.should.equal('my-contract');

                const transactionsOneSomeOtherContract: Array<TransactionTreeItem> = await blockchainNetworkExplorerProvider.getChildren(contractsOne[1]) as Array<TransactionTreeItem>;
                transactionsOneSomeOtherContract.length.should.equal(2);
                transactionsOneSomeOtherContract[0].label.should.equal('shortbread');
                transactionsOneSomeOtherContract[0].chaincodeName.should.equal('biscuit-network');
                transactionsOneSomeOtherContract[0].channelName.should.equal('channelOne');
                transactionsOneSomeOtherContract[0].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                transactionsOneSomeOtherContract[0].contractName.should.equal('someOtherContract');
                transactionsOneSomeOtherContract[1].label.should.equal('hobnobs');
                transactionsOneSomeOtherContract[1].chaincodeName.should.equal('biscuit-network');
                transactionsOneSomeOtherContract[1].channelName.should.equal('channelOne');
                transactionsOneSomeOtherContract[1].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                transactionsOneSomeOtherContract[1].contractName.should.equal('someOtherContract');

                const channelTwo: ChannelTreeItem = channels[1] as ChannelTreeItem;

                const channelChildrenTwo: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren(channelTwo);
                channelChildrenTwo.length.should.equal(1);

                const instantiatedChaincodeItemTwo: InstantiatedChaincodeTreeItem = channelChildrenTwo[0] as InstantiatedChaincodeTreeItem;

                instantiatedChaincodeItemTwo.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);

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

            const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();

            const onDidChangeTreeDataSpy: sinon.SinonSpy = mySandBox.spy(blockchainNetworkExplorerProvider['_onDidChangeTreeData'], 'fire');

            await vscode.commands.executeCommand('blockchainConnectionsExplorer.refreshEntry');

            onDidChangeTreeDataSpy.should.have.been.called;
        });

        it('should test the tree is refreshed when the refresh command is run', async () => {

            const mockTreeItem: sinon.SinonStubbedInstance<ConnectionTreeItem> = sinon.createStubInstance(ConnectionTreeItem);

            const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();

            const onDidChangeTreeDataSpy: sinon.SinonSpy = mySandBox.spy(blockchainNetworkExplorerProvider['_onDidChangeTreeData'], 'fire');

            await vscode.commands.executeCommand('blockchainConnectionsExplorer.refreshEntry', mockTreeItem);

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
            const gateways: Array<any> = [];

            const myGateway: any = {
                name: 'myGateway',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json'),
                walletPath: path.join(rootPath, '../../test/data/walletDir/wallet')
            };

            gateways.push(myGateway);

            await vscode.workspace.getConfiguration().update('fabric.gateways', gateways, vscode.ConfigurationTarget.Global);

            const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
            const allChildren: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren();

            const result: ConnectionTreeItem = blockchainNetworkExplorerProvider.getTreeItem(allChildren[0]) as ConnectionTreeItem;

            result.label.should.equal('myGateway');
        });
    });

    describe('createConnectionUncompleteTree and createWalletUncompleteTree', () => {

        let mySandBox: sinon.SinonSandbox;

        beforeEach(async () => {
            mySandBox = sinon.createSandbox();

            await ExtensionUtil.activateExtension();
        });

        afterEach(() => {
            mySandBox.restore();
        });

        it('should show uncompleted connection', async () => {
            const gateways: Array<any> = [];
            gateways.push({
                name: 'myGatewayA',
                connectionProfilePath: FabricGatewayHelper.CONNECTION_PROFILE_PATH_DEFAULT,
                walletPath: FabricGatewayHelper.WALLET_PATH_DEFAULT
            });

            await vscode.workspace.getConfiguration().update('fabric.gateways', gateways, vscode.ConfigurationTarget.Global);

            mySandBox.stub(FabricGatewayHelper, 'connectionProfilePathComplete').returns(false);
            mySandBox.stub(FabricGatewayHelper, 'walletPathComplete').returns(false);

            const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
            const gateway: BlockchainTreeItem[] = await blockchainNetworkExplorerProvider.getChildren();
            const allChildren: Array<GatewayPropertyTreeItem> = await blockchainNetworkExplorerProvider.getChildren(gateway[0]) as Array<GatewayPropertyTreeItem>;
            allChildren.length.should.equal(2);
            allChildren[0].label.should.equal('+ Connection Profile');
            allChildren[0].should.be.an.instanceOf(GatewayPropertyTreeItem);
            allChildren[0].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
            allChildren[1].label.should.equal('+ Wallet');
            allChildren[1].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
            allChildren[1].should.be.an.instanceOf(GatewayPropertyTreeItem);

            const walletChildren: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren(allChildren[1] as GatewayPropertyTreeItem);
            walletChildren.length.should.equal(1);
            walletChildren[0].label.should.equal('+ Identity');
            walletChildren[0].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
            walletChildren[0].should.be.an.instanceOf(GatewayPropertyTreeItem);
        });

        it('should show completed connection profile path', async () => {
            const entry: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
            entry.name = 'semiCompletedGateway';
            entry.connectionProfilePath = 'some value';
            entry.walletPath = FabricGatewayHelper.WALLET_PATH_DEFAULT;

            const gateways: FabricGatewayRegistryEntry[] = [entry];

            await vscode.workspace.getConfiguration().update('fabric.gateways', gateways, vscode.ConfigurationTarget.Global);

            const blockchainNetworkExplorer: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
            mySandBox.stub(FabricGatewayHelper, 'connectionProfilePathComplete').returns(true);
            mySandBox.stub(FabricGatewayHelper, 'walletPathComplete').returns(false);

            const elements: BlockchainTreeItem[] = await blockchainNetworkExplorer.getChildren();
            const gatewayChildren: GatewayPropertyTreeItem[] = await blockchainNetworkExplorer.getChildren(elements[0]) as GatewayPropertyTreeItem[];

            gatewayChildren.length.should.equal(2);
            gatewayChildren[0].label.should.equal('✓ Connection Profile');
            gatewayChildren[0].should.be.an.instanceOf(GatewayPropertyTreeItem);
            gatewayChildren[0].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
            gatewayChildren[1].label.should.equal('+ Wallet');
            gatewayChildren[1].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
            gatewayChildren[1].should.be.an.instanceOf(GatewayPropertyTreeItem);

            const walletChildren: Array<BlockchainTreeItem> = await blockchainNetworkExplorer.getChildren(gatewayChildren[1] as GatewayPropertyTreeItem);
            walletChildren.length.should.equal(1);
            walletChildren[0].label.should.equal('+ Identity');
            walletChildren[0].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
            walletChildren[0].should.be.an.instanceOf(GatewayPropertyTreeItem);
        });

        it('should show completed wallet', async () => {
            const entry: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
            entry.name = 'semiCompletedGateway';
            entry.connectionProfilePath = FabricGatewayHelper.CONNECTION_PROFILE_PATH_DEFAULT;
            entry.walletPath = 'some value';

            const gateways: FabricGatewayRegistryEntry[] = [entry];

            await vscode.workspace.getConfiguration().update('fabric.gateways', gateways, vscode.ConfigurationTarget.Global);

            const blockchainNetworkExplorer: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
            mySandBox.stub(FabricGatewayHelper, 'connectionProfilePathComplete').returns(false);
            mySandBox.stub(FabricGatewayHelper, 'walletPathComplete').returns(true);

            const elements: BlockchainTreeItem[] = await blockchainNetworkExplorer.getChildren();
            const gatewayChildren: GatewayPropertyTreeItem[] = await blockchainNetworkExplorer.getChildren(elements[0]) as GatewayPropertyTreeItem[];

            gatewayChildren[0].label.should.equal('+ Connection Profile');
            gatewayChildren[0].should.be.an.instanceOf(GatewayPropertyTreeItem);
            gatewayChildren[0].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
            gatewayChildren[1].label.should.equal('✓ Wallet');
            gatewayChildren[1].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
            gatewayChildren[1].should.be.an.instanceOf(GatewayPropertyTreeItem);
            gatewayChildren.length.should.equal(2);
        });
    });
});
