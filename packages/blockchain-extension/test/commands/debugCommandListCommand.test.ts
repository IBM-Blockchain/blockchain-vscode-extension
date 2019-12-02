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

import { TestUtil } from '../TestUtil';
import { UserInputUtil } from '../../extension/commands/UserInputUtil';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricGatewayConnectionManager } from '../../extension/fabric/FabricGatewayConnectionManager';
import { FabricEnvironmentConnection } from '../../extension/fabric/FabricEnvironmentConnection';
import { FabricRuntimeUtil } from 'ibm-blockchain-platform-common';
import { FabricGatewayRegistryEntry } from '../../extension/registries/FabricGatewayRegistryEntry';
import { FabricWalletUtil } from '../../extension/fabric/FabricWalletUtil';
import { FabricEnvironmentManager } from '../../extension/fabric/FabricEnvironmentManager';
import { LogType } from '../../extension/logging/OutputAdapter';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { FabricRuntimeManager } from '../../extension/fabric/FabricRuntimeManager';
import { FabricGatewayRegistry } from '../../extension/registries/FabricGatewayRegistry';

// tslint:disable no-unused-expression
chai.should();
chai.use(sinonChai);

describe('DebugCommandListCommand', () => {

    let mySandBox: sinon.SinonSandbox;
    let showDebugCommandListStub: sinon.SinonStub;
    let executeCommandStub: sinon.SinonStub;
    let runtimeStub: sinon.SinonStubbedInstance<FabricEnvironmentConnection>;
    let connectionManagerGetConnectionStub: sinon.SinonStub;
    let environmentConnectionStub: sinon.SinonStub;

    before(async () => {
        mySandBox = sinon.createSandbox();
        await TestUtil.setupTests(mySandBox);
        await FabricRuntimeManager.instance().getRuntime().create();
    });

    beforeEach(async () => {

        await FabricGatewayRegistry.instance().clear();
        await FabricRuntimeManager.instance().getRuntime().importGateways();

        runtimeStub = mySandBox.createStubInstance(FabricEnvironmentConnection);

        showDebugCommandListStub = mySandBox.stub(UserInputUtil, 'showDebugCommandList').resolves({ label: 'Instantiate smart contract', data: ExtensionCommands.SUBMIT_TRANSACTION });

        executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand');
        executeCommandStub.callThrough();
        executeCommandStub.withArgs(ExtensionCommands.INSTANTIATE_SMART_CONTRACT).resolves();
        executeCommandStub.withArgs(ExtensionCommands.SUBMIT_TRANSACTION).resolves();
        executeCommandStub.withArgs(ExtensionCommands.EVALUATE_TRANSACTION).resolves();
        executeCommandStub.withArgs(ExtensionCommands.UPGRADE_SMART_CONTRACT).resolves();
        executeCommandStub.withArgs(ExtensionCommands.CONNECT_TO_GATEWAY).resolves();

        const activeDebugSessionStub: any = {
            configuration: {
                env: {
                    CORE_CHAINCODE_ID_NAME: 'mySmartContract:vscode-debug-123456'
                }
            }
        };

        mySandBox.stub(vscode.debug, 'activeDebugSession').value(activeDebugSessionStub);

        const channelMap: Map<string, string[]> = new Map<string, string[]>();
        channelMap.set('mychannel', ['peerOne']);
        runtimeStub.createChannelMap.resolves(channelMap);
        runtimeStub.getInstantiatedChaincode.resolves([]);

        environmentConnectionStub = mySandBox.stub(FabricEnvironmentManager.instance(), 'getConnection').returns(runtimeStub);
        connectionManagerGetConnectionStub = mySandBox.stub(FabricGatewayConnectionManager.instance(), 'getConnection').returns(runtimeStub);
    });

    afterEach(async () => {
        mySandBox.restore();
    });

    it('should show the submit and evaluate', async () => {
        await vscode.commands.executeCommand(ExtensionCommands.DEBUG_COMMAND_LIST);

        executeCommandStub.should.have.been.calledWith(ExtensionCommands.SUBMIT_TRANSACTION, undefined, 'mychannel', 'mySmartContract');
    });

    it('should return if no connection', async () => {
        const logSpy: sinon.SinonSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
        environmentConnectionStub.returns(undefined);
        await vscode.commands.executeCommand(ExtensionCommands.DEBUG_COMMAND_LIST);

        logSpy.should.have.been.calledWith(LogType.ERROR, undefined, 'No connection to a blockchain found');
        executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.INSTANTIATE_SMART_CONTRACT);
    });

    it('should handle cancel', async () => {
        showDebugCommandListStub.resolves();

        await vscode.commands.executeCommand(ExtensionCommands.DEBUG_COMMAND_LIST);

        showDebugCommandListStub.should.have.been.called;
        executeCommandStub.should.have.been.calledOnceWithExactly(ExtensionCommands.DEBUG_COMMAND_LIST);
    });

    it('should submit transaction with channel name and contract name', async () => {
        showDebugCommandListStub.resolves({ label: 'Submit transaction', data: ExtensionCommands.SUBMIT_TRANSACTION });

        await vscode.commands.executeCommand(ExtensionCommands.DEBUG_COMMAND_LIST);

        executeCommandStub.should.have.been.calledWithExactly(ExtensionCommands.SUBMIT_TRANSACTION, undefined, 'mychannel', 'mySmartContract');
    });

    it('should evaluate transaction with channel name and contract name', async () => {
        showDebugCommandListStub.resolves({ label: 'Evaluate transaction', data: ExtensionCommands.EVALUATE_TRANSACTION});

        await vscode.commands.executeCommand(ExtensionCommands.DEBUG_COMMAND_LIST);

        executeCommandStub.should.have.been.calledWithExactly(ExtensionCommands.EVALUATE_TRANSACTION, undefined, 'mychannel', 'mySmartContract');
    });

    it('should connect to local_fabric before running the submit or evaluate commands', async () => {
        const registryEntry: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
        registryEntry.name = FabricRuntimeUtil.LOCAL_FABRIC;
        registryEntry.associatedWallet = FabricWalletUtil.LOCAL_WALLET;
        connectionManagerGetConnectionStub.onCall(0).returns(undefined);
        connectionManagerGetConnectionStub.onCall(1).returns(runtimeStub);
        showDebugCommandListStub.resolves({ label: 'Evaluate transaction', data: ExtensionCommands.EVALUATE_TRANSACTION});

        await vscode.commands.executeCommand(ExtensionCommands.DEBUG_COMMAND_LIST);

        executeCommandStub.should.have.been.calledWithExactly(ExtensionCommands.CONNECT_TO_GATEWAY, registryEntry);
        executeCommandStub.should.have.been.calledWithExactly(ExtensionCommands.EVALUATE_TRANSACTION, undefined, 'mychannel', 'mySmartContract');
    });

    it('should handle connect failing', async () => {
        showDebugCommandListStub.resolves({ label: 'Evaluate transaction', data: ExtensionCommands.EVALUATE_TRANSACTION});
        connectionManagerGetConnectionStub.returns(undefined);

        await vscode.commands.executeCommand(ExtensionCommands.DEBUG_COMMAND_LIST);

        executeCommandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_GATEWAY);
        executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.EVALUATE_TRANSACTION);
    });

    it('should run the command passed in', async () => {
        runtimeStub.getInstantiatedChaincode.resolves([
            {
                name: 'mySmartContract',
                version: 'vscode-debug-13232112018'
            },
            {
                name: 'cake-network',
                version: '0.0.2'
            }
        ]);

        await vscode.commands.executeCommand(ExtensionCommands.DEBUG_COMMAND_LIST, ExtensionCommands.UPGRADE_SMART_CONTRACT);

        showDebugCommandListStub.should.not.have.been.called;

        executeCommandStub.should.have.been.calledWith(ExtensionCommands.UPGRADE_SMART_CONTRACT, undefined, 'mychannel', ['peerOne']);
    });
});
