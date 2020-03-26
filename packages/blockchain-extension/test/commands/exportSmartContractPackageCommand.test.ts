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
import { BlockchainPackageExplorerProvider } from '../../extension/explorer/packageExplorer';
import * as fs from 'fs-extra';
import * as path from 'path';
import { PackageRegistry } from '../../extension/registries/PackageRegistry';
import { PackageRegistryEntry } from '../../extension/registries/PackageRegistryEntry';
import { TestUtil } from '../TestUtil';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { PackageTreeItem } from '../../extension/explorer/model/PackageTreeItem';
import { BlockchainTreeItem } from '../../extension/explorer/model/BlockchainTreeItem';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from 'ibm-blockchain-platform-common';
import { ExtensionCommands } from '../../ExtensionCommands';
import { Reporter } from '../../extension/util/Reporter';
import { SettingConfigurations } from '../../extension/configurations';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';

const should: Chai.Should = chai.should();
chai.use(sinonChai);

// tslint:disable no-unused-expression
describe('exportSmartContractPackageCommand', () => {
    const sandbox: sinon.SinonSandbox = sinon.createSandbox();

    const TEST_PACKAGE_DIRECTORY: string = path.join(path.dirname(__dirname), '../../test/data/packageDir');
    const targetPath: string = path.join('/', 'path', 'to', 'the', 'vscode-pkg-1@0.0.1.cds');

    before(async () => {
        await TestUtil.setupTests(sandbox);
        await vscode.workspace.getConfiguration().update(SettingConfigurations.EXTENSION_DIRECTORY, TEST_PACKAGE_DIRECTORY, vscode.ConfigurationTarget.Global);
    });

    let showSaveDialogStub: sinon.SinonStub;
    let copyStub: sinon.SinonStub;
    let logSpy: sinon.SinonStub;
    let sendTelemetryEventStub: sinon.SinonStub;

    beforeEach(async () => {
        showSaveDialogStub = sandbox.stub(vscode.window, 'showSaveDialog').resolves(vscode.Uri.file(targetPath));
        copyStub = sandbox.stub(fs, 'copy').resolves();
        logSpy = sandbox.stub(VSCodeBlockchainOutputAdapter.instance(), 'log');
        sendTelemetryEventStub = sandbox.stub(Reporter.instance(), 'sendTelemetryEvent');

    });

    afterEach(async () => {
        sandbox.restore();
    });

    after(async () => {
        await vscode.workspace.getConfiguration().update(SettingConfigurations.EXTENSION_DIRECTORY, TestUtil.EXTENSION_TEST_DIR, vscode.ConfigurationTarget.Global);
    });

    it('should export a package to the file system using the command', async () => {
        const _packages: PackageRegistryEntry[] = await PackageRegistry.instance().getAll();
        const _package: PackageRegistryEntry = _packages[0];
        sandbox.stub(vscode.window, 'showQuickPick').resolves({
            label: 'vscode-pkg-1@0.0.1',
            data: _package
        });
        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_SMART_CONTRACT);
        showSaveDialogStub.should.have.been.calledOnce;
        copyStub.should.have.been.calledOnceWithExactly(_package.path, targetPath, { overwrite: true });
        logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'exportSmartContractPackage');
        logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, `Exported smart contract package vscode-pkg-1@0.0.1 to ${targetPath}.`);
        sendTelemetryEventStub.should.have.been.calledOnceWithExactly('exportSmartContractPackageCommand');
    });

    it('should export a package to the file system using the tree menu item', async () => {
        const blockchainPackageExplorerProvider: BlockchainPackageExplorerProvider = ExtensionUtil.getBlockchainPackageExplorerProvider();
        const _packages: BlockchainTreeItem[] = await blockchainPackageExplorerProvider.getChildren();
        const _package: PackageTreeItem = _packages[0] as PackageTreeItem;
        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_SMART_CONTRACT, _package);
        showSaveDialogStub.should.have.been.calledOnce;
        copyStub.should.have.been.calledOnceWithExactly(_package.packageEntry.path, targetPath, { overwrite: true });
        logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'exportSmartContractPackage');
        logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, `Exported smart contract package vscode-pkg-1@0.0.1 to ${targetPath}.`);
        sendTelemetryEventStub.should.have.been.calledOnceWithExactly('exportSmartContractPackageCommand');
    });

    it('should handle the user cancelling the package quick pick', async () => {
        sandbox.stub(vscode.window, 'showQuickPick').resolves();
        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_SMART_CONTRACT);
        showSaveDialogStub.should.not.have.been.called;
        copyStub.should.not.have.been.called;
        logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'exportSmartContractPackage');
        should.not.exist(logSpy.getCall(1));
    });

    it('should handle the user cancelling the save dialog', async () => {
        const _packages: PackageRegistryEntry[] = await PackageRegistry.instance().getAll();
        const _package: PackageRegistryEntry = _packages[0];
        sandbox.stub(vscode.window, 'showQuickPick').resolves({
            label: 'vscode-pkg-1@0.0.1',
            data: _package
        });
        showSaveDialogStub.resolves();
        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_SMART_CONTRACT);
        copyStub.should.not.have.been.called;
        logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'exportSmartContractPackage');
        should.not.exist(logSpy.getCall(1));
    });

    it('should handle an error writing the file to the file system', async () => {
        const _packages: PackageRegistryEntry[] = await PackageRegistry.instance().getAll();
        const _package: PackageRegistryEntry = _packages[0];
        sandbox.stub(vscode.window, 'showQuickPick').resolves({
            label: 'vscode-pkg-1@0.0.1',
            data: _package
        });
        const error: Error = new Error('such error');
        copyStub.rejects(error);
        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_SMART_CONTRACT);
        logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'exportSmartContractPackage');
        logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, error.message, error.toString());
        sendTelemetryEventStub.should.not.have.been.called;
    });
});
