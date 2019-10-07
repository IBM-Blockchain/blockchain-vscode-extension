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
import { SettingsRegistry } from '../../extension/registries/SettingsRegistry';
import { RegistryEntry } from '../../extension/registries/RegistryEntry';

import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { TestUtil } from '../TestUtil';
import { SettingConfigurations } from '../../SettingConfigurations';

chai.should();
chai.use(chaiAsPromised);

// tslint:disable no-unused-expression
describe('SettingsRegistry', () => {

    // can't use one that doesn't exist
    const testFabricRegistryName: string = SettingConfigurations.FABRIC_GATEWAYS;

    // tslint:disable max-classes-per-file
    class TestFabricRegistryEntry extends RegistryEntry {
        public myValue: string;
    }

    // tslint:disable max-classes-per-file
    class TestFabricRegistry extends SettingsRegistry<TestFabricRegistryEntry> {

        constructor() {
            super(testFabricRegistryName);
        }

    }
    before(async () => {
        await TestUtil.setupTests();
    });

    after(async () => {
        await TestUtil.restoreAll();
    });

    let registry: TestFabricRegistry;

    beforeEach(async () => {
        registry = new TestFabricRegistry();
        await vscode.workspace.getConfiguration().update(testFabricRegistryName, [], vscode.ConfigurationTarget.Global);
    });

    describe('#getAll', () => {
        it('should get no entries if the configuration is empty', async () => {
            const testEntries: TestFabricRegistryEntry[] = [];
            await vscode.workspace.getConfiguration().update(testFabricRegistryName, testEntries, vscode.ConfigurationTarget.Global);
            await registry.getAll().should.eventually.deep.equal(testEntries);
        });

        it('should get all entries if the configuration is not empty', async () => {
            const testEntries: TestFabricRegistryEntry[] = [{ name: 'foo1', myValue: 'value1' }, { name: 'foo2', myValue: 'value2' }];
            await vscode.workspace.getConfiguration().update(testFabricRegistryName, testEntries, vscode.ConfigurationTarget.Global);
            await registry.getAll().should.eventually.deep.equal(testEntries);
        });
    });

    describe('#get', () => {
        it('should get an entry if the entry exists in the configuration', async () => {
            const testEntries: TestFabricRegistryEntry[] = [{ name: 'foo1', myValue: 'value1' }, { name: 'foo2', myValue: 'value2' }];
            await vscode.workspace.getConfiguration().update(testFabricRegistryName, testEntries, vscode.ConfigurationTarget.Global);
            await registry.get('foo2').should.eventually.deep.equal(testEntries[1]);
        });

        it('should throw if an entry does not exist in the configuration', async () => {
            const testEntries: TestFabricRegistryEntry[] = [{ name: 'foo1', myValue: 'value1' }, { name: 'foo2', myValue: 'value2' }];
            await vscode.workspace.getConfiguration().update(testFabricRegistryName, testEntries, vscode.ConfigurationTarget.Global);
            await registry.get('foo0').should.eventually.be.rejectedWith(`Entry "foo0" in registry "${testFabricRegistryName}" does not exist`);
        });
    });

    describe('#exists', () => {
        it('should return true if the entry exists in the configuration', async () => {
            const testEntries: TestFabricRegistryEntry[] = [{ name: 'foo1', myValue: 'value1' }, { name: 'foo2', myValue: 'value2' }];
            await vscode.workspace.getConfiguration().update(testFabricRegistryName, testEntries, vscode.ConfigurationTarget.Global);
            await registry.exists('foo2').should.eventually.be.true;
        });

        it('should return false if an entry does not exist in the configuration', async () => {
            const testEntries: TestFabricRegistryEntry[] = [{ name: 'foo1', myValue: 'value1' }, { name: 'foo2', myValue: 'value2' }];
            await vscode.workspace.getConfiguration().update(testFabricRegistryName, testEntries, vscode.ConfigurationTarget.Global);
            await registry.exists('foo0').should.eventually.be.false;
        });
    });

    describe('#add', () => {
        it('should throw if an entry does exist in the configuration', async () => {
            const testEntries: TestFabricRegistryEntry[] = [{ name: 'foo1', myValue: 'value1' }, { name: 'foo2', myValue: 'value2' }];
            await vscode.workspace.getConfiguration().update(testFabricRegistryName, testEntries, vscode.ConfigurationTarget.Global);
            await registry.add(testEntries[0]).should.eventually.be.rejectedWith(`Entry "foo1" in registry "${testFabricRegistryName}" already exists`);
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
            await registry.update(newEntry).should.be.rejectedWith(`Entry "foo0" in registry "${testFabricRegistryName}" does not exist`);
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
            await registry.delete('foo0').should.be.rejectedWith(`Entry "foo0" in registry "${testFabricRegistryName}" does not exist`);
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
