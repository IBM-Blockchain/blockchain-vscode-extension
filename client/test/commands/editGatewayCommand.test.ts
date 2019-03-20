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
import { TestUtil } from '../TestUtil';
import { FabricGatewayHelper } from '../../src/fabric/FabricGatewayHelper';
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import { FabricGatewayRegistry } from '../../src/fabric/FabricGatewayRegistry';
import { BlockchainGatewayExplorerProvider } from '../../src/explorer/gatewayExplorer';
import { FabricGatewayRegistryEntry } from '../../src/fabric/FabricGatewayRegistryEntry';
import * as myExtension from '../../src/extension';
import { VSCodeBlockchainOutputAdapter } from '../../src/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../../src/logging/OutputAdapter';
import { GatewayTreeItem } from '../../src/explorer/model/GatewayTreeItem';
import { GatewayPropertyTreeItem } from '../../src/explorer/model/GatewayPropertyTreeItem';
import { ExtensionCommands } from '../../ExtensionCommands';

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
    let logSpy: sinon.SinonSpy;

    before(async () => {
        await TestUtil.setupTests();
        await TestUtil.storeGatewaysConfig();
    });

    after(async () => {
        await TestUtil.restoreGatewaysConfig();
    });

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
        openUserSettingsStub = mySandBox.stub(UserInputUtil, 'openUserSettings');
        quickPickStub = mySandBox.stub(vscode.window, 'showQuickPick');
        showGatewayQuickPickStub = mySandBox.stub(UserInputUtil, 'showGatewayQuickPickBox');
        browseEditStub = mySandBox.stub(UserInputUtil, 'browseEdit').resolves();
        showIdentityOptionsStub = mySandBox.stub(UserInputUtil, 'showAddIdentityOptionsQuickPick');
        updateFabricGatewayRegistryStub = mySandBox.stub(FabricGatewayRegistry.instance(), 'update').resolves();
        mySandBox.stub(vscode.window, 'showInputBox');
        logSpy = mySandBox.stub(VSCodeBlockchainOutputAdapter.instance(), 'log');
    });

    afterEach(() => {
        mySandBox.restore();
    });

    describe('editConnection', () => {

        describe('called from command', () => {

            it('should cancel if no gateway is chosen to edited', async () => {
                const isCompletedSpy: sinon.SinonSpy = mySandBox.spy(FabricGatewayHelper, 'isCompleted');
                showGatewayQuickPickStub.resolves();

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY);
                isCompletedSpy.should.not.have.been.called;
            });

            it('should open user settings if completed gateway', async () => {
                const isCompletedStub: sinon.SinonStub = mySandBox.stub(FabricGatewayHelper, 'isCompleted').returns(true);
                openUserSettingsStub.resolves();
                showGatewayQuickPickStub.resolves({label: 'myGateway', data: {
                    connectionProfilePath: '/some/path',
                    walletPath: 'some/path'
                }});

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY);
                isCompletedStub.should.have.been.calledWith({
                    connectionProfilePath: '/some/path',
                    walletPath: 'some/path'
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
                logSpy.should.have.been.calledOnce;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should update connection profile when the walletPath is complete', async () => {
                mySandBox.stub(FabricGatewayHelper, 'walletPathComplete').returns(true);
                mySandBox.stub(FabricGatewayHelper, 'connectionProfilePathComplete').returns(false);
                showGatewayQuickPickStub.resolves({label: 'myGateway', data: {name: 'gateway', connectionProfilePath: '', walletPath: '/some/walletPath'}});
                browseEditStub.onCall(0).resolves('/some/path');
                mySandBox.stub(FabricGatewayHelper, 'copyConnectionProfile').resolves(path.join('blockchain', 'extension', 'directory', 'myGateway', 'connection.json'));

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY);
                updateFabricGatewayRegistryStub.should.have.been.calledOnce;
                updateFabricGatewayRegistryStub.getCall(0).should.have.been.calledWith({name: 'gateway', connectionProfilePath: path.join('blockchain', 'extension', 'directory', 'myGateway', 'connection.json'), walletPath: '/some/walletPath'});
                logSpy.should.have.been.calledTwice;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
                logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully updated gateway');
            });

            it('should update connection profile and then the wallet path', async () => {
                const showOutputAdapterStub: sinon.SinonStub = mySandBox.stub(VSCodeBlockchainOutputAdapter.instance(), 'show');

                mySandBox.stub(FabricGatewayHelper, 'walletPathComplete').returns(false);
                mySandBox.stub(FabricGatewayHelper, 'connectionProfilePathComplete').returns(false);
                showGatewayQuickPickStub.resolves({label: 'myGateway', data: {name: 'gateway', connectionProfilePath: '', walletPath: ''}});
                quickPickStub.resolves('Connection Profile');
                browseEditStub.onCall(0).resolves('/some/path');
                mySandBox.stub(FabricGatewayHelper, 'copyConnectionProfile').resolves(path.join('blockchain', 'extension', 'directory', 'myGateway', 'connection.json'));
                showIdentityOptionsStub.resolves(UserInputUtil.WALLET);
                browseEditStub.onCall(1).resolves('/some/walletPath');

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY);
                const placeHolder: string = 'Select a gateway property to edit:';
                quickPickStub.should.have.been.calledWith(['Connection Profile', 'Wallet', 'Identity'], {placeHolder});
                updateFabricGatewayRegistryStub.should.have.been.calledTwice;
                updateFabricGatewayRegistryStub.getCall(1).should.have.been.calledWith({name: 'gateway', connectionProfilePath: path.join('blockchain', 'extension', 'directory', 'myGateway', 'connection.json'), walletPath: '/some/walletPath'});
                logSpy.should.have.been.calledThrice;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);

                showOutputAdapterStub.should.not.have.been.called;
            });

            it('should update connection profile and then the identity', async () => {
                mySandBox.stub(FabricGatewayHelper, 'walletPathComplete').returns(false);
                mySandBox.stub(FabricGatewayHelper, 'connectionProfilePathComplete').returns(false);
                showGatewayQuickPickStub.resolves({label: 'myGateway', data: {connectionProfilePath: '', walletPath: ''}});
                quickPickStub.resolves('Connection Profile');
                browseEditStub.onCall(0).resolves('/some/path');
                mySandBox.stub(FabricGatewayHelper, 'copyConnectionProfile').resolves(path.join('blockchain', 'extension', 'directory', 'myGateway', 'connection.json'));
                showIdentityOptionsStub.resolves(UserInputUtil.CERT_KEY);

                const executeCommandStub: sinon.SinonStub = mySandBox.stub(vscode.commands, 'executeCommand');
                executeCommandStub.callThrough();
                executeCommandStub.withArgs(ExtensionCommands.ADD_GATEWAY_IDENTITY, sinon.match.any).resolves({
                    name: 'myGateway',
                    connectionProfilePath: path.join('blockchain', 'extension', 'directory', 'myGateway', 'connection.json'),
                    walletPath: 'some/new/wallet/path'
                });

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY);
                updateFabricGatewayRegistryStub.should.have.been.calledTwice;
                updateFabricGatewayRegistryStub.getCall(1).should.have.been.calledWith({name: 'myGateway', connectionProfilePath: path.join('blockchain', 'extension', 'directory', 'myGateway', 'connection.json'), walletPath: 'some/new/wallet/path'});
                logSpy.should.have.been.calledThrice;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should update connection profile and then handle the user not providing method for importing identity', async () => {
                mySandBox.stub(FabricGatewayHelper, 'walletPathComplete').returns(false);
                mySandBox.stub(FabricGatewayHelper, 'connectionProfilePathComplete').returns(false);
                showGatewayQuickPickStub.resolves({label: 'myGateway', data: {name: 'gateway', connectionProfilePath: '', walletPath: ''}});
                quickPickStub.resolves('Connection Profile');
                browseEditStub.onCall(0).resolves('/some/path');
                mySandBox.stub(FabricGatewayHelper, 'copyConnectionProfile').resolves(path.join('blockchain', 'extension', 'directory', 'myGateway', 'connection.json'));
                showIdentityOptionsStub.resolves();

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY);
                updateFabricGatewayRegistryStub.should.have.been.calledOnce;
                updateFabricGatewayRegistryStub.getCall(0).should.have.been.calledWith({name: 'gateway', connectionProfilePath: path.join('blockchain', 'extension', 'directory', 'myGateway', 'connection.json'), walletPath: ''});
                browseEditStub.should.have.been.calledOnce;
                logSpy.should.have.been.calledTwice;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });
            it('should update connection profile and then handle the user not providing wallet path', async () => {
                mySandBox.stub(FabricGatewayHelper, 'walletPathComplete').returns(false);
                mySandBox.stub(FabricGatewayHelper, 'connectionProfilePathComplete').returns(false);
                showGatewayQuickPickStub.resolves({label: 'myConnection', data: {name: 'gateway', connectionProfilePath: '', walletPath: ''}});
                quickPickStub.resolves('Connection Profile');
                browseEditStub.onCall(0).resolves('/some/path');
                mySandBox.stub(FabricGatewayHelper, 'copyConnectionProfile').resolves(path.join('blockchain', 'extension', 'directory', 'myGateway', 'connection.json'));
                showIdentityOptionsStub.resolves(UserInputUtil.WALLET);
                browseEditStub.onCall(1).resolves();

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY);
                updateFabricGatewayRegistryStub.should.have.been.calledOnce;
                updateFabricGatewayRegistryStub.getCall(0).should.have.been.calledWith({name: 'gateway', connectionProfilePath: path.join('blockchain', 'extension', 'directory', 'myGateway', 'connection.json'), walletPath: ''});
                browseEditStub.should.have.been.calledTwice;
                logSpy.should.have.been.calledTwice;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should update the gateway with a walletPath', async () => {
                mySandBox.stub(FabricGatewayHelper, 'walletPathComplete').returns(false);
                mySandBox.stub(FabricGatewayHelper, 'connectionProfilePathComplete').returns(true);
                showGatewayQuickPickStub.resolves({label: 'myGatewau', data: {name: 'gateway', connectionProfilePath: '/some/path', walletPath: ''}});
                quickPickStub.resolves('Wallet');
                browseEditStub.onCall(0).resolves('/some/walletPath');

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY);
                updateFabricGatewayRegistryStub.should.have.been.calledOnce;
                updateFabricGatewayRegistryStub.getCall(0).should.have.been.calledWith({name: 'gateway', connectionProfilePath: '/some/path', walletPath: '/some/walletPath'});
                logSpy.should.have.been.calledTwice;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should update the gateway with a walletPath and then a connection profile', async () => {
                mySandBox.stub(FabricGatewayHelper, 'walletPathComplete').returns(false);
                mySandBox.stub(FabricGatewayHelper, 'connectionProfilePathComplete').returns(false);
                showGatewayQuickPickStub.resolves({label: 'myGateway', data: {name: 'gateway', connectionProfilePath: '', walletPath: ''}});
                quickPickStub.resolves('Wallet');
                browseEditStub.onCall(0).resolves('/some/walletPath');
                browseEditStub.onCall(1).resolves('/some/otherPath');
                mySandBox.stub(FabricGatewayHelper, 'copyConnectionProfile').resolves(path.join('blockchain', 'extension', 'directory', 'myGateway', 'connection.json'));

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY);
                const placeHolder: string = 'Select a gateway property to edit:';
                quickPickStub.should.have.been.calledWith(['Connection Profile', 'Wallet', 'Identity'], {placeHolder});
                updateFabricGatewayRegistryStub.should.have.been.calledTwice;
                updateFabricGatewayRegistryStub.getCall(1).should.have.been.calledWith({name: 'gateway', connectionProfilePath: path.join('blockchain', 'extension', 'directory', 'myGateway', 'connection.json'), walletPath: '/some/walletPath'});
                logSpy.should.have.been.calledThrice;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should update the connection with a walletPath and handle the user cancelling providing a connection profile', async () => {
                mySandBox.stub(FabricGatewayHelper, 'walletPathComplete').returns(false);
                mySandBox.stub(FabricGatewayHelper, 'connectionProfilePathComplete').returns(false);
                showGatewayQuickPickStub.resolves({label: 'myConnection', data: {name: 'gateway', connectionProfilePath: '', walletPath: ''}});
                quickPickStub.resolves('Wallet');
                browseEditStub.onCall(0).resolves('/some/walletPath');

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY);
                const placeHolder: string = 'Select a gateway property to edit:';
                quickPickStub.should.have.been.calledWith(['Connection Profile', 'Wallet', 'Identity'], {placeHolder});
                updateFabricGatewayRegistryStub.should.have.been.calledOnce;
                updateFabricGatewayRegistryStub.getCall(0).should.have.been.calledWith({name: 'gateway', connectionProfilePath: '', walletPath: '/some/walletPath'});
                logSpy.should.have.been.calledTwice;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should handle the user cancelling providing a wallet path', async () => {
                mySandBox.stub(FabricGatewayHelper, 'walletPathComplete').returns(false);
                mySandBox.stub(FabricGatewayHelper, 'connectionProfilePathComplete').returns(true);
                showGatewayQuickPickStub.resolves({label: 'myGateway', data: {connectionProfilePath: '/some/path', walletPath: ''}});
                quickPickStub.resolves('Wallet');
                browseEditStub.onCall(0).resolves();

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY);
                updateFabricGatewayRegistryStub.should.not.have.been.called;
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

            it('should handle any errors', async () => {
                const error: Error = new Error(`some other reason`);
                mySandBox.stub(FabricGatewayHelper, 'walletPathComplete').returns(false);
                mySandBox.stub(FabricGatewayHelper, 'connectionProfilePathComplete').returns(true);
                showGatewayQuickPickStub.resolves({label: 'myGateway', data: {connectionProfilePath: '/some/path', walletPath: ''}});
                quickPickStub.resolves('Identity');

                const executeCommandStub: sinon.SinonStub = mySandBox.stub(vscode.commands, 'executeCommand');
                executeCommandStub.callThrough();
                executeCommandStub.withArgs(ExtensionCommands.ADD_GATEWAY_IDENTITY, sinon.match.any).rejects(error);

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY);
                updateFabricGatewayRegistryStub.should.not.have.been.called;
                logSpy.should.have.been.calledTwice;
                logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Failed to edit gateway: ${error.message}`, `Failed to edit gateway: ${error.toString()}`);
            });
        });

        describe('called from tree by clicking or right-clicking and editing', () => {
            it('should open user settings if editing an uncompleted connection (by right-clicking and editing)', async () => {
                const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = myExtension.getBlockchainGatewayExplorerProvider();
                const treeItem: GatewayTreeItem = new GatewayTreeItem(blockchainGatewayExplorerProvider, 'My Connection', {name: 'myConnection'} as FabricGatewayRegistryEntry, 2);

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY, treeItem);
                openUserSettingsStub.should.have.been.calledWith('myConnection');
                logSpy.should.have.been.calledOnce;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should stop if a property for an uncompleted connection has been assigned data already', async () => {
                const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = myExtension.getBlockchainGatewayExplorerProvider();
                const treeItem: GatewayPropertyTreeItem = new GatewayPropertyTreeItem(blockchainGatewayExplorerProvider, '✓ Connection Profile', {name: 'myConnection'} as FabricGatewayRegistryEntry, 0);

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY, treeItem);
                openUserSettingsStub.should.not.have.been.called;
                logSpy.should.have.been.calledOnce;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should update a connection profile for an uncompleted connection when clicked on', async () => {
                mySandBox.stub(FabricGatewayHelper, 'walletPathComplete').returns(true);
                const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = myExtension.getBlockchainGatewayExplorerProvider();
                const treeItem: GatewayPropertyTreeItem = new GatewayPropertyTreeItem(blockchainGatewayExplorerProvider, '+ Connection Profile', {name: 'myConnection', walletPath: 'some/otherPath'} as FabricGatewayRegistryEntry, 0);
                browseEditStub.resolves('/some/path');
                mySandBox.stub(FabricGatewayHelper, 'copyConnectionProfile').resolves(path.join('blockchain', 'extension', 'directory', 'myConnection', 'connection.json'));

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY, treeItem);
                updateFabricGatewayRegistryStub.should.have.been.calledWith({connectionProfilePath: path.join('blockchain', 'extension', 'directory', 'myConnection', 'connection.json'), walletPath: 'some/otherPath', name: 'myConnection'});
                logSpy.should.have.been.calledTwice;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should update a wallet path for an uncompleted connection when clicked on', async () => {

                mySandBox.stub(FabricGatewayHelper, 'connectionProfilePathComplete').returns(true);
                const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = myExtension.getBlockchainGatewayExplorerProvider();
                const treeItem: GatewayPropertyTreeItem = new GatewayPropertyTreeItem(blockchainGatewayExplorerProvider, '+ Wallet', {name: 'myConnection', connectionProfilePath: '/some/path'} as FabricGatewayRegistryEntry, 0);
                browseEditStub.resolves('/some/walletPath');

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY, treeItem);
                updateFabricGatewayRegistryStub.should.have.been.calledWith({connectionProfilePath: '/some/path', walletPath: '/some/walletPath', name: 'myConnection'});
                logSpy.should.have.been.calledTwice;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should ask for a connection profile for an uncompleted connection when clicking on identity', async () => {
                mySandBox.stub(FabricGatewayHelper, 'connectionProfilePathComplete').returns(false);
                const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = myExtension.getBlockchainGatewayExplorerProvider();
                const treeItem: GatewayPropertyTreeItem = new GatewayPropertyTreeItem(blockchainGatewayExplorerProvider, '+ Identity', {name: 'myGateway'} as FabricGatewayRegistryEntry, 0);
                const executeCommandStub: sinon.SinonStub = mySandBox.stub(vscode.commands, 'executeCommand');
                browseEditStub.onCall(0).resolves('/some/path');
                mySandBox.stub(FabricGatewayHelper, 'copyConnectionProfile').resolves(path.join('blockchain', 'extension', 'directory', 'myGateway', 'connection.json'));
                executeCommandStub.callThrough();
                executeCommandStub.withArgs(ExtensionCommands.ADD_GATEWAY_IDENTITY, sinon.match.any).resolves({
                    name: 'myGateway',
                    walletPath: '/some/wallet/path'
                });
                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY, treeItem);
                updateFabricGatewayRegistryStub.getCall(1).should.have.been.calledWith({name: 'myGateway', walletPath: '/some/wallet/path', connectionProfilePath: path.join('blockchain', 'extension', 'directory', 'myGateway', 'connection.json')});

                logSpy.should.have.been.calledThrice;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
                logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully updated gateway');
                logSpy.getCall(2).should.have.been.calledWith(LogType.SUCCESS, 'Successfully updated gateway');
            });

            it('should cancel adding a connection profile after identity for an uncompleted connection when clicking on identity', async () => {

                mySandBox.stub(FabricGatewayHelper, 'connectionProfilePathComplete').returns(false);
                const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = myExtension.getBlockchainGatewayExplorerProvider();
                const treeItem: GatewayPropertyTreeItem = new GatewayPropertyTreeItem(blockchainGatewayExplorerProvider, '+ Identity', {name: 'myGateway'} as FabricGatewayRegistryEntry, 0);
                const executeCommandStub: sinon.SinonStub = mySandBox.stub(vscode.commands, 'executeCommand');
                browseEditStub.onCall(0).resolves();
                const copyConnectionProfileSpy: sinon.SinonSpy = mySandBox.spy(FabricGatewayHelper, 'copyConnectionProfile');
                executeCommandStub.callThrough();
                executeCommandStub.withArgs(ExtensionCommands.ADD_GATEWAY_IDENTITY, sinon.match.any).resolves({
                    name: 'myGateway',
                    walletPath: '/some/wallet/path'
                });
                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY, treeItem);
                updateFabricGatewayRegistryStub.getCall(0).should.have.been.calledWith({walletPath: '/some/wallet/path', name: 'myGateway'});
                updateFabricGatewayRegistryStub.getCalls().length.should.equal(1);
                copyConnectionProfileSpy.should.not.have.been.called;
                logSpy.should.have.been.calledTwice;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
                logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully updated gateway');
            });

            it('should cancel after if no identity is given for an uncompleted connection when clicking on identity', async () => {

                mySandBox.stub(FabricGatewayHelper, 'connectionProfilePathComplete').returns(false);
                const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = myExtension.getBlockchainGatewayExplorerProvider();
                const treeItem: GatewayPropertyTreeItem = new GatewayPropertyTreeItem(blockchainGatewayExplorerProvider, '+ Identity', {name: 'myGateway'} as FabricGatewayRegistryEntry, 0);
                const executeCommandStub: sinon.SinonStub = mySandBox.stub(vscode.commands, 'executeCommand');
                executeCommandStub.callThrough();
                executeCommandStub.withArgs(ExtensionCommands.ADD_GATEWAY_IDENTITY, sinon.match.any).resolves();
                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY, treeItem);
                updateFabricGatewayRegistryStub.should.not.have.been.called;
                logSpy.should.have.been.calledOnce;
                logSpy.should.not.have.been.calledWith(LogType.SUCCESS, 'Successfully updated gateway');
            });

            it('should update an identity for an uncompleted connection when clicked on', async () => {

                mySandBox.stub(FabricGatewayHelper, 'connectionProfilePathComplete').returns(true);
                const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = myExtension.getBlockchainGatewayExplorerProvider();
                const treeItem: GatewayPropertyTreeItem = new GatewayPropertyTreeItem(blockchainGatewayExplorerProvider, '+ Identity', {name: 'myGateway', connectionProfilePath: '/some/path'} as FabricGatewayRegistryEntry, 0);
                const executeCommandStub: sinon.SinonStub = mySandBox.stub(vscode.commands, 'executeCommand');
                executeCommandStub.callThrough();
                executeCommandStub.withArgs(ExtensionCommands.ADD_GATEWAY_IDENTITY, sinon.match.any).resolves({
                    name: 'myGateway',
                    connectionProfilePath: '/some/path',
                    walletPath: '/some/new/wallet/path'
                });
                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY, treeItem);
                updateFabricGatewayRegistryStub.should.have.been.calledWith({connectionProfilePath: '/some/path', walletPath: '/some/new/wallet/path', name: 'myGateway'});
                logSpy.should.have.been.calledTwice;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
                logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully updated gateway');
            });

            it('should open in user settings', async () => {
                const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = myExtension.getBlockchainGatewayExplorerProvider();
                const treeItem: GatewayPropertyTreeItem = new GatewayPropertyTreeItem(blockchainGatewayExplorerProvider, '+ Connection Profile', {name: 'myConnection'} as FabricGatewayRegistryEntry, 0);

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY, treeItem);
                updateFabricGatewayRegistryStub.should.not.have.been.called;
                logSpy.should.have.been.calledOnce;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);

            });
        });
    });
});
