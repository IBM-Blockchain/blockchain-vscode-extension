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

import * as myExtension from '../../src/extension';
import { TestUtil } from '../TestUtil';

import * as fs from 'fs-extra';
import * as homeDir from 'home-dir';

import { BlockchainExplorerProvider } from '../../src/explorer/BlockchainExplorerProvider';
import { PackageTreeItem } from '../../src/explorer/model/PackageTreeItem';

chai.should();
chai.use(sinonChai);

describe('DeleteSmartContractPackageCommand', () => {

    let USER_PACKAGE_DIRECTORY;
    // Update the user's configuration
    const TEST_PACKAGE_DIRECTORY = path.join(path.dirname(__dirname), '../../test/data/smartContractDir');

    before(async () => {

        // Get the user's current 'smart contract packages' directory location. This will be used later to update the configuration.
        USER_PACKAGE_DIRECTORY = await vscode.workspace.getConfiguration().get('fabric.package.directory');

        await vscode.workspace.getConfiguration().update('fabric.package.directory', TEST_PACKAGE_DIRECTORY, vscode.ConfigurationTarget.Global);

        await TestUtil.setupTests();

    });

    after(async () => {
        await vscode.workspace.getConfiguration().update('fabric.package.directory', USER_PACKAGE_DIRECTORY, vscode.ConfigurationTarget.Global);
    });

    describe('deleteSmartContractPackage', () => {

        let mySandBox;

        beforeEach(async () => {
            mySandBox = sinon.createSandbox();
        });

        afterEach(() => {
            mySandBox.restore();
        });

        it("should test a 'smart contract package' can be deleted from the command", async () => {

            // Create a new directory which we will delete in this test
            await fs.mkdirp(TEST_PACKAGE_DIRECTORY + '/DeleteThisDirectory');

            const blockchainPackageExplorerProvider = myExtension.getBlockchainPackageExplorerProvider();
            let packages: Array<PackageTreeItem> = await blockchainPackageExplorerProvider.getChildren();

            const initialLength = packages.length;

            mySandBox.stub(vscode.window, 'showQuickPick').resolves(['DeleteThisDirectory']);

            // Execute the delete 'smart contract package' command
            await vscode.commands.executeCommand('blockchainAPackageExplorer.deleteSmartContractPackageEntry');

            // Get a list of the packages again
            packages = await blockchainPackageExplorerProvider.getChildren();

            const index = packages.findIndex((_package) => {
                return _package.name === 'DeleteThisDirectory';
            });

            index.should.equal(-1);
            packages.length.should.equal(initialLength - 1);

        });

        it("should test multiple 'smart contract packages' can be deleted from the command", async () => {

            // Create a new directory which we will delete in this test
            await fs.mkdirp(TEST_PACKAGE_DIRECTORY + '/DeleteThisDirectory1');
            await fs.mkdirp(TEST_PACKAGE_DIRECTORY + '/DeleteThisDirectory2');

            const blockchainPackageExplorerProvider = myExtension.getBlockchainPackageExplorerProvider();
            let packages: Array<PackageTreeItem> = await blockchainPackageExplorerProvider.getChildren();

            const initialLength = packages.length;

            mySandBox.stub(vscode.window, 'showQuickPick').resolves(['DeleteThisDirectory1', 'DeleteThisDirectory2']);

            // Execute the delete 'smart contract package' command
            await vscode.commands.executeCommand('blockchainAPackageExplorer.deleteSmartContractPackageEntry');

            // Get a list of the packages again
            packages = await blockchainPackageExplorerProvider.getChildren();

            const index1 = packages.findIndex((_package) => {
                return _package.name === 'DeleteThisDirectory1';
            });

            const index2 = packages.findIndex((_package) => {
                return _package.name === 'DeleteThisDirectory1';
            });

            index1.should.equal(-1);
            index2.should.equal(-1);

            packages.length.should.equal(initialLength - 2);

        });

        it("should test a 'smart contract package' can be deleted from tree", async () => {

            // Create a new directory which we will delete in this test
            await fs.mkdirp(TEST_PACKAGE_DIRECTORY + '/DeleteThisDirectory');

            const blockchainPackageExplorerProvider = myExtension.getBlockchainPackageExplorerProvider();
            const initialPackages: Array<PackageTreeItem> = await blockchainPackageExplorerProvider.getChildren();
            const initialLength = initialPackages.length;

            // This will be the 'DeleteThisDirectory' as its the first package alphabetically
            const packageIndex = initialPackages.findIndex((_package) => {
                return _package.name === 'DeleteThisDirectory';
            });

            packageIndex.should.not.equal(-1);

            const packageToDelete = initialPackages[packageIndex];

            await vscode.commands.executeCommand('blockchainAPackageExplorer.deleteSmartContractPackageEntry', packageToDelete);

            // Get a list of the packages again
            const updatedPackages: Array<PackageTreeItem> = await blockchainPackageExplorerProvider.getChildren();

            updatedPackages.length.should.equal(initialLength - 1);
            updatedPackages.should.not.contain(packageToDelete);
        });

        it("should test delete 'smart contract package' can be cancelled", async () => {

            const blockchainPackageExplorerProvider = myExtension.getBlockchainPackageExplorerProvider();
            const initialPackages: Array<PackageTreeItem> = await blockchainPackageExplorerProvider.getChildren();
            const initialLength = initialPackages.length;

            mySandBox.stub(vscode.window, 'showQuickPick').resolves();

            await vscode.commands.executeCommand('blockchainAPackageExplorer.deleteSmartContractPackageEntry');

            const newPackageList: Array<PackageTreeItem> = await blockchainPackageExplorerProvider.getChildren();

            newPackageList.length.should.equal(initialLength);
            newPackageList.should.deep.equal(initialPackages);
        });

        it("should replace '~' in package directory", async () => {
            const removeSpy = mySandBox.spy(fs, 'remove');

            const homeDirectory = homeDir();
            const strippedDirectory = TEST_PACKAGE_DIRECTORY.replace(homeDirectory, '');
            const tildaTestDir: string = '~' + strippedDirectory;

            await vscode.workspace.getConfiguration().update('fabric.package.directory', tildaTestDir, vscode.ConfigurationTarget.Global);

            // Create a new directory which we will delete in this test
            await fs.mkdirp(TEST_PACKAGE_DIRECTORY + '/DeleteThisDirectory');
            const blockchainPackageExplorerProvider = await myExtension.getBlockchainPackageExplorerProvider();
            const initialPackages: Array<PackageTreeItem> = await blockchainPackageExplorerProvider.getChildren();
            const initialLength = initialPackages.length;

            mySandBox.stub(vscode.window, 'showQuickPick').resolves(['DeleteThisDirectory']);

            await vscode.commands.executeCommand('blockchainAPackageExplorer.deleteSmartContractPackageEntry');

            removeSpy.should.have.been.calledOnceWithExactly(TEST_PACKAGE_DIRECTORY + '/DeleteThisDirectory');
            const updatedPackages: Array<PackageTreeItem> = await blockchainPackageExplorerProvider.getChildren();
            updatedPackages.length.should.equal(initialLength - 1);

        });

    });

});
