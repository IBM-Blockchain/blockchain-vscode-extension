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

import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { RepositoryRegistry } from '../../extension/registries/RepositoryRegistry';
import { TestUtil } from '../TestUtil';
import { RepositoryRegistryEntry } from '../../extension/registries/RepositoryRegistryEntry';

chai.use(chaiAsPromised);

// tslint:disable no-unused-expression
describe('RepositoryRegistry', () => {

    before(async () => {
        await TestUtil.setupTests();
    });

    let registry: RepositoryRegistry;

    beforeEach(async () => {
        registry = RepositoryRegistry.instance();
        await registry.clear();
    });

    describe('#get', () => {
        it('should get an entry if the entry exists in the configuration', async () => {
            const testEntries: { name: string, path: string }[] = [{ name: 'SampleOne', path: 'PathOne' }, { name: 'SampleTwo', path: 'PathTwo' }];
            for (const entry of testEntries) {
                await registry.add(entry);
            }
            await registry.get('SampleTwo').should.eventually.deep.equal(testEntries[1]);
        });

        it('should throw if an entry does not exist in the configuration', async () => {
            const testEntries: { name: string, path: string }[] = [{ name: 'SampleOne', path: 'PathOne' }, { name: 'SampleTwo', path: 'PathTwo' }];

            for (const entry of testEntries) {
                await registry.add(entry);
            }

            await registry.get('SampleZero').should.eventually.be.rejectedWith('Entry "SampleZero" in registry "repositories" does not exist');
        });

    });

    describe('#exists', () => {
        it('should return true if the entry exists in the configuration', async () => {
            const testEntries: { name: string, path: string }[] = [{ name: 'SampleOne', path: 'PathOne' }, { name: 'SampleTwo', path: 'PathTwo' }];
            for (const entry of testEntries) {
                await registry.add(entry);
            }
            await registry.exists('SampleTwo').should.eventually.be.true;
        });

        it('should return false if an entry does not exist in the configuration', async () => {
            const testEntries: { name: string, path: string }[] = [{ name: 'SampleOne', path: 'PathOne' }, { name: 'SampleTwo', path: 'PathTwo' }];
            for (const entry of testEntries) {
                await registry.add(entry);
            }
            await registry.exists('SampleZero').should.eventually.be.false;
        });

    });

    describe('#add', () => {
        it('should throw if an entry does exist in the configuration', async () => {
            const testEntries: { name: string, path: string }[] = [{ name: 'SampleOne', path: 'PathOne' }, { name: 'SampleTwo', path: 'PathTwo' }];
            for (const entry of testEntries) {
                await registry.add(entry);
            }
            await registry.add(testEntries[0]).should.be.rejectedWith('Entry "SampleOne" in registry "repositories" already exists');
        });

        it('should add an entry if the entry does not exist in the configuration', async () => {
            const testEntries: { name: string, path: string }[] = [{ name: 'SampleOne', path: 'PathOne' }, { name: 'SampleTwo', path: 'PathTwo' }];
            for (const entry of testEntries) {
                await registry.add(entry);
            }
            const newEntry: { name: string, path: string } = { name: 'SampleZero', path: 'PathZero' };
            await registry.add(newEntry);

            const results: RepositoryRegistryEntry[] = await registry.getAll();
            results.should.deep.equal([testEntries[0], testEntries[1], newEntry]);
        });

    });

    describe('#update', () => {
        it('should throw if an entry does not exist in the configuration', async () => {
            const testEntries: { name: string, path: string }[] = [{ name: 'SampleOne', path: 'PathOne' }, { name: 'SampleTwo', path: 'PathTwo' }];
            for (const entry of testEntries) {
                await registry.add(entry);
            }
            const newEntry: { name: string, path: string } = { name: 'SampleZero', path: 'PathZero' };
            await registry.update(newEntry).should.eventually.be.rejectedWith('Entry "SampleZero" in registry "repositories" does not exist');
        });

        it('should update an entry if the entry exists in the configuration', async () => {
            const testEntries: { name: string, path: string }[] = [{ name: 'SampleOne', path: 'PathOne' }, { name: 'SampleTwo', path: 'PathTwo' }];
            for (const entry of testEntries) {
                await registry.add(entry);
            }
            const newEntry: { name: string, path: string } = { name: 'SampleTwo', path: 'PathTwoPlusOne' };
            await registry.update(newEntry);
            const results: RepositoryRegistryEntry[] = await registry.getAll();
            results.should.deep.equal([testEntries[0],  newEntry]);
        });

    });

    describe('#delete', () => {
        it('should throw if an entry does not exist in the configuration', async () => {
            const testEntries: { name: string, path: string }[] = [{ name: 'SampleOne', path: 'PathOne' }, { name: 'SampleTwo', path: 'PathTwo' }];
            for (const entry of testEntries) {
                await registry.add(entry);
            }
            await registry.delete('SampleZero').should.be.rejectedWith('Entry "SampleZero" in registry "repositories" does not exist');
        });

        it('should delete an entry if the entry exists in the configuration', async () => {
            const testEntries: { name: string, path: string }[] = [{ name: 'SampleOne', path: 'PathOne' }, { name: 'SampleTwo', path: 'PathTwo' }];
            for (const entry of testEntries) {
                await registry.add(entry);
            }
            await registry.delete('SampleTwo');
            const results: RepositoryRegistryEntry[] = await registry.getAll();
            results.should.deep.equal([testEntries[0]]);
        });
    });
});
