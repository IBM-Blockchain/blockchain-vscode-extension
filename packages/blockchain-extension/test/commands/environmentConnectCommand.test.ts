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
import { FabricEnvironmentConnection } from '../../extension/fabric/FabricEnvironmentConnection';
import { BlockchainTreeItem } from '../../extension/explorer/model/BlockchainTreeItem';
import { FabricRuntimeManager } from '../../extension/fabric/FabricRuntimeManager';
import { TestUtil } from '../TestUtil';
import { FabricEnvironmentRegistry } from '../../extension/registries/FabricEnvironmentRegistry';
import { FabricEnvironmentRegistryEntry } from '../../extension/registries/FabricEnvironmentRegistryEntry';
import { FabricRuntime } from '../../extension/fabric/FabricRuntime';
import { FabricConnectionFactory } from '../../extension/fabric/FabricConnectionFactory';
import { Reporter } from '../../extension/util/Reporter';
import { BlockchainEnvironmentExplorerProvider } from '../../extension/explorer/environmentExplorer';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../../extension/logging/OutputAdapter';
import { ExtensionCommands } from '../../ExtensionCommands';
import { UserInputUtil } from '../../extension/commands/UserInputUtil';
import { FabricRuntimeUtil } from 'ibm-blockchain-platform-common';
import { FabricEnvironmentTreeItem } from '../../extension/explorer/runtimeOps/disconnectedTree/FabricEnvironmentTreeItem';
import { RuntimeTreeItem } from '../../extension/explorer/runtimeOps/disconnectedTree/RuntimeTreeItem';
import { FabricEnvironment } from '../../extension/fabric/FabricEnvironment';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';
import { FabricEnvironmentManager, ConnectedState } from '../../extension/fabric/FabricEnvironmentManager';

chai.use(sinonChai);
// tslint:disable-next-line no-var-requires
chai.use(require('chai-as-promised'));

// tslint:disable no-unused-expression
describe('EnvironmentConnectCommand', () => {
    let mySandBox: sinon.SinonSandbox;

    before(async () => {
        mySandBox = sinon.createSandbox();
        await TestUtil.setupTests(mySandBox);
    });

    describe('connect', () => {

        let mockConnection: sinon.SinonStubbedInstance<FabricEnvironmentConnection>;
        let mockRuntime: sinon.SinonStubbedInstance<FabricRuntime>;
        let logSpy: sinon.SinonSpy;
        let environmentRegistryEntry: FabricEnvironmentRegistryEntry;
        let localFabricRegistryEntry: FabricEnvironmentRegistryEntry;

        let chooseEnvironmentQuickPick: sinon.SinonStub;
        let sendTelemetryEventStub: sinon.SinonStub;
        let requireSetupStub: sinon.SinonStub;

        let connectExplorerStub: sinon.SinonStub;
        let connectManagerSpy: sinon.SinonSpy;

        beforeEach(async () => {

            connectExplorerStub = mySandBox.stub(ExtensionUtil.getBlockchainEnvironmentExplorerProvider(), 'connect');
            connectManagerSpy = mySandBox.spy(FabricEnvironmentManager.instance(), 'connect');

            mockConnection = mySandBox.createStubInstance(FabricEnvironmentConnection);
            mockConnection.connect.resolves();
            mockConnection.createChannelMap.resolves();

            mySandBox.stub(FabricConnectionFactory, 'createFabricEnvironmentConnection').returns(mockConnection);

            environmentRegistryEntry = new FabricEnvironmentRegistryEntry();
            environmentRegistryEntry.name = 'myFabric';
            environmentRegistryEntry.managedRuntime = false;

            await FabricEnvironmentRegistry.instance().clear();
            await FabricEnvironmentRegistry.instance().add(environmentRegistryEntry);

            await FabricRuntimeManager.instance().getRuntime().create();

            localFabricRegistryEntry = await FabricEnvironmentRegistry.instance().get(FabricRuntimeUtil.LOCAL_FABRIC);

            mockRuntime = mySandBox.createStubInstance(FabricRuntime);
            mockRuntime.getName.returns(FabricRuntimeUtil.LOCAL_FABRIC);
            mockRuntime.isBusy.returns(false);
            mockRuntime.isRunning.resolves(true);
            mockRuntime.start.resolves();
            mySandBox.stub(FabricRuntimeManager.instance(), 'getRuntime').returns(mockRuntime);

            requireSetupStub = mySandBox.stub(FabricEnvironment.prototype, 'requireSetup').resolves(false);

            logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');

            const environment: FabricEnvironmentRegistryEntry = await FabricEnvironmentRegistry.instance().get('myFabric');
            chooseEnvironmentQuickPick = mySandBox.stub(UserInputUtil, 'showFabricEnvironmentQuickPickBox').resolves({
                label: 'myFabric',
                data: environment
            });

            sendTelemetryEventStub = mySandBox.stub(Reporter.instance(), 'sendTelemetryEvent');

        });

        afterEach(async () => {
            await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            mySandBox.restore();
        });

        describe('non-local fabric', () => {

            it('should test a fabric environment can be connected to from the command', async () => {
                await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT);

                chooseEnvironmentQuickPick.should.have.been.calledWith(sinon.match.string, false, true, true);
                connectExplorerStub.should.have.been.called;
                connectManagerSpy.should.have.been.calledWith(mockConnection, environmentRegistryEntry, ConnectedState.CONNECTED);
                mockConnection.connect.should.have.been.called;
                sendTelemetryEventStub.should.have.been.calledOnceWithExactly('fabricEnvironmentConnectCommand', { environmentData: 'user environment', connectEnvironmentIBM: sinon.match.string });
                logSpy.calledWith(LogType.SUCCESS, 'Connected to myFabric');
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

                mockConnection.connect.should.not.have.been.called;
            });

            it('should test that a fabric environment can be connected to from the tree', async () => {
                const blockchainEnvironmentExplorerProvider: BlockchainEnvironmentExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();
                const allChildren: Array<BlockchainTreeItem> = await blockchainEnvironmentExplorerProvider.getChildren();

                const myConnectionItem: FabricEnvironmentTreeItem = allChildren[1] as FabricEnvironmentTreeItem;

                await vscode.commands.executeCommand(myConnectionItem.command.command, ...myConnectionItem.command.arguments);

                connectExplorerStub.should.have.been.calledOnce;
                connectManagerSpy.should.have.been.calledWith(mockConnection, environmentRegistryEntry, ConnectedState.CONNECTED);
                mockConnection.connect.should.have.been.called;
                sendTelemetryEventStub.should.have.been.calledOnceWithExactly('fabricEnvironmentConnectCommand', { environmentData: 'user environment', connectEnvironmentIBM: sinon.match.string });
            });

            it('should handle error from connecting', async () => {
                const error: Error = new Error('some error');

                mockConnection.connect.rejects(error);

                await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT);

                mockRuntime.isRunning.should.not.have.been.called;
                connectManagerSpy.should.not.have.been.called;
                logSpy.should.have.been.calledTwice;
                logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, `connecting to fabric environment`);
                logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `${error.message}`, `${error.toString()}`);
                sendTelemetryEventStub.should.not.have.been.called;
            });

            it('should handle error from getting channel map', async () => {
                const commandSpy: sinon.SinonSpy = mySandBox.spy(vscode.commands, 'executeCommand');

                const error: Error = new Error('some error');

                mockConnection.createChannelMap.rejects(error);

                await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT);

                mockRuntime.isRunning.should.not.have.been.called;
                connectManagerSpy.should.not.have.been.called;
                logSpy.should.have.been.calledTwice;
                logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, `connecting to fabric environment`);
                logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Error connecting to environment myFabric: ${error.message}`, `Error connecting to environment myFabric: ${error.toString()}`);
                commandSpy.should.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
                sendTelemetryEventStub.should.not.have.been.called;
            });
        });

        describe('local fabric', () => {
            beforeEach(async () => {
                chooseEnvironmentQuickPick.resolves({
                    label: FabricRuntimeUtil.LOCAL_FABRIC,
                    data: localFabricRegistryEntry
                });
            });

            it('should connect to a managed runtime using a quick pick', async () => {
                await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT);

                connectExplorerStub.should.have.been.calledOnce;
                chooseEnvironmentQuickPick.should.have.been.calledWith(sinon.match.string, false, true, true);
                mockConnection.connect.should.have.been.calledOnce;
                connectManagerSpy.should.have.been.calledWith(mockConnection, localFabricRegistryEntry, ConnectedState.CONNECTED);
                sendTelemetryEventStub.should.have.been.calledOnceWithExactly('fabricEnvironmentConnectCommand', { environmentData: 'managed environment', connectEnvironmentIBM: sinon.match.string });
                logSpy.calledWith(LogType.SUCCESS, `Connected to ${FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME}`);
            });

            it('should connect to a managed runtime from the tree', async () => {
                const blockchainEnvironmentExplorerProvider: BlockchainEnvironmentExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();
                const allChildren: Array<BlockchainTreeItem> = await blockchainEnvironmentExplorerProvider.getChildren();
                const myConnectionItem: RuntimeTreeItem = allChildren[0] as RuntimeTreeItem;

                await vscode.commands.executeCommand(myConnectionItem.command.command, ...myConnectionItem.command.arguments);

                connectExplorerStub.should.have.been.calledOnce;
                connectManagerSpy.should.have.been.calledWith(mockConnection, localFabricRegistryEntry, ConnectedState.CONNECTED);
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
                connectManagerSpy.should.have.been.calledWith(mockConnection, localFabricRegistryEntry, ConnectedState.CONNECTED);
                mockConnection.connect.should.have.been.called;
                sendTelemetryEventStub.should.have.been.calledOnceWithExactly('fabricEnvironmentConnectCommand', { environmentData: 'managed environment', connectEnvironmentIBM: sinon.match.string });
            });

            it(`should start local fabric is not started`, async () => {
                mockRuntime.isRunning.resetHistory();
                mockRuntime.isRunning.onFirstCall().resolves(false);

                const executeCommandStub: sinon.SinonStub = mySandBox.stub(vscode.commands, 'executeCommand');
                executeCommandStub.callThrough();
                executeCommandStub.withArgs(ExtensionCommands.START_FABRIC).resolves();

                await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT);
                executeCommandStub.should.have.been.calledWith(ExtensionCommands.START_FABRIC);

                connectExplorerStub.should.have.been.calledOnce;
                connectManagerSpy.should.have.been.calledWith(mockConnection, localFabricRegistryEntry, ConnectedState.CONNECTED);
                mockConnection.connect.should.have.been.called;
                sendTelemetryEventStub.should.have.been.calledOnceWithExactly('fabricEnvironmentConnectCommand', { environmentData: 'managed environment', connectEnvironmentIBM: sinon.match.string });
            });

            it(`should return if failed to start local fabric`, async () => {
                mockRuntime.isRunning.resolves(false);

                const executeCommandStub: sinon.SinonStub = mySandBox.stub(vscode.commands, 'executeCommand');
                executeCommandStub.callThrough();
                executeCommandStub.withArgs(ExtensionCommands.START_FABRIC).resolves();

                await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT);
                executeCommandStub.should.have.been.calledWith(ExtensionCommands.START_FABRIC);

                connectExplorerStub.should.not.have.been.called;
                connectManagerSpy.should.not.have.been.calledWith;
                mockConnection.connect.should.not.have.been.called;
                sendTelemetryEventStub.should.not.have.been.called;
            });
        });
    });
});
