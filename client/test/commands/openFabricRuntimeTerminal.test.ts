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
import { BlockchainNetworkExplorerProvider } from '../../src/explorer/BlockchainNetworkExplorer';
import { BlockchainTreeItem } from '../../src/explorer/model/BlockchainTreeItem';
import { RuntimeTreeItem } from '../../src/explorer/model/RuntimeTreeItem';
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import { TestUtil } from '../TestUtil';

import * as chai from 'chai';
import * as sinon from 'sinon';
chai.should();

// tslint:disable no-unused-expression
describe('openFabricRuntimeTerminal', () => {

    let sandbox: sinon.SinonSandbox;
    const connectionRegistry: FabricConnectionRegistry = FabricConnectionRegistry.instance();
    const runtimeRegistry: FabricRuntimeRegistry = FabricRuntimeRegistry.instance();
    const runtimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
    let runtime: FabricRuntime;
    let runtimeTreeItem: RuntimeTreeItem;
    let mockTerminal: any;
    let createTerminalStub: sinon.SinonStub;

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
        await runtimeManager.add('local_fabric2');
        runtime = runtimeManager.get('local_fabric');
        const provider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
        const children: BlockchainTreeItem[] = await provider.getChildren();
        runtimeTreeItem = children.find((child: BlockchainTreeItem) => child instanceof RuntimeTreeItem) as RuntimeTreeItem;
        mockTerminal = {
            show: sinon.stub()
        };
        createTerminalStub = sandbox.stub(vscode.window, 'createTerminal').returns(mockTerminal);
    });

    afterEach(async () => {
        sandbox.restore();
        await connectionRegistry.clear();
        await runtimeRegistry.clear();
        await runtimeManager.clear();
    });

    it('should open a terminal for a Fabric runtime specified by right clicking the tree', async () => {
        await vscode.commands.executeCommand('blockchainExplorer.openFabricRuntimeTerminal', runtimeTreeItem);
        createTerminalStub.should.have.been.calledOnceWithExactly(
            'Fabric runtime - local_fabric',
            'docker',
            [
                'exec',
                '-e',
                'CORE_PEER_LOCALMSPID=Org1MSP',
                '-e',
                'CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/msp/users/Admin@org1.example.com/msp',
                '-ti',
                'fabricvscodelocalfabric_peer0.org1.example.com',
                'bash'
            ]
        );
        mockTerminal.show.should.have.been.calledOnce;
    });

    it('should open a terminal for a Fabric runtime specified by selecting it from the quick pick', async () => {
        const quickPickStub: sinon.SinonStub = sandbox.stub(UserInputUtil, 'showRuntimeQuickPickBox').resolves({label: 'local_fabric', data: FabricRuntimeManager.instance().get('local_fabric')});
        await vscode.commands.executeCommand('blockchainExplorer.openFabricRuntimeTerminal');
        quickPickStub.should.have.been.calledOnce;
        createTerminalStub.should.have.been.calledOnceWithExactly(
            'Fabric runtime - local_fabric',
            'docker',
            [
                'exec',
                '-e',
                'CORE_PEER_LOCALMSPID=Org1MSP',
                '-e',
                'CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/msp/users/Admin@org1.example.com/msp',
                '-ti',
                'fabricvscodelocalfabric_peer0.org1.example.com',
                'bash'
            ]
        );
        mockTerminal.show.should.have.been.calledOnce;
    });

    it('should open a terminal for a Fabric runtime if only one', async () => {
        await FabricRuntimeManager.instance().delete('local_fabric2');
        const quickPickStub: sinon.SinonStub = sandbox.stub(UserInputUtil, 'showRuntimeQuickPickBox');
        await vscode.commands.executeCommand('blockchainExplorer.openFabricRuntimeTerminal');
        quickPickStub.should.not.have.been.called;
        createTerminalStub.should.have.been.calledOnceWithExactly(
            'Fabric runtime - local_fabric',
            'docker',
            [
                'exec',
                '-e',
                'CORE_PEER_LOCALMSPID=Org1MSP',
                '-e',
                'CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/msp/users/Admin@org1.example.com/msp',
                '-ti',
                'fabricvscodelocalfabric_peer0.org1.example.com',
                'bash'
            ]
        );
        mockTerminal.show.should.have.been.calledOnce;
        quickPickStub.should.not.have.been.called;
    });

    it('should handle cancel from choosing runtime', async () => {
        const quickPickStub: sinon.SinonStub = sandbox.stub(UserInputUtil, 'showRuntimeQuickPickBox').resolves();
        await vscode.commands.executeCommand('blockchainExplorer.openFabricRuntimeTerminal');
        quickPickStub.should.have.been.calledOnce;
        createTerminalStub.should.not.have.been.called;
        mockTerminal.show.should.not.have.been.called;
    });

});
