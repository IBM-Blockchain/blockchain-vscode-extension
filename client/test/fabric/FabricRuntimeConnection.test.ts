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

import { FabricRuntime } from '../../src/fabric/FabricRuntime';
import { FabricRuntimeConnection } from '../../src/fabric/FabricRuntimeConnection';
import { FabricWallet } from '../../src/fabric/FabricWallet';
import * as Client from 'fabric-client';
import * as FabricCAServices from 'fabric-ca-client';
import * as path from 'path';

import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { PackageRegistryEntry } from '../../src/packages/PackageRegistryEntry';
import { LogType } from '../../src/logging/OutputAdapter';
import { FabricNodeType, FabricNode } from '../../src/fabric/FabricNode';
import { FabricWalletGeneratorFactory } from '../../src/fabric/FabricWalletGeneratorFactory';
import { FabricWalletGenerator } from '../../src/fabric/FabricWalletGenerator';
import { IFabricWallet } from '../../src/fabric/IFabricWallet';
import { FabricRuntimeUtil } from '../../src/fabric/FabricRuntimeUtil';
import { FabricWalletUtil } from '../../src/fabric/FabricWalletUtil';
import { ConsoleOutputAdapter } from '../../src/logging/ConsoleOutputAdapter';
import { VSCodeBlockchainOutputAdapter } from '../../src/logging/VSCodeBlockchainOutputAdapter';
import { FabricConnectionFactory } from '../../src/fabric/FabricConnectionFactory';
import { IFabricRuntimeConnection } from '../../src/fabric/IFabricRuntimeConnection';

const should: Chai.Should = chai.should();
chai.use(sinonChai);

// tslint:disable no-unused-expression
describe('FabricRuntimeConnection', () => {

    const TEST_PACKAGE_DIRECTORY: string = path.join(path.dirname(__dirname), '..', '..', 'test', 'data', 'packageDir', 'packages');

    let mySandBox: sinon.SinonSandbox;
    let mockRuntime: sinon.SinonStubbedInstance<FabricRuntime>;
    let mockLocalWallet: sinon.SinonStubbedInstance<IFabricWallet>;
    let mockLocalWalletOps: sinon.SinonStubbedInstance<IFabricWallet>;
    let connection: IFabricRuntimeConnection;

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
        mockRuntime = sinon.createStubInstance(FabricRuntime);
        mockRuntime.getNodes.resolves([
            FabricNode.newPeer(
                'peer0.org1.example.com',
                'peer0.org1.example.com',
                `grpc://localhost:7051`,
                `${FabricWalletUtil.LOCAL_WALLET}-ops`,
                FabricRuntimeUtil.ADMIN_USER,
                'Org1MSP'
            ),
            FabricNode.newCertificateAuthority(
                'ca.example.com',
                'ca.example.com',
                `http://localhost:7054`,
                FabricWalletUtil.LOCAL_WALLET,
                FabricRuntimeUtil.ADMIN_USER,
                'Org1MSP'
            ),
            FabricNode.newOrderer(
                'orderer.example.com',
                'orderer.example.com',
                `grpc://localhost:7050`,
                `${FabricWalletUtil.LOCAL_WALLET}-ops`,
                FabricRuntimeUtil.ADMIN_USER,
                'OrdererMSP'
            ),
            FabricNode.newCouchDB(
                'couchdb',
                'couchdb',
                `http://localhost:7055`
            ),
            FabricNode.newLogspout(
                'logspout',
                'logspout',
                `http://localhost:7056`
            )
        ]);

        const mockFabricWalletGenerator: sinon.SinonStubbedInstance<FabricWalletGenerator> = sinon.createStubInstance(FabricWalletGenerator);
        mySandBox.stub(FabricWalletGeneratorFactory, 'createFabricWalletGenerator').returns(mockFabricWalletGenerator);
        mockLocalWallet = sinon.createStubInstance(FabricWallet);
        mockLocalWallet['setUserContext'] = sinon.stub();
        mockLocalWalletOps = sinon.createStubInstance(FabricWallet);
        mockLocalWalletOps['setUserContext'] = sinon.stub();
        mockFabricWalletGenerator.createLocalWallet.rejects(new Error('no such wallet'));
        mockFabricWalletGenerator.createLocalWallet.withArgs(FabricWalletUtil.LOCAL_WALLET).resolves(mockLocalWallet);
        mockFabricWalletGenerator.createLocalWallet.withArgs(`${FabricWalletUtil.LOCAL_WALLET}-ops`).resolves(mockLocalWalletOps);

        connection = FabricConnectionFactory.createFabricRuntimeConnection((mockRuntime as any) as FabricRuntime);
        await connection.connect();
    });

    afterEach(() => {
        mySandBox.restore();
    });

    describe('constructor', () => {

        it('should default to the console output adapter', () => {
            connection = new FabricRuntimeConnection((mockRuntime as any) as FabricRuntime);
            connection['outputAdapter'].should.be.an.instanceOf(ConsoleOutputAdapter);
        });

        it('should accept another output adapter', () => {
            connection = new FabricRuntimeConnection((mockRuntime as any) as FabricRuntime, VSCodeBlockchainOutputAdapter.instance());
            connection['outputAdapter'].should.be.an.instanceOf(VSCodeBlockchainOutputAdapter);
        });

    });

    describe('connect', () => {

        it('should create peer clients for each peer node', async () => {
            const peerNames: string[] = Array.from(connection['peers'].keys());
            const peerValues: Client.Peer[] = Array.from(connection['peers'].values());
            peerNames.should.deep.equal(['peer0.org1.example.com']);
            peerValues.should.have.lengthOf(1);
            peerValues[0].should.be.an.instanceOf(Client.Peer);
            peerValues[0].toString().should.match(/url:grpc:\/\/localhost:7051/);
        });

        it('should create orderer clients for each orderer node', async () => {
            const ordererNames: string[] = Array.from(connection['orderers'].keys());
            const ordererValues: Client.Orderer[] = Array.from(connection['orderers'].values());
            ordererNames.should.deep.equal(['orderer.example.com']);
            ordererValues.should.have.lengthOf(1);
            ordererValues[0].should.be.an.instanceOf(Client.Orderer);
            ordererValues[0].toString().should.match(/url:grpc:\/\/localhost:7050/);
        });

        it('should create certificate authority clients for each certificate authority node', async () => {
            const certificateAuthorityNames: string[] = Array.from(connection['certificateAuthorities'].keys());
            const certificateAuthorityValues: FabricCAServices[] = Array.from(connection['certificateAuthorities'].values());
            certificateAuthorityNames.should.deep.equal(['ca.example.com']);
            certificateAuthorityValues.should.have.lengthOf(1);
            certificateAuthorityValues[0].should.be.an.instanceOf(FabricCAServices);
            certificateAuthorityValues[0].toString().should.match(/hostname: localhost/);
            certificateAuthorityValues[0].toString().should.match(/port: 7054/);
        });

        it('should ignore any other nodes', async () => {
            const nodeNames: string[] = Array.from(connection['nodes'].keys());
            nodeNames.should.not.contain('couchdb');
            nodeNames.should.not.contain('logspout');
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
            connection.getAllPeerNames().should.deep.equal(['peer0.org1.example.com']);
        });
    });

    describe('createChannelMap', () => {

        let mockPeer1: sinon.SinonStubbedInstance<Client.Peer>;
        let mockPeer2: sinon.SinonStubbedInstance<Client.Peer>;
        let queryChannelsStub: sinon.SinonStub;

        beforeEach(() => {
            mockPeer1 = mySandBox.createStubInstance(Client.Peer);
            mockPeer2 = mySandBox.createStubInstance(Client.Peer);
            connection['peers'].has('peer0.org1.example.com').should.be.true;
            connection['peers'].set('peer0.org1.example.com', mockPeer1);
            connection['nodes'].has('peer0.org2.example.com').should.be.false;
            connection['peers'].has('peer0.org2.example.com').should.be.false;
            connection['nodes'].set('peer0.org2.example.com', FabricNode.newPeer('peer0.org2.example.com', 'peer0.org2.example.com', 'grpc://localhost:8051', 'local_wallet', 'Admin@org2.example.com', 'Org2MSP'));
            connection['peers'].set('peer0.org2.example.com', mockPeer2);
            queryChannelsStub = mySandBox.stub(connection['client'], 'queryChannels');
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
            const chaincodes: Array<{name: string, version: string}> = await connection.getInstantiatedChaincode(['peer0.org1.example.com'], 'mychannel');
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

        beforeEach(() => {
            mockPeer1 = mySandBox.createStubInstance(Client.Peer);
            mockPeer2 = mySandBox.createStubInstance(Client.Peer);
            connection['peers'].has('peer0.org1.example.com').should.be.true;
            connection['peers'].set('peer0.org1.example.com', mockPeer1);
            connection['nodes'].has('peer0.org2.example.com').should.be.false;
            connection['peers'].has('peer0.org2.example.com').should.be.false;
            connection['nodes'].set('peer0.org2.example.com', FabricNode.newPeer('peer0.org2.example.com', 'peer0.org2.example.com', 'grpc://localhost:8051', 'local_wallet', 'Admin@org2.example.com', 'Org2MSP'));
            connection['peers'].set('peer0.org2.example.com', mockPeer2);
            queryChannelsStub = mySandBox.stub(connection['client'], 'queryChannels');
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
            const chaincodes: Array<{name: string, version: string}> = await connection.getAllInstantiatedChaincodes();
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
        });

        it('should rethrow any errors', async () => {
            queryInstantiatedChaincodesStub1.rejects(new Error('such error'));
            await connection.getAllInstantiatedChaincodes()
                .should.be.rejectedWith(/such error/);
        });

    });

    describe('getAllOrganizationNames', () => {

        it('should get all of the organization names', () => {
            connection.getAllOrganizationNames().should.deep.equal(['OrdererMSP', 'Org1MSP']);
        });

    });

    describe('getAllCertificateAuthorityNames', () => {

        it('should get all of the certificate authority names', () => {
            connection.getAllCertificateAuthorityNames().should.deep.equal(['ca.example.com']);
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
            connection.getAllOrdererNames().should.deep.equal(['orderer.example.com']);
        });
    });

    describe('installChaincode', () => {

        const packageEntry: PackageRegistryEntry = new PackageRegistryEntry({
            name: 'vscode-pkg-1',
            version: '0.0.1',
            path: path.join(TEST_PACKAGE_DIRECTORY, 'vscode-pkg-1@0.0.1.cds')
        });

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

            await connection.installChaincode(packageEntry, 'peer0.org1.example.com');
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

            await connection.installChaincode(packageEntry, 'peer0.org1.example.com').should.be.rejectedWith(/some error/);
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

            await connection.installChaincode(packageEntry, 'peer0.org1.example.com').should.be.rejectedWith('some error');
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
            const invalidPackageEntry: PackageRegistryEntry = new PackageRegistryEntry({
                name: 'vscode-pkg-1',
                version: '0.0.1',
                path: path.join(TEST_PACKAGE_DIRECTORY, 'vscode-pkg-doesnotexist@0.0.1.cds')
            });

            await connection.installChaincode(invalidPackageEntry, 'peer0.org1.example.com')
                .should.have.been.rejectedWith(/ENOENT/);
        });

        it('should handle an error installing the chaincode package', async () => {
            installChaincodeStub.rejects(new Error('such error'));

            await connection.installChaincode(packageEntry, 'peer0.org1.example.com')
                .should.have.been.rejectedWith(/such error/);
        });

        it('should throw an error installing chaincode onto a peer that does not exist', async () => {
            await connection.installChaincode(packageEntry, 'nosuch.peer0.org1.example.com')
                .should.be.rejectedWith(/does not exist/);
        });

    });

    describe('instantiateChaincode', () => {

        let channel: Client.Channel;
        let queryInstantiatedChaincodesStub: sinon.SinonStub;
        let sendInstantiateProposalStub: sinon.SinonStub;
        let sendTransactionStub: sinon.SinonStub;
        let mockEventHub: sinon.SinonStubbedInstance<Client.ChannelEventHub>;
        let outputSpy: sinon.SinonSpy;

        beforeEach(() => {
            mySandBox.stub(connection['client'], 'newTransactionID').returns({
                getTransactionID: mySandBox.stub().returns('1234')
            });
            channel = connection['getOrCreateChannel']('mychannel');
            queryInstantiatedChaincodesStub = mySandBox.stub(channel, 'queryInstantiatedChaincodes');
            queryInstantiatedChaincodesStub.resolves({
                chaincodes: [
                    {
                        name: 'otherChaincode',
                        version: '0.0.1'
                    }
                ]
            });
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
            mockEventHub = sinon.createStubInstance(Client.ChannelEventHub);
            mySandBox.stub(channel, 'newChannelEventHub').returns(mockEventHub);
            mockEventHub.connect.yields(null);
            mockEventHub.registerTxEvent.callsFake((txId: string, callback: any, errorCallback: any): void => {
                callback(txId, 'VALID', 1);
                errorCallback(null);
            });
            outputSpy = mySandBox.spy(connection['outputAdapter'], 'log');
        });

        it('should instantiate the specified chaincode', async () => {
            const payload: Buffer = await connection.instantiateChaincode('myChaincode', '0.0.1', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1']);
            should.equal(payload, null);
            sendInstantiateProposalStub.should.have.been.calledOnceWithExactly({
                targets: [sinon.match.any],
                chaincodeId: 'myChaincode',
                chaincodeVersion: '0.0.1',
                txId: sinon.match.any,
                fcn: 'instantiate',
                args: ['arg1']
            }, 5 * 60 * 1000);
            sendTransactionStub.should.have.been.calledOnce;
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
            const payload: Buffer = await connection.instantiateChaincode('myChaincode', '0.0.1', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1']);
            payload.toString().should.equal('hello world');
            sendInstantiateProposalStub.should.have.been.calledOnceWithExactly({
                targets: [sinon.match.any],
                chaincodeId: 'myChaincode',
                chaincodeVersion: '0.0.1',
                txId: sinon.match.any,
                fcn: 'instantiate',
                args: ['arg1']
            }, 5 * 60 * 1000);
            sendTransactionStub.should.have.been.calledOnce;
            mockEventHub.registerTxEvent.should.have.been.calledOnce;
            outputSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `Instantiating with function: 'instantiate' and arguments: 'arg1'`);
        });

        it('should throw an error if the specified chaincode is already instantiated', async () => {
            await connection.instantiateChaincode('otherChaincode', '0.0.1', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1'])
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
            await connection.instantiateChaincode('myChaincode', '0.0.1', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1'])
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
            await connection.instantiateChaincode('myChaincode', '0.0.1', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1'])
                .should.be.rejectedWith(/such error/);
        });

        it('should throw an error if the orderer rejects the transaction', async () => {
            sendTransactionStub.resolves({
                status: 'FAILURE'
            });
            await connection.instantiateChaincode('myChaincode', '0.0.1', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1'])
                .should.be.rejectedWith(/Response status: FAILURE/);
        });

        it('should throw an error if the event hub fails to connect before the transaction is committed', async () => {
            mockEventHub.connect.yields(new Error('such connect error'));
            await connection.instantiateChaincode('myChaincode', '0.0.1', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1'])
                .should.be.rejectedWith(/such connect error/);
        });

        it('should throw an error if the event hub disconnects before the transaction is committed', async () => {
            mockEventHub.registerTxEvent.callsFake((_1: string, _2: void, errorCallback: any): void => {
                errorCallback(new Error('such connect error'));
            });
            await connection.instantiateChaincode('myChaincode', '0.0.1', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1'])
                .should.be.rejectedWith(/such connect error/);
        });

        it('should throw an error if the transaction is rejected at validation time', async () => {
            mockEventHub.registerTxEvent.callsFake((txId: string, callback: any): void => {
                callback(txId, 'INVALID', 1);
            });
            await connection.instantiateChaincode('myChaincode', '0.0.1', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1'])
                .should.be.rejectedWith(/with code INVALID in block 1/);
        });

    });

    describe('upgradeChaincode', () => {

        let channel: Client.Channel;
        let queryInstantiatedChaincodesStub: sinon.SinonStub;
        let sendUpgradeProposalStub: sinon.SinonStub;
        let sendTransactionStub: sinon.SinonStub;
        let mockEventHub: sinon.SinonStubbedInstance<Client.ChannelEventHub>;
        let outputSpy: sinon.SinonSpy;

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
            mockEventHub = sinon.createStubInstance(Client.ChannelEventHub);
            mySandBox.stub(channel, 'newChannelEventHub').returns(mockEventHub);
            mockEventHub.connect.yields(null);
            mockEventHub.registerTxEvent.callsFake((txId: string, callback: any, errorCallback: any): void => {
                callback(txId, 'VALID', 1);
                errorCallback(null);
            });
            outputSpy = mySandBox.spy(connection['outputAdapter'], 'log');
        });

        it('should upgrade the specified chaincode', async () => {
            const payload: Buffer = await connection.upgradeChaincode('myChaincode', '0.0.2', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1']);
            should.equal(payload, null);
            sendUpgradeProposalStub.should.have.been.calledOnceWithExactly({
                targets: [sinon.match.any],
                chaincodeId: 'myChaincode',
                chaincodeVersion: '0.0.2',
                txId: sinon.match.any,
                fcn: 'instantiate',
                args: ['arg1']
            }, 5 * 60 * 1000);
            sendTransactionStub.should.have.been.calledOnce;
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
            const payload: Buffer = await connection.upgradeChaincode('myChaincode', '0.0.2', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1']);
            payload.toString().should.equal('hello world');
            sendUpgradeProposalStub.should.have.been.calledOnceWithExactly({
                targets: [sinon.match.any],
                chaincodeId: 'myChaincode',
                chaincodeVersion: '0.0.2',
                txId: sinon.match.any,
                fcn: 'instantiate',
                args: ['arg1']
            }, 5 * 60 * 1000);
            sendTransactionStub.should.have.been.calledOnce;
            mockEventHub.registerTxEvent.should.have.been.calledOnce;
            outputSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `Upgrading with function: 'instantiate' and arguments: 'arg1'`);
        });

        it('should throw an error if the specified chaincode is not already instantiated', async () => {
            await connection.upgradeChaincode('noSuchChaincode', '0.0.1', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1'])
                .should.be.rejectedWith(/The smart contract noSuchChaincode is not instantiated on the channel mychannel, so cannot be upgraded/);
        });

        it('should throw an error if the specified chaincode is already instantiated with the same version', async () => {
            await connection.upgradeChaincode('myChaincode', '0.0.1', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1'])
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
            await connection.upgradeChaincode('myChaincode', '0.0.2', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1'])
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
            await connection.upgradeChaincode('myChaincode', '0.0.2', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1'])
                .should.be.rejectedWith(/such error/);
        });

        it('should throw an error if the orderer rejects the transaction', async () => {
            sendTransactionStub.resolves({
                status: 'FAILURE'
            });
            await connection.upgradeChaincode('myChaincode', '0.0.2', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1'])
                .should.be.rejectedWith(/Response status: FAILURE/);
        });

        it('should throw an error if the event hub fails to connect before the transaction is committed', async () => {
            mockEventHub.connect.yields(new Error('such connect error'));
            await connection.upgradeChaincode('myChaincode', '0.0.2', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1'])
                .should.be.rejectedWith(/such connect error/);
        });

        it('should throw an error if the event hub disconnects before the transaction is committed', async () => {
            mockEventHub.registerTxEvent.callsFake((_1: string, _2: void, errorCallback: any): void => {
                errorCallback(new Error('such connect error'));
            });
            await connection.upgradeChaincode('myChaincode', '0.0.2', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1'])
                .should.be.rejectedWith(/such connect error/);
        });

        it('should throw an error if the transaction is rejected at validation time', async () => {
            mockEventHub.registerTxEvent.callsFake((txId: string, callback: any): void => {
                callback(txId, 'INVALID', 1);
            });
            await connection.upgradeChaincode('myChaincode', '0.0.2', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1'])
                .should.be.rejectedWith(/with code INVALID in block 1/);
        });

    });

    describe('enroll', () => {

        beforeEach(() => {
            const mockFabricCA: sinon.SinonStubbedInstance<FabricCAServices> = mySandBox.createStubInstance(FabricCAServices);
            mockFabricCA.enroll.resolves({certificate : 'myCert', key : { toBytes : mySandBox.stub().returns('myKey')}});
            connection['certificateAuthorities'].has('ca.example.com').should.be.true;
            connection['certificateAuthorities'].set('ca.example.com', mockFabricCA);
        });

        it('should enroll an identity using a certificate authority that exists', async () => {
            const result: {certificate: string, privateKey: string} =  await connection.enroll('ca.example.com', 'myId', 'mySecret');
            result.should.deep.equal({certificate : 'myCert', privateKey: 'myKey'});
        });

        it('should throw trying to enroll an identity using a certificate authority that does not exist', async () => {
            await connection.enroll('nosuch.ca.example.com', 'myId', 'mySecret')
                .should.be.rejectedWith(/does not exist/);
        });

    });

    describe('register', () => {

        beforeEach(() => {
            const mockFabricCA: sinon.SinonStubbedInstance<FabricCAServices> = mySandBox.createStubInstance(FabricCAServices);
            mockFabricCA.register.resolves('its a secret');
            connection['certificateAuthorities'].has('ca.example.com').should.be.true;
            connection['certificateAuthorities'].set('ca.example.com', mockFabricCA);
        });

        it('should register a new user and return a secret using a certificate authority that exists ', async () => {
            const secret: string = await connection.register('ca.example.com', 'enrollThis', 'departmentE');
            secret.should.deep.equal('its a secret');
            mockLocalWallet['setUserContext'].should.have.been.calledOnceWithExactly(sinon.match.any, FabricRuntimeUtil.ADMIN_USER);
        });

        it('should throw trying to register a new user using a certificate authority that does not exist ', async () => {
            await connection.register('nosuch.ca.example.com', 'enrollThis', 'departmentE')
                .should.be.rejectedWith(/does not exist/);
        });

    });

    describe('getNode', () => {

        it('should return a certificate authority node', () => {
            const node: FabricNode = connection.getNode('ca.example.com');
            node.short_name.should.equal('ca.example.com');
            node.name.should.equal('ca.example.com');
            node.type.should.equal(FabricNodeType.CERTIFICATE_AUTHORITY);
            node.url.should.equal('http://localhost:7054');
            node.wallet.should.equal(FabricWalletUtil.LOCAL_WALLET);
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
