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
import * as fs from 'fs-extra';
import { TestUtil } from '../TestUtil';
import { VSCodeBlockchainOutputAdapter } from '../../src/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../../src/logging/OutputAdapter';
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricWalletGenerator } from '../../src/fabric/FabricWalletGenerator';
import { FabricWallet } from '../../src/fabric/FabricWallet';

// tslint:disable no-unused-expression
chai.should();
chai.use(sinonChai);

describe('AddWalletCommand', () => {
    let mySandBox: sinon.SinonSandbox;
    let logSpy: sinon.SinonSpy;
    let showInputBoxStub: sinon.SinonStub;
    let browseEditStub: sinon.SinonStub;
    let choseWalletAddMethod: sinon.SinonStub;
    let uri: vscode.Uri;
    let getNewWallet: sinon.SinonStub;
    let testWallet: FabricWallet;
    let getIdentitiesStub: sinon.SinonStub;
    let createLocalWalletStub: sinon.SinonStub;
    let executeCommandStub: sinon.SinonStub;
    let fsRemoveStub: sinon.SinonStub;

    before(async () => {
        await TestUtil.setupTests();
        await TestUtil.storeWalletsConfig();
    });

    after(async () => {
        await TestUtil.restoreWalletsConfig();
    });

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
        logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');

        await vscode.workspace.getConfiguration().update('fabric.wallets', [], vscode.ConfigurationTarget.Global);
        showInputBoxStub = mySandBox.stub(vscode.window, 'showInputBox');
        browseEditStub = mySandBox.stub(UserInputUtil, 'browseEdit');
        choseWalletAddMethod = mySandBox.stub(UserInputUtil, 'showAddWalletOptionsQuickPick');
        uri = vscode.Uri.file(tmp.dirSync().name);
        testWallet = new FabricWallet(uri.fsPath);
        getIdentitiesStub = mySandBox.stub(testWallet, 'getIdentityNames');
        getNewWallet = mySandBox.stub(FabricWalletGenerator.instance(), 'getNewWallet');
        getNewWallet.returns(testWallet);
        createLocalWalletStub = mySandBox.stub(FabricWalletGenerator.instance(), 'createLocalWallet');
        createLocalWalletStub.resolves(testWallet);
        fsRemoveStub = mySandBox.stub(fs, 'remove').resolves();
    });

    afterEach(async () => {
        mySandBox.restore();
    });

    it('should handle the user cancelling selecting a method to add a new wallet', async () => {
        choseWalletAddMethod.resolves();

        await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET);
        showInputBoxStub.should.not.have.been.called;
        browseEditStub.should.not.have.been.called;
        logSpy.should.not.have.been.calledWith(LogType.SUCCESS);
    });

    describe('via providing a wallet path', async () => {

        it('should add a new wallet by providing a wallet path', async () => {
            choseWalletAddMethod.resolves(UserInputUtil.WALLET);
            browseEditStub.resolves(uri);
            getIdentitiesStub.resolves(['someName', 'anotherName']);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET);

            showInputBoxStub.should.not.have.been.called;
            const wallets: Array<any> = vscode.workspace.getConfiguration().get('fabric.wallets');
            wallets.length.should.equal(1);
            wallets[0].should.deep.equal({
                name: path.basename(uri.fsPath),
                walletPath: uri.fsPath
            });
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new wallet');
        });

        it('should handle the user cancelling providing a wallet path', async () => {
            choseWalletAddMethod.resolves(UserInputUtil.WALLET);
            browseEditStub.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET);
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS);
            showInputBoxStub.should.not.have.been.called;
        });

        it('should not allow the user to add an empty directory as a wallet', async () => {
            choseWalletAddMethod.resolves(UserInputUtil.WALLET);
            browseEditStub.resolves(uri);
            getIdentitiesStub.resolves([]);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET);
            logSpy.should.have.been.calledWith(LogType.ERROR, `Failed to add a new wallet: No identities found in wallet: ${uri.fsPath}`, `Failed to add a new wallet: No identities found in wallet: ${uri.fsPath}`);
        });

    });

    describe('by adding an identity', async () => {

        it('should add a new wallet by creating a new identity', async () => {
            choseWalletAddMethod.resolves(UserInputUtil.WALLET_NEW_ID);
            showInputBoxStub.resolves('someWalletName');
            executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand');
            executeCommandStub.callThrough();
            executeCommandStub.withArgs(ExtensionCommands.ADD_WALLET_IDENTITY, sinon.match.any).resolves();
            getIdentitiesStub.resolves(['someName', 'anotherName']);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET);

            browseEditStub.should.not.have.been.called;
            showInputBoxStub.should.have.been.calledOnce;
            const wallets: Array<any> = vscode.workspace.getConfiguration().get('fabric.wallets');
            wallets.length.should.equal(1);
            wallets[0].should.deep.equal({
                name: 'someWalletName',
                walletPath: uri.fsPath
            });
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new wallet');
        });

        it('should handle the user cancelling providing a wallet name', async () => {
            choseWalletAddMethod.resolves(UserInputUtil.WALLET_NEW_ID);
            showInputBoxStub.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET);
            browseEditStub.should.not.have.been.called;
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS);
        });

        it('should no nothing if the addWalletIdentity command was cancelled', async () => {
            choseWalletAddMethod.resolves(UserInputUtil.WALLET_NEW_ID);
            showInputBoxStub.resolves('someWalletName');
            executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand');
            executeCommandStub.callThrough();
            executeCommandStub.withArgs(ExtensionCommands.ADD_WALLET_IDENTITY, sinon.match.any).resolves();
            getIdentitiesStub.resolves([]);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET);

            fsRemoveStub.should.have.been.calledOnceWithExactly(uri.fsPath);
            browseEditStub.should.not.have.been.called;
            showInputBoxStub.should.have.been.calledOnce;
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS);
        });

        it('should handle errors thrown from addWalletIdentity command', async () => {
            choseWalletAddMethod.resolves(UserInputUtil.WALLET_NEW_ID);
            showInputBoxStub.resolves('someWalletName');
            executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand');
            executeCommandStub.callThrough();
            executeCommandStub.withArgs(ExtensionCommands.ADD_WALLET_IDENTITY, sinon.match.any).rejects({message: 'some issue importing identity'});

            await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET);

            const wallets: Array<any> = vscode.workspace.getConfiguration().get('fabric.wallets');
            wallets.length.should.equal(0);
            logSpy.should.have.been.calledWith(LogType.ERROR, 'Failed to add a new wallet: some issue importing identity', 'Failed to add a new wallet: some issue importing identity');
        });
    });

});
