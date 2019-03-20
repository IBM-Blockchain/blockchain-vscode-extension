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
    let showInputBoxStub: sinon.SinonStub;
    let logSpy: sinon.SinonSpy;
    let isCompletedStub: sinon.SinonStub;
    let copyConnectionProfileStub: sinon.SinonStub;

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
        isCompletedStub = mySandBox.stub(FabricGatewayHelper, 'connectionProfilePathComplete');
        copyConnectionProfileStub = mySandBox.stub(FabricGatewayHelper, 'copyConnectionProfile');

        showInputBoxStub = mySandBox.stub(vscode.window, 'showInputBox');
        logSpy = mySandBox.stub(VSCodeBlockchainOutputAdapter.instance(), 'log');
    });

    afterEach(() => {
        mySandBox.restore();
    });

    describe('editGateway', () => {

        describe('called from command', () => {

            it('should cancel if no gateway chosen to edit', async () => {
                showGatewayQuickPickStub.resolves();

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY);
                isCompletedStub.should.not.have.been.called;
            });

            it('should open user settings if completed gateway', async () => {
                isCompletedStub.returns(true);
                openUserSettingsStub.resolves();
                showGatewayQuickPickStub.resolves({label: 'myGateway', data: {
                    connectionProfilePath: '/some/path',
                    name: 'myGateway'
                }});

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY);
                isCompletedStub.should.have.been.calledWith({
                    connectionProfilePath: '/some/path',
                    name: 'myGateway'
                });
                openUserSettingsStub.should.have.been.calledWith('myGateway');
                logSpy.should.have.been.calledOnce;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should update connection profile', async () => {
                isCompletedStub.returns(false);
                showGatewayQuickPickStub.resolves({label: 'myGateway', data: {name: 'myGateway', connectionProfilePath: ''}});
                browseEditStub.onCall(0).resolves('/some/path');
                copyConnectionProfileStub.resolves(path.join('blockchain', 'extension', 'directory', 'myGateway', 'connection.json'));

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY);
                updateFabricGatewayRegistryStub.should.have.been.calledOnceWithExactly({name: 'myGateway', connectionProfilePath: path.join('blockchain', 'extension', 'directory', 'myGateway', 'connection.json')});
                logSpy.should.have.been.calledTwice;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
                logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully updated gateway');
            });

            it('should handle the user cancelling providing a connection profile', async () => {
                isCompletedStub.returns(false);
                showGatewayQuickPickStub.resolves({label: 'myGateway', data: {connectionProfilePath: '', name: 'myGateway'}});

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY);
                updateFabricGatewayRegistryStub.should.not.have.been.called;
                logSpy.should.have.been.calledOnce;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should handle any errors', async () => {
                browseEditStub.onCall(0).resolves('/some/path');
                copyConnectionProfileStub.rejects({message: `some other reason`});
                isCompletedStub.returns(false);
                showGatewayQuickPickStub.resolves({label: 'myGateway', data: {connectionProfilePath: '/some/path', name: 'myGateway'}});

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY);
                updateFabricGatewayRegistryStub.should.not.have.been.called;
                logSpy.should.have.been.calledTwice;
                logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Failed to edit gateway: some other reason`);
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

            it('should update a connection profile for an uncompleted gateway when clicked on', async () => {
                isCompletedStub.returns(false);
                const blockchainNetworkExplorerProvider: BlockchainGatewayExplorerProvider = myExtension.getBlockchainGatewayExplorerProvider();
                const treeItem: GatewayPropertyTreeItem = new GatewayPropertyTreeItem(blockchainNetworkExplorerProvider, '+ Connection Profile', {name: 'myGateway'} as FabricGatewayRegistryEntry, 0);
                browseEditStub.resolves('/some/path');
                copyConnectionProfileStub.resolves(path.join('blockchain', 'extension', 'directory', 'myGatway', 'connection.json'));

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY, treeItem);
                updateFabricGatewayRegistryStub.should.have.been.calledWith({connectionProfilePath: path.join('blockchain', 'extension', 'directory', 'myGatway', 'connection.json'), name: 'myGateway'});
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
