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
'use strict';
import * as vscode from 'vscode';
import * as path from 'path';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { TestUtil } from '../TestUtil';
import * as fs from 'fs-extra';
import { PackageRegistry } from '../../extension/registries/PackageRegistry';
import { PackageRegistryEntry } from '../../extension/registries/PackageRegistryEntry';
import { SettingConfigurations } from '../../extension/configurations';

chai.use(sinonChai);

// tslint:disable no-unused-expression
describe('PackageRegistry', () => {

    const packageRegistry: PackageRegistry = PackageRegistry.instance();

    // This directory contains dot files, old style package directories, and corrupt package files.
    const TEST_BAD_PACKAGE_DIRECTORY: string = path.join(path.dirname(__dirname), '..', '..', 'test', 'data', 'badPackageDir');

    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();
    const rootPath: string = path.dirname(__dirname);
    const testDir: string = path.join(rootPath, '../../test/data/packageDir/v2/packages');
    const packageDir: string = path.join(TestUtil.EXTENSION_TEST_DIR, 'v2', 'packages');

    before(async () => {
        await TestUtil.setupTests(mySandBox);
    });

    beforeEach(async () => {
        await fs.copy(testDir, packageDir);
    });

    afterEach(async () => {
        mySandBox.restore();
        await vscode.workspace.getConfiguration().update(SettingConfigurations.EXTENSION_DIRECTORY, TestUtil.EXTENSION_TEST_DIR, vscode.ConfigurationTarget.Global);
    });

    describe('#getAll', () => {

        it('should return all of the entries from the good package directory', async () => {
            const packageRegistryEntries: PackageRegistryEntry[] = await packageRegistry.getAll();
            packageRegistryEntries.should.deep.equal([
                {
                    name: 'fabcar-go',
                    path: path.join(TestUtil.EXTENSION_TEST_DIR, 'v2', 'packages', 'fabcar-go.tgz'),
                    sizeKB: 2359,
                    version: undefined
                },
                {
                    name: 'fabcar-java',
                    path: path.join(TestUtil.EXTENSION_TEST_DIR, 'v2', 'packages', 'fabcar-java.tar.gz'),
                    sizeKB: 355,
                    version: undefined
                },
                {
                    name: 'fabcar-javascript',
                    version: '0.0.1',
                    path: path.join(TestUtil.EXTENSION_TEST_DIR, 'v2', 'packages', 'fabcar-javascript@0.0.1.tar.gz'),
                    sizeKB: 3
                },
                {
                    name: 'fabcar-typescript',
                    version: '0.0.2',
                    path: path.join(TestUtil.EXTENSION_TEST_DIR, 'v2', 'packages', 'fabcar-typescript@0.0.2.tgz'),
                    sizeKB: 33
                }
            ]);
        });

        it('should return only the good entries from the bad package directory', async () => {
            await vscode.workspace.getConfiguration().update(SettingConfigurations.EXTENSION_DIRECTORY, TEST_BAD_PACKAGE_DIRECTORY, vscode.ConfigurationTarget.Global);
            const packageRegistryEntries: PackageRegistryEntry[] = await packageRegistry.getAll();
            packageRegistryEntries.should.deep.equal([
                {
                    name: 'fabcar-java',
                    path: path.join(TEST_BAD_PACKAGE_DIRECTORY, 'v2', 'packages', 'fabcar-java.tar.gz'),
                    sizeKB: 355,
                    version: undefined
                },
                {
                    name: 'fabcar-javascript',
                    version: '0.0.1',
                    path: path.join(TEST_BAD_PACKAGE_DIRECTORY, 'v2', 'packages', 'fabcar-javascript@0.0.1.tar.gz'),
                    sizeKB: 3
                },
                {
                    name: 'fabcar-typescript',
                    version: '0.0.2',
                    path: path.join(TEST_BAD_PACKAGE_DIRECTORY, 'v2', 'packages', 'fabcar-typescript@0.0.2.tgz'),
                    sizeKB: 33
                }
            ]);
        });
    });

    describe('#delete', () => {

        it('should delete one of the entries', async () => {
            const packageRegistryEntries: PackageRegistryEntry[] = await packageRegistry.getAll();
            const packageRegistryEntry: PackageRegistryEntry = packageRegistryEntries[0];
            packageRegistryEntry.name.should.equal('fabcar-go');
            const removeStub: sinon.SinonStub = mySandBox.stub(fs, 'remove').withArgs(packageRegistryEntry.path).resolves();
            await packageRegistry.delete(packageRegistryEntry);
            removeStub.should.have.been.calledOnceWithExactly(packageRegistryEntry.path);
        });

    });

    describe('#get', () => {

        it('should get one of the entries with a version', async () => {
            const _package: PackageRegistryEntry = await packageRegistry.get('fabcar-javascript', '0.0.1');
            _package.should.deep.equal({
                name: 'fabcar-javascript',
                version: '0.0.1',
                sizeKB: 3,
                path: path.join(TestUtil.EXTENSION_TEST_DIR, 'v2', 'packages', 'fabcar-javascript@0.0.1.tar.gz')
            });
        });

        it('should get one of the entries without a version', async () => {
            const _package: PackageRegistryEntry = await packageRegistry.get('fabcar-java');
            _package.should.deep.equal({
                name: 'fabcar-java',
                version: undefined,
                sizeKB: 355,
                path: path.join(TestUtil.EXTENSION_TEST_DIR, 'v2', 'packages', 'fabcar-java.tar.gz')
            });
        });
    });

    describe('#clear', () => {
        it('should clear all packages', async () => {
            const newPackageRegistry: PackageRegistry = PackageRegistry.instance();

            await newPackageRegistry.clear();

            const packages: PackageRegistryEntry[] = await newPackageRegistry.getAll();
            packages.should.deep.equal([]);
        });
    });
});
