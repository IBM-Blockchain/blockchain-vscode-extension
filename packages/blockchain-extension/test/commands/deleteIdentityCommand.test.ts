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
import * as sinonChai from 'sinon-chai';
import * as chai from 'chai';
import * as path from 'path';
import { TestUtil } from '../TestUtil';
import { ExtensionCommands } from '../../ExtensionCommands';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { UserInputUtil } from '../../extension/commands/UserInputUtil';
import { BlockchainWalletExplorerProvider } from '../../extension/explorer/walletExplorer';
import { FabricWallet } from 'ibm-blockchain-platform-wallet';
import { IdentityTreeItem } from '../../extension/explorer/model/IdentityTreeItem';
import { FabricRuntimeUtil, FabricWalletRegistry, FabricWalletRegistryEntry, LogType, FabricWalletGeneratorFactory } from 'ibm-blockchain-platform-common';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';

chai.should();
chai.use(sinonChai);
// tslint:disable no-unused-expression

describe('deleteIdentityCommand', () => {

    let mySandBox: sinon.SinonSandbox;
    let logSpy: sinon.SinonSpy;
    let showConfirmationWarningMessage: sinon.SinonStub;
    let showWalletsQuickPickStub: sinon.SinonStub;
    let showIdentitiesQuickPickStub: sinon.SinonStub;
    let purpleWalletEntry: FabricWalletRegistryEntry;
    let blueWalletEntry: FabricWalletRegistryEntry;
    let purpleWallet: FabricWallet;
    let purpleWalletIdentitiesStub: sinon.SinonStub;
    let executeCommandSpy: sinon.SinonSpy;
    let identityName: string[];
    let localWalletEntry: FabricWalletRegistryEntry;
    let localWalletIdentitiesStub: sinon.SinonStub;
    let blueWalletIdentitiesStub: sinon.SinonStub;
    let purpleWalletRemoveIdentityStub: sinon.SinonStub;
    let blueWalletRemoveIdentityStub: sinon.SinonStub;
    let localWalletRemoveIdentityStub: sinon.SinonStub;

    before(async () => {
        mySandBox = sinon.createSandbox();
        await TestUtil.setupTests(mySandBox);
        await TestUtil.startLocalFabric();
    });

    beforeEach(async () => {
        // Set up stubs
        mySandBox.restore();

        logSpy = mySandBox.stub(VSCodeBlockchainOutputAdapter.instance(), 'log');
        showConfirmationWarningMessage = mySandBox.stub(UserInputUtil, 'showConfirmationWarningMessage').resolves(true);
        showWalletsQuickPickStub = mySandBox.stub(UserInputUtil, 'showWalletsQuickPickBox');
        showIdentitiesQuickPickStub = mySandBox.stub(UserInputUtil, 'showIdentitiesQuickPickBox');

        // Reset the wallet registry
        await FabricWalletRegistry.instance().clear();
        // Add wallets to the registry
        purpleWalletEntry = new FabricWalletRegistryEntry({
            name: 'purpleWallet',
            walletPath: path.join(__dirname, '../../test/tmp/v2/wallets/purpleWallet')
        });
        blueWalletEntry = new FabricWalletRegistryEntry({
            name: 'blueWallet',
            walletPath: path.join(__dirname, '../../test/tmp/v2/wallets/blueWallet')
        });

        await FabricWalletRegistry.instance().add(purpleWalletEntry);
        await FabricWalletRegistry.instance().add(blueWalletEntry);

        purpleWallet = await FabricWallet.newFabricWallet(purpleWalletEntry.walletPath);
        purpleWalletIdentitiesStub = mySandBox.stub(purpleWallet, 'getIdentityNames');

        const blueWallet: FabricWallet = await FabricWallet.newFabricWallet(blueWalletEntry.walletPath);
        blueWalletIdentitiesStub = mySandBox.stub(blueWallet, 'getIdentityNames');

        localWalletEntry = await FabricWalletRegistry.instance().get('Org1', '1 Org Local Fabric');
        const localWallet: FabricWallet = await FabricWallet.newFabricWallet(localWalletEntry.walletPath);
        localWalletIdentitiesStub = mySandBox.stub(localWallet, 'getIdentityNames');

        const getWalletStub: sinon.SinonStub = mySandBox.stub(FabricWalletGeneratorFactory.getFabricWalletGenerator(), 'getWallet');
        getWalletStub.withArgs(purpleWalletEntry).resolves(purpleWallet);
        getWalletStub.withArgs(localWalletEntry).resolves(localWallet);
        getWalletStub.withArgs(blueWalletEntry).resolves(blueWallet);

        purpleWalletRemoveIdentityStub = mySandBox.stub(purpleWallet, 'removeIdentity');
        blueWalletRemoveIdentityStub = mySandBox.stub(blueWallet, 'removeIdentity');
        localWalletRemoveIdentityStub = mySandBox.stub(localWallet, 'removeIdentity');

        executeCommandSpy = mySandBox.spy(vscode.commands, 'executeCommand');
    });

    afterEach(() => {
        mySandBox.restore();
    });

    it('should delete an identity when called from the command palette', async () => {
        identityName = ['greenConga', 'yellowConga'];
        showWalletsQuickPickStub.resolves({
            label: purpleWalletEntry.name,
            data: purpleWalletEntry
        });
        purpleWalletIdentitiesStub.resolves(identityName);
        showIdentitiesQuickPickStub.resolves([identityName[0]]);

        await vscode.commands.executeCommand(ExtensionCommands.DELETE_IDENTITY);

        purpleWalletRemoveIdentityStub.should.have.been.calledWith(identityName[0]);
        showWalletsQuickPickStub.should.have.been.calledOnce;
        purpleWalletIdentitiesStub.should.have.been.calledOnce;
        showIdentitiesQuickPickStub.should.have.been.calledOnce;
        logSpy.should.have.been.calledTwice;
        showConfirmationWarningMessage.should.have.been.calledOnce;
        logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `deleteIdentity`);
        logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully deleted identity: ${identityName[0]}`);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);
    });

    it('should delete multiple identities when called from the command palette', async () => {
        identityName = ['greenConga', 'yellowConga'];
        showWalletsQuickPickStub.resolves({
            label: purpleWalletEntry.name,
            data: purpleWalletEntry
        });
        purpleWalletIdentitiesStub.resolves([identityName]);
        showIdentitiesQuickPickStub.resolves(identityName);

        await vscode.commands.executeCommand(ExtensionCommands.DELETE_IDENTITY);

        purpleWalletRemoveIdentityStub.getCall(0).should.have.been.calledWith(identityName[0]);
        purpleWalletRemoveIdentityStub.getCall(1).should.have.been.calledWith(identityName[1]);
        showWalletsQuickPickStub.should.have.been.calledOnce;
        purpleWalletIdentitiesStub.should.have.been.calledOnce;
        showIdentitiesQuickPickStub.should.have.been.calledOnce;
        logSpy.should.have.been.calledTwice;
        showConfirmationWarningMessage.should.have.been.calledOnce;
        logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `deleteIdentity`);
        logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully deleted selected identities.`);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);
    });

    it('should handle the user not selecting a identity to delete', async () => {
        identityName = ['greenConga', 'yellowConga'];
        showWalletsQuickPickStub.resolves({
            label: purpleWalletEntry.name,
            data: purpleWalletEntry
        });
        purpleWalletIdentitiesStub.resolves([identityName]);
        showIdentitiesQuickPickStub.resolves([]);

        await vscode.commands.executeCommand(ExtensionCommands.DELETE_IDENTITY);

        showWalletsQuickPickStub.should.have.been.calledOnce;
        purpleWalletIdentitiesStub.should.have.been.calledOnce;
        showIdentitiesQuickPickStub.should.have.been.calledOnce;
        purpleWalletRemoveIdentityStub.should.not.have.been.called;
        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `deleteIdentity`);
    });

    it('should handle the user cancelling selecting a wallet', async () => {
        showWalletsQuickPickStub.resolves();

        await vscode.commands.executeCommand(ExtensionCommands.DELETE_IDENTITY);

        showWalletsQuickPickStub.should.have.been.calledOnce;
        purpleWalletIdentitiesStub.should.not.have.been.called;
        purpleWalletRemoveIdentityStub.should.not.have.been.called;
        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `deleteIdentity`);
    });

    it('should show an error if it finds no identities in the chosen wallet', async () => {
        showWalletsQuickPickStub.resolves({
            label: purpleWalletEntry.name,
            data: purpleWalletEntry
        });
        purpleWalletIdentitiesStub.resolves([]);

        await vscode.commands.executeCommand(ExtensionCommands.DELETE_IDENTITY);

        showWalletsQuickPickStub.should.have.been.calledOnce;
        purpleWalletIdentitiesStub.should.have.been.calledOnce;
        purpleWalletRemoveIdentityStub.should.not.have.been.called;
        logSpy.should.have.been.calledTwice;
        logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, `deleteIdentity`);
        logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `No identities in wallet: ${purpleWalletEntry.walletPath}`);
    });

    it('should show a different error if there are no non-admin identities in the local_fabric wallet', async () => {
        identityName = ['bob'];

        showWalletsQuickPickStub.resolves({
            label: localWalletEntry.name,
            data: localWalletEntry
        });
        localWalletIdentitiesStub.resolves([]);

        await vscode.commands.executeCommand(ExtensionCommands.DELETE_IDENTITY);

        localWalletIdentitiesStub.should.have.been.calledOnce;
        localWalletRemoveIdentityStub.should.not.have.been.called;
        logSpy.should.have.been.calledTwice;
        logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, `deleteIdentity`);
        logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `No identities to delete in wallet: ${localWalletEntry.displayName}. The ${FabricRuntimeUtil.ADMIN_USER} identity cannot be deleted.`);
    });

    it('should handle the user cancelling selecting an identity to delete', async () => {
        identityName = ['greenConga', 'yellowConga'];
        showWalletsQuickPickStub.resolves({
            label: purpleWalletEntry.name,
            data: purpleWalletEntry
        });
        purpleWalletIdentitiesStub.resolves(identityName);
        showIdentitiesQuickPickStub.resolves();

        await vscode.commands.executeCommand(ExtensionCommands.DELETE_IDENTITY);

        showWalletsQuickPickStub.should.have.been.calledOnce;
        purpleWalletIdentitiesStub.should.have.been.calledOnce;
        showIdentitiesQuickPickStub.should.have.been.calledOnce;
        purpleWalletRemoveIdentityStub.should.not.have.been.called;
        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `deleteIdentity`);
    });

    it('should handle the user cancelling, or saying no to, the warning box', async () => {
        showWalletsQuickPickStub.resolves({
            label: blueWalletEntry.name,
            data: blueWalletEntry
        });
        blueWalletIdentitiesStub.resolves(['biscuits', 'yellowConga']);
        showIdentitiesQuickPickStub.resolves('biscuits');
        showConfirmationWarningMessage.resolves(false);

        await vscode.commands.executeCommand(ExtensionCommands.DELETE_IDENTITY);

        showWalletsQuickPickStub.should.have.been.calledOnce;
        blueWalletIdentitiesStub.should.have.been.calledOnce;
        showIdentitiesQuickPickStub.should.have.been.calledOnce;
        blueWalletRemoveIdentityStub.should.not.have.been.called;
        showConfirmationWarningMessage.should.have.been.calledOnce;
        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `deleteIdentity`);
    });

    it('should delete an identity and filter admin id from local wallet', async () => {
        identityName = [FabricRuntimeUtil.ADMIN_USER, 'bob'];

        showWalletsQuickPickStub.resolves({
            label: localWalletEntry.displayName,
            data: localWalletEntry
        });
        localWalletIdentitiesStub.resolves(identityName);
        showIdentitiesQuickPickStub.resolves([identityName[1]]);

        await vscode.commands.executeCommand(ExtensionCommands.DELETE_IDENTITY);

        showIdentitiesQuickPickStub.should.have.been.calledOnceWithExactly('Choose the identities to delete', true, [identityName[1]]);
    });

    describe('called from the tree', () => {

        it('should delete an identity when called from the wallet tree', async () => {
            identityName = ['blueConga'];
            const blockchainWalletExplorerProvider: BlockchainWalletExplorerProvider = ExtensionUtil.getBlockchainWalletExplorerProvider();
            const treeItem: IdentityTreeItem = new IdentityTreeItem(blockchainWalletExplorerProvider, identityName[0], blueWalletEntry.name, [], blueWalletEntry);

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_IDENTITY, treeItem);

            blueWalletRemoveIdentityStub.should.have.been.calledWith(identityName[0]);
            showWalletsQuickPickStub.should.not.have.been.called;
            showConfirmationWarningMessage.should.have.been.calledOnce;
            logSpy.should.have.been.calledTwice;
            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `deleteIdentity`);
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully deleted identity: ${identityName[0]}`);
            executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);
        });

        it('should delete an identity and filter admin id from local wallet', async () => {
            identityName = ['bob'];

            const blockchainWalletExplorerProvider: BlockchainWalletExplorerProvider = ExtensionUtil.getBlockchainWalletExplorerProvider();

            const treeItem: IdentityTreeItem = new IdentityTreeItem(blockchainWalletExplorerProvider, identityName[0], localWalletEntry.displayName, [], localWalletEntry);

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_IDENTITY, treeItem);

            localWalletRemoveIdentityStub.should.have.been.calledWith(identityName[0]);
            showWalletsQuickPickStub.should.not.have.been.called;
            showConfirmationWarningMessage.should.have.been.calledOnce;
            logSpy.should.have.been.calledTwice;
            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `deleteIdentity`);
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully deleted identity: ${identityName[0]}`);
            executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);
        });
    });
});
