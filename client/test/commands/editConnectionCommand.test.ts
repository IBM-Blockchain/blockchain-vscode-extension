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
import * as path from 'path';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as fs from 'fs-extra';
import { TestUtil } from '../TestUtil';
import { FabricConnectionHelper } from '../../src/fabric/FabricConnectionHelper';
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import { FabricConnectionRegistry } from '../../src/fabric/FabricConnectionRegistry';
import { ConnectionPropertyTreeItem } from '../../src/explorer/model/ConnectionPropertyTreeItem';
import { BlockchainNetworkExplorerProvider } from '../../src/explorer/BlockchainNetworkExplorer';
import { FabricConnectionRegistryEntry } from '../../src/fabric/FabricConnectionRegistryEntry';
import * as myExtension from '../../src/extension';
import { ConnectionTreeItem } from '../../src/explorer/model/ConnectionTreeItem';
import { ParsedCertificate } from '../../src/fabric/ParsedCertificate';
import { VSCodeOutputAdapter } from '../../src/logging/VSCodeOutputAdapter';
import { LogType } from '../../src/logging/OutputAdapter';
import { FabricWallet } from '../../src/fabric/FabricWallet';
import { FabricWalletGenerator } from '../../src/fabric/FabricWalletGenerator';
import { ExtensionUtil } from '../../src/util/ExtensionUtil';

chai.should();
chai.use(sinonChai);

// tslint:disable no-unused-expression

describe('EditConnectionCommand', () => {
    let mySandBox: sinon.SinonSandbox;
    let openUserSettingsStub: sinon.SinonStub;
    let quickPickStub: sinon.SinonStub;
    let showConnectionQuickPickStub: sinon.SinonStub;
    let browseEditStub: sinon.SinonStub;
    let showIdentityOptionsStub: sinon.SinonStub;
    let updateFabricConnectionRegistryStub: sinon.SinonStub;
    let showInputBoxStub: sinon.SinonStub;
    let walletGenerator: FabricWalletGenerator;
    let logSpy: sinon.SinonSpy;

    before(async () => {
        await TestUtil.setupTests();
        await TestUtil.storeConnectionsConfig();
    });

    after(async () => {
        await TestUtil.restoreConnectionsConfig();
    });

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
        openUserSettingsStub = mySandBox.stub(UserInputUtil, 'openUserSettings');
        quickPickStub = mySandBox.stub(vscode.window, 'showQuickPick');
        showConnectionQuickPickStub = mySandBox.stub(UserInputUtil, 'showConnectionQuickPickBox');
        browseEditStub = mySandBox.stub(UserInputUtil, 'browseEdit').resolves();
        showIdentityOptionsStub = mySandBox.stub(UserInputUtil, 'showAddIdentityOptionsQuickPick');
        updateFabricConnectionRegistryStub = mySandBox.stub(FabricConnectionRegistry.instance(), 'update').resolves();
        showInputBoxStub = mySandBox.stub(vscode.window, 'showInputBox');
        walletGenerator = await FabricWalletGenerator.instance();
        logSpy = mySandBox.stub(VSCodeOutputAdapter.instance(), 'log');
    });

    afterEach(() => {
        mySandBox.restore();
    });

    describe('editConnection', () => {

        describe('called from command', () => {

            it('should cancel if no connection chosen to edit', async () => {
                const isCompletedSpy: sinon.SinonSpy = mySandBox.spy(FabricConnectionHelper, 'isCompleted');
                showConnectionQuickPickStub.resolves();

                await vscode.commands.executeCommand('blockchainExplorer.editConnectionEntry');
                isCompletedSpy.should.not.have.been.called;
            });

            it('should open user settings if completed connection', async () => {
                const isCompletedStub: sinon.SinonStub = mySandBox.stub(FabricConnectionHelper, 'isCompleted').returns(true);
                mySandBox.stub(FabricConnectionHelper, 'walletPathComplete').returns(true);
                mySandBox.stub(FabricConnectionHelper, 'connectionProfilePathComplete').returns(true);
                openUserSettingsStub.resolves();
                showConnectionQuickPickStub.resolves({label: 'myConnection', data: {
                    connectionProfilePath: '/some/path',
                    walletPath: 'some/path'
                }});

                await vscode.commands.executeCommand('blockchainExplorer.editConnectionEntry');
                isCompletedStub.should.have.been.calledWith({
                    connectionProfilePath: '/some/path',
                    walletPath: 'some/path'
                });
                openUserSettingsStub.should.have.been.calledWith('myConnection');
                logSpy.should.have.been.calledOnce;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should cancel if user doesnt select a property to edit', async () => {
                mySandBox.stub(FabricConnectionHelper, 'isCompleted').returns(false);
                quickPickStub.resolves();
                showConnectionQuickPickStub.resolves({label: 'myConnection', data: {connectionProfilePath: '', walletPath: ''}});

                await vscode.commands.executeCommand('blockchainExplorer.editConnectionEntry');
                const placeHolder: string = 'Select a connection property to edit:';
                quickPickStub.should.have.been.calledWith(['Connection Profile', 'Wallet', 'Identity'], {placeHolder});
                browseEditStub.should.not.have.been.called;
                updateFabricConnectionRegistryStub.should.not.have.been.called;
                logSpy.should.have.been.calledOnce;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should update connection profile when the walletPath is complete', async () => {
                mySandBox.stub(ParsedCertificate, 'validPEM').returns(null);
                mySandBox.stub(FabricConnectionHelper, 'walletPathComplete').returns(true);
                mySandBox.stub(FabricConnectionHelper, 'connectionProfilePathComplete').returns(false);
                showConnectionQuickPickStub.resolves({label: 'myConnection', data: {connectionProfilePath: '', walletPath: '/some/walletPath'}});
                browseEditStub.onCall(0).resolves('/some/path');

                await vscode.commands.executeCommand('blockchainExplorer.editConnectionEntry');
                updateFabricConnectionRegistryStub.should.have.been.calledOnce;
                updateFabricConnectionRegistryStub.getCall(0).should.have.been.calledWith({connectionProfilePath: '/some/path', walletPath: '/some/walletPath'});
                logSpy.should.have.been.calledTwice;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should update connection profile and then the wallet path', async () => {
                mySandBox.stub(ParsedCertificate, 'validPEM').returns(null);
                mySandBox.stub(FabricConnectionHelper, 'walletPathComplete').returns(false);
                mySandBox.stub(FabricConnectionHelper, 'connectionProfilePathComplete').returns(false);
                showConnectionQuickPickStub.resolves({label: 'myConnection', data: {connectionProfilePath: '', walletPath: ''}});
                quickPickStub.resolves('Connection Profile');
                browseEditStub.onCall(0).resolves('/some/path');
                showIdentityOptionsStub.resolves(UserInputUtil.WALLET);
                browseEditStub.onCall(1).resolves('/some/walletPath');

                await vscode.commands.executeCommand('blockchainExplorer.editConnectionEntry');
                const placeHolder: string = 'Select a connection property to edit:';
                quickPickStub.should.have.been.calledWith(['Connection Profile', 'Wallet', 'Identity'], {placeHolder});
                updateFabricConnectionRegistryStub.should.have.been.calledTwice;
                updateFabricConnectionRegistryStub.getCall(1).should.have.been.calledWith({connectionProfilePath: '/some/path', walletPath: '/some/walletPath'});
                logSpy.should.have.been.calledThrice;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should update connection profile and then the identity', async () => {
                mySandBox.stub(ParsedCertificate, 'validPEM').returns(null);
                mySandBox.stub(FabricConnectionHelper, 'walletPathComplete').returns(false);
                mySandBox.stub(FabricConnectionHelper, 'connectionProfilePathComplete').returns(false);
                showConnectionQuickPickStub.resolves({label: 'myConnection', data: {connectionProfilePath: '', walletPath: ''}});
                quickPickStub.resolves('Connection Profile');
                browseEditStub.onCall(0).resolves('/some/path');
                showIdentityOptionsStub.resolves(UserInputUtil.CERT_KEY);
                showInputBoxStub.resolves('purpleConga');
                browseEditStub.onCall(1).resolves('/some/certificatePath');
                browseEditStub.onCall(2).resolves('/some/keyPath');

                mySandBox.stub(ExtensionUtil, 'readConnectionProfile').resolves('something');
                mySandBox.stub(fs, 'readFile').resolves('somethingElse');

                const testFabricWallet: FabricWallet = new FabricWallet('myConnection', 'some/new/wallet/path');
                mySandBox.stub(walletGenerator, 'createLocalWallet').resolves(testFabricWallet);
                mySandBox.stub(testFabricWallet, 'importIdentity').resolves();

                await vscode.commands.executeCommand('blockchainExplorer.editConnectionEntry');
                updateFabricConnectionRegistryStub.should.have.been.calledTwice;
                updateFabricConnectionRegistryStub.getCall(1).should.have.been.calledWith({connectionProfilePath: '/some/path', walletPath: 'some/new/wallet/path'});
                logSpy.should.have.been.calledThrice;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should update connection profile and then handle the user not providing certificate path', async () => {
                mySandBox.stub(ParsedCertificate, 'validPEM').returns(null);
                mySandBox.stub(FabricConnectionHelper, 'walletPathComplete').returns(false);
                mySandBox.stub(FabricConnectionHelper, 'connectionProfilePathComplete').returns(false);
                showConnectionQuickPickStub.resolves({label: 'myConnection', data: {connectionProfilePath: '', walletPath: ''}});
                quickPickStub.resolves('Connection Profile');
                browseEditStub.onCall(0).resolves('/some/path');
                showIdentityOptionsStub.resolves(UserInputUtil.CERT_KEY);
                showInputBoxStub.resolves('greenConga');
                browseEditStub.onCall(1).resolves('some/certificatePath');
                browseEditStub.onCall(2).resolves();

                await vscode.commands.executeCommand('blockchainExplorer.editConnectionEntry');
                updateFabricConnectionRegistryStub.should.have.been.calledOnce;
                updateFabricConnectionRegistryStub.getCall(0).should.have.been.calledWith({connectionProfilePath: '/some/path', walletPath: ''});
                browseEditStub.should.have.been.calledThrice;
                logSpy.should.have.been.calledTwice;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should update connection profile and then handle the user not providing method for importing identity', async () => {
                mySandBox.stub(ParsedCertificate, 'validPEM').returns(null);
                mySandBox.stub(FabricConnectionHelper, 'walletPathComplete').returns(false);
                mySandBox.stub(FabricConnectionHelper, 'connectionProfilePathComplete').returns(false);
                showConnectionQuickPickStub.resolves({label: 'myConnection', data: {connectionProfilePath: '', walletPath: ''}});
                quickPickStub.resolves('Connection Profile');
                browseEditStub.onCall(0).resolves('/some/path');
                showIdentityOptionsStub.resolves();

                await vscode.commands.executeCommand('blockchainExplorer.editConnectionEntry');
                updateFabricConnectionRegistryStub.should.have.been.calledOnce;
                updateFabricConnectionRegistryStub.getCall(0).should.have.been.calledWith({connectionProfilePath: '/some/path', walletPath: ''});
                browseEditStub.should.have.been.calledOnce;
                logSpy.should.have.been.calledTwice;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });
            it('should update connection profile and then handle the user not providing wallet path', async () => {
                mySandBox.stub(ParsedCertificate, 'validPEM').returns(null);
                mySandBox.stub(FabricConnectionHelper, 'walletPathComplete').returns(false);
                mySandBox.stub(FabricConnectionHelper, 'connectionProfilePathComplete').returns(false);
                showConnectionQuickPickStub.resolves({label: 'myConnection', data: {connectionProfilePath: '', walletPath: ''}});
                quickPickStub.resolves('Connection Profile');
                browseEditStub.onCall(0).resolves('/some/path');
                showIdentityOptionsStub.resolves(UserInputUtil.WALLET);
                browseEditStub.onCall(1).resolves();

                await vscode.commands.executeCommand('blockchainExplorer.editConnectionEntry');
                updateFabricConnectionRegistryStub.should.have.been.calledOnce;
                updateFabricConnectionRegistryStub.getCall(0).should.have.been.calledWith({connectionProfilePath: '/some/path', walletPath: ''});
                browseEditStub.should.have.been.calledTwice;
                logSpy.should.have.been.calledTwice;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should update the identity with cert/keyPath by creating a wallet', async () => {
                mySandBox.stub(ParsedCertificate, 'validPEM').returns(null);
                mySandBox.stub(FabricConnectionHelper, 'walletPathComplete').returns(false);
                mySandBox.stub(FabricConnectionHelper, 'connectionProfilePathComplete').returns(true);
                showConnectionQuickPickStub.resolves({label: 'myConnection', data: {connectionProfilePath: '/some/path', walletPath: ''}});
                quickPickStub.resolves('Identity');
                showInputBoxStub.resolves('purpleConga');
                browseEditStub.onCall(0).resolves('/some/certificatePath');
                browseEditStub.onCall(1).resolves('/some/keyPath');

                mySandBox.stub(ExtensionUtil, 'readConnectionProfile').resolves('something');
                mySandBox.stub(fs, 'readFile').resolves('somethingElse');

                const testFabricWallet: FabricWallet = new FabricWallet('myConnection', 'some/new/wallet/path');
                mySandBox.stub(walletGenerator, 'createLocalWallet').resolves(testFabricWallet);
                mySandBox.stub(testFabricWallet, 'importIdentity').resolves();

                await vscode.commands.executeCommand('blockchainExplorer.editConnectionEntry');
                updateFabricConnectionRegistryStub.should.have.been.calledOnce;
                updateFabricConnectionRegistryStub.getCall(0).should.have.been.calledWith({connectionProfilePath: '/some/path', walletPath: 'some/new/wallet/path'});
                logSpy.should.have.been.calledTwice;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should handle the user cancelling providing identity name', async () => {
                mySandBox.stub(ParsedCertificate, 'validPEM').returns(null);
                mySandBox.stub(FabricConnectionHelper, 'walletPathComplete').returns(false);
                mySandBox.stub(FabricConnectionHelper, 'connectionProfilePathComplete').returns(true);
                showConnectionQuickPickStub.resolves({label: 'myConnection', data: {connectionProfilePath: '/some/path', walletPath: ''}});
                quickPickStub.resolves('Identity');
                showInputBoxStub.resolves();

                await vscode.commands.executeCommand('blockchainExplorer.editConnectionEntry');
                updateFabricConnectionRegistryStub.should.not.have.been.called;
                browseEditStub.should.not.have.been.called;
                logSpy.should.have.been.calledOnce;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should handle the user cancelling providing the certificate', async () => {
                mySandBox.stub(ParsedCertificate, 'validPEM').returns(null);
                mySandBox.stub(FabricConnectionHelper, 'walletPathComplete').returns(false);
                mySandBox.stub(FabricConnectionHelper, 'connectionProfilePathComplete').returns(true);
                showConnectionQuickPickStub.resolves({label: 'myConnection', data: {connectionProfilePath: '/some/path', walletPath: ''}});
                quickPickStub.resolves('Identity');
                showInputBoxStub.resolves('greenConga');
                browseEditStub.onCall(0).resolves();

                await vscode.commands.executeCommand('blockchainExplorer.editConnectionEntry');
                updateFabricConnectionRegistryStub.should.not.have.been.called;
                browseEditStub.should.have.been.calledOnce;
                logSpy.should.have.been.calledOnce;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should handle the user cancelling providing the certificate', async () => {
                mySandBox.stub(ParsedCertificate, 'validPEM').returns(null);
                mySandBox.stub(FabricConnectionHelper, 'walletPathComplete').returns(false);
                mySandBox.stub(FabricConnectionHelper, 'connectionProfilePathComplete').returns(true);
                showConnectionQuickPickStub.resolves({label: 'myConnection', data: {connectionProfilePath: '/some/path', walletPath: ''}});
                quickPickStub.resolves('Identity');
                showInputBoxStub.resolves('greenConga');
                browseEditStub.onCall(0).resolves('some/path');
                browseEditStub.onCall(1).resolves();

                await vscode.commands.executeCommand('blockchainExplorer.editConnectionEntry');
                updateFabricConnectionRegistryStub.should.not.have.been.called;
                browseEditStub.should.have.been.calledTwice;
                logSpy.should.have.been.calledOnce;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should update the identity with cert/keyPath, connection profile and then create a wallet', async () => {
                mySandBox.stub(ParsedCertificate, 'validPEM').returns(null);
                mySandBox.stub(FabricConnectionHelper, 'walletPathComplete').returns(false);
                mySandBox.stub(FabricConnectionHelper, 'connectionProfilePathComplete').returns(false);
                showConnectionQuickPickStub.resolves({label: 'myConnection', data: {connectionProfilePath: '', walletPath: ''}});
                quickPickStub.resolves('Identity');
                showInputBoxStub.resolves('purpleConga');
                browseEditStub.onCall(0).resolves('/some/certificatePath');
                browseEditStub.onCall(1).resolves('/some/keyPath');
                browseEditStub.onCall(2).resolves('/some/connectionProfilePath');

                mySandBox.stub(ExtensionUtil, 'readConnectionProfile').resolves('something');
                mySandBox.stub(fs, 'readFile').resolves('somethingElse');

                const testFabricWallet: FabricWallet = new FabricWallet('myConnection', 'some/new/wallet/path');
                mySandBox.stub(walletGenerator, 'createLocalWallet').resolves(testFabricWallet);
                mySandBox.stub(testFabricWallet, 'importIdentity').resolves();

                await vscode.commands.executeCommand('blockchainExplorer.editConnectionEntry');
                updateFabricConnectionRegistryStub.should.have.been.calledTwice;
                updateFabricConnectionRegistryStub.getCall(1).should.have.been.calledWith({connectionProfilePath: '/some/connectionProfilePath', walletPath: 'some/new/wallet/path'});
                logSpy.should.have.been.calledThrice;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should update the identity with cert/keyPath, and then show an error if connection profile is not given', async () => {
                mySandBox.stub(ParsedCertificate, 'validPEM').returns(null);
                mySandBox.stub(FabricConnectionHelper, 'walletPathComplete').returns(false);
                mySandBox.stub(FabricConnectionHelper, 'connectionProfilePathComplete').returns(false);
                showConnectionQuickPickStub.resolves({label: 'myConnection', data: {connectionProfilePath: '', walletPath: ''}});
                quickPickStub.resolves('Identity');
                showInputBoxStub.resolves('purpleConga');
                browseEditStub.onCall(0).resolves('/some/certificatePath');
                browseEditStub.onCall(1).resolves('/some/keyPath');

                await vscode.commands.executeCommand('blockchainExplorer.editConnectionEntry');
                updateFabricConnectionRegistryStub.should.not.have.been.called;
                logSpy.should.have.been.calledTwice;
                logSpy.should.have.been.calledWith(LogType.ERROR, `Failed to edit connection: Connection Profile required to import identity to file system wallet`, `Failed to edit connection: Error: Connection Profile required to import identity to file system wallet`);
            });

            it('should update the connection with a walletPath', async () => {
                mySandBox.stub(ParsedCertificate, 'validPEM').returns(null);
                mySandBox.stub(FabricConnectionHelper, 'walletPathComplete').returns(false);
                mySandBox.stub(FabricConnectionHelper, 'connectionProfilePathComplete').returns(true);
                showConnectionQuickPickStub.resolves({label: 'myConnection', data: {connectionProfilePath: '/some/path', walletPath: ''}});
                quickPickStub.resolves('Wallet');
                browseEditStub.onCall(0).resolves('/some/walletPath');

                await vscode.commands.executeCommand('blockchainExplorer.editConnectionEntry');
                updateFabricConnectionRegistryStub.should.have.been.calledOnce;
                updateFabricConnectionRegistryStub.getCall(0).should.have.been.calledWith({connectionProfilePath: '/some/path', walletPath: '/some/walletPath'});
                logSpy.should.have.been.calledTwice;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should update the connection with a walletPath and then a connection profile', async () => {
                mySandBox.stub(ParsedCertificate, 'validPEM').returns(null);
                mySandBox.stub(FabricConnectionHelper, 'walletPathComplete').returns(false);
                mySandBox.stub(FabricConnectionHelper, 'connectionProfilePathComplete').returns(false);
                showConnectionQuickPickStub.resolves({label: 'myConnection', data: {connectionProfilePath: '', walletPath: ''}});
                quickPickStub.resolves('Wallet');
                browseEditStub.onCall(0).resolves('/some/walletPath');
                browseEditStub.onCall(1).resolves('/some/otherPath');

                await vscode.commands.executeCommand('blockchainExplorer.editConnectionEntry');
                const placeHolder: string = 'Select a connection property to edit:';
                quickPickStub.should.have.been.calledWith(['Connection Profile', 'Wallet', 'Identity'], {placeHolder});
                updateFabricConnectionRegistryStub.should.have.been.calledTwice;
                updateFabricConnectionRegistryStub.getCall(1).should.have.been.calledWith({connectionProfilePath: '/some/otherPath', walletPath: '/some/walletPath'});
                logSpy.should.have.been.calledThrice;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should update the connection with a walletPath and handle the user cancelling providing a connection profile', async () => {
                mySandBox.stub(ParsedCertificate, 'validPEM').returns(null);
                mySandBox.stub(FabricConnectionHelper, 'walletPathComplete').returns(false);
                mySandBox.stub(FabricConnectionHelper, 'connectionProfilePathComplete').returns(false);
                showConnectionQuickPickStub.resolves({label: 'myConnection', data: {connectionProfilePath: '', walletPath: ''}});
                quickPickStub.resolves('Wallet');
                browseEditStub.onCall(0).resolves('/some/walletPath');

                await vscode.commands.executeCommand('blockchainExplorer.editConnectionEntry');
                const placeHolder: string = 'Select a connection property to edit:';
                quickPickStub.should.have.been.calledWith(['Connection Profile', 'Wallet', 'Identity'], {placeHolder});
                updateFabricConnectionRegistryStub.should.have.been.calledOnce;
                updateFabricConnectionRegistryStub.getCall(0).should.have.been.calledWith({connectionProfilePath: '', walletPath: '/some/walletPath'});
                logSpy.should.have.been.calledTwice;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should handle the user cancelling providing a wallet path', async () => {
                mySandBox.stub(ParsedCertificate, 'validPEM').returns(null);
                mySandBox.stub(FabricConnectionHelper, 'walletPathComplete').returns(false);
                mySandBox.stub(FabricConnectionHelper, 'connectionProfilePathComplete').returns(true);
                showConnectionQuickPickStub.resolves({label: 'myConnection', data: {connectionProfilePath: '/some/path', walletPath: ''}});
                quickPickStub.resolves('Wallet');
                browseEditStub.onCall(0).resolves();

                await vscode.commands.executeCommand('blockchainExplorer.editConnectionEntry');
                updateFabricConnectionRegistryStub.should.not.have.been.called;
                browseEditStub.should.have.been.calledOnce;
                logSpy.should.have.been.calledOnce;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should cancel if user doesnt browse or edit when editing a property', async () => {
                mySandBox.stub(FabricConnectionHelper, 'isCompleted').returns(false);
                quickPickStub.resolves('Connection Profile');
                showConnectionQuickPickStub.resolves({label: 'myConnection', data: {connectionProfilePath: '', walletPath: ''}});

                await vscode.commands.executeCommand('blockchainExplorer.editConnectionEntry');
                const placeHolder: string = 'Select a connection property to edit:';
                quickPickStub.should.have.been.calledWith(['Connection Profile', 'Wallet', 'Identity'], {placeHolder});
                browseEditStub.should.have.been.called;
                logSpy.should.have.been.calledOnce;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should throw an error if certificate is invalid', async () => {
                const error: Error = new Error('Could not validate certificate: invalid PEM');
                mySandBox.stub(ParsedCertificate, 'validPEM').onFirstCall().throws(error);
                mySandBox.stub(FabricConnectionHelper, 'walletPathComplete').returns(false);
                mySandBox.stub(FabricConnectionHelper, 'connectionProfilePathComplete').returns(true);
                showConnectionQuickPickStub.resolves({label: 'myConnection', data: {connectionProfilePath: '/some/path', walletPath: ''}});
                quickPickStub.resolves('Identity');
                showInputBoxStub.resolves('purpleConga');
                browseEditStub.onCall(0).resolves('/some/certificatePath');
                browseEditStub.onCall(1).resolves('/some/KeyPath');

                await vscode.commands.executeCommand('blockchainExplorer.editConnectionEntry');
                updateFabricConnectionRegistryStub.should.not.have.been.called;
                logSpy.should.have.been.calledTwice;
                logSpy.should.have.been.calledWith(LogType.ERROR, `Failed to edit connection: ${error.message}`, `Failed to edit connection: ${error.toString()}`);
            });

            it('should throw an error if private key is invalid', async () => {
                const error: Error = new Error('Could not validate private Key: invalid PEM');
                mySandBox.stub(ParsedCertificate, 'validPEM').onFirstCall().throws(error);
                mySandBox.stub(FabricConnectionHelper, 'walletPathComplete').returns(false);
                mySandBox.stub(FabricConnectionHelper, 'connectionProfilePathComplete').returns(true);
                showConnectionQuickPickStub.resolves({label: 'myConnection', data: {connectionProfilePath: '/some/path', walletPath: ''}});
                quickPickStub.resolves('Identity');
                showInputBoxStub.resolves('purpleConga');
                browseEditStub.onCall(0).resolves('/some/certificatePath');

                await vscode.commands.executeCommand('blockchainExplorer.editConnectionEntry');
                updateFabricConnectionRegistryStub.should.not.have.been.called;
                logSpy.should.have.been.calledTwice;
                logSpy.should.have.been.calledWith(LogType.ERROR, `Failed to edit connection: ${error.message}`, `Failed to edit connection: ${error.toString()}`);
            });

            it('should handle no client section defined in the connection.json of the network', async () => {
                const error: Error = new Error(`Client.createUser parameter 'opts mspid' is required`);
                mySandBox.stub(ParsedCertificate, 'validPEM').returns(null);
                mySandBox.stub(FabricConnectionHelper, 'walletPathComplete').returns(false);
                mySandBox.stub(FabricConnectionHelper, 'connectionProfilePathComplete').returns(true);
                showConnectionQuickPickStub.resolves({label: 'myConnection', data: {connectionProfilePath: '/some/path', walletPath: ''}});
                quickPickStub.resolves('Identity');
                showInputBoxStub.onCall(0).resolves('purpleConga');
                browseEditStub.onCall(0).resolves('/some/certificatePath');
                browseEditStub.onCall(1).resolves('/some/keyPath');
                mySandBox.stub(ExtensionUtil, 'readConnectionProfile').resolves('something');
                mySandBox.stub(fs, 'readFile').resolves('somethingElse');

                const testFabricWallet: FabricWallet = new FabricWallet('myConnection', 'some/new/wallet/path');
                mySandBox.stub(walletGenerator, 'createLocalWallet').resolves(testFabricWallet);
                const importIdentityStub: sinon.SinonStub = mySandBox.stub(testFabricWallet, 'importIdentity').onCall(0).rejects(error);
                showInputBoxStub.onCall(1).resolves('Org1MSP');
                importIdentityStub.onCall(1).resolves();

                await vscode.commands.executeCommand('blockchainExplorer.editConnectionEntry');
                updateFabricConnectionRegistryStub.should.have.been.calledOnce;
                updateFabricConnectionRegistryStub.getCall(0).should.have.been.calledWith({connectionProfilePath: '/some/path', walletPath: 'some/new/wallet/path'});
                logSpy.should.have.been.calledTwice;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
                importIdentityStub.should.have.been.calledTwice;
            });

            it('should handle the user cancelling providing the mspid', async () => {
                mySandBox.stub(ParsedCertificate, 'validPEM').returns(null);
                mySandBox.stub(FabricConnectionHelper, 'walletPathComplete').returns(false);
                mySandBox.stub(FabricConnectionHelper, 'connectionProfilePathComplete').returns(true);
                showConnectionQuickPickStub.resolves({label: 'myConnection', data: {connectionProfilePath: '/some/path', walletPath: ''}});
                quickPickStub.resolves('Identity');
                showInputBoxStub.onCall(0).resolves('purpleConga');
                browseEditStub.onCall(0).resolves('/some/certificatePath');
                browseEditStub.onCall(1).resolves('/some/keyPath');
                mySandBox.stub(ExtensionUtil, 'readConnectionProfile').resolves('something');
                mySandBox.stub(fs, 'readFile').resolves('somethingElse');

                const testFabricWallet: FabricWallet = new FabricWallet('myConnection', 'some/new/wallet/path');
                mySandBox.stub(walletGenerator, 'createLocalWallet').resolves(testFabricWallet);
                const importIdentityStub: sinon.SinonStub = mySandBox.stub(testFabricWallet, 'importIdentity').onCall(0).rejects( {message: `Client.createUser parameter 'opts mspid' is required`} );
                showInputBoxStub.onCall(1).resolves();

                await vscode.commands.executeCommand('blockchainExplorer.editConnectionEntry');
                updateFabricConnectionRegistryStub.should.not.have.been.called;
                importIdentityStub.should.have.been.calledOnce;
                logSpy.should.have.been.calledOnce;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should handle the wallet import failing for some other reason', async () => {
                const error: Error = new Error(`some other reason`);
                mySandBox.stub(ParsedCertificate, 'validPEM').returns(null);
                mySandBox.stub(FabricConnectionHelper, 'walletPathComplete').returns(false);
                mySandBox.stub(FabricConnectionHelper, 'connectionProfilePathComplete').returns(true);
                showConnectionQuickPickStub.resolves({label: 'myConnection', data: {connectionProfilePath: '/some/path', walletPath: ''}});
                quickPickStub.resolves('Identity');
                showInputBoxStub.onCall(0).resolves('purpleConga');
                browseEditStub.onCall(0).resolves('/some/certificatePath');
                browseEditStub.onCall(1).resolves('/some/keyPath');
                mySandBox.stub(ExtensionUtil, 'readConnectionProfile').resolves('something');
                mySandBox.stub(fs, 'readFile').resolves('somethingElse');

                const testFabricWallet: FabricWallet = new FabricWallet('myConnection', 'some/new/wallet/path');
                mySandBox.stub(walletGenerator, 'createLocalWallet').resolves(testFabricWallet);
                const importIdentityStub: sinon.SinonStub = mySandBox.stub(testFabricWallet, 'importIdentity').onCall(0).rejects(error);

                await vscode.commands.executeCommand('blockchainExplorer.editConnectionEntry');
                updateFabricConnectionRegistryStub.should.not.have.been.called;
                logSpy.should.have.been.calledTwice;
                logSpy.should.have.been.calledWith(LogType.ERROR, `Failed to edit connection: ${error.message}`, `Failed to edit connection: ${error.toString()}`);
                importIdentityStub.should.have.been.calledOnce;
                showInputBoxStub.should.have.been.calledOnce;
            });

        });

        describe('called from tree by clicking or right-clicking and editing', () => {
            it('should open user settings if editing an uncompleted connection (by right-clicking and editing)', async () => {
                const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
                const treeItem: ConnectionTreeItem = new ConnectionTreeItem(blockchainNetworkExplorerProvider, 'My Connection', {name: 'myConnection'} as FabricConnectionRegistryEntry, 2);

                await vscode.commands.executeCommand('blockchainExplorer.editConnectionEntry', treeItem);
                openUserSettingsStub.should.have.been.calledWith('myConnection');
                logSpy.should.have.been.calledOnce;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should stop if a property for an uncompleted connection has been assigned data already', async () => {
                const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
                const treeItem: ConnectionPropertyTreeItem = new ConnectionPropertyTreeItem(blockchainNetworkExplorerProvider, '✓ Connection Profile', {name: 'myConnection'} as FabricConnectionRegistryEntry, 0);

                await vscode.commands.executeCommand('blockchainExplorer.editConnectionEntry', treeItem);
                openUserSettingsStub.should.not.have.been.called;
                logSpy.should.have.been.calledOnce;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should update a connection profile for an uncompleted connection when clicked on', async () => {
                mySandBox.stub(FabricConnectionHelper, 'walletPathComplete').returns(true);
                const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
                const treeItem: ConnectionPropertyTreeItem = new ConnectionPropertyTreeItem(blockchainNetworkExplorerProvider, '+ Connection Profile', {name: 'myConnection', walletPath: 'some/otherPath'} as FabricConnectionRegistryEntry, 0);
                browseEditStub.resolves('/some/path');

                await vscode.commands.executeCommand('blockchainExplorer.editConnectionEntry', treeItem);
                updateFabricConnectionRegistryStub.should.have.been.calledWith({connectionProfilePath: '/some/path', walletPath: 'some/otherPath', name: 'myConnection'});
                logSpy.should.have.been.calledTwice;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should update a wallet path for an uncompleted connection when clicked on', async () => {
                mySandBox.stub(ParsedCertificate, 'validPEM').returns(null);
                mySandBox.stub(FabricConnectionHelper, 'connectionProfilePathComplete').returns(true);
                const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
                const treeItem: ConnectionPropertyTreeItem = new ConnectionPropertyTreeItem(blockchainNetworkExplorerProvider, '+ Wallet', {name: 'myConnection', connectionProfilePath: '/some/path'} as FabricConnectionRegistryEntry, 0);
                browseEditStub.resolves('/some/walletPath');

                await vscode.commands.executeCommand('blockchainExplorer.editConnectionEntry', treeItem);
                updateFabricConnectionRegistryStub.should.have.been.calledWith({connectionProfilePath: '/some/path', walletPath: '/some/walletPath', name: 'myConnection'});
                logSpy.should.have.been.calledTwice;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should update an identity for an uncompleted connection when clicked on', async () => {
                mySandBox.stub(ParsedCertificate, 'validPEM').returns(null);
                mySandBox.stub(FabricConnectionHelper, 'connectionProfilePathComplete').returns(true);
                const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
                const treeItem: ConnectionPropertyTreeItem = new ConnectionPropertyTreeItem(blockchainNetworkExplorerProvider, '+ Identity', {name: 'myConnection', connectionProfilePath: '/some/path'} as FabricConnectionRegistryEntry, 0);
                showInputBoxStub.resolves('blackConga');
                browseEditStub.onCall(0).resolves('/some/certificatePath');
                browseEditStub.onCall(1).resolves('/some/keyPath');

                mySandBox.stub(ExtensionUtil, 'readConnectionProfile').resolves('something');
                mySandBox.stub(fs, 'readFile').resolves('somethingElse');

                const testFabricWallet: FabricWallet = new FabricWallet('myConnection', 'some/new/wallet/path');
                mySandBox.stub(walletGenerator, 'createLocalWallet').resolves(testFabricWallet);
                mySandBox.stub(testFabricWallet, 'importIdentity').resolves();

                await vscode.commands.executeCommand('blockchainExplorer.editConnectionEntry', treeItem);
                updateFabricConnectionRegistryStub.should.have.been.calledWith({connectionProfilePath: '/some/path', walletPath: 'some/new/wallet/path', name: 'myConnection'});
                logSpy.should.have.been.calledTwice;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should open in user settings', async () => {
                const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
                const treeItem: ConnectionPropertyTreeItem = new ConnectionPropertyTreeItem(blockchainNetworkExplorerProvider, '+ Connection Profile', {name: 'myConnection'} as FabricConnectionRegistryEntry, 0);

                await vscode.commands.executeCommand('blockchainExplorer.editConnectionEntry', treeItem);
                updateFabricConnectionRegistryStub.should.not.have.been.called;
                logSpy.should.have.been.calledOnce;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);

            });
        });
    });
});
