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
import * as chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import * as fs from 'fs-extra';
import * as path from 'path';
import { FabricNode } from '../../src/fabricModel/FabricNode';
import { FabricEnvironment } from '../../src/environments/FabricEnvironment';

chai.use(chaiAsPromised);

// tslint:disable no-unused-expression
describe('FabricEnvironment', () => {

    const environmentPath: string = path.resolve('test', 'data', 'environment');

    let environment: FabricEnvironment;
    let sandbox: sinon.SinonSandbox;

    beforeEach(async () => {
        environment = new FabricEnvironment('myFabric', environmentPath);
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
            const orgNames: string[] = await environment.getAllOrganizationNames();
            orgNames.should.deep.equal(['OrdererMSP', 'Org1MSP']);
        });

        it('should get all the organisation names, excluding the orderer', async () => {
            const orgNames: string[] = await environment.getAllOrganizationNames(false);
            orgNames.should.deep.equal(['Org1MSP']);
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
                    wallet: 'Org1',
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
                },                 {
                    short_name: 'peer1.org1.example.com',
                    name: 'peer1.org1.example.com',
                    api_url: 'grpc://localhost:17051',
                    chaincode_url: 'grpc://localhost:17052',
                    type: 'fabric-peer',
                    msp_id: 'Org1MSP',
                    container_name: 'yofn_peer1.org1.example.com',
                    hidden: false
                },
                {
                    short_name: 'orderer.example.com',
                    name: 'orderer.example.com',
                    api_url: 'grpc://localhost:17050',
                    type: 'fabric-orderer',
                    wallet: 'Orderer',
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
                    wallet: 'Org1',
                    identity: 'admin',
                    msp_id: 'Org1MSP',
                    container_name: 'yofn_peer0.org1.example.com'
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
                },                 {
                    short_name: 'peer1.org1.example.com',
                    name: 'peer1.org1.example.com',
                    api_url: 'grpc://localhost:17051',
                    chaincode_url: 'grpc://localhost:17052',
                    type: 'fabric-peer',
                    msp_id: 'Org1MSP',
                    container_name: 'yofn_peer1.org1.example.com',
                    hidden: false
                }
            ]);
        });
        it('should return hidden nodes if showAll is true', async () => {
            await environment.getNodes(false, true).should.eventually.deep.equal([
                {
                    short_name: 'ca.org1.example.com',
                    name: 'ca.org1.example.com',
                    api_url: 'http://localhost:17054',
                    type: 'fabric-ca',
                    ca_name: 'ca.org1.example.com',
                    wallet: 'Org1',
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
                    short_name: 'peer1.org1.example.com',
                    name: 'peer1.org1.example.com',
                    api_url: 'grpc://localhost:17051',
                    chaincode_url: 'grpc://localhost:17052',
                    type: 'fabric-peer',
                    msp_id: 'Org1MSP',
                    container_name: 'yofn_peer1.org1.example.com',
                    hidden: false
                },
                {
                    short_name: 'orderer.example.com',
                    name: 'orderer.example.com',
                    api_url: 'grpc://localhost:17050',
                    type: 'fabric-orderer',
                    wallet: 'Orderer',
                    identity: 'admin',
                    msp_id: 'OrdererMSP',
                    container_name: 'yofn_orderer.example.com',
                },
                {
                    short_name: 'peer0.org1.example.com',
                    name: 'peer0.org1.example.com',
                    api_url: 'grpc://localhost:17051',
                    chaincode_url: 'grpc://localhost:17052',
                    type: 'fabric-peer',
                    wallet: 'Org1',
                    identity: 'admin',
                    msp_id: 'Org1MSP',
                    container_name: 'yofn_peer0.org1.example.com'
                },
                {
                    short_name: 'peer2.org1.example.com',
                    name: 'peer2.org1.example.com',
                    api_url: 'grpc://localhost:17051',
                    chaincode_url: 'grpc://localhost:17052',
                    type: 'fabric-peer',
                    wallet: 'Org1',
                    identity: 'admin',
                    msp_id: 'Org1MSP',
                    container_name: 'yofn_peer2.org1.example.com',
                    hidden: true
                }
                            ]);
        });
    });

    describe('#updateNode', () => {
        it('should update the node', async () => {
            const node: FabricNode = FabricNode.newCertificateAuthority('ca.org1.example.com', 'ca.org1.example.com', 'http://localhost:17054', 'Org1', 'admin', 'Org1MSP', 'yofn_ca.org1.example.com', 'admin', 'adminpw');
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

            const otherNode: FabricNode = FabricNode.newOrderer('order1', 'orderer1.example.com', 'http://localhost:17057', undefined, undefined, 'osmsp', 'myCluster');
            const differentNode: FabricNode = FabricNode.newOrderer('order2', 'orderer2.example.com', 'http://localhost:17058', undefined, undefined, 'osmsp', undefined);
            const differnet2Node: FabricNode = FabricNode.newOrderer('order3', 'orderer3.example.com', 'http://localhost:17059', undefined, undefined, 'osmsp', 'otherCluster');

            const updatedOtherNode: FabricNode = FabricNode.newOrderer('order1', 'orderer1.example.com', 'http://localhost:17057', 'myWallet', 'myIdentity', 'osmsp', 'myCluster');

            const nodePath: string = path.join(environmentPath, 'nodes', `${node.name}.json`);
            const otherNodePath: string = path.join(environmentPath, 'nodes', `${otherNode.name}.json`);
            const writeStub: sinon.SinonStub = sandbox.stub(fs, 'writeJson');

            sandbox.stub(environment, 'getNodes').resolves([otherNode, differentNode, differnet2Node]);

            await environment.updateNode(node);

            writeStub.should.have.been.calledTwice;
            writeStub.firstCall.should.have.been.calledWith(otherNodePath, updatedOtherNode);
            writeStub.secondCall.should.have.been.calledWith(nodePath, node);
        });

        it('should update Ops Tools new node', async () => {
            const node: FabricNode = FabricNode.newOrderer('order', 'orderer.example.com', 'http://localhost:17056', undefined, undefined, 'osmsp', 'myCluster');

            sandbox.stub(environment, 'getNodes').resolves([]);

            const nodePath: string = path.join(environmentPath, 'nodes', `${node.name}.json`);
            const writeStub: sinon.SinonStub = sandbox.stub(fs, 'writeJson');

            await environment.updateNode(node, true);

            writeStub.should.have.been.calledWith(nodePath, node);
        });

        it('should move old file to new file when node name changes on an existing Ops Tools node', async () => {
            const newNameNode: FabricNode = FabricNode.newPeer('peerNewName.org1.example.com', 'peerNewName.org1.example.com', 'grpc://localhost:17051', 'myOpsToolsWallet', 'admin', 'Org1MSP', true);

            sandbox.stub(environment, 'getNodes').resolves([                {
                short_name: 'peer1.org1.example.com',
                name: 'peer1.org1.example.com',
                api_url: 'grpc://localhost:17051',
                chaincode_url: 'grpc://localhost:17052',
                type: 'fabric-peer',
                msp_id: 'Org1MSP',
                container_name: 'yofn_peer1.org1.example.com',
                hidden: false
            }]);

            const oldNodePath: string = path.join(environmentPath, 'nodes', 'peer1.org1.example.com.json');
            const newNodePath: string = path.join(environmentPath, 'nodes', `${newNameNode.name}.json`);
            const moveStub: sinon.SinonStub = sandbox.stub(fs, 'move');
            const writeStub: sinon.SinonStub = sandbox.stub(fs, 'writeJson');

            await environment.updateNode(newNameNode, true);

            moveStub.should.have.been.calledWith(oldNodePath, newNodePath);
            writeStub.should.have.been.calledWith(newNodePath, newNameNode);
        });

        it('should update node with wallet and identity of existing Ops Tools node if those fields no not exist on new version of the node ', async () => {
            const existingNode: FabricNode = FabricNode.newPeer('origonalShortName', 'peer1.org1.example.com', 'grpc://localhost:17051', 'myOpsToolsWallet', 'admin', 'Org1MSP', true);
            const newVersionNode: FabricNode = FabricNode.newPeer('newShortName', 'peer1.org1.example.com', 'grpc://localhost:17051', undefined, undefined, 'Org1MSP', true);
            const updatedNode: FabricNode = FabricNode.newPeer('newShortName', 'peer1.org1.example.com', 'grpc://localhost:17051', 'myOpsToolsWallet', 'admin', 'Org1MSP', true);

            sandbox.stub(environment, 'getNodes').resolves([existingNode]);

            const nodePath: string = path.join(environmentPath, 'nodes', 'peer1.org1.example.com.json');
            const moveStub: sinon.SinonStub = sandbox.stub(fs, 'move');
            const writeStub: sinon.SinonStub = sandbox.stub(fs, 'writeJson');

            await environment.updateNode(newVersionNode, true);

            moveStub.should.not.have.been.called;
            writeStub.should.have.been.calledWith(nodePath, updatedNode);
        });

        it('should update node with wallet and identity of existing Ops Tools node if those fields no not exist on new version of the node - multi-node orderer ', async () => {
            const existingNode1: FabricNode = FabricNode.newOrderer('order1', 'orderer1.example.com', 'http://localhost:17056', 'myWallet', 'myIdentity', 'osmsp', 'myCluster');
            const existingNode2: FabricNode = FabricNode.newOrderer('order2', 'orderer2.example.com', 'http://localhost:17057', 'myWallet', 'myIdentity', 'osmsp', 'myCluster');
            const newVersionNode1: FabricNode = FabricNode.newOrderer('order1', 'orderer1.example.com', 'http://localhost:17056', undefined, undefined, 'osmsp', 'myCluster');

            sandbox.stub(environment, 'getNodes').resolves([existingNode1, existingNode2]);

            const nodePath1: string = path.join(environmentPath, 'nodes', 'orderer1.example.com.json');
            const nodePath2: string = path.join(environmentPath, 'nodes', 'orderer2.example.com.json');
            const moveStub: sinon.SinonStub = sandbox.stub(fs, 'move');
            const writeStub: sinon.SinonStub = sandbox.stub(fs, 'writeJson');

            await environment.updateNode(newVersionNode1, true);

            moveStub.should.not.have.been.called;
            writeStub.should.have.been.calledWith(nodePath1, existingNode1);
            writeStub.should.have.been.calledWith(nodePath2, existingNode2);
        });

        it('should hide all nodes in multi-node orderer on ops tools environment', async () => {
            const existingNode1: FabricNode = FabricNode.newOrderer('order1', 'orderer1.example.com', 'http://localhost:17056', 'myWallet', 'myIdentity', 'osmsp', 'myCluster');
            const existingNode2: FabricNode = FabricNode.newOrderer('order2', 'orderer2.example.com', 'http://localhost:17057', 'myWallet', 'myIdentity', 'osmsp', 'myCluster');
            const newVersionNode1: FabricNode = FabricNode.newOrderer('order1', 'orderer1.example.com', 'http://localhost:17056', 'myWallet', 'myIdentity', 'osmsp', 'myCluster', true);
            const expectedNode1: FabricNode = FabricNode.newOrderer('order1', 'orderer1.example.com', 'http://localhost:17056', 'myWallet', 'myIdentity', 'osmsp', 'myCluster', true);
            const expectedNode2: FabricNode = FabricNode.newOrderer('order2', 'orderer2.example.com', 'http://localhost:17057', 'myWallet', 'myIdentity', 'osmsp', 'myCluster', true);

            sandbox.stub(environment, 'getNodes').resolves([existingNode1, existingNode2]);

            const nodePath1: string = path.join(environmentPath, 'nodes', 'orderer1.example.com.json');
            const nodePath2: string = path.join(environmentPath, 'nodes', 'orderer2.example.com.json');
            const moveStub: sinon.SinonStub = sandbox.stub(fs, 'move');
            const writeStub: sinon.SinonStub = sandbox.stub(fs, 'writeJson');

            await environment.updateNode(newVersionNode1);

            moveStub.should.not.have.been.called;
            writeStub.should.have.been.calledWith(nodePath1, expectedNode1);
            writeStub.should.have.been.calledWith(nodePath2, expectedNode2);
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
            const node: FabricNode = FabricNode.newCertificateAuthority('ca.org1.example.com', 'ca.org1.example.com', 'http://localhost:17054', 'Org1', 'admin', 'Org1MSP', 'yofn_ca.org1.example.com', 'admin', 'adminpw');
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
