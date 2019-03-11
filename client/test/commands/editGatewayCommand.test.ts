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
import * as fs from 'fs-extra';
import * as path from 'path';
import { TestUtil } from '../TestUtil';
import { FabricGatewayHelper } from '../../src/fabric/FabricGatewayHelper';
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import { FabricGatewayRegistry } from '../../src/fabric/FabricGatewayRegistry';
import { BlockchainGatewayExplorerProvider } from '../../src/explorer/gatewayExplorer';
import { FabricGatewayRegistryEntry } from '../../src/fabric/FabricGatewayRegistryEntry';
import * as myExtension from '../../src/extension';
import { ParsedCertificate } from '../../src/fabric/ParsedCertificate';
import { VSCodeBlockchainOutputAdapter } from '../../src/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../../src/logging/OutputAdapter';
import { FabricWallet } from '../../src/fabric/FabricWallet';
import { FabricWalletGenerator } from '../../src/fabric/FabricWalletGenerator';
import { ExtensionUtil } from '../../src/util/ExtensionUtil';
import { GatewayTreeItem } from '../../src/explorer/model/GatewayTreeItem';
import { GatewayPropertyTreeItem } from '../../src/explorer/model/GatewayPropertyTreeItem';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricWalletRegistry } from '../../src/fabric/FabricWalletRegistry';

chai.should();
chai.use(sinonChai);

// tslint:disable no-unused-expression

describe('EditGatewayCommand', () => {
    let mySandBox: sinon.SinonSandbox;
    let openUserSettingsStub: sinon.SinonStub;
    let quickPickStub: sinon.SinonStub;
    let showGatewayQuickPickStub: sinon.SinonStub;
    let browseEditStub: sinon.SinonStub;
    let showIdentityOptionsStub: sinon.SinonStub;
    let updateFabricGatewayRegistryStub: sinon.SinonStub;
    let updateFabricWalletRegistryStub: sinon.SinonStub;
    let showInputBoxStub: sinon.SinonStub;
    let walletGenerator: FabricWalletGenerator;
    let logSpy: sinon.SinonSpy;

    before(async () => {
        await TestUtil.setupTests();
        await TestUtil.storeGatewaysConfig();
        await TestUtil.storeWalletsConfig();
    });

    after(async () => {
        await TestUtil.restoreGatewaysConfig();
        await TestUtil.restoreWalletsConfig();
    });

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
        openUserSettingsStub = mySandBox.stub(UserInputUtil, 'openUserSettings');
        quickPickStub = mySandBox.stub(vscode.window, 'showQuickPick');
        showGatewayQuickPickStub = mySandBox.stub(UserInputUtil, 'showGatewayQuickPickBox');
        browseEditStub = mySandBox.stub(UserInputUtil, 'browseEdit').resolves();
        showIdentityOptionsStub = mySandBox.stub(UserInputUtil, 'showAddIdentityOptionsQuickPick');
        updateFabricGatewayRegistryStub = mySandBox.stub(FabricGatewayRegistry.instance(), 'update').resolves();
        updateFabricWalletRegistryStub = mySandBox.stub(FabricWalletRegistry.instance(), 'update').resolves();
        showInputBoxStub = mySandBox.stub(vscode.window, 'showInputBox');
        walletGenerator = await FabricWalletGenerator.instance();
        logSpy = mySandBox.stub(VSCodeBlockchainOutputAdapter.instance(), 'log');
    });

    afterEach(() => {
        mySandBox.restore();
    });

    describe('editConnection', () => {

        describe('called from command', () => {

            it('should cancel if no gateway chosen to edit', async () => {
                const isCompletedSpy: sinon.SinonSpy = mySandBox.spy(FabricGatewayHelper, 'isCompleted');
                showGatewayQuickPickStub.resolves();

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY);
                isCompletedSpy.should.not.have.been.called;
            });

            it('should open user settings if completed gateway', async () => {
                const isCompletedStub: sinon.SinonStub = mySandBox.stub(FabricGatewayHelper, 'isCompleted').returns(true);
                mySandBox.stub(FabricGatewayHelper, 'walletPathComplete').returns(true);
                mySandBox.stub(FabricGatewayHelper, 'connectionProfilePathComplete').returns(true);
                openUserSettingsStub.resolves();
                showGatewayQuickPickStub.resolves({label: 'myGateway', data: {
                    connectionProfilePath: '/some/path',
                    walletPath: 'some/path',
                    name: 'myGateway'
                }});

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY);
                isCompletedStub.should.have.been.calledWith({
                    connectionProfilePath: '/some/path',
                    walletPath: 'some/path',
                    name: 'myGateway'
                });
                openUserSettingsStub.should.have.been.calledWith('myGateway');
                logSpy.should.have.been.calledOnce;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should cancel if user doesnt select a property to edit', async () => {
                mySandBox.stub(FabricGatewayHelper, 'isCompleted').returns(false);
                quickPickStub.resolves();
                showGatewayQuickPickStub.resolves({label: 'myGateway', data: {connectionProfilePath: '', walletPath: ''}});

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY);
                const placeHolder: string = 'Select a gateway property to edit:';
                quickPickStub.should.have.been.calledWith(['Connection Profile', 'Wallet', 'Identity'], {placeHolder});
                browseEditStub.should.not.have.been.called;
                updateFabricGatewayRegistryStub.should.not.have.been.called;
                updateFabricWalletRegistryStub.should.not.have.been.called;
                logSpy.should.have.been.calledOnce;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should update connection profile when the walletPath is complete', async () => {
                mySandBox.stub(ParsedCertificate, 'validPEM').returns(null);
                mySandBox.stub(FabricGatewayHelper, 'walletPathComplete').returns(true);
                mySandBox.stub(FabricGatewayHelper, 'connectionProfilePathComplete').returns(false);
                showGatewayQuickPickStub.resolves({label: 'myGateway', data: {connectionProfilePath: '', walletPath: '/some/walletPath'}});
                browseEditStub.onCall(0).resolves('/some/path');
                mySandBox.stub(FabricGatewayHelper, 'copyConnectionProfile').resolves(path.join('blockchain', 'extension', 'directory', 'myGateway', 'connection.json'));

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY);
                updateFabricGatewayRegistryStub.should.have.been.calledOnceWithExactly({connectionProfilePath: path.join('blockchain', 'extension', 'directory', 'myGateway', 'connection.json'), walletPath: '/some/walletPath'});
                updateFabricWalletRegistryStub.should.not.have.been.called;
                logSpy.should.have.been.calledTwice;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should update connection profile and then the wallet path', async () => {
                const showOutputAdapterStub: sinon.SinonStub = mySandBox.stub(VSCodeBlockchainOutputAdapter.instance(), 'show');

                mySandBox.stub(ParsedCertificate, 'validPEM').returns(null);
                mySandBox.stub(FabricGatewayHelper, 'walletPathComplete').returns(false);
                mySandBox.stub(FabricGatewayHelper, 'connectionProfilePathComplete').returns(false);
                showGatewayQuickPickStub.resolves({label: 'myGateway', data: {connectionProfilePath: '', walletPath: '', name: 'myGateway'}});
                quickPickStub.resolves('Connection Profile');
                browseEditStub.onCall(0).resolves('/some/path');
                mySandBox.stub(FabricGatewayHelper, 'copyConnectionProfile').resolves(path.join('blockchain', 'extension', 'directory', 'myGateway', 'connection.json'));
                showIdentityOptionsStub.resolves(UserInputUtil.WALLET);
                browseEditStub.onCall(1).resolves('/some/walletPath');

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY);
                const placeHolder: string = 'Select a gateway property to edit:';
                quickPickStub.should.have.been.calledWith(['Connection Profile', 'Wallet', 'Identity'], {placeHolder});
                updateFabricGatewayRegistryStub.should.have.been.calledTwice;
                updateFabricGatewayRegistryStub.getCall(1).should.have.been.calledWith({connectionProfilePath: path.join('blockchain', 'extension', 'directory', 'myGateway', 'connection.json'), walletPath: '/some/walletPath', name: 'myGateway'});
                updateFabricWalletRegistryStub.should.have.been.calledOnceWithExactly({name: 'myGateway', walletPath: '/some/walletPath'});
                logSpy.should.have.been.calledThrice;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);

                showOutputAdapterStub.should.not.have.been.called;
            });

            it('should update connection profile and then the identity', async () => {
                mySandBox.stub(ParsedCertificate, 'validPEM').returns(null);
                mySandBox.stub(FabricGatewayHelper, 'walletPathComplete').returns(false);
                mySandBox.stub(FabricGatewayHelper, 'connectionProfilePathComplete').returns(false);
                showGatewayQuickPickStub.resolves({label: 'myGateway', data: {connectionProfilePath: '', walletPath: '', name: 'myGateway'}});
                quickPickStub.resolves('Connection Profile');
                browseEditStub.onCall(0).resolves('/some/path');
                mySandBox.stub(FabricGatewayHelper, 'copyConnectionProfile').resolves(path.join('blockchain', 'extension', 'directory', 'myGateway', 'connection.json'));
                showIdentityOptionsStub.resolves(UserInputUtil.CERT_KEY);
                showInputBoxStub.resolves('purpleConga');
                browseEditStub.onCall(1).resolves('/some/certificatePath');
                browseEditStub.onCall(2).resolves('/some/keyPath');

                mySandBox.stub(ExtensionUtil, 'readConnectionProfile').resolves('something');
                mySandBox.stub(fs, 'readFile').resolves('somethingElse');

                const testFabricWallet: FabricWallet = new FabricWallet('some/new/wallet/path');
                mySandBox.stub(walletGenerator, 'createLocalWallet').resolves(testFabricWallet);
                mySandBox.stub(testFabricWallet, 'importIdentity').resolves();

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY);
                updateFabricGatewayRegistryStub.should.have.been.calledTwice;
                updateFabricGatewayRegistryStub.getCall(1).should.have.been.calledWith({connectionProfilePath: path.join('blockchain', 'extension', 'directory', 'myGateway', 'connection.json'), walletPath: 'some/new/wallet/path', name: 'myGateway'});
                updateFabricWalletRegistryStub.should.have.been.calledOnceWithExactly({name: 'myGateway', walletPath: 'some/new/wallet/path'});
                logSpy.should.have.been.calledThrice;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should update connection profile and then handle the user not providing certificate path', async () => {
                mySandBox.stub(ParsedCertificate, 'validPEM').returns(null);
                mySandBox.stub(FabricGatewayHelper, 'walletPathComplete').returns(false);
                mySandBox.stub(FabricGatewayHelper, 'connectionProfilePathComplete').returns(false);
                showGatewayQuickPickStub.resolves({label: 'myGateway', data: {connectionProfilePath: '', walletPath: ''}});
                quickPickStub.resolves('Connection Profile');
                browseEditStub.onCall(0).resolves('/some/path');
                mySandBox.stub(FabricGatewayHelper, 'copyConnectionProfile').resolves(path.join('blockchain', 'extension', 'directory', 'myGateway', 'connection.json'));
                showIdentityOptionsStub.resolves(UserInputUtil.CERT_KEY);
                showInputBoxStub.resolves('greenConga');
                browseEditStub.onCall(1).resolves('some/certificatePath');
                browseEditStub.onCall(2).resolves();

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY);
                updateFabricGatewayRegistryStub.should.have.been.calledOnce;
                updateFabricGatewayRegistryStub.getCall(0).should.have.been.calledWith({connectionProfilePath: path.join('blockchain', 'extension', 'directory', 'myGateway', 'connection.json'), walletPath: ''});
                updateFabricWalletRegistryStub.should.not.have.been.called;
                browseEditStub.should.have.been.calledThrice;
                logSpy.should.have.been.calledTwice;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should update connection profile and then handle the user not providing method for importing identity', async () => {
                mySandBox.stub(ParsedCertificate, 'validPEM').returns(null);
                mySandBox.stub(FabricGatewayHelper, 'walletPathComplete').returns(false);
                mySandBox.stub(FabricGatewayHelper, 'connectionProfilePathComplete').returns(false);
                showGatewayQuickPickStub.resolves({label: 'myGateway', data: {connectionProfilePath: '', walletPath: ''}});
                quickPickStub.resolves('Connection Profile');
                browseEditStub.onCall(0).resolves('/some/path');
                mySandBox.stub(FabricGatewayHelper, 'copyConnectionProfile').resolves(path.join('blockchain', 'extension', 'directory', 'myGateway', 'connection.json'));
                showIdentityOptionsStub.resolves();

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY);
                updateFabricGatewayRegistryStub.should.have.been.calledOnce;
                updateFabricGatewayRegistryStub.getCall(0).should.have.been.calledWith({connectionProfilePath: path.join('blockchain', 'extension', 'directory', 'myGateway', 'connection.json'), walletPath: ''});
                updateFabricWalletRegistryStub.should.not.have.been.called;
                browseEditStub.should.have.been.calledOnce;
                logSpy.should.have.been.calledTwice;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });
            it('should update connection profile and then handle the user not providing wallet path', async () => {
                mySandBox.stub(ParsedCertificate, 'validPEM').returns(null);
                mySandBox.stub(FabricGatewayHelper, 'walletPathComplete').returns(false);
                mySandBox.stub(FabricGatewayHelper, 'connectionProfilePathComplete').returns(false);
                showGatewayQuickPickStub.resolves({label: 'myGateway', data: {connectionProfilePath: '', walletPath: ''}});
                quickPickStub.resolves('Connection Profile');
                browseEditStub.onCall(0).resolves('/some/path');
                mySandBox.stub(FabricGatewayHelper, 'copyConnectionProfile').resolves(path.join('blockchain', 'extension', 'directory', 'myGateway', 'connection.json'));
                showIdentityOptionsStub.resolves(UserInputUtil.WALLET);
                browseEditStub.onCall(1).resolves();

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY);
                updateFabricGatewayRegistryStub.should.have.been.calledOnce;
                updateFabricGatewayRegistryStub.getCall(0).should.have.been.calledWith({connectionProfilePath: path.join('blockchain', 'extension', 'directory', 'myGateway', 'connection.json'), walletPath: ''});
                updateFabricWalletRegistryStub.should.not.have.been.called;
                browseEditStub.should.have.been.calledTwice;
                logSpy.should.have.been.calledTwice;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should update the identity with cert/keyPath by creating a wallet', async () => {
                mySandBox.stub(ParsedCertificate, 'validPEM').returns(null);
                mySandBox.stub(FabricGatewayHelper, 'walletPathComplete').returns(false);
                mySandBox.stub(FabricGatewayHelper, 'connectionProfilePathComplete').returns(true);
                showGatewayQuickPickStub.resolves({label: 'myGateway', data: {connectionProfilePath: '/some/path', walletPath: '', name: 'myGateway'}});
                quickPickStub.resolves('Identity');
                showInputBoxStub.resolves('purpleConga');
                browseEditStub.onCall(0).resolves('/some/certificatePath');
                browseEditStub.onCall(1).resolves('/some/keyPath');

                mySandBox.stub(ExtensionUtil, 'readConnectionProfile').resolves('something');
                mySandBox.stub(fs, 'readFile').resolves('somethingElse');

                const testFabricWallet: FabricWallet = new FabricWallet('some/new/wallet/path');
                mySandBox.stub(walletGenerator, 'createLocalWallet').resolves(testFabricWallet);
                mySandBox.stub(testFabricWallet, 'importIdentity').resolves();

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY);
                updateFabricGatewayRegistryStub.should.have.been.calledOnceWithExactly({connectionProfilePath: '/some/path', walletPath: 'some/new/wallet/path', name: 'myGateway'});
                updateFabricWalletRegistryStub.should.have.been.calledOnceWithExactly({name: 'myGateway', walletPath: 'some/new/wallet/path'});
                logSpy.should.have.been.calledTwice;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should handle the user cancelling providing identity name', async () => {
                mySandBox.stub(ParsedCertificate, 'validPEM').returns(null);
                mySandBox.stub(FabricGatewayHelper, 'walletPathComplete').returns(false);
                mySandBox.stub(FabricGatewayHelper, 'connectionProfilePathComplete').returns(true);
                showGatewayQuickPickStub.resolves({label: 'myGateway', data: {connectionProfilePath: '/some/path', walletPath: ''}});
                quickPickStub.resolves('Identity');
                showInputBoxStub.resolves();

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY);
                updateFabricGatewayRegistryStub.should.not.have.been.called;
                updateFabricWalletRegistryStub.should.not.have.been.called;
                browseEditStub.should.not.have.been.called;
                logSpy.should.have.been.calledOnce;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should handle the user cancelling providing the certificate', async () => {
                mySandBox.stub(ParsedCertificate, 'validPEM').returns(null);
                mySandBox.stub(FabricGatewayHelper, 'walletPathComplete').returns(false);
                mySandBox.stub(FabricGatewayHelper, 'connectionProfilePathComplete').returns(true);
                showGatewayQuickPickStub.resolves({label: 'myGateway', data: {connectionProfilePath: '/some/path', walletPath: ''}});
                quickPickStub.resolves('Identity');
                showInputBoxStub.resolves('greenConga');
                browseEditStub.onCall(0).resolves();

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY);
                updateFabricGatewayRegistryStub.should.not.have.been.called;
                updateFabricWalletRegistryStub.should.not.have.been.called;
                browseEditStub.should.have.been.calledOnce;
                logSpy.should.have.been.calledOnce;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should handle the user cancelling providing the certificate', async () => {
                mySandBox.stub(ParsedCertificate, 'validPEM').returns(null);
                mySandBox.stub(FabricGatewayHelper, 'walletPathComplete').returns(false);
                mySandBox.stub(FabricGatewayHelper, 'connectionProfilePathComplete').returns(true);
                showGatewayQuickPickStub.resolves({label: 'myGateway', data: {connectionProfilePath: '/some/path', walletPath: ''}});
                quickPickStub.resolves('Identity');
                showInputBoxStub.resolves('greenConga');
                browseEditStub.onCall(0).resolves('some/path');
                browseEditStub.onCall(1).resolves();

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY);
                updateFabricGatewayRegistryStub.should.not.have.been.called;
                updateFabricWalletRegistryStub.should.not.have.been.called;
                browseEditStub.should.have.been.calledTwice;
                logSpy.should.have.been.calledOnce;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should update the identity with cert/keyPath, connection profile and then create a wallet', async () => {
                mySandBox.stub(ParsedCertificate, 'validPEM').returns(null);
                mySandBox.stub(FabricGatewayHelper, 'walletPathComplete').returns(false);
                mySandBox.stub(FabricGatewayHelper, 'connectionProfilePathComplete').returns(false);
                showGatewayQuickPickStub.resolves({label: 'myGateway', data: {connectionProfilePath: '', walletPath: '', name: 'myGateway'}});
                quickPickStub.resolves('Identity');
                showInputBoxStub.resolves('purpleConga');
                browseEditStub.onCall(0).resolves('/some/certificatePath');
                browseEditStub.onCall(1).resolves('/some/keyPath');
                browseEditStub.onCall(2).resolves('/some/connectionProfilePath');
                mySandBox.stub(FabricGatewayHelper, 'copyConnectionProfile').resolves(path.join('blockchain', 'extension', 'directory', 'myGateway', 'connection.json'));

                mySandBox.stub(ExtensionUtil, 'readConnectionProfile').resolves('something');
                mySandBox.stub(fs, 'readFile').resolves('somethingElse');

                const testFabricWallet: FabricWallet = new FabricWallet('some/new/wallet/path');
                mySandBox.stub(walletGenerator, 'createLocalWallet').resolves(testFabricWallet);
                mySandBox.stub(testFabricWallet, 'importIdentity').resolves();

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY);
                updateFabricGatewayRegistryStub.should.have.been.calledTwice;
                updateFabricGatewayRegistryStub.getCall(1).should.have.been.calledWith({connectionProfilePath: path.join('blockchain', 'extension', 'directory', 'myGateway', 'connection.json'), walletPath: 'some/new/wallet/path', name: 'myGateway'});
                updateFabricWalletRegistryStub.should.have.been.calledOnceWithExactly({name: 'myGateway', walletPath: 'some/new/wallet/path'});
                logSpy.should.have.been.calledThrice;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should update the identity with cert/keyPath, and then show an error if connection profile is not given', async () => {
                mySandBox.stub(ParsedCertificate, 'validPEM').returns(null);
                mySandBox.stub(FabricGatewayHelper, 'walletPathComplete').returns(false);
                mySandBox.stub(FabricGatewayHelper, 'connectionProfilePathComplete').returns(false);
                showGatewayQuickPickStub.resolves({label: 'myGateway', data: {connectionProfilePath: '', walletPath: ''}});
                quickPickStub.resolves('Identity');
                showInputBoxStub.resolves('purpleConga');
                browseEditStub.onCall(0).resolves('/some/certificatePath');
                browseEditStub.onCall(1).resolves('/some/keyPath');

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY);
                updateFabricGatewayRegistryStub.should.not.have.been.called;
                updateFabricWalletRegistryStub.should.not.have.been.called;
                logSpy.should.have.been.calledTwice;
                logSpy.should.have.been.calledWith(LogType.ERROR, `Failed to edit gateway: Connection Profile required to import identity to file system wallet`, `Failed to edit gateway: Error: Connection Profile required to import identity to file system wallet`);
            });

            it('should update the gateway with a walletPath', async () => {
                mySandBox.stub(ParsedCertificate, 'validPEM').returns(null);
                mySandBox.stub(FabricGatewayHelper, 'walletPathComplete').returns(false);
                mySandBox.stub(FabricGatewayHelper, 'connectionProfilePathComplete').returns(true);
                showGatewayQuickPickStub.resolves({label: 'myGateway', data: {connectionProfilePath: '/some/path', walletPath: '', name: 'myGateway'}});
                quickPickStub.resolves('Wallet');
                browseEditStub.onCall(0).resolves('/some/walletPath');

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY);
                updateFabricGatewayRegistryStub.should.have.been.calledOnceWithExactly({connectionProfilePath: '/some/path', walletPath: '/some/walletPath', name: 'myGateway'});
                updateFabricWalletRegistryStub.should.have.been.calledOnceWithExactly({name: 'myGateway', walletPath: '/some/walletPath'});
                logSpy.should.have.been.calledTwice;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should update the gateway with a walletPath and then a connection profile', async () => {
                mySandBox.stub(ParsedCertificate, 'validPEM').returns(null);
                mySandBox.stub(FabricGatewayHelper, 'walletPathComplete').returns(false);
                mySandBox.stub(FabricGatewayHelper, 'connectionProfilePathComplete').returns(false);
                showGatewayQuickPickStub.resolves({label: 'myGateway', data: {connectionProfilePath: '', walletPath: '', name: 'myGateway'}});
                quickPickStub.resolves('Wallet');
                browseEditStub.onCall(0).resolves('/some/walletPath');
                browseEditStub.onCall(1).resolves('/some/otherPath');
                mySandBox.stub(FabricGatewayHelper, 'copyConnectionProfile').resolves(path.join('blockchain', 'extension', 'directory', 'myGateway', 'connection.json'));

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY);
                const placeHolder: string = 'Select a gateway property to edit:';
                quickPickStub.should.have.been.calledWith(['Connection Profile', 'Wallet', 'Identity'], {placeHolder});
                updateFabricGatewayRegistryStub.should.have.been.calledTwice;
                updateFabricGatewayRegistryStub.getCall(1).should.have.been.calledWith({connectionProfilePath: path.join('blockchain', 'extension', 'directory', 'myGateway', 'connection.json'), walletPath: '/some/walletPath', name: 'myGateway'});
                updateFabricWalletRegistryStub.should.have.been.calledOnceWithExactly({name: 'myGateway', walletPath: '/some/walletPath'});
                logSpy.should.have.been.calledThrice;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should update the gateway with a walletPath and handle the user cancelling providing a connection profile', async () => {
                mySandBox.stub(ParsedCertificate, 'validPEM').returns(null);
                mySandBox.stub(FabricGatewayHelper, 'walletPathComplete').returns(false);
                mySandBox.stub(FabricGatewayHelper, 'connectionProfilePathComplete').returns(false);
                showGatewayQuickPickStub.resolves({label: 'myGateway', data: {connectionProfilePath: '', walletPath: '', name: 'myGateway'}});
                quickPickStub.resolves('Wallet');
                browseEditStub.onCall(0).resolves('/some/walletPath');

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY);
                const placeHolder: string = 'Select a gateway property to edit:';
                quickPickStub.should.have.been.calledWith(['Connection Profile', 'Wallet', 'Identity'], {placeHolder});
                updateFabricGatewayRegistryStub.should.have.been.calledOnceWithExactly({connectionProfilePath: '', walletPath: '/some/walletPath', name: 'myGateway'});
                updateFabricWalletRegistryStub.should.have.been.calledOnceWithExactly({name: 'myGateway', walletPath: '/some/walletPath'});
                logSpy.should.have.been.calledTwice;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should handle the user cancelling providing a wallet path', async () => {
                mySandBox.stub(ParsedCertificate, 'validPEM').returns(null);
                mySandBox.stub(FabricGatewayHelper, 'walletPathComplete').returns(false);
                mySandBox.stub(FabricGatewayHelper, 'connectionProfilePathComplete').returns(true);
                showGatewayQuickPickStub.resolves({label: 'myGateway', data: {connectionProfilePath: '/some/path', walletPath: ''}});
                quickPickStub.resolves('Wallet');
                browseEditStub.onCall(0).resolves();

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY);
                updateFabricGatewayRegistryStub.should.not.have.been.called;
                updateFabricWalletRegistryStub.should.not.have.been.called;
                browseEditStub.should.have.been.calledOnce;
                logSpy.should.have.been.calledOnce;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should cancel if user doesnt browse or edit when editing a property', async () => {
                mySandBox.stub(FabricGatewayHelper, 'isCompleted').returns(false);
                quickPickStub.resolves('Connection Profile');
                showGatewayQuickPickStub.resolves({label: 'myGateway', data: {connectionProfilePath: '', walletPath: ''}});

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY);
                const placeHolder: string = 'Select a gateway property to edit:';
                quickPickStub.should.have.been.calledWith(['Connection Profile', 'Wallet', 'Identity'], {placeHolder});
                browseEditStub.should.have.been.called;
                logSpy.should.have.been.calledOnce;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should throw an error if certificate is invalid', async () => {
                const error: Error = new Error('Could not validate certificate: invalid PEM');
                mySandBox.stub(ParsedCertificate, 'validPEM').onFirstCall().throws(error);
                mySandBox.stub(FabricGatewayHelper, 'walletPathComplete').returns(false);
                mySandBox.stub(FabricGatewayHelper, 'connectionProfilePathComplete').returns(true);
                showGatewayQuickPickStub.resolves({label: 'myGateway', data: {connectionProfilePath: '/some/path', walletPath: ''}});
                quickPickStub.resolves('Identity');
                showInputBoxStub.resolves('purpleConga');
                browseEditStub.onCall(0).resolves('/some/certificatePath');
                browseEditStub.onCall(1).resolves('/some/KeyPath');

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY);
                updateFabricGatewayRegistryStub.should.not.have.been.called;
                updateFabricWalletRegistryStub.should.not.have.been.called;
                logSpy.should.have.been.calledTwice;
                logSpy.should.have.been.calledWith(LogType.ERROR, `Failed to edit gateway: ${error.message}`, `Failed to edit gateway: ${error.toString()}`);
            });

            it('should throw an error if private key is invalid', async () => {
                const error: Error = new Error('Could not validate private Key: invalid PEM');
                mySandBox.stub(ParsedCertificate, 'validPEM').onFirstCall().throws(error);
                mySandBox.stub(FabricGatewayHelper, 'walletPathComplete').returns(false);
                mySandBox.stub(FabricGatewayHelper, 'connectionProfilePathComplete').returns(true);
                showGatewayQuickPickStub.resolves({label: 'myGateway', data: {connectionProfilePath: '/some/path', walletPath: ''}});
                quickPickStub.resolves('Identity');
                showInputBoxStub.resolves('purpleConga');
                browseEditStub.onCall(0).resolves('/some/certificatePath');

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY);
                updateFabricGatewayRegistryStub.should.not.have.been.called;
                updateFabricWalletRegistryStub.should.not.have.been.called;
                logSpy.should.have.been.calledTwice;
                logSpy.should.have.been.calledWith(LogType.ERROR, `Failed to edit gateway: ${error.message}`, `Failed to edit gateway: ${error.toString()}`);
            });

            it('should handle the user cancelling providing the mspid', async () => {
                mySandBox.stub(ParsedCertificate, 'validPEM').returns(null);
                mySandBox.stub(FabricGatewayHelper, 'walletPathComplete').returns(false);
                mySandBox.stub(FabricGatewayHelper, 'connectionProfilePathComplete').returns(true);
                showGatewayQuickPickStub.resolves({label: 'myGateway', data: {connectionProfilePath: '/some/path', walletPath: ''}});
                quickPickStub.resolves('Identity');
                showInputBoxStub.onCall(0).resolves('purpleConga');
                browseEditStub.onCall(0).resolves('/some/certificatePath');
                browseEditStub.onCall(1).resolves('/some/keyPath');
                mySandBox.stub(ExtensionUtil, 'readConnectionProfile').resolves('something');
                mySandBox.stub(fs, 'readFile').resolves('somethingElse');

                const testFabricWallet: FabricWallet = new FabricWallet('some/new/wallet/path');
                mySandBox.stub(walletGenerator, 'createLocalWallet').resolves(testFabricWallet);
                const importIdentityStub: sinon.SinonStub = mySandBox.stub(testFabricWallet, 'importIdentity').onCall(0).rejects( {message: `Client.createUser parameter 'opts mspid' is required`} );
                showInputBoxStub.onCall(1).resolves();

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY);
                updateFabricGatewayRegistryStub.should.not.have.been.called;
                updateFabricWalletRegistryStub.should.not.have.been.called;
                importIdentityStub.should.not.have.been.called;
                logSpy.should.have.been.calledOnce;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should handle the wallet import failing for some other reason', async () => {
                const error: Error = new Error(`some other reason`);
                mySandBox.stub(ParsedCertificate, 'validPEM').returns(null);
                mySandBox.stub(FabricGatewayHelper, 'walletPathComplete').returns(false);
                mySandBox.stub(FabricGatewayHelper, 'connectionProfilePathComplete').returns(true);
                showGatewayQuickPickStub.resolves({label: 'myGateway', data: {connectionProfilePath: '/some/path', walletPath: ''}});
                quickPickStub.resolves('Identity');
                showInputBoxStub.onCall(0).resolves('purpleConga');
                showInputBoxStub.onCall(1).resolves('myMSPID');
                browseEditStub.onCall(0).resolves('/some/certificatePath');
                browseEditStub.onCall(1).resolves('/some/keyPath');
                mySandBox.stub(ExtensionUtil, 'readConnectionProfile').resolves('something');
                mySandBox.stub(fs, 'readFile').resolves('somethingElse');

                const testFabricWallet: FabricWallet = new FabricWallet('some/new/wallet/path');
                mySandBox.stub(walletGenerator, 'createLocalWallet').resolves(testFabricWallet);
                const importIdentityStub: sinon.SinonStub = mySandBox.stub(testFabricWallet, 'importIdentity').rejects(error);

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY);
                updateFabricGatewayRegistryStub.should.not.have.been.called;
                updateFabricWalletRegistryStub.should.not.have.been.called;
                logSpy.should.have.been.calledTwice;
                logSpy.should.have.been.calledWith(LogType.ERROR, `Failed to edit gateway: ${error.message}`, `Failed to edit gateway: ${error.toString()}`);
                importIdentityStub.should.have.been.calledOnce;
                showInputBoxStub.should.have.been.calledTwice;
            });
        });

        describe('called from tree by clicking or right-clicking and editing', () => {
            it('should open user settings if editing an uncompleted gateway (by right-clicking and editing)', async () => {
                const blockchainNetworkExplorerProvider: BlockchainGatewayExplorerProvider = myExtension.getBlockchainGatewayExplorerProvider();
                const treeItem: GatewayTreeItem = new GatewayTreeItem(blockchainNetworkExplorerProvider, 'My Gateway', {name: 'myGateway'} as FabricGatewayRegistryEntry, 2);

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY, treeItem);
                openUserSettingsStub.should.have.been.calledWith('myGateway');
                logSpy.should.have.been.calledOnce;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should stop if a property for an uncompleted gateway has been assigned data already', async () => {
                const blockchainNetworkExplorerProvider: BlockchainGatewayExplorerProvider = myExtension.getBlockchainGatewayExplorerProvider();
                const treeItem: GatewayPropertyTreeItem = new GatewayPropertyTreeItem(blockchainNetworkExplorerProvider, '✓ Connection Profile', {name: 'myGateway'} as FabricGatewayRegistryEntry, 0);

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY, treeItem);
                openUserSettingsStub.should.not.have.been.called;
                logSpy.should.have.been.calledOnce;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should update a connection profile for an uncompleted gateway when clicked on', async () => {
                mySandBox.stub(FabricGatewayHelper, 'walletPathComplete').returns(true);
                const blockchainNetworkExplorerProvider: BlockchainGatewayExplorerProvider = myExtension.getBlockchainGatewayExplorerProvider();
                const treeItem: GatewayPropertyTreeItem = new GatewayPropertyTreeItem(blockchainNetworkExplorerProvider, '+ Connection Profile', {name: 'myGateway', walletPath: 'some/otherPath'} as FabricGatewayRegistryEntry, 0);
                browseEditStub.resolves('/some/path');
                mySandBox.stub(FabricGatewayHelper, 'copyConnectionProfile').resolves(path.join('blockchain', 'extension', 'directory', 'myGatway', 'connection.json'));

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY, treeItem);
                updateFabricGatewayRegistryStub.should.have.been.calledWith({connectionProfilePath: path.join('blockchain', 'extension', 'directory', 'myGatway', 'connection.json'), walletPath: 'some/otherPath', name: 'myGateway'});
                updateFabricWalletRegistryStub.should.not.have.been.called;
                logSpy.should.have.been.calledTwice;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should update a wallet path for an uncompleted gateway when clicked on', async () => {
                mySandBox.stub(ParsedCertificate, 'validPEM').returns(null);
                mySandBox.stub(FabricGatewayHelper, 'connectionProfilePathComplete').returns(true);
                const blockchainNetworkExplorerProvider: BlockchainGatewayExplorerProvider = myExtension.getBlockchainGatewayExplorerProvider();
                const treeItem: GatewayPropertyTreeItem = new GatewayPropertyTreeItem(blockchainNetworkExplorerProvider, '+ Wallet', {name: 'myGateway', connectionProfilePath: '/some/path'} as FabricGatewayRegistryEntry, 0);
                browseEditStub.resolves('/some/walletPath');

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY, treeItem);
                updateFabricGatewayRegistryStub.should.have.been.calledWith({connectionProfilePath: '/some/path', walletPath: '/some/walletPath', name: 'myGateway'});
                updateFabricWalletRegistryStub.should.have.been.calledOnceWithExactly({name: 'myGateway', walletPath: '/some/walletPath'});
                logSpy.should.have.been.calledTwice;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should update an identity for an uncompleted gateway when clicked on', async () => {
                mySandBox.stub(ParsedCertificate, 'validPEM').returns(null);
                mySandBox.stub(FabricGatewayHelper, 'connectionProfilePathComplete').returns(true);
                const blockchainNetworkExplorerProvider: BlockchainGatewayExplorerProvider = myExtension.getBlockchainGatewayExplorerProvider();
                const treeItem: GatewayPropertyTreeItem = new GatewayPropertyTreeItem(blockchainNetworkExplorerProvider, '+ Identity', {name: 'myGateway', connectionProfilePath: '/some/path'} as FabricGatewayRegistryEntry, 0);
                showInputBoxStub.resolves('blackConga');
                browseEditStub.onCall(0).resolves('/some/certificatePath');
                browseEditStub.onCall(1).resolves('/some/keyPath');

                mySandBox.stub(ExtensionUtil, 'readConnectionProfile').resolves('something');
                mySandBox.stub(fs, 'readFile').resolves('somethingElse');

                const testFabricWallet: FabricWallet = new FabricWallet('some/new/wallet/path');
                mySandBox.stub(walletGenerator, 'createLocalWallet').resolves(testFabricWallet);
                mySandBox.stub(testFabricWallet, 'importIdentity').resolves();

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY, treeItem);
                updateFabricGatewayRegistryStub.should.have.been.calledWith({connectionProfilePath: '/some/path', walletPath: 'some/new/wallet/path', name: 'myGateway'});
                updateFabricWalletRegistryStub.should.have.been.calledOnceWithExactly({name: 'myGateway', walletPath: 'some/new/wallet/path'});
                logSpy.should.have.been.calledTwice;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should open in user settings', async () => {
                const blockchainNetworkExplorerProvider: BlockchainGatewayExplorerProvider = myExtension.getBlockchainGatewayExplorerProvider();
                const treeItem: GatewayPropertyTreeItem = new GatewayPropertyTreeItem(blockchainNetworkExplorerProvider, '+ Connection Profile', {name: 'myGateway'} as FabricGatewayRegistryEntry, 0);

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY, treeItem);
                updateFabricGatewayRegistryStub.should.not.have.been.called;
                logSpy.should.have.been.calledOnce;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);

            });
        });
    });
});
