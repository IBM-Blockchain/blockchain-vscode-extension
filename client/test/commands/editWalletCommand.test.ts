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
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { TestUtil } from '../TestUtil';
import * as myExtension from '../../src/extension';
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import { VSCodeBlockchainOutputAdapter } from '../../src/logging/VSCodeBlockchainOutputAdapter';
import { ExtensionCommands } from '../../ExtensionCommands';
import { LogType } from '../../src/logging/OutputAdapter';
import { BlockchainWalletExplorerProvider } from '../../src/explorer/walletExplorer';
import { WalletTreeItem } from '../../src/explorer/wallets/WalletTreeItem';

chai.should();
chai.use(sinonChai);

// tslint:disable no-unused-expression

describe('EditWalletCommand', () => {
    let mySandBox: sinon.SinonSandbox;
    let openUserSettingsStub: sinon.SinonStub;
    let showWalletsQuickPickStub: sinon.SinonStub;
    let logSpy: sinon.SinonSpy;

    before(async () => {
        await TestUtil.setupTests();
        await TestUtil.storeWalletsConfig();
    });

    after(async () => {
        await TestUtil.restoreWalletsConfig();
    });

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
        openUserSettingsStub = mySandBox.stub(UserInputUtil, 'openUserSettings');
        showWalletsQuickPickStub = mySandBox.stub(UserInputUtil, 'showWalletsQuickPickBox');
        logSpy = mySandBox.stub(VSCodeBlockchainOutputAdapter.instance(), 'log');
    });

    afterEach(() => {
        mySandBox.restore();
    });

    describe('editWallet', () => {

        describe('called from command', () => {

            it('should cancel if no wallet chosen to edit', async () => {
                showWalletsQuickPickStub.resolves();

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_WALLET);
                openUserSettingsStub.should.not.have.been.called;
                logSpy.should.have.been.calledOnceWith(LogType.INFO);
            });

            it('should open user settings to edit a wallet', async () => {
                openUserSettingsStub.resolves();
                showWalletsQuickPickStub.resolves({label: 'myWallet', data: {
                    walletPath: '/some/path',
                    name: 'myWallet'
                }});

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_WALLET);
                openUserSettingsStub.should.have.been.calledWith('myWallet');
                logSpy.should.have.been.calledOnce;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });
        });

        describe('called from tree by clicking or right-clicking and editing', () => {

            it('should open the user settings to edit a wallet', async () => {
                const blockchainWalletExplorerProvider: BlockchainWalletExplorerProvider = myExtension.getBlockchainWalletExplorerProvider();
                const treeItem: WalletTreeItem = new WalletTreeItem(blockchainWalletExplorerProvider, 'myWallet', [], 0);

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_WALLET, treeItem);
                openUserSettingsStub.should.have.been.calledWith('myWallet');
                logSpy.should.have.been.calledOnce;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);

            });
        });
    });
});
