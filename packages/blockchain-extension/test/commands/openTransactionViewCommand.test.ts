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
import { FabricRuntimeUtil, FabricGatewayRegistryEntry } from 'ibm-blockchain-platform-common';

import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';

import * as path from 'path';

import { TestUtil } from '../TestUtil';
import { FabricGatewayConnectionManager } from '../../extension/fabric/FabricGatewayConnectionManager';
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
import { LogType } from 'ibm-blockchain-platform-common';
import { TransactionView } from '../../extension/webview/TransactionView';
import ITransaction from '../../extension/interfaces/ITransaction';
import IAssociatedTxData from '../../extension/interfaces/IAssociatedTxData';
import ISmartContract from '../../extension/interfaces/ISmartContract';
import ITxDataFile from '../../extension/interfaces/ITxDataFile';
import { ContractTreeItem } from '../../extension/explorer/model/ContractTreeItem';

chai.use(sinonChai);
chai.should();

interface IAppState {
    gatewayName: string;
    smartContracts: ISmartContract[];
    associatedTxdata: IAssociatedTxData;
    preselectedSmartContract: ISmartContract;
    preselectedTransaction: ITransaction;
}

const transactionOne: ITransaction = {
    name: 'transactionOne',
    parameters: [{
        description: '',
        name: 'name',
        schema: {}
    }],
    returns: {
        type: ''
    },
    tag: ['submit']
};

const transactionTwo: ITransaction = {
    name: 'transactionTwo',
    parameters: [],
    returns: {
        type: ''
    },
    tag: ['submit']
};

const transactionsInFiles: ITxDataFile[] = [
    {
        transactionName: transactionOne.name,
        transactionLabel: transactionOne.name,
        arguments: [],
        transientData: {},
        txDataFile: 'file.txdata',
    },
    {
        transactionName: transactionTwo.name,
        transactionLabel: transactionTwo.name,
        arguments: [],
        transientData: {},
        txDataFile: 'file2.txdata',
    }
];

describe('OpenTransactionViewCommand', () => {
    let mySandBox: sinon.SinonSandbox = sinon.createSandbox();
    let instantiatedSmartContract: InstantiatedContractTreeItem;
    let fabricClientConnectionMock: sinon.SinonStubbedInstance<FabricGatewayConnection>;

    let executeCommandStub: sinon.SinonStub;
    let getConnectionStub: sinon.SinonStub;
    let showInstantiatedSmartContractQuickPickStub: sinon.SinonStub;

    let fabricConnectionManager: FabricGatewayConnectionManager;

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
            fabricClientConnectionMock = mySandBox.createStubInstance(FabricGatewayConnection);
            fabricClientConnectionMock.connect.resolves();

            const map: Map<string, Array<string>> = new Map<string, Array<string>>();
            map.set('myChannel', ['peerOne']);
            fabricClientConnectionMock.createChannelMap.resolves(map);
            fabricClientConnectionMock.getChannelCapabilityFromPeer.resolves([UserInputUtil.V2_0]);
            fabricConnectionManager = FabricGatewayConnectionManager.instance();
            getConnectionStub = mySandBox.stub(fabricConnectionManager, 'getConnection').returns(fabricClientConnectionMock);

            gatewayRegistryEntry = new FabricGatewayRegistryEntry();
            gatewayRegistryEntry.name = 'myGateway';
            getGatewayRegistryStub = mySandBox.stub(fabricConnectionManager, 'getGatewayRegistryEntry');
            getGatewayRegistryStub.resolves(gatewayRegistryEntry);

            mySandBox.stub(FabricGatewayHelper, 'getConnectionProfilePath').resolves(path.join('myPath', 'connection.json'));

            fabricClientConnectionMock.getAllPeerNames.returns(['peerOne']);
            fabricClientConnectionMock.getAllChannelsForPeer.withArgs('peerOne').resolves(['myChannel']);

            fabricClientConnectionMock.getChannelPeersInfo.resolves([{
                name: 'peerOne',
                mspID: 'org1msp'
            }, {
                name: 'peerTwo',
                mspID: 'org1msp'
            }]);

            fabricClientConnectionMock.getInstantiatedChaincode.resolves([{ name: 'mySmartContract', version: '0.0.1' }]);

            fabricClientConnectionMock.getMetadata.resolves(
                {
                    contracts: {
                        'my-contract': {
                            name: 'my-contract',
                            transactions: [
                                transactionOne,
                                transactionTwo,
                            ],
                        },
                        'org.hyperledger.fabric': {
                            name: 'org.hyperledger.fabric',
                            transactions: [
                                {
                                    name: 'GetMetadata'
                                }
                            ]
                        }
                    }
                }
            );

            fabricClientConnectionMock.getMetadata.withArgs('MultiContract', sinon.match.any).resolves(
                {
                    contracts: {
                        'my-contract': {
                            name: 'my-contract',
                            transactions: [
                                transactionOne,
                                transactionTwo,
                            ],
                        },
                        'my-contract-2': {
                            name: 'my-contract-2',
                            transactions: [
                                transactionOne,
                            ],
                        }
                    }
                }
            );

            showInstantiatedSmartContractQuickPickStub = mySandBox.stub(UserInputUtil, 'showClientInstantiatedSmartContractsQuickPick');
            showInstantiatedSmartContractQuickPickStub.resolves({
                label: 'myContract',
                data: { name: 'myContract', channel: 'myChannel', version: '0.0.1' }
            });

            openViewStub = mySandBox.stub(TransactionView.prototype, 'openView').resolves();

            mySandBox.stub(TransactionView, 'readTxdataFiles').resolves(transactionsInFiles);
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

            const appstate: IAppState = await vscode.commands.executeCommand(ExtensionCommands.OPEN_TRANSACTION_PAGE, instantiatedSmartContract);
            const smartContract: ISmartContract = {
                channel: 'myChannel',
                label: 'mySmartContract@0.0.1',
                name: 'mySmartContract',
                namespace: 'my-contract',
                contractName: 'my-contract',
                peerNames: ['peerOne', 'peerTwo'],
                version: '0.0.1',
                transactions: [
                    transactionOne,
                    transactionTwo,
                ],
            };
            const want: IAppState = {
                associatedTxdata: {},
                gatewayName: 'myGateway',
                smartContracts: [smartContract],
                preselectedSmartContract: smartContract,
                preselectedTransaction: undefined,
            };

            appstate.should.deep.equal(want);

            logSpy.should.have.been.calledWith(LogType.INFO, undefined, `Open Transaction View`);
            openViewStub.should.have.been.calledOnce;
        });

        it('should open the transaction web view through the tree and handle set the preselectedTransaction when passed in', async () => {
            const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = ExtensionUtil.getBlockchainGatewayExplorerProvider();
            const allChildren: BlockchainTreeItem[] = await blockchainGatewayExplorerProvider.getChildren();
            const channels: Array<ChannelTreeItem> = await blockchainGatewayExplorerProvider.getChildren(allChildren[2]) as Array<ChannelTreeItem>;
            const contracts: Array<InstantiatedTreeItem> =  await blockchainGatewayExplorerProvider.getChildren(channels[0]) as Array<InstantiatedTreeItem>;
            instantiatedSmartContract = contracts[0];

            const appstate: IAppState = await vscode.commands.executeCommand(ExtensionCommands.OPEN_TRANSACTION_PAGE, instantiatedSmartContract, 'transactionOne');
            const smartContract: ISmartContract = {
                channel: 'myChannel',
                label: 'mySmartContract@0.0.1',
                name: 'mySmartContract',
                namespace: 'my-contract',
                contractName: 'my-contract',
                peerNames: ['peerOne', 'peerTwo'],
                version: '0.0.1',
                transactions: [
                    transactionOne,
                    transactionTwo,
                ],
            };
            const want: IAppState = {
                associatedTxdata: {},
                gatewayName: 'myGateway',
                smartContracts: [smartContract],
                preselectedSmartContract: smartContract,
                preselectedTransaction: transactionOne,
            };

            appstate.should.deep.equal(want);

            logSpy.should.have.been.calledWith(LogType.INFO, undefined, `Open Transaction View`);
            openViewStub.should.have.been.calledOnce;
        });

        it('should open the transaction web view through the tree and handle when the preselectedTransaction does not exist', async () => {
            const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = ExtensionUtil.getBlockchainGatewayExplorerProvider();
            const allChildren: BlockchainTreeItem[] = await blockchainGatewayExplorerProvider.getChildren();
            const channels: Array<ChannelTreeItem> = await blockchainGatewayExplorerProvider.getChildren(allChildren[2]) as Array<ChannelTreeItem>;
            const contracts: Array<InstantiatedTreeItem> =  await blockchainGatewayExplorerProvider.getChildren(channels[0]) as Array<InstantiatedTreeItem>;
            instantiatedSmartContract = contracts[0];

            const appstate: IAppState = await vscode.commands.executeCommand(ExtensionCommands.OPEN_TRANSACTION_PAGE, instantiatedSmartContract, 'does not exist');
            const smartContract: ISmartContract = {
                channel: 'myChannel',
                label: 'mySmartContract@0.0.1',
                name: 'mySmartContract',
                namespace: 'my-contract',
                contractName: 'my-contract',
                peerNames: ['peerOne', 'peerTwo'],
                version: '0.0.1',
                transactions: [
                    transactionOne,
                    transactionTwo,
                ],
            };
            const want: IAppState = {
                associatedTxdata: {},
                gatewayName: 'myGateway',
                smartContracts: [smartContract],
                preselectedSmartContract: smartContract,
                preselectedTransaction: undefined,
            };

            appstate.should.deep.equal(want);

            logSpy.should.have.been.calledWith(LogType.INFO, undefined, `Open Transaction View`);
            openViewStub.should.have.been.calledOnce;
        });

        it('should open the transaction web view through the tree when the chaincode contains multiple contracts and make the correct transaction active', async () => {
            const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = ExtensionUtil.getBlockchainGatewayExplorerProvider();
            const allChildren: BlockchainTreeItem[] = await blockchainGatewayExplorerProvider.getChildren();
            const channels: Array<ChannelTreeItem> = await blockchainGatewayExplorerProvider.getChildren(allChildren[2]) as Array<ChannelTreeItem>;
            fabricClientConnectionMock.getInstantiatedChaincode.resolves([{ name: 'MultiContract', version: '0.0.1' }]);

            const chainCodeElement: any = {
                channels,
                collapsibleState: 1,
                contextValue: 'blockchain-instantiated-multi-contract-item',
                contracts: ['my-contract', 'my-contract-2'],
                iconPath: {light: '', dark: ''},
                label: 'MultiContract@0.0.1',
                name: 'MultiContract',
                provider: blockchainGatewayExplorerProvider,
                showIcon: true,
                tooltip: '',
                version: '0.0.1',
            };

            const treeItem: any = new ContractTreeItem(blockchainGatewayExplorerProvider, 'my-contract-2', 1, chainCodeElement, [transactionOne.name, transactionTwo.name], chainCodeElement.channels[0].label);

            const appstate: IAppState = await vscode.commands.executeCommand(ExtensionCommands.OPEN_TRANSACTION_PAGE, treeItem, transactionOne.name);

            const smartContract: ISmartContract = {
                channel: 'myChannel',
                label: 'MultiContract@0.0.1',
                name: 'MultiContract',
                namespace: 'my-contract',
                contractName: 'my-contract',
                peerNames: ['peerOne', 'peerTwo'],
                version: '0.0.1',
                transactions: [
                    transactionOne,
                    transactionTwo,
                ],
            };
            const smartContract2: ISmartContract = {
                ...smartContract,
                namespace: 'my-contract-2',
                contractName: 'my-contract-2',
                transactions: [
                    transactionOne,
                ]
            };

            const want: IAppState = {
                associatedTxdata: {},
                gatewayName: 'myGateway',
                smartContracts: [smartContract, smartContract2],
                preselectedSmartContract: smartContract2,
                preselectedTransaction: transactionOne,
            };

            appstate.should.deep.equal(want);

            logSpy.should.have.been.calledWith(LogType.INFO, undefined, `Open Transaction View`);
            openViewStub.should.have.been.calledOnce;
        });

        it('should open the transaction web view for a contract without metadata', async () => {
            const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = ExtensionUtil.getBlockchainGatewayExplorerProvider();
            const allChildren: BlockchainTreeItem[] = await blockchainGatewayExplorerProvider.getChildren();
            const channels: Array<ChannelTreeItem> = await blockchainGatewayExplorerProvider.getChildren(allChildren[2]) as Array<ChannelTreeItem>;
            const contracts: Array<InstantiatedTreeItem> =  await blockchainGatewayExplorerProvider.getChildren(channels[0]) as Array<InstantiatedTreeItem>;
            fabricClientConnectionMock.getInstantiatedChaincode.resolves([{ name: 'mySmartContract', version: '0.0.1' }, { name: 'mySmartContract2', version: '0.0.2' }]);

            instantiatedSmartContract = contracts[0];
            fabricClientConnectionMock.getMetadata.rejects('Transaction function "org.hyperledger.fabric:GetMetadata" did not return any metadata');

            const appstate: IAppState = await vscode.commands.executeCommand(ExtensionCommands.OPEN_TRANSACTION_PAGE, instantiatedSmartContract);
            const smartContract: ISmartContract = {
                channel: 'myChannel',
                label: 'mySmartContract@0.0.1',
                name: 'mySmartContract',
                contractName: undefined,
                namespace: undefined,
                peerNames: ['peerOne', 'peerTwo'],
                version: '0.0.1',
                transactions: []
            };
            const want: IAppState = {
                associatedTxdata: {},
                gatewayName: 'myGateway',
                smartContracts: [smartContract],
                preselectedSmartContract: smartContract,
                preselectedTransaction: undefined,
            };
            appstate.should.deep.equal(want);

            logSpy.should.have.been.calledWith(LogType.INFO, undefined, `Open Transaction View`);
            openViewStub.should.have.been.calledOnce;
        });

        it('should open the transaction web view through the command', async () => {
            const appstate: IAppState = await vscode.commands.executeCommand(ExtensionCommands.OPEN_TRANSACTION_PAGE);
            const want: IAppState = {
                associatedTxdata: {},
                gatewayName: 'myGateway',
                smartContracts: [],
                preselectedSmartContract: undefined,
                preselectedTransaction: undefined,
            };
            appstate.should.deep.equal(want);
            logSpy.should.have.been.calledWith(LogType.INFO, undefined, `Open Transaction View`);
            showInstantiatedSmartContractQuickPickStub.should.have.been.calledOnce;
            openViewStub.should.have.been.calledOnce;
        });

        it('should open the transaction web view through the command', async () => {
            const chaincode: { chaincodeName: string, channelName: string, transactionDataPath: string } = {
                chaincodeName: 'mySmartContract',
                channelName: 'myChannel',
                transactionDataPath: '/directory',
            };
            showInstantiatedSmartContractQuickPickStub.resolves({
                label: 'mySmartContract',
                data: { name: 'mySmartContract', channel: 'myChannel', version: '0.0.1' }
            });
            getGatewayRegistryStub.resolves({
                ...gatewayRegistryEntry,
                transactionDataDirectories: [chaincode],
            });
            const appstate: IAppState = await vscode.commands.executeCommand(ExtensionCommands.OPEN_TRANSACTION_PAGE);
            const associatedTxdata: IAssociatedTxData = {
                [chaincode.chaincodeName]: {
                    channelName: chaincode.channelName,
                    transactionDataPath: chaincode.transactionDataPath,
                    transactions: transactionsInFiles,
                }
            };
            const smartContract: ISmartContract = {
                channel: 'myChannel',
                label: 'mySmartContract@0.0.1',
                name: 'mySmartContract',
                namespace: 'my-contract',
                contractName: 'my-contract',
                peerNames: ['peerOne', 'peerTwo'],
                version: '0.0.1',
                transactions: [
                    transactionOne,
                    transactionTwo,
                ],
            };
            const want: IAppState = {
                associatedTxdata,
                gatewayName: 'myGateway',
                smartContracts: [smartContract],
                preselectedSmartContract: undefined,
                preselectedTransaction: undefined,
            };
            appstate.should.deep.equal(want);
            logSpy.should.have.been.calledWith(LogType.INFO, undefined, `Open Transaction View`);
            showInstantiatedSmartContractQuickPickStub.should.have.been.calledOnce;
            openViewStub.should.have.been.calledOnce;
        });

        it(`should correctly display the ${FabricRuntimeUtil.LOCAL_FABRIC} gateway name`, async () => {
            const localGatewayRegistryEntry: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
            localGatewayRegistryEntry.name = `${FabricRuntimeUtil.LOCAL_FABRIC} - Org1`;
            localGatewayRegistryEntry.displayName = `Org1`;
            getGatewayRegistryStub.resolves(localGatewayRegistryEntry);

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
