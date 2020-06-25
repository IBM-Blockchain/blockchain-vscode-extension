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
import { Gateway, Wallet } from 'fabric-network';
import { OutputAdapter, LogType } from 'ibm-blockchain-platform-common';
import { FabricWallet } from 'ibm-blockchain-platform-wallet';
import * as path from 'path';
import { Client, Channel } from 'fabric-common';
import { LifecyclePeer, LifecycleChannel } from 'ibm-blockchain-platform-fabric-admin';

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

        async connect(wallet: FabricWallet, identityName: string, requestTimeout: number): Promise<void> {
            this['gateway'] = fabricGatewayStub as any;

            await this.connectInner(this.connectionProfile, wallet.getWallet(), identityName, requestTimeout);
        }
    }

    let mySandBox: sinon.SinonSandbox;
    let fabricClientStub: sinon.SinonStubbedInstance<Client>;
    let fabricGatewayStub: sinon.SinonStubbedInstance<Gateway>;
    let fabricConnection: TestFabricConnection;
    let fabricChannelStub: sinon.SinonStubbedInstance<Channel>;
    let fabricCAStub: sinon.SinonStubbedInstance<fabricClientCA>;
    let mockWallet: sinon.SinonStubbedInstance<Wallet>;
    const mockIdentityName: string = 'admin';
    let fabricWallet: FabricWallet;

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
        mockWallet = mySandBox.createStubInstance(Wallet);
        mockWallet.list.resolves([{ label: 'admin' }]);

        fabricWallet = await FabricWallet.newFabricWallet(path.join(__dirname, 'tmp', 'wallet'));

        mySandBox.stub(fabricWallet, 'getWallet').returns(mockWallet);

        fabricConnection = new TestFabricConnection('/tmp/somepath.json', connectionProfile, null);

        fabricClientStub = mySandBox.createStubInstance(Client);

        fabricClientStub.getEndorsers.returns([{
            name: 'peer0.org1.example.com',
            mspid: 'Org1MSP',
            endpoint: {
                url: 'grpc://localhost:7051',
                options: {}
            }
        }, {
            name: 'peer0.org2.example.com',
            mspid: 'Org2MSP',
            endpoint: {
                url: 'grpc://localhost:8051',
                options: {}
            }
        }]);

        fabricGatewayStub = mySandBox.createStubInstance(Gateway);

        fabricCAStub = mySandBox.createStubInstance(fabricClientCA);
        fabricCAStub.enroll.returns({ certificate: 'myCert', key: { toBytes: mySandBox.stub().returns('myKey') } });
        fabricCAStub.register.resolves('its a secret');
        fabricGatewayStub['client'] = fabricClientStub;
        fabricGatewayStub.connect.resolves();
        fabricGatewayStub.getOptions.returns({wallet: mockWallet, identity: mockIdentityName});

        fabricChannelStub = mySandBox.createStubInstance(Channel);

        const fabricNetworkStub: any = {
            getChannel: mySandBox.stub().returns(fabricChannelStub)
        };

        fabricGatewayStub.getNetwork.returns(fabricNetworkStub);
        fabricGatewayStub.disconnect.returns(null);

        fabricConnection['gateway'] = fabricGatewayStub as any;
        fabricConnection['outputAdapter'] = TestOutputAdapter.instance();

        await fabricConnection.connect(fabricWallet, mockIdentityName, 120);
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
            await fabricConnection.connect(fabricWallet, mockIdentityName, timeout);

            fabricGatewayStub.connect.should.have.been.calledWith(connectionProfile, {
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
            await fabricConnection.connect(fabricWallet, mockIdentityName, timeout);
            fabricGatewayStub.connect.should.have.been.calledWith(connectionProfile, {
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
            await fabricConnection.connect(fabricWallet, mockIdentityName, timeout);
            fabricGatewayStub.connect.should.have.been.calledWith(connectionProfile, {
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
            await fabricConnection.connect(fabricWallet, mockIdentityName, timeout);
            fabricGatewayStub.connect.should.have.been.calledWith(connectionProfile, {
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
            await fabricConnection.connect(fabricWallet, mockIdentityName, timeout);
            fabricGatewayStub.connect.should.have.been.calledWith(connectionProfile, {
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
            await fabricConnection.connect(fabricWallet, mockIdentityName, timeout);
            fabricGatewayStub.connect.should.have.been.calledWith(connectionProfile, {
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
            await fabricConnection.connect(fabricWallet, mockIdentityName, timeout);
            fabricGatewayStub.connect.should.have.been.calledWith(connectionProfile, {
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
            await fabricConnection.connect(fabricWallet, mockIdentityName, timeout);
            fabricGatewayStub.connect.should.have.been.calledWith(connectionProfile, {
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
            await fabricConnection.connect(fabricWallet, mockIdentityName, timeout);
            fabricGatewayStub.connect.should.have.been.calledWith(connectionProfile, {
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
            const peerNames: Array<string> = fabricConnection.getAllPeerNames();
            peerNames.should.deep.equal(['peer0.org1.example.com', 'peer0.org2.example.com']);
        });
    });

    describe('getAllChannelsForPeer', () => {
        it('should get all the channels a peer has joined', async () => {
            mySandBox.stub(LifecyclePeer.prototype, 'getAllChannelNames').resolves(['channel-one', 'channel-two']);

            await fabricConnection.connect(fabricWallet, mockIdentityName, timeout);

            const channelNames: Array<string> = await fabricConnection.getAllChannelsForPeer('peer0.org1.example.com');

            channelNames.should.deep.equal(['channel-one', 'channel-two']);
        });

        it('should use the connection profile for the list of channels if the peer says access is denied', async () => {
            mySandBox.stub(LifecyclePeer.prototype, 'getAllChannelNames').rejects(new Error('blah access denied blah'));

            await fabricConnection.connect(fabricWallet, mockIdentityName, timeout);

            const channelNames: Array<string> = await fabricConnection.getAllChannelsForPeer('peer0.org1.example.com');

            channelNames.should.deep.equal(['channel-from-the-ccp']);
        });

        it('should rethrow the error if the peer says access is denied and there are no matching channels in the connection profile', async () => {
            mySandBox.stub(LifecyclePeer.prototype, 'getAllChannelNames').rejects(new Error('blah access denied blah'));

            await fabricConnection.connect(fabricWallet, mockIdentityName, timeout);

            await fabricConnection.getAllChannelsForPeer('peer0.org2.example.com')
                .should.be.rejectedWith(/blah access denied blah/);
        });

        it('should rethrow any other error', async () => {
            mySandBox.stub(LifecyclePeer.prototype, 'getAllChannelNames').rejects(new Error('such error'));

            await fabricConnection.connect(fabricWallet, mockIdentityName, timeout);

            await fabricConnection.getAllChannelsForPeer('peer0.org1.example.com')
                .should.be.rejectedWith(/such error/);
        });
    });

    describe('getInstantiatedChaincode', () => {
        it('should get the instantiated chaincode from a channel in the connection profile', async () => {
            mySandBox.stub(fabricConnection, 'getAllPeerNames').returns(['peerOne', 'peerTwo']);
            const getAllChannelsForPeerStub: sinon.SinonStub = mySandBox.stub(fabricConnection, 'getAllChannelsForPeer');
            getAllChannelsForPeerStub.withArgs('peerOne').returns(['channel1']);
            getAllChannelsForPeerStub.withArgs('peerTwo').returns(['channel2']);

            mySandBox.stub(LifecycleChannel.prototype, 'getAllCommittedSmartContracts').resolves([{smartContractName: 'biscuit-network', smartContractVersion: '0.7', sequence: 2}, {smartContractName: 'cake-network', smartContractVersion: '0.8', sequence: 3}]);

            await fabricConnection.connect(fabricWallet, mockIdentityName, timeout);
            const instantiatedChaincodes: Array<any> = await fabricConnection.getInstantiatedChaincode('channel1');

            instantiatedChaincodes.should.deep.equal([{ name: 'biscuit-network', version: '0.7', sequence: 2 }, {
                name: 'cake-network',
                version: '0.8',
                sequence: 3
            }]);
        });
    });

    describe('disconnect', () => {
        it('should disconnect from gateway', async () => {
            fabricConnection.disconnect();
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

        it('should handle no peers', async () => {
            mySandBox.stub(fabricConnection, 'getAllPeerNames').returns([]);

            await fabricConnection.createChannelMap().should.be.rejectedWith('Error querying channel list: Could not find any peers to query the list of channels from');
        });

        it('should handle any other errors', async () => {
            const error: Error = new Error('some error');
            mySandBox.stub(fabricConnection, 'getAllPeerNames').throws(error);

            await fabricConnection.createChannelMap().should.be.rejectedWith(`Error querying channel list: ${error.message}`);
        });
    });

    describe('getChannelPeersInfo', () => {

        it('should get the channel peer names', async () => {
            const channelName: string = 'theChannelName';
            const peerNames: string[] = ['peerName1', 'peerName2'];
            const mspIds: string[] = ['Org1MSP', 'Org2MSP'];

            fabricChannelStub.getEndorsers.returns([{ name: peerNames[0], mspid: mspIds[0] }, { name: peerNames[1], mspid: mspIds[1] }]);

            const channelPeersInfo: { name: string, mspID: string }[] = await fabricConnection.getChannelPeersInfo(channelName);
            fabricChannelStub.getEndorsers.should.have.been.calledOnce;
            channelPeersInfo.length.should.equal(2);
            channelPeersInfo.should.deep.equal([{ name: peerNames[0], mspID: mspIds[0] }, { name: peerNames[1], mspID: mspIds[1] }]);
        });

        it('should handle any errors', async () => {
            const channelName: string = 'theChannelName';

            const error: Error = new Error('Could not get channel');
            fabricChannelStub.getEndorsers.throws(error);

            await fabricConnection.getChannelPeersInfo(channelName).should.be.rejectedWith(`Unable to get channel peers info: ${error.message}`);
        });
    });
});
