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
import * as vscode from 'vscode';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { TestUtil } from '../TestUtil';
import { FabricGatewayRegistryEntry, FabricGatewayRegistry } from 'ibm-blockchain-platform-common';
import { BlockchainGatewayExplorerProvider } from '../../extension/explorer/gatewayExplorer';
import { BlockchainTreeItem } from '../../extension/explorer/model/BlockchainTreeItem';
import { ExtensionCommands } from '../../ExtensionCommands';
import { UserInputUtil } from '../../extension/commands/UserInputUtil';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from 'ibm-blockchain-platform-common';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';
import { InstantiatedContractTreeItem } from '../../extension/explorer/model/InstantiatedContractTreeItem';
import { InstantiatedAssociatedContractTreeItem } from '../../extension/explorer/model/InstantiatedAssociatedContractTreeItem';
import { FabricGatewayConnection } from 'ibm-blockchain-platform-gateway-v1';
import { FabricGatewayConnectionManager } from '../../extension/fabric/FabricGatewayConnectionManager';
import { ChannelTreeItem } from '../../extension/explorer/model/ChannelTreeItem';
import { InstantiatedTreeItem } from '../../extension/explorer/model/InstantiatedTreeItem';
import { InstantiatedAssociatedTreeItem } from '../../extension/explorer/model/InstantiatedAssociatedTreeItem';
import { ContractTreeItem } from '../../extension/explorer/model/ContractTreeItem';

// tslint:disable no-unused-expression
const should: Chai.Should = chai.should();
chai.use(sinonChai);

describe('DissociateTestDataDirectoryCommand', () => {
    let mySandBox: sinon.SinonSandbox;

    before(async () => {
        mySandBox = sinon.createSandbox();
        await TestUtil.setupTests(mySandBox);
    });

    describe('dissoicateTestDataDirectory', () => {
        let fabricClientConnectionMock: sinon.SinonStubbedInstance<FabricGatewayConnection>;
        let executeCommandStub: sinon.SinonStub;
        let logSpy: sinon.SinonSpy;
        let getConnectionStub: sinon.SinonStub;
        let showInstantiatedSmartContractsQuickPickStub: sinon.SinonStub;

        let allChildren: Array<BlockchainTreeItem>;
        let blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider;
        let fabricConnectionManager: FabricGatewayConnectionManager;
        let instantiatedSmartContract: InstantiatedContractTreeItem;
        let gatewayRegistryEntry: FabricGatewayRegistryEntry;
        let getGatewayRegistryStub: sinon.SinonStub;
        let myFakeMetadata: any;
        let moreFakeMetadata: any;
        let channels: Array<ChannelTreeItem>;
        let contracts: Array<InstantiatedTreeItem>;

        beforeEach(async () => {
            logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');

            executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand');
            executeCommandStub.withArgs(ExtensionCommands.CONNECT_TO_GATEWAY).resolves();
            executeCommandStub.callThrough();

            fabricClientConnectionMock = mySandBox.createStubInstance(FabricGatewayConnection);
            fabricClientConnectionMock.connect.resolves();
            myFakeMetadata = {
                contracts: {
                    myContract: {
                        name: 'myContract',
                        transactions: [
                            {
                                name: 'aLovelyTransaction',
                                parameters: [
                                    {
                                        name: 'value',
                                        schema: {
                                            type: 'string'
                                        }
                                    }
                                ]
                            }
                        ]
                    }
                }
            };

            moreFakeMetadata = {
                contracts: {
                    myContract: {
                        name: 'myContract',
                        transactions: [
                            {
                                name: 'aLovelyTransaction',
                                parameters: [
                                    {
                                        name: 'value',
                                        schema: {
                                            type: 'string'
                                        }
                                    },
                                ]
                            },
                        ]
                    },
                    myOtherContract: {
                        name: 'myOtherContract',
                        transactions: [
                            {
                                name: 'aHappyTransaction',
                                parameters: [
                                    {
                                        name: 'value',
                                        schema: {
                                            type: 'string'
                                        }
                                    }
                                ]
                            },
                        ]
                    }
                }
            };

            fabricClientConnectionMock.getMetadata.resolves(myFakeMetadata);
            const map: Map<string, Array<string>> = new Map<string, Array<string>>();
            map.set('myChannel', ['peerOne']);
            fabricClientConnectionMock.createChannelMap.resolves({channelMap: map, v2channels: []});
            fabricConnectionManager = FabricGatewayConnectionManager.instance();
            getConnectionStub = mySandBox.stub(FabricGatewayConnectionManager.instance(), 'getConnection').returns(fabricClientConnectionMock);

            gatewayRegistryEntry = new FabricGatewayRegistryEntry({
                name: 'myGateway',
                associatedWallet: '',
                transactionDataDirectories: [{
                    chaincodeName: 'myContract',
                    channelName: 'myChannel',
                    transactionDataPath: 'some/file/path'
                }]
            });
            getGatewayRegistryStub = mySandBox.stub(fabricConnectionManager, 'getGatewayRegistryEntry');
            getGatewayRegistryStub.resolves(gatewayRegistryEntry);

            await FabricGatewayRegistry.instance().clear();
            await FabricGatewayRegistry.instance().add(gatewayRegistryEntry);

            fabricClientConnectionMock.getInstantiatedChaincode.resolves([
                {
                    name: 'myContract',
                    version: '0.0.1',
                }
            ]);

            blockchainGatewayExplorerProvider = ExtensionUtil.getBlockchainGatewayExplorerProvider();
            allChildren = await blockchainGatewayExplorerProvider.getChildren();
            channels = await blockchainGatewayExplorerProvider.getChildren(allChildren[2]) as Array<ChannelTreeItem>;
            contracts =  await blockchainGatewayExplorerProvider.getChildren(channels[0]) as Array<InstantiatedTreeItem>;
            instantiatedSmartContract = contracts[0];

            showInstantiatedSmartContractsQuickPickStub = mySandBox.stub(UserInputUtil, 'showClientInstantiatedSmartContractsQuickPick').withArgs(sinon.match.any).resolves({
                label: 'myContract@0.0.1',
                data: { name: 'myContract', channel: 'myChannel', version: '0.0.1' }
            });
        });

        afterEach(async () => {
            mySandBox.restore();
        });

        it('should dissociate a smart contract from a transaction data directory through the command', async () => {
            getConnectionStub.onCall(3).returns(undefined);
            await vscode.commands.executeCommand(ExtensionCommands.DISSOCIATE_TRANSACTION_DATA_DIRECTORY);
            const result: FabricGatewayRegistryEntry = await FabricGatewayRegistry.instance().get('myGateway');
            result.transactionDataDirectories.should.deep.equal([]);
            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'dissociateTestDataDirectory');
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully dissociated "${instantiatedSmartContract.label}" from its transaction data directory`);
        });

        it('should dissociate a smart contract from a transaction data directory through the command when connected to a gateway', async () => {
            await vscode.commands.executeCommand(ExtensionCommands.DISSOCIATE_TRANSACTION_DATA_DIRECTORY);
            const result: FabricGatewayRegistryEntry = await FabricGatewayRegistry.instance().get('myGateway');
            result.transactionDataDirectories.should.deep.equal([]);
            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'dissociateTestDataDirectory');
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully dissociated "${instantiatedSmartContract.label}" from its transaction data directory`);
        });

        it('should handle cancellation when attempting to connect to a gateway', async () => {
            getConnectionStub.returns(undefined);
            await vscode.commands.executeCommand(ExtensionCommands.DISSOCIATE_TRANSACTION_DATA_DIRECTORY);
            const result: FabricGatewayRegistryEntry = await FabricGatewayRegistry.instance().get('myGateway');
            result.transactionDataDirectories.should.deep.equal([{
                chaincodeName: 'myContract',
                channelName: 'myChannel',
                transactionDataPath: 'some/file/path'
            }]);
            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'dissociateTestDataDirectory');
            should.not.exist(logSpy.getCall(1));
        });

        it('should handle cancellation when choosing a smart contract', async () => {
            showInstantiatedSmartContractsQuickPickStub.returns(undefined);
            await vscode.commands.executeCommand(ExtensionCommands.DISSOCIATE_TRANSACTION_DATA_DIRECTORY);
            const result: FabricGatewayRegistryEntry = await FabricGatewayRegistry.instance().get('myGateway');
            result.transactionDataDirectories.should.deep.equal([{
                chaincodeName: 'myContract',
                channelName: 'myChannel',
                transactionDataPath: 'some/file/path'
            }]);
            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'dissociateTestDataDirectory');
            should.not.exist(logSpy.getCall(1));
        });

        it('should dissociate a smart contract from a directory of transaction data through the tree', async () => {
            await vscode.commands.executeCommand(ExtensionCommands.DISSOCIATE_TRANSACTION_DATA_DIRECTORY, instantiatedSmartContract);
            const result: FabricGatewayRegistryEntry = await FabricGatewayRegistry.instance().get('myGateway');
            result.transactionDataDirectories.should.deep.equal([]);
            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'dissociateTestDataDirectory');
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully dissociated "${instantiatedSmartContract.label}" from its transaction data directory`);
        });

        it('should dissociate a transaction data directory for a ContractTreeItem', async () => {
            fabricClientConnectionMock.getMetadata.resolves(moreFakeMetadata);

            allChildren = await blockchainGatewayExplorerProvider.getChildren();
            const channelChildren: Array<ChannelTreeItem> = await blockchainGatewayExplorerProvider.getChildren(allChildren[2]) as Array<ChannelTreeItem>;
            channelChildren[0].tooltip.should.equal('Associated peers: peerOne');

            const instantiatedAssociatedChainCodes: Array<InstantiatedAssociatedTreeItem> = await blockchainGatewayExplorerProvider.getChildren(channelChildren[0]) as Array<InstantiatedAssociatedTreeItem>;
            await blockchainGatewayExplorerProvider.getChildren(instantiatedAssociatedChainCodes[0]);

            const instantiatedTreeItems: Array<InstantiatedAssociatedContractTreeItem> = await blockchainGatewayExplorerProvider.getChildren(channelChildren[0]) as Array<InstantiatedAssociatedContractTreeItem>;
            const contractTreeItems: Array<ContractTreeItem> = await blockchainGatewayExplorerProvider.getChildren(instantiatedTreeItems[0]) as Array<ContractTreeItem>;

            await vscode.commands.executeCommand(ExtensionCommands.DISSOCIATE_TRANSACTION_DATA_DIRECTORY, contractTreeItems[0]);

            const result: FabricGatewayRegistryEntry = await FabricGatewayRegistry.instance().get('myGateway');
            result.transactionDataDirectories.should.deep.equal([]);

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'dissociateTestDataDirectory');
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully dissociated "${instantiatedSmartContract.label}" from its transaction data directory`);
        });

        it('should error if trying to dissociate a smart contract with no associations', async () => {
            await vscode.commands.executeCommand(ExtensionCommands.DISSOCIATE_TRANSACTION_DATA_DIRECTORY);
            const result: FabricGatewayRegistryEntry = await FabricGatewayRegistry.instance().get('myGateway');
            result.transactionDataDirectories.should.deep.equal([]);
            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'dissociateTestDataDirectory');
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully dissociated "${instantiatedSmartContract.label}" from its transaction data directory`);

            await vscode.commands.executeCommand(ExtensionCommands.DISSOCIATE_TRANSACTION_DATA_DIRECTORY);

            const error: Error = new Error(`no transaction data directories associated with ${instantiatedSmartContract.label}`);

            logSpy.getCall(2).should.have.been.calledWithExactly(LogType.INFO, undefined, 'dissociateTestDataDirectory');
            logSpy.getCall(3).should.have.been.calledWithExactly(LogType.ERROR, `Unable to dissociate transaction data directory: ${error.message}`, `Unable to dissociate transaction data directory: ${error.toString()}`);
        });

        it('should error if trying to dissociate a smart contract when no associations exists', async () => {
            gatewayRegistryEntry = new FabricGatewayRegistryEntry({
                name: 'myGateway',
                associatedWallet: '',
            });
            getGatewayRegistryStub.returns(gatewayRegistryEntry);

            await vscode.commands.executeCommand(ExtensionCommands.DISSOCIATE_TRANSACTION_DATA_DIRECTORY);

            const error: Error = new Error(`no transaction data directories associated with ${instantiatedSmartContract.label}`);

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'dissociateTestDataDirectory');
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.ERROR, `Unable to dissociate transaction data directory: ${error.message}`, `Unable to dissociate transaction data directory: ${error.toString()}`);
        });
    });
});
