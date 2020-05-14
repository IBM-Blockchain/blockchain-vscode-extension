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

import { FabricEnvironmentConnection } from '../src/FabricEnvironmentConnection';
import * as FabricCAServices from 'fabric-ca-client';
import * as fs from 'fs';
import * as path from 'path';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { FabricCommittedSmartContract, FabricNodeType, FabricNode, FabricRuntimeUtil, FabricWalletRegistry, FabricEnvironmentRegistry, FabricEnvironmentRegistryEntry, EnvironmentType, FabricWalletGeneratorFactory } from 'ibm-blockchain-platform-common';
import { FabricWallet, FabricWalletGenerator } from 'ibm-blockchain-platform-wallet';
import { LifecyclePeer, LifecycleChannel } from 'ibm-blockchain-platform-fabric-admin';
import { ConnectOptions } from 'fabric-common';
import { FabricInstalledSmartContract } from 'ibm-blockchain-platform-common/build/src/fabricModel/FabricInstalledSmartContract';

const should: Chai.Should = chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

// tslint:disable no-unused-expression
describe('FabricEnvironmentConnection', () => {
    const TEST_PACKAGE_DIRECTORY: string = path.join(path.dirname(__dirname), 'test', 'data', 'packages');
    const PEM_TLS_CA_CERTIFICATE_BUFFER: Buffer = fs.readFileSync(path.resolve(__dirname, 'data', 'certs', 'ca-org1-example-com-17054.pem'));
    const PEM_TLS_CA_CERTIFICATE: string = PEM_TLS_CA_CERTIFICATE_BUFFER.toString();
    const TLS_CA_CERTIFICATE: string = PEM_TLS_CA_CERTIFICATE_BUFFER.toString('base64');

    let mySandBox: sinon.SinonSandbox;
    let connection: FabricEnvironmentConnection;
    let nodes: FabricNode[];
    let localWallet: FabricWallet;
    let getUserContextStub: sinon.SinonStub;

    before(async () => {
        FabricWalletGeneratorFactory.setFabricWalletGenerator(FabricWalletGenerator.instance());
        FabricWalletRegistry.instance().setRegistryPath(path.join(__dirname, 'tmp', 'registries'));
        FabricEnvironmentRegistry.instance().setRegistryPath(path.join(__dirname, 'tmp', 'registries'));
        await FabricWalletRegistry.instance().clear();
        await FabricEnvironmentRegistry.instance().clear();
        await FabricEnvironmentRegistry.instance().add(new FabricEnvironmentRegistryEntry({ name: FabricRuntimeUtil.LOCAL_FABRIC, environmentDirectory: path.join(__dirname, '..', '..', '..', 'test', 'data', FabricRuntimeUtil.LOCAL_FABRIC), environmentType: EnvironmentType.LOCAL_ENVIRONMENT }));
    });

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();

        nodes = [
            FabricNode.newPeer(
                'peer0.org1.example.com',
                'peer0.org1.example.com',
                `grpc://localhost:7051`,
                `Org1`,
                FabricRuntimeUtil.ADMIN_USER,
                'Org1MSP'
            ),
            FabricNode.newPeer(
                'peer1.org1.example.com',
                'peer1.org1.example.com',
                `grpc://localhost:7051`,
                `Org1`,
                FabricRuntimeUtil.ADMIN_USER,
                'Org1MSP'
            ),
            FabricNode.newPeer(
                'peer2.org1.example.com',
                'peer2.org1.example.com',
                `grpc://localhost:7051`,
                `Org1`,
                FabricRuntimeUtil.ADMIN_USER,
                'Org1MSP'
            ),
            FabricNode.newSecurePeer(
                'peer0.org2.example.com',
                'peer0.org2.example.com',
                `grpcs://localhost:8051`,
                TLS_CA_CERTIFICATE,
                `Org1`,
                FabricRuntimeUtil.ADMIN_USER,
                'Org2MSP'
            ),
            FabricNode.newCertificateAuthority(
                'ca.example.com',
                'ca.example.com',
                `http://localhost:7054`,
                'ca_name',
                'Org1',
                FabricRuntimeUtil.ADMIN_USER,
                'Org1MSP',
                'admin',
                'adminpw'
            ),
            FabricNode.newSecureCertificateAuthority(
                'ca2.example.com',
                'ca2.example.com',
                `https://localhost:8054`,
                'ca_name',
                TLS_CA_CERTIFICATE,
                'Org1',
                FabricRuntimeUtil.ADMIN_USER,
                'Org2MSP',
                'admin',
                'adminpw'
            ),
            FabricNode.newCertificateAuthority(
                'ca3.example.com',
                'ca3.example.com',
                `http://localhost:9054`,
                null,
                'Org1',
                FabricRuntimeUtil.ADMIN_USER,
                null,
                'admin',
                'adminpw'
            ),
            FabricNode.newOrderer(
                'orderer.example.com',
                'orderer.example.com',
                `grpc://localhost:7050`,
                'Org1',
                FabricRuntimeUtil.ADMIN_USER,
                'OrdererMSP',
                'myCluster'
            ),
            FabricNode.newSecureOrderer(
                'orderer2.example.com',
                'orderer2.example.com',
                `grpcs://localhost:8050`,
                TLS_CA_CERTIFICATE,
                'Org1',
                FabricRuntimeUtil.ADMIN_USER,
                'OrdererMSP',
                'myCluster'
            ),
            FabricNode.newCouchDB(
                'couchdb',
                'couchdb',
                `http://localhost:7055`
            )
        ];

        const mockFabricWalletGenerator: sinon.SinonStub = mySandBox.stub(FabricWalletGenerator.instance(), 'getWallet');
        localWallet = await FabricWallet.newFabricWallet('tmp/myWallet');

        getUserContextStub = mySandBox.stub().resolves();

        mySandBox.stub(localWallet.getWallet(), 'getProviderRegistry').returns({
            getProvider: mySandBox.stub().returns({
                getUserContext: getUserContextStub
            })
        });

        localWallet.getIdentity = mySandBox.stub().resolves({
            cert: 'myCert',
            private_key: 'myKey',
            msp_id: 'myMSPID',
            name: 'myWallet'
        });

        mockFabricWalletGenerator.resolves(localWallet);

        connection = new FabricEnvironmentConnection(FabricRuntimeUtil.LOCAL_FABRIC);
        await connection.connect(nodes);
    });

    afterEach(() => {
        mySandBox.restore();
    });

    describe('constructor', () => {
        it('should create an instance of the class', () => {
            connection = new FabricEnvironmentConnection(FabricRuntimeUtil.LOCAL_FABRIC);
            connection['environmentName'].should.equal(FabricRuntimeUtil.LOCAL_FABRIC);
        });
    });

    describe('connect', () => {

<<<<<<< HEAD
        it('should create a peer for each peer node', async () => {
            const peerNames: string[] = Array.from(connection['lifecycle']['peers'].keys());
            const peerValues: LifecyclePeer[] = Array.from(connection['lifecycle']['peers'].values());

=======
        it('should create peer clients for each peer node with API options', async () => {
            const node: FabricNode = FabricNode.newPeer(
                'org1peer',
                'Org1 Peer',
                `grpc://localhost:8080`,
                `Org1`,
                FabricRuntimeUtil.ADMIN_USER,
                'Org1MSP'
            );
            node.api_options = {
                'grpc.default_authority': 'org1peer.127-0-0-1.nip.io:8080',
                'grpc.ssl_target_name_override': 'org1peer.127-0-0-1.nip.io:8080'
            };
            connection.disconnect();
            await connection.connect([node]);
            const peerNames: string[] = Array.from(connection['peers'].keys());
            const peerValues: Client.Peer[] = Array.from(connection['peers'].values());
            peerNames.should.deep.equal(['Org1 Peer']);
            peerValues.should.have.lengthOf(1);
            peerValues[0].should.be.an.instanceOf(Client.Peer);
            const characteristics: any = peerValues[0]['getCharacteristics']();
            characteristics.name.should.equal('org1peer.127-0-0-1.nip.io:8080');
            characteristics.url.should.equal('grpc://localhost:8080');
        });

        it('should create secure peer clients for each secure peer node', async () => {
            const peerNames: string[] = Array.from(connection['peers'].keys());
            const peerValues: Client.Peer[] = Array.from(connection['peers'].values());
>>>>>>> 4653e531... Add api_options and chaincode_options to a peer/orderer (resolves #2312)
            peerNames.should.deep.equal(['peer0.org1.example.com', 'peer1.org1.example.com', 'peer2.org1.example.com', 'peer0.org2.example.com']);

            peerValues.should.have.lengthOf(4);
<<<<<<< HEAD
            peerValues[0].should.be.an.instanceOf(LifecyclePeer);
            peerValues[0]['url'].should.equal('grpc://localhost:7051');
            peerValues[0]['name'].should.equal('peer0.org1.example.com');
=======
            peerValues[3].should.be.an.instanceOf(Client.Peer);
            const characteristics: any = peerValues[3]['getCharacteristics']();
            characteristics.name.should.equal('localhost:8051');
            characteristics.url.should.equal('grpcs://localhost:8051');
>>>>>>> 4653e531... Add api_options and chaincode_options to a peer/orderer (resolves #2312)
        });

        it('should create secure peer clients for each secure peer node with an SSL target name override', async () => {
            const node: FabricNode = FabricNode.newSecurePeer(
                'peer0.org2.example.com',
                'peer0.org2.example.com',
                `grpcs://localhost:8051`,
                TLS_CA_CERTIFICATE,
                'Org1',
                FabricRuntimeUtil.ADMIN_USER,
                'Org2MSP'
            );
            node.ssl_target_name_override = 'peer0.org2.example.com';
            connection.disconnect();
            await connection.connect([node]);

            const peerNames: string[] = Array.from(connection['lifecycle']['peers'].keys());
            const peerValues: LifecyclePeer[] = Array.from(connection['lifecycle']['peers'].values());

            peerNames.should.deep.equal(['peer0.org2.example.com']);
            peerValues.should.have.lengthOf(1);
            peerValues[0].should.be.an.instanceOf(LifecyclePeer);
            peerValues[0]['url'].should.equal('grpcs://localhost:8051');
            peerValues[0]['name'].should.equal('peer0.org2.example.com');
            peerValues[0]['sslTargetNameOverride'].should.equal('peer0.org2.example.com');
        });

        it('should create orderer clients for each orderer node', async () => {
            const results: string[] = connection['lifecycle'].getAllOrdererNames();

            results.length.should.equal(2);

<<<<<<< HEAD
            let orderer: ConnectOptions = connection['lifecycle'].getOrderer(results[0]);
            orderer.url.should.equal('grpc://localhost:7050');

            orderer = connection['lifecycle'].getOrderer(results[1]);
            orderer.url.should.equal('grpcs://localhost:8050');
            orderer.pem.should.equal(PEM_TLS_CA_CERTIFICATE);
=======
        it('should create orderer clients for each orderer node with API options', async () => {
            const node: FabricNode = FabricNode.newOrderer(
                'orderer',
                'Orderer',
                `grpc://localhost:8080`,
                'Org1',
                FabricRuntimeUtil.ADMIN_USER,
                'OrdererMSP',
                'myCluster'
            );
            node.api_options = {
                'grpc.default_authority': 'orderer.127-0-0-1.nip.io:8080',
                'grpc.ssl_target_name_override': 'orderer.127-0-0-1.nip.io:8080'
            };
            connection.disconnect();
            await connection.connect([node]);
            const ordererNames: string[] = Array.from(connection['orderers'].keys());
            const ordererValues: Client.Orderer[] = Array.from(connection['orderers'].values());
            ordererNames.should.deep.equal(['Orderer']);
            ordererValues.should.have.lengthOf(1);
            ordererValues[0].should.be.an.instanceOf(Client.Orderer);
            const characteristics: any = ordererValues[0]['getCharacteristics']();
            characteristics.name.should.equal('orderer.127-0-0-1.nip.io:8080');
            characteristics.url.should.equal('grpc://localhost:8080');
        });

        it('should create secure orderer clients for each secure orderer node', async () => {
            const ordererNames: string[] = Array.from(connection['orderers'].keys());
            const ordererValues: Client.Orderer[] = Array.from(connection['orderers'].values());
            ordererNames.should.deep.equal(['orderer.example.com', 'orderer2.example.com']);
            ordererValues.should.have.lengthOf(2);
            ordererValues[1].should.be.an.instanceOf(Client.Orderer);
            const characteristics: any = ordererValues[1]['getCharacteristics']();
            characteristics.name.should.equal('localhost:8050');
            characteristics.url.should.equal('grpcs://localhost:8050');
>>>>>>> 4653e531... Add api_options and chaincode_options to a peer/orderer (resolves #2312)
        });

        it('should create secure orderer clients for each secure orderer node with an SSL target name override', async () => {
            const node: FabricNode = FabricNode.newSecureOrderer(
                'orderer2.example.com',
                'orderer2.example.com',
                `grpcs://localhost:8050`,
                TLS_CA_CERTIFICATE,
                'Org1',
                FabricRuntimeUtil.ADMIN_USER,
                'OrdererMSP',
                'myCluster'
            );
            node.ssl_target_name_override = 'orderer2.example.com';
            connection.disconnect();
            await connection.connect([node]);

            const results: string[] = connection['lifecycle'].getAllOrdererNames();

            results.length.should.equal(1);

            const orderer: ConnectOptions = connection['lifecycle'].getOrderer(results[0]);
            orderer.url.should.equal('grpcs://localhost:8050');
            orderer['ssl-target-name-override'].should.equal('orderer2.example.com');
            orderer.pem.should.equal(PEM_TLS_CA_CERTIFICATE);
        });

        it('should create certificate authority clients for each certificate authority node', async () => {
            const certificateAuthorityNames: string[] = Array.from(connection['certificateAuthorities'].keys());
            const certificateAuthorityValues: FabricCAServices[] = Array.from(connection['certificateAuthorities'].values());
            certificateAuthorityNames.should.deep.equal(['ca.example.com', 'ca2.example.com', 'ca3.example.com']);
            certificateAuthorityValues.should.have.lengthOf(3);
            certificateAuthorityValues[0].should.be.an.instanceOf(FabricCAServices);
            certificateAuthorityValues[0].toString().should.match(/hostname: localhost/);
            certificateAuthorityValues[0].toString().should.match(/port: 7054/);
            certificateAuthorityValues[0].getCaName().should.equal('ca_name');
        });

        it('should create secure certificate authority clients for each secure certificate authority node', async () => {
            const certificateAuthorityNames: string[] = Array.from(connection['certificateAuthorities'].keys());
            const certificateAuthorityValues: FabricCAServices[] = Array.from(connection['certificateAuthorities'].values());
            certificateAuthorityNames.should.deep.equal(['ca.example.com', 'ca2.example.com', 'ca3.example.com']);
            certificateAuthorityValues.should.have.lengthOf(3);
            certificateAuthorityValues[1].should.be.an.instanceOf(FabricCAServices);
            certificateAuthorityValues[1].toString().should.match(/hostname: localhost/);
            certificateAuthorityValues[1].toString().should.match(/port: 8054/);
            certificateAuthorityValues[1].getCaName().should.equal('ca_name');
        });

        it('should create certificate authority clients and use name proptery if ca_name not set', async () => {
            const certificateAuthorityNames: string[] = Array.from(connection['certificateAuthorities'].keys());
            const certificateAuthorityValues: FabricCAServices[] = Array.from(connection['certificateAuthorities'].values());
            certificateAuthorityNames.should.deep.equal(['ca.example.com', 'ca2.example.com', 'ca3.example.com']);
            certificateAuthorityValues.should.have.lengthOf(3);
            certificateAuthorityValues[2].should.be.an.instanceOf(FabricCAServices);
            certificateAuthorityValues[2].toString().should.match(/hostname: localhost/);
            certificateAuthorityValues[2].toString().should.match(/port: 9054/);
            certificateAuthorityValues[2].getCaName().should.equal('ca3.example.com');
        });

        it('should ignore any other nodes', async () => {
            const nodeNames: string[] = Array.from(connection['nodes'].keys());
            nodeNames.should.not.contain('couchdb');
        });

        it('should set the mspids', () => {
            const mspids: string[] = Array.from(connection['mspIDs']);
            mspids.should.deep.equal(['Org1MSP', 'Org2MSP', 'OrdererMSP']);
        });
    });

    describe('disconnect', () => {
        it('should clear all nodes, clients, peers, orderers, and certificate authorities', () => {
            connection.disconnect();
            connection['nodes'].size.should.equal(0);
            should.equal(connection['lifecycle'], null);
            connection['certificateAuthorities'].size.should.equal(0);
        });
    });

    describe('getAllPeerNames', () => {
        it('should get all of the peer names', () => {
            connection.getAllPeerNames().should.deep.equal(['peer0.org1.example.com', 'peer0.org2.example.com', 'peer1.org1.example.com', 'peer2.org1.example.com']);
        });
    });

    describe('createChannelMap', () => {
        let mockPeer1: sinon.SinonStubbedInstance<LifecyclePeer>;
        let mockPeer2: sinon.SinonStubbedInstance<LifecyclePeer>;

        beforeEach(async () => {
            mockPeer1 = mySandBox.createStubInstance(LifecyclePeer);
            mockPeer2 = mySandBox.createStubInstance(LifecyclePeer);

            mockPeer1.getAllChannelNames.resolves(['channel1', 'channel2']);
            mockPeer2.getAllChannelNames.resolves(['channel2']);

            connection['lifecycle']['peers'].clear();
            connection['lifecycle']['peers'].set('peer0.org1.example.com', mockPeer1);
            connection['lifecycle']['peers'].set('peer0.org2.example.com', mockPeer2);
        });

        it('should get all of the channel names, with the list of peers', async () => {
            const channelMap: Map<string, Array<string>> = await connection.createChannelMap();
            channelMap.should.deep.equal(
                new Map<string, Array<string>>(
                    [
                        ['channel1', ['peer0.org1.example.com']],
                        ['channel2', ['peer0.org1.example.com', 'peer0.org2.example.com']]
                    ]
                )
            );
        });

        it('should throw a specific error if gRPC returns an HTTP 503 status code', async () => {
            mockPeer1.getAllChannelNames.rejects(new Error('Received http2 header with status: 503'));
            await connection.createChannelMap()
                .should.be.rejectedWith(/Cannot connect to Fabric/);
        });

        it('should rethrow any other errors', async () => {
            mockPeer2.getAllChannelNames.rejects(new Error('such error'));
            await connection.createChannelMap()
                .should.be.rejectedWith(/such error/);
        });

    });

    describe('getCommittedSmartContracts', () => {
        let getAllCommittedSmartContractsStub: sinon.SinonStub;

        beforeEach(() => {
            getAllCommittedSmartContractsStub = mySandBox.stub(LifecycleChannel.prototype, 'getAllCommittedSmartContracts');
            getAllCommittedSmartContractsStub.resolves([
                {
                    smartContractName: 'myChaincode',
                    smartContractVersion: '0.0.2',
                    sequence: 1
                },
                {
                    smartContractName: 'otherChaincode',
                    smartContractVersion: '0.0.1',
                    sequence: 2
                }
            ]
            );
        });

        it('should return the list of committed smart contracts', async () => {
            const chaincodes: Array<FabricCommittedSmartContract> = await connection.getCommittedSmartContracts(['peer0.org1.example.com'], 'mychannel');
            chaincodes.should.deep.equal([
                {
                    name: 'myChaincode',
                    version: '0.0.2',
                    sequence: 1
                },
                {
                    name: 'otherChaincode',
                    version: '0.0.1',
                    sequence: 2
                }
            ]);
        });

    });

    describe('getAllCommittedSmartContracts', () => {
        let mockPeer1: sinon.SinonStubbedInstance<LifecyclePeer>;
        let mockPeer2: sinon.SinonStubbedInstance<LifecyclePeer>;

        let getAllCommittedSmartContractsStub: sinon.SinonStub;

        beforeEach(() => {
            mockPeer1 = mySandBox.createStubInstance(LifecyclePeer);
            mockPeer2 = mySandBox.createStubInstance(LifecyclePeer);

            mockPeer1.getAllChannelNames.resolves(['channel1', 'channel2']);
            mockPeer2.getAllChannelNames.resolves(['channel2']);

            connection['lifecycle']['peers'].clear();
            connection['lifecycle']['peers'].set('peer0.org1.example.com', mockPeer1);
            connection['lifecycle']['peers'].set('peer0.org2.example.com', mockPeer2);

            getAllCommittedSmartContractsStub = mySandBox.stub(LifecycleChannel.prototype, 'getAllCommittedSmartContracts');
            getAllCommittedSmartContractsStub.onFirstCall().resolves([
                {
                    smartContractName: 'myChaincode',
                    smartContractVersion: '0.0.1',
                    sequence: 1
                },
                {
                    smartContractName: 'otherChaincode',
                    smartContractVersion: '0.0.1',
                    sequence: 2
                }
            ]
            );
            getAllCommittedSmartContractsStub.onSecondCall().resolves([
                {
                    smartContractName: 'myChaincode',
                    smartContractVersion: '0.0.2',
                    sequence: 2
                },
                {
                    smartContractName: 'otherChaincode',
                    smartContractVersion: '0.0.1',
                    sequence: 2
                },
                {
                    smartContractName: 'kittyChaincode',
                    smartContractVersion: '0.0.3',
                    sequence: 1
                }
            ]
            );
        });

        it('should return the list of committed smart contracts on all channels', async () => {
            const smartContracts: Array<FabricCommittedSmartContract> = await connection.getAllCommittedSmartContracts();
            smartContracts.should.deep.equal([
                {
                    name: 'kittyChaincode',
                    version: '0.0.3',
                    sequence: 1
                },
                {
                    name: 'myChaincode',
                    version: '0.0.1',
                    sequence: 1
                },
                {
                    name: 'myChaincode',
                    version: '0.0.2',
                    sequence: 2
                },
                {
                    name: 'otherChaincode',
                    version: '0.0.1',
                    sequence: 2
                }
            ]);
        });

        it('should rethrow any errors', async () => {
            getAllCommittedSmartContractsStub.resetBehavior();
            getAllCommittedSmartContractsStub.rejects(new Error('such error'));
            await connection.getAllCommittedSmartContracts()
                .should.be.rejectedWith(/such error/);
        });
    });

    describe('getAllOrganizationNames', () => {
        it('should get all of the organization names', () => {
            connection.getAllOrganizationNames().should.deep.equal(['OrdererMSP', 'Org1MSP', 'Org2MSP']);
        });
    });

    describe('getAllCertificateAuthorityNames', () => {
        it('should get all of the certificate authority names', () => {
            connection.getAllCertificateAuthorityNames().should.deep.equal(['ca.example.com', 'ca2.example.com', 'ca3.example.com']);
        });
    });

    describe('getInstalledSmartContracts', () => {
        let mockPeer: sinon.SinonStubbedInstance<LifecyclePeer>;

        beforeEach(() => {
            mockPeer = mySandBox.createStubInstance(LifecyclePeer);

            connection['lifecycle']['peers'].clear();
            connection['lifecycle']['peers'].set('peer0.org1.example.com', mockPeer);

            mockPeer.getAllInstalledSmartContracts.resolves([{ label: 'biscuit-network', packageId: 'biscuit-network-12345' }, { label: 'cake-network', packageId: 'cake-network-12345' }]);
        });

        it('should get the install smart contracts', async () => {
            const installedSmartContracts: Array<FabricInstalledSmartContract> = await connection.getInstalledSmartContracts('peer0.org1.example.com');
            installedSmartContracts.length.should.equal(2);
            installedSmartContracts[0].should.deep.equal({ label: 'biscuit-network', packageId: 'biscuit-network-12345' });
            installedSmartContracts[1].should.deep.equal({ label: 'cake-network', packageId: 'cake-network-12345' });
        });

        it('should handle and swallow an access denied error', async () => {
            mockPeer.getAllInstalledSmartContracts.rejects(new Error('wow u cannot see cc cos access denied as u is not an admin'));
            const installedSmartContracts: Array<{ label: string, packageId: string }> = await connection.getInstalledSmartContracts('peer0.org1.example.com');
            installedSmartContracts.length.should.equal(0);
            Array.from(installedSmartContracts.keys()).should.deep.equal([]);
        });

        it('should rethrow any error other than access denied', async () => {
            mockPeer.getAllInstalledSmartContracts.rejects(new Error('wow u cannot see cc cos peer no works'));
            await connection.getInstalledSmartContracts('peer0.org1.example.com').should.be.rejectedWith(/peer no works/);
        });

        it('should throw an error getting installed smart contracts from a peer that does not exist', async () => {
            await connection.getInstalledSmartContracts('nosuch.peer0.org1.example.com')
                .should.be.rejectedWith(/does not exist/);
        });
    });

    describe('getAllOrdererNames', () => {
        it('should get all of the orderer names', () => {
            connection.getAllOrdererNames().should.deep.equal(['orderer.example.com', 'orderer2.example.com']);
        });
    });

    describe('installSmartContract', () => {
        const packagePath: string = path.join(TEST_PACKAGE_DIRECTORY, 'myContract@0.0.1.tar.gz');

        let installSmartContractStub: sinon.SinonStub;

        beforeEach(() => {
            installSmartContractStub = mySandBox.stub(LifecyclePeer.prototype, 'installSmartContractPackage');
        });

        it('should install the smart contract package', async () => {
            const responseStub: any = [[{
                response: {
                    message: 'all good in da hood',
                    status: 200
                }
            }]];
            installSmartContractStub.resolves(responseStub);

            await connection.installSmartContract(packagePath, 'peer0.org1.example.com');
            installSmartContractStub.should.have.been.calledWith(
                sinon.match((buffer: Buffer) => {
                    buffer.should.be.an.instanceOf(Buffer);
                    buffer.length.should.equal(413);
                    return true;
                }),
                90000
            );
        });

        it('should handle error response', async () => {
            const error: Error = new Error('some error');
            installSmartContractStub.rejects(error);

            await connection.installSmartContract(packagePath, 'peer0.org1.example.com').should.be.rejectedWith(/some error/);
            installSmartContractStub.should.have.been.calledWith(
                sinon.match((buffer: Buffer) => {
                    buffer.should.be.an.instanceOf(Buffer);
                    buffer.length.should.equal(413);
                    return true;
                }),
                90000
            );
        });

        it('should handle an error if the smart contract package does not exist', async () => {
            const invalidPackagePath: string = path.join(TEST_PACKAGE_DIRECTORY, 'vscode-pkg-doesnotexist@0.0.1.cds');

            await connection.installSmartContract(invalidPackagePath, 'peer0.org1.example.com')
                .should.have.been.rejectedWith(/ENOENT/);
        });

        it('should handle an error installing the smart contract package', async () => {
            installSmartContractStub.rejects(new Error('such error'));

            await connection.installSmartContract(packagePath, 'peer0.org1.example.com')
                .should.have.been.rejectedWith(/such error/);
        });

        it('should throw an error installing smart contract onto a peer that does not exist', async () => {
            await connection.installSmartContract(packagePath, 'nosuch.peer0.org1.example.com')
                .should.be.rejectedWith(/does not exist/);
        });
    });

    describe('approveSmartContractDefinition', () => {
        it('should approve a smart contract', async () => {
            const approveSmartContractDefinitionStub: sinon.SinonStub = mySandBox.stub(LifecycleChannel.prototype, 'approveSmartContractDefinition');

            await connection.approveSmartContractDefinition('myOrderer', 'myChannel', ['peer0.org1.example.com'], 'myContract', '0.0.1', 'myPackageId', 1);

            approveSmartContractDefinitionStub.should.have.been.calledWith(['peer0.org1.example.com'], 'myOrderer', { smartContractName: 'myContract', smartContractVersion: '0.0.1', packageId: 'myPackageId', sequence: 1 });
        });
    });

    describe('commitSmartContractDefinition', () => {
        it('should commit a smart contract', async () => {
            const commitSmartContractDefinitionStub: sinon.SinonStub = mySandBox.stub(LifecycleChannel.prototype, 'commitSmartContractDefinition');

            await connection.commitSmartContractDefinition('myOrderer', 'myChannel', ['peer0.org1.example.com'], 'myContract', '0.0.1', 1);

            commitSmartContractDefinitionStub.should.have.been.calledWith(['peer0.org1.example.com'], 'myOrderer', { smartContractName: 'myContract', smartContractVersion: '0.0.1', sequence: 1 });
        });
    });

    describe('getCommitReadiness', () => {
        it('should get the commit readiness and return true', async () => {
            const resultMap: Map<string, boolean> = new Map<string, boolean>();
            resultMap.set('org1', true);
            resultMap.set('org2', true);
            const getCommitReadinessStub: sinon.SinonStub = mySandBox.stub(LifecycleChannel.prototype, 'getCommitReadiness').resolves(resultMap);

            const result: boolean = await connection.getCommitReadiness('myChannel', 'peer0.org1.example.com', 'myContract', '0.0.1', 1);

            result.should.equal(true);

            getCommitReadinessStub.should.have.been.calledWith('peer0.org1.example.com', { smartContractName: 'myContract', smartContractVersion: '0.0.1', sequence: 1 });
        });

        it('should get the commit readiness and return false', async () => {
            const resultMap: Map<string, boolean> = new Map<string, boolean>();
            resultMap.set('org1', true);
            resultMap.set('org2', false);
            const getCommitReadinessStub: sinon.SinonStub = mySandBox.stub(LifecycleChannel.prototype, 'getCommitReadiness').resolves(resultMap);

            const result: boolean = await connection.getCommitReadiness('myChannel', 'peer0.org1.example.com', 'myContract', '0.0.1', 1);

            result.should.equal(false);

            getCommitReadinessStub.should.have.been.calledWith('peer0.org1.example.com', { smartContractName: 'myContract', smartContractVersion: '0.0.1', sequence: 1 });
        });
    });

    describe('instantiateChaincode', () => {
        it('should instantiate the specified chaincode', async () => {
            const payload: Buffer = await connection.instantiateChaincode('myChaincode', '0.0.1', ['peer0.org1.example.com', 'peer0.org2.example.com'], 'mychannel', 'instantiate', ['arg1'], path.join('myPath'), undefined);
            payload.should.deep.equal(Buffer.from('TODO'));
        });
    });

    describe('upgradeChaincode', () => {
        it('should upgrade the specified chaincode', async () => {
            const payload: Buffer = await connection.upgradeChaincode('myChaincode', '0.0.1', ['peer0.org1.example.com', 'peer0.org2.example.com'], 'mychannel', 'instantiate', ['arg1'], path.join('myPath'), undefined);
            payload.should.deep.equal(Buffer.from('TODO'));
        });
    });

    describe('enroll', () => {
        beforeEach(() => {
            const mockFabricCA: sinon.SinonStubbedInstance<FabricCAServices> = mySandBox.createStubInstance(FabricCAServices);
            mockFabricCA.enroll.resolves({ certificate: 'myCert', key: { toBytes: mySandBox.stub().returns('myKey') } });
            connection['certificateAuthorities'].has('ca.example.com').should.be.true;
            connection['certificateAuthorities'].set('ca.example.com', mockFabricCA);
        });

        it('should enroll an identity using a certificate authority that exists', async () => {
            const result: { certificate: string, privateKey: string } = await connection.enroll('ca.example.com', 'myId', 'mySecret');
            result.should.deep.equal({ certificate: 'myCert', privateKey: 'myKey' });
        });

        it('should throw trying to enroll an identity using a certificate authority that does not exist', async () => {
            await connection.enroll('nosuch.ca.example.com', 'myId', 'mySecret')
                .should.be.rejectedWith(/does not exist/);
        });

    });

    describe('register', () => {
        let mockFabricCA: sinon.SinonStubbedInstance<FabricCAServices>;
        beforeEach(() => {
            mockFabricCA = mySandBox.createStubInstance(FabricCAServices);
            mockFabricCA.register.resolves('its a secret');
            connection['certificateAuthorities'].has('ca.example.com').should.be.true;
            connection['certificateAuthorities'].set('ca.example.com', mockFabricCA);
        });

        it('should register a new user and return a secret using a certificate authority that exists ', async () => {
            const secret: string = await connection.register('ca.example.com', 'enrollThis', 'departmentE');
            secret.should.deep.equal('its a secret');
            mockFabricCA.register.should.have.been.calledOnceWith({
                enrollmentID: 'enrollThis',
                affiliation: 'departmentE',
                role: 'client',
                attrs: []
            },
                sinon.match.any);
        });

        it('should throw trying to register a new user using a certificate authority that does not exist ', async () => {
            await connection.register('nosuch.ca.example.com', 'enrollThis', 'departmentE')
                .should.be.rejectedWith(/does not exist/);
        });

        it('should be able to register a new user with attribtues', async () => {
            const secret: string = await connection.register('ca.example.com', 'enrollThis', 'departmentE', [{ name: 'hello', value: 'world', ecert: true }]);
            secret.should.deep.equal('its a secret');

            mockFabricCA.register.should.have.been.calledOnceWith({
                enrollmentID: 'enrollThis',
                affiliation: 'departmentE',
                role: 'client',
                attrs: [{ name: 'hello', value: 'world', ecert: true }]
            },
                sinon.match.any);
        });

    });

    describe('getNode', () => {
        it('should return a certificate authority node', () => {
            const node: FabricNode = connection.getNode('ca.example.com');
            node.short_name.should.equal('ca.example.com');
            node.name.should.equal('ca.example.com');
            node.type.should.equal(FabricNodeType.CERTIFICATE_AUTHORITY);
            node.api_url.should.equal('http://localhost:7054');
            node.wallet.should.equal('Org1');
            node.identity.should.equal(FabricRuntimeUtil.ADMIN_USER);
        });

        it('should throw for a node that does not exist', () => {
            ((): void => {
                connection.getNode('nosuch.ca.example.com');
            }).should.throw(/does not exist/);
        });
    });
});
