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
import { FabricRuntimeConnection } from '../../src/fabric/FabricRuntimeConnection';
import { FabricRuntimeManager } from '../../src/fabric/FabricRuntimeManager';
import { TestUtil } from '../TestUtil';
import { FabricGatewayRegistry } from '../../src/fabric/FabricGatewayRegistry';
import { FabricGatewayRegistryEntry } from '../../src/fabric/FabricGatewayRegistryEntry';
import { FabricRuntime } from '../../src/fabric/FabricRuntime';
import { FabricConnectionFactory } from '../../src/fabric/FabricConnectionFactory';
import { Reporter } from '../../src/util/Reporter';
import { ExtensionUtil } from '../../src/util/ExtensionUtil';
import { BlockchainNetworkExplorerProvider } from '../../src/explorer/BlockchainNetworkExplorer';
import { VSCodeBlockchainOutputAdapter } from '../../src/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../../src/logging/OutputAdapter';
import { FabricWallet } from '../../src/fabric/FabricWallet';
import { FabricWalletGenerator } from '../../src/fabric/FabricWalletGenerator';
import { GatewayIdentityTreeItem } from '../../src/explorer/model/GatewayIdentityTreeItem';
import { GatewayTreeItem } from '../../src/explorer/model/GatewayTreeItem';
import { ExtensionCommands } from '../../ExtensionCommands';
import { UserInputUtil } from '../../src/commands/UserInputUtil';

const should: Chai.Should = chai.should();
chai.use(sinonChai);
// tslint:disable-next-line no-var-requires
chai.use(require('chai-as-promised'));

// tslint:disable no-unused-expression
describe('ConnectCommand', () => {

    before(async () => {
        await TestUtil.setupTests();
        await TestUtil.storeGatewaysConfig();
        await TestUtil.storeRuntimesConfig();
    });

    after(async () => {
        await TestUtil.restoreGatewaysConfig();
        await TestUtil.restoreRuntimesConfig();
    });

    describe('connect', () => {

        let mySandBox: sinon.SinonSandbox;
        let rootPath: string;
        let mockConnection: sinon.SinonStubbedInstance<FabricClientConnection>;
        let mockRuntimeConnection: sinon.SinonStubbedInstance<FabricRuntimeConnection>;
        let mockRuntime: sinon.SinonStubbedInstance<FabricRuntime>;
        let logSpy: sinon.SinonSpy;
        let connectionMultiple: FabricGatewayRegistryEntry;
        let connectionSingle: FabricGatewayRegistryEntry;
        let choseIdentityQuickPick: sinon.SinonStub;
        let choseGatewayQuickPick: sinon.SinonStub;
        let identity: IdentityInfo;
        let walletGenerator: FabricWalletGenerator;

        beforeEach(async () => {
            mySandBox = sinon.createSandbox();

            mockConnection = sinon.createStubInstance(FabricClientConnection);
            mockConnection.connect.resolves();
            mockRuntimeConnection = sinon.createStubInstance(FabricRuntimeConnection);
            mockRuntimeConnection.connect.resolves();

            mySandBox.stub(FabricConnectionFactory, 'createFabricClientConnection').returns(mockConnection);
            mySandBox.stub(FabricConnectionFactory, 'createFabricRuntimeConnection').returns(mockRuntimeConnection);

            rootPath = path.dirname(__dirname);

            connectionSingle = new FabricGatewayRegistryEntry({
                name: 'myGatewayA',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                managedRuntime: false,
                walletPath: path.join(rootPath, '../../test/data/walletDir/otherWallet')
            });

            connectionMultiple = new FabricGatewayRegistryEntry({
                name: 'myGatewayB',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json'),
                managedRuntime: false,
                walletPath: path.join(rootPath, '../../test/data/walletDir/wallet')
            });

            await FabricGatewayRegistry.instance().clear();
            await FabricGatewayRegistry.instance().add(connectionSingle);
            await FabricGatewayRegistry.instance().add(connectionMultiple);

            mockRuntime = sinon.createStubInstance(FabricRuntime);
            mockRuntime.getName.returns('local_fabric');
            mockRuntime.isBusy.returns(false);
            mockRuntime.isRunning.resolves(true);
            mockRuntime.start.resolves();
            mySandBox.stub(FabricRuntimeManager.instance(), 'getRuntime').returns(mockRuntime);

            logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
            mockRuntime.getConnectionProfilePath.resolves(path.join(rootPath, '../../basic-network/connection.json'));
            walletGenerator = await FabricWalletGenerator.instance();

            identity = {
                label: 'Admin@org1.example.com',
                identifier: 'identifier',
                mspId: 'Org1MSP'
            };
            choseIdentityQuickPick = mySandBox.stub(UserInputUtil, 'showIdentitiesQuickPickBox').resolves(identity.label);
            choseGatewayQuickPick = mySandBox.stub(UserInputUtil, 'showGatewayQuickPickBox').resolves({
                label: 'myGatewayA',
                data: FabricGatewayRegistry.instance().get('myGatewayA')
            });

        });

        afterEach(async () => {
            await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT);
            mySandBox.restore();
        });

        it('should test a fabric gateway can be connected to from the command', async () => {
            const connectStub: sinon.SinonStub = mySandBox.stub(myExtension.getBlockchainNetworkExplorerProvider(), 'connect');

            await vscode.commands.executeCommand(ExtensionCommands.CONNECT);

            connectStub.should.have.been.calledOnceWithExactly(sinon.match.instanceOf(FabricClientConnection));
            choseIdentityQuickPick.should.not.have.been.called;
            mockConnection.connect.should.have.been.calledOnceWithExactly(sinon.match.instanceOf(FabricWallet), identity.label);
        });

        it('should test that a fabric gateway with multiple identities can be connected to from the quick pick', async () => {
            choseGatewayQuickPick.resolves({
                label: 'myGatewayB',
                data: FabricGatewayRegistry.instance().get('myGatewayB')
            });

            const connectStub: sinon.SinonStub = mySandBox.stub(myExtension.getBlockchainNetworkExplorerProvider(), 'connect');

            await vscode.commands.executeCommand(ExtensionCommands.CONNECT);

            connectStub.should.have.been.calledOnceWithExactly(sinon.match.instanceOf(FabricClientConnection));
            choseIdentityQuickPick.should.have.been.calledOnce;
            mockConnection.connect.should.have.been.calledOnceWithExactly(sinon.match.instanceOf(FabricWallet), identity.label);
        });

        it('should do nothing if the user cancels choosing a gateway', async () => {
            const refreshSpy: sinon.SinonSpy = mySandBox.spy(vscode.commands, 'executeCommand');

            choseGatewayQuickPick.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.CONNECT);

            refreshSpy.callCount.should.equal(1);
            refreshSpy.getCall(0).should.have.been.calledWith(ExtensionCommands.CONNECT);
            choseIdentityQuickPick.should.not.have.been.called;
            mockConnection.connect.should.not.have.been.called;
        });

        it('should do nothing if the user cancels choosing the identity to connect with', async () => {
            choseGatewayQuickPick.resolves({
                label: 'myGatewayB',
                data: FabricGatewayRegistry.instance().get('myGatewayB')
            });
            choseIdentityQuickPick.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.CONNECT);
            mockConnection.connect.should.not.have.been.called;
        });

        it('should test that a fabric gateway with a single identity can be connected to from the tree', async () => {
            const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
            const allChildren: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren();

            const myConnectionItem: GatewayTreeItem = allChildren[1] as GatewayTreeItem;

            const gatewayChildren: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren(myConnectionItem);
            const gatewayIdentity: GatewayIdentityTreeItem = gatewayChildren[0] as GatewayIdentityTreeItem;

            const connectStub: sinon.SinonStub = mySandBox.stub(myExtension.getBlockchainNetworkExplorerProvider(), 'connect');

            await vscode.commands.executeCommand(gatewayIdentity.command.command, ...gatewayIdentity.command.arguments);

            connectStub.should.have.been.calledOnceWithExactly(sinon.match.instanceOf(FabricClientConnection));
            choseIdentityQuickPick.should.not.have.been.called;
            mockConnection.connect.should.have.been.calledOnceWithExactly(sinon.match.instanceOf(FabricWallet), identity.label);
        });

        it('should test that a fabric gateway with multiple identities can be connected to from the tree', async () => {
            const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
            const allChildren: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren();

            const myConnectionItem: GatewayTreeItem = allChildren[2] as GatewayTreeItem;
            const allIdentityChildren: GatewayIdentityTreeItem[] = await blockchainNetworkExplorerProvider.getChildren(myConnectionItem) as GatewayIdentityTreeItem[];
            const myIdentityItem: GatewayIdentityTreeItem = allIdentityChildren[1] as GatewayIdentityTreeItem;

            const connectStub: sinon.SinonStub = mySandBox.stub(myExtension.getBlockchainNetworkExplorerProvider(), 'connect');

            await vscode.commands.executeCommand(myIdentityItem.command.command, ...myIdentityItem.command.arguments);

            connectStub.should.have.been.calledOnceWithExactly(sinon.match.instanceOf(FabricClientConnection));
            choseIdentityQuickPick.should.not.have.been.called;
            mockConnection.connect.should.have.been.calledOnceWithExactly(sinon.match.instanceOf(FabricWallet), 'Test@org1.example.com');
        });

        it('should handle no identities found in wallet', async () => {
            connectionSingle.walletPath = path.join(rootPath, '../../test/data/walletDir/emptyWallet');
            await FabricGatewayRegistry.instance().update(connectionSingle);

            // Populate the quick pick box with the updated registry entry
            choseGatewayQuickPick.resolves({
                label: 'myGatewayA',
                data: FabricGatewayRegistry.instance().get('myGatewayA')
            });

            await vscode.commands.executeCommand(ExtensionCommands.CONNECT);

            logSpy.should.have.been.calledWith(LogType.ERROR, 'No identities found in wallet: ' + path.join(rootPath, '../../test/data/walletDir/emptyWallet'));
        });

        it('should handle error from connecting', async () => {
            const error: Error = new Error('some error');
            mockConnection.connect.rejects(error);

            await vscode.commands.executeCommand(ExtensionCommands.CONNECT);

            logSpy.should.have.been.calledTwice;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, `connect`);
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `${error.message}`, `${error.toString()}`);
        });

        it('should connect to a managed runtime using a quick pick', async () => {
            const connection: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
            connection.name = 'local_fabric';
            connection.managedRuntime = true;
            connection.connectionProfilePath = path.join(rootPath, '../../basic-network/connection.json');
            const testFabricWallet: FabricWallet = new FabricWallet('myConnection', 'some/new/wallet/path');
            mySandBox.stub(walletGenerator, 'createLocalWallet').resolves(testFabricWallet);
            mySandBox.stub(testFabricWallet, 'getIdentityNames').resolves([identity.label]);
            mySandBox.stub(testFabricWallet, 'importIdentity').resolves();
            connection.walletPath = testFabricWallet.walletPath;

            choseGatewayQuickPick.resolves({
                label: 'local_fabric',
                data: connection
            });

            const connectStub: sinon.SinonStub = mySandBox.stub(myExtension.getBlockchainNetworkExplorerProvider(), 'connect');

            await vscode.commands.executeCommand(ExtensionCommands.CONNECT);

            connectStub.should.have.been.calledOnceWithExactly(sinon.match.instanceOf(FabricRuntimeConnection));
            choseIdentityQuickPick.should.not.have.been.called;
            mockRuntimeConnection.connect.should.have.been.calledOnceWithExactly(testFabricWallet, identity.label);
        });

        it('should connect to a managed runtime with multiple identities, using a quick pick', async () => {
            const testIdentityName: string = 'tester2';
            const connection: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
            connection.name = 'local_fabric';
            connection.managedRuntime = true;
            connection.connectionProfilePath = path.join(rootPath, '../../basic-network/connection.json');
            const testFabricWallet: FabricWallet = new FabricWallet('myConnection', 'some/new/wallet/path');
            mySandBox.stub(walletGenerator, 'createLocalWallet').resolves(testFabricWallet);
            mySandBox.stub(testFabricWallet, 'getIdentityNames').resolves([identity.label, 'tester', testIdentityName]);
            mySandBox.stub(testFabricWallet, 'importIdentity').resolves();
            connection.walletPath = testFabricWallet.walletPath;

            choseGatewayQuickPick.resolves({
                label: 'local_fabric',
                data: connection
            });

            choseIdentityQuickPick.resolves(testIdentityName);

            const connectStub: sinon.SinonStub = mySandBox.stub(myExtension.getBlockchainNetworkExplorerProvider(), 'connect');

            await vscode.commands.executeCommand(ExtensionCommands.CONNECT);

            connectStub.should.have.been.calledOnceWithExactly(sinon.match.instanceOf(FabricRuntimeConnection));
            choseIdentityQuickPick.should.have.been.called;
            mockRuntimeConnection.connect.should.have.been.calledWith(testFabricWallet, testIdentityName);
        });

        it('should connect to a managed runtime from the tree', async () => {
            const connectStub: sinon.SinonStub = mySandBox.stub(myExtension.getBlockchainNetworkExplorerProvider(), 'connect');

            const connection: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
            connection.name = 'local_fabric';
            connection.managedRuntime = true;
            connection.connectionProfilePath = path.join(rootPath, '../../basic-network/connection.json');
            const testFabricWallet: FabricWallet = new FabricWallet('myConnection', 'some/new/wallet/path');
            mySandBox.stub(walletGenerator, 'createLocalWallet').resolves(testFabricWallet);
            mySandBox.stub(walletGenerator, 'getNewWallet').returns(testFabricWallet);
            mySandBox.stub(testFabricWallet, 'getIdentityNames').resolves([identity.label]);
            mySandBox.stub(testFabricWallet, 'importIdentity').resolves();
            connection.walletPath = testFabricWallet.walletPath;

            const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
            const allChildren: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren();
            const myConnectionItem: GatewayTreeItem = allChildren[0] as GatewayTreeItem;
            const identityItems: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren(myConnectionItem);
            const identityToConnect: GatewayIdentityTreeItem = identityItems[0] as GatewayIdentityTreeItem;

            await vscode.commands.executeCommand(identityToConnect.command.command, ...identityToConnect.command.arguments);

            connectStub.should.have.been.calledOnceWithExactly(sinon.match.instanceOf(FabricRuntimeConnection));
            choseIdentityQuickPick.should.not.have.been.called;
            mockRuntimeConnection.connect.should.have.been.calledWith(testFabricWallet, identity.label);
        });

        it('should start a stopped fabric runtime before connecting', async () => {
            mockRuntime.isRunning.onCall(0).resolves(false);
            const connection: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
            connection.name = 'local_fabric';
            connection.managedRuntime = true;
            connection.connectionProfilePath = path.join(rootPath, '../../basic-network/connection.json');
            const testFabricWallet: FabricWallet = new FabricWallet('myConnection', 'some/new/wallet/path');
            mySandBox.stub(walletGenerator, 'createLocalWallet').resolves(testFabricWallet);
            mySandBox.stub(testFabricWallet, 'getIdentityNames').resolves([identity.label]);
            mySandBox.stub(testFabricWallet, 'importIdentity').resolves();
            connection.walletPath = testFabricWallet.walletPath;
            choseGatewayQuickPick.resolves({
                label: 'local_fabric',
                data: connection
            });
            const connectStub: sinon.SinonStub = mySandBox.stub(myExtension.getBlockchainNetworkExplorerProvider(), 'connect');

            const startCommandStub: sinon.SinonStub = mySandBox.stub(vscode.commands, 'executeCommand');
            startCommandStub.callThrough();
            startCommandStub.withArgs(ExtensionCommands.START_FABRIC).resolves();
            await vscode.commands.executeCommand(ExtensionCommands.CONNECT);

            choseGatewayQuickPick.should.have.been.calledOnce;
            startCommandStub.should.have.been.calledWith(ExtensionCommands.START_FABRIC);
            connectStub.should.have.been.calledOnceWithExactly(sinon.match.instanceOf(FabricRuntimeConnection));
            choseIdentityQuickPick.should.not.have.been.called;
            mockRuntimeConnection.connect.should.have.been.calledWith(testFabricWallet, identity.label);

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'connect');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, `Connecting to ${connection.name}`);
        });

        it('should stop if starting the fabric runtime failed', async () => {
            mockRuntime.isRunning.resolves(false);
            const connection: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
            connection.name = 'local_fabric';
            connection.managedRuntime = true;
            connection.connectionProfilePath = path.join(rootPath, '../../basic-network/connection.json');
            choseGatewayQuickPick.resolves({
                label: 'local_fabric',
                data: connection
            });
            const connectStub: sinon.SinonStub = mySandBox.stub(myExtension.getBlockchainNetworkExplorerProvider(), 'connect');

            const startCommandStub: sinon.SinonStub = mySandBox.stub(vscode.commands, 'executeCommand');
            startCommandStub.callThrough();
            startCommandStub.withArgs(ExtensionCommands.START_FABRIC).resolves();
            await vscode.commands.executeCommand(ExtensionCommands.CONNECT);

            choseGatewayQuickPick.should.have.been.calledOnce;
            startCommandStub.should.have.been.calledWith(ExtensionCommands.START_FABRIC);
            connectStub.should.not.have.been.called;
            logSpy.should.have.been.calledOnce;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'connect');

        });

        it('should handle the user cancelling an identity to chose from when connecting to a fabric runtime', async () => {
            const connection: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
            connection.name = 'local_fabric';
            connection.managedRuntime = true;
            connection.connectionProfilePath = path.join(rootPath, '../../basic-network/connection.json');
            const testFabricWallet: FabricWallet = new FabricWallet('myConnection', 'some/new/wallet/path');
            mySandBox.stub(walletGenerator, 'createLocalWallet').resolves(testFabricWallet);
            mySandBox.stub(testFabricWallet, 'getIdentityNames').resolves([identity.label, 'otherOne', 'anotherOne']);
            mySandBox.stub(testFabricWallet, 'importIdentity').resolves();
            connection.walletPath = testFabricWallet.walletPath;

            choseGatewayQuickPick.resolves({
                label: 'local_fabric',
                data: connection
            });
            choseIdentityQuickPick.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.CONNECT);

            choseIdentityQuickPick.should.have.been.called;
            mockRuntimeConnection.connect.should.not.have.been.called;
        });

        it('should send a telemetry event if the extension is for production', async () => {
            mySandBox.stub(ExtensionUtil, 'getPackageJSON').returns({ production: true });
            const reporterSpy: sinon.SinonSpy = mySandBox.spy(Reporter.instance(), 'sendTelemetryEvent');

            mySandBox.stub(myExtension.getBlockchainNetworkExplorerProvider(), 'connect');

            await vscode.commands.executeCommand(ExtensionCommands.CONNECT);

            reporterSpy.should.have.been.calledWith('connectCommand', { runtimeData: 'user runtime' });
        });

        it('should send a telemetry event if using IBP', async () => {
            mySandBox.stub(ExtensionUtil, 'getPackageJSON').returns({ production: true });
            const reporterSpy: sinon.SinonSpy = mySandBox.spy(Reporter.instance(), 'sendTelemetryEvent');
            mockConnection.isIBPConnection.returns(true);

            mySandBox.stub(myExtension.getBlockchainNetworkExplorerProvider(), 'connect');

            await vscode.commands.executeCommand(ExtensionCommands.CONNECT);

            reporterSpy.should.have.been.calledWith('connectCommand', { runtimeData: 'IBP instance' });
        });

        it('should send a telemetry event if not using IBP', async () => {
            mySandBox.stub(ExtensionUtil, 'getPackageJSON').returns({ production: true });
            const reporterSpy: sinon.SinonSpy = mySandBox.spy(Reporter.instance(), 'sendTelemetryEvent');
            mockConnection.isIBPConnection.returns(false);

            mySandBox.stub(myExtension.getBlockchainNetworkExplorerProvider(), 'connect');

            await vscode.commands.executeCommand(ExtensionCommands.CONNECT);

            reporterSpy.should.have.been.calledWith('connectCommand', { runtimeData: 'user runtime' });
        });
    });
});
