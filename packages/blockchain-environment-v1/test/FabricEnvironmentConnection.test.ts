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
import * as fs_extra from 'fs-extra';
import * as path from 'path';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import {
    FabricSmartContractDefinition,
    FabricNodeType,
    FabricNode,
    FabricRuntimeUtil,
    FabricWalletRegistry,
    FabricEnvironmentRegistry,
    FabricEnvironmentRegistryEntry,
    EnvironmentType,
    FabricWalletGeneratorFactory,
    FabricWalletRegistryEntry
} from 'ibm-blockchain-platform-common';
import { FabricWallet, FabricWalletGenerator } from 'ibm-blockchain-platform-wallet';
import { LifecyclePeer, LifecycleChannel } from 'ibm-blockchain-platform-fabric-admin';
import { ConnectOptions, Endorser } from 'fabric-common';
import { FabricInstalledSmartContract } from 'ibm-blockchain-platform-common/build/src/fabricModel/FabricInstalledSmartContract';
import { FabricCollectionDefinition } from 'ibm-blockchain-platform-common/build/src/fabricModel/FabricCollectionDefinition';

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
    let envPath: string;

    before(async () => {
        envPath = path.join(__dirname, '..', '..', '..', 'test', 'data', FabricRuntimeUtil.LOCAL_FABRIC);
        FabricWalletGeneratorFactory.setFabricWalletGenerator(FabricWalletGenerator.instance());
        FabricWalletRegistry.instance().setRegistryPath(path.join(__dirname, 'tmp', 'registries'));
        FabricEnvironmentRegistry.instance().setRegistryPath(path.join(__dirname, 'tmp', 'registries'));
        await FabricWalletRegistry.instance().clear();
        await FabricEnvironmentRegistry.instance().clear();
        await FabricEnvironmentRegistry.instance().add(new FabricEnvironmentRegistryEntry({
            name: FabricRuntimeUtil.LOCAL_FABRIC,
            environmentDirectory: envPath, // ???
            environmentType: EnvironmentType.LOCAL_MICROFAB_ENVIRONMENT,
            numberOfOrgs: 1,
            url: 'http://console.127-0-0-1.nip.io:8080'
        }));

    });

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
        nodes = [
            FabricNode.newPeer(
                'org1peer1',
                'Org1 Peer1',
                `grpc://org1peer1-api.127-0-0-1.nip.io:8080`,
                `Org1`,
                'Org1 Admin',
                'Org1MSP'
            ),
            FabricNode.newPeer(
                'org1peer2',
                'Org1 Peer2',
                `grpc://org1peer2-api.127-0-0-1.nip.io:8080`,
                `Org1`,
                'Org1 Admin',
                'Org1MSP'
            ),
            FabricNode.newSecurePeer(
                'org2peer1',
                'Org2 Peer1',
                `grpcs://org2peer1-api.127-0-0-1.nip.io:8080`,
                TLS_CA_CERTIFICATE,
                `Org2`,
                'Org2 Admin',
                'Org2MSP'
            ),
            FabricNode.newSecurePeer(
                'org2peer2',
                'Org2 Peer2',
                `grpcs://org2peer2-api.127-0-0-1.nip.io:8080`,
                TLS_CA_CERTIFICATE,
                `Org2`,
                'Org2 Admin',
                'Org2MSP'
            ),
            FabricNode.newSecurePeer(
                'org3peer1',
                'Org3 Peer1',
                `grpcs://org3peer1-api.127-0-0-1.nip.io:8080`,
                TLS_CA_CERTIFICATE,
                `Org3`,
                'Org3 Admin',
                'Org3MSP'
            ),
            FabricNode.newCertificateAuthority(
                'org1ca',
                'Org1 CA',
                `http://org1ca-api.127-0-0-1.nip.io:8080`,
                'ca_name',
                'Org1',
                'Org1 CA Admin',
                'Org1MSP',
                null,
                null
            ),
            FabricNode.newSecureCertificateAuthority(
                'org2ca',
                'Org2 CA',
                `http://org2ca-api.127-0-0-1.nip.io:8080`,
                'ca_name',
                TLS_CA_CERTIFICATE,
                'Org2',
                'Org2 CA Admin',
                'Org2MSP',
                null,
                null
            ),
            FabricNode.newCertificateAuthority(
                'org3ca',
                'Org3 CA',
                `http://org3ca-api.127-0-0-1.nip.io:8080`,
                null,
                'Org3',
                'Org3 CA Admin',
                null,
                null,
                null
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

        const getWalletRegistry: sinon.SinonStub = mySandBox.stub(FabricWalletRegistry.instance(), 'get');
        getWalletRegistry.callThrough();

        getWalletRegistry.withArgs('Org1', FabricRuntimeUtil.LOCAL_FABRIC).resolves({
            name: 'Org1',
            displayName: `${FabricRuntimeUtil.LOCAL_FABRIC} - Org1`,
            walletPath: path.join(envPath, 'wallets', 'Org1'),
            managedWallet: true,
            fromEnvironment: FabricRuntimeUtil.LOCAL_FABRIC,
            environmentGroups: [FabricRuntimeUtil.LOCAL_FABRIC]
        } as FabricWalletRegistryEntry);
        getWalletRegistry.withArgs('Org2', FabricRuntimeUtil.LOCAL_FABRIC).resolves({
            name: 'Org2',
            displayName: `${FabricRuntimeUtil.LOCAL_FABRIC} - Org2`,
            walletPath: path.join(envPath, 'wallets', 'Org2'),
            managedWallet: true,
            fromEnvironment: FabricRuntimeUtil.LOCAL_FABRIC,
            environmentGroups: [FabricRuntimeUtil.LOCAL_FABRIC]
        } as FabricWalletRegistryEntry);
        getWalletRegistry.withArgs('Org3', FabricRuntimeUtil.LOCAL_FABRIC).resolves({
            name: 'Org3',
            displayName: `${FabricRuntimeUtil.LOCAL_FABRIC} - Org3`,
            walletPath: path.join(envPath, 'wallets', 'Org3'),
            managedWallet: true,
            fromEnvironment: FabricRuntimeUtil.LOCAL_FABRIC,
            environmentGroups: [FabricRuntimeUtil.LOCAL_FABRIC]
        } as FabricWalletRegistryEntry);

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

        mySandBox.stub(localWallet.getWallet(), 'get').resolves({
            type: 'admin'
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

        it('should create a peer for each peer node', async () => {
            const peerNames: string[] = Array.from(connection['lifecycle']['peers'].keys());
            const peerValues: LifecyclePeer[] = Array.from(connection['lifecycle']['peers'].values());

            peerNames.should.deep.equal(['Org1 Peer1', 'Org1 Peer2', 'Org2 Peer1', 'Org2 Peer2', 'Org3 Peer1']);

            peerValues.should.have.lengthOf(5);
            peerValues[0].should.be.an.instanceOf(LifecyclePeer);
            peerValues[0]['url'].should.equal('grpc://org1peer1-api.127-0-0-1.nip.io:8080');
            peerValues[0]['name'].should.equal('Org1 Peer1');
        });

        it('should create peer clients for each peer node with API options', async () => {
            const node: FabricNode = FabricNode.newPeer(
                'org1peer1',
                'Org1 Peer1',
                `grpc://org1peer1-api.127-0-0-1.nip.io:8080`,
                'Org1',
                'Org1 Admin',
                'Org1MSP'
            );
            node.api_options = {
                'grpc.some_option': 'some_value'
            };
            connection.disconnect();
            await connection.connect([node]);

            const peerNames: string[] = Array.from(connection['lifecycle']['peers'].keys());
            const peerValues: LifecyclePeer[] = Array.from(connection['lifecycle']['peers'].values());

            peerNames.should.deep.equal(['Org1 Peer1']);
            peerValues.should.have.lengthOf(1);
            peerValues[0].should.be.an.instanceOf(LifecyclePeer);
            peerValues[0]['url'].should.equal('grpc://org1peer1-api.127-0-0-1.nip.io:8080');
            peerValues[0]['name'].should.equal('Org1 Peer1');
            peerValues[0]['apiOptions'].should.deep.equal({
                'grpc.some_option': 'some_value'
            });
        });

        it('should create secure peer clients for each secure peer node with an SSL target name override', async () => {
            const node: FabricNode = FabricNode.newSecurePeer(
                'org2peer1',
                'Org2 Peer1',
                `grpcs://org2peer1-api.127-0-0-1.nip.io:8080`,
                TLS_CA_CERTIFICATE,
                'Org2',
                FabricRuntimeUtil.ADMIN_USER,
                'Org2MSP'
            );
            node.ssl_target_name_override = 'Org2 Peer1';
            connection.disconnect();
            await connection.connect([node]);

            const peerNames: string[] = Array.from(connection['lifecycle']['peers'].keys());
            const peerValues: LifecyclePeer[] = Array.from(connection['lifecycle']['peers'].values());

            peerNames.should.deep.equal(['Org2 Peer1']);
            peerValues.should.have.lengthOf(1);
            peerValues[0].should.be.an.instanceOf(LifecyclePeer);
            peerValues[0]['url'].should.equal('grpcs://org2peer1-api.127-0-0-1.nip.io:8080');
            peerValues[0]['name'].should.equal('Org2 Peer1');
            peerValues[0]['sslTargetNameOverride'].should.equal('Org2 Peer1');
        });

        it('should create orderer clients for each orderer node', async () => {
            const results: string[] = connection['lifecycle'].getAllOrdererNames();

            results.length.should.equal(2);

            let orderer: ConnectOptions = connection['lifecycle'].getOrderer(results[0]);
            orderer.url.should.equal('grpc://localhost:7050');

            orderer = connection['lifecycle'].getOrderer(results[1]);
            orderer.url.should.equal('grpcs://localhost:8050');
            orderer.pem.should.equal(PEM_TLS_CA_CERTIFICATE);
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
                'grpc.some_option': 'some_value'
            };
            connection.disconnect();
            await connection.connect([node]);

            const results: string[] = connection['lifecycle'].getAllOrdererNames();

            results.length.should.equal(1);
            results[0].should.equal('Orderer');

            const orderer: ConnectOptions = connection['lifecycle'].getOrderer(results[0]);
            orderer.url.should.equal('grpc://localhost:8080');
            orderer['grpc.some_option'].should.equal('some_value');
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
            certificateAuthorityNames.should.deep.equal(['Org1 CA', 'Org2 CA', 'Org3 CA']);
            certificateAuthorityValues.should.have.lengthOf(3);
            certificateAuthorityValues[0].should.be.an.instanceOf(FabricCAServices);
            certificateAuthorityValues[0].toString().should.match(/hostname: org1ca-api.127-0-0-1.nip.io/);
            certificateAuthorityValues[0].toString().should.match(/port: 8080/);
            certificateAuthorityValues[0].getCaName().should.equal('ca_name');
        });

        it('should create secure certificate authority clients for each secure certificate authority node', async () => {
            const certificateAuthorityNames: string[] = Array.from(connection['certificateAuthorities'].keys());
            const certificateAuthorityValues: FabricCAServices[] = Array.from(connection['certificateAuthorities'].values());
            certificateAuthorityNames.should.deep.equal(['Org1 CA', 'Org2 CA', 'Org3 CA']);
            certificateAuthorityValues.should.have.lengthOf(3);
            certificateAuthorityValues[1].should.be.an.instanceOf(FabricCAServices);
            certificateAuthorityValues[1].toString().should.match(/hostname: org2ca-api.127-0-0-1.nip.io/);
            certificateAuthorityValues[1].toString().should.match(/port: 8080/);
            certificateAuthorityValues[1].getCaName().should.equal('ca_name');
        });

        it('should create certificate authority clients and use null ca_name if not set', async () => {
            const certificateAuthorityNames: string[] = Array.from(connection['certificateAuthorities'].keys());
            const certificateAuthorityValues: FabricCAServices[] = Array.from(connection['certificateAuthorities'].values());
            certificateAuthorityNames.should.deep.equal(['Org1 CA', 'Org2 CA', 'Org3 CA']);
            certificateAuthorityValues.should.have.lengthOf(3);
            certificateAuthorityValues[2].should.be.an.instanceOf(FabricCAServices);
            certificateAuthorityValues[2].toString().should.match(/hostname: org3ca-api.127-0-0-1.nip.io/);
            certificateAuthorityValues[2].toString().should.match(/port: 8080/);
            should.not.exist(certificateAuthorityValues[2].getCaName());
        });

        it('should ignore any other nodes', async () => {
            const nodeNames: string[] = Array.from(connection['nodes'].keys());
            nodeNames.should.not.contain('couchdb');
        });

        it('should set the mspids', () => {
            const mspids: string[] = Array.from(connection['mspIDs']);
            mspids.should.deep.equal(['Org1MSP', 'Org2MSP', 'Org3MSP', 'OrdererMSP']);
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

    describe('getDiscoveredOrgs', () => {

        it('should get discovered orgs and peers', async () => {
            const endorser1: sinon.SinonStubbedInstance<Endorser> = mySandBox.createStubInstance(Endorser);
            const endorser2: sinon.SinonStubbedInstance<Endorser> = mySandBox.createStubInstance(Endorser);
            const endorser3: sinon.SinonStubbedInstance<Endorser> = mySandBox.createStubInstance(Endorser);
            const endorser4: sinon.SinonStubbedInstance<Endorser> = mySandBox.createStubInstance(Endorser);
            const endorser5: sinon.SinonStubbedInstance<Endorser> = mySandBox.createStubInstance(Endorser);
            (endorser1 as any)['name'] = 'Org1 Peer1';
            (endorser2 as any)['name'] = 'Org1 Peer2';
            (endorser3 as any)['name'] = 'Org2 Peer1';
            (endorser4 as any)['name'] = 'Org2 Peer2';
            (endorser5 as any)['name'] = 'Org3 Peer1';

            (endorser1 as any)['mspid'] = 'Org1MSP';
            (endorser2 as any)['mspid'] = 'Org1MSP';
            (endorser3 as any)['mspid'] = 'Org2MSP';
            (endorser4 as any)['mspid'] = 'Org2MSP';
            (endorser5 as any)['mspid'] = 'Org3MSP';

            const orgMap: Map<string, string[]> = new Map();
            orgMap.set('Org1MSP', ['Org1 Peer1', 'Org1 Peer2']);
            orgMap.set('Org2MSP', ['Org2 Peer1', 'Org2 Peer2']);
            orgMap.set('Org3MSP', ['Org3 Peer1']);

            const getDiscoveredPeersStub: sinon.SinonStub = mySandBox.stub(LifecycleChannel.prototype, 'getDiscoveredPeers').resolves([endorser1, endorser2, endorser3, endorser4, endorser5]);
            const result: Map<string, string[]> = await connection.getDiscoveredOrgs('mychannel');
            result.should.deep.equal(orgMap);
            getDiscoveredPeersStub.should.have.been.calledOnceWithExactly(['Org1 Peer1', 'Org1 Peer2', 'Org2 Peer1', 'Org2 Peer2', 'Org3 Peer1']);
        });

        it('should throw an error if no peers are found for discovery', async () => {
            connection['lifecycle']['peers'].clear();
            await connection.getDiscoveredOrgs('mychannel').should.be.rejectedWith(/No lifecycle peers available./);
        });
    });

    describe('getAllDiscoveredPeerNames', () => {
        it('should get the names of all discovered peers', async () => {
            const getDiscoveredPeerNamesStub: sinon.SinonStub = mySandBox.stub(LifecycleChannel.prototype, 'getDiscoveredPeerNames').resolves(['Org1 Peer1', 'Org1 Peer2', 'Org2 Peer1', 'Org2 Peer2', 'Org3 Peer1']);
            const result: string[] = await connection.getAllDiscoveredPeerNames('mychannel');
            result.should.deep.equal(['Org1 Peer1', 'Org1 Peer2', 'Org2 Peer1', 'Org2 Peer2', 'Org3 Peer1']);
            getDiscoveredPeerNamesStub.should.have.been.calledOnceWithExactly(['Org1 Peer1', 'Org1 Peer2', 'Org2 Peer1', 'Org2 Peer2', 'Org3 Peer1']);
        });

        it('should throw an error if no peers are found for discovery', async () => {
            connection['lifecycle']['peers'].clear();
            await connection.getAllDiscoveredPeerNames('mychannel').should.be.rejectedWith(/No lifecycle peers available./);

        });
    });

    describe('getAllPeerNames', () => {
        it('should get all of the peer names', () => {
            connection.getAllPeerNames().should.deep.equal(['Org1 Peer1', 'Org1 Peer2', 'Org2 Peer1', 'Org2 Peer2', 'Org3 Peer1']);
        });
    });

    describe('getAllPeerNamesForOrg', () => {
        it('should get all of the peer names for an org', () => {
            connection.getAllPeerNamesForOrg('Org1MSP').should.deep.equal(['Org1 Peer1', 'Org1 Peer2']);
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
            connection['lifecycle']['peers'].set('Org1 Peer1', mockPeer1 as unknown as LifecyclePeer);
            connection['lifecycle']['peers'].set('Org2 Peer1', mockPeer2 as unknown as LifecyclePeer);

            mockPeer1.getChannelCapabilities.resolves(['V2_0']);
            mockPeer2.getChannelCapabilities.resolves(['V2_0']);
        });

        // TODO remove/modify this when a design for displaying v1 and v2 tree elements is decided
        it.skip('should get all of the channel names, with the list of peers', async () => {
            const channelMap: Map<string, Array<string>> = await connection.createChannelMap();
            channelMap.should.deep.equal(
                new Map<string, Array<string>>(
                    [
                        ['channel1', ['Org1 Peer1']],
                        ['channel2', ['Org1 Peer1', 'Org2 Peer1']]
                    ]
                )
            );

            mockPeer1.getChannelCapabilities.should.have.been.calledTwice;
            mockPeer2.getChannelCapabilities.should.have.been.calledOnce;
        });

        it('should throw a specific error if gRPC returns an HTTP 503 status code', async () => {
            mockPeer1.getAllChannelNames.rejects(new Error('Received http2 header with status: 503'));
            await connection.createChannelMap()
                .should.be.rejectedWith(/Cannot connect to Fabric/);
        });

        // TODO remove/modify this when a design for displaying v1 and v2 tree elements is decided
        it.skip('should throw error if channel is not using v2 capabilities', async () => {
            mockPeer1.getChannelCapabilities.resolves(['V1_4_3']);
            await connection.createChannelMap().should.be.rejectedWith(/Unable to connect to network, channel 'channel1' does not have V2_0 capabilities enabled./);
            mockPeer1.getChannelCapabilities.should.have.been.calledOnce;
            mockPeer2.getChannelCapabilities.should.not.have.been.called;
        });

        it('should rethrow any other errors', async () => {
            mockPeer2.getAllChannelNames.rejects(new Error('such error'));
            await connection.createChannelMap()
                .should.be.rejectedWith(/such error/);
        });

    });

    describe('getCommittedSmartContracts', () => {
        let getAllCommittedSmartContractsStub: sinon.SinonStub;
        let getAllInstantiatedSmartContractsStub: sinon.SinonStub;
        let mockPeer1: sinon.SinonStubbedInstance<LifecyclePeer>;
        let mockPeer3: sinon.SinonStubbedInstance<LifecyclePeer>;

        beforeEach(() => {
            mockPeer1 = mySandBox.createStubInstance(LifecyclePeer);
            mockPeer3 = mySandBox.createStubInstance(LifecyclePeer);
            mockPeer1.getAllChannelNames.resolves(['channel1', 'channel2']);
            mockPeer3.getAllChannelNames.resolves(['channel3']);
            mockPeer1.getChannelCapabilities.resolves(['V2_0']);
            mockPeer3.getChannelCapabilities.resolves(['V1_4']);
            connection['lifecycle']['peers'].clear();
            connection['lifecycle']['peers'].set('Org1 Peer1', mockPeer1 as unknown as LifecyclePeer);
            connection['lifecycle']['peers'].set('Org3 Peer1', mockPeer3 as unknown as LifecyclePeer);

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
                    sequence: 2,
                    endorsementPolicy: Buffer.from('myPolicy'),
                    collectionConfig: Buffer.from([{ name: 'myCollection' }])
                }
            ]);
            getAllInstantiatedSmartContractsStub = mySandBox.stub(LifecycleChannel.prototype, 'getAllInstantiatedSmartContracts');
            getAllInstantiatedSmartContractsStub.resolves([
                {
                    smartContractName: 'myChaincodev1',
                    smartContractVersion: '0.0.3',
                    sequence: -1
                },
                {
                    smartContractName: 'otherChaincodev1',
                    smartContractVersion: '0.0.4',
                    sequence: -1,
                    // endorsementPolicy: Buffer.from('myPolicy'),
                    // collectionConfig: Buffer.from([{ name: 'myCollection' }])
                }
            ]);

        });

        it('should return the list of committed smart contracts on v1 channel', async () => {
            const chaincodes: Array<FabricSmartContractDefinition> = await connection.getCommittedSmartContractDefinitions(['Org3 Peer1'], 'mychannel');
            chaincodes.should.deep.equal([
                {
                    name: 'myChaincodev1',
                    version: '0.0.3',
                    sequence: -1,
                    packageId: undefined,
                    endorsementPolicy: undefined,
                    collectionConfig: undefined
                },
                {
                    name: 'otherChaincodev1',
                    version: '0.0.4',
                    sequence: -1,
                    packageId: undefined,
                    // endorsementPolicy: Buffer.from('myPolicy'),
                    // collectionConfig: Buffer.from([{ name: 'myCollection' }])
                    endorsementPolicy: undefined,
                    collectionConfig: undefined
                }
            ]);
            getAllCommittedSmartContractsStub.should.have.not.been.called;
            getAllInstantiatedSmartContractsStub.should.have.been.called;
        });

        it('should return the list of committed smart contracts on v2 channel', async () => {
            const chaincodes: Array<FabricSmartContractDefinition> = await connection.getCommittedSmartContractDefinitions(['Org1 Peer1'], 'mychannel');
            chaincodes.should.deep.equal([
                {
                    name: 'myChaincode',
                    version: '0.0.2',
                    sequence: 1,
                    packageId: undefined,
                    endorsementPolicy: undefined,
                    collectionConfig: undefined
                },
                {
                    name: 'otherChaincode',
                    version: '0.0.1',
                    sequence: 2,
                    packageId: undefined,
                    endorsementPolicy: Buffer.from('myPolicy'),
                    collectionConfig: Buffer.from([{ name: 'myCollection' }])
                }
            ]);
            getAllCommittedSmartContractsStub.should.have.been.called;
            getAllInstantiatedSmartContractsStub.should.have.not.been.called;
        });
    });

    describe('getAllCommittedSmartContracts', () => {
        let mockPeer1: sinon.SinonStubbedInstance<LifecyclePeer>;
        let mockPeer2: sinon.SinonStubbedInstance<LifecyclePeer>;
        let mockPeer3: sinon.SinonStubbedInstance<LifecyclePeer>;

        let getAllCommittedSmartContractsStub: sinon.SinonStub;
        let getAllInstantiatedSmartContractsStub: sinon.SinonStub;

        beforeEach(() => {
            mockPeer1 = mySandBox.createStubInstance(LifecyclePeer);
            mockPeer2 = mySandBox.createStubInstance(LifecyclePeer);
            mockPeer3 = mySandBox.createStubInstance(LifecyclePeer);

            mockPeer1.getAllChannelNames.resolves(['channel1', 'channel2']);
            mockPeer2.getAllChannelNames.resolves(['channel2']);
            mockPeer3.getAllChannelNames.resolves(['channel3']);

            mockPeer1.getChannelCapabilities.resolves(['V2_0']);
            mockPeer2.getChannelCapabilities.resolves(['V2_0']);
            mockPeer3.getChannelCapabilities.resolves(['V1_4']);

            connection['lifecycle']['peers'].clear();
            connection['lifecycle']['peers'].set('Org1 Peer1', mockPeer1 as unknown as LifecyclePeer);
            connection['lifecycle']['peers'].set('Org2 Peer1', mockPeer2 as unknown as LifecyclePeer);
            connection['lifecycle']['peers'].set('Org3 Peer1', mockPeer3 as unknown as LifecyclePeer);

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
                    sequence: 2,
                    endorsementPolicy: Buffer.from('myPolicy'),
                    collectionConfig: Buffer.from([{ name: 'myCollection' }])
                }
            ]);
            getAllCommittedSmartContractsStub.onSecondCall().resolves([
                {
                    smartContractName: 'myChaincode',
                    smartContractVersion: '0.0.2',
                    sequence: 2
                },
                {
                    smartContractName: 'otherChaincode',
                    smartContractVersion: '0.0.1',
                    sequence: 2,
                    endorsementPolicy: Buffer.from('myPolicy'),
                    collectionConfig: Buffer.from([{ name: 'myCollection' }])
                },
                {
                    smartContractName: 'kittyChaincode',
                    smartContractVersion: '0.0.3',
                    sequence: 1
                }
            ]);
            getAllInstantiatedSmartContractsStub = mySandBox.stub(LifecycleChannel.prototype, 'getAllInstantiatedSmartContracts');
            getAllInstantiatedSmartContractsStub.onFirstCall().resolves([
                {
                    smartContractName: 'myChaincode',
                    smartContractVersion: '0.0.1',
                    sequence: -1
                },
                {
                    smartContractName: 'otherChaincode',
                    smartContractVersion: '0.0.1',
                    sequence: -1,
                    // endorsementPolicy: Buffer.from('myPolicy'),
                    // collectionConfig: Buffer.from([{ name: 'myCollection' }])
                }
            ]);
        });

        it('should return the list of committed smart contracts on all channels', async () => {

            const smartContracts: Array<FabricSmartContractDefinition> = await connection.getAllCommittedSmartContractDefinitions();
            smartContracts.should.deep.equal([
                {
                    name: 'kittyChaincode',
                    version: '0.0.3',
                    sequence: 1,
                    packageId: undefined,
                    endorsementPolicy: undefined,
                    collectionConfig: undefined
                },
                {
                    name: 'myChaincode',
                    version: '0.0.1',
                    sequence: 1,
                    packageId: undefined,
                    endorsementPolicy: undefined,
                    collectionConfig: undefined
                },
                {
                    name: 'myChaincode',
                    version: '0.0.2',
                    sequence: 2,
                    packageId: undefined,
                    endorsementPolicy: undefined,
                    collectionConfig: undefined
                },
                {
                    name: 'otherChaincode',
                    version: '0.0.1',
                    sequence: 2,
                    packageId: undefined,
                    endorsementPolicy: Buffer.from('myPolicy'),
                    collectionConfig: Buffer.from([{ name: 'myCollection' }])
                }
            ]);
        });

        it('should rethrow any errors', async () => {
            getAllCommittedSmartContractsStub.resetBehavior();
            getAllCommittedSmartContractsStub.rejects(new Error('such error'));
            await connection.getAllCommittedSmartContractDefinitions()
                .should.be.rejectedWith(/such error/);
        });
    });

    describe('getAllOrganizationNames', () => {
        it('should get all of the organization names', () => {
            connection.getAllOrganizationNames().should.deep.equal(['OrdererMSP', 'Org1MSP', 'Org2MSP', 'Org3MSP']);
        });
    });

    describe('getAllCertificateAuthorityNames', () => {
        it('should get all of the certificate authority names', () => {
            connection.getAllCertificateAuthorityNames().should.deep.equal(['Org1 CA', 'Org2 CA', 'Org3 CA']);
        });
    });

    describe('getInstalledSmartContracts', () => {
        let mockPeer: sinon.SinonStubbedInstance<LifecyclePeer>;

        beforeEach(() => {
            mockPeer = mySandBox.createStubInstance(LifecyclePeer);

            connection['lifecycle']['peers'].clear();
            connection['lifecycle']['peers'].set('Org1 Peer1', mockPeer as unknown as LifecyclePeer);

            mockPeer.getAllInstalledSmartContractsV1.resolves([
                {
                    label: 'grape-network',
                    packageId: 'grape-network-12345'
                },
                {
                    label: 'fruit-network',
                    packageId: 'fruit-network-12345'
                }
            ]);

            mockPeer.getAllInstalledSmartContracts.resolves([
                {
                    label: 'biscuit-network',
                    packageId: 'biscuit-network-12345'
                },
                {
                    label: 'cake-network',
                    packageId: 'cake-network-12345'
                }
            ]);
        });

        it('should get the v1 installed smart contracts', async () => {
            const installedSmartContracts: Array<FabricInstalledSmartContract> = await connection.getInstalledSmartContracts('Org1 Peer1', true);
            installedSmartContracts.length.should.equal(2);
            installedSmartContracts[0].should.deep.equal({
                label: 'grape-network',
                packageId: 'grape-network-12345'
            });
            installedSmartContracts[1].should.deep.equal({
                label: 'fruit-network',
                packageId: 'fruit-network-12345'
            });
        });

        it('should get the v2 installed smart contracts', async () => {
            const installedSmartContracts: Array<FabricInstalledSmartContract> = await connection.getInstalledSmartContracts('Org1 Peer1');
            installedSmartContracts.length.should.equal(2);
            installedSmartContracts[0].should.deep.equal({
                label: 'biscuit-network',
                packageId: 'biscuit-network-12345'
            });
            installedSmartContracts[1].should.deep.equal({
                label: 'cake-network',
                packageId: 'cake-network-12345'
            });
        });

        it('should handle and swallow an access denied error', async () => {
            mockPeer.getAllInstalledSmartContracts.rejects(new Error('wow u cannot see cc cos access denied as u is not an admin'));
            const installedSmartContracts: Array<{ label: string, packageId: string }> = await connection.getInstalledSmartContracts('Org1 Peer1');
            installedSmartContracts.length.should.equal(0);
            Array.from(installedSmartContracts.keys()).should.deep.equal([]);
        });

        it('should rethrow any error other than access denied', async () => {
            mockPeer.getAllInstalledSmartContracts.rejects(new Error('wow u cannot see cc cos peer no works'));
            await connection.getInstalledSmartContracts('Org1 Peer1').should.be.rejectedWith(/peer no works/);
        });

        it('should throw an error getting installed smart contracts from a peer that does not exist', async () => {
            await connection.getInstalledSmartContracts('nosuch.Org1 Peer1')
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

        let mockPeer: sinon.SinonStubbedInstance<LifecyclePeer>;

        beforeEach(() => {
            mockPeer = mySandBox.createStubInstance(LifecyclePeer);

            connection['lifecycle']['peers'].clear();
            connection['lifecycle']['peers'].set('Org1 Peer1', mockPeer as unknown as LifecyclePeer);

            mockPeer.getAllInstalledSmartContracts.resolves([
                {
                    label: 'biscuit_network',
                    packageId: 'biscuit_network:12345'
                },
                {
                    label: 'cake_network',
                    packageId: 'cake_network:12345' }
            ]);
        });

        it('should install the smart contract package', async () => {
            const responseStub: any = [[{
                response: {
                    message: 'all good in da hood',
                    status: 200
                }
            }]];
            mockPeer.installSmartContractPackage.resolves(responseStub);

            await connection.installSmartContract(packagePath, 'Org1 Peer1', 'myContract_0.0.1', 90000);
            mockPeer.installSmartContractPackage.should.have.been.calledWith(
                sinon.match((buffer: Buffer) => {
                    buffer.should.be.an.instanceOf(Buffer);
                    buffer.length.should.equal(413);
                    return true;
                }),
                90000
            );
        });

        it('should install the smart contract package - CDS', async () => {
            const cdsPackagePath: string = path.join(TEST_PACKAGE_DIRECTORY, 'myContract@0.0.1.cds');
            const responseStub: any = [[{
                response: {
                    message: 'all good in da hood',
                    status: 200
                }
            }]];
            mockPeer.installSmartContractPackageCds.resolves(responseStub);
            mySandBox.stub(fs_extra, 'readFile').resolves(Buffer.from([]));
            await connection.installSmartContract(cdsPackagePath, 'Org1 Peer1', 'myContract_0.0.1', 90000);
            mockPeer.installSmartContractPackageCds.should.have.been.calledWith(Buffer.from([]), 90000);

        });

        it('should handle error response', async () => {
            const error: Error = new Error('some error');
            mockPeer.installSmartContractPackage.rejects(error);

            await connection.installSmartContract(packagePath, 'Org1 Peer1', 'some_label').should.be.rejectedWith(/some error/);
            mockPeer.installSmartContractPackage.should.have.been.calledWith(
                sinon.match((buffer: Buffer) => {
                    buffer.should.be.an.instanceOf(Buffer);
                    buffer.length.should.equal(413);
                    return true;
                }),
                undefined
            );
        });

        it('should handle an error if the smart contract package does not exist', async () => {
            const invalidPackagePath: string = path.join(TEST_PACKAGE_DIRECTORY, 'vscode-pkg-doesnotexist@0.0.1.cds');

            await connection.installSmartContract(invalidPackagePath, 'Org1 Peer1', 'vscode-pkg-doesnotexist_0.0.1')
                .should.have.been.rejectedWith(/ENOENT/);
        });

        it('should handle an error installing the smart contract package', async () => {
            mockPeer.installSmartContractPackage.rejects(new Error('such error'));

            await connection.installSmartContract(packagePath, 'Org1 Peer1', 'some_label')
                .should.have.been.rejectedWith(/such error/);
        });

        it('should throw an error installing smart contract onto a peer that does not exist', async () => {
            await connection.installSmartContract(packagePath, 'nosuch.Org1 Peer1', 'some_label')
                .should.be.rejectedWith(/does not exist/);
        });

        it('should return packageId if when peer throws chaincode already successfully installed', async () => {
            const error: Error = new Error('failed to invoke backing implementation of \'InstallChaincode\': chaincode already successfully installed');
            mockPeer.installSmartContractPackage.rejects(error);

            const packageId: string = await connection.installSmartContract(packagePath, 'Org1 Peer1', 'cake_network');

            mockPeer.getAllInstalledSmartContracts.should.have.been.called;
            packageId.should.equal('cake_network:12345');
        });

        it('should handle peer throwing chaincode already successfully installed but sdk not returning the package', async () => {
            const error: Error = new Error('failed to invoke backing implementation of \'InstallChaincode\': chaincode already successfully installed');
            mockPeer.installSmartContractPackage.rejects(error);

            await connection.installSmartContract(packagePath, 'Org1 Peer1', 'cookie_network').should.be.rejectedWith(`Unable to find installed contract for cookie_network after receiving: ${error.message}`);

            mockPeer.getAllInstalledSmartContracts.should.have.been.called;
        });

    });

    describe('approveSmartContractDefinition', () => {
        it('should approve a smart contract', async () => {
            const approveSmartContractDefinitionStub: sinon.SinonStub = mySandBox.stub(LifecycleChannel.prototype, 'approveSmartContractDefinition');

            const result: boolean = await connection.approveSmartContractDefinition('myOrderer', 'myChannel', ['Org1 Peer1'], new FabricSmartContractDefinition('myContract', '0.0.1', 1, 'myPackageId'));

            approveSmartContractDefinitionStub.should.have.been.calledWith(['Org1 Peer1'], 'myOrderer', {
                smartContractName: 'myContract',
                smartContractVersion: '0.0.1',
                packageId: 'myPackageId',
                sequence: 1,
                endorsementPolicy: undefined,
                collectionConfig: undefined
            });
            result.should.equal(true);
        });

        it('should approve a smart contract with endorsement policy', async () => {
            const collectionconfig: FabricCollectionDefinition = new FabricCollectionDefinition('myCollection', `OR('Org1MSP.member')`, 5, 4);
            const approveSmartContractDefinitionStub: sinon.SinonStub = mySandBox.stub(LifecycleChannel.prototype, 'approveSmartContractDefinition');

            const result: boolean = await connection.approveSmartContractDefinition('myOrderer', 'myChannel', ['Org1 Peer1'], new FabricSmartContractDefinition('myContract', '0.0.1', 1, 'myPackageId', `OR('Org1.member', 'Org2.member')`, [collectionconfig]));

            approveSmartContractDefinitionStub.should.have.been.calledWith(['Org1 Peer1'], 'myOrderer', {
                smartContractName: 'myContract',
                smartContractVersion: '0.0.1',
                packageId: 'myPackageId',
                sequence: 1,
                endorsementPolicy: `OR('Org1.member', 'Org2.member')`,
                collectionConfig: [collectionconfig]
            });
            result.should.equal(true);
        });

        it('should approve a smart contract within a given timeout', async () => {
            const collectionconfig: FabricCollectionDefinition = new FabricCollectionDefinition('myCollection', `OR('Org1MSP.member')`, 5, 4);
            const approveSmartContractDefinitionStub: sinon.SinonStub = mySandBox.stub(LifecycleChannel.prototype, 'approveSmartContractDefinition');

            const result: boolean = await connection.approveSmartContractDefinition('myOrderer', 'myChannel', ['Org1 Peer1'], new FabricSmartContractDefinition('myContract', '0.0.1', 1, 'myPackageId', `OR('Org1.member', 'Org2.member')`, [collectionconfig]), 5000);

            approveSmartContractDefinitionStub.should.have.been.calledWith(['Org1 Peer1'], 'myOrderer', {
                smartContractName: 'myContract',
                smartContractVersion: '0.0.1',
                packageId: 'myPackageId',
                sequence: 1,
                endorsementPolicy: `OR('Org1.member', 'Org2.member')`,
                collectionConfig: [collectionconfig]
            },
                5000);
            result.should.equal(true);
        });

        it('should throw error if unable to approve', async () => {
            const approvedError: Error = new Error('some error');
            const approveSmartContractDefinitionStub: sinon.SinonStub = mySandBox.stub(LifecycleChannel.prototype, 'approveSmartContractDefinition').rejects(approvedError);
            const getCommitReadinessStub: sinon.SinonStub = mySandBox.stub(connection, 'getCommitReadiness').resolves();

            await connection.approveSmartContractDefinition('myOrderer', 'myChannel', ['Org1 Peer1'], new FabricSmartContractDefinition('myContract', '0.0.1', 1, 'myPackageId')).should.be.rejectedWith(approvedError);

            approveSmartContractDefinitionStub.should.have.been.calledWith(['Org1 Peer1'], 'myOrderer', {
                smartContractName: 'myContract',
                smartContractVersion: '0.0.1',
                packageId: 'myPackageId',
                sequence: 1,
                endorsementPolicy: undefined,
                collectionConfig: undefined
            });
            getCommitReadinessStub.should.have.not.been.called;
        });

        it('should handle unable to approve if smart contract already approved and ready to commit', async () => {
            const approvedError: Error = new Error('Could not approve smart contract definition, received error: No valid responses from any peers. Errors: peer=peer0, status=500, message=failed to invoke backing implementation of \'ApproveChaincodeDefinitionForMyOrg\': attempted to redefine uncommitted sequence (1) for namespace myContract with unchanged content');
            const approveSmartContractDefinitionStub: sinon.SinonStub = mySandBox.stub(LifecycleChannel.prototype, 'approveSmartContractDefinition').rejects(approvedError);
            const getCommitReadinessStub: sinon.SinonStub = mySandBox.stub(connection, 'getCommitReadiness').resolves(true);

            const result: boolean = await connection.approveSmartContractDefinition('myOrderer', 'myChannel', ['Org1 Peer1'], new FabricSmartContractDefinition('myContract', '0.0.1', 1, 'myPackageId'));

            approveSmartContractDefinitionStub.should.have.been.calledWith(['Org1 Peer1'], 'myOrderer', {
                smartContractName: 'myContract',
                smartContractVersion: '0.0.1',
                packageId: 'myPackageId',
                sequence: 1,
                endorsementPolicy: undefined,
                collectionConfig: undefined
            });
            getCommitReadinessStub.should.have.been.calledWith('myChannel', 'Org1 Peer1', {
                name: 'myContract',
                version: '0.0.1',
                packageId: 'myPackageId',
                sequence: 1,
                endorsementPolicy: undefined,
                collectionConfig: undefined
            });
            result.should.equal(false);
        });

        it('should throw error if unable to approve and smart contract already approved but not ready to commit', async () => {
            const approvedError: Error = new Error('Could not approve smart contract definition, received error: No valid responses from any peers. Errors: peer=peer0, status=500, message=failed to invoke backing implementation of \'ApproveChaincodeDefinitionForMyOrg\': attempted to redefine uncommitted sequence (1) for namespace myContract with unchanged content');
            const approveSmartContractDefinitionStub: sinon.SinonStub = mySandBox.stub(LifecycleChannel.prototype, 'approveSmartContractDefinition').rejects(approvedError);
            const getCommitReadinessStub: sinon.SinonStub = mySandBox.stub(connection, 'getCommitReadiness').resolves(false);

            await connection.approveSmartContractDefinition('myOrderer', 'myChannel', ['Org1 Peer1'], new FabricSmartContractDefinition('myContract', '0.0.1', 1, 'myPackageId')).should.be.rejectedWith(approvedError);

            approveSmartContractDefinitionStub.should.have.been.calledWith(['Org1 Peer1'], 'myOrderer', {
                smartContractName: 'myContract',
                smartContractVersion: '0.0.1',
                packageId: 'myPackageId',
                sequence: 1,
                endorsementPolicy: undefined,
                collectionConfig: undefined
            });
            getCommitReadinessStub.should.have.been.calledWith('myChannel', 'Org1 Peer1', {
                name: 'myContract',
                version: '0.0.1',
                packageId: 'myPackageId',
                sequence: 1,
                endorsementPolicy: undefined,
                collectionConfig: undefined
            });
        });

    });

    describe('commitSmartContractDefinition', () => {
        it('should commit a smart contract', async () => {
            const commitSmartContractDefinitionStub: sinon.SinonStub = mySandBox.stub(LifecycleChannel.prototype, 'commitSmartContractDefinition');

            await connection.commitSmartContractDefinition('myOrderer', 'myChannel', ['Org1 Peer1'], new FabricSmartContractDefinition('myContract', '0.0.1', 1));

            commitSmartContractDefinitionStub.should.have.been.calledWith(['Org1 Peer1'], 'myOrderer', {
                smartContractName: 'myContract',
                smartContractVersion: '0.0.1',
                sequence: 1,
                endorsementPolicy: undefined,
                collectionConfig: undefined
            });
        });

        it('should commit a smart contract with endorsement policy', async () => {
            const commitSmartContractDefinitionStub: sinon.SinonStub = mySandBox.stub(LifecycleChannel.prototype, 'commitSmartContractDefinition');

            await connection.commitSmartContractDefinition('myOrderer', 'myChannel', ['Org1 Peer1'], new FabricSmartContractDefinition('myContract', '0.0.1', 1, undefined, `OutOf(1, 'Org1.member', 'Org2.member)`));

            commitSmartContractDefinitionStub.should.have.been.calledWith(['Org1 Peer1'], 'myOrderer', {
                smartContractName: 'myContract',
                smartContractVersion: '0.0.1',
                sequence: 1,
                endorsementPolicy: `OutOf(1, 'Org1.member', 'Org2.member)`,
                collectionConfig: undefined
            });
        });

        it('should commit a smart contract with collection config', async () => {
            const collectionconfig: FabricCollectionDefinition = new FabricCollectionDefinition('myCollection', `OR('Org1MSP.member')`, 5, 4);

            const commitSmartContractDefinitionStub: sinon.SinonStub = mySandBox.stub(LifecycleChannel.prototype, 'commitSmartContractDefinition');

            await connection.commitSmartContractDefinition('myOrderer', 'myChannel', ['Org1 Peer1'], new FabricSmartContractDefinition('myContract', '0.0.1', 1, undefined, undefined, [collectionconfig]));

            commitSmartContractDefinitionStub.should.have.been.calledWith(['Org1 Peer1'], 'myOrderer', {
                smartContractName: 'myContract',
                smartContractVersion: '0.0.1',
                sequence: 1,
                endorsementPolicy: undefined,
                collectionConfig: [collectionconfig]
            });
        });

        it('should commit a smart contract within a given timeout', async () => {
            const commitSmartContractDefinitionStub: sinon.SinonStub = mySandBox.stub(LifecycleChannel.prototype, 'commitSmartContractDefinition');

            await connection.commitSmartContractDefinition('myOrderer', 'myChannel', ['Org1 Peer1'], new FabricSmartContractDefinition('myContract', '0.0.1', 1), 9000000);

            commitSmartContractDefinitionStub.should.have.been.calledWith(['Org1 Peer1'], 'myOrderer', {
                smartContractName: 'myContract',
                smartContractVersion: '0.0.1',
                sequence: 1,
                endorsementPolicy: undefined,
                collectionConfig: undefined
            }, 9000000);
        });
    });

    describe('getCommitReadiness', () => {
        it('should get the commit readiness and return true', async () => {
            const resultMap: Map<string, boolean> = new Map<string, boolean>();
            resultMap.set('org1', true);
            resultMap.set('org2', true);
            const getCommitReadinessStub: sinon.SinonStub = mySandBox.stub(LifecycleChannel.prototype, 'getCommitReadiness').resolves(resultMap);

            const result: boolean = await connection.getCommitReadiness('myChannel', 'Org1 Peer1', new FabricSmartContractDefinition('myContract', '0.0.1', 1, undefined));

            result.should.equal(true);

            getCommitReadinessStub.should.have.been.calledWith('Org1 Peer1', {
                smartContractName: 'myContract',
                smartContractVersion: '0.0.1',
                sequence: 1,
                endorsementPolicy: undefined,
                collectionConfig: undefined
            });
        });

        it('should get the commit readiness and return false', async () => {
            const resultMap: Map<string, boolean> = new Map<string, boolean>();
            resultMap.set('org1', true);
            resultMap.set('org2', false);
            const getCommitReadinessStub: sinon.SinonStub = mySandBox.stub(LifecycleChannel.prototype, 'getCommitReadiness').resolves(resultMap);

            const result: boolean = await connection.getCommitReadiness('myChannel', 'Org1 Peer1', new FabricSmartContractDefinition('myContract', '0.0.1', 1, undefined));

            result.should.equal(false);

            getCommitReadinessStub.should.have.been.calledWith('Org1 Peer1', {
                smartContractName: 'myContract',
                smartContractVersion: '0.0.1',
                sequence: 1,
                endorsementPolicy: undefined,
                collectionConfig: undefined
            });
        });
    });

    describe('getOrgApprovals', () => {
        it('should get the commit readiness and return true', async () => {
            const resultMap: Map<string, boolean> = new Map<string, boolean>();
            resultMap.set('org1', true);
            resultMap.set('org2', true);
            const getCommitReadinessStub: sinon.SinonStub = mySandBox.stub(LifecycleChannel.prototype, 'getCommitReadiness').resolves(resultMap);

            const result: Map<string, boolean> = await connection.getOrgApprovals('myChannel', 'Org1 Peer1', new FabricSmartContractDefinition('myContract', '0.0.1', 1, undefined));

            result.should.deep.equal(resultMap);

            getCommitReadinessStub.should.have.been.calledWith('Org1 Peer1', {
                smartContractName: 'myContract',
                smartContractVersion: '0.0.1',
                sequence: 1,
                endorsementPolicy: undefined,
                collectionConfig: undefined
            });
        });

        it('should get the commit readiness and return false', async () => {
            const resultMap: Map<string, boolean> = new Map<string, boolean>();
            resultMap.set('org1', true);
            resultMap.set('org2', false);
            const getCommitReadinessStub: sinon.SinonStub = mySandBox.stub(LifecycleChannel.prototype, 'getCommitReadiness').resolves(resultMap);

            const result: Map<string, boolean> = await connection.getOrgApprovals('myChannel', 'Org1 Peer1', new FabricSmartContractDefinition('myContract', '0.0.1', 1, undefined));

            result.should.deep.equal(resultMap);

            getCommitReadinessStub.should.have.been.calledWith('Org1 Peer1', {
                smartContractName: 'myContract',
                smartContractVersion: '0.0.1',
                sequence: 1,
                endorsementPolicy: undefined,
                collectionConfig: undefined
            });
        });
    });

    describe('getEndorsementPolicyBuffer', () => {
        it('should get the endorsement policy buffer', () => {
            mySandBox.stub(LifecycleChannel, 'getEndorsementPolicyBytes').returns(Buffer.from('myPolicy'));
            const result: Buffer = connection.getEndorsementPolicyBuffer('myPolicy');

            result.should.deep.equal(Buffer.from('myPolicy'));
        });
    });

    describe('getCollectionConfigBuffer', () => {
        it('should get the collection config buffer', () => {
            const collection: FabricCollectionDefinition = {
                name: 'myCollection',
                policy: `OR('Org1MSP.member', 'Org2MSP.member')`,
                requiredPeerCount: 0,
                maxPeerCount: 3
            };

            mySandBox.stub(LifecycleChannel, 'getCollectionConfig').returns(Buffer.from([collection]));
            const result: Buffer = connection.getCollectionConfigBuffer([collection]);

            result.should.deep.equal(Buffer.from([collection]));
        });
    });

    describe('instantiateChaincode', () => {
        it('should instantiate the specified chaincode', async () => {
            const collectionDef: FabricCollectionDefinition[] = [new FabricCollectionDefinition('myCollection', `OR('Org1MSP)`, 4, 2)];
            const instantiateOrUpgradeSmartContractDefinitionStub: sinon.SinonStub = mySandBox.stub(LifecycleChannel.prototype, 'instantiateOrUpgradeSmartContractDefinition').resolves();
            await connection.instantiateChaincode('myChaincode', '0.0.1', ['Org1 Peer1', 'Org2 Peer1'], 'mychannel', 'instantiate', ['arg1'], JSON.stringify(collectionDef), `OR('Org1.member')`);

            // getNodeStub.should.have.been.calledWith('peer0.org1.example.com');
            instantiateOrUpgradeSmartContractDefinitionStub.should.have.been.calledWith(
                ['Org1 Peer1', 'Org2 Peer1'],
                connection['lifecycle'].getAllOrdererNames()[0],
                {
                    smartContractName: 'myChaincode',
                    smartContractVersion: '0.0.1',
                    sequence: -1,
                    endorsementPolicy: `OR('Org1.member')`,
                    collectionConfig: [{
                        maxPeerCount: 4,
                        name: 'myCollection',
                        policy: "OR('Org1MSP)",
                        requiredPeerCount: 2
                    }]
                },
                'instantiate',
                ['arg1'],
                false,
                5 * 60 * 1000
            );
        });
    });

    describe('upgradeChaincode', () => {
        it('should upgrade the specified chaincode', async () => {
            const instantiateOrUpgradeSmartContractDefinitionStub: sinon.SinonStub = mySandBox.stub(LifecycleChannel.prototype, 'instantiateOrUpgradeSmartContractDefinition').resolves();
            await connection.upgradeChaincode('myChaincode', '0.0.1', ['Org1 Peer1', 'Org2 Peer1'], 'mychannel', 'instantiate', ['arg1'], undefined, undefined);

            instantiateOrUpgradeSmartContractDefinitionStub.should.have.been.calledWith(
                ['Org1 Peer1', 'Org2 Peer1'],
                connection['lifecycle'].getAllOrdererNames()[0],
                {
                    smartContractName: 'myChaincode',
                    smartContractVersion: '0.0.1',
                    sequence: -1,
                    endorsementPolicy: undefined,
                    collectionConfig: undefined
                },
                'instantiate',
                ['arg1'],
                true,
                5 * 60 * 1000
            );
        });
    });

    describe('enroll', () => {
        beforeEach(() => {
            const mockFabricCA: sinon.SinonStubbedInstance<FabricCAServices> = mySandBox.createStubInstance(FabricCAServices);
            mockFabricCA.enroll.resolves({ certificate: 'myCert', key: { toBytes: mySandBox.stub().returns('myKey') } });
            connection['certificateAuthorities'].has('Org1 CA').should.be.true;
            connection['certificateAuthorities'].set('Org1 CA', mockFabricCA);
        });

        it('should enroll an identity using a certificate authority that exists', async () => {
            const result: { certificate: string, privateKey: string } = await connection.enroll('Org1 CA', 'myId', 'mySecret');
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
            connection['certificateAuthorities'].has('Org1 CA').should.be.true;
            connection['certificateAuthorities'].set('Org1 CA', mockFabricCA);
        });

        it('should register a new user and return a secret using a certificate authority that exists ', async () => {
            const secret: string = await connection.register('Org1 CA', 'enrollThis', 'departmentE');
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
            const secret: string = await connection.register('Org1 CA', 'enrollThis', 'departmentE', [{
                name: 'hello',
                value: 'world',
                ecert: true
            }]);
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
            const node: FabricNode = connection.getNode('Org1 CA');
            node.short_name.should.equal('org1ca');
            node.name.should.equal('Org1 CA');
            node.type.should.equal(FabricNodeType.CERTIFICATE_AUTHORITY);
            node.api_url.should.equal('http://org1ca-api.127-0-0-1.nip.io:8080');
            node.wallet.should.equal('Org1');
            node.identity.should.equal('Org1 CA Admin');
        });

        it('should throw for a node that does not exist', () => {
            ((): void => {
                connection.getNode('nosuch.ca.example.com');
            }).should.throw(/does not exist/);
        });
    });

    describe('getChannelCapabilityFromPeer', () => {
        let mockPeer: sinon.SinonStubbedInstance<LifecyclePeer>;
        let channelName: string;
        let peerName: string;

        beforeEach(() => {
            channelName = 'mychannel';
            peerName = 'Org1 Peer1';
            mockPeer = mySandBox.createStubInstance(LifecyclePeer);
            connection['lifecycle']['peers'].clear();
            connection['lifecycle']['peers'].set(peerName, mockPeer as unknown as LifecyclePeer);

            mockPeer.getChannelCapabilities.resolves(['V2_0']);
        });

        it('should get the capabilities of channel', async () => {
            const result: string[] = await connection.getChannelCapabilityFromPeer(channelName, peerName);
            result.should.deep.equal(['V2_0']);
            mockPeer.getChannelCapabilities.should.have.been.calledOnce;
        });

        it('should handle errors', async () => {
            const error: Error = new Error('some error');
            mockPeer.getChannelCapabilities.rejects(error);
            await connection.getChannelCapabilityFromPeer(channelName, peerName).should.be.rejectedWith(`Unable to determine channel capabilities of channel ${channelName}: ${error.message}`);
            mockPeer.getChannelCapabilities.should.have.been.calledOnce;
        });
    });
});
