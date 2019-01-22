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

import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';

import { TestUtil } from '../TestUtil';
import { FabricConnectionManager } from '../../src/fabric/FabricConnectionManager';
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import { PackageRegistryEntry } from '../../src/packages/PackageRegistryEntry';
import { BlockchainTreeItem } from '../../src/explorer/model/BlockchainTreeItem';
import { BlockchainNetworkExplorerProvider } from '../../src/explorer/BlockchainNetworkExplorer';
import * as myExtension from '../../src/extension';
import { FabricConnection } from '../../src/fabric/FabricConnection';
import { PeerTreeItem } from '../../src/explorer/model/PeerTreeItem';
import * as path from 'path';
import { ChannelTreeItem } from '../../src/explorer/model/ChannelTreeItem';
import { VSCodeOutputAdapter } from '../../src/logging/VSCodeOutputAdapter';
import { FabricConnectionRegistryEntry } from '../../src/fabric/FabricConnectionRegistryEntry';
import { LogType } from '../../src/logging/OutputAdapter';

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
        let showPeerQuickPickStub: sinon.SinonStub;
        let showInstallableSmartContractsQuickPickStub: sinon.SinonStub;
        let logOutputSpy: sinon.SinonSpy;
        let allChildren: Array<BlockchainTreeItem>;
        let blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider;

        beforeEach(async () => {
            mySandBox = sinon.createSandbox();
            executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand');
            executeCommandStub.withArgs('blockchainConnectionsExplorer.connectEntry').resolves();
            executeCommandStub.callThrough();

            fabricClientConnectionMock = sinon.createStubInstance(FabricClientConnection);
            fabricClientConnectionMock.connect.resolves();
            fabricClientConnectionMock.installChaincode.resolves();
            fabricClientConnectionMock.getInstalledChaincode.resolves(new Map<string, Array<string>>());
            const fabricConnectionManager: FabricConnectionManager = FabricConnectionManager.instance();
            getConnectionStub = mySandBox.stub(fabricConnectionManager, 'getConnection').returns((fabricClientConnectionMock as any) as FabricConnection );

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

            const registryEntry: FabricConnectionRegistryEntry = new FabricConnectionRegistryEntry();
            registryEntry.name = 'myConnection';
            registryEntry.connectionProfilePath = 'myPath';
            registryEntry.managedRuntime = false;
            mySandBox.stub(FabricConnectionManager.instance(), 'getConnectionRegistryEntry').returns(registryEntry);

            blockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();

            allChildren = await blockchainNetworkExplorerProvider.getChildren();
        });

        afterEach(async () => {
            await vscode.commands.executeCommand('blockchainConnectionsExplorer.disconnectEntry');

            mySandBox.restore();
        });

        it('should install the smart contract through the command', async () => {
            getConnectionStub.onCall(4).returns(null);
            getConnectionStub.onCall(5).returns(fabricClientConnectionMock);
            await vscode.commands.executeCommand('blockchainExplorer.installSmartContractEntry');
            fabricClientConnectionMock.installChaincode.should.have.been.calledWith(packageRegistryEntry, 'peerOne');
            logOutputSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'installSmartContract');
            logOutputSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully installed on peer peerOne');
        });

        it('should install the smart contract with specific package', async () => {
            getConnectionStub.onCall(4).returns(null);
            getConnectionStub.onCall(5).returns(fabricClientConnectionMock);

            await vscode.commands.executeCommand('blockchainExplorer.installSmartContractEntry', null, null, packageRegistryEntry);
            fabricClientConnectionMock.installChaincode.should.have.been.calledWith(packageRegistryEntry, 'peerOne');
            logOutputSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'installSmartContract');
            logOutputSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully installed on peer peerOne');
        });

        it('should install the smart contract through the command when not connected', async () => {
            getConnectionStub.onCall(4).returns(null);
            getConnectionStub.onCall(5).returns(fabricClientConnectionMock);

            await vscode.commands.executeCommand('blockchainExplorer.installSmartContractEntry');

            executeCommandStub.should.have.been.calledWith('blockchainConnectionsExplorer.connectEntry');
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
            getConnectionStub.onCall(4).returns(null);
            getConnectionStub.onCall(5).returns(fabricClientConnectionMock);
            const packageCommandStub: sinon.SinonStub = executeCommandStub.withArgs('blockchainAPackageExplorer.packageSmartContractProjectEntry');
            packageCommandStub.resolves(packageRegistryEntry);

            await vscode.commands.executeCommand('blockchainExplorer.installSmartContractEntry');

            packageCommandStub.should.have.been.calledOnce;
            executeCommandStub.should.have.been.calledWith('blockchainConnectionsExplorer.connectEntry');
            fabricClientConnectionMock.installChaincode.should.have.been.calledWith(packageRegistryEntry, 'peerOne');
            logOutputSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully installed on peer peerOne');
        });

        it('should handle connecting being cancelled', async () => {
            getConnectionStub.returns(null);

            await vscode.commands.executeCommand('blockchainExplorer.installSmartContractEntry');

            executeCommandStub.should.have.been.calledWith('blockchainConnectionsExplorer.connectEntry');
            fabricClientConnectionMock.installChaincode.should.not.have.been.called;
        });

        it('should handle choosing peer being cancelled', async () => {
            showPeerQuickPickStub.resolves();

            await vscode.commands.executeCommand('blockchainExplorer.installSmartContractEntry');

            fabricClientConnectionMock.installChaincode.should.not.have.been.called;
        });

        it('should handle error from installing smart contract', async () => {
            fabricClientConnectionMock.installChaincode.throws({message: 'some error'});

            await vscode.commands.executeCommand('blockchainExplorer.installSmartContractEntry').should.be.rejectedWith(`some error`);

            fabricClientConnectionMock.installChaincode.should.have.been.calledWith(packageRegistryEntry, 'peerOne');
            logOutputSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'installSmartContract');
            logOutputSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, 'Error installing smart contract: some error');
        });

        it('should handle cancel when choosing package', async () => {
            showInstallableSmartContractsQuickPickStub.resolves();

            await vscode.commands.executeCommand('blockchainExplorer.installSmartContractEntry');
            fabricClientConnectionMock.installChaincode.should.not.have.been.called;
        });

        it('should install smart contract through the tree', async () => {
            const myChannel: ChannelTreeItem = allChildren[1] as ChannelTreeItem;
            const peer: Array<PeerTreeItem> = await blockchainNetworkExplorerProvider.getChildren(myChannel) as Array<PeerTreeItem>;
            const peerTreeItem: PeerTreeItem = peer[0] as PeerTreeItem;

            await vscode.commands.executeCommand('blockchainExplorer.installSmartContractEntry', peerTreeItem);

            fabricClientConnectionMock.installChaincode.should.have.been.calledWith(packageRegistryEntry, 'peerOne');
            logOutputSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'installSmartContract');
            logOutputSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully installed on peer peerOne');
        });

        it('should install when passing in a set of peers', async () => {
            const packageEntry: PackageRegistryEntry = await vscode.commands.executeCommand('blockchainExplorer.installSmartContractEntry', undefined, new Set(['peerOne'])) as PackageRegistryEntry;
            logOutputSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'installSmartContract');
            logOutputSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully installed on peer peerOne');
            packageEntry.should.equal(packageRegistryEntry);
        });

        it('should install for multiple peers', async () => {
            const packageEntry: PackageRegistryEntry = await vscode.commands.executeCommand('blockchainExplorer.installSmartContractEntry', undefined, new Set(['peerOne', 'peerTwo'])) as PackageRegistryEntry;
            logOutputSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'installSmartContract');
            logOutputSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully installed on peer peerOne');
            logOutputSpy.getCall(2).should.have.been.calledWith(LogType.SUCCESS, 'Successfully installed on peer peerTwo');
            logOutputSpy.getCall(3).should.have.been.calledWith(LogType.SUCCESS, 'Successfully installed smart contract on all peers');
            packageEntry.should.equal(packageRegistryEntry);
        });

        it('should handle peers failing to install', async () => {
            fabricClientConnectionMock.installChaincode.onFirstCall().resolves();
            fabricClientConnectionMock.installChaincode.onSecondCall().rejects({message: 'failed to install for some reason'});
            fabricClientConnectionMock.installChaincode.onThirdCall().resolves();

            const packageEntry: PackageRegistryEntry = await vscode.commands.executeCommand('blockchainExplorer.installSmartContractEntry', undefined, new Set(['peerOne', 'peerTwo', 'peerThree'])) as PackageRegistryEntry;

            logOutputSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'installSmartContract');

            logOutputSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully installed on peer peerOne');

            logOutputSpy.getCall(2).should.have.been.calledWith(LogType.ERROR, 'Failed to install on peer peerTwo with reason: failed to install for some reason');

            logOutputSpy.getCall(3).should.have.been.calledWith(LogType.SUCCESS, 'Successfully installed on peer peerThree');

            should.not.exist(packageEntry);
        });
    });
});
