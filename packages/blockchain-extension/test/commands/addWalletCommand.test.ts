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
import * as path from 'path';
import * as tmp from 'tmp';
import { TestUtil } from '../TestUtil';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { UserInputUtil } from '../../extension/commands/UserInputUtil';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricWallet } from 'ibm-blockchain-platform-wallet';
import { FabricWalletRegistry, FabricWalletRegistryEntry, FileConfigurations, LogType, FabricEnvironmentRegistry, FabricEnvironmentRegistryEntry } from 'ibm-blockchain-platform-common';

// tslint:disable no-unused-expression
const should: Chai.Should = chai.should();
chai.use(sinonChai);

describe('AddWalletCommand', () => {
    let mySandBox: sinon.SinonSandbox;
    let logSpy: sinon.SinonSpy;
    let showInputBoxStub: sinon.SinonStub;
    let browseStub: sinon.SinonStub;
    let choseWalletAddMethod: sinon.SinonStub;
    let uri: vscode.Uri;
    let getIdentitiesStub: sinon.SinonStub;
    let executeCommandStub: sinon.SinonStub;

    before(async () => {
        mySandBox = sinon.createSandbox();
        await TestUtil.setupTests(mySandBox);
    });

    beforeEach(async () => {
        logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');

        await FabricEnvironmentRegistry.instance().clear();
        await FabricWalletRegistry.instance().clear();

        showInputBoxStub = mySandBox.stub(vscode.window, 'showInputBox');
        browseStub = mySandBox.stub(UserInputUtil, 'browse');
        choseWalletAddMethod = mySandBox.stub(UserInputUtil, 'showAddWalletOptionsQuickPick');
        uri = vscode.Uri.file(tmp.dirSync().name);
        getIdentitiesStub = mySandBox.stub(FabricWallet.prototype, 'getIdentityNames');
    });

    afterEach(async () => {
        mySandBox.restore();
    });

    it('should handle the user cancelling selecting a method to add a new wallet', async () => {
        choseWalletAddMethod.resolves();

        const result: FabricWalletRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET);
        should.not.exist(result);
        showInputBoxStub.should.not.have.been.called;
        browseStub.should.not.have.been.called;
        logSpy.should.not.have.been.calledWith(LogType.SUCCESS);
    });

    describe('via providing a wallet path', async () => {

        it('should add a new wallet by providing a wallet path', async () => {
            choseWalletAddMethod.resolves(UserInputUtil.IMPORT_WALLET);
            browseStub.resolves(uri);
            getIdentitiesStub.resolves(['someName', 'anotherName']);

            const result: FabricWalletRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET);

            result.name.should.equal(path.basename(uri.fsPath));

            showInputBoxStub.should.not.have.been.called;

            const wallets: Array<FabricWalletRegistryEntry> = await FabricWalletRegistry.instance().getAll();

            wallets.length.should.equal(1);
            wallets[0].should.deep.equal({
                name: path.basename(uri.fsPath),
                walletPath: uri.fsPath
            });
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new wallet');
        });

        it('should handle the user cancelling providing a wallet path', async () => {
            choseWalletAddMethod.resolves(UserInputUtil.IMPORT_WALLET);
            browseStub.resolves();

            const result: FabricWalletRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET);
            should.not.exist(result);

            logSpy.should.not.have.been.calledWith(LogType.SUCCESS);
            showInputBoxStub.should.not.have.been.called;
        });

        it('should not allow the user to add an empty directory as a wallet', async () => {
            choseWalletAddMethod.resolves(UserInputUtil.IMPORT_WALLET);
            browseStub.resolves(uri);
            getIdentitiesStub.resolves([]);

            const result: FabricWalletRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET);
            should.not.exist(result);
            logSpy.should.have.been.calledWith(LogType.ERROR, `Failed to add a new wallet: No identities found in wallet: ${uri.fsPath}`, `Failed to add a new wallet: No identities found in wallet: ${uri.fsPath}`);
        });

        it('should error if an imported wallet with the same name already exists', async () => {
            choseWalletAddMethod.resolves(UserInputUtil.IMPORT_WALLET);
            browseStub.resolves(uri);
            mySandBox.stub(FabricWalletRegistry.instance(), 'exists').resolves(true);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET);

            showInputBoxStub.should.not.have.been.called;
            const wallets: Array<FabricWalletRegistryEntry> = await FabricWalletRegistry.instance().getAll();
            wallets.length.should.equal(0);
            logSpy.should.have.been.calledWith(LogType.ERROR, `A wallet with this name already exists.`);
        });

        it('should add wallet with environmentGroup property', async () => {
            choseWalletAddMethod.resolves(UserInputUtil.IMPORT_WALLET);
            browseStub.resolves(uri);
            getIdentitiesStub.resolves(['someName', 'anotherName']);

            const environmentRegistryEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
            environmentRegistryEntry.name = 'myEnvironment';
            await FabricEnvironmentRegistry.instance().add(environmentRegistryEntry);
            mySandBox.stub(FabricEnvironmentRegistry.instance(), 'get').resolves({name: environmentRegistryEntry.name});

            const result: FabricWalletRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET, false, environmentRegistryEntry.name);

            result.name.should.equal(path.basename(uri.fsPath));

            showInputBoxStub.should.not.have.been.called;

            const wallets: Array<FabricWalletRegistryEntry> = await FabricWalletRegistry.instance().getAll();

            wallets.length.should.equal(1);
            wallets[0].should.deep.equal({
                name: path.basename(uri.fsPath),
                walletPath: uri.fsPath,
                environmentGroups: [environmentRegistryEntry.name]
            });
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new wallet');
        });

    });

    describe('by adding an identity', async () => {

        it('should add a new wallet by creating a new identity', async () => {
            choseWalletAddMethod.resolves(UserInputUtil.WALLET_NEW_ID);
            showInputBoxStub.resolves('someWalletName');
            executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand');
            executeCommandStub.callThrough();
            executeCommandStub.withArgs(ExtensionCommands.ADD_WALLET_IDENTITY, sinon.match.instanceOf(FabricWalletRegistryEntry)).resolves();
            getIdentitiesStub.resolves(['someName', 'anotherName']);

            const result: FabricWalletRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET);
            result.name.should.equal('someWalletName');

            browseStub.should.not.have.been.called;
            showInputBoxStub.should.have.been.calledOnce;
            const wallets: Array<FabricWalletRegistryEntry> = await FabricWalletRegistry.instance().getAll();
            wallets.length.should.equal(1);
            wallets[0].should.deep.equal({
                name: 'someWalletName',
                walletPath: path.join(TestUtil.EXTENSION_TEST_DIR, FileConfigurations.FABRIC_WALLETS, 'someWalletName')
            });
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new wallet');
        });

        it('should add a new wallet but not create an identity', async () => {
            choseWalletAddMethod.resolves(UserInputUtil.WALLET_NEW_ID);
            showInputBoxStub.resolves('someWalletName');
            executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand');
            executeCommandStub.callThrough();
            getIdentitiesStub.resolves(['someName', 'anotherName']);

            const result: FabricWalletRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET, false);
            result.name.should.equal('someWalletName');

            browseStub.should.not.have.been.called;
            showInputBoxStub.should.have.been.calledOnce;
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.ADD_WALLET_IDENTITY);
            const wallets: Array<FabricWalletRegistryEntry> = await FabricWalletRegistry.instance().getAll();
            wallets.length.should.equal(1);
            wallets[0].should.deep.equal({
                name: 'someWalletName',
                walletPath: path.join(TestUtil.EXTENSION_TEST_DIR, FileConfigurations.FABRIC_WALLETS, 'someWalletName')
            });
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new wallet');
        });

        it('should handle the user cancelling providing a wallet name', async () => {
            choseWalletAddMethod.resolves(UserInputUtil.WALLET_NEW_ID);
            showInputBoxStub.resolves();

            const result: FabricWalletRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET);
            should.not.exist(result);
            browseStub.should.not.have.been.called;
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS);
        });

        it('should no nothing if the addWalletIdentity command was cancelled', async () => {
            const deleteSpy: sinon.SinonSpy = mySandBox.spy(FabricWalletRegistry.instance(), 'delete');
            choseWalletAddMethod.resolves(UserInputUtil.WALLET_NEW_ID);
            showInputBoxStub.resolves('someWalletName');
            executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand');
            executeCommandStub.callThrough();
            executeCommandStub.withArgs(ExtensionCommands.ADD_WALLET_IDENTITY, sinon.match.any).resolves();
            getIdentitiesStub.resolves([]);

            const result: FabricWalletRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET);
            should.not.exist(result);

            deleteSpy.should.have.been.calledWith('someWalletName');
            browseStub.should.not.have.been.called;
            showInputBoxStub.should.have.been.calledOnce;
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS);
        });

        it('should handle errors thrown from addWalletIdentity command', async () => {
            choseWalletAddMethod.resolves(UserInputUtil.WALLET_NEW_ID);
            showInputBoxStub.resolves('someWalletName');
            executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand');
            executeCommandStub.callThrough();
            executeCommandStub.withArgs(ExtensionCommands.ADD_WALLET_IDENTITY, sinon.match.any).rejects({ message: 'some issue importing identity' });

            const result: FabricWalletRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET);
            should.not.exist(result);

            const wallets: Array<FabricWalletRegistryEntry> = await FabricWalletRegistry.instance().getAll();
            wallets.length.should.equal(0);
            logSpy.should.have.been.calledWith(LogType.ERROR, 'Failed to add a new wallet: some issue importing identity', 'Failed to add a new wallet: some issue importing identity');
        });

        it('should error if a new wallet with the same name already exists', async () => {
            choseWalletAddMethod.resolves(UserInputUtil.WALLET_NEW_ID);
            showInputBoxStub.resolves('someWalletName');
            mySandBox.stub(FabricWalletRegistry.instance(), 'exists').resolves(true);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET);

            browseStub.should.not.have.been.called;
            showInputBoxStub.should.have.been.calledOnce;
            const wallets: Array<FabricWalletRegistryEntry> = await FabricWalletRegistry.instance().getAll();
            wallets.length.should.equal(0);
            logSpy.should.have.been.calledWith(LogType.ERROR, `A wallet with this name already exists.`);
        });

        it('should add wallet with environmentGroup property', async () => {
            choseWalletAddMethod.resolves(UserInputUtil.WALLET_NEW_ID);
            showInputBoxStub.resolves('someWalletName');
            executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand');
            executeCommandStub.callThrough();
            executeCommandStub.withArgs(ExtensionCommands.ADD_WALLET_IDENTITY, sinon.match.instanceOf(FabricWalletRegistryEntry)).resolves();
            getIdentitiesStub.resolves(['someName', 'anotherName']);

            const environmentRegistryEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
            environmentRegistryEntry.name = 'myEnvironment';
            await FabricEnvironmentRegistry.instance().add(environmentRegistryEntry);
            mySandBox.stub(FabricEnvironmentRegistry.instance(), 'get').resolves({name: environmentRegistryEntry.name});

            const result: FabricWalletRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET, false, environmentRegistryEntry.name);
            result.name.should.equal('someWalletName');

            browseStub.should.not.have.been.called;
            showInputBoxStub.should.have.been.calledOnce;
            const wallets: Array<FabricWalletRegistryEntry> = await FabricWalletRegistry.instance().getAll();
            wallets.length.should.equal(1);
            wallets[0].should.deep.equal({
                name: 'someWalletName',
                walletPath: path.join(TestUtil.EXTENSION_TEST_DIR, FileConfigurations.FABRIC_WALLETS, 'someWalletName'),
                environmentGroups: [environmentRegistryEntry.name]
            });
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new wallet');
        });
    });
});
