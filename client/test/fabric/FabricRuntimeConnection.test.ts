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
import { FabricConnectionFactory } from '../../src/fabric/FabricConnectionFactory';
import { FabricWallet } from '../../src/fabric/FabricWallet';
import { Gateway } from 'fabric-network';
import * as Client from 'fabric-client';
import * as FabricCAServices from 'fabric-ca-client';
import { Channel } from 'fabric-client';
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

const should: Chai.Should = chai.should();
chai.use(sinonChai);

// tslint:disable no-unused-expression
describe('FabricRuntimeConnection', () => {

    const TEST_PACKAGE_DIRECTORY: string = path.join(path.dirname(__dirname), '..', '..', 'test', 'data', 'packageDir', 'packages');

    let fabricClientStub: sinon.SinonStubbedInstance<Client>;
    let fabricRuntimeStub: sinon.SinonStubbedInstance<FabricRuntime>;
    let fabricRuntimeConnection: FabricRuntimeConnection;
    let fabricChannelStub: sinon.SinonStubbedInstance<Channel>;
    let fabricContractStub: any;
    let fabricTransactionStub: any;
    let connectionWallet: FabricWallet;
    const mockIdentityName: string = FabricRuntimeUtil.ADMIN_USER;
    let fabricCAStub: sinon.SinonStubbedInstance<FabricCAServices>;

    let mySandBox: sinon.SinonSandbox;

    let gatewayStub: sinon.SinonStubbedInstance<Gateway>;

    const walletPath: string = path.resolve(__dirname, '..', '..', '..', 'test', 'data', 'walletDir', 'otherWallet');
    const basicNetworkConnectionProfile: any = {
        name: 'basic-network',
        version: '1.0.0',
        client: {
            organization: 'Org1',
            connection: {
                timeout: {
                    peer: {
                        endorser: '300',
                        eventHub: '300',
                        eventReg: '300'
                    },
                    orderer: '300'
                }
            }
        },
        channels: {
            mychannel: {
                orderers: [
                    'orderer.example.com'
                ],
                peers: {
                    'peer0.org1.example.com': {}
                }
            }
        },
        organizations: {
            Org1: {
                mspid: 'Org1MSP',
                peers: [
                    'peer0.org1.example.com'
                ],
                certificateAuthorities: [
                    'ca.org1.example.com'
                ]
            }
        },
        orderers: {
            'orderer.example.com': {
                url: 'grpc://0.0.0.0:12347'
            }
        },
        peers: {
            'peer0.org1.example.com': {
                url: 'grpc://0.0.0.0:12345',
                eventUrl: 'grpc://0.0.0.0:12346'
            }
        },
        certificateAuthorities: {
            'ca.org1.example.com': {
                url: 'http://0.0.0.0:12348',
                caName: 'ca.example.com'
            }
        }
    };

    let mockLocalWallet: sinon.SinonStubbedInstance<IFabricWallet>;
    let mockLocalWalletOps: sinon.SinonStubbedInstance<IFabricWallet>;

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();

        fabricRuntimeStub = sinon.createStubInstance(FabricRuntime);
        fabricRuntimeStub.getConnectionProfile.resolves(basicNetworkConnectionProfile);
        fabricRuntimeStub.getCertificate.resolves('-----BEGIN CERTIFICATE-----\nMIICGDCCAb+gAwIBAgIQFSxnLAGsu04zrFkAEwzn6zAKBggqhkjOPQQDAjBzMQsw\nCQYDVQQGEwJVUzETMBEGA1UECBMKQ2FsaWZvcm5pYTEWMBQGA1UEBxMNU2FuIEZy\nYW5jaXNjbzEZMBcGA1UEChMQb3JnMS5leGFtcGxlLmNvbTEcMBoGA1UEAxMTY2Eu\nb3JnMS5leGFtcGxlLmNvbTAeFw0xNzA4MzEwOTE0MzJaFw0yNzA4MjkwOTE0MzJa\nMFsxCzAJBgNVBAYTAlVTMRMwEQYDVQQIEwpDYWxpZm9ybmlhMRYwFAYDVQQHEw1T\nYW4gRnJhbmNpc2NvMR8wHQYDVQQDDBZBZG1pbkBvcmcxLmV4YW1wbGUuY29tMFkw\nEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEV1dfmKxsFKWo7o6DNBIaIVebCCPAM9C/\nsLBt4pJRre9pWE987DjXZoZ3glc4+DoPMtTmBRqbPVwYcUvpbYY8p6NNMEswDgYD\nVR0PAQH/BAQDAgeAMAwGA1UdEwEB/wQCMAAwKwYDVR0jBCQwIoAgQjmqDc122u64\nugzacBhR0UUE0xqtGy3d26xqVzZeSXwwCgYIKoZIzj0EAwIDRwAwRAIgXMy26AEU\n/GUMPfCMs/nQjQME1ZxBHAYZtKEuRR361JsCIEg9BOZdIoioRivJC+ZUzvJUnkXu\no2HkWiuxLsibGxtE\n-----END CERTIFICATE-----\n');
        fabricRuntimeStub.getPrivateKey.resolves('-----BEGIN PRIVATE KEY-----\nMIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgRgQr347ij6cjwX7m\nKjzbbD8Tlwdfu6FaubjWJWLGyqahRANCAARXV1+YrGwUpajujoM0EhohV5sII8Az\n0L+wsG3iklGt72lYT3zsONdmhneCVzj4Og8y1OYFGps9XBhxS+lthjyn\n-----END PRIVATE KEY-----\n');
        fabricRuntimeStub.getConnectionProfile.callThrough();
        fabricRuntimeStub.getCertificatePath.callThrough();
        connectionWallet = new FabricWallet(walletPath);

        fabricRuntimeConnection = FabricConnectionFactory.createFabricRuntimeConnection((fabricRuntimeStub as any) as FabricRuntime) as FabricRuntimeConnection;

        fabricClientStub = mySandBox.createStubInstance(Client);

        mySandBox.stub(Client, 'loadFromConfig').resolves(fabricClientStub);

        fabricClientStub.getMspid.returns('myMSPId');

        gatewayStub = sinon.createStubInstance(Gateway);
        gatewayStub.connect.resolves();
        fabricRuntimeConnection['gateway'] = gatewayStub;

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
        fabricChannelStub.getOrganizations.resolves([{id: 'Org1MSP'}]);

        const fabricNetworkStub: any = {
            getContract: mySandBox.stub().returns(fabricContractStub),
            getChannel: mySandBox.stub().returns(fabricChannelStub)
        };

        gatewayStub.getNetwork.returns(fabricNetworkStub);

        fabricClientStub = mySandBox.createStubInstance(Client);
        fabricClientStub.newTransactionID.returns({
            getTransactionID: mySandBox.stub().returns('1234')
        });
        gatewayStub.getClient.returns(fabricClientStub);

        fabricClientStub.getMspid.returns('myMSPId');
        fabricCAStub = mySandBox.createStubInstance(FabricCAServices);
        fabricCAStub.enroll.returns({certificate : 'myCert', key : { toBytes : mySandBox.stub().returns('myKey')}});
        fabricCAStub.register.resolves('its a secret');
        fabricClientStub.getCertificateAuthority.returns(fabricCAStub);

        fabricRuntimeStub.getNodes.resolves([
            new FabricNode(
                'peer0.org1.example.com',
                'peer0.org1.example.com',
                FabricNodeType.PEER,
                `grpc://localhost:7051`,
                `${FabricWalletUtil.LOCAL_WALLET}-ops`,
                FabricRuntimeUtil.ADMIN_USER
            ),
            new FabricNode(
                'ca.example.com',
                'ca.example.com',
                FabricNodeType.CERTIFICATE_AUTHORITY,
                `http://localhost:7054`,
                FabricWalletUtil.LOCAL_WALLET,
                FabricRuntimeUtil.ADMIN_USER
            ),
            new FabricNode(
                'orderer.example.com',
                'orderer.example.com',
                FabricNodeType.ORDERER,
                `grpc://localhost:7050`,
                `${FabricWalletUtil.LOCAL_WALLET}-ops`,
                FabricRuntimeUtil.ADMIN_USER
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
    });

    afterEach(() => {
        mySandBox.restore();
    });

    describe('connect', () => {

        it('should connect to a fabric', async () => {
            await fabricRuntimeConnection.connect(connectionWallet, FabricRuntimeUtil.ADMIN_USER);
            gatewayStub.connect.should.have.been.called;
        });

        it('should connect with an already loaded client connection', async () => {
            should.exist(FabricConnectionFactory['runtimeConnection']);
            await fabricRuntimeConnection.connect(connectionWallet, FabricRuntimeUtil.ADMIN_USER);
            gatewayStub.connect.should.have.been.called;
        });

        it('should create peer clients for each peer node', async () => {
            await fabricRuntimeConnection.connect(connectionWallet, 'Admin@org1.example.com');
            const peerNames: string[] = Array.from(fabricRuntimeConnection['peers'].keys());
            const peerValues: Client.Peer[] = Array.from(fabricRuntimeConnection['peers'].values());
            peerNames.should.deep.equal(['peer0.org1.example.com']);
            peerValues.should.have.lengthOf(1);
            peerValues[0].should.be.an.instanceOf(Client.Peer);
            peerValues[0].toString().should.match(/url:grpc:\/\/localhost:7051/);
        });

        it('should create orderer clients for each orderer node', async () => {
            await fabricRuntimeConnection.connect(connectionWallet, 'Admin@org1.example.com');
            const ordererNames: string[] = Array.from(fabricRuntimeConnection['orderers'].keys());
            const ordererValues: Client.Orderer[] = Array.from(fabricRuntimeConnection['orderers'].values());
            ordererNames.should.deep.equal(['orderer.example.com']);
            ordererValues.should.have.lengthOf(1);
            ordererValues[0].should.be.an.instanceOf(Client.Orderer);
            ordererValues[0].toString().should.match(/url:grpc:\/\/localhost:7050/);
        });

        it('should create certificate authority clients for each certificate authority node', async () => {
            await fabricRuntimeConnection.connect(connectionWallet, FabricRuntimeUtil.ADMIN_USER);
            const certificateAuthorityNames: string[] = Array.from(fabricRuntimeConnection['certificateAuthorities'].keys());
            const certificateAuthorityValues: FabricCAServices[] = Array.from(fabricRuntimeConnection['certificateAuthorities'].values());
            certificateAuthorityNames.should.deep.equal(['ca.example.com']);
            certificateAuthorityValues.should.have.lengthOf(1);
            certificateAuthorityValues[0].should.be.an.instanceOf(FabricCAServices);
            certificateAuthorityValues[0].toString().should.match(/hostname: localhost/);
            certificateAuthorityValues[0].toString().should.match(/port: 7054/);
        });

    });

    describe('disconnect', () => {

        beforeEach(async () => {
            await fabricRuntimeConnection.connect(connectionWallet, mockIdentityName);
        });

        it('should clear all nodes, clients, peers, orderers, and certificate authorities', () => {
            fabricRuntimeConnection.disconnect();
            fabricRuntimeConnection['nodes'].size.should.equal(0);
            should.equal(fabricRuntimeConnection['client'], null);
            fabricRuntimeConnection['peers'].size.should.equal(0);
            fabricRuntimeConnection['orderers'].size.should.equal(0);
            fabricRuntimeConnection['certificateAuthorities'].size.should.equal(0);
        });

    });

    describe('getAllPeerNames', () => {

        beforeEach(async () => {
            await fabricRuntimeConnection.connect(connectionWallet, mockIdentityName);
        });

        it('should get all of the peer names', () => {
            fabricRuntimeConnection.getAllPeerNames().should.deep.equal(['peer0.org1.example.com']);
        });
    });

    describe('getAllInstantiatedChaincodes', () => {

        it('should get all instantiated chaincodes', async () => {
            const map: Map<string, Array<string>> = new Map<string, Array<string>>();
            map.set('channel1', ['peerOne']);
            map.set('channel2', ['peerOne', 'peerTwo']);
            mySandBox.stub(fabricRuntimeConnection, 'createChannelMap').resolves(map);

            const getInstantiatedChaincodeStub: sinon.SinonStub = mySandBox.stub(fabricRuntimeConnection, 'getInstantiatedChaincode');
            getInstantiatedChaincodeStub.withArgs('channel1').resolves([{name: 'a_chaincode', version: '0.0.1'}, {name: 'another_chaincode', version: '0.0.7'}]);
            getInstantiatedChaincodeStub.withArgs('channel2').resolves([{name: 'another_chaincode', version: '0.0.7'}]);

            const instantiatedChaincodes: Array<{name: string, version: string}> = await fabricRuntimeConnection.getAllInstantiatedChaincodes();

            instantiatedChaincodes.should.deep.equal([{name: 'a_chaincode', version: '0.0.1'}, {name: 'another_chaincode', version: '0.0.7'}]);
        });

        it('should handle any errors', async () => {
            const error: Error = new Error('Could not create channel map');
            mySandBox.stub(fabricRuntimeConnection, 'createChannelMap').rejects(error);

            await fabricRuntimeConnection.getAllInstantiatedChaincodes().should.be.rejectedWith(`Could not get all instantiated chaincodes: ${error}`);
        });

    });

    describe('getOrganization', () => {
        it('should get an organization', async () => {
            await fabricRuntimeConnection.connect(connectionWallet, mockIdentityName);

            const orgs: any[] = await fabricRuntimeConnection.getOrganizations('myChannel');
            orgs.length.should.equal(1);
            orgs[0].id.should.deep.equal('Org1MSP');
        });
    });

    describe('getAllCertificateAuthorityNames', () => {

        beforeEach(async () => {
            await fabricRuntimeConnection.connect(connectionWallet, mockIdentityName);
        });

        it('should get all of the certificate authority names', () => {
            fabricRuntimeConnection.getAllCertificateAuthorityNames().should.deep.equal(['ca.example.com']);
        });

    });

    describe('getInstalledChaincode', () => {

        let mockPeer: sinon.SinonStubbedInstance<Client.Peer>;
        let queryInstalledChaincodesStub: sinon.SinonStub;

        beforeEach(async () => {
            await fabricRuntimeConnection.connect(connectionWallet, mockIdentityName);
            mockPeer = mySandBox.createStubInstance(Client.Peer);
            fabricRuntimeConnection['peers'].has('peer0.org1.example.com').should.be.true;
            fabricRuntimeConnection['peers'].set('peer0.org1.example.com', mockPeer);
            queryInstalledChaincodesStub = mySandBox.stub(fabricRuntimeConnection['client'], 'queryInstalledChaincodes');
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
            const installedChaincode: Map<string, Array<string>> = await fabricRuntimeConnection.getInstalledChaincode('peer0.org1.example.com');
            installedChaincode.size.should.equal(2);
            Array.from(installedChaincode.keys()).should.deep.equal(['biscuit-network', 'cake-network']);
            installedChaincode.get('biscuit-network').should.deep.equal(['0.7', '0.8']);
            installedChaincode.get('cake-network').should.deep.equal(['0.8']);
        });

        it('should handle and swallow an access denied error', async () => {
            queryInstalledChaincodesStub.withArgs(mockPeer).rejects(new Error('wow u cannot see cc cos access denied as u is not an admin'));
            const installedChaincode: Map<string, Array<string>> = await fabricRuntimeConnection.getInstalledChaincode('peer0.org1.example.com');
            installedChaincode.size.should.equal(0);
            Array.from(installedChaincode.keys()).should.deep.equal([]);
        });

        it('should rethrow any error other than access denied', async () => {
            queryInstalledChaincodesStub.withArgs(mockPeer).rejects(new Error('wow u cannot see cc cos peer no works'));
            await fabricRuntimeConnection.getInstalledChaincode('peer0.org1.example.com').should.be.rejectedWith(/peer no works/);
        });

        it('should throw an error getting installed chaincodes from a peer that does not exist', async () => {
            await fabricRuntimeConnection.getInstalledChaincode('nosuch.peer0.org1.example.com')
                .should.be.rejectedWith(/does not exist/);
        });
    });

    describe('getAllOrdererNames', () => {

        beforeEach(async () => {
            await fabricRuntimeConnection.connect(connectionWallet, mockIdentityName);
        });

        it('should get all of the orderer names', () => {
            fabricRuntimeConnection.getAllOrdererNames().should.deep.equal(['orderer.example.com']);
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

        beforeEach(async () => {
            await fabricRuntimeConnection.connect(connectionWallet, mockIdentityName);
            mockPeer = mySandBox.createStubInstance(Client.Peer);
            fabricRuntimeConnection['peers'].has('peer0.org1.example.com').should.be.true;
            fabricRuntimeConnection['peers'].set('peer0.org1.example.com', mockPeer);
            mySandBox.stub(fabricRuntimeConnection['client'], 'newTransactionID').returns({
                getTransactionID: mySandBox.stub().returns('1234')
            });
            installChaincodeStub = mySandBox.stub(fabricRuntimeConnection['client'], 'installChaincode');
        });

        it('should install the chaincode package', async () => {
            const responseStub: any = [[{
                response: {
                    message: 'all good in da hood',
                    status: 200
                }
            }]];
            installChaincodeStub.resolves(responseStub);

            await fabricRuntimeConnection.installChaincode(packageEntry, 'peer0.org1.example.com');
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

            await fabricRuntimeConnection.installChaincode(packageEntry, 'peer0.org1.example.com').should.be.rejectedWith(/some error/);
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

            await fabricRuntimeConnection.installChaincode(packageEntry, 'peer0.org1.example.com').should.be.rejectedWith('some error');
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

            await fabricRuntimeConnection.installChaincode(invalidPackageEntry, 'peer0.org1.example.com')
                .should.have.been.rejectedWith(/ENOENT/);
        });

        it('should handle an error installing the chaincode package', async () => {
            installChaincodeStub.rejects(new Error('such error'));

            await fabricRuntimeConnection.installChaincode(packageEntry, 'peer0.org1.example.com')
                .should.have.been.rejectedWith(/such error/);
        });

        it('should throw an error installing chaincode onto a peer that does not exist', async () => {
            await fabricRuntimeConnection.installChaincode(packageEntry, 'nosuch.peer0.org1.example.com')
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

        beforeEach(async () => {
            await fabricRuntimeConnection.connect(connectionWallet, mockIdentityName);
            mySandBox.stub(fabricRuntimeConnection['client'], 'newTransactionID').returns({
                getTransactionID: mySandBox.stub().returns('1234')
            });
            channel = fabricRuntimeConnection['getOrCreateChannel']('mychannel');
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
            outputSpy = mySandBox.spy(fabricRuntimeConnection['outputAdapter'], 'log');
        });

        it('should instantiate the specified chaincode', async () => {
            const payload: Buffer = await fabricRuntimeConnection.instantiateChaincode('myChaincode', '0.0.1', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1']);
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
            const payload: Buffer = await fabricRuntimeConnection.instantiateChaincode('myChaincode', '0.0.1', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1']);
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
            await fabricRuntimeConnection.instantiateChaincode('otherChaincode', '0.0.1', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1'])
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
            await fabricRuntimeConnection.instantiateChaincode('myChaincode', '0.0.1', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1'])
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
            await fabricRuntimeConnection.instantiateChaincode('myChaincode', '0.0.1', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1'])
                .should.be.rejectedWith(/such error/);
        });

        it('should throw an error if the orderer rejects the transaction', async () => {
            sendTransactionStub.resolves({
                status: 'FAILURE'
            });
            await fabricRuntimeConnection.instantiateChaincode('myChaincode', '0.0.1', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1'])
                .should.be.rejectedWith(/Response status: FAILURE/);
        });

        it('should throw an error if the event hub fails to connect before the transaction is committed', async () => {
            mockEventHub.connect.yields(new Error('such connect error'));
            await fabricRuntimeConnection.instantiateChaincode('myChaincode', '0.0.1', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1'])
                .should.be.rejectedWith(/such connect error/);
        });

        it('should throw an error if the event hub disconnects before the transaction is committed', async () => {
            mockEventHub.registerTxEvent.callsFake((_1: string, _2: void, errorCallback: any): void => {
                errorCallback(new Error('such connect error'));
            });
            await fabricRuntimeConnection.instantiateChaincode('myChaincode', '0.0.1', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1'])
                .should.be.rejectedWith(/such connect error/);
        });

        it('should throw an error if the transaction is rejected at validation time', async () => {
            mockEventHub.registerTxEvent.callsFake((txId: string, callback: any): void => {
                callback(txId, 'INVALID', 1);
            });
            await fabricRuntimeConnection.instantiateChaincode('myChaincode', '0.0.1', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1'])
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

        beforeEach(async () => {
            await fabricRuntimeConnection.connect(connectionWallet, mockIdentityName);
            mySandBox.stub(fabricRuntimeConnection['client'], 'newTransactionID').returns({
                getTransactionID: mySandBox.stub().returns('1234')
            });
            channel = fabricRuntimeConnection['getOrCreateChannel']('mychannel');
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
            outputSpy = mySandBox.spy(fabricRuntimeConnection['outputAdapter'], 'log');
        });

        it('should upgrade the specified chaincode', async () => {
            const payload: Buffer = await fabricRuntimeConnection.upgradeChaincode('myChaincode', '0.0.2', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1']);
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
            const payload: Buffer = await fabricRuntimeConnection.upgradeChaincode('myChaincode', '0.0.2', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1']);
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
            await fabricRuntimeConnection.upgradeChaincode('noSuchChaincode', '0.0.1', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1'])
                .should.be.rejectedWith(/The smart contract noSuchChaincode is not instantiated on the channel mychannel, so cannot be upgraded/);
        });

        it('should throw an error if the specified chaincode is already instantiated with the same version', async () => {
            await fabricRuntimeConnection.upgradeChaincode('myChaincode', '0.0.1', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1'])
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
            await fabricRuntimeConnection.upgradeChaincode('myChaincode', '0.0.2', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1'])
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
            await fabricRuntimeConnection.upgradeChaincode('myChaincode', '0.0.2', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1'])
                .should.be.rejectedWith(/such error/);
        });

        it('should throw an error if the orderer rejects the transaction', async () => {
            sendTransactionStub.resolves({
                status: 'FAILURE'
            });
            await fabricRuntimeConnection.upgradeChaincode('myChaincode', '0.0.2', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1'])
                .should.be.rejectedWith(/Response status: FAILURE/);
        });

        it('should throw an error if the event hub fails to connect before the transaction is committed', async () => {
            mockEventHub.connect.yields(new Error('such connect error'));
            await fabricRuntimeConnection.upgradeChaincode('myChaincode', '0.0.2', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1'])
                .should.be.rejectedWith(/such connect error/);
        });

        it('should throw an error if the event hub disconnects before the transaction is committed', async () => {
            mockEventHub.registerTxEvent.callsFake((_1: string, _2: void, errorCallback: any): void => {
                errorCallback(new Error('such connect error'));
            });
            await fabricRuntimeConnection.upgradeChaincode('myChaincode', '0.0.2', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1'])
                .should.be.rejectedWith(/such connect error/);
        });

        it('should throw an error if the transaction is rejected at validation time', async () => {
            mockEventHub.registerTxEvent.callsFake((txId: string, callback: any): void => {
                callback(txId, 'INVALID', 1);
            });
            await fabricRuntimeConnection.upgradeChaincode('myChaincode', '0.0.2', ['peer0.org1.example.com'], 'mychannel', 'instantiate', ['arg1'])
                .should.be.rejectedWith(/with code INVALID in block 1/);
        });

    });

    describe('enroll', () => {

        beforeEach(async () => {
            await fabricRuntimeConnection.connect(connectionWallet, mockIdentityName);
            const mockFabricCA: sinon.SinonStubbedInstance<FabricCAServices> = mySandBox.createStubInstance(FabricCAServices);
            mockFabricCA.enroll.returns({certificate : 'myCert', key : { toBytes : mySandBox.stub().returns('myKey')}});
            fabricRuntimeConnection['certificateAuthorities'].has('ca.example.com').should.be.true;
            fabricRuntimeConnection['certificateAuthorities'].set('ca.example.com', mockFabricCA);
        });

        it('should enroll an identity using a certificate authority that exists', async () => {
            const result: {certificate: string, privateKey: string} =  await fabricRuntimeConnection.enroll('ca.example.com', 'myId', 'mySecret');
            result.should.deep.equal({certificate : 'myCert', privateKey: 'myKey'});
        });

        it('should throw trying to enroll an identity using a certificate authority that does not exist', async () => {
            await fabricRuntimeConnection.enroll('nosuch.ca.example.com', 'myId', 'mySecret')
                .should.be.rejectedWith(/does not exist/);
        });

    });

    describe('register', () => {

        beforeEach(async () => {
            await fabricRuntimeConnection.connect(connectionWallet, mockIdentityName);
            const mockFabricCA: sinon.SinonStubbedInstance<FabricCAServices> = mySandBox.createStubInstance(FabricCAServices);
            mockFabricCA.register.resolves('its a secret');
            fabricRuntimeConnection['certificateAuthorities'].has('ca.example.com').should.be.true;
            fabricRuntimeConnection['certificateAuthorities'].set('ca.example.com', mockFabricCA);
        });

        it('should register a new user and return a secret using a certificate authority that exists ', async () => {
            const secret: string = await fabricRuntimeConnection.register('ca.example.com', 'enrollThis', 'departmentE');
            secret.should.deep.equal('its a secret');
            mockLocalWallet['setUserContext'].should.have.been.calledOnceWithExactly(sinon.match.any, FabricRuntimeUtil.ADMIN_USER);
        });

        it('should throw trying to register a new user using a certificate authority that does not exist ', async () => {
            await fabricRuntimeConnection.register('nosuch.ca.example.com', 'enrollThis', 'departmentE')
                .should.be.rejectedWith(/does not exist/);
        });

    });

    describe('getNode', () => {

        beforeEach(async () => {
            await fabricRuntimeConnection.connect(connectionWallet, mockIdentityName);
        });

        it('should return a certificate authority node', () => {
            const node: FabricNode = fabricRuntimeConnection.getNode('ca.example.com');
            node.short_name.should.equal('ca.example.com');
            node.name.should.equal('ca.example.com');
            node.type.should.equal(FabricNodeType.CERTIFICATE_AUTHORITY);
            node.url.should.equal('http://localhost:7054');
            node.wallet.should.equal(FabricWalletUtil.LOCAL_WALLET);
            node.identity.should.equal(FabricRuntimeUtil.ADMIN_USER);
        });

        it('should throw for a node that does not exist', () => {
            ((): void => {
                fabricRuntimeConnection.getNode('nosuch.ca.example.com');
            }).should.throw(/does not exist/);
        });

    });

    describe('getWallet', () => {

        beforeEach(async () => {
            await fabricRuntimeConnection.connect(connectionWallet, mockIdentityName);
        });

        it('should return the wallet for a certificate authority node', async () => {
            const wallet: IFabricWallet = await fabricRuntimeConnection.getWallet('ca.example.com');
            wallet.should.equal(mockLocalWallet);
        });

    });

});
