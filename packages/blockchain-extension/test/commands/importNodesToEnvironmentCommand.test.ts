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
import {TestUtil} from '../TestUtil';
import { UserInputUtil, EnvironmentType } from '../../extension/commands/UserInputUtil';
import {VSCodeBlockchainOutputAdapter} from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import {ExtensionCommands} from '../../ExtensionCommands';
import {FabricEnvironmentRegistryEntry, LogType, FabricEnvironment} from 'ibm-blockchain-platform-common';
import {FabricEnvironmentManager} from '../../extension/fabric/environments/FabricEnvironmentManager';
import {ExtensionUtil} from '../../extension/util/ExtensionUtil';
import { ModuleUtil } from '../../extension/util/ModuleUtil';

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
    let OpsToolRegistryEntry: FabricEnvironmentRegistryEntry;
    let showEnvironmentQuickPickStub: sinon.SinonStub;
    let axiosGetStub: sinon.SinonStub;
    let showNodesQuickPickBoxStub: sinon.SinonStub;
    let getPasswordStub: sinon.SinonStub;
    let getCoreNodeModuleStub: sinon.SinonStub;
    let readFileStub: sinon.SinonStub;
    let fsPathExistsStub: sinon.SinonStub;
    let fsReaddirStub: sinon.SinonStub;
    let localFabricNodes: any;
    let opsToolNodes: any;
    let url: string;
    let key: string;
    let secret: string;
    let certVerificationError: any;
    let caCertChainUri: vscode.Uri;
    let localFabricNodes: any;
    let getConnectedEnvironmentRegistryEntry: sinon.SinonStub;

    before(async () => {
        await TestUtil.setupTests(mySandBox);
    });

    describe('importNodesToEnvironment', () => {

        beforeEach(async () => {
            logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
            browseStub = mySandBox.stub(UserInputUtil, 'browse');
            addMoreStub = mySandBox.stub(UserInputUtil, 'addMoreNodes').resolves(UserInputUtil.DONE_ADDING_NODES);
            ensureDirStub = mySandBox.stub(fs, 'ensureDir').resolves();

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
                    wallet: 'Org1',
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
                wallet: 'Org1',
                identity: 'admin',
                msp_id: 'Org1MSP',
                container_name: 'fabricvscodelocalfabric_peer0.org1.example.com'
            });

            environmentRegistryEntry = new FabricEnvironmentRegistryEntry();
            environmentRegistryEntry.name = 'myEnvironment';
            environmentRegistryEntry.managedRuntime = false;
            showEnvironmentQuickPickStub = mySandBox.stub(UserInputUtil, 'showFabricEnvironmentQuickPickBox').resolves({
                label: environmentRegistryEntry.name,
                data: environmentRegistryEntry
            });

            // Stubs required for OpsTool
            url = 'my/OpsTool/url';
            key = 'myOpsToolKey';
            secret = 'myOpsToolSecret';
            OpsToolRegistryEntry = new FabricEnvironmentRegistryEntry();
            OpsToolRegistryEntry.name = 'myOpsToolInstance';
            OpsToolRegistryEntry.url = url;
            OpsToolRegistryEntry.managedRuntime = false;
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

            fsPathExistsStub = mySandBox.stub(fs, 'pathExists');
            fsPathExistsStub.resolves(true);
            caCertChainUri = vscode.Uri.file(path.join('myCaCert.pem'));
            fsReaddirStub = mySandBox.stub(fs, 'readdir');
            fsReaddirStub.resolves([caCertChainUri.fsPath]);
            readFileStub = mySandBox.stub(fs, 'readFile');
            readFileStub.resolves('-----BEGIN CERTIFICATE-----\nsomeInfo\n-----END CERTIFICATE-----');

            certVerificationError = new Error('Certificate Verification Error');
            certVerificationError.code = 'DEPTH_ZERO_SELF_SIGNED_CERT';
            axiosGetStub.onFirstCall().rejects(certVerificationError);
            axiosGetStub.onSecondCall().resolves({data: opsToolNodes});
            showNodesQuickPickBoxStub.resolves(opsToolNodes.map((_node: any) => ({ label: _node.display_name, data: _node })));
            getPasswordStub = mySandBox.stub().resolves(`${key}:${secret}`);
            getCoreNodeModuleStub = mySandBox.stub(ModuleUtil, 'getCoreNodeModule').returns({
                getPassword: getPasswordStub
            });

            showEnvironmentQuickPickStub = mySandBox.stub(UserInputUtil, 'showFabricEnvironmentQuickPickBox').returns({
                label: environmentRegistryEntry.name,
                data: environmentRegistryEntry
            });
            getConnectedEnvironmentRegistryEntry = mySandBox.stub(FabricEnvironmentManager.instance(), 'getEnvironmentRegistryEntry').returns(undefined);
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
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully imported all nodes');
        });

        it('should test nodes can be added to a new OpsTool instance', async () => {
            getNodesStub.onSecondCall().resolves(opsToolNodes);

            await vscode.commands.executeCommand(ExtensionCommands.EDIT_NODE_FILTERS, OpsToolRegistryEntry, true, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);

            getCoreNodeModuleStub.should.have.been.calledOnce;
            ensureDirStub.should.have.been.calledOnce;
            updateNodeStub.should.have.been.calledTwice;
            getNodesStub.should.have.been.calledTwice;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully filtered all nodes');
        });

        // Update this test when doing issue for filtering nodes
        it('should test nodes can be filtered for an existing OpsTool environment from command palette', async () => {
            showEnvironmentQuickPickStub.resolves({ label: OpsToolRegistryEntry.name, data: OpsToolRegistryEntry });

            await vscode.commands.executeCommand(ExtensionCommands.EDIT_NODE_FILTERS, undefined, false, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);

            getCoreNodeModuleStub.should.have.been.calledOnce;
            ensureDirStub.should.have.been.calledOnce;
            updateNodeStub.should.have.been.calledTwice;
            getNodesStub.should.have.been.calledTwice;
            showEnvironmentQuickPickStub.should.have.been.calledWith('Choose an OpsTool environment to filter nodes', false, true, false, EnvironmentType.OPSTOOLSENV);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, OpsToolRegistryEntry);
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully filtered all nodes');
        });

        it('should test nodes can be added to an existing OpsTool environment', async () => {
            getNodesStub.onSecondCall().resolves(opsToolNodes);

            await vscode.commands.executeCommand(ExtensionCommands.EDIT_NODE_FILTERS, OpsToolRegistryEntry, false);

            getCoreNodeModuleStub.should.have.been.calledOnce;
            ensureDirStub.should.have.been.calledOnce;
            updateNodeStub.should.have.been.calledTwice;
            getNodesStub.should.have.been.calledTwice;
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, OpsToolRegistryEntry);
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully filtered all nodes');
        });

        it('should test nodes can be added to an existing OpsTool environment (on windows)', async () => {
            mySandBox.stub(process, 'platform').value('win32');
            getNodesStub.onSecondCall().resolves(opsToolNodes);

            await vscode.commands.executeCommand(ExtensionCommands.EDIT_NODE_FILTERS, OpsToolRegistryEntry, false);

            getCoreNodeModuleStub.should.have.been.calledOnce;
            ensureDirStub.should.have.been.calledOnce;
            updateNodeStub.should.have.been.calledTwice;
            getNodesStub.should.have.been.calledTwice;
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, OpsToolRegistryEntry);
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully filtered all nodes');
        });

        it('should handle when the keytar module cannot be imported at all when creating a new OpsTool instance', async () => {
            getCoreNodeModuleStub.returns(undefined);

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, OpsToolRegistryEntry, true, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS).should.be.rejectedWith('Error importing the keytar module');

            getCoreNodeModuleStub.should.have.been.calledOnce;
            ensureDirStub.should.have.not.been.called;
            updateNodeStub.should.not.have.been.called;
            getNodesStub.should.have.been.calledOnce;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Error filtering nodes: Error importing the keytar module`);
            });

        it('should handle when the api key and secret cannot be retrieved when creating new OpsTool instance', async () => {
            const error: Error = new Error('newError');
            getPasswordStub.throws(error);

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, OpsToolRegistryEntry, true, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS).should.be.rejectedWith(error.message);

            getCoreNodeModuleStub.should.have.been.calledOnce;
            ensureDirStub.should.have.not.been.called;
            updateNodeStub.should.not.have.been.called;
            getNodesStub.should.have.been.calledOnce;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Failed to acquire nodes from ${url}, with error ${error.message}`, `Failed to acquire nodes from ${url}, with error ${error.toString()}`);
        });

        it('should handle when the api key/secret stored have the wrong number of entries (separated by ":") when edditing filters on existing OpsTool instance', async () => {
            getPasswordStub.resolves(`${key}:${secret}:someMoreInfo`);
            const error: Error = new Error('Unable to retrieve the stored credentials');

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, OpsToolRegistryEntry, false, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);

            getCoreNodeModuleStub.should.have.been.calledOnce;
            ensureDirStub.should.have.not.been.called;
            updateNodeStub.should.not.have.been.called;
            getNodesStub.should.have.been.calledOnce;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Failed to acquire nodes from ${url}, with error ${error.message}`, `Failed to acquire nodes from ${url}, with error ${error.toString()}`);
            logSpy.getCall(2).should.have.been.calledWith(LogType.ERROR, `Error filtering nodes: ${error.message}`);

        });

        it('should test nodes can be added from URL and key (non TLS network) when adding a new OpsTool instance', async () => {
            const uri: vscode.Uri = vscode.Uri.file(path.join('myPath'));
            browseStub.onSecondCall().resolves([uri]);

            axiosGetStub.resolves(
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

            await vscode.commands.executeCommand(ExtensionCommands.EDIT_NODE_FILTERS, OpsToolRegistryEntry, true, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);

            getCoreNodeModuleStub.should.have.been.calledOnce;
            ensureDirStub.should.have.been.calledOnce;
            updateNodeStub.should.have.been.calledTwice;
            getNodesStub.should.have.been.calledTwice;

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully filtered all nodes');
        });

        it('should handle no certificate verification on a new Ops Tool instance', async () => {
            // when creating a new environment from ops tools, if a certificate was not provided the environment folder will not exist.
            fsPathExistsStub.resolves(false);

            await vscode.commands.executeCommand(ExtensionCommands.EDIT_NODE_FILTERS, OpsToolRegistryEntry, true, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);

            readFileStub.withArgs(caCertChainUri.fsPath, 'utf8').should.have.not.been.called;
            ensureDirStub.should.have.been.calledOnce;
            updateNodeStub.should.have.been.calledTwice;
            getNodesStub.should.have.been.calledTwice;
            readFileStub.should.have.not.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully filtered all nodes');
        });

        it('should handle no certificate verification on an existing Ops Tool instance', async () => {
            // when editing filters on an existing environment from ops tools, if a certificate was not provided the environment folder will exist, but no certificate will be present.
            fsReaddirStub.resolves([]);

            await vscode.commands.executeCommand(ExtensionCommands.EDIT_NODE_FILTERS, OpsToolRegistryEntry, false, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);

            readFileStub.should.have.not.been.called;
            ensureDirStub.should.have.been.calledOnce;
            updateNodeStub.should.have.been.calledTwice;
            getNodesStub.should.have.been.calledTwice;
            readFileStub.should.have.not.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully filtered all nodes');
        });

        it('should throw error when multiple certificates present when editing filters on an existing Ops Tool instance', async () => {
            const environment: FabricEnvironment = new FabricEnvironment(OpsToolRegistryEntry.name);
            const environmentBaseDir: string = path.resolve(environment.getPath());
            fsReaddirStub.resolves(['myCaCert.pem', 'myCaCert2.pem']);
            const expectedError: Error = new Error(`Unable to connect: There are multiple certificates in ${environmentBaseDir}`);

            await vscode.commands.executeCommand(ExtensionCommands.EDIT_NODE_FILTERS, OpsToolRegistryEntry, false, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);

            readFileStub.should.have.not.been.called;
            ensureDirStub.should.have.not.been.called;
            updateNodeStub.should.have.not.been.called;
            getNodesStub.should.have.been.calledOnce;
            readFileStub.should.have.not.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Failed to acquire nodes from ${url}, with error ${expectedError.message}`, `Failed to acquire nodes from ${url}, with error ${expectedError.toString()}`);
            logSpy.getCall(2).should.have.been.calledWith(LogType.ERROR, `Error filtering nodes: ${expectedError.message}`);
        });

        it('should test nodes can be added with environment chosen', async () => {
            const uri: vscode.Uri = vscode.Uri.file(path.join('myPath'));
            browseStub.onFirstCall().resolves([uri]);

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, environmentRegistryEntry);

            ensureDirStub.should.have.been.calledOnce;
            updateNodeStub.should.have.been.calledOnce;
            getNodesStub.should.have.been.calledTwice;

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully imported all nodes');
        });

        it('should test nodes can be added from adding an environment', async () => {
            const uri: vscode.Uri = vscode.Uri.file(path.join('myPath'));
            browseStub.onFirstCall().resolves([uri]);

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, environmentRegistryEntry, true, UserInputUtil.ADD_ENVIRONMENT_FROM_NODES);

            ensureDirStub.should.have.been.calledOnce;
            updateNodeStub.should.have.been.calledOnce;
            getNodesStub.should.have.been.calledTwice;

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully imported all nodes');
        });

        it('should test that connect command is called when connected to the environment you are updating', async () => {
            getConnectedEnvironmentRegistryEntry.returns(environmentRegistryEntry);

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

        it('should test that connect command is not called when connected to an environment you are not updating', async () => {
            const anotherEnvironmentRegistryEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry({name: 'anotherNetwork'});
            getConnectedEnvironmentRegistryEntry.returns(anotherEnvironmentRegistryEntry);

            const uri: vscode.Uri = vscode.Uri.file(path.join('myPath'));
            browseStub.onFirstCall().resolves([uri]);

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, environmentRegistryEntry);

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
                wallet: 'Org1',
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
                    wallet: 'Org1',
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

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully imported all nodes');
        });

        it('should handle when first node contains error', async () => {
            readJsonStub.resolves([{
                short_name: 'peer0.org1.example.com',
                api_url: 'grpc://localhost:17051',
                chaincode_url: 'grpc://localhost:17052',
                type: 'fabric-peer',
                wallet: 'Org1',
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
                    wallet: 'Org1',
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

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);

            const error: Error = new Error('A node should have a name property');

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Error importing node: ${error.message}`, `Error importing node: ${error.toString()}`);
            logSpy.getCall(2).should.have.been.calledWith(LogType.WARNING, 'Finished importing nodes but some nodes could not be imported');
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

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);

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

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, environmentRegistryEntry, true, UserInputUtil.ADD_ENVIRONMENT_FROM_NODES);

            browseStub.should.have.been.calledOnce;
            updateNodeStub.should.not.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
        });

        it('should handle errors when importing nodes', async () => {
            const uri: vscode.Uri = vscode.Uri.file(path.join('myPathOne'));
            browseStub.onFirstCall().resolves([uri]);

            addMoreStub.resolves(UserInputUtil.DONE_ADDING_NODES);

            const error: Error = new Error('some error');
            ensureDirStub.onFirstCall().rejects(error);

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
            logSpy.getCall(2).should.have.been.calledWith(LogType.WARNING, 'Finished importing nodes but some nodes could not be imported');
        });

        it('should throw error when failing to connect to Ops Tool URL when edditing nodes in existing environment', async () => {
            getNodesStub.onSecondCall().resolves([]);
            const connectionError: Error = new Error('some error');
            axiosGetStub.onFirstCall().rejects(connectionError);

            await vscode.commands.executeCommand(ExtensionCommands.EDIT_NODE_FILTERS, OpsToolRegistryEntry, false, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);

            getCoreNodeModuleStub.should.have.been.calledOnce;
            ensureDirStub.should.have.not.been.called;
            updateNodeStub.should.not.have.been.called;
            getNodesStub.should.have.been.calledOnce;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Failed to acquire nodes from ${url}, with error ${connectionError.message}`, `Failed to acquire nodes from ${url}, with error ${connectionError.toString()}`);
            logSpy.getCall(2).should.have.been.calledWith(LogType.ERROR, `Error filtering nodes: ${connectionError.message}`);
        });

        it('should throw error when failing to connect to Ops Tool URL when adding nodes via add environment', async () => {
            const error: Error = new Error('some error');
            axiosGetStub.onFirstCall().rejects(error);

            await vscode.commands.executeCommand(ExtensionCommands.EDIT_NODE_FILTERS, OpsToolRegistryEntry, true, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS).should.eventually.be.rejectedWith(error.message);

            getCoreNodeModuleStub.should.have.been.calledOnce;
            ensureDirStub.should.have.not.been.called;
            updateNodeStub.should.not.have.been.called;
            getNodesStub.should.have.been.calledOnce;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Failed to acquire nodes from ${url}, with error ${error.message}`, `Failed to acquire nodes from ${url}, with error ${error.toString()}`);
            logSpy.getCall(2).should.have.been.calledWith(LogType.ERROR, `Error filtering nodes: ${error.message}`);
        });

        it('should handle when user does not select any nodes when editting nodes on an existing Ops Tool instance', async () => {
            showNodesQuickPickBoxStub.resolves([]);

            await vscode.commands.executeCommand(ExtensionCommands.EDIT_NODE_FILTERS, OpsToolRegistryEntry, false, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);

            ensureDirStub.should.have.not.been.called;
            updateNodeStub.should.have.not.been.called;
            getNodesStub.should.have.been.calledOnce;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
        });

        it('should handle user choosing a subset of nodes from Ops Tool from a new Ops Tool instance', async () => {
            showNodesQuickPickBoxStub.resolves({label: opsToolNodes[0].display_name, data: opsToolNodes[0]});

            await vscode.commands.executeCommand(ExtensionCommands.EDIT_NODE_FILTERS, OpsToolRegistryEntry, true, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);

            getCoreNodeModuleStub.should.have.been.calledOnce;
            ensureDirStub.should.have.been.calledOnce;
            updateNodeStub.should.have.been.called;
            getNodesStub.should.have.been.calledTwice;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully filtered all nodes');
        });

        it('should add all nodes from the orderer cluster if user chooses any of those nodes, when adding nodes from Ops Tool', async () => {
            const allNodes: any = opsToolNodes;
            const orderer: any = [
                {
                    short_name: 'orderer1.example.com',
                    name: 'orderer1.example.com',
                    display_name: 'Orderer 1',
                    api_url: 'grpcs://someHost:somePort11',
                    type: 'fabric-orderer',
                    wallet: 'fabric_wallet',
                    identity: 'admin',
                    msp_id: 'OrdererMSP',
                    id: 'orderer1',
                    cluster_name: 'Ordering Service',
                    hidden: false
                },
                {
                    short_name: 'orderer2.example.com',
                    name: 'orderer2.example.com',
                    display_name: 'Orderer 2',
                    api_url: 'grpcs://someHost:somePort12',
                    type: 'fabric-orderer',
                    wallet: 'fabric_wallet',
                    identity: 'admin',
                    msp_id: 'OrdererMSP',
                    id: 'orderer2',
                    cluster_name: 'Ordering Service',
                    hidden: false
                }
            ];
            allNodes.push(...orderer);
            // User chooses peer and one of the orderer nodes
            showNodesQuickPickBoxStub.resolves([{label: allNodes[0].display_name, data: allNodes[0]},
                {label: allNodes[2].cluster_name, data: allNodes[2]}]);

            // Resulting visible nodes should be peer and all orderer nodes. Ca node should be hidden.
            const hiddenCaNode: FabricNode = allNodes[1];
            hiddenCaNode.hidden = true;
            const expectedNodes: FabricNode[] = [allNodes[0], hiddenCaNode, allNodes[2], allNodes[3]];
            const expectedNodesHidden: any[] = expectedNodes.map((_node: FabricNode) => ({
                short_name: _node.short_name,
                hidden: _node.hidden
            }));

            const savedNodes: FabricNode[] = [];
            updateNodeStub.callsFake((_node: FabricNode) => {
                savedNodes.push(_node);
            });

            await vscode.commands.executeCommand(ExtensionCommands.EDIT_NODE_FILTERS, OpsToolRegistryEntry, true, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);

            const savedNodesHidden: any[] = expectedNodes.map((_node: FabricNode) => ({
                short_name: _node.short_name,
                hidden: _node.hidden
            }));
            savedNodesHidden.should.deep.equal(expectedNodesHidden);

            getCoreNodeModuleStub.should.have.been.calledOnce;
            ensureDirStub.should.have.been.calledOnce;
            updateNodeStub.should.have.been.called;
            getNodesStub.should.have.been.calledTwice;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully filtered all nodes');
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
            logSpy.getCall(2).should.have.been.calledWith(LogType.WARNING, 'Finished importing nodes but some nodes could not be imported');
        });

        it('should error if a node with the same name already exists', async () => {
            getNodesStub.onFirstCall().resolves([{
                short_name: 'peer0.org1.example.com',
                name: 'peer0.org1.example.com',
                api_url: 'grpc://localhost:17051',
                chaincode_url: 'grpc://localhost:17052',
                type: 'fabric-peer',
                wallet: 'Org1',
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
                wallet: 'Org1',
                identity: 'admin',
                msp_id: 'Org1MSP',
                container_name: 'fabricvscodelocalfabric_peer0.org1.example.com'
            }]);

            const error: Error = new Error(`Node with name peer0.org1.example.com already exists`);
            const error1: Error = new Error('no nodes were added');

            const uri: vscode.Uri = vscode.Uri.file(path.join('myPathOne'));
            browseStub.resolves([uri]);

            addMoreStub.resolves(UserInputUtil.DONE_ADDING_NODES);

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, environmentRegistryEntry, true, UserInputUtil.ADD_ENVIRONMENT_FROM_NODES).should.eventually.be.rejectedWith('no nodes were added');

            ensureDirStub.should.have.been.calledOnce;
            updateNodeStub.should.not.have.been.called;
            getNodesStub.should.have.been.calledTwice;

            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Error importing node peer0.org1.example.com: ${error.message}`, `Error importing node peer0.org1.example.com: ${error.toString()}`);
            logSpy.getCall(2).should.have.been.calledWith(LogType.ERROR, `Error importing nodes: ${error1.message}`);
        });

        it('should error if no nodes are added', async () => {
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
                wallet: 'Org1',
                identity: 'admin',
                msp_id: 'Org1MSP',
                container_name: 'fabricvscodelocalfabric_peer0.org1.example.com'
            },
                {
                    short_name: 'invalid',
                    api_url: 'grpc://localhost:17051',
                    chaincode_url: 'grpc://localhost:17052',
                    type: 'fabric-peer',
                    wallet: 'Org1',
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
            logSpy.should.have.been.calledWith(LogType.WARNING, 'Finished importing nodes but some nodes could not be imported');
        });
    });
});
