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
import * as path from 'path';
import * as fs from 'fs-extra';
import { FabricGatewayConnection } from 'ibm-blockchain-platform-gateway-v1';

import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';

import { TestUtil } from '../TestUtil';
import { FabricGatewayConnectionManager } from '../../extension/fabric/FabricGatewayConnectionManager';
import { UserInputUtil, IBlockchainQuickPickItem } from '../../extension/commands/UserInputUtil';
import { BlockchainTreeItem } from '../../extension/explorer/model/BlockchainTreeItem';
import { BlockchainGatewayExplorerProvider } from '../../extension/explorer/gatewayExplorer';
import { ChannelTreeItem } from '../../extension/explorer/model/ChannelTreeItem';
import { TransactionTreeItem } from '../../extension/explorer/model/TransactionTreeItem';
import { Reporter } from '../../extension/util/Reporter';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { ExtensionCommands } from '../../ExtensionCommands';
import { VSCodeBlockchainDockerOutputAdapter } from '../../extension/logging/VSCodeBlockchainDockerOutputAdapter';
import { InstantiatedContractTreeItem } from '../../extension/explorer/model/InstantiatedContractTreeItem';
import { InstantiatedChaincodeTreeItem } from '../../extension/explorer/model/InstantiatedChaincodeTreeItem';
import { InstantiatedUnknownTreeItem } from '../../extension/explorer/model/InstantiatedUnknownTreeItem';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';
import { FabricRuntimeUtil, LogType, FabricGatewayRegistryEntry, FabricEnvironmentRegistry, FabricEnvironmentRegistryEntry, EnvironmentType } from 'ibm-blockchain-platform-common';
import { FabricDebugConfigurationProvider } from '../../extension/debug/FabricDebugConfigurationProvider';

chai.use(sinonChai);
chai.should();

describe('SubmitTransactionCommand', () => {
    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();

    before(async () => {
        await TestUtil.setupTests(mySandBox);
    });

    describe('SubmitTransaction', () => {
        let fabricClientConnectionMock: sinon.SinonStubbedInstance<FabricGatewayConnection>;

        let executeCommandStub: sinon.SinonStub;
        let logSpy: sinon.SinonSpy;
        let dockerLogsOutputSpy: sinon.SinonSpy;
        let blockchainLogsOutputSpy: sinon.SinonSpy;
        let getConnectionStub: sinon.SinonStub;
        let showInstantiatedSmartContractQuickPickStub: sinon.SinonStub;
        let showTransactionQuickPickStub: sinon.SinonStub;
        let showInputBoxStub: sinon.SinonStub;
        let showQuickPickStub: sinon.SinonStub;
        let showQuickPickItemStub: sinon.SinonStub;
        let showChannelPeersQuickPickStub: sinon.SinonStub;
        let reporterStub: sinon.SinonStub;
        let showChannelFromGatewayStub: sinon.SinonStub;

        let allChildren: Array<BlockchainTreeItem>;
        let blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider;
        let registryStub: sinon.SinonStub;
        let peerNames: string[];
        let mspIDs: string[];
        let rootPath: string;
        let transactionDataPath: string;
        let badTransactionDataPath: string;
        let notTransactionDataPath: string;

        beforeEach(async () => {
            executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand');
            executeCommandStub.withArgs(ExtensionCommands.CONNECT_TO_GATEWAY).resolves();
            executeCommandStub.callThrough();

            fabricClientConnectionMock = mySandBox.createStubInstance(FabricGatewayConnection);
            fabricClientConnectionMock.connect.resolves();
            const fabricConnectionManager: FabricGatewayConnectionManager = FabricGatewayConnectionManager.instance();
            getConnectionStub = mySandBox.stub(fabricConnectionManager, 'getConnection').returns(fabricClientConnectionMock);

            showChannelFromGatewayStub = mySandBox.stub(UserInputUtil, 'showChannelFromGatewayQuickPickBox').resolves({
                label: 'myChannel',
                data: ['peerOne']
            });

            showInstantiatedSmartContractQuickPickStub = mySandBox.stub(UserInputUtil, 'showClientInstantiatedSmartContractsQuickPick').resolves({
                label: 'myContract',
                data: { name: 'myContract', channel: 'myChannel', version: '0.0.1' }
            });

            showTransactionQuickPickStub = mySandBox.stub(UserInputUtil, 'showTransactionQuickPick').withArgs(sinon.match.any, 'myContract', 'myChannel').resolves({
                label: 'my-contract - transaction1',
                data: { name: 'transaction1', contract: 'my-contract' }
            });

            showInputBoxStub = mySandBox.stub(UserInputUtil, 'showInputBox');
            showInputBoxStub.onFirstCall().resolves('["arg1", "arg2", "arg3"]');
            showInputBoxStub.onSecondCall().resolves('');

            showQuickPickStub = mySandBox.stub(UserInputUtil, 'showQuickPick');

            showQuickPickItemStub = mySandBox.stub(UserInputUtil, 'showQuickPickItem');
            showQuickPickItemStub.onFirstCall().resolves(UserInputUtil.DEFAULT);
            showQuickPickItemStub.withArgs('Do you want to provide a file of transaction data for this transaction?').resolves({
                label: 'transactionData.txdata',
                description: 'My Transaction',
                data: {
                    transactionName: 'transaction1',
                    transactionLabel: 'My Transaction',
                    arguments: [
                        'arg1',
                        'arg2',
                        'arg3'
                    ],
                    transientData: {
                        key: 'value'
                    }
                }
            });

            showChannelPeersQuickPickStub = mySandBox.stub(UserInputUtil, 'showChannelPeersQuickPick');

            logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
            dockerLogsOutputSpy = mySandBox.spy(VSCodeBlockchainDockerOutputAdapter.instance(FabricRuntimeUtil.LOCAL_FABRIC), 'show');

            fabricClientConnectionMock.submitTransaction.resolves();

            fabricClientConnectionMock.getAllPeerNames.returns(['peerOne']);

            fabricClientConnectionMock.getAllPeerNames.returns(['peerOne']);
            fabricClientConnectionMock.getAllChannelsForPeer.withArgs('peerOne').resolves(['channelOne']);

            fabricClientConnectionMock.getInstantiatedChaincode.resolves([{ name: 'mySmartContract', version: '0.0.1' }]);

            fabricClientConnectionMock.getMetadata.resolves(
                {
                    contracts: {
                        'my-contract': {
                            name: 'my-contract',
                            transactions: [
                                {
                                    name: 'transaction1'
                                },
                                {
                                    name: 'transaction2'
                                },
                                {
                                    name: 'instantiate'
                                }
                            ],
                        }
                    }
                }
            );

            peerNames = ['peerOne', 'peerTwo', 'peerThree'];
            mspIDs = ['Org1MSP', 'Org2MSP', 'Org3MSP'];
            fabricClientConnectionMock.getChannelPeersInfo.resolves([{name: peerNames[0], mspID: mspIDs[0]}]);

            const map: Map<string, Array<string>> = new Map<string, Array<string>>();
            map.set('channelOne', ['peerOne']);
            fabricClientConnectionMock.createChannelMap.resolves({channelMap: map, v2channels: []});

            const registryEntry: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
            registryEntry.name = 'myConnection';
            registryStub = mySandBox.stub(FabricGatewayConnectionManager.instance(), 'getGatewayRegistryEntry').resolves(registryEntry);

            blockchainGatewayExplorerProvider = ExtensionUtil.getBlockchainGatewayExplorerProvider();

            allChildren = await blockchainGatewayExplorerProvider.getChildren();

            reporterStub = mySandBox.stub(Reporter.instance(), 'sendTelemetryEvent');

            rootPath = path.dirname(__dirname);
            transactionDataPath = path.join(rootPath, '../../test/data/transactionData/goodTransactionData');
            badTransactionDataPath = path.join(rootPath, '../../test/data/transactionData/badTransactionData');
            notTransactionDataPath = path.join(rootPath, '../../test/data/transactionData/notTransactionData');
        });

        afterEach(async () => {
            await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT_GATEWAY);
            mySandBox.restore();
        });

        it('should submit the smart contract transaction through the command', async () => {
            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);
            fabricClientConnectionMock.submitTransaction.should.have.been.calledWith('myContract', 'transaction1', 'myChannel', ['arg1', 'arg2', 'arg3'], 'my-contract');
            dockerLogsOutputSpy.should.not.have.been.called;
            logSpy.should.have.been.calledWith(LogType.INFO, undefined, `submitting transaction transaction1 with args arg1,arg2,arg3 on channel myChannel`);
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully submitted transaction');
            reporterStub.should.have.been.calledWith('submit transaction');
        });

        it('should submit the smart contract transaction through the command and get rid of any trailing/leading whitespace', async () => {
            showInputBoxStub.onFirstCall().resolves('    ["arg1", "arg2", "arg3"]    ');
            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);
            fabricClientConnectionMock.submitTransaction.should.have.been.calledWith('myContract', 'transaction1', 'myChannel', ['arg1', 'arg2', 'arg3'], 'my-contract');
            dockerLogsOutputSpy.should.not.have.been.called;
            logSpy.should.have.been.calledWith(LogType.INFO, undefined, `submitting transaction transaction1 with args arg1,arg2,arg3 on channel myChannel`);
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully submitted transaction');
            reporterStub.should.have.been.calledWith('submit transaction');
        });

        it('should evaluate the smart contract transaction through the command and get rid of any trailing/leading whitespace', async () => {
            showInputBoxStub.onFirstCall().resolves('    ["arg1", "arg2", "arg3"]    ');
            await vscode.commands.executeCommand(ExtensionCommands.EVALUATE_TRANSACTION);
            fabricClientConnectionMock.submitTransaction.should.have.been.calledWith('myContract', 'transaction1', 'myChannel', ['arg1', 'arg2', 'arg3'], 'my-contract', undefined, true);
            dockerLogsOutputSpy.should.not.have.been.called;
            logSpy.should.have.been.calledWith(LogType.INFO, undefined, `evaluating transaction transaction1 with args arg1,arg2,arg3 on channel myChannel`);
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully evaluated transaction');
            reporterStub.should.have.been.calledWith('evaluate transaction');
        });

        it('should handle an argument passed in as an object', async () => {
            showInputBoxStub.onFirstCall().resolves('[{"key": "value"}]');
            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);
            fabricClientConnectionMock.submitTransaction.should.have.been.calledWith('myContract', 'transaction1', 'myChannel', ['{"key":"value"}'], 'my-contract');
            dockerLogsOutputSpy.should.not.have.been.called;
            logSpy.should.have.been.calledWith(LogType.INFO, undefined, `submitting transaction transaction1 with args {"key":"value"} on channel myChannel`);
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully submitted transaction');
            reporterStub.should.have.been.calledWith('submit transaction');
        });

        it('should evaluate the smart contract transaction through the command', async () => {
            await vscode.commands.executeCommand(ExtensionCommands.EVALUATE_TRANSACTION);
            fabricClientConnectionMock.submitTransaction.should.have.been.calledWith('myContract', 'transaction1', 'myChannel', ['arg1', 'arg2', 'arg3'], 'my-contract', undefined, true);
            dockerLogsOutputSpy.should.not.have.been.called;
            logSpy.should.have.been.calledWith(LogType.INFO, undefined, `evaluating transaction transaction1 with args arg1,arg2,arg3 on channel myChannel`);
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully evaluated transaction');
            reporterStub.should.have.been.calledWith('evaluate transaction');
        });

        it('should submit the smart contract transaction through the command when not connected', async () => {
            getConnectionStub.onCall(2).returns(null);
            getConnectionStub.onCall(3).returns(fabricClientConnectionMock);

            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);

            fabricClientConnectionMock.submitTransaction.should.have.been.calledWith('myContract', 'transaction1', 'myChannel', ['arg1', 'arg2', 'arg3'], 'my-contract');
            dockerLogsOutputSpy.should.not.have.been.called;
            logSpy.should.have.been.calledWith(LogType.INFO, undefined, `submitting transaction transaction1 with args arg1,arg2,arg3 on channel myChannel`);
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully submitted transaction');
            reporterStub.should.have.been.calledWith('submit transaction');
        });

        it('should show logs if local runtime', async () => {
            const registryEntry: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
            registryEntry.name = `${FabricRuntimeUtil.LOCAL_FABRIC} - Org1`;
            registryEntry.fromEnvironment = FabricRuntimeUtil.LOCAL_FABRIC;
            registryStub.resolves(registryEntry);
            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);
            fabricClientConnectionMock.submitTransaction.should.have.been.calledWith('myContract', 'transaction1', 'myChannel', ['arg1', 'arg2', 'arg3'], 'my-contract');
            dockerLogsOutputSpy.should.have.been.called;
            logSpy.should.have.been.calledWith(LogType.INFO, undefined, `submitting transaction transaction1 with args arg1,arg2,arg3 on channel myChannel`);
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully submitted transaction');
            reporterStub.should.have.been.calledWith('submit transaction');
        });

        it('should not show logs if gateway came from non-local runtime', async () => {
            await FabricEnvironmentRegistry.instance().add({name: 'nonLocalEnvironment', environmentType: EnvironmentType.ANSIBLE_ENVIRONMENT, managedRuntime: false, environmentDirectory: ''} as FabricEnvironmentRegistryEntry);
            const instanceSpy: sinon.SinonSpy = mySandBox.spy(VSCodeBlockchainDockerOutputAdapter, 'instance');
            const registryEntry: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
            registryEntry.name = `nonLocalGateway`;
            registryEntry.fromEnvironment = 'nonLocalEnvironment';
            registryStub.resolves(registryEntry);
            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);
            fabricClientConnectionMock.submitTransaction.should.have.been.calledWith('myContract', 'transaction1', 'myChannel', ['arg1', 'arg2', 'arg3'], 'my-contract');
            instanceSpy.should.not.have.been.called;
            dockerLogsOutputSpy.should.not.have.been.called;
            logSpy.should.have.been.calledWith(LogType.INFO, undefined, `submitting transaction transaction1 with args arg1,arg2,arg3 on channel myChannel`);
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully submitted transaction');
            reporterStub.should.have.been.calledWith('submit transaction');
        });

        it('should handle connecting being cancelled', async () => {
            getConnectionStub.onCall(2).returns(null);
            getConnectionStub.onCall(3).returns(null);
            await vscode.commands.executeCommand(ExtensionCommands.EVALUATE_TRANSACTION);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_GATEWAY);
            fabricClientConnectionMock.submitTransaction.should.not.have.been.called;
            reporterStub.should.not.have.been.called;
            dockerLogsOutputSpy.should.not.have.been.called;
        });

        it('should handle choosing channel being cancelled', async () => {
            showChannelFromGatewayStub.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);

            fabricClientConnectionMock.submitTransaction.should.not.have.been.called;
            reporterStub.should.not.have.been.called;
            dockerLogsOutputSpy.should.not.have.been.called;
            showInstantiatedSmartContractQuickPickStub.should.not.have.been.called;
        });

        it('should handle choosing smart contract being cancelled', async () => {
            showInstantiatedSmartContractQuickPickStub.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);

            fabricClientConnectionMock.submitTransaction.should.not.have.been.called;
            reporterStub.should.not.have.been.called;
            dockerLogsOutputSpy.should.not.have.been.called;
        });

        it('should handle error from evaluating transaction', async () => {
            fabricClientConnectionMock.submitTransaction.rejects({ message: 'some error' });
            blockchainLogsOutputSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'show');

            await vscode.commands.executeCommand(ExtensionCommands.EVALUATE_TRANSACTION);

            fabricClientConnectionMock.submitTransaction.should.have.been.calledWith('myContract', 'transaction1', 'myChannel', ['arg1', 'arg2', 'arg3'], 'my-contract', undefined, true);
            logSpy.should.have.been.calledWith(LogType.ERROR, 'Error evaluating transaction: some error');
            reporterStub.should.not.have.been.called;
            dockerLogsOutputSpy.should.not.have.been.called;
            blockchainLogsOutputSpy.should.have.been.calledOnce;
        });

        it('should handle error from evaluating transaction and output further errors', async () => {
            fabricClientConnectionMock.submitTransaction.rejects({ message: 'some error', endorsements: [{message: 'another error'}, {message: 'more error'}]});
            blockchainLogsOutputSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'show');

            await vscode.commands.executeCommand(ExtensionCommands.EVALUATE_TRANSACTION);

            fabricClientConnectionMock.submitTransaction.should.have.been.calledWith('myContract', 'transaction1', 'myChannel', ['arg1', 'arg2', 'arg3'], 'my-contract', undefined, true);
            logSpy.should.have.been.calledWith(LogType.INFO, undefined, `evaluating transaction transaction1 with args arg1,arg2,arg3 on channel myChannel`);
            logSpy.should.have.been.calledWith(LogType.ERROR, 'Error evaluating transaction: some error');
            logSpy.should.have.been.calledWith(LogType.ERROR, 'Endorsement failed with: another error');
            logSpy.should.have.been.calledWith(LogType.ERROR, 'Endorsement failed with: more error');
            reporterStub.should.not.have.been.called;
            dockerLogsOutputSpy.should.not.have.been.called;
            blockchainLogsOutputSpy.should.have.been.calledOnce;
        });

        it('should handle cancel when choosing transaction', async () => {
            showTransactionQuickPickStub.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);
            fabricClientConnectionMock.submitTransaction.should.not.have.been.called;
            reporterStub.should.not.have.been.called;
            dockerLogsOutputSpy.should.not.have.been.called;
        });

        it('should submit the smart contract transaction through the debug command', async () => {
            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION, undefined, 'myChannel', 'myContract');
            fabricClientConnectionMock.submitTransaction.should.have.been.calledWith('myContract', 'transaction1', 'myChannel', ['arg1', 'arg2', 'arg3'], 'my-contract');
            showInstantiatedSmartContractQuickPickStub.should.not.have.been.called;
            dockerLogsOutputSpy.should.not.have.been.called;
            logSpy.should.have.been.calledWith(LogType.INFO, undefined, `submitting transaction transaction1 with args arg1,arg2,arg3 on channel myChannel`);
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully submitted transaction');
            reporterStub.should.have.been.calledWith('submit transaction');
        });

        it('should submit transaction through the tree (transaction item)', async () => {
            const myChannel: ChannelTreeItem = allChildren[2] as ChannelTreeItem;

            const channelChildren: Array<BlockchainTreeItem> = await blockchainGatewayExplorerProvider.getChildren(myChannel);
            channelChildren[0].tooltip.should.equal('Associated peers: peerOne');

            const instantiatedUnknownChainCodes: Array<InstantiatedUnknownTreeItem> = await blockchainGatewayExplorerProvider.getChildren(channelChildren[0]) as Array<InstantiatedUnknownTreeItem>;
            instantiatedUnknownChainCodes.length.should.equal(1);

            await blockchainGatewayExplorerProvider.getChildren(instantiatedUnknownChainCodes[0]);

            const instantiatedContractTreeItems: Array<InstantiatedContractTreeItem> = await blockchainGatewayExplorerProvider.getChildren(channelChildren[0]) as Array<InstantiatedContractTreeItem>;
            instantiatedContractTreeItems.length.should.equal(1);

            const transactions: Array<TransactionTreeItem> = await blockchainGatewayExplorerProvider.getChildren(instantiatedContractTreeItems[0]) as Array<TransactionTreeItem>;
            transactions.length.should.equal(3);

            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION, transactions[0]);

            fabricClientConnectionMock.submitTransaction.should.have.been.calledWith('mySmartContract', 'transaction1', 'channelOne', ['arg1', 'arg2', 'arg3'], 'my-contract');

            logSpy.should.have.been.calledWith(LogType.INFO, undefined, `submitting transaction transaction1 with args arg1,arg2,arg3 on channel channelOne`);
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully submitted transaction');
            reporterStub.should.have.been.calledWith('submit transaction');
            dockerLogsOutputSpy.should.not.have.been.called;
        });

        it('should evaluate transaction through the tree (chaincode item)', async () => {
            fabricClientConnectionMock.getMetadata.rejects(new Error('no metadata here jack'));

            const myChannel: ChannelTreeItem = allChildren[2] as ChannelTreeItem;

            const channelChildren: Array<BlockchainTreeItem> = await blockchainGatewayExplorerProvider.getChildren(myChannel);
            channelChildren[0].tooltip.should.equal('Associated peers: peerOne');

            const instantiatedUnknownChainCodes: Array<InstantiatedUnknownTreeItem> = await blockchainGatewayExplorerProvider.getChildren(channelChildren[0]) as Array<InstantiatedUnknownTreeItem>;
            instantiatedUnknownChainCodes.length.should.equal(1);

            await blockchainGatewayExplorerProvider.getChildren(instantiatedUnknownChainCodes[0]);

            const instantiatedChainCodes: Array<InstantiatedChaincodeTreeItem> = await blockchainGatewayExplorerProvider.getChildren(channelChildren[0]) as Array<InstantiatedChaincodeTreeItem>;
            instantiatedChainCodes.length.should.equal(1);

            showInputBoxStub.onFirstCall().resolves('transaction1');

            showTransactionQuickPickStub.withArgs(sinon.match.any, 'mySmartContract', 'channelOne').resolves({
                label: null,
                data: { name: 'transaction1', contract: undefined}
            });
            showInputBoxStub.onFirstCall().resolves('["arg1", "arg2" ,"arg3"]');
            showInputBoxStub.onSecondCall().resolves('');

            await vscode.commands.executeCommand(ExtensionCommands.EVALUATE_TRANSACTION, instantiatedChainCodes[0]);

            fabricClientConnectionMock.submitTransaction.should.have.been.calledWith('mySmartContract', 'transaction1', 'channelOne', ['arg1', 'arg2', 'arg3'], undefined, undefined, true);

            logSpy.should.have.been.calledWith(LogType.INFO, undefined, `evaluating transaction transaction1 with args arg1,arg2,arg3 on channel channelOne`);
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully evaluated transaction');
            reporterStub.should.have.been.calledWith('evaluate transaction');
            dockerLogsOutputSpy.should.not.have.been.called;
        });

        it('should handle cancelling when submitting transaction through the tree (chaincode item)', async () => {
            fabricClientConnectionMock.getMetadata.rejects(new Error('no metadata here jack'));

            const myChannel: ChannelTreeItem = allChildren[2] as ChannelTreeItem;

            const channelChildren: Array<BlockchainTreeItem> = await blockchainGatewayExplorerProvider.getChildren(myChannel);
            channelChildren[0].tooltip.should.equal('Associated peers: peerOne');

            const instantiatedChainCodes: Array<InstantiatedChaincodeTreeItem> = await blockchainGatewayExplorerProvider.getChildren(channelChildren[0]) as Array<InstantiatedChaincodeTreeItem>;
            instantiatedChainCodes.length.should.equal(1);

            showInputBoxStub.onFirstCall().resolves();

            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION, instantiatedChainCodes[0]);

            fabricClientConnectionMock.submitTransaction.should.not.have.been.called;

            logSpy.should.not.have.been.calledWith(LogType.SUCCESS, 'Successfully submitted transaction');
            reporterStub.should.not.have.been.calledWith('submit transaction');
            dockerLogsOutputSpy.should.not.have.been.called;
        });

        it('should submit the smart contract through the command with function but no args', async () => {
            showInputBoxStub.onFirstCall().resolves('[]');
            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);
            fabricClientConnectionMock.submitTransaction.should.have.been.calledWithExactly('myContract', 'transaction1', 'myChannel', [], 'my-contract', undefined, false, []);
            showInputBoxStub.should.have.been.calledTwice;
            logSpy.should.have.been.calledWith(LogType.INFO, undefined, `submitting transaction transaction1 with no args on channel myChannel`);
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully submitted transaction');
            reporterStub.should.have.been.calledWith('submit transaction');
            dockerLogsOutputSpy.should.not.have.been.called;
        });

        it('should submit the smart contract through the command with function but no args or brackets', async () => {
            showInputBoxStub.onFirstCall().resolves('');
            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);
            fabricClientConnectionMock.submitTransaction.should.have.been.calledWithExactly('myContract', 'transaction1', 'myChannel', [], 'my-contract', undefined, false, []);
            showInputBoxStub.should.have.been.calledTwice;
            logSpy.should.have.been.calledWith(LogType.INFO, undefined, `submitting transaction transaction1 with no args on channel myChannel`);
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully submitted transaction');
            reporterStub.should.have.been.calledWith('submit transaction');
            dockerLogsOutputSpy.should.not.have.been.called;
        });

        it('should submit the smart contract through the command with transient data', async () => {
            showInputBoxStub.onSecondCall().resolves('{ "key" : "value"}');
            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);
            fabricClientConnectionMock.submitTransaction.should.have.been.calledWithExactly('myContract', 'transaction1', 'myChannel', ['arg1', 'arg2', 'arg3'], 'my-contract', { key: Buffer.from('value') }, false, []);
            showInputBoxStub.should.have.been.calledTwice;
            logSpy.should.have.been.calledWith(LogType.INFO, undefined, `submitting transaction transaction1 with args arg1,arg2,arg3 on channel myChannel`);
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully submitted transaction');
            reporterStub.should.have.been.calledWith('submit transaction');
            dockerLogsOutputSpy.should.not.have.been.called;
        });

        it('should submit the smart contract through the command with transient data even if there is trailing/leading whitespace', async () => {
            showInputBoxStub.onSecondCall().resolves('    { "key" : "value"}    ');
            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);
            fabricClientConnectionMock.submitTransaction.should.have.been.calledWithExactly('myContract', 'transaction1', 'myChannel', ['arg1', 'arg2', 'arg3'], 'my-contract', { key: Buffer.from('value') }, false, []);
            showInputBoxStub.should.have.been.calledTwice;
            logSpy.should.have.been.calledWith(LogType.INFO, undefined, `submitting transaction transaction1 with args arg1,arg2,arg3 on channel myChannel`);
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully submitted transaction');
            reporterStub.should.have.been.calledWith('submit transaction');
            dockerLogsOutputSpy.should.not.have.been.called;
        });

        it('should handle cancelling when required to give transient data', async () => {
            showInputBoxStub.onSecondCall().resolves(undefined);
            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);
            fabricClientConnectionMock.submitTransaction.should.not.have.been.called;
            showInputBoxStub.should.have.been.calledTwice;
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS, 'Successful submitTransaction');
            reporterStub.should.not.have.been.calledWith('submit transaction');
            dockerLogsOutputSpy.should.not.have.been.called;
        });

        it('should error when required to give transient data', async () => {
            showInputBoxStub.onSecondCall().resolves('{"wrong}');
            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);
            fabricClientConnectionMock.submitTransaction.should.not.have.been.called;
            showInputBoxStub.should.have.been.calledTwice;
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS, 'Successful submitTransaction');
            logSpy.should.have.been.calledWith(LogType.ERROR, `Error with transaction transient data: Unexpected end of JSON input`);
            reporterStub.should.not.have.been.calledWith('submit transaction');
            dockerLogsOutputSpy.should.not.have.been.called;
        });

        it('should error when transient data doesn\'t start with {', async () => {
            showInputBoxStub.onSecondCall().resolves('["wrong"]');
            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);
            fabricClientConnectionMock.submitTransaction.should.not.have.been.called;
            showInputBoxStub.should.have.been.calledTwice;
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS, 'Successful submitTransaction');
            logSpy.should.have.been.calledWith(LogType.ERROR, `Error with transaction transient data: transient data should be in the format {"key": "value"}`);
            reporterStub.should.not.have.been.calledWith('submit transaction');
            dockerLogsOutputSpy.should.not.have.been.called;
        });

        it('should error when transient data doesn\'t end with }', async () => {
            showInputBoxStub.onSecondCall().resolves('1');
            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);
            fabricClientConnectionMock.submitTransaction.should.not.have.been.called;
            showInputBoxStub.should.have.been.calledTwice;
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS, 'Successful submitTransaction');
            logSpy.should.have.been.calledWith(LogType.ERROR, `Error with transaction transient data: transient data should be in the format {"key": "value"}`);
            reporterStub.should.not.have.been.calledWith('submit transaction');
            dockerLogsOutputSpy.should.not.have.been.called;
        });

        it('should error when given incorrect JSON for args', async () => {
            showInputBoxStub.onFirstCall().resolves('["testArg]');
            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);
            logSpy.should.have.been.calledTwice;
            logSpy.should.have.been.calledWith(LogType.ERROR, 'Error with transaction arguments: Unexpected end of JSON input');
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS, 'Successfully submitted transaction');
            reporterStub.should.not.have.been.calledWith('submit transaction');
            dockerLogsOutputSpy.should.not.have.been.called;
        });

        it('should error when given incorrect args doesn\'t start with [', async () => {
            showInputBoxStub.onFirstCall().resolves('"testArg]');
            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);
            logSpy.should.have.been.calledTwice;
            logSpy.should.have.been.calledWith(LogType.ERROR, 'Error with transaction arguments: transaction arguments should be in the format ["arg1", {"key" : "value"}]');
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS, 'Successfully submitted transaction');
            reporterStub.should.not.have.been.calledWith('submit transaction');
            dockerLogsOutputSpy.should.not.have.been.called;
        });

        it('should error when given incorrect args doesn\'t end with ]', async () => {
            showInputBoxStub.onFirstCall().resolves('1');
            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);
            logSpy.should.have.been.calledTwice;
            logSpy.should.have.been.calledWith(LogType.ERROR, 'Error with transaction arguments: transaction arguments should be in the format ["arg1", {"key" : "value"}]');
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS, 'Successfully submitted transaction');
            reporterStub.should.not.have.been.calledWith('submit transaction');
            dockerLogsOutputSpy.should.not.have.been.called;
        });

        it('should handle cancelling when required to give args', async () => {
            showInputBoxStub.onFirstCall().resolves(undefined);
            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);
            fabricClientConnectionMock.submitTransaction.should.not.have.been.called;
            showInputBoxStub.should.have.been.calledOnce;
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS, 'Successfully submitted transaction');
            reporterStub.should.not.have.been.calledWith('submit transaction');
            dockerLogsOutputSpy.should.not.have.been.called;
        });

        it('should return when cancelling at the targeting policy prompt', async () => {
            fabricClientConnectionMock.getChannelPeersInfo.resolves([
                {name: peerNames[0], mspID: mspIDs[0]},
                {name: peerNames[1], mspID: mspIDs[1]}
            ]);
            showQuickPickStub.onFirstCall().resolves();
            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);
            fabricClientConnectionMock.submitTransaction.should.not.have.been.called;
            dockerLogsOutputSpy.should.not.have.been.called;
            logSpy.should.not.have.been.calledWith(LogType.INFO, undefined, `submitting transaction transaction1 with args arg1,arg2,arg3 on channel myChannel`);
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS, 'Successfully submitted transaction');
            reporterStub.should.not.have.been.calledWith('submit transaction');
        });

        it('should return if there are no channel peers to target', async () => {
            fabricClientConnectionMock.getChannelPeersInfo.resolves([]);
            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);
            fabricClientConnectionMock.submitTransaction.should.not.have.been.called;
            dockerLogsOutputSpy.should.not.have.been.called;
            logSpy.should.have.been.calledWith(LogType.ERROR, `No channel peers available to target`);
            logSpy.should.not.have.been.calledWith(LogType.INFO, undefined, `submitting transaction transaction1 with args arg1,arg2,arg3 on channel myChannel`);
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS, 'Successfully submitted transaction');
            reporterStub.should.not.have.been.calledWith('submit transaction');
        });

        it('should return when cancelling at the custom peer target prompt', async () => {
            showQuickPickStub.onFirstCall().resolves(UserInputUtil.CUSTOM);
            fabricClientConnectionMock.getChannelPeersInfo.resolves([
                {name: peerNames[0], mspID: mspIDs[0]},
                {name: peerNames[1], mspID: mspIDs[1]}
            ]);
            showChannelPeersQuickPickStub.resolves();
            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);
            fabricClientConnectionMock.submitTransaction.should.not.have.been.called;
            dockerLogsOutputSpy.should.not.have.been.called;
            logSpy.should.not.have.been.calledWith(LogType.INFO, undefined, `submitting transaction transaction1 with args arg1,arg2,arg3 on channel myChannel`);
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS, 'Successfully submitted transaction');
            reporterStub.should.not.have.been.calledWith('submit transaction');
        });

        it('should return if no custom peer targets are selected', async () => {
            showQuickPickStub.onFirstCall().resolves(UserInputUtil.CUSTOM);
            fabricClientConnectionMock.getChannelPeersInfo.resolves([
                {name: peerNames[0], mspID: mspIDs[0]},
                {name: peerNames[1], mspID: mspIDs[1]}
            ]);
            showChannelPeersQuickPickStub.resolves([]);
            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);
            fabricClientConnectionMock.submitTransaction.should.not.have.been.called;
            dockerLogsOutputSpy.should.not.have.been.called;
            logSpy.should.not.have.been.calledWith(LogType.INFO, undefined, `submitting transaction transaction1 with args arg1,arg2,arg3 on channel myChannel`);
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS, 'Successfully submitted transaction');
            reporterStub.should.not.have.been.calledWith('submit transaction');
        });

        it('should pass one custom peer target', async () => {
            const targets: IBlockchainQuickPickItem<string>[] = [{label: peerNames[0], description: mspIDs[0], data: peerNames[0]}];
            fabricClientConnectionMock.getChannelPeersInfo.resolves([
                {name: peerNames[0], mspID: mspIDs[0]},
                {name: peerNames[1], mspID: mspIDs[1]}
            ]);
            showQuickPickStub.onFirstCall().resolves(UserInputUtil.CUSTOM);
            showChannelPeersQuickPickStub.resolves(targets);
            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);
            showChannelPeersQuickPickStub.should.have.been.calledWith([
                {name: peerNames[0], mspID: mspIDs[0]},
                {name: peerNames[1], mspID: mspIDs[1]}
            ]);
            fabricClientConnectionMock.submitTransaction.should.have.been.calledWith('myContract', 'transaction1', 'myChannel', ['arg1', 'arg2', 'arg3'], 'my-contract', undefined, false, [peerNames[0]]);
            dockerLogsOutputSpy.should.not.have.been.called;
            logSpy.should.have.been.calledWith(LogType.INFO, undefined, `submitting transaction transaction1 with args arg1,arg2,arg3 on channel myChannel to peers ${peerNames[0]}`);
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully submitted transaction');
            reporterStub.should.have.been.calledWith('submit transaction');
        });

        it('should pass multiple custom peer targets', async () => {
            const targets: IBlockchainQuickPickItem<string>[] = [
                {label: peerNames[0], description: mspIDs[0], data: peerNames[0]},
                {label: peerNames[1], description: mspIDs[1], data: peerNames[1]},
                {label: peerNames[2], description: mspIDs[2], data: peerNames[2]}
            ];

            fabricClientConnectionMock.getChannelPeersInfo.resolves([
                {name: peerNames[0], mspID: mspIDs[0]},
                {name: peerNames[1], mspID: mspIDs[1]},
                {name: peerNames[2], mspID: mspIDs[2]}
            ]);
            showQuickPickStub.onFirstCall().resolves(UserInputUtil.CUSTOM);
            showChannelPeersQuickPickStub.resolves(targets);
            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);
            showChannelPeersQuickPickStub.should.have.been.calledWith([{name: peerNames[0], mspID: mspIDs[0]}, {name: peerNames[1], mspID: mspIDs[1]}, {name: peerNames[2], mspID: mspIDs[2]}]);

            fabricClientConnectionMock.submitTransaction.should.have.been.calledWith('myContract', 'transaction1', 'myChannel', ['arg1', 'arg2', 'arg3'], 'my-contract', undefined, false, peerNames);
            dockerLogsOutputSpy.should.not.have.been.called;
            logSpy.should.have.been.calledWith(LogType.INFO, undefined, `submitting transaction transaction1 with args arg1,arg2,arg3 on channel myChannel to peers ${peerNames}`);
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully submitted transaction');
            reporterStub.should.have.been.calledWith('submit transaction');
        });

        it('should be able to use the default when there are multiple peers', async () => {
            fabricClientConnectionMock.getChannelPeersInfo.resolves([
                {name: peerNames[0], mspID: mspIDs[0]},
                {name: peerNames[1], mspID: mspIDs[1]},
                {name: peerNames[2], mspID: mspIDs[2]}
            ]);
            showQuickPickStub.onFirstCall().resolves(UserInputUtil.DEFAULT);
            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);
            showChannelPeersQuickPickStub.should.not.have.been.called;

            fabricClientConnectionMock.submitTransaction.should.have.been.calledWith('myContract', 'transaction1', 'myChannel', ['arg1', 'arg2', 'arg3'], 'my-contract', undefined, false, []);
            dockerLogsOutputSpy.should.not.have.been.called;
            logSpy.should.have.been.calledWith(LogType.INFO, undefined, `submitting transaction transaction1 with args arg1,arg2,arg3 on channel myChannel`);
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully submitted transaction');
            reporterStub.should.have.been.calledWith('submit transaction');
        });

        it('should handle a defined transaction response', async () => {
            const result: string = '{"hello":"world"}';
            const outputAdapterShowSpy: sinon.SinonSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'show');
            fabricClientConnectionMock.submitTransaction.resolves(result);
            showInputBoxStub.onFirstCall().resolves('[]');
            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);
            fabricClientConnectionMock.submitTransaction.should.have.been.calledWithExactly('myContract', 'transaction1', 'myChannel', [], 'my-contract', undefined, false, []);
            showInputBoxStub.should.have.been.calledTwice;
            logSpy.should.have.been.calledWith(LogType.INFO, undefined, `submitting transaction transaction1 with no args on channel myChannel`);
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully submitted transaction', `Returned value from transaction1: ${result}`);
            reporterStub.should.have.been.calledWith('submit transaction');
            dockerLogsOutputSpy.should.not.have.been.called;
            outputAdapterShowSpy.should.have.been.calledOnce;
        });

        it('should handle an undefined transaction response', async () => {
            const result: string = undefined;
            const outputAdapterShowSpy: sinon.SinonSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'show');
            fabricClientConnectionMock.submitTransaction.resolves(result);
            showInputBoxStub.onFirstCall().resolves('[]');
            await vscode.commands.executeCommand(ExtensionCommands.EVALUATE_TRANSACTION);
            fabricClientConnectionMock.submitTransaction.should.have.been.calledWithExactly('myContract', 'transaction1', 'myChannel', [], 'my-contract', undefined, true, []);
            showInputBoxStub.should.have.been.calledTwice;
            logSpy.should.have.been.calledWith(LogType.INFO, undefined, `evaluating transaction transaction1 with no args on channel myChannel`);
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully evaluated transaction', `No value returned from transaction1`);
            reporterStub.should.have.been.calledWith('evaluate transaction');
            dockerLogsOutputSpy.should.not.have.been.called;
            outputAdapterShowSpy.should.have.been.calledOnce;
        });

        it('should submit a transaction through the transaction view', async () => {
            const transactionObject: any = {
                smartContract: 'myContract',
                transactionName: 'transaction1',
                channelName: 'myChannel',
                args: `["arg1", "arg2", "arg3"]`,
                namespace: 'my-contract',
                transientData: '',
                peerTargetNames: []
            };

            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION, undefined, undefined, undefined, transactionObject);
            fabricClientConnectionMock.submitTransaction.should.have.been.calledWith('myContract', 'transaction1', 'myChannel', ['arg1', 'arg2', 'arg3'], 'my-contract');
            dockerLogsOutputSpy.should.not.have.been.called;
            logSpy.should.have.been.calledWith(LogType.INFO, undefined, `submitting transaction transaction1 with args arg1,arg2,arg3 on channel myChannel`);
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully submitted transaction');
            reporterStub.should.have.been.calledWith('submit transaction');
        });

        it('should evaluate a transaction through the transaction view', async () => {
            const transactionObject: any = {
                smartContract: 'myContract',
                transactionName: 'transaction1',
                channelName: 'myChannel',
                args: `["arg1", "arg2", "arg3"]`,
                namespace: 'my-contract',
                transientData: '',
                peerTargetNames: []
            };

            await vscode.commands.executeCommand(ExtensionCommands.EVALUATE_TRANSACTION, undefined, undefined, undefined, transactionObject);
            fabricClientConnectionMock.submitTransaction.should.have.been.calledWith('myContract', 'transaction1', 'myChannel', ['arg1', 'arg2', 'arg3'], 'my-contract');
            dockerLogsOutputSpy.should.not.have.been.called;
            logSpy.should.have.been.calledWith(LogType.INFO, undefined, `evaluating transaction transaction1 with args arg1,arg2,arg3 on channel myChannel`);
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully evaluated transaction');
            reporterStub.should.have.been.calledWith('evaluate transaction');
        });

        it('should handle error from submitting a transaction through the transaction view', async () => {
            fabricClientConnectionMock.submitTransaction.rejects({ message: 'some error' });
            blockchainLogsOutputSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'show');

            const transactionObject: any = {
                smartContract: 'myContract',
                transactionName: 'transaction1',
                channelName: 'myChannel',
                args: `["arg1", "arg2", "arg3"]`,
                namespace: 'my-contract',
                transientData: '',
                peerTargetNames: []
            };

            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION, undefined, undefined, undefined, transactionObject);
            fabricClientConnectionMock.submitTransaction.should.have.been.calledWith('myContract', 'transaction1', 'myChannel', ['arg1', 'arg2', 'arg3'], 'my-contract');
            logSpy.should.have.been.calledWith(LogType.ERROR, 'Error submitting transaction: some error');
            reporterStub.should.not.have.been.called;
            dockerLogsOutputSpy.should.not.have.been.called;
            blockchainLogsOutputSpy.should.have.been.calledOnce;
        });

        it('should handle error from submitting transaction through the transaction view and output further errors', async () => {
            fabricClientConnectionMock.submitTransaction.rejects({ message: 'some error', endorsements: [{message: 'another error'}, {message: 'more error'}]});
            blockchainLogsOutputSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'show');

            const transactionObject: any = {
                smartContract: 'myContract',
                transactionName: 'transaction1',
                channelName: 'myChannel',
                args: `["arg1", "arg2", "arg3"]`,
                namespace: 'my-contract',
                transientData: '',
                peerTargetNames: []
            };

            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION, undefined, undefined, undefined, transactionObject);
            fabricClientConnectionMock.submitTransaction.should.have.been.calledWith('myContract', 'transaction1', 'myChannel', ['arg1', 'arg2', 'arg3'], 'my-contract');
            logSpy.should.have.been.calledWith(LogType.INFO, undefined, `submitting transaction transaction1 with args arg1,arg2,arg3 on channel myChannel`);
            logSpy.should.have.been.calledWith(LogType.ERROR, 'Error submitting transaction: some error');
            logSpy.should.have.been.calledWith(LogType.ERROR, 'Endorsement failed with: another error');
            logSpy.should.have.been.calledWith(LogType.ERROR, 'Endorsement failed with: more error');
            reporterStub.should.not.have.been.called;
            dockerLogsOutputSpy.should.not.have.been.called;
            blockchainLogsOutputSpy.should.have.been.calledOnce;
        });

        it('should handle error from evaluating a transaction through the transaction view', async () => {
            fabricClientConnectionMock.submitTransaction.rejects({ message: 'some error' });
            blockchainLogsOutputSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'show');

            const transactionObject: any = {
                smartContract: 'myContract',
                transactionName: 'transaction1',
                channelName: 'myChannel',
                args: `["arg1", "arg2", "arg3"]`,
                namespace: 'my-contract',
                transientData: '',
                peerTargetNames: []
            };

            await vscode.commands.executeCommand(ExtensionCommands.EVALUATE_TRANSACTION, undefined, undefined, undefined, transactionObject);
            fabricClientConnectionMock.submitTransaction.should.have.been.calledWith('myContract', 'transaction1', 'myChannel', ['arg1', 'arg2', 'arg3'], 'my-contract');
            logSpy.should.have.been.calledWith(LogType.ERROR, 'Error evaluating transaction: some error');
            reporterStub.should.not.have.been.called;
            dockerLogsOutputSpy.should.not.have.been.called;
            blockchainLogsOutputSpy.should.have.been.calledOnce;
        });

        it('should handle error from evaluating transaction through the transaction view and output further errors', async () => {
            fabricClientConnectionMock.submitTransaction.rejects({ message: 'some error', endorsements: [{message: 'another error'}, {message: 'more error'}]});
            blockchainLogsOutputSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'show');

            const transactionObject: any = {
                smartContract: 'myContract',
                transactionName: 'transaction1',
                channelName: 'myChannel',
                args: `["arg1", "arg2", "arg3"]`,
                namespace: 'my-contract',
                transientData: '',
                peerTargetNames: []
            };

            await vscode.commands.executeCommand(ExtensionCommands.EVALUATE_TRANSACTION, undefined, undefined, undefined, transactionObject);
            fabricClientConnectionMock.submitTransaction.should.have.been.calledWith('myContract', 'transaction1', 'myChannel', ['arg1', 'arg2', 'arg3'], 'my-contract');
            logSpy.should.have.been.calledWith(LogType.INFO, undefined, `evaluating transaction transaction1 with args arg1,arg2,arg3 on channel myChannel`);
            logSpy.should.have.been.calledWith(LogType.ERROR, 'Error evaluating transaction: some error');
            logSpy.should.have.been.calledWith(LogType.ERROR, 'Endorsement failed with: another error');
            logSpy.should.have.been.calledWith(LogType.ERROR, 'Endorsement failed with: more error');
            reporterStub.should.not.have.been.called;
            dockerLogsOutputSpy.should.not.have.been.called;
            blockchainLogsOutputSpy.should.have.been.calledOnce;
        });

        it(`should handle error when given incorrect args in the transaction view`, async () => {
            const transactionObject: any = {
                smartContract: 'myContract',
                transactionName: 'transaction1',
                channelName: 'myChannel',
                args: `["arg1", "arg2", "arg3]`,
                namespace: 'my-contract',
                transientData: '',
                peerTargetNames: []
            };

            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION, undefined, undefined, undefined, transactionObject);
            logSpy.should.have.been.calledTwice;
            logSpy.should.have.been.calledWith(LogType.ERROR, 'Error with transaction arguments: Unexpected end of JSON input');
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS, 'Successfully submitted transaction');
            reporterStub.should.not.have.been.calledWith('submit transaction');
            dockerLogsOutputSpy.should.not.have.been.called;
        });

        it('should submit a transaction through the transaction view with transient data', async () => {
            const transactionObject: any = {
                smartContract: 'myContract',
                transactionName: 'transaction1',
                channelName: 'myChannel',
                args: `["arg1", "arg2", "arg3"]`,
                namespace: 'my-contract',
                transientData: '{"key": "value"}',
                peerTargetNames: []
            };

            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION, undefined, undefined, undefined, transactionObject);
            fabricClientConnectionMock.submitTransaction.should.have.been.calledWithExactly('myContract', 'transaction1', 'myChannel', ['arg1', 'arg2', 'arg3'], 'my-contract', { key: Buffer.from('value') }, false, []);
            logSpy.should.have.been.calledWith(LogType.INFO, undefined, `submitting transaction transaction1 with args arg1,arg2,arg3 on channel myChannel`);
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully submitted transaction');
            reporterStub.should.have.been.calledWith('submit transaction');
            dockerLogsOutputSpy.should.not.have.been.called;
        });

        it('should error when required to give transient data in the transaction view', async () => {
            const transactionObject: any = {
                smartContract: 'myContract',
                transactionName: 'transaction1',
                channelName: 'myChannel',
                args: `["arg1", "arg2", "arg3"]`,
                namespace: 'my-contract',
                transientData: '{"wrong}',
                peerTargetNames: []
            };

            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION, undefined, undefined, undefined, transactionObject);
            fabricClientConnectionMock.submitTransaction.should.not.have.been.called;
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS, 'Successful submitTransaction');
            logSpy.should.have.been.calledWith(LogType.ERROR, `Error with transaction transient data: Unexpected end of JSON input`);
            reporterStub.should.not.have.been.calledWith('submit transaction');
            dockerLogsOutputSpy.should.not.have.been.called;
        });

        it('should error when transient data doesn\'t start with { in the transaction view', async () => {
            const transactionObject: any = {
                smartContract: 'myContract',
                transactionName: 'transaction1',
                channelName: 'myChannel',
                args: `["arg1", "arg2", "arg3"]`,
                namespace: 'my-contract',
                transientData: '"wrong"}',
                peerTargetNames: []
            };

            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION, undefined, undefined, undefined, transactionObject);
            fabricClientConnectionMock.submitTransaction.should.not.have.been.called;
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS, 'Successful submitTransaction');
            logSpy.should.have.been.calledWith(LogType.ERROR, `Error with transaction transient data: transient data should be in the format {"key": "value"}`);
            reporterStub.should.not.have.been.calledWith('submit transaction');
            dockerLogsOutputSpy.should.not.have.been.called;
        });

        it('should error when transient data doesn\'t end with } in the transaction view', async () => {
            const transactionObject: any = {
                smartContract: 'myContract',
                transactionName: 'transaction1',
                channelName: 'myChannel',
                args: `["arg1", "arg2", "arg3"]`,
                namespace: 'my-contract',
                transientData: '{"wrong"',
                peerTargetNames: []
            };

            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION, undefined, undefined, undefined, transactionObject);
            fabricClientConnectionMock.submitTransaction.should.not.have.been.called;
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS, 'Successful submitTransaction');
            logSpy.should.have.been.calledWith(LogType.ERROR, `Error with transaction transient data: transient data should be in the format {"key": "value"}`);
            reporterStub.should.not.have.been.calledWith('submit transaction');
            dockerLogsOutputSpy.should.not.have.been.called;
        });

        it('should let a user submit a file in their associated transaction data directory', async () => {
            const gatewayWithTestData: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
            gatewayWithTestData.name = 'myConnection';
            gatewayWithTestData.transactionDataDirectories = [
                {
                    chaincodeName: 'myContract',
                    channelName: 'myChannel',
                    transactionDataPath
                }
            ];
            registryStub.resolves(gatewayWithTestData);

            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);

            fabricClientConnectionMock.submitTransaction.should.have.been.calledWith('myContract', 'transaction1', 'myChannel', ['arg1', 'arg2', 'arg3'], 'my-contract');
            dockerLogsOutputSpy.should.not.have.been.called;
            logSpy.should.have.been.calledWith(LogType.INFO, undefined, `submitting transaction transaction1 with args arg1,arg2,arg3 on channel myChannel`);
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully submitted transaction');
            reporterStub.should.have.been.calledWith('submit transaction');
        });

        it('should allow a user to manually input transaction arguments if they choose not to submit a file', async () => {
            const gatewayWithTestData: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
            gatewayWithTestData.name = 'myConnection';
            gatewayWithTestData.transactionDataDirectories = [
                {
                    chaincodeName: 'myContract',
                    channelName: 'myChannel',
                    transactionDataPath
                }
            ];
            registryStub.resolves(gatewayWithTestData);

            showQuickPickItemStub.withArgs('Do you want to provide a file of transaction data for this transaction?').resolves({
                label: 'No (manual entry)',
                description: '',
                data: undefined
            });

            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);

            fabricClientConnectionMock.submitTransaction.should.have.been.calledWith('myContract', 'transaction1', 'myChannel', ['arg1', 'arg2', 'arg3'], 'my-contract');
            dockerLogsOutputSpy.should.not.have.been.called;
            logSpy.should.have.been.calledWith(LogType.INFO, undefined, `submitting transaction transaction1 with args arg1,arg2,arg3 on channel myChannel`);
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully submitted transaction');
            reporterStub.should.have.been.calledWith('submit transaction');
        });

        it('should handle cancellation when asking for a file to submit', async () => {
            const gatewayWithTestData: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
            gatewayWithTestData.name = 'myConnection';
            gatewayWithTestData.transactionDataDirectories = [
                {
                    chaincodeName: 'myContract',
                    channelName: 'myChannel',
                    transactionDataPath
                }
            ];
            registryStub.resolves(gatewayWithTestData);

            showQuickPickItemStub.withArgs('Do you want to provide a file of transaction data for this transaction?').resolves(undefined);

            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);

            fabricClientConnectionMock.submitTransaction.should.not.have.been.called;
            dockerLogsOutputSpy.should.not.have.been.called;
            logSpy.should.not.have.been.calledWith(LogType.INFO, undefined, `submitting transaction transaction1 with args arg1,arg2,arg3 on channel myChannel`);
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS, 'Successfully submitted transaction');
            reporterStub.should.not.have.been.calledWith('submit transaction');
        });

        it('should handle cancellation when choosing a transaction after not submitting a file', async () => {
            const gatewayWithTestData: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
            gatewayWithTestData.name = 'myConnection';
            gatewayWithTestData.transactionDataDirectories = [
                {
                    chaincodeName: 'myContract',
                    channelName: 'myChannel',
                    transactionDataPath
                }
            ];
            registryStub.resolves(gatewayWithTestData);

            showQuickPickItemStub.withArgs('Do you want to provide a file of transaction data for this transaction?').resolves({
                label: 'No (manual entry)',
                description: '',
                data: undefined
            });
            showTransactionQuickPickStub.resolves(undefined);

            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);

            fabricClientConnectionMock.submitTransaction.should.not.have.been.called;
            dockerLogsOutputSpy.should.not.have.been.called;
            logSpy.should.not.have.been.calledWith(LogType.INFO, undefined, `submitting transaction transaction1 with args arg1,arg2,arg3 on channel myChannel`);
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS, 'Successfully submitted transaction');
            reporterStub.should.not.have.been.calledWith('submit transaction');
        });

        it('should submit a transaction data file correctly when no transaction label is provided', async () => {
            const gatewayWithTestData: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
            gatewayWithTestData.name = 'myConnection';
            gatewayWithTestData.transactionDataDirectories = [
                {
                    chaincodeName: 'myContract',
                    channelName: 'myChannel',
                    transactionDataPath
                }
            ];
            registryStub.resolves(gatewayWithTestData);

            showQuickPickItemStub.withArgs('Do you want to provide a file of transaction data for this transaction?').resolves({
                label: 'transactionData.txdata',
                description: '',
                data: {
                    transactionName: 'transaction1',
                    arguments: [
                        'arg1',
                        'arg2',
                        'arg3'
                    ],
                    transientData: {
                        key: 'value'
                    }
                }
            });

            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);

            fabricClientConnectionMock.submitTransaction.should.have.been.calledWith('myContract', 'transaction1', 'myChannel', ['arg1', 'arg2', 'arg3'], 'my-contract');
            dockerLogsOutputSpy.should.not.have.been.called;
            logSpy.should.have.been.calledWith(LogType.INFO, undefined, `submitting transaction transaction1 with args arg1,arg2,arg3 on channel myChannel`);
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully submitted transaction');
            reporterStub.should.have.been.calledWith('submit transaction');
        });

        it('should submit a transaction data file correctly when no args or transient data are provided', async () => {
            const gatewayWithTestData: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
            gatewayWithTestData.name = 'myConnection';
            gatewayWithTestData.transactionDataDirectories = [
                {
                    chaincodeName: 'myContract',
                    channelName: 'myChannel',
                    transactionDataPath
                }
            ];
            registryStub.resolves(gatewayWithTestData);

            showQuickPickItemStub.withArgs('Do you want to provide a file of transaction data for this transaction?').resolves({
                label: 'transactionData.txdata',
                description: 'My Transaction - no args or transient',
                data: {
                    transactionName: 'transaction1',
                    transactionLabel: 'My Transaction - no args or transient'
                }
            });

            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);

            fabricClientConnectionMock.submitTransaction.should.have.been.calledWith('myContract', 'transaction1', 'myChannel', [], 'my-contract');
            dockerLogsOutputSpy.should.not.have.been.called;
            logSpy.should.have.been.calledWith(LogType.INFO, undefined, `submitting transaction transaction1 with no args on channel myChannel`);
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully submitted transaction');
            reporterStub.should.have.been.calledWith('submit transaction');
        });

        it('should handle an argument passed in as an object', async () => {
            const gatewayWithTestData: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
            gatewayWithTestData.name = 'myConnection';
            gatewayWithTestData.transactionDataDirectories = [
                {
                    chaincodeName: 'myContract',
                    channelName: 'myChannel',
                    transactionDataPath
                }
            ];
            registryStub.resolves(gatewayWithTestData);

            showQuickPickItemStub.withArgs('Do you want to provide a file of transaction data for this transaction?').resolves({
                label: 'transactionData.txdata',
                description: 'My Transaction - object as args',
                data: {
                    transactionName: 'transaction1',
                    transactionLabel: 'My Transaction - object as args',
                    arguments: [
                        {
                            key: 'value'
                        }
                    ]
                }
            });

            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);

            fabricClientConnectionMock.submitTransaction.should.have.been.calledWith('myContract', 'transaction1', 'myChannel', ['{"key":"value"}'], 'my-contract');
            dockerLogsOutputSpy.should.not.have.been.called;
            logSpy.should.have.been.calledWith(LogType.INFO, undefined, `submitting transaction transaction1 with args {"key":"value"} on channel myChannel`);
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully submitted transaction');
            reporterStub.should.have.been.calledWith('submit transaction');
        });

        it('should default to manual argument entry if the associated transaction data directory has no submittable files', async () => {
            const gatewayWithTestData: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
            gatewayWithTestData.name = 'myConnection';
            gatewayWithTestData.transactionDataDirectories = [
                {
                    chaincodeName: 'myContract',
                    channelName: 'myChannel',
                    transactionDataPath: notTransactionDataPath
                }
            ];
            registryStub.resolves(gatewayWithTestData);

            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);

            showInputBoxStub.withArgs('optional: What are the arguments to the transaction, (e.g. ["arg1", "arg2"])').should.have.been.called;
            showInputBoxStub.withArgs('optional: What is the transient data for the transaction, e.g. {"key": "value"}').should.have.been.called;

            fabricClientConnectionMock.submitTransaction.should.have.been.calledWith('myContract', 'transaction1', 'myChannel', ['arg1', 'arg2', 'arg3'], 'my-contract');
            dockerLogsOutputSpy.should.not.have.been.called;
            logSpy.should.have.been.calledWith(LogType.INFO, undefined, `submitting transaction transaction1 with args arg1,arg2,arg3 on channel myChannel`);
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully submitted transaction');
            reporterStub.should.have.been.calledWith('submit transaction');
        });

        it('should only show submittable transaction files if they are the same type as the selected transaction', async () => {
            const gatewayWithTestData: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
            gatewayWithTestData.name = 'myConnection';
            gatewayWithTestData.transactionDataDirectories = [
                {
                    chaincodeName: 'myContract',
                    channelName: 'myChannel',
                    transactionDataPath
                }
            ];
            registryStub.resolves(gatewayWithTestData);

            showQuickPickItemStub.withArgs('Do you want to provide a file of transaction data for this transaction?').resolves(undefined);

            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);

            const txnOptions: any = showQuickPickItemStub.getCall(0).args[1];
            txnOptions.should.not.contain({
                label: 'transactionData.txdata',
                description: 'My Other Transaction',
                data: {
                    transactionName: 'transaction2',
                    transactionLabel: 'My Other Transaction',
                    arguments: [
                        'arg1',
                        'arg2',
                        'arg3'
                    ],
                    transientData: {
                        key: 'value'
                    }
                }
            });
        });

        it('should handle an error if a transaction data file cannot be parsed and continue', async () => {
            const gatewayWithTestData: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
            gatewayWithTestData.name = 'myConnection';
            gatewayWithTestData.transactionDataDirectories = [
                {
                    chaincodeName: 'myContract',
                    channelName: 'myChannel',
                    transactionDataPath: badTransactionDataPath
                }
            ];

            registryStub.resolves(gatewayWithTestData);

            const error: Error = new Error('nah');
            mySandBox.stub(fs, 'readJSON').onFirstCall().rejects(error);

            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);

            logSpy.should.have.been.calledWith(LogType.ERROR, `Error with transaction file badTransactionData.txdata: ${error.message}`);

            fabricClientConnectionMock.submitTransaction.should.have.been.calledWith('myContract', 'transaction1', 'myChannel', ['arg1', 'arg2', 'arg3'], 'my-contract');
            dockerLogsOutputSpy.should.not.have.been.called;
            logSpy.should.have.been.calledWith(LogType.INFO, undefined, `submitting transaction transaction1 with args arg1,arg2,arg3 on channel myChannel`);
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully submitted transaction');
            reporterStub.should.have.been.calledWith('submit transaction');
        });

        it('should not show the transaction data quick pick if there is no valid data to submit', async () => {
            const gatewayWithTestData: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
            gatewayWithTestData.name = 'myConnection';
            gatewayWithTestData.transactionDataDirectories = [
                {
                    chaincodeName: 'myContract',
                    channelName: 'myChannel',
                    transactionDataPath
                }
            ];
            registryStub.resolves(gatewayWithTestData);

            showTransactionQuickPickStub.withArgs(sinon.match.any, 'myContract', 'myChannel').resolves({
                label: 'my-contract - instantiate',
                data: { name: 'instantiate', contract: 'my-contract' }
            });

            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);

            showQuickPickItemStub.withArgs('Do you want to provide a file of transaction data for this transaction?').should.not.have.been.called;

            fabricClientConnectionMock.submitTransaction.should.have.been.calledWith('myContract', 'instantiate', 'myChannel', ['arg1', 'arg2', 'arg3'], 'my-contract');
            dockerLogsOutputSpy.should.not.have.been.called;
            logSpy.should.have.been.calledWith(LogType.INFO, undefined, `submitting transaction instantiate with args arg1,arg2,arg3 on channel myChannel`);
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully submitted transaction');
            reporterStub.should.have.been.calledWith('submit transaction');
        });

        it('should connect to the correct gateway when debugging and submitting a transaction', async () => {
            const activeDebugSessionStub: any = {
                configuration: {
                    debugEvent: FabricDebugConfigurationProvider.debugEvent
                }
            };

            const connectToGatewayStub: sinon.SinonStub = mySandBox.stub(FabricDebugConfigurationProvider, 'connectToGateway').resolves(true);

            mySandBox.stub(vscode.debug, 'activeDebugSession').value(activeDebugSessionStub);

            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);
            connectToGatewayStub.should.have.been.calledOnce;
            fabricClientConnectionMock.submitTransaction.should.have.been.calledWith('myContract', 'transaction1', 'myChannel', ['arg1', 'arg2', 'arg3'], 'my-contract');
            dockerLogsOutputSpy.should.not.have.been.called;
            logSpy.should.have.been.calledWith(LogType.INFO, undefined, `submitting transaction transaction1 with args arg1,arg2,arg3 on channel myChannel`);
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully submitted transaction');
            reporterStub.should.have.been.calledWith('submit transaction');
        });

        it('should return if unable to connect to the correct gateway when debugging and submitting a transaction', async () => {
            const activeDebugSessionStub: any = {
                configuration: {
                    debugEvent: FabricDebugConfigurationProvider.debugEvent
                }
            };

            const connectToGatewayStub: sinon.SinonStub = mySandBox.stub(FabricDebugConfigurationProvider, 'connectToGateway').resolves(false);

            mySandBox.stub(vscode.debug, 'activeDebugSession').value(activeDebugSessionStub);

            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);
            connectToGatewayStub.should.have.been.calledOnce;
            fabricClientConnectionMock.submitTransaction.should.not.have.been.called;
            dockerLogsOutputSpy.should.not.have.been.called;
            logSpy.should.not.have.been.calledWith(LogType.INFO, undefined, `submitting transaction transaction1 with args arg1,arg2,arg3 on channel myChannel`);
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS, 'Successfully submitted transaction');
            reporterStub.should.not.have.been.calledWith('submit transaction');
        });

    });
});
