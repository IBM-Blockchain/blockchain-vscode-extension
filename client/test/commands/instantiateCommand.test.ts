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
import { TestUtil } from '../TestUtil';
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import { BlockchainTreeItem } from '../../src/explorer/model/BlockchainTreeItem';
import { BlockchainRuntimeExplorerProvider } from '../../src/explorer/runtimeOpsExplorer';
import * as myExtension from '../../src/extension';
import { PackageRegistryEntry } from '../../src/packages/PackageRegistryEntry';
import { VSCodeBlockchainOutputAdapter } from '../../src/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../../src/logging/OutputAdapter';
import { FabricRuntimeManager } from '../../src/fabric/FabricRuntimeManager';
import { SmartContractsTreeItem } from '../../src/explorer/runtimeOps/SmartContractsTreeItem';
import { InstallCommandTreeItem } from '../../src/explorer/runtimeOps/InstallCommandTreeItem';
import { ChannelsOpsTreeItem } from '../../src/explorer/runtimeOps/ChannelsOpsTreeItem';
import { ExtensionCommands } from '../../ExtensionCommands';
import { VSCodeBlockchainDockerOutputAdapter } from '../../src/logging/VSCodeBlockchainDockerOutputAdapter';
import { FabricRuntimeConnection } from '../../src/fabric/FabricRuntimeConnection';

const should: Chai.Should = chai.should();
chai.use(sinonChai);

describe('InstantiateCommand', () => {
    let mySandBox: sinon.SinonSandbox;

    before(async () => {
        await TestUtil.setupTests();
    });

    describe('InstantiateSmartContract', () => {
        let fabricRuntimeMock: sinon.SinonStubbedInstance<FabricRuntimeConnection>;

        let executeCommandStub: sinon.SinonStub;
        let logSpy: sinon.SinonSpy;
        let dockerLogsOutputSpy: sinon.SinonSpy;
        let showChannelQuickPickStub: sinon.SinonStub;
        let showChaincodeAndVersionQuickPick: sinon.SinonStub;
        let showInputBoxStub: sinon.SinonStub;
        let isRunningStub: sinon.SinonStub;

        let allChildren: Array<BlockchainTreeItem>;
        let blockchainRuntimeExplorerProvider: BlockchainRuntimeExplorerProvider;
        let instantiateCommandTreeItem: InstallCommandTreeItem;
        let smartContractsChildren: BlockchainTreeItem[];
        let channelsChildren: BlockchainTreeItem[];

        beforeEach(async () => {
            mySandBox = sinon.createSandbox();
            executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand');
            executeCommandStub.withArgs(ExtensionCommands.CONNECT).resolves();
            executeCommandStub.withArgs(ExtensionCommands.START_FABRIC).resolves();
            executeCommandStub.callThrough();

            fabricRuntimeMock = sinon.createStubInstance(FabricRuntimeConnection);
            fabricRuntimeMock.connect.resolves();
            fabricRuntimeMock.instantiateChaincode.resolves();

            const fabricRuntimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
            mySandBox.stub(fabricRuntimeManager, 'getConnection').resolves((fabricRuntimeMock));
            isRunningStub = mySandBox.stub(FabricRuntimeManager.instance().getRuntime(), 'isRunning').resolves(true);

            showChannelQuickPickStub = mySandBox.stub(UserInputUtil, 'showChannelQuickPickBox').resolves({
                label: 'myChannel',
                data: ['peerOne']
            });

            showChaincodeAndVersionQuickPick = mySandBox.stub(UserInputUtil, 'showChaincodeAndVersionQuickPick').withArgs(sinon.match.any, ['peerOne']).resolves(
                {
                    label: 'myContract@0.0.1',
                    data: {
                        packageEntry: {
                            name: 'myContract',
                            version: '0.0.1',
                            path: undefined
                        } as PackageRegistryEntry,
                        workspace: undefined
                    }
                }
            );

            showInputBoxStub = mySandBox.stub(UserInputUtil, 'showInputBox');
            showInputBoxStub.onFirstCall().resolves('instantiate');
            showInputBoxStub.onSecondCall().resolves('arg1,arg2,arg3');

            logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
            dockerLogsOutputSpy = mySandBox.spy(VSCodeBlockchainDockerOutputAdapter.instance(), 'show');

            fabricRuntimeMock.getAllPeerNames.returns(['peerOne']);

            fabricRuntimeMock.getAllPeerNames.returns(['peerOne']);
            fabricRuntimeMock.getAllChannelsForPeer.withArgs('peerOne').resolves(['myChannel']);

            fabricRuntimeMock.getInstantiatedChaincode.resolves([]);
            const map: Map<string, Array<string>> = new Map<string, Array<string>>();
            map.set('myChannel', ['peerOne']);
            fabricRuntimeMock.createChannelMap.resolves(map);

            blockchainRuntimeExplorerProvider = myExtension.getBlockchainRuntimeExplorerProvider();
            allChildren = await blockchainRuntimeExplorerProvider.getChildren();

            const smartContracts: SmartContractsTreeItem = allChildren[0] as SmartContractsTreeItem;
            smartContractsChildren = await blockchainRuntimeExplorerProvider.getChildren(smartContracts);
            const instantiatedSmartContractsList: BlockchainTreeItem[] = await blockchainRuntimeExplorerProvider.getChildren(smartContractsChildren[0]);
            instantiateCommandTreeItem = instantiatedSmartContractsList[0] as InstallCommandTreeItem;

            const channels: ChannelsOpsTreeItem = allChildren[1] as ChannelsOpsTreeItem;
            channelsChildren = await blockchainRuntimeExplorerProvider.getChildren(channels);
        });

        afterEach(async () => {
            await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT);
            mySandBox.restore();
        });

        it('should instantiate the smart contract through the command', async () => {
            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT);
            fabricRuntimeMock.instantiateChaincode.should.have.been.calledWith('myContract', '0.0.1', ['peerOne'], 'myChannel', 'instantiate', ['arg1', 'arg2', 'arg3']);

            dockerLogsOutputSpy.should.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully instantiated smart contract');
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
        });

        it('should instantiate the smart contract through the command when not connected', async () => {
            isRunningStub.onCall(4).resolves(false);
            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT);

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.START_FABRIC);
            fabricRuntimeMock.instantiateChaincode.should.have.been.calledWith('myContract', '0.0.1', ['peerOne'], 'myChannel', 'instantiate', ['arg1', 'arg2', 'arg3']);

            dockerLogsOutputSpy.should.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully instantiated smart contract');
        });

        it('should stop if starting the local_fabric fails', async () => {
            isRunningStub.resolves(false);
            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT);

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.START_FABRIC);
            fabricRuntimeMock.instantiateChaincode.should.not.have.been.called;

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
        });

        it('should handle choosing channel being cancelled', async () => {
            showChannelQuickPickStub.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT);

            fabricRuntimeMock.instantiateChaincode.should.not.have.been.called;
            dockerLogsOutputSpy.should.not.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            should.not.exist(logSpy.getCall(1));
        });

        it('should handle error from instantiating smart contract', async () => {
            const error: Error = new Error('some error');

            fabricRuntimeMock.instantiateChaincode.rejects(error);

            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT);

            fabricRuntimeMock.instantiateChaincode.should.have.been.calledWith('myContract', '0.0.1', ['peerOne'], 'myChannel', 'instantiate', ['arg1', 'arg2', 'arg3']);

            dockerLogsOutputSpy.should.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Error instantiating smart contract: ${error.message}`, `Error instantiating smart contract: ${error.toString()}`);
        });

        it('should handle cancel when choosing chaincode and version', async () => {
            showChaincodeAndVersionQuickPick.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT);
            fabricRuntimeMock.instantiateChaincode.should.not.have.been.called;

            dockerLogsOutputSpy.should.not.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            should.not.exist(logSpy.getCall(1));
        });

        it('should instantiate smart contract through the tree by clicking + Instantiate in the runtime ops view', async () => {
            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT, instantiateCommandTreeItem);

            fabricRuntimeMock.instantiateChaincode.should.have.been.calledWith('myContract', '0.0.1', ['peerOne'], 'myChannel', 'instantiate', ['arg1', 'arg2', 'arg3']);

            dockerLogsOutputSpy.should.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully instantiated smart contract');
        });

        it('should instantiate smart contract through the tree by right-clicking Instantiated in the runtime ops view', async () => {
            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT, smartContractsChildren[0]);

            fabricRuntimeMock.instantiateChaincode.should.have.been.calledWith('myContract', '0.0.1', ['peerOne'], 'myChannel', 'instantiate', ['arg1', 'arg2', 'arg3']);

            dockerLogsOutputSpy.should.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully instantiated smart contract');
        });

        it('should instantiate smart contract through the tree by right-clicking on channel in the runtime ops view', async () => {
            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT, channelsChildren[0]);

            fabricRuntimeMock.instantiateChaincode.should.have.been.calledWith('myContract', '0.0.1', ['peerOne'], 'myChannel', 'instantiate', ['arg1', 'arg2', 'arg3']);

            dockerLogsOutputSpy.should.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully instantiated smart contract');
        });

        it('should instantiate the smart contract through the command with no function', async () => {
            showInputBoxStub.onFirstCall().resolves();
            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT);
            fabricRuntimeMock.instantiateChaincode.should.have.been.calledWithExactly('myContract', '0.0.1', ['peerOne'], 'myChannel', undefined, undefined);
            showInputBoxStub.should.have.been.calledOnce;

            dockerLogsOutputSpy.should.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully instantiated smart contract');
        });

        it('should instantiate the smart contract through the command with function but no args', async () => {
            showInputBoxStub.onFirstCall().resolves('instantiate');
            showInputBoxStub.onSecondCall().resolves('');
            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT);
            fabricRuntimeMock.instantiateChaincode.should.have.been.calledWithExactly('myContract', '0.0.1', ['peerOne'], 'myChannel', 'instantiate', []);
            showInputBoxStub.should.have.been.calledTwice;

            dockerLogsOutputSpy.should.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully instantiated smart contract');
        });

        it('should cancel instantiating when user escape entering args', async () => {
            showInputBoxStub.onFirstCall().resolves('instantiate');
            showInputBoxStub.onSecondCall().resolves(undefined);
            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT);
            fabricRuntimeMock.instantiateChaincode.should.not.have.been.called;
            showInputBoxStub.should.have.been.calledTwice;

            dockerLogsOutputSpy.should.not.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS, 'Successfully instantiated smart contract');
        });

        it('should install and instantiate package', async () => {
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'somepackage', version: '0.0.1', path: undefined }).resolves({ name: 'somepackage', version: '0.0.1', path: undefined });

            showChaincodeAndVersionQuickPick.resolves({
                label: 'somepackage@0.0.1',
                description: 'Packaged',
                data: {
                    packageEntry: {
                        name: 'somepackage',
                        version: '0.0.1',
                        path: undefined
                    },
                    workspace: undefined
                }
            });

            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT);

            fabricRuntimeMock.instantiateChaincode.should.have.been.calledWith('somepackage', '0.0.1', ['peerOne'], 'myChannel', 'instantiate', ['arg1', 'arg2', 'arg3']);

            dockerLogsOutputSpy.should.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully instantiated smart contract');
        });

        it('should be able to cancel install and instantiate for package', async () => {
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'somepackage', version: '0.0.1', path: undefined }).resolves();

            showChaincodeAndVersionQuickPick.resolves({
                label: 'somepackage@0.0.1',
                description: 'Packaged',
                data: {
                    packageEntry: {
                        name: 'somepackage',
                        version: '0.0.1',
                        path: undefined
                    },
                    workspace: undefined
                }
            });

            const packageEntry: PackageRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT) as PackageRegistryEntry;
            should.not.exist(packageEntry);

            fabricRuntimeMock.instantiateChaincode.should.not.been.calledWith('somepackage', '0.0.1', ['peerOne'], 'myChannel', 'instantiate', ['arg1', 'arg2', 'arg3']);
            dockerLogsOutputSpy.should.not.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            should.not.exist(logSpy.getCall(1));
        });

        it('should package, install and instantiate a project', async () => {
            executeCommandStub.withArgs(ExtensionCommands.PACKAGE_SMART_CONTRACT).resolves({ name: 'somepackage', version: '0.0.1', path: undefined });
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'somepackage', version: '0.0.1', path: undefined }).resolves({ name: 'somepackage', version: '0.0.1', path: undefined });

            showChaincodeAndVersionQuickPick.resolves({
                label: 'somepackage@0.0.1',
                description: 'Open Project',
                data: {
                    packageEntry: undefined,
                    workspace: mySandBox.stub()
                }
            });

            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT);

            fabricRuntimeMock.instantiateChaincode.should.have.been.calledWith('somepackage', '0.0.1', ['peerOne'], 'myChannel', 'instantiate', ['arg1', 'arg2', 'arg3']);

            dockerLogsOutputSpy.should.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully instantiated smart contract');
        });

        it('should be able to cancel a project packaging, installing and instantiating', async () => {
            executeCommandStub.withArgs(ExtensionCommands.PACKAGE_SMART_CONTRACT).resolves({ name: 'somepackage', version: '0.0.1', path: undefined });
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'somepackage', version: '0.0.1', path: undefined }).resolves();

            showChaincodeAndVersionQuickPick.resolves({
                label: 'somepackage@0.0.1',
                description: 'Open Project',
                data: {
                    packageEntry: undefined,
                    workspace: mySandBox.stub()
                }
            });

            const packageEntry: PackageRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT) as PackageRegistryEntry;
            should.not.exist(packageEntry);

            fabricRuntimeMock.instantiateChaincode.should.not.been.calledWith('somepackage', '0.0.1', ['peerOne'], 'myChannel', 'instantiate', ['arg1', 'arg2', 'arg3']);
            dockerLogsOutputSpy.should.not.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            should.not.exist(logSpy.getCall(1));
        });

        it('should be able to handle a project failing to package', async () => {
            executeCommandStub.withArgs(ExtensionCommands.PACKAGE_SMART_CONTRACT).resolves();

            showChaincodeAndVersionQuickPick.resolves({
                label: 'somepackage@0.0.1',
                description: 'Open Project',
                data: {
                    packageEntry: undefined,
                    workspace: mySandBox.stub()
                }
            });

            const packageEntry: PackageRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT) as PackageRegistryEntry;
            should.not.exist(packageEntry);

            fabricRuntimeMock.instantiateChaincode.should.not.been.called;
            logSpy.should.have.been.calledOnce;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
        });

    });
});
