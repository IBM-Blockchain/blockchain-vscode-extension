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
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';
import { FabricRuntime } from '../../extension/fabric/FabricRuntime';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { TestUtil } from '../TestUtil';
import { LogType } from '../../extension/logging/OutputAdapter';
import * as chai from 'chai';
import * as sinon from 'sinon';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricGatewayConnectionManager } from '../../extension/fabric/FabricGatewayConnectionManager';
import { FabricGatewayRegistryEntry } from '../../extension/registries/FabricGatewayRegistryEntry';
import { FabricRuntimeUtil } from 'ibm-blockchain-platform-common';
import { FabricEnvironmentRegistryEntry } from '../../extension/registries/FabricEnvironmentRegistryEntry';
import { FabricEnvironmentManager } from '../../extension/fabric/FabricEnvironmentManager';
chai.should();

// tslint:disable no-unused-expression
describe('stopFabricRuntime', () => {

    const sandbox: sinon.SinonSandbox = sinon.createSandbox();
    const connectionRegistry: FabricGatewayRegistry = FabricGatewayRegistry.instance();
    const runtimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
    let runtime: FabricRuntime;
    let gatewayRegistyEntry: FabricGatewayRegistryEntry;
    let getRegistryEntryStub: sinon.SinonStub;
    let logSpy: sinon.SinonSpy;
    let stopStub: sinon.SinonStub;
    let executeCommandSpy: sinon.SinonSpy;

    before(async () => {
        await TestUtil.setupTests(sandbox);
    });

    beforeEach(async () => {
        await ExtensionUtil.activateExtension();
        await connectionRegistry.clear();
        await runtimeManager.initialize();
        runtime = runtimeManager.getRuntime();

        gatewayRegistyEntry = new FabricGatewayRegistryEntry();
        gatewayRegistyEntry.name = 'myGateway';

        getRegistryEntryStub = sandbox.stub(FabricGatewayConnectionManager.instance(), 'getGatewayRegistryEntry').returns(gatewayRegistyEntry);

        logSpy = sandbox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
        stopStub = sandbox.stub(runtime, 'stop').resolves();
        executeCommandSpy = sandbox.spy(vscode.commands, 'executeCommand');
    });

    afterEach(async () => {
        sandbox.restore();
        await connectionRegistry.clear();
    });

    it('should stop a Fabric runtime and refresh the view', async () => {
        await vscode.commands.executeCommand(ExtensionCommands.STOP_FABRIC);

        stopStub.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());
        executeCommandSpy.getCall(1).should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);
        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_GATEWAY);
        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'stopFabricRuntime');
    });

    it('should stop a Fabric runtime, disconnect from gateway and refresh the view', async () => {
        gatewayRegistyEntry.name = FabricRuntimeUtil.LOCAL_FABRIC;
        getRegistryEntryStub.returns(gatewayRegistyEntry);

        await vscode.commands.executeCommand(ExtensionCommands.STOP_FABRIC);
        stopStub.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.DISCONNECT_GATEWAY);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);
        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'stopFabricRuntime');
    });

    it('should stop a Fabric runtime, disconnect from environment and refresh the view', async () => {
        const environmentRegistryEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
        environmentRegistryEntry.name = FabricRuntimeUtil.name;
        environmentRegistryEntry.managedRuntime = true;
        sandbox.stub(FabricEnvironmentManager.instance(), 'getEnvironmentRegistryEntry').returns(environmentRegistryEntry);

        await vscode.commands.executeCommand(ExtensionCommands.STOP_FABRIC);
        stopStub.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);
        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'stopFabricRuntime');
    });

    it('should display an error if stopping Fabric Runtime fails', async () => {
        const error: Error = new Error('what the fabric has happened');
        stopStub.rejects(error);

        await vscode.commands.executeCommand(ExtensionCommands.STOP_FABRIC);
        stopStub.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());
        logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'stopFabricRuntime');
        logSpy.getCall(1).should.have.been.calledWithExactly(LogType.ERROR, `Failed to stop ${FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME}: ${error.message}`, `Failed to stop ${FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME}: ${error.toString()}`);
    });
});
