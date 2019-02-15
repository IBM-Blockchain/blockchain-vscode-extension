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
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import { PackageRegistryEntry } from '../../src/packages/PackageRegistryEntry';
import { BlockchainTreeItem } from '../../src/explorer/model/BlockchainTreeItem';
import { BlockchainRuntimeExplorerProvider } from '../../src/explorer/BlockchainRuntimeExplorer';
import * as myExtension from '../../src/extension';
import { VSCodeBlockchainOutputAdapter } from '../../src/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../../src/logging/OutputAdapter';
import { FabricRuntimeManager } from '../../src/fabric/FabricRuntimeManager';
import { SmartContractsTreeItem } from '../../src/explorer/runtimeOps/SmartContractsTreeItem';
import { InstallCommandTreeItem } from '../../src/explorer/runtimeOps/InstallCommandTreeItem';
import { NodesTreeItem } from '../../src/explorer/runtimeOps/NodesTreeItem';
import { PeerTreeItem } from '../../src/explorer/runtimeOps/PeerTreeItem';
import { ExtensionCommands } from '../../ExtensionCommands';
import { VSCodeBlockchainDockerOutputAdapter } from '../../src/logging/VSCodeBlockchainDockerOutputAdapter';
import { FabricRuntimeConnection } from '../../src/fabric/FabricRuntimeConnection';

chai.use(sinonChai);
const should: Chai.Should = chai.should();

// tslint:disable no-unused-expression
describe('InstallCommand', () => {

    const TEST_PACKAGE_DIRECTORY: string = path.join(path.dirname(__dirname), '../../test/data/packageDir');

    let mySandBox: sinon.SinonSandbox;

    before(async () => {
        await TestUtil.setupTests();
    });

    describe('InstallSmartContract', () => {
        let fabricRuntimeMock: sinon.SinonStubbedInstance<FabricRuntimeConnection>;

        let executeCommandStub: sinon.SinonStub;
        let packageRegistryEntry: PackageRegistryEntry;
        let getRuntimeConnectionStub: sinon.SinonStub;
        let isRunningStub: sinon.SinonStub;
        let showPeerQuickPickStub: sinon.SinonStub;
        let showInstallableSmartContractsQuickPickStub: sinon.SinonStub;
        let logOutputSpy: sinon.SinonSpy;
        let dockerLogsOutputSpy: sinon.SinonSpy;
        let allChildren: Array<BlockchainTreeItem>;
        let blockchainRuntimeExplorerProvider: BlockchainRuntimeExplorerProvider;
        let installCommandTreeItem: InstallCommandTreeItem;
        let smartContractsChildren: BlockchainTreeItem[];
        let peerTreeItem: PeerTreeItem;

        beforeEach(async () => {
            mySandBox = sinon.createSandbox();
            executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand');
            executeCommandStub.withArgs(ExtensionCommands.CONNECT).resolves();
            executeCommandStub.withArgs(ExtensionCommands.START_FABRIC).resolves();
            executeCommandStub.callThrough();

            fabricRuntimeMock = sinon.createStubInstance(FabricRuntimeConnection);
            fabricRuntimeMock.connect.resolves();
            fabricRuntimeMock.installChaincode.resolves();
            fabricRuntimeMock.getInstalledChaincode.resolves(new Map<string, Array<string>>());
            fabricRuntimeMock.getOrderers.resolves(new Set(['orderer1']));

            const fabricRuntimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
            getRuntimeConnectionStub = mySandBox.stub(fabricRuntimeManager, 'getConnection').resolves((fabricRuntimeMock as any));
            isRunningStub = mySandBox.stub(FabricRuntimeManager.instance().getRuntime(), 'isRunning').resolves(true);

            showPeerQuickPickStub = mySandBox.stub(UserInputUtil, 'showPeerQuickPickBox').resolves('peerOne');

            packageRegistryEntry = new PackageRegistryEntry({
                name: 'vscode-pkg-1@0.0.1',
                path: path.join(TEST_PACKAGE_DIRECTORY, 'vscode-pkg-1@0.0.1.cds'),
                version: '0.0.1'
            });

            showInstallableSmartContractsQuickPickStub = mySandBox.stub(UserInputUtil, 'showInstallableSmartContractsQuickPick').resolves({
                label: 'myContract@0.0.1',
                data: {
                    packageEntry: packageRegistryEntry,
                    workspace: undefined
                }
            });

            logOutputSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
            dockerLogsOutputSpy = mySandBox.spy(VSCodeBlockchainDockerOutputAdapter.instance(), 'show');

            fabricRuntimeMock.getAllPeerNames.returns(['peerOne']);

            fabricRuntimeMock.getAllPeerNames.returns(['peerOne']);
            fabricRuntimeMock.getAllChannelsForPeer.withArgs('peerOne').resolves(['channelOne']);

            fabricRuntimeMock.getInstantiatedChaincode.resolves([]);

            blockchainRuntimeExplorerProvider = myExtension.getBlockchainRuntimeExplorerProvider();
            allChildren = await blockchainRuntimeExplorerProvider.getChildren();

            const smartContracts: SmartContractsTreeItem = allChildren[0] as SmartContractsTreeItem;
            smartContractsChildren = await blockchainRuntimeExplorerProvider.getChildren(smartContracts);
            const installedSmartContractsList: BlockchainTreeItem[] = await blockchainRuntimeExplorerProvider.getChildren(smartContractsChildren[1]);
            installCommandTreeItem = installedSmartContractsList[0] as InstallCommandTreeItem;

            const nodesTreeItem: NodesTreeItem = allChildren[2] as NodesTreeItem;
            const peers: BlockchainTreeItem[] = await blockchainRuntimeExplorerProvider.getChildren(nodesTreeItem);
            peerTreeItem = peers[0] as PeerTreeItem;

        });

        afterEach(async () => {
            await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT);

            mySandBox.restore();
        });

        it('should install the smart contract through the command', async () => {
            await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT);
            fabricRuntimeMock.installChaincode.should.have.been.calledWith(packageRegistryEntry, 'peerOne');

            dockerLogsOutputSpy.should.have.been.called;
            logOutputSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'installSmartContract');
            logOutputSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully installed on peer peerOne');
        });

        it('should install the smart contract with specific package', async () => {
            await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT, null, null, packageRegistryEntry);
            fabricRuntimeMock.installChaincode.should.have.been.calledWith(packageRegistryEntry, 'peerOne');

            dockerLogsOutputSpy.should.have.been.called;
            logOutputSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'installSmartContract');
            logOutputSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully installed on peer peerOne');
        });

        it('should install the smart contract through the command when local fabric is not running', async () => {
            isRunningStub.onCall(4).resolves(false);
            await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT);

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.START_FABRIC);
            fabricRuntimeMock.installChaincode.should.have.been.calledWith(packageRegistryEntry, 'peerOne');
            dockerLogsOutputSpy.should.have.been.called;
            logOutputSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'installSmartContract');
            logOutputSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully installed on peer peerOne');
        });

        it('should stop if the runtime fails to start', async () => {
            isRunningStub.resolves(false);
            await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT);

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.START_FABRIC);
            fabricRuntimeMock.installChaincode.should.not.have.been.called;
            logOutputSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'installSmartContract');
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

            await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT);

            packageCommandStub.should.have.been.calledOnce;
            fabricRuntimeMock.installChaincode.should.have.been.calledWith(packageRegistryEntry, 'peerOne');

            dockerLogsOutputSpy.should.have.been.called;
            logOutputSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully installed on peer peerOne');
        });

        it('should handle choosing peer being cancelled', async () => {
            showPeerQuickPickStub.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT);

            fabricRuntimeMock.installChaincode.should.not.have.been.called;
            dockerLogsOutputSpy.should.not.have.been.called;
        });

        it('should handle error from installing smart contract', async () => {
            fabricRuntimeMock.installChaincode.throws({message: 'some error'});

            await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT);

            fabricRuntimeMock.installChaincode.should.have.been.calledWith(packageRegistryEntry, 'peerOne');
            dockerLogsOutputSpy.should.not.have.been.called;
            logOutputSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'installSmartContract');
            logOutputSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, 'Error installing smart contract: some error');
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

            await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT);

            packageCommandStub.should.have.been.calledOnce;
            logOutputSpy.should.have.been.calledOnce;
            logOutputSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'installSmartContract');

        });

        it('should handle cancel when choosing package', async () => {
            showInstallableSmartContractsQuickPickStub.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT);
            fabricRuntimeMock.installChaincode.should.not.have.been.called;
            dockerLogsOutputSpy.should.not.have.been.called;
        });

        it('should install smart contract through the tree by clicking on + Install in runtime ops view', async () => {
            await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT, installCommandTreeItem);

            fabricRuntimeMock.installChaincode.should.have.been.calledWith(packageRegistryEntry, 'peerOne');
            dockerLogsOutputSpy.should.have.been.called;
            logOutputSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'installSmartContract');
            logOutputSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully installed on peer peerOne');
        });

        it('should install smart contract through the tree by right-clicking on Installed in runtime ops view', async () => {
            await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT, smartContractsChildren[1]);

            fabricRuntimeMock.installChaincode.should.have.been.calledWith(packageRegistryEntry, 'peerOne');
            dockerLogsOutputSpy.should.have.been.called;
            logOutputSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'installSmartContract');
            logOutputSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully installed on peer peerOne');
        });

        it('should install smart contract through the tree by right-clicking on a peer in runtime ops view', async () => {
            await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT, peerTreeItem);

            fabricRuntimeMock.installChaincode.should.have.been.calledWith(packageRegistryEntry, 'peerOne');
            dockerLogsOutputSpy.should.have.been.called;
            logOutputSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'installSmartContract');
            logOutputSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully installed on peer peerOne');
        });

        it('should handle peer failing to install', async () => {
            fabricRuntimeMock.installChaincode.onFirstCall().rejects({message: 'failed to install for some reason'});

            const packageEntry: PackageRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT) as PackageRegistryEntry;

            dockerLogsOutputSpy.should.have.been.called;
            logOutputSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'installSmartContract');
            logOutputSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, 'Failed to install on peer peerOne with reason: failed to install for some reason');

            should.not.exist(packageEntry);
        });
    });
});
