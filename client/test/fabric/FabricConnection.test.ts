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

import { FabricConnection } from '../../src/fabric/FabricConnection';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as fabricClient from 'fabric-client';
import * as fabricClientCA from 'fabric-ca-client';
import { Gateway, Wallet, FileSystemWallet } from 'fabric-network';
import { Channel, Peer } from 'fabric-client';
import { VSCodeBlockchainOutputAdapter } from '../../src/logging/VSCodeBlockchainOutputAdapter';
import { OutputAdapter } from '../../src/logging/OutputAdapter';

chai.should();
chai.use(sinonChai);

// tslint:disable no-unused-expression
// tslint:disable no-use-before-declare
describe('FabricConnection', () => {

    class TestFabricConnection extends FabricConnection {

        private connectionProfile: any;

        constructor(connectionProfile: any, outputAdapter?: OutputAdapter) {
            super(outputAdapter);
            this.connectionProfile = connectionProfile;
        }

        async connect(wallet: Wallet, identityName: string): Promise<void> {
            this['gateway'] = fabricGatewayStub;
            await this.connectInner(this.connectionProfile, wallet, identityName);
        }
    }

    let fabricClientStub: sinon.SinonStubbedInstance<fabricClient>;
    let fabricGatewayStub: sinon.SinonStubbedInstance<Gateway>;
    let fabricConnection: TestFabricConnection;
    let fabricChannelStub: sinon.SinonStubbedInstance<Channel>;
    let fabricCAStub: sinon.SinonStubbedInstance<fabricClientCA>;
    let mockWallet: sinon.SinonStubbedInstance<Wallet>;
    const mockIdentityName: string = 'admin';

    let mySandBox: sinon.SinonSandbox;

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();

        const connectionProfile: any = {
            peers: {
                'peer0.org1.example.com': {
                    url: 'grpc://localhost:7051'
                }
            },
            orderers: {
                'orderer.example.com': {
                    url: 'grpc://localhost:7050'
                }
            },
            certificateAuthorities: {
                'ca.org1.example.com': {
                    url: 'https://localhost:7054'
                }
            }
        };
        mockWallet = sinon.createStubInstance(FileSystemWallet);
        mockWallet.list.resolves([{ label: 'admin' }]);

        fabricConnection = new TestFabricConnection(connectionProfile);

        fabricClientStub = mySandBox.createStubInstance(fabricClient);
        fabricClientStub.newTransactionID.returns({
            getTransactionID: mySandBox.stub().returns('1234')
        });

        fabricGatewayStub = mySandBox.createStubInstance(Gateway);

        fabricClientStub.getMspid.returns('myMSPId');
        fabricCAStub = mySandBox.createStubInstance(fabricClientCA);
        fabricCAStub.enroll.returns({certificate : 'myCert', key : { toBytes : mySandBox.stub().returns('myKey')}});
        fabricCAStub.register.resolves('its a secret');
        fabricClientStub.getCertificateAuthority.returns(fabricCAStub);
        fabricGatewayStub.getClient.returns(fabricClientStub);
        fabricGatewayStub.connect.resolves();
        fabricGatewayStub.getCurrentIdentity.resolves({});

        fabricChannelStub = sinon.createStubInstance(Channel);
        fabricChannelStub.sendInstantiateProposal.resolves([{}, {}]);
        fabricChannelStub.sendUpgradeProposal.resolves([{}, {}]);
        fabricChannelStub.sendTransaction.resolves({ status: 'SUCCESS' });
        fabricChannelStub.getOrganizations.resolves([{id: 'Org1MSP'}]);

        const fabricNetworkStub: any = {
            getChannel: mySandBox.stub().returns(fabricChannelStub)
        };

        fabricGatewayStub.getNetwork.returns(fabricNetworkStub);
        fabricGatewayStub.disconnect.returns(null);

        fabricConnection['gateway'] = fabricGatewayStub;
        fabricConnection['outputAdapter'] = VSCodeBlockchainOutputAdapter.instance();

        await fabricConnection.connect(mockWallet, mockIdentityName);
    });

    afterEach(() => {
        mySandBox.restore();
    });

    describe('constructor', () => {
        it('should set output adapter', async () => {
            const adapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
            const connectionProfile: any  = {
                orderers: {
                    'orderer.example.com': {
                        url: 'grpc://localhost:7050'
                    }
                }
            };
            const fabConnection: TestFabricConnection = new TestFabricConnection(connectionProfile, adapter);
            fabConnection['outputAdapter'].should.deep.equal(adapter);
        });
    });

    describe('connect', () => {

        it('should use discovery as localhost for localhost orderer connections', async () => {
            const connectionProfile: any  = {
                orderers: {
                    'orderer.example.com': {
                        url: 'grpc://localhost:7050'
                    }
                }
            };
            fabricConnection = new TestFabricConnection(connectionProfile);
            await fabricConnection.connect(mockWallet, mockIdentityName);
            fabricConnection['discoveryAsLocalhost'].should.be.true;
            fabricConnection['discoveryEnabled'].should.be.false;
        });

        it('should not use discovery as localhost for remote orderer connections', async () => {
            const connectionProfile: any  = {
                orderers: {
                    'orderer.example.com': {
                        url: 'grpc://192.168.1.1:7050'
                    }
                }
            };
            fabricConnection = new TestFabricConnection(connectionProfile);
            await fabricConnection.connect(mockWallet, mockIdentityName);
            fabricConnection['discoveryAsLocalhost'].should.be.false;
            fabricConnection['discoveryEnabled'].should.be.true;
        });

        it('should not use discovery as localhost for dodgy orderer connections', async () => {
            const connectionProfile: any  = {
                orderers: {
                    'orderer.example.com': {
                        missingUrl: 'grpc://192.168.1.1:7050'
                    }
                }
            };
            fabricConnection = new TestFabricConnection(connectionProfile);
            await fabricConnection.connect(mockWallet, mockIdentityName);
            fabricConnection['discoveryAsLocalhost'].should.be.false;
            fabricConnection['discoveryEnabled'].should.be.true;
        });

        it('should use discovery as localhost for localhost peer connections', async () => {
            const connectionProfile: any  = {
                peers: {
                    'peer0.org1.example.com': {
                        url: 'grpc://localhost:7051'
                    }
                }
            };
            fabricConnection = new TestFabricConnection(connectionProfile);
            await fabricConnection.connect(mockWallet, mockIdentityName);
            fabricConnection['discoveryAsLocalhost'].should.be.true;
            fabricConnection['discoveryEnabled'].should.be.false;
        });

        it('should not use discovery as localhost for remote peer connections', async () => {
            const connectionProfile: any  = {
                peers: {
                    'peer0.org1.example.com': {
                        url: 'grpc://192.168.1.1:7051'
                    }
                }
            };
            fabricConnection = new TestFabricConnection(connectionProfile);
            await fabricConnection.connect(mockWallet, mockIdentityName);
            fabricConnection['discoveryAsLocalhost'].should.be.false;
            fabricConnection['discoveryEnabled'].should.be.true;
        });

        it('should not use discovery as localhost for dodgy peer connections', async () => {
            const connectionProfile: any  = {
                peers: {
                    'peer0.org1.example.com': {
                        missingUrl: 'grpc://192.168.1.1:7051'
                    }
                }
            };
            fabricConnection = new TestFabricConnection(connectionProfile);
            await fabricConnection.connect(mockWallet, mockIdentityName);
            fabricConnection['discoveryAsLocalhost'].should.be.false;
            fabricConnection['discoveryEnabled'].should.be.true;
        });

        it('should use discovery as localhost for localhost certificate authority connections', async () => {
            const connectionProfile: any  = {
                certificateAuthorities: {
                    'ca.org1.example.com': {
                        url: 'http://localhost:7054'
                    }
                }
            };
            fabricConnection = new TestFabricConnection(connectionProfile);
            await fabricConnection.connect(mockWallet, mockIdentityName);
            fabricConnection['discoveryAsLocalhost'].should.be.true;
            fabricConnection['discoveryEnabled'].should.be.false;
        });

        it('should not use discovery as localhost for remote certificate authority connections', async () => {
            const connectionProfile: any  = {
                certificateAuthorities: {
                    'ca.org1.example.com': {
                        url: 'http://192.168.1.1:7054'
                    }
                }
            };
            fabricConnection = new TestFabricConnection(connectionProfile);
            await fabricConnection.connect(mockWallet, mockIdentityName);
            fabricConnection['discoveryAsLocalhost'].should.be.false;
            fabricConnection['discoveryEnabled'].should.be.true;
        });

        it('should not use discovery as localhost for dodgy certificate authority connections', async () => {
            const connectionProfile: any  = {
                certificateAuthorities: {
                    'ca.org1.example.com': {
                        missingUrl: 'http://192.168.1.1:7054'
                    }
                }
            };
            fabricConnection = new TestFabricConnection(connectionProfile);
            await fabricConnection.connect(mockWallet, mockIdentityName);
            fabricConnection['discoveryAsLocalhost'].should.be.false;
            fabricConnection['discoveryEnabled'].should.be.true;
        });

    });

    describe('getAllPeerNames', () => {
        it('should get all the names of the peer', async () => {
            const peerOne: fabricClient.Peer = new fabricClient.Peer('grpc://localhost:1454', { name: 'peerOne' });
            const peerTwo: fabricClient.Peer = new fabricClient.Peer('grpc://localhost:1453', { name: 'peerTwo' });

            fabricClientStub.getPeersForOrg.returns([peerOne, peerTwo]);

            await fabricConnection.connect(mockWallet, mockIdentityName);

            const peerNames: Array<string> = await fabricConnection.getAllPeerNames();
            peerNames.should.deep.equal(['peerOne', 'peerTwo']);
        });
    });

    // describe('getPeer', () => {
    //     it('should get a peer', async () => {
    //         const peerOne: fabricClient.Peer = new fabricClient.Peer('grpc://localhost:1454', { name: 'peerOne' });
    //         const peerTwo: fabricClient.Peer = new fabricClient.Peer('grpc://localhost:1453', { name: 'peerTwo' });

    //         fabricClientStub.getPeersForOrg.returns([peerOne, peerTwo]);

    //         await fabricConnection.connect(mockWallet, mockIdentityName);

    //         const peer: fabricClient.Peer = await fabricConnection.getPeer('peerTwo');
    //         peer.getName().should.deep.equal('peerTwo');
    //     });
    // });

    describe('getAllChannelsForPeer', () => {
        it('should get all the channels a peer has joined', async () => {
            const peerOne: fabricClient.Peer = new fabricClient.Peer('grpc://localhost:1454', { name: 'peerOne' });

            fabricClientStub.getPeersForOrg.returns([peerOne]);

            const channelOne: { channel_id: string } = { channel_id: 'channel-one' };
            const channelTwo: { channel_id: string } = { channel_id: 'channel-two' };
            fabricClientStub.queryChannels.resolves({ channels: [channelOne, channelTwo] });

            await fabricConnection.connect(mockWallet, mockIdentityName);

            const channelNames: Array<string> = await fabricConnection.getAllChannelsForPeer('peerTwo');

            channelNames.should.deep.equal(['channel-one', 'channel-two']);
        });
    });

    describe('getInstantiatedChaincode', () => {
        it('should get the instantiated chaincode from a channel in the connection profile', async () => {
            const channelOne: any = { channel_id: 'channel-one', queryInstantiatedChaincodes: mySandBox.stub() };

            channelOne.queryInstantiatedChaincodes.resolves({
                chaincodes: [{ name: 'biscuit-network', version: '0,7' }, { name: 'cake-network', version: '0.8' }]
            });

            fabricClientStub.getChannel.returns(channelOne);

            await fabricConnection.connect(mockWallet, mockIdentityName);
            const instantiatedChaincodes: Array<any> = await fabricConnection.getInstantiatedChaincode('channel-one');

            instantiatedChaincodes.should.deep.equal([{ name: 'biscuit-network', version: '0,7' }, {
                name: 'cake-network',
                version: '0.8'
            }]);
        });

        it('should get the instantiated chaincode from a channel using service discovery (localhost)', async () => {
            fabricConnection['discoveryEnabled'] = true;
            fabricConnection['discoveryAsLocalhost'] = true;
            const mockChannel: sinon.SinonStubbedInstance<Channel> = sinon.createStubInstance(Channel);
            fabricClientStub.newChannel.withArgs('myChannelFromDS').returns(mockChannel);
            const mockPeer1: sinon.SinonStubbedInstance<Peer> = sinon.createStubInstance(Peer);
            const mockPeer2: sinon.SinonStubbedInstance<Peer> = sinon.createStubInstance(Peer);
            fabricClientStub.getPeersForOrg.returns([mockPeer1, mockPeer2]);
            mockChannel.initialize.resolves();
            mockChannel.queryInstantiatedChaincodes.resolves({
                chaincodes: [{ name: 'biscuit-network', version: '0,7' }, { name: 'cake-network', version: '0.8' }]
            });
            const instantiatedChaincodes: Array<any> = await fabricConnection.getInstantiatedChaincode('myChannelFromDS');
            mockChannel.initialize.should.have.been.calledOnceWithExactly({ asLocalhost: true, discover: true, target: mockPeer1 });
            instantiatedChaincodes.should.deep.equal([{ name: 'biscuit-network', version: '0,7' }, {
                name: 'cake-network',
                version: '0.8'
            }]);
        });

        it('should get the instantiated chaincode from a channel using service discovery (non-localhost)', async () => {
            fabricConnection['discoveryEnabled'] = true;
            fabricConnection['discoveryAsLocalhost'] = false;
            const mockChannel: sinon.SinonStubbedInstance<Channel> = sinon.createStubInstance(Channel);
            fabricClientStub.newChannel.withArgs('myChannelFromDS').returns(mockChannel);
            const mockPeer1: sinon.SinonStubbedInstance<Peer> = sinon.createStubInstance(Peer);
            const mockPeer2: sinon.SinonStubbedInstance<Peer> = sinon.createStubInstance(Peer);
            fabricClientStub.getPeersForOrg.returns([mockPeer1, mockPeer2]);
            mockChannel.initialize.resolves();
            mockChannel.queryInstantiatedChaincodes.resolves({
                chaincodes: [{ name: 'biscuit-network', version: '0,7' }, { name: 'cake-network', version: '0.8' }]
            });
            const instantiatedChaincodes: Array<any> = await fabricConnection.getInstantiatedChaincode('myChannelFromDS');
            mockChannel.initialize.should.have.been.calledOnceWithExactly({ asLocalhost: false, discover: true, target: mockPeer1 });
            instantiatedChaincodes.should.deep.equal([{ name: 'biscuit-network', version: '0,7' }, {
                name: 'cake-network',
                version: '0.8'
            }]);
        });

        it('should get the instantiated chaincode from a channel using service discovery even if first peer fails', async () => {
            fabricConnection['discoveryEnabled'] = true;
            fabricConnection['discoveryAsLocalhost'] = true;
            const mockChannel: sinon.SinonStubbedInstance<Channel> = sinon.createStubInstance(Channel);
            fabricClientStub.newChannel.withArgs('myChannelFromDS').returns(mockChannel);
            const mockPeer1: sinon.SinonStubbedInstance<Peer> = sinon.createStubInstance(Peer);
            const mockPeer2: sinon.SinonStubbedInstance<Peer> = sinon.createStubInstance(Peer);
            fabricClientStub.getPeersForOrg.returns([mockPeer1, mockPeer2]);
            mockChannel.initialize.onFirstCall().rejects(new Error('such error'));
            mockChannel.initialize.onSecondCall().resolves();
            mockChannel.queryInstantiatedChaincodes.resolves({
                chaincodes: [{ name: 'biscuit-network', version: '0,7' }, { name: 'cake-network', version: '0.8' }]
            });
            const instantiatedChaincodes: Array<any> = await fabricConnection.getInstantiatedChaincode('myChannelFromDS');
            mockChannel.initialize.should.have.been.calledTwice;
            mockChannel.initialize.should.have.been.calledWithExactly({ asLocalhost: true, discover: true, target: mockPeer1 });
            mockChannel.initialize.should.have.been.calledWithExactly({ asLocalhost: true, discover: true, target: mockPeer2 });
            instantiatedChaincodes.should.deep.equal([{ name: 'biscuit-network', version: '0,7' }, {
                name: 'cake-network',
                version: '0.8'
            }]);
        });

        it('should throw an error for a channel using service discovery if all peers fail', async () => {
            fabricConnection['discoveryEnabled'] = true;
            fabricConnection['discoveryAsLocalhost'] = true;
            const mockChannel: sinon.SinonStubbedInstance<Channel> = sinon.createStubInstance(Channel);
            fabricClientStub.newChannel.withArgs('myChannelFromDS').returns(mockChannel);
            const mockPeer1: sinon.SinonStubbedInstance<Peer> = sinon.createStubInstance(Peer);
            const mockPeer2: sinon.SinonStubbedInstance<Peer> = sinon.createStubInstance(Peer);
            fabricClientStub.getPeersForOrg.returns([mockPeer1, mockPeer2]);
            mockChannel.initialize.rejects(new Error('such error'));
            mockChannel.queryInstantiatedChaincodes.resolves({
                chaincodes: [{ name: 'biscuit-network', version: '0,7' }, { name: 'cake-network', version: '0.8' }]
            });
            await fabricConnection.getInstantiatedChaincode('myChannelFromDS').should.be.rejectedWith(/such error/);
        });
    });

    describe('disconnect', () => {
        it('should disconnect from gateway', async () => {
            await fabricConnection.disconnect();
            fabricGatewayStub.disconnect.should.have.been.called;
        });
    });

    describe('createChannelMap', () => {

        it('should create channel map', async () => {
            mySandBox.stub(fabricConnection, 'getAllPeerNames').returns(['peerOne', 'peerTwo']);
            const getAllChannelsForPeerStub: sinon.SinonStub = mySandBox.stub(fabricConnection, 'getAllChannelsForPeer');
            getAllChannelsForPeerStub.withArgs('peerOne').returns(['channel1']);
            getAllChannelsForPeerStub.withArgs('peerTwo').returns(['channel2']);

            const _map: Map<string, Array<string>> = new Map<string, Array<string>>();
            _map.set('channel1', ['peerOne']);
            _map.set('channel2', ['peerTwo']);

            const map: Map<string, Array<string>> = await fabricConnection.createChannelMap();
            map.should.deep.equal(_map);
        });

        it('should add any peers to channel map if the channel already exists', async () => {
            mySandBox.stub(fabricConnection, 'getAllPeerNames').returns(['peerOne', 'peerTwo']);
            const getAllChannelsForPeerStub: sinon.SinonStub = mySandBox.stub(fabricConnection, 'getAllChannelsForPeer');
            getAllChannelsForPeerStub.withArgs('peerOne').returns(['channel1', 'channel2']);
            getAllChannelsForPeerStub.withArgs('peerTwo').returns(['channel2']);

            const _map: Map<string, Array<string>> = new Map<string, Array<string>>();
            _map.set('channel1', ['peerOne']);
            _map.set('channel2', ['peerOne', 'peerTwo']);

            const map: Map<string, Array<string>> = await fabricConnection.createChannelMap();
            map.should.deep.equal(_map);
        });

        it('should handle gRPC connection errors', async () => {
            mySandBox.stub(fabricConnection, 'getAllPeerNames').returns(['peerOne', 'peerTwo']);

            const error: Error = new Error('Received http2 header with status: 503');
            mySandBox.stub(fabricConnection, 'getAllChannelsForPeer').throws(error);

            await fabricConnection.createChannelMap().should.be.rejectedWith(`Cannot connect to Fabric: ${error.message}`);
        });

        it('should handle any other errors', async () => {
            const error: Error = new Error('some error');
            mySandBox.stub(fabricConnection, 'getAllPeerNames').throws(error);

            await fabricConnection.createChannelMap().should.be.rejectedWith(`Error creating channel map: ${error.message}`);
        });
    });
});
