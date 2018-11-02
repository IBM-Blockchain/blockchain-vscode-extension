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
import { BlockchainNetworkExplorerProvider } from '../../src/explorer/BlockchainNetworkExplorer';
import * as myExtension from '../../src/extension';
import { ChannelTreeItem } from '../../src/explorer/model/ChannelTreeItem';
import { PackageRegistryEntry } from '../../src/packages/PackageRegistryEntry';
import { VSCodeOutputAdapter } from '../../src/logging/VSCodeOutputAdapter';
import { LogType } from '../../src/logging/OutputAdapter';

const should: Chai.Should = chai.should();
chai.use(sinonChai);

describe('InstantiateCommand', () => {
    let mySandBox: sinon.SinonSandbox;

    before(async () => {
        await TestUtil.setupTests();
    });

    describe('InstantiateSmartContract', () => {
        let fabricClientConnectionMock: sinon.SinonStubbedInstance<FabricClientConnection>;

        let executeCommandStub: sinon.SinonStub;
        let logSpy: sinon.SinonSpy;
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

            logSpy = mySandBox.spy(VSCodeOutputAdapter.instance(), 'log');

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
            await vscode.commands.executeCommand('blockchainExplorer.disconnectEntry');
            mySandBox.restore();
        });

        it('should instantiate the smart contract through the command', async () => {
            await vscode.commands.executeCommand('blockchainExplorer.instantiateSmartContractEntry');
            fabricClientConnectionMock.instantiateChaincode.should.have.been.calledWith('myContract', '0.0.1', 'myChannel', 'instantiate', ['arg1', 'arg2', 'arg3']);
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully instantiated smart contract');
            executeCommandStub.secondCall.should.have.been.calledWith('blockchainExplorer.refreshEntry');
        });

        it('should instantiate the smart contract through the command when not connected', async () => {
            getConnectionStub.onCall(4).returns(null);
            getConnectionStub.onCall(5).returns(fabricClientConnectionMock);

            await vscode.commands.executeCommand('blockchainExplorer.instantiateSmartContractEntry');

            fabricClientConnectionMock.instantiateChaincode.should.have.been.calledWith('myContract', '0.0.1', 'myChannel', 'instantiate', ['arg1', 'arg2', 'arg3']);
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully instantiated smart contract');
        });

        it('should handle connecting being cancelled', async () => {
            getConnectionStub.onCall(4).returns(null);
            getConnectionStub.onCall(5).returns(null);
            await vscode.commands.executeCommand('blockchainExplorer.instantiateSmartContractEntry');
            executeCommandStub.should.have.been.calledWith('blockchainExplorer.connectEntry');
            fabricClientConnectionMock.instantiateChaincode.should.not.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            should.not.exist(logSpy.getCall(1));
        });

        it('should handle choosing channel being cancelled', async () => {
            showChannelQuickPickStub.resolves();

            await vscode.commands.executeCommand('blockchainExplorer.instantiateSmartContractEntry');

            fabricClientConnectionMock.instantiateChaincode.should.not.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            should.not.exist(logSpy.getCall(1));
        });

        it('should handle error from instantiating smart contract', async () => {
            const error: Error = new Error('some error');

            fabricClientConnectionMock.instantiateChaincode.rejects(error);

            await vscode.commands.executeCommand('blockchainExplorer.instantiateSmartContractEntry').should.be.rejectedWith(error);

            fabricClientConnectionMock.instantiateChaincode.should.have.been.calledWith('myContract', '0.0.1', 'myChannel', 'instantiate', ['arg1', 'arg2', 'arg3']);
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Error instantiating smart contract: ${error.message}`, `Error instantiating smart contract: ${error.toString()}`);
        });

        it('should handle cancel when choosing chaincode and version', async () => {
            showChaincodeAndVersionQuickPick.resolves();

            await vscode.commands.executeCommand('blockchainExplorer.instantiateSmartContractEntry');
            fabricClientConnectionMock.instantiateChaincode.should.not.have.been.called;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            should.not.exist(logSpy.getCall(1));
        });

        it('should instantiate smart contract through the tree', async () => {
            const myChannel: ChannelTreeItem = allChildren[1] as ChannelTreeItem;

            await vscode.commands.executeCommand('blockchainExplorer.instantiateSmartContractEntry', myChannel);

            fabricClientConnectionMock.instantiateChaincode.should.have.been.calledWith('myContract', '0.0.1', 'channelOne', 'instantiate', ['arg1', 'arg2', 'arg3']);

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully instantiated smart contract');
        });

        it('should instantiate the smart contract through the command with no function', async () => {
            showInputBoxStub.onFirstCall().resolves();
            await vscode.commands.executeCommand('blockchainExplorer.instantiateSmartContractEntry');
            fabricClientConnectionMock.instantiateChaincode.should.have.been.calledWithExactly('myContract', '0.0.1', 'myChannel', undefined, undefined);
            showInputBoxStub.should.have.been.calledOnce;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully instantiated smart contract');
        });

        it('should instantiate the smart contract through the command with function but no args', async () => {
            showInputBoxStub.onFirstCall().resolves('instantiate');
            showInputBoxStub.onSecondCall().resolves();
            await vscode.commands.executeCommand('blockchainExplorer.instantiateSmartContractEntry');
            fabricClientConnectionMock.instantiateChaincode.should.have.been.calledWithExactly('myContract', '0.0.1', 'myChannel', 'instantiate', undefined);
            showInputBoxStub.should.have.been.calledTwice;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully instantiated smart contract');
        });

        it('should install and instantiate package', async () => {
            executeCommandStub.withArgs('blockchainExplorer.installSmartContractEntry', undefined, new Set(['peerOne']), { name: 'somepackage', version: '0.0.1', path: undefined }).resolves({ name: 'somepackage', version: '0.0.1', path: undefined });

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

            await vscode.commands.executeCommand('blockchainExplorer.instantiateSmartContractEntry');

            fabricClientConnectionMock.instantiateChaincode.should.have.been.calledWith('somepackage', '0.0.1', 'myChannel', 'instantiate', ['arg1', 'arg2', 'arg3']);
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully instantiated smart contract');
        });

        it('should be able to cancel install and instantiate for package', async () => {
            executeCommandStub.withArgs('blockchainExplorer.installSmartContractEntry', undefined, new Set(['peerOne']), { name: 'somepackage', version: '0.0.1', path: undefined }).resolves();

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

            const packageEntry: PackageRegistryEntry = await vscode.commands.executeCommand('blockchainExplorer.instantiateSmartContractEntry') as PackageRegistryEntry;
            should.not.exist(packageEntry);

            fabricClientConnectionMock.instantiateChaincode.should.not.been.calledWith('somepackage', '0.0.1', 'myChannel', 'instantiate', ['arg1', 'arg2', 'arg3']);
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            should.not.exist(logSpy.getCall(1));
        });

        it('should package, install and instantiate a project', async () => {
            executeCommandStub.withArgs('blockchainAPackageExplorer.packageSmartContractProjectEntry').resolves({ name: 'somepackage', version: '0.0.1', path: undefined });
            executeCommandStub.withArgs('blockchainExplorer.installSmartContractEntry', undefined, new Set(['peerOne']), { name: 'somepackage', version: '0.0.1', path: undefined }).resolves({ name: 'somepackage', version: '0.0.1', path: undefined });

            showChaincodeAndVersionQuickPick.resolves({
                label: 'somepackage@0.0.1',
                description: 'Open Project',
                data: {
                    packageEntry: undefined,
                    workspace: mySandBox.stub()
                }
            });

            await vscode.commands.executeCommand('blockchainExplorer.instantiateSmartContractEntry');

            fabricClientConnectionMock.instantiateChaincode.should.have.been.calledWith('somepackage', '0.0.1', 'myChannel', 'instantiate', ['arg1', 'arg2', 'arg3']);
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully instantiated smart contract');
        });

        it('should be able to cancel a project packaging, installing and instantiating', async () => {
            executeCommandStub.withArgs('blockchainAPackageExplorer.packageSmartContractProjectEntry').resolves({ name: 'somepackage', version: '0.0.1', path: undefined });
            executeCommandStub.withArgs('blockchainExplorer.installSmartContractEntry', undefined, new Set(['peerOne']), { name: 'somepackage', version: '0.0.1', path: undefined }).resolves();

            showChaincodeAndVersionQuickPick.resolves({
                label: 'somepackage@0.0.1',
                description: 'Open Project',
                data: {
                    packageEntry: undefined,
                    workspace: mySandBox.stub()
                }
            });

            const packageEntry: PackageRegistryEntry = await vscode.commands.executeCommand('blockchainExplorer.instantiateSmartContractEntry') as PackageRegistryEntry;
            should.not.exist(packageEntry);

            fabricClientConnectionMock.instantiateChaincode.should.not.been.calledWith('somepackage', '0.0.1', 'myChannel', 'instantiate', ['arg1', 'arg2', 'arg3']);
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'instantiateSmartContract');
            should.not.exist(logSpy.getCall(1));
        });

    });
});
