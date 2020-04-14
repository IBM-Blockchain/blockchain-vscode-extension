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

chai.use(chaiAsPromised);
chai.use(sinonChai);

const should: Chai.Should = chai.should();

describe('FabricWallet', () => {
    let mySandBox: sinon.SinonSandbox;
    let putStub: sinon.SinonStub;
    let removeStub: sinon.SinonStub;

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
        putStub = mySandBox.stub(Wallet.prototype, 'put');
        removeStub = mySandBox.stub(Wallet.prototype, 'remove');
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
            mySandBox.stub(Wallet.prototype, 'list').resolves(['label1', 'label2', 'label3']);

            const identityNames: string[] = await wallet.getIdentityNames();
            identityNames.should.deep.equal(['label1', 'label2', 'label3']);
        });
    });

    describe('#getIdentities', () => {

        it('should return any identities', async () => {
            const wallet: FabricWallet = await FabricWallet.newFabricWallet('tmp/myPath');
            mySandBox.stub(Wallet.prototype, 'list').resolves(['label1', 'label2', 'label3']);
            const getStub: sinon.SinonStub = mySandBox.stub(Wallet.prototype, 'get');

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
            const getStub: sinon.SinonStub = mySandBox.stub(Wallet.prototype, 'get');

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
            mySandBox.stub(Wallet.prototype, 'get').resolves({
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
            mySandBox.stub(Wallet.prototype, 'get').resolves(undefined);

            const exists: boolean = await wallet.exists('label1');
            exists.should.equal(false);
        });
    });
});
