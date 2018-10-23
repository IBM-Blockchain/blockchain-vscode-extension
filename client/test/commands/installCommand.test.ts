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
import { VSCodeOutputAdapter } from '../../src/logging/VSCodeOutputAdapter';

chai.use(sinonChai);
const should: Chai.Should = chai.should();

describe('InstallCommand', () => {

    const TEST_PACKAGE_DIRECTORY: string = path.join(path.dirname(__dirname), '../../test/data/packageDir');

    let mySandBox;

    before(async () => {
        await TestUtil.setupTests();
    });

    describe('InstallSmartContract', () => {
        let fabricClientConnectionMock;

        let executeCommandStub;
        let packageRegistryEntry: PackageRegistryEntry;
        let successStub: sinon.SinonStub;
        let errorStub: sinon.SinonStub;
        let getConnectionStub: sinon.SinonStub;
        let showPeerQuickPickStub: sinon.SinonStub;
        let showPackageQuickPickStub: sinon.SinonStub;

        let allChildren: Array<BlockchainTreeItem>;
        let blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider;

        beforeEach(async () => {
            mySandBox = sinon.createSandbox();
            executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand');
            executeCommandStub.withArgs('blockchainExplorer.connectEntry').resolves();
            executeCommandStub.callThrough();

            fabricClientConnectionMock = sinon.createStubInstance(FabricClientConnection);
            fabricClientConnectionMock.connect.resolves();
            fabricClientConnectionMock.installChaincode.resolves();
            const fabricConnectionManager: FabricConnectionManager = FabricConnectionManager.instance();
            getConnectionStub = mySandBox.stub(fabricConnectionManager, 'getConnection').returns(fabricClientConnectionMock);

            showPeerQuickPickStub = mySandBox.stub(UserInputUtil, 'showPeerQuickPickBox').resolves('peerOne');

            packageRegistryEntry = new PackageRegistryEntry({
                name: 'vscode-pkg-1@0.0.1',
                path: path.join(TEST_PACKAGE_DIRECTORY, 'vscode-pkg-1@0.0.1.cds'),
                version: '0.0.1'
            });

            showPackageQuickPickStub = mySandBox.stub(UserInputUtil, 'showSmartContractPackagesQuickPickBox').resolves({
                label: 'myContract',
                data: packageRegistryEntry
            });

            successStub = mySandBox.stub(vscode.window, 'showInformationMessage').resolves();
            errorStub = mySandBox.stub(vscode.window, 'showErrorMessage').resolves();

            fabricClientConnectionMock.getAllPeerNames.returns(['peerOne']);

            fabricClientConnectionMock.getAllPeerNames.returns(['peerOne']);
            fabricClientConnectionMock.getAllChannelsForPeer.withArgs('peerOne').resolves(['channelOne']);

            fabricClientConnectionMock.getInstantiatedChaincode.resolves([]);

            blockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
            blockchainNetworkExplorerProvider['connection'] = ((fabricClientConnectionMock as any) as FabricConnection);

            allChildren = await blockchainNetworkExplorerProvider.getChildren();
        });

        afterEach(async () => {
            await vscode.commands.executeCommand('blockchainExplorer.disconnectEntry');
            mySandBox.restore();
        });

        it('should install the smart contract through the command', async () => {
            await vscode.commands.executeCommand('blockchainExplorer.installSmartContractEntry');
            fabricClientConnectionMock.installChaincode.should.have.been.calledWith(packageRegistryEntry, 'peerOne');
            successStub.should.have.been.calledWith('Successfully installed smart contract');
        });

        it('should install the smart contract through the command when not connected', async () => {
            getConnectionStub.onFirstCall().returns(null);
            getConnectionStub.onSecondCall().returns(fabricClientConnectionMock);

            await vscode.commands.executeCommand('blockchainExplorer.installSmartContractEntry');

            executeCommandStub.should.have.been.calledWith('blockchainExplorer.connectEntry');
            fabricClientConnectionMock.installChaincode.should.have.been.calledWith(packageRegistryEntry, 'peerOne');
            successStub.should.have.been.calledWith('Successfully installed smart contract');
        });

        it('should handle connecting being cancelled', async () => {
            getConnectionStub.returns(null);

            await vscode.commands.executeCommand('blockchainExplorer.installSmartContractEntry');

            executeCommandStub.should.have.been.calledWith('blockchainExplorer.connectEntry');
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
            errorStub.should.have.been.calledWith('Error installing smart contract: some error');
        });

        it('should handle cancel when choosing package', async () => {
            showPackageQuickPickStub.resolves();

            await vscode.commands.executeCommand('blockchainExplorer.installSmartContractEntry');
            fabricClientConnectionMock.installChaincode.should.not.have.been.called;
        });

        it('should install smart contract through the tree', async () => {
            const myChannel = allChildren[0];
            const peers = await blockchainNetworkExplorerProvider.getChildren(myChannel);
            const peersTreeItem = peers[0];
            const peer = await blockchainNetworkExplorerProvider.getChildren(peersTreeItem);
            const peerTreeItem = peer[0] as PeerTreeItem;

            await vscode.commands.executeCommand('blockchainExplorer.installSmartContractEntry', peerTreeItem);

            fabricClientConnectionMock.installChaincode.should.have.been.calledWith(packageRegistryEntry, 'peerOne');
            successStub.should.have.been.calledWith('Successfully installed smart contract');
        });

        it('should install when passing in a set of peers', async () => {
            const logOutputSpy: sinon.SinonSpy = mySandBox.spy(VSCodeOutputAdapter.instance(), 'log');

            const packageEntry: PackageRegistryEntry = await vscode.commands.executeCommand('blockchainExplorer.installSmartContractEntry', undefined, new Set(['peerOne'])) as PackageRegistryEntry;
            successStub.getCall(0).should.have.been.calledWith('Successfully installed on peer peerOne');
            logOutputSpy.getCall(0).should.have.been.calledWith('Successfully installed on peer peerOne');
            successStub.getCall(1).should.have.been.calledWith('Successfully installed smart contract');
            packageEntry.should.equal(packageRegistryEntry);
        });

        it('should install for multiple peers', async () => {
            const logOutputSpy: sinon.SinonSpy = mySandBox.spy(VSCodeOutputAdapter.instance(), 'log');

            const packageEntry: PackageRegistryEntry = await vscode.commands.executeCommand('blockchainExplorer.installSmartContractEntry', undefined, new Set(['peerOne', 'peerTwo'])) as PackageRegistryEntry;
            successStub.getCall(0).should.have.been.calledWith('Successfully installed on peer peerOne');
            logOutputSpy.getCall(0).should.have.been.calledWith('Successfully installed on peer peerOne');
            successStub.getCall(1).should.have.been.calledWith('Successfully installed on peer peerTwo');
            logOutputSpy.getCall(1).should.have.been.calledWith('Successfully installed on peer peerTwo');
            successStub.getCall(2).should.have.been.calledWith('Successfully installed smart contract');
            packageEntry.should.equal(packageRegistryEntry);
        });

        it('should handle peers failing to install', async () => {
            const logOutputSpy: sinon.SinonSpy = mySandBox.spy(VSCodeOutputAdapter.instance(), 'log');
            const errorOutputSpy: sinon.SinonSpy = mySandBox.spy(VSCodeOutputAdapter.instance(), 'error');

            fabricClientConnectionMock.installChaincode.onFirstCall().resolves();
            fabricClientConnectionMock.installChaincode.onSecondCall().rejects({message: 'failed to install for some reason'});
            fabricClientConnectionMock.installChaincode.onThirdCall().resolves();

            const packageEntry: PackageRegistryEntry = await vscode.commands.executeCommand('blockchainExplorer.installSmartContractEntry', undefined, new Set(['peerOne', 'peerTwo', 'peerThree'])) as PackageRegistryEntry;

            successStub.getCall(0).should.have.been.calledWith('Successfully installed on peer peerOne');
            logOutputSpy.getCall(0).should.have.been.calledWith('Successfully installed on peer peerOne');

            errorStub.getCall(0).should.have.been.calledWith('Failed to install on peer peerTwo with reason: failed to install for some reason');
            errorOutputSpy.getCall(0).should.have.been.calledWith('Failed to install on peer peerTwo with reason: failed to install for some reason');

            successStub.getCall(1).should.have.been.calledWith('Successfully installed on peer peerThree');
            logOutputSpy.getCall(1).should.have.been.calledWith('Successfully installed on peer peerThree');

            should.not.exist(packageEntry);
        });
    });
});
