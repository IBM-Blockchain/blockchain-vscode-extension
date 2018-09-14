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
import * as fs from 'fs-extra';
import { PackageRegistryManager } from '../../../src/explorer/packages/PackageRegistryManager';
import { PackageRegistryEntry } from '../../../src/explorer/packages/PackageRegistryEntry';
import { PackageTreeItem } from '../../../src/explorer/model/PackageTreeItem';
import * as myExtension from '../../../src/extension';

chai.use(sinonChai);
const should = chai.should();

// tslint:disable no-unused-expression
describe('PackageRegistryManager', () => {
    let mySandBox;
    let errorSpy;

    let USER_PACKAGE_DIRECTORY;
    // Update the user's configuration
    const TEST_PACKAGE_DIRECTORY = path.join(path.dirname(__dirname), '../../../test/data/smartContractDir');

    before(async () => {
         // Get the user's current 'smart contract packages' directory location. This will be used later to update the configuration.
        USER_PACKAGE_DIRECTORY = await vscode.workspace.getConfiguration().get('fabric.package.directory');
        await vscode.workspace.getConfiguration().update('fabric.package.directory', TEST_PACKAGE_DIRECTORY, vscode.ConfigurationTarget.Global);
        await TestUtil.setupTests();
     });
    after(async () => {
        await vscode.workspace.getConfiguration().update('fabric.package.directory', USER_PACKAGE_DIRECTORY, vscode.ConfigurationTarget.Global);
    });

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
        errorSpy = mySandBox.spy(vscode.window, 'showErrorMessage');
    });

    afterEach(() => {
        mySandBox.restore();
    });

    it('getAll should return all packageRegistryEntries', async () => {
        const packageRegistryManager: PackageRegistryManager = new PackageRegistryManager();
        await vscode.workspace.getConfiguration().update('fabric.package.directory', TEST_PACKAGE_DIRECTORY, true);

        const packageRegistryEntries: PackageRegistryEntry[] = await packageRegistryManager.getAll();
        packageRegistryEntries.length.should.equal(5);
        packageRegistryEntries[0].name.should.equal('smartContractPackageGo');
        packageRegistryEntries[1].name.should.equal('smartContractPackageBlue');
        packageRegistryEntries[2].name.should.equal('smartContractPackageGreen');
        packageRegistryEntries[3].name.should.equal('smartContractPackagePurple');
        packageRegistryEntries[4].name.should.equal('smartContractPackageYellow');
        errorSpy.should.not.have.been.called;
    });

    it('should delete packages', async () => {
        await fs.mkdirp(TEST_PACKAGE_DIRECTORY + '/javascript/DeleteThisDirectory');
        const blockchainPackageExplorerProvider = myExtension.getBlockchainPackageExplorerProvider();
        const initialPackages: Array<PackageTreeItem> = await blockchainPackageExplorerProvider.getChildren();
        const initialLength = initialPackages.length;

        const packageRegistryManager: PackageRegistryManager = new PackageRegistryManager();

        const packageToDelete: string = 'DeleteThisDirectory';

        await packageRegistryManager.delete(packageToDelete);

        const newPackages: PackageTreeItem[] = await blockchainPackageExplorerProvider.getChildren();

        const index = newPackages.findIndex((_package) => {
            return _package.name === 'DeleteThisDirectory';
        });
        index.should.equal(-1);
        newPackages.length.should.equal(initialLength - 1);
    });

});
