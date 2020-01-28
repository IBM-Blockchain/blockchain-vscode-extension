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

// tslint:disable: no-unused-expression
import * as sinon from 'sinon';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { FabricNode } from '../../src/fabricModel/FabricNode';

chai.use(chaiAsPromised);

describe('FabricNode', () => {
    let mySandBox: sinon.SinonSandbox;
    let peerNode: FabricNode;
    let caNode: FabricNode;
    let ordererNode: FabricNode;
    beforeEach(async () => {
        mySandBox = sinon.createSandbox();

        peerNode = FabricNode.newPeer('peer0.org1.example.com', 'peer0.org1.example.com', 'grpc://localhost:7051', 'Org1', 'admin', 'Org1MSP');
        caNode = FabricNode.newCertificateAuthority('ca.org1.example.com', 'ca.org1.example.com', 'http://localhost:7054', 'ca_name', 'Org1', 'admin', 'Org1MSP', 'admin', 'adminpw');
        ordererNode = FabricNode.newOrderer('orderer.example.com', 'orderer.example.com', 'grpc://localhost:7050', 'Org1', 'admin', 'OrdererMSP', 'myCluster');
    });

    afterEach(() => {
        mySandBox.restore();
    });

    it('should create a peer', () => {
        peerNode.should.exist;
    });

    it('should create a secure peer', () => {
        const securePeerNode: FabricNode = FabricNode.newSecurePeer('peer0.org1.example.com', 'peer0.org1.example.com', 'grpc://localhost:7051', 'myPem', 'Org1', 'admin', 'Org1MSP');
        securePeerNode.should.exist;
    });

    it('should create a orderer', () => {
        ordererNode.should.exist;
    });

    it('should create a secure orderer', () => {
        const secureOrdererNode: FabricNode = FabricNode.newSecureOrderer('orderer.example.com', 'orderer.example.com', 'grpc://localhost:7050', 'myPem', 'Org1', 'admin', 'OrdererMSP', 'myCluster');
        secureOrdererNode.should.exist;
    });

    it('should create a couchdb', () => {
        const couchNode: FabricNode = FabricNode.newCouchDB('couchdb.example.com', 'couchdb.example.com', 'grpc://localhost:7064');
        couchNode.should.exist;
    });

    it('should create a ca', () => {
        caNode.should.exist;
    });

    it('should create a secure ca', () => {
        const secureCaNode: FabricNode = FabricNode.newSecureCertificateAuthority('ca.org1.example.com', 'ca.org1.example.com', 'http://localhost:7054', 'ca_name', 'myPem', 'Org1', 'admin', 'Org1MSP', 'admin', 'adminpw');
        secureCaNode.should.exist;
    });

    describe('validateNode', () => {
        it('should not throw an error if peer node is valid', () => {
            try {
                FabricNode.validateNode(peerNode);
            } catch (error) {
                throw new Error('should not get here ' + error.message);
            }
        });

        it('should not throw an error if orderer node is valid', () => {
            try {
                FabricNode.validateNode(ordererNode);
            } catch (error) {
                throw new Error('should not get here ' + error.message);
            }
        });

        it('should not throw an error if ca node is valid', () => {
            try {
                FabricNode.validateNode(caNode);
            } catch (error) {
                throw new Error('should not get here ' + error.message);
            }
        });

        it('should throw an error if doesn\'t have a name', () => {
            try {
                peerNode.name = undefined;
                FabricNode.validateNode(peerNode);
            } catch (error) {
                error.message.should.equal('A node should have a name property');
            }
        });

        it('should throw an error if doesn\'t have a name', () => {
            try {
                peerNode.name = undefined;
                FabricNode.validateNode(peerNode);
            } catch (error) {
                error.message.should.equal('A node should have a name property');
            }
        });

        it('should throw an error if doesn\'t have a type', () => {
            try {
                peerNode.type = undefined;
                FabricNode.validateNode(peerNode);
            } catch (error) {
                error.message.should.equal('A node should have a type property');
            }
        });

        it('should throw an error if doesn\'t have a api_url', () => {
            try {
                peerNode.api_url = undefined;
                FabricNode.validateNode(peerNode);
            } catch (error) {
                error.message.should.equal('A node should have a api_url property');
            }
        });

        it('should throw an error if a peer doesn\'t have a msp_id', () => {
            try {
                peerNode.msp_id = undefined;
                FabricNode.validateNode(peerNode);
            } catch (error) {
                error.message.should.equal(`A ${peerNode.type} node should have a msp_id property`);
            }
        });

        it('should throw an error if a orderer doesn\'t have a msp_id', () => {
            try {
                ordererNode.msp_id = undefined;
                FabricNode.validateNode(ordererNode);
            } catch (error) {
                error.message.should.equal(`A ${ordererNode.type} node should have a msp_id property`);
            }
        });

        it('should throw an error if a ca doesn\'t have a ca_name', () => {
            try {
                caNode.ca_name = undefined;
                FabricNode.validateNode(caNode);
            } catch (error) {
                error.message.should.equal(`A ${caNode.type} node should have a ca_name property`);
            }
        });
    });
});
