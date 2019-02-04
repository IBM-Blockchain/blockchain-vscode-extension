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
import * as myExtension from '../../src/extension';
import { FabricConnectionRegistry } from '../../src/fabric/FabricConnectionRegistry';
import { FabricRuntimeRegistry } from '../../src/fabric/FabricRuntimeRegistry';
import { FabricRuntimeManager } from '../../src/fabric/FabricRuntimeManager';
import { ExtensionUtil } from '../../src/util/ExtensionUtil';
import { FabricRuntime } from '../../src/fabric/FabricRuntime';
import { VSCodeOutputAdapter } from '../../src/logging/VSCodeOutputAdapter';
import { BlockchainNetworkExplorerProvider } from '../../src/explorer/BlockchainNetworkExplorer';
import { BlockchainTreeItem } from '../../src/explorer/model/BlockchainTreeItem';
import { RuntimeTreeItem } from '../../src/explorer/runtimeOps/RuntimeTreeItem';
import { TestUtil } from '../TestUtil';
import { LogType } from '../../src/logging/OutputAdapter';

import * as chai from 'chai';
import * as sinon from 'sinon';
import { FabricConnectionManager } from '../../src/fabric/FabricConnectionManager';
chai.should();

// tslint:disable no-unused-expression
describe('toggleFabricRuntimeDevMode', () => {

    let sandbox: sinon.SinonSandbox;
    const connectionRegistry: FabricConnectionRegistry = FabricConnectionRegistry.instance();
    const runtimeRegistry: FabricRuntimeRegistry = FabricRuntimeRegistry.instance();
    const runtimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
    let runtime: FabricRuntime;
    let runtimeTreeItem: RuntimeTreeItem;
    let logSpy: sinon.SinonSpy;

    before(async () => {
        await TestUtil.setupTests();
        await TestUtil.storeConnectionsConfig();
        await TestUtil.storeRuntimesConfig();
    });

    after(async () => {
        await TestUtil.restoreConnectionsConfig();
        await TestUtil.restoreRuntimesConfig();
    });

    beforeEach(async () => {
        sandbox = sinon.createSandbox();
        await ExtensionUtil.activateExtension();
        await connectionRegistry.clear();
        await runtimeRegistry.clear();
        await runtimeManager.clear();
        await runtimeManager.add('local_fabric');
        runtime = runtimeManager.get('local_fabric');
        const provider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
        const children: BlockchainTreeItem[] = await provider.getChildren();
        runtimeTreeItem = children.find((child: BlockchainTreeItem) => child instanceof RuntimeTreeItem) as RuntimeTreeItem;
        logSpy = sandbox.stub(VSCodeOutputAdapter.instance(), 'log');
    });

    afterEach(async () => {
        sandbox.restore();
        await connectionRegistry.clear();
        await runtimeRegistry.clear();
        await runtimeManager.clear();
    });

    xit('should enable development mode and not restart a stopped Fabric runtime specified by right clicking the tree', async () => {
        sandbox.stub(FabricConnectionManager.instance(), 'getConnection').returns(false);
        await runtime.setDevelopmentMode(false);
        sandbox.stub(runtime, 'isRunning').resolves(false);
        const restartStub: sinon.SinonStub = sandbox.stub(runtime, 'restart').resolves();
        await vscode.commands.executeCommand('blockchainExplorer.toggleFabricRuntimeDevMode', runtimeTreeItem);
        restartStub.should.have.not.been.called;
        runtime.isDevelopmentMode().should.be.true;
        logSpy.should.have.been.calledWith(LogType.SUCCESS, undefined, 'Successfully toggled development mode');
    });

    xit('should disable development mode and not restart a stopped Fabric runtime specified by right clicking the tree', async () => {
        sandbox.stub(FabricConnectionManager.instance(), 'getConnection').returns(false);
        await runtime.setDevelopmentMode(true);
        sandbox.stub(runtime, 'isRunning').resolves(false);
        const restartStub: sinon.SinonStub = sandbox.stub(runtime, 'restart').resolves();
        await vscode.commands.executeCommand('blockchainExplorer.toggleFabricRuntimeDevMode', runtimeTreeItem);
        restartStub.should.have.not.been.called;
        runtime.isDevelopmentMode().should.be.false;
        logSpy.should.have.been.calledWith(LogType.SUCCESS, undefined, 'Successfully toggled development mode');
    });

    xit('should enable development mode and restart a running Fabric runtime specified by right clicking the tree', async () => {
        sandbox.stub(FabricConnectionManager.instance(), 'getConnection').returns(false);
        await runtime.setDevelopmentMode(false);
        sandbox.stub(runtime, 'isRunning').resolves(true);
        const restartStub: sinon.SinonStub = sandbox.stub(runtime, 'restart').resolves();
        await vscode.commands.executeCommand('blockchainExplorer.toggleFabricRuntimeDevMode', runtimeTreeItem);
        restartStub.should.have.been.called.calledOnceWithExactly(VSCodeOutputAdapter.instance());
        runtime.isDevelopmentMode().should.be.true;
        logSpy.should.have.been.calledWith(LogType.SUCCESS, undefined, 'Successfully toggled development mode');
    });

    xit('should disable development mode and restart a running Fabric runtime specified by right clicking the tree', async () => {
        sandbox.stub(FabricConnectionManager.instance(), 'getConnection').returns(false);
        await runtime.setDevelopmentMode(true);
        sandbox.stub(runtime, 'isRunning').resolves(true);
        const restartStub: sinon.SinonStub = sandbox.stub(runtime, 'restart').resolves();
        await vscode.commands.executeCommand('blockchainExplorer.toggleFabricRuntimeDevMode', runtimeTreeItem);
        restartStub.should.have.been.called.calledOnceWithExactly(VSCodeOutputAdapter.instance());
        runtime.isDevelopmentMode().should.be.false;
        logSpy.should.have.been.calledWith(LogType.SUCCESS, undefined, 'Successfully toggled development mode');
    });

    it('should toggle dev mode', async () => {
        sandbox.stub(FabricConnectionManager.instance(), 'getConnection').returns(false);
        await runtime.setDevelopmentMode(false);
        sandbox.stub(runtime, 'isRunning').resolves(false);
        const restartStub: sinon.SinonStub = sandbox.stub(runtime, 'restart').resolves();
        await vscode.commands.executeCommand('blockchainExplorer.toggleFabricRuntimeDevMode');
        restartStub.should.have.not.been.called;
        runtime.isDevelopmentMode().should.be.true;
        logSpy.should.have.been.calledWith(LogType.SUCCESS, undefined, 'Successfully toggled development mode');
    });

    it('should disconnect when trying to toggle a connected runtime', async () => {
        sandbox.stub(FabricConnectionManager.instance(), 'getConnection').returns(true);
        const executeCommandSpy: sinon.SinonSpy = sandbox.spy(vscode.commands, 'executeCommand');
        await runtime.setDevelopmentMode(false);
        sandbox.stub(runtime, 'isRunning').resolves(true);
        const restartStub: sinon.SinonStub = sandbox.stub(runtime, 'restart').resolves();
        await vscode.commands.executeCommand('blockchainExplorer.toggleFabricRuntimeDevMode', runtimeTreeItem);
        restartStub.should.have.been.called;
        runtime.isDevelopmentMode().should.be.true;
        logSpy.should.have.been.calledWith(LogType.SUCCESS, undefined, 'Successfully toggled development mode');
        executeCommandSpy.should.have.been.calledWith('blockchainConnectionsExplorer.disconnectEntry');
    });
});
