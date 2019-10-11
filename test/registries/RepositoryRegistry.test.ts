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
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { RepositoryRegistry } from '../../extension/registries/RepositoryRegistry';
import { TestUtil } from '../TestUtil';
import { SettingConfigurations } from '../../configurations';

chai.use(chaiAsPromised);

// tslint:disable no-unused-expression
describe('RepositoryRegistry', () => {

    const testFabricRegistryName: string = SettingConfigurations.EXTENSION_REPOSITORIES;

    before(async () => {
        await TestUtil.setupTests();
    });

    let registry: RepositoryRegistry;

    beforeEach(async () => {
        registry = RepositoryRegistry.instance();
        await vscode.workspace.getConfiguration().update(testFabricRegistryName, [], vscode.ConfigurationTarget.Global);
    });

    describe('#get', () => {
        it('should get an entry if the entry exists in the configuration', async () => {
            const testEntries: {name: string, path: string}[] = [{ name: 'SampleOne', path: 'PathOne' }, { name: 'SampleTwo', path: 'PathTwo' }];
            await vscode.workspace.getConfiguration().update(testFabricRegistryName, testEntries, vscode.ConfigurationTarget.Global);
            await registry.get('SampleTwo').should.eventually.deep.equal(testEntries[1]);
        });

        it('should throw if an entry does not exist in the configuration', async () => {
            const testEntries: {name: string, path: string}[] = [{ name: 'SampleOne', path: 'PathOne' }, { name: 'SampleTwo', path: 'PathTwo' }];
            await vscode.workspace.getConfiguration().update(testFabricRegistryName, testEntries, vscode.ConfigurationTarget.Global);

            await registry.get('SampleZero').should.eventually.be.rejectedWith('Entry "SampleZero" in registry "ibm-blockchain-platform.ext.repositories" does not exist');
        });

    });

    describe('#exists', () => {
        it('should return true if the entry exists in the configuration', async () => {
            const testEntries: {name: string, path: string}[] = [{ name: 'SampleOne', path: 'PathOne' }, { name: 'SampleTwo', path: 'PathTwo' }];
            await vscode.workspace.getConfiguration().update(testFabricRegistryName, testEntries, vscode.ConfigurationTarget.Global);
            await registry.exists('SampleTwo').should.eventually.be.true;
        });

        it('should return false if an entry does not exist in the configuration', async () => {
            const testEntries: {name: string, path: string}[] = [{ name: 'SampleOne', path: 'PathOne' }, { name: 'SampleTwo', path: 'PathTwo' }];
            await vscode.workspace.getConfiguration().update(testFabricRegistryName, testEntries, vscode.ConfigurationTarget.Global);
            await registry.exists('SampleZero').should.eventually.be.false;
        });

    });

    describe('#add', () => {
        it('should throw if an entry does exist in the configuration', async () => {
            const testEntries: {name: string, path: string}[] = [{ name: 'SampleOne', path: 'PathOne' }, { name: 'SampleTwo', path: 'PathTwo' }];
            await vscode.workspace.getConfiguration().update(testFabricRegistryName, testEntries, vscode.ConfigurationTarget.Global);
            await registry.add(testEntries[0]).should.be.rejectedWith('Entry "SampleOne" in registry "ibm-blockchain-platform.ext.repositories" already exists');
        });

        it('should add an entry if the entry does not exist in the configuration', async () => {
            const testEntries: {name: string, path: string}[] = [{ name: 'SampleOne', path: 'PathOne' }, { name: 'SampleTwo', path: 'PathTwo' }];
            await vscode.workspace.getConfiguration().update(testFabricRegistryName, testEntries, vscode.ConfigurationTarget.Global);
            const newEntry: {name: string, path: string} = { name: 'SampleZero', path: 'PathZero' };
            await registry.add(newEntry);
            vscode.workspace.getConfiguration().get(testFabricRegistryName).should.deep.equal([testEntries[0], testEntries[1], newEntry]);
        });

    });

    describe('#update', () => {
        it('should throw if an entry does not exist in the configuration', async () => {
            const testEntries: {name: string, path: string}[] = [{ name: 'SampleOne', path: 'PathOne' }, { name: 'SampleTwo', path: 'PathTwo' }];
            await vscode.workspace.getConfiguration().update(testFabricRegistryName, testEntries, vscode.ConfigurationTarget.Global);
            const newEntry: {name: string, path: string} = { name: 'SampleZero', path: 'PathZero' };
            await registry.update(newEntry).should.eventually.be.rejectedWith('Entry "SampleZero" in registry "ibm-blockchain-platform.ext.repositories" does not exist');
        });

        it('should update an entry if the entry exists in the configuration', async () => {
            const testEntries: {name: string, path: string}[] = [{ name: 'SampleOne', path: 'PathOne' }, { name: 'SampleTwo', path: 'PathTwo' }];
            await vscode.workspace.getConfiguration().update(testFabricRegistryName, testEntries, vscode.ConfigurationTarget.Global);
            const newEntry: {name: string, path: string} = { name: 'SampleTwo', path: 'PathTwoPlusOne' };
            await registry.update(newEntry);
            vscode.workspace.getConfiguration().get(testFabricRegistryName).should.deep.equal([testEntries[0], newEntry]);
        });

    });

    describe('#delete', () => {
        it('should throw if an entry does not exist in the configuration', async () => {
            const testEntries: {name: string, path: string}[] = [{ name: 'SampleOne', path: 'PathOne' }, { name: 'SampleTwo', path: 'PathTwo' }];
            await vscode.workspace.getConfiguration().update(testFabricRegistryName, testEntries, vscode.ConfigurationTarget.Global);
            await registry.delete('SampleZero').should.be.rejectedWith('Entry "SampleZero" in registry "ibm-blockchain-platform.ext.repositories" does not exist');
        });

        it('should delete an entry if the entry exists in the configuration', async () => {
            const testEntries: {name: string, path: string}[] = [{ name: 'SampleOne', path: 'PathOne' }, { name: 'SampleTwo', path: 'PathTwo' }];
            await vscode.workspace.getConfiguration().update(testFabricRegistryName, testEntries, vscode.ConfigurationTarget.Global);
            await registry.delete('SampleTwo');
            vscode.workspace.getConfiguration().get(testFabricRegistryName).should.deep.equal([testEntries[0]]);
        });
    });
});
