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
import { UserInputUtil } from '../../extension/commands/UserInputUtil';
import { PackageRegistryEntry } from '../../extension/registries/PackageRegistryEntry';
import { BlockchainTreeItem } from '../../extension/explorer/model/BlockchainTreeItem';
import { BlockchainEnvironmentExplorerProvider } from '../../extension/explorer/environmentExplorer';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { SmartContractsTreeItem } from '../../extension/explorer/runtimeOps/connectedTree/SmartContractsTreeItem';
import { InstallCommandTreeItem } from '../../extension/explorer/runtimeOps/connectedTree/InstallCommandTreeItem';
import { NodesTreeItem } from '../../extension/explorer/runtimeOps/connectedTree/NodesTreeItem';
import { PeerTreeItem } from '../../extension/explorer/runtimeOps/connectedTree/PeerTreeItem';
import { ExtensionCommands } from '../../ExtensionCommands';
import { VSCodeBlockchainDockerOutputAdapter } from '../../extension/logging/VSCodeBlockchainDockerOutputAdapter';
import { FabricEnvironmentConnection } from 'ibm-blockchain-platform-environment-v1';
import { FabricEnvironmentManager, ConnectedState } from '../../extension/fabric/environments/FabricEnvironmentManager';
import { FabricEnvironmentRegistryEntry, FabricRuntimeUtil, LogType, EnvironmentType } from 'ibm-blockchain-platform-common';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';
import { SettingConfigurations } from '../../configurations';

chai.use(sinonChai);
const should: Chai.Should = chai.should();

// tslint:disable no-unused-expression
describe('InstallCommand', () => {

    const TEST_PACKAGE_DIRECTORY: string = path.join(path.dirname(__dirname), '../../test/data/packageDir');

    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();

    before(async () => {
        await TestUtil.setupTests(mySandBox);
    });

    after(async () => {
        await vscode.workspace.getConfiguration().update(SettingConfigurations.EXTENSION_DIRECTORY, TestUtil.EXTENSION_TEST_DIR, vscode.ConfigurationTarget.Global);
    });

    describe('InstallSmartContract', () => {
        let fabricRuntimeMock: sinon.SinonStubbedInstance<FabricEnvironmentConnection>;

        let executeCommandStub: sinon.SinonStub;
        let packageRegistryEntry: PackageRegistryEntry;
        let getRuntimeConnectionStub: sinon.SinonStub;
        let showPeersQuickPickStub: sinon.SinonStub;
        let showInstallableSmartContractsQuickPickStub: sinon.SinonStub;
        let logOutputSpy: sinon.SinonSpy;
        let dockerLogsOutputSpy: sinon.SinonSpy;
        let allChildren: Array<BlockchainTreeItem>;
        let blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider;
        let installCommandTreeItem: InstallCommandTreeItem;
        let smartContractsChildren: BlockchainTreeItem[];
        let peerTreeItem: PeerTreeItem;
        let environmentRegistryStub: sinon.SinonStub;

        beforeEach(async () => {
            executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand');
            executeCommandStub.withArgs(ExtensionCommands.CONNECT_TO_GATEWAY).resolves();
            executeCommandStub.withArgs(ExtensionCommands.CONNECT_TO_ENVIRONMENT).resolves();
            executeCommandStub.callThrough();

            fabricRuntimeMock = mySandBox.createStubInstance(FabricEnvironmentConnection);
            fabricRuntimeMock.connect.resolves();
            fabricRuntimeMock.installChaincode.resolves();
            fabricRuntimeMock.getInstalledChaincode.resolves(new Map<string, Array<string>>());
            fabricRuntimeMock.getAllOrdererNames.returns(['orderer1']);
            fabricRuntimeMock.getAllCertificateAuthorityNames.returns(['ca1']);
            fabricRuntimeMock.getNode.withArgs('peerOne').resolves({ wallet: 'myWallet' });

            getRuntimeConnectionStub = mySandBox.stub(FabricEnvironmentManager.instance(), 'getConnection').returns((fabricRuntimeMock as any));
            mySandBox.stub(FabricEnvironmentManager.instance(), 'getState').returns(ConnectedState.CONNECTED);
            const environmentRegistryEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
            environmentRegistryEntry.name = FabricRuntimeUtil.LOCAL_FABRIC;
            environmentRegistryEntry.managedRuntime = true;
            environmentRegistryEntry.environmentType = EnvironmentType.LOCAL_ENVIRONMENT;

            environmentRegistryStub = mySandBox.stub(FabricEnvironmentManager.instance(), 'getEnvironmentRegistryEntry').returns(environmentRegistryEntry);

            showPeersQuickPickStub = mySandBox.stub(UserInputUtil, 'showPeersQuickPickBox').resolves(['peerOne']);

            packageRegistryEntry = new PackageRegistryEntry({
                name: 'vscode-pkg-1@0.0.1',
                path: path.join(TEST_PACKAGE_DIRECTORY, 'vscode-pkg-1@0.0.1.cds'),
                version: '0.0.1',
                sizeKB: 23.45
            });

            showInstallableSmartContractsQuickPickStub = mySandBox.stub(UserInputUtil, 'showInstallableSmartContractsQuickPick').resolves({
                label: 'myContract@0.0.1',
                data: {
                    packageEntry: packageRegistryEntry,
                    workspace: undefined
                }
            });

            logOutputSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
            dockerLogsOutputSpy = mySandBox.spy(VSCodeBlockchainDockerOutputAdapter.instance(FabricRuntimeUtil.LOCAL_FABRIC), 'show');

            fabricRuntimeMock.getAllPeerNames.returns(['peerOne']);

            fabricRuntimeMock.getInstantiatedChaincode.resolves([]);

            blockchainRuntimeExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();
            allChildren = await blockchainRuntimeExplorerProvider.getChildren();

            const smartContracts: SmartContractsTreeItem = allChildren[1] as SmartContractsTreeItem;
            smartContractsChildren = await blockchainRuntimeExplorerProvider.getChildren(smartContracts);
            const installedSmartContractsList: BlockchainTreeItem[] = await blockchainRuntimeExplorerProvider.getChildren(smartContractsChildren[0]);
            installCommandTreeItem = installedSmartContractsList[0] as InstallCommandTreeItem;

            const nodesTreeItem: NodesTreeItem = allChildren[3] as NodesTreeItem;
            const peers: BlockchainTreeItem[] = await blockchainRuntimeExplorerProvider.getChildren(nodesTreeItem);
            peerTreeItem = peers[0] as PeerTreeItem;

            logOutputSpy.resetHistory();

            // mySandBox.stub(LocalEnvironment.prototype, 'startLogs').resolves();
            // mySandBox.stub(LocalEnvironment.prototype, 'stopLogs').returns(undefined);
        });

        afterEach(async () => {
            await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT_ENVIRONMENT);

            mySandBox.restore();
        });

        it('should install the smart contract through the command', async () => {
            const result: PackageRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT);
            result.name.should.equal('vscode-pkg-1@0.0.1');
            fabricRuntimeMock.installChaincode.should.have.been.calledWith(packageRegistryEntry.path, 'peerOne');

            dockerLogsOutputSpy.should.have.been.called;
            logOutputSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'installSmartContract');
            logOutputSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully installed on peer peerOne');
        });

        it('should install the smart contract through the command on multiple peers', async () => {
            showPeersQuickPickStub.resolves(['peerOne', 'peerTwo']);

            const result: PackageRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT);
            result.name.should.equal('vscode-pkg-1@0.0.1');
            fabricRuntimeMock.installChaincode.should.have.been.calledWith(packageRegistryEntry.path, 'peerOne');
            fabricRuntimeMock.installChaincode.should.have.been.calledWith(packageRegistryEntry.path, 'peerTwo');

            dockerLogsOutputSpy.should.have.been.called;
            logOutputSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'installSmartContract');
            logOutputSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully installed on peer peerOne');
            logOutputSpy.getCall(2).should.have.been.calledWith(LogType.SUCCESS, 'Successfully installed on peer peerTwo');
            logOutputSpy.getCall(3).should.have.been.calledWith(LogType.SUCCESS, 'Successfully installed smart contract on all peers');
        });

        it('should install the smart contract through the command with peers set', async () => {
            const peerSet: Set<string> = new Set<string>();
            peerSet.add('peerThree');
            peerSet.add('peerOne');
            const result: PackageRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, peerSet);
            result.name.should.equal('vscode-pkg-1@0.0.1');

            showPeersQuickPickStub.should.have.been.calledWith('Choose which peers to install the smart contract on', ['peerThree', 'peerOne']);
            fabricRuntimeMock.installChaincode.should.have.been.calledWith(packageRegistryEntry.path, 'peerOne');

            dockerLogsOutputSpy.should.have.been.called;
            logOutputSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'installSmartContract');
            logOutputSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully installed on peer peerOne');
        });

        it('should install the smart contract with specific package', async () => {
            const result: PackageRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT, null, null, packageRegistryEntry);
            result.name.should.equal(packageRegistryEntry.name);

            fabricRuntimeMock.installChaincode.should.have.been.calledWith(packageRegistryEntry.path, 'peerOne');

            dockerLogsOutputSpy.should.have.been.called;
            logOutputSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'installSmartContract');
            logOutputSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully installed on peer peerOne');
        });

        it('should install the smart contract through the command and connect if no connection', async () => {
            getRuntimeConnectionStub.resetHistory();
            getRuntimeConnectionStub.onFirstCall().returns(undefined);
            const result: PackageRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT);
            result.name.should.equal('vscode-pkg-1@0.0.1');
            fabricRuntimeMock.installChaincode.should.have.been.calledWith(packageRegistryEntry.path, 'peerOne');

            dockerLogsOutputSpy.should.have.been.called;
            logOutputSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'installSmartContract');
            logOutputSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully installed on peer peerOne');
        });

        it('should package and install the smart contract from an open project', async () => {
            showInstallableSmartContractsQuickPickStub.resolves({
                label: 'myContract@0.0.1',
                description: 'Open Project',
                data: {
                    packageEntry: packageRegistryEntry,
                    workspace: undefined
                }
            });

            const packageCommandStub: sinon.SinonStub = executeCommandStub.withArgs(ExtensionCommands.PACKAGE_SMART_CONTRACT);
            packageCommandStub.resolves(packageRegistryEntry);

            const result: PackageRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT);
            result.name.should.equal('vscode-pkg-1@0.0.1');

            packageCommandStub.should.have.been.calledOnce;
            fabricRuntimeMock.installChaincode.should.have.been.calledWith(packageRegistryEntry.path, 'peerOne');

            dockerLogsOutputSpy.should.have.been.called;
            logOutputSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully installed on peer peerOne');
        });

        it('should not show docker logs if not managed runtime', async () => {
            const registryEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
            registryEntry.name = 'myFabric';
            registryEntry.managedRuntime = false;
            environmentRegistryStub.returns(registryEntry);
            const result: PackageRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT);
            result.name.should.equal('vscode-pkg-1@0.0.1');
            fabricRuntimeMock.installChaincode.should.have.been.calledWith(packageRegistryEntry.path, 'peerOne');

            dockerLogsOutputSpy.should.not.have.been.called;
            logOutputSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'installSmartContract');
            logOutputSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully installed on peer peerOne');
        });

        it('should return if cannot make connection', async () => {
            getRuntimeConnectionStub.returns(undefined);
            const result: PackageRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT);
            should.not.exist(result);
            fabricRuntimeMock.installChaincode.should.not.have.been.called;

            logOutputSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'installSmartContract');
        });

        it('should handle choosing peer being cancelled', async () => {
            showPeersQuickPickStub.resolves();

            const result: PackageRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT);
            should.not.exist(result);

            fabricRuntimeMock.installChaincode.should.not.have.been.called;
            dockerLogsOutputSpy.should.not.have.been.called;
        });

        it('should handle error from choosing smart contract', async () => {
            const error: Error = new Error('some error');
            showInstallableSmartContractsQuickPickStub.rejects(error);

            const result: PackageRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT);
            should.not.exist(result);

            fabricRuntimeMock.installChaincode.should.not.have.been.called;
            dockerLogsOutputSpy.should.not.have.been.called;
            logOutputSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'installSmartContract');
            logOutputSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Error installing smart contract: ${error.message}`, `Error installing smart contract: ${error.toString()}`);
        });

        it('should handle error from installing smart contract', async () => {
            const error: Error = new Error('some error');
            fabricRuntimeMock.installChaincode.rejects(error);

            const result: PackageRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT);
            should.not.exist(result);

            fabricRuntimeMock.installChaincode.should.have.been.calledWith(packageRegistryEntry.path, 'peerOne');
            dockerLogsOutputSpy.should.have.been.called;
            logOutputSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'installSmartContract');
            logOutputSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Failed to install on peer peerOne with reason: ${error.message}`, `Failed to install on peer peerOne with reason: ${error.toString()}`);
        });

        it('should still install on other peers if one fails', async () => {
            showPeersQuickPickStub.resolves(['peerOne', 'peerTwo']);

            const error: Error = new Error('some error');
            fabricRuntimeMock.installChaincode.onFirstCall().rejects(error);

            const result: PackageRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT);
            should.not.exist(result);

            fabricRuntimeMock.installChaincode.should.have.been.calledWith(packageRegistryEntry.path, 'peerOne');
            fabricRuntimeMock.installChaincode.should.have.been.calledWith(packageRegistryEntry.path, 'peerTwo');

            dockerLogsOutputSpy.should.have.been.called;
            logOutputSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'installSmartContract');
            logOutputSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Failed to install on peer peerOne with reason: ${error.message}`, `Failed to install on peer peerOne with reason: ${error.toString()}`);
            logOutputSpy.getCall(2).should.have.been.calledWith(LogType.SUCCESS, 'Successfully installed on peer peerTwo');
        });

        it('should handle error from packaging smart contract', async () => {
            showInstallableSmartContractsQuickPickStub.resolves({
                label: 'myContract@0.0.1',
                description: 'Open Project',
                data: {
                    packageEntry: packageRegistryEntry,
                    workspace: undefined
                }
            });
            getRuntimeConnectionStub.onCall(4).returns(null);
            getRuntimeConnectionStub.onCall(5).returns(fabricRuntimeMock);

            const packageCommandStub: sinon.SinonStub = executeCommandStub.withArgs(ExtensionCommands.PACKAGE_SMART_CONTRACT);
            packageCommandStub.resolves();

            const result: PackageRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT);
            should.not.exist(result);

            packageCommandStub.should.have.been.calledOnce;
            logOutputSpy.should.have.been.calledOnce;
            logOutputSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'installSmartContract');

        });

        it('should handle cancel when choosing package', async () => {
            showInstallableSmartContractsQuickPickStub.resolves();

            const result: PackageRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT);
            should.not.exist(result);

            fabricRuntimeMock.installChaincode.should.not.have.been.called;
            dockerLogsOutputSpy.should.not.have.been.called;
        });

        it('should install smart contract through the tree by clicking on + Install in runtime ops view', async () => {
            const result: PackageRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT, installCommandTreeItem);
            result.name.should.equal(packageRegistryEntry.name);

            fabricRuntimeMock.installChaincode.should.have.been.calledWith(packageRegistryEntry.path, 'peerOne');
            dockerLogsOutputSpy.should.have.been.called;
            logOutputSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'installSmartContract');
            logOutputSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully installed on peer peerOne');
        });

        it('should install smart contract through the tree by right-clicking on Installed in runtime ops view', async () => {
            const result: PackageRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT, smartContractsChildren[1]);
            result.name.should.equal(packageRegistryEntry.name);

            fabricRuntimeMock.installChaincode.should.have.been.calledWith(packageRegistryEntry.path, 'peerOne');
            dockerLogsOutputSpy.should.have.been.called;
            logOutputSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'installSmartContract');
            logOutputSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully installed on peer peerOne');
        });

        it('should install smart contract through the tree by right-clicking on a peer in runtime ops view', async () => {
            const result: PackageRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT, peerTreeItem);
            result.name.should.equal(packageRegistryEntry.name);

            fabricRuntimeMock.installChaincode.should.have.been.calledWith(packageRegistryEntry.path, 'peerOne');
            dockerLogsOutputSpy.should.have.been.called;
            logOutputSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'installSmartContract');
            logOutputSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully installed on peer peerOne');
        });

        it('should handle peer failing to install', async () => {
            fabricRuntimeMock.installChaincode.onFirstCall().rejects({ message: 'failed to install for some reason' });

            const result: PackageRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT);
            should.not.exist(result);

            dockerLogsOutputSpy.should.have.been.called;
            logOutputSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'installSmartContract');
            logOutputSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, 'Failed to install on peer peerOne with reason: failed to install for some reason');
        });
    });
});
