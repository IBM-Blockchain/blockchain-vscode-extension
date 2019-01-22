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
import * as path from 'path';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as fabricClient from 'fabric-client';
import { Gateway } from 'fabric-network';
import { Channel } from 'fabric-client';
import { VSCodeOutputAdapter } from '../../src/logging/VSCodeOutputAdapter';
import { LogType } from '../../src/logging/OutputAdapter';

const should: Chai.Should = chai.should();
chai.use(sinonChai);

// tslint:disable no-unused-expression
describe('FabricConnection', () => {

    const TEST_PACKAGE_DIRECTORY: string = path.join(path.dirname(__dirname), '..', '..', 'test', 'data', 'packageDir', 'packages');

    class TestFabricConnection extends FabricConnection {

        async connect(): Promise<void> {
            this['gateway'] = fabricGatewayStub;
        }

        async getConnectionDetails(): Promise<any> {
            return;
        }

    }

    let fabricClientStub: sinon.SinonStubbedInstance<fabricClient>;
    let fabricGatewayStub: sinon.SinonStubbedInstance<Gateway>;
    let fabricConnection: TestFabricConnection;
    let fabricContractStub: any;
    let fabricChannelStub: sinon.SinonStubbedInstance<Channel>;
    let fabricTransactionStub: any;

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

        const eventHandlerOptions: any = {
            commitTimeout: 30,
            strategy: 'MSPID_SCOPE_ANYFORTX'
        };

        const eventHandlerStub: any = {
            startListening: mySandBox.stub(),
            cancelListening: mySandBox.stub(),
            waitForEvents: mySandBox.stub(),
        };
        const responsesStub: any = {
            validResponses: [
                {
                    response: {
                        payload: new Buffer('payload response buffer')
                    }
                }
            ]
        };
        fabricTransactionStub = {
            _validatePeerResponses: mySandBox.stub().returns(responsesStub),
            _createTxEventHandler: mySandBox.stub().returns(eventHandlerStub)
        };

        fabricContractStub = {
            createTransaction: mySandBox.stub().returns(fabricTransactionStub),
            evaluateTransaction: mySandBox.stub(),
            submitTransaction: mySandBox.stub(),
            getEventHandlerOptions: mySandBox.stub().returns(eventHandlerOptions)
        };

        fabricChannelStub = sinon.createStubInstance(Channel);
        fabricChannelStub.sendInstantiateProposal.resolves([{}, {}]);
        fabricChannelStub.sendUpgradeProposal.resolves([{}, {}]);
        fabricChannelStub.sendTransaction.resolves({ status: 'SUCCESS' });

        const fabricNetworkStub: any = {
            getContract: mySandBox.stub().returns(fabricContractStub),
            getChannel: mySandBox.stub().returns(fabricChannelStub)
        };

        fabricGatewayStub.getNetwork.returns(fabricNetworkStub);
        fabricGatewayStub.disconnect.returns(null);

        fabricConnection['gateway'] = fabricGatewayStub;
        fabricConnection['outputAdapter'] = VSCodeOutputAdapter.instance();
    });

    afterEach(() => {
        mySandBox.restore();
    });

    describe('constructor', () => {
        it('should set output adapter', async () => {
            const adapter: VSCodeOutputAdapter = VSCodeOutputAdapter.instance();
            const fabConnection: TestFabricConnection = new TestFabricConnection(adapter);
            fabConnection['outputAdapter'].should.deep.equal(adapter);
        });
    });

    describe('getAllPeerNames', () => {
        it('should get all the names of the peer', async () => {
            const peerOne: fabricClient.Peer = new fabricClient.Peer('grpc://localhost:1454', { name: 'peerOne' });
            const peerTwo: fabricClient.Peer = new fabricClient.Peer('grpc://localhost:1453', { name: 'peerTwo' });

            fabricClientStub.getPeersForOrg.returns([peerOne, peerTwo]);

            await fabricConnection.connect();

            const peerNames: Array<string> = await fabricConnection.getAllPeerNames();
            peerNames.should.deep.equal(['peerOne', 'peerTwo']);
        });
    });

    describe('getPeer', () => {
        it('should get a peer', async () => {
            const peerOne: fabricClient.Peer = new fabricClient.Peer('grpc://localhost:1454', { name: 'peerOne' });
            const peerTwo: fabricClient.Peer = new fabricClient.Peer('grpc://localhost:1453', { name: 'peerTwo' });

            fabricClientStub.getPeersForOrg.returns([peerOne, peerTwo]);

            await fabricConnection.connect();

            const peer: fabricClient.Peer = await fabricConnection.getPeer('peerTwo');
            peer.getName().should.deep.equal('peerTwo');
        });
    });

    describe('getAllChannelsForPeer', () => {
        it('should get all the channels a peer has joined', async () => {
            const peerOne: fabricClient.Peer = new fabricClient.Peer('grpc://localhost:1454', { name: 'peerOne' });

            fabricClientStub.getPeersForOrg.returns([peerOne]);

            const channelOne: { channel_id: string } = { channel_id: 'channel-one' };
            const channelTwo: { channel_id: string } = { channel_id: 'channel-two' };
            fabricClientStub.queryChannels.resolves({ channels: [channelOne, channelTwo] });

            await fabricConnection.connect();

            const channelNames: Array<string> = await fabricConnection.getAllChannelsForPeer('peerTwo');

            channelNames.should.deep.equal(['channel-one', 'channel-two']);
        });
    });

    describe('getInstalledChaincode', () => {
        it('should get the install chaincode', async () => {
            const peerOne: fabricClient.Peer = new fabricClient.Peer('grpc://localhost:1454', { name: 'peerOne' });
            const peerTwo: fabricClient.Peer = new fabricClient.Peer('grpc://localhost:1453', { name: 'peerTwo' });

            fabricClientStub.getPeersForOrg.returns([peerOne, peerTwo]);

            fabricClientStub.queryInstalledChaincodes.withArgs(peerOne).resolves({
                chaincodes: [{
                    name: 'biscuit-network',
                    version: '0.7'
                }, { name: 'biscuit-network', version: '0.8' }, { name: 'cake-network', version: '0.8' }]
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
            const channelOne: any = { channel_id: 'channel-one', queryInstantiatedChaincodes: mySandBox.stub() };

            channelOne.queryInstantiatedChaincodes.resolves({
                chaincodes: [{ name: 'biscuit-network', version: '0,7' }, { name: 'cake-network', version: '0.8' }]
            });

            fabricClientStub.getChannel.returns(channelOne);

            await fabricConnection.connect();
            const instantiatedChaincodes: Array<any> = await fabricConnection.getInstantiatedChaincode('channel-one');

            instantiatedChaincodes.should.deep.equal([{ name: 'biscuit-network', version: '0,7' }, {
                name: 'cake-network',
                version: '0.8'
            }]);
        });
    });

    describe('installChaincode', () => {

        let peer: fabricClient.Peer;

        beforeEach(async () => {
            peer = new fabricClient.Peer('grpc://localhost:1453', { name: 'peer1' });
            fabricClientStub.getPeersForOrg.returns([peer]);
            const responseStub: any = [[{
                response: {
                    status: 200
                }
            }]];
            fabricClientStub.installChaincode.resolves(responseStub);
            await fabricConnection.connect();
        });

        it('should install the chaincode package', async () => {
            const packageEntry: PackageRegistryEntry = new PackageRegistryEntry({
                name: 'vscode-pkg-1',
                version: '0.0.1',
                path: path.join(TEST_PACKAGE_DIRECTORY, 'vscode-pkg-1@0.0.1.cds')
            });

            await fabricConnection.installChaincode(packageEntry, 'peer1');
            fabricClientStub.installChaincode.should.have.been.calledWith({
                targets: [peer],
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
            fabricClientStub.installChaincode.resolves(responseStub);

            const packageEntry: PackageRegistryEntry = new PackageRegistryEntry({
                name: 'vscode-pkg-1',
                version: '0.0.1',
                path: path.join(TEST_PACKAGE_DIRECTORY, 'vscode-pkg-1@0.0.1.cds')
            });

            await fabricConnection.installChaincode(packageEntry, 'peer1').should.be.rejectedWith(/some error/);
            fabricClientStub.installChaincode.should.have.been.calledWith({
                targets: [peer],
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
            fabricClientStub.installChaincode.resolves(responseStub);

            const packageEntry: PackageRegistryEntry = new PackageRegistryEntry({
                name: 'vscode-pkg-1',
                version: '0.0.1',
                path: path.join(TEST_PACKAGE_DIRECTORY, 'vscode-pkg-1@0.0.1.cds')
            });

            await fabricConnection.installChaincode(packageEntry, 'peer1').should.be.rejectedWith('some error');
            fabricClientStub.installChaincode.should.have.been.calledWith({
                targets: [peer],
                txId: sinon.match.any,
                chaincodePackage: sinon.match((buffer: Buffer) => {
                    buffer.should.be.an.instanceOf(Buffer);
                    buffer.length.should.equal(2719);
                    return true;
                })
            });
        });

        it('should handle an error if the chaincode package does not exist', async () => {
            const packageEntry: PackageRegistryEntry = new PackageRegistryEntry({
                name: 'vscode-pkg-1',
                version: '0.0.1',
                path: path.join(TEST_PACKAGE_DIRECTORY, 'vscode-pkg-doesnotexist@0.0.1.cds')
            });

            await fabricConnection.installChaincode(packageEntry, 'peer1')
                .should.have.been.rejectedWith(/ENOENT/);
        });

        it('should handle an error installing the chaincode package', async () => {
            const packageEntry: PackageRegistryEntry = new PackageRegistryEntry({
                name: 'vscode-pkg-1',
                version: '0.0.1',
                path: path.join(TEST_PACKAGE_DIRECTORY, 'vscode-pkg-1@0.0.1.cds')
            });

            fabricClientStub.installChaincode.rejects(new Error('such error'));
            await fabricConnection.installChaincode(packageEntry, 'peer1')
                .should.have.been.rejectedWith(/such error/);
        });

    });

    describe('instantiateChaincode', () => {

        let getChanincodesStub: sinon.SinonStub;
        beforeEach(() => {
            getChanincodesStub = mySandBox.stub(fabricConnection, 'getInstantiatedChaincode');
            getChanincodesStub.resolves([]);
        });

        it('should instantiate a chaincode', async () => {
            const outputSpy: sinon.SinonSpy = mySandBox.spy(fabricConnection['outputAdapter'], 'log');

            const responsePayload: any = await fabricConnection.instantiateChaincode('myChaincode', '0.0.1', 'myChannel', 'instantiate', ['arg1']).should.not.be.rejected;
            fabricChannelStub.sendInstantiateProposal.should.have.been.calledWith({
                chaincodeId: 'myChaincode',
                chaincodeVersion: '0.0.1',
                txId: sinon.match.any,
                fcn: 'instantiate',
                args: ['arg1']
            });
            responsePayload.toString().should.equal('payload response buffer');
            outputSpy.should.have.been.calledWith(LogType.INFO, undefined, "Instantiating with function: 'instantiate' and arguments: 'arg1'");
        });

        it('should throw an error instantiating if contract is already instantiated', async () => {
            const output: VSCodeOutputAdapter = VSCodeOutputAdapter.instance();
            const logSpy: sinon.SinonSpy = mySandBox.spy(output, 'log');
            getChanincodesStub.withArgs('myChannel').resolves([{ name: 'myChaincode' }]);
            await fabricConnection.instantiateChaincode('myChaincode', '0.0.2', 'myChannel', 'instantiate', ['arg1']).should.be.rejectedWith('The name of the contract you tried to instantiate is already instantiated');
            fabricChannelStub.sendUpgradeProposal.should.not.have.been.called;

            logSpy.should.not.have.been.calledWith("Upgrading with function: 'instantiate' and arguments: 'arg1'");
        });

        it('should instantiate a chaincode and can return empty payload response', async () => {
            fabricTransactionStub._validatePeerResponses.returns(null);
            const nullResponsePayload: any = await fabricConnection.instantiateChaincode('myChaincode', '0.0.1', 'myChannel', 'instantiate', ['arg1']);
            fabricChannelStub.sendInstantiateProposal.should.have.been.calledWith({
                chaincodeId: 'myChaincode',
                chaincodeVersion: '0.0.1',
                txId: sinon.match.any,
                fcn: 'instantiate',
                args: ['arg1']
            });
            should.not.exist(nullResponsePayload);
        });

        it('should throw an error if cant create event handler', async () => {
            fabricTransactionStub._createTxEventHandler.returns();
            await fabricConnection.instantiateChaincode('myChaincode', '0.0.1', 'myChannel', 'instantiate', ['arg1']).should.be.rejectedWith('Failed to create an event handler');
        });

        it('should throw an error if submitting the transaction failed', async () => {
            fabricChannelStub.sendTransaction.returns({ status: 'FAILED' });
            await fabricConnection.instantiateChaincode('myChaincode', '0.0.1', 'myChannel', 'instantiate', ['arg1']).should.be.rejectedWith('Failed to send peer responses for transaction 1234 to orderer. Response status: FAILED');
        });
    });

    describe('isIBPConnection', () => {
        it('should return true if connected to an IBP instance', async () => {
            fabricConnection['networkIdProperty'] = true;
            const result: boolean = await fabricConnection.isIBPConnection();
            result.should.equal(true);
        });
        it('should return false if not connected to an IBP instance', async () => {
            fabricConnection['networkIdProperty'] = false;
            const result: boolean = await fabricConnection.isIBPConnection();
            result.should.equal(false);
        });
    });

    describe('getMetadata', () => {
        it('should return the metadata for an instantiated smart contract', async () => {
            const fakeMetaData: string = '{"contracts":{"my-contract":{"name":"","contractInstance":{"name":""},"transactions":[{"name":"instantiate"},{"name":"wagonwheeling"},{"name":"transaction2"}],"info":{"title":"","version":""}},"org.hyperledger.fabric":{"name":"org.hyperledger.fabric","contractInstance":{"name":"org.hyperledger.fabric"},"transactions":[{"name":"GetMetadata"}],"info":{"title":"","version":""}}},"info":{"version":"0.0.2","title":"victoria_sponge"},"components":{"schemas":{}}}';
            const fakeMetaDataBuffer: Buffer = Buffer.from(fakeMetaData, 'utf8');
            fabricContractStub.evaluateTransaction.resolves(fakeMetaDataBuffer);

            const metadata: any = await fabricConnection.getMetadata('myChaincode', 'channelConga');
            // tslint:disable-next-line
            const testFunction: string = metadata.contracts["my-contract"].transactions[1].name;
            // tslint:disable-next-line
            testFunction.should.equal("wagonwheeling");
        });

        it('should handle not getting any metadata', async () => {
            const fakeMetaData: string = '';
            const fakeMetaDataBuffer: Buffer = Buffer.from(fakeMetaData, 'utf8');
            fabricContractStub.evaluateTransaction.resolves(fakeMetaDataBuffer);

            const metadata: any = await fabricConnection.getMetadata('myChaincode', 'channelConga');
            // tslint:disable-next-line
            const testFunctions: string[] = metadata.contracts[""].transactions;
            testFunctions.should.deep.equal([]);
        });

    });

    describe('submitTransaction', () => {
        it('should submit a transaction', async () => {
            fabricContractStub.submitTransaction.resolves();

            await fabricConnection.submitTransaction('mySmartContract', 'transaction1', 'myChannel', ['arg1', 'arg2'], 'my-contract');
            fabricContractStub.submitTransaction.should.have.been.calledWith('transaction1', 'arg1', 'arg2');
        });
    });

    describe('disconnect', () => {
        it('should disconnect from gateway', async () => {
            await fabricConnection.disconnect();
            fabricGatewayStub.disconnect.should.have.been.called;
        });
    });

    describe('upgradeChaincode', () => {

        let getChanincodesStub: sinon.SinonStub;
        beforeEach(() => {
            getChanincodesStub = mySandBox.stub(fabricConnection, 'getInstantiatedChaincode');
            getChanincodesStub.resolves([]);
        });

        it('should upgrade a chaincode', async () => {
            const outputSpy: sinon.SinonSpy = mySandBox.spy(fabricConnection['outputAdapter'], 'log');
            getChanincodesStub.resolves([{name: 'myChaincode', version: '0.0.2'}]);
            const responsePayload: any = await fabricConnection.upgradeChaincode('myChaincode', '0.0.1', 'myChannel', 'instantiate', ['arg1']).should.not.be.rejected;
            fabricChannelStub.sendUpgradeProposal.should.have.been.calledWith({
                chaincodeId: 'myChaincode',
                chaincodeVersion: '0.0.1',
                txId: sinon.match.any,
                fcn: 'instantiate',
                args: ['arg1']
            });
            responsePayload.toString().should.equal('payload response buffer');
            outputSpy.should.have.been.calledWith(LogType.INFO, undefined, "Upgrading with function: 'instantiate' and arguments: 'arg1'");
        });

        it('should throw an error instantiating if no contract with the same name has been instantiated', async () => {
            const output: VSCodeOutputAdapter = VSCodeOutputAdapter.instance();
            const outputSpy: sinon.SinonSpy = mySandBox.spy(output, 'log');

            await fabricConnection.upgradeChaincode('myChaincode', '0.0.2', 'myChannel', 'instantiate', ['arg1']).should.be.rejectedWith('The contract you tried to upgrade with has no previous versions instantiated');
            fabricChannelStub.sendUpgradeProposal.should.not.have.been.called;

            outputSpy.should.not.have.been.calledWith("Upgrading with function: 'instantiate' and arguments: 'arg1'");
        });

        it('should instantiate a chaincode and can return empty payload response', async () => {
            fabricTransactionStub._validatePeerResponses.returns(null);
            getChanincodesStub.resolves([{name: 'myChaincode', version: '0.0.2'}]);

            const nullResponsePayload: any = await fabricConnection.upgradeChaincode('myChaincode', '0.0.1', 'myChannel', 'instantiate', ['arg1']);
            fabricChannelStub.sendUpgradeProposal.should.have.been.calledWith({
                chaincodeId: 'myChaincode',
                chaincodeVersion: '0.0.1',
                txId: sinon.match.any,
                fcn: 'instantiate',
                args: ['arg1']
            });
            should.not.exist(nullResponsePayload);
        });

        it('should throw an error if cant create event handler', async () => {
            getChanincodesStub.resolves([{name: 'myChaincode', version: '0.0.2'}]);
            fabricTransactionStub._createTxEventHandler.returns();
            await fabricConnection.upgradeChaincode('myChaincode', '0.0.1', 'myChannel', 'instantiate', ['arg1']).should.be.rejectedWith('Failed to create an event handler');
        });

        it('should throw an error if submitting the transaction failed', async () => {
            getChanincodesStub.resolves([{name: 'myChaincode', version: '0.0.2'}]);
            fabricChannelStub.sendTransaction.returns({ status: 'FAILED' });
            await fabricConnection.upgradeChaincode('myChaincode', '0.0.1', 'myChannel', 'instantiate', ['arg1']).should.be.rejectedWith('Failed to send peer responses for transaction 1234 to orderer. Response status: FAILED');
        });
    });
});
