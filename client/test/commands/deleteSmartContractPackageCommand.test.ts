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
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import { VSCodeOutputAdapter } from '../../src/logging/VSCodeOutputAdapter';
import { LogType } from '../../src/logging/OutputAdapter';
import { ExtensionCommands } from '../../ExtensionCommands';

const should: Chai.Should = chai.should();
chai.use(sinonChai);

describe('DeleteSmartContractPackageCommand', () => {

    const TEST_EXTENSION_DIRECTORY: string = path.join(path.dirname(__dirname), '../../test/data');

    before(async () => {
        await TestUtil.setupTests();
        await TestUtil.storeExtensionDirectoryConfig();
        await vscode.workspace.getConfiguration().update('blockchain.ext.directory', TEST_EXTENSION_DIRECTORY, vscode.ConfigurationTarget.Global);
    });

    after(async () => {
        await TestUtil.restoreExtensionDirectoryConfig();
    });

    describe('deleteSmartContractPackage', () => {
        let mySandBox: sinon.SinonSandbox;
        let _package: PackageRegistryEntry;
        let logStub: sinon.SinonStub;
        beforeEach(async () => {
            mySandBox = sinon.createSandbox();

            const packagesStub: sinon.SinonStub = mySandBox.stub(PackageRegistry.instance(), 'getAll');
            _package = new PackageRegistryEntry();
            _package.name = 'myPackage';
            _package.path = 'myPath';
            _package.version = '0.0.1';
            packagesStub.resolves([_package]);

            logStub = mySandBox.stub(VSCodeOutputAdapter.instance(), 'log').resolves();
        });

        afterEach(async () => {
            mySandBox.restore();
        });

        it("should test a 'smart contract package' can be deleted from the command", async () => {
            const blockchainPackageExplorerProvider: BlockchainPackageExplorerProvider = myExtension.getBlockchainPackageExplorerProvider();
            const onDidChangeTreeDataSpy: sinon.SinonSpy = mySandBox.spy(blockchainPackageExplorerProvider['_onDidChangeTreeData'], 'fire');

            mySandBox.stub(UserInputUtil, 'showSmartContractPackagesQuickPickBox').resolves([{
                label: 'vscode-pkg-1@0.0.1',
                data: _package
            }]);
            // Execute the delete 'smart contract package' command
            const deleteStub: sinon.SinonStub = mySandBox.stub(PackageRegistry.instance(), 'delete').resolves();
            await vscode.commands.executeCommand(ExtensionCommands.DELETE_SMART_CONTRACT);
            onDidChangeTreeDataSpy.should.have.been.called;

            deleteStub.should.have.been.calledOnceWithExactly(_package);
            logStub.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `deleteSmartContractPackage`);
            logStub.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Succesfully deleted package(s)`);
        });

        it(`should test multiple 'smart contract packages' can be deleted from the command`, async () => {
            const blockchainPackageExplorerProvider: BlockchainPackageExplorerProvider = myExtension.getBlockchainPackageExplorerProvider();
            const onDidChangeTreeDataSpy: sinon.SinonSpy = mySandBox.spy(blockchainPackageExplorerProvider['_onDidChangeTreeData'], 'fire');

            const packages: Array<PackageRegistryEntry> = await PackageRegistry.instance().getAll();

            const dataOne: PackageRegistryEntry = packages[0];
            const dataTwo: PackageRegistryEntry = packages[1];
            mySandBox.stub(UserInputUtil, 'showSmartContractPackagesQuickPickBox').resolves([{
                label: 'vscode-pkg-1@0.0.1',
                data: dataOne
            }, {
                label: 'vscode-pkg-1@0.0.2',
                data: dataTwo
            }]);

            // Execute the delete 'smart contract package' command
            const deleteStub: sinon.SinonStub = mySandBox.stub(PackageRegistry.instance(), 'delete').resolves();
            await vscode.commands.executeCommand(ExtensionCommands.DELETE_SMART_CONTRACT);

            onDidChangeTreeDataSpy.should.have.been.called;
            deleteStub.should.have.been.calledTwice;
            deleteStub.should.have.been.calledWithExactly(dataOne);
            deleteStub.should.have.been.calledWithExactly(dataTwo);
            logStub.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `deleteSmartContractPackage`);
            logStub.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Succesfully deleted package(s)`);
        });

        it("should test a 'smart contract package' can be deleted from tree", async () => {
            const blockchainPackageExplorerProvider: BlockchainPackageExplorerProvider = myExtension.getBlockchainPackageExplorerProvider();
            const initialPackages: Array<BlockchainTreeItem> = await blockchainPackageExplorerProvider.getChildren();
            const onDidChangeTreeDataSpy: sinon.SinonSpy = mySandBox.spy(blockchainPackageExplorerProvider['_onDidChangeTreeData'], 'fire');

            // This will be the 'DeleteThisDirectory' as its the first package alphabetically
            const packageToDelete: PackageTreeItem = initialPackages[0] as PackageTreeItem;
            const deleteStub: sinon.SinonStub = mySandBox.stub(PackageRegistry.instance(), 'delete').resolves();
            await vscode.commands.executeCommand(ExtensionCommands.DELETE_SMART_CONTRACT, packageToDelete);

            onDidChangeTreeDataSpy.should.have.been.called;

            deleteStub.should.have.been.calledOnceWithExactly(packageToDelete.packageEntry);
            logStub.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `deleteSmartContractPackage`);
            logStub.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Succesfully deleted package(s)`);
        });

        it("should test delete 'smart contract package' can be cancelled", async () => {
            const blockchainPackageExplorerProvider: BlockchainPackageExplorerProvider = myExtension.getBlockchainPackageExplorerProvider();
            const initialPackages: Array<BlockchainTreeItem> = await blockchainPackageExplorerProvider.getChildren();
            const initialLength: number = initialPackages.length;
            mySandBox.stub(UserInputUtil, 'showSmartContractPackagesQuickPickBox').resolves(undefined);
            await vscode.commands.executeCommand(ExtensionCommands.DELETE_SMART_CONTRACT);
            const newPackageList: Array<BlockchainTreeItem> = await blockchainPackageExplorerProvider.getChildren();
            newPackageList.length.should.equal(initialLength);
            newPackageList.should.deep.equal(initialPackages);
            logStub.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `deleteSmartContractPackage`);
            should.not.exist(logStub.getCall(1));
        });

        it('should stop if user doesn\'t pass any smart contract packages to delete', async () => {
            mySandBox.stub(UserInputUtil, 'showSmartContractPackagesQuickPickBox').resolves([]);

            // Execute the delete 'smart contract package' command
            const deleteSpy: sinon.SinonSpy = mySandBox.spy(PackageRegistry.instance(), 'delete');
            await vscode.commands.executeCommand(ExtensionCommands.DELETE_SMART_CONTRACT);

            deleteSpy.should.not.have.been.called;
            logStub.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `deleteSmartContractPackage`);
            should.not.exist(logStub.getCall(1));
        });
    });
});
