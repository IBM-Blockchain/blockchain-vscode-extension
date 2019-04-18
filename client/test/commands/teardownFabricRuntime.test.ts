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
import { BlockchainGatewayExplorerProvider } from '../../src/explorer/gatewayExplorer';
import { BlockchainTreeItem } from '../../src/explorer/model/BlockchainTreeItem';
import { RuntimeTreeItem } from '../../src/explorer/runtimeOps/RuntimeTreeItem';
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import { TestUtil } from '../TestUtil';

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
    let runtime: FabricRuntime;
    let runtimeTreeItem: RuntimeTreeItem;
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
        const provider: BlockchainGatewayExplorerProvider = myExtension.getBlockchainGatewayExplorerProvider();
        const children: BlockchainTreeItem[] = await provider.getChildren();
        runtimeTreeItem = children.find((child: BlockchainTreeItem) => child instanceof RuntimeTreeItem) as RuntimeTreeItem;

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

    it('should teardown a Fabric runtime', async () => {
        const executeCommandSpy: sinon.SinonSpy = sandbox.spy(vscode.commands, 'executeCommand');
        const warningStub: sinon.SinonStub = sandbox.stub(UserInputUtil, 'showConfirmationWarningMessage').resolves(true);
        const teardownStub: sinon.SinonStub = sandbox.stub(runtime, 'teardown').resolves();
        await vscode.commands.executeCommand(ExtensionCommands.TEARDOWN_FABRIC);
        warningStub.should.have.been.calledOnce;
        teardownStub.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());

        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT);

        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_LOCAL_OPS);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);
    });

    it('should teardown a Fabric runtime and disconnect', async () => {
        gatewayRegistyEntry.managedRuntime = true;
        getRegistryEntryStub.returns(gatewayRegistyEntry);

        const executeCommandSpy: sinon.SinonSpy = sandbox.spy(vscode.commands, 'executeCommand');
        const warningStub: sinon.SinonStub = sandbox.stub(UserInputUtil, 'showConfirmationWarningMessage').resolves(true);
        const teardownStub: sinon.SinonStub = sandbox.stub(runtime, 'teardown').resolves();
        await vscode.commands.executeCommand(ExtensionCommands.TEARDOWN_FABRIC);
        warningStub.should.have.been.calledOnce;
        teardownStub.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());

        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.DISCONNECT);

        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_LOCAL_OPS);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);

    });

    it('should handle cancel from confirmation message', async () => {
        const executeCommandSpy: sinon.SinonSpy = sandbox.spy(vscode.commands, 'executeCommand');

        const warningStub: sinon.SinonStub = sandbox.stub(UserInputUtil, 'showConfirmationWarningMessage').resolves(false);
        const teardownStub: sinon.SinonStub = sandbox.stub(runtime, 'teardown').resolves();
        await vscode.commands.executeCommand(ExtensionCommands.TEARDOWN_FABRIC, runtimeTreeItem);
        warningStub.should.have.been.calledOnce;
        teardownStub.should.not.have.been.called;

        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.REFRESH_LOCAL_OPS);
        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);
    });

});
