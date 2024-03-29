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

import { Channel, Committer, Discoverer, DiscoveryService, Endorsement, Endorser, IdentityContext, Endpoint, Client } from 'fabric-common';
import * as protos from 'fabric-protos';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as path from 'path';
import { Gateway, Wallet, Wallets, X509Identity } from 'fabric-network';
import * as sinon from 'sinon';
import { DefinedSmartContract, LifecycleChannel, SmartContractDefinitionOptions } from '../src/LifecycleChannel';
import { Lifecycle } from '../src/Lifecycle';
import { EndorsementPolicy } from '../src/Policy';
import { Collection } from '../src';
import { CollectionConfig } from '../src/CollectionConfig';

// this is horrible but needed as the transaction constructor isn't exported so can't stub it without stubbing the world
// tslint:disable-next-line:no-var-requires
import { Transaction } from 'fabric-network/lib/transaction'

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);
const should: Chai.Should = chai.should();

// tslint:disable:no-unused-expression
describe('LifecycleChannel', () => {

    let wallet: Wallet;
    let channel: LifecycleChannel;

    let lifecycle: Lifecycle;

    before(async () => {
        wallet = await Wallets.newFileSystemWallet(path.join(__dirname, 'tmp', 'wallet'));

        const peerOrg1Identity: X509Identity = {
            credentials: {
                certificate: '-----BEGIN CERTIFICATE-----\n' +
                    'MIICujCCAmGgAwIBAgIUUOge6hz++rKSbrV1Ya2t/kcC3s0wCgYIKoZIzj0EAwIw\n' +
                    'cDELMAkGA1UEBhMCVVMxFzAVBgNVBAgTDk5vcnRoIENhcm9saW5hMQ8wDQYDVQQH\n' +
                    'EwZEdXJoYW0xGTAXBgNVBAoTEG9yZzEuZXhhbXBsZS5jb20xHDAaBgNVBAMTE2Nh\n' +
                    'Lm9yZzEuZXhhbXBsZS5jb20wHhcNMjAwMzE3MTU0NzAwWhcNMjEwMzE3MTU1MjAw\n' +
                    'WjBgMQswCQYDVQQGEwJVUzEXMBUGA1UECBMOTm9ydGggQ2Fyb2xpbmExFDASBgNV\n' +
                    'BAoTC0h5cGVybGVkZ2VyMQ4wDAYDVQQLEwVhZG1pbjESMBAGA1UEAxMJb3JnMWFk\n' +
                    'bWluMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEoELj0ASt7TpEAUNJjPkG7zNY\n' +
                    'wLMP3LDsFc38rWKm6ZRGtJIQ5k7jcoXXScuhS1YuRop/xKAvOhiLbd1hyo7fAqOB\n' +
                    '6DCB5TAOBgNVHQ8BAf8EBAMCB4AwDAYDVR0TAQH/BAIwADAdBgNVHQ4EFgQUEKQz\n' +
                    'qJPP/lPsRO7BizDnjJptylswHwYDVR0jBBgwFoAUSS9NU/qBB+Wx0R7PispddLmZ\n' +
                    'fd0wKAYDVR0RBCEwH4IdQ2Fyb2xpbmVzLU1hY0Jvb2stUHJvLTMubG9jYWwwWwYI\n' +
                    'KgMEBQYHCAEET3siYXR0cnMiOnsiaGYuQWZmaWxpYXRpb24iOiIiLCJoZi5FbnJv\n' +
                    'bGxtZW50SUQiOiJvcmcxYWRtaW4iLCJoZi5UeXBlIjoiYWRtaW4ifX0wCgYIKoZI\n' +
                    'zj0EAwIDRwAwRAIgHhpQYEAtQ9rPhvh4Wer3hKtuq7FChoqJWkj9rNdnbIkCIC4I\n' +
                    'GzjjS7hZRKsETRvIT3LRFTZJLJq6AcGOtepFso/n\n' +
                    '-----END CERTIFICATE-----',
                privateKey: '-----BEGIN PRIVATE KEY-----\n' +
                    'MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgvprUzTpK7GBMXVvI\n' +
                    'NOlGgxyqqi1TM6CA63qNK8PTwfihRANCAASgQuPQBK3tOkQBQ0mM+QbvM1jAsw/c\n' +
                    'sOwVzfytYqbplEa0khDmTuNyhddJy6FLVi5Gin/EoC86GItt3WHKjt8C\n' +
                    '-----END PRIVATE KEY-----',
            },
            mspId: `myMSPID`,
            type: 'X.509',
        };

        await wallet.put('myIdentity', peerOrg1Identity);

        lifecycle = new Lifecycle();

        lifecycle.addPeer({
            url: 'grpcs://localhost:7051',
            mspid: 'myMSPID',
            name: 'myPeer',
            requestTimeout: 70,
            pem: '-----BEGIN CERTIFICATE-----\\nMIICJjCCAc2gAwIBAgIURY9F2Rt0JqOtiHbNJ6rRgfiDy2EwCgYIKoZIzj0EAwIw\\ncDELMAkGA1UEBhMCVVMxFzAVBgNVBAgTDk5vcnRoIENhcm9saW5hMQ8wDQYDVQQH\\nEwZEdXJoYW0xGTAXBgNVBAoTEG9yZzEuZXhhbXBsZS5jb20xHDAaBgNVBAMTE2Nh\\nLm9yZzEuZXhhbXBsZS5jb20wHhcNMjAwMzE2MTQ1MDAwWhcNMzUwMzEzMTQ1MDAw\\nWjBwMQswCQYDVQQGEwJVUzEXMBUGA1UECBMOTm9ydGggQ2Fyb2xpbmExDzANBgNV\\nBAcTBkR1cmhhbTEZMBcGA1UEChMQb3JnMS5leGFtcGxlLmNvbTEcMBoGA1UEAxMT\\nY2Eub3JnMS5leGFtcGxlLmNvbTBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABHic\\nzHXBRqfe7elvQ8zuxIwigOFCuk/49bjChQxf19fL/qHBLYLOXgd3Ox5jTVyyLuO/\\nf9x19piTv7gVgv8h7BijRTBDMA4GA1UdDwEB/wQEAwIBBjASBgNVHRMBAf8ECDAG\\nAQH/AgEBMB0GA1UdDgQWBBRGw4tXsbZSI45NZNTsDT7rssJpzjAKBggqhkjOPQQD\\nAgNHADBEAiBWNIFkaageeAiEMmhauY3bTHoG45Wgjk99CjHZ6KJoTgIgMfKc9mBL\\na5JHbGNB/gsBhxIm8/akE6g+SikIz/JGty4=\\n-----END CERTIFICATE-----\\n"\n'
        });

        lifecycle.addPeer({
            url: 'grpc://localhost:8051',
            mspid: 'myMSPID',
            name: 'myPeer2',
            sslTargetNameOverride: 'localhost',
            apiOptions: {
                'grpc.some_setting': 'maximum power'
            }
        });

        lifecycle.addOrderer({
            name: 'myOrderer',
            url: 'grpcs://localhost:7050',
            pem: '-----BEGIN CERTIFICATE-----\\nMIICJjCCAc2gAwIBAgIURY9F2Rt0JqOtiHbNJ6rRgfiDy2EwCgYIKoZIzj0EAwIw\\ncDELMAkGA1UEBhMCVVMxFzAVBgNVBAgTDk5vcnRoIENhcm9saW5hMQ8wDQYDVQQH\\nEwZEdXJoYW0xGTAXBgNVBAoTEG9yZzEuZXhhbXBsZS5jb20xHDAaBgNVBAMTE2Nh\\nLm9yZzEuZXhhbXBsZS5jb20wHhcNMjAwMzE2MTQ1MDAwWhcNMzUwMzEzMTQ1MDAw\\nWjBwMQswCQYDVQQGEwJVUzEXMBUGA1UECBMOTm9ydGggQ2Fyb2xpbmExDzANBgNV\\nBAcTBkR1cmhhbTEZMBcGA1UEChMQb3JnMS5leGFtcGxlLmNvbTEcMBoGA1UEAxMT\\nY2Eub3JnMS5leGFtcGxlLmNvbTBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABHic\\nzHXBRqfe7elvQ8zuxIwigOFCuk/49bjChQxf19fL/qHBLYLOXgd3Ox5jTVyyLuO/\\nf9x19piTv7gVgv8h7BijRTBDMA4GA1UdDwEB/wQEAwIBBjASBgNVHRMBAf8ECDAG\\nAQH/AgEBMB0GA1UdDgQWBBRGw4tXsbZSI45NZNTsDT7rssJpzjAKBggqhkjOPQQD\\nAgNHADBEAiBWNIFkaageeAiEMmhauY3bTHoG45Wgjk99CjHZ6KJoTgIgMfKc9mBL\\na5JHbGNB/gsBhxIm8/akE6g+SikIz/JGty4=\\n-----END CERTIFICATE-----\\n"\n'
        });

        channel = new LifecycleChannel(lifecycle, 'mychannel', wallet, 'myIdentity');
    });

    describe(`constructor`, () => {
        it('should create a LifecycleChannel instance', () => {

            channel['lifecycle'].should.deep.equal(lifecycle);
            channel['channelName'].should.equal('mychannel');
            channel['wallet'].should.deep.equal(wallet);
            channel['identity'].should.equal('myIdentity');
        });
    });

    describe('fabric functions', () => {

        describe('submitTransaction', () => {
            let mysandbox: sinon.SinonSandbox;

            // let gatewayConnectSpy: sinon.SinonSpy;

            let transactionSetEndorsingPeersSpy: sinon.SinonSpy;
            let transactionSubmitStub: sinon.SinonStub;

            let addEndorserStub: sinon.SinonStub;
            let addCommitterStub: sinon.SinonStub;
            let getEndorsersStub: sinon.SinonStub;

            let protoArgs: protos.lifecycle.IApproveChaincodeDefinitionForMyOrgArgs = {};

            beforeEach(() => {
                mysandbox = sinon.createSandbox();

                mysandbox.stub(Endorser.prototype, 'connect').resolves();
                mysandbox.stub(Discoverer.prototype, 'connect').resolves();
                mysandbox.stub(Committer.prototype, 'connect').resolves();

                protoArgs.name = 'myContract';
                protoArgs.version = '0.0.1';
                protoArgs.sequence = 1;

                const local: protos.lifecycle.ChaincodeSource.Local = new protos.lifecycle.ChaincodeSource.Local();
                local.package_id = 'myPackageId';

                const source: protos.lifecycle.ChaincodeSource = new protos.lifecycle.ChaincodeSource();
                source.local_package = local;
                protoArgs.source = source;

                // @ts-ignore

                mysandbox.spy(Gateway.prototype, 'connect');
                // @ts-ignore
                getEndorsersStub = mysandbox.stub(Channel.prototype, 'getEndorsers').returns([{ name: 'myPeer' }, { name: 'myPeer2' }, { name: 'myPeer:7051' }, { name: 'peer0.org2.example.com:9051' }]);


                mysandbox.stub(DiscoveryService.prototype, 'build');
                mysandbox.stub(DiscoveryService.prototype, 'sign');
                mysandbox.stub(DiscoveryService.prototype, 'send').resolves();

                addEndorserStub = mysandbox.stub(Channel.prototype, 'addEndorser');
                addCommitterStub = mysandbox.stub(Channel.prototype, 'addCommitter');

                transactionSetEndorsingPeersSpy = mysandbox.spy(Transaction.prototype, 'setEndorsingPeers');
                transactionSubmitStub = mysandbox.stub(Transaction.prototype, 'submit');
            });

            afterEach(() => {
                mysandbox.restore();
                protoArgs = {};
            });

            it('should handle no peerNames set', async () => {
                // @ts-ignore
                await channel.submitTransaction([], 'myOrderer', {
                    packageId: 'myPackageId',
                    sequence: 1,
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1',
                }).should.eventually.be.rejectedWith('parameter peers was missing or empty array');
            });

            it('should handle no orderer set (grpc)', async () => {

                const newEndpointSpy: sinon.SinonSpy = mysandbox.spy(Client.prototype, 'newEndpoint');
                // @ts-ignore
                getEndorsersStub.returns([
                    { name: 'myPeer', endpoint: {protocol: 'grpc'} },
                    { name: 'myPeer2', endpoint: {protocol: 'grpc'} },
                    { name: 'myPeer:7051', endpoint: {protocol: 'grpc'} },
                    { name: 'peer0.org2.example.com:9051', endpoint: {protocol: 'grpc'} }] as Endorser[]);

                const discoverChannelStub: sinon.SinonStub = mysandbox.stub(channel, 'discoverChannel').resolves(
                    {
                        msps: {
                            osmsp: {
                                tlsRootCerts: 'tlsRootCert',
                                tlsIntermediateCerts: 'tlsIntermediateCert'
                            },
                            org1msp: {

                            }
                        },
                        orderers: {
                            osmsp: {
                                endpoints: [
                                    {
                                        host: 'host',
                                        name: 'host:1000',
                                        port: 1000
                                    }
                                ]
                            }

                        },
                        peers_by_org: {

                        },
                        timestamp: 123456789
                    }
                )
                // @ts-ignore
                await channel.submitTransaction(['myPeer'], undefined, {
                    packageId: 'myPackageId',
                    sequence: 1,
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1',
                }, 'approve');

                discoverChannelStub.should.have.been.calledWith(['myPeer'])
                newEndpointSpy.should.have.been.calledWithExactly({
                    url: 'grpc://host:1000'
                })
            });

            it('should handle no orderer set (grpcs with tlsIntermediate cert)', async () => {
                const newEndpointSpy: sinon.SinonSpy = mysandbox.spy(Client.prototype, 'newEndpoint');
                // @ts-ignore
                getEndorsersStub.returns([
                    { name: 'myPeer', endpoint: {protocol: 'grpcs'} },
                    { name: 'myPeer2', endpoint: {protocol: 'grpcs'} },
                    { name: 'myPeer:7051', endpoint: {protocol: 'grpcs'} },
                    { name: 'peer0.org2.example.com:9051', endpoint: {protocol: 'grpcs'} }] as Endorser[]);

                const discoverChannelStub: sinon.SinonStub = mysandbox.stub(channel, 'discoverChannel').resolves(
                    {
                        msps: {
                            osmsp: {
                                tlsRootCerts: 'tlsRootCert',
                                tlsIntermediateCerts: 'tlsIntermediateCert'
                            },
                            org1msp: {

                            }
                        },
                        orderers: {
                            osmsp: {
                                endpoints: [
                                    {
                                        host: 'host',
                                        name: 'host:1000',
                                        port: 1000
                                    }
                                ]
                            }

                        },
                        peers_by_org: {

                        },
                        timestamp: 123456789
                    }
                )
                // @ts-ignore
                await channel.submitTransaction(['myPeer'], undefined, {
                    packageId: 'myPackageId',
                    sequence: 1,
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1',
                }, 'approve');

                discoverChannelStub.should.have.been.calledWith(['myPeer'])
                newEndpointSpy.should.have.been.calledWithExactly({
                    url: 'grpcs://host:1000',
                    pem: 'tlsRootCert\ntlsIntermediateCert'
                })
            });

            it('should handle no orderer set (grpcs without tlsIntermediate cert)', async () => {
                const newEndpointSpy: sinon.SinonSpy = mysandbox.spy(Client.prototype, 'newEndpoint');
                // @ts-ignore
                getEndorsersStub.returns([
                    { name: 'myPeer', endpoint: {protocol: 'grpcs'} },
                    { name: 'myPeer2', endpoint: {protocol: 'grpcs'} },
                    { name: 'myPeer:7051', endpoint: {protocol: 'grpcs'} },
                    { name: 'peer0.org2.example.com:9051', endpoint: {protocol: 'grpcs'} }] as Endorser[]);

                const discoverChannelStub: sinon.SinonStub = mysandbox.stub(channel, 'discoverChannel').resolves(
                    {
                        msps: {
                            osmsp: {
                                tlsRootCerts: 'tlsRootCert',
                                tlsIntermediateCerts: ''
                            },
                            org1msp: {

                            }
                        },
                        orderers: {
                            osmsp: {
                                endpoints: [
                                    {
                                        host: 'host',
                                        name: 'host:1000',
                                        port: 1000
                                    }
                                ]
                            }

                        },
                        peers_by_org: {

                        },
                        timestamp: 123456789
                    }
                );
                // @ts-ignore
                await channel.submitTransaction(['myPeer'], undefined, {
                    packageId: 'myPackageId',
                    sequence: 1,
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1',
                }, 'approve');

                discoverChannelStub.should.have.been.calledWith(['myPeer'])
                newEndpointSpy.should.have.been.calledWithExactly({
                    url: 'grpcs://host:1000',
                    pem: 'tlsRootCert'
                })
            });

            it('should handle no orderers being discovered', async () => {
                const newEndpointSpy: sinon.SinonSpy = mysandbox.spy(Client.prototype, 'newEndpoint');
                // @ts-ignore
                getEndorsersStub.returns([
                    { name: 'myPeer', endpoint: {protocol: 'grpcs'} },
                    { name: 'myPeer2', endpoint: {protocol: 'grpcs'} },
                    { name: 'myPeer:7051', endpoint: {protocol: 'grpcs'} },
                    { name: 'peer0.org2.example.com:9051', endpoint: {protocol: 'grpcs'} }] as Endorser[]);

                    const discoverChannelStub: sinon.SinonStub = mysandbox.stub(channel, 'discoverChannel').resolves(
                        {
                            msps: {
                                osmsp: {
                                    tlsRootCerts: 'tlsRootCert',
                                    tlsIntermediateCerts: ''
                                },
                                org1msp: {

                                }
                            },
                            orderers: {


                            },
                            peers_by_org: {

                            },
                            timestamp: 123456789
                        }
                    );
                // @ts-ignore
                await channel.submitTransaction(['myPeer'], undefined, {
                    packageId: 'myPackageId',
                    sequence: 1,
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1',
                }, 'approve').should.be.rejectedWith(/Unable to discover any orderers./);

                discoverChannelStub.should.have.been.calledWith(['myPeer'])
                newEndpointSpy.should.not.have.been.calledWithExactly({
                    url: 'grpcs://host:1000',
                    pem: 'tlsRootCert'
                })
            });

            it('should handle no options set', async () => {
                // @ts-ignore
                await channel.submitTransaction(['myPeer'], 'myOrderer', undefined).should.eventually.be.rejectedWith('parameter options is missing');
            });

            it('should handle no sequence set', async () => {
                // @ts-ignore
                await channel.submitTransaction(['myPeer'], 'myOrderer', {
                    packageId: 'myPackageId',
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1',
                }).should.eventually.be.rejectedWith('missing option sequence');
            });

            it('should handle no smartContractName set', async () => {
                // @ts-ignore
                await channel.submitTransaction(['myPeer'], 'myOrderer', {
                    packageId: 'myPackageId',
                    sequence: 1,
                    smartContractVersion: '0.0.1',
                }).should.eventually.be.rejectedWith('missing option smartContractName');
            });

            it('should handle no smartContractVersion set', async () => {
                // @ts-ignore
                await channel.submitTransaction(['myPeer'], 'myOrderer', {
                    packageId: 'myPackageId',
                    sequence: 1,
                    smartContractName: 'myContract',
                }).should.eventually.be.rejectedWith('missing option smartContractVersion');
            });

            it('should handle error from submit', async () => {
                transactionSubmitStub.rejects({ message: 'some error' });

                const arg: Uint8Array = protos.lifecycle.ApproveChaincodeDefinitionForMyOrgArgs.encode(protoArgs).finish();

                await channel.submitTransaction(['myPeer'], 'myOrderer', {
                    packageId: 'myPackageId',
                    sequence: 1,
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1'
                }, 'approve').should.eventually.be.rejectedWith('Could not approve smart contract definition, received error: some error');

                addEndorserStub.should.have.been.calledWith(sinon.match.instanceOf(Endorser));
                addCommitterStub.should.have.been.calledWith(sinon.match.instanceOf(Committer));

                transactionSetEndorsingPeersSpy.should.have.been.calledWith([{ name: 'myPeer' }]);
                transactionSubmitStub.should.have.been.calledWith(Buffer.from(arg));
            });

            it('should handle error from not finding peer', async () => {
                await channel.approveSmartContractDefinition(['myPeer', 'peer.does.not.exist:5060'], 'myOrderer', {
                    sequence: 1,
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1'
                }).should.eventually.be.rejectedWith('Could not approve smart contract definition, received error: Could not find peer peer.does.not.exist:5060 in discovered peers');
            });

        });
        describe('approveSmartContractDefinition', () => {

            let mysandbox: sinon.SinonSandbox;

            let gatewayConnectSpy: sinon.SinonSpy;

            let transactionSetEndorsingPeersSpy: sinon.SinonSpy;
            let transactionSubmitStub: sinon.SinonStub;

            let addEndorserStub: sinon.SinonStub;
            let addCommitterStub: sinon.SinonStub;

            let protoArgs: protos.lifecycle.IApproveChaincodeDefinitionForMyOrgArgs = {};

            beforeEach(() => {
                mysandbox = sinon.createSandbox();

                mysandbox.stub(Endorser.prototype, 'connect').resolves();
                mysandbox.stub(Discoverer.prototype, 'connect').resolves();
                mysandbox.stub(Committer.prototype, 'connect').resolves();

                protoArgs.name = 'myContract';
                protoArgs.version = '0.0.1';
                protoArgs.sequence = 1;

                const local: protos.lifecycle.ChaincodeSource.Local = new protos.lifecycle.ChaincodeSource.Local();
                local.package_id = 'myPackageId';

                const source: protos.lifecycle.ChaincodeSource = new protos.lifecycle.ChaincodeSource();
                source.local_package = local;
                protoArgs.source = source;

                addEndorserStub = mysandbox.stub(Channel.prototype, 'addEndorser');
                addCommitterStub = mysandbox.stub(Channel.prototype, 'addCommitter');

                // @ts-ignore
                mysandbox.stub(Channel.prototype, 'getEndorsers').returns([{ name: 'myPeer' }, { name: 'myPeer2' }, { name: 'myPeer:7051' }, { name: 'peer0.org2.example.com:9051' }]);

                gatewayConnectSpy = mysandbox.spy(Gateway.prototype, 'connect');

                mysandbox.stub(DiscoveryService.prototype, 'build');
                mysandbox.stub(DiscoveryService.prototype, 'sign');
                mysandbox.stub(DiscoveryService.prototype, 'send').resolves();

                transactionSetEndorsingPeersSpy = mysandbox.spy(Transaction.prototype, 'setEndorsingPeers');
                transactionSubmitStub = mysandbox.stub(Transaction.prototype, 'submit');
            });

            afterEach(() => {
                mysandbox.restore();
                protoArgs = {};
            });

            it('should approve a smart contract definition', async () => {
                const arg: Uint8Array = protos.lifecycle.ApproveChaincodeDefinitionForMyOrgArgs.encode(protoArgs).finish();
                await channel.approveSmartContractDefinition(['myPeer'], 'myOrderer', {
                    packageId: 'myPackageId',
                    sequence: 1,
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1'
                });

                addEndorserStub.should.have.been.calledWith(sinon.match.instanceOf(Endorser));
                addCommitterStub.should.have.been.calledWith(sinon.match.instanceOf(Committer));

                transactionSetEndorsingPeersSpy.should.have.been.calledWith([{ name: 'myPeer' }]);
                transactionSubmitStub.should.have.been.calledWith(Buffer.from(arg));
            });

            it('should approve a smart contract definition with timeout set', async () => {
                const arg: Uint8Array = protos.lifecycle.ApproveChaincodeDefinitionForMyOrgArgs.encode(protoArgs).finish();

                await channel.approveSmartContractDefinition(['myPeer2'], 'myOrderer', {
                    packageId: 'myPackageId',
                    sequence: 1,
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1'
                }, 1234);

                addEndorserStub.should.have.been.calledWith(sinon.match.instanceOf(Endorser));
                addCommitterStub.should.have.been.calledWith(sinon.match.instanceOf(Committer));

                const call: sinon.SinonSpyCall = gatewayConnectSpy.getCall(0);
                call.args[1].eventHandlerOptions.should.deep.equal({
                    commitTimeout: 1234,
                    endorseTimeout: 1234
                });

                transactionSetEndorsingPeersSpy.should.have.been.calledWith([{ name: 'myPeer2' }]);
                transactionSubmitStub.should.have.been.calledWith(Buffer.from(arg));
            });

            it('should approve a smart contract definition and set initRequired if set', async () => {

                protoArgs.init_required = true;

                const arg: Uint8Array = protos.lifecycle.ApproveChaincodeDefinitionForMyOrgArgs.encode(protoArgs).finish();

                await channel.approveSmartContractDefinition(['myPeer'], 'myOrderer', {
                    packageId: 'myPackageId',
                    sequence: 1,
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1',
                    initRequired: true
                });

                addEndorserStub.should.have.been.calledWith(sinon.match.instanceOf(Endorser));
                addCommitterStub.should.have.been.calledWith(sinon.match.instanceOf(Committer));

                transactionSetEndorsingPeersSpy.should.have.been.calledWith([{ name: 'myPeer' }]);
                transactionSubmitStub.should.have.been.calledWith(Buffer.from(arg));
            });

            it('should approve a smart contract definition handle no packageId', async () => {

                const unavailable: protos.lifecycle.ChaincodeSource.Unavailable = new protos.lifecycle.ChaincodeSource.Unavailable();

                const source: protos.lifecycle.ChaincodeSource = new protos.lifecycle.ChaincodeSource();
                source.unavailable = unavailable;

                protoArgs.source = source;

                const arg: Uint8Array = protos.lifecycle.ApproveChaincodeDefinitionForMyOrgArgs.encode(protoArgs).finish();

                await channel.approveSmartContractDefinition(['myPeer'], 'myOrderer', {
                    sequence: 1,
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1',
                });

                addEndorserStub.should.have.been.calledWith(sinon.match.instanceOf(Endorser));
                addCommitterStub.should.have.been.calledWith(sinon.match.instanceOf(Committer));

                transactionSetEndorsingPeersSpy.should.have.been.calledWith([{ name: 'myPeer' }]);
                transactionSubmitStub.should.have.been.calledWith(Buffer.from(arg));
            });

            it('should approve a smart contract definition with endorsement plugin', async () => {
                protoArgs.endorsement_plugin = 'myPlugin';

                const arg: Uint8Array = protos.lifecycle.ApproveChaincodeDefinitionForMyOrgArgs.encode(protoArgs).finish();

                await channel.approveSmartContractDefinition(['myPeer'], 'myOrderer', {
                    packageId: 'myPackageId',
                    sequence: 1,
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1',
                    endorsementPlugin: 'myPlugin'
                });

                addEndorserStub.should.have.been.calledWith(sinon.match.instanceOf(Endorser));
                addCommitterStub.should.have.been.calledWith(sinon.match.instanceOf(Committer));

                transactionSetEndorsingPeersSpy.should.have.been.calledWith([{ name: 'myPeer' }]);
                transactionSubmitStub.should.have.been.calledWith(Buffer.from(arg));
            });

            it('should approve a smart contract definition with validation plugin', async () => {
                protoArgs.validation_plugin = 'myPlugin';

                const arg: Uint8Array = protos.lifecycle.ApproveChaincodeDefinitionForMyOrgArgs.encode(protoArgs).finish();

                await channel.approveSmartContractDefinition(['myPeer'], 'myOrderer', {
                    packageId: 'myPackageId',
                    sequence: 1,
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1',
                    validationPlugin: 'myPlugin'
                });

                addEndorserStub.should.have.been.calledWith(sinon.match.instanceOf(Endorser));
                addCommitterStub.should.have.been.calledWith(sinon.match.instanceOf(Committer));

                transactionSetEndorsingPeersSpy.should.have.been.calledWith([{ name: 'myPeer' }]);
                transactionSubmitStub.should.have.been.calledWith(Buffer.from(arg));
            });

            it('should approve a smart contract definition with endorsement policy', async () => {
                const policyString: string = `AND('org1.member', 'org2.member')`;

                const policy: EndorsementPolicy = new EndorsementPolicy();

                const policyResult: protos.common.SignaturePolicyEnvelope = policy.buildPolicy(policyString);

                const applicationPolicy: protos.common.IApplicationPolicy = {};
                applicationPolicy.signature_policy = policyResult;
                const policyBuffer: Buffer = Buffer.from(protos.common.ApplicationPolicy.encode(applicationPolicy).finish());

                protoArgs.validation_parameter = policyBuffer;

                const arg: Uint8Array = protos.lifecycle.ApproveChaincodeDefinitionForMyOrgArgs.encode(protoArgs).finish();

                await channel.approveSmartContractDefinition(['myPeer'], 'myOrderer', {
                    packageId: 'myPackageId',
                    sequence: 1,
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1',
                    endorsementPolicy: policyString
                });

                addEndorserStub.should.have.been.calledWith(sinon.match.instanceOf(Endorser));
                addCommitterStub.should.have.been.calledWith(sinon.match.instanceOf(Committer));

                transactionSetEndorsingPeersSpy.should.have.been.calledWith([{ name: 'myPeer' }]);
                transactionSubmitStub.should.have.been.calledWith(Buffer.from(arg));
            });

            it('should approve a smart contract definition with collection config', async () => {
                const collectionConfig: Collection[] = [
                    {
                        name: 'CollectionOne',
                        policy: `OR('Org1MSP.member')`,
                        requiredPeerCount: 1,
                        maxPeerCount: 1,
                        blockToLive: 0,
                        memberOnlyRead: true
                    }
                ];

                protoArgs.collections = CollectionConfig.buildCollectionConfigPackage(collectionConfig);

                const arg: Uint8Array = protos.lifecycle.ApproveChaincodeDefinitionForMyOrgArgs.encode(protoArgs).finish();

                await channel.approveSmartContractDefinition(['myPeer'], 'myOrderer', {
                    packageId: 'myPackageId',
                    sequence: 1,
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1',
                    collectionConfig: collectionConfig
                });

                addEndorserStub.should.have.been.calledWith(sinon.match.instanceOf(Endorser));
                addCommitterStub.should.have.been.calledWith(sinon.match.instanceOf(Committer));

                transactionSetEndorsingPeersSpy.should.have.been.calledWith([{ name: 'myPeer' }]);
                transactionSubmitStub.should.have.been.calledWith(Buffer.from(arg));
            });

        });

        describe('commitSmartContractDefinition', () => {

            let mysandbox: sinon.SinonSandbox;

            let gatewayConnectSpy: sinon.SinonSpy;

            let transactionSetEndorsingPeersSpy: sinon.SinonSpy;
            let transactionSubmitStub: sinon.SinonStub;

            let addEndorserStub: sinon.SinonStub;
            let addCommitterStub: sinon.SinonStub;

            let protoArgs: protos.lifecycle.ICommitChaincodeDefinitionArgs = {};

            beforeEach(() => {
                mysandbox = sinon.createSandbox();

                mysandbox.stub(Endorser.prototype, 'connect').resolves();
                mysandbox.stub(Discoverer.prototype, 'connect').resolves();
                mysandbox.stub(Committer.prototype, 'connect').resolves();


                protoArgs.name = 'myContract';
                protoArgs.version = '0.0.1';
                protoArgs.sequence = 1;

                addEndorserStub = mysandbox.stub(Channel.prototype, 'addEndorser');
                addCommitterStub = mysandbox.stub(Channel.prototype, 'addCommitter');

                // @ts-ignore
                mysandbox.stub(Channel.prototype, 'getEndorsers').returns([{ name: 'myPeer' }, { name: 'myPeer:7051' }, { name: 'peer0.org2.example.com:9051' }]);

                gatewayConnectSpy = mysandbox.spy(Gateway.prototype, 'connect');

                mysandbox.stub(DiscoveryService.prototype, 'build');
                mysandbox.stub(DiscoveryService.prototype, 'sign');
                mysandbox.stub(DiscoveryService.prototype, 'send').resolves();

                transactionSetEndorsingPeersSpy = mysandbox.spy(Transaction.prototype, 'setEndorsingPeers');
                transactionSubmitStub = mysandbox.stub(Transaction.prototype, 'submit');
            });

            afterEach(() => {
                mysandbox.restore();
                protoArgs = {};
            });

            it('should commit a smart contract definition', async () => {
                const arg: Uint8Array = protos.lifecycle.CommitChaincodeDefinitionArgs.encode(protoArgs).finish();
                await channel.commitSmartContractDefinition(['myPeer', 'peer0.org2.example.com:9051'], 'myOrderer', {
                    sequence: 1,
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1'
                });

                addEndorserStub.should.have.been.calledOnce;
                addCommitterStub.should.have.been.calledWith(sinon.match.instanceOf(Committer));

                transactionSetEndorsingPeersSpy.should.have.been.calledWith([{ name: 'myPeer' }, { name: 'peer0.org2.example.com:9051' }]);
                transactionSubmitStub.should.have.been.calledWith(Buffer.from(arg));
            });

            it('should commit a smart contract definition with timeout set', async () => {
                const arg: Uint8Array = protos.lifecycle.CommitChaincodeDefinitionArgs.encode(protoArgs).finish();
                await channel.commitSmartContractDefinition(['myPeer', 'peer0.org2.example.com:9051'], 'myOrderer', {
                    sequence: 1,
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1'
                }, 1234);

                addEndorserStub.should.have.been.calledOnce;
                addCommitterStub.should.have.been.calledWith(sinon.match.instanceOf(Committer));

                const call: sinon.SinonSpyCall = gatewayConnectSpy.getCall(0);
                call.args[1].eventHandlerOptions.should.deep.equal({
                    commitTimeout: 1234,
                    endorseTimeout: 1234
                });

                transactionSetEndorsingPeersSpy.should.have.been.calledWith([{ name: 'myPeer' }, { name: 'peer0.org2.example.com:9051' }]);
                transactionSubmitStub.should.have.been.calledWith(Buffer.from(arg));
            });

            it('should commit a smart contract definition and set initRequired if set', async () => {

                protoArgs.init_required = true;
                const arg: Uint8Array = protos.lifecycle.CommitChaincodeDefinitionArgs.encode(protoArgs).finish();
                await channel.commitSmartContractDefinition(['myPeer', 'peer0.org2.example.com:9051'], 'myOrderer', {
                    sequence: 1,
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1',
                    initRequired: true
                });

                addEndorserStub.should.have.been.calledOnce;
                addCommitterStub.should.have.been.calledWith(sinon.match.instanceOf(Committer));

                transactionSetEndorsingPeersSpy.should.have.been.calledWith([{ name: 'myPeer' }, { name: 'peer0.org2.example.com:9051' }]);
                transactionSubmitStub.should.have.been.calledWith(Buffer.from(arg));
            });

            it('should commit a smart contract definition with endorsement plugin', async () => {
                protoArgs.endorsement_plugin = 'myPlugin';
                const arg: Uint8Array = protos.lifecycle.CommitChaincodeDefinitionArgs.encode(protoArgs).finish();
                await channel.commitSmartContractDefinition(['myPeer', 'peer0.org2.example.com:9051'], 'myOrderer', {
                    sequence: 1,
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1',
                    endorsementPlugin: 'myPlugin'
                });

                addEndorserStub.should.have.been.calledOnce;
                addCommitterStub.should.have.been.calledWith(sinon.match.instanceOf(Committer));

                transactionSetEndorsingPeersSpy.should.have.been.calledWith([{ name: 'myPeer' }, { name: 'peer0.org2.example.com:9051' }]);
                transactionSubmitStub.should.have.been.calledWith(Buffer.from(arg));
            });

            it('should commit a smart contract definition with validation plugin', async () => {
                protoArgs.validation_plugin = 'myPlugin';
                const arg: Uint8Array = protos.lifecycle.CommitChaincodeDefinitionArgs.encode(protoArgs).finish();
                await channel.commitSmartContractDefinition(['myPeer', 'peer0.org2.example.com:9051'], 'myOrderer', {
                    sequence: 1,
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1',
                    validationPlugin: 'myPlugin'
                });

                addEndorserStub.should.have.been.calledOnce;
                addCommitterStub.should.have.been.calledWith(sinon.match.instanceOf(Committer));

                transactionSetEndorsingPeersSpy.should.have.been.calledWith([{ name: 'myPeer' }, { name: 'peer0.org2.example.com:9051' }]);
                transactionSubmitStub.should.have.been.calledWith(Buffer.from(arg));
            });

            it('should commit a smart contract definition with endorsement policy', async () => {
                const policyString: string = `AND('org1.member', 'org2.member')`;

                const policy: EndorsementPolicy = new EndorsementPolicy();

                const policyResult: protos.common.SignaturePolicyEnvelope = policy.buildPolicy(policyString);

                const applicationPolicy: protos.common.IApplicationPolicy = {};
                applicationPolicy.signature_policy = policyResult;

                const policyBuffer: Buffer = Buffer.from(protos.common.ApplicationPolicy.encode(applicationPolicy).finish());

                protoArgs.validation_parameter = policyBuffer;
                const arg: Uint8Array = protos.lifecycle.CommitChaincodeDefinitionArgs.encode(protoArgs).finish();
                await channel.commitSmartContractDefinition(['myPeer', 'peer0.org2.example.com:9051'], 'myOrderer', {
                    sequence: 1,
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1',
                    endorsementPolicy: policyString
                });

                addEndorserStub.should.have.been.calledOnce;
                addCommitterStub.should.have.been.calledWith(sinon.match.instanceOf(Committer));

                transactionSetEndorsingPeersSpy.should.have.been.calledWith([{ name: 'myPeer' }, { name: 'peer0.org2.example.com:9051' }]);
                transactionSubmitStub.should.have.been.calledWith(Buffer.from(arg));
            });

            it('should commit a smart contract definition with endorsement policy channel reference', async () => {
                const policyString: string = `myPolicyReference`;

                const applicationPolicy: protos.common.IApplicationPolicy = {};
                applicationPolicy.channel_config_policy_reference = policyString;

                const policyBuffer: Buffer = Buffer.from(protos.common.ApplicationPolicy.encode(applicationPolicy).finish());

                protoArgs.validation_parameter = policyBuffer;
                const arg: Uint8Array = protos.lifecycle.CommitChaincodeDefinitionArgs.encode(protoArgs).finish();
                await channel.commitSmartContractDefinition(['myPeer', 'peer0.org2.example.com:9051'], 'myOrderer', {
                    sequence: 1,
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1',
                    endorsementPolicy: policyString
                });

                addEndorserStub.should.have.been.calledOnce;
                addCommitterStub.should.have.been.calledWith(sinon.match.instanceOf(Committer));

                transactionSetEndorsingPeersSpy.should.have.been.calledWith([{ name: 'myPeer' }, { name: 'peer0.org2.example.com:9051' }]);
                transactionSubmitStub.should.have.been.calledWith(Buffer.from(arg));
            });

            it('should commit a smart contract definition with collection config', async () => {
                const collectionConfig: Collection[] = [
                    {
                        name: 'CollectionOne',
                        policy: `OR('Org1MSP.member')`,
                        requiredPeerCount: 1,
                        maxPeerCount: 1,
                        blockToLive: 0,
                        memberOnlyRead: true
                    }
                ];

                protoArgs.collections = CollectionConfig.buildCollectionConfigPackage(collectionConfig);
                const arg: Uint8Array = protos.lifecycle.CommitChaincodeDefinitionArgs.encode(protoArgs).finish();
                await channel.commitSmartContractDefinition(['myPeer', 'peer0.org2.example.com:9051'], 'myOrderer', {
                    sequence: 1,
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1',
                    collectionConfig: collectionConfig
                });

                addEndorserStub.should.have.been.calledOnce;
                addCommitterStub.should.have.been.calledWith(sinon.match.instanceOf(Committer));

                transactionSetEndorsingPeersSpy.should.have.been.calledWith([{ name: 'myPeer' }, { name: 'peer0.org2.example.com:9051' }]);
                transactionSubmitStub.should.have.been.calledWith(Buffer.from(arg));
            });

        });

        describe('instantiateOrUpgradeSmartContractDefinition', () => {

            let mysandbox: sinon.SinonSandbox;

            let gatewayConnectSpy: sinon.SinonSpy;

            let transactionSetEndorsingPeersSpy: sinon.SinonSpy;
            let transactionSubmitStub: sinon.SinonStub;

            let addEndorserStub: sinon.SinonStub;
            let addCommitterStub: sinon.SinonStub;

            let peerNames: string[];
            let ordererName: string;
            let options: SmartContractDefinitionOptions;
            let fcn: string;
            let args: string[];
            let isUpgrade: boolean;
            let name: string;
            let version: string;
            let sequence: number;
            let packageId: string;
            let chaincodeDeploymentSpec: protos.protos.ChaincodeDeploymentSpec;

            beforeEach(() => {
                mysandbox = sinon.createSandbox();

                mysandbox.stub(Endorser.prototype, 'connect').resolves();
                mysandbox.stub(Discoverer.prototype, 'connect').resolves();
                mysandbox.stub(Committer.prototype, 'connect').resolves();

                peerNames = ['myPeer'];
                ordererName = 'myOrderer';
                fcn = '';
                args = [];
                isUpgrade = false;
                name = 'myContract';
                version = '0.0.1';
                sequence = -11;
                packageId = 'myPackageId';

                options = {
                    sequence: sequence,
                    smartContractName: name,
                    smartContractVersion: version,
                    packageId: packageId,
                }

                addEndorserStub = mysandbox.stub(Channel.prototype, 'addEndorser');
                addCommitterStub = mysandbox.stub(Channel.prototype, 'addCommitter');

                // @ts-ignore
                mysandbox.stub(Channel.prototype, 'getEndorsers').returns([{ name: 'myPeer' }, { name: 'myPeer2' }, { name: 'myPeer:7051' }, { name: 'peer0.org2.example.com:9051' }]);

                gatewayConnectSpy = mysandbox.spy(Gateway.prototype, 'connect');

                mysandbox.stub(DiscoveryService.prototype, 'build');
                mysandbox.stub(DiscoveryService.prototype, 'sign');
                mysandbox.stub(DiscoveryService.prototype, 'send').resolves();

                transactionSetEndorsingPeersSpy = mysandbox.spy(Transaction.prototype, 'setEndorsingPeers');
                transactionSubmitStub = mysandbox.stub(Transaction.prototype, 'submit');

                const specArgs: Buffer[] = [];
                for (const arg of args) {
                    specArgs.push(Buffer.from(arg, 'utf8'));
                }

                const ccSpec: any = {
                    type: protos.protos.ChaincodeSpec.Type.GOLANG,
                    chaincode_id: {
                        name: options.smartContractName,
                        version: options.smartContractVersion
                    },
                    input: {
                        args: specArgs
                    }
                };
                chaincodeDeploymentSpec = new protos.protos.ChaincodeDeploymentSpec();
                chaincodeDeploymentSpec.chaincode_spec = ccSpec;
            });

            afterEach(() => {
                mysandbox.restore();
                options = {} as SmartContractDefinitionOptions;
            });

            it('should instantiate a smart contract definition', async () => {
                const functionName: string = isUpgrade ? 'upgrade' : 'deploy';
                const expectedArgs: string[] = [
                    functionName,
                    channel['channelName'],
                    protos.protos.ChaincodeDeploymentSpec.encode(chaincodeDeploymentSpec).finish().toString(),
                    '',
                    'escc',
                    'vscc'
                ];

                await channel.instantiateOrUpgradeSmartContractDefinition(peerNames, ordererName, options, fcn, args, isUpgrade, 1234);

                addEndorserStub.should.have.been.calledWith(sinon.match.instanceOf(Endorser));
                addCommitterStub.should.have.been.calledWith(sinon.match.instanceOf(Committer));

                transactionSetEndorsingPeersSpy.should.have.been.calledWith([{ name: 'myPeer' }]);
                transactionSubmitStub.should.have.been.calledWith(expectedArgs[1], expectedArgs[2], expectedArgs[3], expectedArgs[4], expectedArgs[5]);
            });

            it('should instantiate a smart contract definition with undefined fcn and args', async () => {
                fcn = undefined;
                args = undefined;
                const derivedFcn: string = 'init';
                const derivedArgs: string[] = [];
                const newSpecArgs: Buffer[] = [];
                newSpecArgs.push(Buffer.from(derivedFcn, 'utf8'));
                for (const arg of derivedArgs) {
                    newSpecArgs.push(Buffer.from(arg, 'utf8'));
                }

                const ccSpec: any = {
                    type: protos.protos.ChaincodeSpec.Type.GOLANG,
                    chaincode_id: {
                        name: options.smartContractName,
                        version: options.smartContractVersion
                    },
                    input: {
                        args: newSpecArgs
                    }
                };
                chaincodeDeploymentSpec = new protos.protos.ChaincodeDeploymentSpec();
                chaincodeDeploymentSpec.chaincode_spec = ccSpec;

                const functionName: string = isUpgrade ? 'upgrade' : 'deploy';
                const expectedArgs: string[] = [
                    functionName,
                    channel['channelName'],
                    protos.protos.ChaincodeDeploymentSpec.encode(chaincodeDeploymentSpec).finish().toString(),
                    '',
                    'escc',
                    'vscc'
                ];

                await channel.instantiateOrUpgradeSmartContractDefinition(peerNames, ordererName, options, fcn, args, isUpgrade, 1234);

                addEndorserStub.should.have.been.calledWith(sinon.match.instanceOf(Endorser));
                addCommitterStub.should.have.been.calledWith(sinon.match.instanceOf(Committer));

                transactionSetEndorsingPeersSpy.should.have.been.calledWith([{ name: 'myPeer' }]);
                transactionSubmitStub.should.have.been.calledWith(expectedArgs[1], expectedArgs[2], expectedArgs[3], expectedArgs[4], expectedArgs[5]);
            });

            it('should instantiate a smart contract definition with instantiate function and arguments', async () => {
                fcn = 'someFcn';
                args = ['some', 'args'];
                const newSpecArgs: Buffer[] = [];
                newSpecArgs.push(Buffer.from(fcn, 'utf8'));
                for (const arg of args) {
                    newSpecArgs.push(Buffer.from(arg, 'utf8'));
                }

                const ccSpec: any = {
                    type: protos.protos.ChaincodeSpec.Type.GOLANG,
                    chaincode_id: {
                        name: options.smartContractName,
                        version: options.smartContractVersion
                    },
                    input: {
                        args: newSpecArgs
                    }
                };
                chaincodeDeploymentSpec = new protos.protos.ChaincodeDeploymentSpec();
                chaincodeDeploymentSpec.chaincode_spec = ccSpec;

                const functionName: string = isUpgrade ? 'upgrade' : 'deploy';
                const expectedArgs: string[] = [
                    functionName,
                    channel['channelName'],
                    protos.protos.ChaincodeDeploymentSpec.encode(chaincodeDeploymentSpec).finish().toString(),
                    '',
                    'escc',
                    'vscc'
                ];

                await channel.instantiateOrUpgradeSmartContractDefinition(peerNames, ordererName, options, fcn, args, isUpgrade);

                addEndorserStub.should.have.been.calledWith(sinon.match.instanceOf(Endorser));
                addCommitterStub.should.have.been.calledWith(sinon.match.instanceOf(Committer));

                transactionSetEndorsingPeersSpy.should.have.been.calledWith([{ name: 'myPeer' }]);
                transactionSubmitStub.should.have.been.calledWith(expectedArgs[1], expectedArgs[2], expectedArgs[3], expectedArgs[4], expectedArgs[5]);
            });

            it('should upgrade a smart contract definition', async () => {
                isUpgrade = true;
                const functionName: string = isUpgrade ? 'upgrade' : 'deploy';
                const expectedArgs: string[] = [
                    functionName,
                    channel['channelName'],
                    protos.protos.ChaincodeDeploymentSpec.encode(chaincodeDeploymentSpec).finish().toString(),
                    '',
                    'escc',
                    'vscc'
                ];

                await channel.instantiateOrUpgradeSmartContractDefinition(peerNames, ordererName, options, fcn, args, isUpgrade);

                addEndorserStub.should.have.been.calledWith(sinon.match.instanceOf(Endorser));
                addCommitterStub.should.have.been.calledWith(sinon.match.instanceOf(Committer));

                transactionSetEndorsingPeersSpy.should.have.been.calledWith([{ name: 'myPeer' }]);
                transactionSubmitStub.should.have.been.calledWith(expectedArgs[1], expectedArgs[2], expectedArgs[3], expectedArgs[4], expectedArgs[5]);
            });

            it('should instantiate a smart contract definition with all options and timeout', async () => {
                const functionName: string = isUpgrade ? 'upgrade' : 'deploy';
                options.endorsementPolicy = 'OR(\'Org1.member\')';
                options.endorsementPlugin = 'escc';
                options.validationPlugin = 'vscc'
                options.collectionConfig = [
                    {
                        name: 'CollectionOne',
                        policy: `OR('Org1MSP.member')`,
                        requiredPeerCount: 1,
                        maxPeerCount: 1,
                        blockToLive: 0,
                        memberOnlyRead: true
                    }
                ];
                const expectedArgs: string[] = [
                    functionName,
                    channel['channelName'],
                    protos.protos.ChaincodeDeploymentSpec.encode(chaincodeDeploymentSpec).finish().toString(),
                    LifecycleChannel.getEndorsementPolicyBytes(options.endorsementPolicy, true).toString(),
                    options.endorsementPlugin,
                    options.validationPlugin,
                    LifecycleChannel.getCollectionConfig(options.collectionConfig, true).toString()
                ];

                await channel.instantiateOrUpgradeSmartContractDefinition(peerNames, ordererName, options, fcn, args, isUpgrade, 1234);

                addEndorserStub.should.have.been.calledWith(sinon.match.instanceOf(Endorser));
                addCommitterStub.should.have.been.calledWith(sinon.match.instanceOf(Committer));

                transactionSetEndorsingPeersSpy.should.have.been.calledWith([{ name: 'myPeer' }]);
                transactionSubmitStub.should.have.been.calledWith(expectedArgs[1], expectedArgs[2], expectedArgs[3], expectedArgs[4], expectedArgs[5]);
                const call: sinon.SinonSpyCall = gatewayConnectSpy.getCall(0);
                call.args[1].eventHandlerOptions.should.deep.equal({
                    commitTimeout: 1234,
                    endorseTimeout: 1234
                });
            });


        });
        describe('getCommitReadiness', () => {

            let mysandbox: sinon.SinonSandbox;
            let endorserConnectStub: sinon.SinonStub;

            let endorsementBuildSpy: sinon.SinonSpy;
            let endorsementSignSpy: sinon.SinonSpy;
            let endorsementSendStub: sinon.SinonStub;

            let protoArgs: protos.lifecycle.ICheckCommitReadinessArgs = {};
            let buildRequest: any;

            beforeEach(() => {
                mysandbox = sinon.createSandbox();


                protoArgs.name = 'myContract';
                protoArgs.version = '0.0.1';
                protoArgs.sequence = 1;
                const arg: Uint8Array = protos.lifecycle.CheckCommitReadinessArgs.encode(protoArgs).finish();
                buildRequest = {
                    fcn: 'CheckCommitReadiness',
                    args: [Buffer.from(arg)]
                };

                endorserConnectStub = mysandbox.stub(Endorser.prototype, 'connect').resolves();

                endorsementBuildSpy = mysandbox.spy(Endorsement.prototype, 'build');
                endorsementSignSpy = mysandbox.spy(Endorsement.prototype, 'sign');
                endorsementSendStub = mysandbox.stub(Endorsement.prototype, 'send');
                endorsementSendStub.resolves();
            });

            afterEach(() => {
                mysandbox.restore();
                protoArgs = {}
                buildRequest = {}
            });

            it('should get the commit readiness of a smart contract definition', async () => {

                const encodedResult: Buffer = Buffer.from(protos.lifecycle.CheckCommitReadinessResult.encode({
                    approvals: {
                        org1: true, org2: false
                    }
                }).finish());

                endorsementSendStub.resolves({
                    responses: [{
                        response: {
                            status: 200,
                            payload: encodedResult
                        }
                    }]
                });

                const result: Map<string, boolean> = await channel.getCommitReadiness('myPeer', {
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1',
                    sequence: 1
                });

                result.size.should.equal(2);
                // @ts-ignore
                result.get('org1').should.equal(true);
                // @ts-ignore
                result.get('org2').should.equal(false);

                endorserConnectStub.should.have.been.called;
                endorsementBuildSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext), buildRequest);
                endorsementSignSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));
                endorsementSendStub.should.have.been.calledWith({
                    targets: [sinon.match.instanceOf(Endorser)]
                });
            });

            it('should get the commit readiness of a smart contract definition with a timeout', async () => {

                const encodedResult: Buffer = Buffer.from(protos.lifecycle.CheckCommitReadinessResult.encode({
                    approvals: {
                        org1: true, org2: false
                    }
                }).finish());

                endorsementSendStub.resolves({
                    responses: [{
                        response: {
                            status: 200,
                            payload: encodedResult
                        }
                    }]
                });

                const result: Map<string, boolean> = await channel.getCommitReadiness('myPeer', {
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1',
                    sequence: 1
                }, 90);

                result.size.should.equal(2);
                // @ts-ignore
                result.get('org1').should.equal(true);
                // @ts-ignore
                result.get('org2').should.equal(false);

                endorserConnectStub.should.have.been.called;
                endorsementBuildSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext), buildRequest);
                endorsementSignSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));
                endorsementSendStub.should.have.been.calledWith({
                    targets: [sinon.match.instanceOf(Endorser)],
                    requestTimeout: 90000
                });
            });

            it('should get the commit readiness of a smart contract definition with init required', async () => {

                protoArgs.init_required = true;

                const arg: Uint8Array = protos.lifecycle.CheckCommitReadinessArgs.encode(protoArgs).finish();
                buildRequest = {
                    fcn: 'CheckCommitReadiness',
                    args: [Buffer.from(arg)]
                };

                const encodedResult: Buffer = Buffer.from(protos.lifecycle.CheckCommitReadinessResult.encode({
                    approvals: {
                        org1: true, org2: false
                    }
                }).finish());

                endorsementSendStub.resolves({
                    responses: [{
                        response: {
                            status: 200,
                            payload: encodedResult
                        }
                    }]
                });

                const result: Map<string, boolean> = await channel.getCommitReadiness('myPeer', {
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1',
                    sequence: 1,
                    initRequired: true
                });

                result.size.should.equal(2);
                // @ts-ignore
                result.get('org1').should.equal(true);
                // @ts-ignore
                result.get('org2').should.equal(false);

                endorserConnectStub.should.have.been.called;
                endorsementBuildSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext), buildRequest);
                endorsementSignSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));
                endorsementSendStub.should.have.been.calledWith({
                    targets: [sinon.match.instanceOf(Endorser)]
                });
            });

            it('should get the commit readiness of a smart contract definition with endorsement plugin', async () => {

                protoArgs.endorsement_plugin = 'myPlugin';

                const arg: Uint8Array = protos.lifecycle.CheckCommitReadinessArgs.encode(protoArgs).finish();

                buildRequest = {
                    fcn: 'CheckCommitReadiness',
                    args: [Buffer.from(arg)]
                };

                const encodedResult: Buffer = Buffer.from(protos.lifecycle.CheckCommitReadinessResult.encode({
                    approvals: {
                        org1: true, org2: false
                    }
                }).finish());

                endorsementSendStub.resolves({
                    responses: [{
                        response: {
                            status: 200,
                            payload: encodedResult
                        }
                    }]
                });

                const result: Map<string, boolean> = await channel.getCommitReadiness('myPeer', {
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1',
                    sequence: 1,
                    endorsementPlugin: 'myPlugin'
                });

                result.size.should.equal(2);
                // @ts-ignore
                result.get('org1').should.equal(true);
                // @ts-ignore
                result.get('org2').should.equal(false);

                endorserConnectStub.should.have.been.called;
                endorsementBuildSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext), buildRequest);
                endorsementSignSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));
                endorsementSendStub.should.have.been.calledWith({
                    targets: [sinon.match.instanceOf(Endorser)]
                });
            });

            it('should get the commit readiness of a smart contract definition with validation plugin', async () => {

                protoArgs.validation_plugin = 'myPlugin';

                const arg: Uint8Array = protos.lifecycle.CheckCommitReadinessArgs.encode(protoArgs).finish();

                buildRequest = {
                    fcn: 'CheckCommitReadiness',
                    args: [Buffer.from(arg)]
                };

                const encodedResult: Buffer = Buffer.from(protos.lifecycle.CheckCommitReadinessResult.encode({
                    approvals: {
                        org1: true, org2: false
                    }
                }).finish());

                endorsementSendStub.resolves({
                    responses: [{
                        response: {
                            status: 200,
                            payload: encodedResult
                        }
                    }]
                });

                const result: Map<string, boolean> = await channel.getCommitReadiness('myPeer', {
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1',
                    sequence: 1,
                    validationPlugin: 'myPlugin'
                });

                result.size.should.equal(2);
                // @ts-ignore
                result.get('org1').should.equal(true);
                // @ts-ignore
                result.get('org2').should.equal(false);

                endorserConnectStub.should.have.been.called;
                endorsementBuildSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext), buildRequest);
                endorsementSignSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));
                endorsementSendStub.should.have.been.calledWith({
                    targets: [sinon.match.instanceOf(Endorser)]
                });
            });

            it('should get the commit readiness of a smart contract definition with endorsement policy', async () => {

                const policyString: string = `AND('org1.member', 'org2.member')`;

                const policy: EndorsementPolicy = new EndorsementPolicy();

                const policyResult: protos.common.SignaturePolicyEnvelope = policy.buildPolicy(policyString);


                const applicationPolicy: protos.common.IApplicationPolicy = {};
                applicationPolicy.signature_policy = policyResult;

                const policyBuffer: Buffer = Buffer.from(protos.common.ApplicationPolicy.encode(applicationPolicy).finish());

                protoArgs.validation_parameter = policyBuffer;

                const arg: Uint8Array = protos.lifecycle.CheckCommitReadinessArgs.encode(protoArgs).finish();

                buildRequest = {
                    fcn: 'CheckCommitReadiness',
                    args: [Buffer.from(arg)]
                };

                const encodedResult: Buffer = Buffer.from(protos.lifecycle.CheckCommitReadinessResult.encode({
                    approvals: {
                        org1: true, org2: false
                    }
                }).finish());

                endorsementSendStub.resolves({
                    responses: [{
                        response: {
                            status: 200,
                            payload: encodedResult
                        }
                    }]
                });

                const result: Map<string, boolean> = await channel.getCommitReadiness('myPeer', {
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1',
                    sequence: 1,
                    endorsementPolicy: policyString
                });

                result.size.should.equal(2);
                // @ts-ignore
                result.get('org1').should.equal(true);
                // @ts-ignore
                result.get('org2').should.equal(false);

                endorserConnectStub.should.have.been.called;
                endorsementBuildSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext), buildRequest);
                endorsementSignSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));
                endorsementSendStub.should.have.been.calledWith({
                    targets: [sinon.match.instanceOf(Endorser)]
                });
            });

            it('should get the commit readiness of a smart contract definition with collection config', async () => {

                const collectionConfig: Collection[] = [
                    {
                        name: 'CollectionOne',
                        policy: `OR('Org1MSP.member')`,
                        requiredPeerCount: 1,
                        maxPeerCount: 1,
                        blockToLive: 0,
                        memberOnlyRead: true
                    }
                ];

                protoArgs.collections = CollectionConfig.buildCollectionConfigPackage(collectionConfig);

                const arg: Uint8Array = protos.lifecycle.CheckCommitReadinessArgs.encode(protoArgs).finish();

                buildRequest = {
                    fcn: 'CheckCommitReadiness',
                    args: [Buffer.from(arg)]
                };

                const encodedResult: Buffer = Buffer.from(protos.lifecycle.CheckCommitReadinessResult.encode({
                    approvals: {
                        org1: true, org2: false
                    }
                }).finish());

                endorsementSendStub.resolves({
                    responses: [{
                        response: {
                            status: 200,
                            payload: encodedResult
                        }
                    }]
                });

                const result: Map<string, boolean> = await channel.getCommitReadiness('myPeer', {
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1',
                    sequence: 1,
                    collectionConfig: collectionConfig
                });

                result.size.should.equal(2);
                // @ts-ignore
                result.get('org1').should.equal(true);
                // @ts-ignore
                result.get('org2').should.equal(false);

                endorserConnectStub.should.have.been.called;
                endorsementBuildSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext), buildRequest);
                endorsementSignSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));
                endorsementSendStub.should.have.been.calledWith({
                    targets: [sinon.match.instanceOf(Endorser)]
                });
            });

            it('should handle no peerName set', async () => {
                // @ts-ignore
                await channel.getCommitReadiness(undefined, {
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1',
                    sequence: 1,
                }).should.eventually.be.rejectedWith('parameter peerName is missing');
            });

            it('should handle no options set', async () => {
                // @ts-ignore
                await channel.getCommitReadiness('myPeer', undefined).should.eventually.be.rejectedWith('parameter options is missing');
            });

            it('should handle no smartContractName set', async () => {
                // @ts-ignore
                await channel.getCommitReadiness('myPeer', {
                    smartContractVersion: '0.0.1',
                    sequence: 1,
                }).should.eventually.be.rejectedWith('missing option smartContractName');
            });

            it('should handle no smartContractVersion set', async () => {
                // @ts-ignore
                await channel.getCommitReadiness('myPeer', {
                    smartContractName: 'myContract',
                    sequence: 1,
                }).should.eventually.be.rejectedWith('missing option smartContractVersion');
            });

            it('should handle error with sending request', async () => {

                endorsementSendStub.rejects({ message: 'some error' });

                await channel.getCommitReadiness('myPeer', {
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1',
                    sequence: 1
                }).should.eventually.be.rejectedWith('Could not get commit readiness, received error: some error');

                endorserConnectStub.should.have.been.called;
                endorsementBuildSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext), buildRequest);
                endorsementSignSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));
                endorsementSendStub.should.have.been.calledWith({
                    targets: [sinon.match.instanceOf(Endorser)]
                });
            });
        });

        describe('getAllCommittedSmartContracts', () => {

            let mysandbox: sinon.SinonSandbox;
            let endorserConnectStub: sinon.SinonStub;

            let endorsementBuildSpy: sinon.SinonSpy;
            let endorsementSignSpy: sinon.SinonSpy;
            let endorsementSendStub: sinon.SinonStub;

            let arg: Uint8Array;
            let protoArgs: protos.lifecycle.IQueryChaincodeDefinitionsArgs = {};
            let buildRequest: any;

            beforeEach(() => {
                mysandbox = sinon.createSandbox();

                arg = protos.lifecycle.QueryChaincodeDefinitionsArgs.encode(protoArgs).finish();

                buildRequest = {
                    fcn: 'QueryChaincodeDefinitions',
                    args: [Buffer.from(arg)]
                };

                endorserConnectStub = mysandbox.stub(Endorser.prototype, 'connect').resolves();

                endorsementBuildSpy = mysandbox.spy(Endorsement.prototype, 'build');
                endorsementSignSpy = mysandbox.spy(Endorsement.prototype, 'sign');
                endorsementSendStub = mysandbox.stub(Endorsement.prototype, 'send');
                endorsementSendStub.resolves();
            });

            afterEach(() => {
                mysandbox.restore();
                protoArgs = {};
            });

            it('should get all the committed smart contracts', async () => {

                const encodedResult: Buffer = Buffer.from(protos.lifecycle.QueryChaincodeDefinitionsResult.encode({
                    chaincode_definitions: [{
                        name: 'myContract',
                        sequence: 1,
                        version: '0.0.1',
                        init_required: false,
                        endorsement_plugin: 'escc',
                        validation_plugin: 'vscc',
                        validation_parameter: Buffer.from(JSON.stringify({})),
                        collections: {}
                    }, {
                        name: 'myContract2',
                        sequence: 4,
                        version: '0.0.7',
                        init_required: false,
                        endorsement_plugin: 'escc',
                        validation_plugin: 'vscc',
                        validation_parameter: Buffer.from(JSON.stringify({})),
                        collections: {}
                    }]
                }).finish());

                endorsementSendStub.resolves({
                    responses: [{
                        response: {
                            status: 200,
                            payload: encodedResult
                        }
                    }]
                });

                const result: DefinedSmartContract[] = await channel.getAllCommittedSmartContracts('myPeer');

                result.length.should.equal(2);

                result[0].smartContractName.should.equal('myContract');
                result[0].smartContractVersion.should.equal('0.0.1');
                result[0].sequence.should.equal(1);
                // @ts-ignore
                result[0].initRequired.should.equal(false);

                result[1].smartContractName.should.equal('myContract2');
                result[1].smartContractVersion.should.equal('0.0.7');
                result[1].sequence.should.equal(4);
                // @ts-ignore
                result[1].initRequired.should.equal(false);

                endorserConnectStub.should.have.been.called;
                endorsementBuildSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext), buildRequest);
                endorsementSignSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));
                endorsementSendStub.should.have.been.calledWith({
                    targets: [sinon.match.instanceOf(Endorser)]
                });
            });

            it('should get all the committed smart contracts with timeout', async () => {

                const encodedResult: Buffer = Buffer.from(protos.lifecycle.QueryChaincodeDefinitionsResult.encode({
                    chaincode_definitions: [{
                        name: 'myContract',
                        sequence: 1,
                        version: '0.0.1',
                        init_required: false,
                        endorsement_plugin: 'escc',
                        validation_plugin: 'vscc',
                        validation_parameter: Buffer.from(JSON.stringify({})),
                        collections: {}
                    }, {
                        name: 'myContract2',
                        sequence: 4,
                        version: '0.0.7',
                        init_required: false,
                        endorsement_plugin: 'escc',
                        validation_plugin: 'vscc',
                        validation_parameter: Buffer.from(JSON.stringify({})),
                        collections: {}
                    }]
                }).finish());

                endorsementSendStub.resolves({
                    responses: [{
                        response: {
                            status: 200,
                            payload: encodedResult
                        }
                    }]
                });

                const result: DefinedSmartContract[] = await channel.getAllCommittedSmartContracts('myPeer', 90);

                result.length.should.equal(2);

                result[0].smartContractName.should.equal('myContract');
                result[0].smartContractVersion.should.equal('0.0.1');
                result[0].sequence.should.equal(1);
                // @ts-ignore
                result[0].initRequired.should.equal(false);

                result[1].smartContractName.should.equal('myContract2');
                result[1].smartContractVersion.should.equal('0.0.7');
                result[1].sequence.should.equal(4);
                // @ts-ignore
                result[1].initRequired.should.equal(false);

                endorserConnectStub.should.have.been.called;
                endorsementBuildSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext), buildRequest);
                endorsementSignSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));
                endorsementSendStub.should.have.been.calledWith({
                    targets: [sinon.match.instanceOf(Endorser)],
                    requestTimeout: 90000
                });
            });

            it('should handle no peerName', async () => {
                // @ts-ignore
                await channel.getAllCommittedSmartContracts(undefined).should.eventually.be.rejectedWith('parameter peerName is missing');
            });

            it('should handle error from send', async () => {
                endorsementSendStub.rejects({ message: 'some error' });

                await channel.getAllCommittedSmartContracts('myPeer').should.eventually.be.rejectedWith('Could not get smart contract definitions, received error: some error');
            });
        });

        describe('getAllInstantiatedSmartContracts', () => {

            let mysandbox: sinon.SinonSandbox;
            let endorserConnectStub: sinon.SinonStub;

            let endorsementBuildSpy: sinon.SinonSpy;
            let endorsementSignSpy: sinon.SinonSpy;
            let endorsementSendStub: sinon.SinonStub;

            let buildRequest: any;

            beforeEach(() => {
                mysandbox = sinon.createSandbox();

                buildRequest = {
                    fcn: 'GetChaincodes',
                    args: []
                };

                endorserConnectStub = mysandbox.stub(Endorser.prototype, 'connect').resolves();

                endorsementBuildSpy = mysandbox.spy(Endorsement.prototype, 'build');
                endorsementSignSpy = mysandbox.spy(Endorsement.prototype, 'sign');
                endorsementSendStub = mysandbox.stub(Endorsement.prototype, 'send');
                endorsementSendStub.resolves();
            });

            afterEach(() => {
                mysandbox.restore();
            });

            it('should get all the instantiated smart contracts', async () => {
                const encodedResult: Buffer = Buffer.from(protos.protos.ChaincodeQueryResponse.encode({
                    chaincodes: [{
                        name: 'myContract',
                        version: '0.0.2',
                        escc: 'escc',
                        vscc: 'vscc',
                    }, {
                        name: 'myContract2',
                        version: '0.0.3',
                        escc: 'escc',
                        vscc: 'vscc',
                    }]
                }).finish());

                endorsementSendStub.resolves({
                    responses: [{
                        response: {
                            status: 200,
                            payload: encodedResult
                        }
                    }]
                });

                const result: DefinedSmartContract[] = await channel.getAllInstantiatedSmartContracts('myPeer');

                result.length.should.equal(2);

                result[0].smartContractName.should.equal('myContract');
                result[0].smartContractVersion.should.equal('0.0.2');
                result[0].sequence.should.equal(-1);
                should.equal(undefined, result[0].initRequired);

                result[1].smartContractName.should.equal('myContract2');
                result[1].smartContractVersion.should.equal('0.0.3');
                result[1].sequence.should.equal(-1);
                should.equal(undefined, result[1].initRequired);

                endorserConnectStub.should.have.been.called;
                endorsementBuildSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext), buildRequest);
                endorsementSignSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));
                endorsementSendStub.should.have.been.calledWith({
                    targets: [sinon.match.instanceOf(Endorser)]
                });
            });

            it('should get all the instantiated smart contracts with timeout', async () => {

                const encodedResult: Buffer = Buffer.from(protos.protos.ChaincodeQueryResponse.encode({
                    chaincodes: [{
                        name: 'myContract',
                        version: '0.0.2',
                        escc: 'escc',
                        vscc: 'vscc',
                    }, {
                        name: 'myContract2',
                        version: '0.0.3',
                        escc: 'escc',
                        vscc: 'vscc',
                    }]
                }).finish());

                endorsementSendStub.resolves({
                    responses: [{
                        response: {
                            status: 200,
                            payload: encodedResult
                        }
                    }]
                });

                const result: DefinedSmartContract[] = await channel.getAllInstantiatedSmartContracts('myPeer', 90);

                result.length.should.equal(2);

                result[0].smartContractName.should.equal('myContract');
                result[0].smartContractVersion.should.equal('0.0.2');
                result[0].sequence.should.equal(-1);
                should.equal(undefined, result[0].initRequired);
                // @ts-ignore
                // result[0].initRequired.should.equal(false);

                result[1].smartContractName.should.equal('myContract2');
                result[1].smartContractVersion.should.equal('0.0.3');
                result[1].sequence.should.equal(-1);
                should.equal(undefined, result[0].initRequired);
                // @ts-ignore
                // result[1].initRequired.should.equal(false);

                endorserConnectStub.should.have.been.called;
                endorsementBuildSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext), buildRequest);
                endorsementSignSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));
                endorsementSendStub.should.have.been.calledWith({
                    targets: [sinon.match.instanceOf(Endorser)],
                    requestTimeout: 90000
                });
            });

            it('should handle no peerName', async () => {
                // @ts-ignore
                await channel.getAllInstantiatedSmartContracts(undefined).should.eventually.be.rejectedWith('parameter peerName is missing');
            });

            it('should handle empty response from send', async () => {
                endorsementSendStub.resolves();

                await channel.getAllInstantiatedSmartContracts('myPeer').should.eventually.be.rejectedWith('Could not get smart contract definitions, received error: Payload results are missing from the query');
            });

            it('should handle send throwing error', async () => {
                endorsementSendStub.rejects({ message: 'some error' });

                await channel.getAllInstantiatedSmartContracts('myPeer').should.eventually.be.rejectedWith('Could not get smart contract definitions, received error: some error');
            });

            it('should handle error response', async () => {
                endorsementSendStub.resolves({
                    errors: [
                        new Error('some service error')
                    ]
                });

                await channel.getAllInstantiatedSmartContracts('myPeer').should.eventually.be.rejectedWith('Could not get smart contract definitions, received error: some service error');
            });

            it('should handle problem with request response flagged up by status and message', async () => {
                endorsementSendStub.resolves({
                    responses: [{
                        response: {
                            status: 500,
                            message: 'some fabric error'
                        }
                    }]
                });

                await channel.getAllInstantiatedSmartContracts('myPeer').should.eventually.be.rejectedWith('Could not get smart contract definitions, received error: some fabric error');
            });

            it('should handle problem with request response flagged up by status but no message', async () => {
                const problemResponse: any = {
                    response: {
                        status: 300,
                    }
                };
                endorsementSendStub.resolves({
                    responses: [problemResponse]
                });

                await channel.getAllInstantiatedSmartContracts('myPeer').should.eventually.be.rejectedWith(`Could not get smart contract definitions, received error: ${problemResponse.toString()}`);
            });

            it('should handle problem with request response', async () => {
                const problemResponse: any = {strangeKey: 'strange value'};
                endorsementSendStub.resolves({
                    responses: [problemResponse]
                });

                await channel.getAllInstantiatedSmartContracts('myPeer').should.eventually.be.rejectedWith(`Could not get smart contract definitions, received error: ${problemResponse.toString()}`);
            });

        });

        describe('getCommittedSmartContract', () => {

            let mysandbox: sinon.SinonSandbox;
            let endorserConnectStub: sinon.SinonStub;

            let endorsementBuildSpy: sinon.SinonSpy;
            let endorsementSignSpy: sinon.SinonSpy;
            let endorsementSendStub: sinon.SinonStub;

            let arg: any;
            let protoArgs: protos.lifecycle.IQueryChaincodeDefinitionArgs = {};
            let buildRequest: any;

            beforeEach(() => {
                mysandbox = sinon.createSandbox();

                protoArgs.name = 'myContract';

                arg = protos.lifecycle.QueryChaincodeDefinitionArgs.encode(protoArgs).finish();

                buildRequest = {
                    fcn: 'QueryChaincodeDefinition',
                    args: [Buffer.from(arg)]
                };

                endorserConnectStub = mysandbox.stub(Endorser.prototype, 'connect').resolves();

                endorsementBuildSpy = mysandbox.spy(Endorsement.prototype, 'build');
                endorsementSignSpy = mysandbox.spy(Endorsement.prototype, 'sign');
                endorsementSendStub = mysandbox.stub(Endorsement.prototype, 'send');
                endorsementSendStub.resolves();
            });

            afterEach(() => {
                mysandbox.restore();
                protoArgs = {};
            });

            it('should get the committed smart contract', async () => {
                const encodedResult: Buffer = Buffer.from(protos.lifecycle.QueryChaincodeDefinitionResult.encode({
                    sequence: 1,
                    version: '0.0.1',
                    init_required: false,
                    endorsement_plugin: 'escc',
                    validation_plugin: 'vscc',
                    validation_parameter: Buffer.from(JSON.stringify({})),
                    collections: {},
                    approvals: { 'Org1MSP': true, 'Org2MSP': true }
                }).finish());

                endorsementSendStub.resolves({
                    responses: [{
                        response: {
                            status: 200,
                            payload: encodedResult
                        }
                    }]
                });

                const result: DefinedSmartContract = await channel.getCommittedSmartContract('myPeer', 'myContract');

                result.smartContractName.should.equal('myContract');
                result.smartContractVersion.should.equal('0.0.1');
                result.sequence.should.equal(1);
                // @ts-ignore
                result.initRequired.should.equal(false);

                result.approvals!.size.should.equal(2);
                result.approvals!.get('Org1MSP')!.should.equal(true);
                result.approvals!.get('Org2MSP')!.should.equal(true);

                endorserConnectStub.should.have.been.called;
                endorsementBuildSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext), buildRequest);
                endorsementSignSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));
                endorsementSendStub.should.have.been.calledWith({
                    targets: [sinon.match.instanceOf(Endorser)]
                });
            });

            it('should get all the committed smart contracts with timeout', async () => {

                const encodedResult: Buffer = Buffer.from(protos.lifecycle.QueryChaincodeDefinitionResult.encode({
                    sequence: 1,
                    version: '0.0.1',
                    init_required: false,
                    endorsement_plugin: 'escc',
                    validation_plugin: 'vscc',
                    validation_parameter: Buffer.from(JSON.stringify({})),
                    collections: {},
                    approvals: { 'Org1MSP': true, 'Org2MSP': true }
                }).finish());

                endorsementSendStub.resolves({
                    responses: [{
                        response: {
                            status: 200,
                            payload: encodedResult
                        }
                    }]
                });

                const result: DefinedSmartContract = await channel.getCommittedSmartContract('myPeer', 'myContract', 90);

                result.smartContractName.should.equal('myContract');
                result.smartContractVersion.should.equal('0.0.1');
                result.sequence.should.equal(1);
                // @ts-ignore
                result.initRequired.should.equal(false);

                result.approvals!.size.should.equal(2);
                result.approvals!.get('Org1MSP')!.should.equal(true);
                result.approvals!.get('Org2MSP')!.should.equal(true);

                endorserConnectStub.should.have.been.called;
                endorsementBuildSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext), buildRequest);
                endorsementSignSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));
                endorsementSendStub.should.have.been.calledWith({
                    targets: [sinon.match.instanceOf(Endorser)],
                    requestTimeout: 90000
                });
            });

            it('should handle no peerName', async () => {
                // @ts-ignore
                await channel.getCommittedSmartContract(undefined).should.eventually.be.rejectedWith('parameter peerName is missing');
            });

            it('should handle no smartContractName', async () => {
                // @ts-ignore
                await channel.getCommittedSmartContract('myPeer', undefined).should.eventually.be.rejectedWith('parameter smartContractName is missing');
            });

            it('should handle error from send', async () => {
                endorsementSendStub.rejects({ message: 'some error' });

                await channel.getCommittedSmartContract('myPeer', 'mySmartContract').should.eventually.be.rejectedWith('Could not get smart contract definition, received error: some error');
            });
        });

        describe('getEndorsementPolicyBytes', () => {
            it('should get the buffer of the endorsment policy using AND', () => {
                const policyString: string = `AND('org1.member', 'org2.member')`;

                const policy: EndorsementPolicy = new EndorsementPolicy();

                const policyResult: protos.common.SignaturePolicyEnvelope = policy.buildPolicy(policyString);

                const applicationPolicy: protos.common.IApplicationPolicy = {};

                applicationPolicy.signature_policy = policyResult;

                const policyBuffer: Buffer = Buffer.from(protos.common.ApplicationPolicy.encode(applicationPolicy).finish());

                const result: Buffer = LifecycleChannel.getEndorsementPolicyBytes(policyString);

                result.should.deep.equal(policyBuffer);
            });

            it('should get the buffer of the endorsment policy when using OR', () => {
                const policyString: string = `OR('org1.member', 'org2.member')`;

                const policy: EndorsementPolicy = new EndorsementPolicy();

                const policyResult: protos.common.SignaturePolicyEnvelope = policy.buildPolicy(policyString);

                const applicationPolicy: protos.common.IApplicationPolicy = {};

                applicationPolicy.signature_policy = policyResult;

                const policyBuffer: Buffer = Buffer.from(protos.common.ApplicationPolicy.encode(applicationPolicy).finish());

                const result: Buffer = LifecycleChannel.getEndorsementPolicyBytes(policyString);

                result.should.deep.equal(policyBuffer);
            });

            it('should get the buffer of the endorsment policy when using outOf', () => {
                const policyString: string = `OutOf(1, 'org1.member', 'org2.member')`;

                const policy: EndorsementPolicy = new EndorsementPolicy();

                const policyResult: protos.common.SignaturePolicyEnvelope = policy.buildPolicy(policyString);

                const applicationPolicy: protos.common.IApplicationPolicy = {};

                applicationPolicy.signature_policy = policyResult;

                const policyBuffer: Buffer = Buffer.from(protos.common.ApplicationPolicy.encode(applicationPolicy).finish());

                const result: Buffer = LifecycleChannel.getEndorsementPolicyBytes(policyString);

                result.should.deep.equal(policyBuffer);
            });

            it('should get the buffer of the endorsment policy when using channel reference', () => {
                const policyString: string = `myPolicyReference`;

                const applicationPolicy: protos.common.IApplicationPolicy = {};

                applicationPolicy.channel_config_policy_reference = policyString;

                const policyBuffer: Buffer = Buffer.from(protos.common.ApplicationPolicy.encode(applicationPolicy).finish());

                const result: Buffer = LifecycleChannel.getEndorsementPolicyBytes(policyString);

                result.should.deep.equal(policyBuffer);
            });

            it('should get the buffer of the endorsment policy when using a valid input for a v1 contract', () => {
                const policyString: string = `OR('org1.member', 'org2.member')`;

                const policy: EndorsementPolicy = new EndorsementPolicy();

                const policyResult: protos.common.SignaturePolicyEnvelope = policy.buildPolicy(policyString);

                const applicationPolicy: protos.common.IApplicationPolicy = {};

                applicationPolicy.signature_policy = policyResult;

                const policyBuffer: Buffer = Buffer.from(protos.common.SignaturePolicyEnvelope.encode(applicationPolicy.signature_policy).finish());

                const result: Buffer = LifecycleChannel.getEndorsementPolicyBytes(policyString, true);

                result.should.deep.equal(policyBuffer);
            });

            it('should throw error if invalid input for a v1 contract', () => {
                const policyString: string = `strange policy string`;

                (() => LifecycleChannel.getEndorsementPolicyBytes(policyString, true)).should.throw(`Cannot build endorsement policy from user input: ${policyString}`);
            });

            it('should handle no policy string', () => {
                const policyString: string = '';

                (() => LifecycleChannel.getEndorsementPolicyBytes(policyString)).should.throw('Missing parameter endorsementPolicy');
            });
        });

        describe('getCollectionConfig', () => {
            it('should get the collection config', () => {
                const collection: Collection = {
                    name: 'myCollection',
                    policy: `OR('Org1MSP.member', 'Org2MSP.member')`,
                    requiredPeerCount: 0,
                    maxPeerCount: 3
                };

                const expectedResult: protos.common.CollectionConfigPackage = CollectionConfig.buildCollectionConfigPackage([collection]);
                const actualResult: protos.common.CollectionConfigPackage = LifecycleChannel.getCollectionConfig([collection]) as protos.common.CollectionConfigPackage;

                actualResult.should.deep.equal(expectedResult);
            });

            it('should get the collection config as a buffer', () => {
                const collection: Collection = {
                    name: 'myCollection',
                    policy: `OR('Org1MSP.member', 'Org2MSP.member')`,
                    requiredPeerCount: 0,
                    maxPeerCount: 3
                };

                const expectedResult: protos.common.CollectionConfigPackage = CollectionConfig.buildCollectionConfigPackage([collection]);

                const actualResult: Buffer = LifecycleChannel.getCollectionConfig([collection], true) as Buffer;

                const arg: Uint8Array = protos.common.CollectionConfigPackage.encode({ config: expectedResult.config }).finish();
                actualResult.should.deep.equal(Buffer.from(arg));
            });
        });

        describe('getDiscoveredPeerNames', () => {

            let mysandbox: sinon.SinonSandbox;

            let gatewayConnectSpy: sinon.SinonSpy;

            let discoverServiceSignStub: sinon.SinonStub;
            let discoverServiceBuildStub: sinon.SinonStub;
            let discoverServiceSendStub: sinon.SinonStub;
            let getEndorsersStub: sinon.SinonStub;

            beforeEach(() => {
                mysandbox = sinon.createSandbox();

                mysandbox.stub(Endorser.prototype, 'connect').resolves();
                mysandbox.stub(Discoverer.prototype, 'connect').resolves();

                mysandbox.stub(Channel.prototype, 'addEndorser');
                // @ts-ignore
                getEndorsersStub = mysandbox.stub(Channel.prototype, 'getEndorsers')
                getEndorsersStub.returns([{ name: 'myPeer', endpoint: { url: 'url.one:7051' } }, { name: 'myPeer:7051', endpoint: { url: 'url.one:7051' } }, { name: 'peer0.org2.example.com:9051', endpoint: { url: 'url.three:7051' } }]);

                gatewayConnectSpy = mysandbox.spy(Gateway.prototype, 'connect');

                discoverServiceBuildStub = mysandbox.stub(DiscoveryService.prototype, 'build');
                discoverServiceSignStub = mysandbox.stub(DiscoveryService.prototype, 'sign');
                discoverServiceSendStub = mysandbox.stub(DiscoveryService.prototype, 'send').resolves();
            });

            afterEach(() => {
                mysandbox.restore();
            });

            it('should get the discovered peers', async () => {
                const result: string[] = await channel.getDiscoveredPeerNames(['myPeer']);

                result.should.deep.equal(['myPeer', 'peer0.org2.example.com:9051']);

                discoverServiceSignStub.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));
                discoverServiceBuildStub.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));

                discoverServiceSendStub.should.have.been.calledWith({
                    asLocalhost: true,
                    targets: [sinon.match.instanceOf(Discoverer)]
                });
            });

            it('should filter out peers with the same endpoint and return discovered peers', async () => {
                getEndorsersStub.returns([{ name: 'myPeer', endpoint: { url: 'localhost:9051' } }, { name: 'peer1.org1.example.com:9051', endpoint: { url: 'localhost:9051' } }, { name: 'peer1.org2.example.com:8051', endpoint: { url: 'localhost:8051' } }, { name: 'Org2Peer1', endpoint: { url: 'localhost:8051' } }, { name: 'Org3Peer1:6051', endpoint: { url: 'localhost:6051' } }, { name: 'peer1.org3.example.com:6051', endpoint: { url: 'localhost:6051' } }]);

                const result: string[] = await channel.getDiscoveredPeerNames(['myPeer']);

                result.should.deep.equal(['myPeer', 'Org2Peer1', 'peer1.org3.example.com:6051']);

                discoverServiceSignStub.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));
                discoverServiceBuildStub.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));

                discoverServiceSendStub.should.have.been.calledWith({
                    asLocalhost: true,
                    targets: [sinon.match.instanceOf(Discoverer)]
                });
            });

            it('should filter out peers with the same endpoint and same options and return discovered peers', async () => {
                getEndorsersStub.returns([
                    {
                        name: 'myPeer1',
                        endpoint: {
                            url: 'localhost:8080',
                            options: {
                                'grpc.default_authority': 'peer0.org1.example.com'
                            }
                        }
                    },
                    {
                        name: 'myPeer2',
                        endpoint: {
                            url: 'localhost:8080'
                        }
                    },
                    {
                        name: 'myPeer3',
                        endpoint: {
                            url: 'localhost:8080',
                            options: {
                                'grpc.default_authority': 'peer0.org1.example.com'
                            }
                        }
                    },
                    {
                        name: 'myPeer4',
                        endpoint: {
                            url: '192.168.1.12:8080',
                            options: {
                                'grpc.default_authority': 'peer0.org1.example.com'
                            }
                        }
                    },
                    {
                        name: 'myPeer5',
                        endpoint: {
                            url: 'localhost:8080',
                            options: {
                                'grpc.default_authority': 'peer0.org2.example.com'
                            }
                        }
                    },
                ]);

                const result: string[] = await channel.getDiscoveredPeerNames(['myPeer']);

                result.should.deep.equal(['myPeer2', 'myPeer3', 'myPeer4', 'myPeer5']);

                discoverServiceSignStub.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));
                discoverServiceBuildStub.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));

                discoverServiceSendStub.should.have.been.calledWith({
                    asLocalhost: true,
                    targets: [sinon.match.instanceOf(Discoverer)]
                });
            });

            it('should get the discovered peer with timeout', async () => {
                const result: string[] = await channel.getDiscoveredPeerNames(['myPeer'], 1234);

                result.should.deep.equal(['myPeer', 'peer0.org2.example.com:9051']);

                discoverServiceSignStub.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));
                discoverServiceBuildStub.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));

                discoverServiceSendStub.should.have.been.calledWith({
                    asLocalhost: true,
                    targets: [sinon.match.instanceOf(Discoverer)]
                });

                const call: sinon.SinonSpyCall = gatewayConnectSpy.getCall(0);
                call.args[1].eventHandlerOptions.should.deep.equal({
                    commitTimeout: 1234,
                    endorseTimeout: 1234
                });
            });

            it('should handle no peerNames set', async () => {
                // @ts-ignore
                await channel.getDiscoveredPeerNames().should.eventually.be.rejectedWith('parameter peers was missing or empty array');
            });

            it('should handle error', async () => {

                discoverServiceSendStub.rejects({ message: 'some error' });
                await channel.getDiscoveredPeerNames(['myPeer']).should.eventually.be.rejectedWith('Could discover peers, received error some error');

                discoverServiceSignStub.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));
                discoverServiceBuildStub.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));

                discoverServiceSendStub.should.have.been.calledWith({
                    asLocalhost: true,
                    targets: [sinon.match.instanceOf(Discoverer)]
                });
            });
        });

        describe('getDiscoveredPeers', () => {

            let mysandbox: sinon.SinonSandbox;

            let gatewayConnectSpy: sinon.SinonSpy;

            let discoverServiceSignStub: sinon.SinonStub;
            let discoverServiceBuildStub: sinon.SinonStub;
            let discoverServiceSendStub: sinon.SinonStub;
            let getEndorsersStub: sinon.SinonStub;

            beforeEach(() => {
                mysandbox = sinon.createSandbox();

                mysandbox.stub(Endorser.prototype, 'connect').resolves();
                mysandbox.stub(Discoverer.prototype, 'connect').resolves();

                mysandbox.stub(Channel.prototype, 'addEndorser');
                // @ts-ignore
                getEndorsersStub = mysandbox.stub(Channel.prototype, 'getEndorsers')
                getEndorsersStub.returns([{ name: 'myPeer', endpoint: { url: 'url.one:7051' } }, { name: 'myPeer:7051', endpoint: { url: 'urltwo:7051' } }, { name: 'peer0.org2.example.com:9051', endpoint: { url: 'url.three:7051' } }]);

                gatewayConnectSpy = mysandbox.spy(Gateway.prototype, 'connect');

                discoverServiceBuildStub = mysandbox.stub(DiscoveryService.prototype, 'build');
                discoverServiceSignStub = mysandbox.stub(DiscoveryService.prototype, 'sign');
                discoverServiceSendStub = mysandbox.stub(DiscoveryService.prototype, 'send').resolves();
            });

            afterEach(() => {
                mysandbox.restore();
            });

            it('should get the discovered peer names', async () => {
                const result: Endpoint[] = await channel.getDiscoveredPeers(['myPeer']);

                result.should.deep.equal([{ name: 'myPeer', endpoint: { url: 'url.one:7051' } }, { name: 'myPeer:7051', endpoint: { url: 'urltwo:7051' } }, { name: 'peer0.org2.example.com:9051', endpoint: { url: 'url.three:7051' } }]);

                discoverServiceSignStub.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));
                discoverServiceBuildStub.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));

                discoverServiceSendStub.should.have.been.calledWith({
                    asLocalhost: true,
                    targets: [sinon.match.instanceOf(Discoverer)]
                });
            });

            it('should filter out peers with the same endpoint and return discovered peer names', async () => {
                getEndorsersStub.returns([{ name: 'myPeer', endpoint: { url: 'localhost:9051' } }, { name: 'peer1.org1.example.com:9051', endpoint: { url: 'localhost:9051' } }, { name: 'peer1.org2.example.com:8051', endpoint: { url: 'localhost:8051' } }, { name: 'Org2Peer1', endpoint: { url: 'localhost:8051' } }, { name: 'Org3Peer1:6051', endpoint: { url: 'localhost:6051' } }, { name: 'peer1.org3.example.com:6051', endpoint: { url: 'localhost:6051' } }]);

                const result: Endorser[] = await channel.getDiscoveredPeers(['myPeer']);

                result.should.deep.equal([{ name: 'myPeer', endpoint: { url: 'localhost:9051' } }, { name: 'Org2Peer1', endpoint: { url: 'localhost:8051' } }, { name: 'peer1.org3.example.com:6051', endpoint: { url: 'localhost:6051' } }]);

                discoverServiceSignStub.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));
                discoverServiceBuildStub.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));

                discoverServiceSendStub.should.have.been.calledWith({
                    asLocalhost: true,
                    targets: [sinon.match.instanceOf(Discoverer)]
                });
            });

            it('should get the discovered peer names with timeout', async () => {
                const result: Endorser[] = await channel.getDiscoveredPeers(['myPeer'], 1234);

                result.should.deep.equal([{ name: 'myPeer', endpoint: { url: 'url.one:7051' } }, { name: 'myPeer:7051', endpoint: { url: 'urltwo:7051' } }, { name: 'peer0.org2.example.com:9051', endpoint: { url: 'url.three:7051' } }]);

                discoverServiceSignStub.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));
                discoverServiceBuildStub.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));

                discoverServiceSendStub.should.have.been.calledWith({
                    asLocalhost: true,
                    targets: [sinon.match.instanceOf(Discoverer)]
                });

                const call: sinon.SinonSpyCall = gatewayConnectSpy.getCall(0);
                call.args[1].eventHandlerOptions.should.deep.equal({
                    commitTimeout: 1234,
                    endorseTimeout: 1234
                });
            });

            it('should handle no peerNames set', async () => {
                // @ts-ignore
                await channel.getDiscoveredPeers().should.eventually.be.rejectedWith('parameter peers was missing or empty array');
            });

            it('should handle error', async () => {

                discoverServiceSendStub.rejects({ message: 'some error' });
                await channel.getDiscoveredPeers(['myPeer']).should.eventually.be.rejectedWith('Could discover peers, received error some error');

                discoverServiceSignStub.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));
                discoverServiceBuildStub.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));

                discoverServiceSendStub.should.have.been.calledWith({
                    asLocalhost: true,
                    targets: [sinon.match.instanceOf(Discoverer)]
                });
            });
        });
    });
});
