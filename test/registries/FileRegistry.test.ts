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

import { RegistryEntry } from '../../extension/registries/RegistryEntry';

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { TestUtil } from '../TestUtil';
import { FileRegistry } from '../../extension/registries/FileRegistry';
import { SettingConfigurations } from '../../SettingConfigurations';
import { FileSystemUtil } from '../../extension/util/FileSystemUtil';

chai.should();
chai.use(chaiAsPromised);

// tslint:disable no-unused-expression
describe('FileRegistry', () => {

    const testFabricRegistryName: string = 'test';

    // tslint:disable max-classes-per-file
    class TestFabricRegistryEntry extends RegistryEntry {
        public myValue: string;

        constructor(fields?: TestFabricRegistryEntry) {
            super();
            Object.assign(this, fields);
        }
    }

    // tslint:disable max-classes-per-file
    class TestFabricRegistry extends FileRegistry<TestFabricRegistryEntry> {

        constructor() {
            super(testFabricRegistryName);
        }

    }

    let registry: TestFabricRegistry;

    before(async () => {
        await TestUtil.setupTests();
        registry = new TestFabricRegistry();
    });

    after(async () => {
        await TestUtil.restoreAll();
    });

    beforeEach(async () => {
        await registry.clear();
    });

    describe('#getAll', () => {
        it('should get no entries if the configuration is empty', async () => {
            const testEntries: TestFabricRegistryEntry[] = [];
            await registry.clear();
            await registry.getAll().should.eventually.deep.equal(testEntries);
        });

        it('should get all entries if the configuration is not empty', async () => {
            const testA: TestFabricRegistryEntry = new TestFabricRegistryEntry({ name: 'foo1', myValue: 'value1' });
            const testB: TestFabricRegistryEntry = new TestFabricRegistryEntry({ name: 'foo2', myValue: 'value2' });

            await registry.add(testA);
            await registry.add(testB);
            const testEntries: TestFabricRegistryEntry[] = [testA, testB];

            await registry.getAll().should.eventually.deep.equal(testEntries);
        });

        it('should get all entries if the configuration is not empty', async () => {
            const testA: TestFabricRegistryEntry = new TestFabricRegistryEntry({ name: 'foo1', myValue: 'value1' });
            const testB: TestFabricRegistryEntry = new TestFabricRegistryEntry({ name: 'foo2', myValue: 'value2' });

            await registry.add(testA);
            await registry.add(testB);
            const testEntries: TestFabricRegistryEntry[] = [testA, testB];

            await registry.getAll().should.eventually.deep.equal(testEntries);
        });

        it('should ignore entries without a config file', async () => {
            const extDir: string = vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_DIRECTORY);
            const homeExtDir: string = FileSystemUtil.getDirPath(extDir);
            const registryPath: string = path.join(homeExtDir, testFabricRegistryName, 'test');
            await fs.ensureDir(registryPath);

            const testA: TestFabricRegistryEntry = new TestFabricRegistryEntry({ name: 'foo1', myValue: 'value1' });
            const testB: TestFabricRegistryEntry = new TestFabricRegistryEntry({ name: 'foo2', myValue: 'value2' });

            await registry.add(testA);
            await registry.add(testB);
            const testEntries: TestFabricRegistryEntry[] = [testA, testB];

            await registry.getAll().should.eventually.deep.equal(testEntries);
        });
    });

    describe('#get', () => {
        it('should get an entry if the entry exists in the configuration', async () => {
            const testA: TestFabricRegistryEntry = new TestFabricRegistryEntry({ name: 'foo1', myValue: 'value1' });
            const testB: TestFabricRegistryEntry = new TestFabricRegistryEntry({ name: 'foo2', myValue: 'value2' });

            await registry.add(testA);
            await registry.add(testB);
            const testEntries: TestFabricRegistryEntry[] = [testA, testB];

            await registry.get('foo2').should.eventually.deep.equal(testEntries[1]);
        });

        it('should throw if an entry does not exist in the configuration', async () => {
            const testA: TestFabricRegistryEntry = new TestFabricRegistryEntry({ name: 'foo1', myValue: 'value1' });
            const testB: TestFabricRegistryEntry = new TestFabricRegistryEntry({ name: 'foo2', myValue: 'value2' });

            await registry.add(testA);
            await registry.add(testB);

            await registry.get('foo0').should.eventually.be.rejectedWith(`Entry "foo0" in registry "${testFabricRegistryName}" does not exist`);
        });
    });

    describe('#exists', () => {
        it('should return true if the entry exists in the configuration', async () => {
            const testA: TestFabricRegistryEntry = new TestFabricRegistryEntry({ name: 'foo1', myValue: 'value1' });
            const testB: TestFabricRegistryEntry = new TestFabricRegistryEntry({ name: 'foo2', myValue: 'value2' });

            await registry.add(testA);
            await registry.add(testB);

            await registry.exists('foo2').should.eventually.be.true;
        });

        it('should return false if an entry does not exist in the configuration', async () => {
            const testA: TestFabricRegistryEntry = new TestFabricRegistryEntry({ name: 'foo1', myValue: 'value1' });
            const testB: TestFabricRegistryEntry = new TestFabricRegistryEntry({ name: 'foo2', myValue: 'value2' });

            await registry.add(testA);
            await registry.add(testB);

            await registry.exists('foo0').should.eventually.be.false;
        });
    });

    describe('#add', () => {
        it('should throw if an entry does exist in the configuration', async () => {
            const testA: TestFabricRegistryEntry = new TestFabricRegistryEntry({ name: 'foo1', myValue: 'value1' });
            const testB: TestFabricRegistryEntry = new TestFabricRegistryEntry({ name: 'foo2', myValue: 'value2' });

            await registry.add(testA);
            await registry.add(testB);

            await registry.add(testA).should.eventually.be.rejectedWith(`Entry "foo1" in registry "${testFabricRegistryName}" already exists`);
        });

        it('should add an entry if the entry does not exist in the configuration', async () => {
            const testA: TestFabricRegistryEntry = new TestFabricRegistryEntry({ name: 'foo1', myValue: 'value1' });
            const testB: TestFabricRegistryEntry = new TestFabricRegistryEntry({ name: 'foo2', myValue: 'value2' });

            await registry.add(testA);
            await registry.add(testB);

            await registry.getAll().should.eventually.deep.equal([testA, testB]);

            const newEntry: TestFabricRegistryEntry = { name: 'foo0', myValue: 'value0' };
            await registry.add(newEntry);

            await registry.getAll().should.eventually.deep.equal([newEntry, testA, testB]);
        });

    });

    describe('#update', () => {

        it('should throw if an entry does not exist in the configuration', async () => {
            const testA: TestFabricRegistryEntry = new TestFabricRegistryEntry({ name: 'foo1', myValue: 'value1' });
            const testB: TestFabricRegistryEntry = new TestFabricRegistryEntry({ name: 'foo2', myValue: 'value2' });

            await registry.add(testA);
            await registry.add(testB);

            const newEntry: TestFabricRegistryEntry = { name: 'foo0', myValue: 'value0' };
            await registry.update(newEntry).should.be.rejectedWith(`Entry "foo0" in registry "${testFabricRegistryName}" does not exist`);
        });

        it('should update an entry if the entry exists in the configuration', async () => {
            const testA: TestFabricRegistryEntry = new TestFabricRegistryEntry({ name: 'foo1', myValue: 'value1' });
            const testB: TestFabricRegistryEntry = new TestFabricRegistryEntry({ name: 'foo2', myValue: 'value2' });

            await registry.add(testA);
            await registry.add(testB);

            const newEntry: TestFabricRegistryEntry = { name: 'foo2', myValue: 'value2+1' };
            await registry.update(newEntry);

            await registry.get('foo2').should.eventually.deep.equal(newEntry);
        });
    });

    describe('#delete', () => {

        it('should throw if an entry does not exist in the configuration', async () => {
            const testA: TestFabricRegistryEntry = new TestFabricRegistryEntry({ name: 'foo1', myValue: 'value1' });
            const testB: TestFabricRegistryEntry = new TestFabricRegistryEntry({ name: 'foo2', myValue: 'value2' });

            await registry.add(testA);
            await registry.add(testB);

            await registry.delete('foo0').should.be.rejectedWith(`Entry "foo0" in registry "${testFabricRegistryName}" does not exist`);
        });

        it('should delete an entry if the entry exists in the configuration', async () => {
            const testA: TestFabricRegistryEntry = new TestFabricRegistryEntry({ name: 'foo1', myValue: 'value1' });
            const testB: TestFabricRegistryEntry = new TestFabricRegistryEntry({ name: 'foo2', myValue: 'value2' });

            await registry.add(testA);
            await registry.add(testB);

            await registry.delete('foo2');
            await registry.getAll().should.eventually.deep.equal([testA]);
        });
    });

    describe('#clear', () => {

        it('should delete all entries from the configuration', async () => {
            const testA: TestFabricRegistryEntry = new TestFabricRegistryEntry({ name: 'foo1', myValue: 'value1' });
            const testB: TestFabricRegistryEntry = new TestFabricRegistryEntry({ name: 'foo2', myValue: 'value2' });

            await registry.add(testA);
            await registry.add(testB);

            await registry.clear();
            await registry.getAll().should.eventually.deep.equal([]);
        });
    });
});
