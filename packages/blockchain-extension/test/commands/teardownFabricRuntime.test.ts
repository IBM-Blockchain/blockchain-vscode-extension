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
import { UserInputUtil, IBlockchainQuickPickItem } from '../../extension/commands/UserInputUtil';
import { EnvironmentFactory } from '../../extension/fabric/environments/EnvironmentFactory';
import { RuntimeTreeItem } from '../../extension/explorer/runtimeOps/disconnectedTree/RuntimeTreeItem';
import { LocalEnvironment } from '../../extension/fabric/environments/LocalEnvironment';
import { BlockchainEnvironmentExplorerProvider } from '../../extension/explorer/environmentExplorer';
chai.should();

// tslint:disable no-unused-expression
describe('teardownFabricRuntime', () => {

    const sandbox: sinon.SinonSandbox = sinon.createSandbox();
    const connectionRegistry: FabricGatewayRegistry = FabricGatewayRegistry.instance();
    let getGatewayRegistryEntryStub: sinon.SinonStub;
    let getEnvironmentRegistryEntryStub: sinon.SinonStub;
    let logSpy: sinon.SinonSpy;
    let teardownStub: sinon.SinonStub;
    let executeCommandSpy: sinon.SinonSpy;
    let getConnectionStub: sinon.SinonStub;
    let showFabricEnvironmentQuickPickBoxStub: sinon.SinonStub;
    let localRegistryEntry: FabricEnvironmentRegistryEntry;
    let showConfirmationWarningMessageStub: sinon.SinonStub;
    before(async () => {
        await TestUtil.setupTests(sandbox);
    });

    beforeEach(async () => {
        await connectionRegistry.clear();
        await FabricEnvironmentRegistry.instance().clear();
        await TestUtil.setupLocalFabric();

        const localGateway: FabricGatewayRegistryEntry = await FabricGatewayRegistry.instance().get(`${FabricRuntimeUtil.LOCAL_FABRIC} - Org1`);

        getGatewayRegistryEntryStub = sandbox.stub(FabricGatewayConnectionManager.instance(), 'getGatewayRegistryEntry');
        getGatewayRegistryEntryStub.returns(localGateway);

        getEnvironmentRegistryEntryStub = sandbox.stub(FabricEnvironmentManager.instance(), 'getEnvironmentRegistryEntry');
        getConnectionStub = sandbox.stub(FabricEnvironmentManager.instance(), 'getConnection');
        getConnectionStub.returns(undefined);

        const localEnvironment: FabricEnvironmentRegistryEntry = await FabricEnvironmentRegistry.instance().get(FabricRuntimeUtil.LOCAL_FABRIC);
        getEnvironmentRegistryEntryStub.returns(localEnvironment);

        logSpy = sandbox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
        executeCommandSpy = sandbox.spy(vscode.commands, 'executeCommand');

        localRegistryEntry = await FabricEnvironmentRegistry.instance().get(FabricRuntimeUtil.LOCAL_FABRIC);
        showFabricEnvironmentQuickPickBoxStub = sandbox.stub(UserInputUtil, 'showFabricEnvironmentQuickPickBox');
        showFabricEnvironmentQuickPickBoxStub.resolves({ label: FabricRuntimeUtil.LOCAL_FABRIC, data: localRegistryEntry });
        showConfirmationWarningMessageStub = sandbox.stub(UserInputUtil, 'showConfirmationWarningMessage');
        showConfirmationWarningMessageStub.resolves(true);
    });

    afterEach(async () => {
        sandbox.restore();
        await connectionRegistry.clear();
    });

    it('should teardown a Fabric environment from the tree', async () => {
        const environment: LocalEnvironment = EnvironmentFactory.getEnvironment(localRegistryEntry) as LocalEnvironment;
        teardownStub = sandbox.stub(environment, 'teardown').resolves();
        sandbox.stub(environment, 'startLogs').resolves();
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

        getGatewayRegistryEntryStub.returns(undefined);
        getEnvironmentRegistryEntryStub.returns(undefined);

        await vscode.commands.executeCommand(ExtensionCommands.TEARDOWN_FABRIC, treeItem);

        showConfirmationWarningMessageStub.should.have.been.calledOnceWith(`All world state and ledger data for the Fabric runtime ${environment.getName()} will be destroyed. Do you want to continue?`);

        teardownStub.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());

        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_GATEWAY);
        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);

        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'teardownFabricRuntime');
    });

    it('should teardown a Fabric runtime, disconnect from gateway and refresh the view', async () => {
        const environment: LocalEnvironment = EnvironmentFactory.getEnvironment(localRegistryEntry) as LocalEnvironment;
        teardownStub = sandbox.stub(environment, 'teardown').resolves();
        sandbox.stub(environment, 'startLogs').resolves();
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

        getEnvironmentRegistryEntryStub.returns(undefined);

        await vscode.commands.executeCommand(ExtensionCommands.TEARDOWN_FABRIC, treeItem);

        showConfirmationWarningMessageStub.should.have.been.calledOnceWith(`All world state and ledger data for the Fabric runtime ${environment.getName()} will be destroyed. Do you want to continue?`);

        teardownStub.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());

        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.DISCONNECT_GATEWAY);
        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);

        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'teardownFabricRuntime');
    });

    it('should teardown a Fabric runtime, disconnect from environment and refresh the view', async () => {
        const environment: LocalEnvironment = EnvironmentFactory.getEnvironment(localRegistryEntry) as LocalEnvironment;
        teardownStub = sandbox.stub(environment, 'teardown').resolves();
        sandbox.stub(environment, 'startLogs').resolves();
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

        getGatewayRegistryEntryStub.returns(undefined);

        await vscode.commands.executeCommand(ExtensionCommands.TEARDOWN_FABRIC, treeItem);

        showConfirmationWarningMessageStub.should.have.been.calledOnceWith(`All world state and ledger data for the Fabric runtime ${environment.getName()} will be destroyed. Do you want to continue?`);

        teardownStub.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());

        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_GATEWAY);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);

        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'teardownFabricRuntime');
    });

    it('should display an error if tearing down Fabric Runtime fails', async () => {
        const error: Error = new Error('what the fabric has happened');

        const environment: LocalEnvironment = EnvironmentFactory.getEnvironment(localRegistryEntry) as LocalEnvironment;
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

        teardownStub = sandbox.stub(environment, 'teardown').rejects(error);

        getGatewayRegistryEntryStub.returns(undefined);
        getEnvironmentRegistryEntryStub.returns(undefined);

        await vscode.commands.executeCommand(ExtensionCommands.TEARDOWN_FABRIC, treeItem);

        showConfirmationWarningMessageStub.should.have.been.calledOnceWith(`All world state and ledger data for the Fabric runtime ${environment.getName()} will be destroyed. Do you want to continue?`);

        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_GATEWAY);
        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);

        logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'teardownFabricRuntime');
        logSpy.getCall(1).should.have.been.calledWithExactly(LogType.ERROR, `Failed to teardown ${environment.getName()}: ${error.message}`, `Failed to teardown ${environment.getName()}: ${error.toString()}`);
    });

    it('should be able to teardown the an environment from the command', async () => {
        showFabricEnvironmentQuickPickBoxStub.resolves({ label: FabricRuntimeUtil.LOCAL_FABRIC, data: localRegistryEntry } as IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>);

        const environment: LocalEnvironment = EnvironmentFactory.getEnvironment(localRegistryEntry) as LocalEnvironment;
        teardownStub = sandbox.stub(environment, 'teardown').resolves();

        getGatewayRegistryEntryStub.returns(undefined);
        getEnvironmentRegistryEntryStub.returns(undefined);

        await vscode.commands.executeCommand(ExtensionCommands.TEARDOWN_FABRIC);

        showConfirmationWarningMessageStub.should.have.been.calledOnceWith(`All world state and ledger data for the Fabric runtime ${environment.getName()} will be destroyed. Do you want to continue?`);

        showFabricEnvironmentQuickPickBoxStub.should.have.been.calledOnceWithExactly('Select an environment to teardown', false, true, true, true);

        teardownStub.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());

        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_GATEWAY);
        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);

        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'teardownFabricRuntime');
    });

    it('should be able to teardown the local connected environment (called from three dot menu)', async () => {
        getConnectionStub.returns({});
        showFabricEnvironmentQuickPickBoxStub.resolves({ label: FabricRuntimeUtil.LOCAL_FABRIC, data: localRegistryEntry } as IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>);

        const environment: LocalEnvironment = EnvironmentFactory.getEnvironment(localRegistryEntry) as LocalEnvironment;
        teardownStub = sandbox.stub(environment, 'teardown').resolves();

        getGatewayRegistryEntryStub.returns(undefined);
        getEnvironmentRegistryEntryStub.returns(localRegistryEntry);

        await vscode.commands.executeCommand(ExtensionCommands.TEARDOWN_FABRIC);

        showConfirmationWarningMessageStub.should.have.been.calledOnceWith(`All world state and ledger data for the Fabric runtime ${environment.getName()} will be destroyed. Do you want to continue?`);

        showFabricEnvironmentQuickPickBoxStub.should.not.have.been.calledWith('Select an environment to teardown', false, true, true, true);

        teardownStub.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());

        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_GATEWAY);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);

        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'teardownFabricRuntime');
    });

    it('should ask what environment to teardown if connected to non-managed environment', async () => {
        getConnectionStub.returns({});
        getEnvironmentRegistryEntryStub.returns({name: 'otherEnvironment'} as FabricEnvironmentRegistryEntry);
        showFabricEnvironmentQuickPickBoxStub.resolves({ label: FabricRuntimeUtil.LOCAL_FABRIC, data: localRegistryEntry } as IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>);

        const environment: LocalEnvironment = EnvironmentFactory.getEnvironment(localRegistryEntry) as LocalEnvironment;
        teardownStub = sandbox.stub(environment, 'teardown').resolves();

        getGatewayRegistryEntryStub.returns(undefined);

        await vscode.commands.executeCommand(ExtensionCommands.TEARDOWN_FABRIC);

        showConfirmationWarningMessageStub.should.have.been.calledOnceWith(`All world state and ledger data for the Fabric runtime ${environment.getName()} will be destroyed. Do you want to continue?`);

        showFabricEnvironmentQuickPickBoxStub.should.have.been.calledWith('Select an environment to teardown', false, true, true, true);

        teardownStub.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());

        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_GATEWAY);
        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);

        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'teardownFabricRuntime');
    });

    it('should be able to cancel choosing an environment to teardown', async () => {
        showFabricEnvironmentQuickPickBoxStub.resolves(undefined);

        await vscode.commands.executeCommand(ExtensionCommands.TEARDOWN_FABRIC);

        showConfirmationWarningMessageStub.should.not.have.been.called;

        showFabricEnvironmentQuickPickBoxStub.should.have.been.calledOnceWithExactly('Select an environment to teardown', false, true, true, true);

        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_GATEWAY);
        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);
        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);

        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'teardownFabricRuntime');
    });

    it('should be able to cancel when asked if you want to teardown the selected environment', async () => {
        showFabricEnvironmentQuickPickBoxStub.resolves({ label: FabricRuntimeUtil.LOCAL_FABRIC, data: localRegistryEntry } as IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>);

        const environment: LocalEnvironment = EnvironmentFactory.getEnvironment(localRegistryEntry) as LocalEnvironment;
        teardownStub = sandbox.stub(environment, 'teardown').resolves();

        getGatewayRegistryEntryStub.returns(undefined);
        getEnvironmentRegistryEntryStub.returns(undefined);

        showConfirmationWarningMessageStub.resolves(false);

        await vscode.commands.executeCommand(ExtensionCommands.TEARDOWN_FABRIC);

        showConfirmationWarningMessageStub.should.have.been.calledOnceWith(`All world state and ledger data for the Fabric runtime ${environment.getName()} will be destroyed. Do you want to continue?`);

        showFabricEnvironmentQuickPickBoxStub.should.have.been.calledOnceWithExactly('Select an environment to teardown', false, true, true, true);

        teardownStub.should.not.have.been.called;

        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_GATEWAY);
        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);
        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);

        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'teardownFabricRuntime');
    });

    it(`shouldn't disconnect from the connected gateway if the environment isn't associated`, async () => {
        const managedAnsibleEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
        managedAnsibleEntry.name = 'managedAnsibleEntry';
        managedAnsibleEntry.managedRuntime = true;
        managedAnsibleEntry.environmentType = EnvironmentType.ANSIBLE_ENVIRONMENT;

        await FabricEnvironmentRegistry.instance().add(managedAnsibleEntry);

        showFabricEnvironmentQuickPickBoxStub.resolves({ label: 'managedAnsibleEntry', data: managedAnsibleEntry });

        const environment: ManagedAnsibleEnvironment = EnvironmentFactory.getEnvironment(managedAnsibleEntry) as ManagedAnsibleEnvironment;
        teardownStub = sandbox.stub(ManagedAnsibleEnvironment.prototype, 'teardown').resolves();

        getEnvironmentRegistryEntryStub.returns(undefined);

        await vscode.commands.executeCommand(ExtensionCommands.TEARDOWN_FABRIC);

        showFabricEnvironmentQuickPickBoxStub.should.have.been.calledOnceWithExactly('Select an environment to teardown', false, true, true, true);

        showConfirmationWarningMessageStub.should.have.been.calledOnceWith(`All world state and ledger data for the Fabric runtime ${environment.getName()} will be destroyed. Do you want to continue?`);

        teardownStub.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());

        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_GATEWAY);
        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);

        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'teardownFabricRuntime');
    });

    it('should be able to force teardown', async () => {
        showFabricEnvironmentQuickPickBoxStub.resolves({ label: FabricRuntimeUtil.LOCAL_FABRIC, data: localRegistryEntry } as IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>);

        const environment: LocalEnvironment = EnvironmentFactory.getEnvironment(localRegistryEntry) as LocalEnvironment;
        teardownStub = sandbox.stub(environment, 'teardown').resolves();

        getGatewayRegistryEntryStub.returns(undefined);
        getEnvironmentRegistryEntryStub.returns(undefined);

        await vscode.commands.executeCommand(ExtensionCommands.TEARDOWN_FABRIC, undefined, true);

        showConfirmationWarningMessageStub.should.not.have.been.called;

        showFabricEnvironmentQuickPickBoxStub.should.have.been.calledOnceWithExactly('Select an environment to teardown', false, true, true, true);

        teardownStub.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());

        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_GATEWAY);
        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);

        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'teardownFabricRuntime');
    });

    it('should teardown a runtime given the environment name', async () => {
        showFabricEnvironmentQuickPickBoxStub.resolves({ label: FabricRuntimeUtil.LOCAL_FABRIC, data: localRegistryEntry } as IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>);

        const environment: LocalEnvironment = EnvironmentFactory.getEnvironment(localRegistryEntry) as LocalEnvironment;
        teardownStub = sandbox.stub(environment, 'teardown').resolves();

        getGatewayRegistryEntryStub.returns(undefined);
        getEnvironmentRegistryEntryStub.returns(undefined);

        await vscode.commands.executeCommand(ExtensionCommands.TEARDOWN_FABRIC, undefined, true, FabricRuntimeUtil.LOCAL_FABRIC);

        showConfirmationWarningMessageStub.should.not.have.been.called;

        showFabricEnvironmentQuickPickBoxStub.should.not.have.been.calledOnceWithExactly('Select an environment to teardown', false, true, true, true);

        teardownStub.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());

        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_GATEWAY);
        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);

        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'teardownFabricRuntime');
    });
});
