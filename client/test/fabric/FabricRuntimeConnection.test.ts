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
import * as fabricClient from 'fabric-client';
import * as fabricClientCA from 'fabric-ca-client';
import { Channel } from 'fabric-client';
import * as path from 'path';

import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { VSCodeBlockchainOutputAdapter } from '../../src/logging/VSCodeBlockchainOutputAdapter';
import { PackageRegistryEntry } from '../../src/packages/PackageRegistryEntry';
import { LogType } from '../../src/logging/OutputAdapter';

const should: Chai.Should = chai.should();
chai.use(sinonChai);

// tslint:disable no-unused-expression
describe('FabricRuntimeConnection', () => {

    const TEST_PACKAGE_DIRECTORY: string = path.join(path.dirname(__dirname), '..', '..', 'test', 'data', 'packageDir', 'packages');

    let fabricClientStub: sinon.SinonStubbedInstance<fabricClient>;
    let fabricRuntimeStub: sinon.SinonStubbedInstance<FabricRuntime>;
    let fabricRuntimeConnection: FabricRuntimeConnection;
    let fabricChannelStub: sinon.SinonStubbedInstance<Channel>;
    let fabricContractStub: any;
    let fabricTransactionStub: any;
    let wallet: FabricWallet;
    const mockIdentityName: string = 'Admin@org1.example.com';
    let fabricCAStub: sinon.SinonStubbedInstance<fabricClientCA>;

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

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();

        fabricRuntimeStub = sinon.createStubInstance(FabricRuntime);
        fabricRuntimeStub.getConnectionProfile.resolves(basicNetworkConnectionProfile);
        fabricRuntimeStub.getCertificate.resolves('-----BEGIN CERTIFICATE-----\nMIICGDCCAb+gAwIBAgIQFSxnLAGsu04zrFkAEwzn6zAKBggqhkjOPQQDAjBzMQsw\nCQYDVQQGEwJVUzETMBEGA1UECBMKQ2FsaWZvcm5pYTEWMBQGA1UEBxMNU2FuIEZy\nYW5jaXNjbzEZMBcGA1UEChMQb3JnMS5leGFtcGxlLmNvbTEcMBoGA1UEAxMTY2Eu\nb3JnMS5leGFtcGxlLmNvbTAeFw0xNzA4MzEwOTE0MzJaFw0yNzA4MjkwOTE0MzJa\nMFsxCzAJBgNVBAYTAlVTMRMwEQYDVQQIEwpDYWxpZm9ybmlhMRYwFAYDVQQHEw1T\nYW4gRnJhbmNpc2NvMR8wHQYDVQQDDBZBZG1pbkBvcmcxLmV4YW1wbGUuY29tMFkw\nEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEV1dfmKxsFKWo7o6DNBIaIVebCCPAM9C/\nsLBt4pJRre9pWE987DjXZoZ3glc4+DoPMtTmBRqbPVwYcUvpbYY8p6NNMEswDgYD\nVR0PAQH/BAQDAgeAMAwGA1UdEwEB/wQCMAAwKwYDVR0jBCQwIoAgQjmqDc122u64\nugzacBhR0UUE0xqtGy3d26xqVzZeSXwwCgYIKoZIzj0EAwIDRwAwRAIgXMy26AEU\n/GUMPfCMs/nQjQME1ZxBHAYZtKEuRR361JsCIEg9BOZdIoioRivJC+ZUzvJUnkXu\no2HkWiuxLsibGxtE\n-----END CERTIFICATE-----\n');
        fabricRuntimeStub.getPrivateKey.resolves('-----BEGIN PRIVATE KEY-----\nMIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgRgQr347ij6cjwX7m\nKjzbbD8Tlwdfu6FaubjWJWLGyqahRANCAARXV1+YrGwUpajujoM0EhohV5sII8Az\n0L+wsG3iklGt72lYT3zsONdmhneCVzj4Og8y1OYFGps9XBhxS+lthjyn\n-----END PRIVATE KEY-----\n');
        fabricRuntimeStub.getConnectionProfile.callThrough();
        fabricRuntimeStub.getCertificatePath.callThrough();
        wallet = new FabricWallet(walletPath);

        fabricRuntimeConnection = FabricConnectionFactory.createFabricRuntimeConnection((fabricRuntimeStub as any) as FabricRuntime) as FabricRuntimeConnection;

        fabricClientStub = mySandBox.createStubInstance(fabricClient);

        mySandBox.stub(fabricClient, 'loadFromConfig').resolves(fabricClientStub);

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

        fabricClientStub = mySandBox.createStubInstance(fabricClient);
        fabricClientStub.newTransactionID.returns({
            getTransactionID: mySandBox.stub().returns('1234')
        });
        gatewayStub.getClient.returns(fabricClientStub);

        fabricClientStub.getMspid.returns('myMSPId');
        fabricCAStub = mySandBox.createStubInstance(fabricClientCA);
        fabricCAStub.enroll.returns({certificate : 'myCert', key : { toBytes : mySandBox.stub().returns('myKey')}});
        fabricCAStub.register.resolves('its a secret');
        fabricClientStub.getCertificateAuthority.returns(fabricCAStub);
    });

    afterEach(() => {
        mySandBox.restore();
    });
    describe('connect', () => {
        it('should connect to a fabric', async () => {
            await fabricRuntimeConnection.connect(wallet, 'Admin@org1.example.com');
            gatewayStub.connect.should.have.been.called;
        });

        it('should connect with an already loaded client connection', async () => {
            should.exist(FabricConnectionFactory['runtimeConnection']);
            await fabricRuntimeConnection.connect(wallet, 'Admin@org1.example.com');
            gatewayStub.connect.should.have.been.called;
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
            await fabricRuntimeConnection.connect(wallet, mockIdentityName);

            const orgs: any[] = await fabricRuntimeConnection.getOrganizations('myChannel');
            orgs.length.should.equal(1);
            orgs[0].id.should.deep.equal('Org1MSP');
        });
    });

    describe('getAllCertificateAuthorityNames', () => {
        it('should get the certificate authority name', async () => {
            fabricClientStub.getCertificateAuthority.returns({
                getCaName: mySandBox.stub().returns('ca-name')
            });
            fabricRuntimeConnection.getAllCertificateAuthorityNames().should.deep.equal(['ca-name']);
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

            await fabricRuntimeConnection.connect(wallet, mockIdentityName);
            const installedChaincode: Map<string, Array<string>> = await fabricRuntimeConnection.getInstalledChaincode('peerOne');
            installedChaincode.size.should.equal(2);
            Array.from(installedChaincode.keys()).should.deep.equal(['biscuit-network', 'cake-network']);
            installedChaincode.get('biscuit-network').should.deep.equal(['0.7', '0.8']);
            installedChaincode.get('cake-network').should.deep.equal(['0.8']);
        });

        it('should handle and swallow an access denied error', async () => {
            const peerOne: fabricClient.Peer = new fabricClient.Peer('grpc://localhost:1454', { name: 'peerOne' });
            const peerTwo: fabricClient.Peer = new fabricClient.Peer('grpc://localhost:1453', { name: 'peerTwo' });

            fabricClientStub.getPeersForOrg.returns([peerOne, peerTwo]);

            fabricClientStub.queryInstalledChaincodes.withArgs(peerOne).rejects(new Error('wow u cannot see cc cos access denied as u is not an admin'));

            await fabricRuntimeConnection.connect(wallet, mockIdentityName);
            const installedChaincode: Map<string, Array<string>> = await fabricRuntimeConnection.getInstalledChaincode('peerOne');
            installedChaincode.size.should.equal(0);
            Array.from(installedChaincode.keys()).should.deep.equal([]);
        });

        it('should rethrow any error other than access denied', async () => {
            const peerOne: fabricClient.Peer = new fabricClient.Peer('grpc://localhost:1454', { name: 'peerOne' });
            const peerTwo: fabricClient.Peer = new fabricClient.Peer('grpc://localhost:1453', { name: 'peerTwo' });

            fabricClientStub.getPeersForOrg.returns([peerOne, peerTwo]);

            fabricClientStub.queryInstalledChaincodes.withArgs(peerOne).rejects(new Error('wow u cannot see cc cos peer no works'));

            await fabricRuntimeConnection.connect(wallet, mockIdentityName);
            await fabricRuntimeConnection.getInstalledChaincode('peerOne').should.be.rejectedWith(/peer no works/);
        });
    });

    describe('getAllOrdererNames', () => {
        it('should get orderers', async () => {
            fabricClientStub.getChannel.onFirstCall().returns({
                getOrderers: mySandBox.stub().returns([
                    {
                        getName: mySandBox.stub().returns('orderer1')
                    }
                ])
            });
            fabricClientStub.getChannel.onSecondCall().returns({
                getOrderers: mySandBox.stub().returns([
                    {
                        getName: mySandBox.stub().returns('orderer2')
                    }
                ])
            });
            fabricChannelStub.getOrderers.onFirstCall().returns([new fabricClient.Orderer('grpc://url1')]);
            fabricChannelStub.getOrderers.onSecondCall().returns([new fabricClient.Orderer('grpc://url2')]);
            mySandBox.stub(fabricRuntimeConnection, 'getAllPeerNames').returns(['peerOne', 'peerTwo']);
            const getAllChannelsForPeer: sinon.SinonStub = mySandBox.stub(fabricRuntimeConnection, 'getAllChannelsForPeer');
            getAllChannelsForPeer.withArgs('peerOne').resolves(['channel1']);
            getAllChannelsForPeer.withArgs('peerTwo').resolves(['channel2']);
            const orderers: Array<string> = await fabricRuntimeConnection.getAllOrdererNames();
            orderers.should.deep.equal(['orderer1', 'orderer2']);
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
            await fabricRuntimeConnection.connect(wallet, mockIdentityName);
        });

        it('should install the chaincode package', async () => {
            const packageEntry: PackageRegistryEntry = new PackageRegistryEntry({
                name: 'vscode-pkg-1',
                version: '0.0.1',
                path: path.join(TEST_PACKAGE_DIRECTORY, 'vscode-pkg-1@0.0.1.cds')
            });

            await fabricRuntimeConnection.installChaincode(packageEntry, 'peer1');
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

            await fabricRuntimeConnection.installChaincode(packageEntry, 'peer1').should.be.rejectedWith(/some error/);
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

            await fabricRuntimeConnection.installChaincode(packageEntry, 'peer1').should.be.rejectedWith('some error');
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

            await fabricRuntimeConnection.installChaincode(packageEntry, 'peer1')
                .should.have.been.rejectedWith(/ENOENT/);
        });

        it('should handle an error installing the chaincode package', async () => {
            const packageEntry: PackageRegistryEntry = new PackageRegistryEntry({
                name: 'vscode-pkg-1',
                version: '0.0.1',
                path: path.join(TEST_PACKAGE_DIRECTORY, 'vscode-pkg-1@0.0.1.cds')
            });

            fabricClientStub.installChaincode.rejects(new Error('such error'));
            await fabricRuntimeConnection.installChaincode(packageEntry, 'peer1')
                .should.have.been.rejectedWith(/such error/);
        });

    });

    describe('instantiateChaincode', () => {

        let getChanincodesStub: sinon.SinonStub;
        beforeEach(() => {
            getChanincodesStub = mySandBox.stub(fabricRuntimeConnection, 'getInstantiatedChaincode');
            getChanincodesStub.resolves([]);
        });

        it('should instantiate a chaincode', async () => {
            const outputSpy: sinon.SinonSpy = mySandBox.spy(fabricRuntimeConnection['outputAdapter'], 'log');

            const responsePayload: any = await fabricRuntimeConnection.instantiateChaincode('myChaincode', '0.0.1', 'myChannel', 'instantiate', ['arg1']).should.not.be.rejected;
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
            const output: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
            const logSpy: sinon.SinonSpy = mySandBox.spy(output, 'log');
            getChanincodesStub.withArgs('myChannel').resolves([{ name: 'myChaincode' }]);
            await fabricRuntimeConnection.instantiateChaincode('myChaincode', '0.0.2', 'myChannel', 'instantiate', ['arg1']).should.be.rejectedWith('The name of the contract you tried to instantiate is already instantiated');
            fabricChannelStub.sendUpgradeProposal.should.not.have.been.called;

            logSpy.should.not.have.been.calledWith("Upgrading with function: 'instantiate' and arguments: 'arg1'");
        });

        it('should instantiate a chaincode and can return empty payload response', async () => {
            fabricTransactionStub._validatePeerResponses.returns(null);
            const nullResponsePayload: any = await fabricRuntimeConnection.instantiateChaincode('myChaincode', '0.0.1', 'myChannel', 'instantiate', ['arg1']);
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
            await fabricRuntimeConnection.instantiateChaincode('myChaincode', '0.0.1', 'myChannel', 'instantiate', ['arg1']).should.be.rejectedWith('Failed to create an event handler');
        });

        it('should throw an error if submitting the transaction failed', async () => {
            fabricChannelStub.sendTransaction.returns({ status: 'FAILED' });
            await fabricRuntimeConnection.instantiateChaincode('myChaincode', '0.0.1', 'myChannel', 'instantiate', ['arg1']).should.be.rejectedWith('Failed to send peer responses for transaction 1234 to orderer. Response status: FAILED');
        });
    });

    describe('upgradeChaincode', () => {

        let getChanincodesStub: sinon.SinonStub;
        beforeEach(() => {
            getChanincodesStub = mySandBox.stub(fabricRuntimeConnection, 'getInstantiatedChaincode');
            getChanincodesStub.resolves([]);
        });

        it('should upgrade a chaincode', async () => {
            const outputSpy: sinon.SinonSpy = mySandBox.spy(fabricRuntimeConnection['outputAdapter'], 'log');
            getChanincodesStub.resolves([{name: 'myChaincode', version: '0.0.2'}]);
            const responsePayload: any = await fabricRuntimeConnection.upgradeChaincode('myChaincode', '0.0.1', 'myChannel', 'instantiate', ['arg1']).should.not.be.rejected;
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
            const output: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
            const outputSpy: sinon.SinonSpy = mySandBox.spy(output, 'log');

            await fabricRuntimeConnection.upgradeChaincode('myChaincode', '0.0.2', 'myChannel', 'instantiate', ['arg1']).should.be.rejectedWith('The contract you tried to upgrade with has no previous versions instantiated');
            fabricChannelStub.sendUpgradeProposal.should.not.have.been.called;

            outputSpy.should.not.have.been.calledWith("Upgrading with function: 'instantiate' and arguments: 'arg1'");
        });

        it('should instantiate a chaincode and can return empty payload response', async () => {
            fabricTransactionStub._validatePeerResponses.returns(null);
            getChanincodesStub.resolves([{name: 'myChaincode', version: '0.0.2'}]);

            const nullResponsePayload: any = await fabricRuntimeConnection.upgradeChaincode('myChaincode', '0.0.1', 'myChannel', 'instantiate', ['arg1']);
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
            await fabricRuntimeConnection.upgradeChaincode('myChaincode', '0.0.1', 'myChannel', 'instantiate', ['arg1']).should.be.rejectedWith('Failed to create an event handler');
        });

        it('should throw an error if submitting the transaction failed', async () => {
            getChanincodesStub.resolves([{name: 'myChaincode', version: '0.0.2'}]);
            fabricChannelStub.sendTransaction.returns({ status: 'FAILED' });
            await fabricRuntimeConnection.upgradeChaincode('myChaincode', '0.0.1', 'myChannel', 'instantiate', ['arg1']).should.be.rejectedWith('Failed to send peer responses for transaction 1234 to orderer. Response status: FAILED');
        });
    });

    describe('enroll', () => {
        it('should enroll an identity', async () => {
            const result: {certificate: string, privateKey: string} =  await fabricRuntimeConnection.enroll('myId', 'mySecret');
            result.should.deep.equal({certificate : 'myCert', privateKey: 'myKey'});
        });
    });

    describe('register', () => {
        it('should register a new user and return a secret', async () => {
            const secret: string = await fabricRuntimeConnection.register('enrollThis', 'departmentE');
            secret.should.deep.equal('its a secret');
        });
    });

});
