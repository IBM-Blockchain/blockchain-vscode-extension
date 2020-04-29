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
// tslint:disable no-unused-expression

import * as vscode from 'vscode';

import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';

import { TestUtil } from '../TestUtil';
import { UserInputUtil } from '../../extension/commands/UserInputUtil';
import { ExtensionCommands } from '../../ExtensionCommands';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { DeployView } from '../../extension/webview/DeployView';
import { FabricEnvironmentManager } from '../../extension/fabric/environments/FabricEnvironmentManager';
import { FabricEnvironmentConnection } from 'ibm-blockchain-platform-environment-v1';
import { FabricEnvironmentRegistryEntry, FabricEnvironmentRegistry, FabricRuntimeUtil, LogType } from 'ibm-blockchain-platform-common';

chai.use(sinonChai);
chai.should();

describe('OpenDeployView', () => {
    let mySandBox: sinon.SinonSandbox = sinon.createSandbox();
    let executeCommandStub: sinon.SinonStub;
    let logStub: sinon.SinonStub;
    let openViewStub: sinon.SinonStub;
    let showFabricEnvironmentQuickPickBoxStub: sinon.SinonStub;
    let showChannelQuickPickBoxStub: sinon.SinonStub;
    let fabricEnvironmentManager: FabricEnvironmentManager;
    let getConnectionStub: sinon.SinonStub;
    let localEnvironmentConnectionMock: sinon.SinonStubbedInstance<FabricEnvironmentConnection>;
    let otherEnvironmentConnectionMock: sinon.SinonStubbedInstance<FabricEnvironmentConnection>;

    before(async () => {
        await TestUtil.setupTests(mySandBox);
        await TestUtil.setupLocalFabric();
    });

    describe('OpenDeployView', () => {

        beforeEach(async () => {
            mySandBox = sinon.createSandbox();

            logStub = mySandBox.stub(VSCodeBlockchainOutputAdapter.instance(), 'log').resolves();

            executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand');
            executeCommandStub.callThrough();
            executeCommandStub.withArgs(ExtensionCommands.CONNECT_TO_ENVIRONMENT).resolves();
            executeCommandStub.withArgs(ExtensionCommands.DISCONNECT_ENVIRONMENT).resolves();

            showFabricEnvironmentQuickPickBoxStub = mySandBox.stub(UserInputUtil, 'showFabricEnvironmentQuickPickBox');
            showChannelQuickPickBoxStub = mySandBox.stub(UserInputUtil, 'showChannelQuickPickBox');

            localEnvironmentConnectionMock = mySandBox.createStubInstance(FabricEnvironmentConnection);
            localEnvironmentConnectionMock.environmentName = FabricRuntimeUtil.LOCAL_FABRIC;

            otherEnvironmentConnectionMock = mySandBox.createStubInstance(FabricEnvironmentConnection);
            otherEnvironmentConnectionMock.environmentName = 'otherEnvironment';

            fabricEnvironmentManager = FabricEnvironmentManager.instance();
            getConnectionStub = mySandBox.stub(fabricEnvironmentManager, 'getConnection');

            openViewStub = mySandBox.stub(DeployView.prototype, 'openView').resolves();
        });

        afterEach(async () => {
            mySandBox.restore();
        });

        it('should return if no environment selected', async () => {
            showFabricEnvironmentQuickPickBoxStub.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.OPEN_DEPLOY_PAGE);

            showFabricEnvironmentQuickPickBoxStub.should.have.been.calledOnceWithExactly('Select an environment', false, false);
            getConnectionStub.should.not.have.been.called;
            showChannelQuickPickBoxStub.should.not.have.been.called;
            openViewStub.should.not.have.been.called;
            logStub.should.not.have.been.called;
        });

        it('should connect to an environment and open the deploy view', async () => {
            const localEnvironmentRegistryEntry: FabricEnvironmentRegistryEntry = await FabricEnvironmentRegistry.instance().get(FabricRuntimeUtil.LOCAL_FABRIC);
            showFabricEnvironmentQuickPickBoxStub.resolves({label: FabricRuntimeUtil.LOCAL_FABRIC, data: localEnvironmentRegistryEntry});
            getConnectionStub.onCall(0).returns(undefined);
            getConnectionStub.onCall(1).returns(localEnvironmentConnectionMock);
            showChannelQuickPickBoxStub.resolves({label: 'mychannel', data: ['Org1Peer1']});
            await vscode.commands.executeCommand(ExtensionCommands.OPEN_DEPLOY_PAGE);

            showFabricEnvironmentQuickPickBoxStub.should.have.been.calledOnceWithExactly('Select an environment', false, false);
            getConnectionStub.should.have.been.calledTwice;
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, localEnvironmentRegistryEntry);
            showChannelQuickPickBoxStub.should.have.been.calledOnceWithExactly('Select a channel');
            openViewStub.should.have.been.calledOnce;
            logStub.should.not.have.been.called;
        });

        it('should open the deploy view if already connected to the chosen environment', async () => {
            const localEnvironmentRegistryEntry: FabricEnvironmentRegistryEntry = await FabricEnvironmentRegistry.instance().get(FabricRuntimeUtil.LOCAL_FABRIC);
            showFabricEnvironmentQuickPickBoxStub.resolves({label: FabricRuntimeUtil.LOCAL_FABRIC, data: localEnvironmentRegistryEntry});
            getConnectionStub.returns(localEnvironmentConnectionMock);
            showChannelQuickPickBoxStub.resolves({label: 'mychannel', data: ['Org1Peer1']});
            await vscode.commands.executeCommand(ExtensionCommands.OPEN_DEPLOY_PAGE);

            showFabricEnvironmentQuickPickBoxStub.should.have.been.calledOnceWithExactly('Select an environment', false, false);
            getConnectionStub.should.have.been.calledOnce;
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, localEnvironmentRegistryEntry);
            showChannelQuickPickBoxStub.should.have.been.calledOnceWithExactly('Select a channel');
            openViewStub.should.have.been.calledOnce;
            logStub.should.not.have.been.called;
        });

        it('should disconnect and connect to the selected environment, then open the deploy view', async () => {
            const localEnvironmentRegistryEntry: FabricEnvironmentRegistryEntry = await FabricEnvironmentRegistry.instance().get(FabricRuntimeUtil.LOCAL_FABRIC);
            showFabricEnvironmentQuickPickBoxStub.resolves({label: FabricRuntimeUtil.LOCAL_FABRIC, data: localEnvironmentRegistryEntry});
            getConnectionStub.onCall(0).returns(otherEnvironmentConnectionMock);
            getConnectionStub.onCall(1).returns(localEnvironmentConnectionMock);
            showChannelQuickPickBoxStub.resolves({label: 'mychannel', data: ['Org1Peer1']});
            await vscode.commands.executeCommand(ExtensionCommands.OPEN_DEPLOY_PAGE);

            showFabricEnvironmentQuickPickBoxStub.should.have.been.calledOnceWithExactly('Select an environment', false, false);
            getConnectionStub.should.have.been.calledTwice;
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, localEnvironmentRegistryEntry);
            showChannelQuickPickBoxStub.should.have.been.calledOnceWithExactly('Select a channel');
            openViewStub.should.have.been.calledOnce;
            logStub.should.not.have.been.called;
        });

        it('should return if no channel is selected', async () => {
            const localEnvironmentRegistryEntry: FabricEnvironmentRegistryEntry = await FabricEnvironmentRegistry.instance().get(FabricRuntimeUtil.LOCAL_FABRIC);
            showFabricEnvironmentQuickPickBoxStub.resolves({label: FabricRuntimeUtil.LOCAL_FABRIC, data: localEnvironmentRegistryEntry});
            getConnectionStub.returns(localEnvironmentConnectionMock);
            showChannelQuickPickBoxStub.resolves();
            await vscode.commands.executeCommand(ExtensionCommands.OPEN_DEPLOY_PAGE);

            showFabricEnvironmentQuickPickBoxStub.should.have.been.calledOnceWithExactly('Select an environment', false, false);
            getConnectionStub.should.have.been.calledOnce;
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, localEnvironmentRegistryEntry);
            showChannelQuickPickBoxStub.should.have.been.calledOnceWithExactly('Select a channel');
            openViewStub.should.not.have.been.called;
            logStub.should.not.have.been.called;
        });

        it('should throw an error if unable to connect to the selected environment', async () => {
            const localEnvironmentRegistryEntry: FabricEnvironmentRegistryEntry = await FabricEnvironmentRegistry.instance().get(FabricRuntimeUtil.LOCAL_FABRIC);
            showFabricEnvironmentQuickPickBoxStub.resolves({label: FabricRuntimeUtil.LOCAL_FABRIC, data: localEnvironmentRegistryEntry});
            getConnectionStub.onCall(0).returns(otherEnvironmentConnectionMock);
            getConnectionStub.onCall(1).returns(undefined);
            await vscode.commands.executeCommand(ExtensionCommands.OPEN_DEPLOY_PAGE);

            showFabricEnvironmentQuickPickBoxStub.should.have.been.calledOnceWithExactly('Select an environment', false, false);
            getConnectionStub.should.have.been.calledTwice;
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, localEnvironmentRegistryEntry);
            openViewStub.should.not.have.been.calledOnce;
            showChannelQuickPickBoxStub.should.not.have.been.called;
            const error: Error = new Error(`Unable to connect to environment: ${FabricRuntimeUtil.LOCAL_FABRIC}`);
            logStub.should.have.been.calledOnceWithExactly(LogType.ERROR, error.message, error.toString());
        });
    });
});
