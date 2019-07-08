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
import { ExtensionUtil } from '../../src/util/ExtensionUtil';
import { TestUtil } from '../TestUtil';
import * as fs from 'fs-extra';
import * as path from 'path';
import { FabricWalletUtil } from '../../src/fabric/FabricWalletUtil';
import { FabricEnvironment } from '../../src/fabric/FabricEnvironment';

chai.should();

// tslint:disable no-unused-expression
describe('FabricEnvironment', () => {

    const rootPath: string = path.dirname(__dirname);
    const environmentPath: string = path.resolve(rootPath, '..', '..', 'test', 'data', 'environment');

    let environment: FabricEnvironment;
    let sandbox: sinon.SinonSandbox;

    before(async () => {
        await TestUtil.storeRuntimesConfig();
    });

    after(async () => {
        await TestUtil.restoreRuntimesConfig();
    });

    beforeEach(async () => {
        await ExtensionUtil.activateExtension();
        environment = new FabricEnvironment('myFabric');
        environment['path'] = environmentPath;
        sandbox = sinon.createSandbox();
    });

    afterEach(async () => {
        sandbox.restore();
    });

    describe('#getName', () => {
        it('should return the name of the runtime', () => {
            environment.getName().should.equal('myFabric');
        });
    });

    describe('#getPath', () => {
        it('should return the path of the runtime', () => {
            environment.getPath().should.equal(environmentPath);
        });
    });

    describe('#getNodes', () => {
        it('should return an empty array if no nodes directory', async () => {
            sandbox.stub(fs, 'pathExists').resolves(false);
            await environment.getNodes().should.eventually.deep.equal([]);
        });

        it('should return all of the nodes', async () => {
            await environment.getNodes().should.eventually.deep.equal([
                {
                    short_name: 'ca.org1.example.com',
                    name: 'ca.org1.example.com',
                    api_url: 'http://localhost:17054',
                    type: 'fabric-ca',
                    ca_name: 'ca.org1.example.com',
                    wallet: FabricWalletUtil.LOCAL_WALLET,
                    identity: 'admin',
                    msp_id: 'Org1MSP',
                    container_name: 'yofn_ca.org1.example.com'
                },
                {
                    short_name: 'couchdb',
                    name: 'couchdb',
                    api_url: 'http://localhost:17055',
                    type: 'couchdb',
                    container_name: 'yofn_couchdb'
                },
                {
                    short_name: 'logspout',
                    name: 'logspout',
                    api_url: 'http://localhost:17056',
                    type: 'logspout',
                    container_name: 'yofn_logspout'
                },
                {
                    short_name: 'orderer.example.com',
                    name: 'orderer.example.com',
                    api_url: 'grpc://localhost:17050',
                    type: 'fabric-orderer',
                    wallet: FabricWalletUtil.LOCAL_WALLET,
                    identity: 'admin',
                    msp_id: 'OrdererMSP',
                    container_name: 'yofn_orderer.example.com'
                },
                {
                    short_name: 'anotherOrderer.example.com',
                    name: 'anotherOrderer.example.com',
                    api_url: 'grpc://localhost:17050',
                    type: 'fabric-orderer',
                    wallet: FabricWalletUtil.LOCAL_WALLET,
                    identity: 'admin',
                    msp_id: 'OrdererMSP',
                    container_name: 'yofn_another_orderer.example.com'
                },
                {
                    short_name: 'peer0.org1.example.com',
                    name: 'peer0.org1.example.com',
                    api_url: 'grpc://localhost:17051',
                    chaincode_url: 'grpc://localhost:17052',
                    type: 'fabric-peer',
                    wallet: FabricWalletUtil.LOCAL_WALLET,
                    identity: 'admin',
                    msp_id: 'Org1MSP',
                    container_name: 'yofn_peer0.org1.example.com'
                },
                {
                    short_name: 'singleOrderer.example.com',
                    name: 'singleOrderer.example.com',
                    api_url: 'grpc://localhost:17050',
                    type: 'fabric-orderer',
                    wallet: FabricWalletUtil.LOCAL_WALLET,
                    identity: 'admin',
                    msp_id: 'OrdererMSP',
                    container_name: 'yofn_single_orderer.example.com'
                },
            ]);
        });
    });
});
