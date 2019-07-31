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
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import { BlockchainGatewayExplorerProvider } from '../../src/explorer/gatewayExplorer';
import { FabricGatewayRegistryEntry } from '../../src/fabric/FabricGatewayRegistryEntry';
import * as myExtension from '../../src/extension';
import { VSCodeBlockchainOutputAdapter } from '../../src/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../../src/logging/OutputAdapter';
import { GatewayDissociatedTreeItem } from '../../src/explorer/model/GatewayDissociatedTreeItem';
import { GatewayAssociatedTreeItem } from '../../src/explorer/model/GatewayAssociatedTreeItem';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricGatewayRegistry } from '../../src/fabric/FabricGatewayRegistry';
import { FabricRuntimeUtil } from '../../src/fabric/FabricRuntimeUtil';

chai.should();
chai.use(sinonChai);

// tslint:disable no-unused-expression

describe('EditGatewayCommand', () => {
    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();
    let openUserSettingsStub: sinon.SinonStub;
    let showGatewayQuickPickStub: sinon.SinonStub;
    let logSpy: sinon.SinonSpy;
    let gatewayRegistryStub: sinon.SinonStub;

    before(async () => {
        await TestUtil.setupTests(mySandBox);
        await TestUtil.storeGatewaysConfig();
    });

    after(async () => {
        await TestUtil.restoreGatewaysConfig();
    });

    beforeEach(async () => {
        openUserSettingsStub = mySandBox.stub(UserInputUtil, 'openUserSettings');
        showGatewayQuickPickStub = mySandBox.stub(UserInputUtil, 'showGatewayQuickPickBox');
        logSpy = mySandBox.stub(VSCodeBlockchainOutputAdapter.instance(), 'log');
        gatewayRegistryStub = mySandBox.stub(FabricGatewayRegistry.instance(), 'getAll');
        gatewayRegistryStub.returns([{name: 'someGateway'}, {name: 'someOtherGateway'}]);
    });

    afterEach(() => {
        mySandBox.restore();
    });

    describe('editGateway', () => {

        describe('called from command', () => {

            it('should cancel if no gateway chosen to edit', async () => {
                showGatewayQuickPickStub.resolves();

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY);
                openUserSettingsStub.should.not.have.been.called;
                logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `editGateway`);
            });

            it('should display an error message if no user-added gateways exist', async () => {
                gatewayRegistryStub.returns([]);

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY);
                showGatewayQuickPickStub.should.not.have.been.called;
                logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `editGateway`);
                logSpy.getCall(1).should.have.been.calledWithExactly(LogType.ERROR, `No gateways to be edited found. ${FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME} cannot be edited.`, `No gateways to be edited found. ${FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME} cannot be edited.`);
            });

            it('should open user settings to edit a gateway', async () => {
                openUserSettingsStub.resolves();
                showGatewayQuickPickStub.resolves({label: 'myGateway', data: {
                    connectionProfilePath: '/some/path',
                    name: 'myGateway'
                }});

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY);
                openUserSettingsStub.should.have.been.calledWith('myGateway');
                logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `editGateway`);
            });
        });

        describe('called from tree by clicking or right-clicking and editing', () => {

            it('should open the user settings to edit an associated gateway', async () => {
                const blockchainNetworkExplorerProvider: BlockchainGatewayExplorerProvider = myExtension.getBlockchainGatewayExplorerProvider();
                const treeItem: GatewayAssociatedTreeItem = new GatewayAssociatedTreeItem(blockchainNetworkExplorerProvider, 'My Gateway', {name: 'myGateway', connectionProfilePath: 'path', associatedWallet: 'wallet', managedRuntime: false} as FabricGatewayRegistryEntry, 0);

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY, treeItem);
                openUserSettingsStub.should.have.been.calledWith('myGateway');
                logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `editGateway`);
            });

            it('should open the user settings to edit an dissociated gateway', async () => {
                const blockchainNetworkExplorerProvider: BlockchainGatewayExplorerProvider = myExtension.getBlockchainGatewayExplorerProvider();
                const treeItem: GatewayDissociatedTreeItem = new GatewayDissociatedTreeItem(blockchainNetworkExplorerProvider, 'My Gateway', {name: 'myGateway', connectionProfilePath: 'path', associatedWallet: '', managedRuntime: false} as FabricGatewayRegistryEntry, 0);

                await vscode.commands.executeCommand(ExtensionCommands.EDIT_GATEWAY, treeItem);
                openUserSettingsStub.should.have.been.calledWith('myGateway');
                logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `editGateway`);
            });
        });
    });
});
