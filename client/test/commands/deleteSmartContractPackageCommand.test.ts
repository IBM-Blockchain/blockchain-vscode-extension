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
import { PackageTreeItem } from '../../src/explorer/model/PackageTreeItem';
import { PackageRegistry } from '../../src/packages/PackageRegistry';
import { PackageRegistryEntry } from '../../src/packages/PackageRegistryEntry';
import { BlockchainTreeItem } from '../../src/explorer/model/BlockchainTreeItem';
import { BlockchainPackageExplorerProvider } from '../../src/explorer/BlockchainPackageExplorer';

chai.should();
chai.use(sinonChai);

describe('DeleteSmartContractPackageCommand', () => {

    const TEST_PACKAGE_DIRECTORY: string = path.join(path.dirname(__dirname), '../../test/data/packageDir');

    before(async () => {
        await TestUtil.setupTests();
        await TestUtil.storePackageDirectoryConfig();
        await vscode.workspace.getConfiguration().update('fabric.package.directory', TEST_PACKAGE_DIRECTORY, vscode.ConfigurationTarget.Global);
    });

    after(async () => {
        await TestUtil.restorePackageDirectoryConfig();
    });

    describe('deleteSmartContractPackage', () => {
        let mySandBox: sinon.SinonSandbox;

        beforeEach(async () => {
            mySandBox = sinon.createSandbox();
        });

        afterEach(async () => {
            mySandBox.restore();
        });

        it("should test a 'smart contract package' can be deleted from the command", async () => {
            const blockchainPackageExplorerProvider: BlockchainPackageExplorerProvider = myExtension.getBlockchainPackageExplorerProvider();
            const onDidChangeTreeDataSpy: sinon.SinonSpy = mySandBox.spy(blockchainPackageExplorerProvider['_onDidChangeTreeData'], 'fire');

            const _packages: Array<PackageRegistryEntry> = await PackageRegistry.instance().getAll();
            const _package: PackageRegistryEntry = _packages[0];
            mySandBox.stub(vscode.window, 'showQuickPick').resolves([{
                label: 'vscode-pkg-1@0.0.1',
                data: _package
            }]);
            // Execute the delete 'smart contract package' command
            const deleteStub: sinon.SinonStub = mySandBox.stub(PackageRegistry.instance(), 'delete').resolves();
            await vscode.commands.executeCommand('blockchainAPackageExplorer.deleteSmartContractPackageEntry');
            onDidChangeTreeDataSpy.should.have.been.called;

            deleteStub.should.have.been.calledOnceWithExactly(_package);
        });

        it(`should test multiple 'smart contract packages' can be deleted from the command`, async () => {
            const blockchainPackageExplorerProvider: BlockchainPackageExplorerProvider = myExtension.getBlockchainPackageExplorerProvider();
            const onDidChangeTreeDataSpy: sinon.SinonSpy = mySandBox.spy(blockchainPackageExplorerProvider['_onDidChangeTreeData'], 'fire');

            const packages: Array<PackageRegistryEntry> = await PackageRegistry.instance().getAll();

            const dataOne: PackageRegistryEntry = packages[0];
            const dataTwo: PackageRegistryEntry = packages[1];
            mySandBox.stub(vscode.window, 'showQuickPick').resolves([{
                label: 'vscode-pkg-1@0.0.1',
                data: dataOne
            }, {
                label: 'vscode-pkg-1@0.0.2',
                data: dataTwo
            }]);

            // Execute the delete 'smart contract package' command
            const deleteStub: sinon.SinonStub = mySandBox.stub(PackageRegistry.instance(), 'delete').resolves();
            await vscode.commands.executeCommand('blockchainAPackageExplorer.deleteSmartContractPackageEntry');

            onDidChangeTreeDataSpy.should.have.been.called;
            deleteStub.should.have.been.calledTwice;
            deleteStub.should.have.been.calledWithExactly(dataOne);
            deleteStub.should.have.been.calledWithExactly(dataTwo);
        });

        it("should test a 'smart contract package' can be deleted from tree", async () => {
            const blockchainPackageExplorerProvider: BlockchainPackageExplorerProvider = myExtension.getBlockchainPackageExplorerProvider();
            const initialPackages: Array<BlockchainTreeItem> = await blockchainPackageExplorerProvider.getChildren();
            const onDidChangeTreeDataSpy: sinon.SinonSpy = mySandBox.spy(blockchainPackageExplorerProvider['_onDidChangeTreeData'], 'fire');

            // This will be the 'DeleteThisDirectory' as its the first package alphabetically
            const packageToDelete: PackageTreeItem = initialPackages[0] as PackageTreeItem;
            const deleteStub: sinon.SinonStub = mySandBox.stub(PackageRegistry.instance(), 'delete').resolves();
            await vscode.commands.executeCommand('blockchainAPackageExplorer.deleteSmartContractPackageEntry', packageToDelete);

            onDidChangeTreeDataSpy.should.have.been.called;

            deleteStub.should.have.been.calledOnceWithExactly(packageToDelete.packageEntry);
        });

        it("should test delete 'smart contract package' can be cancelled", async () => {
            const blockchainPackageExplorerProvider: BlockchainPackageExplorerProvider = myExtension.getBlockchainPackageExplorerProvider();
            const initialPackages: Array<BlockchainTreeItem> = await blockchainPackageExplorerProvider.getChildren();
            const initialLength: number = initialPackages.length;
            mySandBox.stub(vscode.window, 'showQuickPick').resolves();
            await vscode.commands.executeCommand('blockchainAPackageExplorer.deleteSmartContractPackageEntry');
            const newPackageList: Array<BlockchainTreeItem> = await blockchainPackageExplorerProvider.getChildren();
            newPackageList.length.should.equal(initialLength);
            newPackageList.should.deep.equal(initialPackages);
        });
    });
});
