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
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as myExtension from '../../src/extension';
import { FabricClientConnection } from '../../src/fabric/FabricClientConnection';
import { IdentityInfo } from 'fabric-network';
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
import { BlockchainGatewayExplorerProvider } from '../../src/explorer/gatewayExplorer';
import { VSCodeBlockchainOutputAdapter } from '../../src/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../../src/logging/OutputAdapter';
import { FabricWallet } from '../../src/fabric/FabricWallet';
import { FabricWalletGenerator } from '../../src/fabric/FabricWalletGenerator';
import { GatewayTreeItem } from '../../src/explorer/model/GatewayTreeItem';
import { ExtensionCommands } from '../../ExtensionCommands';
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import { FabricWalletRegistryEntry } from '../../src/fabric/FabricWalletRegistryEntry';
import { FabricWalletRegistry } from '../../src/fabric/FabricWalletRegistry';

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
        await TestUtil.storeWalletsConfig();
    });

    after(async () => {
        await TestUtil.restoreGatewaysConfig();
        await TestUtil.restoreRuntimesConfig();
        await TestUtil.restoreWalletsConfig();
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
        let connectionMultipleWallet: FabricWalletRegistryEntry;
        let connectionSingleWallet: FabricWalletRegistryEntry;
        let choseIdentityQuickPick: sinon.SinonStub;
        let choseGatewayQuickPick: sinon.SinonStub;
        let choseWalletQuickPick: sinon.SinonStub;
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
                managedRuntime: false
            });

            connectionMultiple = new FabricGatewayRegistryEntry({
                name: 'myGatewayB',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json'),
                managedRuntime: false
            });

            await FabricGatewayRegistry.instance().clear();
            await FabricGatewayRegistry.instance().add(connectionSingle);
            await FabricGatewayRegistry.instance().add(connectionMultiple);

            connectionSingleWallet = new FabricWalletRegistryEntry({
                name: 'myGatewayAWallet',
                walletPath: path.join(rootPath, '../../test/data/walletDir/otherWallet')
            });

            connectionMultipleWallet = new FabricWalletRegistryEntry({
                name: 'myGatewayBWallet',
                walletPath: path.join(rootPath, '../../test/data/walletDir/wallet')
            });

            await FabricWalletRegistry.instance().clear();
            await FabricWalletRegistry.instance().add(connectionMultipleWallet);
            await FabricWalletRegistry.instance().add(connectionSingleWallet);

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
            choseWalletQuickPick = mySandBox.stub(UserInputUtil, 'showWalletsQuickPickBox').resolves({
                label: 'myGatewayAWallet',
                data: FabricWalletRegistry.instance().get('myGatewayAWallet')
            });

        });

        afterEach(async () => {
            await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT);
            mySandBox.restore();
        });

        it('should test a fabric gateway can be connected to from the command', async () => {
            const connectStub: sinon.SinonStub = mySandBox.stub(myExtension.getBlockchainGatewayExplorerProvider(), 'connect');

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

            choseWalletQuickPick.resolves({
                label: 'myGatewayBWallet',
                data: FabricWalletRegistry.instance().get('myGatewayBWallet')
            });

            const connectStub: sinon.SinonStub = mySandBox.stub(myExtension.getBlockchainGatewayExplorerProvider(), 'connect');

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
            choseWalletQuickPick.should.not.have.been.called;
            mockConnection.connect.should.not.have.been.called;
        });

        it('should do nothing if the user cancels choosing a wallet to connect with', async () => {
            const refreshSpy: sinon.SinonSpy = mySandBox.spy(vscode.commands, 'executeCommand');

            choseWalletQuickPick.resolves();

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
            choseWalletQuickPick.resolves({
                label: 'myGatewayBWallet',
                data: FabricWalletRegistry.instance().get('myGatewayBWallet')
            });
            choseIdentityQuickPick.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.CONNECT);
            mockConnection.connect.should.not.have.been.called;
        });

        it('should test that a fabric gateway with a single identity can be connected to from the tree', async () => {
            const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = myExtension.getBlockchainGatewayExplorerProvider();
            const allChildren: Array<BlockchainTreeItem> = await blockchainGatewayExplorerProvider.getChildren();

            const myConnectionItem: GatewayTreeItem = allChildren[1] as GatewayTreeItem;

            const connectStub: sinon.SinonStub = mySandBox.stub(myExtension.getBlockchainGatewayExplorerProvider(), 'connect');

            await vscode.commands.executeCommand(myConnectionItem.command.command, ...myConnectionItem.command.arguments);

            connectStub.should.have.been.calledOnceWithExactly(sinon.match.instanceOf(FabricClientConnection));
            choseIdentityQuickPick.should.not.have.been.called;
            mockConnection.connect.should.have.been.calledOnceWithExactly(sinon.match.instanceOf(FabricWallet), identity.label);
        });

        it('should test that a fabric gateway with multiple identities can be connected to from the tree', async () => {
            const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = myExtension.getBlockchainGatewayExplorerProvider();
            const allChildren: Array<BlockchainTreeItem> = await blockchainGatewayExplorerProvider.getChildren();

            const myConnectionItem: GatewayTreeItem = allChildren[2] as GatewayTreeItem;

            const connectStub: sinon.SinonStub = mySandBox.stub(myExtension.getBlockchainGatewayExplorerProvider(), 'connect');

            await vscode.commands.executeCommand(myConnectionItem.command.command, ...myConnectionItem.command.arguments);

            connectStub.should.have.been.calledOnceWithExactly(sinon.match.instanceOf(FabricClientConnection));
            choseIdentityQuickPick.should.not.have.been.called;
            mockConnection.connect.should.have.been.calledOnceWithExactly(sinon.match.instanceOf(FabricWallet), 'Admin@org1.example.com');
        });

        it('should handle no identities found in wallet', async () => {
            connectionSingleWallet.walletPath = path.join(rootPath, '../../test/data/walletDir/emptyWallet');
            await FabricWalletRegistry.instance().update(connectionSingleWallet);

            // Populate the quick pick box with the updated wallet registry entry
            choseWalletQuickPick.resolves({
                label: 'myGatewayAWallet',
                data: FabricWalletRegistry.instance().get('myGatewayAWallet')
            });

            await vscode.commands.executeCommand(ExtensionCommands.CONNECT);

            logSpy.should.have.been.calledWith(LogType.ERROR, 'No identities found in wallet: ' + connectionSingleWallet.name);
        });

        it('should handle error from connecting', async () => {
            const error: Error = new Error('some error');
            mockConnection.connect.rejects(error);

            await vscode.commands.executeCommand(ExtensionCommands.CONNECT);

            logSpy.should.have.been.calledTwice;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, `connect`);
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `${error.message}`, `${error.toString()}`);
        });

        describe('connect to a managed runtime', () => {
            let connectStub: sinon.SinonStub;
            let testFabricWallet: FabricWallet;
            let getIdentitiesStub: sinon.SinonStub;
            let connection: FabricGatewayRegistryEntry;

            beforeEach(async () => {
                connection = new FabricGatewayRegistryEntry();
                connection.name = 'local_fabric';
                connection.managedRuntime = true;
                connection.connectionProfilePath = path.join(rootPath, '../../basic-network/connection.json');
                testFabricWallet = new FabricWallet('some/new/wallet/path');
                mySandBox.stub(walletGenerator, 'getNewWallet').returns(testFabricWallet);
                getIdentitiesStub = mySandBox.stub(testFabricWallet, 'getIdentityNames').resolves([identity.label]);

                choseGatewayQuickPick.resolves({
                    label: 'local_fabric',
                    data: connection
                });

                choseWalletQuickPick.resolves({
                    label: 'local_wallet',
                    data: new FabricWalletRegistryEntry({
                        name: 'local_wallet',
                        walletPath: 'some/new/wallet/path'
                    })
                });

                connectStub = mySandBox.stub(myExtension.getBlockchainGatewayExplorerProvider(), 'connect');
            });

            it('should connect to a managed runtime using a quick pick', async () => {
                await vscode.commands.executeCommand(ExtensionCommands.CONNECT);

                connectStub.should.have.been.calledOnceWithExactly(sinon.match.instanceOf(FabricRuntimeConnection));
                choseIdentityQuickPick.should.not.have.been.called;
                mockRuntimeConnection.connect.should.have.been.calledOnceWithExactly(testFabricWallet, identity.label);
            });

            it('should connect to a managed runtime with multiple identities, using a quick pick', async () => {
                const testIdentityName: string = 'tester2';
                getIdentitiesStub.resolves([identity.label, 'tester', testIdentityName]);

                choseIdentityQuickPick.resolves(testIdentityName);

                await vscode.commands.executeCommand(ExtensionCommands.CONNECT);

                connectStub.should.have.been.calledOnceWithExactly(sinon.match.instanceOf(FabricRuntimeConnection));
                choseIdentityQuickPick.should.have.been.called;
                mockRuntimeConnection.connect.should.have.been.calledWith(testFabricWallet, testIdentityName);
            });

            it('should connect to a managed runtime from the tree', async () => {
                const blockchainNetworkExplorerProvider: BlockchainGatewayExplorerProvider = myExtension.getBlockchainGatewayExplorerProvider();
                const allChildren: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren();
                const myConnectionItem: GatewayTreeItem = allChildren[0] as GatewayTreeItem;

                await vscode.commands.executeCommand(myConnectionItem.command.command, ...myConnectionItem.command.arguments);

                connectStub.should.have.been.calledOnceWithExactly(sinon.match.instanceOf(FabricRuntimeConnection));
                choseIdentityQuickPick.should.not.have.been.called;
                mockRuntimeConnection.connect.should.have.been.calledWith(testFabricWallet, identity.label);
            });

            it('should start a stopped fabric runtime before connecting', async () => {
                mockRuntime.isRunning.onCall(0).resolves(false);
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

            it('should handle the user cancelling an identity to choose from when connecting to a fabric runtime', async () => {
                getIdentitiesStub.resolves([identity.label, 'otherOne', 'anotherOne']);
                choseIdentityQuickPick.resolves();

                await vscode.commands.executeCommand(ExtensionCommands.CONNECT);

                choseIdentityQuickPick.should.have.been.called;
                mockRuntimeConnection.connect.should.not.have.been.called;
            });

        });
        it('should send a telemetry event if the extension is for production', async () => {
            mySandBox.stub(ExtensionUtil, 'getPackageJSON').returns({ production: true });
            const reporterSpy: sinon.SinonSpy = mySandBox.spy(Reporter.instance(), 'sendTelemetryEvent');

            mySandBox.stub(myExtension.getBlockchainGatewayExplorerProvider(), 'connect');

            await vscode.commands.executeCommand(ExtensionCommands.CONNECT);

            reporterSpy.should.have.been.calledWith('connectCommand', { runtimeData: 'user runtime' });
        });

        it('should send a telemetry event if using IBP', async () => {
            mySandBox.stub(ExtensionUtil, 'getPackageJSON').returns({ production: true });
            const reporterSpy: sinon.SinonSpy = mySandBox.spy(Reporter.instance(), 'sendTelemetryEvent');
            mockConnection.isIBPConnection.returns(true);

            mySandBox.stub(myExtension.getBlockchainGatewayExplorerProvider(), 'connect');

            await vscode.commands.executeCommand(ExtensionCommands.CONNECT);

            reporterSpy.should.have.been.calledWith('connectCommand', { runtimeData: 'IBP instance' });
        });

        it('should send a telemetry event if not using IBP', async () => {
            mySandBox.stub(ExtensionUtil, 'getPackageJSON').returns({ production: true });
            const reporterSpy: sinon.SinonSpy = mySandBox.spy(Reporter.instance(), 'sendTelemetryEvent');
            mockConnection.isIBPConnection.returns(false);

            mySandBox.stub(myExtension.getBlockchainGatewayExplorerProvider(), 'connect');

            await vscode.commands.executeCommand(ExtensionCommands.CONNECT);

            reporterSpy.should.have.been.calledWith('connectCommand', { runtimeData: 'user runtime' });
        });
    });
});
