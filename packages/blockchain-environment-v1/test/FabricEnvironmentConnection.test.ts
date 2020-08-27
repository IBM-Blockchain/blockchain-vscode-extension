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
import * as Client from 'fabric-client';
import * as FabricCAServices from 'fabric-ca-client';
import * as fs from 'fs';
import * as path from 'path';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { ConsoleOutputAdapter, FabricChaincode, FabricNodeType, FabricNode, FabricRuntimeUtil, FabricWalletRegistry, IFabricWallet, LogType, OutputAdapter, FabricEnvironmentRegistry, FabricEnvironmentRegistryEntry, EnvironmentType, FabricWalletGeneratorFactory } from 'ibm-blockchain-platform-common';
import { FabricWallet, FabricWalletGenerator } from 'ibm-blockchain-platform-wallet';

const should: Chai.Should = chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

// tslint:disable no-unused-expression
describe('FabricEnvironmentConnection', () => {
    class TestOutputAdapter extends OutputAdapter {

        public static instance(): TestOutputAdapter {
            return TestOutputAdapter._instance;
        }

        private static _instance: TestOutputAdapter = new TestOutputAdapter();

        private constructor() {
            super();
        }

        public log(type: LogType, popupMessage: string, outputMessage?: string, stackTrace?: string): void {
            super.log(type, popupMessage, outputMessage, stackTrace);
        }
    }

    const TEST_PACKAGE_DIRECTORY: string = path.join(path.dirname(__dirname), 'test', 'data', 'packages');
    const TLS_CA_CERTIFICATE: string = fs.readFileSync(path.resolve(__dirname, 'data', 'certs', 'ca-org1-example-com-17054.pem')).toString('base64');

    let mySandBox: sinon.SinonSandbox;
    let mockLocalWallet: sinon.SinonStubbedInstance<IFabricWallet>;
    let connection: FabricEnvironmentConnection;
    let nodes: FabricNode[];

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
        mockLocalWallet = mySandBox.createStubInstance(FabricWallet);
        mockLocalWallet['setUserContext'] = mySandBox.stub();
        // We need this even though the code is affected by AnsibleEnvironment.ts.
        // Somehow `getWalletsAndIdentities()` is being called.
        mockLocalWallet.getIdentities.resolves([]);
        mockFabricWalletGenerator.resolves(mockLocalWallet);

        connection = new FabricEnvironmentConnection(FabricRuntimeUtil.LOCAL_FABRIC);
        await connection.connect(nodes);
    });

    afterEach(() => {
        mySandBox.restore();
    });

    describe('constructor', () => {
        it('should default to the console output adapter', () => {
            connection = new FabricEnvironmentConnection(FabricRuntimeUtil.LOCAL_FABRIC);
            connection['outputAdapter'].should.be.an.instanceOf(ConsoleOutputAdapter);
            connection['environmentName'].should.equal(FabricRuntimeUtil.LOCAL_FABRIC);
        });

        it('should accept another output adapter', () => {
            connection = new FabricEnvironmentConnection(FabricRuntimeUtil.LOCAL_FABRIC, TestOutputAdapter.instance());
            connection['outputAdapter'].should.be.an.instanceOf(TestOutputAdapter);
            connection['environmentName'].should.equal(FabricRuntimeUtil.LOCAL_FABRIC);
        });
    });

    describe('connect', () => {
        it('should create peer clients for each peer node', async () => {
            const peerNames: string[] = Array.from(connection['peers'].keys());
            const peerValues: Client.Peer[] = Array.from(connection['peers'].values());
            peerNames.should.deep.equal(['peer0.org1.example.com', 'peer1.org1.example.com', 'peer2.org1.example.com', 'peer0.org2.example.com']);
            peerValues.should.have.lengthOf(4);
            peerValues[0].should.be.an.instanceOf(Client.Peer);
            const characteristics: any = peerValues[0]['getCharacteristics']();
            characteristics.name.should.equal('localhost:7051');
            characteristics.url.should.equal('grpc://localhost:7051');
        });

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
            peerNames.should.deep.equal(['peer0.org1.example.com', 'peer1.org1.example.com', 'peer2.org1.example.com', 'peer0.org2.example.com']);
            peerValues.should.have.lengthOf(4);
            peerValues[3].should.be.an.instanceOf(Client.Peer);
            const characteristics: any = peerValues[3]['getCharacteristics']();
            characteristics.name.should.equal('localhost:8051');
            characteristics.url.should.equal('grpcs://localhost:8051');
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
            const peerNames: string[] = Array.from(connection['peers'].keys());
            const peerValues: Client.Peer[] = Array.from(connection['peers'].values());
            peerNames.should.deep.equal(['peer0.org2.example.com']);
            peerValues.should.have.lengthOf(1);
            const characteristics: any = peerValues[0]['getCharacteristics']();
            characteristics.name.should.equal('localhost:8051');
            characteristics.url.should.equal('grpcs://localhost:8051');
            characteristics.options['grpc.ssl_target_name_override'].should.equal('peer0.org2.example.com');
        });

        it('should create orderer clients for each orderer node', async () => {
            const ordererNames: string[] = Array.from(connection['orderers'].keys());
            const ordererValues: Client.Orderer[] = Array.from(connection['orderers'].values());
            ordererNames.should.deep.equal(['orderer.example.com', 'orderer2.example.com']);
            ordererValues.should.have.lengthOf(2);
            ordererValues[0].should.be.an.instanceOf(Client.Orderer);
            const characteristics: any = ordererValues[0]['getCharacteristics']();
            characteristics.name.should.equal('localhost:7050');
            characteristics.url.should.equal('grpc://localhost:7050');
        });

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
            const ordererNames: string[] = Array.from(connection['orderers'].keys());
            const ordererValues: Client.Orderer[] = Array.from(connection['orderers'].values());
            ordererNames.should.deep.equal(['orderer2.example.com']);
            ordererValues.should.have.lengthOf(1);
            ordererValues[0].should.be.an.instanceOf(Client.Orderer);
            const characteristics: any = ordererValues[0]['getCharacteristics']();
            characteristics.name.should.equal('localhost:8050');
            characteristics.url.should.equal('grpcs://localhost:8050');
            characteristics.options['grpc.ssl_target_name_override'].should.equal('orderer2.example.com');
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
            should.equal(connection['client'], null);
            connection['peers'].size.should.equal(0);
            connection['orderers'].size.should.equal(0);
            connection['certificateAuthorities'].size.should.equal(0);
        });
    });

    describe('getAllPeerNames', () => {
        it('should get all of the peer names', () => {
            connection.getAllPeerNames().should.deep.equal(['peer0.org1.example.com', 'peer0.org2.example.com', 'peer1.org1.example.com', 'peer2.org1.example.com']);
        });
    });

    describe('createChannelMap', () => {
        let mockPeer1: sinon.SinonStubbedInstance<Client.Peer>;
        let mockPeer2: sinon.SinonStubbedInstance<Client.Peer>;
        let queryChannelsStub: sinon.SinonStub;
        let getChannelConfigStub: sinon.SinonStub;
        let getChannelCapabilitiesStub: sinon.SinonStub;

        beforeEach(async () => {
            mockPeer1 = mySandBox.createStubInstance(Client.Peer);
            mockPeer2 = mySandBox.createStubInstance(Client.Peer);
            getChannelConfigStub = mySandBox.stub(Client.Channel.prototype, 'getChannelConfig').resolves();
            getChannelCapabilitiesStub = mySandBox.stub(Client.Channel.prototype, 'getChannelCapabilities').returns(['V1_4_3']);
            connection['peers'].has('peer0.org1.example.com').should.be.true;
            connection['peers'].set('peer0.org1.example.com', mockPeer1);
            connection['peers'].has('peer0.org2.example.com').should.be.true;
            connection['peers'].set('peer0.org2.example.com', mockPeer2);
            queryChannelsStub = mySandBox.stub(connection['client'], 'queryChannels').resolves({ channels: [] });
            queryChannelsStub.withArgs(sinon.match.same(mockPeer1)).resolves({
                channels: [
                    { channel_id: 'channel1' },
                    { channel_id: 'channel2' }
                ]
            });
            queryChannelsStub.withArgs(sinon.match.same(mockPeer2)).resolves({
                channels: [
                    { channel_id: 'channel2' }
                ]
            });
        });

        it('should get all of the channel names, with the list of peers', async () => {
            const createChannelsResult: {channelMap: Map<string, string[]>, v2channels: string[]}  = await connection.createChannelMap();

            createChannelsResult.channelMap.should.deep.equal(
                new Map<string, Array<string>>(
                    [
                        ['channel1', ['peer0.org1.example.com']],
                        ['channel2', ['peer0.org1.example.com', 'peer0.org2.example.com']]
                    ]
                )
            );
            getChannelConfigStub.should.have.been.calledThrice;
            getChannelCapabilitiesStub.should.have.been.calledThrice;
        });

        it('should get only the V1 channel names, with the list of peers', async () => {
            getChannelCapabilitiesStub.onFirstCall().returns(['V2_0']);             // peer 1 channel 1
            getChannelCapabilitiesStub.onSecondCall().returns(['V1_4_3']);          // peer 1 channel 2
            getChannelCapabilitiesStub.onThirdCall().returns(['V1_4_3']);           // peer 2 channel 2
            const createChannelsResult: {channelMap: Map<string, string[]>, v2channels: string[]}  = await connection.createChannelMap();
            const channelMap: Map<string, Array<string>> = createChannelsResult.channelMap;
            channelMap.should.deep.equal(
                new Map<string, Array<string>>(
                    [
                        ['channel2', ['peer0.org1.example.com', 'peer0.org2.example.com']]
                    ]
                )
            );
            getChannelConfigStub.should.have.been.calledThrice;
            getChannelCapabilitiesStub.should.have.been.calledThrice;
        });

        it('should throw error if none of the channels is using v1 capabilities', async () => {
            getChannelCapabilitiesStub.returns(['V2_0']);

            await connection.createChannelMap().should.be.rejectedWith(/There are no channels with V1 capabilities enabled./);
            getChannelConfigStub.should.have.been.calledThrice;
            getChannelCapabilitiesStub.should.have.been.calledThrice;
        });

        it('should throw a specific error if gRPC returns an HTTP 503 status code', async () => {
            queryChannelsStub.withArgs(sinon.match.same(mockPeer1)).rejects(new Error('Received http2 header with status: 503'));
            await connection.createChannelMap()
                .should.be.rejectedWith(/Cannot connect to Fabric/);
        });

        it('should rethrow any other errors', async () => {
            queryChannelsStub.withArgs(sinon.match.same(mockPeer2)).rejects(new Error('such error'));
            await connection.createChannelMap()
                .should.be.rejectedWith(/such error/);
        });

    });

    describe('getInstantiatedChaincode', () => {
        let channel: Client.Channel;
        let queryInstantiatedChaincodesStub: sinon.SinonStub;

        beforeEach(() => {
            mySandBox.stub(connection['client'], 'newTransactionID').returns({
                getTransactionID: mySandBox.stub().returns('1234')
            });
            channel = connection['getOrCreateChannel']('mychannel');
            queryInstantiatedChaincodesStub = mySandBox.stub(channel, 'queryInstantiatedChaincodes');
            queryInstantiatedChaincodesStub.resolves({
                chaincodes: [
                    {
                        name: 'myChaincode',
                        version: '0.0.2'
                    },
                    {
                        name: 'otherChaincode',
                        version: '0.0.1'
                    }
                ]
            });
        });

        it('should return the list of instantiated chaincodes', async () => {
            const chaincodes: Array<FabricChaincode> = await connection.getInstantiatedChaincode(['peer0.org1.example.com'], 'mychannel');
            chaincodes.should.deep.equal([
                {
                    name: 'myChaincode',
                    version: '0.0.2'
                },
                {
                    name: 'otherChaincode',
                    version: '0.0.1'
                }
            ]);
        });

    });

    describe('getAllInstantiatedChaincodes', () => {
        let mockPeer1: sinon.SinonStubbedInstance<Client.Peer>;
        let mockPeer2: sinon.SinonStubbedInstance<Client.Peer>;
        let queryChannelsStub: sinon.SinonStub;
        let channel1: Client.Channel;
        let channel2: Client.Channel;
        let queryInstantiatedChaincodesStub1: sinon.SinonStub;
        let queryInstantiatedChaincodesStub2: sinon.SinonStub;
        let getChannelConfigStub: sinon.SinonStub;
        let getChannelCapabilitiesStub: sinon.SinonStub;

        beforeEach(() => {
            mockPeer1 = mySandBox.createStubInstance(Client.Peer);
            mockPeer2 = mySandBox.createStubInstance(Client.Peer);
            getChannelConfigStub = mySandBox.stub(Client.Channel.prototype, 'getChannelConfig').resolves();
            getChannelCapabilitiesStub = mySandBox.stub(Client.Channel.prototype, 'getChannelCapabilities').returns(['V1_4_3']);
            connection['peers'].has('peer0.org1.example.com').should.be.true;
            connection['peers'].set('peer0.org1.example.com', mockPeer1);
            connection['peers'].has('peer0.org2.example.com').should.be.true;
            connection['peers'].set('peer0.org2.example.com', mockPeer2);
            queryChannelsStub = mySandBox.stub(connection['client'], 'queryChannels').resolves({ channels: [] });
            queryChannelsStub.withArgs(sinon.match.same(mockPeer1)).resolves({
                channels: [
                    { channel_id: 'channel1' },
                    { channel_id: 'channel2' }
                ]
            });
            queryChannelsStub.withArgs(sinon.match.same(mockPeer2)).resolves({
                channels: [
                    { channel_id: 'channel2' }
                ]
            });
            mySandBox.stub(connection['client'], 'newTransactionID').returns({
                getTransactionID: mySandBox.stub().returns('1234')
            });
            channel1 = connection['getOrCreateChannel']('channel1');
            channel2 = connection['getOrCreateChannel']('channel2');
            queryInstantiatedChaincodesStub1 = mySandBox.stub(channel1, 'queryInstantiatedChaincodes');
            queryInstantiatedChaincodesStub1.resolves({
                chaincodes: [
                    {
                        name: 'myChaincode',
                        version: '0.0.2'
                    },
                    {
                        name: 'otherChaincode',
                        version: '0.0.1'
                    }
                ]
            });
            queryInstantiatedChaincodesStub2 = mySandBox.stub(channel2, 'queryInstantiatedChaincodes');
            queryInstantiatedChaincodesStub2.resolves({
                chaincodes: [
                    {
                        name: 'myChaincode',
                        version: '0.0.1'
                    },
                    {
                        name: 'otherChaincode',
                        version: '0.0.1'
                    },
                    {
                        name: 'kittyChaincode',
                        version: '0.0.3'
                    }
                ]
            });
        });

        it('should return the list of instantiated chaincodes on all channels', async () => {
            const chaincodes: Array<FabricChaincode> = await connection.getAllInstantiatedChaincodes();
            chaincodes.should.deep.equal([
                {
                    name: 'kittyChaincode',
                    version: '0.0.3'
                },
                {
                    name: 'myChaincode',
                    version: '0.0.1'
                },
                {
                    name: 'myChaincode',
                    version: '0.0.2'
                },
                {
                    name: 'otherChaincode',
                    version: '0.0.1'
                }
            ]);
            getChannelConfigStub.should.have.been.called;
            getChannelCapabilitiesStub.should.have.been.called;
        });

        it('should rethrow any errors', async () => {
            queryInstantiatedChaincodesStub1.rejects(new Error('such error'));
            await connection.getAllInstantiatedChaincodes()
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

    describe('getInstalledChaincode', () => {
        let mockPeer: sinon.SinonStubbedInstance<Client.Peer>;
        let queryInstalledChaincodesStub: sinon.SinonStub;

        beforeEach(() => {
            mockPeer = mySandBox.createStubInstance(Client.Peer);
            connection['peers'].has('peer0.org1.example.com').should.be.true;
            connection['peers'].set('peer0.org1.example.com', mockPeer);
            queryInstalledChaincodesStub = mySandBox.stub(connection['client'], 'queryInstalledChaincodes');
            queryInstalledChaincodesStub.withArgs(mockPeer).resolves({
                chaincodes: [
                    {
                        name: 'biscuit-network',
                        version: '0.7'
                    },
                    {
                        name: 'biscuit-network',
                        version: '0.8'
                    },
                    {
                        name: 'cake-network',
                        version: '0.8'
                    }
                ]
            });
        });

        it('should get the install chaincode', async () => {
            const installedChaincode: Map<string, Array<string>> = await connection.getInstalledChaincode('peer0.org1.example.com');
            installedChaincode.size.should.equal(2);
            Array.from(installedChaincode.keys()).should.deep.equal(['biscuit-network', 'cake-network']);
            installedChaincode.get('biscuit-network').should.deep.equal(['0.7', '0.8']);
            installedChaincode.get('cake-network').should.deep.equal(['0.8']);
        });

        it('should handle and swallow an access denied error', async () => {
            queryInstalledChaincodesStub.withArgs(mockPeer).rejects(new Error('wow u cannot see cc cos access denied as u is not an admin'));
            const installedChaincode: Map<string, Array<string>> = await connection.getInstalledChaincode('peer0.org1.example.com');
            installedChaincode.size.should.equal(0);
            Array.from(installedChaincode.keys()).should.deep.equal([]);
        });

        it('should rethrow any error other than access denied', async () => {
            queryInstalledChaincodesStub.withArgs(mockPeer).rejects(new Error('wow u cannot see cc cos peer no works'));
            await connection.getInstalledChaincode('peer0.org1.example.com').should.be.rejectedWith(/peer no works/);
        });

        it('should throw an error getting installed chaincodes from a peer that does not exist', async () => {
            await connection.getInstalledChaincode('nosuch.peer0.org1.example.com')
                .should.be.rejectedWith(/does not exist/);
        });
    });

    describe('getAllOrdererNames', () => {
        it('should get all of the orderer names', () => {
            connection.getAllOrdererNames().should.deep.equal(['orderer.example.com', 'orderer2.example.com']);
        });
    });

    describe('installChaincode', () => {
        const packagePath: string = path.join(TEST_PACKAGE_DIRECTORY, 'vscode-pkg-1@0.0.1.cds');

        let mockPeer: sinon.SinonStubbedInstance<Client.Peer>;
        let installChaincodeStub: sinon.SinonStub;

        beforeEach(() => {
            mockPeer = mySandBox.createStubInstance(Client.Peer);
            connection['peers'].has('peer0.org1.example.com').should.be.true;
            connection['peers'].set('peer0.org1.example.com', mockPeer);
            mySandBox.stub(connection['client'], 'newTransactionID').returns({
                getTransactionID: mySandBox.stub().returns('1234')
            });
            installChaincodeStub = mySandBox.stub(connection['client'], 'installChaincode');
        });

        it('should install the chaincode package', async () => {
            const responseStub: any = [[{
                response: {
                    message: 'all good in da hood',
                    status: 200
                }
            }]];
            installChaincodeStub.resolves(responseStub);

            await connection.installChaincode(packagePath, 'peer0.org1.example.com');
            installChaincodeStub.should.have.been.calledWith({
                targets: [mockPeer],
                txId: sinon.match.any,
                chaincodePackage: sinon.match((buffer: Buffer) => {
                    buffer.should.be.an.instanceOf(Buffer);
                    buffer.length.should.equal(2719);
                    return true;
                })
            });
        });

        it('should handle error response', async () => {
            const responseStub: any = [[new Error('some error')]];
            installChaincodeStub.resolves(responseStub);

            await connection.installChaincode(packagePath, 'peer0.org1.example.com').should.be.rejectedWith(/some error/);
            installChaincodeStub.should.have.been.calledWith({
                targets: [mockPeer],
                txId: sinon.match.any,
                chaincodePackage: sinon.match((buffer: Buffer) => {
                    buffer.should.be.an.instanceOf(Buffer);
                    buffer.length.should.equal(2719);
                    return true;
                })
            });
        });

        it('should handle failed response', async () => {
            const responseStub: any = [[{
                response: {
                    message: 'some error',
                    status: 400
                }
            }]];
            installChaincodeStub.resolves(responseStub);

            await connection.installChaincode(packagePath, 'peer0.org1.example.com').should.be.rejectedWith('some error');
            installChaincodeStub.should.have.been.calledWith({
                targets: [mockPeer],
                txId: sinon.match.any,
                chaincodePackage: sinon.match((buffer: Buffer) => {
                    buffer.should.be.an.instanceOf(Buffer);
                    buffer.length.should.equal(2719);
                    return true;
                })
            });
        });

        it('should handle an error if the chaincode package does not exist', async () => {
            const invalidPackagePath: string = path.join(TEST_PACKAGE_DIRECTORY, 'vscode-pkg-doesnotexist@0.0.1.cds');

            await connection.installChaincode(invalidPackagePath, 'peer0.org1.example.com')
                .should.have.been.rejectedWith(/ENOENT/);
        });

        it('should handle an error installing the chaincode package', async () => {
            installChaincodeStub.rejects(new Error('such error'));

            await connection.installChaincode(packagePath, 'peer0.org1.example.com')
                .should.have.been.rejectedWith(/such error/);
        });

        it('should throw an error installing chaincode onto a peer that does not exist', async () => {
            await connection.installChaincode(packagePath, 'nosuch.peer0.org1.example.com')
                .should.be.rejectedWith(/does not exist/);
        });

    });

    describe('instantiateChaincode', () => {
        let channel: Client.Channel;
        let mockPeer1: sinon.SinonStubbedInstance<Client.Peer>;
        let mockPeer2: sinon.SinonStubbedInstance<Client.Peer>;
        let mockOrderer: sinon.SinonStubbedInstance<Client.Orderer>;
        let queryInstantiatedChaincodesStub: sinon.SinonStub;
        let loadConfigEnvelopeStub: sinon.SinonStub;
        let sendInstantiateProposalStub: sinon.SinonStub;
        let sendTransactionStub: sinon.SinonStub;
        let mockEventHub: sinon.SinonStubbedInstance<Client.ChannelEventHub>;
        let outputSpy: sinon.SinonSpy;
        let getInstalledChaincodeStub: sinon.SinonStub;

        beforeEach(() => {
            mySandBox.stub(connection['client'], 'newTransactionID').returns({
                getTransactionID: mySandBox.stub().returns('1234')
            });
            channel = connection['getOrCreateChannel']('mychannel');

            const chaincodeMap: Map<string, string[]> = new Map<string, string[]>();
            chaincodeMap.set('myChaincode', ['0.0.1']);
            getInstalledChaincodeStub = mySandBox.stub(connection, 'getInstalledChaincode').resolves(chaincodeMap);

            queryInstantiatedChaincodesStub = mySandBox.stub(channel, 'queryInstantiatedChaincodes');
            queryInstantiatedChaincodesStub.resolves({
                chaincodes: [
                    {
                        name: 'otherChaincode',
                        version: '0.0.1'
                    }
                ]
            });
            mySandBox.stub(channel, 'getChannelConfig').resolves({ config: 'envelope' });
            loadConfigEnvelopeStub = mySandBox.stub(channel, 'loadConfigEnvelope');
            loadConfigEnvelopeStub.returns({ orderers: ['orderer.example.com:7050'] });
            sendInstantiateProposalStub = mySandBox.stub(channel, 'sendInstantiateProposal');
            sendInstantiateProposalStub.resolves([
                [
                    {
                        response: {
                            payload: Buffer.from(''),
                            status: 200
                        }
                    }
                ],
                {
                    proposal: true
                }
            ]);
            sendTransactionStub = mySandBox.stub(channel, 'sendTransaction');
            sendTransactionStub.resolves({
                status: 'SUCCESS'
            });
            mockEventHub = mySandBox.createStubInstance(Client.ChannelEventHub);
            mySandBox.stub(channel, 'newChannelEventHub').returns(mockEventHub);
            mockEventHub.connect.yields(null);
            mockEventHub.registerTxEvent.callsFake((txId: string, callback: any, errorCallback: any): void => {
                callback(txId, 'VALID', 1);
                errorCallback(null);
            });
            outputSpy = mySandBox.spy(connection['outputAdapter'], 'log');
            mockPeer1 = mySandBox.createStubInstance(Client.Peer);
            mockPeer1.getUrl.returns('grpc://localhost:7051');
            mockPeer2 = mySandBox.createStubInstance(Client.Peer);
            mockPeer2.getUrl.returns('grpcs://localhost:8051');
            mockOrderer = mySandBox.createStubInstance(Client.Orderer);
            mockOrderer.getName.returns('orderer.example.com:7050');
            connection['peers'].has('peer0.org1.example.com').should.be.true;
            connection['peers'].set('peer0.org1.example.com', mockPeer1);
            connection['peers'].has('peer0.org2.example.com').should.be.true;
            connection['peers'].set('peer0.org2.example.com', mockPeer2);
            connection['orderers'].has('orderer.example.com').should.be.true;
            connection['orderers'].set('orderer.example.com', mockOrderer);
        });

        it('should instantiate the specified chaincode with a remote orderer', async () => {
            mockPeer1.getUrl.returns('grpc://localhost:7051');
            mockPeer2.getUrl.returns('grpcs://peer0.org2.example.com:8051');
            mockOrderer.getName.returns('orderer.example.com:7050');
            const payload: Buffer = await connection.instantiateChaincode('myChaincode', '0.0.1', ['peer0.org1.example.com', 'peer0.org2.example.com'], 'mychannel', 'instantiate', ['arg1'], path.join('myPath'), undefined);
            should.equal(payload, null);
            sendInstantiateProposalStub.should.have.been.calledOnceWithExactly({
                'targets': [sinon.match.any, sinon.match.any],
                'chaincodeId': 'myChaincode',
                'chaincodeVersion': '0.0.1',
                'txId': sinon.match.any,
                'fcn': 'instantiate',
                'args': ['arg1'],
                'collections-config': path.join('myPath'),
                'endorsement-policy': undefined
            }, 5 * 60 * 1000);
            sendTransactionStub.should.have.been.calledOnceWithExactly({ proposal: sinon.match.any, proposalResponses: sinon.match.any, orderer: mockOrderer, txId: sinon.match.any });
            mockEventHub.registerTxEvent.should.have.been.calledOnce;
            outputSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `Instantiating with function: 'instantiate' and arguments: 'arg1'`);
        });

        it('should instantiate the specified chaincode with a local orderer', async () => {
            mockPeer1.getUrl.returns('grpc://localhost:7051');
            mockPeer2.getUrl.returns('grpcs://localhost:8051');
            mockOrderer.getName.returns('localhost:7050');
            const payload: Buffer = await connection.instantiateChaincode('myChaincode', '0.0.1', ['peer0.org1.example.com', 'peer0.org2.example.com'], 'mychannel', 'instantiate', ['arg1'], path.join('myPath'), undefined);
            should.equal(payload, null);
            sendInstantiateProposalStub.should.have.been.calledOnceWithExactly({
                'targets': [sinon.match.any, sinon.match.any],
                'chaincodeId': 'myChaincode',
                'chaincodeVersion': '0.0.1',
                'txId': sinon.match.any,
                'fcn': 'instantiate',
                'args': ['arg1'],
                'collections-config': path.join('myPath'),
                'endorsement-policy': undefined
            }, 5 * 60 * 1000);
            sendTransactionStub.should.have.been.calledOnceWithExactly({ proposal: sinon.match.any, proposalResponses: sinon.match.any, orderer: mockOrderer, txId: sinon.match.any });
            mockEventHub.registerTxEvent.should.have.been.calledOnce;
            outputSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `Instantiating with function: 'instantiate' and arguments: 'arg1'`);
        });

        it('should instantiate the specified chaincode and return the payload', async () => {
            sendInstantiateProposalStub.resolves([
                [
                    {
                        response: {
                            payload: Buffer.from('hello world'),
                            status: 200
                        }
                    }
                ],
                {
                    proposal: true
                }
            ]);
            const payload: Buffer = await connection.instantiateChaincode('myChaincode', '0.0.1', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1'], path.join('myPath'), undefined);
            payload.toString().should.equal('hello world');
            sendInstantiateProposalStub.should.have.been.calledOnceWithExactly({
                'targets': [sinon.match.any],
                'chaincodeId': 'myChaincode',
                'chaincodeVersion': '0.0.1',
                'txId': sinon.match.any,
                'fcn': 'instantiate',
                'args': ['arg1'],
                'collections-config': path.join('myPath'),
                'endorsement-policy': undefined
            }, 5 * 60 * 1000);
            sendTransactionStub.should.have.been.calledOnce;
            mockEventHub.registerTxEvent.should.have.been.calledOnce;
            outputSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `Instantiating with function: 'instantiate' and arguments: 'arg1'`);
        });

        it('should only instantiate with peers with the correct name and version installed', async () => {
            const chaincodeMap: Map<string, string[]> = new Map<string, string[]>();
            chaincodeMap.set('myChaincode', ['0.0.1']);
            getInstalledChaincodeStub.onFirstCall().resolves(chaincodeMap);

            const chaincodeMap1: Map<string, string[]> = new Map<string, string[]>();
            chaincodeMap1.set('otherChaincode', ['0.0.1']);
            getInstalledChaincodeStub.onSecondCall().resolves(chaincodeMap1);

            const chaincodeMap2: Map<string, string[]> = new Map<string, string[]>();
            chaincodeMap2.set('myChaincode', ['0.0.2']);
            getInstalledChaincodeStub.onThirdCall().resolves(chaincodeMap2);

            const payload: Buffer = await connection.instantiateChaincode('myChaincode', '0.0.1', ['peer0.org1.example.com', 'peer1.org1.example.com', 'peer2.org1.example.com'], 'mychannel', 'instantiate', ['arg1'], path.join('myPath'), undefined);
            should.equal(payload, null);

            const peer: Client.Peer = connection['getPeer']('peer0.org1.example.com');

            sendInstantiateProposalStub.should.have.been.calledOnceWithExactly({
                'targets': [peer],
                'chaincodeId': 'myChaincode',
                'chaincodeVersion': '0.0.1',
                'txId': sinon.match.any,
                'fcn': 'instantiate',
                'args': ['arg1'],
                'collections-config': path.join('myPath'),
                'endorsement-policy': undefined

            }, 5 * 60 * 1000);
            sendTransactionStub.should.have.been.calledOnce;
            mockEventHub.registerTxEvent.should.have.been.calledOnce;
            outputSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `Instantiating with function: 'instantiate' and arguments: 'arg1'`);
        });

        it('should throw an error if the specified chaincode is already instantiated', async () => {
            await connection.instantiateChaincode('otherChaincode', '0.0.1', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1'], path.join('myPath'), undefined)
                .should.be.rejectedWith(/The smart contract otherChaincode is already instantiated on the channel mychannel/);
        });

        it('should throw an error if a peer returns an error as a proposal response', async () => {
            sendInstantiateProposalStub.resolves([
                [
                    new Error('such error')
                ],
                {
                    proposal: true
                }
            ]);
            await connection.instantiateChaincode('myChaincode', '0.0.1', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1'], path.join('myPath'), undefined)
                .should.be.rejectedWith(/such error/);
        });

        it('should throw an error if a peer returns a failed proposal response', async () => {
            sendInstantiateProposalStub.resolves([
                [
                    {
                        response: {
                            message: 'such error',
                            status: 400
                        }
                    }
                ],
                {
                    proposal: true
                }
            ]);
            await connection.instantiateChaincode('myChaincode', '0.0.1', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1'], path.join('myPath'), undefined)
                .should.be.rejectedWith(/such error/);
        });

        it('should throw an error if the orderer rejects the transaction', async () => {
            sendTransactionStub.resolves({
                status: 'FAILURE'
            });
            await connection.instantiateChaincode('myChaincode', '0.0.1', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1'], path.join('myPath'), undefined)
                .should.be.rejectedWith(/Response status: FAILURE/);
        });

        it('should throw an error if the event hub fails to connect before the transaction is committed', async () => {
            mockEventHub.connect.yields(new Error('such connect error'));
            await connection.instantiateChaincode('myChaincode', '0.0.1', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1'], path.join('myPath'), undefined)
                .should.be.rejectedWith(/such connect error/);
        });

        it('should throw an error if the event hub disconnects before the transaction is committed', async () => {
            mockEventHub.registerTxEvent.callsFake((_1: string, _2: void, errorCallback: any): void => {
                errorCallback(new Error('such connect error'));
            });
            await connection.instantiateChaincode('myChaincode', '0.0.1', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1'], path.join('myPath'), undefined)
                .should.be.rejectedWith(/such connect error/);
        });

        it('should throw an error if the transaction is rejected at validation time', async () => {
            mockEventHub.registerTxEvent.callsFake((txId: string, callback: any): void => {
                callback(txId, 'INVALID', 1);
            });
            await connection.instantiateChaincode('myChaincode', '0.0.1', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1'], path.join('myPath'), undefined)
                .should.be.rejectedWith(/with code INVALID in block 1/);
        });

        it('should throw an error if the orderer in the channel configuration is not known and all the peers are not local', async () => {
            mockPeer1.getUrl.returns('grpc://localhost:7051');
            mockPeer2.getUrl.returns('grpcs://peer0.org2.example.com:8051');
            loadConfigEnvelopeStub.returns({ orderers: ['nosuchorderer.example.com'] });
            await connection.instantiateChaincode('myChaincode', '0.0.1', ['peer0.org1.example.com', 'peer0.org2.example.com'], 'mychannel', 'instantiate', ['arg1'], path.join('myPath'), undefined)
                .should.be.rejectedWith(/Failed to find Fabric orderer\(s\) nosuchorderer.example.com for channel mychannel/);
        });

        it('should throw an error if the orderer in the channel configuration is not known and all the peers are not local', async () => {
            mockPeer1.getUrl.returns('grpc://localhost:7051');
            mockPeer2.getUrl.returns('grpcs://peer0.org2.example.com:8051');
            loadConfigEnvelopeStub.returns({ orderers: ['nosuchorderer.example.com'] });
            await connection.instantiateChaincode('myChaincode', '0.0.1', ['peer0.org1.example.com', 'peer0.org2.example.com'], 'mychannel', 'instantiate', ['arg1'], path.join('myPath'), undefined)
                .should.be.rejectedWith(/Failed to find Fabric orderer\(s\) nosuchorderer.example.com for channel mychannel/);
        });

        it('should throw an error if the orderer in the channel configuration is not known and the peers are a mix of local and not local', async () => {
            mockPeer1.getUrl.returns('grpc://localhost:7051');
            mockPeer2.getUrl.returns('grpcs://localhost:8051');
            loadConfigEnvelopeStub.returns({ orderers: ['nosuchorderer.example.com'] });
            await connection.instantiateChaincode('myChaincode', '0.0.1', ['peer0.org1.example.com', 'peer0.org2.example.com'], 'mychannel', 'instantiate', ['arg1'], path.join('myPath'), undefined)
                .should.be.rejectedWith(/Failed to find Fabric orderer\(s\) nosuchorderer.example.com for channel mychannel/);
        });

        it('should throw an error if the orderer in the channel configuration is not known and all the peers are local', async () => {
            mockPeer1.getUrl.returns('grpc://localhost:7051');
            mockPeer2.getUrl.returns('grpcs://localhost:8051');
            loadConfigEnvelopeStub.returns({ orderers: ['nosuchorderer.example.com'] });
            await connection.instantiateChaincode('myChaincode', '0.0.1', ['peer0.org1.example.com', 'peer0.org2.example.com'], 'mychannel', 'instantiate', ['arg1'], path.join('myPath'), undefined)
                .should.be.rejectedWith(/Failed to find Fabric orderer\(s\) nosuchorderer.example.com for channel mychannel/);
        });

    });

    describe('upgradeChaincode', () => {
        let channel: Client.Channel;
        let mockPeer1: sinon.SinonStubbedInstance<Client.Peer>;
        let mockPeer2: sinon.SinonStubbedInstance<Client.Peer>;
        let mockOrderer: sinon.SinonStubbedInstance<Client.Orderer>;
        let queryInstantiatedChaincodesStub: sinon.SinonStub;
        let loadConfigEnvelopeStub: sinon.SinonStub;
        let sendUpgradeProposalStub: sinon.SinonStub;
        let sendTransactionStub: sinon.SinonStub;
        let mockEventHub: sinon.SinonStubbedInstance<Client.ChannelEventHub>;
        let outputSpy: sinon.SinonSpy;
        let getInstalledChaincodeStub: sinon.SinonStub;

        beforeEach(() => {
            mySandBox.stub(connection['client'], 'newTransactionID').returns({
                getTransactionID: mySandBox.stub().returns('1234')
            });
            channel = connection['getOrCreateChannel']('mychannel');
            queryInstantiatedChaincodesStub = mySandBox.stub(channel, 'queryInstantiatedChaincodes');
            queryInstantiatedChaincodesStub.resolves({
                chaincodes: [
                    {
                        name: 'myChaincode',
                        version: '0.0.1'
                    }
                ]
            });

            const chaincodeMap: Map<string, string[]> = new Map<string, string[]>();
            chaincodeMap.set('myChaincode', ['0.0.2']);
            getInstalledChaincodeStub = mySandBox.stub(connection, 'getInstalledChaincode').resolves(chaincodeMap);

            mySandBox.stub(channel, 'getChannelConfig').resolves({ config: 'envelope' });
            loadConfigEnvelopeStub = mySandBox.stub(channel, 'loadConfigEnvelope');
            loadConfigEnvelopeStub.returns({ orderers: ['orderer.example.com:7050'] });
            sendUpgradeProposalStub = mySandBox.stub(channel, 'sendUpgradeProposal');
            sendUpgradeProposalStub.resolves([
                [
                    {
                        response: {
                            payload: Buffer.from(''),
                            status: 200
                        }
                    }
                ],
                {
                    proposal: true
                }
            ]);
            sendTransactionStub = mySandBox.stub(channel, 'sendTransaction');
            sendTransactionStub.resolves({
                status: 'SUCCESS'
            });
            mockEventHub = mySandBox.createStubInstance(Client.ChannelEventHub);
            mySandBox.stub(channel, 'newChannelEventHub').returns(mockEventHub);
            mockEventHub.connect.yields(null);
            mockEventHub.registerTxEvent.callsFake((txId: string, callback: any, errorCallback: any): void => {
                callback(txId, 'VALID', 1);
                errorCallback(null);
            });
            outputSpy = mySandBox.spy(connection['outputAdapter'], 'log');
            mockPeer1 = mySandBox.createStubInstance(Client.Peer);
            mockPeer1.getUrl.returns('grpc://localhost:7051');
            mockPeer2 = mySandBox.createStubInstance(Client.Peer);
            mockPeer2.getUrl.returns('grpcs://localhost:8051');
            mockOrderer = mySandBox.createStubInstance(Client.Orderer);
            mockOrderer.getName.returns('orderer.example.com:7050');
            connection['peers'].has('peer0.org1.example.com').should.be.true;
            connection['peers'].set('peer0.org1.example.com', mockPeer1);
            connection['peers'].has('peer0.org2.example.com').should.be.true;
            connection['peers'].set('peer0.org2.example.com', mockPeer2);
            connection['orderers'].has('orderer.example.com').should.be.true;
            connection['orderers'].set('orderer.example.com', mockOrderer);
        });

        it('should upgrade the specified chaincode with a remote orderer', async () => {
            mockPeer1.getUrl.returns('grpc://localhost:7051');
            mockPeer2.getUrl.returns('grpcs://peer0.org2.example.com:8051');
            mockOrderer.getName.returns('orderer.example.com:7050');
            const payload: Buffer = await connection.upgradeChaincode('myChaincode', '0.0.2', ['peer0.org1.example.com', 'peer0.org2.example.com'], 'mychannel', 'instantiate', ['arg1'], path.join('myPath'), undefined);
            should.equal(payload, null);
            sendUpgradeProposalStub.should.have.been.calledOnceWithExactly({
                'targets': [sinon.match.any, sinon.match.any],
                'chaincodeId': 'myChaincode',
                'chaincodeVersion': '0.0.2',
                'txId': sinon.match.any,
                'fcn': 'instantiate',
                'args': ['arg1'],
                'collections-config': path.join('myPath'),
                'endorsement-policy': undefined
            }, 5 * 60 * 1000);
            sendTransactionStub.should.have.been.calledOnceWithExactly({ proposal: sinon.match.any, proposalResponses: sinon.match.any, orderer: mockOrderer, txId: sinon.match.any });
            mockEventHub.registerTxEvent.should.have.been.calledOnce;
            outputSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `Upgrading with function: 'instantiate' and arguments: 'arg1'`);
        });

        it('should upgrade the specified chaincode with a local orderer', async () => {
            mockPeer1.getUrl.returns('grpc://localhost:7051');
            mockPeer2.getUrl.returns('grpcs://localhost:8051');
            mockOrderer.getName.returns('localhost:7050');
            const payload: Buffer = await connection.upgradeChaincode('myChaincode', '0.0.2', ['peer0.org1.example.com', 'peer0.org2.example.com'], 'mychannel', 'instantiate', ['arg1'], path.join('myPath'), undefined);
            should.equal(payload, null);
            sendUpgradeProposalStub.should.have.been.calledOnceWithExactly({
                'targets': [sinon.match.any, sinon.match.any],
                'chaincodeId': 'myChaincode',
                'chaincodeVersion': '0.0.2',
                'txId': sinon.match.any,
                'fcn': 'instantiate',
                'args': ['arg1'],
                'collections-config': path.join('myPath'),
                'endorsement-policy': undefined
            }, 5 * 60 * 1000);
            sendTransactionStub.should.have.been.calledOnceWithExactly({ proposal: sinon.match.any, proposalResponses: sinon.match.any, orderer: mockOrderer, txId: sinon.match.any });
            mockEventHub.registerTxEvent.should.have.been.calledOnce;
            outputSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `Upgrading with function: 'instantiate' and arguments: 'arg1'`);
        });

        it('should upgrade the specified chaincode and return the payload', async () => {
            sendUpgradeProposalStub.resolves([
                [
                    {
                        response: {
                            payload: Buffer.from('hello world'),
                            status: 200
                        }
                    }
                ],
                {
                    proposal: true
                }
            ]);
            const payload: Buffer = await connection.upgradeChaincode('myChaincode', '0.0.2', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1'], path.join('myPath'), undefined);
            payload.toString().should.equal('hello world');
            sendUpgradeProposalStub.should.have.been.calledOnceWithExactly({
                'targets': [sinon.match.any],
                'chaincodeId': 'myChaincode',
                'chaincodeVersion': '0.0.2',
                'txId': sinon.match.any,
                'fcn': 'instantiate',
                'args': ['arg1'],
                'collections-config': path.join('myPath'),
                'endorsement-policy': undefined
            }, 5 * 60 * 1000);
            sendTransactionStub.should.have.been.calledOnce;
            mockEventHub.registerTxEvent.should.have.been.calledOnce;
            outputSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `Upgrading with function: 'instantiate' and arguments: 'arg1'`);
        });

        it('should upgrade the specified chaincode using peers with the correct name and version installed', async () => {
            const chaincodeMap: Map<string, string[]> = new Map<string, string[]>();
            chaincodeMap.set('myChaincode', ['0.0.2']);
            getInstalledChaincodeStub.onFirstCall().resolves(chaincodeMap);

            const chaincodeMap1: Map<string, string[]> = new Map<string, string[]>();
            chaincodeMap1.set('otherChaincode', ['0.0.2']);
            getInstalledChaincodeStub.onSecondCall().resolves(chaincodeMap1);

            const chaincodeMap2: Map<string, string[]> = new Map<string, string[]>();
            chaincodeMap2.set('myChaincode', ['0.0.3']);
            getInstalledChaincodeStub.onThirdCall().resolves(chaincodeMap2);

            const payload: Buffer = await connection.upgradeChaincode('myChaincode', '0.0.2', ['peer0.org1.example.com', 'peer1.org1.example.com', 'peer2.org1.example.com'], 'mychannel', 'instantiate', ['arg1'], path.join('myPath'), undefined);
            should.equal(payload, null);

            const peer: Client.Peer = connection['getPeer']('peer0.org1.example.com');
            sendUpgradeProposalStub.should.have.been.calledOnceWithExactly({
                'targets': [peer],
                'chaincodeId': 'myChaincode',
                'chaincodeVersion': '0.0.2',
                'txId': sinon.match.any,
                'fcn': 'instantiate',
                'args': ['arg1'],
                'collections-config': path.join('myPath'),
                'endorsement-policy': undefined
            }, 5 * 60 * 1000);
            sendTransactionStub.should.have.been.calledOnce;
            mockEventHub.registerTxEvent.should.have.been.calledOnce;
            outputSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `Upgrading with function: 'instantiate' and arguments: 'arg1'`);
        });

        it('should throw an error if the specified chaincode is not already instantiated', async () => {
            await connection.upgradeChaincode('noSuchChaincode', '0.0.1', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1'], path.join('myPath'), undefined)
                .should.be.rejectedWith(/The smart contract noSuchChaincode is not instantiated on the channel mychannel, so cannot be upgraded/);
        });

        it('should throw an error if the specified chaincode is already instantiated with the same version', async () => {
            await connection.upgradeChaincode('myChaincode', '0.0.1', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1'], path.join('myPath'), undefined)
                .should.be.rejectedWith(/The smart contract myChaincode with version 0.0.1 is already instantiated on the channel mychannel/);
        });

        it('should throw an error if a peer returns an error as a proposal response', async () => {
            sendUpgradeProposalStub.resolves([
                [
                    new Error('such error')
                ],
                {
                    proposal: true
                }
            ]);
            await connection.upgradeChaincode('myChaincode', '0.0.2', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1'], path.join('myPath'), undefined)
                .should.be.rejectedWith(/such error/);
        });

        it('should throw an error if a peer returns a failed proposal response', async () => {
            sendUpgradeProposalStub.resolves([
                [
                    {
                        response: {
                            message: 'such error',
                            status: 400
                        }
                    }
                ],
                {
                    proposal: true
                }
            ]);
            await connection.upgradeChaincode('myChaincode', '0.0.2', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1'], path.join('myPath'), undefined)
                .should.be.rejectedWith(/such error/);
        });

        it('should throw an error if the orderer rejects the transaction', async () => {
            sendTransactionStub.resolves({
                status: 'FAILURE'
            });
            await connection.upgradeChaincode('myChaincode', '0.0.2', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1'], path.join('myPath'), undefined)
                .should.be.rejectedWith(/Response status: FAILURE/);
        });

        it('should throw an error if the event hub fails to connect before the transaction is committed', async () => {
            mockEventHub.connect.yields(new Error('such connect error'));
            await connection.upgradeChaincode('myChaincode', '0.0.2', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1'], path.join('myPath'), undefined)
                .should.be.rejectedWith(/such connect error/);
        });

        it('should throw an error if the event hub disconnects before the transaction is committed', async () => {
            mockEventHub.registerTxEvent.callsFake((_1: string, _2: void, errorCallback: any): void => {
                errorCallback(new Error('such connect error'));
            });
            await connection.upgradeChaincode('myChaincode', '0.0.2', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1'], path.join('myPath'), undefined)
                .should.be.rejectedWith(/such connect error/);
        });

        it('should throw an error if the transaction is rejected at validation time', async () => {
            mockEventHub.registerTxEvent.callsFake((txId: string, callback: any): void => {
                callback(txId, 'INVALID', 1);
            });
            await connection.upgradeChaincode('myChaincode', '0.0.2', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1'], path.join('myPath'), undefined)
                .should.be.rejectedWith(/with code INVALID in block 1/);
        });

        it('should throw an error if the orderer in the channel configuration is not known and all the peers are not local', async () => {
            mockPeer1.getUrl.returns('grpc://localhost:7051');
            mockPeer2.getUrl.returns('grpcs://peer0.org2.example.com:8051');
            loadConfigEnvelopeStub.returns({ orderers: ['nosuchorderer.example.com'] });
            await connection.upgradeChaincode('myChaincode', '0.0.2', ['peer0.org1.example.com', 'peer0.org2.example.com'], 'mychannel', 'instantiate', ['arg1'], path.join('myPath'), undefined)
                .should.be.rejectedWith(/Failed to find Fabric orderer\(s\) nosuchorderer.example.com for channel mychannel/);
        });

        it('should throw an error if the orderer in the channel configuration is not known and all the peers are not local', async () => {
            mockPeer1.getUrl.returns('grpc://localhost:7051');
            mockPeer2.getUrl.returns('grpcs://peer0.org2.example.com:8051');
            loadConfigEnvelopeStub.returns({ orderers: ['nosuchorderer.example.com'] });
            await connection.upgradeChaincode('myChaincode', '0.0.2', ['peer0.org1.example.com', 'peer0.org2.example.com'], 'mychannel', 'instantiate', ['arg1'], path.join('myPath'), undefined)
                .should.be.rejectedWith(/Failed to find Fabric orderer\(s\) nosuchorderer.example.com for channel mychannel/);
        });

        it('should throw an error if the orderer in the channel configuration is not known and the peers are a mix of local and not local', async () => {
            mockPeer1.getUrl.returns('grpc://localhost:7051');
            mockPeer2.getUrl.returns('grpcs://localhost:8051');
            loadConfigEnvelopeStub.returns({ orderers: ['nosuchorderer.example.com'] });
            await connection.upgradeChaincode('myChaincode', '0.0.2', ['peer0.org1.example.com', 'peer0.org2.example.com'], 'mychannel', 'instantiate', ['arg1'], path.join('myPath'), undefined)
                .should.be.rejectedWith(/Failed to find Fabric orderer\(s\) nosuchorderer.example.com for channel mychannel/);
        });

        it('should throw an error if the orderer in the channel configuration is not known and all the peers are local', async () => {
            mockPeer1.getUrl.returns('grpc://localhost:7051');
            mockPeer2.getUrl.returns('grpcs://localhost:8051');
            loadConfigEnvelopeStub.returns({ orderers: ['nosuchorderer.example.com'] });
            await connection.upgradeChaincode('myChaincode', '0.0.2', ['peer0.org1.example.com', 'peer0.org2.example.com'], 'mychannel', 'instantiate', ['arg1'], path.join('myPath'), undefined)
                .should.be.rejectedWith(/Failed to find Fabric orderer\(s\) nosuchorderer.example.com for channel mychannel/);
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
            mockLocalWallet['setUserContext'].should.have.been.calledOnceWithExactly(sinon.match.any, FabricRuntimeUtil.ADMIN_USER);
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
            mockLocalWallet['setUserContext'].should.have.been.calledOnceWithExactly(sinon.match.any, FabricRuntimeUtil.ADMIN_USER);
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

    describe('getWallet', () => {
        it('should return the wallet for a certificate authority node', async () => {
            const wallet: IFabricWallet = await connection.getWallet('ca.example.com');
            wallet.should.equal(mockLocalWallet);
        });
    });
});
