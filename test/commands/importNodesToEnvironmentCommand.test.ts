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
import * as path from 'path';
import * as fs from 'fs-extra';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { TestUtil } from '../TestUtil';
import { UserInputUtil } from '../../extension/commands/UserInputUtil';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../../extension/logging/OutputAdapter';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricEnvironment } from '../../extension/fabric/FabricEnvironment';
import { FabricEnvironmentRegistryEntry } from '../../extension/fabric/FabricEnvironmentRegistryEntry';

// tslint:disable no-unused-expression
chai.should();
chai.use(sinonChai);

describe('ImportNodesToEnvironmentCommand', () => {
    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();
    let logSpy: sinon.SinonSpy;
    let browseStub: sinon.SinonStub;
    let ensureDirStub: sinon.SinonStub;
    let executeCommandStub: sinon.SinonStub;
    let addMoreStub: sinon.SinonStub;
    let updateNodeStub: sinon.SinonStub;
    let readJsonStub: sinon.SinonStub;
    let getNodesStub: sinon.SinonStub;
    let environmentRegistryEntry: FabricEnvironmentRegistryEntry;
    let showEnvironmentQuickPickStub: sinon.SinonStub;

    before(async () => {
        await TestUtil.setupTests(mySandBox);
    });

    after(async () => {
        await TestUtil.restoreAll();
    });

    describe('importNodeaToEnvironment', () => {

        beforeEach(async () => {

            logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
            browseStub = mySandBox.stub(UserInputUtil, 'browse');
            addMoreStub = mySandBox.stub(UserInputUtil, 'addMoreNodes').resolves(UserInputUtil.DONE_ADDING_NODES);
            ensureDirStub = mySandBox.stub(fs, 'ensureDir').resolves();

            executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand').callThrough();
            executeCommandStub.withArgs(ExtensionCommands.CONNECT_TO_ENVIRONMENT).resolves();
            updateNodeStub = mySandBox.stub(FabricEnvironment.prototype, 'updateNode').resolves();
            getNodesStub = mySandBox.stub(FabricEnvironment.prototype, 'getNodes').onFirstCall().resolves([]);
            getNodesStub.onSecondCall().resolves([{
                short_name: 'peer0.org1.example.com',
                name: 'peer0.org1.example.com',
                api_url: 'grpc://localhost:17051',
                chaincode_url: 'grpc://localhost:17052',
                type: 'fabric-peer',
                wallet: 'local_fabric_wallet',
                identity: 'admin',
                msp_id: 'Org1MSP',
                container_name: 'fabricvscodelocalfabric_peer0.org1.example.com'
            }]);

            readJsonStub = mySandBox.stub(fs, 'readJson').resolves({
                short_name: 'peer0.org1.example.com',
                name: 'peer0.org1.example.com',
                api_url: 'grpc://localhost:17051',
                chaincode_url: 'grpc://localhost:17052',
                type: 'fabric-peer',
                wallet: 'local_fabric_wallet',
                identity: 'admin',
                msp_id: 'Org1MSP',
                container_name: 'fabricvscodelocalfabric_peer0.org1.example.com'
            });

            environmentRegistryEntry = new FabricEnvironmentRegistryEntry();
            environmentRegistryEntry.name = 'myEnvironment';
            environmentRegistryEntry.managedRuntime = false;
            showEnvironmentQuickPickStub = mySandBox.stub(UserInputUtil, 'showFabricEnvironmentQuickPickBox').resolves({ label: environmentRegistryEntry.name, data: environmentRegistryEntry });
        });

        afterEach(async () => {
            mySandBox.restore();
        });

        it('should test nodes can be added', async () => {
            const uri: vscode.Uri = vscode.Uri.file(path.join('myPath'));
            browseStub.onFirstCall().resolves([uri]);

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT);

            ensureDirStub.should.have.been.calledOnce;
            updateNodeStub.should.have.been.calledOnce;
            getNodesStub.should.have.been.calledTwice;

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully imported all node files');
        });

        it('should test nodes can be added with environment chosen', async () => {
            const uri: vscode.Uri = vscode.Uri.file(path.join('myPath'));
            browseStub.onFirstCall().resolves([uri]);

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, environmentRegistryEntry);

            ensureDirStub.should.have.been.calledOnce;
            updateNodeStub.should.have.been.calledOnce;
            getNodesStub.should.have.been.calledTwice;

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully imported all node files');
        });

        it('should test nodes can be added from adding an environment', async () => {
            const uri: vscode.Uri = vscode.Uri.file(path.join('myPath'));
            browseStub.onFirstCall().resolves([uri]);

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, environmentRegistryEntry, true);

            ensureDirStub.should.have.been.calledOnce;
            updateNodeStub.should.have.been.calledOnce;
            getNodesStub.should.have.been.calledTwice;

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully imported all node files');
        });

        it('should nodes can be imported when node contains multiple definitions', async () => {
            readJsonStub.resolves([{
                short_name: 'peer0.org1.example.com',
                name: 'peer0.org1.example.com',
                api_url: 'grpc://localhost:17051',
                chaincode_url: 'grpc://localhost:17052',
                type: 'fabric-peer',
                wallet: 'local_fabric_wallet',
                identity: 'admin',
                msp_id: 'Org1MSP',
                container_name: 'fabricvscodelocalfabric_peer0.org1.example.com'
            },
            {
                short_name: 'ca.org1.example.com',
                name: 'ca.org1.example.com',
                api_url: 'http://localhost:17054',
                type: 'fabric-ca',
                ca_name: 'ca.org1.example.com',
                wallet: 'local_fabric_wallet',
                identity: 'admin',
                msp_id: 'Org1MSP',
                container_name: 'fabricvscodelocalfabric_ca.org1.example.com'
            }
            ]);

            const uri: vscode.Uri = vscode.Uri.file(path.join('myPath'));
            browseStub.onFirstCall().resolves([uri]);

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT);

            ensureDirStub.should.have.been.calledOnce;
            updateNodeStub.should.have.been.calledTwice;
            getNodesStub.should.have.been.calledTwice;

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully imported all node files');
        });

        it('should handle when first node contains error', async () => {
            readJsonStub.resolves([{
                short_name: 'peer0.org1.example.com',
                api_url: 'grpc://localhost:17051',
                chaincode_url: 'grpc://localhost:17052',
                type: 'fabric-peer',
                wallet: 'local_fabric_wallet',
                identity: 'admin',
                msp_id: 'Org1MSP',
                container_name: 'fabricvscodelocalfabric_peer0.org1.example.com'
            },
            {
                short_name: 'ca.org1.example.com',
                name: 'peer0.org1.example.com',
                api_url: 'http://localhost:17054',
                type: 'fabric-ca',
                ca_name: 'ca.org1.example.com',
                wallet: 'local_fabric_wallet',
                identity: 'admin',
                msp_id: 'Org1MSP',
                container_name: 'fabricvscodelocalfabric_ca.org1.example.com'
            }
            ]);

            const uri: vscode.Uri = vscode.Uri.file(path.join('myPath'));
            browseStub.onFirstCall().resolves([uri]);

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT);

            ensureDirStub.should.have.been.calledOnce;
            updateNodeStub.should.have.been.calledOnce;
            getNodesStub.should.have.been.calledTwice;

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);

            const error: Error = new Error('A node should have a name property');

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Error importing node from file ${uri.fsPath}: ${error.message}`, `Error importing node from file ${uri.fsPath}: ${error.toString()}`);
            logSpy.getCall(2).should.have.been.calledWith(LogType.WARNING, 'Finished importing nodes but some nodes could not be added');
        });

        it('should nodes can be imported in muliple goes', async () => {
            let uri: vscode.Uri = vscode.Uri.file(path.join('myPath'));
            browseStub.onFirstCall().resolves([uri]);

            uri = vscode.Uri.file(path.join('myPathTwo'));
            browseStub.onSecondCall().resolves([uri]);

            addMoreStub.onFirstCall().resolves(UserInputUtil.ADD_MORE_NODES);
            addMoreStub.onSecondCall().resolves(UserInputUtil.DONE_ADDING_NODES);

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT);

            ensureDirStub.should.have.been.calledOnce;
            updateNodeStub.should.have.been.calledTwice;
            getNodesStub.should.have.been.calledTwice;

            addMoreStub.should.have.been.calledTwice;

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully imported all node files');

        });

        it('should test importing nodes can be cancelled when choosing environment', async () => {
            showEnvironmentQuickPickStub.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT);

            updateNodeStub.should.not.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
        });

        it('should test importing nodes can be cancelled when giving node files', async () => {
            const uri: vscode.Uri = vscode.Uri.file(path.join('myPath'));
            browseStub.onFirstCall().resolves([uri]);

            addMoreStub.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT);

            browseStub.should.have.been.calledOnce;
            addMoreStub.should.have.been.calledOnce;
            updateNodeStub.should.not.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
        });

        it('should test importing nodes can be cancelled when choosing to add more', async () => {
            browseStub.onFirstCall().resolves();

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT);

            browseStub.should.have.been.calledOnce;
            updateNodeStub.should.not.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
        });

        it('should test importing nodes can be cancelled from adding an environment', async () => {
            browseStub.onFirstCall().resolves();

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, environmentRegistryEntry, true);

            browseStub.should.have.been.calledOnce;
            updateNodeStub.should.not.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
        });

        it('should handle errors when importing nodes', async () => {
            const uri: vscode.Uri = vscode.Uri.file(path.join('myPathOne'));
            browseStub.onFirstCall().resolves([uri]);

            addMoreStub.resolves(UserInputUtil.DONE_ADDING_NODES);

            const error: Error = new Error('some error');
            ensureDirStub.rejects(error);

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT);

            logSpy.should.have.been.calledTwice;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Error importing node files: ${error.message}`, `Error importing node files: ${error.toString()}`);
        });

        it('should handle errors when reading json file nodes', async () => {
            const uri: vscode.Uri = vscode.Uri.file(path.join('myPathOne'));
            browseStub.onFirstCall().resolves([uri]);

            addMoreStub.resolves(UserInputUtil.DONE_ADDING_NODES);

            const error: Error = new Error('some error');
            readJsonStub.rejects(error);

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT);

            logSpy.should.have.been.calledThrice;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Error importing node file ${uri.fsPath}: ${error.message}`, `Error importing node file ${uri.fsPath}: ${error.toString()}`);
            logSpy.getCall(2).should.have.been.calledWith(LogType.WARNING, 'Finished importing nodes but some nodes could not be added');
        });

        it('should handle errors when copying node files', async () => {
            const uriOne: vscode.Uri = vscode.Uri.file(path.join('myPathOne'));
            const uriTwo: vscode.Uri = vscode.Uri.file(path.join('myPathTwo'));
            browseStub.onFirstCall().resolves([uriOne, uriTwo]);

            const error: Error = new Error('some error');
            updateNodeStub.onFirstCall().rejects(error);

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT);

            logSpy.should.have.been.calledThrice;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Error importing node peer0.org1.example.com from file ${uriOne.fsPath}: ${error.message}`, `Error importing node peer0.org1.example.com from file ${uriOne.fsPath}: ${error.toString()}`);
            logSpy.getCall(2).should.have.been.calledWith(LogType.WARNING, 'Finished importing nodes but some nodes could not be added');
        });

        it('should error if a node with the same name already exists', async () => {
            getNodesStub.onFirstCall().resolves([{
                short_name: 'peer0.org1.example.com',
                name: 'peer0.org1.example.com',
                api_url: 'grpc://localhost:17051',
                chaincode_url: 'grpc://localhost:17052',
                type: 'fabric-peer',
                wallet: 'local_fabric_wallet',
                identity: 'admin',
                msp_id: 'Org1MSP',
                container_name: 'fabricvscodelocalfabric_peer0.org1.example.com'
            }]);

            const error: Error = new Error(`Node with name peer0.org1.example.com already exists`);
            const error1: Error = new Error('no nodes were added');

            const uri: vscode.Uri = vscode.Uri.file(path.join('myPathOne'));
            browseStub.resolves([uri]);

            addMoreStub.resolves(UserInputUtil.DONE_ADDING_NODES);

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT);

            ensureDirStub.should.have.been.calledOnce;
            updateNodeStub.should.not.have.been.called;
            getNodesStub.should.have.been.calledTwice;

            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Error importing node peer0.org1.example.com from file ${uri.fsPath}: ${error.message}`, `Error importing node peer0.org1.example.com from file ${uri.fsPath}: ${error.toString()}`);
            logSpy.getCall(2).should.have.been.calledWith(LogType.ERROR, `Error importing node files: ${error1.message}`, `Error importing node files: ${error1.toString()}`);
        });

        it('should error if a node with the same name already exists when adding environment', async () => {
            getNodesStub.onFirstCall().resolves([{
                short_name: 'peer0.org1.example.com',
                name: 'peer0.org1.example.com',
                api_url: 'grpc://localhost:17051',
                chaincode_url: 'grpc://localhost:17052',
                type: 'fabric-peer',
                wallet: 'local_fabric_wallet',
                identity: 'admin',
                msp_id: 'Org1MSP',
                container_name: 'fabricvscodelocalfabric_peer0.org1.example.com'
            }]);

            const error: Error = new Error(`Node with name peer0.org1.example.com already exists`);
            const error1: Error = new Error('no nodes were added');

            const uri: vscode.Uri = vscode.Uri.file(path.join('myPathOne'));
            browseStub.resolves([uri]);

            addMoreStub.resolves(UserInputUtil.DONE_ADDING_NODES);

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, undefined, true).should.eventually.be.rejectedWith('no nodes were added');

            ensureDirStub.should.have.been.calledOnce;
            updateNodeStub.should.not.have.been.called;
            getNodesStub.should.have.been.calledTwice;

            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Error importing node peer0.org1.example.com from file ${uri.fsPath}: ${error.message}`, `Error importing node peer0.org1.example.com from file ${uri.fsPath}: ${error.toString()}`);
            logSpy.getCall(2).should.have.been.calledWith(LogType.ERROR, `Error importing node files: ${error1.message}`, `Error importing node files: ${error1.toString()}`);
        });

        it('should import nodes but warn if nodes are not valid', async () => {
            readJsonStub.resolves([{
                short_name: 'peer0.org1.example.com',
                name: 'peer0.org1.example.com',
                api_url: 'grpc://localhost:17051',
                chaincode_url: 'grpc://localhost:17052',
                type: 'fabric-peer',
                wallet: 'local_fabric_wallet',
                identity: 'admin',
                msp_id: 'Org1MSP',
                container_name: 'fabricvscodelocalfabric_peer0.org1.example.com'
            },
            {
                short_name: 'invalid',
                api_url: 'grpc://localhost:17051',
                chaincode_url: 'grpc://localhost:17052',
                type: 'fabric-peer',
                wallet: 'local_fabric_wallet',
                identity: 'admin',
                msp_id: 'Org1MSP',
                container_name: 'fabricvscodelocalfabric_peer0.org1.example.com'
            }]);

            const uri: vscode.Uri = vscode.Uri.file(path.join('myPath'));
            browseStub.onFirstCall().resolves([uri]);

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT);

            ensureDirStub.should.have.been.calledOnce;
            updateNodeStub.should.have.been.calledOnce;
            getNodesStub.should.have.been.calledTwice;

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.should.have.been.calledWith(LogType.ERROR, `Error importing node from file ${uri.fsPath}: A node should have a name property`, `Error importing node from file ${uri.fsPath}: Error: A node should have a name property`);
            logSpy.should.have.been.calledWith(LogType.WARNING, 'Finished importing nodes but some nodes could not be added');
        });
    });
});
