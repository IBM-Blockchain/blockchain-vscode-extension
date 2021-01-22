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
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import * as chaiAsPromised from 'chai-as-promised';
import { EvaluateQueryHandler } from '../src/EvaluateQueryHandler';
import { Endorser } from 'fabric-common';
import { Query, QueryResponse, QueryResults } from 'fabric-network';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const should: Chai.Should = chai.should();

// tslint:disable:no-unused-expression
describe('EvaluateQueryHandler', () => {

    describe('getPeers', () => {
        it(`confirm getPeers works`, () => {
            const result: Endorser[] = EvaluateQueryHandler.getPeers();
            should.equal(undefined, result);
        });
    });

    describe('setPeers', () => {
        it(`confirm setPeers works`, () => {
            const originalPeers: Endorser[] = EvaluateQueryHandler.getPeers();
            const newPeers: Endorser[] = [{name: 'peer1', mspid: 'Org1MSP'} as Endorser];
            EvaluateQueryHandler.setPeers(newPeers);
            const result: Endorser[] = EvaluateQueryHandler.getPeers();
            result.should.deep.equal(newPeers);
            EvaluateQueryHandler.setPeers(originalPeers);
        });
    });

    describe('createQueryHandler', () => {
        let mockNetwork: any;
        let getGatewayStub: sinon.SinonStub;
        let getChannelStub: sinon.SinonStub;
        let mySandBox: sinon.SinonSandbox;
        let gatewayStub: any;
        let getIdentityStub: sinon.SinonStub;
        let channelStub: any;
        let getEndorsersStub: sinon.SinonStub;
        let peers: Endorser[];
        let mspId: string;

        beforeEach(() => {
            mySandBox = sinon.createSandbox();

            peers = [{name: 'peer1', mspid: 'Org1MSP'} as Endorser, {name: 'peer2', mspid: 'Org2MSP'} as Endorser];
            mspId = 'Org1MSP';

            getIdentityStub = mySandBox.stub().returns({mspId: mspId});
            gatewayStub = {
                getIdentity: getIdentityStub
            }
            getGatewayStub = mySandBox.stub().returns(gatewayStub);

            getEndorsersStub = mySandBox.stub().returns(peers);
            getEndorsersStub.withArgs(mspId).returns([peers[0]])
            channelStub = {
                getEndorsers: getEndorsersStub
            }
            getChannelStub = mySandBox.stub().returns(channelStub);

            mockNetwork = {
                getGateway: getGatewayStub,
                getChannel: getChannelStub
            };
        });

        it(`should set EvaluateQueryHandler peers to all available peers`, () => {
            EvaluateQueryHandler.createQueryHandler(mockNetwork);
            EvaluateQueryHandler.getPeers().should.deep.equal(peers);
        });
    });

    describe('evaluate', () => {
        const handler: EvaluateQueryHandler = new EvaluateQueryHandler();
        let peers: Endorser[];
        let query: sinon.SinonStubbedInstance<Query>;

        class TestQuery implements Query {
            async evaluate(_peers: Endorser[]): Promise<QueryResults> {
                return;
            }
        }


        beforeEach(() => {
            peers = [{name: 'peer1', mspid: 'Org1MSP'} as Endorser, {name: 'peer2', mspid: 'Org2MSP'} as Endorser];
            query = sinon.createStubInstance(TestQuery)
            EvaluateQueryHandler.setPeers(peers);
        });

        it(`should return payload if present`, async () => {
            const response0: QueryResponse = {
                isEndorsed: true,
                payload: Buffer.from('some payload buffer'),
                status: 200,
                message: ''
            }
            query.evaluate.resolves({[peers[0].name]: response0});

            const result: Buffer = await handler.evaluate(query);
            result.should.deep.equal(response0.payload);
            query.evaluate.should.have.been.called;
        });

        it(`should return payload if present even if previous peers returned error`, async () => {
            const response0: Error = new Error('some message');
            query.evaluate.onFirstCall().resolves({[peers[0].name]: response0});

            const response1: QueryResponse = {
                isEndorsed: true,
                payload: Buffer.from('some payload buffer'),
                status: 200,
                message: ''
            }
            query.evaluate.onSecondCall().resolves({[peers[1].name]: response1});

            const result: Buffer = await handler.evaluate(query);
            result.should.deep.equal(response1.payload);
            query.evaluate.should.have.been.calledTwice;
        });

        it(`should return payload if present even if previous peers returned non endorsed result`, async () => {
            const response0: QueryResponse = {
                isEndorsed: false,
                payload: Buffer.from('some payload buffer'),
                status: 500,
                message: 'some mesage'
            }
            query.evaluate.resolves({[peers[0].name]: response0});

            const response1: QueryResponse = {
                isEndorsed: true,
                payload: Buffer.from('some payload buffer'),
                status: 200,
                message: ''
            }
            query.evaluate.onSecondCall().resolves({[peers[1].name]: response1});

            const result: Buffer = await handler.evaluate(query);
            result.should.deep.equal(response1.payload);
            query.evaluate.should.have.been.calledTwice;
        });

        it(`should throw error if all results are not endorsed`, async () => {
            EvaluateQueryHandler.setPeers([peers[0]]);

            const response0: QueryResponse = {
                isEndorsed: false,
                payload: Buffer.from('some payload buffer'),
                status: 500,
                message: 'some mesage'
            }
            query.evaluate.resolves({[peers[0].name]: response0});

            const expectedError: string = `Query failed. Errors: ${JSON.stringify([`Peer ${peers[0].name}: ${response0.message}`])}`;

            await handler.evaluate(query).should.eventually.rejectedWith(expectedError);
            query.evaluate.should.have.been.called;
        });

        it(`should throw error if no peers`, async () => {
            EvaluateQueryHandler.setPeers(undefined);

            await handler.evaluate(query).should.eventually.rejectedWith('No target peers provided');
            query.evaluate.should.not.have.been.called;
        });

        it(`should throw error if all peers return error`, async () => {
            const response0: Error = new Error('some error');
            query.evaluate.onFirstCall().resolves({[peers[0].name]: response0});

            const response1: Error = new Error('some other error');
            query.evaluate.onSecondCall().resolves({[peers[1].name]: response1});

            const expectedError: string = `Query failed. Errors: ${JSON.stringify([`Peer ${peers[0].name}: ${response0.toString()}`, `Peer ${peers[1].name}: ${response1.toString()}`])}`;

            await handler.evaluate(query).should.eventually.rejectedWith(expectedError);
            query.evaluate.should.have.been.calledTwice;
        });
    });
});