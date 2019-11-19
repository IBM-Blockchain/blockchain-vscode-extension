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
import { FabricGatewayRegistry } from '../../extension/registries/FabricGatewayRegistry';
import { FabricRuntimeManager } from '../../extension/fabric/FabricRuntimeManager';
import { FabricRuntime } from '../../extension/fabric/FabricRuntime';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { UserInputUtil } from '../../extension/commands/UserInputUtil';
import { TestUtil } from '../TestUtil';
import { LogType } from '../../extension/logging/OutputAdapter';
import * as chai from 'chai';
import * as sinon from 'sinon';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricGatewayRegistryEntry } from '../../extension/registries/FabricGatewayRegistryEntry';
import { FabricGatewayConnectionManager } from '../../extension/fabric/FabricGatewayConnectionManager';
import { FabricRuntimeUtil } from 'ibm-blockchain-platform-common';
import { FabricEnvironmentRegistryEntry } from '../../extension/registries/FabricEnvironmentRegistryEntry';
import { FabricEnvironmentManager } from '../../extension/fabric/FabricEnvironmentManager';
chai.should();

// tslint:disable no-unused-expression
describe('teardownFabricRuntime', () => {

    const sandbox: sinon.SinonSandbox = sinon.createSandbox();
    const connectionRegistry: FabricGatewayRegistry = FabricGatewayRegistry.instance();
    const runtimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
    let mockRuntime: sinon.SinonStubbedInstance<FabricRuntime>;
    let gatewayRegistyEntry: FabricGatewayRegistryEntry;
    let getRegistryEntryStub: sinon.SinonStub;
    let logSpy: sinon.SinonSpy;
    let showConfirmationWarningMessageStub: sinon.SinonStub;

    before(async () => {
        await TestUtil.setupTests(sandbox);
    });

    beforeEach(async () => {
        sandbox.restore();
        showConfirmationWarningMessageStub = sandbox.stub(UserInputUtil, 'showConfirmationWarningMessage');

        await connectionRegistry.clear();
        await runtimeManager.initialize();
        mockRuntime = sandbox.createStubInstance(FabricRuntime);
        mockRuntime.teardown.resolves();
        mockRuntime.deleteWalletsAndIdentities.resolves();
        sandbox.stub(FabricRuntimeManager.instance(), 'getRuntime').returns(mockRuntime);

        gatewayRegistyEntry = new FabricGatewayRegistryEntry();
        gatewayRegistyEntry.name = 'myFabric';

        getRegistryEntryStub = sandbox.stub(FabricGatewayConnectionManager.instance(), 'getGatewayRegistryEntry').returns(gatewayRegistyEntry);

        logSpy = sandbox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
    });

    afterEach(async () => {
        sandbox.restore();
        await connectionRegistry.clear();
    });

    it('should teardown a Fabric runtime', async () => {
        const executeCommandSpy: sinon.SinonSpy = sandbox.spy(vscode.commands, 'executeCommand');
        showConfirmationWarningMessageStub.resolves(true);

        await vscode.commands.executeCommand(ExtensionCommands.TEARDOWN_FABRIC, undefined);
        showConfirmationWarningMessageStub.should.have.been.calledOnce;
        mockRuntime.teardown.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());
        mockRuntime.deleteWalletsAndIdentities.should.have.been.calledOnce;
        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_GATEWAY);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);
        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'teardownFabricRuntime');
    });

    it('should teardown a Fabric runtime and disconnect', async () => {
        gatewayRegistyEntry.name = FabricRuntimeUtil.LOCAL_FABRIC;
        getRegistryEntryStub.returns(gatewayRegistyEntry);

        const executeCommandSpy: sinon.SinonSpy = sandbox.spy(vscode.commands, 'executeCommand');

        showConfirmationWarningMessageStub.resolves(true);

        await vscode.commands.executeCommand(ExtensionCommands.TEARDOWN_FABRIC, undefined);
        showConfirmationWarningMessageStub.should.have.been.calledOnce;
        mockRuntime.teardown.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());
        mockRuntime.deleteWalletsAndIdentities.should.have.been.calledOnce;

        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.DISCONNECT_GATEWAY);

        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);
        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'teardownFabricRuntime');
    });

    it('should teardown a Fabric runtime, disconnect from environment and refresh the view', async () => {
        const environmentRegistryEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
        environmentRegistryEntry.name = FabricRuntimeUtil.name;
        environmentRegistryEntry.managedRuntime = true;
        sandbox.stub(FabricEnvironmentManager.instance(), 'getEnvironmentRegistryEntry').returns(environmentRegistryEntry);

        const executeCommandSpy: sinon.SinonSpy = sandbox.spy(vscode.commands, 'executeCommand');
        showConfirmationWarningMessageStub.resolves(true);

        await vscode.commands.executeCommand(ExtensionCommands.TEARDOWN_FABRIC, undefined);
        showConfirmationWarningMessageStub.should.have.been.calledOnce;
        mockRuntime.teardown.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());
        mockRuntime.deleteWalletsAndIdentities.should.have.been.calledOnce;

        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);

        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);
        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'teardownFabricRuntime');
    });

    it('should handle cancel from confirmation message', async () => {
        const executeCommandSpy: sinon.SinonSpy = sandbox.spy(vscode.commands, 'executeCommand');

        showConfirmationWarningMessageStub.resolves(false);
        await vscode.commands.executeCommand(ExtensionCommands.TEARDOWN_FABRIC, undefined);
        showConfirmationWarningMessageStub.should.have.been.calledOnce;
        mockRuntime.teardown.should.not.have.been.called;
        mockRuntime.deleteWalletsAndIdentities.should.not.have.been.called;

        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);
        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);
        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'teardownFabricRuntime');
    });

    it('should display an error if teardown faric runtime fails', async () => {
        const error: Error = new Error('something terrible is about to happen');
        mockRuntime.teardown.rejects(error);

        showConfirmationWarningMessageStub.resolves(true);
        await vscode.commands.executeCommand(ExtensionCommands.TEARDOWN_FABRIC, undefined);
        showConfirmationWarningMessageStub.should.have.been.calledOnce;

        logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'teardownFabricRuntime');
        logSpy.getCall(1).should.have.been.calledWithExactly(LogType.ERROR, `Failed to teardown ${FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME}: ${error.message}`, `Failed to teardown ${FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME}: ${error.toString()}`);
    });

    it('should force teardown without neededing to answer the warning message', async () => {
        const executeCommandSpy: sinon.SinonSpy = sandbox.spy(vscode.commands, 'executeCommand');

        await vscode.commands.executeCommand(ExtensionCommands.TEARDOWN_FABRIC, undefined, true);

        showConfirmationWarningMessageStub.should.not.have.been.called;
        mockRuntime.teardown.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());
        mockRuntime.deleteWalletsAndIdentities.should.have.been.calledOnce;
        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_GATEWAY);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);

        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'teardownFabricRuntime');
    });

    it('should be able to not force teardown', async () => {
        const executeCommandSpy: sinon.SinonSpy = sandbox.spy(vscode.commands, 'executeCommand');
        showConfirmationWarningMessageStub.resolves(true);

        await vscode.commands.executeCommand(ExtensionCommands.TEARDOWN_FABRIC, undefined, false);
        showConfirmationWarningMessageStub.should.have.been.calledOnce;
        mockRuntime.teardown.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());
        mockRuntime.deleteWalletsAndIdentities.should.have.been.calledOnce;
        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_GATEWAY);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);
        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'teardownFabricRuntime');
    });

});
