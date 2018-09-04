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
import { RuntimeTreeItem } from '../../src/explorer/model/RuntimeTreeItem';
import { CommandsUtil } from '../../src/commands/commandsUtil';

import * as chai from 'chai';
import * as sinon from 'sinon';
chai.should();

// tslint:disable no-unused-expression
describe('startFabricRuntime', () => {

    let sandbox: sinon.SinonSandbox;
    const connectionRegistry: FabricConnectionRegistry = FabricConnectionRegistry.instance();
    const runtimeRegistry: FabricRuntimeRegistry = FabricRuntimeRegistry.instance();
    const runtimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
    let runtime: FabricRuntime;
    let runtimeTreeItem: RuntimeTreeItem;

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
    });

    afterEach(async () => {
        sandbox.restore();
        await connectionRegistry.clear();
        await runtimeRegistry.clear();
        await runtimeManager.clear();
    });

    it('should start a Fabric runtime specified by right clicking the tree', async () => {
        const startStub: sinon.SinonStub = sandbox.stub(runtime, 'start').resolves();
        await vscode.commands.executeCommand('blockchainExplorer.startFabricRuntime', runtimeTreeItem);
        startStub.should.have.been.called.calledOnceWithExactly(VSCodeOutputAdapter.instance());
    });

    it('should start a Fabric runtime specified by selecting it from the quick pick', async () => {
        const quickPickStub: sinon.SinonStub = sandbox.stub(CommandsUtil, 'showRuntimeQuickPickBox').resolves('local_fabric');
        const startStub: sinon.SinonStub = sandbox.stub(runtime, 'start').resolves();
        await vscode.commands.executeCommand('blockchainExplorer.startFabricRuntime');
        quickPickStub.should.have.been.called.calledOnce;
        startStub.should.have.been.called.calledOnceWithExactly(VSCodeOutputAdapter.instance());
    });

});
