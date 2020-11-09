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
import * as path from 'path';
import { TestUtil } from '../TestUtil';
import { UserInputUtil } from '../../extension/commands/UserInputUtil';
import { PackageRegistryEntry } from '../../extension/registries/PackageRegistryEntry';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { ExtensionCommands } from '../../ExtensionCommands';
import { VSCodeBlockchainDockerOutputAdapter } from '../../extension/logging/VSCodeBlockchainDockerOutputAdapter';
import { FabricEnvironmentConnection } from 'ibm-blockchain-platform-environment-v1';
import { Reporter } from '../../extension/util/Reporter';
import { FabricEnvironmentManager, ConnectedState } from '../../extension/fabric/environments/FabricEnvironmentManager';
import { FabricEnvironmentRegistryEntry, FabricRuntimeUtil, LogType, EnvironmentType } from 'ibm-blockchain-platform-common';
import { PackageRegistry } from '../../extension/registries/PackageRegistry';
import { FabricDebugConfigurationProvider } from '../../extension/debug/FabricDebugConfigurationProvider';
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
        let showChannelQuickPickStub: sinon.SinonStub;
        let showChaincodeAndVersionQuickPick: sinon.SinonStub;
        let showInputBoxStub: sinon.SinonStub;

        let showYesNo: sinon.SinonStub;
        let showQuickPick: sinon.SinonStub;
        let browseStub: sinon.SinonStub;
        let sendTelemetryEventStub: sinon.SinonStub;
        let environmentConnectionStub: sinon.SinonStub;
        let environmentRegistryStub: sinon.SinonStub;
        let policyString: string;
        let map: Map<string, Array<string>>;

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

            showChannelQuickPickStub = mySandBox.stub(UserInputUtil, 'showChannelQuickPickBox').resolves({
                label: 'myChannel',
                data: ['peerOne']
            });

            showChaincodeAndVersionQuickPick = mySandBox.stub(UserInputUtil, 'showChaincodeAndVersionQuickPick').withArgs(sinon.match.any, 'myChannel', ['peerOne']).resolves(
                {
                    label: 'myContract@0.0.1',
                    data: {
                        packageEntry: {
                            name: 'myContract',
                            version: '0.0.1',
                            path: undefined
                        } as PackageRegistryEntry,
                        workspace: undefined
                    }
                }
            );

            showInputBoxStub = mySandBox.stub(UserInputUtil, 'showInputBox');
            showInputBoxStub.onFirstCall().resolves('instantiate');
            showInputBoxStub.onSecondCall().resolves('["arg1", "arg2", "arg3"]');

            showYesNo = mySandBox.stub(UserInputUtil, 'showQuickPickYesNo').resolves(UserInputUtil.NO);

            logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
            dockerLogsOutputSpy = mySandBox.spy(VSCodeBlockchainDockerOutputAdapter.instance(FabricRuntimeUtil.LOCAL_FABRIC), 'show');
            sendTelemetryEventStub = mySandBox.stub(Reporter.instance(), 'sendTelemetryEvent');

            fabricRuntimeMock.getAllPeerNames.returns(['peerOne']);

            fabricRuntimeMock.getCommittedSmartContractDefinitions.resolves([]);
            map = new Map<string, Array<string>>();
            map.set('myChannel', ['peerOne']);
            fabricRuntimeMock.createChannelMap.resolves(map);

            showQuickPick = mySandBox.stub(UserInputUtil, 'showQuickPick').resolves(UserInputUtil.DEFAULT_SC_EP);
            browseStub = mySandBox.stub(UserInputUtil, 'browse');

            policyString = 'OR("ecobankMSP.member")';

        });

        afterEach(async () => {
            await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT_GATEWAY);
            mySandBox.restore();
        });

        it('should instantiate the smart contract through the command', async () => {
            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT);
            fabricRuntimeMock.instantiateChaincode.should.have.been.calledWith('myContract', '0.0.1', ['peerOne'], 'myChannel', 'instantiate', ['arg1', 'arg2', 'arg3'], undefined);

            dockerLogsOutputSpy.should.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully instantiated smart contract');
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('instantiateCommand');
        });

        it('should instantiate the smart contract through the command when not connected', async () => {
            environmentConnectionStub.resetHistory();
            environmentConnectionStub.onFirstCall().returns(undefined);
            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT);
            fabricRuntimeMock.instantiateChaincode.should.have.been.calledWith('myContract', '0.0.1', ['peerOne'], 'myChannel', 'instantiate', ['arg1', 'arg2', 'arg3'], undefined);

            dockerLogsOutputSpy.should.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully instantiated smart contract');
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('instantiateCommand');
        });

        it('should instantiate the smart contract through the command with collection', async () => {
            showYesNo.resolves(UserInputUtil.YES);
            mySandBox.stub(UserInputUtil, 'getWorkspaceFolders').returns([]);
            browseStub.resolves(path.join('myPath'));
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });

            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT);
            fabricRuntimeMock.instantiateChaincode.should.have.been.calledWith('myContract', '0.0.1', ['peerOne'], 'myChannel', 'instantiate', ['arg1', 'arg2', 'arg3'], 'myPath', undefined);

            dockerLogsOutputSpy.should.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully instantiated smart contract');
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('instantiateCommand');
        });

        it('should instantiate the smart contract through the command with collection and set dialog folder', async () => {
            showYesNo.resolves(UserInputUtil.YES);

            const workspaceFolder: any = {
                name: 'myFolder',
                uri: vscode.Uri.file('myPath')
            };

            mySandBox.stub(UserInputUtil, 'getWorkspaceFolders').returns([workspaceFolder]);
            browseStub.resolves(path.join('myPath'));
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });

            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT);

            browseStub.should.have.been.calledWith(sinon.match.any, sinon.match.any, {
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                openLabel: 'Select',
                defaultUri: vscode.Uri.file(path.join('myPath'))
            });

            fabricRuntimeMock.instantiateChaincode.should.have.been.calledWith('myContract', '0.0.1', ['peerOne'], 'myChannel', 'instantiate', ['arg1', 'arg2', 'arg3'], 'myPath', undefined);

            dockerLogsOutputSpy.should.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully instantiated smart contract');
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('instantiateCommand');
        });

        it('should stop if cancelled when asked what chaincode EP to use', async () => {
            executeCommandStub.resetHistory();
            showYesNo.resolves(UserInputUtil.NO);
            showQuickPick.resolves(undefined);

            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });

            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT);
            fabricRuntimeMock.instantiateChaincode.should.not.have.been.called;

            dockerLogsOutputSpy.should.not.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS, 'Successfully instantiated smart contract');
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
            sendTelemetryEventStub.should.not.have.been.called;
        });

        it(`should use the default chaincode EP when selecting '${UserInputUtil.DEFAULT_SC_EP}'`, async () => {
            showYesNo.resolves(UserInputUtil.NO);
            showQuickPick.resolves(UserInputUtil.DEFAULT_SC_EP);

            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });

            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT);
            fabricRuntimeMock.instantiateChaincode.should.have.been.called;

            dockerLogsOutputSpy.should.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully instantiated smart contract');
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('instantiateCommand');
        });

        it(`should stop if user cancelled passing custom EP string`, async () => {
            executeCommandStub.resetHistory();
            showYesNo.onFirstCall().resolves(UserInputUtil.NO);
            showQuickPick.resolves(UserInputUtil.CUSTOM);
            showInputBoxStub.withArgs('Enter the smart contract endorsement policy: e.g. OR("Org1MSP.member","Org2MSP.member")').resolves();
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });

            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT);
            fabricRuntimeMock.instantiateChaincode.should.not.have.been.called;

            dockerLogsOutputSpy.should.not.have.been.called;
            showInputBoxStub.should.have.been.calledWith('Enter the smart contract endorsement policy: e.g. OR("Org1MSP.member","Org2MSP.member")');
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS, 'Successfully instantiated smart contract');
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
            sendTelemetryEventStub.should.not.have.been.called;
        });

        it(`should be able to pass a chaincode EP`, async () => {
            showYesNo.resolves(UserInputUtil.NO);
            showQuickPick.resolves(UserInputUtil.CUSTOM);
            showInputBoxStub.withArgs('Enter the smart contract endorsement policy: e.g. OR("Org1MSP.member","Org2MSP.member")').resolves(policyString);

            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });

            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT);
            fabricRuntimeMock.instantiateChaincode.should.have.been.calledOnceWithExactly('myContract', '0.0.1', ['peerOne'], 'myChannel', 'instantiate', ['arg1', 'arg2', 'arg3'], undefined, policyString.replace(/"/g, '\''));

            dockerLogsOutputSpy.should.have.been.called;
            showInputBoxStub.should.have.been.calledWith('Enter the smart contract endorsement policy: e.g. OR("Org1MSP.member","Org2MSP.member")');
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully instantiated smart contract');
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('instantiateCommand');
        });

        it('should not show docker logs if not managed runtime', async () => {
            const registryEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
            registryEntry.name = 'myFabric';
            registryEntry.managedRuntime = false;
            environmentRegistryStub.returns(registryEntry);
            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT);
            fabricRuntimeMock.instantiateChaincode.should.have.been.calledWith('myContract', '0.0.1', ['peerOne'], 'myChannel', 'instantiate', ['arg1', 'arg2', 'arg3'], undefined);

            dockerLogsOutputSpy.should.not.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully instantiated smart contract');
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('instantiateCommand');
        });

        it('should return if no connection', async () => {
            environmentConnectionStub.returns(undefined);
            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT);
            fabricRuntimeMock.instantiateChaincode.should.not.have.been.called;

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
        });

        it('should handle cancel when choosing if want collection', async () => {
            showYesNo.resolves();
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });

            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT);
            fabricRuntimeMock.instantiateChaincode.should.not.have.been.called;
        });

        it('should handle cancel when choosing collection path', async () => {
            showYesNo.resolves(UserInputUtil.YES);
            browseStub.resolves();
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });

            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT);
            fabricRuntimeMock.instantiateChaincode.should.not.have.been.called;
        });

        it('should handle choosing channel being cancelled', async () => {
            showChannelQuickPickStub.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT);

            fabricRuntimeMock.instantiateChaincode.should.not.have.been.called;
            dockerLogsOutputSpy.should.not.been.called;
            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'instantiateSmartContract');
        });

        it('should handle error from instantiating smart contract', async () => {
            const error: Error = new Error('some error');

            fabricRuntimeMock.instantiateChaincode.rejects(error);

            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT);

            fabricRuntimeMock.instantiateChaincode.should.have.been.calledWith('myContract', '0.0.1', ['peerOne'], 'myChannel', 'instantiate', ['arg1', 'arg2', 'arg3'], undefined);

            dockerLogsOutputSpy.should.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Error instantiating smart contract: ${error.message}`, `Error instantiating smart contract: ${error.toString()}`);
            sendTelemetryEventStub.should.not.have.been.called;
        });

        it('should handle cancel when choosing chaincode and version', async () => {
            showChaincodeAndVersionQuickPick.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT);
            fabricRuntimeMock.instantiateChaincode.should.not.have.been.called;

            dockerLogsOutputSpy.should.not.been.called;
            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'instantiateSmartContract');
        });

        it('should instantiate the smart contract through the command with no function', async () => {
            showInputBoxStub.onFirstCall().resolves('');
            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT);
            fabricRuntimeMock.instantiateChaincode.should.have.been.calledWithExactly('myContract', '0.0.1', ['peerOne'], 'myChannel', '', [], undefined, undefined);
            showInputBoxStub.should.have.been.calledOnce;

            dockerLogsOutputSpy.should.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully instantiated smart contract');
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('instantiateCommand');
        });

        it('should instantiate the smart contract through the command with function but no args', async () => {
            showInputBoxStub.onFirstCall().resolves('instantiate');
            showInputBoxStub.onSecondCall().resolves('');
            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT);
            fabricRuntimeMock.instantiateChaincode.should.have.been.calledWithExactly('myContract', '0.0.1', ['peerOne'], 'myChannel', 'instantiate', [], undefined, undefined);
            showInputBoxStub.should.have.been.calledTwice;

            dockerLogsOutputSpy.should.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully instantiated smart contract');
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('instantiateCommand');
        });

        it('should cancel instantiating when user escape entering function', async () => {
            showInputBoxStub.onFirstCall().resolves(undefined);
            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT);
            fabricRuntimeMock.instantiateChaincode.should.not.have.been.called;
            showInputBoxStub.should.have.been.calledOnce;
            dockerLogsOutputSpy.should.not.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS, 'Successfully instantiated smart contract');
        });

        it('should cancel instantiating when user escape entering args', async () => {
            showInputBoxStub.onFirstCall().resolves('instantiate');
            showInputBoxStub.onSecondCall().resolves(undefined);
            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT);
            fabricRuntimeMock.instantiateChaincode.should.not.have.been.called;
            showInputBoxStub.should.have.been.calledTwice;

            dockerLogsOutputSpy.should.not.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS, 'Successfully instantiated smart contract');
        });

        it('should throw error if args not valid json', async () => {
            showInputBoxStub.onFirstCall().resolves('instantiate');
            showInputBoxStub.onSecondCall().resolves('["wrong]');
            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT);
            fabricRuntimeMock.instantiateChaincode.should.not.have.been.called;
            showInputBoxStub.should.have.been.calledTwice;

            dockerLogsOutputSpy.should.not.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.should.have.been.calledWith(LogType.ERROR, 'Error with instantiate function arguments: Unexpected end of JSON input');
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS, 'Successfully instantiated smart contract');
        });

        it('should throw error if args does not start with [', async () => {
            showInputBoxStub.onFirstCall().resolves('instantiate');
            showInputBoxStub.onSecondCall().resolves('{"name": "bob"}');
            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT);
            fabricRuntimeMock.instantiateChaincode.should.not.have.been.called;
            showInputBoxStub.should.have.been.calledTwice;

            dockerLogsOutputSpy.should.not.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.should.have.been.calledWith(LogType.ERROR, 'Error with instantiate function arguments: instantiate function arguments should be in the format ["arg1", {"key" : "value"}]');
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS, 'Successfully instantiated smart contract');
        });

        it('should throw error if args does not end with ]', async () => {
            showInputBoxStub.onFirstCall().resolves('instantiate');
            showInputBoxStub.onSecondCall().resolves('1');
            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT);
            fabricRuntimeMock.instantiateChaincode.should.not.have.been.called;
            showInputBoxStub.should.have.been.calledTwice;

            dockerLogsOutputSpy.should.not.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.should.have.been.calledWith(LogType.ERROR, 'Error with instantiate function arguments: instantiate function arguments should be in the format ["arg1", {"key" : "value"}]');
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS, 'Successfully instantiated smart contract');
        });

        it('should install and instantiate package', async () => {
            const installedChaincodeMap: FabricInstalledSmartContract[] = [{label: 'beer@0.0.1', packageId: 'beer'}, {label: 'somepackage@0.0.1', packageId: 'somepackage'}];
            fabricRuntimeMock.getInstalledSmartContracts.resolves(installedChaincodeMap);
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, map, { name: 'somepackage', version: '0.0.1', path: undefined }).resolves();
            showChaincodeAndVersionQuickPick.resolves({
                label: 'somepackage@0.0.1',
                description: 'Packaged',
                data: {
                    packageEntry: {
                        name: 'somepackage',
                        version: '0.0.1',
                        path: undefined
                    },
                    workspace: undefined
                }
            });

            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT);

            fabricRuntimeMock.instantiateChaincode.should.have.been.calledWith('somepackage', '0.0.1', ['peerOne'], 'myChannel', 'instantiate', ['arg1', 'arg2', 'arg3'], undefined, undefined);

            dockerLogsOutputSpy.should.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully instantiated smart contract');
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('instantiateCommand');
        });

        it('should throw error if unable to find package after install', async () => {
            const expectedError: Error = new Error('failed to get contract from peer after install');
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, map, { name: 'somepackage', version: '0.0.1', path: undefined }).resolves();

            showChaincodeAndVersionQuickPick.resolves({
                label: 'somepackage@0.0.1',
                description: 'Packaged',
                data: {
                    packageEntry: {
                        name: 'somepackage',
                        version: '0.0.1',
                        path: undefined
                    },
                    workspace: undefined
                }
            });

            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT);

            fabricRuntimeMock.instantiateChaincode.should.have.not.been.called;
            dockerLogsOutputSpy.should.have.not.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.should.have.been.calledWith(LogType.ERROR, `Error instantiating smart contract: ${expectedError.message}`, `Error instantiating smart contract: ${expectedError.toString()}`);
            sendTelemetryEventStub.should.have.not.been.called;
        });

        it('should be able to cancel install and instantiate for package', async () => {
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'somepackage', version: '0.0.1', path: undefined }).resolves();

            showChaincodeAndVersionQuickPick.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT);

            fabricRuntimeMock.instantiateChaincode.should.not.been.calledWith('somepackage', '0.0.1', ['peerOne'], 'myChannel', 'instantiate', ['arg1', 'arg2', 'arg3'], undefined);
            dockerLogsOutputSpy.should.not.have.been.called;
            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'instantiateSmartContract');
        });

        it('should package, install and instantiate a project', async () => {
            const installedChaincodeMap: FabricInstalledSmartContract[] = [{label: 'beer@0.0.1', packageId: 'beer'}, {label: 'somepackage@0.0.1', packageId: 'somepackage'}];
            fabricRuntimeMock.getInstalledSmartContracts.resolves(installedChaincodeMap);
            executeCommandStub.withArgs(ExtensionCommands.PACKAGE_SMART_CONTRACT).resolves({ name: 'somepackage', version: '0.0.1', path: undefined });
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, map, { name: 'somepackage', version: '0.0.1', path: undefined }).resolves();

            showChaincodeAndVersionQuickPick.resolves({
                label: 'somepackage@0.0.1',
                description: 'Open Project',
                data: {
                    packageEntry: undefined,
                    workspace: mySandBox.stub()
                }
            });

            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT);

            fabricRuntimeMock.instantiateChaincode.should.have.been.calledWith('somepackage', '0.0.1', ['peerOne'], 'myChannel', 'instantiate', ['arg1', 'arg2', 'arg3'], undefined, undefined);

            dockerLogsOutputSpy.should.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully instantiated smart contract');
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('instantiateCommand');
        });

        it('should be able to handle a project failing to package', async () => {
            executeCommandStub.withArgs(ExtensionCommands.PACKAGE_SMART_CONTRACT).resolves();

            showChaincodeAndVersionQuickPick.resolves({
                label: 'somepackage@0.0.1',
                description: 'Open Project',
                data: {
                    packageEntry: undefined,
                    workspace: mySandBox.stub()
                }
            });

            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT);

            fabricRuntimeMock.instantiateChaincode.should.not.been.called;
            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'instantiateSmartContract');
        });

        it('should instantiate a debug package when called from the debug command list', async () => {
            executeCommandStub.withArgs(ExtensionCommands.PACKAGE_SMART_CONTRACT).resolves({ name: 'beer', version: 'vscode-debug-123456', path: undefined });
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT).resolves();
            const installedChaincodeMap: FabricInstalledSmartContract[] = [{label: 'beer@vscode-debug-123456', packageId: 'beer'}];
            fabricRuntimeMock.getInstalledSmartContracts.onFirstCall().resolves([]);
            fabricRuntimeMock.getInstalledSmartContracts.onSecondCall().resolves(installedChaincodeMap);

            const workspaceFolder: any = {
                name: 'beer',
                uri: vscode.Uri.file('myPath')
            };
            mySandBox.stub(UserInputUtil, 'getWorkspaceFolders').returns([workspaceFolder]);
            const activeDebugSessionStub: any = {
                configuration: {
                    env: {
                        CORE_CHAINCODE_ID_NAME: 'beer:vscode-debug-123456'
                    },
                    debugEvent: FabricDebugConfigurationProvider.debugEvent
                }
            };

            mySandBox.stub(vscode.debug, 'activeDebugSession').value(activeDebugSessionStub);
            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT, 'someChannelName', ['peerHi', 'peerHa']);

            fabricRuntimeMock.instantiateChaincode.should.have.been.calledWith('beer', 'vscode-debug-123456', ['peerHi', 'peerHa'], 'someChannelName', 'instantiate', ['arg1', 'arg2', 'arg3'], undefined);

            dockerLogsOutputSpy.should.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully instantiated smart contract');
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.PACKAGE_SMART_CONTRACT);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.INSTALL_SMART_CONTRACT);
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('instantiateCommand');
        });

        it('should not package or install during instantiate if already packackaged or installed', async () => {
            const workspaceFolder: any = {
                name: 'beer',
                uri: vscode.Uri.file('myPath')
            };
            mySandBox.stub(UserInputUtil, 'getWorkspaceFolders').returns([workspaceFolder]);
            const activeDebugSessionStub: any = {
                configuration: {
                    env: {
                        CORE_CHAINCODE_ID_NAME: 'beer:vscode-debug-123456'
                    },
                    debugEvent: FabricDebugConfigurationProvider.debugEvent
                }
            };

            mySandBox.stub(vscode.debug, 'activeDebugSession').value(activeDebugSessionStub);

            const packageRegistryEntry: PackageRegistryEntry = new PackageRegistryEntry();
            packageRegistryEntry.name = 'beer';
            packageRegistryEntry.version = 'vscode-debug-123456';
            mySandBox.stub(PackageRegistry.instance(), 'get').resolves(packageRegistryEntry);

            const installedChaincodeMap: FabricInstalledSmartContract[] = [{label: 'beer@vscode-debug-123456', packageId: 'beer'}];

            fabricRuntimeMock.getInstalledSmartContracts.resolves(installedChaincodeMap);
            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT, 'someChannelName', ['peerHi', 'peerHa']);

            fabricRuntimeMock.instantiateChaincode.should.have.been.calledWith('beer', 'vscode-debug-123456', ['peerHi', 'peerHa'], 'someChannelName', 'instantiate', ['arg1', 'arg2', 'arg3'], undefined);

            dockerLogsOutputSpy.should.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully instantiated smart contract');
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.PACKAGE_SMART_CONTRACT);
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.INSTALL_SMART_CONTRACT);
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('instantiateCommand');
        });

        it('should install if not correct version installed', async () => {
            executeCommandStub.withArgs(ExtensionCommands.PACKAGE_SMART_CONTRACT).resolves({ name: 'beer', version: 'vscode-debug-123456', path: undefined });
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, map, { name: 'beer', version: 'vscode-debug-123456', path: undefined }).resolves({ name: 'beer', version: 'vscode-debug-123456', path: undefined });

            const workspaceFolder: any = {
                name: 'beer',
                uri: vscode.Uri.file('myPath')
            };
            mySandBox.stub(UserInputUtil, 'getWorkspaceFolders').returns([workspaceFolder]);
            const activeDebugSessionStub: any = {
                configuration: {
                    env: {
                        CORE_CHAINCODE_ID_NAME: 'beer:vscode-debug-123456'
                    },
                    debugEvent: FabricDebugConfigurationProvider.debugEvent
                }
            };

            mySandBox.stub(vscode.debug, 'activeDebugSession').value(activeDebugSessionStub);

            const installedChaincodeMap: FabricInstalledSmartContract[] = [{label: 'beer@vscode-debug-wrong', packageId: 'beer'}];
            const installedChaincodeMapAfterInstall: FabricInstalledSmartContract[] = [{label: 'beer@vscode-debug-wrong', packageId: 'beer'}, {label: 'beer@vscode-debug-123456', packageId: 'beer'}];
            fabricRuntimeMock.getInstalledSmartContracts.onFirstCall().resolves(installedChaincodeMap);
            fabricRuntimeMock.getInstalledSmartContracts.onSecondCall().resolves(installedChaincodeMapAfterInstall);
            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT, 'someChannelName', ['peerHi', 'peerHa']);

            fabricRuntimeMock.instantiateChaincode.should.have.been.calledWith('beer', 'vscode-debug-123456', ['peerHi', 'peerHa'], 'someChannelName', 'instantiate', ['arg1', 'arg2', 'arg3'], undefined);

            dockerLogsOutputSpy.should.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully instantiated smart contract');
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.PACKAGE_SMART_CONTRACT);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.INSTALL_SMART_CONTRACT);
            sendTelemetryEventStub.should.have.been.calledOnce;
            sendTelemetryEventStub.should.have.been.calledWithExactly('instantiateCommand');
        });

        it('should hand the package command failing when called the command is called during a debug session', async () => {
            executeCommandStub.withArgs(ExtensionCommands.PACKAGE_SMART_CONTRACT).resolves();

            const workspaceFolder: any = {
                name: 'beer',
                uri: vscode.Uri.file('myPath'),
            };
            const activeDebugSessionStub: any = {
                configuration: {
                    env: {
                        CORE_CHAINCODE_ID_NAME: 'beer:vscode-debug-123456'
                    },
                    debugEvent: FabricDebugConfigurationProvider.debugEvent
                },
                workspaceFolder: workspaceFolder
            };

            mySandBox.stub(vscode.debug, 'activeDebugSession').value(activeDebugSessionStub);
            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT, 'someChannelName', ['peerHi', 'peerHa']);

            fabricRuntimeMock.instantiateChaincode.should.not.been.called;
            dockerLogsOutputSpy.should.not.have.been.called;
            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'instantiateSmartContract');
        });
    });
});
