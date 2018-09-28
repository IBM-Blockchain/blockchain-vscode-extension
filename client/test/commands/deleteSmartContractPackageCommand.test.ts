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
// tslint:disable no-unused-expression
import * as vscode from 'vscode';
import * as path from 'path';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as myExtension from '../../src/extension';
import { TestUtil } from '../TestUtil';
import * as fs from 'fs-extra';
import { PackageTreeItem } from '../../src/explorer/model/PackageTreeItem';
import { PackageRegistry } from '../../src/packages/PackageRegistry';
import { PackageRegistryEntry } from '../../src/packages/PackageRegistryEntry';

chai.should();
chai.use(sinonChai);

describe('DeleteSmartContractPackageCommand', () => {
    const TEST_PACKAGE_DIRECTORY = path.join(path.dirname(__dirname), '../../test/data/smartContractDir');

    before(async () => {
        await TestUtil.setupTests();
        await TestUtil.storePackageDirectoryConfig();
        await vscode.workspace.getConfiguration().update('fabric.package.directory', TEST_PACKAGE_DIRECTORY, vscode.ConfigurationTarget.Global);

    });

    after(async () => {
        await TestUtil.restorePackageDirectoryConfig();

    });

    describe('deleteSmartContractPackage', () => {
        let mySandBox;

        async function createTestFiles(dirName: string, packageName, version: string, language, createValid: boolean): Promise<void> {
            const smartContractDir = path.join(TEST_PACKAGE_DIRECTORY, language, dirName);

            try {
                await fs.mkdirp(smartContractDir);
            } catch (error) {
                console.log(error);
            }

            if (createValid) {
                if (language !== 'go/src') {
                    const packageJsonFile = smartContractDir + '/package.json';
                    const content = {
                        name: `${packageName}`,
                        version: version,
                        description: 'My smart contract'
                    };
                    await fs.writeFile(packageJsonFile, JSON.stringify(content));
                }
            } else {
                const textFile = smartContractDir + '/text.txt';
                const content = 'hello';
                await fs.writeFile(textFile, content);
            }
        }

        async function checkFileDeleted(name: string, version: string, language: string) {
            await fs.stat(`${TEST_PACKAGE_DIRECTORY}/${language}/${name}`);
        }

        async function deleteTestFiles() {
            try {
                await fs.remove(TEST_PACKAGE_DIRECTORY);
            } catch (error) {
                if (!error.message.contains('ENOENT: no such file or directory')) {
                    throw error;
                }
            }
        }

        beforeEach(async () => {
            mySandBox = sinon.createSandbox();
            deleteTestFiles();
        });

        afterEach(async () => {
            mySandBox.restore();
            await deleteTestFiles();
        });

        it("should test a 'smart contract package' can be deleted from the command", async () => {
            await createTestFiles('DeleteThisDirectory', 'delete-this-directory', '1.0.0', 'javascript', true);

            const blockchainPackageExplorerProvider = myExtension.getBlockchainPackageExplorerProvider();
            const onDidChangeTreeDataSpy = mySandBox.spy(blockchainPackageExplorerProvider['_onDidChangeTreeData'], 'fire');

            const _packages: Array<PackageRegistryEntry> = await PackageRegistry.instance().getAll();
            const _package = _packages[0];
            mySandBox.stub(vscode.window, 'showQuickPick').resolves([{
                label: 'DeleteThisDirectory',
                data: _package
            }]);
            // Execute the delete 'smart contract package' command
            await vscode.commands.executeCommand('blockchainAPackageExplorer.deleteSmartContractPackageEntry');
            onDidChangeTreeDataSpy.should.have.been.called;

            await checkFileDeleted('DeleteThisDirectory', '1.0.0', 'javascript').should.be.rejected;
        });

        it(`should test multiple 'smart contract packages' can be deleted from the command`, async () => {
            await createTestFiles('DeleteThisDirectory1', 'delete-this-directory-1', '2.0.0', 'javascript', true);
            await createTestFiles('DeleteThisDirectory2', 'delete-this-directory-2', '3.0.0', 'javascript', true);

            const blockchainPackageExplorerProvider = myExtension.getBlockchainPackageExplorerProvider();
            const onDidChangeTreeDataSpy = mySandBox.spy(blockchainPackageExplorerProvider['_onDidChangeTreeData'], 'fire');

            const packages: Array<PackageRegistryEntry> = await PackageRegistry.instance().getAll();

            const dataOne: PackageRegistryEntry = packages[0];
            const dataTwo: PackageRegistryEntry = packages[1];
            mySandBox.stub(vscode.window, 'showQuickPick').resolves([{
                label: 'DeleteThisDirectory1',
                data: dataOne
            }, {
                label: 'DeleteThisDirectory2',
                data: dataTwo
            }]);

            // Execute the delete 'smart contract package' command
            await vscode.commands.executeCommand('blockchainAPackageExplorer.deleteSmartContractPackageEntry');

            onDidChangeTreeDataSpy.should.have.been.called;

            await checkFileDeleted('DeleteThisDirectory1', '2.0.0', 'javascript').should.be.rejected;
            await checkFileDeleted('DeleteThisDirectory2', '3.0.0', 'javascript').should.be.rejected;
        });

        it("should test a 'smart contract package' can be deleted from tree", async () => {
            await createTestFiles('DeleteThisDirectory', 'delete-this-directory', '1.0.0', 'javascript', true);

            const blockchainPackageExplorerProvider = myExtension.getBlockchainPackageExplorerProvider();
            const initialPackages: Array<PackageTreeItem> = await blockchainPackageExplorerProvider.getChildren();
            const onDidChangeTreeDataSpy = mySandBox.spy(blockchainPackageExplorerProvider['_onDidChangeTreeData'], 'fire');

            // This will be the 'DeleteThisDirectory' as its the first package alphabetically
            const packageIndex = initialPackages.findIndex((_package) => {
                return _package.name === 'DeleteThisDirectory' && _package.packageEntry.version === '1.0.0' && _package.packageEntry.chaincodeLanguage === 'javascript';
            });
            packageIndex.should.not.equal(-1);
            const packageToDelete = initialPackages[packageIndex];
            await vscode.commands.executeCommand('blockchainAPackageExplorer.deleteSmartContractPackageEntry', packageToDelete);

            onDidChangeTreeDataSpy.should.have.been.called;

            await checkFileDeleted('DeleteThisDirectory', '1.0.0', 'javascript').should.be.rejected;
        });

        it("should test delete 'smart contract package' can be cancelled", async () => {
            await createTestFiles('DeleteThisDirectory', 'delete-this-directory', '1.0.0', 'javascript', true);

            const blockchainPackageExplorerProvider = myExtension.getBlockchainPackageExplorerProvider();
            const initialPackages: Array<PackageTreeItem> = await blockchainPackageExplorerProvider.getChildren();
            const initialLength = initialPackages.length;
            mySandBox.stub(vscode.window, 'showQuickPick').resolves();
            await vscode.commands.executeCommand('blockchainAPackageExplorer.deleteSmartContractPackageEntry');
            const newPackageList: Array<PackageTreeItem> = await blockchainPackageExplorerProvider.getChildren();
            newPackageList.length.should.equal(initialLength);
            newPackageList.should.deep.equal(initialPackages);
        });

        it(`should test a Go 'smart contract package' can be deleted from the command`, async () => {
            await createTestFiles('DeleteThisDirectory', 'delete-this-directory', '1.0.0', 'go/src', true);

            const blockchainPackageExplorerProvider = myExtension.getBlockchainPackageExplorerProvider();
            const onDidChangeTreeDataSpy = mySandBox.spy(blockchainPackageExplorerProvider['_onDidChangeTreeData'], 'fire');

            const allPackages: Array<PackageRegistryEntry> = await PackageRegistry.instance().getAll();
            allPackages.length.should.equal(1);

            const data: PackageRegistryEntry = allPackages[0];

            mySandBox.stub(vscode.window, 'showQuickPick').resolves([{
                label: 'DeleteThisDirectory',
                data: data
            }]);
            // Execute the delete 'smart contract package' command
            await vscode.commands.executeCommand('blockchainAPackageExplorer.deleteSmartContractPackageEntry');
            onDidChangeTreeDataSpy.should.have.been.called;

            await checkFileDeleted('DeleteThisDirectory', '1.0.0', 'go/src').should.be.rejected;
        });
    });
});
