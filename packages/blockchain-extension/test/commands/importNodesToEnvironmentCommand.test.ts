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
import Axios from 'axios';
import { TestUtil } from '../TestUtil';
import { UserInputUtil } from '../../extension/commands/UserInputUtil';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../../extension/logging/OutputAdapter';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricEnvironment } from '../../extension/fabric/FabricEnvironment';
import { FabricEnvironmentRegistryEntry } from '../../extension/registries/FabricEnvironmentRegistryEntry';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';

// tslint:disable no-unused-expression
chai.should();
chai.use(sinonChai);

describe('ImportNodesToEnvironmentCommand', () => {
    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();
    let logSpy: sinon.SinonSpy;
    let browseStub: sinon.SinonStub;
    let ensureDirStub: sinon.SinonStub;
    let removeDirStub: sinon.SinonStub;
    let executeCommandStub: sinon.SinonStub;
    let addMoreStub: sinon.SinonStub;
    let updateNodeStub: sinon.SinonStub;
    let readJsonStub: sinon.SinonStub;
    let getNodesStub: sinon.SinonStub;
    let environmentRegistryEntry: FabricEnvironmentRegistryEntry;
    let showEnvironmentQuickPickStub: sinon.SinonStub;
    let addMethodChooserStub: sinon.SinonStub;
    let showInputBoxStub: sinon.SinonStub;
    let axiosGetStub: sinon.SinonStub;
    let showNodesQuickPickBoxStub: sinon.SinonStub;
    let setPasswordStub: sinon.SinonStub;
    let requireAsarModuleStub: sinon.SinonStub;
    let localFabricNodes: any;
    let opsToolNodes: any;
    let url: string;
    let key: string;

    before(async () => {
        await TestUtil.setupTests(mySandBox);
    });

    describe('importNodesToEnvironment', () => {

        beforeEach(async () => {
            addMethodChooserStub = mySandBox.stub(UserInputUtil, 'showQuickPick').resolves(UserInputUtil.ADD_ENVIRONMENT_FROM_NODES);
            logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
            browseStub = mySandBox.stub(UserInputUtil, 'browse');
            addMoreStub = mySandBox.stub(UserInputUtil, 'addMoreNodes').resolves(UserInputUtil.DONE_ADDING_NODES);
            ensureDirStub = mySandBox.stub(fs, 'ensureDir').resolves();
            removeDirStub = mySandBox.stub(fs, 'remove').resolves();
            showInputBoxStub = mySandBox.stub(UserInputUtil, 'showInputBox');
            axiosGetStub = mySandBox.stub(Axios, 'get');
            executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand').callThrough();
            executeCommandStub.withArgs(ExtensionCommands.CONNECT_TO_ENVIRONMENT).resolves();
            updateNodeStub = mySandBox.stub(FabricEnvironment.prototype, 'updateNode').resolves();
            getNodesStub = mySandBox.stub(FabricEnvironment.prototype, 'getNodes').onFirstCall().resolves([]);
            showNodesQuickPickBoxStub = mySandBox.stub(UserInputUtil, 'showNodesQuickPickBox');
            localFabricNodes = [
                {
                    short_name: 'peer0.org1.example.com',
                    name: 'peer0.org1.example.com',
                    api_url: 'grpc://localhost:17051',
                    chaincode_url: 'grpc://localhost:17052',
                    type: 'fabric-peer',
                    wallet: 'local_fabric_wallet',
                    identity: 'admin',
                    msp_id: 'Org1MSP',
                    container_name: 'fabricvscodelocalfabric_peer0.org1.example.com'
                }
            ];
            getNodesStub.onSecondCall().resolves(localFabricNodes);

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

            // Stubs required for OpsTool
            opsToolNodes = [
                {
                    short_name: 'peer0.org1.example.com',
                    name: 'peer0.org1.example.com',
                    display_name: 'Peer0 Org1',
                    api_url: 'grpcs://someHost:somePort1',
                    type: 'fabric-peer',
                    wallet: 'fabric_wallet',
                    identity: 'admin',
                    msp_id: 'Org1MSP',
                    pem: 'someCertPeer',
                    location: 'some_saas',
                    id: 'peer0rg1',
                    cluster_name: 'someClusterName',
                    hidden: false
                },
                {
                    short_name: 'ca.org1.example.com',
                    name: 'ca.org1.example.com',
                    display_name: 'CA Org1',
                    api_url: 'grpcs://someHost:somePort2',
                    type: 'fabric-ca',
                    wallet: 'fabric_wallet',
                    identity: 'admin',
                    tls_cert: 'someCertCa',
                    location: 'some_saas',
                    ca_name: 'ca.org1.example.com',
                    ssl_target_name_override: 'sslTgtNameOverride'
                }
            ];
            url = 'my/OpsTool/url';
            key = 'myOpsToolKey';
            showInputBoxStub.withArgs('Enter the url of the ops tools you want to connect to').resolves(url);
            showInputBoxStub.withArgs('Enter the api key of the ops tools you want to connect to').resolves(key);
            axiosGetStub.withArgs(`${url}/ak/api/v1/components`, { headers: { Authorization: `Bearer ${key}` }}).resolves({ data: opsToolNodes });
            showNodesQuickPickBoxStub.resolves(opsToolNodes.map((_node: any) => ({ label: _node.display_name, data: _node })));
            setPasswordStub = mySandBox.stub().resolves();
            requireAsarModuleStub = mySandBox.stub(ExtensionUtil, 'getModuleAsar').returns({
                setPassword: setPasswordStub
              });

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
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully imported all nodes');
        });

        it('should test nodes can be added from URL and key', async () => {
            addMethodChooserStub.withArgs('Choose a method to import nodes to an environment', [UserInputUtil.ADD_ENVIRONMENT_FROM_NODES, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS]).resolves(UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);
            showInputBoxStub.withArgs('Enter the url of the ops tools you want to connect to').resolves('someURL');
            showInputBoxStub.withArgs('Enter the api key of the ops tools you want to connect to').resolves('someKey');

            axiosGetStub.withArgs(`someURL/ak/api/v1/components`, { headers: { Authorization: `Bearer someKey` }}).resolves({ data: opsToolNodes });

            getNodesStub.onSecondCall().resolves(opsToolNodes);

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT);

            requireAsarModuleStub.should.have.been.calledOnce;
            ensureDirStub.should.have.been.calledOnce;
            updateNodeStub.should.have.been.calledTwice;
            getNodesStub.should.have.been.calledTwice;

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully imported all nodes');
        });

        it('should handle when user cancels when asked for method to add nodes to environment', async () => {
            addMethodChooserStub.withArgs('Choose a method to import nodes to an environment', [UserInputUtil.ADD_ENVIRONMENT_FROM_NODES, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS]).resolves(undefined);
            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT);

            showInputBoxStub.withArgs('Enter the url of the ops tools you want to connect to').should.not.have.been.called;
            showInputBoxStub.withArgs('Enter the api key of the ops tools you want to connect to').should.not.have.been.called;
            axiosGetStub.should.not.have.been.called;
            ensureDirStub.should.not.have.been.called;
            updateNodeStub.should.not.have.been.called;
            getNodesStub.should.not.have.been.called;
            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'Import nodes to environment');
        });

        it('should handle when user cancels when asked for url', async () => {
            addMethodChooserStub.withArgs('Choose a method to import nodes to an environment', [UserInputUtil.ADD_ENVIRONMENT_FROM_NODES, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS]).resolves(UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);
            showInputBoxStub.withArgs('Enter the url of the ops tools you want to connect to').resolves(undefined);

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT);

            showInputBoxStub.withArgs('Enter the api key of the ops tools you want to connect to').should.not.have.been.called;
            axiosGetStub.should.not.have.been.called;
            ensureDirStub.should.not.have.been.called;
            updateNodeStub.should.not.have.been.called;
            getNodesStub.should.not.have.been.called;
            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'Import nodes to environment');
        });

        it('should handle when user cancels when asked for api key', async () => {
            addMethodChooserStub.withArgs('Choose a method to import nodes to an environment', [UserInputUtil.ADD_ENVIRONMENT_FROM_NODES, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS]).resolves(UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);
            showInputBoxStub.withArgs('Enter the url of the ops tools you want to connect to').resolves('someURL');
            showInputBoxStub.withArgs('Enter the api key of the ops tools you want to connect to').resolves(undefined);

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT);

            axiosGetStub.should.not.have.been.called;
            ensureDirStub.should.not.have.been.called;
            updateNodeStub.should.not.have.been.called;
            getNodesStub.should.not.have.been.called;
            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'Import nodes to environment');
        });

        it('should handle when the keytar module is imported successfully through .asar', async () => {
            addMethodChooserStub.withArgs('Choose a method to import nodes to an environment', [UserInputUtil.ADD_ENVIRONMENT_FROM_NODES, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS]).resolves(UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);
            showInputBoxStub.withArgs('Enter the url of the ops tools you want to connect to').resolves('someURL');
            showInputBoxStub.withArgs('Enter the api key of the ops tools you want to connect to').resolves('someKey');
            const requireModuleSpy: sinon.SinonSpy = mySandBox.spy(ExtensionUtil, 'getModule');

            axiosGetStub.withArgs(`someURL/ak/api/v1/components`, { headers: { Authorization: `Bearer someKey` }}).resolves({ data: opsToolNodes });

            getNodesStub.onSecondCall().resolves(opsToolNodes);

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT);

            ensureDirStub.should.have.been.calledOnce;
            updateNodeStub.should.have.been.calledTwice;
            getNodesStub.should.have.been.calledTwice;
            requireAsarModuleStub.should.have.been.calledOnce;
            requireModuleSpy.should.not.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully imported all nodes');
        });

        it('should handle when the keytar module is imported successfully (without .asar)', async () => {
            addMethodChooserStub.withArgs('Choose a method to import nodes to an environment', [UserInputUtil.ADD_ENVIRONMENT_FROM_NODES, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS]).resolves(UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);
            showInputBoxStub.withArgs('Enter the url of the ops tools you want to connect to').resolves('someURL');
            showInputBoxStub.withArgs('Enter the api key of the ops tools you want to connect to').resolves('someKey');
            const error: Error = new Error('newError');
            requireAsarModuleStub.withArgs('keytar').throws(error);

            const requireModuleStub: sinon.SinonStub = mySandBox.stub(ExtensionUtil, 'getModule').returns({
                setPassword: setPasswordStub
              });

            axiosGetStub.withArgs(`someURL/ak/api/v1/components`, { headers: { Authorization: `Bearer someKey` }}).resolves({ data: opsToolNodes });

            getNodesStub.onSecondCall().resolves(opsToolNodes);

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT);

            ensureDirStub.should.have.been.calledOnce;
            updateNodeStub.should.have.been.calledTwice;
            getNodesStub.should.have.been.calledTwice;
            requireAsarModuleStub.should.have.been.calledOnce;
            requireModuleStub.should.have.been.calledOnce;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully imported all nodes');
        });

        it('should handle when the keytar module cannot be imported at all', async () => {
            addMethodChooserStub.withArgs('Choose a method to import nodes to an environment', [UserInputUtil.ADD_ENVIRONMENT_FROM_NODES, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS]).resolves(UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);
            showInputBoxStub.withArgs('Enter the url of the ops tools you want to connect to').resolves('someURL');
            showInputBoxStub.withArgs('Enter the api key of the ops tools you want to connect to').resolves('someKey');
            const requireModuleStub: sinon.SinonStub = mySandBox.stub(ExtensionUtil, 'getModule');
            const error: Error = new Error('newError');
            requireAsarModuleStub.withArgs('keytar').throws(error);
            requireModuleStub.withArgs('keytar').throws(error);
            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT);

            requireAsarModuleStub.should.have.been.calledOnce;
            requireModuleStub.should.have.been.calledOnce;
            ensureDirStub.should.not.have.been.called;
            updateNodeStub.should.not.have.been.called;
            getNodesStub.should.not.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Error importing nodes: Error importing the keytar module`);
        });

        it('should handle when the api key cannot be stored saved securely onto the keychain using the setPassword function', async () => {
            addMethodChooserStub.withArgs('Choose a method to import nodes to an environment', [UserInputUtil.ADD_ENVIRONMENT_FROM_NODES, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS]).resolves(UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);
            showInputBoxStub.withArgs('Enter the url of the ops tools you want to connect to').resolves('someURL');
            showInputBoxStub.withArgs('Enter the api key of the ops tools you want to connect to').resolves('someKey');
            axiosGetStub.withArgs(`someURL/ak/api/v1/components`, { headers: { Authorization: `Bearer someKey` }}).resolves({ data: opsToolNodes });

            const error: Error = new Error('newError');
            setPasswordStub.throws(error);

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT);

            requireAsarModuleStub.should.have.been.calledOnce;
            ensureDirStub.should.not.have.been.called;
            updateNodeStub.should.not.have.been.called;
            getNodesStub.should.not.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Error importing nodes: Unable to store API key securely in your keychain: ${error.message}`);
        });

        it('should test nodes can be added from URL and key (non TLS network)', async () => {
            addMethodChooserStub.withArgs('Choose a method to import nodes to an environment', [UserInputUtil.ADD_ENVIRONMENT_FROM_NODES, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS]).resolves(UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);
            const uri: vscode.Uri = vscode.Uri.file(path.join('myPath'));
            browseStub.onFirstCall().resolves([uri]);

            axiosGetStub.withArgs(`${url}/ak/api/v1/components`, { headers: { Authorization: `Bearer ${key}` }}).resolves(
                {
                    data:
                    [
                        {
                            short_name: 'peer0.org1.example.com',
                            name: 'peer0.org1.example.com',
                            display_name: 'Peer0 Org1',
                            api_url: 'grpc://someHost:somePort1',
                            type: 'fabric-peer',
                            wallet: 'fabric_wallet',
                            identity: 'admin',
                            msp_id: 'Org1MSP',
                            location: 'some_saas',
                            id: 'peer0rg1',
                            cluster_name: 'someClusterName',
                        },
                        {
                            short_name: 'ca.org1.example.com',
                            name: 'ca.org1.example.com',
                            display_name: 'CA Org1',
                            api_url: 'grpc://someHost:somePort2',
                            type: 'fabric-ca',
                            wallet: 'fabric_wallet',
                            identity: 'admin',
                            location: 'some_saas',
                            ca_name: 'ca.org1.example.com',
                        }
                ]
            });
            getNodesStub.onSecondCall().resolves(opsToolNodes);

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT);

            requireAsarModuleStub.should.have.been.calledOnce;
            ensureDirStub.should.have.been.calledOnce;
            updateNodeStub.should.have.been.calledTwice;
            getNodesStub.should.have.been.calledTwice;

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully imported all nodes');
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
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully imported all nodes');
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
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully imported all nodes');
        });

        it('should test nodes can be imported when node contains multiple definitions', async () => {
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
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully imported all nodes');
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
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Error importing node: ${error.message}`, `Error importing node: ${error.toString()}`);
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
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully imported all nodes');
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
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Error importing nodes: ${error.message}`);
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

        it('should handle error connecting to Ops Tool URL when adding nodes to existing environment', async () => {
            addMethodChooserStub.withArgs('Choose a method to import nodes to an environment', [UserInputUtil.ADD_ENVIRONMENT_FROM_NODES, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS]).resolves(UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);
            const uri: vscode.Uri = vscode.Uri.file(path.join('myPath'));
            browseStub.onFirstCall().resolves([uri]);
            getNodesStub.onSecondCall().resolves([]);
            const connectionError: Error = new Error('some error');
            const executionError: Error = new Error('no nodes were added');
            axiosGetStub.withArgs(`${url}/ak/api/v1/components`, { headers: { Authorization: `Bearer ${key}` }}).rejects(connectionError);

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, undefined, false);

            requireAsarModuleStub.should.have.been.calledOnce;
            ensureDirStub.should.have.been.calledOnce;
            updateNodeStub.should.not.have.been.called;
            getNodesStub.should.have.been.calledTwice;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Failed to acquire nodes from ${url}, with error ${connectionError.message}`, `Failed to acquire nodes from ${url}, with error ${connectionError.toString()}`);
            logSpy.getCall(2).should.have.been.calledWith(LogType.ERROR, `Error importing nodes: ${executionError.message}`);
        });

        it('should handle error connecting to Ops Tool URL when adding nodes via add environment', async () => {
            addMethodChooserStub.withArgs('Choose a method to import nodes to an environment', [UserInputUtil.ADD_ENVIRONMENT_FROM_NODES, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS]).resolves(UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);
            const uri: vscode.Uri = vscode.Uri.file(path.join('myPath'));
            browseStub.onFirstCall().resolves([uri]);
            const error: Error = new Error('some error');
            axiosGetStub.withArgs(`${url}/ak/api/v1/components`, { headers: { Authorization: `Bearer ${key}` }}).rejects(error);

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, undefined, true).should.eventually.be.rejectedWith(error);

            requireAsarModuleStub.should.have.been.calledOnce;
            ensureDirStub.should.not.have.been.called;
            updateNodeStub.should.not.have.been.called;
            getNodesStub.should.not.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Failed to acquire nodes from ${url}, with error ${error.message}`, `Failed to acquire nodes from ${url}, with error ${error.toString()}`);
            logSpy.getCall(2).should.have.been.calledWith(LogType.ERROR, `Error importing nodes: ${error.message}`);
        });

        it('should handle user not choosing any nodes from Ops Tool', async () => {
            const uri: vscode.Uri = vscode.Uri.file(path.join('myPath'));
            browseStub.onFirstCall().resolves([uri]);
            showNodesQuickPickBoxStub.resolves([]);
            addMethodChooserStub.withArgs('Choose a method to import nodes to an environment').resolves(UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, undefined, true);

            ensureDirStub.should.not.have.been.called;
            updateNodeStub.should.not.have.been.called;
            getNodesStub.should.not.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS, 'Successfully imported all nodes');
        });

        it('should handle user choosing a subset of nodes from Ops Tool', async () => {
            const uri: vscode.Uri = vscode.Uri.file(path.join('myPath'));
            browseStub.onFirstCall().resolves([uri]);
            showNodesQuickPickBoxStub.resolves({ label: opsToolNodes[0].display_name, data: opsToolNodes[0] });
            addMethodChooserStub.withArgs('Choose a method to import nodes to an environment').resolves(UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);

            axiosGetStub.withArgs(`someURL/ak/api/v1/components`, { headers: { Authorization: `Bearer someKey` }}).resolves({ data: opsToolNodes });

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, undefined, true);

            requireAsarModuleStub.should.have.been.calledOnce;
            ensureDirStub.should.have.been.called;
            updateNodeStub.should.have.been.called;
            getNodesStub.should.have.been.calledTwice;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully imported all nodes');
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
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Error importing node peer0.org1.example.com: ${error.message}`, `Error importing node peer0.org1.example.com: ${error.toString()}`);
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

            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Error importing node peer0.org1.example.com: ${error.message}`, `Error importing node peer0.org1.example.com: ${error.toString()}`);
            logSpy.getCall(2).should.have.been.calledWith(LogType.ERROR, `Error importing nodes: ${error1.message}`);
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

            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Error importing node peer0.org1.example.com: ${error.message}`, `Error importing node peer0.org1.example.com: ${error.toString()}`);
            logSpy.getCall(2).should.have.been.calledWith(LogType.ERROR, `Error importing nodes: ${error1.message}`);
        });

        it('should error if no nodes exist in environment', async () => {
            getNodesStub.resetBehavior();
            getNodesStub.resolves([]);

            const error: Error = new Error(`some error`);
            const error1: Error = new Error('no nodes were added');

            const uri: vscode.Uri = vscode.Uri.file(path.join('myPathOne'));
            browseStub.resolves([uri]);

            addMoreStub.resolves(UserInputUtil.DONE_ADDING_NODES);

            updateNodeStub.rejects(error);

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, undefined, false);

            ensureDirStub.should.have.been.calledOnce;
            updateNodeStub.should.have.been.calledOnce;
            getNodesStub.should.have.been.calledTwice;
            removeDirStub.should.have.been.called;

            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Error importing node peer0.org1.example.com: ${error.message}`, `Error importing node peer0.org1.example.com: ${error.toString()}`);
            logSpy.getCall(2).should.have.been.calledWith(LogType.ERROR, `Error importing nodes: ${error1.message}`);
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
            logSpy.should.have.been.calledWith(LogType.ERROR, `Error importing node: A node should have a name property`, `Error importing node: Error: A node should have a name property`);
            logSpy.should.have.been.calledWith(LogType.WARNING, 'Finished importing nodes but some nodes could not be added');
        });
    });
});
