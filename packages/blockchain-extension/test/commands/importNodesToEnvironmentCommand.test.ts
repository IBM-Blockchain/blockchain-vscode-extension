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
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricEnvironmentRegistryEntry, LogType, FabricEnvironment, FabricNode, FabricEnvironmentRegistry, EnvironmentType, EnvironmentFlags } from 'ibm-blockchain-platform-common';
import { FabricEnvironmentManager } from '../../extension/fabric/environments/FabricEnvironmentManager';
import { ModuleUtil } from '../../extension/util/ModuleUtil';
import { ExtensionsInteractionUtil } from '../../extension/util/ExtensionsInteractionUtil';

// tslint:disable no-unused-expression
chai.use(sinonChai);
const should: Chai.Should = chai.should();

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
    let opsToolRegistryEntry: FabricEnvironmentRegistryEntry;
    let showEnvironmentQuickPickStub: sinon.SinonStub;
    let axiosGetStub: sinon.SinonStub;
    let showNodesQuickPickBoxStub: sinon.SinonStub;
    let getPasswordStub: sinon.SinonStub;
    let getCoreNodeModuleStub: sinon.SinonStub;
    let fsPathExistsStub: sinon.SinonStub;
    let localFabricNodes: any;
    let opsToolNodes: any;
    let url: string;
    let userAuth1: string;
    let userAuth2: string;
    let rejectUnauthorized: string;
    let getConnectedEnvironmentRegistryEntry: sinon.SinonStub;
    let getAllStub: sinon.SinonStub;
    let showConfirmationWarningMessageStub: sinon.SinonStub;
    let stopEnvironmentRefreshStub: sinon.SinonStub;
    let SaaSOpsToolRegistryEntry: FabricEnvironmentRegistryEntry;
    let SaaSurl: string;
    let cloudAccountGetAccessTokenStub: sinon.SinonStub;
    let accessToken: string;

    before(async () => {
        await TestUtil.setupTests(mySandBox);
    });

    describe('importNodesToEnvironment', () => {

        beforeEach(async () => {
            mySandBox.restore();
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
            userAuth1 = 'myOpsToolKey';
            userAuth2 = 'myOpsToolSecret';
            rejectUnauthorized = 'false';
            opsToolRegistryEntry = new FabricEnvironmentRegistryEntry();
            opsToolRegistryEntry.name = 'myOpsToolInstance';
            opsToolRegistryEntry.url = url;
            opsToolRegistryEntry.managedRuntime = false;
            opsToolRegistryEntry.environmentType = EnvironmentType.OPS_TOOLS_ENVIRONMENT;
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

            axiosGetStub.onFirstCall().resolves({data: opsToolNodes});
            showNodesQuickPickBoxStub.resolves(opsToolNodes.map((_node: any) => ({ label: _node.display_name, data: _node })));
            getPasswordStub = mySandBox.stub().resolves(`${userAuth1}:${userAuth2}:${rejectUnauthorized}`);
            getCoreNodeModuleStub = mySandBox.stub(ModuleUtil, 'getCoreNodeModule').returns({
                getPassword: getPasswordStub
            });

            // Ops tools SaaS
            SaaSurl = 'my/OpsTool/IBM/url';
            SaaSOpsToolRegistryEntry = new FabricEnvironmentRegistryEntry();
            SaaSOpsToolRegistryEntry.name = 'mySaaSOpsToolInstance';
            SaaSOpsToolRegistryEntry.environmentType = EnvironmentType.SAAS_OPS_TOOLS_ENVIRONMENT;
            SaaSOpsToolRegistryEntry.url = SaaSurl;
            SaaSOpsToolRegistryEntry.managedRuntime = false;
            accessToken = 'some token';
            cloudAccountGetAccessTokenStub = mySandBox.stub(ExtensionsInteractionUtil, 'cloudAccountGetAccessToken').resolves(accessToken);

            getConnectedEnvironmentRegistryEntry = mySandBox.stub(FabricEnvironmentManager.instance(), 'getEnvironmentRegistryEntry').returns(undefined);
            stopEnvironmentRefreshStub = mySandBox.stub(FabricEnvironmentManager.instance(), 'stopEnvironmentRefresh');
            getAllStub = mySandBox.stub(FabricEnvironmentRegistry.instance(), 'getAll').resolves([environmentRegistryEntry, opsToolRegistryEntry, SaaSOpsToolRegistryEntry]);
            showConfirmationWarningMessageStub = mySandBox.stub(UserInputUtil, 'showConfirmationWarningMessage');
            showConfirmationWarningMessageStub.callThrough();
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
            stopEnvironmentRefreshStub.should.not.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully imported nodes');
        });

        it('should test nodes with display_name, tls_cert or tls_ca_root_cert properties can be added', async () => {
            const uri: vscode.Uri = vscode.Uri.file(path.join('myPath'));
            browseStub.onFirstCall().resolves([uri]);

            readJsonStub.resolves([
                {
                    short_name: 'peer0.org1.example.com',
                    display_name: 'peer0.org1.example.com',
                    api_url: 'grpc://localhost:17051',
                    chaincode_url: 'grpc://localhost:17052',
                    type: 'fabric-peer',
                    wallet: 'Org1',
                    identity: 'admin',
                    msp_id: 'Org1MSP',
                    container_name: 'fabricvscodelocalfabric_peer0.org1.example.com',
                    tls_ca_root_cert: 'someCertPeer'
                }, {
                    short_name: 'ca.org1.example.com',
                    display_name: 'ca.org1.example.com',
                    api_url: 'grpc://someHost:somePort2',
                    type: 'fabric-ca',
                    wallet: 'fabric_wallet',
                    identity: 'admin',
                    location: 'some_saas',
                    ca_name: 'ca.org1.example.com',
                    tls_cert: 'someCertPeer'
                }
            ]);

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT);

            ensureDirStub.should.have.been.calledOnce;
            updateNodeStub.should.have.been.calledTwice;
            getNodesStub.should.have.been.calledTwice;
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);
            stopEnvironmentRefreshStub.should.not.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully imported nodes');
        });

        it('should update environment periodically and not show the log message saying filter nodes has been run', async () => {
            await vscode.commands.executeCommand(ExtensionCommands.EDIT_NODE_FILTERS, opsToolRegistryEntry, false, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS, false, false);
            logSpy.should.not.have.been.calledWith(LogType.INFO, undefined, 'Edit node filters');
        });

        it('should test nodes can be added to a new OpsTool instance', async () => {
            getNodesStub.onSecondCall().resolves(opsToolNodes);

            await vscode.commands.executeCommand(ExtensionCommands.EDIT_NODE_FILTERS, opsToolRegistryEntry, true, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);

            getCoreNodeModuleStub.should.have.been.calledOnce;
            ensureDirStub.should.have.been.calledOnce;
            updateNodeStub.should.have.been.calledTwice;
            getNodesStub.should.have.been.calledTwice;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Edit node filters');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully filtered nodes');
        });

        it('should test nodes with tls_cert or tls_ca_root_cert properties can be added to a new OpsTool instance', async () => {
            axiosGetStub.onFirstCall().resolves({
                data: [{
                    short_name: 'peer0.org1.example.com',
                    name: 'peer0.org1.example.com',
                    display_name: 'Peer0 Org1',
                    api_url: 'grpcs://someHost:somePort1',
                    type: 'fabric-peer',
                    wallet: 'fabric_wallet',
                    identity: 'admin',
                    msp_id: 'Org1MSP',
                    tls_ca_root_cert: 'someCertPeer',
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
            ]});

            await vscode.commands.executeCommand(ExtensionCommands.EDIT_NODE_FILTERS, OpsToolRegistryEntry, true, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);

            getCoreNodeModuleStub.should.have.been.calledOnce;
            ensureDirStub.should.have.been.calledOnce;
            updateNodeStub.should.have.been.calledTwice;
            getNodesStub.should.have.been.calledTwice;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Edit node filters');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully filtered nodes');
        });

        // Update this test when doing issue for filtering nodes
        it('should test nodes can be filtered for an existing OpsTool environment from command palette', async () => {
            showEnvironmentQuickPickStub.resolves({ label: opsToolRegistryEntry.name, data: opsToolRegistryEntry });
            getConnectedEnvironmentRegistryEntry.returns(opsToolRegistryEntry);

            await vscode.commands.executeCommand(ExtensionCommands.EDIT_NODE_FILTERS, undefined, false, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);

            getCoreNodeModuleStub.should.have.been.calledOnce;
            ensureDirStub.should.have.been.calledOnce;
            updateNodeStub.should.have.been.calledTwice;
            getNodesStub.should.have.been.calledTwice;
<<<<<<< HEAD
            showEnvironmentQuickPickStub.should.have.been.calledWith('Choose an OpsTool environment to filter nodes', false, true, [EnvironmentFlags.OPS_TOOLS]);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, OpsToolRegistryEntry);
=======
            showEnvironmentQuickPickStub.should.have.been.calledWith('Choose an OpsTool environment to filter nodes', false, false, false, IncludeEnvironmentOptions.OPSTOOLSENV);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, opsToolRegistryEntry);
>>>>>>> 679b511f... IBM OpsTools - OOD nodes when unable to connect to console. Closes #2055 (#2197)
            stopEnvironmentRefreshStub.should.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Edit node filters');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully filtered nodes');
        });

        it('should test all nodes can be hidden for an existing OpsTool environment from command palette', async () => {
            showEnvironmentQuickPickStub.resolves({ label: opsToolRegistryEntry.name, data: opsToolRegistryEntry });
            getConnectedEnvironmentRegistryEntry.returns(opsToolRegistryEntry);
            showNodesQuickPickBoxStub.resolves([]);
            getNodesStub.onSecondCall().resolves([]);

            await vscode.commands.executeCommand(ExtensionCommands.EDIT_NODE_FILTERS, undefined, false, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);

            getCoreNodeModuleStub.should.have.been.calledOnce;
            ensureDirStub.should.have.been.calledOnce;
            updateNodeStub.should.have.been.calledTwice;
            getNodesStub.should.have.been.calledTwice;
            showEnvironmentQuickPickStub.should.have.been.calledWith('Choose an OpsTool environment to filter nodes', false, true, [EnvironmentFlags.OPS_TOOLS]);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            stopEnvironmentRefreshStub.should.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Edit node filters');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully filtered nodes');
        });

        it('should test nodes can be added to an existing OpsTool environment', async () => {
            getNodesStub.onSecondCall().resolves(opsToolNodes);
            getConnectedEnvironmentRegistryEntry.returns(opsToolRegistryEntry);

            await vscode.commands.executeCommand(ExtensionCommands.EDIT_NODE_FILTERS, opsToolRegistryEntry, false);

            getCoreNodeModuleStub.should.have.been.calledOnce;
            ensureDirStub.should.have.been.calledOnce;
            updateNodeStub.should.have.been.calledTwice;
            getNodesStub.should.have.been.calledTwice;
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, opsToolRegistryEntry);
            stopEnvironmentRefreshStub.should.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Edit node filters');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully filtered nodes');
        });

        it('should test nodes can be added to an existing OpsTool environment (on windows)', async () => {
            mySandBox.stub(process, 'platform').value('win32');
            getNodesStub.onSecondCall().resolves(opsToolNodes);
            getConnectedEnvironmentRegistryEntry.returns(opsToolRegistryEntry);

            await vscode.commands.executeCommand(ExtensionCommands.EDIT_NODE_FILTERS, opsToolRegistryEntry, false);

            getCoreNodeModuleStub.should.have.been.calledOnce;
            ensureDirStub.should.have.been.calledOnce;
            updateNodeStub.should.have.been.calledTwice;
            getNodesStub.should.have.been.calledTwice;
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, opsToolRegistryEntry);
            stopEnvironmentRefreshStub.should.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Edit node filters');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully filtered nodes');
        });

        it('should handle when the keytar module cannot be imported at all when creating a new OpsTool instance (Software Support)', async () => {
            getCoreNodeModuleStub.returns(undefined);
            const error: Error = new Error('Error importing the keytar module');

            await vscode.commands.executeCommand(ExtensionCommands.EDIT_NODE_FILTERS, opsToolRegistryEntry, true, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS).should.be.rejectedWith('Error importing the keytar module');

            getCoreNodeModuleStub.should.have.been.calledOnce;
            ensureDirStub.should.have.not.been.called;
            updateNodeStub.should.not.have.been.called;
            getNodesStub.should.have.been.calledOnce;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Edit node filters');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Failed to acquire nodes from ${opsToolRegistryEntry.url}, with error ${error.message}`, `Failed to acquire nodes from ${opsToolRegistryEntry.url}, with error ${error.toString()}`);
            logSpy.getCall(2).should.have.been.calledWith(LogType.ERROR, `Error filtering nodes: ${error.message}`);
        });

        it('should handle when the user id + password/api key + secret cannot be retrieved when creating new OpsTool instance (Software Support)', async () => {
            const error: Error = new Error('newError');
            getPasswordStub.throws(error);

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, opsToolRegistryEntry, true, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS).should.be.rejectedWith(error.message);

            getCoreNodeModuleStub.should.have.been.calledOnce;
            ensureDirStub.should.have.not.been.called;
            updateNodeStub.should.not.have.been.called;
            getNodesStub.should.have.been.calledOnce;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Edit node filters');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Failed to acquire nodes from ${url}, with error ${error.message}`, `Failed to acquire nodes from ${url}, with error ${error.toString()}`);
        });

        it('should handle when the securely stored information has the wrong number of entries (separated by ":") when edditing filters on existing OpsTool instance (Software Support)', async () => {
            getPasswordStub.resolves(`${userAuth1}:${userAuth2}:${rejectUnauthorized}:someMoreInfo`);
            const error: Error = new Error('Unable to retrieve the stored credentials');

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, opsToolRegistryEntry, false, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);

            getCoreNodeModuleStub.should.have.been.calledOnce;
            ensureDirStub.should.have.not.been.called;
            updateNodeStub.should.not.have.been.called;
            getNodesStub.should.have.been.calledOnce;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Edit node filters');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Failed to acquire nodes from ${url}, with error ${error.message}`, `Failed to acquire nodes from ${url}, with error ${error.toString()}`);
            logSpy.getCall(2).should.have.been.calledWith(LogType.ERROR, `Error filtering nodes: ${error.message}`);

        });

        it('should test nodes can be added from URL and user id + password/API key + secret (non TLS network) when adding a new OpsTool instance', async () => {
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

            await vscode.commands.executeCommand(ExtensionCommands.EDIT_NODE_FILTERS, opsToolRegistryEntry, true, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);

            getCoreNodeModuleStub.should.have.been.calledOnce;
            ensureDirStub.should.have.been.calledOnce;
            updateNodeStub.should.have.been.calledTwice;
            getNodesStub.should.have.been.calledTwice;

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Edit node filters');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully filtered nodes');
        });

        it('should test nodes can be added with environment chosen', async () => {
            const uri: vscode.Uri = vscode.Uri.file(path.join('myPath'));
            browseStub.onFirstCall().resolves([uri]);

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, environmentRegistryEntry);

            ensureDirStub.should.have.been.calledOnce;
            updateNodeStub.should.have.been.calledOnce;
            getNodesStub.should.have.been.calledTwice;

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);
            stopEnvironmentRefreshStub.should.not.have.been.called;

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully imported nodes');
        });

        it('should test nodes can be added from adding an environment', async () => {
            const uri: vscode.Uri = vscode.Uri.file(path.join('myPath'));
            browseStub.onFirstCall().resolves([uri]);

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, environmentRegistryEntry, true, UserInputUtil.ADD_ENVIRONMENT_FROM_NODES);

            ensureDirStub.should.have.been.calledOnce;
            updateNodeStub.should.have.been.calledOnce;
            getNodesStub.should.have.been.calledTwice;

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);
            stopEnvironmentRefreshStub.should.not.have.been.called;

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully imported nodes');
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
            stopEnvironmentRefreshStub.should.have.been.called;

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully imported nodes');
        });

        it('should test that connect command is not called when connected to an environment you are not updating', async () => {
            const anotherEnvironmentRegistryEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry({name: 'anotherNetwork',  environmentType: EnvironmentType.ENVIRONMENT});
            getConnectedEnvironmentRegistryEntry.returns(anotherEnvironmentRegistryEntry);

            const uri: vscode.Uri = vscode.Uri.file(path.join('myPath'));
            browseStub.onFirstCall().resolves([uri]);

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, environmentRegistryEntry);

            ensureDirStub.should.have.been.calledOnce;
            updateNodeStub.should.have.been.calledOnce;
            getNodesStub.should.have.been.calledTwice;

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);
            stopEnvironmentRefreshStub.should.not.have.been.called;

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully imported nodes');
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
            stopEnvironmentRefreshStub.should.not.have.been.called;

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully imported nodes');
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
            stopEnvironmentRefreshStub.should.not.have.been.called;

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
            stopEnvironmentRefreshStub.should.not.have.been.called;

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully imported nodes');
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

        it('should throw error when failing to connect to Ops Tool URL when editing nodes in existing environment', async () => {
            getNodesStub.onSecondCall().resolves([]);
            const connectionError: Error = new Error('some error');
            axiosGetStub.onFirstCall().rejects(connectionError);

            await vscode.commands.executeCommand(ExtensionCommands.EDIT_NODE_FILTERS, opsToolRegistryEntry, false, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);

            getCoreNodeModuleStub.should.have.been.calledOnce;
            ensureDirStub.should.have.not.been.called;
            updateNodeStub.should.not.have.been.called;
            getNodesStub.should.have.been.calledOnce;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Edit node filters');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Failed to acquire nodes from ${url}, with error ${connectionError.message}`, `Failed to acquire nodes from ${url}, with error ${connectionError.toString()}`);
            logSpy.getCall(2).should.have.been.calledWith(LogType.ERROR, `Error filtering nodes: ${connectionError.message}`);
        });

        it('should throw error when failing to connect to Ops Tool URL when adding nodes via add environment', async () => {
            const error: Error = new Error('some error');
            axiosGetStub.onFirstCall().rejects(error);

            await vscode.commands.executeCommand(ExtensionCommands.EDIT_NODE_FILTERS, opsToolRegistryEntry, true, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS).should.eventually.be.rejectedWith(error.message);

            getCoreNodeModuleStub.should.have.been.calledOnce;
            ensureDirStub.should.have.not.been.called;
            updateNodeStub.should.not.have.been.called;
            getNodesStub.should.have.been.calledOnce;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Edit node filters');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Failed to acquire nodes from ${url}, with error ${error.message}`, `Failed to acquire nodes from ${url}, with error ${error.toString()}`);
            logSpy.getCall(2).should.have.been.calledWith(LogType.ERROR, `Error filtering nodes: ${error.message}`);
        });

        it('should handle when user does not select any nodes when editting nodes on an existing Ops Tool instance', async () => {
            showNodesQuickPickBoxStub.resolves([]);

            await vscode.commands.executeCommand(ExtensionCommands.EDIT_NODE_FILTERS, opsToolRegistryEntry, false, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);

            ensureDirStub.should.have.been.called;
            updateNodeStub.should.have.been.called;
            getNodesStub.should.have.been.calledTwice;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Edit node filters');
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully filtered nodes');
        });

        it('should handle when user cancel selecting nodes when editting nodes on an existing Ops Tool instance', async () => {
            getNodesStub.resolves(opsToolNodes);
            showNodesQuickPickBoxStub.resolves();
            executeCommandStub.withArgs(ExtensionCommands.DELETE_NODE).resolves();

            const result: boolean = await vscode.commands.executeCommand(ExtensionCommands.EDIT_NODE_FILTERS, opsToolRegistryEntry, false, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);

            should.equal(undefined, result);
            ensureDirStub.should.have.been.called;
            updateNodeStub.should.have.been.called;
            getNodesStub.should.have.been.calledTwice;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Edit node filters');
            logSpy.should.have.not.been.calledWith(LogType.SUCCESS, 'Successfully filtered all nodes');
        });

        it('should handle when user cancel selecting nodes and there are orderer nodes present when editting nodes on an existing Ops Tool instance', async () => {
            const someNodes: any[] = [{
                short_name: 'orderer1.example.com',
                name: 'orderer1.example.com',
                display_name: 'Orderer 1',
                api_url: 'grpcs://someHost:somePort12',
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
            }].concat(opsToolNodes);
            getNodesStub.reset();
            getNodesStub.resolves(someNodes);
            axiosGetStub.onFirstCall().resolves({data: someNodes});
            showNodesQuickPickBoxStub.resolves();

            const result: boolean = await vscode.commands.executeCommand(ExtensionCommands.EDIT_NODE_FILTERS, opsToolRegistryEntry, false, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);

            should.equal(undefined, result);
            ensureDirStub.should.have.been.called;
            updateNodeStub.should.have.been.called;
            getNodesStub.should.have.been.calledTwice;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Edit node filters');
            logSpy.should.have.not.been.calledWith(LogType.SUCCESS, 'Successfully filtered nodes');
        });

        it('should handle when user cancel selecting nodes when adding a new Ops Tool instance', async () => {
            showNodesQuickPickBoxStub.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.EDIT_NODE_FILTERS, opsToolRegistryEntry, true, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);

            ensureDirStub.should.have.not.been.called;
            updateNodeStub.should.have.not.been.called;
            getNodesStub.should.have.been.calledOnce;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Edit node filters');
            logSpy.should.have.not.been.calledWith(LogType.SUCCESS, 'Successfully filtered nodes');
        });

        it('should handle user choosing a subset of nodes from Ops Tool from a new Ops Tool instance', async () => {
            showNodesQuickPickBoxStub.resolves({ label: opsToolNodes[0].display_name, data: opsToolNodes[0] });

            await vscode.commands.executeCommand(ExtensionCommands.EDIT_NODE_FILTERS, opsToolRegistryEntry, true, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);

            getCoreNodeModuleStub.should.have.been.calledOnce;
            ensureDirStub.should.have.been.calledOnce;
            updateNodeStub.should.have.been.called;
            getNodesStub.should.have.been.calledTwice;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Edit node filters');
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully filtered nodes');
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
            showNodesQuickPickBoxStub.resolves([{ label: allNodes[0].display_name, data: allNodes[0] },
            { label: allNodes[2].cluster_name, data: allNodes[2] }]);

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

            await vscode.commands.executeCommand(ExtensionCommands.EDIT_NODE_FILTERS, opsToolRegistryEntry, true, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);

            const savedNodesHidden: any[] = expectedNodes.map((_node: FabricNode) => ({
                short_name: _node.short_name,
                hidden: _node.hidden
            }));
            savedNodesHidden.should.deep.equal(expectedNodesHidden);

            getCoreNodeModuleStub.should.have.been.calledOnce;
            ensureDirStub.should.have.been.calledOnce;
            updateNodeStub.should.have.been.called;
            getNodesStub.should.have.been.calledTwice;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Edit node filters');
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully filtered nodes');
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

        it('should handle error when deleting nodes from an Ops Tool instance', async () => {
            const originalNodes: any[] = [{
                short_name: 'peer1.org1.example.com',
                name: 'peer1.org1.example.com',
                display_name: 'Peer1 Org1',
                api_url: 'grpcs://someHost:somePort1',
                type: 'fabric-peer',
                wallet: 'fabric_wallet',
                identity: 'admin',
                msp_id: 'Org1MSP',
                pem: 'someCertPeer',
                location: 'some_saas',
                id: 'peer10rg1',
                cluster_name: 'someClusterName',
                hidden: false
            },
            {
                short_name: 'peer2.org1.example.com',
                display_name: 'Peer2 Org1',
                api_url: 'grpcs://someHost:somePort2',
                type: 'fabric-peer',
                wallet: 'fabric_wallet',
                identity: 'admin',
                msp_id: 'Org1MSP',
                pem: 'someCertPeer',
                location: 'some_saas',
                id: 'peer20rg1',
                cluster_name: 'someClusterName',
                hidden: false
            }];

            const nodesFromOpsTools: any[] = [{
                short_name: 'peer3.org1.example.com',
                name: 'peer3.org1.example.com',
                display_name: 'Peer3 Org1',
                api_url: 'grpcs://someHost:somePort3',
                type: 'fabric-peer',
                wallet: 'fabric_wallet',
                identity: 'admin',
                msp_id: 'Org1MSP',
                pem: 'someCertPeer',
                location: 'some_saas',
                id: 'peer30rg1',
                cluster_name: 'someClusterName',
                hidden: false
            }];
            getNodesStub.resetBehavior();
            getNodesStub.resolves(originalNodes);
            axiosGetStub.onFirstCall().resolves({data: nodesFromOpsTools});
            showNodesQuickPickBoxStub.resolves({ label: nodesFromOpsTools[0].display_name, data: nodesFromOpsTools[0] });
            const error: Error = new Error('Some error');
            executeCommandStub.withArgs(ExtensionCommands.DELETE_NODE).throws(error);

            await vscode.commands.executeCommand(ExtensionCommands.EDIT_NODE_FILTERS, opsToolRegistryEntry, false, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.DELETE_NODE);
            getCoreNodeModuleStub.should.have.been.calledOnce;
            ensureDirStub.should.have.been.calledOnce;
            updateNodeStub.should.have.been.called;
            getNodesStub.should.have.been.calledTwice;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Edit node filters');
            logSpy.should.have.been.calledWith(LogType.ERROR, `Error deleting node: ${error.message}`, `Error deleting node: ${error.toString()}`);
            logSpy.should.have.been.calledWith(LogType.ERROR, `Error deletinging node peer1.org1.example.com: ${error.message}`, `Error deleting node peer1.org1.example.com: ${error.toString()}`);
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully filtered nodes');
        });

        it('should handle user chosing not to add environment after no nodes in Ops Tool instance', async () => {
            getNodesStub.resetBehavior();
            getNodesStub.onFirstCall().resolves([]);
            getNodesStub.onSecondCall().throws(new Error('should never get this far'));
            axiosGetStub.onFirstCall().resolves([]);

            const yesNoStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'showQuickPickYesNo').resolves(UserInputUtil.NO);

            await vscode.commands.executeCommand(ExtensionCommands.EDIT_NODE_FILTERS, opsToolRegistryEntry, true, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);

            getCoreNodeModuleStub.should.have.been.calledOnce;
            ensureDirStub.should.have.been.calledOnce;
            updateNodeStub.should.have.not.been.called;
            getNodesStub.should.have.been.calledOnce;
            showNodesQuickPickBoxStub.should.not.have.been.called;
            yesNoStub.should.have.been.calledWithExactly(`There are no nodes in ${opsToolRegistryEntry.name}. Do you still want to add this environment?`);
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Edit node filters');
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS, `Successfully filtered nodes`);
        });

        it('should handle user chosing to delete environment after all nodes have been deleted from an Ops Tool instance', async () => {
            const originalNodes: any[] = [{
                short_name: 'peer1.org1.example.com',
                name: 'peer1.org1.example.com',
                display_name: 'Peer1 Org1',
                api_url: 'grpcs://someHost:somePort1',
                type: 'fabric-peer',
                wallet: 'fabric_wallet',
                identity: 'admin',
                msp_id: 'Org1MSP',
                pem: 'someCertPeer',
                location: 'some_saas',
                id: 'peer10rg1',
                cluster_name: 'someClusterName',
                hidden: false
            }];

            getNodesStub.resetBehavior();
            getNodesStub.onFirstCall().resolves(originalNodes);
            getNodesStub.onSecondCall().throws(new Error('should never get this far'));
            axiosGetStub.onFirstCall().resolves([]);
            showConfirmationWarningMessageStub.resolves(true);
            getAllStub.resolves([]);
            executeCommandStub.withArgs(ExtensionCommands.DELETE_NODE).resolves();
            executeCommandStub.withArgs(ExtensionCommands.DELETE_ENVIRONMENT).resolves();

            await vscode.commands.executeCommand(ExtensionCommands.EDIT_NODE_FILTERS, opsToolRegistryEntry, false, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.DELETE_NODE);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.DELETE_ENVIRONMENT);
            getCoreNodeModuleStub.should.have.been.calledOnce;
            ensureDirStub.should.have.been.calledOnce;
            updateNodeStub.should.have.not.been.called;
            getNodesStub.should.have.been.calledOnce;
            getAllStub.should.have.been.calledOnce;
            showNodesQuickPickBoxStub.should.not.have.been.called;
            showConfirmationWarningMessageStub.should.have.been.calledWithExactly(`There are no nodes in ${opsToolRegistryEntry.name}. Do you want to delete this environment?`);
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Edit node filters');
        });

        it('should handle user choosing to add environment when no nodes in Ops Tool instance', async () => {
            getNodesStub.resetBehavior();
            getNodesStub.onFirstCall().resolves([]);
            getNodesStub.onSecondCall().resolves([]);
            axiosGetStub.onFirstCall().resolves([]);

            const yesNoStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'showQuickPickYesNo').resolves(UserInputUtil.YES);

            await vscode.commands.executeCommand(ExtensionCommands.EDIT_NODE_FILTERS, opsToolRegistryEntry, true, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);

            getCoreNodeModuleStub.should.have.been.calledOnce;
            ensureDirStub.should.have.been.calledOnce;
            updateNodeStub.should.have.not.been.called;
            getNodesStub.should.have.been.calledTwice;
            showNodesQuickPickBoxStub.should.not.have.been.called;
            yesNoStub.should.have.been.calledWithExactly(`There are no nodes in ${opsToolRegistryEntry.name}. Do you still want to add this environment?`);
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Edit node filters');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully filtered nodes');
        });

        it('should handle user chosing not to delete environment after all nodes have been deleted from an Ops Tool instance', async () => {
            const originalNodes: any[] = [{
                short_name: 'peer1.org1.example.com',
                name: 'peer1.org1.example.com',
                display_name: 'Peer1 Org1',
                api_url: 'grpcs://someHost:somePort1',
                type: 'fabric-peer',
                wallet: 'fabric_wallet',
                identity: 'admin',
                msp_id: 'Org1MSP',
                pem: 'someCertPeer',
                location: 'some_saas',
                id: 'peer10rg1',
                cluster_name: 'someClusterName',
                hidden: false
            }];

            getNodesStub.resetBehavior();
            getNodesStub.onFirstCall().resolves(originalNodes);
            getNodesStub.onSecondCall().resolves([]);
            axiosGetStub.onFirstCall().resolves([]);
            showConfirmationWarningMessageStub.resolves(false);
            getAllStub.resolves([opsToolRegistryEntry]);
            executeCommandStub.withArgs(ExtensionCommands.DELETE_NODE).resolves();
            executeCommandStub.withArgs(ExtensionCommands.DELETE_ENVIRONMENT).resolves();

            await vscode.commands.executeCommand(ExtensionCommands.EDIT_NODE_FILTERS, opsToolRegistryEntry, false, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.DELETE_NODE);
            executeCommandStub.should.have.not.been.calledWith(ExtensionCommands.DELETE_ENVIRONMENT);
            getCoreNodeModuleStub.should.have.been.calledOnce;
            ensureDirStub.should.have.been.calledOnce;
            updateNodeStub.should.have.not.been.called;
            getNodesStub.should.have.been.calledTwice;
            getAllStub.should.have.been.calledOnce;
            showNodesQuickPickBoxStub.should.not.have.been.called;
            showConfirmationWarningMessageStub.should.have.been.calledWithExactly(`There are no nodes in ${opsToolRegistryEntry.name}. Do you want to delete this environment?`);
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Edit node filters');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully filtered nodes');
        });

        it('should test nodes can be added to a new OpsTool (SaaS) instance', async () => {
            axiosGetStub.onFirstCall().resolves({data: opsToolNodes});
            getNodesStub.onSecondCall().resolves(opsToolNodes);

            await vscode.commands.executeCommand(ExtensionCommands.EDIT_NODE_FILTERS, SaaSOpsToolRegistryEntry, true, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);

            cloudAccountGetAccessTokenStub.should.have.been.called;
            getCoreNodeModuleStub.should.have.not.been.calledOnce;
            ensureDirStub.should.have.been.calledOnce;
            updateNodeStub.should.have.been.calledTwice;
            getNodesStub.should.have.been.calledTwice;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Edit node filters');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully filtered nodes');
        });

        it('should test nodes can be added to an existing OpsTool (SaaS) instance', async () => {
            showEnvironmentQuickPickStub.resolves({ label: SaaSOpsToolRegistryEntry.name, data: SaaSOpsToolRegistryEntry });
            getConnectedEnvironmentRegistryEntry.returns(SaaSOpsToolRegistryEntry);
            getNodesStub.onSecondCall().resolves(opsToolNodes);
            axiosGetStub.onFirstCall().resolves({data: opsToolNodes});

            await vscode.commands.executeCommand(ExtensionCommands.EDIT_NODE_FILTERS, undefined, false, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);

            cloudAccountGetAccessTokenStub.should.have.been.called;
            getCoreNodeModuleStub.should.have.not.been.calledOnce;
            ensureDirStub.should.have.been.calledOnce;
            updateNodeStub.should.have.been.calledTwice;
            getNodesStub.should.have.been.calledTwice;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Edit node filters');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully filtered nodes');
        });

        it('should handle user canceling while getting access token when editing nodes on an OpsTool (SaaS) instance', async () => {
            getNodesStub.onSecondCall().resolves(opsToolNodes);
            cloudAccountGetAccessTokenStub.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.EDIT_NODE_FILTERS, SaaSOpsToolRegistryEntry, true, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);

            cloudAccountGetAccessTokenStub.should.have.been.called;
            getCoreNodeModuleStub.should.have.not.been.calledOnce;
            ensureDirStub.should.have.not.been.calledOnce;
            updateNodeStub.should.have.not.been.calledTwice;
            getNodesStub.should.have.been.calledOnce;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Edit node filters');
            logSpy.getCalls().length.should.equal(1);
        });

        it('should fail if error thrown while getting the access token when editing nodes on an OpsTool (SaaS) instance', async () => {
            const tokenError: Error = new Error('Some token error');
            cloudAccountGetAccessTokenStub.rejects(tokenError);

            await vscode.commands.executeCommand(ExtensionCommands.EDIT_NODE_FILTERS, SaaSOpsToolRegistryEntry, true, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS).should.eventually.be.rejectedWith(tokenError);

            cloudAccountGetAccessTokenStub.should.have.been.called;
            getCoreNodeModuleStub.should.have.not.been.calledOnce;
            ensureDirStub.should.have.not.been.calledOnce;
            updateNodeStub.should.have.not.been.calledTwice;
            getNodesStub.should.have.been.calledOnce;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Edit node filters');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Failed to acquire nodes from ${SaaSOpsToolRegistryEntry.url}, with error ${tokenError.message}`, `Failed to acquire nodes from ${SaaSOpsToolRegistryEntry.url}, with error ${tokenError.toString()}`);
            logSpy.getCall(2).should.have.been.calledWith(LogType.ERROR, `Error filtering nodes: ${tokenError.message}`);
        });

        it('should fail and warn user of nodes out of date if unable to connect to ops console and/or retrieve nodes when coming from connect cmd on existing OpsTool (any) instance', async () => {
            const connectError: Error = new Error('User must be logged in to an IBM Cloud account');
            const thrownError: Error = new Error(`Nodes in ${SaaSOpsToolRegistryEntry.name} might be out of date. Unable to connect to the IBM Blockchain Platform Console with error: ${connectError.message}`);
            const informOfChanges: boolean = false;
            const showSuccess: boolean = true;
            const fromConnectEnvironment: boolean = true;
            cloudAccountGetAccessTokenStub.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.EDIT_NODE_FILTERS, SaaSOpsToolRegistryEntry, true, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS, informOfChanges, showSuccess, fromConnectEnvironment).should.eventually.be.rejectedWith(thrownError.message);

            cloudAccountGetAccessTokenStub.should.have.been.called;
            getCoreNodeModuleStub.should.have.not.been.calledOnce;
            ensureDirStub.should.have.not.been.calledOnce;
            updateNodeStub.should.have.not.been.calledTwice;
            getNodesStub.should.have.been.calledOnce;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Edit node filters');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, undefined, connectError.toString());
            logSpy.getCall(2).should.have.been.calledWith(LogType.WARNING, thrownError.message, thrownError.toString());
        });
    });
});
