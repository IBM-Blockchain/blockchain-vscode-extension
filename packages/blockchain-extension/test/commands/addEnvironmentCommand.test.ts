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
import * as path from 'path';
import Axios from 'axios';
import { TestUtil } from '../TestUtil';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { ExtensionCommands } from '../../ExtensionCommands';
import { Reporter } from '../../extension/util/Reporter';
import { FabricEnvironmentRegistry, FabricEnvironmentRegistryEntry, LogType, EnvironmentType, FabricEnvironment, FabricRuntimeUtil } from 'ibm-blockchain-platform-common';
import { LocalEnvironment } from '../../extension/fabric/environments/LocalEnvironment';
import { LocalEnvironmentManager } from '../../extension/fabric/environments/LocalEnvironmentManager';
import { UserInputUtil} from '../../extension/commands/UserInputUtil';
import { ModuleUtil } from '../../extension/util/ModuleUtil';
import { SettingConfigurations } from '../../extension/configurations';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';
import { ExtensionData, GlobalState } from '../../extension/util/GlobalState';
import { ExtensionsInteractionUtil } from '../../extension/util/ExtensionsInteractionUtil';

// tslint:disable no-unused-expression
chai.should();
chai.use(sinonChai);

describe('AddEnvironmentCommand', () => {
    let mySandBox: sinon.SinonSandbox;
    let logSpy: sinon.SinonSpy;
    let showInputBoxStub: sinon.SinonStub;
    let chooseNameStub: sinon.SinonStub;
    let executeCommandStub: sinon.SinonStub;
    let sendTelemetryEventStub: sinon.SinonStub;
    let showQuickPickItemStub: sinon.SinonStub;
    let deleteEnvironmentSpy: sinon.SinonSpy;
    let openFileBrowserStub: sinon.SinonStub;
    let environmentDirectoryPath: string;
    let axiosGetStub: sinon.SinonStub;
    let chooseCertVerificationStub: sinon.SinonStub;
    let setPasswordStub: sinon.SinonStub;
    let getCoreNodeModuleStub: sinon.SinonStub;
    let getNodesStub: sinon.SinonStub;
    let url: string;
    let userAuth1: string;
    let userAuth2: string;
    let certVerificationError: any;
    let certVerificationError2: any;
    let chooseMethodStub: sinon.SinonStub;
    let getExtensionLocalFabricSettingStub: sinon.SinonStub;
    let removeRuntimeSpy: sinon.SinonSpy;
    let originalSaaSName: string;
    let showQuickPickYesNoStub: sinon.SinonStub;
    let cloudAccountGetAccessTokenStub: sinon.SinonStub;
    let chooseBlockchainStub: sinon.SinonStub;
    let resourcesResponseMock: any;
    let consoleStatusMock: any;
    let urlSaaS: string;
    let accessToken: string;

    before(async () => {
        mySandBox = sinon.createSandbox();
        await TestUtil.setupTests(mySandBox);
    });

    describe('addEnvironment', () => {

        beforeEach(async () => {
            try {
                const localEnvironment: LocalEnvironment = LocalEnvironmentManager.instance().getRuntime(FabricRuntimeUtil.LOCAL_FABRIC);
                if (localEnvironment) {
                    await localEnvironment.teardown();
                }
            } catch (err) {
                //
            }

            await FabricEnvironmentRegistry.instance().clear();
            logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
            showQuickPickItemStub = mySandBox.stub(UserInputUtil, 'showQuickPickItem');
            chooseMethodStub = showQuickPickItemStub.withArgs('Select a method to add an environment');
            chooseMethodStub.resolves({data: UserInputUtil.ADD_ENVIRONMENT_FROM_NODES});
            environmentDirectoryPath = path.join(__dirname, '..', '..', '..', 'test', 'data', 'managedAnsible');
            const uri: vscode.Uri = vscode.Uri.file(environmentDirectoryPath);
            openFileBrowserStub = mySandBox.stub(UserInputUtil, 'openFileBrowser').resolves(uri);
            showInputBoxStub = mySandBox.stub(UserInputUtil, 'showInputBox');
            chooseNameStub = showInputBoxStub.withArgs('Enter a name for the environment', sinon.match.any);
            chooseNameStub.resolves('myEnvironment');
            executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand').callThrough();
            executeCommandStub.withArgs(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT).resolves(true);
            executeCommandStub.withArgs(ExtensionCommands.EDIT_NODE_FILTERS).resolves(true);
            executeCommandStub.withArgs(ExtensionCommands.REFRESH_ENVIRONMENTS).resolves();
            executeCommandStub.withArgs(ExtensionCommands.REFRESH_GATEWAYS).resolves();
            executeCommandStub.withArgs(ExtensionCommands.REFRESH_WALLETS).resolves();
            executeCommandStub.withArgs(ExtensionCommands.START_FABRIC).resolves();
            executeCommandStub.withArgs('markdown.showPreview').resolves();
            sendTelemetryEventStub = mySandBox.stub(Reporter.instance(), 'sendTelemetryEvent');
            deleteEnvironmentSpy = mySandBox.spy(FabricEnvironmentRegistry.instance(), 'delete');

            // Ops tools requirements
            axiosGetStub = mySandBox.stub(Axios, 'get');
            showQuickPickYesNoStub = mySandBox.stub(UserInputUtil, 'showQuickPickYesNo').callThrough();
            showQuickPickYesNoStub.withArgs('Are you connecting to a service instance on IBM Cloud?').resolves(UserInputUtil.NO);

            url = 'https://my.OpsTool.url';
            userAuth1 = 'myOpsToolKey';
            userAuth2 = 'myOpsToolSecret';
            showInputBoxStub.withArgs('Enter the URL of the IBM Blockchain Platform Console you want to connect to').resolves(url);
            showInputBoxStub.withArgs('Enter the API key or the User ID of the IBM Blockchain Platform Console you want to connect to').resolves(userAuth1);
            showInputBoxStub.withArgs('Enter the API secret or the password of the IBM Blockchain Platform Console you want to connect to').resolves(userAuth2);
            chooseCertVerificationStub = showQuickPickItemStub.withArgs('Unable to perform certificate verification. Please choose how to proceed', [{ label: UserInputUtil.CONNECT_NO_CA_CERT_CHAIN, data: UserInputUtil.CONNECT_NO_CA_CERT_CHAIN }, { label: UserInputUtil.CANCEL_NO_CERT_CHAIN, data: UserInputUtil.CANCEL_NO_CERT_CHAIN, description: UserInputUtil.CANCEL_NO_CERT_CHAIN_DESCRIPTION }]);
            chooseCertVerificationStub.resolves({ label: UserInputUtil.CONNECT_NO_CA_CERT_CHAIN, data: UserInputUtil.CONNECT_NO_CA_CERT_CHAIN });
            certVerificationError = new Error('Certificate Verification Error');
            certVerificationError.code = 'SOME_CODE';
            certVerificationError2 = new Error('Certificate Verification Error');
            certVerificationError2.response = {status: 401};
            axiosGetStub.onFirstCall().rejects(certVerificationError);
            axiosGetStub.onSecondCall().rejects(certVerificationError2);
            axiosGetStub.onThirdCall().resolves();
            setPasswordStub = mySandBox.stub().resolves();
            getCoreNodeModuleStub = mySandBox.stub(ModuleUtil, 'getCoreNodeModule').returns({setPassword: setPasswordStub});
            getNodesStub = mySandBox.stub(FabricEnvironment.prototype, 'getNodes');
            getNodesStub.resolves([{nodeOneData: {}}, {nodeTwoData: {}}]);
            getExtensionLocalFabricSettingStub = mySandBox.stub(ExtensionUtil, 'getExtensionLocalFabricSetting');
            getExtensionLocalFabricSettingStub.returns(true);

            // SaaS Ops tools requirements
            urlSaaS = 'https://my.SaaS.OpsTool.url';
            originalSaaSName = 'myBlockchainPlatform';
            accessToken = 'some token';
            cloudAccountGetAccessTokenStub = mySandBox.stub(ExtensionsInteractionUtil, 'cloudAccountGetAccessToken').resolves(accessToken);
            chooseBlockchainStub = showQuickPickItemStub.withArgs('Select an IBM Blockchain Platform service instance', sinon.match.any).callThrough();

            resourcesResponseMock = {
                data: {
                        next_url: null,
                        resources: [{
                                        resource_plan_id: 'blockchain-standard',
                                        name: originalSaaSName,
                                        guid: 'someGUID1',
                                        dashboard_url: 'https://some.dashboard.url1/some/path'
                                    }, {
                                        resource_plan_id: 'otherService-standard',
                                        name: 'myOtherService',
                                        guid: 'someGUID2',
                                        dashboard_url: 'https://some.dashboard.url2/some/path'
                                    }]
                }
            };

            consoleStatusMock = {
                status: 200,
                data: {
                    endpoint: urlSaaS
                }
            };

            removeRuntimeSpy = mySandBox.spy(LocalEnvironmentManager.instance(), 'removeRuntime');
        });

        afterEach(async () => {
            mySandBox.restore();
        });

        it('should test an Ops Tools environment can be added', async () => {

            chooseMethodStub.resolves({data: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS});
            chooseNameStub.onFirstCall().resolves('myOpsToolsEnvironment');

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            const environments: Array<FabricEnvironmentRegistryEntry> = await FabricEnvironmentRegistry.instance().getAll();

            environments.length.should.equal(1);
            environments[0].should.deep.equal({
                name: 'myOpsToolsEnvironment',
                url: url,
                environmentType: EnvironmentType.OPS_TOOLS_ENVIRONMENT
            });

            deleteEnvironmentSpy.should.have.not.been.called;
            removeRuntimeSpy.should.not.have.been.called;

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
            removeRuntimeSpy.should.not.have.been.called;

            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'Add environment');
            sendTelemetryEventStub.should.not.have.been.called;
        });

        it('should test an environment can be added', async () => {
            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            const environments: Array<FabricEnvironmentRegistryEntry> = await FabricEnvironmentRegistry.instance().getAll();

            environments.length.should.equal(1);
            environments[0].should.deep.equal({
                name: 'myEnvironment',
                environmentType: EnvironmentType.ENVIRONMENT
            });

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, sinon.match.instanceOf(FabricEnvironmentRegistryEntry), true, UserInputUtil.ADD_ENVIRONMENT_FROM_NODES);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);

            deleteEnvironmentSpy.should.have.not.been.called;
            removeRuntimeSpy.should.not.have.been.called;

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
                name: 'myEnvironmentOne',
                environmentType: EnvironmentType.ENVIRONMENT
            });

            environments[1].should.deep.equal({
                name: 'myEnvironmentTwo',
                environmentType: EnvironmentType.ENVIRONMENT
            });

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, sinon.match.instanceOf(FabricEnvironmentRegistryEntry), true, UserInputUtil.ADD_ENVIRONMENT_FROM_NODES);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);
            deleteEnvironmentSpy.should.have.not.been.called;
            removeRuntimeSpy.should.not.have.been.called;

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new environment');
            logSpy.getCall(2).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(3).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new environment');
            sendTelemetryEventStub.should.have.been.calledTwice;
            sendTelemetryEventStub.should.have.been.calledWithExactly('addEnvironmentCommand');
        });

        it('should handle cancel when choosing a method', async () => {
            chooseMethodStub.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            await FabricEnvironmentRegistry.instance().exists('myEnvironment').should.eventually.equal(false);

            logSpy.callCount.should.equal(1);
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            sendTelemetryEventStub.should.not.have.been.calledOnceWithExactly('addEnvironmentCommand');
        });

        it('should test adding a environment can be cancelled when giving a environment name', async () => {
            chooseNameStub.onFirstCall().resolves();

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            const environments: Array<FabricEnvironmentRegistryEntry> = await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(0);
            deleteEnvironmentSpy.should.have.not.been.called;
            removeRuntimeSpy.should.not.have.been.called;

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
            removeRuntimeSpy.should.not.have.been.called;

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Failed to add a new environment: ${error.message}`, `Failed to add a new environment: ${error.toString()}`);
            sendTelemetryEventStub.should.not.have.been.called;
        });

        it('should handle errors when adding nodes to an Ops Tools environment', async () => {
            chooseMethodStub.resolves({data: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS});
            chooseNameStub.onFirstCall().resolves('myOpsToolsEnvironment');
            const error: Error = new Error('some error');
            executeCommandStub.withArgs(ExtensionCommands.EDIT_NODE_FILTERS).rejects(error);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            const environments: Array<FabricEnvironmentRegistryEntry> = await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(0);
            logSpy.should.have.been.calledTwice;
            deleteEnvironmentSpy.should.have.been.called;
            removeRuntimeSpy.should.not.have.been.called;

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Failed to add a new environment: ${error.message}`, `Failed to add a new environment: ${error.toString()}`);
            sendTelemetryEventStub.should.not.have.been.called;
        });

        it('should error if a environment with the same name already exists', async () => {
            const error: Error = new Error('An environment with this name already exists or is too similar.');
            chooseNameStub.resolves('myEnvironmentOne');

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            const environments: Array<FabricEnvironmentRegistryEntry> = await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(1);
            environments[0].should.deep.equal({
                name: 'myEnvironmentOne',
                environmentType: EnvironmentType.ENVIRONMENT
            });

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, sinon.match.instanceOf(FabricEnvironmentRegistryEntry));
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);

            deleteEnvironmentSpy.should.not.have.been.called;
            removeRuntimeSpy.should.not.have.been.called;

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new environment');
            logSpy.getCall(2).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(3).should.have.been.calledWith(LogType.ERROR, `Failed to add a new environment: ${error.message}`, `Failed to add a new environment: ${error.toString()}`);
            sendTelemetryEventStub.should.have.been.calledOnce;
        });

        it('should error if a environment with the same docker name already exists', async () => {
            const error: Error = new Error('An environment with this name already exists or is too similar.');
            chooseNameStub.onCall(0).resolves('myEnvironmentOne');
            chooseNameStub.onCall(1).resolves('my-Environment-One');
            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            const environments: Array<FabricEnvironmentRegistryEntry> = await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(1);
            environments[0].should.deep.equal({
                name: 'myEnvironmentOne',
                environmentType: EnvironmentType.ENVIRONMENT
            });

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, sinon.match.instanceOf(FabricEnvironmentRegistryEntry));
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);

            deleteEnvironmentSpy.should.not.have.been.called;
            removeRuntimeSpy.should.not.have.been.called;

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
                name: 'myEnvironment',
                environmentType: EnvironmentType.ENVIRONMENT
            });

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, sinon.match.instanceOf(FabricEnvironmentRegistryEntry), true, UserInputUtil.ADD_ENVIRONMENT_FROM_NODES);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);

            deleteEnvironmentSpy.should.have.not.been.called;
            removeRuntimeSpy.should.not.have.been.called;

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
            removeRuntimeSpy.should.not.have.been.called;

            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'Add environment');
            sendTelemetryEventStub.should.not.have.been.called;
        });

        it('should add a managed environment from an ansible dir', async () => {
            chooseMethodStub.resolves({data: UserInputUtil.ADD_ENVIRONMENT_FROM_DIR});

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            const environments: Array<FabricEnvironmentRegistryEntry> = await FabricEnvironmentRegistry.instance().getAll();

            environments.length.should.equal(1);
            environments[0].should.deep.equal({
                name: 'myEnvironment',
                environmentDirectory: environmentDirectoryPath,
                managedRuntime: true,
                environmentType: EnvironmentType.ANSIBLE_ENVIRONMENT
            });

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, sinon.match.instanceOf(FabricEnvironmentRegistryEntry));
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);

            deleteEnvironmentSpy.should.have.not.been.called;
            removeRuntimeSpy.should.not.have.been.called;

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new environment');
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('addEnvironmentCommand');
        });

        it('should add a non managed environment from an ansible dir', async () => {
            chooseMethodStub.resolves({data: UserInputUtil.ADD_ENVIRONMENT_FROM_DIR});

            environmentDirectoryPath = path.join(environmentDirectoryPath, '..', 'nonManagedAnsible');
            const uri: vscode.Uri = vscode.Uri.file(environmentDirectoryPath);

            openFileBrowserStub.resolves(uri);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            const environments: Array<FabricEnvironmentRegistryEntry> = await FabricEnvironmentRegistry.instance().getAll();

            environments.length.should.equal(1);
            environments[0].should.deep.equal({
                name: 'myEnvironment',
                environmentDirectory: environmentDirectoryPath,
                environmentType: EnvironmentType.ANSIBLE_ENVIRONMENT
            });

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, sinon.match.instanceOf(FabricEnvironmentRegistryEntry));
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);

            deleteEnvironmentSpy.should.have.not.been.called;
            removeRuntimeSpy.should.not.have.been.called;

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new environment');
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('addEnvironmentCommand');
        });

        it('should handle cancel from choosing dir when adding from an ansible dir', async () => {
            chooseMethodStub.resolves({data: UserInputUtil.ADD_ENVIRONMENT_FROM_DIR});

            openFileBrowserStub.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            await FabricEnvironmentRegistry.instance().exists('myEnvironment').should.eventually.equal(false);

            logSpy.callCount.should.equal(1);
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            sendTelemetryEventStub.should.not.have.been.calledOnceWithExactly('addEnvironmentCommand');
        });

        it('should handle user cancelling when asked for url when creating an OpsTool instance (Software support)', async () => {
            chooseMethodStub.resolves({data: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS});
            chooseNameStub.onFirstCall().resolves('myOpsToolsEnvironment');
            showInputBoxStub.withArgs('Enter the URL of the IBM Blockchain Platform Console you want to connect to').resolves(undefined);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            const environments: Array<FabricEnvironmentRegistryEntry> = await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(0);
            showInputBoxStub.withArgs('Enter the API key or the User ID of the IBM Blockchain Platform Console you want to connect to').should.not.have.been.called;
            showInputBoxStub.withArgs('Enter the API secret or the password of the IBM Blockchain Platform Console you want to connect to').should.not.have.been.called;
            axiosGetStub.should.not.have.been.called;
            deleteEnvironmentSpy.should.have.not.been.called;
            removeRuntimeSpy.should.not.have.been.called;

            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'Add environment');
        });

        it('should handle url with trailing path after "/" when creating an OpsTool instance (Software support)', async () => {
            chooseMethodStub.resolves({data: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS});
            chooseNameStub.onFirstCall().resolves('myOpsToolsEnvironment');
            showInputBoxStub.withArgs('Enter the URL of the IBM Blockchain Platform Console you want to connect to').resolves(`${url}/and/some/more/path`);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            const environments: Array<FabricEnvironmentRegistryEntry> = await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(1);
            environments[0].should.deep.equal({
                name: 'myOpsToolsEnvironment',
                url: url,
                environmentType: EnvironmentType.OPS_TOOLS_ENVIRONMENT
            });

            deleteEnvironmentSpy.should.have.not.been.called;
            removeRuntimeSpy.should.not.have.been.called;
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.EDIT_NODE_FILTERS, sinon.match.instanceOf(FabricEnvironmentRegistryEntry), true, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new environment');
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('addEnvironmentCommand');
        });

        it('should handle user cancelling when asked for api key/user id when creating an OpsTool instance (Software support)', async () => {
            chooseMethodStub.resolves({data: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS});
            chooseNameStub.onFirstCall().resolves('myOpsToolsEnvironment');
            showInputBoxStub.withArgs('Enter the API key or the User ID of the IBM Blockchain Platform Console you want to connect to').resolves(undefined);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            const environments: Array<FabricEnvironmentRegistryEntry> = await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(0);
            showInputBoxStub.withArgs('Enter the API secret or the password of the IBM Blockchain Platform Console you want to connect to').should.not.have.been.called;
            axiosGetStub.should.not.have.been.called;
            deleteEnvironmentSpy.should.have.not.been.called;
            removeRuntimeSpy.should.not.have.been.called;

            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'Add environment');
        });

        it('should handle when user cancels when asked for api secret/password when creating an OpsTool instance (Software support)', async () => {
            chooseMethodStub.resolves({data: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS});
            chooseNameStub.onFirstCall().resolves('myOpsToolsEnvironment');
            showInputBoxStub.withArgs('Enter the API secret or the password of the IBM Blockchain Platform Console you want to connect to').resolves(undefined);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            const environments: Array<FabricEnvironmentRegistryEntry> = await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(0);
            axiosGetStub.should.not.have.been.called;
            deleteEnvironmentSpy.should.have.not.been.called;
            removeRuntimeSpy.should.not.have.been.called;

            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'Add environment');
        });

        it('should handle when the keytar module cannot be imported at all when creating a new OpsTool instance (Software support)', async () => {
            chooseMethodStub.resolves({data: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS});
            chooseNameStub.onFirstCall().resolves('myOpsToolsEnvironment');
            getCoreNodeModuleStub.withArgs('keytar').returns(undefined);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            const environments: Array<FabricEnvironmentRegistryEntry> = await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(0);

            getCoreNodeModuleStub.should.have.been.calledOnce;
            deleteEnvironmentSpy.should.not.have.been.called;
            removeRuntimeSpy.should.not.have.been.called;

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Failed to add a new environment: Error importing the keytar module`, `Failed to add a new environment: Error: Error importing the keytar module`);
        });

        it('should handle when certificate is present in OS trust store when creating new OpsTool instance (Software support)', async () => {
            chooseMethodStub.resolves({data: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS});
            chooseNameStub.onFirstCall().resolves('myOpsToolsEnvironment');
            axiosGetStub.onFirstCall().rejects(certVerificationError2);
            axiosGetStub.onSecondCall().resolves();

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            getCoreNodeModuleStub.should.have.been.calledOnce;
            deleteEnvironmentSpy.should.have.not.been.called;
            removeRuntimeSpy.should.not.have.been.called;

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new environment');
        });

        it('should handle when the api key + secret/user id + password are incorrect when creating new OpsTool instance (Software support)', async () => {
            chooseMethodStub.resolves({data: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS});
            chooseNameStub.onFirstCall().resolves('myOpsToolsEnvironment');
            const error: Error = new Error('invalid credentials error');
            axiosGetStub.onThirdCall().rejects(error);
            const thrownError: Error = new Error(`Problem detected with the authentication information provided: ${error.message}`);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            getCoreNodeModuleStub.should.have.been.calledOnce;
            deleteEnvironmentSpy.should.not.have.been.called;
            removeRuntimeSpy.should.not.have.been.called;

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Failed to add a new environment: ${thrownError.message}`, `Failed to add a new environment: ${thrownError.toString()}`);
        });

        it('should handle when the api key/user id, api secret/password and rejectUnauthorized cannot be stored saved securely onto the keychain using the setPassword function when creating new OpsTool instance (Software support)', async () => {
            chooseMethodStub.resolves({data: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS});
            chooseNameStub.onFirstCall().resolves('myOpsToolsEnvironment');
            const error: Error = new Error('newError');
            const caughtError: Error = new Error(`Unable to store the required credentials: ${error.message}`);
            setPasswordStub.throws(error);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            getCoreNodeModuleStub.should.have.been.calledOnce;
            deleteEnvironmentSpy.should.not.have.been.called;
            removeRuntimeSpy.should.not.have.been.called;

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Failed to add a new environment: ${caughtError.message}`, `Failed to add a new environment: ${caughtError.toString()}`);
        });

        it('should handle user choosing not to perform certificate verification on a new Ops Tool instance (Software support)', async () => {
            chooseMethodStub.resolves({data: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS});
            chooseNameStub.onFirstCall().resolves('myOpsToolsEnvironment');
            chooseCertVerificationStub.onFirstCall().resolves(UserInputUtil.CONNECT_NO_CA_CERT_CHAIN);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new environment');
        });

        it('should handle when user cancels when asked to choose certificate verification methtod when creating an OpsTool instance (Software support)', async () => {
            chooseMethodStub.resolves({data: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS});
            chooseNameStub.onFirstCall().resolves('myOpsToolsEnvironment');
            chooseCertVerificationStub.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            axiosGetStub.should.have.have.been.calledTwice;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
        });

        it('should handle error connecting to Ops Tool health end point URL when adding environment (Software support)', async () => {
            chooseMethodStub.resolves({data: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS});
            chooseNameStub.onFirstCall().resolves('myOpsToolsEnvironment');
            const error: Error = new Error('some error');
            const error2: Error = new Error('second error');
            axiosGetStub.onFirstCall().rejects(error);
            axiosGetStub.onSecondCall().rejects(error2);
            const thrownError: Error = new Error(`Unable to connect to the IBM Blockchain Platform network: ${error2.message}`);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            getCoreNodeModuleStub.should.have.been.calledOnce;
            deleteEnvironmentSpy.should.not.have.been.called;
            removeRuntimeSpy.should.not.have.been.called;

            axiosGetStub.should.have.have.been.calledTwice;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Failed to add a new environment: ${thrownError.message}`, `Failed to add a new environment: ${thrownError.toString()}`);

        });

        it('should create environment without nodes if user does not choose any nodes from a new Ops Tool instance', async () => {
            chooseMethodStub.resolves({data: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS});
            chooseNameStub.onFirstCall().resolves('myOpsToolsEnvironment');
            executeCommandStub.withArgs(ExtensionCommands.EDIT_NODE_FILTERS).resolves(true);
            getNodesStub.onFirstCall().resolves([]);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            deleteEnvironmentSpy.should.have.not.been.called;
            removeRuntimeSpy.should.not.have.been.called;

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new environment. No nodes included in current filters, click myOpsToolsEnvironment to edit filters');
        });

        it(`shouldn't have option to create from template if local fabric functionality is disabled`, async () => {
            getExtensionLocalFabricSettingStub.returns(false);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            const environments: Array<FabricEnvironmentRegistryEntry> = await FabricEnvironmentRegistry.instance().getAll();

            environments.length.should.equal(1);
            environments[0].should.deep.equal({
                name: 'myEnvironment',
                environmentType: EnvironmentType.ENVIRONMENT
            });

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, sinon.match.instanceOf(FabricEnvironmentRegistryEntry), true, UserInputUtil.ADD_ENVIRONMENT_FROM_NODES);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);

            deleteEnvironmentSpy.should.have.not.been.called;
            removeRuntimeSpy.should.not.have.been.called;

            showQuickPickItemStub.should.have.been.calledWith('Select a method to add an environment', [{ label: UserInputUtil.ADD_ENVIRONMENT_FROM_DIR, data: UserInputUtil.ADD_ENVIRONMENT_FROM_DIR, description: UserInputUtil.ADD_ENVIRONMENT_FROM_DIR_DESCRIPTION }, { label: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS, data: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS, description: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS_DESCRIPTION }, { label: UserInputUtil.ADD_ENVIRONMENT_FROM_NODES, data: UserInputUtil.ADD_ENVIRONMENT_FROM_NODES, description: UserInputUtil.ADD_ENVIRONMENT_FROM_NODES_DESCRIPTION }]);
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new environment');
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('addEnvironmentCommand');
        });

        it('should be able to add a new 1-org local network', async () => {
            getNodesStub.restore();

            const envName: string = 'New 1 Org Network';

            chooseMethodStub.onCall(0).resolves({data: UserInputUtil.ADD_ENVIRONMENT_FROM_TEMPLATE});
            showQuickPickItemStub.onCall(1).resolves({data: 1});

            chooseNameStub.resolves(envName);

            const envEntry: FabricEnvironmentRegistryEntry = {name: envName, numberOfOrgs: 1, managedRuntime: true, environmentType: EnvironmentType.LOCAL_ENVIRONMENT};

            const initializeStub: sinon.SinonStub = mySandBox.stub(LocalEnvironmentManager.instance(), 'initialize').callsFake(async () => {
                await FabricEnvironmentRegistry.instance().add(envEntry);
            });

            const mockRuntime: sinon.SinonStubbedInstance<LocalEnvironment> = mySandBox.createStubInstance(LocalEnvironment);
            mockRuntime.getName.returns(envName);

            executeCommandStub.withArgs(ExtensionCommands.START_FABRIC, envEntry).resolves();

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            showQuickPickItemStub.should.have.been.calledTwice;
            chooseMethodStub.should.have.been.calledOnceWithExactly('Select a method to add an environment', [{label: UserInputUtil.ADD_ENVIRONMENT_FROM_TEMPLATE, data: UserInputUtil.ADD_ENVIRONMENT_FROM_TEMPLATE, description: UserInputUtil.ADD_ENVIRONMENT_FROM_TEMPLATE_DESCRIPTION}, { label: UserInputUtil.ADD_ENVIRONMENT_FROM_DIR, data: UserInputUtil.ADD_ENVIRONMENT_FROM_DIR, description: UserInputUtil.ADD_ENVIRONMENT_FROM_DIR_DESCRIPTION }, { label: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS, data: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS, description: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS_DESCRIPTION }, { label: UserInputUtil.ADD_ENVIRONMENT_FROM_NODES, data: UserInputUtil.ADD_ENVIRONMENT_FROM_NODES, description: UserInputUtil.ADD_ENVIRONMENT_FROM_NODES_DESCRIPTION }]);
            showQuickPickItemStub.should.have.been.calledWith('Choose a configuration for a new local network', [{label: UserInputUtil.ONE_ORG_TEMPLATE, data: 1}, {label: UserInputUtil.TWO_ORG_TEMPLATE, data: 2}, {label: UserInputUtil.CREATE_ADDITIONAL_LOCAL_NETWORKS, data: UserInputUtil.CREATE_ADDITIONAL_LOCAL_NETWORKS_DATA}]);
            chooseNameStub.should.have.been.calledOnceWithExactly('Enter a name for the environment', '');
            initializeStub.should.have.been.calledWith(envName, 1);

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, sinon.match.instanceOf(FabricEnvironmentRegistryEntry));
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.START_FABRIC, envEntry);
            deleteEnvironmentSpy.should.have.not.been.called;
            removeRuntimeSpy.should.not.have.been.called;

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new environment');
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('addEnvironmentCommand');
        });

        it(`should be able to add a new ${FabricRuntimeUtil.LOCAL_FABRIC} network if it has been deleted`, async () => {
            getNodesStub.restore();

            const envName: string = FabricRuntimeUtil.LOCAL_FABRIC;
            chooseMethodStub.onCall(0).resolves({data: UserInputUtil.ADD_ENVIRONMENT_FROM_TEMPLATE});
            showQuickPickItemStub.onCall(1).resolves({data: 1});

            chooseNameStub.resolves(envName);
            const envEntry: FabricEnvironmentRegistryEntry = {name: envName, numberOfOrgs: 1, managedRuntime: true, environmentType: EnvironmentType.LOCAL_ENVIRONMENT};

            const initializeStub: sinon.SinonStub = mySandBox.stub(LocalEnvironmentManager.instance(), 'initialize').callsFake(async () => {
                await FabricEnvironmentRegistry.instance().add(envEntry);
            });

            const mockRuntime: sinon.SinonStubbedInstance<LocalEnvironment> = mySandBox.createStubInstance(LocalEnvironment);
            mockRuntime.getName.returns(envName);

            const globalState: ExtensionData = GlobalState.get();
            globalState.deletedOneOrgLocalFabric = true;
            await GlobalState.update(globalState);

            const globalStateUpdateSpy: sinon.SinonSpy = mySandBox.spy(GlobalState, 'update');

            executeCommandStub.withArgs(ExtensionCommands.START_FABRIC, envEntry).resolves();

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            globalStateUpdateSpy.should.have.been.calledOnce;
            const updateCall: any = globalStateUpdateSpy.getCall(0).args[0];
            updateCall.deletedOneOrgLocalFabric.should.equal(false);

            showQuickPickItemStub.should.have.been.calledTwice;
            chooseMethodStub.should.have.been.calledOnceWithExactly('Select a method to add an environment', [{label: UserInputUtil.ADD_ENVIRONMENT_FROM_TEMPLATE, data: UserInputUtil.ADD_ENVIRONMENT_FROM_TEMPLATE, description: UserInputUtil.ADD_ENVIRONMENT_FROM_TEMPLATE_DESCRIPTION}, { label: UserInputUtil.ADD_ENVIRONMENT_FROM_DIR, data: UserInputUtil.ADD_ENVIRONMENT_FROM_DIR, description: UserInputUtil.ADD_ENVIRONMENT_FROM_DIR_DESCRIPTION }, { label: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS, data: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS, description: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS_DESCRIPTION }, { label: UserInputUtil.ADD_ENVIRONMENT_FROM_NODES, data: UserInputUtil.ADD_ENVIRONMENT_FROM_NODES, description: UserInputUtil.ADD_ENVIRONMENT_FROM_NODES_DESCRIPTION }]);
            showQuickPickItemStub.should.have.been.calledWith('Choose a configuration for a new local network', [{label: UserInputUtil.ONE_ORG_TEMPLATE, data: 1}, {label: UserInputUtil.TWO_ORG_TEMPLATE, data: 2}, {label: UserInputUtil.CREATE_ADDITIONAL_LOCAL_NETWORKS, data: UserInputUtil.CREATE_ADDITIONAL_LOCAL_NETWORKS_DATA}]);
            chooseNameStub.should.have.been.calledOnceWithExactly('Enter a name for the environment', '');
            initializeStub.should.have.been.calledWith(envName, 1);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.START_FABRIC, envEntry);

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, sinon.match.instanceOf(FabricEnvironmentRegistryEntry));

            deleteEnvironmentSpy.should.have.not.been.called;
            removeRuntimeSpy.should.not.have.been.called;

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new environment');
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('addEnvironmentCommand');
        });

        it('should be able to add a new 2-org local network', async () => {
            getNodesStub.restore();

            const envName: string = 'New 2 Org Network';
            chooseMethodStub.resolves({data: UserInputUtil.ADD_ENVIRONMENT_FROM_TEMPLATE});
            showQuickPickItemStub.resolves({data: 2});

            chooseNameStub.resolves(envName);
            const envEntry: FabricEnvironmentRegistryEntry = {name: envName, numberOfOrgs: 1, managedRuntime: true, environmentType: EnvironmentType.LOCAL_ENVIRONMENT};

            const initializeStub: sinon.SinonStub = mySandBox.stub(LocalEnvironmentManager.instance(), 'initialize').callsFake(async () => {
                await FabricEnvironmentRegistry.instance().add(envEntry);
            });

            const mockRuntime: sinon.SinonStubbedInstance<LocalEnvironment> = mySandBox.createStubInstance(LocalEnvironment);
            mockRuntime.getName.returns(envName);

            executeCommandStub.withArgs(ExtensionCommands.START_FABRIC, envEntry).resolves();

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            chooseMethodStub.should.have.been.calledWithExactly('Select a method to add an environment', [{label: UserInputUtil.ADD_ENVIRONMENT_FROM_TEMPLATE, data: UserInputUtil.ADD_ENVIRONMENT_FROM_TEMPLATE, description: UserInputUtil.ADD_ENVIRONMENT_FROM_TEMPLATE_DESCRIPTION}, { label: UserInputUtil.ADD_ENVIRONMENT_FROM_DIR, data: UserInputUtil.ADD_ENVIRONMENT_FROM_DIR, description: UserInputUtil.ADD_ENVIRONMENT_FROM_DIR_DESCRIPTION }, { label: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS, data: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS, description: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS_DESCRIPTION }, { label: UserInputUtil.ADD_ENVIRONMENT_FROM_NODES, data: UserInputUtil.ADD_ENVIRONMENT_FROM_NODES, description: UserInputUtil.ADD_ENVIRONMENT_FROM_NODES_DESCRIPTION }]);
            showQuickPickItemStub.should.have.been.calledWithExactly('Choose a configuration for a new local network', [{label: UserInputUtil.ONE_ORG_TEMPLATE, data: 1}, {label: UserInputUtil.TWO_ORG_TEMPLATE, data: 2}, {label: UserInputUtil.CREATE_ADDITIONAL_LOCAL_NETWORKS, data: UserInputUtil.CREATE_ADDITIONAL_LOCAL_NETWORKS_DATA}]);

            showInputBoxStub.should.have.been.calledOnceWithExactly('Enter a name for the environment', '');
            initializeStub.should.have.been.calledWith(envName, 2);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.START_FABRIC, envEntry);

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, sinon.match.instanceOf(FabricEnvironmentRegistryEntry));

            deleteEnvironmentSpy.should.have.not.been.called;
            removeRuntimeSpy.should.not.have.been.called;

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new environment');
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('addEnvironmentCommand');
        });

        it('should return when cancelling selecting a network configuration', async () => {

            chooseMethodStub.resolves({data: UserInputUtil.ADD_ENVIRONMENT_FROM_TEMPLATE});
            showQuickPickItemStub.resolves();

            const initializeSpy: sinon.SinonSpy = mySandBox.spy(LocalEnvironmentManager.instance(), 'initialize');

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            chooseMethodStub.should.have.been.calledWithExactly('Select a method to add an environment', [{label: UserInputUtil.ADD_ENVIRONMENT_FROM_TEMPLATE, data: UserInputUtil.ADD_ENVIRONMENT_FROM_TEMPLATE, description: UserInputUtil.ADD_ENVIRONMENT_FROM_TEMPLATE_DESCRIPTION}, { label: UserInputUtil.ADD_ENVIRONMENT_FROM_DIR, data: UserInputUtil.ADD_ENVIRONMENT_FROM_DIR, description: UserInputUtil.ADD_ENVIRONMENT_FROM_DIR_DESCRIPTION }, { label: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS, data: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS, description: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS_DESCRIPTION }, { label: UserInputUtil.ADD_ENVIRONMENT_FROM_NODES, data: UserInputUtil.ADD_ENVIRONMENT_FROM_NODES, description: UserInputUtil.ADD_ENVIRONMENT_FROM_NODES_DESCRIPTION }]);
            showQuickPickItemStub.should.have.been.calledWithExactly('Choose a configuration for a new local network', [{label: UserInputUtil.ONE_ORG_TEMPLATE, data: 1}, {label: UserInputUtil.TWO_ORG_TEMPLATE, data: 2}, {label: UserInputUtil.CREATE_ADDITIONAL_LOCAL_NETWORKS, data: UserInputUtil.CREATE_ADDITIONAL_LOCAL_NETWORKS_DATA}]);

            showInputBoxStub.should.not.have.been.calledOnceWithExactly('Enter a name for the environment', '');
            initializeSpy.should.not.have.been.called;

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, sinon.match.instanceOf(FabricEnvironmentRegistryEntry));

            deleteEnvironmentSpy.should.have.not.been.called;
            removeRuntimeSpy.should.not.have.been.called;

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new environment');
            sendTelemetryEventStub.should.not.have.been.calledOnceWithExactly('addEnvironmentCommand');
        });

        it('should delete setting and handle any errors when creating a new 1-org local network', async () => {
            getNodesStub.restore();

            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, {
                'Failing Network': {
                    port: {
                        startPort: 1,
                        endPort: 2
                    }
                },
                'Other Network': {
                    ports: {
                        startPort: 3,
                        endPort: 4
                    }
                }
            }, vscode.ConfigurationTarget.Global);

            const envName: string = 'Failing Network';
            chooseMethodStub.resolves({data: UserInputUtil.ADD_ENVIRONMENT_FROM_TEMPLATE});
            showQuickPickItemStub.resolves({data: 1});

            chooseNameStub.resolves(envName);
            const envEntry: FabricEnvironmentRegistryEntry = {name: envName, numberOfOrgs: 1, managedRuntime: true, environmentType: EnvironmentType.LOCAL_ENVIRONMENT};

            const initializeStub: sinon.SinonStub = mySandBox.stub(LocalEnvironmentManager.instance(), 'initialize').callsFake(async () => {
                await FabricEnvironmentRegistry.instance().add(envEntry);
            });

            const mockRuntime: sinon.SinonStubbedInstance<LocalEnvironment> = mySandBox.createStubInstance(LocalEnvironment);
            mockRuntime.getName.returns(envName);

            const error: Error = new Error(`unable to create new environment`);
            executeCommandStub.withArgs(ExtensionCommands.START_FABRIC, envEntry).throws(error);

            executeCommandStub.withArgs(ExtensionCommands.TEARDOWN_FABRIC, undefined, true, envName).resolves();

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            const runtimeSetting: any = await vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_RUNTIME, vscode.ConfigurationTarget.Global);
            runtimeSetting.should.deep.equal({
                'Other Network': {
                    ports: {
                        startPort: 3,
                        endPort: 4
                    }
                }
            });

            chooseMethodStub.should.have.been.calledWithExactly('Select a method to add an environment', [{label: UserInputUtil.ADD_ENVIRONMENT_FROM_TEMPLATE, data: UserInputUtil.ADD_ENVIRONMENT_FROM_TEMPLATE, description: UserInputUtil.ADD_ENVIRONMENT_FROM_TEMPLATE_DESCRIPTION}, { label: UserInputUtil.ADD_ENVIRONMENT_FROM_DIR, data: UserInputUtil.ADD_ENVIRONMENT_FROM_DIR, description: UserInputUtil.ADD_ENVIRONMENT_FROM_DIR_DESCRIPTION }, { label: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS, data: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS, description: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS_DESCRIPTION }, { label: UserInputUtil.ADD_ENVIRONMENT_FROM_NODES, data: UserInputUtil.ADD_ENVIRONMENT_FROM_NODES, description: UserInputUtil.ADD_ENVIRONMENT_FROM_NODES_DESCRIPTION }]);
            showQuickPickItemStub.should.have.been.calledWithExactly('Choose a configuration for a new local network', [{label: UserInputUtil.ONE_ORG_TEMPLATE, data: 1}, {label: UserInputUtil.TWO_ORG_TEMPLATE, data: 2}, {label: UserInputUtil.CREATE_ADDITIONAL_LOCAL_NETWORKS, data: UserInputUtil.CREATE_ADDITIONAL_LOCAL_NETWORKS_DATA}]);
            chooseNameStub.should.have.been.calledOnceWithExactly('Enter a name for the environment', '');
            initializeStub.should.have.been.calledWith(envName, 1);

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, sinon.match.instanceOf(FabricEnvironmentRegistryEntry));

            deleteEnvironmentSpy.should.been.calledOnceWithExactly(envName, true);
            removeRuntimeSpy.should.have.been.calledOnceWithExactly(envName);

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Failed to add a new environment: ${error.message}`, `Failed to add a new environment: ${error.toString()}`);
            sendTelemetryEventStub.should.not.have.been.called;
        });

        it('should not setting and handle any errors when creating a new 1-org local network', async () => {
            getNodesStub.restore();

            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, {
                'Other Network': {
                    ports: {
                        startPort: 3,
                        endPort: 4
                    }
                }
            }, vscode.ConfigurationTarget.Global);

            const envName: string = 'Failing Network';
            chooseMethodStub.resolves({data: UserInputUtil.ADD_ENVIRONMENT_FROM_TEMPLATE});
            showQuickPickItemStub.resolves({data: 1});

            chooseNameStub.resolves(envName);
            const envEntry: FabricEnvironmentRegistryEntry = {name: envName, numberOfOrgs: 1, managedRuntime: true, environmentType: EnvironmentType.LOCAL_ENVIRONMENT};

            const initializeStub: sinon.SinonStub = mySandBox.stub(LocalEnvironmentManager.instance(), 'initialize').callsFake(async () => {
                await FabricEnvironmentRegistry.instance().add(envEntry);
            });

            const mockRuntime: sinon.SinonStubbedInstance<LocalEnvironment> = mySandBox.createStubInstance(LocalEnvironment);
            mockRuntime.getName.returns(envName);

            const error: Error = new Error(`unable to create new environment`);
            executeCommandStub.withArgs(ExtensionCommands.START_FABRIC, envEntry).throws(error);

            executeCommandStub.withArgs(ExtensionCommands.TEARDOWN_FABRIC, undefined, true, envName).resolves();

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            const runtimeSetting: any = await vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_RUNTIME, vscode.ConfigurationTarget.Global);
            runtimeSetting.should.deep.equal({
                'Other Network': {
                    ports: {
                        startPort: 3,
                        endPort: 4
                    }
                }
            });

            chooseMethodStub.should.have.been.calledWithExactly('Select a method to add an environment', [{label: UserInputUtil.ADD_ENVIRONMENT_FROM_TEMPLATE, data: UserInputUtil.ADD_ENVIRONMENT_FROM_TEMPLATE, description: UserInputUtil.ADD_ENVIRONMENT_FROM_TEMPLATE_DESCRIPTION}, { label: UserInputUtil.ADD_ENVIRONMENT_FROM_DIR, data: UserInputUtil.ADD_ENVIRONMENT_FROM_DIR, description: UserInputUtil.ADD_ENVIRONMENT_FROM_DIR_DESCRIPTION }, { label: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS, data: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS, description: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS_DESCRIPTION }, { label: UserInputUtil.ADD_ENVIRONMENT_FROM_NODES, data: UserInputUtil.ADD_ENVIRONMENT_FROM_NODES, description: UserInputUtil.ADD_ENVIRONMENT_FROM_NODES_DESCRIPTION }]);
            showQuickPickItemStub.should.have.been.calledWithExactly('Choose a configuration for a new local network', [{label: UserInputUtil.ONE_ORG_TEMPLATE, data: 1}, {label: UserInputUtil.TWO_ORG_TEMPLATE, data: 2}, {label: UserInputUtil.CREATE_ADDITIONAL_LOCAL_NETWORKS, data: UserInputUtil.CREATE_ADDITIONAL_LOCAL_NETWORKS_DATA}]);
            chooseNameStub.should.have.been.calledOnceWithExactly('Enter a name for the environment', '');
            initializeStub.should.have.been.calledWith(envName, 1);
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, sinon.match.instanceOf(FabricEnvironmentRegistryEntry));

            deleteEnvironmentSpy.should.been.calledOnceWithExactly(envName, true);
            removeRuntimeSpy.should.have.been.calledOnceWithExactly(envName);
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Failed to add a new environment: ${error.message}`, `Failed to add a new environment: ${error.toString()}`);
            sendTelemetryEventStub.should.not.have.been.called;
        });

        it('should open tutorial if user wants to learn about creating additional networks', async () => {
            getNodesStub.restore();
            chooseMethodStub.resolves({data: UserInputUtil.ADD_ENVIRONMENT_FROM_TEMPLATE});
            showQuickPickItemStub.resolves({data: UserInputUtil.CREATE_ADDITIONAL_LOCAL_NETWORKS_DATA});

            const initializeSpy: sinon.SinonSpy = mySandBox.spy(LocalEnvironmentManager.instance(), 'initialize');

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            chooseMethodStub.should.have.been.calledWithExactly('Select a method to add an environment', [{label: UserInputUtil.ADD_ENVIRONMENT_FROM_TEMPLATE, data: UserInputUtil.ADD_ENVIRONMENT_FROM_TEMPLATE, description: UserInputUtil.ADD_ENVIRONMENT_FROM_TEMPLATE_DESCRIPTION}, { label: UserInputUtil.ADD_ENVIRONMENT_FROM_DIR, data: UserInputUtil.ADD_ENVIRONMENT_FROM_DIR, description: UserInputUtil.ADD_ENVIRONMENT_FROM_DIR_DESCRIPTION }, { label: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS, data: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS, description: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS_DESCRIPTION }, { label: UserInputUtil.ADD_ENVIRONMENT_FROM_NODES, data: UserInputUtil.ADD_ENVIRONMENT_FROM_NODES, description: UserInputUtil.ADD_ENVIRONMENT_FROM_NODES_DESCRIPTION }]);
            showQuickPickItemStub.should.have.been.calledWithExactly('Choose a configuration for a new local network', [{label: UserInputUtil.ONE_ORG_TEMPLATE, data: 1}, {label: UserInputUtil.TWO_ORG_TEMPLATE, data: 2}, {label: UserInputUtil.CREATE_ADDITIONAL_LOCAL_NETWORKS, data: UserInputUtil.CREATE_ADDITIONAL_LOCAL_NETWORKS_DATA}]);
            showInputBoxStub.should.not.have.been.calledOnceWithExactly('Enter a name for the environment', '');
            initializeSpy.should.not.have.been.called;

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, sinon.match.instanceOf(FabricEnvironmentRegistryEntry));

            const extPath: string = ExtensionUtil.getExtensionPath();
            const tutorialPath: string = path.join(extPath, 'tutorials', 'developer-tutorials', 'create-custom-networks.md');

            const executeCallOne: sinon.SinonSpyCall = executeCommandStub.getCall(executeCommandStub.callCount - 1);
            executeCallOne.should.have.been.calledWith('markdown.showPreview', sinon.match.any);
            executeCallOne.args[1].fsPath.should.equal(tutorialPath);

            deleteEnvironmentSpy.should.have.not.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new environment');
            sendTelemetryEventStub.should.not.have.been.calledOnceWithExactly('addEnvironmentCommand');
        });

        it('should handle when user cancels while choosing location of the OpsTool instance', async () => {
            chooseMethodStub.resolves({data: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS});
            showQuickPickYesNoStub.withArgs('Are you connecting to a service instance on IBM Cloud?').resolves();

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            const environments: Array<FabricEnvironmentRegistryEntry> = await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(0);

            cloudAccountGetAccessTokenStub.should.have.not.been.called;
            chooseNameStub.should.have.not.been.called;
            axiosGetStub.should.have.not.been.called;
            chooseBlockchainStub.should.have.not.been.called;
            deleteEnvironmentSpy.should.have.not.been.called;
            removeRuntimeSpy.should.not.have.been.called;
            executeCommandStub.should.have.not.been.calledWith(ExtensionCommands.EDIT_NODE_FILTERS, sinon.match.instanceOf(FabricEnvironmentRegistryEntry), true, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);
            executeCommandStub.should.have.not.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
        });

        it('should suggest default name when adding environment from a SaaS OpsTool instance (SaaA)', async () => {
            chooseMethodStub.resolves({data: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS});
            chooseNameStub.onFirstCall().returnsArg(1);
            showQuickPickYesNoStub.withArgs('Are you connecting to a service instance on IBM Cloud?').resolves(UserInputUtil.YES);
            axiosGetStub.onFirstCall().resolves(resourcesResponseMock);
            axiosGetStub.onSecondCall().resolves(consoleStatusMock);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            const environments: Array<FabricEnvironmentRegistryEntry> = await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(1);
            environments[0].should.deep.equal({
                name: originalSaaSName,
                url: urlSaaS,
                environmentType: EnvironmentType.SAAS_OPS_TOOLS_ENVIRONMENT
            });

            cloudAccountGetAccessTokenStub.should.have.been.called;
            axiosGetStub.should.have.been.calledTwice;
            chooseBlockchainStub.should.have.not.been.called;
            deleteEnvironmentSpy.should.have.not.been.called;
            removeRuntimeSpy.should.not.have.been.called;
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.EDIT_NODE_FILTERS, sinon.match.instanceOf(FabricEnvironmentRegistryEntry), true, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new environment');
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('addEnvironmentCommand');
        });

        it('should handle errors getting the access token when adding an OpsTool instance (SaaA)', async () => {
            chooseMethodStub.resolves({data: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS});
            chooseNameStub.onFirstCall().resolves('mySaaSOpsToolsEnvironment');
            showQuickPickYesNoStub.withArgs('Are you connecting to a service instance on IBM Cloud?').resolves(UserInputUtil.YES);
            const error: Error = new Error('some error');
            cloudAccountGetAccessTokenStub.rejects(error);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            const environments: Array<FabricEnvironmentRegistryEntry> = await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(0);

            cloudAccountGetAccessTokenStub.should.have.been.calledOnce;
            axiosGetStub.should.have.not.been.called;
            chooseBlockchainStub.should.have.not.been.called;
            deleteEnvironmentSpy.should.have.not.been.called;
            chooseNameStub.should.have.not.been.called;
            removeRuntimeSpy.should.not.have.been.called;
            executeCommandStub.should.have.not.been.calledWith(ExtensionCommands.EDIT_NODE_FILTERS, sinon.match.instanceOf(FabricEnvironmentRegistryEntry), true, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);
            executeCommandStub.should.have.not.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Failed to add a new environment: ${error.message}`, `Failed to add a new environment: ${error.toString()}`);
        });

        // FIXME - this behaviour might change after decision is made regarding return values for ibmcloud-account extension commands
        it('should handle user canceling while getting access token when adding an OpsTool instance (SaaA)', async () => {
            chooseMethodStub.resolves({data: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS});
            showQuickPickYesNoStub.withArgs('Are you connecting to a service instance on IBM Cloud?').resolves(UserInputUtil.YES);
            cloudAccountGetAccessTokenStub.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            const environments: Array<FabricEnvironmentRegistryEntry> = await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(0);

            cloudAccountGetAccessTokenStub.should.have.been.called;
            axiosGetStub.should.have.not.been.called;
            chooseBlockchainStub.should.have.not.been.called;
            deleteEnvironmentSpy.should.have.not.been.called;
            chooseNameStub.should.have.not.been.called;
            removeRuntimeSpy.should.not.have.been.called;
            executeCommandStub.should.have.not.been.calledWith(ExtensionCommands.EDIT_NODE_FILTERS, sinon.match.instanceOf(FabricEnvironmentRegistryEntry), true, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);
            executeCommandStub.should.have.not.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
        });

        it('should handle more than one page of resources when adding an OpsTool instance (SaaA)', async () => {
            chooseMethodStub.resolves({data: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS});
            chooseNameStub.onFirstCall().resolves('mySaaSOpsToolsEnvironment');
            showQuickPickYesNoStub.withArgs('Are you connecting to a service instance on IBM Cloud?').resolves(UserInputUtil.YES);
            axiosGetStub.onFirstCall().resolves({
                data: {
                    next_url: '/some/resource/path',
                    resources: [{
                        resource_plan_id: 'otherService-standard',
                        name: 'myOtherService10',
                        guid: 'someGUID10',
                        dashboard_url: 'https://some.dashboard.url10/some/path'
                            }]
                        }
                    });
            axiosGetStub.onSecondCall().resolves(resourcesResponseMock);
            axiosGetStub.onThirdCall().resolves(consoleStatusMock);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            const environments: Array<FabricEnvironmentRegistryEntry> = await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(1);

            cloudAccountGetAccessTokenStub.should.have.been.called;
            axiosGetStub.should.have.been.calledThrice;
            chooseBlockchainStub.should.have.not.been.called;
            deleteEnvironmentSpy.should.have.not.been.called;
            removeRuntimeSpy.should.not.have.been.called;
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.EDIT_NODE_FILTERS, sinon.match.instanceOf(FabricEnvironmentRegistryEntry), true, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new environment');
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('addEnvironmentCommand');

        });

        it('should fail if there are no IBM Blockchain Platform resources for the selected account when adding an OpsTool instance (SaaA)', async () => {
            chooseMethodStub.resolves({data: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS});
            chooseNameStub.onFirstCall().resolves('mySaaSOpsToolsEnvironment');
            showQuickPickYesNoStub.withArgs('Are you connecting to a service instance on IBM Cloud?').resolves(UserInputUtil.YES);
            const noBlockchainError: Error = new Error('There are no IBM Blockchain Platform service instances associated with the chosen account');
            axiosGetStub.onFirstCall().resolves({
                data: {
                        next_url: null,
                        resources: [{
                                        resource_plan_id: 'otherService-standard',
                                        name: 'myOtherService',
                                        guid: 'someGUID2',
                                        dashboard_url: 'https://some.dashboard.url2/some/path'
                                    }]
                }
            });

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            const environments: Array<FabricEnvironmentRegistryEntry> = await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(0);

            cloudAccountGetAccessTokenStub.should.have.been.called;
            chooseNameStub.should.have.not.been.called;
            axiosGetStub.should.have.been.calledOnce;
            chooseBlockchainStub.should.have.not.been.called;
            deleteEnvironmentSpy.should.have.not.been.called;
            removeRuntimeSpy.should.not.have.been.called;
            executeCommandStub.should.have.not.been.calledWith(ExtensionCommands.EDIT_NODE_FILTERS, sinon.match.instanceOf(FabricEnvironmentRegistryEntry), true, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);
            executeCommandStub.should.have.not.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Failed to add a new environment: ${noBlockchainError.message}`, `Failed to add a new environment: ${noBlockchainError.toString()}`);
        });

        it('should ask user to select resource if more than one IBM Blockchain platform exists when adding an OpsTool instance (SaaA)', async () => {
            chooseMethodStub.resolves({data: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS});
            chooseNameStub.onFirstCall().resolves('mySaaSOpsToolsEnvironment');
            showQuickPickYesNoStub.withArgs('Are you connecting to a service instance on IBM Cloud?').resolves(UserInputUtil.YES);
            axiosGetStub.onFirstCall().resolves({
                data: {
                        next_url: null,
                        resources: [{
                                        resource_plan_id: 'blockchain-standard',
                                        name: 'myBlockchainPlatform',
                                        guid: 'someGUID1',
                                        dashboard_url: 'https://some.dashboard.url1/some/path'
                                    }, {
                                        resource_plan_id: 'blockchain-standard',
                                        name: 'myBlockchainPlatform2',
                                        guid: 'someGUID2',
                                        dashboard_url: 'https://some.dashboard.url2/some/path'
                                    }]
                }
            });
            chooseBlockchainStub.resolves(
                {
                    data: {
                        resource_plan_id: 'blockchain-standard',
                        name: 'myBlockchainPlatform',
                        guid: 'someGUID1',
                        dashboard_url: 'https://some.dashboard.url1/some/path'
                    }
                }
            );
            axiosGetStub.onSecondCall().resolves(consoleStatusMock);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            const environments: Array<FabricEnvironmentRegistryEntry> = await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(1);
            environments[0].should.deep.equal({
                name: 'mySaaSOpsToolsEnvironment',
                url: urlSaaS,
                environmentType: EnvironmentType.SAAS_OPS_TOOLS_ENVIRONMENT
            });

            cloudAccountGetAccessTokenStub.should.have.been.called;
            axiosGetStub.should.have.been.calledTwice;
            chooseBlockchainStub.should.have.been.calledOnce;
            deleteEnvironmentSpy.should.have.not.been.called;
            removeRuntimeSpy.should.not.have.been.called;
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.EDIT_NODE_FILTERS, sinon.match.instanceOf(FabricEnvironmentRegistryEntry), true, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new environment');
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('addEnvironmentCommand');
        });

        it('should handle user canceling while selecting an IBM Blockchain platform when adding an OpsTool instance (SaaA)', async () => {
            chooseMethodStub.resolves({data: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS});
            chooseNameStub.onFirstCall().resolves('mySaaSOpsToolsEnvironment');
            showQuickPickYesNoStub.withArgs('Are you connecting to a service instance on IBM Cloud?').resolves(UserInputUtil.YES);
            axiosGetStub.onFirstCall().resolves({
                data: {
                        next_url: null,
                        resources: [{
                                        resource_plan_id: 'blockchain-standard',
                                        name: 'myBlockchainPlatform',
                                        guid: 'someGUID1',
                                        dashboard_url: 'https://some.dashboard.url1/some/path'
                                    }, {
                                        resource_plan_id: 'blockchain-standard',
                                        name: 'myBlockchainPlatform2',
                                        guid: 'someGUID2',
                                        dashboard_url: 'https://some.dashboard.url2/some/path'
                                    }]
                }
            });
            chooseBlockchainStub.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            const environments: Array<FabricEnvironmentRegistryEntry> = await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(0);

            cloudAccountGetAccessTokenStub.should.have.been.called;
            axiosGetStub.should.have.been.calledOnce;
            chooseBlockchainStub.should.have.been.calledOnce;
            deleteEnvironmentSpy.should.have.not.been.called;
            removeRuntimeSpy.should.not.have.been.called;
            executeCommandStub.should.have.not.been.calledWith(ExtensionCommands.EDIT_NODE_FILTERS, sinon.match.instanceOf(FabricEnvironmentRegistryEntry), true, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);
            executeCommandStub.should.have.not.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
        });

        it('should fail if OpsTools not deployed adding an OpsTool instance (SaaA)', async () => {
            chooseMethodStub.resolves({data: UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS});
            chooseNameStub.onFirstCall().resolves('mySaaSOpsToolsEnvironment');
            showQuickPickYesNoStub.withArgs('Are you connecting to a service instance on IBM Cloud?').resolves(UserInputUtil.YES);
            axiosGetStub.onFirstCall().resolves(resourcesResponseMock);
            axiosGetStub.onSecondCall().resolves({
                status: 100,
                data: {
                    endpoint: urlSaaS
                }
            });
            const deploymentError: Error = new Error(`Got status 100. Please make sure the IBM Blockchain Platform Console deployment has finished before adding environment.`);
            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            const environments: Array<FabricEnvironmentRegistryEntry> = await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(0);

            cloudAccountGetAccessTokenStub.should.have.been.called;
            axiosGetStub.should.have.been.calledTwice;
            chooseBlockchainStub.should.have.not.been.called;
            deleteEnvironmentSpy.should.have.not.been.called;
            removeRuntimeSpy.should.not.have.been.called;
            executeCommandStub.should.have.not.been.calledWith(ExtensionCommands.EDIT_NODE_FILTERS, sinon.match.instanceOf(FabricEnvironmentRegistryEntry), true, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);
            executeCommandStub.should.have.not.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Failed to add a new environment: ${deploymentError.message}`, `Failed to add a new environment: ${deploymentError.toString()}`);
        });

    });
});
