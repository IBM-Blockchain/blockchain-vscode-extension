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
import { TestUtil } from '../TestUtil';
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import { BlockchainTreeItem } from '../../src/explorer/model/BlockchainTreeItem';
import { BlockchainRuntimeExplorerProvider } from '../../src/explorer/runtimeOpsExplorer';
import * as myExtension from '../../src/extension';
import { PackageRegistryEntry } from '../../src/packages/PackageRegistryEntry';
import { Reporter } from '../../src/util/Reporter';
import { FabricRuntimeManager } from '../../src/fabric/FabricRuntimeManager';
import { SmartContractsTreeItem } from '../../src/explorer/runtimeOps/SmartContractsTreeItem';
import { ChannelsOpsTreeItem } from '../../src/explorer/runtimeOps/ChannelsOpsTreeItem';
import { InstalledChainCodeOpsTreeItem } from '../../src/explorer/runtimeOps/InstalledChainCodeOpsTreeItem';
import { ExtensionCommands } from '../../ExtensionCommands';
import { VSCodeBlockchainOutputAdapter } from '../../src/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../../src/logging/OutputAdapter';
import { FabricRuntimeConnection } from '../../src/fabric/FabricRuntimeConnection';

chai.use(sinonChai);
const should: Chai.Should = chai.should();

describe('UpgradeCommand', () => {
    let mySandBox: sinon.SinonSandbox;

    before(async () => {
        await TestUtil.setupTests();
    });

    describe('UpgradeSmartContract', () => {
        let fabricRuntimeMock: sinon.SinonStubbedInstance<FabricRuntimeConnection>;

        let executeCommandStub: sinon.SinonStub;
        let logSpy: sinon.SinonSpy;
        let showChannelQuickPickStub: sinon.SinonStub;
        let showChaincodeAndVersionQuickPick: sinon.SinonStub;
        let showInputBoxStub: sinon.SinonStub;
        let allChildren: Array<BlockchainTreeItem>;
        let reporterStub: sinon.SinonStub;
        let isRunningStub: sinon.SinonStub;
        let blockchainRuntimeExplorerProvider: BlockchainRuntimeExplorerProvider;
        let instantiatedSmartContractsList: BlockchainTreeItem[];
        let smartContractsChildren: BlockchainTreeItem[];
        let channelsChildren: BlockchainTreeItem[];
        let showYesNo: sinon.SinonStub;

        beforeEach(async () => {
            mySandBox = sinon.createSandbox();

            reporterStub = mySandBox.stub(Reporter.instance(), 'sendTelemetryEvent');

            executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand');
            executeCommandStub.withArgs(ExtensionCommands.CONNECT).resolves();
            executeCommandStub.withArgs(ExtensionCommands.START_FABRIC).resolves();
            executeCommandStub.callThrough();

            fabricRuntimeMock = sinon.createStubInstance(FabricRuntimeConnection);
            fabricRuntimeMock.connect.resolves();
            fabricRuntimeMock.instantiateChaincode.resolves();
            fabricRuntimeMock.upgradeChaincode.resolves();

            const fabricRuntimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
            mySandBox.stub(fabricRuntimeManager, 'getConnection').resolves(fabricRuntimeMock);
            isRunningStub = mySandBox.stub(FabricRuntimeManager.instance().getRuntime(), 'isRunning').resolves(true);

            showChannelQuickPickStub = mySandBox.stub(UserInputUtil, 'showChannelQuickPickBox').resolves({
                label: 'channelOne',
                data: ['peerOne']
            });

            showInputBoxStub = mySandBox.stub(UserInputUtil, 'showInputBox');
            showInputBoxStub.onFirstCall().resolves('instantiate');
            showInputBoxStub.onSecondCall().resolves('arg1,arg2,arg3');

            logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');

            fabricRuntimeMock.getAllPeerNames.returns(['peerOne']);

            fabricRuntimeMock.getInstantiatedChaincode.resolves([{ name: 'biscuit-network', version: '0.0.1' }]);

            const map: Map<string, Array<string>> = new Map<string, Array<string>>();
            map.set('channelOne', ['peerOne']);
            fabricRuntimeMock.createChannelMap.resolves(map);

            showChaincodeAndVersionQuickPick = mySandBox.stub(UserInputUtil, 'showChaincodeAndVersionQuickPick').withArgs(sinon.match.any, ['peerOne']).resolves(
                {
                    label: 'biscuit-network@0.0.2',
                    description: 'Packaged',
                    data: {
                        packageEntry: {
                            name: 'biscuit-network',
                            version: '0.0.2',
                            path: undefined
                        }
                    }
                }
            );

            mySandBox.stub(UserInputUtil, 'showRuntimeInstantiatedSmartContractsQuickPick').withArgs('Select the instantiated smart contract to upgrade', 'channelOne').resolves(
                { label: 'biscuit-network@0.0.1', data: { name: 'biscuit-network', channel: 'channelOne', version: '0.0.1' } }
            );

            showYesNo = mySandBox.stub(UserInputUtil, 'showQuickPickYesNo').resolves(UserInputUtil.NO);

            blockchainRuntimeExplorerProvider = myExtension.getBlockchainRuntimeExplorerProvider();
            allChildren = await blockchainRuntimeExplorerProvider.getChildren();
            const smartContracts: SmartContractsTreeItem = allChildren[0] as SmartContractsTreeItem;
            smartContractsChildren = await blockchainRuntimeExplorerProvider.getChildren(smartContracts);
            instantiatedSmartContractsList = await blockchainRuntimeExplorerProvider.getChildren(smartContractsChildren[1]);

            const channels: ChannelsOpsTreeItem = allChildren[1] as ChannelsOpsTreeItem;
            channelsChildren = await blockchainRuntimeExplorerProvider.getChildren(channels);
        });

        afterEach(async () => {
            await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT);
            mySandBox.restore();
        });

        it('should upgrade the smart contract through the command', async () => {
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });

            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT);
            fabricRuntimeMock.upgradeChaincode.should.have.been.calledWith('biscuit-network', '0.0.2', ['peerOne'], 'channelOne', 'instantiate', ['arg1', 'arg2', 'arg3']);
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully upgraded smart contract');
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
        });

        it('should upgrade the smart contract through the command when not connected', async () => {
            isRunningStub.onCall(4).resolves(false);
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });

            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT);

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.START_FABRIC);
            fabricRuntimeMock.upgradeChaincode.should.have.been.calledWith('biscuit-network', '0.0.2', ['peerOne'], 'channelOne', 'instantiate', ['arg1', 'arg2', 'arg3'], undefined);
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully upgraded smart contract');
        });

        it('should upgrade the smart contract through the command when not connected', async () => {
            isRunningStub.resolves(false);
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });

            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT);

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.START_FABRIC);
            fabricRuntimeMock.upgradeChaincode.should.not.have.been.called;
            logSpy.should.have.been.calledOnce;
        });

        it('should upgrade the smart contract through the command with collection', async () => {
            showYesNo.resolves(UserInputUtil.YES);
            mySandBox.stub(UserInputUtil, 'getWorkspaceFolders').returns([]);
            mySandBox.stub(UserInputUtil, 'browse').resolves(path.join('myPath'));
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });

            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT);
            fabricRuntimeMock.upgradeChaincode.should.have.been.calledWith('biscuit-network', '0.0.2', ['peerOne'], 'channelOne', 'instantiate', ['arg1', 'arg2', 'arg3'], path.join('myPath'));
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully upgraded smart contract');
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
        });

        it('should upgrade the smart contract through the command with collection and set dialog folder', async () => {
            showYesNo.resolves(UserInputUtil.YES);

            const workspaceFolder: any = {
                name: 'myFolder',
                uri: vscode.Uri.file('myPath')
            };

            mySandBox.stub(UserInputUtil, 'getWorkspaceFolders').returns([workspaceFolder]);
            const showBrowse: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'browse').resolves(path.join('myPath'));
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });

            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT);

            showBrowse.should.have.been.calledWith(sinon.match.any, sinon.match.any, {
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                openLabel: 'Select',
                defaultUri: vscode.Uri.file(path.join('myPath'))
            });

            fabricRuntimeMock.upgradeChaincode.should.have.been.calledWith('biscuit-network', '0.0.2', ['peerOne'], 'channelOne', 'instantiate', ['arg1', 'arg2', 'arg3'], path.join('myPath'));
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully upgraded smart contract');
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
        });

        it('should handle cancel when choosing if want collection', async () => {
            showYesNo.resolves();
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });

            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT);
            fabricRuntimeMock.upgradeChaincode.should.not.have.been.called;
        });

        it('should handle cancel when choosing collection path', async () => {
            showYesNo.resolves(UserInputUtil.YES);
            mySandBox.stub(UserInputUtil, 'browse').resolves();
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });

            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT);
            fabricRuntimeMock.upgradeChaincode.should.not.have.been.called;
        });

        it('should handle choosing channel being cancelled', async () => {
            showChannelQuickPickStub.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT);

            fabricRuntimeMock.upgradeChaincode.should.not.have.been.called;
        });

        it('should handle error from upgrading smart contract', async () => {
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });
            fabricRuntimeMock.upgradeChaincode.rejects({ message: 'some error' });

            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT);

            fabricRuntimeMock.upgradeChaincode.should.have.been.calledWith('biscuit-network', '0.0.2', ['peerOne'], 'channelOne', 'instantiate', ['arg1', 'arg2', 'arg3'], undefined);
            logSpy.should.have.been.calledWith(LogType.ERROR, 'Error upgrading smart contract: some error');
        });

        it('should handle cancel when choosing chaincode and version', async () => {
            showChaincodeAndVersionQuickPick.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT);
            fabricRuntimeMock.upgradeChaincode.should.not.have.been.called;
        });

        it('should upgrade smart contract through the tree by right-clicking on an instantiated smart contract in the runtime ops view', async () => {

            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });

            instantiatedSmartContractsList.length.should.equal(2);

            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT, instantiatedSmartContractsList[0] as InstalledChainCodeOpsTreeItem);

            fabricRuntimeMock.upgradeChaincode.should.have.been.calledWith('biscuit-network', '0.0.2', ['peerOne'], 'channelOne', 'instantiate', ['arg1', 'arg2', 'arg3'], undefined);

            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully upgraded smart contract');
            reporterStub.should.have.been.calledWith('upgradeCommand');
        });

        it('should upgrade smart contract through the tree by right-clicking on a channel in the runtime ops view', async () => {

            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });

            channelsChildren.length.should.equal(1);

            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT, channelsChildren[0]);

            fabricRuntimeMock.upgradeChaincode.should.have.been.calledWith('biscuit-network', '0.0.2', ['peerOne'], 'channelOne', 'instantiate', ['arg1', 'arg2', 'arg3'], undefined);

            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully upgraded smart contract');
            reporterStub.should.have.been.calledWith('upgradeCommand');
        });

        it('should upgrade the smart contract through the command with no function', async () => {
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });
            showInputBoxStub.onFirstCall().resolves();
            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT);
            fabricRuntimeMock.upgradeChaincode.should.have.been.calledWith('biscuit-network', '0.0.2', ['peerOne'], 'channelOne', undefined, undefined, undefined);
            showInputBoxStub.should.have.been.calledOnce;
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully upgraded smart contract');
        });

        it('should upgrade the smart contract through the command with function but no args', async () => {
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });
            showInputBoxStub.onFirstCall().resolves('instantiate');
            showInputBoxStub.onSecondCall().resolves('');
            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT);
            fabricRuntimeMock.upgradeChaincode.should.have.been.calledWithExactly('biscuit-network', '0.0.2', ['peerOne'], 'channelOne', 'instantiate', [], undefined);
            showInputBoxStub.should.have.been.calledTwice;
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully upgraded smart contract');
        });

        it('should cancel if user escapes during inputting args', async () => {
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });
            showInputBoxStub.onFirstCall().resolves('instantiate');
            showInputBoxStub.onSecondCall().resolves(undefined);
            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT);
            fabricRuntimeMock.upgradeChaincode.should.not.have.been.called;
            showInputBoxStub.should.have.been.calledTwice;
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS, 'Successfully upgraded smart contract');
        });

        it('should install and upgrade package', async () => {
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });

            showChaincodeAndVersionQuickPick.resolves({
                label: 'biscuit-network@0.0.2',
                description: 'Packaged',
                data: {
                    packageEntry: {
                        name: 'biscuit-network',
                        version: '0.0.2',
                        path: undefined
                    },
                    workspace: undefined
                }
            });

            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT);

            fabricRuntimeMock.upgradeChaincode.should.have.been.calledWith('biscuit-network', '0.0.2', ['peerOne'], 'channelOne', 'instantiate', ['arg1', 'arg2', 'arg3'], undefined);
        });

        it('should be able to cancel install and upgrade for package', async () => {
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves();

            showChaincodeAndVersionQuickPick.resolves({
                label: 'biscuit-network@0.0.2',
                description: 'Packaged',
                data: {
                    packageEntry: {
                        name: 'biscuit-network',
                        version: '0.0.2',
                        path: undefined
                    },
                    workspace: undefined
                }
            });

            const packageEntry: PackageRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT) as PackageRegistryEntry;
            should.not.exist(packageEntry);

            fabricRuntimeMock.upgradeChaincode.should.not.been.called;
        });

        it('should package, install and upgrade a project', async () => {
            executeCommandStub.withArgs(ExtensionCommands.PACKAGE_SMART_CONTRACT).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });

            showChaincodeAndVersionQuickPick.resolves({
                label: 'biscuit-network@0.0.2',
                description: 'Open Project',
                data: {
                    packageEntry: {
                        name: 'biscuit-network',
                        version: '0.0.2',
                        path: undefined
                    },
                    workspace: mySandBox.stub()
                }
            });

            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT);

            fabricRuntimeMock.upgradeChaincode.should.have.been.calledWith('biscuit-network', '0.0.2', ['peerOne'], 'channelOne', 'instantiate', ['arg1', 'arg2', 'arg3'], undefined);
        });

        it('should be able to cancel a project packaging, installing and upgrading', async () => {
            executeCommandStub.withArgs(ExtensionCommands.PACKAGE_SMART_CONTRACT).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves();

            showChaincodeAndVersionQuickPick.resolves({
                label: 'biscuit-network@0.0.2',
                description: 'Open Project',
                data: {
                    packageEntry: {
                        name: 'biscuit-network',
                        version: '0.0.2',
                        path: undefined
                    },
                    workspace: mySandBox.stub()
                }
            });

            const packageEntry: PackageRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT) as PackageRegistryEntry;
            should.not.exist(packageEntry);

            fabricRuntimeMock.upgradeChaincode.should.not.been.called;
        });

        it('should upgrade a package if its already installed', async () => {
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, ['peerOne'], { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });

            showChaincodeAndVersionQuickPick.resolves({
                label: 'biscuit-network@0.0.2',
                description: 'Installed',
                data: {
                    packageEntry: {
                        name: 'biscuit-network',
                        version: '0.0.2',
                        path: undefined
                    },
                    workspace: undefined
                }
            });

            await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT);

            fabricRuntimeMock.upgradeChaincode.should.have.been.calledWith('biscuit-network', '0.0.2', ['peerOne'], 'channelOne', 'instantiate', ['arg1', 'arg2', 'arg3'], undefined);
        });

    });
});
