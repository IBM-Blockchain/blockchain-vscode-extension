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
import { FabricNode } from '../../extension/fabric/FabricNode';

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
    let addMethodChooserStub: sinon.SinonStub;
    let showInputBoxStub: sinon.SinonStub;
    let axiosGetStub: sinon.SinonStub;
    let showNodesQuickPickBoxStub: sinon.SinonStub;
    let setPasswordStub: sinon.SinonStub;
    let requireAsarModuleStub: sinon.SinonStub;
    let showQuickPickStub: sinon.SinonStub;
    let chooseCertVerificationStub: sinon.SinonStub;
    let readFileStub: sinon.SinonStub;
    let fsCopyStub: sinon.SinonStub;
    let localFabricNodes: any;
    let opsToolNodes: any;
    let url: string;
    let key: string;
    let secret: string;
    let certVerificationError: any;
    let caCertChainUri: vscode.Uri;

    before(async () => {
        await TestUtil.setupTests(mySandBox);
    });

    describe('importNodesToEnvironment', () => {

        beforeEach(async () => {
            showQuickPickStub = mySandBox.stub(UserInputUtil, 'showQuickPick');
            addMethodChooserStub = showQuickPickStub.withArgs('Choose a method to import nodes to an environment', [UserInputUtil.ADD_ENVIRONMENT_FROM_NODES, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS]);
            addMethodChooserStub.resolves(UserInputUtil.ADD_ENVIRONMENT_FROM_NODES);
            logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
            browseStub = mySandBox.stub(UserInputUtil, 'browse');
            addMoreStub = mySandBox.stub(UserInputUtil, 'addMoreNodes').resolves(UserInputUtil.DONE_ADDING_NODES);
            ensureDirStub = mySandBox.stub(fs, 'ensureDir').resolves();
            fsCopyStub = mySandBox.stub(fs, 'copy').resolves();

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

            OpsToolRegistryEntry = new FabricEnvironmentRegistryEntry();
            OpsToolRegistryEntry.name = 'myOpsToolInstance';
            OpsToolRegistryEntry.url = 'myURL';
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
            url = 'my/OpsTool/url';
            key = 'myOpsToolKey';
            secret = 'myOpsToolSecret';
            showInputBoxStub.withArgs('Enter the url of the ops tools you want to connect to').resolves(url);
            showInputBoxStub.withArgs('Enter the api key of the ops tools you want to connect to').resolves(key);
            showInputBoxStub.withArgs('Enter the api secret of the ops tools you want to connect to').resolves(secret);
            chooseCertVerificationStub = showQuickPickStub.withArgs('Unable to perform certificate verification. Please choose how to proceed', [UserInputUtil.ADD_CA_CERT_CHAIN, UserInputUtil.CONNECT_NO_CA_CERT_CHAIN]);
            chooseCertVerificationStub.resolves(UserInputUtil.ADD_CA_CERT_CHAIN);
            caCertChainUri = vscode.Uri.file(path.join('myCaCertPath'));
            browseStub.withArgs('Select CA certificate chain (.pem) file', sinon.match.any, sinon.match.any, sinon.match.any).resolves([caCertChainUri]);
            readFileStub = mySandBox.stub(fs, 'readFile');
            readFileStub.withArgs(caCertChainUri.fsPath, 'utf8').resolves('-----BEGIN CERTIFICATE-----\n-----END CERTIFICATE-----');

            certVerificationError = new Error('Certificate Verification Error');
            certVerificationError.code = 'DEPTH_ZERO_SELF_SIGNED_CERT';
            axiosGetStub.onFirstCall().rejects(certVerificationError);
            axiosGetStub.onSecondCall().resolves({ data: opsToolNodes });
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

        it('should test nodes can be added from URL and key when adding a new OpsTool instance', async () => {
            getNodesStub.onSecondCall().resolves(opsToolNodes);

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, environmentRegistryEntry, true, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);

            requireAsarModuleStub.should.have.been.calledOnce;
            ensureDirStub.should.have.been.calledTwice;
            updateNodeStub.should.have.been.calledTwice;
            getNodesStub.should.have.been.calledTwice;
            fsCopyStub.should.have.been.calledOnce;

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully imported all nodes');
        });

        it('should test nodes can be added to an existing OpsTool environment', async () => {
            getNodesStub.onSecondCall().resolves(opsToolNodes);
            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, OpsToolRegistryEntry, false);

            requireAsarModuleStub.should.have.been.calledOnce;
            ensureDirStub.should.have.been.calledTwice;
            updateNodeStub.should.have.been.calledTwice;
            getNodesStub.should.have.been.calledTwice;
            fsCopyStub.should.have.been.calledOnce;

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, OpsToolRegistryEntry);
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully imported all nodes');
        });

        it('should test nodes can be added to an existing OpsTool environment (on windows)', async () => {
            mySandBox.stub(process, 'platform').value('win32');
            getNodesStub.onSecondCall().resolves(opsToolNodes);
            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, OpsToolRegistryEntry, false);

            requireAsarModuleStub.should.have.been.calledOnce;
            ensureDirStub.should.have.been.calledTwice;
            updateNodeStub.should.have.been.calledTwice;
            getNodesStub.should.have.been.calledTwice;
            fsCopyStub.should.have.been.calledOnce;

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, OpsToolRegistryEntry);
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully imported all nodes');
        });

        it('should handle user cancelling when asked for url when creating an OpsTool instance', async () => {
            showInputBoxStub.withArgs('Enter the url of the ops tools you want to connect to').resolves(undefined);

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, environmentRegistryEntry, true, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);

            showInputBoxStub.withArgs('Enter the api key of the ops tools you want to connect to').should.not.have.been.called;
            axiosGetStub.should.not.have.been.called;
            ensureDirStub.should.have.not.been.called;
            updateNodeStub.should.not.have.been.called;
            getNodesStub.should.not.have.been.called;
            fsCopyStub.should.not.have.been.called;
            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'Import nodes to environment');
        });

        it('should handle user cancelling when asked for api key when creating an OpsTool instance', async () => {
            showInputBoxStub.withArgs('Enter the api key of the ops tools you want to connect to').resolves(undefined);

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, environmentRegistryEntry, true, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);

            showInputBoxStub.withArgs('Enter the api secret of the ops tools you want to connect to').should.not.have.been.called;
            axiosGetStub.should.not.have.been.called;
            ensureDirStub.should.have.not.been.called;
            updateNodeStub.should.not.have.been.called;
            getNodesStub.should.not.have.been.called;
            fsCopyStub.should.not.have.been.called;

            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'Import nodes to environment');
        });

        it('should handle when user cancels when asked for api secret when creating an OpsTool instance', async () => {
            showInputBoxStub.withArgs('Enter the api secret of the ops tools you want to connect to').resolves(undefined);

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, environmentRegistryEntry, true, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);

            axiosGetStub.should.not.have.been.called;
            ensureDirStub.should.have.not.been.called;
            updateNodeStub.should.not.have.been.called;
            getNodesStub.should.not.have.been.called;
            fsCopyStub.should.not.have.been.called;
            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'Import nodes to environment');
        });

        it('should handle when the keytar module is imported successfully through .asar when creating a new OpsTool instance', async () => {
            const requireModuleSpy: sinon.SinonSpy = mySandBox.spy(ExtensionUtil, 'getModule');

            getNodesStub.onSecondCall().resolves(opsToolNodes);

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, environmentRegistryEntry, true, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);

            ensureDirStub.should.have.been.calledTwice;
            updateNodeStub.should.have.been.calledTwice;
            getNodesStub.should.have.been.calledTwice;
            requireAsarModuleStub.should.have.been.calledOnce;
            requireModuleSpy.should.not.have.been.called;
            fsCopyStub.should.have.been.calledOnce;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully imported all nodes');
        });

        it('should handle when the keytar module is imported successfully (without .asar) when creating a new OpsTool instance', async () => {
            const error: Error = new Error('newError');
            requireAsarModuleStub.withArgs('keytar').throws(error);

            const requireModuleStub: sinon.SinonStub = mySandBox.stub(ExtensionUtil, 'getModule').returns({
                setPassword: setPasswordStub
              });

            getNodesStub.onSecondCall().resolves(opsToolNodes);

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, environmentRegistryEntry, true, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);

            ensureDirStub.should.have.been.calledTwice;
            updateNodeStub.should.have.been.calledTwice;
            getNodesStub.should.have.been.calledTwice;
            requireAsarModuleStub.should.have.been.calledOnce;
            requireModuleStub.should.have.been.calledOnce;
            fsCopyStub.should.have.been.calledOnce;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully imported all nodes');
        });

        it('should handle when the keytar module cannot be imported at all when creating a new OpsTool instance', async () => {
            const requireModuleStub: sinon.SinonStub = mySandBox.stub(ExtensionUtil, 'getModule');
            const error: Error = new Error('newError');
            requireAsarModuleStub.withArgs('keytar').throws(error);
            requireModuleStub.withArgs('keytar').throws(error);
            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, environmentRegistryEntry, true, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS).should.be.rejectedWith('Error importing the keytar module');

            requireAsarModuleStub.should.have.been.calledOnce;
            requireModuleStub.should.have.been.calledOnce;
            ensureDirStub.should.have.not.been.called;
            updateNodeStub.should.not.have.been.called;
            getNodesStub.should.not.have.been.called;
            fsCopyStub.should.not.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Error importing nodes: Error importing the keytar module`);
        });

        it('should handle when the api key and secret cannot be stored saved securely onto the keychain using the setPassword function when creating new OpsTool instance', async () => {
            const error: Error = new Error('newError');
            const caughtError: Error = new Error(`Unable to store the required credentials: ${error.message}`);
            setPasswordStub.throws(error);

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, environmentRegistryEntry, true, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS).should.be.rejectedWith(caughtError.message);

            requireAsarModuleStub.should.have.been.calledOnce;
            ensureDirStub.should.have.not.been.called;
            updateNodeStub.should.not.have.been.called;
            getNodesStub.should.not.have.been.called;
            fsCopyStub.should.have.not.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Failed to acquire nodes from ${url}, with error ${caughtError.message}`, `Failed to acquire nodes from ${url}, with error ${caughtError.toString()}`);
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

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, environmentRegistryEntry, true, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);

            requireAsarModuleStub.should.have.been.calledOnce;
            ensureDirStub.should.have.been.calledTwice;
            updateNodeStub.should.have.been.calledTwice;
            getNodesStub.should.have.been.calledTwice;
            fsCopyStub.should.have.been.calledOnce;

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully imported all nodes');
        });

        it('should handle user choosing not to perform certificate verification on a new Ops Tool instance', async () => {
            chooseCertVerificationStub.onFirstCall().resolves(UserInputUtil.CONNECT_NO_CA_CERT_CHAIN);

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, environmentRegistryEntry, true, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);

            readFileStub.withArgs(caCertChainUri.fsPath, 'utf8').should.have.not.been.called;
            ensureDirStub.should.have.been.calledOnce;
            updateNodeStub.should.have.been.calledTwice;
            getNodesStub.should.have.been.calledTwice;
            fsCopyStub.should.not.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully imported all nodes');
        });

        it('should handle CA certificate chain browse not returning array, on a new Ops Tool instance', async () => {
            browseStub.withArgs('Select CA certificate chain (.pem) file', sinon.match.any, sinon.match.any, sinon.match.any).resolves(caCertChainUri);

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, environmentRegistryEntry, true, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);

            readFileStub.withArgs(caCertChainUri.fsPath, 'utf8').should.have.been.calledOnce;
            ensureDirStub.should.have.been.calledTwice;
            updateNodeStub.should.have.been.calledTwice;
            getNodesStub.should.have.been.calledTwice;
            fsCopyStub.should.have.been.calledOnce;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully imported all nodes');
        });

        it('should handle when user cancels when asked to choose certificate verification methtod when creating an OpsTool instance', async () => {
            chooseCertVerificationStub.resolves();
            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, environmentRegistryEntry, true, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);

            axiosGetStub.should.have.have.been.calledOnce;
            ensureDirStub.should.have.not.been.called;
            updateNodeStub.should.not.have.been.called;
            getNodesStub.should.not.have.been.called;
            fsCopyStub.should.not.have.been.called;
            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'Import nodes to environment');
        });

        it('should handle when user cancels after choosing to provide a certificate chain when creating an OpsTool instance', async () => {
            browseStub.withArgs('Select CA certificate chain (.pem) file', sinon.match.any, sinon.match.any, sinon.match.any).resolves();
            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, environmentRegistryEntry, true, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);

            axiosGetStub.should.have.have.been.calledOnce;
            ensureDirStub.should.have.not.been.called;
            updateNodeStub.should.not.have.been.called;
            getNodesStub.should.not.have.been.called;
            fsCopyStub.should.not.have.been.called;
            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'Import nodes to environment');
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

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, environmentRegistryEntry, true, UserInputUtil.ADD_ENVIRONMENT_FROM_NODES);

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
            logSpy.getCall(2).should.have.been.calledWith(LogType.WARNING, 'Finished importing nodes but some nodes could not be added');
        });

        it('should handle error connecting to Ops Tool URL when adding nodes to existing environment', async () => {
            getNodesStub.onSecondCall().resolves([]);
            const connectionError: Error = new Error('some error');
            const executionError: Error = new Error('no nodes were added');
            axiosGetStub.onFirstCall().rejects(connectionError);

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, OpsToolRegistryEntry, false);

            requireAsarModuleStub.should.have.been.calledOnce;
            ensureDirStub.should.have.been.calledOnce;
            updateNodeStub.should.not.have.been.called;
            getNodesStub.should.have.been.calledTwice;
            fsCopyStub.should.not.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Failed to acquire nodes from ${url}, with error ${connectionError.message}`, `Failed to acquire nodes from ${url}, with error ${connectionError.toString()}`);
            logSpy.getCall(2).should.have.been.calledWith(LogType.ERROR, `Error importing nodes: ${executionError.message}`);
        });

        it('should handle error connecting to Ops Tool URL when adding nodes via add environment', async () => {
            const error: Error = new Error('some error');
            axiosGetStub.onFirstCall().rejects(error);

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, environmentRegistryEntry, true, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS).should.eventually.be.rejectedWith(error);

            requireAsarModuleStub.should.have.been.calledOnce;
            ensureDirStub.should.have.not.been.called;
            updateNodeStub.should.not.have.been.called;
            getNodesStub.should.not.have.been.called;
            fsCopyStub.should.not.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Failed to acquire nodes from ${url}, with error ${error.message}`, `Failed to acquire nodes from ${url}, with error ${error.toString()}`);
            logSpy.getCall(2).should.have.been.calledWith(LogType.ERROR, `Error importing nodes: ${error.message}`);
        });

        it('should handle user not choosing any nodes from a new Ops Tool instance', async () => {
            showNodesQuickPickBoxStub.resolves([]);

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, environmentRegistryEntry, true, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);

            ensureDirStub.should.have.been.calledOnce;
            updateNodeStub.should.not.have.been.called;
            getNodesStub.should.not.have.been.called;
            fsCopyStub.should.have.been.calledOnce;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS, 'Successfully imported all nodes');
        });

        it('should handle user choosing a subset of nodes from Ops Tool from a new Ops Tool instance', async () => {
            showNodesQuickPickBoxStub.resolves({ label: opsToolNodes[0].display_name, data: opsToolNodes[0] });

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, environmentRegistryEntry, true, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);

            requireAsarModuleStub.should.have.been.calledOnce;
            ensureDirStub.should.have.been.calledTwice;
            updateNodeStub.should.have.been.called;
            getNodesStub.should.have.been.calledTwice;
            fsCopyStub.should.have.been.calledOnce;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Import nodes to environment');
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully imported all nodes');
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
            const expectedNodesHidden: any[] = expectedNodes.map((_node: FabricNode) => ({short_name: _node.short_name, hidden: _node.hidden}));

            const savedNodes: FabricNode[] = [];
            updateNodeStub.callsFake( (_node: FabricNode) => { savedNodes.push(_node); });

            await vscode.commands.executeCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, OpsToolRegistryEntry, true, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);

            const savedNodesHidden: any[] = expectedNodes.map((_node: FabricNode) => ({short_name: _node.short_name, hidden: _node.hidden}));
            savedNodesHidden.should.deep.equal(expectedNodesHidden);

            requireAsarModuleStub.should.have.been.calledOnce;
            ensureDirStub.should.have.been.calledTwice;
            updateNodeStub.should.have.been.called;
            getNodesStub.should.have.been.calledTwice;
            fsCopyStub.should.have.been.calledOnce;
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
