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
import { PackageRegistry } from '../../src/packages/PackageRegistry';
import { PackageRegistryEntry } from '../../src/packages/PackageRegistryEntry';

chai.use(sinonChai);

// tslint:disable no-unused-expression
describe('PackageRegistry', () => {

    const packageRegistry: PackageRegistry = PackageRegistry.instance();
    const TEST_PACKAGE_DIRECTORY: string = path.join(path.dirname(__dirname), '..', '..', 'test', 'data', 'packageDir');

    let mySandBox: sinon.SinonSandbox;

    before(async () => {
        await TestUtil.setupTests();
        await TestUtil.storeExtensionDirectoryConfig();
        await vscode.workspace.getConfiguration().update('blockchain.ext.directory', TEST_PACKAGE_DIRECTORY, vscode.ConfigurationTarget.Global);
    });

    after(async () => {
        await TestUtil.restoreExtensionDirectoryConfig();
    });

    beforeEach(() => {
        mySandBox = sinon.createSandbox();
    });

    afterEach(() => {
        mySandBox.restore();
    });

    describe('#getAll', () => {

        it('should return all of the entries', async () => {
            const packageRegistryEntries: PackageRegistryEntry[] = await packageRegistry.getAll();
            packageRegistryEntries.should.deep.equal([
                {
                    name: 'vscode-pkg-1',
                    version: '0.0.1',
                    path: path.join(TEST_PACKAGE_DIRECTORY, 'packages', 'vscode-pkg-1@0.0.1.cds')
                },
                {
                    name: 'vscode-pkg-2',
                    version: '0.0.2',
                    path: path.join(TEST_PACKAGE_DIRECTORY, 'packages', 'vscode-pkg-2@0.0.2.cds')
                },
                {
                    name: 'vscode-pkg-3',
                    version: '1.2.3',
                    path: path.join(TEST_PACKAGE_DIRECTORY, 'packages', 'vscode-pkg-3@1.2.3.cds')
                }
            ]);
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

});
