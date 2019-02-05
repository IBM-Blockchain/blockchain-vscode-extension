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
import { FabricClientConnection } from '../../src/fabric/FabricClientConnection';
import { FabricConnectionRegistryEntry } from '../../src/fabric/FabricConnectionRegistryEntry';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { TestUtil } from '../TestUtil';
import { FabricConnectionManager } from '../../src/fabric/FabricConnectionManager';
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import { BlockchainTreeItem } from '../../src/explorer/model/BlockchainTreeItem';
import { BlockchainRuntimeExplorerProvider } from '../../src/explorer/BlockchainRuntimeExplorer';
import * as myExtension from '../../src/extension';
import { ChannelTreeItem } from '../../src/explorer/model/ChannelTreeItem';
import { PackageRegistryEntry } from '../../src/packages/PackageRegistryEntry';
import { Reporter } from '../../src/util/Reporter';
import { FabricRuntimeManager } from '../../src/fabric/FabricRuntimeManager';
import { SmartContractsTreeItem } from '../../src/explorer/runtimeOps/SmartContractsTreeItem';
import { ChannelsOpsTreeItem } from '../../src/explorer/runtimeOps/ChannelsOpsTreeItem';
import { InstalledChainCodeOpsTreeItem } from '../../src/explorer/runtimeOps/InstalledChainCodeOpsTreeItem';

chai.use(sinonChai);
const should: Chai.Should = chai.should();

describe('UpgradeCommand', () => {
    let mySandBox: sinon.SinonSandbox;

    before(async () => {
        await TestUtil.setupTests();
    });

    describe('UpgradeSmartContract', () => {
        let fabricClientConnectionMock: sinon.SinonStubbedInstance<FabricClientConnection>;

        let executeCommandStub: sinon.SinonStub;
        let successSpy: sinon.SinonSpy;
        let errorSpy: sinon.SinonSpy;
        let getConnectionStub: sinon.SinonStub;
        let showChannelQuickPickStub: sinon.SinonStub;
        let showChaincodeAndVersionQuickPick: sinon.SinonStub;
        let showInputBoxStub: sinon.SinonStub;
        let showInstantiatedSmartContractsQuickPick: sinon.SinonStub;
        let allChildren: Array<BlockchainTreeItem>;
        let reporterStub: sinon.SinonStub;
        let getRuntimeConnectionStub: sinon.SinonStub;
        let isRunningStub: sinon.SinonStub;
        let blockchainRuntimeExplorerProvider: BlockchainRuntimeExplorerProvider;
        let instantiatedSmartContractsList: BlockchainTreeItem[];
        let smartContractsChildren: BlockchainTreeItem[];
        let channelsChildren: BlockchainTreeItem[];

        beforeEach(async () => {
            mySandBox = sinon.createSandbox();

            reporterStub = mySandBox.stub(Reporter.instance(), 'sendTelemetryEvent');

            executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand');
            executeCommandStub.withArgs('blockchainConnectionsExplorer.connectEntry').resolves();
            executeCommandStub.withArgs('blockchainExplorer.startFabricRuntime').resolves();
            executeCommandStub.callThrough();

            fabricClientConnectionMock = sinon.createStubInstance(FabricClientConnection);
            fabricClientConnectionMock.connect.resolves();
            fabricClientConnectionMock.instantiateChaincode.resolves();
            fabricClientConnectionMock.upgradeChaincode.resolves();
            const fabricConnectionManager: FabricConnectionManager = FabricConnectionManager.instance();
            getConnectionStub = mySandBox.stub(fabricConnectionManager, 'getConnection').returns(fabricClientConnectionMock);

            const fabricRuntimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
            getRuntimeConnectionStub = mySandBox.stub(fabricRuntimeManager, 'getConnection').resolves(fabricClientConnectionMock);
            isRunningStub = mySandBox.stub(FabricRuntimeManager.instance().get('local_fabric'), 'isRunning').resolves(true);

            showChannelQuickPickStub = mySandBox.stub(UserInputUtil, 'showChannelQuickPickBox').resolves({
                label: 'channelOne',
                data: new Set(['peerOne'])
            });

            showInputBoxStub = mySandBox.stub(UserInputUtil, 'showInputBox');
            showInputBoxStub.onFirstCall().resolves('instantiate');
            showInputBoxStub.onSecondCall().resolves('arg1,arg2,arg3');

            successSpy = mySandBox.spy(vscode.window, 'showInformationMessage');
            errorSpy = mySandBox.spy(vscode.window, 'showErrorMessage');

            fabricClientConnectionMock.getAllPeerNames.returns(['peerOne']);

            fabricClientConnectionMock.getAllPeerNames.returns(['peerOne']);
            fabricClientConnectionMock.getAllChannelsForPeer.withArgs('peerOne').resolves(['channelOne']);

            fabricClientConnectionMock.getInstantiatedChaincode.resolves([{ name: 'biscuit-network', version: '0.0.1' }]);

            fabricClientConnectionMock.getMetadata.resolves({
                contracts: {
                    'my-contract' : {
                        name: 'my-contract',
                        transactions: [],
                    }
                }
            });

            const registryEntry: FabricConnectionRegistryEntry = new FabricConnectionRegistryEntry();
            registryEntry.name = 'myConnection';
            registryEntry.connectionProfilePath = 'myPath';
            registryEntry.managedRuntime = false;
            mySandBox.stub(FabricConnectionManager.instance(), 'getConnectionRegistryEntry').returns(registryEntry);

            showChaincodeAndVersionQuickPick = mySandBox.stub(UserInputUtil, 'showChaincodeAndVersionQuickPick').withArgs(sinon.match.any, new Set(['peerOne'])).resolves(
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

            showInstantiatedSmartContractsQuickPick = mySandBox.stub(UserInputUtil, 'showInstantiatedSmartContractsQuickPick').withArgs('Select the instantiated smart contract to upgrade', 'channelOne').resolves(
                { label: 'biscuit-network@0.0.1', data: { name: 'biscuit-network', channel: 'channelOne', version: '0.0.1' } }
            );

            blockchainRuntimeExplorerProvider = myExtension.getBlockchainRuntimeExplorerProvider();
            allChildren = await blockchainRuntimeExplorerProvider.getChildren();
            const smartContracts: SmartContractsTreeItem = allChildren[0] as SmartContractsTreeItem;
            smartContractsChildren = await blockchainRuntimeExplorerProvider.getChildren(smartContracts);
            instantiatedSmartContractsList = await blockchainRuntimeExplorerProvider.getChildren(smartContractsChildren[0]);

            const channels: ChannelsOpsTreeItem = allChildren[1] as ChannelsOpsTreeItem;
            channelsChildren = await blockchainRuntimeExplorerProvider.getChildren(channels);
        });

        afterEach(async () => {
            await vscode.commands.executeCommand('blockchainConnectionsExplorer.disconnectEntry');
            mySandBox.restore();
        });

        it('should upgrade the smart contract through the command', async () => {
            executeCommandStub.withArgs('blockchainExplorer.installSmartContractEntry', undefined, new Set(['peerOne']), { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });

            await vscode.commands.executeCommand('blockchainExplorer.upgradeSmartContractEntry');
            fabricClientConnectionMock.upgradeChaincode.should.have.been.calledWith('biscuit-network', '0.0.2', 'channelOne', 'instantiate', ['arg1', 'arg2', 'arg3']);
            successSpy.should.have.been.calledWith('Successfully upgraded smart contract');
            executeCommandStub.should.have.been.calledWith('blockchainConnectionsExplorer.refreshEntry');
        });

        it('should upgrade the smart contract through the command when not connected', async () => {
            isRunningStub.resolves(false);
            executeCommandStub.withArgs('blockchainExplorer.installSmartContractEntry', undefined, new Set(['peerOne']), { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });

            await vscode.commands.executeCommand('blockchainExplorer.upgradeSmartContractEntry');

            executeCommandStub.should.have.been.calledWith('blockchainExplorer.startFabricRuntime');
            fabricClientConnectionMock.upgradeChaincode.should.have.been.calledWith('biscuit-network', '0.0.2', 'channelOne', 'instantiate', ['arg1', 'arg2', 'arg3']);
            successSpy.should.have.been.calledWith('Successfully upgraded smart contract');
        });

        it('should handle choosing channel being cancelled', async () => {
            showChannelQuickPickStub.resolves();

            await vscode.commands.executeCommand('blockchainExplorer.upgradeSmartContractEntry');

            fabricClientConnectionMock.upgradeChaincode.should.not.have.been.called;
        });

        it('should handle error from upgrading smart contract', async () => {
            executeCommandStub.withArgs('blockchainExplorer.installSmartContractEntry', undefined, new Set(['peerOne']), { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });
            fabricClientConnectionMock.upgradeChaincode.rejects({ message: 'some error' });

            await vscode.commands.executeCommand('blockchainExplorer.upgradeSmartContractEntry').should.be.rejectedWith(`some error`);

            fabricClientConnectionMock.upgradeChaincode.should.have.been.calledWith('biscuit-network', '0.0.2', 'channelOne', 'instantiate', ['arg1', 'arg2', 'arg3']);
            errorSpy.should.have.been.calledWith('Error upgrading smart contract: some error');
        });

        it('should handle cancel when choosing chaincode and version', async () => {
            showChaincodeAndVersionQuickPick.resolves();

            await vscode.commands.executeCommand('blockchainExplorer.upgradeSmartContractEntry');
            fabricClientConnectionMock.upgradeChaincode.should.not.have.been.called;
        });

        it('should upgrade smart contract through the tree by right-clicking on an instantiated smart contract in the runtime ops view', async () => {

            executeCommandStub.withArgs('blockchainExplorer.installSmartContractEntry', undefined, new Set(['peerOne']), { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });

            instantiatedSmartContractsList.length.should.equal(2);

            await vscode.commands.executeCommand('blockchainExplorer.upgradeSmartContractEntry', instantiatedSmartContractsList[0] as InstalledChainCodeOpsTreeItem);

            fabricClientConnectionMock.upgradeChaincode.should.have.been.calledWith('biscuit-network', '0.0.2', 'channelOne', 'instantiate', ['arg1', 'arg2', 'arg3']);

            successSpy.should.have.been.calledWith('Successfully upgraded smart contract');
            reporterStub.should.have.been.calledWith('upgradeCommand');
        });

        it('should upgrade smart contract through the tree by right-clicking on a channel in the runtime ops view', async () => {

            executeCommandStub.withArgs('blockchainExplorer.installSmartContractEntry', undefined, new Set(['peerOne']), { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });

            channelsChildren.length.should.equal(1);

            await vscode.commands.executeCommand('blockchainExplorer.upgradeSmartContractEntry', channelsChildren[0]);

            fabricClientConnectionMock.upgradeChaincode.should.have.been.calledWith('biscuit-network', '0.0.2', 'channelOne', 'instantiate', ['arg1', 'arg2', 'arg3']);

            successSpy.should.have.been.calledWith('Successfully upgraded smart contract');
            reporterStub.should.have.been.calledWith('upgradeCommand');
        });

        it('should upgrade the smart contract through the command with no function', async () => {
            executeCommandStub.withArgs('blockchainExplorer.installSmartContractEntry', undefined, new Set(['peerOne']), { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });
            showInputBoxStub.onFirstCall().resolves();
            await vscode.commands.executeCommand('blockchainExplorer.upgradeSmartContractEntry');
            fabricClientConnectionMock.upgradeChaincode.should.have.been.calledWith('biscuit-network', '0.0.2', 'channelOne', undefined, undefined);
            showInputBoxStub.should.have.been.calledOnce;
            successSpy.should.have.been.calledWith('Successfully upgraded smart contract');
        });

        it('should upgrade the smart contract through the command with function but no args', async () => {
            executeCommandStub.withArgs('blockchainExplorer.installSmartContractEntry', undefined, new Set(['peerOne']), { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });
            showInputBoxStub.onFirstCall().resolves('instantiate');
            showInputBoxStub.onSecondCall().resolves();
            await vscode.commands.executeCommand('blockchainExplorer.upgradeSmartContractEntry');
            fabricClientConnectionMock.upgradeChaincode.should.have.been.calledWithExactly('biscuit-network', '0.0.2', 'channelOne', 'instantiate', undefined);
            showInputBoxStub.should.have.been.calledTwice;
            successSpy.should.have.been.calledWith('Successfully upgraded smart contract');
        });

        it('should install and upgrade package', async () => {
            executeCommandStub.withArgs('blockchainExplorer.installSmartContractEntry', undefined, new Set(['peerOne']), { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });

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

            await vscode.commands.executeCommand('blockchainExplorer.upgradeSmartContractEntry');

            fabricClientConnectionMock.upgradeChaincode.should.have.been.calledWith('biscuit-network', '0.0.2', 'channelOne', 'instantiate', ['arg1', 'arg2', 'arg3']);
        });

        it('should be able to cancel install and upgrade for package', async () => {
            executeCommandStub.withArgs('blockchainExplorer.installSmartContractEntry', undefined, new Set(['peerOne']), { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves();

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

            const packageEntry: PackageRegistryEntry = await vscode.commands.executeCommand('blockchainExplorer.upgradeSmartContractEntry') as PackageRegistryEntry;
            should.not.exist(packageEntry);

            fabricClientConnectionMock.upgradeChaincode.should.not.been.calledWith('biscuit-network', '0.0.2', 'channelOne', 'instantiate', ['arg1', 'arg2', 'arg3']);
        });

        it('should package, install and upgrade a project', async () => {
            executeCommandStub.withArgs('blockchainAPackageExplorer.packageSmartContractProjectEntry').resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });
            executeCommandStub.withArgs('blockchainExplorer.installSmartContractEntry', undefined, new Set(['peerOne']), { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });

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

            await vscode.commands.executeCommand('blockchainExplorer.upgradeSmartContractEntry');

            fabricClientConnectionMock.upgradeChaincode.should.have.been.calledWith('biscuit-network', '0.0.2', 'channelOne', 'instantiate', ['arg1', 'arg2', 'arg3']);
        });

        it('should be able to cancel a project packaging, installing and upgrading', async () => {
            executeCommandStub.withArgs('blockchainAPackageExplorer.packageSmartContractProjectEntry').resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });
            executeCommandStub.withArgs('blockchainExplorer.installSmartContractEntry', undefined, new Set(['peerOne']), { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves();

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

            const packageEntry: PackageRegistryEntry = await vscode.commands.executeCommand('blockchainExplorer.upgradeSmartContractEntry') as PackageRegistryEntry;
            should.not.exist(packageEntry);

            fabricClientConnectionMock.upgradeChaincode.should.not.been.calledWith('biscuit-network', '0.0.2', 'channelOne', 'instantiate', ['arg1', 'arg2', 'arg3']);
        });

        it('should upgrade a package if its already installed', async () => {
            executeCommandStub.withArgs('blockchainExplorer.installSmartContractEntry', undefined, new Set(['peerOne']), { name: 'biscuit-network', version: '0.0.2', path: undefined }).resolves({ name: 'biscuit-network', version: '0.0.2', path: undefined });

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

            await vscode.commands.executeCommand('blockchainExplorer.upgradeSmartContractEntry');

            fabricClientConnectionMock.upgradeChaincode.should.have.been.calledWith('biscuit-network', '0.0.2', 'channelOne', 'instantiate', ['arg1', 'arg2', 'arg3']);
        });

    });
});
