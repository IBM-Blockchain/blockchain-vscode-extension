
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

import { KeytarSecureStore } from '../../extension/util/KeytarSecureStore';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';

chai.should();
chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('KeytarSecureStore', () => {

    let store: KeytarSecureStore;
    let mockKeytar: any;
    let getPasswordStub: sinon.SinonStub;
    let setPasswordStub: sinon.SinonStub;
    let deletePasswordStub: sinon.SinonStub;
    let findCredentialsStub: sinon.SinonStub;

    beforeEach(() => {
        getPasswordStub = sinon.stub();
        setPasswordStub = sinon.stub();
        deletePasswordStub = sinon.stub();
        findCredentialsStub = sinon.stub();
        mockKeytar = {
            getPassword: getPasswordStub,
            setPassword: setPasswordStub,
            deletePassword: deletePasswordStub,
            findCredentials: findCredentialsStub
        };
        store = new KeytarSecureStore(mockKeytar);
    });

    describe('#getPassword', () => {

        it('should get the password', async () => {
            getPasswordStub.withArgs('mysvc', 'myacct').resolves('topsecret');
            await store.getPassword('mysvc', 'myacct').should.eventually.equal('topsecret');
        });

    });

    describe('#setPassword', () => {

        it('should set the password', async () => {
            await store.setPassword('mysvc', 'myacct', 'topsecret').should.eventually.be.fulfilled;
            setPasswordStub.should.have.been.calledOnceWithExactly('mysvc', 'myacct', 'topsecret');
        });

    });

    describe('#deletePassword', () => {

        it('should delete the password', async () => {
            await store.deletePassword('mysvc', 'myacct').should.eventually.be.fulfilled;
            deletePasswordStub.should.have.been.calledOnceWithExactly('mysvc', 'myacct');
        });

    });

    describe('#findCredentials', () => {

        it('should delete the password', async () => {
            findCredentialsStub.withArgs('mysvc').resolves([{
                account: 'myacct',
                password: 'topsecret'
            }]);
            await store.findCredentials('mysvc').should.eventually.deep.equal([{
                account: 'myacct',
                password: 'topsecret'
            }]);
        });

    });

    describe('#findPassword', () => {

        it('should throw an error as it is not supported', async () => {
            await store.findPassword('mysvc').should.eventually.be.rejectedWith(/Operation not supported/);
        });

    });

});
