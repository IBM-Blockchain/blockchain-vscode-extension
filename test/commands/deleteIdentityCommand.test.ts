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
import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as sinonChai from 'sinon-chai';
import * as chai from 'chai';
import * as path from 'path';
import { TestUtil } from '../TestUtil';
import { ExtensionCommands } from '../../ExtensionCommands';
import { VSCodeBlockchainOutputAdapter } from '../../src/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../../src/logging/OutputAdapter';
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import { FabricWalletRegistryEntry } from '../../src/fabric/FabricWalletRegistryEntry';
import { BlockchainWalletExplorerProvider } from '../../src/explorer/walletExplorer';
import * as myExtension from '../../src/extension';
import { FabricWallet } from '../../src/fabric/FabricWallet';
import { FabricWalletGeneratorFactory } from '../../src/fabric/FabricWalletGeneratorFactory';
import { IdentityTreeItem } from '../../src/explorer/model/IdentityTreeItem';
import { FabricWalletUtil } from '../../src/fabric/FabricWalletUtil';
import { FabricRuntimeUtil } from '../../src/fabric/FabricRuntimeUtil';
import { SettingConfigurations } from '../../SettingConfigurations';

chai.should();
chai.use(sinonChai);
// tslint:disable no-unused-expression

describe('deleteIdentityCommand', () => {

    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();
    let logSpy: sinon.SinonSpy;
    let showConfirmationWarningMessage: sinon.SinonStub;
    let fsRemoveStub: sinon.SinonStub;
    let showWalletsQuickPickStub: sinon.SinonStub;
    let showIdentitiesQuickPickStub: sinon.SinonStub;
    let purpleWallet: FabricWalletRegistryEntry;
    let blueWalletEntry: FabricWalletRegistryEntry;
    let testWallet: FabricWallet;
    let walletIdentitiesStub: sinon.SinonStub;
    let executeCommandSpy: sinon.SinonSpy;
    let identityName: string;
    let getWalletStub: sinon.SinonStub;

    before(async () => {
        await TestUtil.setupTests(mySandBox);
        await TestUtil.storeWalletsConfig();
    });

    after(async () => {
        await TestUtil.restoreWalletsConfig();
    });

    beforeEach(async () => {
        // Set up stubs
        mySandBox.restore();

        logSpy = mySandBox.stub(VSCodeBlockchainOutputAdapter.instance(), 'log');
        showConfirmationWarningMessage = mySandBox.stub(UserInputUtil, 'showConfirmationWarningMessage').resolves(true);
        fsRemoveStub = mySandBox.stub(fs, 'remove').resolves();
        showWalletsQuickPickStub = mySandBox.stub(UserInputUtil, 'showWalletsQuickPickBox');
        showIdentitiesQuickPickStub = mySandBox.stub(UserInputUtil, 'showIdentitiesQuickPickBox');

        // Reset the wallet registry
        await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_WALLETS, [], vscode.ConfigurationTarget.Global);
        // Add wallets to the registry
        purpleWallet = new FabricWalletRegistryEntry({
            name: 'purpleWallet',
            walletPath: '/some/path'
        });
        blueWalletEntry = new FabricWalletRegistryEntry({
            name: 'blueWallet',
            walletPath: '/some/bluer/path'
        });
        await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_WALLETS, [purpleWallet, blueWalletEntry], vscode.ConfigurationTarget.Global);

        testWallet = new FabricWallet('/some/path');
        walletIdentitiesStub = mySandBox.stub(testWallet, 'getIdentityNames');
        getWalletStub = mySandBox.stub(FabricWalletGeneratorFactory.createFabricWalletGenerator(), 'getWallet').returns(testWallet);

        executeCommandSpy = mySandBox.spy(vscode.commands, 'executeCommand');
    });

    afterEach(() => {
        mySandBox.restore();
    });

    it('should delete an identity when called from the command palette', async () => {
        identityName = 'greenConga';
        showWalletsQuickPickStub.resolves({
            label: purpleWallet.name,
            data: purpleWallet
        });
        walletIdentitiesStub.resolves([identityName, 'yellowConga']);
        showIdentitiesQuickPickStub.resolves(identityName);

        await vscode.commands.executeCommand(ExtensionCommands.DELETE_IDENTITY);

        fsRemoveStub.should.have.been.calledOnceWithExactly(path.join(purpleWallet.walletPath, identityName));
        showWalletsQuickPickStub.should.have.been.calledOnce;
        walletIdentitiesStub.should.have.been.calledOnce;
        showIdentitiesQuickPickStub.should.have.been.calledOnce;
        logSpy.should.have.been.calledTwice;
        showConfirmationWarningMessage.should.have.been.calledOnce;
        logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `deleteIdentity`);
        logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully deleted identity: ${identityName}`, `Successfully deleted identity: ${identityName}`);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);
    });

    it('should handle the user cancelling selecting a wallet', async () => {
        showWalletsQuickPickStub.resolves();

        await vscode.commands.executeCommand(ExtensionCommands.DELETE_IDENTITY);

        showWalletsQuickPickStub.should.have.been.calledOnce;
        walletIdentitiesStub.should.not.have.been.called;
        fsRemoveStub.should.not.have.been.called;
        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `deleteIdentity`);
    });

    it('should show an error if it finds no identities in the chosen wallet', async () => {
        showWalletsQuickPickStub.resolves({
            label: purpleWallet.name,
            data: purpleWallet
        });
        walletIdentitiesStub.resolves([]);

        await vscode.commands.executeCommand(ExtensionCommands.DELETE_IDENTITY);

        showWalletsQuickPickStub.should.have.been.calledOnce;
        walletIdentitiesStub.should.have.been.calledOnce;
        fsRemoveStub.should.not.have.been.called;
        logSpy.should.have.been.calledTwice;
        logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, `deleteIdentity`);
        logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `No identities in wallet: ${purpleWallet.walletPath}`, `No identities in wallet: ${purpleWallet.walletPath}`);
    });

    it('should show a different error if there are no non-admin identities in the local_fabric wallet', async () => {
        identityName = 'bob';

        const runtimeWalletRegistryEntry: FabricWalletRegistryEntry = new FabricWalletRegistryEntry();

        runtimeWalletRegistryEntry.name = FabricWalletUtil.LOCAL_WALLET;
        runtimeWalletRegistryEntry.walletPath = 'wallet_path';
        runtimeWalletRegistryEntry.managedWallet = true;

        showWalletsQuickPickStub.resolves({
            label: FabricWalletUtil.LOCAL_WALLET,
            data: runtimeWalletRegistryEntry
        });
        walletIdentitiesStub.resolves([]);

        await vscode.commands.executeCommand(ExtensionCommands.DELETE_IDENTITY);

        walletIdentitiesStub.should.have.been.calledOnce;
        fsRemoveStub.should.not.have.been.called;
        logSpy.should.have.been.calledTwice;
        logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, `deleteIdentity`);
        logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `No identities to delete in wallet: ${runtimeWalletRegistryEntry.name}. The ${FabricRuntimeUtil.ADMIN_USER} identity cannot be deleted.`, `No identities to delete in wallet: ${runtimeWalletRegistryEntry.name}. The ${FabricRuntimeUtil.ADMIN_USER} identity cannot be deleted.`);
    });

    it('should handle the user cancelling selecting an identity to delete', async () => {
        identityName = 'greenConga';
        showWalletsQuickPickStub.resolves({
            label: purpleWallet.name,
            data: purpleWallet
        });
        walletIdentitiesStub.resolves([identityName, 'yellowConga']);
        showIdentitiesQuickPickStub.resolves();

        await vscode.commands.executeCommand(ExtensionCommands.DELETE_IDENTITY);

        showWalletsQuickPickStub.should.have.been.calledOnce;
        walletIdentitiesStub.should.have.been.calledOnce;
        showIdentitiesQuickPickStub.should.have.been.calledOnce;
        fsRemoveStub.should.not.have.been.called;
        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `deleteIdentity`);
    });

    it('should handle the user cancelling, or saying no to, the warning box', async () => {
        showWalletsQuickPickStub.resolves({
            label: blueWalletEntry.name,
            data: blueWalletEntry
        });
        walletIdentitiesStub.resolves(['biscuits', 'yellowConga']);
        showIdentitiesQuickPickStub.resolves('biscuits');
        showConfirmationWarningMessage.resolves(false);

        await vscode.commands.executeCommand(ExtensionCommands.DELETE_IDENTITY);

        showWalletsQuickPickStub.should.have.been.calledOnce;
        walletIdentitiesStub.should.have.been.calledOnce;
        showIdentitiesQuickPickStub.should.have.been.calledOnce;
        fsRemoveStub.should.not.have.been.called;
        showConfirmationWarningMessage.should.have.been.calledOnce;
        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `deleteIdentity`);
    });

    it('should delete an identity and filter admin id from local wallet', async () => {
        identityName = 'bob';

        const runtimeWalletRegistryEntry: FabricWalletRegistryEntry = new FabricWalletRegistryEntry();

        runtimeWalletRegistryEntry.name = FabricWalletUtil.LOCAL_WALLET;
        runtimeWalletRegistryEntry.walletPath = 'wallet_path';
        runtimeWalletRegistryEntry.managedWallet = true;

        showWalletsQuickPickStub.resolves({
            label: FabricWalletUtil.LOCAL_WALLET,
            data: runtimeWalletRegistryEntry
        });
        walletIdentitiesStub.resolves([FabricRuntimeUtil.ADMIN_USER, identityName]);
        showIdentitiesQuickPickStub.resolves(identityName);

        await vscode.commands.executeCommand(ExtensionCommands.DELETE_IDENTITY);

        showIdentitiesQuickPickStub.should.have.been.calledOnceWithExactly('Choose the identity to delete', [identityName]);

    });

    describe('called from the tree', () => {

        it('should delete an identity when called from the wallet tree', async () => {
            identityName = 'blueConga';
            const blockchainWalletExplorerProvider: BlockchainWalletExplorerProvider = myExtension.getBlockchainWalletExplorerProvider();
            const treeItem: IdentityTreeItem = new IdentityTreeItem(blockchainWalletExplorerProvider, identityName, blueWalletEntry.name, []);

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_IDENTITY, treeItem);

            fsRemoveStub.should.have.been.calledOnceWithExactly(path.join(blueWalletEntry.walletPath, identityName));
            showWalletsQuickPickStub.should.not.have.been.called;
            showConfirmationWarningMessage.should.have.been.calledOnce;
            logSpy.should.have.been.calledTwice;
            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `deleteIdentity`);
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully deleted identity: ${identityName}`, `Successfully deleted identity: ${identityName}`);
            executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);
        });

        it('should delete an identity and filter admin id from local wallet', async () => {
            identityName = 'bob';
            const testFabricWallet: FabricWallet = new FabricWallet('some/local/fabric/wallet/path');
            getWalletStub.returns(testFabricWallet);

            const blockchainWalletExplorerProvider: BlockchainWalletExplorerProvider = myExtension.getBlockchainWalletExplorerProvider();
            const treeItem: IdentityTreeItem = new IdentityTreeItem(blockchainWalletExplorerProvider, identityName, FabricWalletUtil.LOCAL_WALLET_DISPLAY_NAME, []);

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_IDENTITY, treeItem);

            fsRemoveStub.should.have.been.calledOnceWithExactly(path.join('some/local/fabric/wallet/path', identityName));
            showWalletsQuickPickStub.should.not.have.been.called;
            showConfirmationWarningMessage.should.have.been.calledOnce;
            logSpy.should.have.been.calledTwice;
            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `deleteIdentity`);
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully deleted identity: ${identityName}`, `Successfully deleted identity: ${identityName}`);
            executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);
        });

    });

});
