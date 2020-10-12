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

import { FabricConnection } from '../src/FabricConnection';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as fabricClientCA from 'fabric-ca-client';
import { Gateway, Wallet, FileSystemWallet } from 'fabric-network';
import * as Client from 'fabric-client';
import { OutputAdapter, LogType } from 'ibm-blockchain-platform-common';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

// tslint:disable no-unused-expression
// tslint:disable no-use-before-declare
describe('FabricConnection', () => {

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

    // tslint:disable-next-line: max-classes-per-file
    class TestFabricConnection extends FabricConnection {

        private connectionProfile: any;

        constructor(connectionProfilePath: string, connectionProfile: any, outputAdapter: OutputAdapter) {
            super(connectionProfilePath, outputAdapter);
            this.connectionProfile = connectionProfile;
        }

        async connect(wallet: Wallet, identityName: string, _timeout: number): Promise<void> {
            this['gateway'] = fabricGatewayStub;
            await this.connectInner(this.connectionProfile, wallet, identityName, _timeout);
        }
    }

    let mySandBox: sinon.SinonSandbox;
    let fabricClientStub: sinon.SinonStubbedInstance<Client>;
    let fabricGatewayStub: sinon.SinonStubbedInstance<Gateway>;
    let fabricConnection: TestFabricConnection;
    let fabricChannelStub: sinon.SinonStubbedInstance<Client.Channel>;
    let fabricCAStub: sinon.SinonStubbedInstance<fabricClientCA>;
    let mockWallet: sinon.SinonStubbedInstance<Wallet>;
    const mockIdentityName: string = 'admin';

    const timeout: number = 120;

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
            channels: {
                'channel-from-the-ccp-no-peers': {

                },
                'channel-from-the-ccp': {
                    peers: {
                        'peer0.org1.example.com': {

                        }
                    }
                }
            },
            certificateAuthorities: {
                'ca.org1.example.com': {
                    url: 'https://localhost:7054'
                }
            }
        };
        mockWallet = mySandBox.createStubInstance(FileSystemWallet);
        mockWallet.list.resolves([{ label: 'admin' }]);

        fabricConnection = new TestFabricConnection('/tmp/somepath.json', connectionProfile, null);

        fabricClientStub = mySandBox.createStubInstance(Client);
        fabricClientStub.newTransactionID.returns({
            getTransactionID: mySandBox.stub().returns('1234')
        });

        fabricGatewayStub = mySandBox.createStubInstance(Gateway);

        fabricClientStub.getMspid.returns('myMSPId');
        fabricCAStub = mySandBox.createStubInstance(fabricClientCA);
        fabricCAStub.enroll.returns({ certificate: 'myCert', key: { toBytes: mySandBox.stub().returns('myKey') } });
        fabricCAStub.register.resolves('its a secret');
        fabricClientStub.getCertificateAuthority.returns(fabricCAStub);
        fabricGatewayStub.getClient.returns(fabricClientStub);
        fabricGatewayStub.connect.resolves();
        fabricGatewayStub.getCurrentIdentity.resolves({});

        fabricChannelStub = mySandBox.createStubInstance(Client.Channel);
        fabricChannelStub.sendInstantiateProposal.resolves([{}, {}]);
        fabricChannelStub.sendUpgradeProposal.resolves([{}, {}]);
        fabricChannelStub.sendTransaction.resolves({ status: 'SUCCESS' });
        fabricChannelStub.getOrganizations.resolves([{ id: 'Org1MSP' }]);

        const fabricNetworkStub: any = {
            getChannel: mySandBox.stub().returns(fabricChannelStub)
        };

        fabricGatewayStub.getNetwork.returns(fabricNetworkStub);
        fabricGatewayStub.disconnect.returns(null);

        fabricConnection['gateway'] = fabricGatewayStub;
        fabricConnection['outputAdapter'] = TestOutputAdapter.instance();

        await fabricConnection.connect(mockWallet, mockIdentityName, 120);
    });

    afterEach(() => {
        mySandBox.restore();
    });

    describe('constructor', () => {
        it('should set output adapter', async () => {
            const adapter: TestOutputAdapter = TestOutputAdapter.instance();
            const connectionProfile: any = {
                orderers: {
                    'orderer.example.com': {
                        url: 'grpc://localhost:7050'
                    }
                }
            };
            const fabConnection: TestFabricConnection = new TestFabricConnection('/tmp/somepath.json', connectionProfile, adapter);
            fabConnection['outputAdapter'].should.deep.equal(adapter);
        });
    });

    describe('connect', () => {

        it('should use discovery as localhost for localhost orderer connections', async () => {
            const connectionProfile: any = {
                orderers: {
                    'orderer.example.com': {
                        url: 'grpc://localhost:7050'
                    }
                }
            };
            fabricConnection = new TestFabricConnection('/tmp/somepath.json', connectionProfile, null);
            await fabricConnection.connect(mockWallet, mockIdentityName, timeout);

            fabricGatewayStub.connect.should.have.been.calledWith('/tmp/somepath.json', {
                wallet: mockWallet,
                identity: mockIdentityName,
                discovery: {
                    asLocalhost: true,
                    enabled: true
                },
                eventHandlerOptions: {
                    commitTimeout: timeout
                }
            });
        });

        it('should not use discovery as localhost for remote orderer connections', async () => {
            const connectionProfile: any = {
                orderers: {
                    'orderer.example.com': {
                        url: 'grpc://192.168.1.1:7050'
                    }
                }
            };
            fabricConnection = new TestFabricConnection('/tmp/somepath.json', connectionProfile, null);
            await fabricConnection.connect(mockWallet, mockIdentityName, timeout);
            fabricGatewayStub.connect.should.have.been.calledWith('/tmp/somepath.json', {
                wallet: mockWallet,
                identity: mockIdentityName,
                discovery: {
                    asLocalhost: false,
                    enabled: true
                },
                eventHandlerOptions: {
                    commitTimeout: timeout
                }
            });
        });

        it('should not use discovery as localhost for dodgy orderer connections', async () => {
            const connectionProfile: any = {
                orderers: {
                    'orderer.example.com': {
                        missingUrl: 'grpc://192.168.1.1:7050'
                    }
                }
            };
            fabricConnection = new TestFabricConnection('/tmp/somepath.json', connectionProfile, null);
            await fabricConnection.connect(mockWallet, mockIdentityName, timeout);
            fabricGatewayStub.connect.should.have.been.calledWith('/tmp/somepath.json', {
                wallet: mockWallet,
                identity: mockIdentityName,
                discovery: {
                    asLocalhost: false,
                    enabled: true
                },
                eventHandlerOptions: {
                    commitTimeout: timeout
                }
            });
        });

        it('should use discovery as localhost for localhost peer connections', async () => {
            const connectionProfile: any = {
                peers: {
                    'peer0.org1.example.com': {
                        url: 'grpc://localhost:7051'
                    }
                }
            };
            fabricConnection = new TestFabricConnection('/tmp/somepath.json', connectionProfile, null);
            await fabricConnection.connect(mockWallet, mockIdentityName, timeout);
            fabricGatewayStub.connect.should.have.been.calledWith('/tmp/somepath.json', {
                wallet: mockWallet,
                identity: mockIdentityName,
                discovery: {
                    asLocalhost: true,
                    enabled: true
                },
                eventHandlerOptions: {
                    commitTimeout: timeout
                }
            });
        });

        it('should not use discovery as localhost for remote peer connections', async () => {
            const connectionProfile: any = {
                peers: {
                    'peer0.org1.example.com': {
                        url: 'grpc://192.168.1.1:7051'
                    }
                }
            };
            fabricConnection = new TestFabricConnection('/tmp/somepath.json', connectionProfile, null);
            await fabricConnection.connect(mockWallet, mockIdentityName, timeout);
            fabricGatewayStub.connect.should.have.been.calledWith('/tmp/somepath.json', {
                wallet: mockWallet,
                identity: mockIdentityName,
                discovery: {
                    asLocalhost: false,
                    enabled: true
                },
                eventHandlerOptions: {
                    commitTimeout: timeout
                }
            });
        });

        it('should not use discovery as localhost for dodgy peer connections', async () => {
            const connectionProfile: any = {
                peers: {
                    'peer0.org1.example.com': {
                        missingUrl: 'grpc://192.168.1.1:7051'
                    }
                }
            };
            fabricConnection = new TestFabricConnection('/tmp/somepath.json', connectionProfile, null);
            await fabricConnection.connect(mockWallet, mockIdentityName, timeout);
            fabricGatewayStub.connect.should.have.been.calledWith('/tmp/somepath.json', {
                wallet: mockWallet,
                identity: mockIdentityName,
                discovery: {
                    asLocalhost: false,
                    enabled: true
                },
                eventHandlerOptions: {
                    commitTimeout: timeout
                }
            });
        });

        it('should use discovery as localhost for localhost certificate authority connections', async () => {
            const connectionProfile: any = {
                certificateAuthorities: {
                    'ca.org1.example.com': {
                        url: 'http://localhost:7054'
                    }
                }
            };
            fabricConnection = new TestFabricConnection('/tmp/somepath.json', connectionProfile, null);
            await fabricConnection.connect(mockWallet, mockIdentityName, timeout);
            fabricGatewayStub.connect.should.have.been.calledWith('/tmp/somepath.json', {
                wallet: mockWallet,
                identity: mockIdentityName,
                discovery: {
                    asLocalhost: true,
                    enabled: true
                },
                eventHandlerOptions: {
                    commitTimeout: timeout
                }
            });
        });

        it('should not use discovery as localhost for remote certificate authority connections', async () => {
            const connectionProfile: any = {
                certificateAuthorities: {
                    'ca.org1.example.com': {
                        url: 'http://192.168.1.1:7054'
                    }
                }
            };
            fabricConnection = new TestFabricConnection('/tmp/somepath.json', connectionProfile, null);
            await fabricConnection.connect(mockWallet, mockIdentityName, timeout);
            fabricGatewayStub.connect.should.have.been.calledWith('/tmp/somepath.json', {
                wallet: mockWallet,
                identity: mockIdentityName,
                discovery: {
                    asLocalhost: false,
                    enabled: true
                },
                eventHandlerOptions: {
                    commitTimeout: timeout
                }
            });
        });

        it('should not use discovery as localhost for dodgy certificate authority connections', async () => {
            const connectionProfile: any = {
                certificateAuthorities: {
                    'ca.org1.example.com': {
                        missingUrl: 'http://192.168.1.1:7054'
                    }
                }
            };
            fabricConnection = new TestFabricConnection('/tmp/somepath.json', connectionProfile, null);
            await fabricConnection.connect(mockWallet, mockIdentityName, timeout);
            fabricGatewayStub.connect.should.have.been.calledWith('/tmp/somepath.json', {
                wallet: mockWallet,
                identity: mockIdentityName,
                discovery: {
                    asLocalhost: false,
                    enabled: true
                },
                eventHandlerOptions: {
                    commitTimeout: timeout
                }
            });
        });

    });

    describe('getAllPeerNames', () => {
        it('should get all the names of the peer', async () => {
            const peerOne: Client.Peer = new Client.Peer('grpc://localhost:1454', { name: 'peerOne' });
            const peerTwo: Client.Peer = new Client.Peer('grpc://localhost:1453', { name: 'peerTwo' });

            fabricClientStub.getPeersForOrg.returns([peerOne, peerTwo]);

            await fabricConnection.connect(mockWallet, mockIdentityName, timeout);

            const peerNames: Array<string> = fabricConnection.getAllPeerNames();
            peerNames.should.deep.equal(['peerOne', 'peerTwo']);
        });
    });

    // describe('getPeer', () => {
    //     it('should get a peer', async () => {
    //         const peerOne: Peer = new Peer('grpc://localhost:1454', { name: 'peerOne' });
    //         const peerTwo: Peer = new Peer('grpc://localhost:1453', { name: 'peerTwo' });

    //         fabricClientStub.getPeersForOrg.returns([peerOne, peerTwo]);

    //         await fabricConnection.connect(mockWallet, mockIdentityName);

    //         const peer: Peer = await fabricConnection.getPeer('peerTwo');
    //         peer.getName().should.deep.equal('peerTwo');
    //     });
    // });

    describe('getAllChannelsForPeer', () => {
        it('should get all the channels a peer has joined', async () => {
            const peerOne: Client.Peer = new Client.Peer('grpc://localhost:1454', { name: 'peer0.org1.example.com' });

            fabricClientStub.getPeersForOrg.returns([peerOne]);

            const channelOne: { channel_id: string } = { channel_id: 'channel-one' };
            const channelTwo: { channel_id: string } = { channel_id: 'channel-two' };
            fabricClientStub.queryChannels.resolves({ channels: [channelOne, channelTwo] });

            await fabricConnection.connect(mockWallet, mockIdentityName, timeout);

            const channelNames: Array<string> = await fabricConnection.getAllChannelsForPeer('peer0.org1.example.com');

            channelNames.should.deep.equal(['channel-one', 'channel-two']);
        });

        it('should use the connection profile for the list of channels if the peer says access is denied', async () => {
            const peerOne: Client.Peer = new Client.Peer('grpc://localhost:1454', { name: 'peer0.org1.example.com' });

            fabricClientStub.getPeersForOrg.returns([peerOne]);

            fabricClientStub.queryChannels.rejects(new Error('blah access denied blah'));

            await fabricConnection.connect(mockWallet, mockIdentityName, timeout);

            const channelNames: Array<string> = await fabricConnection.getAllChannelsForPeer('peer0.org1.example.com');

            channelNames.should.deep.equal(['channel-from-the-ccp']);
        });

        it('should rethrow the error if the peer says access is denied and there are no matching channels in the connection profile', async () => {
            const peerOne: Client.Peer = new Client.Peer('grpc://localhost:1454', { name: 'peer0.org2.example.com' });

            fabricClientStub.getPeersForOrg.returns([peerOne]);

            fabricClientStub.queryChannels.rejects(new Error('blah access denied blah'));

            await fabricConnection.connect(mockWallet, mockIdentityName, timeout);

            await fabricConnection.getAllChannelsForPeer('peer0.org2.example.com')
                .should.be.rejectedWith(/blah access denied blah/);
        });

        it('should rethrow any other error', async () => {
            const peerOne: Client.Peer = new Client.Peer('grpc://localhost:1454', { name: 'peer0.org1.example.com' });

            fabricClientStub.getPeersForOrg.returns([peerOne]);

            fabricClientStub.queryChannels.rejects(new Error('such error'));

            await fabricConnection.connect(mockWallet, mockIdentityName, timeout);

            await fabricConnection.getAllChannelsForPeer('peer0.org1.example.com')
                .should.be.rejectedWith(/such error/);
        });
    });

    describe('getInstantiatedChaincode', () => {
        it('should get the instantiated chaincode from a channel in the connection profile', async () => {
            const channelOne: any = { channel_id: 'channel-one', queryInstantiatedChaincodes: mySandBox.stub() };

            channelOne.queryInstantiatedChaincodes.resolves({
                chaincodes: [{ name: 'biscuit-network', version: '0,7' }, { name: 'cake-network', version: '0.8' }]
            });

            fabricClientStub.getChannel.returns(channelOne);

            await fabricConnection.connect(mockWallet, mockIdentityName, timeout);
            const instantiatedChaincodes: Array<any> = await fabricConnection.getInstantiatedChaincode('channel-one');

            instantiatedChaincodes.should.deep.equal([{ name: 'biscuit-network', version: '0,7' }, {
                name: 'cake-network',
                version: '0.8'
            }]);
        });

        it('should get the instantiated chaincode from a channel using service discovery (localhost)', async () => {
            fabricConnection['discoveryEnabled'] = true;
            fabricConnection['discoveryAsLocalhost'] = true;
            const mockChannel: sinon.SinonStubbedInstance<Client.Channel> = mySandBox.createStubInstance(Client.Channel);
            fabricClientStub.newChannel.withArgs('myChannelFromDS').returns(mockChannel);
            const mockPeer1: sinon.SinonStubbedInstance<Client.Peer> = mySandBox.createStubInstance(Client.Peer);
            const mockPeer2: sinon.SinonStubbedInstance<Client.Peer> = mySandBox.createStubInstance(Client.Peer);
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
            const mockChannel: sinon.SinonStubbedInstance<Client.Channel> = mySandBox.createStubInstance(Client.Channel);
            fabricClientStub.newChannel.withArgs('myChannelFromDS').returns(mockChannel);
            const mockPeer1: sinon.SinonStubbedInstance<Client.Peer> = mySandBox.createStubInstance(Client.Peer);
            const mockPeer2: sinon.SinonStubbedInstance<Client.Peer> = mySandBox.createStubInstance(Client.Peer);
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
            const mockChannel: sinon.SinonStubbedInstance<Client.Channel> = mySandBox.createStubInstance(Client.Channel);
            fabricClientStub.newChannel.withArgs('myChannelFromDS').returns(mockChannel);
            const mockPeer1: sinon.SinonStubbedInstance<Client.Peer> = mySandBox.createStubInstance(Client.Peer);
            const mockPeer2: sinon.SinonStubbedInstance<Client.Peer> = mySandBox.createStubInstance(Client.Peer);
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
            const mockChannel: sinon.SinonStubbedInstance<Client.Channel> = mySandBox.createStubInstance(Client.Channel);
            fabricClientStub.newChannel.withArgs('myChannelFromDS').returns(mockChannel);
            const mockPeer1: sinon.SinonStubbedInstance<Client.Peer> = mySandBox.createStubInstance(Client.Peer);
            const mockPeer2: sinon.SinonStubbedInstance<Client.Peer> = mySandBox.createStubInstance(Client.Peer);
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
            fabricConnection.disconnect();
            fabricGatewayStub.disconnect.should.have.been.called;
        });
    });

    describe('createChannelMap', () => {
        let peer1: Client.Peer;
        let peer2: Client.Peer;

        beforeEach(async () => {
            peer1 = new Client.Peer('grpc://localhost:1454', { name: 'peerOne' });
            peer2 = new Client.Peer('grpc://localhost:1453', { name: 'peerTwo' });
            fabricClientStub.getPeersForOrg.returns([peer1, peer2]);

            fabricChannelStub.getChannelConfig.resolves();
            fabricChannelStub.getChannelCapabilities.returns(['V1_4_3']);
        });

        it('should create channel map', async () => {
            const getAllChannelsForPeerStub: sinon.SinonStub = mySandBox.stub(fabricConnection, 'getAllChannelsForPeer');
            getAllChannelsForPeerStub.withArgs('peerOne').returns(['channel1']);
            getAllChannelsForPeerStub.withArgs('peerTwo').returns(['channel2']);

            const _map: Map<string, Array<string>> = new Map<string, Array<string>>();
            _map.set('channel1', ['peerOne']);
            _map.set('channel2', ['peerTwo']);

            const createChannelsResult: {channelMap: Map<string, string[]>, v2channels: string[]} = await fabricConnection.createChannelMap();
            createChannelsResult.channelMap.should.deep.equal(_map);
            fabricChannelStub.getChannelConfig.should.have.been.calledTwice;
            fabricChannelStub.getChannelCapabilities.should.have.been.calledTwice;
        });

        it('should create channel map without v2 channels', async () => {
            fabricChannelStub.getChannelCapabilities.onFirstCall().returns(['V2_0']);
            fabricChannelStub.getChannelCapabilities.onSecondCall().returns(['V2_0']);
            fabricChannelStub.getChannelCapabilities.onThirdCall().returns(['V1_4_3']);

            const getAllChannelsForPeerStub: sinon.SinonStub = mySandBox.stub(fabricConnection, 'getAllChannelsForPeer');
            getAllChannelsForPeerStub.withArgs('peerOne').returns(['channel1']);
            getAllChannelsForPeerStub.withArgs('peerTwo').returns(['channel1', 'channel2']);

            const _map: Map<string, Array<string>> = new Map<string, Array<string>>();
            _map.set('channel2', ['peerTwo']);

            const createChannelsResult: {channelMap: Map<string, Array<string>>, v2channels: Array<string>} = await fabricConnection.createChannelMap();
            const map: Map<string, Array<string>> = createChannelsResult.channelMap;

            fabricChannelStub.getChannelCapabilities.should.have.been.calledThrice;
            map.should.deep.equal(_map);
         });

        it('should throw error when none of the channels is using v1_4 capabilities ', async () => {

            fabricChannelStub.getChannelCapabilities.returns(['V2_0']);

            const getAllChannelsForPeerStub: sinon.SinonStub = mySandBox.stub(fabricConnection, 'getAllChannelsForPeer');
            getAllChannelsForPeerStub.withArgs('peerOne').returns(['channel1']);
            getAllChannelsForPeerStub.withArgs('peerTwo').returns(['channel2']);

            await fabricConnection.createChannelMap().should.be.rejectedWith(`There are no channels with V1 capabilities enabled.`);

            fabricChannelStub.getChannelCapabilities.should.have.been.calledTwice;
        });

        it('should add any peers to channel map if the channel already exists', async () => {
            const getAllChannelsForPeerStub: sinon.SinonStub = mySandBox.stub(fabricConnection, 'getAllChannelsForPeer');
            getAllChannelsForPeerStub.withArgs('peerOne').returns(['channel1', 'channel2']);
            getAllChannelsForPeerStub.withArgs('peerTwo').returns(['channel2']);

            const _map: Map<string, Array<string>> = new Map<string, Array<string>>();
            _map.set('channel1', ['peerOne']);
            _map.set('channel2', ['peerOne', 'peerTwo']);

            const createChannelsResult: {channelMap: Map<string, string[]>, v2channels: string[]} = await fabricConnection.createChannelMap();
            createChannelsResult.channelMap.should.deep.equal(_map);
        });

        it('should handle gRPC connection errors', async () => {
            const error: Error = new Error('Received http2 header with status: 503');
            mySandBox.stub(fabricConnection, 'getAllChannelsForPeer').throws(error);

            await fabricConnection.createChannelMap().should.be.rejectedWith(`Cannot connect to Fabric: ${error.message}`);
        });

        it('should handle no peers', async () => {
            fabricClientStub.getPeersForOrg.returns([]);

            await fabricConnection.createChannelMap().should.be.rejectedWith('Error querying channel list: Could not find any peers to query the list of channels from');
        });

        it('should handle any other errors', async () => {
            const error: Error = new Error('some error');
            fabricClientStub.getPeersForOrg.throws(error);

            await fabricConnection.createChannelMap().should.be.rejectedWith(`Error querying channel list: ${error.message}`);
        });
    });

    describe('getChannelPeersInfo', () => {

        it('should get the channel peer names', async () => {
            const channelName: string = 'theChannelName';
            const peerNames: string[] = ['peerName1', 'peerName2'];
            const mspIds: string[] = ['Org1MSP', 'Org2MSP'];

            const getNameStub: sinon.SinonStub = mySandBox.stub();
            getNameStub.onCall(0).returns(peerNames[0]);
            getNameStub.onCall(1).returns(peerNames[1]);

            const getMspidStub: sinon.SinonStub = mySandBox.stub();
            getMspidStub.onCall(0).returns(mspIds[0]);
            getMspidStub.onCall(1).returns(mspIds[1]);

            fabricChannelStub.getChannelPeers.returns([{ getName: getNameStub, getMspid: getMspidStub }, { getName: getNameStub, getMspid: getMspidStub }]);

            const channelPeersInfo: { name: string, mspID: string }[] = await fabricConnection.getChannelPeersInfo(channelName);
            fabricChannelStub.getChannelPeers.should.have.been.calledOnce;
            getNameStub.should.have.been.calledTwice;
            channelPeersInfo.length.should.equal(2);
            channelPeersInfo.should.deep.equal([{ name: peerNames[0], mspID: mspIds[0] }, { name: peerNames[1], mspID: mspIds[1] }]);
        });

        it('should handle any errors', async () => {
            const channelName: string = 'theChannelName';

            const error: Error = new Error('Could not get channel');
            fabricChannelStub.getChannelPeers.throws(error);

            await fabricConnection.getChannelPeersInfo(channelName).should.be.rejectedWith(`Unable to get channel peers info: ${error.message}`);

        });
    });
});
