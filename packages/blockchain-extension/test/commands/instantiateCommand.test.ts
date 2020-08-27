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
import * as fs from 'fs-extra';
import { TestUtil } from '../TestUtil';
import { UserInputUtil } from '../../extension/commands/UserInputUtil';
import { BlockchainTreeItem } from '../../extension/explorer/model/BlockchainTreeItem';
import { BlockchainEnvironmentExplorerProvider } from '../../extension/explorer/environmentExplorer';
import { PackageRegistryEntry } from '../../extension/registries/PackageRegistryEntry';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { SmartContractsTreeItem } from '../../extension/explorer/runtimeOps/connectedTree/SmartContractsTreeItem';
import { InstantiateCommandTreeItem } from '../../extension/explorer/runtimeOps/connectedTree/InstantiateCommandTreeItem';
import { ChannelsOpsTreeItem } from '../../extension/explorer/runtimeOps/connectedTree/ChannelsOpsTreeItem';
import { ExtensionCommands } from '../../ExtensionCommands';
import { VSCodeBlockchainDockerOutputAdapter } from '../../extension/logging/VSCodeBlockchainDockerOutputAdapter';
import { FabricEnvironmentConnection } from 'ibm-blockchain-platform-environment-v1';
import { Reporter } from '../../extension/util/Reporter';
import { FabricEnvironmentManager, ConnectedState } from '../../extension/fabric/environments/FabricEnvironmentManager';
import { FabricEnvironmentRegistryEntry, FabricRuntimeUtil, LogType, EnvironmentType } from 'ibm-blockchain-platform-common';
import { PackageRegistry } from '../../extension/registries/PackageRegistry';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';
import { FabricDebugConfigurationProvider } from '../../extension/debug/FabricDebugConfigurationProvider';

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

        let allChildren: Array<BlockchainTreeItem>;
        let blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider;
        let instantiateCommandTreeItem: InstantiateCommandTreeItem;
        let smartContractsChildren: BlockchainTreeItem[];
        let channelsChildren: BlockchainTreeItem[];
        let showYesNo: sinon.SinonStub;
        let showQuickPick: sinon.SinonStub;
        let browseStub: sinon.SinonStub;
        let sendTelemetryEventStub: sinon.SinonStub;
        let environmentConnectionStub: sinon.SinonStub;
        let environmentRegistryStub: sinon.SinonStub;
        let openDialogOptions: any;
        let policyObject: any;
        let policyString: string;

        beforeEach(async () => {
            executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand');
            executeCommandStub.withArgs(ExtensionCommands.CONNECT_TO_GATEWAY).resolves();
            executeCommandStub.withArgs(ExtensionCommands.CONNECT_TO_ENVIRONMENT).resolves();
            executeCommandStub.callThrough();

            fabricRuntimeMock = mySandBox.createStubInstance(FabricEnvironmentConnection);
            fabricRuntimeMock.connect.resolves();
            fabricRuntimeMock.instantiateChaincode.resolves();
            fabricRuntimeMock.getInstalledChaincode.resolves(new Map());

            environmentConnectionStub = mySandBox.stub(FabricEnvironmentManager.instance(), 'getConnection').returns((fabricRuntimeMock));

            const environmentRegistryEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
            environmentRegistryEntry.name = FabricRuntimeUtil.LOCAL_FABRIC;
            environmentRegistryEntry.managedRuntime = true;
            environmentRegistryEntry.environmentType = EnvironmentType.LOCAL_ENVIRONMENT;

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

            fabricRuntimeMock.getInstantiatedChaincode.resolves([]);
            const map: Map<string, Array<string>> = new Map<string, Array<string>>();
            map.set('myChannel', ['peerOne']);
            fabricRuntimeMock.createChannelMap.resolves({channelMap: map, v2channels: []});

            blockchainRuntimeExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();
            allChildren = await blockchainRuntimeExplorerProvider.getChildren();

            const smartContracts: SmartContractsTreeItem = allChildren[1] as SmartContractsTreeItem;
            smartContractsChildren = await blockchainRuntimeExplorerProvider.getChildren(smartContracts);
            const instantiatedSmartContractsList: BlockchainTreeItem[] = await blockchainRuntimeExplorerProvider.getChildren(smartContractsChildren[1]);
            instantiateCommandTreeItem = instantiatedSmartContractsList[0] as InstantiateCommandTreeItem;

            const channels: ChannelsOpsTreeItem = allChildren[2] as ChannelsOpsTreeItem;
            channelsChildren = await blockchainRuntimeExplorerProvider.getChildren(channels);

            showQuickPick = mySandBox.stub(UserInputUtil, 'showQuickPick').resolves(UserInputUtil.DEFAULT_SC_EP);
            browseStub = mySandBox.stub(UserInputUtil, 'browse');

            openDialogOptions = {
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                openLabel: 'Select',
                filters: {
                    Identity: ['json']
                }
            };

            policyString = `{
                "identities": [
                    { "role": { "name": "member", "mspId": "ecobankMSP" }},
                    { "role": { "name": "member", "mspId": "finregMSP" }},
                    { "role": { "name": "member", "mspId": "digibankMSP" }}
                ],
                "policy": {
                    "2-of": [{ "signed-by": 0 }, { "signed-by": 1 }, { "signed-by": 2 }]
                }
            }`;

            policyObject = JSON.parse(policyString);
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

        it(`should stop if user cancelled passing custom JSON CC EP file`, async () => {
            executeCommandStub.resetHistory();
            showYesNo.onFirstCall().resolves(UserInputUtil.NO);
            showQuickPick.resolves(UserInputUtil.CUSTOM);

            browseStub.withArgs('Browse for the JSON file containing the smart contract endorsement policy', UserInputUtil.BROWSE_LABEL, openDialogOptions, true).resolves(undefined);
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });

            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT);
            fabricRuntimeMock.instantiateChaincode.should.not.have.been.called;

            dockerLogsOutputSpy.should.not.have.been.called;
            browseStub.should.have.been.calledOnce;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS, 'Successfully instantiated smart contract');
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
            sendTelemetryEventStub.should.not.have.been.called;
        });

        it(`should be able to pass a chaincode EP`, async () => {
            showYesNo.resolves(UserInputUtil.NO);
            showQuickPick.resolves(UserInputUtil.CUSTOM);
            browseStub.withArgs('Browse for the JSON file containing the smart contract endorsement policy', UserInputUtil.BROWSE_LABEL, openDialogOptions, true).resolves(vscode.Uri.file('myPath'));
            const readFileStub: sinon.SinonStub = mySandBox.stub(fs, 'readFile').resolves(policyString);
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });

            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT);
            fabricRuntimeMock.instantiateChaincode.should.have.been.calledOnceWithExactly('myContract', '0.0.1', ['peerOne'], 'myChannel', 'instantiate', ['arg1', 'arg2', 'arg3'], undefined, policyObject);

            dockerLogsOutputSpy.should.have.been.called;
            browseStub.should.have.been.calledOnce;
            readFileStub.should.have.been.calledOnce;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully instantiated smart contract');
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('instantiateCommand');
        });

        it(`should handle any errors parsing the chaincode EP`, async () => {
            showYesNo.resolves(UserInputUtil.NO);
            showQuickPick.resolves(UserInputUtil.CUSTOM);
            browseStub.withArgs('Browse for the JSON file containing the smart contract endorsement policy', UserInputUtil.BROWSE_LABEL, openDialogOptions, true).resolves(vscode.Uri.file('myPath'));
            const readFileStub: sinon.SinonStub = mySandBox.stub(fs, 'readFile').resolves(`{invalidJSON}`);
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });

            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT);
            fabricRuntimeMock.instantiateChaincode.should.not.have.been.called;

            dockerLogsOutputSpy.should.not.have.been.called;
            browseStub.should.have.been.calledOnce;
            readFileStub.should.have.been.calledOnce;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Unable to read smart contract endorsement policy: Unexpected token i in JSON at position 1`);
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
            sendTelemetryEventStub.should.not.have.been.calledOnceWithExactly('instantiateCommand');
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

        it('should instantiate smart contract through the tree by clicking + Instantiate in the runtime ops view', async () => {
            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT, instantiateCommandTreeItem);

            fabricRuntimeMock.instantiateChaincode.should.have.been.calledWith('myContract', '0.0.1', ['peerOne'], 'myChannel', 'instantiate', ['arg1', 'arg2', 'arg3'], undefined);

            dockerLogsOutputSpy.should.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully instantiated smart contract');
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('instantiateCommand');
        });

        it('should instantiate smart contract through the tree by right-clicking Instantiated in the runtime ops view', async () => {
            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT, smartContractsChildren[0]);

            fabricRuntimeMock.instantiateChaincode.should.have.been.calledWith('myContract', '0.0.1', ['peerOne'], 'myChannel', 'instantiate', ['arg1', 'arg2', 'arg3'], undefined);

            dockerLogsOutputSpy.should.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully instantiated smart contract');
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('instantiateCommand');
        });

        it('should instantiate smart contract through the tree by right-clicking on channel in the runtime ops view', async () => {
            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT, channelsChildren[0]);

            fabricRuntimeMock.instantiateChaincode.should.have.been.calledWith('myContract', '0.0.1', ['peerOne'], 'myChannel', 'instantiate', ['arg1', 'arg2', 'arg3'], undefined);

            dockerLogsOutputSpy.should.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully instantiated smart contract');
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('instantiateCommand');
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
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'somepackage', version: '0.0.1', path: undefined }).resolves({ name: 'somepackage', version: '0.0.1', path: undefined });

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

            fabricRuntimeMock.instantiateChaincode.should.have.been.calledWith('somepackage', '0.0.1', ['peerOne'], 'myChannel', 'instantiate', ['arg1', 'arg2', 'arg3'], undefined);

            dockerLogsOutputSpy.should.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully instantiated smart contract');
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('instantiateCommand');
        });

        it('should be able to cancel install and instantiate for package', async () => {
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'somepackage', version: '0.0.1', path: undefined }).resolves();

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

            fabricRuntimeMock.instantiateChaincode.should.not.been.calledWith('somepackage', '0.0.1', ['peerOne'], 'myChannel', 'instantiate', ['arg1', 'arg2', 'arg3'], undefined);
            dockerLogsOutputSpy.should.not.have.been.called;
            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'instantiateSmartContract');
        });

        it('should package, install and instantiate a project', async () => {
            executeCommandStub.withArgs(ExtensionCommands.PACKAGE_SMART_CONTRACT).resolves({ name: 'somepackage', version: '0.0.1', path: undefined });
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'somepackage', version: '0.0.1', path: undefined }).resolves({ name: 'somepackage', version: '0.0.1', path: undefined });

            showChaincodeAndVersionQuickPick.resolves({
                label: 'somepackage@0.0.1',
                description: 'Open Project',
                data: {
                    packageEntry: undefined,
                    workspace: mySandBox.stub()
                }
            });

            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT);

            fabricRuntimeMock.instantiateChaincode.should.have.been.calledWith('somepackage', '0.0.1', ['peerOne'], 'myChannel', 'instantiate', ['arg1', 'arg2', 'arg3'], undefined);

            dockerLogsOutputSpy.should.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully instantiated smart contract');
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('instantiateCommand');
        });

        it('should be able to cancel a project packaging, installing and instantiating', async () => {
            executeCommandStub.withArgs(ExtensionCommands.PACKAGE_SMART_CONTRACT).resolves({ name: 'somepackage', version: '0.0.1', path: undefined });
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'somepackage', version: '0.0.1', path: undefined }).resolves();

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
            dockerLogsOutputSpy.should.not.have.been.called;
            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'instantiateSmartContract');
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
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT).resolves({ name: 'beer', version: 'vscode-debug-123456', path: undefined });

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
            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT, undefined, 'someChannelName', ['peerHi', 'peerHa']);

            fabricRuntimeMock.instantiateChaincode.should.have.been.calledWith('beer', 'vscode-debug-123456', ['peerHi', 'peerHa'], 'someChannelName', 'instantiate', ['arg1', 'arg2', 'arg3'], undefined);

            dockerLogsOutputSpy.should.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully instantiated smart contract');
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.PACKAGE_SMART_CONTRACT);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.INSTALL_SMART_CONTRACT);
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('instantiateCommand');
        });

        it('should not package or install if already packackaged or installed', async () => {
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

            const installedChaincodeMap: Map<string, string[]> = new Map<string, string[]>();
            installedChaincodeMap.set('beer', ['vscode-debug-123456']);

            fabricRuntimeMock.getInstalledChaincode.resolves(installedChaincodeMap);
            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT, undefined, 'someChannelName', ['peerHi', 'peerHa']);

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
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerHi', 'peerHa'], { name: 'beer', version: 'vscode-debug-123456', path: undefined }).resolves({ name: 'beer', version: 'vscode-debug-123456', path: undefined });

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

            const installedChaincodeMap: Map<string, string[]> = new Map<string, string[]>();
            installedChaincodeMap.set('beer', ['vscode-debug-wrong']);

            fabricRuntimeMock.getInstalledChaincode.resolves(installedChaincodeMap);
            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT, undefined, 'someChannelName', ['peerHi', 'peerHa']);

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
            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT, undefined, 'someChannelName', ['peerHi', 'peerHa']);

            fabricRuntimeMock.instantiateChaincode.should.not.been.called;
            dockerLogsOutputSpy.should.not.have.been.called;
            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'instantiateSmartContract');
        });
    });
});
