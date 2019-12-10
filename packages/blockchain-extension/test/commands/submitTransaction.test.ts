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
import { FabricGatewayConnection } from 'ibm-blockchain-platform-gateway-v1';
import { FabricGatewayRegistryEntry } from '../../extension/registries/FabricGatewayRegistryEntry';

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
import { LogType } from '../../extension/logging/OutputAdapter';
import { ExtensionCommands } from '../../ExtensionCommands';
import { VSCodeBlockchainDockerOutputAdapter } from '../../extension/logging/VSCodeBlockchainDockerOutputAdapter';
import { InstantiatedContractTreeItem } from '../../extension/explorer/model/InstantiatedContractTreeItem';
import { InstantiatedChaincodeTreeItem } from '../../extension/explorer/model/InstantiatedChaincodeTreeItem';
import { InstantiatedUnknownTreeItem } from '../../extension/explorer/model/InstantiatedUnknownTreeItem';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';
import { FabricRuntimeUtil } from 'ibm-blockchain-platform-common';

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
        let getConnectionStub: sinon.SinonStub;
        let showInstantiatedSmartContractQuickPickStub: sinon.SinonStub;
        let showTransactionQuickPickStub: sinon.SinonStub;
        let showInputBoxStub: sinon.SinonStub;
        let showQuickPickStub: sinon.SinonStub;
        let showChannelPeersQuickPickStub: sinon.SinonStub;
        let reporterStub: sinon.SinonStub;

        let allChildren: Array<BlockchainTreeItem>;
        let blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider;
        let registryStub: sinon.SinonStub;
        let peerNames: string[];
        let mspIDs: string[];

        beforeEach(async () => {
            executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand');
            executeCommandStub.withArgs(ExtensionCommands.CONNECT_TO_GATEWAY).resolves();
            executeCommandStub.callThrough();

            fabricClientConnectionMock = mySandBox.createStubInstance(FabricGatewayConnection);
            fabricClientConnectionMock.connect.resolves();
            const fabricConnectionManager: FabricGatewayConnectionManager = FabricGatewayConnectionManager.instance();
            getConnectionStub = mySandBox.stub(fabricConnectionManager, 'getConnection').returns(fabricClientConnectionMock);

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
            showQuickPickStub.onFirstCall().resolves(UserInputUtil.DEFAULT);

            showChannelPeersQuickPickStub = mySandBox.stub(UserInputUtil, 'showChannelPeersQuickPick');

            logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
            dockerLogsOutputSpy = mySandBox.spy(VSCodeBlockchainDockerOutputAdapter.instance(), 'show');

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
            fabricClientConnectionMock.createChannelMap.resolves(map);

            const registryEntry: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
            registryEntry.name = 'myConnection';
            registryStub = mySandBox.stub(FabricGatewayConnectionManager.instance(), 'getGatewayRegistryEntry').returns(registryEntry);

            blockchainGatewayExplorerProvider = ExtensionUtil.getBlockchainGatewayExplorerProvider();

            allChildren = await blockchainGatewayExplorerProvider.getChildren();

            reporterStub = mySandBox.stub(Reporter.instance(), 'sendTelemetryEvent');
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
            registryEntry.name = FabricRuntimeUtil.LOCAL_FABRIC;
            registryStub.returns(registryEntry);
            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);
            fabricClientConnectionMock.submitTransaction.should.have.been.calledWith('myContract', 'transaction1', 'myChannel', ['arg1', 'arg2', 'arg3'], 'my-contract');
            dockerLogsOutputSpy.should.have.been.called;
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

        it('should handle choosing smart contract being cancelled', async () => {
            showInstantiatedSmartContractQuickPickStub.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);

            fabricClientConnectionMock.submitTransaction.should.not.have.been.called;
            reporterStub.should.not.have.been.called;
            dockerLogsOutputSpy.should.not.have.been.called;
        });

        it('should handle error from evaluating transaction', async () => {
            fabricClientConnectionMock.submitTransaction.rejects({ message: 'some error' });

            await vscode.commands.executeCommand(ExtensionCommands.EVALUATE_TRANSACTION);

            fabricClientConnectionMock.submitTransaction.should.have.been.calledWith('myContract', 'transaction1', 'myChannel', ['arg1', 'arg2', 'arg3'], 'my-contract', undefined, true);
            logSpy.should.have.been.calledWith(LogType.ERROR, 'Error evaluating transaction: some error');
            reporterStub.should.not.have.been.called;
            dockerLogsOutputSpy.should.not.have.been.called;
        });

        it('should handle error from evaluating transaction and output further errors', async () => {
            fabricClientConnectionMock.submitTransaction.rejects({ message: 'some error', endorsements: [{message: 'another error'}, {message: 'more error'}]});

            await vscode.commands.executeCommand(ExtensionCommands.EVALUATE_TRANSACTION);

            fabricClientConnectionMock.submitTransaction.should.have.been.calledWith('myContract', 'transaction1', 'myChannel', ['arg1', 'arg2', 'arg3'], 'my-contract', undefined, true);
            logSpy.should.have.been.calledWith(LogType.INFO, undefined, `evaluating transaction transaction1 with args arg1,arg2,arg3 on channel myChannel`);
            logSpy.should.have.been.calledWith(LogType.ERROR, 'Error evaluating transaction: some error');
            logSpy.should.have.been.calledWith(LogType.ERROR, 'Endorsement failed with: another error');
            logSpy.should.have.been.calledWith(LogType.ERROR, 'Endorsement failed with: more error');
            reporterStub.should.not.have.been.called;
            dockerLogsOutputSpy.should.not.have.been.called;
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

            const channelChildren: Array<BlockchainTreeItem> = await blockchainGatewayExplorerProvider.getChildren(myChannel) as Array<BlockchainTreeItem>;
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

            const channelChildren: Array<BlockchainTreeItem> = await blockchainGatewayExplorerProvider.getChildren(myChannel) as Array<BlockchainTreeItem>;
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

            const channelChildren: Array<BlockchainTreeItem> = await blockchainGatewayExplorerProvider.getChildren(myChannel) as Array<BlockchainTreeItem>;
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
        });

        it('should handle error from submitting transaction through the transaction view and output further errors', async () => {
            fabricClientConnectionMock.submitTransaction.rejects({ message: 'some error', endorsements: [{message: 'another error'}, {message: 'more error'}]});

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
        });

        it('should handle error from evaluating a transaction through the transaction view', async () => {
            fabricClientConnectionMock.submitTransaction.rejects({ message: 'some error' });

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
        });

        it('should handle error from evaluating transaction through the transaction view and output further errors', async () => {
            fabricClientConnectionMock.submitTransaction.rejects({ message: 'some error', endorsements: [{message: 'another error'}, {message: 'more error'}]});

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
    });
});
