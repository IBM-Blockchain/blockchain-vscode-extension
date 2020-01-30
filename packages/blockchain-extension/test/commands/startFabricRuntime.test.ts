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

import * as vscode from 'vscode';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { BlockchainEnvironmentExplorerProvider } from '../../extension/explorer/environmentExplorer';
import { BlockchainTreeItem } from '../../extension/explorer/model/BlockchainTreeItem';
import { RuntimeTreeItem } from '../../extension/explorer/runtimeOps/disconnectedTree/RuntimeTreeItem';
import { TestUtil } from '../TestUtil';
import * as chai from 'chai';
import * as sinon from 'sinon';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricEnvironmentRegistry, FabricRuntimeUtil, LogType, FabricEnvironmentRegistryEntry, FabricGatewayRegistry, EnvironmentType } from 'ibm-blockchain-platform-common';
import { LocalEnvironment } from '../../extension/fabric/environments/LocalEnvironment';
import { UserInputUtil } from '../../extension/commands/UserInputUtil';
import { EnvironmentFactory } from '../../extension/fabric/environments/EnvironmentFactory';
import { ManagedAnsibleEnvironment } from '../../extension/fabric/environments/ManagedAnsibleEnvironment';

chai.should();

// tslint:disable no-unused-expression
describe('startFabricRuntime', () => {

    const sandbox: sinon.SinonSandbox = sinon.createSandbox();
    const connectionRegistry: FabricGatewayRegistry = FabricGatewayRegistry.instance();
    let mockLocalRuntime: sinon.SinonStubbedInstance<LocalEnvironment>;
    let mockManagedEnvironment: sinon.SinonStubbedInstance<ManagedAnsibleEnvironment>;
    let runtimeTreeItem: RuntimeTreeItem;
    let blockchainLogsOutputSpy: sinon.SinonSpy;
    let commandStub: sinon.SinonStub;
    let logSpy: sinon.SinonSpy;
    let localRegistryEntry: FabricEnvironmentRegistryEntry;
    let showFabricEnvironmentQuickPickBoxStub: sinon.SinonStub;
    let getEnvironmentStub: sinon.SinonStub;
    before(async () => {
        await TestUtil.setupTests(sandbox);
    });

    beforeEach(async () => {
        await connectionRegistry.clear();
        await FabricEnvironmentRegistry.instance().clear();
        await TestUtil.setupLocalFabric();

        mockLocalRuntime = sandbox.createStubInstance(LocalEnvironment);
        mockLocalRuntime.isCreated.resolves(true);
        mockLocalRuntime.create.resolves();
        mockLocalRuntime.start.resolves();
        mockLocalRuntime.startLogs.resolves();

        mockManagedEnvironment = sandbox.createStubInstance(ManagedAnsibleEnvironment);
        mockManagedEnvironment.start.resolves();

        blockchainLogsOutputSpy = sandbox.spy(VSCodeBlockchainOutputAdapter.instance(), 'show');

        const provider: BlockchainEnvironmentExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();
        const children: BlockchainTreeItem[] = await provider.getChildren();
        runtimeTreeItem = children.find((child: BlockchainTreeItem) => child instanceof RuntimeTreeItem) as RuntimeTreeItem;
        commandStub = sandbox.stub(vscode.commands, 'executeCommand').callThrough();
        commandStub.withArgs(ExtensionCommands.CONNECT_TO_ENVIRONMENT).resolves();
        logSpy = sandbox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
        localRegistryEntry = await FabricEnvironmentRegistry.instance().get(FabricRuntimeUtil.LOCAL_FABRIC);
        showFabricEnvironmentQuickPickBoxStub = sandbox.stub(UserInputUtil, 'showFabricEnvironmentQuickPickBox');
        showFabricEnvironmentQuickPickBoxStub.resolves({label: FabricRuntimeUtil.LOCAL_FABRIC, data: localRegistryEntry});
        getEnvironmentStub = sandbox.stub(EnvironmentFactory, 'getEnvironment');
    });

    afterEach(async () => {
        sandbox.restore();
        await connectionRegistry.clear();
    });

    it('should start a Fabric runtime specified by clicking the tree', async () => {
        await vscode.commands.executeCommand(runtimeTreeItem.command.command);
        commandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT);
    });

    it('should start a Local environment from the command palette if created', async () => {
        mockLocalRuntime.isCreated.resolves(true);
        mockLocalRuntime.isGenerated.resolves(true);
        getEnvironmentStub.resolves(mockLocalRuntime);
        await vscode.commands.executeCommand(ExtensionCommands.START_FABRIC);
        showFabricEnvironmentQuickPickBoxStub.should.have.been.calledOnceWithExactly('Select an environment to start', false, true, true, true);
        mockLocalRuntime.create.should.not.have.been.called;
        mockLocalRuntime.start.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());
        commandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);
        commandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
        commandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);
        blockchainLogsOutputSpy.should.have.been.called;
        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'startFabricRuntime');
    });

    it('should return if user doesnt select a managed environment to start', async () => {
        showFabricEnvironmentQuickPickBoxStub.resolves(undefined);
        await vscode.commands.executeCommand(ExtensionCommands.START_FABRIC);
        showFabricEnvironmentQuickPickBoxStub.should.have.been.calledOnceWithExactly('Select an environment to start', false, true, true, true);
        getEnvironmentStub.should.not.have.been.called;
        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'startFabricRuntime');
    });

    it('should create and start a Local environment', async () => {
        mockLocalRuntime.isCreated.resolves(false);
        mockLocalRuntime.isGenerated.resolves(false);
        getEnvironmentStub.resolves(mockLocalRuntime);
        await vscode.commands.executeCommand(ExtensionCommands.START_FABRIC);
        showFabricEnvironmentQuickPickBoxStub.should.have.been.calledOnceWithExactly('Select an environment to start', false, true, true, true);
        mockLocalRuntime.create.should.have.been.calledOnce;
        mockLocalRuntime.start.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());
        commandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);
        commandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
        commandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);
        blockchainLogsOutputSpy.should.have.been.called;
        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'startFabricRuntime');
    });

    it('should be able to pass in an environment registry', async () => {
        mockLocalRuntime.isCreated.resolves(false);
        mockLocalRuntime.isGenerated.resolves(false);
        getEnvironmentStub.resolves(mockLocalRuntime);
        await vscode.commands.executeCommand(ExtensionCommands.START_FABRIC, localRegistryEntry);
        showFabricEnvironmentQuickPickBoxStub.should.not.have.been.called;
        mockLocalRuntime.create.should.have.been.calledOnce;
        mockLocalRuntime.start.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());
        commandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);
        commandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
        commandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);
        blockchainLogsOutputSpy.should.have.been.called;
        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'startFabricRuntime');
    });

    it('should generate and start a managed environment', async () => {
        mockManagedEnvironment.isGenerated.resolves(false);
        getEnvironmentStub.resolves(mockManagedEnvironment);
        showFabricEnvironmentQuickPickBoxStub.resolves({label: 'managedAnsible', data: {name: 'managedAnsible', managedRuntime: true, environmentType: EnvironmentType.ANSIBLE_ENVIRONMENT}});
        await vscode.commands.executeCommand(ExtensionCommands.START_FABRIC);
        showFabricEnvironmentQuickPickBoxStub.should.have.been.calledOnceWithExactly('Select an environment to start', false, true, true, true);
        mockManagedEnvironment.start.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());
        commandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);
        commandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
        commandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);
        blockchainLogsOutputSpy.should.not.have.been.called;
        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'startFabricRuntime');
    });

    it('should display an error if the environment fails to start', async () => {
        const error: Error = new Error('who ate all the cakes?');
        mockLocalRuntime.start.rejects(error);
        getEnvironmentStub.resolves(mockLocalRuntime);

        await vscode.commands.executeCommand(ExtensionCommands.START_FABRIC);
        mockLocalRuntime.start.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());
        commandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);
        commandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
        commandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);
        blockchainLogsOutputSpy.should.have.been.called;
        logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'startFabricRuntime');
        logSpy.getCall(1).should.have.been.calledWithExactly(LogType.ERROR, `Failed to start ${mockLocalRuntime.getName()}: ${error.message}`, `Failed to start ${mockLocalRuntime.getName()}: ${error.toString()}`);
    });

});
