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
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';
import { TestUtil } from '../TestUtil';
import * as chai from 'chai';
import * as sinon from 'sinon';
import { ExtensionCommands } from '../../ExtensionCommands';
import { Reporter } from '../../extension/util/Reporter';
import { NodeTreeItem } from '../../extension/explorer/runtimeOps/connectedTree/NodeTreeItem';
import { BlockchainEnvironmentExplorerProvider } from '../../extension/explorer/environmentExplorer';
import { UserInputUtil } from '../../extension/commands/UserInputUtil';
import { FabricEnvironmentRegistryEntry, FabricNode, FabricNodeType, FabricRuntimeUtil, EnvironmentType } from 'ibm-blockchain-platform-common';
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
    });

    beforeEach(async () => {
        await ExtensionUtil.activateExtension();
        const provider: BlockchainEnvironmentExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();
        node = FabricNode.newPeer('peer0.org1.example.com', 'peer0.org1.example.com', 'grpc://localhost:7051', 'Org1', 'admin', 'Org1MSP');
        node.container_name = 'fabricvscodelocalfabric_peer0.org1.example.com';

        const fabricEnvironmentRegistryEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
        fabricEnvironmentRegistryEntry.name = FabricRuntimeUtil.LOCAL_FABRIC;
        fabricEnvironmentRegistryEntry.managedRuntime = true;
        fabricEnvironmentRegistryEntry.environmentType = EnvironmentType.ANSIBLE_ENVIRONMENT;

        const tooltip: string = `Name: ${node.name} \n MSPID: ${node.msp_id} \n Associated Identity: \n ${node.identity}`;
        nodeItem = new TestNodeTreeItem(provider, node.name, tooltip, fabricEnvironmentRegistryEntry, node);
        mockTerminal = {
            show: sandbox.stub()
        };
        createTerminalStub = sandbox.stub(vscode.window, 'createTerminal').returns(mockTerminal);
        sendTelemetryEventStub = sandbox.stub(Reporter.instance(), 'sendTelemetryEvent');

        await TestUtil.setupLocalFabric();
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
        sandbox.stub(UserInputUtil, 'showFabricNodeQuickPick').resolves({data: node});
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
        sandbox.stub(UserInputUtil, 'showFabricNodeQuickPick').resolves(undefined);
        await vscode.commands.executeCommand(ExtensionCommands.OPEN_NEW_TERMINAL);
        createTerminalStub.should.not.have.been.called;
    });
});
