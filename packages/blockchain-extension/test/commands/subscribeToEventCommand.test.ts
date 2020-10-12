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
import { FabricGatewayRegistryEntry, FabricGatewayRegistry, FileRegistry } from 'ibm-blockchain-platform-common';
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

describe('SubscribeToEventCommand', () => {
    let mySandBox: sinon.SinonSandbox;

    before(async () => {
        mySandBox = sinon.createSandbox();
        await TestUtil.setupTests();
    });

    describe('subscribeToEvent', () => {
        let fabricClientConnectionMock: sinon.SinonStubbedInstance<FabricGatewayConnection>;
        let executeCommandStub: sinon.SinonStub;
        let logSpy: sinon.SinonSpy;
        let getConnectionStub: sinon.SinonStub;
        let showInstantiatedSmartContractsQuickPickStub: sinon.SinonStub;
        let showInputBoxStub: sinon.SinonStub;

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
            showInputBoxStub = mySandBox.stub(UserInputUtil, 'showInputBox');

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

            mySandBox.stub(FileRegistry.prototype, 'exists').resolves(false);
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

            // TODO: Jake FIX
            fabricClientConnectionMock.addContractListener.resolves();
            showInputBoxStub.resolves('myEvent');
        });

        afterEach(async () => {
            mySandBox.restore();
        });

        it('should subscribe to an event through the command', async () => {
            getConnectionStub.onCall(3).returns(undefined);
            await vscode.commands.executeCommand(ExtensionCommands.SUBSCRIBE_TO_EVENT);

            fabricClientConnectionMock.addContractListener.should.have.been.calledWith('myChannel', 'myContract', 'myEvent');
            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'subscribeToEventCommand');
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully subscribed to myEvent events emitted from myContract@0.0.1`);
        });

        it('should subscribe to an event through the command when connected to a gateway', async () => {
            await vscode.commands.executeCommand(ExtensionCommands.SUBSCRIBE_TO_EVENT);

            fabricClientConnectionMock.addContractListener.should.have.been.calledWith('myChannel', 'myContract', 'myEvent');
            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'subscribeToEventCommand');
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully subscribed to myEvent events emitted from myContract@0.0.1`);
        });

        it('should handle cancellation when attempting to connect to a gateway', async () => {
            getConnectionStub.returns(undefined);
            await vscode.commands.executeCommand(ExtensionCommands.SUBSCRIBE_TO_EVENT);

            fabricClientConnectionMock.addContractListener.should.not.have.been.called;
            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'subscribeToEventCommand');
            should.not.exist(logSpy.getCall(1));
        });

        it('should handle cancellation when choosing a smart contract', async () => {
            showInstantiatedSmartContractsQuickPickStub.returns(undefined);
            await vscode.commands.executeCommand(ExtensionCommands.SUBSCRIBE_TO_EVENT);

            fabricClientConnectionMock.addContractListener.should.not.have.been.called;
            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'subscribeToEventCommand');
            should.not.exist(logSpy.getCall(1));
        });

        it('should handle cancellation when entering an event name', async () => {
            showInputBoxStub.resolves(undefined);
            await vscode.commands.executeCommand(ExtensionCommands.SUBSCRIBE_TO_EVENT);

            fabricClientConnectionMock.addContractListener.should.not.have.been.called;
            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'subscribeToEventCommand');
            should.not.exist(logSpy.getCall(1));
        });

        it('should subscribe to an event through the tree', async () => {
            await vscode.commands.executeCommand(ExtensionCommands.SUBSCRIBE_TO_EVENT, instantiatedSmartContract);

            fabricClientConnectionMock.addContractListener.should.have.been.calledWith('myChannel', 'myContract', 'myEvent');
            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'subscribeToEventCommand');
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully subscribed to myEvent events emitted from myContract@0.0.1`);
        });

        it('should subscribe to an event for a ContractTreeItem', async () => {
            fabricClientConnectionMock.getMetadata.resolves(moreFakeMetadata);

            allChildren = await blockchainGatewayExplorerProvider.getChildren();
            const channelChildren: Array<ChannelTreeItem> = await blockchainGatewayExplorerProvider.getChildren(allChildren[2]) as Array<ChannelTreeItem>;
            channelChildren[0].tooltip.should.equal('Associated peers: peerOne');

            const instantiatedUnknownChainCodes: Array<InstantiatedUnknownTreeItem> = await blockchainGatewayExplorerProvider.getChildren(channelChildren[0]) as Array<InstantiatedUnknownTreeItem>;
            await blockchainGatewayExplorerProvider.getChildren(instantiatedUnknownChainCodes[0]);

            const instantiatedTreeItems: Array<InstantiatedContractTreeItem> = await blockchainGatewayExplorerProvider.getChildren(channelChildren[0]) as Array<InstantiatedContractTreeItem>;
            const contractTreeItems: Array<ContractTreeItem> = await blockchainGatewayExplorerProvider.getChildren(instantiatedTreeItems[0]) as Array<ContractTreeItem>;

            await vscode.commands.executeCommand(ExtensionCommands.SUBSCRIBE_TO_EVENT, contractTreeItems[0]);

            fabricClientConnectionMock.addContractListener.should.have.been.calledWith('myChannel', 'myContract', 'myEvent');
            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'subscribeToEventCommand');
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully subscribed to myEvent events emitted from myContract@0.0.1`);
        });

        it('should handle an error when trying to subscribe to events', async () => {
            const error: Error = new Error('computer says no');
            fabricClientConnectionMock.addContractListener.rejects(error);

            await vscode.commands.executeCommand(ExtensionCommands.SUBSCRIBE_TO_EVENT);

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'subscribeToEventCommand');
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.ERROR, `Unable to subscribe to myEvent events emitted from myContract@0.0.1: ${error.message}`, `Unable to subscribe to myEvent events emitted from myContract@0.0.1: ${error.toString()}`);
        });
    });
});
