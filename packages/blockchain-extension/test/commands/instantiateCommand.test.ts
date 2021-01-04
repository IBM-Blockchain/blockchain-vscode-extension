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
import { PackageRegistryEntry } from '../../extension/registries/PackageRegistryEntry';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { ExtensionCommands } from '../../ExtensionCommands';
import { VSCodeBlockchainDockerOutputAdapter } from '../../extension/logging/VSCodeBlockchainDockerOutputAdapter';
import { FabricEnvironmentConnection } from 'ibm-blockchain-platform-environment-v1';
import { Reporter } from '../../extension/util/Reporter';
import { FabricEnvironmentManager, ConnectedState } from '../../extension/fabric/environments/FabricEnvironmentManager';
import { FabricEnvironmentRegistryEntry, FabricRuntimeUtil, LogType, EnvironmentType } from 'ibm-blockchain-platform-common';
import { FabricInstalledSmartContract } from 'ibm-blockchain-platform-common/build/src/fabricModel/FabricInstalledSmartContract';

chai.use(sinonChai);

describe('InstantiateCommand', () => {
    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();

    before(async () => {
        await TestUtil.setupTests(mySandBox);
    });

    describe('InstantiateSmartContract', () => {
        let fabricRuntimeMock: sinon.SinonStubbedInstance<FabricEnvironmentConnection>;

        let executeCommandStub: sinon.SinonStub;
        let logSpy: sinon.SinonSpy;
        let dockerLogsOutputSpy: sinon.SinonSpy;

        let sendTelemetryEventStub: sinon.SinonStub;
        let environmentConnectionStub: sinon.SinonStub;
        let environmentRegistryStub: sinon.SinonStub;
        let map: Map<string, Array<string>>;

        let channelName: string;
        let peerNames: string[];
        let selectedPackage: PackageRegistryEntry;

        beforeEach(async () => {
            executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand');
            executeCommandStub.withArgs(ExtensionCommands.CONNECT_TO_GATEWAY).resolves();
            executeCommandStub.withArgs(ExtensionCommands.CONNECT_TO_ENVIRONMENT).resolves();
            executeCommandStub.callThrough();

            fabricRuntimeMock = mySandBox.createStubInstance(FabricEnvironmentConnection);
            fabricRuntimeMock.connect.resolves();
            fabricRuntimeMock.instantiateChaincode.resolves();
            fabricRuntimeMock.getInstalledSmartContracts.resolves([]);

            environmentConnectionStub = mySandBox.stub(FabricEnvironmentManager.instance(), 'getConnection').returns((fabricRuntimeMock));

            const environmentRegistryEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
            environmentRegistryEntry.name = FabricRuntimeUtil.LOCAL_FABRIC;
            environmentRegistryEntry.managedRuntime = true;
            environmentRegistryEntry.environmentType = EnvironmentType.LOCAL_MICROFAB_ENVIRONMENT;

            environmentRegistryStub = mySandBox.stub(FabricEnvironmentManager.instance(), 'getEnvironmentRegistryEntry').returns(environmentRegistryEntry);

            mySandBox.stub(FabricEnvironmentManager.instance(), 'getState').returns(ConnectedState.CONNECTED);

            logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
            dockerLogsOutputSpy = mySandBox.spy(VSCodeBlockchainDockerOutputAdapter.instance(FabricRuntimeUtil.LOCAL_FABRIC), 'show');
            sendTelemetryEventStub = mySandBox.stub(Reporter.instance(), 'sendTelemetryEvent');

            fabricRuntimeMock.getAllPeerNames.returns(['peerOne']);

            fabricRuntimeMock.getCommittedSmartContractDefinitions.resolves([]);
            map = new Map<string, Array<string>>();
            map.set('myChannel', ['peerOne']);
            fabricRuntimeMock.createChannelMap.resolves(map);

            channelName = 'myChannel';
            peerNames = ['peerOne'];
            selectedPackage = new PackageRegistryEntry({
                name: 'myContract',
                version: '0.0.1',
                path: undefined,
                sizeKB: 4
            });

        });

        afterEach(async () => {
            await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT_GATEWAY);
            mySandBox.restore();
        });

        it('should install and instantiate a smart contract', async () => {
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT).resolves([undefined, 'none']);
            const installedContract: FabricInstalledSmartContract = new FabricInstalledSmartContract('myContract@0.0.1', 'myContract');
            fabricRuntimeMock.getInstalledSmartContracts.onCall(1).resolves([installedContract]);

            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT, channelName, peerNames, selectedPackage, '', [], undefined, undefined);

            executeCommandStub.should.have.been.calledWithExactly(ExtensionCommands.INSTALL_SMART_CONTRACT, map, selectedPackage);
            fabricRuntimeMock.instantiateChaincode.should.have.been.calledWith(selectedPackage.name, selectedPackage.version, peerNames, channelName, '', [], undefined, undefined);

            dockerLogsOutputSpy.should.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully instantiated smart contract');
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('instantiateCommand');
        });

        it('should instantiate a smart contract that has already been installed', async () => {
            const installedContract: FabricInstalledSmartContract = new FabricInstalledSmartContract('myContract@0.0.1', 'myContract');
            fabricRuntimeMock.getInstalledSmartContracts.resolves([installedContract]);

            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT, channelName, peerNames, selectedPackage, '', [], undefined, undefined);

            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT).should.not.have.been.called;
            fabricRuntimeMock.instantiateChaincode.should.have.been.calledWith(selectedPackage.name, selectedPackage.version, peerNames, channelName, '', [], undefined, undefined);

            dockerLogsOutputSpy.should.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully instantiated smart contract');
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('instantiateCommand');
        });

        it('should instantiate a smart contract on a non-local environment', async () => {
            const opstoolsEnvironment: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
            opstoolsEnvironment.name = 'opstoolEnvironment';
            opstoolsEnvironment.managedRuntime = true;
            opstoolsEnvironment.environmentType = EnvironmentType.OPS_TOOLS_ENVIRONMENT;
            environmentRegistryStub.returns(opstoolsEnvironment);

            const installedContract: FabricInstalledSmartContract = new FabricInstalledSmartContract('myContract@0.0.1', 'myContract');
            fabricRuntimeMock.getInstalledSmartContracts.resolves([installedContract]);

            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT, channelName, peerNames, selectedPackage, '', [], undefined, undefined);

            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT).should.not.have.been.called;
            fabricRuntimeMock.instantiateChaincode.should.have.been.calledWith(selectedPackage.name, selectedPackage.version, peerNames, channelName, '', [], undefined, undefined);

            dockerLogsOutputSpy.should.not.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully instantiated smart contract');
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('instantiateCommand');
        });

        it('should not instantiate if not connected to an environment', async () => {
            environmentConnectionStub.returns(undefined);
            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT, channelName, peerNames, selectedPackage, '', [], undefined, undefined);
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT).should.not.have.been.called;
            fabricRuntimeMock.instantiateChaincode.should.not.have.been.called;
            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'instantiateSmartContract');
            executeCommandStub.withArgs(ExtensionCommands.REFRESH_GATEWAYS).should.not.have.been.called;
            sendTelemetryEventStub.should.not.have.been.called;

        });

        it('should handle error if smart contract is not installed properly', async () => {
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT).resolves([undefined, 'other']);

            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT, channelName, peerNames, selectedPackage, '', [], undefined, undefined);

            executeCommandStub.should.have.been.calledWithExactly(ExtensionCommands.INSTALL_SMART_CONTRACT, map, selectedPackage);
            fabricRuntimeMock.instantiateChaincode.should.not.have.been.called;

            dockerLogsOutputSpy.should.not.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            const error: Error = new Error('failed to get contract from peer after install');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Error instantiating smart contract: ${error.message}`, `Error instantiating smart contract: ${error.toString()}`);
            executeCommandStub.withArgs(ExtensionCommands.REFRESH_GATEWAYS).should.not.have.been.called;
            sendTelemetryEventStub.should.not.have.been.called;
        });

        it('should handle timeout error and contract not installed', async () => {
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT).resolves([undefined, 'timeout']);

            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT, channelName, peerNames, selectedPackage, '', [], undefined, undefined);

            executeCommandStub.should.have.been.calledWithExactly(ExtensionCommands.INSTALL_SMART_CONTRACT, map, selectedPackage);
            fabricRuntimeMock.instantiateChaincode.should.not.have.been.called;

            dockerLogsOutputSpy.should.not.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            const error: Error = new Error('failed to get contract from peer after install');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Error instantiating smart contract: ${error.message}`, `Error instantiating smart contract: ${error.toString()}`);
            executeCommandStub.withArgs(ExtensionCommands.REFRESH_GATEWAYS).should.not.have.been.called;
            fabricRuntimeMock.getInstalledSmartContracts.should.have.been.calledTwice;
            sendTelemetryEventStub.should.not.have.been.called;
        });

        it('should handle timeout error but contract marked as installed (image still building)', async () => {
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT).resolves([undefined, 'timeout']);
            const installedContract: FabricInstalledSmartContract = new FabricInstalledSmartContract('myContract@0.0.1', 'myContract');
            fabricRuntimeMock.getInstalledSmartContracts.onCall(1).resolves([installedContract]);

            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT, channelName, peerNames, selectedPackage, '', [], undefined, undefined);

            executeCommandStub.should.have.been.calledWithExactly(ExtensionCommands.INSTALL_SMART_CONTRACT, map, selectedPackage);
            fabricRuntimeMock.instantiateChaincode.should.not.have.been.called;

            dockerLogsOutputSpy.should.not.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            const error: Error = new Error('Chaincode installed but timed out waiting for the chaincode image to build. Please redeploy your chaincode package to attempt instantiation');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Error instantiating smart contract: ${error.message}`, `Error instantiating smart contract: ${error.toString()}`);
            executeCommandStub.withArgs(ExtensionCommands.REFRESH_GATEWAYS).should.not.have.been.called;
            fabricRuntimeMock.getInstalledSmartContracts.should.have.been.calledTwice;
            sendTelemetryEventStub.should.not.have.been.called;
        });

        it('should handle error', async () => {
            const error: Error = new Error(`he's dead jim`);
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT).rejects(error);

            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT, channelName, peerNames, selectedPackage, '', [], undefined, undefined);

            executeCommandStub.should.have.been.calledWithExactly(ExtensionCommands.INSTALL_SMART_CONTRACT, map, selectedPackage);
            fabricRuntimeMock.instantiateChaincode.should.not.have.been.called;

            dockerLogsOutputSpy.should.not.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Error instantiating smart contract: ${error.message}`, `Error instantiating smart contract: ${error.toString()}`);
            executeCommandStub.withArgs(ExtensionCommands.REFRESH_GATEWAYS).should.not.have.been.called;
            sendTelemetryEventStub.should.not.have.been.called;
        });

    });
});
