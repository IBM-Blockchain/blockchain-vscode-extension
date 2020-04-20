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
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { FabricEnvironmentConnection } from 'ibm-blockchain-platform-environment-v1';
import { BlockchainTreeItem } from '../../extension/explorer/model/BlockchainTreeItem';
import { TestUtil } from '../TestUtil';
import { FabricConnectionFactory } from '../../extension/fabric/FabricConnectionFactory';
import { Reporter } from '../../extension/util/Reporter';
import { BlockchainEnvironmentExplorerProvider } from '../../extension/explorer/environmentExplorer';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { ExtensionCommands } from '../../ExtensionCommands';
import { UserInputUtil } from '../../extension/commands/UserInputUtil';
import { FabricEnvironmentRegistry, FabricEnvironmentRegistryEntry, FabricRuntimeUtil, LogType, EnvironmentType, FabricEnvironment, FabricNode } from 'ibm-blockchain-platform-common';
import { FabricEnvironmentTreeItem } from '../../extension/explorer/runtimeOps/disconnectedTree/FabricEnvironmentTreeItem';
import { RuntimeTreeItem } from '../../extension/explorer/runtimeOps/disconnectedTree/RuntimeTreeItem';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';
import { FabricEnvironmentManager, ConnectedState } from '../../extension/fabric/environments/FabricEnvironmentManager';
import { LocalEnvironment } from '../../extension/fabric/environments/LocalEnvironment';
import { EnvironmentFactory } from '../../extension/fabric/environments/EnvironmentFactory';

chai.use(sinonChai);
// tslint:disable-next-line no-var-requires
chai.use(require('chai-as-promised'));

// tslint:disable no-unused-expression
describe('EnvironmentConnectCommand', () => {
    let mySandBox: sinon.SinonSandbox;

    before(async () => {
        mySandBox = sinon.createSandbox();
        await TestUtil.setupTests(mySandBox);
        mySandBox.restore();
    });

    describe('connect', () => {

        let mockConnection: sinon.SinonStubbedInstance<FabricEnvironmentConnection>;
        let logSpy: sinon.SinonSpy;
        let environmentRegistryEntry: FabricEnvironmentRegistryEntry;
        let localFabricRegistryEntry: FabricEnvironmentRegistryEntry;
        let opsToolsEnvRegistryEntry: FabricEnvironmentRegistryEntry;

        let chooseEnvironmentQuickPick: sinon.SinonStub;
        let sendTelemetryEventStub: sinon.SinonStub;
        let requireSetupStub: sinon.SinonStub;

        let connectExplorerStub: sinon.SinonStub;
        let connectManagerSpy: sinon.SinonSpy;
        let disconnectManagerSpy: sinon.SinonSpy;
        let stopEnvironmentRefreshSpy: sinon.SinonSpy;
        let getStateStub: sinon.SinonStub;

        let localEnvironment: LocalEnvironment;
        let fabricEnvironment: FabricEnvironment;

        let getEnvironmentStub: sinon.SinonStub;

        let caNode: FabricNode;
        let ordererNode: FabricNode;
        let getNodesStub: sinon.SinonStub;

        let executeCommandStub: sinon.SinonStub;
        let warningNoNodesEditFilterStub: sinon.SinonStub;

        beforeEach(async () => {

            connectExplorerStub = mySandBox.stub(ExtensionUtil.getBlockchainEnvironmentExplorerProvider(), 'connect').resolves();
            caNode = FabricNode.newCertificateAuthority('caNodeWithCreds', 'ca.org1.example.com', 'http://localhost:17054', 'ca.org1.example.com', undefined, undefined, undefined, 'admin', 'adminpw');
            ordererNode = FabricNode.newOrderer('ordererNode', 'orderer.example.com', 'http://localhost:17056', undefined, undefined, 'osmsp', undefined);

            connectManagerSpy = mySandBox.spy(FabricEnvironmentManager.instance(), 'connect');
            disconnectManagerSpy = mySandBox.spy(FabricEnvironmentManager.instance(), 'disconnect');
            stopEnvironmentRefreshSpy = mySandBox.spy(FabricEnvironmentManager.instance(), 'stopEnvironmentRefresh');
            mySandBox.stub(ExtensionUtil.getBlockchainEnvironmentExplorerProvider(), 'refresh').resolves();
            mockConnection = mySandBox.createStubInstance(FabricEnvironmentConnection);
            mockConnection.connect.resolves();
            mockConnection.createChannelMap.resolves();

            mySandBox.stub(FabricConnectionFactory, 'createFabricEnvironmentConnection').returns(mockConnection);
            executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand').callThrough();

            environmentRegistryEntry = new FabricEnvironmentRegistryEntry();
            environmentRegistryEntry.name = 'myFabric';
            environmentRegistryEntry.managedRuntime = false;
            environmentRegistryEntry.environmentType = EnvironmentType.ENVIRONMENT;

            await FabricEnvironmentRegistry.instance().clear();
            await FabricEnvironmentRegistry.instance().add(environmentRegistryEntry);

            await TestUtil.setupLocalFabric();

            localFabricRegistryEntry = await FabricEnvironmentRegistry.instance().get(FabricRuntimeUtil.LOCAL_FABRIC);

            logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');

            const environment: FabricEnvironmentRegistryEntry = await FabricEnvironmentRegistry.instance().get('myFabric');
            chooseEnvironmentQuickPick = mySandBox.stub(UserInputUtil, 'showFabricEnvironmentQuickPickBox').resolves({
                label: 'myFabric',
                data: environment
            });

            sendTelemetryEventStub = mySandBox.stub(Reporter.instance(), 'sendTelemetryEvent');

            getNodesStub = mySandBox.stub(FabricEnvironment.prototype, 'getNodes').resolves([ordererNode, caNode]);

            // Ops Tools requirements
            opsToolsEnvRegistryEntry = new FabricEnvironmentRegistryEntry();
            opsToolsEnvRegistryEntry.name = 'myOpsToolsFabric';
            opsToolsEnvRegistryEntry.managedRuntime = false;
            opsToolsEnvRegistryEntry.url = '/some/cloud:port';
            opsToolsEnvRegistryEntry.environmentType = EnvironmentType.OPS_TOOLS_ENVIRONMENT;
            executeCommandStub.withArgs(ExtensionCommands.EDIT_NODE_FILTERS).resolves(true);

            warningNoNodesEditFilterStub = mySandBox.stub(UserInputUtil, 'showConfirmationWarningMessage').withArgs(`Problem connecting to environment ${opsToolsEnvRegistryEntry.name}: no visible nodes. Would you like to filter nodes?`);
            getStateStub = mySandBox.stub(FabricEnvironmentManager.instance(), 'getState');

        });

        afterEach(async () => {
            await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            mySandBox.restore();
        });

        describe('FabricEnvironment', () => {

            beforeEach(async () => {

                fabricEnvironment = EnvironmentFactory.getEnvironment(environmentRegistryEntry);
                getEnvironmentStub = mySandBox.stub(EnvironmentFactory, 'getEnvironment');
                getEnvironmentStub.callThrough();
                getEnvironmentStub.withArgs(environmentRegistryEntry).returns(fabricEnvironment);
                requireSetupStub = mySandBox.stub(FabricEnvironment.prototype, 'requireSetup').resolves(false);
            });

            it('should test a fabric environment can be connected to from the command', async () => {
                await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT);

                chooseEnvironmentQuickPick.should.have.been.calledWith(sinon.match.string, false, true);
                connectExplorerStub.should.have.been.called;
                connectManagerSpy.should.have.been.calledWith(mockConnection, environmentRegistryEntry, ConnectedState.CONNECTING, true);
                mockConnection.connect.should.have.been.called;
                sendTelemetryEventStub.should.have.been.calledOnceWithExactly('fabricEnvironmentConnectCommand', { environmentData: 'user environment', connectEnvironmentIBM: sinon.match.string });
                logSpy.calledWith(LogType.SUCCESS, 'Connected to myFabric');
            });

            it('should test a fabric environment can be connected to from the command but not show success if not wanted', async () => {
                await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT, undefined, false);

                chooseEnvironmentQuickPick.should.have.been.calledWith(sinon.match.string, false, true);
                connectExplorerStub.should.have.been.called;
                connectManagerSpy.should.have.been.calledWith(mockConnection, environmentRegistryEntry, ConnectedState.CONNECTING, true);
                mockConnection.connect.should.have.been.called;
                sendTelemetryEventStub.should.have.been.calledOnceWithExactly('fabricEnvironmentConnectCommand', { environmentData: 'user environment', connectEnvironmentIBM: sinon.match.string });
                logSpy.should.not.have.been.calledWith(LogType.SUCCESS, 'Connected to myFabric');
            });

            it('should do nothing if the user cancels choosing a environment', async () => {
                chooseEnvironmentQuickPick.resolves();

                await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT);

                mockConnection.connect.should.not.have.been.called;
            });

            it('should do nothing if environment requires setup', async () => {
                requireSetupStub.resolves(true);

                await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT);

                connectManagerSpy.should.have.been.calledWith(undefined, environmentRegistryEntry, ConnectedState.SETUP);
                logSpy.should.have.been.calledWith(LogType.IMPORTANT, 'You must complete setup for this environment to enable install, instantiate and register identity operations on the nodes. Click each node in the list to perform the required setup steps');

                stopEnvironmentRefreshSpy.should.have.been.called;
                mockConnection.connect.should.not.have.been.called;
            });

            it('should test that a fabric environment can be connected to from the tree', async () => {
                const blockchainEnvironmentExplorerProvider: BlockchainEnvironmentExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();
                const allChildren: Array<BlockchainTreeItem> = await blockchainEnvironmentExplorerProvider.getChildren();

                const myConnectionItem: FabricEnvironmentTreeItem = allChildren[1] as FabricEnvironmentTreeItem;

                await vscode.commands.executeCommand(myConnectionItem.command.command, ...myConnectionItem.command.arguments);

                connectExplorerStub.should.have.been.calledOnce;
                connectManagerSpy.should.have.been.calledWith(mockConnection, environmentRegistryEntry, ConnectedState.CONNECTING, true);
                mockConnection.connect.should.have.been.called;
                sendTelemetryEventStub.should.have.been.calledOnceWithExactly('fabricEnvironmentConnectCommand', { environmentData: 'user environment', connectEnvironmentIBM: sinon.match.string });
            });

            it('should handle error from connecting', async () => {
                const error: Error = new Error('some error');

                mockConnection.connect.rejects(error);

                await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT);

                connectManagerSpy.should.not.have.been.called;
                logSpy.should.have.been.calledTwice;
                logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, `connecting to fabric environment`);
                logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Cannot connect to environment: ${error.message}`, `Cannot connect to environment: ${error.toString()}`);
                sendTelemetryEventStub.should.not.have.been.called;
            });

            it('should handle error from getting channel map', async () => {
                const error: Error = new Error('some error');

                mockConnection.createChannelMap.rejects(error);

                await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT);

                connectManagerSpy.should.not.have.been.called;
                logSpy.should.have.been.calledTwice;
                logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, `connecting to fabric environment`);
                logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Error connecting to environment myFabric: ${error.message}`, `Error connecting to environment myFabric: ${error.toString()}`);
                executeCommandStub.should.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);

                sendTelemetryEventStub.should.not.have.been.called;
            });

            it('should do nothing if the user cancels after trying to connect to an Ops Tools evironment without nodes', async () => {
                chooseEnvironmentQuickPick.resolves({ label: 'myOpsToolsFabric', data: opsToolsEnvRegistryEntry });
                warningNoNodesEditFilterStub.resolves(false);

                getNodesStub.resolves([]);

                await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT);

                getNodesStub.should.have.been.calledOnce;
                warningNoNodesEditFilterStub.should.have.been.calledOnce;
                executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.EDIT_NODE_FILTERS);
                mockConnection.connect.should.not.have.been.called;
            });

            it('should do nothing if the user tries to connect to an Ops Tools evironment without nodes, chooses to edit filters and does not add nodes ', async () => {
                chooseEnvironmentQuickPick.resolves({ label: 'myOpsToolsFabric', data: opsToolsEnvRegistryEntry });
                warningNoNodesEditFilterStub.resolves(true);

                getNodesStub.resolves([]);
                getStateStub.callThrough();

                await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT);

                getNodesStub.should.have.been.calledTwice;
                warningNoNodesEditFilterStub.should.have.been.calledOnce;
                executeCommandStub.should.have.been.calledWith(ExtensionCommands.EDIT_NODE_FILTERS);
                mockConnection.connect.should.not.have.been.called;
            });

            it('should disconnect if the user tries to connect to an already connected Ops Tools evironment with nodes, differences are detected, user chooses to edit filters and hides all nodes ', async () => {
                chooseEnvironmentQuickPick.resolves({ label: 'myOpsToolsFabric', data: opsToolsEnvRegistryEntry });
                warningNoNodesEditFilterStub.resolves(true);

                getStateStub.returns(ConnectedState.CONNECTED);
                getNodesStub.onFirstCall().resolves([ordererNode, caNode]);
                getNodesStub.onSecondCall().resolves([]);

                await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT);

                getNodesStub.should.have.been.calledTwice;
                warningNoNodesEditFilterStub.should.have.not.been.called;
                executeCommandStub.should.have.been.calledWith(ExtensionCommands.EDIT_NODE_FILTERS);
                disconnectManagerSpy.should.have.been.called;
                mockConnection.connect.should.not.have.been.called;
            });

            it('should connect if the user tries to connect to an Ops Tools evironment without nodes, chooses to edit filters and add nodes ', async () => {
                requireSetupStub.resolves(false);
                chooseEnvironmentQuickPick.resolves({ label: 'myOpsToolsFabric', data: opsToolsEnvRegistryEntry });
                warningNoNodesEditFilterStub.resolves(true);

                getNodesStub.onFirstCall().resolves([]);
                getNodesStub.onSecondCall().resolves([ordererNode, caNode]);

                await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT);

                getNodesStub.should.have.been.calledTwice;
                warningNoNodesEditFilterStub.should.have.been.calledOnce;
                executeCommandStub.should.have.been.calledWith(ExtensionCommands.EDIT_NODE_FILTERS);
                mockConnection.connect.should.have.been.called;
            });

            it('should call edit filters with informOfChanges as true if the user tries to connect to an Ops Tools evironment with nodes', async () => {
                requireSetupStub.resolves(false);
                chooseEnvironmentQuickPick.resolves({ label: 'myOpsToolsFabric', data: opsToolsEnvRegistryEntry });

                getNodesStub.resolves([ordererNode, caNode]);

                await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT);

                getNodesStub.should.have.been.calledTwice;
                warningNoNodesEditFilterStub.should.have.not.been.called;
                executeCommandStub.should.have.been.calledWith(ExtensionCommands.EDIT_NODE_FILTERS);
                executeCommandStub.getCalls().filter((call: any) => call.args[0] === ExtensionCommands.EDIT_NODE_FILTERS && call.args[4] === true).should.not.deep.equal([]);
                mockConnection.connect.should.have.been.called;
            });

            it('should not refresh timer if extension cannot reach ops console but still connect to an Ops Tools evironment with nodes', async () => {
                requireSetupStub.resolves(false);
                chooseEnvironmentQuickPick.resolves({ label: 'myOpsToolsFabric', data: opsToolsEnvRegistryEntry });
                const consoleConnectError: Error = new Error(`Nodes in ${opsToolsEnvRegistryEntry.name} might be out of date. Unable to connect to the IBM Blockchain Platform Console with error: some error`);
                executeCommandStub.withArgs(ExtensionCommands.EDIT_NODE_FILTERS).throws(consoleConnectError);

                getNodesStub.resolves([ordererNode, caNode]);

                await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT);

                getNodesStub.should.have.been.calledTwice;
                warningNoNodesEditFilterStub.should.have.not.been.called;
                executeCommandStub.should.have.been.calledWith(ExtensionCommands.EDIT_NODE_FILTERS);
                connectManagerSpy.should.have.been.calledWith(mockConnection, opsToolsEnvRegistryEntry, ConnectedState.CONNECTING, false);
                executeCommandStub.getCalls().filter((call: any) => call.args[0] === ExtensionCommands.EDIT_NODE_FILTERS && call.args[4] === true).should.not.deep.equal([]);
                mockConnection.connect.should.have.been.called;
            });

            it('should return if edit filters/import nodes throws an error when connecting to existing environment', async () => {
                requireSetupStub.resolves(false);
                chooseEnvironmentQuickPick.resolves({ label: 'myOpsToolsFabric', data: opsToolsEnvRegistryEntry });
                const someError: Error = new Error('some error');
                executeCommandStub.withArgs(ExtensionCommands.EDIT_NODE_FILTERS).throws(someError);

                getNodesStub.resolves([ordererNode, caNode]);

                await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT);

                connectExplorerStub.should.not.have.been.called;
                connectManagerSpy.should.not.have.been.called;
                mockConnection.connect.should.not.have.been.called;
                sendTelemetryEventStub.should.not.have.been.called;
                logSpy.should.have.been.calledWith(LogType.ERROR, `Cannot connect to environment: ${someError.message}`, `Cannot connect to environment: ${someError.toString()}`);
            });
        });

        describe('LocalEnvironment', () => {

            let isRunningStub: sinon.SinonStub;

            beforeEach(async () => {
                chooseEnvironmentQuickPick.resolves({
                    label: FabricRuntimeUtil.LOCAL_FABRIC,
                    data: localFabricRegistryEntry
                });

                localEnvironment = EnvironmentFactory.getEnvironment(localFabricRegistryEntry) as LocalEnvironment;

                isRunningStub = mySandBox.stub(localEnvironment, 'isRunning').resolves(true);
                mySandBox.stub(localEnvironment, 'startLogs').resolves();

                getEnvironmentStub = mySandBox.stub(EnvironmentFactory, 'getEnvironment');
                getEnvironmentStub.callThrough();
                getEnvironmentStub.withArgs(localFabricRegistryEntry).returns(localEnvironment);
                requireSetupStub = mySandBox.stub(localEnvironment, 'requireSetup').resolves(false);

                getNodesStub.resolves([ordererNode, caNode]);
            });

            it('should connect to a managed runtime using a quick pick', async () => {
                await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT);

                connectExplorerStub.should.have.been.calledOnce;
                chooseEnvironmentQuickPick.should.have.been.calledWith(sinon.match.string, false, true);
                mockConnection.connect.should.have.been.calledOnce;
<<<<<<< HEAD
                connectManagerSpy.should.have.been.calledWith(mockConnection, localFabricRegistryEntry, ConnectedState.CONNECTING);
                sendTelemetryEventStub.should.have.been.calledOnceWithExactly('fabricEnvironmentConnectCommand', { environmentData: 'managed environment', connectEnvironmentIBM: sinon.match.string });
=======
                connectManagerSpy.should.have.been.calledWith(mockConnection, localFabricRegistryEntry, ConnectedState.CONNECTING, true);
                sendTelemetryEventStub.should.have.been.calledOnceWithExactly('fabricEnvironmentConnectCommand', { environmentData: 'managed environment', connectEnvironmentIBM: sinon.match.string, environmentType: 'Local network' });
>>>>>>> 679b511f... IBM OpsTools - OOD nodes when unable to connect to console. Closes #2055 (#2197)
                logSpy.calledWith(LogType.SUCCESS, `Connected to ${FabricRuntimeUtil.LOCAL_FABRIC}`);
            });

            it('should connect to a managed runtime from the tree', async () => {
                const blockchainEnvironmentExplorerProvider: BlockchainEnvironmentExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();
                const allChildren: Array<BlockchainTreeItem> = await blockchainEnvironmentExplorerProvider.getChildren();
                const myConnectionItem: RuntimeTreeItem = allChildren[0] as RuntimeTreeItem;

                await vscode.commands.executeCommand(myConnectionItem.command.command, ...myConnectionItem.command.arguments);

                connectExplorerStub.should.have.been.calledOnce;
                connectManagerSpy.should.have.been.calledWith(mockConnection, localFabricRegistryEntry, ConnectedState.CONNECTING, true);
                mockConnection.connect.should.have.been.called;
                sendTelemetryEventStub.should.have.been.calledOnceWithExactly('fabricEnvironmentConnectCommand', { environmentData: 'managed environment', connectEnvironmentIBM: sinon.match.string });
            });

            it('should carry on connecting even if setup required', async () => {
                const blockchainEnvironmentExplorerProvider: BlockchainEnvironmentExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();
                const allChildren: Array<BlockchainTreeItem> = await blockchainEnvironmentExplorerProvider.getChildren();

                const myConnectionItem: FabricEnvironmentTreeItem = allChildren[0] as FabricEnvironmentTreeItem;

                requireSetupStub.resolves(true);

                await vscode.commands.executeCommand(myConnectionItem.command.command, ...myConnectionItem.command.arguments);

                connectExplorerStub.should.have.been.calledOnce;
                connectManagerSpy.should.have.been.calledWith(mockConnection, localFabricRegistryEntry, ConnectedState.CONNECTING, true);
                mockConnection.connect.should.have.been.called;
                sendTelemetryEventStub.should.have.been.calledOnceWithExactly('fabricEnvironmentConnectCommand', { environmentData: 'managed environment', connectEnvironmentIBM: sinon.match.string });
            });

            it(`should start local fabric is not started`, async () => {
                isRunningStub.resetHistory();
                isRunningStub.onFirstCall().resolves(false);

                executeCommandStub.withArgs(ExtensionCommands.START_FABRIC).resolves();

                await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT);
                executeCommandStub.should.have.been.calledWith(ExtensionCommands.START_FABRIC);

                connectExplorerStub.should.have.been.calledOnce;
                connectManagerSpy.should.have.been.calledWith(mockConnection, localFabricRegistryEntry, ConnectedState.CONNECTING);
                mockConnection.connect.should.have.been.called;
                sendTelemetryEventStub.should.have.been.calledOnceWithExactly('fabricEnvironmentConnectCommand', { environmentData: 'managed environment', connectEnvironmentIBM: sinon.match.string });
            });

            it(`should return if failed to start local fabric`, async () => {
                isRunningStub.resolves(false);

                executeCommandStub.withArgs(ExtensionCommands.START_FABRIC).resolves();

                await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT);
                executeCommandStub.should.have.been.calledWith(ExtensionCommands.START_FABRIC);

                connectExplorerStub.should.not.have.been.called;
                connectManagerSpy.should.not.have.been.calledWith;
                mockConnection.connect.should.not.have.been.called;
                sendTelemetryEventStub.should.not.have.been.called;
            });

            it('should return if starting local fabric throws an error', async () => {
                isRunningStub.resolves(false);

                executeCommandStub.callThrough();
                const error: Error = new Error('Failed to start');
                executeCommandStub.withArgs(ExtensionCommands.START_FABRIC).throws(error);

                await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT);
                executeCommandStub.should.have.been.calledWith(ExtensionCommands.START_FABRIC);

                connectExplorerStub.should.not.have.been.called;
                connectManagerSpy.should.not.have.been.calledWith;
                mockConnection.connect.should.not.have.been.called;
                sendTelemetryEventStub.should.not.have.been.called;
                logSpy.should.have.been.calledWith(LogType.ERROR, `Unable to connect as starting the Fabric failed`);
            });
        });
    });
});
