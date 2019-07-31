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
import { WalletTreeItem } from '../../src/explorer/wallets/WalletTreeItem';
import { FabricGatewayRegistry } from '../../src/fabric/FabricGatewayRegistry';
import { FabricWalletRegistry } from '../../src/fabric/FabricWalletRegistry';
import { SettingConfigurations } from '../../SettingConfigurations';
import { FabricWalletUtil } from '../../src/fabric/FabricWalletUtil';

chai.should();
chai.use(sinonChai);
// tslint:disable no-unused-expression

describe('removeWalletCommand', () => {

    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();
    let logSpy: sinon.SinonSpy;
    let warningStub: sinon.SinonStub;
    let fsRemoveStub: sinon.SinonStub;
    let showWalletsQuickPickStub: sinon.SinonStub;
    let purpleWallet: FabricWalletRegistryEntry;
    let blueWallet: FabricWalletRegistryEntry;
    let createdWallet: FabricWalletRegistryEntry;
    let getAllFabricGatewayRegisty: sinon.SinonStub;
    let updateFabricGatewayRegisty: sinon.SinonStub;
    before(async () => {
        await TestUtil.setupTests(mySandBox);
        await TestUtil.storeWalletsConfig();
    });

    after(async () => {
        await TestUtil.restoreWalletsConfig();
    });

    beforeEach(async () => {
        // Set up stubs
        logSpy = mySandBox.stub(VSCodeBlockchainOutputAdapter.instance(), 'log');
        warningStub = mySandBox.stub(vscode.window, 'showWarningMessage');
        warningStub.resolves('No');
        fsRemoveStub = mySandBox.stub(fs, 'remove').resolves();
        showWalletsQuickPickStub = mySandBox.stub(UserInputUtil, 'showWalletsQuickPickBox');

        // Reset the wallet registry
        await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_WALLETS, [], vscode.ConfigurationTarget.Global);
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
        const directoryPath: string = UserInputUtil.getDirPath(extensionDirectory);

        createdWallet = new FabricWalletRegistryEntry({
            name: 'createdWallet',
            walletPath: path.join(directoryPath, 'wallets', 'createdWallet')
        });
        await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_WALLETS, [purpleWallet, blueWallet, createdWallet], vscode.ConfigurationTarget.Global);

        getAllFabricGatewayRegisty = mySandBox.stub(FabricGatewayRegistry.instance(), 'getAll').returns([]);
        updateFabricGatewayRegisty = mySandBox.stub(FabricGatewayRegistry.instance(), 'update');
    });

    afterEach(() => {
        mySandBox.restore();
    });

    it('should remove a wallet when called from the command palette', async () => {
        showWalletsQuickPickStub.resolves({
            label: purpleWallet.name,
            data: purpleWallet
        });

        warningStub.resolves('Yes');

        await vscode.commands.executeCommand(ExtensionCommands.REMOVE_WALLET);

        const wallets: any[] = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_WALLETS);
        wallets.length.should.equal(2);
        wallets[0].name.should.equal(blueWallet.name);
        wallets[1].name.should.equal(createdWallet.name);
        fsRemoveStub.should.not.have.been.called;
        logSpy.should.have.been.calledTwice;
        logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `removeWallet`);
        logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully removed ${purpleWallet.name} wallet`);
    });

    it('should show an error if no other wallets have been added', async () => {
        await FabricWalletRegistry.instance().clear();

        await vscode.commands.executeCommand(ExtensionCommands.REMOVE_WALLET);

        showWalletsQuickPickStub.should.not.have.been.called;
        logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `removeWallet`);
        logSpy.getCall(1).should.have.been.calledWithExactly(LogType.ERROR, `No wallets to remove. ${FabricWalletUtil.LOCAL_WALLET_DISPLAY_NAME} cannot be removed.`, `No wallets to remove. ${FabricWalletUtil.LOCAL_WALLET_DISPLAY_NAME} cannot be removed.`);
    });

    it('should handle the user cancelling selecting a wallet', async () => {
        showWalletsQuickPickStub.resolves();

        await vscode.commands.executeCommand(ExtensionCommands.REMOVE_WALLET);

        const wallets: any[] = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_WALLETS);
        wallets.length.should.equal(3);
        wallets[0].name.should.equal(purpleWallet.name);
        wallets[1].name.should.equal(blueWallet.name);
        wallets[2].name.should.equal(createdWallet.name);
        fsRemoveStub.should.not.have.been.called;
        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `removeWallet`);
    });

    it('should delete a created wallet from the file system if the user selects yes', async () => {
        showWalletsQuickPickStub.resolves({
            label: createdWallet.name,
            data: createdWallet
        });
        warningStub.resolves('Yes');

        await vscode.commands.executeCommand(ExtensionCommands.REMOVE_WALLET);

        const wallets: any[] = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_WALLETS);
        wallets.length.should.equal(2);
        wallets[0].name.should.equal(purpleWallet.name);
        wallets[1].name.should.equal(blueWallet.name);
        fsRemoveStub.should.have.been.calledOnceWithExactly(createdWallet.walletPath);
        logSpy.should.have.been.calledTwice;
        logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `removeWallet`);
        logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully removed ${createdWallet.name} wallet`);
    });

    it('should delete an imported wallet from the user settings if the user selects yes', async () => {
        showWalletsQuickPickStub.resolves({
            label: blueWallet.name,
            data: blueWallet
        });
        warningStub.resolves('Yes');

        await vscode.commands.executeCommand(ExtensionCommands.REMOVE_WALLET);

        const wallets: any[] = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_WALLETS);
        wallets.length.should.equal(2);
        wallets[0].name.should.equal(purpleWallet.name);
        wallets[1].name.should.equal(createdWallet.name);
        fsRemoveStub.should.not.have.been.called;
        logSpy.should.have.been.calledTwice;
        logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `removeWallet`);
        logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully removed ${blueWallet.name} wallet`);
    });

    it('should handle the user cancelling the warning box', async () => {
        showWalletsQuickPickStub.resolves({
            label: blueWallet.name,
            data: blueWallet
        });
        warningStub.resolves(undefined);

        await vscode.commands.executeCommand(ExtensionCommands.REMOVE_WALLET);

        const wallets: any[] = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_WALLETS);
        wallets.length.should.equal(3);
        wallets[0].name.should.equal(purpleWallet.name);
        wallets[1].name.should.equal(blueWallet.name);
        wallets[2].name.should.equal(createdWallet.name);
        fsRemoveStub.should.not.have.been.called;
        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `removeWallet`);
    });

    it("should handle the user selecting 'No' for the warning box", async () => {
        showWalletsQuickPickStub.resolves({
            label: blueWallet.name,
            data: blueWallet
        });

        await vscode.commands.executeCommand(ExtensionCommands.REMOVE_WALLET);

        const wallets: any[] = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_WALLETS);
        wallets.length.should.equal(3);
        wallets[0].name.should.equal(purpleWallet.name);
        wallets[1].name.should.equal(blueWallet.name);
        wallets[2].name.should.equal(createdWallet.name);
        fsRemoveStub.should.not.have.been.called;
        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `removeWallet`);
    });

    it('should remove the wallet association from any gateways', async () => {
        showWalletsQuickPickStub.resolves({
            label: blueWallet.name,
            data: blueWallet
        });
        warningStub.resolves('Yes');
        getAllFabricGatewayRegisty.returns([{name: 'gatewayA', associatedWallet: 'blueWallet'}, {name: 'gatewayB', associatedWallet: 'blueWallet'}, {name: 'gatewayC', associatedWallet: 'greenWallet'}]);
        updateFabricGatewayRegisty.resolves();

        await vscode.commands.executeCommand(ExtensionCommands.REMOVE_WALLET);

        const wallets: any[] = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_WALLETS);
        wallets.length.should.equal(2);
        wallets[0].name.should.equal(purpleWallet.name);
        wallets[1].name.should.equal(createdWallet.name);

        updateFabricGatewayRegisty.callCount.should.equal(2);
        updateFabricGatewayRegisty.getCall(0).should.have.been.calledWithExactly({name: 'gatewayA', associatedWallet: ''});
        updateFabricGatewayRegisty.getCall(1).should.have.been.calledWithExactly({name: 'gatewayB', associatedWallet: ''});

        fsRemoveStub.should.not.have.been.called;
        logSpy.should.have.been.calledTwice;
        logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `removeWallet`);
        logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully removed ${blueWallet.name} wallet`);
    });

    describe('called from the tree', () => {

        it('should remove a wallet when called from the wallet tree', async () => {
            const blockchainWalletExplorerProvider: BlockchainWalletExplorerProvider = myExtension.getBlockchainWalletExplorerProvider();
            const walletsTreeItems: WalletTreeItem[] = await blockchainWalletExplorerProvider.getChildren() as WalletTreeItem[];
            const purpleWalletTreeItem: WalletTreeItem = walletsTreeItems[1];
            warningStub.resolves('Yes');

            await vscode.commands.executeCommand(ExtensionCommands.REMOVE_WALLET, purpleWalletTreeItem);

            const wallets: any[] = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_WALLETS);
            wallets.length.should.equal(2);
            wallets[0].name.should.equal(blueWallet.name);
            wallets[1].name.should.equal(createdWallet.name);
            fsRemoveStub.should.not.have.been.called;
            showWalletsQuickPickStub.should.not.have.been.called;
            logSpy.should.have.been.calledTwice;
            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `removeWallet`);
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully removed ${purpleWallet.name} wallet`);
        });

    });

});
