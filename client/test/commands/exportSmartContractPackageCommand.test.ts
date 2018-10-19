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
import { BlockchainPackageExplorerProvider } from '../../src/explorer/BlockchainPackageExplorer';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as myExtension from '../../src/extension';
import { PackageRegistry } from '../../src/packages/PackageRegistry';
import { PackageRegistryEntry } from '../../src/packages/PackageRegistryEntry';
import { TestUtil } from '../TestUtil';

import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { PackageTreeItem } from '../../src/explorer/model/PackageTreeItem';

chai.should();
chai.use(sinonChai);

// tslint:disable no-unused-expression
describe('exportSmartContractPackageCommand', () => {

    const TEST_PACKAGE_DIRECTORY: string = path.join(path.dirname(__dirname), '../../test/data/packageDir');
    const targetPath: string = path.join('/', 'path', 'to', 'the', 'vscode-pkg-1@0.0.1.cds');

    before(async () => {
        await TestUtil.setupTests();
        await TestUtil.storePackageDirectoryConfig();
        await vscode.workspace.getConfiguration().update('fabric.package.directory', TEST_PACKAGE_DIRECTORY, vscode.ConfigurationTarget.Global);
    });

    after(async () => {
        await TestUtil.restorePackageDirectoryConfig();
    });

    let sandbox: sinon.SinonSandbox;
    let showSaveDialogStub: sinon.SinonStub;
    let copyStub: sinon.SinonStub;
    let showInformationMessageStub: sinon.SinonStub;
    let showErrorMessageStub: sinon.SinonStub;

    beforeEach(async () => {
        sandbox = sinon.createSandbox();
        showSaveDialogStub = sandbox.stub(vscode.window, 'showSaveDialog').resolves(vscode.Uri.file(targetPath));
        copyStub = sandbox.stub(fs, 'copy').resolves();
        showInformationMessageStub = sandbox.stub(vscode.window, 'showInformationMessage');
        showErrorMessageStub = sandbox.stub(vscode.window, 'showErrorMessage');
    });

    afterEach(async () => {
        sandbox.restore();
    });

    it('should export a package to the file system using the command', async () => {
        const _packages: PackageRegistryEntry[] = await PackageRegistry.instance().getAll();
        const _package: PackageRegistryEntry = _packages[0];
        sandbox.stub(vscode.window, 'showQuickPick').resolves({
            label: 'vscode-pkg-1@0.0.1',
            data: _package
        });
        await vscode.commands.executeCommand('blockchainAPackageExplorer.exportSmartContractPackageEntry');
        showSaveDialogStub.should.have.been.calledOnce;
        copyStub.should.have.been.calledOnceWithExactly(_package.path, targetPath, { overwrite: true });
        showInformationMessageStub.should.have.been.calledOnceWithExactly(`Exported smart contract package vscode-pkg-1@0.0.1 to ${targetPath}.`);
        showErrorMessageStub.should.not.have.been.called;
    });

    it('should export a package to the file system using the tree menu item', async () => {
        const blockchainPackageExplorerProvider: BlockchainPackageExplorerProvider = myExtension.getBlockchainPackageExplorerProvider();
        const _packages: PackageTreeItem[] = await blockchainPackageExplorerProvider.getChildren();
        const _package: PackageTreeItem = _packages[0];
        await vscode.commands.executeCommand('blockchainAPackageExplorer.exportSmartContractPackageEntry', _package);
        showSaveDialogStub.should.have.been.calledOnce;
        copyStub.should.have.been.calledOnceWithExactly(_package.packageEntry.path, targetPath, { overwrite: true });
        showInformationMessageStub.should.have.been.calledOnceWithExactly(`Exported smart contract package vscode-pkg-1@0.0.1 to ${targetPath}.`);
        showErrorMessageStub.should.not.have.been.called;
    });

    it('should handle the user cancelling the package quick pick', async () => {
        const _packages: PackageRegistryEntry[] = await PackageRegistry.instance().getAll();
        const _package: PackageRegistryEntry = _packages[0];
        sandbox.stub(vscode.window, 'showQuickPick').resolves();
        await vscode.commands.executeCommand('blockchainAPackageExplorer.exportSmartContractPackageEntry');
        showSaveDialogStub.should.not.have.been.called;
        copyStub.should.not.have.been.called;
        showInformationMessageStub.should.not.have.been.called;
        showErrorMessageStub.should.not.have.been.called;
    });

    it('should handle the user cancelling the save dialog', async () => {
        const _packages: PackageRegistryEntry[] = await PackageRegistry.instance().getAll();
        const _package: PackageRegistryEntry = _packages[0];
        sandbox.stub(vscode.window, 'showQuickPick').resolves({
            label: 'vscode-pkg-1@0.0.1',
            data: _package
        });
        showSaveDialogStub.resolves();
        await vscode.commands.executeCommand('blockchainAPackageExplorer.exportSmartContractPackageEntry');
        copyStub.should.not.have.been.called;
        showInformationMessageStub.should.not.have.been.called;
        showErrorMessageStub.should.not.have.been.called;
    });

    it('should handle an error writing the file to the file system', async () => {
        const _packages: PackageRegistryEntry[] = await PackageRegistry.instance().getAll();
        const _package: PackageRegistryEntry = _packages[0];
        sandbox.stub(vscode.window, 'showQuickPick').resolves({
            label: 'vscode-pkg-1@0.0.1',
            data: _package
        });
        copyStub.rejects(new Error('such error'));
        await vscode.commands.executeCommand('blockchainAPackageExplorer.exportSmartContractPackageEntry');
        showInformationMessageStub.should.not.have.been.called;
        showErrorMessageStub.should.have.been.calledOnceWithExactly('such error');
    });

});
