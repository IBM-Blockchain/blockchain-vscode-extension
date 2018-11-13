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
import { FabricConnectionHelper } from '../../src/fabric/FabricConnectionHelper';
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import { FabricConnectionRegistry } from '../../src/fabric/FabricConnectionRegistry';
import { ConnectionPropertyTreeItem } from '../../src/explorer/model/ConnectionPropertyTreeItem';
import { BlockchainNetworkExplorerProvider } from '../../src/explorer/BlockchainNetworkExplorer';
import { FabricConnectionRegistryEntry } from '../../src/fabric/FabricConnectionRegistryEntry';
import * as myExtension from '../../src/extension';
import { ConnectionTreeItem } from '../../src/explorer/model/ConnectionTreeItem';
import { ParsedCertificate } from '../../src/fabric/ParsedCertificate';

chai.should();
chai.use(sinonChai);

// tslint:disable no-unused-expression

describe('EditConnectionCommand', () => {
    let mySandBox: sinon.SinonSandbox;

    before(async () => {
        await TestUtil.setupTests();
        await TestUtil.storeConnectionsConfig();
    });

    after(async () => {
        await TestUtil.restoreConnectionsConfig();
    });

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
    });

    afterEach(() => {
        mySandBox.restore();
    });

    describe('editConnection', () => {

        describe('called from command', () => {

            it('should cancel if no connection chosen to edit', async () => {
                const isCompletedSpy: sinon.SinonSpy = mySandBox.spy(FabricConnectionHelper, 'isCompleted');
                mySandBox.stub(UserInputUtil, 'showConnectionQuickPickBox').resolves();
                await vscode.commands.executeCommand('blockchainExplorer.editConnectionEntry');

                isCompletedSpy.should.not.have.been.called;
            });

            it('should open user settings if completed connection', async () => {
                const isCompletedStub: sinon.SinonStub = mySandBox.stub(FabricConnectionHelper, 'isCompleted').returns(true);
                const openUserSettingsStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'openUserSettings').resolves();
                mySandBox.stub(UserInputUtil, 'showConnectionQuickPickBox').resolves({label: 'myConnection', data: {connectionProfilePath: '/some/path'}});

                await vscode.commands.executeCommand('blockchainExplorer.editConnectionEntry');

                isCompletedStub.should.have.been.calledWith({connectionProfilePath: '/some/path'});
                openUserSettingsStub.should.have.been.calledWith('myConnection');
            });

            it('should cancel if user doesnt select a property to edit', async () => {
                const isCompletedStub: sinon.SinonStub = mySandBox.stub(FabricConnectionHelper, 'isCompleted').returns(false);
                const quickPickStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showQuickPick').resolves();
                mySandBox.stub(UserInputUtil, 'showConnectionQuickPickBox').resolves({label: 'myConnection', data: {connectionProfilePath: '', identities: [{certificatePath: '', privateKeyPath: ''}]}});
                const browseEditStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'browseEdit');
                await vscode.commands.executeCommand('blockchainExplorer.editConnectionEntry');
                const placeHolder: string = 'Select a connection property to edit:';
                quickPickStub.should.have.been.calledWith(['Connection Profile', 'Certificate', 'Private Key'], {placeHolder});

                browseEditStub.should.not.have.been.called;
            });

            it('should update connection profile', async () => {
                mySandBox.stub(ParsedCertificate, 'validPEM').returns(null);
                const isCompletedStub: sinon.SinonStub = mySandBox.stub(FabricConnectionHelper, 'isCompleted').returns(false);
                const quickPickStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showQuickPick').resolves('Connection Profile');
                mySandBox.stub(UserInputUtil, 'showConnectionQuickPickBox').resolves({label: 'myConnection', data: {connectionProfilePath: '', identities: [{certificatePath: '/some/path', privateKeyPath: '/some/path'}]}});
                const browseEditStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'browseEdit').resolves('/some/path');
                mySandBox.stub(FabricConnectionRegistry.instance(), 'get').returns({connectionProfilePath: '', identities: [{certificatePath: '/some/path', privateKeyPath: '/some/path'}]});
                const updateFabricConnectionRegistryStub: sinon.SinonStub = mySandBox.stub(FabricConnectionRegistry.instance(), 'update').resolves();
                const showInformationMessageStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showInformationMessage').resolves();

                await vscode.commands.executeCommand('blockchainExplorer.editConnectionEntry');
                const placeHolder: string = 'Select a connection property to edit:';
                quickPickStub.should.have.been.calledWith(['Connection Profile'], {placeHolder});
                updateFabricConnectionRegistryStub.should.have.been.calledWith({connectionProfilePath: '/some/path', identities: [{certificatePath: '/some/path', privateKeyPath: '/some/path'}]});
                showInformationMessageStub.should.have.been.calledWith('Successfully updated connection');
            });

            it('should update certificate', async () => {
                mySandBox.stub(ParsedCertificate, 'validPEM').returns(null);
                const isCompletedStub: sinon.SinonStub = mySandBox.stub(FabricConnectionHelper, 'isCompleted').returns(false);
                const quickPickStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showQuickPick').resolves('Certificate');
                mySandBox.stub(UserInputUtil, 'showConnectionQuickPickBox').resolves({label: 'myConnection', data: {connectionProfilePath: '/some/path', identities: [{certificatePath: '', privateKeyPath: '/some/path'}]}});
                const browseEditStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'browseEdit').resolves('/some/path');
                mySandBox.stub(FabricConnectionRegistry.instance(), 'get').returns({connectionProfilePath: '/some/path', identities: [{certificatePath: '', privateKeyPath: '/some/path'}]});
                const updateFabricConnectionRegistryStub: sinon.SinonStub = mySandBox.stub(FabricConnectionRegistry.instance(), 'update').resolves();
                const showInformationMessageStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showInformationMessage').resolves();

                await vscode.commands.executeCommand('blockchainExplorer.editConnectionEntry');
                const placeHolder: string = 'Select a connection property to edit:';
                quickPickStub.should.have.been.calledWith(['Certificate'], {placeHolder});
                updateFabricConnectionRegistryStub.should.have.been.calledWith({connectionProfilePath: '/some/path', identities: [{certificatePath: '/some/path', privateKeyPath: '/some/path'}]});
                showInformationMessageStub.should.have.been.calledWith('Successfully updated connection');
            });

            it('should update private key', async () => {
                mySandBox.stub(ParsedCertificate, 'validPEM').returns(null);
                const isCompletedStub: sinon.SinonStub = mySandBox.stub(FabricConnectionHelper, 'isCompleted').returns(false);
                const quickPickStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showQuickPick').resolves('Private Key');
                mySandBox.stub(UserInputUtil, 'showConnectionQuickPickBox').resolves({label: 'myConnection', data: {connectionProfilePath: '/some/path', identities: [{certificatePath: '/some/path', privateKeyPath: ''}]}});
                const browseEditStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'browseEdit').resolves('/some/path');
                mySandBox.stub(FabricConnectionRegistry.instance(), 'get').returns({connectionProfilePath: '/some/path', identities: [{certificatePath: '/some/path', privateKeyPath: ''}]});
                const updateFabricConnectionRegistryStub: sinon.SinonStub = mySandBox.stub(FabricConnectionRegistry.instance(), 'update').resolves();
                const showInformationMessageStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showInformationMessage').resolves();

                await vscode.commands.executeCommand('blockchainExplorer.editConnectionEntry');
                const placeHolder: string = 'Select a connection property to edit:';
                quickPickStub.should.have.been.calledWith(['Private Key'], {placeHolder});
                updateFabricConnectionRegistryStub.should.have.been.calledWith({connectionProfilePath: '/some/path', identities: [{certificatePath: '/some/path', privateKeyPath: '/some/path'}]});
                showInformationMessageStub.should.have.been.calledWith('Successfully updated connection');
            });

            it('should cancel if user doesnt browse or edit when editing a property', async () => {
                const isCompletedStub: sinon.SinonStub = mySandBox.stub(FabricConnectionHelper, 'isCompleted').returns(false);
                const quickPickStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showQuickPick').resolves('Connection Profile');
                mySandBox.stub(UserInputUtil, 'showConnectionQuickPickBox').resolves({label: 'myConnection', data: {connectionProfilePath: '', identities: [{certificatePath: '/some/path', privateKeyPath: '/some/path'}]}});
                const browseEditStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'browseEdit').resolves();
                const getFabricConnectionRegistrySpy: sinon.SinonSpy = mySandBox.spy(FabricConnectionRegistry.instance(), 'get');
                await vscode.commands.executeCommand('blockchainExplorer.editConnectionEntry');
                const placeHolder: string = 'Select a connection property to edit:';
                quickPickStub.should.have.been.calledWith(['Connection Profile'], {placeHolder});

                browseEditStub.should.have.been.called;
                getFabricConnectionRegistrySpy.should.not.have.been.called;
            });

            it('should throw an error if certificate is invalid', async () => {
                mySandBox.stub(ParsedCertificate, 'validPEM').onFirstCall().throws({message: 'Could not validate certificate: invalid PEM'});
                const isCompletedStub: sinon.SinonStub = mySandBox.stub(FabricConnectionHelper, 'isCompleted').returns(false);
                const quickPickStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showQuickPick').resolves('Certificate');
                mySandBox.stub(UserInputUtil, 'showConnectionQuickPickBox').resolves({label: 'myConnection', data: {connectionProfilePath: '/some/path', identities: [{certificatePath: '', privateKeyPath: '/some/path'}]}});
                const browseEditStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'browseEdit').resolves('/some/path');
                mySandBox.stub(FabricConnectionRegistry.instance(), 'get').returns({connectionProfilePath: '/some/path', identities: [{certificatePath: '', privateKeyPath: '/some/path'}]});
                const showErrorMessageSpy: sinon.SinonSpy = mySandBox.stub(vscode.window, 'showErrorMessage');

                await vscode.commands.executeCommand('blockchainExplorer.editConnectionEntry');
                showErrorMessageSpy.should.have.been.calledWith('Failed to edit connection: Could not validate certificate: invalid PEM');
            });

            it('should throw an error if private key is invalid', async () => {
                mySandBox.stub(ParsedCertificate, 'validPEM').onFirstCall().throws({message: 'Could not validate private key: invalid PEM'});
                const isCompletedStub: sinon.SinonStub = mySandBox.stub(FabricConnectionHelper, 'isCompleted').returns(false);
                const quickPickStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showQuickPick').resolves('Private Key');
                mySandBox.stub(UserInputUtil, 'showConnectionQuickPickBox').resolves({label: 'myConnection', data: {connectionProfilePath: '/some/path', identities: [{certificatePath: '/some/path', privateKeyPath: ''}]}});
                const browseEditStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'browseEdit').resolves('/some/path');
                mySandBox.stub(FabricConnectionRegistry.instance(), 'get').returns({connectionProfilePath: '/some/path', identities: [{certificatePath: '/some/path', privateKeyPath: ''}]});
                const showErrorMessageSpy: sinon.SinonSpy = mySandBox.stub(vscode.window, 'showErrorMessage');

                await vscode.commands.executeCommand('blockchainExplorer.editConnectionEntry');
                showErrorMessageSpy.should.have.been.calledWith('Failed to edit connection: Could not validate private key: invalid PEM');
            });
        });

        describe('called from tree by clicking or right-clicking and editing', () => {
            it('should open user settings if editing an uncompleted connection (by right-clicking and editing)', async () => {
                const openUserSettingsStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'openUserSettings');
                const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
                const treeItem: ConnectionTreeItem = new ConnectionTreeItem(blockchainNetworkExplorerProvider, 'My Connection', {name: 'myConnection'} as FabricConnectionRegistryEntry, 2);

                await vscode.commands.executeCommand('blockchainExplorer.editConnectionEntry', treeItem);

                openUserSettingsStub.should.have.been.calledWith('myConnection');
            });

            it('should stop if a property for an uncompleted connection has been assigned data already', async () => {
                const openUserSettingsStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'openUserSettings');
                const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
                const treeItem: ConnectionPropertyTreeItem = new ConnectionPropertyTreeItem(blockchainNetworkExplorerProvider, '✓ Connection Profile', {name: 'myConnection'} as FabricConnectionRegistryEntry, 0);

                await vscode.commands.executeCommand('blockchainExplorer.editConnectionEntry', treeItem);

                openUserSettingsStub.should.not.have.been.calledWith('myConnection');
            });

            it('should update a connection profile for an uncompleted connection when clicked on', async () => {
                const openUserSettingsStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'openUserSettings');
                const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
                const treeItem: ConnectionPropertyTreeItem = new ConnectionPropertyTreeItem(blockchainNetworkExplorerProvider, '+ Connection Profile', {name: 'myConnection'} as FabricConnectionRegistryEntry, 0);
                const browseEditStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'browseEdit').resolves('/some/path');
                mySandBox.stub(FabricConnectionRegistry.instance(), 'get').returns({connectionProfilePath: '', identities: [{certificatePath: '/some/path', privateKeyPath: '/some/path'}]});
                const updateFabricConnectionRegistryStub: sinon.SinonStub = mySandBox.stub(FabricConnectionRegistry.instance(), 'update').resolves();
                const showInformationMessageStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showInformationMessage').resolves();

                await vscode.commands.executeCommand('blockchainExplorer.editConnectionEntry', treeItem);

                updateFabricConnectionRegistryStub.should.have.been.calledWith({connectionProfilePath: '/some/path', identities: [{certificatePath: '/some/path', privateKeyPath: '/some/path'}]});
                showInformationMessageStub.should.have.been.calledWith('Successfully updated connection');
            });

            it('should update a certificate for an uncompleted connection when clicked on', async () => {
                mySandBox.stub(ParsedCertificate, 'validPEM').returns(null);
                const openUserSettingsStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'openUserSettings');
                const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
                const treeItem: ConnectionPropertyTreeItem = new ConnectionPropertyTreeItem(blockchainNetworkExplorerProvider, '+ Certificate', {name: 'myConnection'} as FabricConnectionRegistryEntry, 0);
                const browseEditStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'browseEdit').resolves('/some/path');
                mySandBox.stub(FabricConnectionRegistry.instance(), 'get').returns({connectionProfilePath: '/some/path', identities: [{certificatePath: '', privateKeyPath: '/some/path'}]});
                const updateFabricConnectionRegistryStub: sinon.SinonStub = mySandBox.stub(FabricConnectionRegistry.instance(), 'update').resolves();
                const showInformationMessageStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showInformationMessage').resolves();

                await vscode.commands.executeCommand('blockchainExplorer.editConnectionEntry', treeItem);

                updateFabricConnectionRegistryStub.should.have.been.calledWith({connectionProfilePath: '/some/path', identities: [{certificatePath: '/some/path', privateKeyPath: '/some/path'}]});
                showInformationMessageStub.should.have.been.calledWith('Successfully updated connection');
            });

            it('should update a private key for an uncompleted connection when clicked on', async () => {
                mySandBox.stub(ParsedCertificate, 'validPEM').returns(null);
                const openUserSettingsStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'openUserSettings');
                const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
                const treeItem: ConnectionPropertyTreeItem = new ConnectionPropertyTreeItem(blockchainNetworkExplorerProvider, '+ Private Key', {name: 'myConnection'} as FabricConnectionRegistryEntry, 0);
                const browseEditStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'browseEdit').resolves('/some/path');
                mySandBox.stub(FabricConnectionRegistry.instance(), 'get').returns({connectionProfilePath: '/some/path', identities: [{certificatePath: '/some/path', privateKeyPath: ''}]});
                const updateFabricConnectionRegistryStub: sinon.SinonStub = mySandBox.stub(FabricConnectionRegistry.instance(), 'update').resolves();
                const showInformationMessageStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showInformationMessage').resolves();

                await vscode.commands.executeCommand('blockchainExplorer.editConnectionEntry', treeItem);

                updateFabricConnectionRegistryStub.should.have.been.calledWith({connectionProfilePath: '/some/path', identities: [{certificatePath: '/some/path', privateKeyPath: '/some/path'}]});
                showInformationMessageStub.should.have.been.calledWith('Successfully updated connection');
            });

            it('should open in user settings', async () => {
                const openUserSettingsStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'openUserSettings');
                const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
                const treeItem: ConnectionPropertyTreeItem = new ConnectionPropertyTreeItem(blockchainNetworkExplorerProvider, '+ Connection Profile', {name: 'myConnection'} as FabricConnectionRegistryEntry, 0);
                const browseEditStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'browseEdit').resolves();
                const getConnectionSpy: sinon.SinonSpy = mySandBox.spy(FabricConnectionRegistry.instance(), 'get');

                await vscode.commands.executeCommand('blockchainExplorer.editConnectionEntry', treeItem);

                getConnectionSpy.should.have.not.been.called;
            });
        });
    });
});
