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
import { Reporter } from '../../extension/util/Reporter';
import { SmartContractsTreeItem } from '../../extension/explorer/runtimeOps/connectedTree/SmartContractsTreeItem';
import { ChannelsOpsTreeItem } from '../../extension/explorer/runtimeOps/connectedTree/ChannelsOpsTreeItem';
import { InstalledChainCodeOpsTreeItem } from '../../extension/explorer/runtimeOps/connectedTree/InstalledChainCodeOpsTreeItem';
import { ExtensionCommands } from '../../ExtensionCommands';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { FabricEnvironmentConnection } from 'ibm-blockchain-platform-environment-v1';
import { FabricEnvironmentManager, ConnectedState } from '../../extension/fabric/environments/FabricEnvironmentManager';
import { FabricEnvironmentRegistryEntry, FabricRuntimeUtil, LogType, EnvironmentType } from 'ibm-blockchain-platform-common';
import { VSCodeBlockchainDockerOutputAdapter } from '../../extension/logging/VSCodeBlockchainDockerOutputAdapter';
import { PackageRegistry } from '../../extension/registries/PackageRegistry';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';
import { FabricDebugConfigurationProvider } from '../../extension/debug/FabricDebugConfigurationProvider';

chai.use(sinonChai);

describe('UpgradeCommand', () => {
    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();

    before(async () => {
        await TestUtil.setupTests(mySandBox);
    });

    describe('UpgradeSmartContract', () => {
        let fabricRuntimeMock: sinon.SinonStubbedInstance<FabricEnvironmentConnection>;

        let executeCommandStub: sinon.SinonStub;
        let logSpy: sinon.SinonSpy;
        let showChannelQuickPickStub: sinon.SinonStub;
        let showChaincodeAndVersionQuickPick: sinon.SinonStub;
        let showInputBoxStub: sinon.SinonStub;
        let allChildren: Array<BlockchainTreeItem>;
        let reporterStub: sinon.SinonStub;
        let blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider;
        let instantiatedSmartContractsList: BlockchainTreeItem[];
        let smartContractsChildren: BlockchainTreeItem[];
        let channelsChildren: BlockchainTreeItem[];
        let showYesNo: sinon.SinonStub;
        let showQuickPick: sinon.SinonStub;
        let browseStub: sinon.SinonStub;
        let environmentStub: sinon.SinonStub;
        let dockerLogSpy: sinon.SinonSpy;
        let registryStub: sinon.SinonStub;
        let openDialogOptions: any;
        let policyObject: any;
        let policyString: string;
        let showRuntimeInstantiatedSmartContractsQuickPickStub: sinon.SinonStub;
        beforeEach(async function(): Promise<void> {

            // TODO JAKE: does this actually work though
            this.timeout(90000);

            reporterStub = mySandBox.stub(Reporter.instance(), 'sendTelemetryEvent');

            executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand');
            executeCommandStub.withArgs(ExtensionCommands.CONNECT_TO_GATEWAY).resolves();
            executeCommandStub.withArgs(ExtensionCommands.CONNECT_TO_ENVIRONMENT).resolves();
            executeCommandStub.callThrough();

            fabricRuntimeMock = mySandBox.createStubInstance(FabricEnvironmentConnection);
            fabricRuntimeMock.connect.resolves();
            fabricRuntimeMock.getInstalledChaincode.resolves(new Map());
            fabricRuntimeMock.upgradeChaincode.resolves();

            environmentStub = mySandBox.stub(FabricEnvironmentManager.instance(), 'getConnection').returns(fabricRuntimeMock);

            showChannelQuickPickStub = mySandBox.stub(UserInputUtil, 'showChannelQuickPickBox').resolves({
                label: 'channelOne',
                data: ['peerOne']
            });

            showInputBoxStub = mySandBox.stub(UserInputUtil, 'showInputBox');
            showInputBoxStub.onFirstCall().resolves('instantiate');
            showInputBoxStub.onSecondCall().resolves('["arg1" ,"arg2" , "arg3"]');

            logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
            dockerLogSpy = mySandBox.spy(VSCodeBlockchainDockerOutputAdapter.instance(FabricRuntimeUtil.LOCAL_FABRIC), 'show');

            fabricRuntimeMock.getAllPeerNames.returns(['peerOne']);

            fabricRuntimeMock.getInstantiatedChaincode.resolves([{ name: 'biscuit-network', version: '0.0.1' }]);

            const map: Map<string, Array<string>> = new Map<string, Array<string>>();
            map.set('channelOne', ['peerOne']);
            fabricRuntimeMock.createChannelMap.resolves({channelMap: map, v2channels: []});

            showChaincodeAndVersionQuickPick = mySandBox.stub(UserInputUtil, 'showChaincodeAndVersionQuickPick').withArgs(sinon.match.any, 'channelOne', ['peerOne']).resolves(
                {
                    label: 'biscuit-network@0.0.2',
                    description: 'Packaged',
                    data: {
                        packageEntry: {
                            name: 'biscuit-network',
                            version: '0.0.2',
                            path: undefined
                        }
                    }
                }
            );

            showRuntimeInstantiatedSmartContractsQuickPickStub = mySandBox.stub(UserInputUtil, 'showRuntimeInstantiatedSmartContractsQuickPick').withArgs('Select the instantiated smart contract to upgrade', 'channelOne').resolves(
                { label: 'biscuit-network@0.0.1', data: { name: 'biscuit-network', channel: 'channelOne', version: '0.0.1' } }
            );

            showYesNo = mySandBox.stub(UserInputUtil, 'showQuickPickYesNo').resolves(UserInputUtil.NO);

            const environmentRegistry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
            environmentRegistry.name = FabricRuntimeUtil.LOCAL_FABRIC;
            environmentRegistry.managedRuntime = true;
            environmentRegistry.environmentType = EnvironmentType.LOCAL_ENVIRONMENT;

            registryStub = mySandBox.stub(FabricEnvironmentManager.instance(), 'getEnvironmentRegistryEntry').returns(environmentRegistry);
            mySandBox.stub(FabricEnvironmentManager.instance(), 'getState').returns(ConnectedState.CONNECTED);

            blockchainRuntimeExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();
            allChildren = await blockchainRuntimeExplorerProvider.getChildren();
            const smartContracts: SmartContractsTreeItem = allChildren[1] as SmartContractsTreeItem;
            smartContractsChildren = await blockchainRuntimeExplorerProvider.getChildren(smartContracts);
            instantiatedSmartContractsList = await blockchainRuntimeExplorerProvider.getChildren(smartContractsChildren[1]);

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

        it('should upgrade the smart contract through the command', async () => {
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });

            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT);
            fabricRuntimeMock.upgradeChaincode.should.have.been.calledWith('biscuit-network', '0.0.2', ['peerOne'], 'channelOne', 'instantiate', ['arg1', 'arg2', 'arg3']);
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully upgraded smart contract');
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
            dockerLogSpy.should.have.been.called;
        });

        it('should upgrade the smart contract through the command and connect if not connected', async () => {
            environmentStub.resetHistory();
            environmentStub.onFirstCall().returns(undefined);
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });

            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT);
            fabricRuntimeMock.upgradeChaincode.should.have.been.calledWith('biscuit-network', '0.0.2', ['peerOne'], 'channelOne', 'instantiate', ['arg1', 'arg2', 'arg3']);
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully upgraded smart contract');
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
            dockerLogSpy.should.have.been.called;
        });

        it('should upgrade the smart contract through the command with collection', async () => {
            showYesNo.resolves(UserInputUtil.YES);
            mySandBox.stub(UserInputUtil, 'getWorkspaceFolders').returns([]);
            browseStub.resolves(path.join('myPath'));
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });

            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT);
            fabricRuntimeMock.upgradeChaincode.should.have.been.calledWith('biscuit-network', '0.0.2', ['peerOne'], 'channelOne', 'instantiate', ['arg1', 'arg2', 'arg3'], path.join('myPath'));
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully upgraded smart contract');
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
            dockerLogSpy.should.have.been.called;
        });

        it('should upgrade the smart contract through the command with collection and set dialog folder', async () => {
            showYesNo.resolves(UserInputUtil.YES);

            const workspaceFolder: any = {
                name: 'myFolder',
                uri: vscode.Uri.file('myPath')
            };

            mySandBox.stub(UserInputUtil, 'getWorkspaceFolders').returns([workspaceFolder]);
            browseStub.resolves(path.join('myPath'));
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });

            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT);

            browseStub.should.have.been.calledWith(sinon.match.any, sinon.match.any, {
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                openLabel: 'Select',
                defaultUri: vscode.Uri.file(path.join('myPath'))
            });

            fabricRuntimeMock.upgradeChaincode.should.have.been.calledWith('biscuit-network', '0.0.2', ['peerOne'], 'channelOne', 'instantiate', ['arg1', 'arg2', 'arg3'], path.join('myPath'));
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully upgraded smart contract');
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
            dockerLogSpy.should.have.been.called;
        });

        it('should stop if cancelled when asked what chaincode EP to use', async () => {
            showYesNo.resolves(UserInputUtil.NO);
            showQuickPick.resolves(undefined);

            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });

            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT);
            fabricRuntimeMock.upgradeChaincode.should.not.have.been.called;

            dockerLogSpy.should.not.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'upgradeSmartContract');
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS, 'Successfully upgraded smart contract');
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
            reporterStub.should.not.have.been.called;
        });

        it(`should use the default chaincode EP when selecting '${UserInputUtil.DEFAULT_SC_EP}'`, async () => {
            showYesNo.resolves(UserInputUtil.NO);
            showQuickPick.resolves(UserInputUtil.DEFAULT_SC_EP);

            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });

            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT);
            fabricRuntimeMock.upgradeChaincode.should.have.been.called;

            dockerLogSpy.should.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'upgradeSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully upgraded smart contract');
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
            reporterStub.should.have.been.calledOnceWithExactly('upgradeCommand');
        });

        it(`should stop if user cancelled passing custom JSON CC EP file`, async () => {
            showYesNo.onFirstCall().resolves(UserInputUtil.NO);
            showQuickPick.resolves(UserInputUtil.CUSTOM);

            browseStub.withArgs('Browse for the JSON file containing the smart contract endorsement policy', [UserInputUtil.BROWSE_LABEL], openDialogOptions, true).resolves(undefined);
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });

            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT);
            fabricRuntimeMock.upgradeChaincode.should.not.have.been.called;

            dockerLogSpy.should.not.have.been.called;
            browseStub.should.have.been.calledOnce;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'upgradeSmartContract');
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS, 'Successfully upgraded smart contract');
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
            reporterStub.should.not.have.been.called;
        });

        it(`should be able to pass a chaincode EP`, async () => {
            showYesNo.resolves(UserInputUtil.NO);
            showQuickPick.resolves(UserInputUtil.CUSTOM);
            browseStub.withArgs('Browse for the JSON file containing the smart contract endorsement policy', UserInputUtil.BROWSE_LABEL, openDialogOptions, true).resolves(vscode.Uri.file('myPath'));
            const readFileStub: sinon.SinonStub = mySandBox.stub(fs, 'readFile').resolves(policyString);
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });

            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT);
            fabricRuntimeMock.upgradeChaincode.should.have.been.calledOnceWithExactly('biscuit-network', '0.0.2', ['peerOne'], 'channelOne', 'instantiate', ['arg1', 'arg2', 'arg3'], undefined, policyObject);

            dockerLogSpy.should.have.been.called;
            browseStub.should.have.been.calledOnce;
            readFileStub.should.have.been.calledOnce;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'upgradeSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully upgraded smart contract');
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
            reporterStub.should.have.been.calledOnceWithExactly('upgradeCommand');
        });

        it(`should handle any errors parsing the chaincode EP`, async () => {
            showYesNo.resolves(UserInputUtil.NO);
            showQuickPick.resolves(UserInputUtil.CUSTOM);
            browseStub.withArgs('Browse for the JSON file containing the smart contract endorsement policy', UserInputUtil.BROWSE_LABEL, openDialogOptions, true).resolves(vscode.Uri.file('myPath'));
            const readFileStub: sinon.SinonStub = mySandBox.stub(fs, 'readFile').resolves(`{invalidJSON}`);
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });

            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT);
            fabricRuntimeMock.upgradeChaincode.should.not.have.been.called;

            dockerLogSpy.should.not.have.been.called;
            browseStub.should.have.been.calledOnce;
            readFileStub.should.have.been.calledOnce;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'upgradeSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Unable to read smart contract endorsement policy: Unexpected token i in JSON at position 1`);
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
            reporterStub.should.not.have.been.calledOnceWithExactly('upgradeCommand');
        });

        it('should not show docker logs if not managed runtime', async () => {
            const registryEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
            registryEntry.name = 'myFabric';
            registryEntry.managedRuntime = false;
            registryStub.returns(registryEntry);

            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });

            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT);
            fabricRuntimeMock.upgradeChaincode.should.have.been.calledWith('biscuit-network', '0.0.2', ['peerOne'], 'channelOne', 'instantiate', ['arg1', 'arg2', 'arg3']);
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully upgraded smart contract');
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
            dockerLogSpy.should.not.have.been.called;
        });

        it('should return if cannot connect', async () => {
            environmentStub.returns(undefined);
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });

            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT);
            fabricRuntimeMock.upgradeChaincode.should.not.have.been.called;
            dockerLogSpy.should.not.have.been.called;
        });

        it('should handle cancel when choosing if want collection', async () => {
            showYesNo.resolves();
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });

            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT);
            fabricRuntimeMock.upgradeChaincode.should.not.have.been.called;
            dockerLogSpy.should.not.have.been.called;
        });

        it('should handle cancel when choosing collection path', async () => {
            showYesNo.resolves(UserInputUtil.YES);
            browseStub.resolves();
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });

            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT);
            fabricRuntimeMock.upgradeChaincode.should.not.have.been.called;
            dockerLogSpy.should.not.have.been.called;
        });

        it('should handle choosing channel being cancelled', async () => {
            showRuntimeInstantiatedSmartContractsQuickPickStub.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT);

            fabricRuntimeMock.upgradeChaincode.should.not.have.been.called;
            dockerLogSpy.should.not.have.been.called;
        });

        it('should handle choosing cancel when choosing contract to upgrade', async () => {
            showChannelQuickPickStub.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT);

            fabricRuntimeMock.upgradeChaincode.should.not.have.been.called;
            dockerLogSpy.should.not.have.been.called;
        });

        it('should handle error from upgrading smart contract', async () => {
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });
            fabricRuntimeMock.upgradeChaincode.rejects({ message: 'some error' });

            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT);

            fabricRuntimeMock.upgradeChaincode.should.have.been.calledWith('biscuit-network', '0.0.2', ['peerOne'], 'channelOne', 'instantiate', ['arg1', 'arg2', 'arg3'], undefined);
            logSpy.should.have.been.calledWith(LogType.ERROR, 'Error upgrading smart contract: some error');
            dockerLogSpy.should.have.been.called;
        });

        it('should handle cancel when choosing chaincode and version', async () => {
            showChaincodeAndVersionQuickPick.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT);
            fabricRuntimeMock.upgradeChaincode.should.not.have.been.called;
            dockerLogSpy.should.not.have.been.called;
        });

        it('should upgrade smart contract through the tree by right-clicking on an instantiated smart contract in the runtime ops view', async () => {

            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });

            instantiatedSmartContractsList.length.should.equal(2);

            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT, instantiatedSmartContractsList[0] as InstalledChainCodeOpsTreeItem);

            fabricRuntimeMock.upgradeChaincode.should.have.been.calledWith('biscuit-network', '0.0.2', ['peerOne'], 'channelOne', 'instantiate', ['arg1', 'arg2', 'arg3'], undefined);

            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully upgraded smart contract');
            reporterStub.should.have.been.calledWith('upgradeCommand');
            dockerLogSpy.should.have.been.called;
        });

        it('should handle cancel choosing channel on upgrading from the contract on a tree', async () => {
            showChannelQuickPickStub.resolves();

            instantiatedSmartContractsList.length.should.equal(2);

            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT, instantiatedSmartContractsList[0] as InstalledChainCodeOpsTreeItem);

            fabricRuntimeMock.upgradeChaincode.should.not.have.been.called;

            reporterStub.should.not.have.been.called;
        });

        it('should upgrade smart contract through the tree by right-clicking on a channel in the runtime ops view', async () => {

            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });

            channelsChildren.length.should.equal(1);

            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT, channelsChildren[0]);

            fabricRuntimeMock.upgradeChaincode.should.have.been.calledWith('biscuit-network', '0.0.2', ['peerOne'], 'channelOne', 'instantiate', ['arg1', 'arg2', 'arg3'], undefined);

            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully upgraded smart contract');
            reporterStub.should.have.been.calledWith('upgradeCommand');
            dockerLogSpy.should.have.been.called;
        });

        it('should upgrade the smart contract through the command with no function', async () => {
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });
            showInputBoxStub.onFirstCall().resolves();
            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT);
            fabricRuntimeMock.upgradeChaincode.should.have.been.calledWith('biscuit-network', '0.0.2', ['peerOne'], 'channelOne', undefined, undefined, undefined);
            showInputBoxStub.should.have.been.calledOnce;
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully upgraded smart contract');
            dockerLogSpy.should.have.been.called;
        });

        it('should upgrade the smart contract through the command with function but no args', async () => {
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });
            showInputBoxStub.onFirstCall().resolves('instantiate');
            showInputBoxStub.onSecondCall().resolves('');
            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT);
            fabricRuntimeMock.upgradeChaincode.should.have.been.calledWithExactly('biscuit-network', '0.0.2', ['peerOne'], 'channelOne', 'instantiate', [], undefined, undefined);
            showInputBoxStub.should.have.been.calledTwice;
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully upgraded smart contract');
            dockerLogSpy.should.have.been.called;
        });

        it('should cancel if user escapes during inputting args', async () => {
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });
            showInputBoxStub.onFirstCall().resolves('instantiate');
            showInputBoxStub.onSecondCall().resolves(undefined);
            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT);
            fabricRuntimeMock.upgradeChaincode.should.not.have.been.called;
            showInputBoxStub.should.have.been.calledTwice;
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS, 'Successfully upgraded smart contract');
            dockerLogSpy.should.not.have.been.called;
        });

        it('should throw error if args not valid json', async () => {
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });
            showInputBoxStub.onFirstCall().resolves('instantiate');
            showInputBoxStub.onSecondCall().resolves('["wrong]');
            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT);
            fabricRuntimeMock.instantiateChaincode.should.not.have.been.called;
            showInputBoxStub.should.have.been.calledTwice;

            logSpy.should.have.been.calledWith(LogType.ERROR, 'Error with upgrade function arguments: Unexpected end of JSON input');
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS, 'Successfully upgraded smart contract');
            dockerLogSpy.should.not.have.been.called;
        });

        it('should throw error if args does not start with [', async () => {
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });
            showInputBoxStub.onFirstCall().resolves('instantiate');
            showInputBoxStub.onSecondCall().resolves('{"name": "bob"}');
            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT);
            fabricRuntimeMock.instantiateChaincode.should.not.have.been.called;
            showInputBoxStub.should.have.been.calledTwice;

            logSpy.should.have.been.calledWith(LogType.ERROR, 'Error with upgrade function arguments: upgrade function arguments should be in the format ["arg1", {"key" : "value"}]');
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS, 'Successfully upgraded smart contract');
            dockerLogSpy.should.not.have.been.called;
        });

        it('should throw error if args does not end with ]', async () => {
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });
            showInputBoxStub.onFirstCall().resolves('instantiate');
            showInputBoxStub.onSecondCall().resolves('1');
            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT);
            fabricRuntimeMock.instantiateChaincode.should.not.have.been.called;
            showInputBoxStub.should.have.been.calledTwice;

            logSpy.should.have.been.calledWith(LogType.ERROR, 'Error with upgrade function arguments: upgrade function arguments should be in the format ["arg1", {"key" : "value"}]');
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS, 'Successfully upgraded smart contract');
            dockerLogSpy.should.not.have.been.called;
        });

        it('should install and upgrade package', async () => {
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });

            showChaincodeAndVersionQuickPick.resolves({
                label: 'biscuit-network@0.0.2',
                description: 'Packaged',
                data: {
                    packageEntry: {
                        name: 'biscuit-network',
                        version: '0.0.2',
                        path: undefined
                    },
                    workspace: undefined
                }
            });

            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT);

            fabricRuntimeMock.upgradeChaincode.should.have.been.calledWith('biscuit-network', '0.0.2', ['peerOne'], 'channelOne', 'instantiate', ['arg1', 'arg2', 'arg3'], undefined, undefined);
            dockerLogSpy.should.have.been.called;
        });

        it('should be able to cancel install and upgrade for package', async () => {
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves();

            showChaincodeAndVersionQuickPick.resolves({
                label: 'biscuit-network@0.0.2',
                description: 'Packaged',
                data: {
                    packageEntry: {
                        name: 'biscuit-network',
                        version: '0.0.2',
                        path: undefined
                    },
                    workspace: undefined
                }
            });

            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT);

            fabricRuntimeMock.upgradeChaincode.should.not.been.called;
            dockerLogSpy.should.not.have.been.called;
        });

        it('should handle errors with the package command failing', async () => {
            executeCommandStub.withArgs(ExtensionCommands.PACKAGE_SMART_CONTRACT).resolves();

            showChaincodeAndVersionQuickPick.resolves({
                label: 'biscuit-network@0.0.2',
                description: 'Open Project',
                data: {
                    packageEntry: {
                        name: 'biscuit-network',
                        version: '0.0.2',
                        path: undefined
                    },
                    workspace: mySandBox.stub()
                }
            });

            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT);

            fabricRuntimeMock.upgradeChaincode.should.not.been.called;
            dockerLogSpy.should.not.have.been.called;
        });

        it('should package, install and upgrade a project', async () => {
            executeCommandStub.withArgs(ExtensionCommands.PACKAGE_SMART_CONTRACT).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });

            showChaincodeAndVersionQuickPick.resolves({
                label: 'biscuit-network@0.0.2',
                description: 'Open Project',
                data: {
                    packageEntry: {
                        name: 'biscuit-network',
                        version: '0.0.2',
                        path: undefined
                    },
                    workspace: mySandBox.stub()
                }
            });

            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT);

            fabricRuntimeMock.upgradeChaincode.should.have.been.calledWith('biscuit-network', '0.0.2', ['peerOne'], 'channelOne', 'instantiate', ['arg1', 'arg2', 'arg3'], undefined);
            dockerLogSpy.should.have.been.called;
        });

        it('should be able to cancel a project packaging, installing and upgrading', async () => {
            executeCommandStub.withArgs(ExtensionCommands.PACKAGE_SMART_CONTRACT).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves();

            showChaincodeAndVersionQuickPick.resolves({
                label: 'biscuit-network@0.0.2',
                description: 'Open Project',
                data: {
                    packageEntry: {
                        name: 'biscuit-network',
                        version: '0.0.2',
                        path: undefined
                    },
                    workspace: mySandBox.stub()
                }
            });

            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT);

            fabricRuntimeMock.upgradeChaincode.should.not.been.called;
            dockerLogSpy.should.not.have.been.called;
        });

        it('should upgrade a package if its already installed', async () => {
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });

            showChaincodeAndVersionQuickPick.resolves({
                label: 'biscuit-network@0.0.2',
                description: 'Installed',
                data: {
                    packageEntry: {
                        name: 'biscuit-network',
                        version: '0.0.2',
                        path: undefined
                    },
                    workspace: undefined
                }
            });

            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT);

            fabricRuntimeMock.upgradeChaincode.should.have.been.calledWith('biscuit-network', '0.0.2', ['peerOne'], 'channelOne', 'instantiate', ['arg1', 'arg2', 'arg3'], undefined);
            dockerLogSpy.should.have.been.called;
        });

        it('should upgrade the debug smart contract package when called from a debug session', async () => {
            executeCommandStub.withArgs(ExtensionCommands.PACKAGE_SMART_CONTRACT).resolves({ name: 'beer', version: 'vscode-debug-97365870', path: undefined });
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT).resolves({ name: 'beer', version: 'vscode-debug-97365870', path: undefined });

            const workspaceFolder: any = {
                name: 'beer',
                uri: vscode.Uri.file('myPath')
            };
            const activeDebugSessionStub: any = {
                configuration: {
                    env: {
                        CORE_CHAINCODE_ID_NAME: 'beer:vscode-debug-97365870'
                    },
                    debugEvent: FabricDebugConfigurationProvider.debugEvent
                },
                workspaceFolder: workspaceFolder
            };

            mySandBox.stub(vscode.debug, 'activeDebugSession').value(activeDebugSessionStub);
            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT, undefined, 'someChannelName', ['peerHi', 'peerHa']);

            fabricRuntimeMock.upgradeChaincode.should.have.been.calledWith('beer', 'vscode-debug-97365870', ['peerHi', 'peerHa'], 'someChannelName', 'instantiate', ['arg1', 'arg2', 'arg3']);
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully upgraded smart contract');
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.PACKAGE_SMART_CONTRACT, workspaceFolder, 'beer', 'vscode-debug-97365870');
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.INSTALL_SMART_CONTRACT);
            dockerLogSpy.should.have.been.called;
        });

        it('should not package or install if already exist from debug session', async () => {
            const workspaceFolder: any = {
                name: 'beer',
                uri: vscode.Uri.file('myPath')
            };
            const activeDebugSessionStub: any = {
                configuration: {
                    env: {
                        CORE_CHAINCODE_ID_NAME: 'beer:vscode-debug-97365870'
                    },
                    debugEvent: FabricDebugConfigurationProvider.debugEvent
                },
                workspaceFolder: workspaceFolder
            };

            const packageRegistryEntry: PackageRegistryEntry = new PackageRegistryEntry();
            packageRegistryEntry.name = 'beer';
            packageRegistryEntry.version = 'vscode-debug-97365870';
            mySandBox.stub(PackageRegistry.instance(), 'get').resolves(packageRegistryEntry);

            const installedChaincodeMap: Map<string, string[]> = new Map<string, string[]>();
            installedChaincodeMap.set('beer', ['vscode-debug-97365870']);

            fabricRuntimeMock.getInstalledChaincode.resolves(installedChaincodeMap);

            mySandBox.stub(vscode.debug, 'activeDebugSession').value(activeDebugSessionStub);
            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT, undefined, 'someChannelName', ['peerHi', 'peerHa']);

            fabricRuntimeMock.upgradeChaincode.should.have.been.calledWith('beer', 'vscode-debug-97365870', ['peerHi', 'peerHa'], 'someChannelName', 'instantiate', ['arg1', 'arg2', 'arg3']);
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully upgraded smart contract');
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.PACKAGE_SMART_CONTRACT, workspaceFolder, 'beer', 'vscode-debug-97365870');
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.INSTALL_SMART_CONTRACT);
        });

        it('should install if wrong version installed from debug session', async () => {
            executeCommandStub.withArgs(ExtensionCommands.PACKAGE_SMART_CONTRACT).resolves({ name: 'beer', version: 'vscode-debug-97365870', path: undefined });
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerHi', 'peerHa'], { name: 'beer', version: 'vscode-debug-97365870', path: undefined }).resolves({ name: 'beer', version: 'vscode-debug-97365870', path: undefined });

            const workspaceFolder: any = {
                name: 'beer',
                uri: vscode.Uri.file('myPath')
            };
            const activeDebugSessionStub: any = {
                configuration: {
                    env: {
                        CORE_CHAINCODE_ID_NAME: 'beer:vscode-debug-97365870'
                    },
                    debugEvent: FabricDebugConfigurationProvider.debugEvent
                },
                workspaceFolder: workspaceFolder
            };

            const installedChaincodeMap: Map<string, string[]> = new Map<string, string[]>();
            installedChaincodeMap.set('beer', ['vscode-debug-wrong']);

            fabricRuntimeMock.getInstalledChaincode.resolves(installedChaincodeMap);

            mySandBox.stub(vscode.debug, 'activeDebugSession').value(activeDebugSessionStub);
            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT, undefined, 'someChannelName', ['peerHi', 'peerHa']);

            fabricRuntimeMock.upgradeChaincode.should.have.been.calledWith('beer', 'vscode-debug-97365870', ['peerHi', 'peerHa'], 'someChannelName', 'instantiate', ['arg1', 'arg2', 'arg3']);
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully upgraded smart contract');
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.PACKAGE_SMART_CONTRACT, workspaceFolder, 'beer', 'vscode-debug-97365870');
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.INSTALL_SMART_CONTRACT);
            dockerLogSpy.should.have.been.called;
        });

        it('should handle the package command failing when called from a debug session', async () => {
            executeCommandStub.withArgs(ExtensionCommands.PACKAGE_SMART_CONTRACT).resolves();

            const workspaceFolder: any = {
                name: 'beer',
                uri: vscode.Uri.file('myPath')
            };
            const activeDebugSessionStub: any = {
                configuration: {
                    env: {
                        CORE_CHAINCODE_ID_NAME: 'beer:vscode-debug-97365870'
                    },
                    debugEvent: FabricDebugConfigurationProvider.debugEvent
                },
                workspaceFolder: workspaceFolder
            };

            mySandBox.stub(vscode.debug, 'activeDebugSession').value(activeDebugSessionStub);
            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT, undefined, 'someChannelName', ['peerHi', 'peerHa']);

            fabricRuntimeMock.upgradeChaincode.should.not.been.called;
            dockerLogSpy.should.not.have.been.called;
        });

    });
});
