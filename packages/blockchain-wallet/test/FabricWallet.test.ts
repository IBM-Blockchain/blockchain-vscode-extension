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

import { FabricWallet } from '../src/FabricWallet';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { Wallet } from 'fabric-network';
import { FabricIdentity } from 'ibm-blockchain-platform-common';
import * as WalletMigration from 'fabric-wallet-migration';

chai.use(chaiAsPromised);
chai.use(sinonChai);

const should: Chai.Should = chai.should();

describe('FabricWallet', () => {
    let mySandBox: sinon.SinonSandbox;
    let putStub: sinon.SinonStub;
    let removeStub: sinon.SinonStub;
    let getStub: sinon.SinonStub;
    let listStub: sinon.SinonStub;
    let newFileSystemWalletStoreStub: sinon.SinonStub;

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
        putStub = mySandBox.stub(Wallet.prototype, 'put');
        removeStub = mySandBox.stub(Wallet.prototype, 'remove');
        getStub = mySandBox.stub(Wallet.prototype, 'get');
        listStub = mySandBox.stub(Wallet.prototype, 'list');
        newFileSystemWalletStoreStub = mySandBox.stub(WalletMigration, 'newFileSystemWalletStore').resolves({});
    });

    afterEach(() => {
        mySandBox.restore();
    });

    describe('importIdentity', () => {

        it('should import identity', async () => {
            const wallet: FabricWallet = await FabricWallet.newFabricWallet('tmp/path');
            putStub.resolves();

            await wallet.importIdentity('---CERT---', '---KEY---', 'identity1', 'myMSP');

            putStub.should.have.been.calledOnceWithExactly('identity1', {
                credentials: {
                    certificate: '---CERT---',
                    privateKey: '---KEY---',
                },
                mspId: 'myMSP',
                type: 'X.509',
            });
        });
    });

    describe('removeIdentity', () => {
        it('should remove identity', async () => {
            const wallet: FabricWallet = await FabricWallet.newFabricWallet('tmp/path');
            removeStub.resolves();

            await wallet.removeIdentity('identity1');

            removeStub.should.have.been.calledOnceWithExactly('identity1');
        });
    });

    describe('getWalletPath', () => {

        it('should get wallet path', async () => {
            const wallet: FabricWallet = await FabricWallet.newFabricWallet('tmp/myPath');

            const result: string = wallet.getWalletPath();
            result.should.equal('tmp/myPath');
        });
    });

    describe('getWallet', () => {

        it('should get wallet', async () => {
            const wallet: FabricWallet = await FabricWallet.newFabricWallet('tmp/myPath');

            const result: Wallet = wallet.getWallet();
            should.exist(result);
        });
    });

    describe('getIdentityNames', () => {
        it('should get the identity names', async () => {
            const wallet: FabricWallet = await FabricWallet.newFabricWallet('tmp/path');
            listStub.resolves(['label1', 'label2', 'label3']);

            const identityNames: string[] = await wallet.getIdentityNames();
            identityNames.should.deep.equal(['label1', 'label2', 'label3']);
        });
    });

    describe('#getIDs', () => {

        it('should return all requested identities in wallet as an array of Fabric Identities', async () => {
            const wallet: FabricWallet = await FabricWallet.newFabricWallet('tmp/myPath');

            getStub.onFirstCall().resolves({
                credentials: {
                    certificate: 'myCert',
                    privateKey: 'myKey',
                },
                mspId: 'myMSP',
                type: 'X.509',
            });

            getStub.onSecondCall().resolves({
                credentials: {
                    certificate: 'myCert2',
                    privateKey: 'myKey2',
                },
                mspId: 'myMSP2',
                type: 'X.509',
            });

            const allIDs: FabricIdentity[] = [
                {
                    name: 'identity_a',
                    cert: Buffer.from('myCert').toString('base64'),
                    private_key: Buffer.from('myKey').toString('base64'),
                    msp_id: 'myMSP'
                },
                {
                    name: 'identity_b',
                    cert: Buffer.from('myCert2').toString('base64'),
                    private_key: Buffer.from('myKey2').toString('base64'),
                    msp_id: 'myMSP2'
                }
            ];

            const identities: FabricIdentity[] = await wallet.getIDs(['identity_a', 'identity_b']);

            identities.should.deep.equal(allIDs);
        });
    });

    describe('#getIdentities', () => {

        it('should return any identities', async () => {
            const wallet: FabricWallet = await FabricWallet.newFabricWallet('tmp/myPath');
            listStub.resolves(['label1', 'label2', 'label3']);

            getStub.onFirstCall().resolves({
                credentials: {
                    certificate: 'myCert',
                    privateKey: 'myKey',
                },
                mspId: 'myMSP',
                type: 'X.509',
            });

            getStub.onSecondCall().resolves({
                credentials: {
                    certificate: 'myCert2',
                    privateKey: 'myKey2',
                },
                mspId: 'myMSP2',
                type: 'X.509',
            });

            getStub.onThirdCall().resolves({
                credentials: {
                    certificate: 'myCert3',
                    privateKey: 'myKey3',
                },
                mspId: 'myMSP3',
                type: 'X.509',
            });

            const identityOne: FabricIdentity = {
                cert: 'myCert',
                private_key: 'myKey',
                msp_id: 'myMSP',
                name: 'label1'
            };

            const identityTwo: FabricIdentity = {
                cert: 'myCert2',
                private_key: 'myKey2',
                msp_id: 'myMSP2',
                name: 'label2'
            };

            const identityThree: FabricIdentity = {
                cert: 'myCert3',
                private_key: 'myKey3',
                msp_id: 'myMSP3',
                name: 'label3'
            };

            const identities: FabricIdentity[] = await wallet.getIdentities();

            identities.should.deep.equal([identityOne, identityTwo, identityThree]);
        });
    });

    describe('#getIdentity', () => {
        it('should get the wanted identity', async () => {
            const wallet: FabricWallet = await FabricWallet.newFabricWallet('tmp/myPath');

            getStub.resolves({
                credentials: {
                    certificate: 'myCert',
                    privateKey: 'myKey',
                },
                mspId: 'myMSP',
                type: 'X.509',
            });

            const identityOne: FabricIdentity = {
                cert: 'myCert',
                private_key: 'myKey',
                msp_id: 'myMSP',
                name: 'label1'
            };

            const identity: FabricIdentity = await wallet.getIdentity('label1');

            identity.should.deep.equal(identityOne);
        });
    });

    describe('#exists', () => {
        it('should return true if the identity exists', async () => {
            const wallet: FabricWallet = await FabricWallet.newFabricWallet('tmp/myPath');
            getStub.resolves({
                credentials: {
                    certificate: 'myCert',
                    privateKey: 'myKey',
                },
                mspId: 'myMSP',
                type: 'X.509',
            });

            const exists: boolean = await wallet.exists('label1');
            exists.should.equal(true);
        });

        it('should return false if the identity does not exists', async () => {
            const wallet: FabricWallet = await FabricWallet.newFabricWallet('tmp/myPath');
            getStub.resolves(undefined);

            const exists: boolean = await wallet.exists('label1');
            exists.should.equal(false);
        });
    });

    describe('migrateToV2Wallet', () => {

        it('should write v2 identity file if v1 identities found', async () => {
            const wallet: FabricWallet = await FabricWallet.newFabricWallet('tmp/myPath');
            listStub.resolves(['identity1']);
            getStub.resolves(
                {
                    credentials: {
                        certificate: '---CERT---',
                        privateKey: '---KEY---',
                    },
                    mspId: 'myMSP',
                    type: 'X.509',
                }
            );
            putStub.resolves();

            await wallet.migrateToV2Wallet();

            newFileSystemWalletStoreStub.should.have.been.calledOnceWithExactly('tmp/myPath');
            listStub.should.have.been.calledOnceWithExactly();
            getStub.should.have.been.calledOnceWithExactly('identity1');
            putStub.should.have.been.calledOnceWithExactly('identity1', {
                credentials: {
                    certificate: '---CERT---',
                    privateKey: '---KEY---',
                },
                mspId: 'myMSP',
                type: 'X.509',
            });

        });

        it('should not write v2 identity file if no v1 identities found', async () => {
            const wallet: FabricWallet = await FabricWallet.newFabricWallet('tmp/myPath');
            listStub.resolves(['identity1']);
            getStub.resolves();

            await wallet.migrateToV2Wallet();

            newFileSystemWalletStoreStub.should.have.been.calledOnceWithExactly('tmp/myPath');
            listStub.should.have.been.calledOnceWithExactly();
            getStub.should.have.been.calledOnceWithExactly('identity1');
            // tslint:disable-next-line: no-unused-expression
            putStub.should.have.not.been.called;

        });
    });
});
