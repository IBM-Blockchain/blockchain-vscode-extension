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
import { FabricClientConnection } from '../../extension/fabric/FabricClientConnection';
import { FabricGatewayRegistryEntry } from '../../extension/registries/FabricGatewayRegistryEntry';

import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';

import * as path from 'path';

import { TestUtil } from '../TestUtil';
import { FabricConnectionManager } from '../../extension/fabric/FabricConnectionManager';
import { UserInputUtil } from '../../extension/commands/UserInputUtil';
import { BlockchainTreeItem } from '../../extension/explorer/model/BlockchainTreeItem';
import { BlockchainGatewayExplorerProvider } from '../../extension/explorer/gatewayExplorer';
import { ChannelTreeItem } from '../../extension/explorer/model/ChannelTreeItem';
import { ExtensionCommands } from '../../ExtensionCommands';
import { InstantiatedContractTreeItem } from '../../extension/explorer/model/InstantiatedContractTreeItem';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';
import { InstantiatedTreeItem } from '../../extension/explorer/model/InstantiatedTreeItem';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { FabricGatewayHelper } from '../../extension/fabric/FabricGatewayHelper';
import { LogType } from '../../extension/logging/OutputAdapter';
import { TransactionView } from '../../extension/webview/TransactionView';

chai.use(sinonChai);
chai.should();

describe('OpenTransactionViewCommand', () => {
    let mySandBox: sinon.SinonSandbox = sinon.createSandbox();
    let instantiatedSmartContract: InstantiatedContractTreeItem;
    let fabricClientConnectionMock: sinon.SinonStubbedInstance<FabricClientConnection>;

    let executeCommandStub: sinon.SinonStub;
    let getConnectionStub: sinon.SinonStub;
    let showInstantiatedSmartContractQuickPickStub: sinon.SinonStub;

    let fabricConnectionManager: FabricConnectionManager;

    let logSpy: sinon.SinonSpy;

    let gatewayRegistryEntry: FabricGatewayRegistryEntry;
    let getGatewayRegistryStub: sinon.SinonStub;

    let openViewStub: sinon.SinonStub;

    before(async () => {
        await TestUtil.setupTests(mySandBox);
    });

    describe('OpenTransactionView', () => {

        beforeEach(async () => {
            mySandBox = sinon.createSandbox();

            logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');

            executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand');
            executeCommandStub.callThrough();
            executeCommandStub.withArgs(ExtensionCommands.CONNECT_TO_GATEWAY).resolves();
            fabricClientConnectionMock = mySandBox.createStubInstance(FabricClientConnection);
            fabricClientConnectionMock.connect.resolves();

            const map: Map<string, Array<string>> = new Map<string, Array<string>>();
            map.set('myChannel', ['peerOne']);
            fabricClientConnectionMock.createChannelMap.resolves(map);
            fabricConnectionManager = FabricConnectionManager.instance();
            getConnectionStub = mySandBox.stub(fabricConnectionManager, 'getConnection').returns(fabricClientConnectionMock);

            gatewayRegistryEntry = new FabricGatewayRegistryEntry();
            gatewayRegistryEntry.name = 'myGateway';
            getGatewayRegistryStub = mySandBox.stub(fabricConnectionManager, 'getGatewayRegistryEntry');
            getGatewayRegistryStub.returns(gatewayRegistryEntry);

            mySandBox.stub(FabricGatewayHelper, 'getConnectionProfilePath').resolves(path.join('myPath', 'connection.json'));

            fabricClientConnectionMock.getAllPeerNames.returns(['peerOne']);
            fabricClientConnectionMock.getAllChannelsForPeer.withArgs('peerOne').resolves(['myChannel']);

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
                                }
                            ],
                        }
                    }
                }
            );

            showInstantiatedSmartContractQuickPickStub = mySandBox.stub(UserInputUtil, 'showClientInstantiatedSmartContractsQuickPick').resolves({
                label: 'myContract',
                data: { name: 'myContract', channel: 'myChannel', version: '0.0.1' }
            });

            openViewStub = mySandBox.stub(TransactionView.prototype, 'openView').resolves();
        });

        afterEach(async () => {
            mySandBox.restore();
        });

        it('should open the transaction web view through the tree', async () => {
            const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = ExtensionUtil.getBlockchainGatewayExplorerProvider();
            const allChildren: BlockchainTreeItem[] = await blockchainGatewayExplorerProvider.getChildren();
            const channels: Array<ChannelTreeItem> = await blockchainGatewayExplorerProvider.getChildren(allChildren[2]) as Array<ChannelTreeItem>;
            const contracts: Array<InstantiatedTreeItem> =  await blockchainGatewayExplorerProvider.getChildren(channels[0]) as Array<InstantiatedTreeItem>;
            instantiatedSmartContract = contracts[0];

            await vscode.commands.executeCommand(ExtensionCommands.OPEN_TRANSACTION_PAGE, instantiatedSmartContract);

            logSpy.should.have.been.calledWith(LogType.INFO, undefined, `Open Transaction View`);
            openViewStub.should.have.been.calledOnce;
        });

        it('should open the transaction web view through the command', async () => {
            await vscode.commands.executeCommand(ExtensionCommands.OPEN_TRANSACTION_PAGE);
            logSpy.should.have.been.calledWith(LogType.INFO, undefined, `Open Transaction View`);
            showInstantiatedSmartContractQuickPickStub.should.have.been.calledOnce;
            openViewStub.should.have.been.calledOnce;
        });

        it('should open the transaction web view through the command when not connected', async () => {
            getConnectionStub.onCall(0).returns(null);

            await vscode.commands.executeCommand(ExtensionCommands.OPEN_TRANSACTION_PAGE);

            logSpy.should.have.been.calledWith(LogType.INFO, undefined, `Open Transaction View`);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_GATEWAY);
            showInstantiatedSmartContractQuickPickStub.should.have.been.calledOnce;
            openViewStub.should.have.been.calledOnce;

        });

        it('should handle cancellation when connecting to a gateway', async () => {
            getConnectionStub.onCall(0).returns(null);
            getConnectionStub.onCall(1).returns(null);

            await vscode.commands.executeCommand(ExtensionCommands.OPEN_TRANSACTION_PAGE);

            logSpy.should.have.been.calledWith(LogType.INFO, undefined, `Open Transaction View`);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_GATEWAY);
            showInstantiatedSmartContractQuickPickStub.should.not.have.been.called;
            openViewStub.should.not.have.been.called;

        });

        it('should handle cancellation when choosing a smart contract', async () => {
            showInstantiatedSmartContractQuickPickStub.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.OPEN_TRANSACTION_PAGE);

            logSpy.should.have.been.calledWith(LogType.INFO, undefined, `Open Transaction View`);
            showInstantiatedSmartContractQuickPickStub.should.have.been.calledOnce;
            openViewStub.should.not.have.been.called;

        });

    });
});
