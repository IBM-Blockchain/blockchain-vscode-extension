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
import * as vscode from 'vscode';
import * as path from 'path';

import * as myExtension from '../../src/extension';
import { FabricClientConnection } from '../../src/fabric/FabricClientConnection';
import { IdentityInfo } from 'fabric-network';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { BlockchainTreeItem } from '../../src/explorer/model/BlockchainTreeItem';
import { ConnectionTreeItem } from '../../src/explorer/model/ConnectionTreeItem';
import { ConnectionIdentityTreeItem } from '../../src/explorer/model/ConnectionIdentityTreeItem';
import { FabricRuntimeConnection } from '../../src/fabric/FabricRuntimeConnection';
import { FabricRuntimeManager } from '../../src/fabric/FabricRuntimeManager';
import { TestUtil } from '../TestUtil';
import { FabricConnectionRegistry } from '../../src/fabric/FabricConnectionRegistry';
import { FabricConnectionRegistryEntry } from '../../src/fabric/FabricConnectionRegistryEntry';
import { FabricRuntimeRegistry } from '../../src/fabric/FabricRuntimeRegistry';
import { FabricRuntimeRegistryEntry } from '../../src/fabric/FabricRuntimeRegistryEntry';
import { FabricRuntime } from '../../src/fabric/FabricRuntime';
import { FabricConnectionFactory } from '../../src/fabric/FabricConnectionFactory';
import { Reporter } from '../../src/util/Reporter';
import { ExtensionUtil } from '../../src/util/ExtensionUtil';
import { BlockchainNetworkExplorerProvider } from '../../src/explorer/BlockchainNetworkExplorer';
import { VSCodeOutputAdapter } from '../../src/logging/VSCodeOutputAdapter';
import { LogType } from '../../src/logging/OutputAdapter';
import { FabricWallet } from '../../src/fabric/FabricWallet';
import { FabricWalletGenerator } from '../../src/fabric/FabricWalletGenerator';

const should: Chai.Should = chai.should();
chai.use(sinonChai);
// tslint:disable-next-line no-var-requires
chai.use(require('chai-as-promised'));

// tslint:disable no-unused-expression
describe('ConnectCommand', () => {

    before(async () => {
        await TestUtil.setupTests();
        await TestUtil.storeConnectionsConfig();
        await TestUtil.storeRuntimesConfig();
    });

    after(async () => {
        await TestUtil.restoreConnectionsConfig();
        await TestUtil.restoreRuntimesConfig();
    });

    describe('connect', () => {

        let mySandBox: sinon.SinonSandbox;
        let rootPath: string;
        let mockConnection: sinon.SinonStubbedInstance<FabricClientConnection>;
        let mockRuntimeConnection: sinon.SinonStubbedInstance<FabricRuntimeConnection>;
        let mockRuntime: sinon.SinonStubbedInstance<FabricRuntime>;
        let logSpy: sinon.SinonSpy;
        let connectionMultiple: FabricConnectionRegistryEntry;
        let connectionSingle: FabricConnectionRegistryEntry;
        let quickPickStub: sinon.SinonStub;
        let identity: IdentityInfo;
        let walletGenerator: FabricWalletGenerator;

        beforeEach(async () => {
            mySandBox = sinon.createSandbox();

            quickPickStub = mySandBox.stub(vscode.window, 'showQuickPick');

            mockConnection = sinon.createStubInstance(FabricClientConnection);
            mockConnection.connect.resolves();
            mockRuntimeConnection = sinon.createStubInstance(FabricRuntimeConnection);
            mockRuntimeConnection.connect.resolves();

            mySandBox.stub(FabricConnectionFactory, 'createFabricClientConnection').returns(mockConnection);
            mySandBox.stub(FabricConnectionFactory, 'createFabricRuntimeConnection').returns(mockRuntimeConnection);

            rootPath = path.dirname(__dirname);

            connectionSingle = new FabricConnectionRegistryEntry({
                name: 'myConnectionA',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                managedRuntime: false,
                walletPath: path.join(rootPath, '../../test/data/walletDir/otherWallet')
            });

            connectionMultiple = new FabricConnectionRegistryEntry({
                name: 'myConnectionB',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json'),
                managedRuntime: false,
                walletPath: path.join(rootPath, '../../test/data/walletDir/wallet')
            });

            const connectionRuntime: FabricConnectionRegistryEntry = new FabricConnectionRegistryEntry();
            connectionRuntime.name = 'myConnectionC';
            connectionRuntime.managedRuntime = true;
            connectionRuntime.connectionProfilePath = path.join(rootPath, '../../basic-network/wallet');

            await FabricConnectionRegistry.instance().clear();
            await FabricConnectionRegistry.instance().add(connectionSingle);
            await FabricConnectionRegistry.instance().add(connectionMultiple);

            const runtimeRegistry: FabricRuntimeRegistryEntry = new FabricRuntimeRegistryEntry({
                name: 'myConnectionC',
                developmentMode: false
            });
            await FabricRuntimeRegistry.instance().clear();
            await FabricRuntimeRegistry.instance().add(runtimeRegistry);

            mockRuntime = sinon.createStubInstance(FabricRuntime);
            mockRuntime.getName.returns('myConnectionC');
            mockRuntime.isBusy.returns(false);
            mockRuntime.isRunning.resolves(true);
            mySandBox.stub(FabricRuntimeManager.instance(), 'get').withArgs('myConnectionC').returns(mockRuntime);

            logSpy = mySandBox.spy(VSCodeOutputAdapter.instance(), 'log');
            mockRuntime.getConnectionProfilePath.returns(path.join(rootPath, '../../basic-network/connection.json'));
            walletGenerator = await FabricWalletGenerator.instance();

            identity = {
                label: 'Admin@org1.example.com',
                identifier: 'identifier',
                mspId: 'Org1MSP'
            };
        });

        afterEach(async () => {
            await vscode.commands.executeCommand('blockchainExplorer.disconnectEntry');
            mySandBox.restore();
        });

        it('should test the a fabric can be connected to from the command', async () => {
            quickPickStub.resolves({
                label: 'myConnectionA',
                data: FabricConnectionRegistry.instance().get('myConnectionA')
            });

            const connectStub: sinon.SinonStub = mySandBox.stub(myExtension.getBlockchainNetworkExplorerProvider(), 'connect');

            await vscode.commands.executeCommand('blockchainExplorer.connectEntry');

            connectStub.should.have.been.calledOnceWithExactly(sinon.match.instanceOf(FabricClientConnection));
        });

        it('should test the a fabric can be connected to from the command with multiple identities', async () => {
            quickPickStub.onFirstCall().resolves({
                label: 'myConnectionB',
                data: FabricConnectionRegistry.instance().get('myConnectionB')
            });
            quickPickStub.onSecondCall().resolves({
                label: 'Admin@org1.example.com',
                data: {
                    label: 'Admin@org1.example.com',
                    identifer: 'identifier',
                    mspid: 'Org1MSP'
                }
            });

            const connectStub: sinon.SinonStub = mySandBox.stub(myExtension.getBlockchainNetworkExplorerProvider(), 'connect');

            await vscode.commands.executeCommand('blockchainExplorer.connectEntry');

            connectStub.should.have.been.calledOnceWithExactly(sinon.match.instanceOf(FabricClientConnection));
        });

        it('should do nothing if the user cancels choosing a connection', async () => {
            const refreshSpy: sinon.SinonSpy = mySandBox.spy(vscode.commands, 'executeCommand');

            quickPickStub.onFirstCall().resolves();

            await vscode.commands.executeCommand('blockchainExplorer.connectEntry');

            refreshSpy.callCount.should.equal(1);
            refreshSpy.getCall(0).should.have.been.calledWith('blockchainExplorer.connectEntry');
        });

        it('should do nothing if the user cancels choosing the identity to connect with', async () => {
            quickPickStub.onFirstCall().resolves({
                label: 'myConnectionB',
                data: FabricConnectionRegistry.instance().get('myConnectionB')
            });
            quickPickStub.onSecondCall().resolves();

            await vscode.commands.executeCommand('blockchainExplorer.connectEntry');
        });

        it('should test the a fabric with a single identity can be connected to from the tree', async () => {
            const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
            const allChildren: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren();

            const myConnectionItem: ConnectionTreeItem = allChildren[0] as ConnectionTreeItem;

            const connectStub: sinon.SinonStub = mySandBox.stub(myExtension.getBlockchainNetworkExplorerProvider(), 'connect');

            await vscode.commands.executeCommand(myConnectionItem.command.command, ...myConnectionItem.command.arguments);

            connectStub.should.have.been.calledOnceWithExactly(sinon.match.instanceOf(FabricClientConnection));
        });

        it('should test the a fabric with multiple identities can be connected to from the tree', async () => {
            const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
            const allChildren: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren();

            const myConnectionItem: ConnectionTreeItem = allChildren[1] as ConnectionTreeItem;
            const allIdentityChildren: ConnectionIdentityTreeItem[] = await blockchainNetworkExplorerProvider.getChildren(myConnectionItem) as ConnectionIdentityTreeItem[];
            const myIdentityItem: ConnectionIdentityTreeItem = allIdentityChildren[1] as ConnectionIdentityTreeItem;

            const connectStub: sinon.SinonStub = mySandBox.stub(myExtension.getBlockchainNetworkExplorerProvider(), 'connect');

            await vscode.commands.executeCommand(myIdentityItem.command.command, ...myIdentityItem.command.arguments);

            connectStub.should.have.been.calledOnceWithExactly(sinon.match.instanceOf(FabricClientConnection));
        });

        it('should handle no identities found in wallet', async () => {
            connectionSingle.walletPath = path.join(rootPath, '../../test/data/walletDir/emptyWallet');
            await FabricConnectionRegistry.instance().update(connectionSingle);

            quickPickStub.onFirstCall().resolves({
                label: 'myConnectionA',
                data: FabricConnectionRegistry.instance().get('myConnectionA')
            });

            await vscode.commands.executeCommand('blockchainExplorer.connectEntry');

            logSpy.should.have.been.calledWith(LogType.ERROR, 'No identities found in wallet: ' + path.join(rootPath, '../../test/data/walletDir/emptyWallet'));
        });

        it('should handle error from connecting', async () => {
            const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
            await blockchainNetworkExplorerProvider.getChildren();

            const error: Error = new Error('some error');
            mockConnection.connect.rejects(error);

            quickPickStub.onFirstCall().resolves({
                label: 'myConnectionA',
                data: FabricConnectionRegistry.instance().get('myConnectionA')
            });
            quickPickStub.onSecondCall().resolves({
                label: 'Admin@org1.example.com',
                data: identity
            });

            await vscode.commands.executeCommand('blockchainExplorer.connectEntry').should.be.rejected;

            logSpy.should.have.been.calledWith(LogType.ERROR, `${error.message}`, `${error.toString()}`);
        });

        it('should connect to a managed runtime using a quick pick', async () => {
            const connection: FabricConnectionRegistryEntry = new FabricConnectionRegistryEntry();
            connection.name = 'myConnectionC';
            connection.managedRuntime = true;
            connection.connectionProfilePath = path.join(rootPath, '../../basic-network/connection.json');
            const testFabricWallet: FabricWallet = new FabricWallet('myConnection', 'some/new/wallet/path');
            mySandBox.stub(walletGenerator, 'createLocalWallet').resolves(testFabricWallet);
            mySandBox.stub(testFabricWallet, 'importIdentity').resolves();
            connection.walletPath = testFabricWallet.walletPath;

            quickPickStub.resolves({
                label: 'myConnectionC',
                data: connection
            });

            const connectStub: sinon.SinonStub = mySandBox.stub(myExtension.getBlockchainNetworkExplorerProvider(), 'connect');

            await vscode.commands.executeCommand('blockchainExplorer.connectEntry');

            connectStub.should.have.been.calledOnceWithExactly(sinon.match.instanceOf(FabricRuntimeConnection));
        });

        it('should connect to a managed runtime from the tree', async () => {
            const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
            const allChildren: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren();
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });

            const myConnectionItem: BlockchainTreeItem = allChildren[2] as BlockchainTreeItem;

            const connectStub: sinon.SinonStub = mySandBox.stub(myExtension.getBlockchainNetworkExplorerProvider(), 'connect');

            const testFabricWallet: FabricWallet = new FabricWallet('myConnection', 'some/new/wallet/path');
            mySandBox.stub(walletGenerator, 'createLocalWallet').resolves(testFabricWallet);
            mySandBox.stub(testFabricWallet, 'importIdentity').resolves();

            await vscode.commands.executeCommand(myConnectionItem.command.command, myConnectionItem.command.arguments[0]);

            connectStub.should.have.been.calledOnceWithExactly(sinon.match.instanceOf(FabricRuntimeConnection));
        });

        it('should start a stopped fabric runtime before connecting', async () => {
            mockRuntime.isRunning.resolves(false);
            const connection: FabricConnectionRegistryEntry = new FabricConnectionRegistryEntry();
            connection.name = 'myConnectionC';
            connection.managedRuntime = true;
            connection.connectionProfilePath = path.join(rootPath, '../../basic-network/connection.json');
            const testFabricWallet: FabricWallet = new FabricWallet('myConnection', 'some/new/wallet/path');
            mySandBox.stub(walletGenerator, 'createLocalWallet').resolves(testFabricWallet);
            mySandBox.stub(testFabricWallet, 'importIdentity').resolves();
            connection.walletPath = testFabricWallet.walletPath;
            quickPickStub.resolves({
                label: 'myConnectionC',
                data: connection
            });
            const connectStub: sinon.SinonStub = mySandBox.stub(myExtension.getBlockchainNetworkExplorerProvider(), 'connect');

            await vscode.commands.executeCommand('blockchainExplorer.connectEntry');

            quickPickStub.should.have.been.calledOnce;
            mockRuntime.start.should.have.been.calledOnce;
            connectStub.should.have.been.calledOnceWithExactly(sinon.match.instanceOf(FabricRuntimeConnection));

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'connect');
            logSpy.getCall(1).should.have.been.calledWith(LogType.INFO, undefined, 'startFabricRuntime');
            logSpy.getCall(2).should.have.been.calledWith(LogType.SUCCESS, `Connected to ${connection.name}`);
        });

        it('should send a telemetry event if the extension is for production', async () => {
            mySandBox.stub(ExtensionUtil, 'getPackageJSON').returns({ production: true });
            const reporterSpy: sinon.SinonSpy = mySandBox.spy(Reporter.instance(), 'sendTelemetryEvent');

            quickPickStub.resolves({
                label: 'myConnectionA',
                data: FabricConnectionRegistry.instance().get('myConnectionA')
            });

            mySandBox.stub(myExtension.getBlockchainNetworkExplorerProvider(), 'connect');

            await vscode.commands.executeCommand('blockchainExplorer.connectEntry');

            reporterSpy.should.have.been.calledWith('connectCommand', { runtimeData: 'user runtime' });
        });

        it('should send a telemetry event if using IBP', async () => {
            mySandBox.stub(ExtensionUtil, 'getPackageJSON').returns({ production: true });
            const reporterSpy: sinon.SinonSpy = mySandBox.spy(Reporter.instance(), 'sendTelemetryEvent');
            mockConnection.isIBPConnection.returns(true);
            quickPickStub.resolves({
                label: 'myConnectionA',
                data: FabricConnectionRegistry.instance().get('myConnectionA')
            });

            mySandBox.stub(myExtension.getBlockchainNetworkExplorerProvider(), 'connect');

            await vscode.commands.executeCommand('blockchainExplorer.connectEntry');

            reporterSpy.should.have.been.calledWith('connectCommand', { runtimeData: 'IBP instance' });
        });

        it('should send a telemetry event if not using IBP', async () => {
            mySandBox.stub(ExtensionUtil, 'getPackageJSON').returns({ production: true });
            const reporterSpy: sinon.SinonSpy = mySandBox.spy(Reporter.instance(), 'sendTelemetryEvent');
            mockConnection.isIBPConnection.returns(false);
            quickPickStub.resolves({
                label: 'myConnectionA',
                data: FabricConnectionRegistry.instance().get('myConnectionA')
            });

            mySandBox.stub(myExtension.getBlockchainNetworkExplorerProvider(), 'connect');

            await vscode.commands.executeCommand('blockchainExplorer.connectEntry');

            reporterSpy.should.have.been.calledWith('connectCommand', { runtimeData: 'user runtime' });
        });
    });
});
