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
import * as vscode from 'vscode';
import { FabricClientConnection } from '../../src/fabric/FabricClientConnection';
import { MetadataUtil } from '../../src/util/MetadataUtil';

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
    let errorSpy: sinon.SinonSpy;
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
        errorSpy = mySandBox.spy(vscode.window, 'showErrorMessage');
    });

    afterEach(() => {
        mySandBox.restore();
    });

    it('should return the Transaction names', async () => {
         const names: Map<string, string[]> = await MetadataUtil.getTransactionNames(fabricClientConnectionMock, 'chaincode', 'channel');
         names.should.deep.equal(transactionNames);
         errorSpy.should.not.have.been.called;
    });

    it('should return the Transaction objects', async () => {
        const transactionsMap: Map<string, any[]> = await MetadataUtil.getTransactions(fabricClientConnectionMock, 'chaincode', 'channel', true);
        transactionsMap.should.deep.equal(testMap);
        errorSpy.should.not.have.been.called;
    });

    it('should handle calling metadata using out of date smart contract apis', async () => {
        fabricClientConnectionMock.getMetadata.rejects({message: `You've asked to invoke a function that does not exist`});
        const names: Map<string, string[]> = await MetadataUtil.getTransactionNames(fabricClientConnectionMock, 'chaincode', 'channel');
        names.size.should.equal(0);
        errorSpy.should.have.been.calledOnceWith(`Error getting metadata for smart contract chaincode, please ensure this smart contract is depending on at least fabric-contract@1.4.0-beta2`);
    });

    it('should handle error getting metadata', async () => {
        fabricClientConnectionMock.getMetadata.rejects({message: `some error`});
        const transactionsMap: Map<string, any[]> = await MetadataUtil.getTransactions(fabricClientConnectionMock, 'chaincode', 'channel');
        transactionsMap.size.should.equal(0);
        errorSpy.should.have.been.calledOnceWith(`Error getting metadata for smart contract chaincode: some error`);
    });

});
