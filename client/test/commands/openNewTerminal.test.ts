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
import { ExtensionUtil } from '../../src/util/ExtensionUtil';
import { TestUtil } from '../TestUtil';
import * as chai from 'chai';
import * as sinon from 'sinon';
import { ExtensionCommands } from '../../ExtensionCommands';
import { Reporter } from '../../src/util/Reporter';
import { NodeTreeItem } from '../../src/explorer/runtimeOps/NodeTreeItem';
import { FabricNode, FabricNodeType } from '../../src/fabric/FabricNode';
import { BlockchainEnvironmentExplorerProvider } from '../../src/explorer/environmentExplorer';
import { UserInputUtil } from '../../src/commands/UserInputUtil';
chai.should();

class TestNodeTreeItem extends NodeTreeItem {

}

// tslint:disable no-unused-expression
describe('openNewTerminal', () => {

    const sandbox: sinon.SinonSandbox = sinon.createSandbox();
    let nodeItem: NodeTreeItem;
    let node: FabricNode;
    let mockTerminal: any;
    let createTerminalStub: sinon.SinonStub;
    let sendTelemetryEventStub: sinon.SinonStub;

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
        const provider: BlockchainEnvironmentExplorerProvider = myExtension.getBlockchainEnvironmentExplorerProvider();
        node = FabricNode.newPeer('peer0.org1.example.com', 'peer0.org1.example.com', 'grpc://localhost:7051', 'local_fabric_wallet', 'admin', 'Org1MSP');
        node.container_name = 'fabricvscodelocalfabric_peer0.org1.example.com';
        nodeItem = new TestNodeTreeItem(provider, node.name, vscode.TreeItemCollapsibleState.None, node);
        mockTerminal = {
            show: sinon.stub()
        };
        createTerminalStub = sandbox.stub(vscode.window, 'createTerminal').returns(mockTerminal);
        sendTelemetryEventStub = sandbox.stub(Reporter.instance(), 'sendTelemetryEvent');
    });

    afterEach(async () => {
        sandbox.restore();
    });

    it('should open a terminal for a Fabric node specified by right clicking the tree', async () => {
        await vscode.commands.executeCommand(ExtensionCommands.OPEN_NEW_TERMINAL, nodeItem);
        createTerminalStub.should.have.been.calledOnceWithExactly(
            'Fabric runtime - peer0.org1.example.com',
            'docker',
            [
                'exec',
                '-ti',
                'fabricvscodelocalfabric_peer0.org1.example.com',
                'bash'
            ]
        );
        mockTerminal.show.should.have.been.calledOnce;
        sendTelemetryEventStub.should.have.been.calledOnceWithExactly('openFabricRuntimeTerminalCommand', { type: FabricNodeType.PEER });
    });

    it('should open a terminal for a Fabric node specified by user selection', async () => {
        sandbox.stub(UserInputUtil, 'showRuntimeNodeQuickPick').resolves(node);
        await vscode.commands.executeCommand(ExtensionCommands.OPEN_NEW_TERMINAL);
        createTerminalStub.should.have.been.calledOnceWithExactly(
            'Fabric runtime - peer0.org1.example.com',
            'docker',
            [
                'exec',
                '-ti',
                'fabricvscodelocalfabric_peer0.org1.example.com',
                'bash'
            ]
        );
        mockTerminal.show.should.have.been.calledOnce;
        sendTelemetryEventStub.should.have.been.calledOnceWithExactly('openFabricRuntimeTerminalCommand', { type: FabricNodeType.PEER });
    });

    it('should not open a terminal if a user cancels specifying a Fabric node', async () => {
        sandbox.stub(UserInputUtil, 'showRuntimeNodeQuickPick').resolves(undefined);
        await vscode.commands.executeCommand(ExtensionCommands.OPEN_NEW_TERMINAL);
        createTerminalStub.should.not.have.been.called;
    });
});
