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

chai.should();
chai.use(sinonChai);

describe('InstallCommand', () => {
    let mySandBox;

    before(async () => {
        await TestUtil.setupTests();
    });

    describe('InstallSmartContract', () => {
        let fabricClientConnectionMock;

        let executeCommandStub;
        let packageRegistryEntry: PackageRegistryEntry;
        let successSpy;
        let errorSpy;
        let getConnectionStub;
        let showPeerQuickPickStub;
        let showPackageQuickPickStub;

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
                name: 'my-smart-contract',
                chaincodeLanguage: 'javascript',
                path: 'myPath/myContract',
                version: '1.0.0'
            });

            showPackageQuickPickStub = mySandBox.stub(UserInputUtil, 'showSmartContractPackagesQuickPickBox').resolves({
                label: 'myContract',
                data: packageRegistryEntry
            });

            successSpy = mySandBox.spy(vscode.window, 'showInformationMessage');
            errorSpy = mySandBox.spy(vscode.window, 'showErrorMessage');

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
            successSpy.should.have.been.calledWith('Successfully installed smart contract');
        });

        it('should install the smart contract through the command when not connected', async () => {
            getConnectionStub.onFirstCall().returns();
            getConnectionStub.onSecondCall().returns(fabricClientConnectionMock);

            await vscode.commands.executeCommand('blockchainExplorer.installSmartContractEntry');

            executeCommandStub.should.have.been.calledWith('blockchainExplorer.connectEntry');
            fabricClientConnectionMock.installChaincode.should.have.been.calledWith(packageRegistryEntry, 'peerOne');
            successSpy.should.have.been.calledWith('Successfully installed smart contract');
        });

        it('should handle connecting being cancelled', async () => {
            getConnectionStub.returns();

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
            fabricClientConnectionMock.installChaincode.rejects({message: 'some error'});

            await vscode.commands.executeCommand('blockchainExplorer.installSmartContractEntry').should.be.rejectedWith(`some error`);

            fabricClientConnectionMock.installChaincode.should.have.been.calledWith(packageRegistryEntry, 'peerOne');
            errorSpy.should.have.been.calledWith('Error installing smart contract some error');
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
            successSpy.should.have.been.calledWith('Successfully installed smart contract');
        });
    });
});
