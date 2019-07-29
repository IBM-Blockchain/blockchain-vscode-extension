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
import { FabricRuntimeManager } from '../../src/fabric/FabricRuntimeManager';
import { ExtensionUtil } from '../../src/util/ExtensionUtil';
import { FabricRuntime } from '../../src/fabric/FabricRuntime';
import { VSCodeBlockchainOutputAdapter } from '../../src/logging/VSCodeBlockchainOutputAdapter';
import { BlockchainRuntimeExplorerProvider } from '../../src/explorer/runtimeOpsExplorer';
import { BlockchainTreeItem } from '../../src/explorer/model/BlockchainTreeItem';
import { TestUtil } from '../TestUtil';
import { LogType } from '../../src/logging/OutputAdapter';
import { NodesTreeItem } from '../../src/explorer/runtimeOps/NodesTreeItem';
import { PeerTreeItem } from '../../src/explorer/runtimeOps/PeerTreeItem';
import * as chai from 'chai';
import * as sinon from 'sinon';
import { FabricConnectionManager } from '../../src/fabric/FabricConnectionManager';
import { ExtensionCommands } from '../../ExtensionCommands';
chai.should();

// tslint:disable no-unused-expression
describe('toggleFabricRuntimeDevMode', () => {

    const sandbox: sinon.SinonSandbox = sinon.createSandbox();
    const connectionRegistry: FabricGatewayRegistry = FabricGatewayRegistry.instance();
    const runtimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
    let runtimeStub: sinon.SinonStubbedInstance<FabricRuntime>;
    let logSpy: sinon.SinonSpy;
    let nodes: NodesTreeItem;
    let peerTreeItem: PeerTreeItem;

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
        runtimeStub = sinon.createStubInstance(FabricRuntime);
        sandbox.stub(FabricRuntimeManager.instance(), 'getRuntime').returns(runtimeStub);
        const provider: BlockchainRuntimeExplorerProvider = myExtension.getBlockchainRuntimeExplorerProvider();
        const allChildren: BlockchainTreeItem[] = await provider.getChildren();
        nodes = allChildren[2] as NodesTreeItem;
        const peers: BlockchainTreeItem[] = await provider.getChildren(nodes);
        peerTreeItem = peers[0] as PeerTreeItem;
        logSpy = sandbox.stub(VSCodeBlockchainOutputAdapter.instance(), 'log');
    });

    afterEach(async () => {
        sandbox.restore();
        await connectionRegistry.clear();
    });

    it('should enable development mode and not restart a stopped Fabric runtime when run from the command', async () => {
        sandbox.stub(FabricConnectionManager.instance(), 'getConnection').returns(false);
        runtimeStub.isDevelopmentMode.returns(false);
        runtimeStub.isRunning.resolves(false);
        runtimeStub.restart.resolves();
        await vscode.commands.executeCommand(ExtensionCommands.TOGGLE_FABRIC_DEV_MODE);
        runtimeStub.restart.should.have.not.been.called;
        logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'toggleFabricRuntimeDevMode');
        logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Development mode successfully enabled');
        logSpy.getCall(2).should.have.been.calledWith(LogType.INFO, undefined, `Transaction timeout value: infinite`);
    });

    it('should disable development mode and not restart a stopped Fabric runtime when run from the command', async () => {
        sandbox.stub(FabricConnectionManager.instance(), 'getConnection').returns(false);
        runtimeStub.isDevelopmentMode.returns(true);
        runtimeStub.isRunning.resolves(false);
        runtimeStub.restart.resolves();

        await vscode.commands.executeCommand(ExtensionCommands.TOGGLE_FABRIC_DEV_MODE);
        runtimeStub.restart.should.have.not.been.called;
        logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Development mode successfully disabled');
        logSpy.should.have.been.calledWith(LogType.INFO, undefined, `Transaction timeout value: 30 seconds`);
    });

    it('should enable development mode and restart a running Fabric runtime specified by right clicking on a peer', async () => {
        sandbox.stub(FabricConnectionManager.instance(), 'getConnection').returns(false);
        runtimeStub.isDevelopmentMode.returns(false);
        runtimeStub.isRunning.resolves(true);
        runtimeStub.restart.resolves();
        await vscode.commands.executeCommand(ExtensionCommands.TOGGLE_FABRIC_DEV_MODE, peerTreeItem);
        runtimeStub.restart.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());
        logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Development mode successfully enabled');
        logSpy.should.have.been.calledWith(LogType.INFO, undefined, `Transaction timeout value: infinite`);
    });

    it('should disable development mode and restart a running Fabric runtime specified by right clicking on a peer', async () => {
        sandbox.stub(FabricConnectionManager.instance(), 'getConnection').returns(false);
        runtimeStub.isDevelopmentMode.returns(true);
        runtimeStub.isRunning.resolves(true);
        runtimeStub.restart.resolves();
        await vscode.commands.executeCommand(ExtensionCommands.TOGGLE_FABRIC_DEV_MODE, peerTreeItem);
        runtimeStub.restart.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());
        logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Development mode successfully disabled');
        logSpy.should.have.been.calledWith(LogType.INFO, undefined, `Transaction timeout value: 30 seconds`);
    });

    it('should enable dev mode', async () => {
        sandbox.stub(FabricConnectionManager.instance(), 'getConnection').returns(false);
        runtimeStub.isDevelopmentMode.returns(false);
        runtimeStub.isRunning.resolves(false);
        runtimeStub.restart.resolves();
        await vscode.commands.executeCommand(ExtensionCommands.TOGGLE_FABRIC_DEV_MODE);
        runtimeStub.restart.should.have.not.been.called;
        logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Development mode successfully enabled');
        logSpy.should.have.been.calledWith(LogType.INFO, undefined, `Transaction timeout value: infinite`);
    });

    it('should disable dev mode', async () => {
        sandbox.stub(FabricConnectionManager.instance(), 'getConnection').returns(false);
        runtimeStub.isDevelopmentMode.returns(true);
        runtimeStub.isRunning.resolves(true);
        runtimeStub.restart.resolves();
        await vscode.commands.executeCommand(ExtensionCommands.TOGGLE_FABRIC_DEV_MODE);
        runtimeStub.restart.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());
        logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Development mode successfully disabled');
        logSpy.should.have.been.calledWith(LogType.INFO, undefined, `Transaction timeout value: 30 seconds`);
    });

    it('should disconnect when trying to enable a connected runtime', async () => {
        sandbox.stub(FabricConnectionManager.instance(), 'getConnection').returns(true);
        const executeCommandSpy: sinon.SinonSpy = sandbox.spy(vscode.commands, 'executeCommand');
        runtimeStub.isDevelopmentMode.returns(false);
        runtimeStub.isRunning.resolves(true);
        runtimeStub.restart.resolves();
        await vscode.commands.executeCommand(ExtensionCommands.TOGGLE_FABRIC_DEV_MODE, peerTreeItem);
        runtimeStub.restart.should.have.been.called;
        logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Development mode successfully enabled');
        logSpy.should.have.been.calledWith(LogType.INFO, undefined, `Transaction timeout value: infinite`);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.DISCONNECT);
    });

    it('should disconnect when trying to disable a connected runtime', async () => {
        sandbox.stub(FabricConnectionManager.instance(), 'getConnection').returns(true);
        const executeCommandSpy: sinon.SinonSpy = sandbox.spy(vscode.commands, 'executeCommand');
        runtimeStub.isDevelopmentMode.returns(true);
        runtimeStub.isRunning.resolves(true);
        runtimeStub.restart.resolves();
        await vscode.commands.executeCommand(ExtensionCommands.TOGGLE_FABRIC_DEV_MODE, peerTreeItem);
        runtimeStub.restart.should.have.been.called;
        logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Development mode successfully disabled');
        logSpy.should.have.been.calledWith(LogType.INFO, undefined, `Transaction timeout value: 30 seconds`);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.DISCONNECT);
    });

    it('should display an error when restarting fabric fails', async () => {
        sandbox.stub(FabricConnectionManager.instance(), 'getConnection').returns(true);
        const executeCommandSpy: sinon.SinonSpy = sandbox.spy(vscode.commands, 'executeCommand');
        runtimeStub.isDevelopmentMode.returns(true);
        runtimeStub.isRunning.resolves(true);
        const error: Error = new Error('something terrible is about to happen');
        runtimeStub.restart.rejects(error);

        await vscode.commands.executeCommand(ExtensionCommands.TOGGLE_FABRIC_DEV_MODE, peerTreeItem);
        runtimeStub.restart.should.have.been.called;
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.DISCONNECT);
        logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'toggleFabricRuntimeDevMode');
        logSpy.getCall(1).should.have.been.calledWithExactly(LogType.ERROR, `Failed to restart Local Fabric: ${error.message}`, `Failed to restart Local Fabric: ${error.toString()}`);
    });
});
