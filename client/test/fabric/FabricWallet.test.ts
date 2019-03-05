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

import { FabricWallet } from '../../src/fabric/FabricWallet';
import * as sinon from 'sinon';
import { FileSystemWallet, X509WalletMixin, Identity } from 'fabric-network';

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
            const wallet: FabricWallet = new FabricWallet('connectionName', 'path');
            importStub.resolves();
            const createIdentityStub: sinon.SinonStub = mySandBox.stub(X509WalletMixin, 'createIdentity').returns({hello: 'world'});

            await wallet.importIdentity('---CERT---', '---KEY---', 'identity1', 'myMSP');

            createIdentityStub.should.have.been.calledOnceWithExactly('myMSP', '---CERT---', '---KEY---');
            importStub.should.have.been.calledOnceWithExactly('identity1', {hello: 'world'});
        });
    });

    describe('getWalletPath', () => {

        it('should get wallet path', async () => {
            const wallet: FabricWallet = new FabricWallet('connectionName', '/some/path');

            const result: string = wallet.getWalletPath();
            result.should.equal('/some/path');
        });
    });

    describe('getIdentityNames', () => {

        it('should import identity', async () => {
            const wallet: FabricWallet = new FabricWallet('connectionName', 'path');
            mySandBox.stub(wallet, 'list').resolves([
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
});
