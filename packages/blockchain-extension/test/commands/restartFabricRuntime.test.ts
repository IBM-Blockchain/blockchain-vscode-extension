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
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { TestUtil } from '../TestUtil';
import * as chai from 'chai';
import * as sinon from 'sinon';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricGatewayConnectionManager } from '../../extension/fabric/FabricGatewayConnectionManager';
import { FabricEnvironmentRegistryEntry, FabricRuntimeUtil, LogType, FabricEnvironmentRegistry, EnvironmentType, FabricGatewayRegistry, FabricGatewayRegistryEntry } from 'ibm-blockchain-platform-common';
import { FabricEnvironmentManager } from '../../extension/fabric/environments/FabricEnvironmentManager';
import { ManagedAnsibleEnvironment } from '../../extension/fabric/environments/ManagedAnsibleEnvironment';
import { UserInputUtil, IBlockchainQuickPickItem, IncludeEnvironmentOptions } from '../../extension/commands/UserInputUtil';
import { EnvironmentFactory } from '../../extension/fabric/environments/EnvironmentFactory';
import { RuntimeTreeItem } from '../../extension/explorer/runtimeOps/disconnectedTree/RuntimeTreeItem';
import { LocalEnvironment } from '../../extension/fabric/environments/LocalEnvironment';
import { BlockchainEnvironmentExplorerProvider } from '../../extension/explorer/environmentExplorer';
import { LocalEnvironmentManager } from '../../extension/fabric/environments/LocalEnvironmentManager';
chai.should();

// tslint:disable no-unused-expression
describe('restartFabricRuntime', () => {

    const sandbox: sinon.SinonSandbox = sinon.createSandbox();
    const connectionRegistry: FabricGatewayRegistry = FabricGatewayRegistry.instance();
    let getGatewayRegistryEntryStub: sinon.SinonStub;
    let getEnvironmentRegistryEntryStub: sinon.SinonStub;
    let logSpy: sinon.SinonSpy;
    let popupStub: sinon.SinonStub;
    let restartStub: sinon.SinonStub;
    let executeCommandSpy: sinon.SinonSpy;
    let getConnectionStub: sinon.SinonStub;
    let showFabricEnvironmentQuickPickBoxStub: sinon.SinonStub;
    let localRegistryEntry: FabricEnvironmentRegistryEntry;
    before(async () => {
        await TestUtil.setupTests(sandbox);
    });

    beforeEach(async () => {
        await ExtensionUtil.activateExtension();
        await connectionRegistry.clear();

        await TestUtil.setupLocalFabric();

        await LocalEnvironmentManager.instance().ensureRuntime(FabricRuntimeUtil.LOCAL_FABRIC, undefined, 1);

        const localGateway: FabricGatewayRegistryEntry = await FabricGatewayRegistry.instance().get(`${FabricRuntimeUtil.LOCAL_FABRIC} - Org1`);

        getGatewayRegistryEntryStub = sandbox.stub(FabricGatewayConnectionManager.instance(), 'getGatewayRegistryEntry');
        getGatewayRegistryEntryStub.resolves(localGateway);

        getEnvironmentRegistryEntryStub = sandbox.stub(FabricEnvironmentManager.instance(), 'getEnvironmentRegistryEntry');
        getConnectionStub = sandbox.stub(FabricEnvironmentManager.instance(), 'getConnection');
        getConnectionStub.returns(undefined);

        const localEnvironment: FabricEnvironmentRegistryEntry = await FabricEnvironmentRegistry.instance().get(FabricRuntimeUtil.LOCAL_FABRIC);
        getEnvironmentRegistryEntryStub.returns(localEnvironment);

        logSpy = sandbox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
        popupStub = sandbox.stub(UserInputUtil, 'failedNetworkStart').resolves();
        executeCommandSpy = sandbox.spy(vscode.commands, 'executeCommand');

        localRegistryEntry = await FabricEnvironmentRegistry.instance().get(FabricRuntimeUtil.LOCAL_FABRIC);
        showFabricEnvironmentQuickPickBoxStub = sandbox.stub(UserInputUtil, 'showFabricEnvironmentQuickPickBox');
        showFabricEnvironmentQuickPickBoxStub.resolves({label: FabricRuntimeUtil.LOCAL_FABRIC, data: localRegistryEntry});

    });

    afterEach(async () => {
        sandbox.restore();
        await connectionRegistry.clear();
    });

    it('should do nothing and report a warning on Eclipse Che', async () => {
        sandbox.stub(ExtensionUtil, 'isChe').returns(true);
        await vscode.commands.executeCommand(ExtensionCommands.RESTART_FABRIC_SHORT);
        logSpy.should.have.been.calledWithExactly(LogType.ERROR, sinon.match(/not supported/));
    });

    it('should restart a Fabric environment from the tree', async () => {
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
            },
            environment
        );

        getGatewayRegistryEntryStub.resolves();
        getEnvironmentRegistryEntryStub.returns(undefined);

        await vscode.commands.executeCommand(ExtensionCommands.RESTART_FABRIC_SHORT, treeItem);

        restartStub.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());

        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_GATEWAY);
        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);

        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'restartFabricRuntime');
    });

    it('should restart a Fabric runtime, disconnect from gateway and refresh the view', async () => {
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
            },
            environment
        );

        getEnvironmentRegistryEntryStub.returns(undefined);

        await vscode.commands.executeCommand(ExtensionCommands.RESTART_FABRIC_SHORT, treeItem);

        restartStub.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());

        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.DISCONNECT_GATEWAY);
        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);

        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'restartFabricRuntime');
    });

    it('should restart a Fabric runtime, disconnect from environment and refresh the view', async () => {
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
            },
            environment
        );

        getGatewayRegistryEntryStub.resolves();

        await vscode.commands.executeCommand(ExtensionCommands.RESTART_FABRIC_SHORT, treeItem);

        restartStub.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());

        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_GATEWAY);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);

        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'restartFabricRuntime');
    });

    it('should restart local connected environment (called from three dot menu)', async () => {
        getConnectionStub.returns({});
        const environment: LocalEnvironment = EnvironmentFactory.getEnvironment(localRegistryEntry) as LocalEnvironment;
        restartStub = sandbox.stub(environment, 'restart').resolves();

        getGatewayRegistryEntryStub.resolves();

        await vscode.commands.executeCommand(ExtensionCommands.RESTART_FABRIC);

        showFabricEnvironmentQuickPickBoxStub.should.not.have.been.called;
        restartStub.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());

        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_GATEWAY);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);

        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'restartFabricRuntime');
    });

    it('should ask what environment to restart if connected to non-managed environment', async () => {
        getEnvironmentRegistryEntryStub.returns({name: 'otherEnvironment'} as FabricEnvironmentRegistryEntry);

        const environment: LocalEnvironment = EnvironmentFactory.getEnvironment(localRegistryEntry) as LocalEnvironment;
        restartStub = sandbox.stub(environment, 'restart').resolves();

        getGatewayRegistryEntryStub.resolves();
        showFabricEnvironmentQuickPickBoxStub.resolves({label: FabricRuntimeUtil.LOCAL_FABRIC, data: localRegistryEntry} as IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>);

        await vscode.commands.executeCommand(ExtensionCommands.RESTART_FABRIC);

        showFabricEnvironmentQuickPickBoxStub.should.have.been.calledOnceWithExactly('Select an environment to restart', false, true, true, IncludeEnvironmentOptions.ALLENV, true, undefined, true);
        restartStub.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());

        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_GATEWAY);
        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);

        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'restartFabricRuntime');
    });

    it('should display an error if restarting Fabric Runtime fails', async () => {
        const error: Error = new Error('what the fabric has happened');

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
            },
            environment
        );

        getGatewayRegistryEntryStub.resolves();
        getEnvironmentRegistryEntryStub.returns(undefined);

        await vscode.commands.executeCommand(ExtensionCommands.RESTART_FABRIC_SHORT, treeItem);

        restartStub.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());

        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_GATEWAY);
        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
        popupStub.should.have.been.calledWithExactly(`Failed to restart ${environment.getName()}: ${error.message}`,
                    `Failed to restart ${environment.getName()}: ${error.toString()}`);
    });

    it('should be able to restart the an environment from the command', async () => {
        showFabricEnvironmentQuickPickBoxStub.resolves({label: FabricRuntimeUtil.LOCAL_FABRIC, data: localRegistryEntry} as IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>);
        const environment: LocalEnvironment = EnvironmentFactory.getEnvironment(localRegistryEntry) as LocalEnvironment;
        restartStub = sandbox.stub(environment, 'restart').resolves();

        getGatewayRegistryEntryStub.resolves();
        getEnvironmentRegistryEntryStub.returns(undefined);

        await vscode.commands.executeCommand(ExtensionCommands.RESTART_FABRIC);

        showFabricEnvironmentQuickPickBoxStub.should.have.been.calledOnceWithExactly('Select an environment to restart', false, true, true, IncludeEnvironmentOptions.ALLENV, true, undefined, true);

        restartStub.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());

        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_GATEWAY);
        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);

        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'restartFabricRuntime');
    });

    it('should be able to cancel choosing an environment to restart', async () => {
        showFabricEnvironmentQuickPickBoxStub.resolves(undefined);

        await vscode.commands.executeCommand(ExtensionCommands.RESTART_FABRIC);

        showFabricEnvironmentQuickPickBoxStub.should.have.been.calledOnceWithExactly('Select an environment to restart', false, true, true, IncludeEnvironmentOptions.ALLENV, true, undefined, true);

        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_GATEWAY);
        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);
        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);

        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'restartFabricRuntime');
    });

    it(`shouldn't disconnect from the connected gateway if the environment isn't associated`, async () => {
        const managedAnsibleEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
        managedAnsibleEntry.name = 'managedAnsible';
        managedAnsibleEntry.managedRuntime = true;
        managedAnsibleEntry.environmentType = EnvironmentType.ANSIBLE_ENVIRONMENT;

        const managedEnvironment: ManagedAnsibleEnvironment = new ManagedAnsibleEnvironment('managedAnsible', '');

        await FabricEnvironmentRegistry.instance().add(managedAnsibleEntry);

        showFabricEnvironmentQuickPickBoxStub.resolves({label: 'managedAnsible', data: managedAnsibleEntry});

        restartStub = sandbox.stub(managedEnvironment, 'restart').resolves();

        getEnvironmentRegistryEntryStub.returns(undefined);

        sandbox.stub(EnvironmentFactory, 'getEnvironment').returns(managedEnvironment);

        await vscode.commands.executeCommand(ExtensionCommands.RESTART_FABRIC);

        showFabricEnvironmentQuickPickBoxStub.should.have.been.calledOnceWithExactly('Select an environment to restart', false, true, true, IncludeEnvironmentOptions.ALLENV, true, undefined, true);

        restartStub.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());

        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_GATEWAY);
        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);

        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'restartFabricRuntime');
    });
});
