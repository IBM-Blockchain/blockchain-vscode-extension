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
import { FabricWallet } from 'ibm-blockchain-platform-wallet';
import { FabricEnvironmentConnection } from 'ibm-blockchain-platform-environment-v1';
import { ExtensionCommands } from '../../ExtensionCommands';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { BlockchainEnvironmentExplorerProvider } from '../../extension/explorer/environmentExplorer';
import { BlockchainTreeItem } from '../../extension/explorer/model/BlockchainTreeItem';
import { NodesTreeItem } from '../../extension/explorer/runtimeOps/connectedTree/NodesTreeItem';
import { CertificateAuthorityTreeItem } from '../../extension/explorer/runtimeOps/connectedTree/CertificateAuthorityTreeItem';
import { Reporter } from '../../extension/util/Reporter';
import { FabricEnvironmentManager, ConnectedState } from '../../extension/fabric/environments/FabricEnvironmentManager';
import { FabricEnvironmentRegistryEntry, FabricNode, FabricRuntimeUtil, IFabricWallet, LogType, EnvironmentType } from 'ibm-blockchain-platform-common';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';

// tslint:disable no-unused-expression
chai.should();
chai.use(sinonChai);

describe('createNewIdentityCommand', () => {

    let mySandBox: sinon.SinonSandbox;
    let certificateAuthorityTreeItem: CertificateAuthorityTreeItem;
    let inputBoxStub: sinon.SinonStub;
    let showQuickPickYesNoStub: sinon.SinonStub;
    let identityName: string;
    let caChoseStub: sinon.SinonStub;
    let walletExistsStub: sinon.SinonStub;
    let mockFabricRuntimeConnection: sinon.SinonStubbedInstance<FabricEnvironmentConnection>;
    let importIdentityStub: sinon.SinonStub;
    let executeCommandStub: sinon.SinonStub;
    let logSpy: sinon.SinonSpy;
    let sendTelemetryEventStub: sinon.SinonStub;
    let connectionStub: sinon.SinonStub;

    before(async () => {
        mySandBox = sinon.createSandbox();
        await TestUtil.setupTests(mySandBox);
    });

    beforeEach(async () => {
        inputBoxStub = mySandBox.stub(UserInputUtil, 'showInputBox');
        caChoseStub = mySandBox.stub(UserInputUtil, 'showCertificateAuthorityQuickPickBox').resolves('ca.name');
        showQuickPickYesNoStub = mySandBox.stub(UserInputUtil, 'showQuickPickYesNo').resolves(UserInputUtil.NO);

        const testFabricWallet: IFabricWallet = new FabricWallet('/some/path');
        walletExistsStub = mySandBox.stub(testFabricWallet, 'exists').resolves(false);
        importIdentityStub = mySandBox.stub(testFabricWallet, 'importIdentity').resolves();

        mockFabricRuntimeConnection = mySandBox.createStubInstance(FabricEnvironmentConnection);
        mockFabricRuntimeConnection.getAllCertificateAuthorityNames.returns(['ca.name']);
        mockFabricRuntimeConnection.getAllOrdererNames.returns([]);
        mockFabricRuntimeConnection.getAllPeerNames.returns([]);
        mockFabricRuntimeConnection.register.resolves('it\'s a secret');
        mockFabricRuntimeConnection.enroll.resolves({
            certificate: 'this is a certificate',
            privateKey: 'this is a private Key'
        });
        mockFabricRuntimeConnection.getWallet.withArgs('ca.name').resolves(testFabricWallet);
        mockFabricRuntimeConnection.getNode.withArgs('ca.name').returns(FabricNode.newCertificateAuthority('ca.name', 'ca.name', 'http://localhost:7054', 'ca_name', 'wallet', 'identity', 'Org1MSP', 'admin', 'adminpw'));
        connectionStub = mySandBox.stub(FabricEnvironmentManager.instance(), 'getConnection');
        connectionStub.returns((mockFabricRuntimeConnection as any));

        const environmentRegistryEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
        environmentRegistryEntry.name = FabricRuntimeUtil.LOCAL_FABRIC;
        environmentRegistryEntry.managedRuntime = true;
        environmentRegistryEntry.environmentType = EnvironmentType.LOCAL_ENVIRONMENT;

        mySandBox.stub(FabricEnvironmentManager.instance(), 'getEnvironmentRegistryEntry').returns(environmentRegistryEntry);
        mySandBox.stub(FabricEnvironmentManager.instance(), 'getState').returns(ConnectedState.CONNECTED);
        executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand');
        executeCommandStub.withArgs(ExtensionCommands.CONNECT_TO_ENVIRONMENT).resolves();
        executeCommandStub.callThrough();
        logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
        sendTelemetryEventStub = mySandBox.stub(Reporter.instance(), 'sendTelemetryEvent');

        const runtimeExplorerProvider: BlockchainEnvironmentExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();
        const allChildren: BlockchainTreeItem[] = await runtimeExplorerProvider.getChildren();
        const nodesTreeItem: NodesTreeItem = allChildren[3] as NodesTreeItem;
        const nodes: BlockchainTreeItem[] = await runtimeExplorerProvider.getChildren(nodesTreeItem);
        certificateAuthorityTreeItem = nodes[0] as CertificateAuthorityTreeItem;
    });

    afterEach(async () => {
        mySandBox.restore();
    });

    it('should create a new identity from a CA when called from the command palette', async () => {
        identityName = 'greenConga';
        inputBoxStub.resolves(identityName);
        const message: string = `Successfully created identity '${identityName}'`;
        await vscode.commands.executeCommand(ExtensionCommands.CREATE_NEW_IDENTITY);

        caChoseStub.should.have.been.calledOnce;
        inputBoxStub.should.have.been.calledOnce;
        walletExistsStub.should.have.been.calledOnceWithExactly(identityName);
        mockFabricRuntimeConnection.register.should.have.been.calledOnceWith('ca.name', 'greenConga', '', undefined);
        mockFabricRuntimeConnection.enroll.should.have.been.calledOnceWith('ca.name', 'greenConga', 'it\'s a secret');
        importIdentityStub.should.have.been.calledOnceWith(sinon.match.string, sinon.match.string, 'greenConga', 'Org1MSP');

        executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);

        logSpy.should.have.been.calledTwice;
        logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'createNewIdentity');
        logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, message);
        sendTelemetryEventStub.should.have.been.calledOnceWithExactly('createNewIdentityCommand');
    });

    it('should create a new identity when selected from a CA in the tree', async () => {
        identityName = 'blueConga';
        inputBoxStub.resolves(identityName);

        await vscode.commands.executeCommand(ExtensionCommands.CREATE_NEW_IDENTITY, certificateAuthorityTreeItem);

        inputBoxStub.should.have.been.calledOnce;
        caChoseStub.should.not.have.been.called;
        walletExistsStub.should.have.been.calledOnceWithExactly(identityName);
        mockFabricRuntimeConnection.register.should.have.been.calledOnceWith('ca.name', 'blueConga', '', undefined);
        mockFabricRuntimeConnection.enroll.should.have.been.calledOnceWith('ca.name', 'blueConga', 'it\'s a secret');
        importIdentityStub.should.have.been.calledOnceWith(sinon.match.string, sinon.match.string, 'blueConga', 'Org1MSP');

        executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);

        logSpy.should.have.been.calledTwice;
        logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'createNewIdentity');
        logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, `Successfully created identity '${identityName}'`);
        sendTelemetryEventStub.should.have.been.calledOnceWithExactly('createNewIdentityCommand');
    });

    it('should try to connect if no connection', async () => {
        identityName = 'turqoiseConga';
        connectionStub.resetHistory();
        connectionStub.onFirstCall().returns(undefined);
        connectionStub.onSecondCall().returns(mockFabricRuntimeConnection);
        inputBoxStub.resolves(identityName);
        await vscode.commands.executeCommand(ExtensionCommands.CREATE_NEW_IDENTITY, certificateAuthorityTreeItem);

        executeCommandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT);
        inputBoxStub.should.have.been.calledOnce;
        caChoseStub.should.not.have.been.called;
        walletExistsStub.should.have.been.calledOnceWithExactly(identityName);
        mockFabricRuntimeConnection.register.should.have.been.calledOnceWith('ca.name', 'turqoiseConga', '');
        mockFabricRuntimeConnection.enroll.should.have.been.calledOnceWith('ca.name', 'turqoiseConga', 'it\'s a secret');
        importIdentityStub.should.have.been.calledOnceWith(sinon.match.string, sinon.match.string, 'turqoiseConga', 'Org1MSP');

        executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);

        logSpy.should.have.been.calledTwice;
        logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'createNewIdentity');
        logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, `Successfully created identity '${identityName}'`);
        sendTelemetryEventStub.should.have.been.calledOnceWithExactly('createNewIdentityCommand');
    });

    it('should return if cannot make connection', async () => {
        identityName = 'orangeConga';
        connectionStub.returns(undefined);
        inputBoxStub.resolves(identityName);
        await vscode.commands.executeCommand(ExtensionCommands.CREATE_NEW_IDENTITY, certificateAuthorityTreeItem);

        executeCommandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT);
        inputBoxStub.should.not.have.been.called;
        caChoseStub.should.not.have.been.called;
        walletExistsStub.should.not.have.been.called;

        logSpy.should.have.been.calledOnce;
        logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'createNewIdentity');
    });

    it('should allow the user to create multiple identities from the CA', async () => {
        identityName = 'violetConga';
        inputBoxStub.resolves(identityName);

        const messageOne: string = `Successfully created identity '${identityName}'`;

        await vscode.commands.executeCommand(ExtensionCommands.CREATE_NEW_IDENTITY);

        const secondIdentityName: string = 'blueConga';
        inputBoxStub.resolves(secondIdentityName);

        const messageTwo: string = `Successfully created identity '${secondIdentityName}'`;

        await vscode.commands.executeCommand(ExtensionCommands.CREATE_NEW_IDENTITY, certificateAuthorityTreeItem);

        caChoseStub.should.have.been.calledOnce;
        inputBoxStub.should.have.been.calledTwice;
        walletExistsStub.getCall(0).should.have.been.calledWith(identityName);
        walletExistsStub.getCall(1).should.have.been.calledWith(secondIdentityName);
        mockFabricRuntimeConnection.register.should.have.been.calledTwice;
        mockFabricRuntimeConnection.enroll.should.have.been.calledTwice;
        importIdentityStub.should.have.been.calledTwice;

        executeCommandStub.getCall(5).should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);
        executeCommandStub.getCall(7).should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);

        logSpy.callCount.should.equal(4);
        logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'createNewIdentity');
        logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, messageOne);
        logSpy.getCall(2).should.have.been.calledWith(LogType.INFO, undefined, 'createNewIdentity');
        logSpy.getCall(3).should.have.been.calledWith(LogType.SUCCESS, messageTwo);
        sendTelemetryEventStub.should.have.been.calledTwice;
        sendTelemetryEventStub.should.have.been.calledWithExactly('createNewIdentityCommand');

    });

    it('should create a new identity from a CA and ask for the mspid', async () => {
        mockFabricRuntimeConnection.getNode.withArgs('ca.name').returns(FabricNode.newCertificateAuthority('ca.name', 'ca.name', 'http://localhost:7054', 'ca_name', 'wallet', 'identity', null, 'admin', 'adminpw'));
        inputBoxStub.withArgs('Enter MSPID').resolves('otherMSP');

        identityName = 'redConga';
        inputBoxStub.resolves(identityName);
        const message: string = `Successfully created identity '${identityName}'`;

        await vscode.commands.executeCommand(ExtensionCommands.CREATE_NEW_IDENTITY);

        caChoseStub.should.have.been.calledOnce;
        inputBoxStub.should.have.been.calledTwice;
        walletExistsStub.should.have.been.calledOnceWithExactly(identityName);
        mockFabricRuntimeConnection.register.should.have.been.calledOnceWith('ca.name', 'redConga', '', undefined);
        mockFabricRuntimeConnection.enroll.should.have.been.calledOnceWith('ca.name', 'redConga', 'it\'s a secret');
        importIdentityStub.should.have.been.calledOnceWith(sinon.match.string, sinon.match.string, 'redConga', 'otherMSP');

        executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);

        logSpy.should.have.been.calledTwice;
        logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'createNewIdentity');
        logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, message);
        sendTelemetryEventStub.should.have.been.calledOnceWithExactly('createNewIdentityCommand');
    });

    it('should handle cancel from choosing mspid', async () => {
        mockFabricRuntimeConnection.getNode.withArgs('ca.name').returns(FabricNode.newCertificateAuthority('ca.name', 'ca.name', 'http://localhost:7054', 'ca_name', 'wallet', 'identity', null, 'admin', 'adminpw'));
        inputBoxStub.withArgs('Enter MSPID').resolves();

        identityName = 'redConga';
        inputBoxStub.resolves(identityName);
        await vscode.commands.executeCommand(ExtensionCommands.CREATE_NEW_IDENTITY);

        caChoseStub.should.have.been.calledOnce;
        inputBoxStub.should.have.been.calledTwice;
        walletExistsStub.should.have.been.calledOnceWithExactly(identityName);
        mockFabricRuntimeConnection.register.should.not.have.been.called;
        mockFabricRuntimeConnection.enroll.should.not.have.been.called;
        importIdentityStub.should.not.have.been.called;

        logSpy.should.have.been.calledOnce;
        logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'createNewIdentity');
        sendTelemetryEventStub.should.not.have.been.calledOnceWithExactly('createNewIdentityCommand');
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
        logSpy.should.have.been.calledTwice;
        logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'createNewIdentity');
        logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `An identity called ${identityName} already exists`);
        sendTelemetryEventStub.should.not.have.been.called;
    });

    it('should handle an error', async () => {
        mockFabricRuntimeConnection.enroll.rejects({ message: 'something bad has occurred' });
        identityName = 'orangeConga';
        inputBoxStub.resolves(identityName);
        await vscode.commands.executeCommand(ExtensionCommands.CREATE_NEW_IDENTITY, certificateAuthorityTreeItem);

        inputBoxStub.should.have.been.calledOnce;
        walletExistsStub.should.have.been.calledOnceWithExactly(identityName);
        mockFabricRuntimeConnection.register.should.have.been.calledOnce;
        importIdentityStub.should.not.have.been.called;
        logSpy.should.have.been.calledTwice;
        logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'createNewIdentity');
        logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Issue creating new identity: something bad has occurred`);
    });

    it('should be able to add attributes to a new identity', async () => {
        identityName = 'blueConga';
        inputBoxStub.onCall(0).resolves(identityName);
        const attributesString: string = '[{"name":"hello","value":"world","ecert":true}]';
        inputBoxStub.onCall(1).resolves(attributesString);
        showQuickPickYesNoStub.resolves(UserInputUtil.YES);
        const message: string = `Successfully created identity '${identityName}' with the attributes: ${attributesString}`;
        await vscode.commands.executeCommand(ExtensionCommands.CREATE_NEW_IDENTITY, certificateAuthorityTreeItem);

        inputBoxStub.should.have.been.calledTwice;
        caChoseStub.should.not.have.been.called;
        walletExistsStub.should.have.been.calledOnceWithExactly(identityName);
        mockFabricRuntimeConnection.register.should.have.been.calledOnceWith('ca.name', 'blueConga', '', [{ name: 'hello', value: 'world', ecert: true }]);
        mockFabricRuntimeConnection.enroll.should.have.been.calledOnceWith('ca.name', 'blueConga', 'it\'s a secret');
        importIdentityStub.should.have.been.calledOnceWith(sinon.match.string, sinon.match.string, 'blueConga', 'Org1MSP');

        executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);

        logSpy.should.have.been.calledTwice;
        logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'createNewIdentity');
        logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, message);
        sendTelemetryEventStub.should.have.been.calledOnceWithExactly('createNewIdentityCommand');

    });

    it('should be able to cancel adding attributes', async () => {
        identityName = 'blueConga';
        inputBoxStub.onCall(0).resolves(identityName);
        showQuickPickYesNoStub.resolves();
        await vscode.commands.executeCommand(ExtensionCommands.CREATE_NEW_IDENTITY, certificateAuthorityTreeItem);

        inputBoxStub.should.have.been.calledOnce;
        caChoseStub.should.not.have.been.called;
        walletExistsStub.should.have.been.calledOnceWithExactly(identityName);
        mockFabricRuntimeConnection.register.should.not.have.been.called;
        mockFabricRuntimeConnection.enroll.should.not.have.been.called;
        importIdentityStub.should.not.have.been.called;

        logSpy.should.have.been.calledOnce;
        logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'createNewIdentity');
        sendTelemetryEventStub.should.not.have.been.calledOnceWithExactly('createNewIdentityCommand');
    });

    it('should stop if attributes is undefined', async () => {
        identityName = 'blueConga';
        inputBoxStub.onCall(0).resolves(identityName);
        inputBoxStub.onCall(1).resolves(undefined);
        showQuickPickYesNoStub.resolves(UserInputUtil.YES);
        await vscode.commands.executeCommand(ExtensionCommands.CREATE_NEW_IDENTITY, certificateAuthorityTreeItem);

        inputBoxStub.should.have.been.calledTwice;
        caChoseStub.should.not.have.been.called;
        walletExistsStub.should.have.been.calledOnceWithExactly(identityName);
        mockFabricRuntimeConnection.register.should.not.have.been.called;
        mockFabricRuntimeConnection.enroll.should.not.have.been.called;
        importIdentityStub.should.not.have.been.called;

        logSpy.should.have.been.calledOnce;
        logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'createNewIdentity');
        sendTelemetryEventStub.should.not.have.been.calledOnceWithExactly('createNewIdentityCommand');
    });
});
