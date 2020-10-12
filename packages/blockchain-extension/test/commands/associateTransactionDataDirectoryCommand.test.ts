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
import * as path from 'path';
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
import { FabricGatewayConnection } from 'ibm-blockchain-platform-gateway-v1';
import { FabricGatewayConnectionManager } from '../../extension/fabric/FabricGatewayConnectionManager';
import { ChannelTreeItem } from '../../extension/explorer/model/ChannelTreeItem';
import { InstantiatedTreeItem } from '../../extension/explorer/model/InstantiatedTreeItem';
import { InstantiatedUnknownTreeItem } from '../../extension/explorer/model/InstantiatedUnknownTreeItem';
import { ContractTreeItem } from '../../extension/explorer/model/ContractTreeItem';

// tslint:disable no-unused-expression
const should: Chai.Should = chai.should();
chai.use(sinonChai);

describe('AssociateTestDataDirectoryCommand', () => {
    let mySandBox: sinon.SinonSandbox;

    before(async () => {
        mySandBox = sinon.createSandbox();
        await TestUtil.setupTests(mySandBox);
    });

    describe('assoicateTestDataDirectory', () => {
        const rootPath: string = path.dirname(__dirname);
        const transactionDataPath: string = path.join(rootPath, '../../test/data/transactionData/goodTransactionData');
        const otherPath: string = path.join(rootPath, '../../test/data/transactionData/badTransactionData');

        let fabricClientConnectionMock: sinon.SinonStubbedInstance<FabricGatewayConnection>;
        let executeCommandStub: sinon.SinonStub;
        let logSpy: sinon.SinonSpy;
        let getConnectionStub: sinon.SinonStub;
        let showInstantiatedSmartContractsQuickPickStub: sinon.SinonStub;
        let browseStub: sinon.SinonStub;

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
            browseStub = mySandBox.stub(UserInputUtil, 'browseWithOptions');

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
                associatedWallet: ''
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
            contracts = await blockchainGatewayExplorerProvider.getChildren(channels[0]) as Array<InstantiatedTreeItem>;
            instantiatedSmartContract = contracts[0];

            showInstantiatedSmartContractsQuickPickStub = mySandBox.stub(UserInputUtil, 'showClientInstantiatedSmartContractsQuickPick').withArgs(sinon.match.any).resolves({
                label: 'myContract@0.0.1',
                data: { name: 'myContract', channel: 'myChannel', version: '0.0.1' }
            });
        });

        afterEach(async () => {
            mySandBox.restore();
        });

        it('should associate a smart contract with a directory of transaction data through the command', async () => {
            getConnectionStub.onCall(3).returns(undefined);
            browseStub.onFirstCall().resolves(transactionDataPath);
            await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_TRANSACTION_DATA_DIRECTORY);

            const result: FabricGatewayRegistryEntry = await FabricGatewayRegistry.instance().get('myGateway');
            result.transactionDataDirectories.should.deep.equal([{
                chaincodeName: 'myContract',
                channelName: 'myChannel',
                transactionDataPath
            }]);

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associateTestDataDirectory');
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully associated the directory "${transactionDataPath}" with "${instantiatedSmartContract.label}"`);
        });

        it('should associate a smart contract with a directory of transaction data through the command when connected to a gateway', async () => {
            browseStub.onFirstCall().resolves(transactionDataPath);
            await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_TRANSACTION_DATA_DIRECTORY);

            const result: FabricGatewayRegistryEntry = await FabricGatewayRegistry.instance().get('myGateway');
            result.transactionDataDirectories.should.deep.equal([{
                chaincodeName: 'myContract',
                channelName: 'myChannel',
                transactionDataPath
            }]);

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associateTestDataDirectory');
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully associated the directory "${transactionDataPath}" with "${instantiatedSmartContract.label}"`);
        });

        it('should handle cancellation when attempting to connect to a gateway', async () => {
            getConnectionStub.returns(undefined);
            await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_TRANSACTION_DATA_DIRECTORY);

            const result: FabricGatewayRegistryEntry = await FabricGatewayRegistry.instance().get('myGateway');
            should.not.exist(result.transactionDataDirectories);

            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'associateTestDataDirectory');
            should.not.exist(logSpy.getCall(1));
        });

        it('should handle cancellation when choosing a smart contract', async () => {
            showInstantiatedSmartContractsQuickPickStub.returns(undefined);
            await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_TRANSACTION_DATA_DIRECTORY);

            const result: FabricGatewayRegistryEntry = await FabricGatewayRegistry.instance().get('myGateway');
            should.not.exist(result.transactionDataDirectories);

            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'associateTestDataDirectory');
            should.not.exist(logSpy.getCall(1));
        });

        it('should handle cancellation when asking for a directory to associate', async () => {
            browseStub.returns(undefined);
            await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_TRANSACTION_DATA_DIRECTORY);

            const result: FabricGatewayRegistryEntry = await FabricGatewayRegistry.instance().get('myGateway');
            should.not.exist(result.transactionDataDirectories);

            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'associateTestDataDirectory');
            should.not.exist(logSpy.getCall(1));
        });

        it('should associate a gateway with a directory of transaction data through the tree', async () => {
            browseStub.onFirstCall().resolves(transactionDataPath);
            await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_TRANSACTION_DATA_DIRECTORY, instantiatedSmartContract);

            const result: FabricGatewayRegistryEntry = await FabricGatewayRegistry.instance().get('myGateway');
            result.transactionDataDirectories.should.deep.equal([{
                chaincodeName: 'myContract',
                channelName: 'myChannel',
                transactionDataPath
            }]);

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associateTestDataDirectory');
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully associated the directory "${transactionDataPath}" with "${instantiatedSmartContract.label}"`);
        });

        it('should associate a transaction data directory for a ContractTreeItem', async () => {
            browseStub.onFirstCall().resolves(transactionDataPath);

            fabricClientConnectionMock.getMetadata.resolves(moreFakeMetadata);

            allChildren = await blockchainGatewayExplorerProvider.getChildren();
            const channelChildren: Array<ChannelTreeItem> = await blockchainGatewayExplorerProvider.getChildren(allChildren[2]) as Array<ChannelTreeItem>;
            channelChildren[0].tooltip.should.equal('Associated peers: peerOne');

            const instantiatedUnknownChainCodes: Array<InstantiatedUnknownTreeItem> = await blockchainGatewayExplorerProvider.getChildren(channelChildren[0]) as Array<InstantiatedUnknownTreeItem>;
            await blockchainGatewayExplorerProvider.getChildren(instantiatedUnknownChainCodes[0]);

            const instantiatedTreeItems: Array<InstantiatedContractTreeItem> = await blockchainGatewayExplorerProvider.getChildren(channelChildren[0]) as Array<InstantiatedContractTreeItem>;
            const contractTreeItems: Array<ContractTreeItem> = await blockchainGatewayExplorerProvider.getChildren(instantiatedTreeItems[0]) as Array<ContractTreeItem>;

            await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_TRANSACTION_DATA_DIRECTORY, contractTreeItems[0]);

            const result: FabricGatewayRegistryEntry = await FabricGatewayRegistry.instance().get('myGateway');
            result.transactionDataDirectories.should.deep.equal([{
                chaincodeName: 'myContract',
                channelName: 'myChannel',
                transactionDataPath
            }]);

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associateTestDataDirectory');
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully associated the directory "${transactionDataPath}" with "${instantiatedSmartContract.label}"`);
        });

        it('should overwrite an existing associated directory with a new one', async () => {
            browseStub.onFirstCall().resolves(transactionDataPath);
            await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_TRANSACTION_DATA_DIRECTORY);

            let result: FabricGatewayRegistryEntry = await FabricGatewayRegistry.instance().get('myGateway');
            result.transactionDataDirectories.should.deep.equal([{
                chaincodeName: 'myContract',
                channelName: 'myChannel',
                transactionDataPath
            }]);

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associateTestDataDirectory');
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully associated the directory "${transactionDataPath}" with "${instantiatedSmartContract.label}"`);

            browseStub.onSecondCall().resolves(otherPath);
            await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_TRANSACTION_DATA_DIRECTORY);

            result = await FabricGatewayRegistry.instance().get('myGateway');
            result.transactionDataDirectories.should.deep.equal([{
                chaincodeName: 'myContract',
                channelName: 'myChannel',
                transactionDataPath: otherPath
            }]);

            logSpy.getCall(2).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associateTestDataDirectory');
            logSpy.getCall(3).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully associated the directory "${otherPath}" with "${instantiatedSmartContract.label}"`);
        });

        it('should suggest transaction data directories in open projects', async () => {
            const workspacePath: string = path.join(rootPath, '../../test/data/transactionData/workspaceWithTransactionData');
            const workspaceTxDataPath: string = path.join(workspacePath, 'transaction_data');
            mySandBox.stub(UserInputUtil, 'getWorkspaceFolders').returns([{
                uri: {
                    name: 'myWorkspaceFolder',
                    path: workspacePath
                }
            }]);

            getConnectionStub.onCall(3).returns(undefined);
            browseStub.onFirstCall().resolves({
                label: 'Transaction data directory',
                description: workspaceTxDataPath
            });
            await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_TRANSACTION_DATA_DIRECTORY);

            const result: FabricGatewayRegistryEntry = await FabricGatewayRegistry.instance().get('myGateway');
            result.transactionDataDirectories.should.deep.equal([{
                chaincodeName: 'myContract',
                channelName: 'myChannel',
                transactionDataPath: workspaceTxDataPath
            }]);

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associateTestDataDirectory');
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully associated the directory "${workspaceTxDataPath}" with "${instantiatedSmartContract.label}"`);
        });

        it('should not suggest transaction data folders if there are none present in the open workspace', async () => {
            mySandBox.stub(UserInputUtil, 'getWorkspaceFolders').returns([{
                uri: {
                    name: 'myWorkspaceFolder',
                    path: 'my/workspace/folder'
                }
            }]);

            getConnectionStub.onCall(3).returns(undefined);
            browseStub.onFirstCall().resolves({
                label: 'Transaction data directory',
                description: transactionDataPath
            });
            await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_TRANSACTION_DATA_DIRECTORY);

            const result: FabricGatewayRegistryEntry = await FabricGatewayRegistry.instance().get('myGateway');
            result.transactionDataDirectories.should.deep.equal([{
                chaincodeName: 'myContract',
                channelName: 'myChannel',
                transactionDataPath
            }]);

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associateTestDataDirectory');
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully associated the directory "${transactionDataPath}" with "${instantiatedSmartContract.label}"`);
        });

        it('should handle an error', async () => {
            const error: Error = new Error('computer says no');
            mySandBox.stub(FabricGatewayRegistry.instance(), 'update').rejects(error);

            browseStub.onFirstCall().resolves(transactionDataPath);

            await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_TRANSACTION_DATA_DIRECTORY);

            const result: FabricGatewayRegistryEntry = await FabricGatewayRegistry.instance().get('myGateway');
            should.not.exist(result.transactionDataDirectories);

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associateTestDataDirectory');
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.ERROR, `Unable to associate transaction data directory: ${error.message}`, `Unable to associate transaction data directory: ${error.toString()}`);
            should.not.exist(logSpy.getCall(2));
        });
    });
});
