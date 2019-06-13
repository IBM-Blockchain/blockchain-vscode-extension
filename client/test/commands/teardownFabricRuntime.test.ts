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
import { FabricGatewayRegistry } from '../../src/fabric/FabricGatewayRegistry';
import { FabricRuntimeManager } from '../../src/fabric/FabricRuntimeManager';
import { ExtensionUtil } from '../../src/util/ExtensionUtil';
import { FabricRuntime } from '../../src/fabric/FabricRuntime';
import { VSCodeBlockchainOutputAdapter } from '../../src/logging/VSCodeBlockchainOutputAdapter';
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import { TestUtil } from '../TestUtil';
import { LogType } from '../../src/logging/OutputAdapter';
import * as chai from 'chai';
import * as sinon from 'sinon';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricGatewayRegistryEntry } from '../../src/fabric/FabricGatewayRegistryEntry';
import { FabricConnectionManager } from '../../src/fabric/FabricConnectionManager';
import { FabricRuntimeUtil } from '../../src/fabric/FabricRuntimeUtil';
chai.should();

// tslint:disable no-unused-expression
describe('teardownFabricRuntime', () => {

    let sandbox: sinon.SinonSandbox;
    const connectionRegistry: FabricGatewayRegistry = FabricGatewayRegistry.instance();
    const runtimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
    let mockRuntime: sinon.SinonStubbedInstance<FabricRuntime>;
    let gatewayRegistyEntry: FabricGatewayRegistryEntry;
    let getRegistryEntryStub: sinon.SinonStub;
    let logSpy: sinon.SinonSpy;

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
        sandbox = sinon.createSandbox();
        await ExtensionUtil.activateExtension();
        await connectionRegistry.clear();
        await runtimeManager.initialize();
        mockRuntime = sinon.createStubInstance(FabricRuntime);
        mockRuntime.teardown.resolves();
        mockRuntime.deleteWalletsAndIdentities.resolves();
        sandbox.stub(FabricRuntimeManager.instance(), 'getRuntime').returns(mockRuntime);

        gatewayRegistyEntry = new FabricGatewayRegistryEntry();
        gatewayRegistyEntry.managedRuntime = false;
        gatewayRegistyEntry.connectionProfilePath = 'myPath';
        gatewayRegistyEntry.name = FabricRuntimeUtil.LOCAL_FABRIC;

        getRegistryEntryStub = sandbox.stub(FabricConnectionManager.instance(), 'getGatewayRegistryEntry').returns(gatewayRegistyEntry);

        logSpy = sandbox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
    });

    afterEach(async () => {
        sandbox.restore();
        await connectionRegistry.clear();
    });

    it('should teardown a Fabric runtime', async () => {
        const executeCommandSpy: sinon.SinonSpy = sandbox.spy(vscode.commands, 'executeCommand');
        const warningStub: sinon.SinonStub = sandbox.stub(UserInputUtil, 'showConfirmationWarningMessage').resolves(true);

        await vscode.commands.executeCommand(ExtensionCommands.TEARDOWN_FABRIC);
        warningStub.should.have.been.calledOnce;
        mockRuntime.teardown.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());
        mockRuntime.deleteWalletsAndIdentities.should.have.been.calledOnce;
        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_LOCAL_OPS);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);
        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'teardownFabricRuntime');
    });

    it('should teardown a Fabric runtime and disconnect', async () => {
        gatewayRegistyEntry.managedRuntime = true;
        getRegistryEntryStub.returns(gatewayRegistyEntry);
        const executeCommandSpy: sinon.SinonSpy = sandbox.spy(vscode.commands, 'executeCommand');
        const warningStub: sinon.SinonStub = sandbox.stub(UserInputUtil, 'showConfirmationWarningMessage').resolves(true);

        await vscode.commands.executeCommand(ExtensionCommands.TEARDOWN_FABRIC);
        warningStub.should.have.been.calledOnce;
        mockRuntime.teardown.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());
        mockRuntime.deleteWalletsAndIdentities.should.have.been.calledOnce;

        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.DISCONNECT);

        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_LOCAL_OPS);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);
        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'teardownFabricRuntime');
    });

    it('should handle cancel from confirmation message', async () => {
        const executeCommandSpy: sinon.SinonSpy = sandbox.spy(vscode.commands, 'executeCommand');

        const warningStub: sinon.SinonStub = sandbox.stub(UserInputUtil, 'showConfirmationWarningMessage').resolves(false);
        await vscode.commands.executeCommand(ExtensionCommands.TEARDOWN_FABRIC);
        warningStub.should.have.been.calledOnce;
        mockRuntime.teardown.should.not.have.been.called;
        mockRuntime.deleteWalletsAndIdentities.should.not.have.been.called;

        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.REFRESH_LOCAL_OPS);
        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);
        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'teardownFabricRuntime');
    });

    it('should display an error if teardown faric runtime fails', async () => {
        const error: Error = new Error('something terrible is about to happen');
        mockRuntime.teardown.rejects(error);

        const warningStub: sinon.SinonStub = sandbox.stub(UserInputUtil, 'showConfirmationWarningMessage').resolves(true);
        await vscode.commands.executeCommand(ExtensionCommands.TEARDOWN_FABRIC);
        warningStub.should.have.been.calledOnce;

        logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'teardownFabricRuntime');
        logSpy.getCall(1).should.have.been.calledWithExactly(LogType.ERROR, `Failed to teardown local_fabric: ${error.message}`, `Failed to teardown local_fabric: ${error.toString()}`);
    });

    it('should force teardown without neededing to answer the warning message', async () => {
        const executeCommandSpy: sinon.SinonSpy = sandbox.spy(vscode.commands, 'executeCommand');
        const warningSpy: sinon.SinonSpy = sandbox.spy(UserInputUtil, 'showConfirmationWarningMessage');

        await vscode.commands.executeCommand(ExtensionCommands.TEARDOWN_FABRIC, true);

        warningSpy.should.not.have.been.called;
        mockRuntime.teardown.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());
        mockRuntime.deleteWalletsAndIdentities.should.have.been.calledOnce;
        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_LOCAL_OPS);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);

        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'teardownFabricRuntime');
    });

    it('should be able to not force teardown', async () => {
            const executeCommandSpy: sinon.SinonSpy = sandbox.spy(vscode.commands, 'executeCommand');
            const warningStub: sinon.SinonStub = sandbox.stub(UserInputUtil, 'showConfirmationWarningMessage').resolves(true);

            await vscode.commands.executeCommand(ExtensionCommands.TEARDOWN_FABRIC, false);
            warningStub.should.have.been.calledOnce;
            mockRuntime.teardown.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());
            mockRuntime.deleteWalletsAndIdentities.should.have.been.calledOnce;
            executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT);
            executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
            executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_LOCAL_OPS);
            executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);
            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'teardownFabricRuntime');
    });

});
