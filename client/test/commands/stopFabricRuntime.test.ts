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
import { TestUtil } from '../TestUtil';

import * as chai from 'chai';
import * as sinon from 'sinon';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricConnectionManager } from '../../src/fabric/FabricConnectionManager';
import { FabricGatewayRegistryEntry } from '../../src/fabric/FabricGatewayRegistryEntry';
import { FabricRuntimeUtil } from '../../src/fabric/FabricRuntimeUtil';
chai.should();

// tslint:disable no-unused-expression
describe('stopFabricRuntime', () => {

    let sandbox: sinon.SinonSandbox;
    const connectionRegistry: FabricGatewayRegistry = FabricGatewayRegistry.instance();
    const runtimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
    let runtime: FabricRuntime;
    let gatewayRegistyEntry: FabricGatewayRegistryEntry;
    let getRegistryEntryStub: sinon.SinonStub;

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
        await runtimeManager.add();
        runtime = runtimeManager.getRuntime();

        gatewayRegistyEntry = new FabricGatewayRegistryEntry();
        gatewayRegistyEntry.managedRuntime = false;
        gatewayRegistyEntry.connectionProfilePath = 'myPath';
        gatewayRegistyEntry.name = FabricRuntimeUtil.LOCAL_FABRIC;

        getRegistryEntryStub = sandbox.stub(FabricConnectionManager.instance(), 'getGatewayRegistryEntry').returns(gatewayRegistyEntry);
    });

    afterEach(async () => {
        sandbox.restore();
        await connectionRegistry.clear();
    });

    it('should stop a Fabric runtime and refresh the view', async () => {
        const stopStub: sinon.SinonStub = sandbox.stub(runtime, 'stop').resolves();
        const executeCommandSpy: sinon.SinonSpy = sandbox.spy(vscode.commands, 'executeCommand');
        await vscode.commands.executeCommand(ExtensionCommands.STOP_FABRIC);
        stopStub.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());
        executeCommandSpy.should.have.been.calledThrice;
        executeCommandSpy.getCall(1).should.have.been.calledWith(ExtensionCommands.REFRESH_LOCAL_OPS);
        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT);
    });

    it('should stop a Fabric runtime, disconnect from gateway and refresh the view', async () => {
        gatewayRegistyEntry.managedRuntime = true;
        getRegistryEntryStub.returns(gatewayRegistyEntry);

        const stopStub: sinon.SinonStub = sandbox.stub(runtime, 'stop').resolves();
        const executeCommandSpy: sinon.SinonSpy = sandbox.spy(vscode.commands, 'executeCommand');
        await vscode.commands.executeCommand(ExtensionCommands.STOP_FABRIC);
        stopStub.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.DISCONNECT);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_LOCAL_OPS);
    });
});
