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
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import { VSCodeBlockchainOutputAdapter } from '../../src/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../../src/logging/OutputAdapter';
import { ExtensionCommands } from '../../ExtensionCommands';
import { Reporter } from '../../src/util/Reporter';
import { SettingConfigurations } from '../../SettingConfigurations';

// tslint:disable no-unused-expression
chai.should();
chai.use(sinonChai);

describe('AddEnvironmentCommand', () => {
    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();
    let logSpy: sinon.SinonSpy;
    let showInputBoxStub: sinon.SinonStub;
    let browseStub: sinon.SinonStub;
    let copyFileStub: sinon.SinonStub;
    let ensureDirStub: sinon.SinonStub;
    let executeCommandSpy: sinon.SinonSpy;
    let sendTelemetryEventStub: sinon.SinonStub;
    let addMoreStub: sinon.SinonStub;

    before(async () => {
        await TestUtil.setupTests(mySandBox);
        await TestUtil.storeGatewaysConfig();
    });

    after(async () => {
        await TestUtil.restoreGatewaysConfig();
    });

    describe('addEnvironment', () => {

        beforeEach(async () => {
            // reset the available gateways
            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_ENVIRONMENTS, [], vscode.ConfigurationTarget.Global);

            logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
            showInputBoxStub = mySandBox.stub(vscode.window, 'showInputBox');
            browseStub = mySandBox.stub(UserInputUtil, 'browse');
            addMoreStub = mySandBox.stub(UserInputUtil, 'addMoreNodes').resolves(UserInputUtil.DONE_ADDING_NODES);
            ensureDirStub = mySandBox.stub(fs, 'ensureDir').resolves();
            copyFileStub = mySandBox.stub(fs, 'copyFile').resolves();

            executeCommandSpy = mySandBox.spy(vscode.commands, 'executeCommand');
            sendTelemetryEventStub = mySandBox.stub(Reporter.instance(), 'sendTelemetryEvent');
        });

        afterEach(async () => {
            mySandBox.restore();
        });

        it('should test an environment can be added', async () => {
            showInputBoxStub.onFirstCall().resolves('myEnvironment');

            const uri: vscode.Uri = vscode.Uri.file(path.join('myPath'));
            browseStub.onFirstCall().resolves([uri]);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            const environments: Array<any> = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_ENVIRONMENTS);

            environments.length.should.equal(1);
            environments[0].should.deep.equal({
                name: 'myEnvironment'
            });
            executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);
            ensureDirStub.should.have.been.calledOnce;
            copyFileStub.should.have.been.calledOnce;

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new environment');
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('addEnvironmentCommand');
        });

        it('should test multiple environments can be added', async () => {
            showInputBoxStub.onFirstCall().resolves('myEnvironmentOne');
            let uri: vscode.Uri = vscode.Uri.file(path.join('myPathOne'));
            browseStub.onFirstCall().resolves([uri]);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            showInputBoxStub.reset();
            showInputBoxStub.onFirstCall().resolves('myEnvironmentTwo');
            uri = vscode.Uri.file(path.join('myPathTwo'));
            browseStub.onSecondCall().resolves([uri]);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            const environments: Array<any> = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_ENVIRONMENTS);

            environments.length.should.equal(2);
            environments[0].should.deep.equal({
                name: 'myEnvironmentOne'
            });

            environments[1].should.deep.equal({
                name: 'myEnvironmentTwo'
            });

            executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
            ensureDirStub.should.have.been.calledTwice;
            copyFileStub.should.have.been.calledTwice;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new environment');
            logSpy.getCall(2).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(3).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new environment');
            sendTelemetryEventStub.should.have.been.calledTwice;
            sendTelemetryEventStub.should.have.been.calledWithExactly('addEnvironmentCommand');
        });

        it('should test an environment can be added in muliple goes', async () => {
            showInputBoxStub.onFirstCall().resolves('myEnvironment');

            let uri: vscode.Uri = vscode.Uri.file(path.join('myPath'));
            browseStub.onFirstCall().resolves([uri]);

            uri = vscode.Uri.file(path.join('myPathTwo'));
            browseStub.onSecondCall().resolves([uri]);

            addMoreStub.onFirstCall().resolves(UserInputUtil.ADD_MORE_NODES);
            addMoreStub.onSecondCall().resolves(UserInputUtil.DONE_ADDING_NODES);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            const environments: Array<any> = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_ENVIRONMENTS);

            environments.length.should.equal(1);
            environments[0].should.deep.equal({
                name: 'myEnvironment'
            });
            executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);
            ensureDirStub.should.have.been.calledOnce;
            copyFileStub.should.have.been.calledTwice;

            addMoreStub.should.have.been.calledTwice;

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new environment');
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('addEnvironmentCommand');
        });

        it('should test adding a environment can be cancelled when giving a environment name', async () => {
            showInputBoxStub.onFirstCall().resolves();

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            const environments: Array<any> = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_ENVIRONMENTS);
            environments.length.should.equal(0);
            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'Add environment');
            sendTelemetryEventStub.should.not.have.been.called;
        });

        it('should test adding a environment can be cancelled when giving node files', async () => {
            showInputBoxStub.onFirstCall().resolves('myEnvironment');
            const uri: vscode.Uri = vscode.Uri.file(path.join('myPath'));
            browseStub.onFirstCall().resolves([uri]);

            addMoreStub.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            browseStub.should.have.been.calledOnce;
            addMoreStub.should.have.been.calledOnce;
            const environments: Array<any> = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_ENVIRONMENTS);
            environments.length.should.equal(0);
            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'Add environment');
            sendTelemetryEventStub.should.not.have.been.called;
        });

        it('should test adding a environment can be cancelled when choosing to add more', async () => {
            showInputBoxStub.onFirstCall().resolves('myEnvironment');
            browseStub.onFirstCall().resolves();

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            browseStub.should.have.been.calledOnce;
            const environments: Array<any> = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_ENVIRONMENTS);
            environments.length.should.equal(0);
            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'Add environment');
            sendTelemetryEventStub.should.not.have.been.called;
        });

        it('should handle errors when adding a environment', async () => {
            showInputBoxStub.onFirstCall().resolves('myEnvironment');

            const uri: vscode.Uri = vscode.Uri.file(path.join('myPathOne'));
            browseStub.onFirstCall().resolves([uri]);

            addMoreStub.resolves(UserInputUtil.DONE_ADDING_NODES);

            const error: Error = new Error('some error');
            ensureDirStub.rejects(error);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            const environments: Array<any> = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_ENVIRONMENTS);

            environments.length.should.equal(0);
            logSpy.should.have.been.calledTwice;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Failed to add a new environment: ${error.message}`, `Failed to add a new environment: ${error.toString()}`);
            sendTelemetryEventStub.should.not.have.been.called;
        });

        it('should handle errors when copying node files', async () => {
            showInputBoxStub.onFirstCall().resolves('myEnvironment');

            const uriOne: vscode.Uri = vscode.Uri.file(path.join('myPathOne'));
            const uriTwo: vscode.Uri = vscode.Uri.file(path.join('myPathTwo'));
            browseStub.onFirstCall().resolves([uriOne, uriTwo]);

            const error: Error = new Error('some error');
            copyFileStub.onFirstCall().rejects(error);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            const environments: Array<any> = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_ENVIRONMENTS);

            environments.length.should.equal(1);

            environments[0].should.deep.equal({
                name: 'myEnvironment'
            });
            executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);

            logSpy.should.have.been.calledThrice;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Error importing node file ${uriOne.fsPath}: ${error.message}`, `Error importing node file ${uriOne.fsPath}: ${error.toString()}`);
            logSpy.getCall(2).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new environment');
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('addEnvironmentCommand');
        });

        it('should error if a environment with the same name already exists', async () => {
            const error: Error = new Error('An environment with this name already exists.');

            showInputBoxStub.resolves('myEnvironmentOne');
            const uri: vscode.Uri = vscode.Uri.file(path.join('myPathOne'));
            browseStub.resolves([uri]);

            addMoreStub.resolves(UserInputUtil.DONE_ADDING_NODES);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            const environments: Array<any> = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_ENVIRONMENTS);

            environments.length.should.equal(1);
            environments[0].should.deep.equal({
                name: 'myEnvironmentOne'
            });

            executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);
            ensureDirStub.should.have.been.calledOnce;
            copyFileStub.should.have.been.calledOnce;

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new environment');
            logSpy.getCall(2).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(3).should.have.been.calledWith(LogType.ERROR, `Failed to add a new environment: ${error.message}`, `Failed to add a new environment: ${error.toString()}`);
            sendTelemetryEventStub.should.have.been.calledOnce;
        });
    });
});
