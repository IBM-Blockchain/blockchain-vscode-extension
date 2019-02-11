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
import { FabricGatewayRegistry } from '../../src/fabric/FabricGatewayRegistry';
import { FabricRuntimeRegistry } from '../../src/fabric/FabricRuntimeRegistry';
import { FabricRuntimeManager } from '../../src/fabric/FabricRuntimeManager';
import { ExtensionUtil } from '../../src/util/ExtensionUtil';
import { FabricRuntime } from '../../src/fabric/FabricRuntime';
import { VSCodeOutputAdapter } from '../../src/logging/VSCodeOutputAdapter';
import { BlockchainRuntimeExplorerProvider } from '../../src/explorer/BlockchainRuntimeExplorer';
import { BlockchainTreeItem } from '../../src/explorer/model/BlockchainTreeItem';
import { TestUtil } from '../TestUtil';
import { LogType } from '../../src/logging/OutputAdapter';
import { NodesTreeItem } from '../../src/explorer/runtimeOps/NodesTreeItem';
import { PeerTreeItem } from '../../src/explorer/runtimeOps/PeerTreeItem';
import * as chai from 'chai';
import * as sinon from 'sinon';
import { FabricConnectionManager } from '../../src/fabric/FabricConnectionManager';
chai.should();

// tslint:disable no-unused-expression
describe('toggleFabricRuntimeDevMode', () => {

    let sandbox: sinon.SinonSandbox;
    const connectionRegistry: FabricGatewayRegistry = FabricGatewayRegistry.instance();
    const runtimeRegistry: FabricRuntimeRegistry = FabricRuntimeRegistry.instance();
    const runtimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
    let runtime: FabricRuntime;
    let logSpy: sinon.SinonSpy;
    let nodes: NodesTreeItem;
    let peerTreeItem: PeerTreeItem;

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
        await runtimeRegistry.clear();
        await runtimeManager.clear();
        await runtimeManager.add('local_fabric');
        runtime = runtimeManager.get('local_fabric');
        const provider: BlockchainRuntimeExplorerProvider = myExtension.getBlockchainRuntimeExplorerProvider();
        const allChildren: BlockchainTreeItem[] = await provider.getChildren();
        nodes = allChildren[2] as NodesTreeItem;
        const peers: BlockchainTreeItem[] = await provider.getChildren(nodes);
        peerTreeItem = peers[0] as PeerTreeItem;
        logSpy = sandbox.stub(VSCodeOutputAdapter.instance(), 'log');
    });

    afterEach(async () => {
        sandbox.restore();
        await connectionRegistry.clear();
        await runtimeRegistry.clear();
        await runtimeManager.clear();
    });

    it('should enable development mode and not restart a stopped Fabric runtime when run from the command', async () => {
        sandbox.stub(FabricConnectionManager.instance(), 'getConnection').returns(false);
        await runtime.setDevelopmentMode(false);
        sandbox.stub(runtime, 'isRunning').resolves(false);
        const restartStub: sinon.SinonStub = sandbox.stub(runtime, 'restart').resolves();
        await vscode.commands.executeCommand('blockchainExplorer.toggleFabricRuntimeDevMode');
        restartStub.should.have.not.been.called;
        runtime.isDevelopmentMode().should.be.true;
        logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully toggled development mode', 'Successfully toggled development mode');
    });

    it('should disable development mode and not restart a stopped Fabric runtime when run from the command', async () => {
        sandbox.stub(FabricConnectionManager.instance(), 'getConnection').returns(false);
        await runtime.setDevelopmentMode(true);
        sandbox.stub(runtime, 'isRunning').resolves(false);
        const restartStub: sinon.SinonStub = sandbox.stub(runtime, 'restart').resolves();
        await vscode.commands.executeCommand('blockchainExplorer.toggleFabricRuntimeDevMode');
        restartStub.should.have.not.been.called;
        runtime.isDevelopmentMode().should.be.false;
        logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully toggled development mode', 'Successfully toggled development mode');
    });

    it('should enable development mode and restart a running Fabric runtime specified by right clicking on a peer', async () => {
        sandbox.stub(FabricConnectionManager.instance(), 'getConnection').returns(false);
        await runtime.setDevelopmentMode(false);
        sandbox.stub(runtime, 'isRunning').resolves(true);
        const restartStub: sinon.SinonStub = sandbox.stub(runtime, 'restart').resolves();
        await vscode.commands.executeCommand('blockchainExplorer.toggleFabricRuntimeDevMode', peerTreeItem);
        restartStub.should.have.been.called.calledOnceWithExactly(VSCodeOutputAdapter.instance());
        runtime.isDevelopmentMode().should.be.true;
        logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully toggled development mode', 'Successfully toggled development mode');
    });

    it('should disable development mode and restart a running Fabric runtime specified by right clicking on a peer', async () => {
        sandbox.stub(FabricConnectionManager.instance(), 'getConnection').returns(false);
        await runtime.setDevelopmentMode(true);
        sandbox.stub(runtime, 'isRunning').resolves(true);
        const restartStub: sinon.SinonStub = sandbox.stub(runtime, 'restart').resolves();
        await vscode.commands.executeCommand('blockchainExplorer.toggleFabricRuntimeDevMode', peerTreeItem);
        restartStub.should.have.been.called.calledOnceWithExactly(VSCodeOutputAdapter.instance());
        runtime.isDevelopmentMode().should.be.false;
        logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully toggled development mode', 'Successfully toggled development mode');
    });

    it('should toggle dev mode', async () => {
        sandbox.stub(FabricConnectionManager.instance(), 'getConnection').returns(false);
        await runtime.setDevelopmentMode(false);
        sandbox.stub(runtime, 'isRunning').resolves(false);
        const restartStub: sinon.SinonStub = sandbox.stub(runtime, 'restart').resolves();
        await vscode.commands.executeCommand('blockchainExplorer.toggleFabricRuntimeDevMode');
        restartStub.should.have.not.been.called;
        runtime.isDevelopmentMode().should.be.true;
        logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully toggled development mode', 'Successfully toggled development mode');
    });

    it('should disconnect when trying to toggle a connected runtime', async () => {
        sandbox.stub(FabricConnectionManager.instance(), 'getConnection').returns(true);
        const executeCommandSpy: sinon.SinonSpy = sandbox.spy(vscode.commands, 'executeCommand');
        await runtime.setDevelopmentMode(false);
        sandbox.stub(runtime, 'isRunning').resolves(true);
        const restartStub: sinon.SinonStub = sandbox.stub(runtime, 'restart').resolves();
        await vscode.commands.executeCommand('blockchainExplorer.toggleFabricRuntimeDevMode', peerTreeItem);
        restartStub.should.have.been.called;
        runtime.isDevelopmentMode().should.be.true;
        logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully toggled development mode', 'Successfully toggled development mode');
        executeCommandSpy.should.have.been.calledWith('blockchainConnectionsExplorer.disconnectEntry');
    });
});
