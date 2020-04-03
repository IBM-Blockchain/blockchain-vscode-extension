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
import * as sinon from 'sinon';
import { TestUtil } from '../TestUtil';
import * as vscode from 'vscode';
import { ExtensionCommands } from '../../ExtensionCommands';
import { WalletTreeItem } from '../../extension/explorer/wallets/WalletTreeItem';
import { BlockchainWalletExplorerProvider } from '../../extension/explorer/walletExplorer';
import { UserInputUtil } from '../../extension/commands/UserInputUtil';
import * as path from 'path';
import * as fs from 'fs-extra';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { Reporter } from '../../extension/util/Reporter';
import { LogType, FabricWalletRegistryEntry, FabricWalletRegistry, FabricRuntimeUtil } from 'ibm-blockchain-platform-common';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';

// tslint:disable no-unused-expression
describe('exportWalletCommand', () => {
    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();
    let walletTreeItem: WalletTreeItem;
    let getWorkspaceFoldersStub: sinon.SinonStub;
    let workspaceFolder: any;
    let saveDialogBoxStub: sinon.SinonStub;
    const fakeTargetPath: string = path.join('/', 'a', 'fake', 'path');
    let fsEnsureDirStub: sinon.SinonStub;
    let fsReaddirStub: sinon.SinonStub;
    let fsCopyStub: sinon.SinonStub;
    let fsPathExistsStub: sinon.SinonStub;
    let fsRemoveStub: sinon.SinonStub;
    let fsLstatStub: sinon.SinonStub;
    let logSpy: sinon.SinonSpy;
    let sendTelemetryEventStub: sinon.SinonStub;
    let showWalletsQuickPickBoxStub: sinon.SinonStub;

    before(async () => {
        await TestUtil.setupTests(mySandBox);
    });

    beforeEach(async () => {
        const blockchainWalletExplorerProvider: BlockchainWalletExplorerProvider = ExtensionUtil.getBlockchainWalletExplorerProvider();
        walletTreeItem = new WalletTreeItem(blockchainWalletExplorerProvider, 'myWallet', [], 0, {name: 'myWallet', walletPath: '/some/path', managedWallet: false});
        workspaceFolder = {
            name: 'myFolder',
            uri: vscode.Uri.file('myPath')
        };
        getWorkspaceFoldersStub = mySandBox.stub(UserInputUtil, 'getWorkspaceFolders').returns([workspaceFolder]);
        saveDialogBoxStub = mySandBox.stub(vscode.window, 'showSaveDialog').resolves(vscode.Uri.file(fakeTargetPath));

        fsEnsureDirStub = mySandBox.stub(fs, 'ensureDir').resolves();
        fsReaddirStub = mySandBox.stub(fs, 'readdir');
        fsReaddirStub.onFirstCall().resolves(['admin']);
        fsReaddirStub.onSecondCall().resolves(['admin-priv', 'admin-pub', 'admin']);
        fsReaddirStub.onThirdCall().resolves(['admin-priv', 'admin-pub', 'admin']);
        fsCopyStub = mySandBox.stub(fs, 'copy').resolves();
        fsPathExistsStub = mySandBox.stub(fs, 'pathExists').resolves();
        fsRemoveStub = mySandBox.stub(fs, 'remove').resolves();
        fsLstatStub = mySandBox.stub(fs, 'lstat').resolves({
            isDirectory: sinon.stub().returns(true)
        });

        logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
        sendTelemetryEventStub = mySandBox.stub(Reporter.instance(), 'sendTelemetryEvent');
        showWalletsQuickPickBoxStub = mySandBox.stub(UserInputUtil, 'showWalletsQuickPickBox').resolves(
            {
                label: 'myWallet',
                data: {
                    walletPath: '/some/path',
                    name: 'myWallet'
                }
            }
        );
    });

    afterEach(async () => {
        mySandBox.restore();
    });

    it('should export the wallet by right-clicking on a wallet in the tree', async () => {
        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_WALLET, walletTreeItem);

        showWalletsQuickPickBoxStub.should.not.have.been.called;

        fsEnsureDirStub.should.have.been.calledTwice;
        fsReaddirStub.should.have.been.calledThrice;
        fsCopyStub.should.have.been.calledThrice;
        fsCopyStub.should.have.been.calledWith(path.join(walletTreeItem.registryEntry.walletPath, 'admin', 'admin-priv'), path.join(fakeTargetPath, 'admin', 'admin-priv'));
        fsCopyStub.should.have.been.calledWith(path.join(walletTreeItem.registryEntry.walletPath, 'admin', 'admin-pub'), path.join(fakeTargetPath, 'admin', 'admin-pub'));
        fsCopyStub.should.have.been.calledWith(path.join(walletTreeItem.registryEntry.walletPath, 'admin', 'admin'), path.join(fakeTargetPath, 'admin', 'admin'));

        logSpy.should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully exported wallet ${walletTreeItem.registryEntry.name} to ${fakeTargetPath}`);
        sendTelemetryEventStub.should.have.been.calledOnceWithExactly('exportWallet');
    });

    it('should export the wallet when command is called from the command palette', async () => {
        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_WALLET);

        showWalletsQuickPickBoxStub.should.have.been.calledOnce;

        fsEnsureDirStub.should.have.been.calledTwice;
        fsReaddirStub.should.have.been.calledThrice;
        fsCopyStub.should.have.been.calledThrice;
        fsCopyStub.should.have.been.calledWith(path.join(walletTreeItem.registryEntry.walletPath, 'admin', 'admin-priv'), path.join(fakeTargetPath, 'admin', 'admin-priv'));
        fsCopyStub.should.have.been.calledWith(path.join(walletTreeItem.registryEntry.walletPath, 'admin', 'admin-pub'), path.join(fakeTargetPath, 'admin', 'admin-pub'));
        fsCopyStub.should.have.been.calledWith(path.join(walletTreeItem.registryEntry.walletPath, 'admin', 'admin'), path.join(fakeTargetPath, 'admin', 'admin'));

        logSpy.should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully exported wallet ${walletTreeItem.registryEntry.name} to ${fakeTargetPath}`);
        sendTelemetryEventStub.should.have.been.calledOnceWithExactly('exportWallet');
    });

    it('should handle the user cancelling choosing a wallet to export', async () => {
        showWalletsQuickPickBoxStub.resolves();

        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_WALLET);

        fsEnsureDirStub.should.not.have.been.called;
        fsReaddirStub.should.not.have.been.called;
        fsCopyStub.should.not.have.been.called;
        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'exportWalletCommand');
        sendTelemetryEventStub.should.not.have.been.called;
    });

    it('should handle no open workspace folders', async () => {
        getWorkspaceFoldersStub.returns([]);

        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_WALLET);

        showWalletsQuickPickBoxStub.should.have.been.calledOnce;
        saveDialogBoxStub.should.have.been.calledOnce;

        fsEnsureDirStub.should.have.been.calledTwice;
        fsReaddirStub.should.have.been.calledThrice;
        fsCopyStub.should.have.been.calledThrice;
        fsCopyStub.should.have.been.calledWith(path.join(walletTreeItem.registryEntry.walletPath, 'admin', 'admin-priv'), path.join(fakeTargetPath, 'admin', 'admin-priv'));
        fsCopyStub.should.have.been.calledWith(path.join(walletTreeItem.registryEntry.walletPath, 'admin', 'admin-pub'), path.join(fakeTargetPath, 'admin', 'admin-pub'));
        fsCopyStub.should.have.been.calledWith(path.join(walletTreeItem.registryEntry.walletPath, 'admin', 'admin'), path.join(fakeTargetPath, 'admin', 'admin'));

        logSpy.should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully exported wallet ${walletTreeItem.registryEntry.name} to ${fakeTargetPath}`);
        sendTelemetryEventStub.should.have.been.calledOnceWithExactly('exportWallet');
    });

    it('should handle the user cancelling chosing where to export the wallet to', async () => {
        saveDialogBoxStub.resolves();

        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_WALLET);
        fsEnsureDirStub.should.not.have.been.called;
        fsReaddirStub.should.not.have.been.called;
        fsCopyStub.should.not.have.been.called;
        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'exportWalletCommand');
        sendTelemetryEventStub.should.not.have.been.called;
    });

    it('should handle errors when exporting the wallet', async () => {
        const error: Error = new Error('what the fabric has happened');
        fsEnsureDirStub.rejects(error);

        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_WALLET);

        fsEnsureDirStub.should.have.been.calledOnceWithExactly(fakeTargetPath);

        logSpy.should.have.been.calledWithExactly(LogType.ERROR, `Issue exporting wallet: ${error.message}`, `Issue exporting wallet: ${error.toString()}`);
        sendTelemetryEventStub.should.not.have.been.called;
    });

    it('should handle errors when exporting the wallet and clean up anything already exported', async () => {
        fsPathExistsStub.resolves(true);

        const error: Error = new Error('what the fabric has happened');
        fsCopyStub.rejects(error);

        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_WALLET);

        fsEnsureDirStub.should.have.been.calledTwice;
        fsReaddirStub.should.have.been.calledTwice;
        fsCopyStub.should.have.been.calledOnceWithExactly(path.join(walletTreeItem.registryEntry.walletPath, 'admin', 'admin-priv'), path.join(fakeTargetPath, 'admin', 'admin-priv'));
        fsRemoveStub.should.have.been.calledOnceWithExactly(fakeTargetPath);

        logSpy.should.have.been.calledWithExactly(LogType.ERROR, `Issue exporting wallet: ${error.message}`, `Issue exporting wallet: ${error.toString()}`);
        sendTelemetryEventStub.should.not.have.been.called;
    });

    it('should be able to export local wallet', async () => {

        await TestUtil.setupLocalFabric();

        const localWallet: FabricWalletRegistryEntry = await FabricWalletRegistry.instance().get('Org1', FabricRuntimeUtil.LOCAL_FABRIC);

        showWalletsQuickPickBoxStub.resolves({
            label: localWallet.displayName,
            data: localWallet

        });

        fsCopyStub.resetHistory();
        logSpy.resetHistory();
        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_WALLET);
        showWalletsQuickPickBoxStub.should.have.been.calledOnce;

        fsEnsureDirStub.should.have.been.calledTwice;
        fsReaddirStub.should.have.been.calledThrice;
        fsCopyStub.should.have.been.calledThrice;
        fsCopyStub.should.have.been.calledWith(path.join(localWallet.walletPath, 'admin', 'admin-priv'), path.join(fakeTargetPath, 'admin', 'admin-priv'));
        fsCopyStub.should.have.been.calledWith(path.join(localWallet.walletPath, 'admin', 'admin-pub'), path.join(fakeTargetPath, 'admin', 'admin-pub'));
        fsCopyStub.should.have.been.calledWith(path.join(localWallet.walletPath, 'admin', 'admin'), path.join(fakeTargetPath, 'admin', 'admin'));

        logSpy.should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully exported wallet ${localWallet.displayName} to ${fakeTargetPath}`);
        sendTelemetryEventStub.should.have.been.calledOnceWithExactly('exportWallet');
    });

    it('should handle exporting an empty wallet', async () => {
        fsReaddirStub.onFirstCall().resolves([]);

        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_WALLET);

        showWalletsQuickPickBoxStub.should.have.been.calledOnce;

        fsEnsureDirStub.should.have.been.calledOnceWithExactly(fakeTargetPath);
        fsReaddirStub.should.have.been.calledOnce;
        fsCopyStub.should.not.have.been.called;

        logSpy.should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully exported wallet ${walletTreeItem.registryEntry.name} to ${fakeTargetPath}`);
        sendTelemetryEventStub.should.have.been.calledOnceWithExactly('exportWallet');
    });

    it(`should not export files that aren't in a directory`, async () => {
        fsLstatStub.resolves({
            isDirectory: sinon.stub().returns(false)
        });

        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_WALLET);

        showWalletsQuickPickBoxStub.should.have.been.calledOnce;

        fsEnsureDirStub.should.have.been.calledOnceWithExactly(fakeTargetPath);
        fsReaddirStub.should.have.been.calledOnce;
        fsCopyStub.should.not.have.been.called;

        logSpy.should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully exported wallet ${walletTreeItem.registryEntry.name} to ${fakeTargetPath}`);
        sendTelemetryEventStub.should.have.been.calledOnceWithExactly('exportWallet');
    });

    it(`should not export irrelevant identity files`, async () => {
        fsReaddirStub.onSecondCall().resolves(['admin-priv', 'admin-pub', 'admin', 'random-file.txt']);

        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_WALLET);

        fsEnsureDirStub.should.have.been.calledTwice;
        fsReaddirStub.should.have.been.calledThrice;
        fsCopyStub.should.have.been.calledThrice;
        fsCopyStub.should.have.been.calledWith(path.join(walletTreeItem.registryEntry.walletPath, 'admin', 'admin-priv'), path.join(fakeTargetPath, 'admin', 'admin-priv'));
        fsCopyStub.should.have.been.calledWith(path.join(walletTreeItem.registryEntry.walletPath, 'admin', 'admin-pub'), path.join(fakeTargetPath, 'admin', 'admin-pub'));
        fsCopyStub.should.have.been.calledWith(path.join(walletTreeItem.registryEntry.walletPath, 'admin', 'admin'), path.join(fakeTargetPath, 'admin', 'admin'));
        fsCopyStub.should.not.have.been.calledWith(path.join(walletTreeItem.registryEntry.walletPath, 'admin', 'admin'), path.join(fakeTargetPath, 'admin', 'random-file.txt'));

        logSpy.should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully exported wallet ${walletTreeItem.registryEntry.name} to ${fakeTargetPath}`);
        sendTelemetryEventStub.should.have.been.calledOnceWithExactly('exportWallet');
    });

    it('should remove an identity directory if it contains no relevant identity files', async () => {
        fsReaddirStub.onSecondCall().resolves(['random-file.txt']);
        fsReaddirStub.onThirdCall().resolves([]);

        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_WALLET);

        fsEnsureDirStub.should.have.been.calledTwice;
        fsReaddirStub.should.have.been.calledThrice;
        fsCopyStub.should.not.have.been.called;
        fsRemoveStub.should.have.been.calledOnceWithExactly(path.join(fakeTargetPath, 'admin'));

        logSpy.should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully exported wallet ${walletTreeItem.registryEntry.name} to ${fakeTargetPath}`);
        sendTelemetryEventStub.should.have.been.calledOnceWithExactly('exportWallet');
    });
});
