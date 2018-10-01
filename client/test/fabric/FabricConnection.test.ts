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
import { PackageRegistryEntry } from '../../src/packages/PackageRegistryEntry';

import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as fabricClient from 'fabric-client';
import { Gateway } from 'fabric-network';
import { Channel } from 'fabric-client';

chai.should();
chai.use(sinonChai);

// tslint:disable no-unused-expression
describe('FabricConnection', () => {

    class TestFabricConnection extends FabricConnection {

        async connect(): Promise<void> {
            this['gateway'] = fabricGatewayStub;
        }

    }

    let fabricClientStub: sinon.SinonStubbedInstance<fabricClient>;
    let fabricGatewayStub: sinon.SinonStubbedInstance<Gateway>;
    let fabricConnection: TestFabricConnection;
    let fabricContractStub;
    let fabricChannelStub: sinon.SinonStubbedInstance<Channel>;

    let mySandBox: sinon.SinonSandbox;

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();

        fabricConnection = new TestFabricConnection();
        await fabricConnection.connect();

        fabricClientStub = mySandBox.createStubInstance(fabricClient);
        fabricClientStub.newTransactionID.returns({
            getTransactionID: mySandBox.stub().returns('1234')
        });

        fabricGatewayStub = mySandBox.createStubInstance(Gateway);

        fabricClientStub.getMspid.returns('myMSPId');
        fabricGatewayStub.getClient.returns(fabricClientStub);
        fabricGatewayStub.connect.resolves();

        const eventHandlerStub = {
            startListening: mySandBox.stub(),
            cancelListening: mySandBox.stub(),
        };

        fabricContractStub = {
            _validatePeerResponses: mySandBox.stub(),
            eventHandlerFactory: {
                createTxEventHandler: mySandBox.stub().returns(eventHandlerStub)
            }
        };

        fabricChannelStub = sinon.createStubInstance(Channel);
        fabricChannelStub.sendInstantiateProposal.resolves([{}, {}]);
        fabricChannelStub.sendTransaction.resolves({status: 'SUCCESS'});

        const fabricNetworkStub = {
            getContract: mySandBox.stub().returns(fabricContractStub),
            getChannel: mySandBox.stub().returns(fabricChannelStub)
        };

        fabricGatewayStub.getNetwork.returns(fabricNetworkStub);

        fabricConnection['gateway'] = fabricGatewayStub;
    });

    afterEach(() => {
        mySandBox.restore();
    });

    describe('getAllPeerNames', () => {
        it('should get all the names of the peer', async () => {
            const peerOne: fabricClient.Peer = new fabricClient.Peer('grpc://localhost:1454', {name: 'peerOne'});
            const peerTwo: fabricClient.Peer = new fabricClient.Peer('grpc://localhost:1453', {name: 'peerTwo'});

            fabricClientStub.getPeersForOrg.returns([peerOne, peerTwo]);

            await fabricConnection.connect();

            const peerNames: Array<string> = await fabricConnection.getAllPeerNames();
            peerNames.should.deep.equal(['peerOne', 'peerTwo']);
        });
    });

    describe('getPeer', () => {
        it('should get a peer', async () => {
            const peerOne: fabricClient.Peer = new fabricClient.Peer('grpc://localhost:1454', {name: 'peerOne'});
            const peerTwo: fabricClient.Peer = new fabricClient.Peer('grpc://localhost:1453', {name: 'peerTwo'});

            fabricClientStub.getPeersForOrg.returns([peerOne, peerTwo]);

            await fabricConnection.connect();

            const peer: fabricClient.Peer = await fabricConnection.getPeer('peerTwo');
            peer.getName().should.deep.equal('peerTwo');
        });
    });

    describe('getAllChannelsForPeer', () => {
        it('should get all the channels a peer has joined', async () => {
            const peerOne: fabricClient.Peer = new fabricClient.Peer('grpc://localhost:1454', {name: 'peerOne'});

            fabricClientStub.getPeersForOrg.returns([peerOne]);

            const channelOne = {channel_id: 'channel-one'};
            const channelTwo = {channel_id: 'channel-two'};
            fabricClientStub.queryChannels.resolves({channels: [channelOne, channelTwo]});

            await fabricConnection.connect();

            const channelNames: Array<string> = await fabricConnection.getAllChannelsForPeer('peerTwo');

            channelNames.should.deep.equal(['channel-one', 'channel-two']);
        });
    });

    describe('getInstalledChaincode', () => {
        it('should get the install chaincode', async () => {
            const peerOne: fabricClient.Peer = new fabricClient.Peer('grpc://localhost:1454', {name: 'peerOne'});
            const peerTwo: fabricClient.Peer = new fabricClient.Peer('grpc://localhost:1453', {name: 'peerTwo'});

            fabricClientStub.getPeersForOrg.returns([peerOne, peerTwo]);

            fabricClientStub.queryInstalledChaincodes.withArgs(peerOne).resolves({
                chaincodes: [{
                    name: 'biscuit-network',
                    version: '0.7'
                }, {name: 'biscuit-network', version: '0.8'}, {name: 'cake-network', version: '0.8'}]
            });

            await fabricConnection.connect();
            const installedChaincode: Map<string, Array<string>> = await fabricConnection.getInstalledChaincode('peerOne');
            installedChaincode.size.should.equal(2);
            Array.from(installedChaincode.keys()).should.deep.equal(['biscuit-network', 'cake-network']);
            installedChaincode.get('biscuit-network').should.deep.equal(['0.7', '0.8']);
            installedChaincode.get('cake-network').should.deep.equal(['0.8']);
        });
    });

    describe('getInstantiatedChaincode', () => {
        it('should get the instantiated chaincode', async () => {
            const channelOne = {channel_id: 'channel-one', queryInstantiatedChaincodes: mySandBox.stub()};

            channelOne.queryInstantiatedChaincodes.resolves({
                chaincodes: [{name: 'biscuit-network', version: '0,7'}, {name: 'cake-network', version: '0.8'}]
            });

            fabricClientStub.getChannel.returns(channelOne);

            await fabricConnection.connect();
            const instantiatedChaincodes: Array<any> = await fabricConnection.getInstantiatedChaincode('channel-one');

            instantiatedChaincodes.should.deep.equal([{name: 'biscuit-network', version: '0,7'}, {
                name: 'cake-network',
                version: '0.8'
            }]);
        });
    });

    describe('installChaincode', () => {

        let peer: fabricClient.Peer;
        beforeEach(async () => {
            peer = new fabricClient.Peer('grpc://localhost:1453', {name: 'peer1'});
            fabricClientStub.getPeersForOrg.returns([peer]);
            fabricClientStub.installChaincode.resolves();
            await fabricConnection.connect();
        });

        it('should install javascript chaincode', async () => {
            const packageEntry: PackageRegistryEntry = new PackageRegistryEntry();
            packageEntry.name = 'my-smart-contract';
            packageEntry.chaincodeLanguage = 'javascript';
            packageEntry.version = '1.0.0';
            packageEntry.path = 'myPath/mySmartContract';

            await fabricConnection.installChaincode(packageEntry, 'peer1');
            fabricClientStub.installChaincode.should.have.been.calledWith({
                targets: [peer],
                chaincodePath: packageEntry.path,
                chaincodeId: packageEntry.name,
                chaincodeVersion: packageEntry.version,
                chaincodeType: 'node',
                txId: sinon.match.any
            });
        });

        it('should install typescript chaincode', async () => {
            const packageEntry: PackageRegistryEntry = new PackageRegistryEntry();
            packageEntry.name = 'my-smart-contract';
            packageEntry.chaincodeLanguage = 'typescript';
            packageEntry.version = '1.0.0';
            packageEntry.path = 'myPath/mySmartContract';

            await fabricConnection.installChaincode(packageEntry, 'peer1');
            fabricClientStub.installChaincode.should.have.been.calledWith({
                targets: [peer],
                chaincodePath: packageEntry.path,
                chaincodeId: packageEntry.name,
                chaincodeVersion: packageEntry.version,
                chaincodeType: 'node',
                txId: sinon.match.any
            });
        });

        it('should install go chaincode', async () => {
            const packageEntry: PackageRegistryEntry = new PackageRegistryEntry();
            packageEntry.name = 'my-smart-contract';
            packageEntry.chaincodeLanguage = 'go';
            packageEntry.version = '1.0.0';
            packageEntry.path = 'myPath/mySmartContract';

            await fabricConnection.installChaincode(packageEntry, 'peer1');
            fabricClientStub.installChaincode.should.have.been.calledWith({
                targets: [peer],
                chaincodePath: 'mySmartContract',
                chaincodeId: packageEntry.name,
                chaincodeVersion: packageEntry.version,
                chaincodeType: 'golang',
                txId: sinon.match.any
            });

            process.env.GOPATH.should.equal('myPath');
        });

        it('should handle invalid language', async () => {
            const packageEntry: PackageRegistryEntry = new PackageRegistryEntry();
            packageEntry.name = 'my-smart-contract';
            packageEntry.chaincodeLanguage = 'cake';
            packageEntry.version = '1.0.0';
            packageEntry.path = 'myPath/mySmartContract';

            await fabricConnection.installChaincode(packageEntry, 'peer1').should.be.rejectedWith(`Smart contract language not supported cake`);
        });
    });

    describe('instantiateChaincode', () => {
        it('should instantiate a chaincode', async () => {
            await fabricConnection.instantiateChaincode('myChaincode', '0.0.1', 'myChannel', 'instantiate', ['arg1']).should.not.be.rejected;

            fabricChannelStub.sendInstantiateProposal.should.have.been.calledWith({
                chaincodeId: 'myChaincode',
                chaincodeVersion: '0.0.1',
                txId: sinon.match.any,
                fcn: 'instantiate',
                args: ['arg1']
            });
        });

        it('should throw an error if cant create event handler', async () => {
            fabricContractStub.eventHandlerFactory.createTxEventHandler.returns();
            await fabricConnection.instantiateChaincode('myChaincode', '0.0.1', 'myChannel', 'instantiate', ['arg1']).should.be.rejectedWith('Failed to create an event handler');
        });

        it('should throw an error if cant create event handler', async () => {
            fabricChannelStub.sendTransaction.returns({status: 'FAILED'});
            await fabricConnection.instantiateChaincode('myChaincode', '0.0.1', 'myChannel', 'instantiate', ['arg1']).should.be.rejectedWith('Failed to send peer responses for transaction 1234 to orderer. Response status: FAILED');
        });
    });
});
