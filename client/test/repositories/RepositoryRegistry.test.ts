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
import { RepositoryRegistry } from '../../src/repositories/RepositoryRegistry';

import * as chai from 'chai';
import { ExtensionUtil } from '../../src/util/ExtensionUtil';
import { TestUtil } from '../TestUtil';

const should: Chai.Should = chai.should();

// tslint:disable no-unused-expression
describe('RepositoryRegistry', () => {

    const testFabricRegistryName: string = 'blockchain.repositories';

    before(async () => {
        await TestUtil.storeConnectionsConfig();
        await TestUtil.storeRuntimesConfig();
        await TestUtil.storeRepositoriesConfig();
    });

    after(async () => {
        await TestUtil.restoreConnectionsConfig();
        await TestUtil.restoreRuntimesConfig();
        await TestUtil.restoreRepositoriesConfig();
    });

    let registry: RepositoryRegistry;

    beforeEach(async () => {
        await ExtensionUtil.activateExtension();
        registry = new RepositoryRegistry();
        await vscode.workspace.getConfiguration().update(testFabricRegistryName, [], vscode.ConfigurationTarget.Global);
    });

    describe('#get', () => {

        it('should get an entry if the entry exists in the configuration', async () => {
            const testEntries: {name: string, path: string}[] = [{ name: 'SampleOne', path: 'PathOne' }, { name: 'SampleTwo', path: 'PathTwo' }];
            await vscode.workspace.getConfiguration().update(testFabricRegistryName, testEntries, vscode.ConfigurationTarget.Global);
            registry.get('SampleTwo').should.deep.equal(testEntries[1]);
        });

        it('should throw if an entry does not exist in the configuration', async () => {
            const testEntries: {name: string, path: string}[] = [{ name: 'SampleOne', path: 'PathOne' }, { name: 'SampleTwo', path: 'PathTwo' }];
            await vscode.workspace.getConfiguration().update(testFabricRegistryName, testEntries, vscode.ConfigurationTarget.Global);

            ((): any => {
                registry.get('SampleZero');
            }).should.throw(/Entry "SampleZero" in blockchain repositories does not exist/);
        });

    });

    describe('#exists', () => {

        it('should return true if the entry exists in the configuration', async () => {
            const testEntries: {name: string, path: string}[] = [{ name: 'SampleOne', path: 'PathOne' }, { name: 'SampleTwo', path: 'PathTwo' }];
            await vscode.workspace.getConfiguration().update(testFabricRegistryName, testEntries, vscode.ConfigurationTarget.Global);
            registry.exists('SampleTwo').should.be.true;
        });

        it('should return false if an entry does not exist in the configuration', async () => {
            const testEntries: {name: string, path: string}[] = [{ name: 'SampleOne', path: 'PathOne' }, { name: 'SampleTwo', path: 'PathTwo' }];
            await vscode.workspace.getConfiguration().update(testFabricRegistryName, testEntries, vscode.ConfigurationTarget.Global);
            registry.exists('SampleZero').should.be.false;
        });

    });

    describe('#add', () => {

        it('should throw if an entry does exist in the configuration', async () => {
            const testEntries: {name: string, path: string}[] = [{ name: 'SampleOne', path: 'PathOne' }, { name: 'SampleTwo', path: 'PathTwo' }];
            await vscode.workspace.getConfiguration().update(testFabricRegistryName, testEntries, vscode.ConfigurationTarget.Global);
            await registry.add(testEntries[0]).should.be.rejectedWith(/Entry "SampleOne" in blockchain repositories already exists/);
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
            await registry.update(newEntry).should.be.rejectedWith(/Entry "SampleZero" in blockchain repositories does not exist/);
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
            await registry.delete('SampleZero').should.be.rejectedWith(/Entry "SampleZero" in blockchain repositories does not exist/);
        });

        it('should delete an entry if the entry exists in the configuration', async () => {
            const testEntries: {name: string, path: string}[] = [{ name: 'SampleOne', path: 'PathOne' }, { name: 'SampleTwo', path: 'PathTwo' }];
            await vscode.workspace.getConfiguration().update(testFabricRegistryName, testEntries, vscode.ConfigurationTarget.Global);
            await registry.delete('SampleTwo');
            vscode.workspace.getConfiguration().get(testFabricRegistryName).should.deep.equal([testEntries[0]]);
        });

    });
});
