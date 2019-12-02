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
import { BlockchainEnvironmentExplorerProvider } from '../../extension/explorer/environmentExplorer';
import { BlockchainTreeItem } from '../../extension/explorer/model/BlockchainTreeItem';
import { RuntimeTreeItem } from '../../extension/explorer/runtimeOps/disconnectedTree/RuntimeTreeItem';
import { TestUtil } from '../TestUtil';
import * as chai from 'chai';
import * as sinon from 'sinon';
import { ExtensionCommands } from '../../ExtensionCommands';
import { LogType } from '../../extension/logging/OutputAdapter';
import { FabricRuntimeUtil } from 'ibm-blockchain-platform-common';
import { FabricEnvironmentRegistry } from '../../extension/registries/FabricEnvironmentRegistry';

chai.should();

// tslint:disable no-unused-expression
describe('startFabricRuntime', () => {

    const sandbox: sinon.SinonSandbox = sinon.createSandbox();
    const connectionRegistry: FabricGatewayRegistry = FabricGatewayRegistry.instance();
    const runtimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
    let mockRuntime: sinon.SinonStubbedInstance<FabricRuntime>;
    let runtimeTreeItem: RuntimeTreeItem;
    let blockchainLogsOutputSpy: sinon.SinonSpy;
    let commandStub: sinon.SinonStub;
    let logSpy: sinon.SinonSpy;

    before(async () => {
        await TestUtil.setupTests(sandbox);
    });

    beforeEach(async () => {
        await connectionRegistry.clear();
        await FabricEnvironmentRegistry.instance().clear();
        await runtimeManager.initialize();
        mockRuntime = sandbox.createStubInstance(FabricRuntime);
        mockRuntime.isGenerated.resolves(true);
        mockRuntime.generate.resolves();
        mockRuntime.isCreated.resolves(true);
        mockRuntime.create.resolves();
        mockRuntime.start.resolves();
        mockRuntime.importWalletsAndIdentities.resolves();
        sandbox.stub(FabricRuntimeManager.instance(), 'getRuntime').returns(mockRuntime);
        blockchainLogsOutputSpy = sandbox.spy(VSCodeBlockchainOutputAdapter.instance(), 'show');

        const provider: BlockchainEnvironmentExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();
        const children: BlockchainTreeItem[] = await provider.getChildren();
        runtimeTreeItem = children.find((child: BlockchainTreeItem) => child instanceof RuntimeTreeItem) as RuntimeTreeItem;
        commandStub = sandbox.stub(vscode.commands, 'executeCommand').callThrough();
        commandStub.withArgs(ExtensionCommands.CONNECT_TO_ENVIRONMENT).resolves();
        logSpy = sandbox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
    });

    afterEach(async () => {
        sandbox.restore();
        await connectionRegistry.clear();
    });

    it('should start a Fabric runtime specified by clicking the tree', async () => {
        mockRuntime.isGenerated.resolves(true);
        await vscode.commands.executeCommand(runtimeTreeItem.command.command);
        commandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT);
    });

    it('should start a Fabric runtime', async () => {
        mockRuntime.isGenerated.resolves(true);
        await vscode.commands.executeCommand(ExtensionCommands.START_FABRIC);
        mockRuntime.generate.should.not.have.been.called;
        mockRuntime.start.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());
        commandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);
        commandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
        commandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);
        blockchainLogsOutputSpy.should.have.been.called;
        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'startFabricRuntime');
    });

    it('should create, generate and start a Fabric runtime', async () => {
        mockRuntime.isCreated.resolves(false);
        mockRuntime.isGenerated.resolves(false);
        await vscode.commands.executeCommand(ExtensionCommands.START_FABRIC);
        mockRuntime.create.should.have.been.calledOnce;
        mockRuntime.generate.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());
        mockRuntime.start.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());
        commandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);
        commandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
        commandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);
        blockchainLogsOutputSpy.should.have.been.called;
        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'startFabricRuntime');
    });

    it('should display an error if local fabric fails to start', async () => {
        mockRuntime.isGenerated.resolves(true);
        const error: Error = new Error('who ate all the cakes?');
        mockRuntime.start.rejects(error);

        await vscode.commands.executeCommand(ExtensionCommands.START_FABRIC);
        mockRuntime.start.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());
        commandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);
        commandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
        commandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);
        blockchainLogsOutputSpy.should.have.been.called;
        logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'startFabricRuntime');
        logSpy.getCall(1).should.have.been.calledWithExactly(LogType.ERROR, `Failed to start ${FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME}: ${error.message}`, `Failed to start ${FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME}: ${error.toString()}`);
    });

});
