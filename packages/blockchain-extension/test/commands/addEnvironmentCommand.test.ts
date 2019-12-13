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
import * as fs from 'fs-extra';
import * as path from 'path';
import Axios from 'axios';
import { TestUtil } from '../TestUtil';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { ExtensionCommands } from '../../ExtensionCommands';
import { Reporter } from '../../extension/util/Reporter';
import { FabricEnvironmentRegistry, FabricEnvironmentRegistryEntry, LogType } from 'ibm-blockchain-platform-common';
import { UserInputUtil } from '../../extension/commands/UserInputUtil';
import { ModuleUtil } from '../../extension/util/ModuleUtil';

// tslint:disable no-unused-expression
chai.should();
chai.use(sinonChai);

describe('AddEnvironmentCommand', () => {
    let mySandBox: sinon.SinonSandbox;
    let logSpy: sinon.SinonSpy;
    let showInputBoxStub: sinon.SinonStub;
    let chooseNameStub: sinon.SinonStub;
    let chooseMethodStub: sinon.SinonStub;
    let executeCommandStub: sinon.SinonStub;
    let sendTelemetryEventStub: sinon.SinonStub;
    let browseStub: sinon.SinonStub;
    let axiosGetStub: sinon.SinonStub;
    let showQuickPickStub: sinon.SinonStub;
    let chooseCertVerificationStub: sinon.SinonStub;
    let readFileStub: sinon.SinonStub;
    let fsCopyStub: sinon.SinonStub;
    let setPasswordStub: sinon.SinonStub;
    let getCoreNodeModuleStub: sinon.SinonStub;
    let deleteEnvironmentSpy: sinon.SinonSpy;
    let url: string;
    let key: string;
    let secret: string;
    let certVerificationError: any;
    let caCertChainUri: vscode.Uri;

    before(async () => {
        mySandBox = sinon.createSandbox();
        await TestUtil.setupTests(mySandBox);
    });

    describe('addEnvironment', () => {

        beforeEach(async () => {
            await FabricEnvironmentRegistry.instance().clear();
            logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
            showQuickPickStub = mySandBox.stub(UserInputUtil, 'showQuickPick');
            chooseMethodStub = showQuickPickStub.withArgs('Choose a method to import nodes to an environment', [UserInputUtil.ADD_ENVIRONMENT_FROM_NODES, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS]);
            chooseMethodStub.resolves(UserInputUtil.ADD_ENVIRONMENT_FROM_NODES);
            showInputBoxStub = mySandBox.stub(UserInputUtil, 'showInputBox');
            chooseNameStub = showInputBoxStub.withArgs('Enter a name for the environment');
            chooseNameStub.resolves('myEnvironment');
            executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand').callThrough();
            executeCommandStub.withArgs(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT).resolves(true);
            executeCommandStub.withArgs(ExtensionCommands.EDIT_NODE_FILTERS).resolves(true);
            executeCommandStub.withArgs(ExtensionCommands.REFRESH_ENVIRONMENTS).resolves();
            sendTelemetryEventStub = mySandBox.stub(Reporter.instance(), 'sendTelemetryEvent');
            deleteEnvironmentSpy = mySandBox.spy(FabricEnvironmentRegistry.instance(), 'delete');

            // Ops tools requirements
            browseStub = mySandBox.stub(UserInputUtil, 'browse');
            fsCopyStub = mySandBox.stub(fs, 'copy').resolves();
            axiosGetStub = mySandBox.stub(Axios, 'get');

            url = 'my/OpsTool/url';
            key = 'myOpsToolKey';
            secret = 'myOpsToolSecret';
            showInputBoxStub.withArgs('Enter the url of the ops tools you want to connect to').resolves(url);
            showInputBoxStub.withArgs('Enter the api key of the ops tools you want to connect to').resolves(key);
            showInputBoxStub.withArgs('Enter the api secret of the ops tools you want to connect to').resolves(secret);
            chooseCertVerificationStub = showQuickPickStub.withArgs('Unable to perform certificate verification. Please choose how to proceed', [UserInputUtil.ADD_CA_CERT_CHAIN, UserInputUtil.CONNECT_NO_CA_CERT_CHAIN]);
            chooseCertVerificationStub.resolves(UserInputUtil.ADD_CA_CERT_CHAIN);
            caCertChainUri = vscode.Uri.file(path.join('myCaCertPath.pem'));
            browseStub.withArgs('Select CA certificate chain (.pem) file', sinon.match.any, sinon.match.any, sinon.match.any).resolves([caCertChainUri]);
            readFileStub = mySandBox.stub(fs, 'readFile');
            readFileStub.withArgs(caCertChainUri.fsPath, 'utf8').resolves('-----BEGIN CERTIFICATE-----\n-----END CERTIFICATE-----');
            certVerificationError = new Error('Certificate Verification Error');
            certVerificationError.code = 'DEPTH_ZERO_SELF_SIGNED_CERT';
            axiosGetStub.onFirstCall().rejects(certVerificationError);
            axiosGetStub.onSecondCall().resolves();
            setPasswordStub = mySandBox.stub().resolves();
            getCoreNodeModuleStub = mySandBox.stub(ModuleUtil, 'getCoreNodeModule').returns({setPassword: setPasswordStub});
        });

        afterEach(async () => {
            mySandBox.restore();
        });

        it('should test an Ops Tools environment can be added', async () => {
            chooseMethodStub.resolves(UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);
            chooseNameStub.onFirstCall().resolves('myOpsToolsEnvironment');
            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            const environments: Array<FabricEnvironmentRegistryEntry> = await FabricEnvironmentRegistry.instance().getAll();

            environments.length.should.equal(1);
            environments[0].should.deep.equal({
                name: 'myOpsToolsEnvironment',
                url: url
            });

            fsCopyStub.should.have.been.calledOnce;
            deleteEnvironmentSpy.should.have.not.been.called;
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.EDIT_NODE_FILTERS, sinon.match.instanceOf(FabricEnvironmentRegistryEntry), true, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new environment');
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('addEnvironmentCommand');
        });

        it('should test adding a environment can be cancelled when choosing the method of adding environment', async () => {
            chooseMethodStub.resolves(undefined);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            const environments: Array<FabricEnvironmentRegistryEntry> = await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(0);
            showInputBoxStub.should.not.have.been.called;
            deleteEnvironmentSpy.should.have.not.been.called;
            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'Add environment');
            sendTelemetryEventStub.should.not.have.been.called;
        });

        it('should test an environment can be added', async () => {
            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            const environments: Array<FabricEnvironmentRegistryEntry> = await FabricEnvironmentRegistry.instance().getAll();

            environments.length.should.equal(1);
            environments[0].should.deep.equal({
                name: 'myEnvironment'
            });

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, sinon.match.instanceOf(FabricEnvironmentRegistryEntry), true, UserInputUtil.ADD_ENVIRONMENT_FROM_NODES);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);

            deleteEnvironmentSpy.should.have.not.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new environment');
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('addEnvironmentCommand');
        });

        it('should test multiple environments can be added', async () => {
            chooseNameStub.onFirstCall().resolves('myEnvironmentOne');

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            chooseNameStub.reset();
            chooseNameStub.onFirstCall().resolves('myEnvironmentTwo');

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            const environments: Array<FabricEnvironmentRegistryEntry> = await FabricEnvironmentRegistry.instance().getAll();

            environments.length.should.equal(2);
            environments[0].should.deep.equal({
                name: 'myEnvironmentOne'
            });

            environments[1].should.deep.equal({
                name: 'myEnvironmentTwo'
            });

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, sinon.match.instanceOf(FabricEnvironmentRegistryEntry), true, UserInputUtil.ADD_ENVIRONMENT_FROM_NODES);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);
            deleteEnvironmentSpy.should.have.not.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new environment');
            logSpy.getCall(2).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(3).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new environment');
            sendTelemetryEventStub.should.have.been.calledTwice;
            sendTelemetryEventStub.should.have.been.calledWithExactly('addEnvironmentCommand');
        });

        it('should test adding a environment can be cancelled when giving a environment name', async () => {
            chooseNameStub.onFirstCall().resolves();

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            const environments: Array<FabricEnvironmentRegistryEntry> = await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(0);
            deleteEnvironmentSpy.should.have.not.been.called;
            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'Add environment');
            sendTelemetryEventStub.should.not.have.been.called;
        });

        it('should handle errors when adding nodes to an environment', async () => {
            const error: Error = new Error('some error');
            executeCommandStub.withArgs(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT).rejects(error);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            const environments: Array<FabricEnvironmentRegistryEntry> = await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(0);
            logSpy.should.have.been.calledTwice;
            deleteEnvironmentSpy.should.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Failed to add a new environment: ${error.message}`, `Failed to add a new environment: ${error.toString()}`);
            sendTelemetryEventStub.should.not.have.been.called;
        });

        it('should handle errors when adding nodes to an Ops Tools environment', async () => {
            chooseMethodStub.resolves(UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);
            chooseNameStub.onFirstCall().resolves('myOpsToolsEnvironment');
            const error: Error = new Error('some error');
            executeCommandStub.withArgs(ExtensionCommands.EDIT_NODE_FILTERS).rejects(error);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            const environments: Array<FabricEnvironmentRegistryEntry> = await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(0);
            logSpy.should.have.been.calledTwice;
            deleteEnvironmentSpy.should.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Failed to add a new environment: ${error.message}`, `Failed to add a new environment: ${error.toString()}`);
            sendTelemetryEventStub.should.not.have.been.called;
        });

        it('should error if a environment with the same name already exists', async () => {
            const error: Error = new Error('An environment with this name already exists.');
            chooseNameStub.resolves('myEnvironmentOne');

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            const environments: Array<FabricEnvironmentRegistryEntry> = await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(1);
            environments[0].should.deep.equal({
                name: 'myEnvironmentOne'
            });

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, sinon.match.instanceOf(FabricEnvironmentRegistryEntry));
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);

            deleteEnvironmentSpy.should.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new environment');
            logSpy.getCall(2).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(3).should.have.been.calledWith(LogType.ERROR, `Failed to add a new environment: ${error.message}`, `Failed to add a new environment: ${error.toString()}`);
            sendTelemetryEventStub.should.have.been.calledOnce;
        });

        it('should add environment but warn if nodes are not valid', async () => {
            executeCommandStub.withArgs(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT).resolves(false);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            const environments: Array<FabricEnvironmentRegistryEntry> = await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(1);
            environments[0].should.deep.equal({
                name: 'myEnvironment'
            });

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, sinon.match.instanceOf(FabricEnvironmentRegistryEntry), true, UserInputUtil.ADD_ENVIRONMENT_FROM_NODES);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);

            deleteEnvironmentSpy.should.have.not.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.should.have.been.calledWith(LogType.WARNING, 'Added a new environment, but some nodes could not be added');
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('addEnvironmentCommand');
        });

        it('should cancel environment creation if no nodes have been added', async () => {
            executeCommandStub.withArgs(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT).resolves(undefined);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            const environments: Array<FabricEnvironmentRegistryEntry> = await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(0);
            deleteEnvironmentSpy.should.have.been.called;
            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'Add environment');
            sendTelemetryEventStub.should.not.have.been.called;
        });

        it('should handle user cancelling when asked for url when creating an OpsTool instance', async () => {
            chooseMethodStub.resolves(UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);
            chooseNameStub.onFirstCall().resolves('myOpsToolsEnvironment');
            showInputBoxStub.withArgs('Enter the url of the ops tools you want to connect to').resolves(undefined);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            const environments: Array<FabricEnvironmentRegistryEntry> = await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(0);
            showInputBoxStub.withArgs('Enter the api key of the ops tools you want to connect to').should.not.have.been.called;
            showInputBoxStub.withArgs('Enter the api secret of the ops tools you want to connect to').should.not.have.been.called;
            axiosGetStub.should.not.have.been.called;
            fsCopyStub.should.not.have.been.called;
            deleteEnvironmentSpy.should.have.not.been.called;
            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'Add environment');
        });

        it('should handle user cancelling when asked for api key when creating an OpsTool instance', async () => {
            chooseMethodStub.resolves(UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);
            chooseNameStub.onFirstCall().resolves('myOpsToolsEnvironment');
            showInputBoxStub.withArgs('Enter the api key of the ops tools you want to connect to').resolves(undefined);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            const environments: Array<FabricEnvironmentRegistryEntry> = await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(0);
            showInputBoxStub.withArgs('Enter the api secret of the ops tools you want to connect to').should.not.have.been.called;
            axiosGetStub.should.not.have.been.called;
            fsCopyStub.should.not.have.been.called;
            deleteEnvironmentSpy.should.have.not.been.called;
            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'Add environment');
        });

        it('should handle when user cancels when asked for api secret when creating an OpsTool instance', async () => {
            chooseMethodStub.resolves(UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);
            chooseNameStub.onFirstCall().resolves('myOpsToolsEnvironment');
            showInputBoxStub.withArgs('Enter the api secret of the ops tools you want to connect to').resolves(undefined);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            const environments: Array<FabricEnvironmentRegistryEntry> = await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(0);
            axiosGetStub.should.not.have.been.called;
            fsCopyStub.should.not.have.been.called;
            deleteEnvironmentSpy.should.have.not.been.called;
            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'Add environment');
        });

        it('should handle when the keytar module cannot be imported at all when creating a new OpsTool instance', async () => {
            chooseMethodStub.resolves(UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);
            chooseNameStub.onFirstCall().resolves('myOpsToolsEnvironment');
            getCoreNodeModuleStub.withArgs('keytar').returns(undefined);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            const environments: Array<FabricEnvironmentRegistryEntry> = await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(0);

            getCoreNodeModuleStub.should.have.been.calledOnce;
            fsCopyStub.should.not.have.been.called;
            deleteEnvironmentSpy.should.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Failed to add a new environment: Error importing the keytar module`, `Failed to add a new environment: Error: Error importing the keytar module`);
        });

        it('should handle when the api key and secret cannot be stored saved securely onto the keychain using the setPassword function when creating new OpsTool instance', async () => {
            chooseMethodStub.resolves(UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);
            chooseNameStub.onFirstCall().resolves('myOpsToolsEnvironment');
            const error: Error = new Error('newError');
            const caughtError: Error = new Error(`Unable to store the required credentials: ${error.message}`);
            setPasswordStub.throws(error);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            getCoreNodeModuleStub.should.have.been.calledOnce;
            fsCopyStub.should.have.not.been.called;
            deleteEnvironmentSpy.should.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Failed to add a new environment: ${caughtError.message}`, `Failed to add a new environment: ${caughtError.toString()}`);
        });

        it('should handle when the ca certificate chain cannot be copied into the environment base directory when creating new OpsTool instance', async () => {
            chooseMethodStub.resolves(UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);
            chooseNameStub.onFirstCall().resolves('myOpsToolsEnvironment');
            const error: Error = new Error('Unable to copy file');
            const caughtError: Error = new Error(`Unable to store the required credentials: ${error.message}`);
            fsCopyStub.rejects(error);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            getCoreNodeModuleStub.should.have.been.calledOnce;
            fsCopyStub.should.have.been.calledOnce;
            deleteEnvironmentSpy.should.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Failed to add a new environment: ${caughtError.message}`, `Failed to add a new environment: ${caughtError.toString()}`);
        });

        it('should handle user choosing not to perform certificate verification on a new Ops Tool instance', async () => {
            chooseMethodStub.resolves(UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);
            chooseNameStub.onFirstCall().resolves('myOpsToolsEnvironment');
            chooseCertVerificationStub.onFirstCall().resolves(UserInputUtil.CONNECT_NO_CA_CERT_CHAIN);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            readFileStub.withArgs(caCertChainUri.fsPath, 'utf8').should.have.not.been.called;
            fsCopyStub.should.not.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new environment');
        });

        it('should handle CA certificate chain browse not returning array, on a new Ops Tool instance (win32)', async () => {
            mySandBox.stub(process, 'platform').value('win32');
            chooseMethodStub.resolves(UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);
            chooseNameStub.onFirstCall().resolves('myOpsToolsEnvironment');
            browseStub.withArgs('Select CA certificate chain (.pem) file', sinon.match.any, sinon.match.any, sinon.match.any).resolves(caCertChainUri);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            readFileStub.withArgs(caCertChainUri.fsPath, 'utf8').should.have.been.calledOnce;
            fsCopyStub.should.have.been.calledOnce;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new environment');
        });

        it('should handle when user cancels when asked to choose certificate verification methtod when creating an OpsTool instance', async () => {
            chooseMethodStub.resolves(UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);
            chooseNameStub.onFirstCall().resolves('myOpsToolsEnvironment');
            chooseCertVerificationStub.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            axiosGetStub.should.have.have.been.calledOnce;
            fsCopyStub.should.not.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
        });

        it('should handle when user cancels after choosing to provide a certificate chain when creating an OpsTool instance', async () => {
            chooseMethodStub.resolves(UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);
            chooseNameStub.onFirstCall().resolves('myOpsToolsEnvironment');
            browseStub.withArgs('Select CA certificate chain (.pem) file', sinon.match.any, sinon.match.any, sinon.match.any).resolves();

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            axiosGetStub.should.have.have.been.calledOnce;
            fsCopyStub.should.not.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
        });

        it('should handle error connecting to Ops Tool URL when adding environment', async () => {
            chooseMethodStub.resolves(UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);
            chooseNameStub.onFirstCall().resolves('myOpsToolsEnvironment');
            const error: Error = new Error('some error');
            axiosGetStub.onFirstCall().rejects(error);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            getCoreNodeModuleStub.should.have.been.calledOnce;
            fsCopyStub.should.not.have.been.called;
            deleteEnvironmentSpy.should.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Failed to add a new environment: ${error.message}`, `Failed to add a new environment: ${error.toString()}`);

        });

        it('should handle user not choosing any nodes from a new Ops Tool instance', async () => {
            chooseMethodStub.resolves(UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);
            chooseNameStub.onFirstCall().resolves('myOpsToolsEnvironment');
            executeCommandStub.withArgs(ExtensionCommands.EDIT_NODE_FILTERS).resolves();

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            fsCopyStub.should.have.been.calledOnce;
            deleteEnvironmentSpy.should.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new environment');
        });

    });
});
