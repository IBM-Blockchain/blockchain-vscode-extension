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
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import { FabricWallet } from '../../src/fabric/FabricWallet';
import { FabricRuntimeManager } from '../../src/fabric/FabricRuntimeManager';
import { FabricRuntimeConnection } from '../../src/fabric/FabricRuntimeConnection';
import { FabricConnectionFactory } from '../../src/fabric/FabricConnectionFactory';
import { ExtensionCommands } from '../../ExtensionCommands';
import { VSCodeBlockchainOutputAdapter } from '../../src/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../../src/logging/OutputAdapter';
import { IFabricWallet } from '../../src/fabric/IFabricWallet';
import { BlockchainRuntimeExplorerProvider } from '../../src/explorer/runtimeOpsExplorer';
import { BlockchainTreeItem } from '../../src/explorer/model/BlockchainTreeItem';
import * as myExtension from '../../src/extension';
import { NodesTreeItem } from '../../src/explorer/runtimeOps/NodesTreeItem';
import { CertificateAuthorityTreeItem } from '../../src/explorer/runtimeOps/CertificateAuthorityTreeItem';

// tslint:disable no-unused-expression
chai.should();
chai.use(sinonChai);

describe('createNewIdentityCommand', () => {

    let mySandBox: sinon.SinonSandbox;
    let certificateAuthorityTreeItem: CertificateAuthorityTreeItem;
    let isRunningStub: sinon.SinonStub;
    let inputBoxStub: sinon.SinonStub;
    let identityName: string;
    let caChoseStub: sinon.SinonStub;
    let walletExistsStub: sinon.SinonStub;
    let mockFabricRuntimeConnection: sinon.SinonStubbedInstance<FabricRuntimeConnection>;
    let importIdentityStub: sinon.SinonStub;
    let executeCommandStub: sinon.SinonStub;
    let logSpy: sinon.SinonSpy;

    before(async () => {
        await TestUtil.setupTests();
    });

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
        const runtimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();

        isRunningStub = mySandBox.stub(FabricRuntimeManager.instance().getRuntime(), 'isRunning').resolves(true);

        inputBoxStub = mySandBox.stub(UserInputUtil, 'showInputBox');
        caChoseStub = mySandBox.stub(UserInputUtil, 'showCertificateAuthorityQuickPickBox').resolves('ca.name');

        const testFabricWallet: FabricWallet = new FabricWallet('/some/path');
        walletExistsStub = mySandBox.stub(testFabricWallet, 'exists').resolves(false);
        importIdentityStub = mySandBox.stub(testFabricWallet, 'importIdentity').resolves();
        runtimeManager.gatewayWallet = testFabricWallet as IFabricWallet;

        mockFabricRuntimeConnection = sinon.createStubInstance(FabricRuntimeConnection);
        mockFabricRuntimeConnection.connect.resolves();
        mockFabricRuntimeConnection.getAllCertificateAuthorityNames.returns(['ca.name']);
        mockFabricRuntimeConnection.getAllOrdererNames.returns([]);
        mockFabricRuntimeConnection.getAllPeerNames.returns([]);
        mockFabricRuntimeConnection.register.resolves('its a secret');
        mockFabricRuntimeConnection.enroll.resolves({
            certificate: 'this is a certificate',
            privateKey: 'this is a private Key'
        });
        mockFabricRuntimeConnection.disconnect.resolves();
        mySandBox.stub(FabricConnectionFactory, 'createFabricRuntimeConnection').returns(mockFabricRuntimeConnection);
        mySandBox.stub(runtimeManager, 'getConnection').resolves((mockFabricRuntimeConnection as any));

        executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand');
        executeCommandStub.withArgs(ExtensionCommands.START_FABRIC).resolves();
        executeCommandStub.callThrough();
        logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');

        const runtimeExplorerProvider: BlockchainRuntimeExplorerProvider = myExtension.getBlockchainRuntimeExplorerProvider();
        const allChildren: BlockchainTreeItem[] = await runtimeExplorerProvider.getChildren();
        const nodesTreeItem: NodesTreeItem = allChildren[2] as NodesTreeItem;
        const nodes: BlockchainTreeItem[] = await runtimeExplorerProvider.getChildren(nodesTreeItem);
        certificateAuthorityTreeItem = nodes[0] as CertificateAuthorityTreeItem;
    });

    afterEach(async () => {
        mySandBox.restore();
    });

    it('should create a new identity from a CA when called from the command palette', async () => {
        identityName = 'greenConga';
        inputBoxStub.resolves(identityName);
        await vscode.commands.executeCommand(ExtensionCommands.CREATE_NEW_IDENTITY);

        caChoseStub.should.have.been.calledOnce;
        inputBoxStub.should.have.been.calledOnce;
        walletExistsStub.should.have.been.calledOnceWithExactly(identityName);
        mockFabricRuntimeConnection.connect.should.have.been.calledOnce;
        mockFabricRuntimeConnection.register.should.have.been.calledOnce;
        mockFabricRuntimeConnection.enroll.should.have.been.calledOnce;
        importIdentityStub.should.have.been.calledOnce;
        mockFabricRuntimeConnection.disconnect.should.have.been.calledOnce;

        executeCommandStub.getCall(3).should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);

        logSpy.should.have.been.calledTwice;
        logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'createNewIdentity');
        logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added identity', `Successfully added ${identityName} to runtime gateway`);
    });

    it('should create a new identity when selected from a CA in the tree', async () => {
        identityName = 'blueConga';
        inputBoxStub.resolves(identityName);
        await vscode.commands.executeCommand(ExtensionCommands.CREATE_NEW_IDENTITY, certificateAuthorityTreeItem);

        inputBoxStub.should.have.been.calledOnce;
        caChoseStub.should.not.have.been.called;
        walletExistsStub.should.have.been.calledOnceWithExactly(identityName);
        mockFabricRuntimeConnection.connect.should.have.been.calledOnce;
        mockFabricRuntimeConnection.register.should.have.been.calledOnce;
        mockFabricRuntimeConnection.enroll.should.have.been.calledOnce;
        importIdentityStub.should.have.been.calledOnce;
        mockFabricRuntimeConnection.disconnect.should.have.been.calledOnce;

        executeCommandStub.getCall(3).should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);

        logSpy.should.have.been.calledTwice;
        logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'createNewIdentity');
        logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added identity', `Successfully added ${identityName} to runtime gateway`);
    });

    it('should allow the user to create multiple identities from the CA', async () => {
        identityName = 'violetConga';
        inputBoxStub.resolves(identityName);
        await vscode.commands.executeCommand(ExtensionCommands.CREATE_NEW_IDENTITY);

        const secondIdentityName: string = 'blueConga';
        inputBoxStub.resolves(secondIdentityName);
        await vscode.commands.executeCommand(ExtensionCommands.CREATE_NEW_IDENTITY, certificateAuthorityTreeItem);

        caChoseStub.should.have.been.calledOnce;
        inputBoxStub.should.have.been.calledTwice;
        walletExistsStub.getCall(0).should.have.been.calledWith(identityName);
        walletExistsStub.getCall(1).should.have.been.calledWith(secondIdentityName);
        mockFabricRuntimeConnection.connect.should.have.been.calledTwice;
        mockFabricRuntimeConnection.register.should.have.been.calledTwice;
        mockFabricRuntimeConnection.enroll.should.have.been.calledTwice;
        importIdentityStub.should.have.been.calledTwice;
        mockFabricRuntimeConnection.disconnect.should.have.been.calledTwice;

        executeCommandStub.getCall(3).should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);
        executeCommandStub.getCall(5).should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);

        logSpy.callCount.should.equal(4);
        logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'createNewIdentity');
        logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added identity', `Successfully added ${identityName} to runtime gateway`);
        logSpy.getCall(2).should.have.been.calledWith(LogType.INFO, undefined, 'createNewIdentity');
        logSpy.getCall(3).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added identity', `Successfully added ${secondIdentityName} to runtime gateway`);

    });

    it('should start the runtime if it is stopped before creating a new identity from the CA', async () => {
        isRunningStub.onCall(2).resolves(false);

        identityName = 'yellowConga';
        inputBoxStub.resolves(identityName);
        await vscode.commands.executeCommand(ExtensionCommands.CREATE_NEW_IDENTITY);

        caChoseStub.should.have.been.calledOnce;
        inputBoxStub.should.have.been.calledOnce;
        walletExistsStub.should.have.been.calledOnceWithExactly(identityName);
        mockFabricRuntimeConnection.connect.should.have.been.calledOnce;
        mockFabricRuntimeConnection.register.should.have.been.calledOnce;
        mockFabricRuntimeConnection.enroll.should.have.been.calledOnce;
        importIdentityStub.should.have.been.calledOnce;
        mockFabricRuntimeConnection.disconnect.should.have.been.calledOnce;

        executeCommandStub.getCall(3).should.have.been.calledWith(ExtensionCommands.START_FABRIC);
        executeCommandStub.getCall(4).should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);

        logSpy.should.have.been.calledTwice;
        logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'createNewIdentity');
        logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added identity', `Successfully added ${identityName} to runtime gateway`);
    });

    it('should handle starting local_fabric failing', async () => {
        isRunningStub.resolves(false);
        await vscode.commands.executeCommand(ExtensionCommands.CREATE_NEW_IDENTITY);

        caChoseStub.should.not.have.been.called;
        executeCommandStub.getCall(3).should.have.been.calledWith(ExtensionCommands.START_FABRIC);
        logSpy.should.have.been.calledOnce;
        logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'createNewIdentity');
    });

    it('should handle the user cancelling selecting a CA', async () => {
        caChoseStub.resolves();
        await vscode.commands.executeCommand(ExtensionCommands.CREATE_NEW_IDENTITY);

        caChoseStub.should.have.been.calledOnce;
        inputBoxStub.should.not.have.been.called;
        logSpy.should.have.been.calledOnce;
        logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'createNewIdentity');
    });

    it('should handle the user cancelling providing an identity name', async () => {
        inputBoxStub.resolves();
        await vscode.commands.executeCommand(ExtensionCommands.CREATE_NEW_IDENTITY, certificateAuthorityTreeItem);

        inputBoxStub.should.have.been.calledOnce;
        walletExistsStub.should.not.have.been.called;
        logSpy.should.have.been.calledOnce;
        logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'createNewIdentity');
    });

    it('should handle the identity name already existing in the wallet', async () => {
        walletExistsStub.resolves(true);
        identityName = 'purpleConga';
        inputBoxStub.resolves(identityName);
        await vscode.commands.executeCommand(ExtensionCommands.CREATE_NEW_IDENTITY);

        caChoseStub.should.have.been.calledOnce;
        inputBoxStub.should.have.been.calledOnce;
        walletExistsStub.should.have.been.calledOnceWithExactly(identityName);
        mockFabricRuntimeConnection.connect.should.not.have.been.called;
        logSpy.should.have.been.calledTwice;
        logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'createNewIdentity');
        logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `An identity called ${identityName} already exists in the runtime wallet`, `An identity called ${identityName} already exists in the runtime wallet`);
    });

    it('should handle an error', async () => {
        mockFabricRuntimeConnection.enroll.rejects({ message: 'something bad has occurred' });
        identityName = 'orangeConga';
        inputBoxStub.resolves(identityName);
        await vscode.commands.executeCommand(ExtensionCommands.CREATE_NEW_IDENTITY, certificateAuthorityTreeItem);

        inputBoxStub.should.have.been.calledOnce;
        walletExistsStub.should.have.been.calledOnceWithExactly(identityName);
        mockFabricRuntimeConnection.connect.should.have.been.calledOnce;
        mockFabricRuntimeConnection.register.should.have.been.calledOnce;
        importIdentityStub.should.not.have.been.called;
        logSpy.should.have.been.calledTwice;
        logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'createNewIdentity');
        logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Issue creating new identity: something bad has occurred`);
    });

});
