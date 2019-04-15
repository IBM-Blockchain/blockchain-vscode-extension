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
import { BlockchainRuntimeExplorerProvider } from '../../src/explorer/runtimeOpsExplorer';
import { BlockchainTreeItem } from '../../src/explorer/model/BlockchainTreeItem';
import { TestUtil } from '../TestUtil';
import { NodesTreeItem } from '../../src/explorer/runtimeOps/NodesTreeItem';
import { PeerTreeItem } from '../../src/explorer/runtimeOps/PeerTreeItem';
import * as chai from 'chai';
import * as sinon from 'sinon';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricRuntimeUtil } from '../../src/fabric/FabricRuntimeUtil';
chai.should();

// tslint:disable no-unused-expression
describe('openFabricRuntimeTerminal', () => {

    let sandbox: sinon.SinonSandbox;
    const connectionRegistry: FabricGatewayRegistry = FabricGatewayRegistry.instance();
    const runtimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
    let runtime: FabricRuntime;
    let mockTerminal: any;
    let createTerminalStub: sinon.SinonStub;
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
        await runtimeManager.add();
        runtime = runtimeManager.getRuntime();
        sandbox.stub(runtime, 'isRunning').resolves(true);
        const provider: BlockchainRuntimeExplorerProvider = myExtension.getBlockchainRuntimeExplorerProvider();
        const allChildren: BlockchainTreeItem[] = await provider.getChildren();
        nodes = allChildren[2] as NodesTreeItem;
        const peers: BlockchainTreeItem[] = await provider.getChildren(nodes);
        peerTreeItem = peers[0] as PeerTreeItem;
        mockTerminal = {
            show: sinon.stub()
        };
        createTerminalStub = sandbox.stub(vscode.window, 'createTerminal').returns(mockTerminal);
    });

    afterEach(async () => {
        sandbox.restore();
        await connectionRegistry.clear();
    });

    it('should open a terminal for a Fabric runtime specified by right clicking the tree', async () => {
        await vscode.commands.executeCommand(ExtensionCommands.OPEN_FABRIC_RUNTIME_TERMINAL, peerTreeItem);
        createTerminalStub.should.have.been.calledOnceWithExactly(
            `Fabric runtime - ${FabricRuntimeUtil.LOCAL_FABRIC}`,
            'docker',
            [
                'exec',
                '-e',
                'CORE_PEER_LOCALMSPID=Org1MSP',
                '-e',
                `CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/msp/users/${FabricRuntimeUtil.ADMIN_USER}/msp`,
                '-ti',
                'fabricvscodelocalfabric_peer0.org1.example.com',
                'bash'
            ]
        );
        mockTerminal.show.should.have.been.calledOnce;
    });

    it('should open a terminal for a Fabric runtime', async () => {
        await vscode.commands.executeCommand(ExtensionCommands.OPEN_FABRIC_RUNTIME_TERMINAL);
        createTerminalStub.should.have.been.calledOnceWithExactly(
            `Fabric runtime - ${FabricRuntimeUtil.LOCAL_FABRIC}`,
            'docker',
            [
                'exec',
                '-e',
                'CORE_PEER_LOCALMSPID=Org1MSP',
                '-e',
                `CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/msp/users/${FabricRuntimeUtil.ADMIN_USER}/msp`,
                '-ti',
                'fabricvscodelocalfabric_peer0.org1.example.com',
                'bash'
            ]
        );
        mockTerminal.show.should.have.been.calledOnce;
    });
});
