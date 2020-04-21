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
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { ExtensionCommands } from '../../ExtensionCommands';
import { VSCodeBlockchainDockerOutputAdapter } from '../../extension/logging/VSCodeBlockchainDockerOutputAdapter';
import { FabricEnvironmentConnection } from 'ibm-blockchain-platform-environment-v1';
import { Reporter } from '../../extension/util/Reporter';
import { FabricEnvironmentManager, ConnectedState } from '../../extension/fabric/environments/FabricEnvironmentManager';
import { FabricEnvironmentRegistryEntry, FabricRuntimeUtil, LogType, EnvironmentType } from 'ibm-blockchain-platform-common';

chai.use(sinonChai);

describe('ApproveCommand', () => {
    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();

    before(async () => {
        await TestUtil.setupTests(mySandBox);
    });

    describe('approveSmartContract', () => {
        let fabricRuntimeMock: sinon.SinonStubbedInstance<FabricEnvironmentConnection>;

        let executeCommandStub: sinon.SinonStub;
        let logSpy: sinon.SinonSpy;
        let dockerLogsOutputSpy: sinon.SinonSpy;

        let sendTelemetryEventStub: sinon.SinonStub;
        let environmentConnectionStub: sinon.SinonStub;
        let environmentRegistryStub: sinon.SinonStub;

        beforeEach(async () => {
            executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand');
            executeCommandStub.withArgs(ExtensionCommands.CONNECT_TO_ENVIRONMENT).resolves();
            executeCommandStub.withArgs(ExtensionCommands.REFRESH_GATEWAYS).resolves();
            executeCommandStub.withArgs(ExtensionCommands.REFRESH_ENVIRONMENTS).resolves();
            executeCommandStub.callThrough();

            fabricRuntimeMock = mySandBox.createStubInstance(FabricEnvironmentConnection);
            fabricRuntimeMock.connect.resolves();
            fabricRuntimeMock.approveSmartContractDefinition.resolves();

            environmentConnectionStub = mySandBox.stub(FabricEnvironmentManager.instance(), 'getConnection').returns((fabricRuntimeMock));

            const environmentRegistryEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
            environmentRegistryEntry.name = FabricRuntimeUtil.LOCAL_FABRIC;
            environmentRegistryEntry.managedRuntime = true;
            environmentRegistryEntry.environmentType = EnvironmentType.LOCAL_ENVIRONMENT;

            environmentRegistryStub = mySandBox.stub(FabricEnvironmentManager.instance(), 'getEnvironmentRegistryEntry').returns(environmentRegistryEntry);

            mySandBox.stub(FabricEnvironmentManager.instance(), 'getState').returns(ConnectedState.CONNECTED);

            logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
            dockerLogsOutputSpy = mySandBox.spy(VSCodeBlockchainDockerOutputAdapter.instance(FabricRuntimeUtil.LOCAL_FABRIC), 'show');
            sendTelemetryEventStub = mySandBox.stub(Reporter.instance(), 'sendTelemetryEvent');
        });

        afterEach(async () => {
            mySandBox.restore();
        });

        it('should approve the smart contract through the command', async () => {
            await vscode.commands.executeCommand(ExtensionCommands.APPROVE_SMART_CONTRACT, 'myOrderer', 'mychannel', ['peerOne', 'peerTwo'], 'mySmartContract', '0.0.1', 'myPackageId', 1);
            fabricRuntimeMock.approveSmartContractDefinition.should.have.been.calledWith('myOrderer', 'mychannel', ['peerOne', 'peerTwo'], 'mySmartContract', '0.0.1', 'myPackageId', 1);

            dockerLogsOutputSpy.should.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'approveSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully approved smart contract definition');
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('approveCommand');
        });

        it('should approve the smart contract through the command when not connected', async () => {
            environmentConnectionStub.resetHistory();
            environmentConnectionStub.onFirstCall().returns(undefined);
            await vscode.commands.executeCommand(ExtensionCommands.APPROVE_SMART_CONTRACT, 'myOrderer', 'mychannel', ['peerOne', 'peerTwo'], 'mySmartContract', '0.0.1', 'myPackageId', 1);
            fabricRuntimeMock.approveSmartContractDefinition.should.have.been.calledWith('myOrderer', 'mychannel', ['peerOne', 'peerTwo'], 'mySmartContract', '0.0.1', 'myPackageId', 1);

            dockerLogsOutputSpy.should.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'approveSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully approved smart contract definition');
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('approveCommand');
        });

        it('should not show docker logs if not managed runtime', async () => {
            const registryEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
            registryEntry.name = 'myFabric';
            registryEntry.managedRuntime = false;
            environmentRegistryStub.returns(registryEntry);
            await vscode.commands.executeCommand(ExtensionCommands.APPROVE_SMART_CONTRACT, 'myOrderer', 'mychannel', ['peerOne', 'peerTwo'], 'mySmartContract', '0.0.1', 'myPackageId', 1);
            fabricRuntimeMock.approveSmartContractDefinition.should.have.been.calledWith('myOrderer', 'mychannel', ['peerOne', 'peerTwo'], 'mySmartContract', '0.0.1', 'myPackageId', 1);

            dockerLogsOutputSpy.should.not.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'approveSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully approved smart contract definition');
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('approveCommand');
        });

        it('should return if no connection', async () => {
            environmentConnectionStub.returns(undefined);
            await vscode.commands.executeCommand(ExtensionCommands.APPROVE_SMART_CONTRACT, 'myOrderer', 'mychannel', ['peerOne', 'peerTwo'], 'mySmartContract', '0.0.1', 'myPackageId', 1);
            fabricRuntimeMock.approveSmartContractDefinition.should.not.have.been.called;

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'approveSmartContract');
        });

        it('should handle error from approving smart contract', async () => {
            const error: Error = new Error('some error');

            fabricRuntimeMock.approveSmartContractDefinition.rejects(error);

            await vscode.commands.executeCommand(ExtensionCommands.APPROVE_SMART_CONTRACT, 'myOrderer', 'mychannel', ['peerOne', 'peerTwo'], 'mySmartContract', '0.0.1', 'myPackageId', 1).should.eventually.be.rejectedWith('some error');

            fabricRuntimeMock.approveSmartContractDefinition.should.have.been.calledWith('myOrderer', 'mychannel', ['peerOne', 'peerTwo'], 'mySmartContract', '0.0.1', 'myPackageId', 1);

            dockerLogsOutputSpy.should.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'approveSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Error approving smart contract: ${error.message}`, `Error approving smart contract: ${error.toString()}`);
            sendTelemetryEventStub.should.not.have.been.called;
        });
    });
});
