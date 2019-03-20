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
import { FabricClientConnection } from '../../src/fabric/FabricClientConnection';
import { MetadataUtil } from '../../src/util/MetadataUtil';
import { VSCodeBlockchainOutputAdapter } from '../../src/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../../src/logging/OutputAdapter';

const should: Chai.Should = chai.should();
chai.use(sinonChai);

// tslint:disable no-unused-expression
describe('Metadata Util tests', () => {

    let mySandBox: sinon.SinonSandbox;
    let fabricClientConnectionMock: sinon.SinonStubbedInstance<FabricClientConnection>;
    let fakeMetadata: any;
    let transactionOne: any;
    let transactionTwo: any;
    let transactionThree: any;
    let pancakeTransactionOne: any;
    let pancakeTransactionTwo: any;
    const transactionNames: Map<string, string[]> = new Map();
    let logSpy: sinon.SinonSpy;
    const testMap: Map<string, any[]> = new Map();

    beforeEach(() => {
        mySandBox = sinon.createSandbox();
        fabricClientConnectionMock = sinon.createStubInstance(FabricClientConnection);
        fakeMetadata = {
            contracts: {
                'cake' : {
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
                'pancake' : {
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
                'org.hyperledger.fabric' : {
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

    it('should handle error getting metadata', async () => {
        fabricClientConnectionMock.getMetadata.rejects({message: `some error`});
        const transactionsMap: Map<string, any[]> = await MetadataUtil.getTransactions(fabricClientConnectionMock, 'chaincode', 'channel');
        should.equal(transactionsMap, null);
        logSpy.should.have.been.calledOnceWithExactly(LogType.WARNING, null, sinon.match(/Could not get metadata for smart contract chaincode.*some error/));
    });

});
