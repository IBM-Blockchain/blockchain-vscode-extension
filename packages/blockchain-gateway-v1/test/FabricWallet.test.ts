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

import * as fs from 'fs-extra';
import * as path from 'path';
import { FabricWallet } from '../src/FabricWallet';
import * as sinon from 'sinon';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { FileSystemWallet, X509WalletMixin } from 'fabric-network';
import { FabricIdentity, IFabricWallet} from 'ibm-blockchain-platform-common';

chai.use(chaiAsPromised);

describe('FabricWallet', () => {
    let mySandBox: sinon.SinonSandbox;
    let importStub: sinon.SinonStub;
    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
        importStub = mySandBox.stub(FileSystemWallet.prototype, 'import');
    });

    afterEach(() => {
        mySandBox.restore();
    });

    describe('importIdentity', () => {

        it('should import identity', async () => {
            const wallet: FabricWallet = new FabricWallet('path');
            importStub.resolves();
            const createIdentityStub: sinon.SinonStub = mySandBox.stub(X509WalletMixin, 'createIdentity').returns({hello: 'world'});

            await wallet.importIdentity('---CERT---', '---KEY---', 'identity1', 'myMSP');

            createIdentityStub.should.have.been.calledOnceWithExactly('myMSP', '---CERT---', '---KEY---');
            importStub.should.have.been.calledOnceWithExactly('identity1', {hello: 'world'});
        });
    });

    describe('getWalletPath', () => {

        it('should get wallet path', async () => {
            const wallet: FabricWallet = new FabricWallet('/some/path');

            const result: string = wallet.getWalletPath();
            result.should.equal('/some/path');
        });
    });

    describe('getIdentityNames', () => {

        it('should import identity', async () => {
            const wallet: FabricWallet = new FabricWallet('path');
            mySandBox.stub(FileSystemWallet.prototype, 'list').resolves([
                {
                    some: 'thing',
                    label: 'label1'
                },
                {
                    some: 'thing',
                    label: 'label2'
                },
                {
                    some: 'thing',
                    label: 'label3'
                }
            ]);

            const identityNames: string[] = await wallet.getIdentityNames();
            identityNames.should.deep.equal(['label1', 'label2', 'label3']);
        });
    });

    describe('#getIdentities', () => {

        it('should return any identities', async () => {
            const wallet: IFabricWallet = new FabricWallet('/some/path');
            mySandBox.stub(FabricWallet.prototype, 'getWalletPath').returns('/some/path');
            const readdirStub: sinon.SinonStub = mySandBox.stub(fs, 'readdir').resolves(['/dir/identity_a', '/dir/identity_b', '/dir/identity_c']);
            const basenameSpy: sinon.SinonSpy = mySandBox.spy(path, 'basename');
            const resolveSpy: sinon.SinonSpy = mySandBox.spy(path, 'resolve');
            const readJsonStub: sinon.SinonStub = mySandBox.stub(fs, 'readJson');

            const identityOne: FabricIdentity = {
                affiliation: '',
                enrollment: {},
                enrollmentSecret: '',
                mspid: 'Org1MSP',
                name: 'identity_a',
                roles: null
            } as unknown as FabricIdentity;

            const identityTwo: FabricIdentity = {
                affiliation: '',
                enrollment: {},
                enrollmentSecret: '',
                mspid: 'Org1MSP',
                name: 'identity_b',
                roles: null
            } as unknown as FabricIdentity;

            const identityThree: FabricIdentity = {
                affiliation: '',
                enrollment: {},
                enrollmentSecret: '',
                mspid: 'Org1MSP',
                name: 'identity_c',
                roles: null
            } as unknown as FabricIdentity;

            readJsonStub.onCall(0).resolves(identityOne);
            readJsonStub.onCall(1).resolves(identityTwo);
            readJsonStub.onCall(2).resolves(identityThree);

            const identities: FabricIdentity[] = await wallet.getIdentities();

            basenameSpy.getCall(0).returnValue.should.equal('identity_a');
            basenameSpy.getCall(1).returnValue.should.equal('identity_b');
            basenameSpy.getCall(2).returnValue.should.equal('identity_c');

            resolveSpy.getCall(0).should.have.been.calledWithExactly('/some/path', '/dir/identity_a', 'identity_a');
            resolveSpy.getCall(1).should.have.been.calledWithExactly('/some/path', '/dir/identity_b', 'identity_b');
            resolveSpy.getCall(2).should.have.been.calledWithExactly('/some/path', '/dir/identity_c', 'identity_c');

            readJsonStub.getCall(0).should.have.been.calledWithExactly('/dir/identity_a/identity_a');
            readJsonStub.getCall(1).should.have.been.calledWithExactly('/dir/identity_b/identity_b');
            readJsonStub.getCall(2).should.have.been.calledWithExactly('/dir/identity_c/identity_c');

            readdirStub.should.have.been.calledOnceWithExactly('/some/path');

            identities.should.deep.equal([identityOne, identityTwo, identityThree]);

        });
    });
});
