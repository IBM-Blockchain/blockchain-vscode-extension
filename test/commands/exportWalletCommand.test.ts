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
import { WalletTreeItem } from '../../src/explorer/wallets/WalletTreeItem';
import { BlockchainWalletExplorerProvider } from '../../src/explorer/walletExplorer';
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import * as path from 'path';
import * as fs from 'fs-extra';
import { VSCodeBlockchainOutputAdapter } from '../../src/logging/VSCodeBlockchainOutputAdapter';
import { Reporter } from '../../src/util/Reporter';
import { LogType } from '../../src/logging/OutputAdapter';
import { ExtensionUtil } from '../../src/util/ExtensionUtil';

// tslint:disable no-unused-expression
describe('exportWalletCommand', () => {
    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();
    let walletTreeItem: WalletTreeItem;
    let getWorkspaceFoldersStub: sinon.SinonStub;
    let workspaceFolder: any;
    let saveDialogBoxStub: sinon.SinonStub;
    const fakeTargetPath: string = path.join('/', 'a', 'fake', 'path');
    let fsCopyStub: sinon.SinonStub;
    let logSpy: sinon.SinonSpy;
    let sendTelemetryEventStub: sinon.SinonStub;
    let showWalletsQuickPickBoxStub: sinon.SinonStub;

    before(async () => {
        await TestUtil.setupTests(mySandBox);
    });

    after(async () => {
        await TestUtil.restoreAll();
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
        fsCopyStub = mySandBox.stub(fs, 'copy').resolves();
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
        fsCopyStub.should.have.been.calledOnceWithExactly(walletTreeItem.registryEntry.walletPath, fakeTargetPath, { overwrite: true });
        logSpy.should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully exported wallet ${walletTreeItem.registryEntry.name} to ${fakeTargetPath}`);
        sendTelemetryEventStub.should.have.been.calledOnceWithExactly('exportWallet');
    });

    it('should export the wallet when command is called from the command palette', async () => {
        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_WALLET);
        showWalletsQuickPickBoxStub.should.have.been.calledOnce;
        fsCopyStub.should.have.been.calledOnceWithExactly('/some/path', fakeTargetPath, { overwrite: true });
        logSpy.should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully exported wallet myWallet to ${fakeTargetPath}`);
        sendTelemetryEventStub.should.have.been.calledOnceWithExactly('exportWallet');
    });

    it('should handle the user cancelling choosing a wallet to export', async () => {
        showWalletsQuickPickBoxStub.resolves();

        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_WALLET);
        fsCopyStub.should.not.have.been.called;
        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'exportWalletCommand');
        sendTelemetryEventStub.should.not.have.been.called;
    });

    it('should handle no open workspace folders', async () => {
        getWorkspaceFoldersStub.returns([]);

        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_WALLET);
        showWalletsQuickPickBoxStub.should.have.been.calledOnce;
        saveDialogBoxStub.should.have.been.calledOnce;
        fsCopyStub.should.have.been.calledOnceWithExactly('/some/path', fakeTargetPath, { overwrite: true });
        logSpy.should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully exported wallet myWallet to ${fakeTargetPath}`);
        sendTelemetryEventStub.should.have.been.calledOnceWithExactly('exportWallet');
    });

    it('should handle the user cancelling chosing where to export the wallet to', async () => {
        saveDialogBoxStub.resolves();

        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_WALLET);
        fsCopyStub.should.not.have.been.called;
        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'exportWalletCommand');
        sendTelemetryEventStub.should.not.have.been.called;
    });

    it('should handle errors when exporting the wallet', async () => {
        const error: Error = new Error('what the fabric has happened');
        fsCopyStub.rejects(error);

        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_WALLET);
        fsCopyStub.should.have.been.calledOnceWithExactly('/some/path', fakeTargetPath, { overwrite: true });
        logSpy.should.have.been.calledWithExactly(LogType.ERROR, `Issue exporting wallet: ${error.message}`, `Issue exporting wallet: ${error.toString()}`);
        sendTelemetryEventStub.should.not.have.been.called;
    });

});
