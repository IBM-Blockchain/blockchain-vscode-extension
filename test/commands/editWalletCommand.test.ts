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
import { UserInputUtil } from '../../extension/commands/UserInputUtil';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { ExtensionCommands } from '../../ExtensionCommands';
import { LogType } from '../../extension/logging/OutputAdapter';
import { BlockchainWalletExplorerProvider } from '../../extension/explorer/walletExplorer';
import { WalletTreeItem } from '../../extension/explorer/wallets/WalletTreeItem';
import { FabricWalletRegistry } from '../../extension/registries/FabricWalletRegistry';
import { FabricWalletUtil } from '../../extension/fabric/FabricWalletUtil';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';

chai.should();
chai.use(sinonChai);

// tslint:disable no-unused-expression

describe('EditWalletCommand', () => {
    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();
    let openUserSettingsStub: sinon.SinonStub;
    let showWalletsQuickPickStub: sinon.SinonStub;
    let logSpy: sinon.SinonSpy;
    let walletRegistryStub: sinon.SinonStub;

    before(async () => {
        await TestUtil.setupTests(mySandBox);
    });

    after(async () => {
        await TestUtil.restoreAll();
    });

    beforeEach(async () => {
        openUserSettingsStub = mySandBox.stub(UserInputUtil, 'openUserSettings');
        showWalletsQuickPickStub = mySandBox.stub(UserInputUtil, 'showWalletsQuickPickBox');
        logSpy = mySandBox.stub(VSCodeBlockchainOutputAdapter.instance(), 'log');
        walletRegistryStub = mySandBox.stub(FabricWalletRegistry.instance(), 'getAll');
        walletRegistryStub.returns([{name: 'someWallet'}, {name: 'someOtherWallet'}]);
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
                logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `editWallet`);
            });

            it('should show an error if the user hasn\'t added a wallet', async () => {
                walletRegistryStub.returns([]);

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_WALLET);
                showWalletsQuickPickStub.should.not.have.been.called;
                logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, `editWallet`);
                logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `No wallets to edit found. ${FabricWalletUtil.LOCAL_WALLET} cannot be edited.`, `No wallets to edit found. ${FabricWalletUtil.LOCAL_WALLET} cannot be edited.`);
            });

            it('should open user settings to edit a wallet', async () => {
                openUserSettingsStub.resolves();
                showWalletsQuickPickStub.resolves({label: 'myWallet', data: {
                    walletPath: '/some/path',
                    name: 'myWallet'
                }});

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_WALLET);
                openUserSettingsStub.should.have.been.calledWith('myWallet');
                logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `editWallet`);
            });
        });

        describe('called from tree by clicking or right-clicking and editing', () => {

            it('should open the user settings to edit a wallet', async () => {
                const blockchainWalletExplorerProvider: BlockchainWalletExplorerProvider = ExtensionUtil.getBlockchainWalletExplorerProvider();
                const treeItem: WalletTreeItem = new WalletTreeItem(blockchainWalletExplorerProvider, 'myWallet', [], 0, {name: 'myWallet', walletPath: '/some/path', managedWallet: false});

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_WALLET, treeItem);
                openUserSettingsStub.should.have.been.calledWith('myWallet');
                logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `editWallet`);

            });
        });
    });
});
