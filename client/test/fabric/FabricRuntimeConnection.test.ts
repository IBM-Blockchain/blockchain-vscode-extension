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
import * as path from 'path';

import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';

const should: Chai.Should = chai.should();
chai.use(sinonChai);

// tslint:disable no-unused-expression
describe('FabricRuntimeConnection', () => {

    let fabricClientStub: sinon.SinonStubbedInstance<fabricClient>;
    let fabricRuntimeStub: sinon.SinonStubbedInstance<FabricRuntime>;
    let fabricRuntimeConnection: FabricRuntimeConnection;
    let wallet: FabricWallet;

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
        wallet = new FabricWallet('myConnection', walletPath);

        fabricRuntimeConnection = FabricConnectionFactory.createFabricRuntimeConnection((fabricRuntimeStub as any) as FabricRuntime) as FabricRuntimeConnection;

        fabricClientStub = mySandBox.createStubInstance(fabricClient);

        mySandBox.stub(fabricClient, 'loadFromConfig').resolves(fabricClientStub);

        fabricClientStub.getMspid.returns('myMSPId');

        gatewayStub = sinon.createStubInstance(Gateway);
        gatewayStub.connect.resolves();
        fabricRuntimeConnection['gateway'] = gatewayStub;
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

});
