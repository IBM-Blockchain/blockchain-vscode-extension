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
import { InstantiatedChaincodeChildTreeItem } from '../../src/explorer/model/InstantiatedChaincodeChildTreeItem';
import { InstantiatedChaincodeParentTreeItem } from '../../src/explorer/model/InstantiatedChaincodeParentTreeItem';
import { Reporter } from '../../src/util/Reporter';

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
        let successSpy: sinon.SinonSpy;
        let errorSpy: sinon.SinonSpy;
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
            executeCommandStub.withArgs('blockchainExplorer.connectEntry').resolves();
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

            showTransactionQuickPickStub = mySandBox.stub(UserInputUtil, 'showTransactionQuickPick').withArgs(sinon.match.any, 'myContract', 'myChannel').resolves('transaction1');

            showInputBoxStub = mySandBox.stub(UserInputUtil, 'showInputBox');
            showInputBoxStub.onFirstCall().resolves('arg1,arg2,arg3');

            successSpy = mySandBox.spy(vscode.window, 'showInformationMessage');
            errorSpy = mySandBox.spy(vscode.window, 'showErrorMessage');

            fabricClientConnectionMock.submitTransaction.resolves();

            fabricClientConnectionMock.getAllPeerNames.returns(['peerOne']);

            fabricClientConnectionMock.getAllPeerNames.returns(['peerOne']);
            fabricClientConnectionMock.getAllChannelsForPeer.withArgs('peerOne').resolves(['channelOne']);

            fabricClientConnectionMock.getInstantiatedChaincode.resolves([{ name: 'mySmartContract', version: '0.0.1' }]);

            fabricClientConnectionMock.getMetadata.resolves({ '': { functions: ['transaction1'] }});

            blockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();

            allChildren = await blockchainNetworkExplorerProvider.getChildren();

            reporterStub = mySandBox.stub(Reporter.instance(), 'sendTelemetryEvent');
        });

        afterEach(async () => {
            await vscode.commands.executeCommand('blockchainExplorer.disconnectEntry');
            mySandBox.restore();
        });

        it('should submit the smart contract through the command', async () => {
            await vscode.commands.executeCommand('blockchainExplorer.submitTransactionEntry');
            fabricClientConnectionMock.submitTransaction.should.have.been.calledWith('myContract', 'transaction1', 'myChannel', ['arg1', 'arg2', 'arg3']);
            successSpy.should.have.been.calledWith('Successfully submitted transaction');
            reporterStub.should.have.been.calledWith('submit transaction');
        });

        it('should sumbit the smart contract through the command when not connected', async () => {
            getConnectionStub.onCall(4).returns(null);
            getConnectionStub.onCall(5).returns(fabricClientConnectionMock);

            await vscode.commands.executeCommand('blockchainExplorer.submitTransactionEntry');

            fabricClientConnectionMock.submitTransaction.should.have.been.calledWith('myContract', 'transaction1', 'myChannel', ['arg1', 'arg2', 'arg3']);
            successSpy.should.have.been.calledWith('Successfully submitted transaction');
            reporterStub.should.have.been.calledWith('submit transaction');
        });

        it('should handle connecting being cancelled', async () => {
            getConnectionStub.onCall(4).returns(null);
            getConnectionStub.onCall(5).returns(null);
            await vscode.commands.executeCommand('blockchainExplorer.submitTransactionEntry');
            executeCommandStub.should.have.been.calledWith('blockchainExplorer.connectEntry');
            fabricClientConnectionMock.submitTransaction.should.not.have.been.called;
            reporterStub.should.not.have.been.called;
        });

        it('should handle choosing smart contract being cancelled', async () => {
            showInstantiatedSmartContractQuickPickStub.resolves();

            await vscode.commands.executeCommand('blockchainExplorer.submitTransactionEntry');

            fabricClientConnectionMock.submitTransaction.should.not.have.been.called;
            reporterStub.should.not.have.been.called;
        });

        it('should handle error from submitting transaction', async () => {
            fabricClientConnectionMock.submitTransaction.rejects({ message: 'some error' });

            await vscode.commands.executeCommand('blockchainExplorer.submitTransactionEntry');

            fabricClientConnectionMock.submitTransaction.should.have.been.calledWith('myContract', 'transaction1', 'myChannel', ['arg1', 'arg2', 'arg3']);
            errorSpy.should.have.been.calledWith('Error submitting transaction: some error');
            reporterStub.should.not.have.been.called;
        });

        it('should handle cancel when choosing transaction', async () => {
            showTransactionQuickPickStub.resolves();

            await vscode.commands.executeCommand('blockchainExplorer.submitTransactionEntry');
            fabricClientConnectionMock.submitTransaction.should.not.have.been.called;
            reporterStub.should.not.have.been.called;
        });

        it('should submit transaction through the tree', async () => {
            const myChannel: ChannelTreeItem = allChildren[0] as ChannelTreeItem;

            const instantiatedChaincodes: Array<InstantiatedChaincodeParentTreeItem> = await blockchainNetworkExplorerProvider.getChildren(myChannel) as Array<InstantiatedChaincodeParentTreeItem>;

            instantiatedChaincodes.length.should.equal(2);
            const contracts: Array<InstantiatedChaincodeChildTreeItem> = await blockchainNetworkExplorerProvider.getChildren(instantiatedChaincodes[1]) as Array<InstantiatedChaincodeChildTreeItem>;

            contracts.length.should.equal(1);

            const transactions: Array<TransactionTreeItem> = await blockchainNetworkExplorerProvider.getChildren(contracts[0]) as Array<TransactionTreeItem>;
            transactions.length.should.equal(1);

            await vscode.commands.executeCommand('blockchainExplorer.submitTransactionEntry', transactions[0]);

            fabricClientConnectionMock.submitTransaction.should.have.been.calledWith('mySmartContract', 'transaction1', 'channelOne', ['arg1', 'arg2', 'arg3']);

            successSpy.should.have.been.calledWith('Successfully submitted transaction');
            reporterStub.should.have.been.calledWith('submit transaction');
        });

        it('should submit the smart contract through the command with function but no args', async () => {
            showInputBoxStub.onFirstCall().resolves();
            await vscode.commands.executeCommand('blockchainExplorer.submitTransactionEntry');
            fabricClientConnectionMock.submitTransaction.should.have.been.calledWithExactly('myContract', 'transaction1', 'myChannel', []);
            showInputBoxStub.should.have.been.calledOnce;
            successSpy.should.have.been.calledWith('Successfully submitted transaction');
            reporterStub.should.have.been.calledWith('submit transaction');
        });
    });
});
