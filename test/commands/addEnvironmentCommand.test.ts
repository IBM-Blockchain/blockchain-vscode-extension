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
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../../extension/logging/OutputAdapter';
import { ExtensionCommands } from '../../ExtensionCommands';
import { Reporter } from '../../extension/util/Reporter';
import { SettingConfigurations } from '../../SettingConfigurations';
import { FabricEnvironmentRegistryEntry } from '../../extension/registries/FabricEnvironmentRegistryEntry';

// tslint:disable no-unused-expression
chai.should();
chai.use(sinonChai);

describe('AddEnvironmentCommand', () => {
    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();
    let logSpy: sinon.SinonSpy;
    let showInputBoxStub: sinon.SinonStub;

    let executeCommandStub: sinon.SinonStub;
    let sendTelemetryEventStub: sinon.SinonStub;

    before(async () => {
        await TestUtil.setupTests(mySandBox);
    });

    after(async () => {
        await TestUtil.restoreAll();
    });

    describe('addEnvironment', () => {

        beforeEach(async () => {
            // reset the available gateways
            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_ENVIRONMENTS, [], vscode.ConfigurationTarget.Global);

            logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
            showInputBoxStub = mySandBox.stub(vscode.window, 'showInputBox');

            executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand').callThrough();
            executeCommandStub.withArgs(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT).resolves(true);
            executeCommandStub.withArgs(ExtensionCommands.REFRESH_ENVIRONMENTS).resolves();
            sendTelemetryEventStub = mySandBox.stub(Reporter.instance(), 'sendTelemetryEvent');
        });

        afterEach(async () => {
            mySandBox.restore();
        });

        it('should test an environment can be added', async () => {
            showInputBoxStub.onFirstCall().resolves('myEnvironment');

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            const environments: Array<any> = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_ENVIRONMENTS);

            environments.length.should.equal(1);
            environments[0].should.deep.equal({
                name: 'myEnvironment'
            });

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, sinon.match.instanceOf(FabricEnvironmentRegistryEntry));
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new environment');
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('addEnvironmentCommand');
        });

        it('should test multiple environments can be added', async () => {
            showInputBoxStub.onFirstCall().resolves('myEnvironmentOne');

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            showInputBoxStub.reset();
            showInputBoxStub.onFirstCall().resolves('myEnvironmentTwo');

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            const environments: Array<any> = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_ENVIRONMENTS);

            environments.length.should.equal(2);
            environments[0].should.deep.equal({
                name: 'myEnvironmentOne'
            });

            environments[1].should.deep.equal({
                name: 'myEnvironmentTwo'
            });

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, sinon.match.instanceOf(FabricEnvironmentRegistryEntry));
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new environment');
            logSpy.getCall(2).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(3).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new environment');
            sendTelemetryEventStub.should.have.been.calledTwice;
            sendTelemetryEventStub.should.have.been.calledWithExactly('addEnvironmentCommand');
        });

        it('should test adding a environment can be cancelled when giving a environment name', async () => {
            showInputBoxStub.onFirstCall().resolves();

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            const environments: Array<any> = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_ENVIRONMENTS);
            environments.length.should.equal(0);
            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'Add environment');
            sendTelemetryEventStub.should.not.have.been.called;
        });

        it('should handle errors when adding nodes to an environment', async () => {
            showInputBoxStub.onFirstCall().resolves('myEnvironment');

            const error: Error = new Error('some error');

            executeCommandStub.withArgs(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT).rejects(error);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            const environments: Array<any> = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_ENVIRONMENTS);

            environments.length.should.equal(0);
            logSpy.should.have.been.calledTwice;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Failed to add a new environment: ${error.message}`, `Failed to add a new environment: ${error.toString()}`);
            sendTelemetryEventStub.should.not.have.been.called;
        });

        it('should error if a environment with the same name already exists', async () => {
            const error: Error = new Error('An environment with this name already exists.');

            showInputBoxStub.resolves('myEnvironmentOne');

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            const environments: Array<any> = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_ENVIRONMENTS);

            environments.length.should.equal(1);
            environments[0].should.deep.equal({
                name: 'myEnvironmentOne'
            });

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, sinon.match.instanceOf(FabricEnvironmentRegistryEntry));
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new environment');
            logSpy.getCall(2).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.getCall(3).should.have.been.calledWith(LogType.ERROR, `Failed to add a new environment: ${error.message}`, `Failed to add a new environment: ${error.toString()}`);
            sendTelemetryEventStub.should.have.been.calledOnce;
        });

        it('should add environment but warn if nodes are not valid', async () => {
            showInputBoxStub.onFirstCall().resolves('myEnvironment');

            executeCommandStub.withArgs(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT).resolves(false);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            const environments: Array<any> = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_ENVIRONMENTS);

            environments.length.should.equal(1);
            environments[0].should.deep.equal({
                name: 'myEnvironment'
            });

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, sinon.match.instanceOf(FabricEnvironmentRegistryEntry));
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Add environment');
            logSpy.should.have.been.calledWith(LogType.WARNING, 'Added a new environment, but some nodes could not be added');
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('addEnvironmentCommand');
        });

        it('should cancel environment creation if no nodes have been added', async () => {
            showInputBoxStub.onFirstCall().resolves('myEnvironment');

            executeCommandStub.withArgs(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT).resolves(undefined);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);

            const environments: Array<any> = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_ENVIRONMENTS);
            environments.length.should.equal(0);
            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'Add environment');
            sendTelemetryEventStub.should.not.have.been.called;
        });
    });
});
