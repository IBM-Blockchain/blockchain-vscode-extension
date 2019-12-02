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
'use strict';
import * as vscode from 'vscode';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { TestUtil } from '../TestUtil';
import { ExtensionCommands } from '../../ExtensionCommands';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../../extension/logging/OutputAdapter';
import { BlockchainEnvironmentExplorerProvider } from '../../extension/explorer/environmentExplorer';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';
import { FabricEnvironment } from '../../extension/fabric/FabricEnvironment';
import { FabricEnvironmentRegistryEntry } from '../../extension/registries/FabricEnvironmentRegistryEntry';
import { FabricNode } from '../../extension/fabric/FabricNode';
import { UserInputUtil } from '../../extension/commands/UserInputUtil';
import { FabricEnvironmentManager } from '../../extension/fabric/FabricEnvironmentManager';
import { PeerTreeItem } from '../../extension/explorer/runtimeOps/connectedTree/PeerTreeItem';
import { FabricEnvironmentRegistry } from '../../extension/registries/FabricEnvironmentRegistry';
import { FabricRuntimeUtil } from 'ibm-blockchain-platform-common';

chai.should();
chai.use(sinonChai);
// tslint:disable no-unused-expression

describe('DeleteNodeCommand', () => {
    let mySandBox: sinon.SinonSandbox;

    before(async () => {
        mySandBox = sinon.createSandbox();
        await TestUtil.setupTests(mySandBox);
    });

    describe('deleteNode', () => {

        let environmentRegistryEntry: FabricEnvironmentRegistryEntry;
        let peerNode: FabricNode;
        let anotherPeerNode: FabricNode;
        let morePeerNode: FabricNode;
        let deleteNodeStub: sinon.SinonStub;
        let showEnvironmentStub: sinon.SinonStub;
        let showNodeStub: sinon.SinonStub;
        let executeCommandStub: sinon.SinonStub;
        let showConfirmationWarningMessage: sinon.SinonStub;
        let logSpy: sinon.SinonSpy;
        let getNodesStub: sinon.SinonStub;

        beforeEach(async () => {
            mySandBox.restore();
            logSpy = mySandBox.stub(VSCodeBlockchainOutputAdapter.instance(), 'log');

            peerNode = FabricNode.newPeer('peer0.org1.example.com', 'peer0.org1.example.com', 'grpc://localhost:7051', 'local_fabric_wallet', 'admin', 'Org1MSP');
            anotherPeerNode = FabricNode.newPeer('peer1.org1.example.com', 'peer1.org1.example.com', 'grpc://localhost:7051', 'local_fabric_wallet', 'admin', 'Org1MSP');
            morePeerNode = FabricNode.newPeer('peer2.org1.example.com', 'peer2.org1.example.com', 'grpc://localhost:7051', 'local_fabric_wallet', 'admin', 'Org1MSP');

            environmentRegistryEntry = new FabricEnvironmentRegistryEntry();
            environmentRegistryEntry.name = 'myEnvironment';

            await FabricEnvironmentRegistry.instance().clear();
            await FabricEnvironmentRegistry.instance().add(environmentRegistryEntry);

            deleteNodeStub = mySandBox.stub(FabricEnvironment.prototype, 'deleteNode').resolves();
            getNodesStub = mySandBox.stub(FabricEnvironment.prototype, 'getNodes').resolves([peerNode, anotherPeerNode, morePeerNode]);
            mySandBox.stub(FabricEnvironmentManager.instance(), 'getEnvironmentRegistryEntry').returns(environmentRegistryEntry);

            executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand');
            executeCommandStub.callThrough();
            executeCommandStub.withArgs(ExtensionCommands.CONNECT_TO_ENVIRONMENT).resolves();
            executeCommandStub.withArgs(ExtensionCommands.DELETE_ENVIRONMENT).resolves();

            showEnvironmentStub = mySandBox.stub(UserInputUtil, 'showFabricEnvironmentQuickPickBox').resolves({ label: environmentRegistryEntry.name, data: environmentRegistryEntry });
            showNodeStub = mySandBox.stub(UserInputUtil, 'showFabricNodeQuickPick').resolves([{ label: peerNode.name, data: peerNode }]);
            showConfirmationWarningMessage = mySandBox.stub(UserInputUtil, 'showConfirmationWarningMessage');
            showConfirmationWarningMessage.withArgs(`This will remove the node(s). Do you want to continue?`).resolves(true);
            showConfirmationWarningMessage.withArgs('This will remove the remaining node(s), and the environment. Do you want to continue?').resolves(true);
        });

        afterEach(() => {
            mySandBox.restore();
        });

        it('should test multiple nodes can be deleted from the command', async () => {

            showNodeStub.resolves([{ label: peerNode.name, data: peerNode }, {label: anotherPeerNode.name, data: anotherPeerNode}]);

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_NODE);

            deleteNodeStub.should.have.been.calledTwice;
            deleteNodeStub.should.have.been.calledWith(peerNode);
            deleteNodeStub.should.have.been.calledWith(anotherPeerNode);

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);

            showConfirmationWarningMessage.should.have.been.calledWith(`This will remove the node(s). Do you want to continue?`);

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.DELETE_ENVIRONMENT);

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `delete node`);
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully deleted nodes`);
        });

        it('should test a node can be deleted from the command', async () => {

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_NODE);

            deleteNodeStub.should.have.been.calledWith(peerNode);

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);

            showConfirmationWarningMessage.should.have.been.calledWith(`This will remove the node(s). Do you want to continue?`);

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.DELETE_ENVIRONMENT);

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `delete node`);
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully deleted node ${peerNode.name}`);
        });

        it('should test a node can be deleted from tree', async () => {
            const blockchainEnvironmentExplorerProvider: BlockchainEnvironmentExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();
            const treeItem: PeerTreeItem = new PeerTreeItem(blockchainEnvironmentExplorerProvider, peerNode.name, peerNode.name, environmentRegistryEntry, peerNode);

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_NODE, treeItem);

            deleteNodeStub.should.have.been.calledWith(peerNode);

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);

            showConfirmationWarningMessage.should.have.been.calledWith(`This will remove the node(s). Do you want to continue?`);

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.DELETE_ENVIRONMENT);

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `delete node`);
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully deleted node ${peerNode.name}`);
        });

        it('should test the connect is not called if connected to a different environment from one deleting from', async () => {

            const anotherEnvironmentRegistryEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
            anotherEnvironmentRegistryEntry.name = 'another environment';

            showEnvironmentStub.resolves({ label: anotherEnvironmentRegistryEntry.name, data: anotherEnvironmentRegistryEntry });

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_NODE);

            deleteNodeStub.should.have.been.calledWith(peerNode);

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT);

            showConfirmationWarningMessage.should.have.been.calledWith(`This will remove the node(s). Do you want to continue?`);

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.DELETE_ENVIRONMENT);

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `delete node`);
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully deleted node ${peerNode.name}`);
        });

        it('should warn will delete environment when all nodes would be deleted and delete nodes and environment', async () => {

            getNodesStub.resolves([peerNode]);

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_NODE);

            deleteNodeStub.should.have.been.calledWith(peerNode);

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);

            showConfirmationWarningMessage.should.have.been.calledWith(`This will remove the remaining node(s), and the environment. Do you want to continue?`);

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.DELETE_ENVIRONMENT);

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `delete node`);
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully deleted node ${peerNode.name}`);
        });

        it('should warn will delete environment when all nodes will be deleted and not delete nodes or environment', async () => {
            getNodesStub.resolves([peerNode]);
            showConfirmationWarningMessage.withArgs(`This will remove the remaining node(s), and the environment. Do you want to continue?`).resolves();

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_NODE);

            deleteNodeStub.should.not.have.been.called;

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);

            showConfirmationWarningMessage.should.have.been.calledWith(`This will remove the remaining node(s), and the environment. Do you want to continue?`);

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.DELETE_ENVIRONMENT);

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `delete node`);
        });

        it('should test can be cancelled when choosing environment', async () => {
            showEnvironmentStub.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_NODE);

            deleteNodeStub.should.not.have.been.called;

            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `delete node`);
        });

        it('should test can be cancelled when choosing node', async () => {
            showNodeStub.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_NODE);

            deleteNodeStub.should.not.have.been.called;

            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `delete node`);
        });

        it('should test get error if no environments', async () => {
            await FabricEnvironmentRegistry.instance().clear();

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_NODE);

            deleteNodeStub.should.not.have.been.called;

            logSpy.should.have.been.calledWithExactly(LogType.INFO, undefined, `delete node`);
            logSpy.should.have.been.calledWithExactly(LogType.ERROR,  `No environments to choose from. Nodes from ${FabricRuntimeUtil.LOCAL_FABRIC} cannot be deleted.`);
        });

        it('should test can handle selecting no nodes when choosing node', async () => {
            showNodeStub.resolves([]);

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_NODE);

            deleteNodeStub.should.not.have.been.called;

            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `delete node`);
        });

        it('should test the not deleted if you not sure', async () => {
            showConfirmationWarningMessage.withArgs('This will remove the node(s). Do you want to continue?').resolves();

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_NODE);

            deleteNodeStub.should.not.have.been.called;

            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `delete node`);
        });

        it('should handle error', async () => {
            const error: Error = new Error('some error');

            deleteNodeStub.rejects(error);
            await vscode.commands.executeCommand(ExtensionCommands.DELETE_NODE);

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `delete node`);
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.ERROR, `Error deleting node: ${error.message}`, `Error deleting node: ${error.toString()}`);
        });
    });
});
