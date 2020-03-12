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

import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import {  FabricGatewayConnection } from 'ibm-blockchain-platform-gateway-v1';
import { MetadataUtil } from '../../extension/util/MetadataUtil';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { FabricGatewayConnectionManager } from '../../extension/fabric/FabricGatewayConnectionManager';
import { FabricRuntimeUtil, LogType, FabricGatewayRegistryEntry } from 'ibm-blockchain-platform-common';

import * as vscode from 'vscode';
import { LocalEnvironmentManager } from '../../extension/fabric/environments/LocalEnvironmentManager';
import { LocalEnvironment } from '../../extension/fabric/environments/LocalEnvironment';
import { FabricDebugConfigurationProvider } from '../../extension/debug/FabricDebugConfigurationProvider';

const should: Chai.Should = chai.should();
chai.use(sinonChai);

// tslint:disable no-unused-expression
describe('Metadata ConnectionProfileUtil tests', () => {

    let mySandBox: sinon.SinonSandbox;
    let fabricClientConnectionMock: sinon.SinonStubbedInstance<FabricGatewayConnection>;
    let fakeMetadata: any;
    let transactionOne: any;
    let transactionTwo: any;
    let transactionThree: any;
    let pancakeTransactionOne: any;
    let pancakeTransactionTwo: any;
    const transactionNames: Map<string, string[]> = new Map();
    let logSpy: sinon.SinonSpy;
    const testMap: Map<string, any[]> = new Map();

    let getGatewayRegistryEntryStub: sinon.SinonStub;
    let localGateway: FabricGatewayRegistryEntry;
    let otherGateway: FabricGatewayRegistryEntry;
    let debugSessionStub: sinon.SinonStub;
    let mockRuntime: sinon.SinonStubbedInstance<LocalEnvironment>;
    let getRuntimeStub: sinon.SinonStub;
    beforeEach(() => {
        mySandBox = sinon.createSandbox();
        fabricClientConnectionMock = mySandBox.createStubInstance(FabricGatewayConnection);
        fakeMetadata = {
            contracts: {
                'cake': {
                    name: 'cake',
                    transactions: [
                        {
                            name: 'instantiate',
                            parameters: [
                                {
                                    name: 'eggs',
                                    schema: {
                                        type: 'object'
                                    }
                                },
                                {
                                    name: 'sugar',
                                },
                                {
                                    name: 'flour',
                                    schema: {
                                        type: 'boolean'
                                    }
                                },
                                {
                                    name: 'butter',
                                }
                            ]
                        },
                        {
                            name: 'wagonwheeling',
                            parameters: []
                        },
                        {
                            name: 'transaction2'
                        }
                    ]
                },
                'pancake': {
                    name: 'pancake',
                    transactions: [
                        {
                            name: 'upgrade',
                            parameters: [
                                {
                                    name: 'flour',
                                    schema: {
                                        type: 'string'
                                    }
                                },
                                {
                                    name: 'eggs',
                                },
                            ]
                        },
                        {
                            name: 'transaction2'
                        }
                    ]
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
        };

        transactionOne = fakeMetadata.contracts['cake'].transactions[0];
        transactionTwo = fakeMetadata.contracts['cake'].transactions[1];
        transactionThree = fakeMetadata.contracts['cake'].transactions[2];
        pancakeTransactionOne = fakeMetadata.contracts['pancake'].transactions[0];
        pancakeTransactionTwo = fakeMetadata.contracts['pancake'].transactions[1];
        fabricClientConnectionMock.getMetadata.resolves(fakeMetadata);
        transactionNames.set('cake', [transactionOne.name, transactionTwo.name, transactionThree.name]);
        transactionNames.set('pancake', [pancakeTransactionOne.name, pancakeTransactionTwo.name]);
        testMap.set('cake', [transactionOne, transactionTwo, transactionThree]);
        testMap.set('pancake', [pancakeTransactionOne, pancakeTransactionTwo]);
        logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');

        localGateway = new FabricGatewayRegistryEntry();
        localGateway.name = `${FabricRuntimeUtil.LOCAL_FABRIC} - Org1`;
        localGateway.fromEnvironment = FabricRuntimeUtil.LOCAL_FABRIC;

        otherGateway = new FabricGatewayRegistryEntry();
        otherGateway.name = 'myFabric';

        getGatewayRegistryEntryStub = mySandBox.stub(FabricGatewayConnectionManager.instance(), 'getGatewayRegistryEntry').resolves(otherGateway);

        debugSessionStub = mySandBox.stub(vscode.debug, 'activeDebugSession');

        mockRuntime = mySandBox.createStubInstance(LocalEnvironment);
        mockRuntime.isRunning.resolves(true);
        mockRuntime.killChaincode.resolves();

        getRuntimeStub = mySandBox.stub(LocalEnvironmentManager.instance(), 'getRuntime');
        getRuntimeStub.returns(mockRuntime);
    });

    afterEach(() => {
        mySandBox.restore();
    });

    it('should return the Transaction names', async () => {
        const names: Map<string, string[]> = await MetadataUtil.getTransactionNames(fabricClientConnectionMock, 'chaincode', 'channel');
        names.should.deep.equal(transactionNames);
        logSpy.should.not.have.been.called;
    });

    it('should return null if no transaction names', async () => {
        fabricClientConnectionMock.getMetadata.rejects(new Error('no metadata here jack'));
        const names: Map<string, string[]> = await MetadataUtil.getTransactionNames(fabricClientConnectionMock, 'chaincode', 'channel');
        should.equal(names, null);
    });

    it('should return the Transaction objects', async () => {
        const transactionsMap: Map<string, any[]> = await MetadataUtil.getTransactions(fabricClientConnectionMock, 'chaincode', 'channel', true);
        transactionsMap.should.deep.equal(testMap);
        logSpy.should.not.have.been.called;
    });

    it('should return null if no transaction objects', async () => {
        fabricClientConnectionMock.getMetadata.rejects(new Error('no metadata here jack'));
        const transactionsMap: Map<string, any[]> = await MetadataUtil.getTransactions(fabricClientConnectionMock, 'chaincode', 'channel', true);
        should.equal(transactionsMap, null);
    });

    it('should error if no contracts', async () => {
        fabricClientConnectionMock.getMetadata.resolves({
            contracts: {}
        });
        const transactionsMap: Map<string, any[]> = await MetadataUtil.getTransactions(fabricClientConnectionMock, 'chaincode', 'channel', true);
        should.equal(transactionsMap, undefined);

        logSpy.should.have.been.calledOnceWithExactly(LogType.ERROR, `No metadata returned. Please ensure this smart contract is developed using the programming model delivered in Hyperledger Fabric v1.4+ for Java, JavaScript and TypeScript`);
    });

    it('should handle error getting metadata', async () => {
        fabricClientConnectionMock.getMetadata.rejects({ message: `some error` });
        const transactionsMap: Map<string, any[]> = await MetadataUtil.getTransactions(fabricClientConnectionMock, 'chaincode', 'channel');
        should.equal(transactionsMap, null);
        logSpy.should.have.been.calledOnceWithExactly(LogType.WARNING, null, sinon.match(/Could not get metadata for smart contract chaincode.*some error/));
    });

    it('should kill the chaincode if running in debug', async () => {
        getGatewayRegistryEntryStub.resolves(localGateway);

        const activeDebugSessionStub: any = {
            configuration: {
                env: {
                    CORE_CHAINCODE_ID_NAME: 'chaincode:0.0.1'
                },
                debugEvent: FabricDebugConfigurationProvider.debugEvent
            }
        };

        FabricDebugConfigurationProvider.environmentName = FabricRuntimeUtil.LOCAL_FABRIC;

        debugSessionStub.value(activeDebugSessionStub);
        const transactionsMap: Map<string, any[]> = await MetadataUtil.getTransactions(fabricClientConnectionMock, 'chaincode', 'channel', true);
        transactionsMap.should.deep.equal(testMap);
        getRuntimeStub.should.have.been.calledOnceWithExactly(FabricRuntimeUtil.LOCAL_FABRIC);
        mockRuntime.isRunning.should.have.been.calledOnceWithExactly(['chaincode', '0.0.1']);
        logSpy.should.not.have.been.called;
        mockRuntime.killChaincode.should.have.been.called;
    });

    it('should not kill if not running', async () => {
        getGatewayRegistryEntryStub.resolves(localGateway);

        mockRuntime.isRunning.resolves(false);

        const activeDebugSessionStub: any = {
            configuration: {
                env: {
                    CORE_CHAINCODE_ID_NAME: 'chaincode:0.0.1'
                },
                debugEvent: FabricDebugConfigurationProvider.debugEvent
            }
        };

        FabricDebugConfigurationProvider.environmentName = FabricRuntimeUtil.LOCAL_FABRIC;

        debugSessionStub.value(activeDebugSessionStub);
        const transactionsMap: Map<string, any[]> = await MetadataUtil.getTransactions(fabricClientConnectionMock, 'chaincode', 'channel', true);
        transactionsMap.should.deep.equal(testMap);
        getRuntimeStub.should.have.been.calledOnceWithExactly(FabricRuntimeUtil.LOCAL_FABRIC);
        logSpy.should.not.have.been.called;
        mockRuntime.isRunning.should.have.been.calledOnceWithExactly(['chaincode', '0.0.1']);
        mockRuntime.killChaincode.should.not.have.been.called;
    });

    it('should not kill if getting meta data for another contract if running in debug', async () => {
        getGatewayRegistryEntryStub.resolves(localGateway);

        const activeDebugSessionStub: any = {
            configuration: {
                env: {
                    CORE_CHAINCODE_ID_NAME: 'different:0.0.1'
                },
                debugEvent: FabricDebugConfigurationProvider.debugEvent
            }
        };

        debugSessionStub.value(activeDebugSessionStub);
        const transactionsMap: Map<string, any[]> = await MetadataUtil.getTransactions(fabricClientConnectionMock, 'chaincode', 'channel', true);
        transactionsMap.should.deep.equal(testMap);
        getRuntimeStub.should.not.have.been.called;
        logSpy.should.not.have.been.called;
        mockRuntime.isRunning.should.not.have.been.called;
    });

    it('should not kill if debugging different thing', async () => {
        getGatewayRegistryEntryStub.resolves(localGateway);

        const activeDebugSessionStub: any = {
            configuration: {
                env: {}
            }
        };

        debugSessionStub.value(activeDebugSessionStub);
        const transactionsMap: Map<string, any[]> = await MetadataUtil.getTransactions(fabricClientConnectionMock, 'chaincode', 'channel', true);
        transactionsMap.should.deep.equal(testMap);
        getRuntimeStub.should.not.have.been.called;
        logSpy.should.not.have.been.called;
        mockRuntime.isRunning.should.not.have.been.called;
    });

    it('should not kill if debugging different thing no env', async () => {
        getGatewayRegistryEntryStub.resolves(localGateway);

        const activeDebugSessionStub: any = {
            configuration: {}
        };

        debugSessionStub.value(activeDebugSessionStub);
        const transactionsMap: Map<string, any[]> = await MetadataUtil.getTransactions(fabricClientConnectionMock, 'chaincode', 'channel', true);
        transactionsMap.should.deep.equal(testMap);
        getRuntimeStub.should.not.have.been.called;
        logSpy.should.not.have.been.called;
        mockRuntime.isRunning.should.not.have.been.called;
    });

});
