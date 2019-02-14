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
import { FabricClientConnection } from '../../src/fabric/FabricClientConnection';
import { FabricGatewayRegistryEntry } from '../../src/fabric/FabricGatewayRegistryEntry';

import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';

import { TestUtil } from '../TestUtil';
import { FabricConnectionManager } from '../../src/fabric/FabricConnectionManager';
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import { BlockchainTreeItem } from '../../src/explorer/model/BlockchainTreeItem';
import { BlockchainNetworkExplorerProvider } from '../../src/explorer/BlockchainNetworkExplorer';
import * as myExtension from '../../src/extension';
import { ChannelTreeItem } from '../../src/explorer/model/ChannelTreeItem';
import { TransactionTreeItem } from '../../src/explorer/model/TransactionTreeItem';
import { InstantiatedChaincodeTreeItem } from '../../src/explorer/model/InstantiatedChaincodeTreeItem';
import { Reporter } from '../../src/util/Reporter';
import { ContractTreeItem } from '../../src/explorer/model/ContractTreeItem';
import { VSCodeOutputAdapter } from '../../src/logging/VSCodeOutputAdapter';
import { LogType } from '../../src/logging/OutputAdapter';
import { ExtensionCommands } from '../../ExtensionCommands';

chai.use(sinonChai);
const should: Chai.Should = chai.should();

describe('SubmitTransactionCommand', () => {
    let mySandBox: sinon.SinonSandbox;

    before(async () => {
        await TestUtil.setupTests();
    });

    describe('SubmitTransaction', () => {
        let fabricClientConnectionMock: sinon.SinonStubbedInstance<FabricClientConnection>;

        let executeCommandStub: sinon.SinonStub;
        let logSpy: sinon.SinonSpy;
        let getConnectionStub: sinon.SinonStub;
        let showInstantiatedSmartContractQuickPickStub: sinon.SinonStub;
        let showTransactionQuickPickStub: sinon.SinonStub;
        let showInputBoxStub: sinon.SinonStub;
        let reporterStub: sinon.SinonStub;

        let allChildren: Array<BlockchainTreeItem>;
        let blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider;

        beforeEach(async () => {
            mySandBox = sinon.createSandbox();
            executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand');
            executeCommandStub.withArgs(ExtensionCommands.CONNECT).resolves();
            executeCommandStub.callThrough();

            fabricClientConnectionMock = sinon.createStubInstance(FabricClientConnection);
            fabricClientConnectionMock.connect.resolves();
            fabricClientConnectionMock.instantiateChaincode.resolves();
            const fabricConnectionManager: FabricConnectionManager = FabricConnectionManager.instance();
            getConnectionStub = mySandBox.stub(fabricConnectionManager, 'getConnection').returns(fabricClientConnectionMock);

            showInstantiatedSmartContractQuickPickStub = mySandBox.stub(UserInputUtil, 'showInstantiatedSmartContractsQuickPick').resolves({
                label: 'myContract',
                data: { name: 'myContract', channel: 'myChannel', version: '0.0.1' }
            });

            showTransactionQuickPickStub = mySandBox.stub(UserInputUtil, 'showTransactionQuickPick').withArgs(sinon.match.any, 'myContract', 'myChannel').resolves({
                label: 'my-contract - transaction1',
                data: { name: 'transaction1', contract: 'my-contract'}
            });

            showInputBoxStub = mySandBox.stub(UserInputUtil, 'showInputBox');
            showInputBoxStub.onFirstCall().resolves('arg1,arg2,arg3');

            logSpy = mySandBox.spy(VSCodeOutputAdapter.instance(), 'log');

            fabricClientConnectionMock.submitTransaction.resolves();

            fabricClientConnectionMock.getAllPeerNames.returns(['peerOne']);

            fabricClientConnectionMock.getAllPeerNames.returns(['peerOne']);
            fabricClientConnectionMock.getAllChannelsForPeer.withArgs('peerOne').resolves(['channelOne']);

            fabricClientConnectionMock.getInstantiatedChaincode.resolves([{ name: 'mySmartContract', version: '0.0.1' }]);

            fabricClientConnectionMock.getMetadata.resolves(
                {
                    contracts: {
                        'my-contract' : {
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

            const registryEntry: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
            registryEntry.name = 'myConnection';
            registryEntry.connectionProfilePath = 'myPath';
            registryEntry.managedRuntime = false;
            mySandBox.stub(FabricConnectionManager.instance(), 'getGatewayRegistryEntry').returns(registryEntry);

            blockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();

            allChildren = await blockchainNetworkExplorerProvider.getChildren();

            reporterStub = mySandBox.stub(Reporter.instance(), 'sendTelemetryEvent');
        });

        afterEach(async () => {
            await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT);
            mySandBox.restore();
        });

        it('should submit the smart contract through the command', async () => {
            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);
            fabricClientConnectionMock.submitTransaction.should.have.been.calledWith('myContract', 'transaction1', 'myChannel', ['arg1', 'arg2', 'arg3'], 'my-contract');
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully submitted transaction');
            reporterStub.should.have.been.calledWith('submit transaction');
        });

        it('should sumbit the smart contract through the command when not connected', async () => {
            getConnectionStub.onCall(2).returns(null);
            getConnectionStub.onCall(3).returns(fabricClientConnectionMock);

            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);

            fabricClientConnectionMock.submitTransaction.should.have.been.calledWith('myContract', 'transaction1', 'myChannel', ['arg1', 'arg2', 'arg3'], 'my-contract');
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully submitted transaction');
            reporterStub.should.have.been.calledWith('submit transaction');
        });

        it('should handle connecting being cancelled', async () => {
            getConnectionStub.onCall(2).returns(null);
            getConnectionStub.onCall(3).returns(null);
            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.CONNECT);
            fabricClientConnectionMock.submitTransaction.should.not.have.been.called;
            reporterStub.should.not.have.been.called;
        });

        it('should handle choosing smart contract being cancelled', async () => {
            showInstantiatedSmartContractQuickPickStub.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);

            fabricClientConnectionMock.submitTransaction.should.not.have.been.called;
            reporterStub.should.not.have.been.called;
        });

        it('should handle error from submitting transaction', async () => {
            fabricClientConnectionMock.submitTransaction.rejects({ message: 'some error' });

            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);

            fabricClientConnectionMock.submitTransaction.should.have.been.calledWith('myContract', 'transaction1', 'myChannel', ['arg1', 'arg2', 'arg3'], 'my-contract');
            logSpy.should.have.been.calledWith(LogType.ERROR, 'Error submitting transaction: some error');
            reporterStub.should.not.have.been.called;
        });

        it('should handle cancel when choosing transaction', async () => {
            showTransactionQuickPickStub.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);
            fabricClientConnectionMock.submitTransaction.should.not.have.been.called;
            reporterStub.should.not.have.been.called;
        });

        it('should submit transaction through the tree', async () => {
            const myChannel: ChannelTreeItem = allChildren[2] as ChannelTreeItem;

            const channelChildren: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren(myChannel) as Array<BlockchainTreeItem>;

            const instantiatedChainCodes: Array<InstantiatedChaincodeTreeItem> = await blockchainNetworkExplorerProvider.getChildren(channelChildren[0]) as Array<InstantiatedChaincodeTreeItem>;
            instantiatedChainCodes.length.should.equal(1);

            const transactions: Array<TransactionTreeItem> = await blockchainNetworkExplorerProvider.getChildren(instantiatedChainCodes[0]) as Array<TransactionTreeItem>;
            transactions.length.should.equal(3);

            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION, transactions[0]);

            fabricClientConnectionMock.submitTransaction.should.have.been.calledWith('mySmartContract', 'transaction1', 'channelOne', ['arg1', 'arg2', 'arg3'], 'my-contract');

            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully submitted transaction');
            reporterStub.should.have.been.calledWith('submit transaction');
        });

        it('should submit the smart contract through the command with function but no args', async () => {
            showInputBoxStub.onFirstCall().resolves('');
            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);
            fabricClientConnectionMock.submitTransaction.should.have.been.calledWithExactly('myContract', 'transaction1', 'myChannel', [], 'my-contract');
            showInputBoxStub.should.have.been.calledOnce;
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully submitted transaction');
            reporterStub.should.have.been.calledWith('submit transaction');
        });

        it('should handle cancelling when required to give args', async () => {
            showInputBoxStub.onFirstCall().resolves(undefined);
            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);
            fabricClientConnectionMock.submitTransaction.should.not.have.been.called;
            showInputBoxStub.should.have.been.calledOnce;
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS, 'Successfully submitted transaction');
            reporterStub.should.not.have.been.calledWith('submit transaction');
        });
    });
});
