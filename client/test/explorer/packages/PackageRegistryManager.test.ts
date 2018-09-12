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
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { TestUtil } from '../../TestUtil';
import * as vscode from 'vscode';
import * as path from 'path';
import { PackageRegistryManager } from '../../../src/explorer/packages/PackageRegistryManager';
import { PackageRegistryEntry } from '../../../src/explorer/packages/PackageRegistryEntry';

chai.use(sinonChai);
const should = chai.should();

// tslint:disable no-unused-expression
describe('PackageRegistryManager', () => {
    let mySandBox;
    let rootPath: string;
    let errorSpy;

    before(async () => {
        await TestUtil.setupTests();
    });

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
        rootPath = path.dirname(__dirname);
        errorSpy = mySandBox.spy(vscode.window, 'showErrorMessage');
    });

    afterEach(() => {
        mySandBox.restore();
    });

    it('getAll should return all packageRegistryEntries', async () => {
        const packageRegistryManager: PackageRegistryManager = new PackageRegistryManager();
        const packagesDir: string = path.join(rootPath, '../../../test/data/smartContractDir');
        await vscode.workspace.getConfiguration().update('fabric.package.directory', packagesDir, true);

        const packageRegistryEntries: PackageRegistryEntry[] = await packageRegistryManager.getAll();
        packageRegistryEntries.length.should.equal(5);
        packageRegistryEntries[0].name.should.equal('smartContractPackageGo');
        packageRegistryEntries[1].name.should.equal('smartContractPackageBlue');
        packageRegistryEntries[2].name.should.equal('smartContractPackageGreen');
        packageRegistryEntries[3].name.should.equal('smartContractPackagePurple');
        packageRegistryEntries[4].name.should.equal('smartContractPackageYellow');
        errorSpy.should.not.have.been.called;
    });

});
