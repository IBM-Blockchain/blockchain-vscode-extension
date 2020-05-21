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

import {Channel, Committer, Endorsement, Endorser, IdentityContext} from 'fabric-common';
import * as protos from 'fabric-protos';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as path from 'path';
import {Gateway, Wallet, Wallets, X509Identity} from 'fabric-network';
import * as sinon from 'sinon';
import {DefinedSmartContract, LifecycleChannel} from '../src/LifecycleChannel';
import {Lifecycle} from '../src/Lifecycle';
import * as Long from 'long';
import {EndorsementPolicy} from '../src/Policy';
import {Collection} from '../src';
import {CollectionConfig} from '../src/CollectionConfig';

// this is horrible but needed as the transaction constructor isn't exported so can't stub it without stubbing the world
// tslint:disable-next-line:no-var-requires
const Transaction: any = require('fabric-network/lib/transaction');

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

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
            requestTimeout: 70000,
            pem: '-----BEGIN CERTIFICATE-----\\nMIICJjCCAc2gAwIBAgIURY9F2Rt0JqOtiHbNJ6rRgfiDy2EwCgYIKoZIzj0EAwIw\\ncDELMAkGA1UEBhMCVVMxFzAVBgNVBAgTDk5vcnRoIENhcm9saW5hMQ8wDQYDVQQH\\nEwZEdXJoYW0xGTAXBgNVBAoTEG9yZzEuZXhhbXBsZS5jb20xHDAaBgNVBAMTE2Nh\\nLm9yZzEuZXhhbXBsZS5jb20wHhcNMjAwMzE2MTQ1MDAwWhcNMzUwMzEzMTQ1MDAw\\nWjBwMQswCQYDVQQGEwJVUzEXMBUGA1UECBMOTm9ydGggQ2Fyb2xpbmExDzANBgNV\\nBAcTBkR1cmhhbTEZMBcGA1UEChMQb3JnMS5leGFtcGxlLmNvbTEcMBoGA1UEAxMT\\nY2Eub3JnMS5leGFtcGxlLmNvbTBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABHic\\nzHXBRqfe7elvQ8zuxIwigOFCuk/49bjChQxf19fL/qHBLYLOXgd3Ox5jTVyyLuO/\\nf9x19piTv7gVgv8h7BijRTBDMA4GA1UdDwEB/wQEAwIBBjASBgNVHRMBAf8ECDAG\\nAQH/AgEBMB0GA1UdDgQWBBRGw4tXsbZSI45NZNTsDT7rssJpzjAKBggqhkjOPQQD\\nAgNHADBEAiBWNIFkaageeAiEMmhauY3bTHoG45Wgjk99CjHZ6KJoTgIgMfKc9mBL\\na5JHbGNB/gsBhxIm8/akE6g+SikIz/JGty4=\\n-----END CERTIFICATE-----\\n"\n'
        });

        lifecycle.addPeer({
            url: 'grpc://localhost:8051',
            mspid: 'myMSPID',
            name: 'myPeer2',
            sslTargetNameOverride: 'localhost'
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

        describe('approveSmartContractDefinition', () => {

            let mysandbox: sinon.SinonSandbox;

            let gatewayConnectSpy: sinon.SinonSpy;

            let transactionSetEndorsingPeersSpy: sinon.SinonSpy;
            let transactionSubmitStub: sinon.SinonStub;

            let addEndorserStub: sinon.SinonStub;
            let addCommitterStub: sinon.SinonStub;

            let arg: any;

            beforeEach(() => {
                mysandbox = sinon.createSandbox();

                mysandbox.stub(Endorser.prototype, 'connect').resolves();

                mysandbox.stub(Committer.prototype, 'connect').resolves();

                arg = new protos.lifecycle.ApproveChaincodeDefinitionForMyOrgArgs();
                arg.setName('myContract');
                arg.setVersion('0.0.1');
                arg.setSequence(Long.fromValue(1));

                const local: protos.lifecycle.ChaincodeSource.Local = new protos.lifecycle.ChaincodeSource.Local();
                local.setPackageId('myPackageId');

                const source: protos.lifecycle.ChaincodeSource = new protos.lifecycle.ChaincodeSource();
                source.setLocalPackage(local);
                arg.setSource(source);

                addEndorserStub = mysandbox.stub(Channel.prototype, 'addEndorser');
                addCommitterStub = mysandbox.stub(Channel.prototype, 'addCommitter');

                gatewayConnectSpy = mysandbox.spy(Gateway.prototype, 'connect');

                transactionSetEndorsingPeersSpy = mysandbox.spy(Transaction.prototype, 'setEndorsingPeers');
                transactionSubmitStub = mysandbox.stub(Transaction.prototype, 'submit');
            });

            afterEach(() => {
                mysandbox.restore();
            });

            it('should approve a smart contract definition', async () => {
                await channel.approveSmartContractDefinition(['myPeer'], 'myOrderer', {
                    packageId: 'myPackageId',
                    sequence: 1,
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1'
                });

                addEndorserStub.should.have.been.calledWith(sinon.match.instanceOf(Endorser));
                addCommitterStub.should.have.been.calledWith(sinon.match.instanceOf(Committer));

                transactionSetEndorsingPeersSpy.should.have.been.calledWith([sinon.match.instanceOf(Endorser)]);
                transactionSubmitStub.should.have.been.calledWith(arg.toBuffer());
            });

            it('should approve a smart contract definition with timeout set', async () => {
                await channel.approveSmartContractDefinition(['myPeer'], 'myOrderer', {
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

                transactionSetEndorsingPeersSpy.should.have.been.calledWith([sinon.match.instanceOf(Endorser)]);
                transactionSubmitStub.should.have.been.calledWith(arg.toBuffer());
            });

            it('should approve a smart contract definition and set initRequired if set', async () => {

                arg.setInitRequired(true);

                await channel.approveSmartContractDefinition(['myPeer'], 'myOrderer', {
                    packageId: 'myPackageId',
                    sequence: 1,
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1',
                    initRequired: true
                });

                addEndorserStub.should.have.been.calledWith(sinon.match.instanceOf(Endorser));
                addCommitterStub.should.have.been.calledWith(sinon.match.instanceOf(Committer));

                transactionSetEndorsingPeersSpy.should.have.been.calledWith([sinon.match.instanceOf(Endorser)]);
                transactionSubmitStub.should.have.been.calledWith(arg.toBuffer());
            });

            it('should approve a smart contract definition handle no packageId', async () => {

                const unavailable: protos.lifecycle.ChaincodeSource.Unavailable = new protos.lifecycle.ChaincodeSource.Unavailable();

                const source: protos.lifecycle.ChaincodeSource = new protos.lifecycle.ChaincodeSource();
                source.setUnavailable(unavailable);

                arg.setSource(source);

                await channel.approveSmartContractDefinition(['myPeer'], 'myOrderer', {
                    sequence: 1,
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1',
                });

                addEndorserStub.should.have.been.calledWith(sinon.match.instanceOf(Endorser));
                addCommitterStub.should.have.been.calledWith(sinon.match.instanceOf(Committer));

                transactionSetEndorsingPeersSpy.should.have.been.calledWith([sinon.match.instanceOf(Endorser)]);
                transactionSubmitStub.should.have.been.calledWith(arg.toBuffer());
            });

            it('should approve a smart contract definition with endorsement plugin', async () => {
                arg.setEndorsementPlugin('myPlugin');

                await channel.approveSmartContractDefinition(['myPeer'], 'myOrderer', {
                    packageId: 'myPackageId',
                    sequence: 1,
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1',
                    endorsementPlugin: 'myPlugin'
                });

                addEndorserStub.should.have.been.calledWith(sinon.match.instanceOf(Endorser));
                addCommitterStub.should.have.been.calledWith(sinon.match.instanceOf(Committer));

                transactionSetEndorsingPeersSpy.should.have.been.calledWith([sinon.match.instanceOf(Endorser)]);
                transactionSubmitStub.should.have.been.calledWith(arg.toBuffer());
            });

            it('should approve a smart contract definition with validation plugin', async () => {
                arg.setValidationPlugin('myPlugin');

                await channel.approveSmartContractDefinition(['myPeer'], 'myOrderer', {
                    packageId: 'myPackageId',
                    sequence: 1,
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1',
                    validationPlugin: 'myPlugin'
                });

                addEndorserStub.should.have.been.calledWith(sinon.match.instanceOf(Endorser));
                addCommitterStub.should.have.been.calledWith(sinon.match.instanceOf(Committer));

                transactionSetEndorsingPeersSpy.should.have.been.calledWith([sinon.match.instanceOf(Endorser)]);
                transactionSubmitStub.should.have.been.calledWith(arg.toBuffer());
            });

            it('should approve a smart contract definition with endorsement policy', async () => {
                const policyString: string = `AND('org1.member', 'org2.member')`;

                const policy: EndorsementPolicy = new EndorsementPolicy();

                const policyResult: protos.common.SignaturePolicyEnvelope = policy.buildPolicy(policyString);

                const applicationPolicy: protos.common.ApplicationPolicy = new protos.common.ApplicationPolicy();

                applicationPolicy.setSignaturePolicy(policyResult);

                const policyBuffer: Buffer = applicationPolicy.toBuffer();

                arg.setValidationParameter(policyBuffer);

                await channel.approveSmartContractDefinition(['myPeer'], 'myOrderer', {
                    packageId: 'myPackageId',
                    sequence: 1,
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1',
                    endorsementPolicy: policyString
                });

                addEndorserStub.should.have.been.calledWith(sinon.match.instanceOf(Endorser));
                addCommitterStub.should.have.been.calledWith(sinon.match.instanceOf(Committer));

                transactionSetEndorsingPeersSpy.should.have.been.calledWith([sinon.match.instanceOf(Endorser)]);
                transactionSubmitStub.should.have.been.calledWith(arg.toBuffer());
            });

            it('should approve a smart contract definition with collection config', async () => {
                const collectionConfig: Collection [] = [
                    {
                        name: 'CollectionOne',
                        policy: `OR('Org1MSP.member')`,
                        requiredPeerCount: 1,
                        maxPeerCount: 1,
                        blockToLive: 0,
                        memberOnlyRead: true
                    }
                ];

                arg.setCollections(CollectionConfig.buildCollectionConfigPackage(collectionConfig));

                await channel.approveSmartContractDefinition(['myPeer'], 'myOrderer', {
                    packageId: 'myPackageId',
                    sequence: 1,
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1',
                    collectionConfig: collectionConfig
                });

                addEndorserStub.should.have.been.calledWith(sinon.match.instanceOf(Endorser));
                addCommitterStub.should.have.been.calledWith(sinon.match.instanceOf(Committer));

                transactionSetEndorsingPeersSpy.should.have.been.calledWith([sinon.match.instanceOf(Endorser)]);
                transactionSubmitStub.should.have.been.calledWith(arg.toBuffer());
            });

            it('should handle no peerNames set', async () => {
                await channel.approveSmartContractDefinition([], 'myOrderer', {
                    packageId: 'myPackageId',
                    sequence: 1,
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1',
                }).should.eventually.be.rejectedWith('parameter peers was missing or empty array');
            });

            it('should handle no orderer set', async () => {
                // @ts-ignore
                await channel.approveSmartContractDefinition(['myPeer'], undefined, {
                    packageId: 'myPackageId',
                    sequence: 1,
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1',
                }).should.eventually.be.rejectedWith('parameter ordererName is missing');
            });

            it('should handle no options set', async () => {
                // @ts-ignore
                await channel.approveSmartContractDefinition(['myPeer'], 'myOrderer', undefined).should.eventually.be.rejectedWith('parameter options is missing');
            });

            it('should handle no sequence set', async () => {
                // @ts-ignore
                await channel.approveSmartContractDefinition(['myPeer'], 'myOrderer', {
                    packageId: 'myPackageId',
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1',
                }).should.eventually.be.rejectedWith('missing option sequence');
            });

            it('should handle no smartContractName set', async () => {
                // @ts-ignore
                await channel.approveSmartContractDefinition(['myPeer'], 'myOrderer', {
                    packageId: 'myPackageId',
                    sequence: 1,
                    smartContractVersion: '0.0.1',
                }).should.eventually.be.rejectedWith('missing option smartContractName');
            });

            it('should handle no smartContractVersion set', async () => {
                // @ts-ignore
                await channel.approveSmartContractDefinition(['myPeer'], 'myOrderer', {
                    packageId: 'myPackageId',
                    sequence: 1,
                    smartContractName: 'myContract',
                }).should.eventually.be.rejectedWith('missing option smartContractVersion');
            });

            it('should handle error from submit', async () => {
                transactionSubmitStub.rejects({message: 'some error'});

                await channel.approveSmartContractDefinition(['myPeer'], 'myOrderer', {
                    packageId: 'myPackageId',
                    sequence: 1,
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1'
                }).should.eventually.be.rejectedWith('Could not approve smart contract definition, received error: some error');

                addEndorserStub.should.have.been.calledWith(sinon.match.instanceOf(Endorser));
                addCommitterStub.should.have.been.calledWith(sinon.match.instanceOf(Committer));

                transactionSetEndorsingPeersSpy.should.have.been.calledWith([sinon.match.instanceOf(Endorser)]);
                transactionSubmitStub.should.have.been.calledWith(arg.toBuffer());
            });
        });

        describe('commitSmartContractDefinition', () => {

            let mysandbox: sinon.SinonSandbox;

            let gatewayConnectSpy: sinon.SinonSpy;

            let transactionSetEndorsingPeersSpy: sinon.SinonSpy;
            let transactionSubmitStub: sinon.SinonStub;

            let addEndorserStub: sinon.SinonStub;
            let addCommitterStub: sinon.SinonStub;

            let arg: any;

            beforeEach(() => {
                mysandbox = sinon.createSandbox();

                mysandbox.stub(Endorser.prototype, 'connect').resolves();

                mysandbox.stub(Committer.prototype, 'connect').resolves();

                arg = new protos.lifecycle.ApproveChaincodeDefinitionForMyOrgArgs();
                arg.setName('myContract');
                arg.setVersion('0.0.1');
                arg.setSequence(Long.fromValue(1));

                addEndorserStub = mysandbox.stub(Channel.prototype, 'addEndorser');
                addCommitterStub = mysandbox.stub(Channel.prototype, 'addCommitter');

                gatewayConnectSpy = mysandbox.spy(Gateway.prototype, 'connect');

                transactionSetEndorsingPeersSpy = mysandbox.spy(Transaction.prototype, 'setEndorsingPeers');
                transactionSubmitStub = mysandbox.stub(Transaction.prototype, 'submit');
            });

            afterEach(() => {
                mysandbox.restore();
            });

            it('should commit a smart contract definition', async () => {
                await channel.commitSmartContractDefinition(['myPeer', 'myPeer2'], 'myOrderer', {
                    sequence: 1,
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1'
                });

                addEndorserStub.should.have.been.calledTwice;
                addCommitterStub.should.have.been.calledWith(sinon.match.instanceOf(Committer));

                transactionSetEndorsingPeersSpy.should.have.been.calledWith([sinon.match.instanceOf(Endorser), sinon.match.instanceOf(Endorser)]);
                transactionSubmitStub.should.have.been.calledWith(arg.toBuffer());
            });

            it('should commit a smart contract definition with timeout set', async () => {
                await channel.commitSmartContractDefinition(['myPeer', 'myPeer2'], 'myOrderer', {
                    sequence: 1,
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1'
                }, 1234);

                addEndorserStub.should.have.been.calledTwice;
                addCommitterStub.should.have.been.calledWith(sinon.match.instanceOf(Committer));

                const call: sinon.SinonSpyCall = gatewayConnectSpy.getCall(0);
                call.args[1].eventHandlerOptions.should.deep.equal({
                    commitTimeout: 1234,
                    endorseTimeout: 1234
                });

                transactionSetEndorsingPeersSpy.should.have.been.calledWith([sinon.match.instanceOf(Endorser), sinon.match.instanceOf(Endorser)]);
                transactionSubmitStub.should.have.been.calledWith(arg.toBuffer());
            });

            it('should commit a smart contract definition and set initRequired if set', async () => {

                arg.setInitRequired(true);

                await channel.commitSmartContractDefinition(['myPeer', 'myPeer2'], 'myOrderer', {
                    sequence: 1,
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1',
                    initRequired: true
                });

                addEndorserStub.should.have.been.calledTwice;
                addCommitterStub.should.have.been.calledWith(sinon.match.instanceOf(Committer));

                transactionSetEndorsingPeersSpy.should.have.been.calledWith([sinon.match.instanceOf(Endorser), sinon.match.instanceOf(Endorser)]);
                transactionSubmitStub.should.have.been.calledWith(arg.toBuffer());
            });

            it('should commit a smart contract definition with endorsement plugin', async () => {
                arg.setEndorsementPlugin('myPlugin');

                await channel.commitSmartContractDefinition(['myPeer', 'myPeer2'], 'myOrderer', {
                    sequence: 1,
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1',
                    endorsementPlugin: 'myPlugin'
                });

                addEndorserStub.should.have.been.calledTwice;
                addCommitterStub.should.have.been.calledWith(sinon.match.instanceOf(Committer));

                transactionSetEndorsingPeersSpy.should.have.been.calledWith([sinon.match.instanceOf(Endorser), sinon.match.instanceOf(Endorser)]);
                transactionSubmitStub.should.have.been.calledWith(arg.toBuffer());
            });

            it('should commit a smart contract definition with validation plugin', async () => {
                arg.setValidationPlugin('myPlugin');

                await channel.commitSmartContractDefinition(['myPeer', 'myPeer2'], 'myOrderer', {
                    sequence: 1,
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1',
                    validationPlugin: 'myPlugin'
                });

                addEndorserStub.should.have.been.calledTwice;
                addCommitterStub.should.have.been.calledWith(sinon.match.instanceOf(Committer));

                transactionSetEndorsingPeersSpy.should.have.been.calledWith([sinon.match.instanceOf(Endorser), sinon.match.instanceOf(Endorser)]);
                transactionSubmitStub.should.have.been.calledWith(arg.toBuffer());
            });

            it('should commit a smart contract definition with endorsement policy', async () => {
                const policyString: string = `AND('org1.member', 'org2.member')`;

                const policy: EndorsementPolicy = new EndorsementPolicy();

                const policyResult: protos.common.SignaturePolicyEnvelope = policy.buildPolicy(policyString);

                const applicationPolicy: protos.common.ApplicationPolicy = new protos.common.ApplicationPolicy();

                applicationPolicy.setSignaturePolicy(policyResult);

                const policyBuffer: Buffer = applicationPolicy.toBuffer();

                arg.setValidationParameter(policyBuffer);

                await channel.commitSmartContractDefinition(['myPeer', 'myPeer2'], 'myOrderer', {
                    sequence: 1,
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1',
                    endorsementPolicy: policyString
                });

                addEndorserStub.should.have.been.calledTwice;
                addCommitterStub.should.have.been.calledWith(sinon.match.instanceOf(Committer));

                transactionSetEndorsingPeersSpy.should.have.been.calledWith([sinon.match.instanceOf(Endorser), sinon.match.instanceOf(Endorser)]);
                transactionSubmitStub.should.have.been.calledWith(arg.toBuffer());
            });

            it('should commit a smart contract definition with endorsement policy channel reference', async () => {
                const policyString: string = `myPolicyReference`;

                const applicationPolicy: protos.common.ApplicationPolicy = new protos.common.ApplicationPolicy();

                applicationPolicy.setChannelConfigPolicyReference(policyString);

                const policyBuffer: Buffer = applicationPolicy.toBuffer();

                arg.setValidationParameter(policyBuffer);

                await channel.commitSmartContractDefinition(['myPeer', 'myPeer2'], 'myOrderer', {
                    sequence: 1,
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1',
                    endorsementPolicy: policyString
                });

                addEndorserStub.should.have.been.calledTwice;
                addCommitterStub.should.have.been.calledWith(sinon.match.instanceOf(Committer));

                transactionSetEndorsingPeersSpy.should.have.been.calledWith([sinon.match.instanceOf(Endorser), sinon.match.instanceOf(Endorser)]);
                transactionSubmitStub.should.have.been.calledWith(arg.toBuffer());
            });

            it('should commit a smart contract definition with collection config', async () => {
                const collectionConfig: Collection [] = [
                    {
                        name: 'CollectionOne',
                        policy: `OR('Org1MSP.member')`,
                        requiredPeerCount: 1,
                        maxPeerCount: 1,
                        blockToLive: 0,
                        memberOnlyRead: true
                    }
                ];

                arg.setCollections(CollectionConfig.buildCollectionConfigPackage(collectionConfig));

                await channel.commitSmartContractDefinition(['myPeer', 'myPeer2'], 'myOrderer', {
                    sequence: 1,
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1',
                    collectionConfig: collectionConfig
                });

                addEndorserStub.should.have.been.calledTwice;
                addCommitterStub.should.have.been.calledWith(sinon.match.instanceOf(Committer));

                transactionSetEndorsingPeersSpy.should.have.been.calledWith([sinon.match.instanceOf(Endorser), sinon.match.instanceOf(Endorser)]);
                transactionSubmitStub.should.have.been.calledWith(arg.toBuffer());
            });

            it('should handle no peerNames set', async () => {
                await channel.commitSmartContractDefinition([], 'myOrderer', {
                    sequence: 1,
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1',
                }).should.eventually.be.rejectedWith('parameter peers was missing or empty array');
            });

            it('should handle no orderer set', async () => {
                // @ts-ignore
                await channel.commitSmartContractDefinition(['myPeer', 'myPeer2'], undefined, {
                    sequence: 1,
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1',
                }).should.eventually.be.rejectedWith('parameter ordererName is missing');
            });

            it('should handle no options set', async () => {
                // @ts-ignore
                await channel.commitSmartContractDefinition(['myPeer', 'myPeer2'], 'myOrderer', undefined).should.eventually.be.rejectedWith('parameter options is missing');
            });

            it('should handle no sequence set', async () => {
                // @ts-ignore
                await channel.commitSmartContractDefinition(['myPeer', 'myPeer2'], 'myOrderer', {
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1',
                }).should.eventually.be.rejectedWith('missing option sequence');
            });

            it('should handle no smartContractName set', async () => {
                // @ts-ignore
                await channel.commitSmartContractDefinition(['myPeer', 'myPeer2'], 'myOrderer', {
                    sequence: 1,
                    smartContractVersion: '0.0.1',
                }).should.eventually.be.rejectedWith('missing option smartContractName');
            });

            it('should handle no smartContractVersion set', async () => {
                // @ts-ignore
                await channel.commitSmartContractDefinition(['myPeer', 'myPeer2'], 'myOrderer', {
                    sequence: 1,
                    smartContractName: 'myContract',
                }).should.eventually.be.rejectedWith('missing option smartContractVersion');
            });

            it('should handle error from submit', async () => {
                transactionSubmitStub.rejects({message: 'some error'});

                await channel.commitSmartContractDefinition(['myPeer', 'myPeer2'], 'myOrderer', {
                    sequence: 1,
                    smartContractName: 'myContract',
                    smartContractVersion: '0.0.1'
                }).should.eventually.be.rejectedWith('Could not commit smart contract definition, received error: some error');

                addEndorserStub.should.have.been.calledTwice;
                addCommitterStub.should.have.been.calledWith(sinon.match.instanceOf(Committer));

                transactionSetEndorsingPeersSpy.should.have.been.calledWith([sinon.match.instanceOf(Endorser), sinon.match.instanceOf(Endorser)]);
                transactionSubmitStub.should.have.been.calledWith(arg.toBuffer());
            });
        });

        describe('getCommitReadiness', () => {

            let mysandbox: sinon.SinonSandbox;
            let endorserConnectStub: sinon.SinonStub;

            let endorsementBuildSpy: sinon.SinonSpy;
            let endorsementSignSpy: sinon.SinonSpy;
            let endorsementSendStub: sinon.SinonStub;

            let arg: any;
            let buildRequest: any;

            beforeEach(() => {
                mysandbox = sinon.createSandbox();

                arg = new protos.lifecycle.CheckCommitReadinessArgs();
                arg.setName('myContract');
                arg.setVersion('0.0.1');
                arg.setSequence(Long.fromValue(1));

                buildRequest = {
                    fcn: 'CheckCommitReadiness',
                    args: [arg.toBuffer()]
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

            it('should get the commit readiness of a smart contract definition', async () => {

                const encodedResult: protos.lifecycle.CheckCommitReadinessResult = protos.lifecycle.CheckCommitReadinessResult.encode({
                    approvals: {
                        org1: true, org2: false
                    }
                });

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

                const encodedResult: protos.lifecycle.CheckCommitReadinessResult = protos.lifecycle.CheckCommitReadinessResult.encode({
                    approvals: {
                        org1: true, org2: false
                    }
                });

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
                }, 1234);

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
                    requestTimeout: 1234
                });
            });

            it('should get the commit readiness of a smart contract definition with init required', async () => {

                arg.setInitRequired(true);

                buildRequest = {
                    fcn: 'CheckCommitReadiness',
                    args: [arg.toBuffer()]
                };

                const encodedResult: protos.lifecycle.CheckCommitReadinessResult = protos.lifecycle.CheckCommitReadinessResult.encode({
                    approvals: {
                        org1: true, org2: false
                    }
                });

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

                arg.setEndorsementPlugin('myPlugin');

                buildRequest = {
                    fcn: 'CheckCommitReadiness',
                    args: [arg.toBuffer()]
                };

                const encodedResult: protos.lifecycle.CheckCommitReadinessResult = protos.lifecycle.CheckCommitReadinessResult.encode({
                    approvals: {
                        org1: true, org2: false
                    }
                });

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

                arg.setValidationPlugin('myPlugin');

                buildRequest = {
                    fcn: 'CheckCommitReadiness',
                    args: [arg.toBuffer()]
                };

                const encodedResult: protos.lifecycle.CheckCommitReadinessResult = protos.lifecycle.CheckCommitReadinessResult.encode({
                    approvals: {
                        org1: true, org2: false
                    }
                });

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

                const applicationPolicy: protos.common.ApplicationPolicy = new protos.common.ApplicationPolicy();

                applicationPolicy.setSignaturePolicy(policyResult);

                const policyBuffer: Buffer = applicationPolicy.toBuffer();

                arg.setValidationParameter(policyBuffer);

                buildRequest = {
                    fcn: 'CheckCommitReadiness',
                    args: [arg.toBuffer()]
                };

                const encodedResult: protos.lifecycle.CheckCommitReadinessResult = protos.lifecycle.CheckCommitReadinessResult.encode({
                    approvals: {
                        org1: true, org2: false
                    }
                });

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

                const collectionConfig: Collection [] = [
                    {
                        name: 'CollectionOne',
                        policy: `OR('Org1MSP.member')`,
                        requiredPeerCount: 1,
                        maxPeerCount: 1,
                        blockToLive: 0,
                        memberOnlyRead: true
                    }
                ];

                arg.setCollections(CollectionConfig.buildCollectionConfigPackage(collectionConfig));

                buildRequest = {
                    fcn: 'CheckCommitReadiness',
                    args: [arg.toBuffer()]
                };

                const encodedResult: protos.lifecycle.CheckCommitReadinessResult = protos.lifecycle.CheckCommitReadinessResult.encode({
                    approvals: {
                        org1: true, org2: false
                    }
                });

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

                endorsementSendStub.rejects({message: 'some error'});

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

            let arg: any;
            let buildRequest: any;

            beforeEach(() => {
                mysandbox = sinon.createSandbox();

                arg = new protos.lifecycle.QueryChaincodeDefinitionsArgs();

                buildRequest = {
                    fcn: 'QueryChaincodeDefinitions',
                    args: [arg.toBuffer()]
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

            it('should get all the committed smart contracts', async () => {

                const encodedResult: protos.lifecycle.QueryChaincodeDefinitionsResult = protos.lifecycle.QueryChaincodeDefinitionsResult.encode({
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
                });

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

                const encodedResult: protos.lifecycle.QueryChaincodeDefinitionsResult = protos.lifecycle.QueryChaincodeDefinitionsResult.encode({
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
                });

                endorsementSendStub.resolves({
                    responses: [{
                        response: {
                            status: 200,
                            payload: encodedResult
                        }
                    }]
                });

                const result: DefinedSmartContract[] = await channel.getAllCommittedSmartContracts('myPeer', 1234);

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
                    requestTimeout: 1234
                });
            });

            it('should handle no peerName', async () => {
                // @ts-ignore
                await channel.getAllCommittedSmartContracts(undefined).should.eventually.be.rejectedWith('parameter peerName is missing');
            });

            it('should handle error from send', async () => {
                endorsementSendStub.rejects({message: 'some error'});

                await channel.getAllCommittedSmartContracts('myPeer').should.eventually.be.rejectedWith('Could not get smart contract definitions, received error: some error');
            });
        });

        describe('getCommittedSmartContract', () => {

            let mysandbox: sinon.SinonSandbox;
            let endorserConnectStub: sinon.SinonStub;

            let endorsementBuildSpy: sinon.SinonSpy;
            let endorsementSignSpy: sinon.SinonSpy;
            let endorsementSendStub: sinon.SinonStub;

            let arg: any;
            let buildRequest: any;

            beforeEach(() => {
                mysandbox = sinon.createSandbox();

                arg = new protos.lifecycle.QueryChaincodeDefinitionArgs();

                arg.setName('myContract');

                buildRequest = {
                    fcn: 'QueryChaincodeDefinition',
                    args: [arg.toBuffer()]
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

            it('should get the committed smart contract', async () => {
                const encodedResult: protos.lifecycle.QueryChaincodeDefinitionsResult = protos.lifecycle.QueryChaincodeDefinitionResult.encode({
                    sequence: 1,
                    version: '0.0.1',
                    init_required: false,
                    endorsement_plugin: 'escc',
                    validation_plugin: 'vscc',
                    validation_parameter: Buffer.from(JSON.stringify({})),
                    collections: {},
                    approvals: {'Org1MSP': true, 'Org2MSP': true}
                });

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

                const encodedResult: protos.lifecycle.QueryChaincodeDefinitionsResult = protos.lifecycle.QueryChaincodeDefinitionResult.encode({
                    sequence: 1,
                    version: '0.0.1',
                    init_required: false,
                    endorsement_plugin: 'escc',
                    validation_plugin: 'vscc',
                    validation_parameter: Buffer.from(JSON.stringify({})),
                    collections: {},
                    approvals: {'Org1MSP': true, 'Org2MSP': true}
                });

                endorsementSendStub.resolves({
                    responses: [{
                        response: {
                            status: 200,
                            payload: encodedResult
                        }
                    }]
                });

                const result: DefinedSmartContract = await channel.getCommittedSmartContract('myPeer', 'myContract', 1234);

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
                    requestTimeout: 1234
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
                endorsementSendStub.rejects({message: 'some error'});

                await channel.getCommittedSmartContract('myPeer', 'mySmartContract').should.eventually.be.rejectedWith('Could not get smart contract definition, received error: some error');
            });
        });

        describe('getEndorsementPolicyBytes', () => {
            it('should get the buffer of the endorsment policy using AND', () => {
                const policyString: string = `AND('org1.member', 'org2.member')`;

                const policy: EndorsementPolicy = new EndorsementPolicy();

                const policyResult: protos.common.SignaturePolicyEnvelope = policy.buildPolicy(policyString);

                const applicationPolicy: protos.common.ApplicationPolicy = new protos.common.ApplicationPolicy();

                applicationPolicy.setSignaturePolicy(policyResult);

                const policyBuffer: Buffer = applicationPolicy.toBuffer();

                const result: Buffer = LifecycleChannel.getEndorsementPolicyBytes(policyString);

                result.should.deep.equal(policyBuffer);
            });

            it('should get the buffer of the endorsment policy when using OR', () => {
                const policyString: string = `OR('org1.member', 'org2.member')`;

                const policy: EndorsementPolicy = new EndorsementPolicy();

                const policyResult: protos.common.SignaturePolicyEnvelope = policy.buildPolicy(policyString);

                const applicationPolicy: protos.common.ApplicationPolicy = new protos.common.ApplicationPolicy();

                applicationPolicy.setSignaturePolicy(policyResult);

                const policyBuffer: Buffer = applicationPolicy.toBuffer();

                const result: Buffer = LifecycleChannel.getEndorsementPolicyBytes(policyString);

                result.should.deep.equal(policyBuffer);
            });

            it('should get the buffer of the endorsment policy when using outOf', () => {
                const policyString: string = `OutOf(1, 'org1.member', 'org2.member')`;

                const policy: EndorsementPolicy = new EndorsementPolicy();

                const policyResult: protos.common.SignaturePolicyEnvelope = policy.buildPolicy(policyString);

                const applicationPolicy: protos.common.ApplicationPolicy = new protos.common.ApplicationPolicy();

                applicationPolicy.setSignaturePolicy(policyResult);

                const policyBuffer: Buffer = applicationPolicy.toBuffer();

                const result: Buffer = LifecycleChannel.getEndorsementPolicyBytes(policyString);

                result.should.deep.equal(policyBuffer);
            });

            it('should get the buffer of the endorsment policy when using channel reference', () => {
                const policyString: string = `myPolicyReference`;

                const applicationPolicy: protos.common.ApplicationPolicy = new protos.common.ApplicationPolicy();

                applicationPolicy.setChannelConfigPolicyReference(policyString);

                const policyBuffer: Buffer = applicationPolicy.toBuffer();

                const result: Buffer = LifecycleChannel.getEndorsementPolicyBytes(policyString);

                result.should.deep.equal(policyBuffer);
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
                const actualResult: protos.common.CollectionConfigPackage = LifecycleChannel.getCollectionConfig([collection]);

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
                const actualResult: protos.common.CollectionConfigPackage = LifecycleChannel.getCollectionConfig([collection], true);

                actualResult.should.deep.equal(expectedResult.toBuffer());
            });
        });
    });
});
