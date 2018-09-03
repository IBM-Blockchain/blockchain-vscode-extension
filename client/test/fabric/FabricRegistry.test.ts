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

import * as vscode from 'vscode';
import { FabricRegistry } from '../../src/fabric/FabricRegistry';
import { FabricRegistryEntry } from '../../src/fabric/FabricRegistryEntry';

import * as chai from 'chai';
import { ExtensionUtil } from '../../src/util/ExtensionUtil';

chai.should();

// tslint:disable no-unused-expression
describe('FabricRegistry', () => {

    const testFabricRegistryName: string = 'fabric.runtimes';

    // tslint:disable max-classes-per-file
    class TestFabricRegistryEntry extends FabricRegistryEntry {
        public myValue: string;
    }

    // tslint:disable max-classes-per-file
    class TestFabricRegistry extends FabricRegistry<TestFabricRegistryEntry> {

        constructor() {
            super(testFabricRegistryName);
        }

    }

    let registry: TestFabricRegistry;

    beforeEach(async () => {
        await ExtensionUtil.activateExtension();
        registry = new TestFabricRegistry();
        await vscode.workspace.getConfiguration().update(testFabricRegistryName, [], vscode.ConfigurationTarget.Global);
    });

    afterEach(async () => {
        await vscode.workspace.getConfiguration().update(testFabricRegistryName, [], vscode.ConfigurationTarget.Global);
    });

    describe('#getAll', () => {

        it('should get no entries if the configuration is empty', async () => {
            const testEntries: TestFabricRegistryEntry[] = [];
            await vscode.workspace.getConfiguration().update(testFabricRegistryName, testEntries, vscode.ConfigurationTarget.Global);
            registry.getAll().should.deep.equal(testEntries);
        });

        it('should get all entries if the configuration is not empty', async () => {
            const testEntries: TestFabricRegistryEntry[] = [{ name: 'foo1', myValue: 'value1' }, { name: 'foo2', myValue: 'value2' }];
            await vscode.workspace.getConfiguration().update(testFabricRegistryName, testEntries, vscode.ConfigurationTarget.Global);
            registry.getAll().should.deep.equal(testEntries);
        });

    });

    describe('#get', () => {

        it('should get an entry if the entry exists in the configuration', async () => {
            const testEntries: TestFabricRegistryEntry[] = [{ name: 'foo1', myValue: 'value1' }, { name: 'foo2', myValue: 'value2' }];
            await vscode.workspace.getConfiguration().update(testFabricRegistryName, testEntries, vscode.ConfigurationTarget.Global);
            registry.get('foo2').should.deep.equal(testEntries[1]);
        });

        it('should throw if an entry does not exist in the configuration', async () => {
            const testEntries: TestFabricRegistryEntry[] = [{ name: 'foo1', myValue: 'value1' }, { name: 'foo2', myValue: 'value2' }];
            await vscode.workspace.getConfiguration().update(testFabricRegistryName, testEntries, vscode.ConfigurationTarget.Global);
            (() => {
                registry.get('foo0');
            }).should.throw(/Entry "foo0" in Fabric registry "fabric.runtimes" does not exist/);
        });

    });

    describe('#exists', () => {

        it('should return true if the entry exists in the configuration', async () => {
            const testEntries: TestFabricRegistryEntry[] = [{ name: 'foo1', myValue: 'value1' }, { name: 'foo2', myValue: 'value2' }];
            await vscode.workspace.getConfiguration().update(testFabricRegistryName, testEntries, vscode.ConfigurationTarget.Global);
            registry.exists('foo2').should.be.true;
        });

        it('should return false if an entry does not exist in the configuration', async () => {
            const testEntries: TestFabricRegistryEntry[] = [{ name: 'foo1', myValue: 'value1' }, { name: 'foo2', myValue: 'value2' }];
            await vscode.workspace.getConfiguration().update(testFabricRegistryName, testEntries, vscode.ConfigurationTarget.Global);
            registry.exists('foo0').should.be.false;
        });

    });

    describe('#add', () => {

        it('should throw if an entry does exist in the configuration', async () => {
            const testEntries: TestFabricRegistryEntry[] = [{ name: 'foo1', myValue: 'value1' }, { name: 'foo2', myValue: 'value2' }];
            await vscode.workspace.getConfiguration().update(testFabricRegistryName, testEntries, vscode.ConfigurationTarget.Global);
            await registry.add(testEntries[0]).should.be.rejectedWith(/Entry "foo1" in Fabric registry "fabric.runtimes" already exists/);
        });

        it('should add an entry if the entry does not exist in the configuration', async () => {
            const testEntries: TestFabricRegistryEntry[] = [{ name: 'foo1', myValue: 'value1' }, { name: 'foo2', myValue: 'value2' }];
            await vscode.workspace.getConfiguration().update(testFabricRegistryName, testEntries, vscode.ConfigurationTarget.Global);
            const newEntry: TestFabricRegistryEntry = { name: 'foo0', myValue: 'value0' };
            await registry.add(newEntry);
            vscode.workspace.getConfiguration().get(testFabricRegistryName).should.deep.equal([testEntries[0], testEntries[1], newEntry]);
        });

    });

    describe('#update', () => {

        it('should throw if an entry does not exist in the configuration', async () => {
            const testEntries: TestFabricRegistryEntry[] = [{ name: 'foo1', myValue: 'value1' }, { name: 'foo2', myValue: 'value2' }];
            await vscode.workspace.getConfiguration().update(testFabricRegistryName, testEntries, vscode.ConfigurationTarget.Global);
            const newEntry: TestFabricRegistryEntry = { name: 'foo0', myValue: 'value0' };
            await registry.update(newEntry).should.be.rejectedWith(/Entry "foo0" in Fabric registry "fabric.runtimes" does not exist/);
        });

        it('should update an entry if the entry exists in the configuration', async () => {
            const testEntries: TestFabricRegistryEntry[] = [{ name: 'foo1', myValue: 'value1' }, { name: 'foo2', myValue: 'value2' }];
            await vscode.workspace.getConfiguration().update(testFabricRegistryName, testEntries, vscode.ConfigurationTarget.Global);
            const newEntry: TestFabricRegistryEntry = { name: 'foo2', myValue: 'value2+1' };
            await registry.update(newEntry);
            vscode.workspace.getConfiguration().get(testFabricRegistryName).should.deep.equal([testEntries[0], newEntry]);
        });

    });

    describe('#delete', () => {

        it('should throw if an entry does not exist in the configuration', async () => {
            const testEntries: TestFabricRegistryEntry[] = [{ name: 'foo1', myValue: 'value1' }, { name: 'foo2', myValue: 'value2' }];
            await vscode.workspace.getConfiguration().update(testFabricRegistryName, testEntries, vscode.ConfigurationTarget.Global);
            await registry.delete('foo0').should.be.rejectedWith(/Entry "foo0" in Fabric registry "fabric.runtimes" does not exist/);
        });

        it('should delete an entry if the entry exists in the configuration', async () => {
            const testEntries: TestFabricRegistryEntry[] = [{ name: 'foo1', myValue: 'value1' }, { name: 'foo2', myValue: 'value2' }];
            await vscode.workspace.getConfiguration().update(testFabricRegistryName, testEntries, vscode.ConfigurationTarget.Global);
            await registry.delete('foo2');
            vscode.workspace.getConfiguration().get(testFabricRegistryName).should.deep.equal([testEntries[0]]);
        });

    });

    describe('#clear', () => {

        it('should delete all entries from the configuration', async () => {
            const testEntries: TestFabricRegistryEntry[] = [{ name: 'foo1', myValue: 'value1' }, { name: 'foo2', myValue: 'value2' }];
            await vscode.workspace.getConfiguration().update(testFabricRegistryName, testEntries, vscode.ConfigurationTarget.Global);
            await registry.clear();
            vscode.workspace.getConfiguration().get(testFabricRegistryName).should.deep.equal([]);
        });

    });

});
