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
import { LogType } from '../../src/logging/OutputAdapter';
chai.should();

// tslint:disable no-unused-expression
describe('restartFabricRuntime', () => {

    const sandbox: sinon.SinonSandbox = sinon.createSandbox();
    const connectionRegistry: FabricGatewayRegistry = FabricGatewayRegistry.instance();
    const runtimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
    let logSpy: sinon.SinonSpy;
    let runtime: FabricRuntime;

    before(async () => {
        await TestUtil.setupTests(sandbox);
        await TestUtil.storeGatewaysConfig();
        await TestUtil.storeRuntimesConfig();
    });

    after(async () => {
        await TestUtil.restoreGatewaysConfig();
        await TestUtil.restoreRuntimesConfig();
    });

    beforeEach(async () => {
        await ExtensionUtil.activateExtension();
        await connectionRegistry.clear();
        await runtimeManager.initialize();
        runtime = runtimeManager.getRuntime();
        logSpy = sandbox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
    });

    afterEach(async () => {
        sandbox.restore();
        await connectionRegistry.clear();
    });

    it('should restart a Fabric runtime', async () => {
        const restartStub: sinon.SinonStub = sandbox.stub(runtime, 'restart').resolves();
        await vscode.commands.executeCommand(ExtensionCommands.RESTART_FABRIC);
        restartStub.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());
        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'restartFabricRuntime');
    });

    it('should display an error if restarting Fabric runtime fails', async () => {
        const error: Error = new Error('something terrible is about to happen');
        const restartStub: sinon.SinonStub = sandbox.stub(runtime, 'restart').rejects(error);
        await vscode.commands.executeCommand(ExtensionCommands.RESTART_FABRIC);
        restartStub.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());
        logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'restartFabricRuntime');
        logSpy.getCall(1).should.have.been.calledWithExactly(LogType.ERROR, `Failed to restart local_fabric: ${error.message}`, `Failed to restart local_fabric: ${error.toString()}`);
    });
});
