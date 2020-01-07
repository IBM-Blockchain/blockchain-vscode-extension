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
import { TestUtil } from '../TestUtil';
import { PackageTreeItem } from '../../extension/explorer/model/PackageTreeItem';
import { PackageRegistry } from '../../extension/registries/PackageRegistry';
import { PackageRegistryEntry } from '../../extension/registries/PackageRegistryEntry';
import { BlockchainTreeItem } from '../../extension/explorer/model/BlockchainTreeItem';
import { BlockchainPackageExplorerProvider } from '../../extension/explorer/packageExplorer';
import { UserInputUtil } from '../../extension/commands/UserInputUtil';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from 'ibm-blockchain-platform-common';
import { ExtensionCommands } from '../../ExtensionCommands';
import { SettingConfigurations } from '../../extension/configurations';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';

chai.should();
chai.use(sinonChai);

describe('DeleteSmartContractPackageCommand', () => {
    let showConfirmationWarningMessageStub: sinon.SinonStub;
    const TEST_EXTENSION_DIRECTORY: string = path.join(path.dirname(__dirname), '../../test/data');
    let mySandBox: sinon.SinonSandbox;
    before(async () => {
        mySandBox = sinon.createSandbox();
        await TestUtil.setupTests(mySandBox);
        await vscode.workspace.getConfiguration().update(SettingConfigurations.EXTENSION_DIRECTORY, TEST_EXTENSION_DIRECTORY, vscode.ConfigurationTarget.Global);
    });

    describe('deleteSmartContractPackage', () => {

        let _package: PackageRegistryEntry;
        let logStub: sinon.SinonStub;

        beforeEach(async () => {
            mySandBox.restore();
            showConfirmationWarningMessageStub = mySandBox.stub(UserInputUtil, 'showConfirmationWarningMessage').resolves(true);
            const packagesStub: sinon.SinonStub = mySandBox.stub(PackageRegistry.instance(), 'getAll');
            _package = new PackageRegistryEntry();
            _package.name = 'myPackage';
            _package.path = 'myPath';
            _package.version = '0.0.1';
            packagesStub.resolves([_package]);

            logStub = mySandBox.stub(VSCodeBlockchainOutputAdapter.instance(), 'log').resolves();
        });

        afterEach(async () => {
            mySandBox.restore();
        });

        it("should test a 'smart contract package' can be deleted from the command", async () => {
            const blockchainPackageExplorerProvider: BlockchainPackageExplorerProvider = ExtensionUtil.getBlockchainPackageExplorerProvider();
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
            logStub.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully deleted ${_package.name} package`);
        });

        it(`should test multiple 'smart contract packages' can be deleted from the command`, async () => {
            const blockchainPackageExplorerProvider: BlockchainPackageExplorerProvider = ExtensionUtil.getBlockchainPackageExplorerProvider();
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
            logStub.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully deleted packages`);
        });

        it("should test a 'smart contract package' can be deleted from tree", async () => {
            const blockchainPackageExplorerProvider: BlockchainPackageExplorerProvider = ExtensionUtil.getBlockchainPackageExplorerProvider();
            const initialPackages: Array<BlockchainTreeItem> = await blockchainPackageExplorerProvider.getChildren();
            const onDidChangeTreeDataSpy: sinon.SinonSpy = mySandBox.spy(blockchainPackageExplorerProvider['_onDidChangeTreeData'], 'fire');

            // This will be the 'DeleteThisDirectory' as its the first package alphabetically
            const packageToDelete: PackageTreeItem = initialPackages[0] as PackageTreeItem;
            const deleteStub: sinon.SinonStub = mySandBox.stub(PackageRegistry.instance(), 'delete').resolves();
            await vscode.commands.executeCommand(ExtensionCommands.DELETE_SMART_CONTRACT, packageToDelete);

            onDidChangeTreeDataSpy.should.have.been.called;

            deleteStub.should.have.been.calledOnceWithExactly(packageToDelete.packageEntry);
            logStub.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `deleteSmartContractPackage`);
            logStub.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully deleted ${_package.name} package`);
        });

        it(`should test deleting smart contract package can be cancelled`, async () => {
            const blockchainPackageExplorerProvider: BlockchainPackageExplorerProvider = ExtensionUtil.getBlockchainPackageExplorerProvider();
            const initialPackages: Array<BlockchainTreeItem> = await blockchainPackageExplorerProvider.getChildren();
            const initialLength: number = initialPackages.length;
            mySandBox.stub(UserInputUtil, 'showSmartContractPackagesQuickPickBox').resolves(undefined);
            await vscode.commands.executeCommand(ExtensionCommands.DELETE_SMART_CONTRACT);
            const newPackageList: Array<BlockchainTreeItem> = await blockchainPackageExplorerProvider.getChildren();
            newPackageList.length.should.equal(initialLength);
            newPackageList.should.deep.equal(initialPackages);
            logStub.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `deleteSmartContractPackage`);
        });

        it('should stop if user doesn\'t select to continue', async () => {
            mySandBox.stub(UserInputUtil, 'showSmartContractPackagesQuickPickBox').resolves([{
                label: 'vscode-pkg-1@0.0.1',
                data: _package
            }]);
            showConfirmationWarningMessageStub.resolves(false);

            // Execute the delete 'smart contract package' command
            const deleteSpy: sinon.SinonSpy = mySandBox.spy(PackageRegistry.instance(), 'delete');
            await vscode.commands.executeCommand(ExtensionCommands.DELETE_SMART_CONTRACT);

            deleteSpy.should.not.have.been.called;
            logStub.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `deleteSmartContractPackage`);
        });

        it('should stop if user doesn\'t pass any smart contract packages to delete', async () => {
            mySandBox.stub(UserInputUtil, 'showSmartContractPackagesQuickPickBox').resolves([]);

            // Execute the delete 'smart contract package' command
            const deleteSpy: sinon.SinonSpy = mySandBox.spy(PackageRegistry.instance(), 'delete');
            await vscode.commands.executeCommand(ExtensionCommands.DELETE_SMART_CONTRACT);

            deleteSpy.should.not.have.been.called;
            logStub.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `deleteSmartContractPackage`);
        });
    });
});
