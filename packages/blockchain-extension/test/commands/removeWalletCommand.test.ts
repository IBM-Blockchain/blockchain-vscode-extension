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
import { LogType, FileSystemUtil, FabricEnvironmentRegistry } from 'ibm-blockchain-platform-common';
import { UserInputUtil } from '../../extension/commands/UserInputUtil';
import { FabricWalletRegistry, FabricWalletRegistryEntry, FabricGatewayRegistry, FabricGatewayRegistryEntry } from 'ibm-blockchain-platform-common';
import { BlockchainWalletExplorerProvider } from '../../extension/explorer/walletExplorer';
import { WalletTreeItem } from '../../extension/explorer/wallets/WalletTreeItem';
import { SettingConfigurations } from '../../configurations';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';

chai.should();
chai.use(sinonChai);
// tslint:disable no-unused-expression

describe('removeWalletCommand', () => {

    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();
    let logSpy: sinon.SinonSpy;
    let warningStub: sinon.SinonStub;
    let showWalletsQuickPickStub: sinon.SinonStub;
    let purpleWallet: FabricWalletRegistryEntry;
    let blueWallet: FabricWalletRegistryEntry;
    let createdWallet: FabricWalletRegistryEntry;

    before(async () => {
        await TestUtil.setupTests(mySandBox);
    });

    beforeEach(async () => {
        // Set up stubs
        logSpy = mySandBox.stub(VSCodeBlockchainOutputAdapter.instance(), 'log');
        warningStub = mySandBox.stub(vscode.window, 'showWarningMessage');
        warningStub.resolves('No');
        showWalletsQuickPickStub = mySandBox.stub(UserInputUtil, 'showWalletsQuickPickBox');

        // Reset the wallet registry
        await FabricEnvironmentRegistry.instance().clear();
        await FabricWalletRegistry.instance().clear();
        // Add wallets to the registry
        purpleWallet = new FabricWalletRegistryEntry({
            name: 'purpleWallet',
            walletPath: '/some/path'
        });
        blueWallet = new FabricWalletRegistryEntry({
            name: 'blueWallet',
            walletPath: '/some/bluer/path'
        });

        const extensionDirectory: string = vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_DIRECTORY);
        const directoryPath: string = FileSystemUtil.getDirPath(extensionDirectory);

        createdWallet = new FabricWalletRegistryEntry({
            name: 'createdWallet',
            walletPath: path.join(directoryPath, 'wallets', 'createdWallet')
        });

        await FabricWalletRegistry.instance().add(purpleWallet);
        await FabricWalletRegistry.instance().add(blueWallet);
        await FabricWalletRegistry.instance().add(createdWallet);

        await FabricGatewayRegistry.instance().clear();

        await FabricGatewayRegistry.instance().add({ name: 'gatewayA', associatedWallet: 'blueWallet' });
        await FabricGatewayRegistry.instance().add({ name: 'gatewayB', associatedWallet: 'blueWallet' });
        await FabricGatewayRegistry.instance().add({ name: 'gatewayC', associatedWallet: 'greenWallet' });
    });

    afterEach(() => {
        mySandBox.restore();
    });

    it('should remove a wallet when called from the command palette', async () => {
        showWalletsQuickPickStub.resolves([{
            label: purpleWallet.name,
            data: purpleWallet
        }]);

        warningStub.resolves('Yes');

        await vscode.commands.executeCommand(ExtensionCommands.REMOVE_WALLET);

        showWalletsQuickPickStub.should.be.calledWithExactly('Choose the wallet(s) that you want to remove', true, false);
        const wallets: FabricWalletRegistryEntry[] = await FabricWalletRegistry.instance().getAll();
        wallets.length.should.equal(2);
        wallets[0].name.should.equal(blueWallet.name);
        wallets[1].name.should.equal(createdWallet.name);
        logSpy.should.have.been.calledTwice;
        logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `removeWallet`);
        logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully removed ${purpleWallet.name} wallet`);
    });

    it('should allow user to remove mulitple wallets when called from the command palette', async () => {
        showWalletsQuickPickStub.resolves([{
            label: purpleWallet.name,
            data: purpleWallet
        },
        {
            label: blueWallet.name,
            data: blueWallet
        }]);

        warningStub.resolves('Yes');

        await vscode.commands.executeCommand(ExtensionCommands.REMOVE_WALLET);

        showWalletsQuickPickStub.should.be.calledWithExactly('Choose the wallet(s) that you want to remove', true, false);
        const wallets: FabricWalletRegistryEntry[] = await FabricWalletRegistry.instance().getAll();
        wallets.length.should.equal(1);
        wallets[0].name.should.equal(createdWallet.name);
        logSpy.should.have.been.calledTwice;
        logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `removeWallet`);
        logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully removed wallets`);
    });

    it('should show an error if no other wallets have been added', async () => {
        await FabricWalletRegistry.instance().clear();

        await vscode.commands.executeCommand(ExtensionCommands.REMOVE_WALLET);

        showWalletsQuickPickStub.should.not.have.been.called;
        logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `removeWallet`);
        logSpy.getCall(1).should.have.been.calledWithExactly(LogType.ERROR, `No wallets to remove. Local wallets cannot be removed.`);
    });

    it('should handle the user cancelling selecting a wallet', async () => {
        showWalletsQuickPickStub.resolves(undefined);

        await vscode.commands.executeCommand(ExtensionCommands.REMOVE_WALLET);

        showWalletsQuickPickStub.should.be.calledWithExactly('Choose the wallet(s) that you want to remove', true, false);
        const wallets: FabricWalletRegistryEntry[] = await FabricWalletRegistry.instance().getAll();
        wallets.length.should.equal(3);

        wallets[0].name.should.equal(blueWallet.name);
        wallets[1].name.should.equal(createdWallet.name);
        wallets[2].name.should.equal(purpleWallet.name);

        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `removeWallet`);
    });

    it('should handle the user not selecting a wallet', async () => {
        showWalletsQuickPickStub.resolves([]);

        await vscode.commands.executeCommand(ExtensionCommands.REMOVE_WALLET);

        showWalletsQuickPickStub.should.be.calledWithExactly('Choose the wallet(s) that you want to remove', true, false);
        const wallets: FabricWalletRegistryEntry[] = await FabricWalletRegistry.instance().getAll();
        wallets.length.should.equal(3);

        wallets[0].name.should.equal(blueWallet.name);
        wallets[1].name.should.equal(createdWallet.name);
        wallets[2].name.should.equal(purpleWallet.name);

        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `removeWallet`);
    });

    it('should delete a created wallet and an existing wallet from the file system if the user selects yes', async () => {
        showWalletsQuickPickStub.resolves([{
            label: createdWallet.name,
            data: createdWallet
        },
        {
            label: blueWallet.name,
            data: blueWallet
        }]);
        warningStub.resolves('Yes');

        await vscode.commands.executeCommand(ExtensionCommands.REMOVE_WALLET);

        showWalletsQuickPickStub.should.be.calledWithExactly('Choose the wallet(s) that you want to remove', true, false);
        const wallets: FabricWalletRegistryEntry[] = await FabricWalletRegistry.instance().getAll();
        wallets.length.should.equal(1);
        wallets[0].name.should.equal(purpleWallet.name);
        logSpy.should.have.been.calledTwice;
        logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `removeWallet`);
        logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully removed wallets`);
    });

    it('should handle the user cancelling the warning box', async () => {
        showWalletsQuickPickStub.resolves([{
            label: blueWallet.name,
            data: blueWallet
        }]);
        warningStub.resolves(undefined);

        await vscode.commands.executeCommand(ExtensionCommands.REMOVE_WALLET);

        showWalletsQuickPickStub.should.be.calledWithExactly('Choose the wallet(s) that you want to remove', true, false);
        const wallets: FabricWalletRegistryEntry[] = await FabricWalletRegistry.instance().getAll();

        wallets.length.should.equal(3);
        wallets[0].name.should.equal(blueWallet.name);
        wallets[1].name.should.equal(createdWallet.name);
        wallets[2].name.should.equal(purpleWallet.name);

        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `removeWallet`);
    });

    it("should handle the user selecting 'No' for the warning box", async () => {
        showWalletsQuickPickStub.resolves([{
            label: blueWallet.name,
            data: blueWallet
        }]);

        await vscode.commands.executeCommand(ExtensionCommands.REMOVE_WALLET);

        showWalletsQuickPickStub.should.be.calledWithExactly('Choose the wallet(s) that you want to remove', true, false);
        const wallets: FabricWalletRegistryEntry[] = await FabricWalletRegistry.instance().getAll();

        wallets.length.should.equal(3);

        wallets[0].name.should.equal(blueWallet.name);
        wallets[1].name.should.equal(createdWallet.name);
        wallets[2].name.should.equal(purpleWallet.name);

        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `removeWallet`);
    });

    it('should remove the wallet association from any gateways', async () => {
        showWalletsQuickPickStub.resolves([{
            label: blueWallet.name,
            data: blueWallet
        }]);
        warningStub.resolves('Yes');

        await vscode.commands.executeCommand(ExtensionCommands.REMOVE_WALLET);

        showWalletsQuickPickStub.should.be.calledWithExactly('Choose the wallet(s) that you want to remove', true, false);
        const wallets: FabricWalletRegistryEntry[] = await FabricWalletRegistry.instance().getAll();

        wallets.length.should.equal(2);

        wallets[0].name.should.equal(createdWallet.name);
        wallets[1].name.should.equal(purpleWallet.name);

        let result: FabricGatewayRegistryEntry = await FabricGatewayRegistry.instance().get('gatewayA');
        result.associatedWallet.should.equal('');

        result = await FabricGatewayRegistry.instance().get('gatewayB');
        result.associatedWallet.should.equal('');

        logSpy.should.have.been.calledTwice;
        logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `removeWallet`);
        logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully removed ${blueWallet.name} wallet`);
    });

    it('should remove the wallet association from any gateways when deleting multiple wallets', async () => {
        showWalletsQuickPickStub.resolves([{
            label: blueWallet.name,
            data: blueWallet
        },
        {
            label: purpleWallet.name,
            data: purpleWallet
        }]);
        warningStub.resolves('Yes');

        await vscode.commands.executeCommand(ExtensionCommands.REMOVE_WALLET);

        showWalletsQuickPickStub.should.be.calledWithExactly('Choose the wallet(s) that you want to remove', true, false);
        const wallets: FabricWalletRegistryEntry[] = await FabricWalletRegistry.instance().getAll();

        wallets.length.should.equal(1);
        wallets[0].name.should.equal(createdWallet.name);

        let result: FabricGatewayRegistryEntry = await FabricGatewayRegistry.instance().get('gatewayA');
        result.associatedWallet.should.equal('');

        result = await FabricGatewayRegistry.instance().get('gatewayB');
        result.associatedWallet.should.equal('');

        result = await FabricGatewayRegistry.instance().get('gatewayC');
        result.associatedWallet.should.equal('greenWallet');

        logSpy.should.have.been.calledTwice;
        logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `removeWallet`);
        logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully removed wallets`);
    });

    describe('called from the tree', () => {

        it('should remove a wallet when called from the wallet tree', async () => {
            const blockchainWalletExplorerProvider: BlockchainWalletExplorerProvider = ExtensionUtil.getBlockchainWalletExplorerProvider();
            const walletGroups: WalletTreeItem[] = await blockchainWalletExplorerProvider.getChildren() as WalletTreeItem[];
            const groupChildren: WalletTreeItem[] = await blockchainWalletExplorerProvider.getChildren(walletGroups[0]) as WalletTreeItem[];
            const purpleWalletTreeItem: WalletTreeItem = groupChildren[groupChildren.length - 1];
            warningStub.resolves('Yes');

            await vscode.commands.executeCommand(ExtensionCommands.REMOVE_WALLET, purpleWalletTreeItem);

            const wallets: FabricWalletRegistryEntry[] = await FabricWalletRegistry.instance().getAll();

            wallets.length.should.equal(2);
            wallets[0].name.should.equal(blueWallet.name);
            wallets[1].name.should.equal(createdWallet.name);
            showWalletsQuickPickStub.should.not.have.been.called;
            logSpy.should.have.been.calledTwice;
            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `removeWallet`);
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully removed ${purpleWallet.name} wallet`);
        });
    });
});
