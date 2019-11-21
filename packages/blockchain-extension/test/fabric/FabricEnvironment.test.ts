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
import { TestUtil } from '../TestUtil';
import * as fs from 'fs-extra';
import * as path from 'path';
import { FabricWalletUtil } from '../../extension/fabric/FabricWalletUtil';
import { FabricEnvironment } from '../../extension/fabric/FabricEnvironment';
import { FabricNode } from '../../extension/fabric/FabricNode';

chai.should();

// tslint:disable no-unused-expression
describe('FabricEnvironment', () => {

    const rootPath: string = path.dirname(__dirname);
    const environmentPath: string = path.resolve(rootPath, '..', '..', 'test', 'data', 'environment');

    let environment: FabricEnvironment;
    let sandbox: sinon.SinonSandbox;

    before(async () => {
        await TestUtil.setupTests(sandbox);
    });

    beforeEach(async () => {
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

    describe('#getAllOrganisationNames', () => {
        it('should get all the organisation names', async () => {
            await environment.getAllOrganizationNames().should.eventually.deep.equal(['OrdererMSP', 'Org1MSP']);
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
                    short_name: 'peer1.org1.example.com',
                    name: 'peer1.org1.example.com',
                    api_url: 'grpc://localhost:17051',
                    chaincode_url: 'grpc://localhost:17052',
                    type: 'fabric-peer',
                    msp_id: 'Org1MSP',
                    container_name: 'yofn_peer1.org1.example.com'
                }
            ]);
        });

        it('should filter nodes', async () => {
            await environment.getNodes(true).should.eventually.deep.equal([
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
                    short_name: 'peer1.org1.example.com',
                    name: 'peer1.org1.example.com',
                    api_url: 'grpc://localhost:17051',
                    chaincode_url: 'grpc://localhost:17052',
                    type: 'fabric-peer',
                    msp_id: 'Org1MSP',
                    container_name: 'yofn_peer1.org1.example.com'
                }
            ]);
        });
    });

    describe('#updateNode', () => {
        it('should update the node', async () => {
            const node: FabricNode = FabricNode.newCertificateAuthority('ca.org1.example.com', 'ca.org1.example.com', 'http://localhost:17054', FabricWalletUtil.LOCAL_WALLET, 'admin', 'Org1MSP', 'yofn_ca.org1.example.com', 'admin', 'adminpw');
            const nodePath: string = path.join(environmentPath, 'nodes', `${node.name}.json`);
            const writeStub: sinon.SinonStub = sandbox.stub(fs, 'writeJson');

            await environment.updateNode(node);

            writeStub.should.have.been.calledWith(nodePath, node);
        });

        it('should update orderer node with cluster name', async () => {
            const node: FabricNode = FabricNode.newOrderer('order', 'orderer.example.com', 'http://localhost:17056', undefined, undefined, 'osmsp', 'myCluster');

            sandbox.stub(environment, 'getNodes').resolves([]);

            const nodePath: string = path.join(environmentPath, 'nodes', `${node.name}.json`);
            const writeStub: sinon.SinonStub = sandbox.stub(fs, 'writeJson');

            await environment.updateNode(node);

            writeStub.should.have.been.calledWith(nodePath, node);
        });

        it('should update all orderer nodes in same cluster', async () => {
            const node: FabricNode = FabricNode.newOrderer('order', 'orderer.example.com', 'http://localhost:17056', 'myWallet', 'myIdentity', 'osmsp', 'myCluster');

            const otherNode: FabricNode = FabricNode.newOrderer('order1', 'orderer1.example.com', 'http://localhost:17056', undefined, undefined, 'osmsp', 'myCluster');
            const differentNode: FabricNode = FabricNode.newOrderer('order2', 'orderer2.example.com', 'http://localhost:17056', undefined, undefined, 'osmsp', undefined);
            const differnet2Node: FabricNode = FabricNode.newOrderer('order3', 'orderer3.example.com', 'http://localhost:17056', undefined, undefined, 'osmsp', 'otherCluster');

            const updatedOtherNode: FabricNode = FabricNode.newOrderer('order1', 'orderer1.example.com', 'http://localhost:17056', 'myWallet', 'myIdentity', 'osmsp', 'myCluster');

            const nodePath: string = path.join(environmentPath, 'nodes', `${node.name}.json`);
            const otherNodePath: string = path.join(environmentPath, 'nodes', `${otherNode.name}.json`);
            const writeStub: sinon.SinonStub = sandbox.stub(fs, 'writeJson');

            sandbox.stub(environment, 'getNodes').resolves([otherNode, differentNode, differnet2Node]);

            await environment.updateNode(node);

            writeStub.should.have.been.calledTwice;
            writeStub.firstCall.should.have.been.calledWith(otherNodePath, updatedOtherNode);
            writeStub.secondCall.should.have.been.calledWith(nodePath, node);
        });
    });

    describe('#deleteNode', () => {
        it('should delete the node', async () => {
            const node: FabricNode = FabricNode.newOrderer('order', 'orderer.example.com', 'http://localhost:17056', 'myWallet', 'myIdentity', 'osmsp', 'myCluster');

            const deleteStub: sinon.SinonStub = sandbox.stub(fs, 'remove');

            await environment.deleteNode(node);

            const nodePath: string = path.join(environmentPath, 'nodes', `${node.name}.json`);

            deleteStub.should.have.been.calledWith(nodePath);
        });
    });

    describe('#requireSetup', () => {
        it('should return true if set up required', async () => {
            const node: FabricNode = FabricNode.newCertificateAuthority('ca.org1.example.com', 'ca.org1.example.com', 'http://localhost:17054', FabricWalletUtil.LOCAL_WALLET, 'admin', 'Org1MSP', 'yofn_ca.org1.example.com', 'admin', 'adminpw');
            sandbox.stub(environment, 'getNodes').resolves([node]);
            const result: boolean = await environment.requireSetup();
            result.should.equal(true);
        });

        it('should return false if set up not required', async () => {
            sandbox.stub(environment, 'getNodes').resolves([]);
            const result: boolean = await environment.requireSetup();
            result.should.equal(false);
        });
    });
});
