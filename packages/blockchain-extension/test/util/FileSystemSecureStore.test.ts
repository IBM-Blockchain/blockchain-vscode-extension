
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

import { FileSystemSecureStore } from '../../extension/util/FileSystemSecureStore';
import * as chai from 'chai';
import * as fs from 'fs-extra';
import * as tmp from 'tmp';
import * as chaiAsPromised from 'chai-as-promised';

chai.should();
chai.use(chaiAsPromised);

describe('FileSystemSecureStore', () => {

    let path: string;
    let store: FileSystemSecureStore;

    beforeEach(() => {
        path = tmp.tmpNameSync();
        store = new FileSystemSecureStore(path);
    });

    afterEach(async () => {
        await fs.remove(path);
    });

    async function writeStore(contents: any): Promise<void> {
        const data: string = Buffer.from(JSON.stringify(contents), 'utf8').toString('base64');
        await fs.writeFile(path, data, { encoding: 'utf8', mode: 0o600 });
    }

    async function readStore(): Promise<any> {
        const data: string = await fs.readFile(path, 'utf8');
        return JSON.parse(Buffer.from(data, 'base64').toString('utf8'));
    }

    describe('#getPassword', () => {

        it('should get the password', async () => {
            await writeStore({
                mysvc: {
                    myacct: 'topsecret'
                }
            });
            await store.getPassword('mysvc', 'myacct').should.eventually.equal('topsecret');
        });

        it('should return null if the account does not exist', async () => {
            await writeStore({
                mysvc: {}
            });
            await store.getPassword('mysvc', 'myacct').should.eventually.be.null;
        });

        it('should return null if the service does not exist', async () => {
            await writeStore({});
            await store.getPassword('mysvc', 'myacct').should.eventually.be.null;
        });

    });

    describe('#setPassword', () => {

        it('should set the password if the account does not exist', async () => {
            await store.setPassword('mysvc', 'myacct', 'topsecret').should.eventually.be.fulfilled;
            await readStore().should.eventually.deep.equal({
                mysvc: {
                    myacct: 'topsecret'
                }
            });
        });

        it('should set the password if the account already exists', async () => {
            await writeStore({
                mysvc: {
                    myacct: 'suchpass'
                }
            });
            await store.setPassword('mysvc', 'myacct', 'topsecret').should.eventually.be.fulfilled;
            await readStore().should.eventually.deep.equal({
                mysvc: {
                    myacct: 'topsecret'
                }
            });
        });

    });

    describe('#deletePassword', () => {

        it('should delete the password', async () => {
            await writeStore({
                mysvc: {
                    myacct: 'topsecret'
                }
            });
            await store.deletePassword('mysvc', 'myacct').should.eventually.be.true;
            await readStore().should.eventually.deep.equal({
                mysvc: {}
            });
        });

        it('should not delete the password if the account does not exist', async () => {
            await writeStore({
                mysvc: {}
            });
            await store.deletePassword('mysvc', 'myacct').should.eventually.be.false;
            await readStore().should.eventually.deep.equal({
                mysvc: {}
            });
        });

        it('should delete the password if the service does not exist', async () => {
            await writeStore({});
            await store.deletePassword('mysvc', 'myacct').should.eventually.be.false;
            await readStore().should.eventually.deep.equal({});
        });

    });

    describe('#findCredentials', () => {

        it('should return all of credentials', async () => {
            await writeStore({
                mysvc: {
                    myacct: 'topsecret'
                }
            });
            await store.findCredentials('mysvc').should.eventually.deep.equal([{
                account: 'myacct',
                password: 'topsecret'
            }]);
        });

        it('should return an empty array if the service does not exist', async () => {
            await writeStore({});
            await store.findCredentials('mysvc').should.eventually.deep.equal([]);
        });

    });

    describe('#findPassword', () => {

        it('should throw an error as it is not supported', async () => {
            await store.findPassword('mysvc').should.eventually.be.rejectedWith(/Operation not supported/);
        });

    });

});
