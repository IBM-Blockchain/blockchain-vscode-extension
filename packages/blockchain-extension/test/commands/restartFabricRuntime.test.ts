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

import * as vscode from 'vscode';
import { FabricGatewayRegistry } from '../../extension/registries/FabricGatewayRegistry';
import { LocalEnvironmentManager } from '../../extension/fabric/environments/LocalEnvironmentManager';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { TestUtil } from '../TestUtil';
import * as chai from 'chai';
import * as sinon from 'sinon';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricGatewayConnectionManager } from '../../extension/fabric/FabricGatewayConnectionManager';
import { FabricGatewayRegistryEntry } from '../../extension/registries/FabricGatewayRegistryEntry';
import { FabricEnvironmentRegistryEntry, FabricRuntimeUtil, LogType, FabricEnvironmentRegistry, EnvironmentType } from 'ibm-blockchain-platform-common';
import { FabricEnvironmentManager } from '../../extension/fabric/environments/FabricEnvironmentManager';
import { ManagedAnsibleEnvironment } from '../../extension/fabric/environments/ManagedAnsibleEnvironment';
import { UserInputUtil, IBlockchainQuickPickItem } from '../../extension/commands/UserInputUtil';
import { EnvironmentFactory } from '../../extension/fabric/environments/EnvironmentFactory';
import { RuntimeTreeItem } from '../../extension/explorer/runtimeOps/disconnectedTree/RuntimeTreeItem';
import { LocalEnvironment } from '../../extension/fabric/environments/LocalEnvironment';
import { BlockchainEnvironmentExplorerProvider } from '../../extension/explorer/environmentExplorer';
chai.should();

// tslint:disable no-unused-expression
describe('restartFabricRuntime', () => {

    const sandbox: sinon.SinonSandbox = sinon.createSandbox();
    const connectionRegistry: FabricGatewayRegistry = FabricGatewayRegistry.instance();
    const runtimeManager: LocalEnvironmentManager = LocalEnvironmentManager.instance();
    let getGatewayRegistryEntryStub: sinon.SinonStub;
    let getEnvironmentRegistryEntryStub: sinon.SinonStub;
    let logSpy: sinon.SinonSpy;
    let restartStub: sinon.SinonStub;
    let executeCommandSpy: sinon.SinonSpy;

    let showFabricEnvironmentQuickPickBoxStub: sinon.SinonStub;
    let getEnvironmentStub: sinon.SinonStub;
    let localRegistryEntry: FabricEnvironmentRegistryEntry;
    before(async () => {
        await TestUtil.setupTests(sandbox);
    });

    beforeEach(async () => {
        await ExtensionUtil.activateExtension();
        await connectionRegistry.clear();
        await runtimeManager.initialize();

        const localGateway: FabricGatewayRegistryEntry = await FabricGatewayRegistry.instance().get(FabricRuntimeUtil.LOCAL_FABRIC);

        getGatewayRegistryEntryStub = sandbox.stub(FabricGatewayConnectionManager.instance(), 'getGatewayRegistryEntry');
        getGatewayRegistryEntryStub.returns(localGateway);

        getEnvironmentRegistryEntryStub = sandbox.stub(FabricEnvironmentManager.instance(), 'getEnvironmentRegistryEntry');

        const localEnvironment: FabricEnvironmentRegistryEntry = await FabricEnvironmentRegistry.instance().get(FabricRuntimeUtil.LOCAL_FABRIC);
        getEnvironmentRegistryEntryStub.returns(localEnvironment);

        logSpy = sandbox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
        executeCommandSpy = sandbox.spy(vscode.commands, 'executeCommand');

        localRegistryEntry = await FabricEnvironmentRegistry.instance().get(FabricRuntimeUtil.LOCAL_FABRIC);
        showFabricEnvironmentQuickPickBoxStub = sandbox.stub(UserInputUtil, 'showFabricEnvironmentQuickPickBox');
        showFabricEnvironmentQuickPickBoxStub.resolves({label: FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME, data: localRegistryEntry});
        getEnvironmentStub = sandbox.stub(EnvironmentFactory, 'getEnvironment');
    });

    afterEach(async () => {
        sandbox.restore();
        await connectionRegistry.clear();
    });

    it('should restart a Fabric environment from the tree', async () => {
        getEnvironmentStub.callThrough();
        const environment: LocalEnvironment = EnvironmentFactory.getEnvironment(localRegistryEntry) as LocalEnvironment;
        restartStub = sandbox.stub(environment, 'restart').resolves();
        const blockchainEnvironmentExplorerProvider: BlockchainEnvironmentExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();
        const treeItem: RuntimeTreeItem = await RuntimeTreeItem.newRuntimeTreeItem(blockchainEnvironmentExplorerProvider,
            environment.getName(),
            localRegistryEntry,
            {
                command: ExtensionCommands.CONNECT_TO_ENVIRONMENT,
                title: '',
                arguments: [localRegistryEntry]
            }
        );

        getEnvironmentStub.returns(environment);
        getGatewayRegistryEntryStub.returns(undefined);
        getEnvironmentRegistryEntryStub.returns(undefined);

        await vscode.commands.executeCommand(ExtensionCommands.RESTART_FABRIC, treeItem);

        restartStub.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());

        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_GATEWAY);
        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);

        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'restartFabricRuntime');
    });

    it('should restart a Fabric runtime, disconnect from gateway and refresh the view', async () => {
        getEnvironmentStub.callThrough();
        const environment: LocalEnvironment = EnvironmentFactory.getEnvironment(localRegistryEntry) as LocalEnvironment;
        restartStub = sandbox.stub(environment, 'restart').resolves();
        const blockchainEnvironmentExplorerProvider: BlockchainEnvironmentExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();
        const treeItem: RuntimeTreeItem = await RuntimeTreeItem.newRuntimeTreeItem(blockchainEnvironmentExplorerProvider,
            environment.getName(),
            localRegistryEntry,
            {
                command: ExtensionCommands.CONNECT_TO_ENVIRONMENT,
                title: '',
                arguments: [localRegistryEntry]
            }
        );

        getEnvironmentStub.returns(environment);
        getEnvironmentRegistryEntryStub.returns(undefined);

        await vscode.commands.executeCommand(ExtensionCommands.RESTART_FABRIC, treeItem);

        restartStub.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());

        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.DISCONNECT_GATEWAY);
        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);

        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'restartFabricRuntime');
    });

    it('should restart a Fabric runtime, disconnect from environment and refresh the view', async () => {
        getEnvironmentStub.callThrough();
        const environment: LocalEnvironment = EnvironmentFactory.getEnvironment(localRegistryEntry) as LocalEnvironment;
        restartStub = sandbox.stub(environment, 'restart').resolves();
        const blockchainEnvironmentExplorerProvider: BlockchainEnvironmentExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();
        const treeItem: RuntimeTreeItem = await RuntimeTreeItem.newRuntimeTreeItem(blockchainEnvironmentExplorerProvider,
            environment.getName(),
            localRegistryEntry,
            {
                command: ExtensionCommands.CONNECT_TO_ENVIRONMENT,
                title: '',
                arguments: [localRegistryEntry]
            }
        );

        getEnvironmentStub.returns(environment);
        getGatewayRegistryEntryStub.returns(undefined);

        await vscode.commands.executeCommand(ExtensionCommands.RESTART_FABRIC, treeItem);

        restartStub.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());

        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_GATEWAY);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);

        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'restartFabricRuntime');
    });

    it('should display an error if restarting Fabric Runtime fails', async () => {
        const error: Error = new Error('what the fabric has happened');

        getEnvironmentStub.callThrough();
        const environment: LocalEnvironment = EnvironmentFactory.getEnvironment(localRegistryEntry) as LocalEnvironment;
        restartStub = sandbox.stub(environment, 'restart').throws(error);
        const blockchainEnvironmentExplorerProvider: BlockchainEnvironmentExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();
        const treeItem: RuntimeTreeItem = await RuntimeTreeItem.newRuntimeTreeItem(blockchainEnvironmentExplorerProvider,
            environment.getName(),
            localRegistryEntry,
            {
                command: ExtensionCommands.CONNECT_TO_ENVIRONMENT,
                title: '',
                arguments: [localRegistryEntry]
            }
        );

        getEnvironmentStub.returns(environment);
        getGatewayRegistryEntryStub.returns(undefined);
        getEnvironmentRegistryEntryStub.returns(undefined);

        await vscode.commands.executeCommand(ExtensionCommands.RESTART_FABRIC, treeItem);

        restartStub.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());

        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_GATEWAY);
        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);

        logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'restartFabricRuntime');
        logSpy.getCall(1).should.have.been.calledWithExactly(LogType.ERROR, `Failed to restart ${environment.getDisplayName()}: ${error.message}`, `Failed to restart ${environment.getDisplayName()}: ${error.toString()}`);
    });

    it('should be able to restart the an environment from the command', async () => {
        showFabricEnvironmentQuickPickBoxStub.resolves({label: FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME, data: localRegistryEntry} as IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>);
        getEnvironmentStub.callThrough();
        const environment: LocalEnvironment = EnvironmentFactory.getEnvironment(localRegistryEntry) as LocalEnvironment;
        restartStub = sandbox.stub(environment, 'restart').resolves();
        getEnvironmentStub.returns(environment);
        getGatewayRegistryEntryStub.returns(undefined);
        getEnvironmentRegistryEntryStub.returns(undefined);

        await vscode.commands.executeCommand(ExtensionCommands.RESTART_FABRIC);

        showFabricEnvironmentQuickPickBoxStub.should.have.been.calledOnceWithExactly('Select an environment to restart', false, true, true, true);
        getEnvironmentStub.should.have.been.calledWith(localRegistryEntry);

        restartStub.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());

        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_GATEWAY);
        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);

        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'restartFabricRuntime');
    });

    it('should be able to cancel choosing an environment to restart', async () => {
        showFabricEnvironmentQuickPickBoxStub.resolves(undefined);

        await vscode.commands.executeCommand(ExtensionCommands.RESTART_FABRIC);

        showFabricEnvironmentQuickPickBoxStub.should.have.been.calledOnceWithExactly('Select an environment to restart', false, true, true, true);
        getEnvironmentStub.should.not.have.been.called;

        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_GATEWAY);
        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);
        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);

        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'restartFabricRuntime');
    });

    it(`shouldn't disconnect from the connected gateway if the environment isn't associated`, async () => {
        const managedAnsibleEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
        managedAnsibleEntry.name = 'managedAnsibleEntry';
        managedAnsibleEntry.managedRuntime = true;
        managedAnsibleEntry.environmentType = EnvironmentType.ANSIBLE_ENVIRONMENT;

        await FabricEnvironmentRegistry.instance().add(managedAnsibleEntry);

        showFabricEnvironmentQuickPickBoxStub.resolves({label: 'managedAnsibleEntry', data: managedAnsibleEntry});
        getEnvironmentStub.callThrough();

        const environment: ManagedAnsibleEnvironment = EnvironmentFactory.getEnvironment(managedAnsibleEntry) as ManagedAnsibleEnvironment;
        restartStub = sandbox.stub(environment, 'restart').resolves();
        getEnvironmentStub.withArgs(managedAnsibleEntry).returns(environment);

        getEnvironmentRegistryEntryStub.returns(undefined);

        await vscode.commands.executeCommand(ExtensionCommands.RESTART_FABRIC);

        showFabricEnvironmentQuickPickBoxStub.should.have.been.calledOnceWithExactly('Select an environment to restart', false, true, true, true);
        getEnvironmentStub.should.have.been.calledWith(managedAnsibleEntry);

        restartStub.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());

        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_GATEWAY);
        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);

        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'restartFabricRuntime');
    });
});
