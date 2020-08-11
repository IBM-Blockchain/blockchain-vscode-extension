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
import { BlockchainTreeItem } from '../../extension/explorer/model/BlockchainTreeItem';
import { TestUtil } from '../TestUtil';
import { UserInputUtil } from '../../extension/commands/UserInputUtil';
import { ExtensionCommands } from '../../ExtensionCommands';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { FabricEnvironmentRegistry, FabricEnvironmentRegistryEntry, FabricRuntimeUtil, LogType, FabricGatewayRegistryEntry, EnvironmentType } from 'ibm-blockchain-platform-common';
import { BlockchainEnvironmentExplorerProvider } from '../../extension/explorer/environmentExplorer';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';
import { FabricEnvironmentManager } from '../../extension/fabric/environments/FabricEnvironmentManager';
import { FabricGatewayConnectionManager } from '../../extension/fabric/FabricGatewayConnectionManager';
import { RuntimeTreeItem } from '../../extension/explorer/runtimeOps/disconnectedTree/RuntimeTreeItem';
import { SettingConfigurations } from '../../configurations';
import { GlobalState, ExtensionData } from '../../extension/util/GlobalState';
import { LocalEnvironmentManager } from '../../extension/fabric/environments/LocalEnvironmentManager';
import { ManagedAnsibleEnvironmentManager } from '../../extension/fabric/environments/ManagedAnsibleEnvironmentManager';
import { LocalEnvironment } from '../../extension/fabric/environments/LocalEnvironment';
import { ExtensionsInteractionUtil } from '../../extension/util/ExtensionsInteractionUtil';

chai.should();
chai.use(sinonChai);
// tslint:disable no-unused-expression

describe('DeleteEnvironmentCommand', () => {
    let mySandBox: sinon.SinonSandbox;
    let showConfirmationWarningMessage: sinon.SinonStub;
    before(async () => {
        mySandBox = sinon.createSandbox();
        await TestUtil.setupTests(mySandBox);
    });

    describe('deleteEnvironment', () => {

        let showFabricEnvironmentQuickPickBoxStub: sinon.SinonStub;
        let environments: Array<FabricEnvironmentRegistryEntry>;
        let myEnvironmentA: FabricEnvironmentRegistryEntry;
        let myEnvironmentB: FabricEnvironmentRegistryEntry;
        let logSpy: sinon.SinonSpy;
        let commandSpy: sinon.SinonSpy;
        let geConnectedEnvironmentRegistryStub: sinon.SinonStub;
        let getConnectedGatewayRegistryStub: sinon.SinonStub;
        let getAllSpy: sinon.SinonSpy;
        let globalStateUpdateSpy: sinon.SinonSpy;
        let removeLocalRuntimeSpy: sinon.SinonSpy;
        let removeManagedRuntimeSpy: sinon.SinonSpy;

        beforeEach(async () => {
            mySandBox.restore();
            showConfirmationWarningMessage = mySandBox.stub(UserInputUtil, 'showConfirmationWarningMessage').withArgs(`This will remove the environment(s). Do you want to continue?`).resolves(true);

            // reset the available environments
            await FabricEnvironmentRegistry.instance().clear();

            const settings: any = {};
            settings[FabricRuntimeUtil.LOCAL_FABRIC] = {
                ports: {
                    startPort: 17050,
                    endPort: 17070
                }
            };
            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, settings, vscode.ConfigurationTarget.Global);

            environments = [];

            myEnvironmentA = new FabricEnvironmentRegistryEntry({
                name: 'myEnvironmentA',
            });

            await FabricEnvironmentRegistry.instance().add(myEnvironmentA);

            myEnvironmentB = new FabricEnvironmentRegistryEntry({
                name: 'myEnvironmentB',
            });

            await FabricEnvironmentRegistry.instance().add(myEnvironmentB);

            await TestUtil.setupLocalFabric();

            showFabricEnvironmentQuickPickBoxStub = mySandBox.stub(UserInputUtil, 'showFabricEnvironmentQuickPickBox').resolves([{
                label: 'myEnvironmentB',
                data: myEnvironmentB
            }]);

            geConnectedEnvironmentRegistryStub = mySandBox.stub(FabricEnvironmentManager.instance(), 'getEnvironmentRegistryEntry');
            getConnectedGatewayRegistryStub = mySandBox.stub(FabricGatewayConnectionManager.instance(), 'getGatewayRegistryEntry').resolves();

            commandSpy = mySandBox.spy(vscode.commands, 'executeCommand');

            logSpy = mySandBox.stub(VSCodeBlockchainOutputAdapter.instance(), 'log');

            getAllSpy = mySandBox.spy(FabricEnvironmentRegistry.instance(), 'getAll');
            globalStateUpdateSpy = mySandBox.spy(GlobalState, 'update');

            removeLocalRuntimeSpy = mySandBox.spy(LocalEnvironmentManager.instance(), 'removeRuntime');
            removeManagedRuntimeSpy = mySandBox.spy(ManagedAnsibleEnvironmentManager.instance(), 'removeRuntime');

            mySandBox.stub(LocalEnvironment.prototype, 'isRunning').resolves(false);
        });

        afterEach(() => {
            mySandBox.restore();
        });

        it('should test an environment can be deleted from the command', async () => {

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_ENVIRONMENT);

            showFabricEnvironmentQuickPickBoxStub.should.have.been.calledOnceWithExactly('Choose the environment(s) that you want to delete', true, false, true);
            getAllSpy.should.have.been.calledOnceWithExactly(true);
            environments =  await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(2);
            environments[0].name.should.equal(FabricRuntimeUtil.LOCAL_FABRIC);
            environments[1].should.deep.equal(myEnvironmentA);

            commandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `delete environment`);
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully deleted ${myEnvironmentB.name} environment`);
        });

        it('should test multiple environments can be deleted from the command', async () => {
            showFabricEnvironmentQuickPickBoxStub.resolves([{
                label: 'myenvironmentA',
                data: await FabricEnvironmentRegistry.instance().get('myEnvironmentA')
            }, {
                label: 'myEnvironmentB',
                data: await FabricEnvironmentRegistry.instance().get('myEnvironmentB')
            }]);

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_ENVIRONMENT);

            showFabricEnvironmentQuickPickBoxStub.should.have.been.calledOnceWithExactly('Choose the environment(s) that you want to delete', true, false, true);
            getAllSpy.should.have.been.calledOnceWithExactly(true);

            environments =  await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(1);

            environments[0].name.should.equal(FabricRuntimeUtil.LOCAL_FABRIC);

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `delete environment`);
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully deleted environments`);
        });

        it('should test an environment can be deleted from tree', async () => {
            mySandBox.stub(ExtensionsInteractionUtil, 'cloudAccountIsLoggedIn').resolves(false);

            const blockchainEnvironmentExplorerProvider: BlockchainEnvironmentExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();

            const allChildren: Array<BlockchainTreeItem> = await blockchainEnvironmentExplorerProvider.getChildren();
            const groupChildren: Array<BlockchainTreeItem> = await blockchainEnvironmentExplorerProvider.getChildren(allChildren[2]);

            const environmentToDelete: BlockchainTreeItem = groupChildren[0];
            await vscode.commands.executeCommand(ExtensionCommands.DELETE_ENVIRONMENT_SHORT, environmentToDelete);

            showFabricEnvironmentQuickPickBoxStub.should.not.have.been.called;

            environments =  await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(2);

            environments[0].name.should.equal(FabricRuntimeUtil.LOCAL_FABRIC);
            environments[1].should.deep.equal(myEnvironmentB);

            commandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `delete environment`);
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully deleted ${myEnvironmentA.name} environment`);
        });

        it('should test an environment can be deleted from environment registry', async () => {
            const environmentRegistryEntry: FabricEnvironmentRegistryEntry = await FabricEnvironmentRegistry.instance().get('myEnvironmentA');
            await vscode.commands.executeCommand(ExtensionCommands.DELETE_ENVIRONMENT, environmentRegistryEntry);

            showFabricEnvironmentQuickPickBoxStub.should.not.have.been.called;
            getAllSpy.should.not.have.been.called;

            environments =  await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(2);

            environments[0].name.should.equal(FabricRuntimeUtil.LOCAL_FABRIC);
            environments[1].should.deep.equal(myEnvironmentB);

            commandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `delete environment`);
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully deleted ${myEnvironmentA.name} environment`);
        });

        it('should disconnect before deleting if connected', async () => {
            const environmentRegistryEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
            environmentRegistryEntry.name = 'myEnvironmentB';
            geConnectedEnvironmentRegistryStub.returns(environmentRegistryEntry);

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_ENVIRONMENT);

            showFabricEnvironmentQuickPickBoxStub.should.have.been.calledOnceWithExactly('Choose the environment(s) that you want to delete', true, false, true);
            getAllSpy.should.have.been.calledOnceWithExactly(true);

            environments =  await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(2);

            environments[0].name.should.equal(FabricRuntimeUtil.LOCAL_FABRIC);
            environments[1].should.deep.equal(myEnvironmentA);

            commandSpy.should.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `delete environment`);
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully deleted ${myEnvironmentB.name} environment`);
        });

        it('should disconnect from gateway before deleting if connected to a related gateway', async () => {
            const environmentRegistryEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
            environmentRegistryEntry.name = 'myEnvironmentB';
            geConnectedEnvironmentRegistryStub.returns(environmentRegistryEntry);

            const gatewayRegistryEntry: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry({name: 'myGateway', fromEnvironment: environmentRegistryEntry.name, associatedWallet: ''});
            getConnectedGatewayRegistryStub.resolves(gatewayRegistryEntry);

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_ENVIRONMENT);

            showFabricEnvironmentQuickPickBoxStub.should.have.been.calledOnceWithExactly('Choose the environment(s) that you want to delete', true, false, true);
            getAllSpy.should.have.been.calledOnceWithExactly(true);

            environments =  await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(2);

            environments[0].name.should.equal(FabricRuntimeUtil.LOCAL_FABRIC);
            environments[1].should.deep.equal(myEnvironmentA);

            commandSpy.should.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            commandSpy.should.have.been.calledWith(ExtensionCommands.DISCONNECT_GATEWAY);

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `delete environment`);
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully deleted ${myEnvironmentB.name} environment`);
        });

        it('should not disconnect from gateway before deleting if connected to a non-related gateway', async () => {
            const environmentRegistryEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
            environmentRegistryEntry.name = 'myEnvironmentB';
            geConnectedEnvironmentRegistryStub.returns(environmentRegistryEntry);

            const gatewayRegistryEntry: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry({name: 'myGateway', fromEnvironment: 'anotherEnv', associatedWallet: ''});
            getConnectedGatewayRegistryStub.resolves(gatewayRegistryEntry);

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_ENVIRONMENT);

            showFabricEnvironmentQuickPickBoxStub.should.have.been.calledOnceWithExactly('Choose the environment(s) that you want to delete', true, false, true);
            getAllSpy.should.have.been.calledOnceWithExactly(true);

            environments =  await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(2);

            environments[0].name.should.equal(FabricRuntimeUtil.LOCAL_FABRIC);
            environments[1].should.deep.equal(myEnvironmentA);

            commandSpy.should.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            commandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_GATEWAY);

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `delete environment`);
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully deleted ${myEnvironmentB.name} environment`);
        });

        it('should test an environment can be forcefully deleted', async () => {

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_ENVIRONMENT, undefined, true);

            showFabricEnvironmentQuickPickBoxStub.should.have.been.calledOnceWithExactly('Choose the environment(s) that you want to delete', true, false, true);
            getAllSpy.should.have.been.calledOnceWithExactly(true);

            environments =  await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(2);

            environments[0].name.should.equal(FabricRuntimeUtil.LOCAL_FABRIC);
            environments[1].should.deep.equal(myEnvironmentA);

            commandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);

            showConfirmationWarningMessage.should.not.have.been.called;

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `delete environment`);
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully deleted ${myEnvironmentB.name} environment`);
        });

        it('should test delete environment can be cancelled', async () => {
            showFabricEnvironmentQuickPickBoxStub.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_ENVIRONMENT);

            showFabricEnvironmentQuickPickBoxStub.should.have.been.calledOnceWithExactly('Choose the environment(s) that you want to delete', true, false, true);
            getAllSpy.should.have.been.calledOnceWithExactly(true);

            environments =  await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(3);

            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `delete environment`);
        });

        it('should handle the user not selecting an environment to delete', async () => {
            showFabricEnvironmentQuickPickBoxStub.resolves([]);
            await vscode.commands.executeCommand(ExtensionCommands.DELETE_ENVIRONMENT);

            showFabricEnvironmentQuickPickBoxStub.should.have.been.calledOnceWithExactly('Choose the environment(s) that you want to delete', true, false, true);
            getAllSpy.should.have.been.calledOnceWithExactly(true);

            environments =  await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(3);
            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `delete environment`);

        });

        it('should show an error message if no environments have been added', async () => {
            await FabricEnvironmentRegistry.instance().clear();

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_ENVIRONMENT);

            showFabricEnvironmentQuickPickBoxStub.should.not.have.been.called;
            getAllSpy.should.have.been.calledOnceWithExactly(true);

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `delete environment`);
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.ERROR, `No environments to delete.`);
        });

        it('should handle no from confirmation message', async () => {
            showConfirmationWarningMessage.resolves(false);

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_ENVIRONMENT);

            showFabricEnvironmentQuickPickBoxStub.should.have.been.calledOnceWithExactly('Choose the environment(s) that you want to delete', true, false, true);
            getAllSpy.should.have.been.calledOnceWithExactly(true);

            environments =  await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(3);
            environments[0].name.should.equal(FabricRuntimeUtil.LOCAL_FABRIC);
            environments[1].should.deep.equal(myEnvironmentA);
            environments[2].should.deep.equal(myEnvironmentB);

            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `delete environment`);

        });

        it('should handle error from deleting environment', async () => {
            const error: Error = new Error('some error');

            mySandBox.stub(FabricEnvironmentRegistry.instance(), 'delete').rejects(error);

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_ENVIRONMENT);

            showFabricEnvironmentQuickPickBoxStub.should.have.been.calledOnceWithExactly('Choose the environment(s) that you want to delete', true, false, true);
            getAllSpy.should.have.been.calledOnceWithExactly(true);

            environments =  await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(3);

            commandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `delete environment`);
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.ERROR, `Error deleting environment: ${error.message}`, `Error deleting environment: ${error.toString()}`);
        });

        it(`should be able to delete the ${FabricRuntimeUtil.LOCAL_FABRIC} environment from the tree`, async () => {
            commandSpy.restore();

            const executeCommandStub: sinon.SinonStub = mySandBox.stub(vscode.commands, 'executeCommand');
            executeCommandStub.callThrough();
            executeCommandStub.withArgs(ExtensionCommands.TEARDOWN_FABRIC, undefined, true, FabricRuntimeUtil.LOCAL_FABRIC).resolves();
            mySandBox.stub(ExtensionsInteractionUtil, 'cloudAccountIsLoggedIn').resolves(false);
            const blockchainEnvironmentExplorerProvider: BlockchainEnvironmentExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();

            const allChildren: Array<BlockchainTreeItem> = await blockchainEnvironmentExplorerProvider.getChildren();
            const groupChildren: Array<BlockchainTreeItem> = await blockchainEnvironmentExplorerProvider.getChildren(allChildren[0]);

            const environmentToDelete: BlockchainTreeItem = groupChildren[0];

            environmentToDelete.should.be.an.instanceOf(RuntimeTreeItem);

            const globalState: ExtensionData = GlobalState.get();
            globalState.deletedOneOrgLocalFabric = false;
            await GlobalState.update(globalState);

            globalStateUpdateSpy.resetHistory();

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_ENVIRONMENT_SHORT, environmentToDelete);

            globalStateUpdateSpy.should.have.been.calledOnce;
            const updateCall: any = globalStateUpdateSpy.getCall(0).args[0];
            updateCall.deletedOneOrgLocalFabric.should.equal(true);
            showFabricEnvironmentQuickPickBoxStub.should.not.have.been.called;
            environments =  await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(2);

            environments[0].should.deep.equal(myEnvironmentA);
            environments[1].should.deep.equal(myEnvironmentB);

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.TEARDOWN_FABRIC, undefined, true, FabricRuntimeUtil.LOCAL_FABRIC);
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);

            removeLocalRuntimeSpy.should.have.been.calledOnceWithExactly(FabricRuntimeUtil.LOCAL_FABRIC);
            removeManagedRuntimeSpy.should.not.have.been.called;

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `delete environment`);
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully deleted ${FabricRuntimeUtil.LOCAL_FABRIC} environment`);

            const localSettings: any = await vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_RUNTIME, vscode.ConfigurationTarget.Global);
            localSettings.should.deep.equal({});

        });

        it(`should be able to delete a local environment from the tree`, async () => {
            const settings: any = {};
            settings['otherLocal'] = {
                ports: {
                    startPort: 17050,
                    endPort: 17070
                }
            };
            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, settings, vscode.ConfigurationTarget.Global);

            const otherLocalEnvEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry({
                name: 'otherLocal',
                managedRuntime: true,
                numberOfOrgs: 1,
                environmentType: EnvironmentType.LOCAL_ENVIRONMENT,
                environmentDirectory: path.join(__dirname, '..', 'data', 'managedAnsible')
            });

            await FabricEnvironmentRegistry.instance().add(otherLocalEnvEntry);

            showFabricEnvironmentQuickPickBoxStub.resolves([{
                label: 'otherLocal',
                data: otherLocalEnvEntry
            }]);

            commandSpy.restore();

            const executeCommandStub: sinon.SinonStub = mySandBox.stub(vscode.commands, 'executeCommand');
            executeCommandStub.callThrough();
            executeCommandStub.withArgs(ExtensionCommands.TEARDOWN_FABRIC, undefined, true, 'otherLocal').resolves();
            mySandBox.stub(ExtensionsInteractionUtil, 'cloudAccountIsLoggedIn').resolves(false);
            const blockchainEnvironmentExplorerProvider: BlockchainEnvironmentExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();

            const allChildren: Array<BlockchainTreeItem> = await blockchainEnvironmentExplorerProvider.getChildren();
            const groupChildren: Array<BlockchainTreeItem> = await blockchainEnvironmentExplorerProvider.getChildren(allChildren[0]);
            const environmentToDelete: BlockchainTreeItem = groupChildren[1];

            environmentToDelete.should.be.an.instanceOf(RuntimeTreeItem);

            globalStateUpdateSpy.resetHistory();

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_ENVIRONMENT, environmentToDelete);

            globalStateUpdateSpy.should.not.have.been.called;

            showFabricEnvironmentQuickPickBoxStub.should.not.have.been.called;
            environments =  await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(3);

            environments[0].name.should.equal(FabricRuntimeUtil.LOCAL_FABRIC);
            environments[1].should.deep.equal(myEnvironmentA);
            environments[2].should.deep.equal(myEnvironmentB);

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.TEARDOWN_FABRIC, undefined, true, 'otherLocal');
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);

            removeLocalRuntimeSpy.should.have.been.calledOnceWithExactly('otherLocal');
            removeManagedRuntimeSpy.should.not.have.been.called;

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `delete environment`);
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully deleted otherLocal environment`);

            const localSettings: any = await vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_RUNTIME, vscode.ConfigurationTarget.Global);
            localSettings.should.deep.equal({});

        });

        it(`should be able to delete the ${FabricRuntimeUtil.LOCAL_FABRIC} environment from the command`, async () => {
            commandSpy.restore();

            const executeCommandStub: sinon.SinonStub = mySandBox.stub(vscode.commands, 'executeCommand');
            executeCommandStub.callThrough();
            executeCommandStub.withArgs(ExtensionCommands.TEARDOWN_FABRIC, undefined, true, FabricRuntimeUtil.LOCAL_FABRIC).resolves();

            const localEntry: FabricEnvironmentRegistryEntry = await FabricEnvironmentRegistry.instance().get(FabricRuntimeUtil.LOCAL_FABRIC);
            showFabricEnvironmentQuickPickBoxStub.resolves([{
                label: FabricRuntimeUtil.LOCAL_FABRIC,
                data: localEntry
            }]);

            const globalState: ExtensionData = GlobalState.get();
            globalState.deletedOneOrgLocalFabric = false;
            await GlobalState.update(globalState);

            globalStateUpdateSpy.resetHistory();

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_ENVIRONMENT);

            globalStateUpdateSpy.should.have.been.calledOnce;
            const updateCall: any = globalStateUpdateSpy.getCall(0).args[0];
            updateCall.deletedOneOrgLocalFabric.should.equal(true);

            showFabricEnvironmentQuickPickBoxStub.should.have.been.calledOnceWithExactly('Choose the environment(s) that you want to delete', true, false, true);
            getAllSpy.should.have.been.calledOnceWithExactly(true);

            environments =  await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(2);
            environments[0].should.deep.equal(myEnvironmentA);
            environments[1].should.deep.equal(myEnvironmentB);

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.TEARDOWN_FABRIC, undefined, true, FabricRuntimeUtil.LOCAL_FABRIC);
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);

            removeLocalRuntimeSpy.should.have.been.calledOnceWithExactly(FabricRuntimeUtil.LOCAL_FABRIC);
            removeManagedRuntimeSpy.should.not.have.been.called;

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `delete environment`);
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully deleted ${FabricRuntimeUtil.LOCAL_FABRIC} environment`);

            const localSettings: any = await vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_RUNTIME, vscode.ConfigurationTarget.Global);
            localSettings.should.deep.equal({});
        });

        it('should be able to delete a local environment from the command', async () => {
            const settings: any = {};
            settings['otherLocal'] = {
                ports: {
                    startPort: 17050,
                    endPort: 17070
                }
            };
            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, settings, vscode.ConfigurationTarget.Global);

            const otherLocalEnvEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry({
                name: 'otherLocal',
                managedRuntime: true,
                numberOfOrgs: 1,
                environmentType: EnvironmentType.LOCAL_ENVIRONMENT,
                environmentDirectory: path.join(__dirname, '..', 'data', 'managedAnsible')
            });

            await FabricEnvironmentRegistry.instance().add(otherLocalEnvEntry);
            commandSpy.restore();

            const executeCommandStub: sinon.SinonStub = mySandBox.stub(vscode.commands, 'executeCommand');
            executeCommandStub.callThrough();
            executeCommandStub.withArgs(ExtensionCommands.TEARDOWN_FABRIC, undefined, true, 'otherLocal').resolves();

            showFabricEnvironmentQuickPickBoxStub.resolves([{
                label: 'otherLocal',
                data: otherLocalEnvEntry
            }]);

            const globalState: ExtensionData = GlobalState.get();
            globalState.deletedOneOrgLocalFabric = false;
            await GlobalState.update(globalState);

            globalStateUpdateSpy.resetHistory();

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_ENVIRONMENT);

            globalStateUpdateSpy.should.not.have.been.called;

            showFabricEnvironmentQuickPickBoxStub.should.have.been.calledOnceWithExactly('Choose the environment(s) that you want to delete', true, false, true);
            getAllSpy.should.have.been.calledOnceWithExactly(true);

            environments =  await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(3);
            environments[0].name.should.equal(FabricRuntimeUtil.LOCAL_FABRIC);
            environments[1].should.deep.equal(myEnvironmentA);
            environments[2].should.deep.equal(myEnvironmentB);

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.TEARDOWN_FABRIC, undefined, true, 'otherLocal');
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);

            removeLocalRuntimeSpy.should.have.been.calledOnceWithExactly('otherLocal');
            removeManagedRuntimeSpy.should.not.have.been.called;

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `delete environment`);
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully deleted otherLocal environment`);

            const localSettings: any = await vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_RUNTIME, vscode.ConfigurationTarget.Global);
            localSettings.should.deep.equal({});
        });

        it(`should be able to delete a managed ansible environment from the tree`, async () => {

            const otherLocalEnvEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry({
                name: 'otherLocal',
                managedRuntime: true,
                environmentType: EnvironmentType.ANSIBLE_ENVIRONMENT,
                environmentDirectory: path.join(path.dirname(__dirname), '..', '..', 'test', 'data', 'managedAnsible')
            });
            await FabricEnvironmentRegistry.instance().add(otherLocalEnvEntry);

            showFabricEnvironmentQuickPickBoxStub.resolves([{
                label: 'otherLocal',
                data: otherLocalEnvEntry
            }]);

            commandSpy.restore();

            const executeCommandStub: sinon.SinonStub = mySandBox.stub(vscode.commands, 'executeCommand');
            executeCommandStub.callThrough();
            mySandBox.stub(ExtensionsInteractionUtil, 'cloudAccountIsLoggedIn').resolves(false);
            const blockchainEnvironmentExplorerProvider: BlockchainEnvironmentExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();

            const allChildren: Array<BlockchainTreeItem> = await blockchainEnvironmentExplorerProvider.getChildren();
            const groupChildren: Array<BlockchainTreeItem> = await blockchainEnvironmentExplorerProvider.getChildren(allChildren[2]);
            const environmentToDelete: BlockchainTreeItem = groupChildren[2];

            environmentToDelete.should.be.an.instanceOf(RuntimeTreeItem);

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_ENVIRONMENT, environmentToDelete);

            showFabricEnvironmentQuickPickBoxStub.should.not.have.been.called;
            environments =  await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(3);

            environments[0].name.should.equal(FabricRuntimeUtil.LOCAL_FABRIC);
            environments[1].should.deep.equal(myEnvironmentA);
            environments[2].should.deep.equal(myEnvironmentB);

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.TEARDOWN_FABRIC, undefined, true, 'otherLocal');
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);

            removeLocalRuntimeSpy.should.not.have.been.called;
            removeManagedRuntimeSpy.should.have.been.calledOnceWithExactly('otherLocal');

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `delete environment`);
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully deleted otherLocal environment`);

        });

        it('should be able to delete a managed ansible environment from the command', async () => {

            const otherLocalEnvEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry({
                name: 'otherLocal',
                managedRuntime: true,
                environmentType: EnvironmentType.ANSIBLE_ENVIRONMENT,
                environmentDirectory: path.join(path.dirname(__dirname), '..', '..', 'test', 'data', 'managedAnsible')
            });

            await FabricEnvironmentRegistry.instance().add(otherLocalEnvEntry);
            commandSpy.restore();

            const executeCommandStub: sinon.SinonStub = mySandBox.stub(vscode.commands, 'executeCommand');
            executeCommandStub.callThrough();

            showFabricEnvironmentQuickPickBoxStub.resolves([{
                label: 'otherLocal',
                data: otherLocalEnvEntry
            }]);

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_ENVIRONMENT);

            showFabricEnvironmentQuickPickBoxStub.should.have.been.calledOnceWithExactly('Choose the environment(s) that you want to delete', true, false, true);

            environments =  await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(3);
            environments[0].name.should.equal(FabricRuntimeUtil.LOCAL_FABRIC);
            environments[1].should.deep.equal(myEnvironmentA);
            environments[2].should.deep.equal(myEnvironmentB);

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.TEARDOWN_FABRIC, undefined, true, 'otherLocal');
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);

            removeLocalRuntimeSpy.should.not.have.been.called;
            removeManagedRuntimeSpy.should.have.been.calledOnceWithExactly('otherLocal');

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `delete environment`);
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully deleted otherLocal environment`);
        });

        it('should remove any wallet config files when deleting an ansible environment', async () => {

            const ansibleEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry({
                name: 'ansible',
                environmentType: EnvironmentType.ANSIBLE_ENVIRONMENT,
                environmentDirectory: path.join(path.dirname(__dirname), '..', '..', 'test', 'data', 'managedAnsible')
            });

            await FabricEnvironmentRegistry.instance().add(ansibleEntry);
            commandSpy.restore();

            const executeCommandStub: sinon.SinonStub = mySandBox.stub(vscode.commands, 'executeCommand');
            executeCommandStub.callThrough();

            showFabricEnvironmentQuickPickBoxStub.resolves([{
                label: 'ansible',
                data: ansibleEntry
            }]);

            mySandBox.stub(fs, 'pathExists').resolves(true);
            mySandBox.stub(fs, 'remove').resolves();

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_ENVIRONMENT);

            showFabricEnvironmentQuickPickBoxStub.should.have.been.calledOnceWithExactly('Choose the environment(s) that you want to delete', true, false, true);

            environments =  await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(3);
            environments[0].name.should.equal(FabricRuntimeUtil.LOCAL_FABRIC);
            environments[1].should.deep.equal(myEnvironmentA);
            environments[2].should.deep.equal(myEnvironmentB);

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.TEARDOWN_FABRIC, undefined, true, 'ansible');
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);

            removeLocalRuntimeSpy.should.not.have.been.called;
            removeManagedRuntimeSpy.should.not.have.been.called;

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `delete environment`);
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully deleted ansible environment`);
        });

        it('should warn user if error occurs whilst tearing down local environment during deletion', async () => {
            commandSpy.restore();

            const executeCommandStub: sinon.SinonStub = mySandBox.stub(vscode.commands, 'executeCommand');
            executeCommandStub.callThrough();

            const error: Error = new Error('something went wrong');
            executeCommandStub.withArgs(ExtensionCommands.TEARDOWN_FABRIC, undefined, true, FabricRuntimeUtil.LOCAL_FABRIC).throws(error);

            const localEntry: FabricEnvironmentRegistryEntry = await FabricEnvironmentRegistry.instance().get(FabricRuntimeUtil.LOCAL_FABRIC);
            showFabricEnvironmentQuickPickBoxStub.resolves([{
                label: FabricRuntimeUtil.LOCAL_FABRIC,
                data: localEntry
            }]);

            const globalState: ExtensionData = GlobalState.get();
            globalState.deletedOneOrgLocalFabric = false;
            await GlobalState.update(globalState);

            globalStateUpdateSpy.resetHistory();

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_ENVIRONMENT);

            globalStateUpdateSpy.should.have.been.calledOnce;
            const updateCall: any = globalStateUpdateSpy.getCall(0).args[0];
            updateCall.deletedOneOrgLocalFabric.should.equal(true);

            showFabricEnvironmentQuickPickBoxStub.should.have.been.calledOnceWithExactly('Choose the environment(s) that you want to delete', true, false, true);
            getAllSpy.should.have.been.calledOnceWithExactly(true);

            environments =  await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(2);
            environments[0].should.deep.equal(myEnvironmentA);
            environments[1].should.deep.equal(myEnvironmentB);

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.TEARDOWN_FABRIC, undefined, true, FabricRuntimeUtil.LOCAL_FABRIC);
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `delete environment`);
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.WARNING, undefined, `Error whilst tearing down ${FabricRuntimeUtil.LOCAL_FABRIC} environment: ${error.message}`);
            logSpy.getCall(2).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully deleted ${FabricRuntimeUtil.LOCAL_FABRIC} environment`);

            const localSettings: any = await vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_RUNTIME, vscode.ConfigurationTarget.Global);
            localSettings.should.deep.equal({});
        });
    });
});
