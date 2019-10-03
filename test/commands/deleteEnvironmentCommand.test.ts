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
import { BlockchainTreeItem } from '../../extension/explorer/model/BlockchainTreeItem';
import { TestUtil } from '../TestUtil';
import { UserInputUtil } from '../../extension/commands/UserInputUtil';
import { ExtensionCommands } from '../../ExtensionCommands';
import { SettingConfigurations } from '../../SettingConfigurations';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../../extension/logging/OutputAdapter';
import { FabricRuntimeUtil } from '../../extension/fabric/FabricRuntimeUtil';
import { BlockchainEnvironmentExplorerProvider } from '../../extension/explorer/environmentExplorer';
import { FabricEnvironmentRegistry } from '../../extension/registries/FabricEnvironmentRegistry';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';
import { FabricEnvironmentManager } from '../../extension/fabric/FabricEnvironmentManager';
import { FabricEnvironmentRegistryEntry } from '../../extension/registries/FabricEnvironmentRegistryEntry';

chai.should();
chai.use(sinonChai);
// tslint:disable no-unused-expression

describe('DeleteEnvironmentCommand', () => {
    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();
    let showConfirmationWarningMessage: sinon.SinonStub;
    before(async () => {
        await TestUtil.setupTests(mySandBox);
    });

    after(async () => {
        await TestUtil.restoreAll();
    });

    describe('deleteEnvironment', () => {

        let showFabricEnvironmentQuickPickBoxStub: sinon.SinonStub;
        let environments: Array<any>;
        let myEnvironmentA: any;
        let myEnvironmentB: any;
        let logSpy: sinon.SinonSpy;
        let commandSpy: sinon.SinonSpy;
        let geConnectedRegistryStub: sinon.SinonStub;

        beforeEach(async () => {
            mySandBox.restore();
            showConfirmationWarningMessage = mySandBox.stub(UserInputUtil, 'showConfirmationWarningMessage').withArgs(`This will remove the environment(s). Do you want to continue?`).resolves(true);
            logSpy = mySandBox.stub(VSCodeBlockchainOutputAdapter.instance(), 'log');

            // reset the available environments
            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_ENVIRONMENTS, [], vscode.ConfigurationTarget.Global);

            environments = [];

            myEnvironmentA = {
                name: 'myenvironmentA',
            };
            environments.push(myEnvironmentA);

            myEnvironmentB = {
                name: 'myEnvironmentB'
            };
            environments.push(myEnvironmentB);

            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_ENVIRONMENTS, environments, vscode.ConfigurationTarget.Global);

            showFabricEnvironmentQuickPickBoxStub = mySandBox.stub(UserInputUtil, 'showFabricEnvironmentQuickPickBox').resolves([{
                label: 'myEnvironmentB',
                data: await FabricEnvironmentRegistry.instance().get('myEnvironmentB')
            }]);

            geConnectedRegistryStub = mySandBox.stub(FabricEnvironmentManager.instance(), 'getEnvironmentRegistryEntry');
            commandSpy = mySandBox.spy(vscode.commands, 'executeCommand');
        });

        afterEach(() => {
            mySandBox.restore();
        });

        it('should test an environment can be deleted from the command', async () => {

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_ENVIRONMENT);

            environments = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_ENVIRONMENTS);
            environments.length.should.equal(1);
            environments[0].should.deep.equal(myEnvironmentA);

            commandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `delete environment`);
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully deleted ${myEnvironmentB.name} environment`);
        });

        it('should test multiple environments can be deleted from the command', async () => {
            showFabricEnvironmentQuickPickBoxStub.resolves([{
                label: 'myenvironmentA',
                data: await FabricEnvironmentRegistry.instance().get('myenvironmentA')
            }, {
                label: 'myEnvironmentB',
                data: await FabricEnvironmentRegistry.instance().get('myEnvironmentB')
            }]);

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_ENVIRONMENT);

            environments = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_ENVIRONMENTS);
            environments.length.should.equal(0);

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `delete environment`);
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully deleted environments`);
        });

        it('should test an environment can be deleted from tree', async () => {
            const blockchainEnvironmentExplorerProvider: BlockchainEnvironmentExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();

            const allChildren: Array<BlockchainTreeItem> = await blockchainEnvironmentExplorerProvider.getChildren();

            const environmentToDelete: BlockchainTreeItem = allChildren[1];
            await vscode.commands.executeCommand(ExtensionCommands.DELETE_ENVIRONMENT, environmentToDelete);

            environments = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_ENVIRONMENTS);
            environments.length.should.equal(1);
            environments[0].should.deep.equal(myEnvironmentB);

            commandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `delete environment`);
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully deleted ${myEnvironmentA.name} environment`);
        });

        it('should test an environment can be deleted from environment registry', async () => {
            const environmentRegistryEntry: FabricEnvironmentRegistryEntry = await FabricEnvironmentRegistry.instance().get('myenvironmentA');
            await vscode.commands.executeCommand(ExtensionCommands.DELETE_ENVIRONMENT, environmentRegistryEntry);

            environments = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_ENVIRONMENTS);
            environments.length.should.equal(1);
            environments[0].should.deep.equal(myEnvironmentB);

            commandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `delete environment`);
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully deleted ${myEnvironmentA.name} environment`);
        });

        it('should disconnect before deleting if connected', async () => {
            const environmentRegistryEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
            environmentRegistryEntry.name = 'myEnvironmentB';
            geConnectedRegistryStub.returns(environmentRegistryEntry);

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_ENVIRONMENT);

            environments = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_ENVIRONMENTS);
            environments.length.should.equal(1);
            environments[0].should.deep.equal(myEnvironmentA);

            commandSpy.should.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `delete environment`);
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully deleted ${myEnvironmentB.name} environment`);
        });

        it('should test an environment can be forcefully deleted', async () => {

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_ENVIRONMENT, undefined, true);

            environments = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_ENVIRONMENTS);
            environments.length.should.equal(1);
            environments[0].should.deep.equal(myEnvironmentA);

            commandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);

            showConfirmationWarningMessage.should.not.have.been.called;

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `delete environment`);
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully deleted ${myEnvironmentB.name} environment`);
        });

        it('should test delete environment can be cancelled', async () => {
            showFabricEnvironmentQuickPickBoxStub.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_ENVIRONMENT);

            environments = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_ENVIRONMENTS);
            environments.length.should.equal(2);

            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `delete environment`);
        });

        it('should handle the user not selecting an environment to delete', async () => {
            showFabricEnvironmentQuickPickBoxStub.resolves([]);
            await vscode.commands.executeCommand(ExtensionCommands.DELETE_ENVIRONMENT);
            environments = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_ENVIRONMENTS);
            environments.length.should.equal(2);
            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `delete environment`);
        });

        it('should show an error message if no environments have been added', async () => {
            await FabricEnvironmentRegistry.instance().clear();

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_ENVIRONMENT);

            showFabricEnvironmentQuickPickBoxStub.should.not.have.been.called;
            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `delete environment`);
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.ERROR, `No environments to delete. ${FabricRuntimeUtil.LOCAL_FABRIC} cannot be deleted.`);
        });

        it('should handle no from confirmation message', async () => {
            showConfirmationWarningMessage.resolves(false);

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_ENVIRONMENT);

            environments = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_ENVIRONMENTS);
            environments.length.should.equal(2);
            environments[0].should.deep.equal(myEnvironmentA);
            environments[1].should.deep.equal(myEnvironmentB);

            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `delete environment`);
        });

        it('should handle error from deleting environment', async () => {
            const error: Error = new Error('some error');

            mySandBox.stub(fs, 'remove').rejects(error);

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_ENVIRONMENT);

            environments = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_ENVIRONMENTS);
            environments.length.should.equal(2);

            commandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `delete environment`);
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.ERROR,  `Error deleting environment: ${error.message}`, `Error deleting environment: ${error.toString()}`);
        });
    });
});
