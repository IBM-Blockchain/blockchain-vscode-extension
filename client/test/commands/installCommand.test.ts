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
// tslint:disable no-unused-expression
import * as vscode from 'vscode';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as path from 'path';
import { FabricClientConnection } from '../../src/fabric/FabricClientConnection';
import { TestUtil } from '../TestUtil';
import { FabricConnectionManager } from '../../src/fabric/FabricConnectionManager';
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import { PackageRegistryEntry } from '../../src/packages/PackageRegistryEntry';
import { BlockchainTreeItem } from '../../src/explorer/model/BlockchainTreeItem';
import { BlockchainRuntimeExplorerProvider } from '../../src/explorer/BlockchainRuntimeExplorer';
import * as myExtension from '../../src/extension';
import { FabricConnection } from '../../src/fabric/FabricConnection';
import { VSCodeOutputAdapter } from '../../src/logging/VSCodeOutputAdapter';
import { FabricGatewayRegistryEntry } from '../../src/fabric/FabricGatewayRegistryEntry';
import { LogType } from '../../src/logging/OutputAdapter';
import { FabricRuntimeManager } from '../../src/fabric/FabricRuntimeManager';
import { SmartContractsTreeItem } from '../../src/explorer/runtimeOps/SmartContractsTreeItem';
import { InstallCommandTreeItem } from '../../src/explorer/runtimeOps/InstallCommandTreeItem';
import { NodesTreeItem } from '../../src/explorer/runtimeOps/NodesTreeItem';
import { PeerTreeItem } from '../../src/explorer/runtimeOps/PeerTreeItem';
import { ExtensionCommands } from '../../ExtensionCommands';

chai.use(sinonChai);
const should: Chai.Should = chai.should();

describe('InstallCommand', () => {

    const TEST_PACKAGE_DIRECTORY: string = path.join(path.dirname(__dirname), '../../test/data/packageDir');

    let mySandBox: sinon.SinonSandbox;

    before(async () => {
        await TestUtil.setupTests();
    });

    describe('InstallSmartContract', () => {
        let fabricClientConnectionMock: sinon.SinonStubbedInstance<FabricClientConnection>;

        let executeCommandStub: sinon.SinonStub;
        let packageRegistryEntry: PackageRegistryEntry;
        let getConnectionStub: sinon.SinonStub;
        let getRuntimeConnectionStub: sinon.SinonStub;
        let isRunningStub: sinon.SinonStub;
        let showPeerQuickPickStub: sinon.SinonStub;
        let showInstallableSmartContractsQuickPickStub: sinon.SinonStub;
        let logOutputSpy: sinon.SinonSpy;
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

            fabricClientConnectionMock = sinon.createStubInstance(FabricClientConnection);
            fabricClientConnectionMock.connect.resolves();
            fabricClientConnectionMock.installChaincode.resolves();
            fabricClientConnectionMock.getInstalledChaincode.resolves(new Map<string, Array<string>>());
            const fabricConnectionManager: FabricConnectionManager = FabricConnectionManager.instance();
            getConnectionStub = mySandBox.stub(fabricConnectionManager, 'getConnection').returns((fabricClientConnectionMock as any) as FabricConnection );

            const fabricRuntimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
            getRuntimeConnectionStub = mySandBox.stub(fabricRuntimeManager, 'getConnection').resolves((fabricClientConnectionMock as any) as FabricConnection );
            isRunningStub = mySandBox.stub(FabricRuntimeManager.instance().get('local_fabric'), 'isRunning').resolves(true);

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

            logOutputSpy = mySandBox.spy(VSCodeOutputAdapter.instance(), 'log');

            fabricClientConnectionMock.getAllPeerNames.returns(['peerOne']);

            fabricClientConnectionMock.getAllPeerNames.returns(['peerOne']);
            fabricClientConnectionMock.getAllChannelsForPeer.withArgs('peerOne').resolves(['channelOne']);

            fabricClientConnectionMock.getInstantiatedChaincode.resolves([]);

            const registryEntry: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
            registryEntry.name = 'myConnection';
            registryEntry.connectionProfilePath = 'myPath';
            registryEntry.managedRuntime = false;
            mySandBox.stub(FabricConnectionManager.instance(), 'getGatewayRegistryEntry').returns(registryEntry);

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
            fabricClientConnectionMock.installChaincode.should.have.been.calledWith(packageRegistryEntry, 'peerOne');
            logOutputSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'installSmartContract');
            logOutputSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully installed on peer peerOne');
        });

        it('should install the smart contract with specific package', async () => {
            await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT, null, null, packageRegistryEntry);
            fabricClientConnectionMock.installChaincode.should.have.been.calledWith(packageRegistryEntry, 'peerOne');
            logOutputSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'installSmartContract');
            logOutputSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully installed on peer peerOne');
        });

        it('should install the smart contract through the command when local fabric not running', async () => {
            isRunningStub.resolves(false);
            await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT);

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.START_FABRIC);
            fabricClientConnectionMock.installChaincode.should.have.been.calledWith(packageRegistryEntry, 'peerOne');
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

            await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT);

            packageCommandStub.should.have.been.calledOnce;
            fabricClientConnectionMock.installChaincode.should.have.been.calledWith(packageRegistryEntry, 'peerOne');
            logOutputSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully installed on peer peerOne');
        });

        it('should handle choosing peer being cancelled', async () => {
            showPeerQuickPickStub.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT);

            fabricClientConnectionMock.installChaincode.should.not.have.been.called;
        });

        it('should handle error from installing smart contract', async () => {
            fabricClientConnectionMock.installChaincode.throws({message: 'some error'});

            await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT).should.be.rejectedWith(`some error`);

            fabricClientConnectionMock.installChaincode.should.have.been.calledWith(packageRegistryEntry, 'peerOne');
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
            getConnectionStub.onCall(4).returns(null);
            getConnectionStub.onCall(5).returns(fabricClientConnectionMock);
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
            fabricClientConnectionMock.installChaincode.should.not.have.been.called;
        });

        it('should install smart contract through the tree by clicking on + Install in runtime ops view', async () => {
            await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT, installCommandTreeItem);

            fabricClientConnectionMock.installChaincode.should.have.been.calledWith(packageRegistryEntry, 'peerOne');
            logOutputSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'installSmartContract');
            logOutputSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully installed on peer peerOne');
        });

        it('should install smart contract through the tree by right-clicking on Installed in runtime ops view', async () => {
            await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT, smartContractsChildren[1]);

            fabricClientConnectionMock.installChaincode.should.have.been.calledWith(packageRegistryEntry, 'peerOne');
            logOutputSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'installSmartContract');
            logOutputSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully installed on peer peerOne');
        });

        it('should install smart contract through the tree by right-clicking on a peer in runtime ops view', async () => {
            await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT, peerTreeItem);

            fabricClientConnectionMock.installChaincode.should.have.been.calledWith(packageRegistryEntry, 'peerOne');
            logOutputSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'installSmartContract');
            logOutputSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully installed on peer peerOne');
        });

        it('should handle peer failing to install', async () => {
            fabricClientConnectionMock.installChaincode.onFirstCall().rejects({message: 'failed to install for some reason'});

            const packageEntry: PackageRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT) as PackageRegistryEntry;

            logOutputSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'installSmartContract');

            logOutputSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, 'Failed to install on peer peerOne with reason: failed to install for some reason');

            should.not.exist(packageEntry);
        });
    });
});
