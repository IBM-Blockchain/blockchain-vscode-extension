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
import { BlockchainTreeItem } from '../../src/explorer/model/BlockchainTreeItem';
import { BlockchainNetworkExplorerProvider } from '../../src/explorer/BlockchainNetworkExplorer';
import * as myExtension from '../../src/extension';
import { FabricConnection } from '../../src/fabric/FabricConnection';
import { ChannelTreeItem } from '../../src/explorer/model/ChannelTreeItem';
import { PackageRegistryEntry } from '../../src/packages/PackageRegistryEntry';

chai.use(sinonChai);
const should: Chai.Should = chai.should();

describe('InstantiateCommand', () => {
    let mySandBox: sinon.SinonSandbox;

    before(async () => {
        await TestUtil.setupTests();
    });

    describe('InstantiateSmartContract', () => {
        let fabricClientConnectionMock: sinon.SinonStubbedInstance<FabricClientConnection>;

        let executeCommandStub: sinon.SinonStub;
        let successSpy: sinon.SinonSpy;
        let errorSpy: sinon.SinonSpy;
        let getConnectionStub: sinon.SinonStub;
        let showChannelQuickPickStub: sinon.SinonStub;
        let showChaincodeAndVersionQuickPick: sinon.SinonStub;
        let showInputBoxStub: sinon.SinonStub;

        let allChildren: Array<BlockchainTreeItem>;
        let blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider;

        beforeEach(async () => {
            mySandBox = sinon.createSandbox();
            executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand');
            executeCommandStub.withArgs('blockchainExplorer.connectEntry').resolves();
            executeCommandStub.callThrough();

            fabricClientConnectionMock = sinon.createStubInstance(FabricClientConnection);
            fabricClientConnectionMock.connect.resolves();
            fabricClientConnectionMock.instantiateChaincode.resolves();
            const fabricConnectionManager: FabricConnectionManager = FabricConnectionManager.instance();
            getConnectionStub = mySandBox.stub(fabricConnectionManager, 'getConnection').returns(fabricClientConnectionMock);

            showChannelQuickPickStub = mySandBox.stub(UserInputUtil, 'showChannelQuickPickBox').resolves({
                label: 'myChannel',
                data: new Set(['peerOne'])
            });

            showChaincodeAndVersionQuickPick = mySandBox.stub(UserInputUtil, 'showChaincodeAndVersionQuickPick').withArgs(sinon.match.any, new Set(['peerOne'])).resolves(
                {
                    label: 'myContract@0.0.1',
                    data: {
                        chaincode: 'myContract',
                        version: '0.0.1'
                    }
                }
            );

            showInputBoxStub = mySandBox.stub(UserInputUtil, 'showInputBox');
            showInputBoxStub.onFirstCall().resolves('instantiate');
            showInputBoxStub.onSecondCall().resolves('arg1,arg2,arg3');

            successSpy = mySandBox.spy(vscode.window, 'showInformationMessage');
            errorSpy = mySandBox.spy(vscode.window, 'showErrorMessage');

            fabricClientConnectionMock.getAllPeerNames.returns(['peerOne']);

            fabricClientConnectionMock.getAllPeerNames.returns(['peerOne']);
            fabricClientConnectionMock.getAllChannelsForPeer.withArgs('peerOne').resolves(['channelOne']);

            fabricClientConnectionMock.getInstantiatedChaincode.resolves([]);

            blockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();

            allChildren = await blockchainNetworkExplorerProvider.getChildren();
        });

        afterEach(async () => {
            await vscode.commands.executeCommand('blockchainExplorer.disconnectEntry');
            mySandBox.restore();
        });

        it('should instantiate the smart contract through the command', async () => {
            await vscode.commands.executeCommand('blockchainExplorer.instantiateSmartContractEntry');
            fabricClientConnectionMock.instantiateChaincode.should.have.been.calledWith('myContract', '0.0.1', 'myChannel', 'instantiate', ['arg1', 'arg2', 'arg3']);
            successSpy.should.have.been.calledWith('Successfully instantiated / upgraded smart contract');
            executeCommandStub.secondCall.should.have.been.calledWith('blockchainExplorer.refreshEntry');
        });

        it('should instantiate the smart contract through the command when not connected', async () => {
            getConnectionStub.onCall(4).returns(null);
            getConnectionStub.onCall(5).returns(fabricClientConnectionMock);

            await vscode.commands.executeCommand('blockchainExplorer.instantiateSmartContractEntry');

            fabricClientConnectionMock.instantiateChaincode.should.have.been.calledWith('myContract', '0.0.1', 'myChannel', 'instantiate', ['arg1', 'arg2', 'arg3']);
            successSpy.should.have.been.calledWith('Successfully instantiated / upgraded smart contract');
        });

        it('should handle connecting being cancelled', async () => {
            getConnectionStub.onCall(4).returns(null);
            getConnectionStub.onCall(5).returns(null);
            await vscode.commands.executeCommand('blockchainExplorer.instantiateSmartContractEntry');
            console.log('count', getConnectionStub.callCount);
            executeCommandStub.should.have.been.calledWith('blockchainExplorer.connectEntry');
            fabricClientConnectionMock.instantiateChaincode.should.not.have.been.called;
        });

        it('should handle choosing channel being cancelled', async () => {
            showChannelQuickPickStub.resolves();

            await vscode.commands.executeCommand('blockchainExplorer.instantiateSmartContractEntry');

            fabricClientConnectionMock.instantiateChaincode.should.not.have.been.called;
        });

        it('should handle error from instantiating smart contract', async () => {
            fabricClientConnectionMock.instantiateChaincode.rejects({message: 'some error'});

            await vscode.commands.executeCommand('blockchainExplorer.instantiateSmartContractEntry').should.be.rejectedWith(`some error`);

            fabricClientConnectionMock.instantiateChaincode.should.have.been.calledWith('myContract', '0.0.1', 'myChannel', 'instantiate', ['arg1', 'arg2', 'arg3']);
            errorSpy.should.have.been.calledWith('Error instantiating smart contract: some error');
        });

        it('should handle cancel when choosing chaincode and version', async () => {
            showChaincodeAndVersionQuickPick.resolves();

            await vscode.commands.executeCommand('blockchainExplorer.instantiateSmartContractEntry');
            fabricClientConnectionMock.instantiateChaincode.should.not.have.been.called;
        });

        it('should instantiate smart contract through the tree', async () => {
            const myChannel: ChannelTreeItem = allChildren[0] as ChannelTreeItem;

            await vscode.commands.executeCommand('blockchainExplorer.instantiateSmartContractEntry', myChannel);

            fabricClientConnectionMock.instantiateChaincode.should.have.been.calledWith('myContract', '0.0.1', 'channelOne', 'instantiate', ['arg1', 'arg2', 'arg3']);

            successSpy.should.have.been.calledWith('Successfully instantiated / upgraded smart contract');
        });

        it('should instantiate the smart contract through the command with no function', async () => {
            showInputBoxStub.onFirstCall().resolves();
            await vscode.commands.executeCommand('blockchainExplorer.instantiateSmartContractEntry');
            fabricClientConnectionMock.instantiateChaincode.should.have.been.calledWithExactly('myContract', '0.0.1', 'myChannel', undefined, undefined);
            showInputBoxStub.should.have.been.calledOnce;
            successSpy.should.have.been.calledWith('Successfully instantiated / upgraded smart contract');
        });

        it('should instantiate the smart contract through the command with function but no args', async () => {
            showInputBoxStub.onFirstCall().resolves('instantiate');
            showInputBoxStub.onSecondCall().resolves();
            await vscode.commands.executeCommand('blockchainExplorer.instantiateSmartContractEntry');
            fabricClientConnectionMock.instantiateChaincode.should.have.been.calledWithExactly('myContract', '0.0.1', 'myChannel', 'instantiate', undefined);
            showInputBoxStub.should.have.been.calledTwice;
            successSpy.should.have.been.calledWith('Successfully instantiated / upgraded smart contract');
        });

        it('should install and instantiate', async () => {
            executeCommandStub.withArgs('blockchainExplorer.installSmartContractEntry', undefined, new Set(['peerOne'])).resolves({name: 'somepackage', version: '0.0.1'});

            showChaincodeAndVersionQuickPick.resolves({
                label: UserInputUtil.INSTALL_INSTANTIATE_LABEL,
                data: {
                    chaincode: '',
                    version: ''
                }
            });

            await vscode.commands.executeCommand('blockchainExplorer.instantiateSmartContractEntry');

            fabricClientConnectionMock.instantiateChaincode.should.have.been.calledWith('somepackage', '0.0.1', 'myChannel', 'instantiate', ['arg1', 'arg2', 'arg3']);
        });

        it('should be able to cancel install and instantiate', async () => {
            executeCommandStub.withArgs('blockchainExplorer.installSmartContractEntry', undefined, new Set(['peerOne'])).resolves();

            showChaincodeAndVersionQuickPick.resolves({
                label: UserInputUtil.INSTALL_INSTANTIATE_LABEL,
                data: {
                    chaincode: '',
                    version: ''
                }
            });

            const packageEntry: PackageRegistryEntry = await vscode.commands.executeCommand('blockchainExplorer.instantiateSmartContractEntry') as PackageRegistryEntry;
            should.not.exist(packageEntry);

            fabricClientConnectionMock.instantiateChaincode.should.not.been.calledWith('somepackage', '0.0.1', 'myChannel', 'instantiate', ['arg1', 'arg2', 'arg3']);
        });

    });
});
