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
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from 'ibm-blockchain-platform-common';
import { SettingConfigurations } from '../../configurations';

chai.use(sinonChai);

// tslint:disable no-unused-expression
describe('PackageRegistry', () => {

    const packageRegistry: PackageRegistry = PackageRegistry.instance();

    // This directory contains dot files, old style package directories, and corrupt package files.
    const TEST_BAD_PACKAGE_DIRECTORY: string = path.join(path.dirname(__dirname), '..', '..', 'test', 'data', 'badPackageDir');

    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();
    const rootPath: string = path.dirname(__dirname);
    const testDir: string = path.join(rootPath, '../../test/data/packageDir/packages');
    const packageDir: string = path.join(TestUtil.EXTENSION_TEST_DIR, 'packages');

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
                    name: 'vscode-pkg-1',
                    version: '0.0.1',
                    path: path.join(TestUtil.EXTENSION_TEST_DIR, 'packages', 'vscode-pkg-1@0.0.1.cds'),
                    sizeKB: 3
                },
                {
                    name: 'vscode-pkg-2',
                    version: '0.0.2',
                    path: path.join(TestUtil.EXTENSION_TEST_DIR, 'packages', 'vscode-pkg-2@0.0.2.cds'),
                    sizeKB: 3
                },
                {
                    name: 'vscode-pkg-3',
                    version: '1.2.3',
                    path: path.join(TestUtil.EXTENSION_TEST_DIR, 'packages', 'vscode-pkg-3@1.2.3.cds'),
                    sizeKB: 24
                }
            ]);
        });

        it('should return only the good entries from the bad package directory', async () => {
            await vscode.workspace.getConfiguration().update(SettingConfigurations.EXTENSION_DIRECTORY, TEST_BAD_PACKAGE_DIRECTORY, vscode.ConfigurationTarget.Global);
            const packageRegistryEntries: PackageRegistryEntry[] = await packageRegistry.getAll();
            packageRegistryEntries.should.deep.equal([
                {
                    name: 'vscode-pkg-1',
                    version: '0.0.1',
                    path: path.join(TEST_BAD_PACKAGE_DIRECTORY, 'packages', 'vscode-pkg-1@0.0.1.cds'),
                    sizeKB: 3
                },
                {
                    name: 'vscode-pkg-2',
                    version: '0.0.2',
                    path: path.join(TEST_BAD_PACKAGE_DIRECTORY, 'packages', 'vscode-pkg-2@0.0.2.cds'),
                    sizeKB: 3
                },
                {
                    name: 'vscode-pkg-3',
                    version: '1.2.3',
                    path: path.join(TEST_BAD_PACKAGE_DIRECTORY, 'packages', 'vscode-pkg-3@1.2.3.cds'),
                    sizeKB: 24
                }
            ]);
        });

        it('should log any errors reading one of the bad entries', async () => {
            await vscode.workspace.getConfiguration().update(SettingConfigurations.EXTENSION_DIRECTORY, TEST_BAD_PACKAGE_DIRECTORY, vscode.ConfigurationTarget.Global);
            const logSpy: sinon.SinonSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
            await packageRegistry.getAll();
            logSpy.should.have.been.calledWithExactly(LogType.ERROR, null, sinon.match(/Failed to parse package garbage@6.6.6.cds: /));
        });

    });

    describe('#delete', () => {

        it('should delete one of the entries', async () => {
            const packageRegistryEntries: PackageRegistryEntry[] = await packageRegistry.getAll();
            const packageRegistryEntry: PackageRegistryEntry = packageRegistryEntries[0];
            packageRegistryEntry.name.should.equal('vscode-pkg-1');
            const removeStub: sinon.SinonStub = mySandBox.stub(fs, 'remove').withArgs(packageRegistryEntry.path).resolves();
            await packageRegistry.delete(packageRegistryEntry);
            removeStub.should.have.been.calledOnceWithExactly(packageRegistryEntry.path);
        });

    });

    describe('#get', () => {

        it('should get one of the entries', async () => {
            mySandBox.stub(packageRegistry, 'getAll').resolves(
                [
                    {
                        name: 'vscode-pkg-1',
                        version: '0.0.1',
                        path: path.join(TestUtil.EXTENSION_TEST_DIR, 'packages', 'vscode-pkg-1@0.0.1.cds')
                    },
                    {
                        name: 'vscode-pkg-2',
                        version: '0.0.2',
                        path: path.join(TestUtil.EXTENSION_TEST_DIR, 'packages', 'vscode-pkg-2@0.0.2.cds')
                    },
                    {
                        name: 'vscode-pkg-3',
                        version: '1.2.3',
                        path: path.join(TestUtil.EXTENSION_TEST_DIR, 'packages', 'vscode-pkg-3@1.2.3.cds')
                    }
                ]
            );

            const _package: PackageRegistryEntry = await packageRegistry.get('vscode-pkg-2', '0.0.2');
            _package.should.deep.equal({
                name: 'vscode-pkg-2',
                version: '0.0.2',
                path: path.join(TestUtil.EXTENSION_TEST_DIR, 'packages', 'vscode-pkg-2@0.0.2.cds')
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
