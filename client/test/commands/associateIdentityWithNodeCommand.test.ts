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
import * as path from 'path';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { TestUtil } from '../TestUtil';
import { FabricWalletRegistryEntry } from '../../src/fabric/FabricWalletRegistryEntry';
import { FabricWalletRegistry } from '../../src/fabric/FabricWalletRegistry';
import { ExtensionCommands } from '../../ExtensionCommands';
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import { VSCodeBlockchainOutputAdapter } from '../../src/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../../src/logging/OutputAdapter';
import { SettingConfigurations } from '../../SettingConfigurations';
import { FabricEnvironmentRegistry } from '../../src/fabric/FabricEnvironmentRegistry';
import { FabricEnvironmentRegistryEntry } from '../../src/fabric/FabricEnvironmentRegistryEntry';
import { FabricNode, FabricNodeType } from '../../src/fabric/FabricNode';
import { FabricWallet } from '../../src/fabric/FabricWallet';
import { FabricEnvironment } from '../../src/fabric/FabricEnvironment';
import { FabricCertificateAuthority } from '../../src/fabric/FabricCertificateAuthority';
import { FabricRuntimeUtil } from '../../src/fabric/FabricRuntimeUtil';

// tslint:disable no-unused-expression
chai.use(sinonChai);

describe('AssociateIdentityWithNodeCommand', () => {
    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();

    before(async () => {
        await TestUtil.setupTests(mySandBox);
        await TestUtil.storeGatewaysConfig();
        await TestUtil.storeWalletsConfig();
        await TestUtil.storeEnvironmentsConfig();
    });

    after(async () => {
        await TestUtil.restoreGatewaysConfig();
        await TestUtil.restoreWalletsConfig();
        await TestUtil.restoreEnvironmentsConfig();
    });

    describe('associateWallet', () => {
        const rootPath: string = path.dirname(__dirname);
        const walletPath: string = path.join(rootPath, '../../test/data/walletDir/wallet');
        let logSpy: sinon.SinonSpy;
        let showWalletsQuickPickBoxStub: sinon.SinonStub;
        let showEnvironmentQuickPickBoxStub: sinon.SinonStub;
        let showIdentityQuickPickStub: sinon.SinonStub;
        let showInputBoxStub: sinon.SinonStub;
        let showQuickPickStub: sinon.SinonStub;
        let environmentRegistryEntry: FabricEnvironmentRegistryEntry;
        let peerNode: FabricNode;
        let caNodeWithoutCreds: FabricNode;
        let caNodeWithCreds: FabricNode;
        let ordererNode: FabricNode;
        let updateStub: sinon.SinonStub;
        let commandsStub: sinon.SinonStub;
        let certAuthorityStub: sinon.SinonStub;
        let wallet: FabricWalletRegistryEntry;
        let identityExistsStub: sinon.SinonStub;
        let showFabricNodeQuickPickStub: sinon.SinonStub;

        const nodes: any = {};

        beforeEach(async () => {

            // reset the stored environments and wallets
            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_ENVIRONMENTS, [], vscode.ConfigurationTarget.Global);
            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_WALLETS, [], vscode.ConfigurationTarget.Global);

            environmentRegistryEntry = new FabricEnvironmentRegistryEntry({
                name: 'myEnvironment',
                managedRuntime: false,
                associatedWallet: undefined
            });

            await FabricEnvironmentRegistry.instance().clear();
            await FabricEnvironmentRegistry.instance().add(environmentRegistryEntry);

            wallet = new FabricWalletRegistryEntry({
                name: 'blueWallet',
                walletPath: walletPath
            });

            peerNode = FabricNode.newPeer('peer.org1.example.com', 'peer.org1.example.com', 'http://localhost:17051', undefined, undefined, 'Org1MSP');
            caNodeWithoutCreds = FabricNode.newCertificateAuthority('ca.org1.example.com', 'ca.org1.example.com', 'http://localhost:17054', 'ca.org1.example.com', undefined, undefined, undefined, undefined, undefined);
            caNodeWithCreds = FabricNode.newCertificateAuthority('ca.org1.example.com', 'ca.org1.example.com', 'http://localhost:17054', 'ca.org1.example.com', undefined, undefined, undefined, 'admin', 'adminpw');
            ordererNode = FabricNode.newOrderer('order', 'orderer.example.com', 'http://localhost:17056', undefined, undefined, 'osmsp');

            nodes.peerNode = peerNode;
            nodes.caNodeWithCreds = caNodeWithCreds;
            nodes.caNodeWithoutCreds = caNodeWithoutCreds;
            nodes.ordererNode = ordererNode;

            await FabricWalletRegistry.instance().clear();
            await FabricWalletRegistry.instance().add(wallet);

            logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
            showWalletsQuickPickBoxStub = mySandBox.stub(UserInputUtil, 'showWalletsQuickPickBox').resolves({ label: 'blueWallet', data: wallet });

            mySandBox.stub(FabricWallet.prototype, 'getIdentityNames').resolves(['identityOne', 'identitiyTwo']);
            mySandBox.stub(FabricWallet.prototype, 'importIdentity').resolves();
            identityExistsStub = mySandBox.stub(FabricWallet.prototype, 'exists').resolves(false);

            showEnvironmentQuickPickBoxStub = mySandBox.stub(UserInputUtil, 'showFabricEnvironmentQuickPickBox').resolves({ label: 'myEnvironment', data: environmentRegistryEntry });
            showFabricNodeQuickPickStub = mySandBox.stub(UserInputUtil, 'showFabricNodeQuickPick').resolves({ label: peerNode.name, data: peerNode });

            showIdentityQuickPickStub = mySandBox.stub(UserInputUtil, 'showIdentitiesQuickPickBox').resolves('identityOne');
            showQuickPickStub = mySandBox.stub(UserInputUtil, 'showQuickPick').resolves('Choose an existing identity');
            showInputBoxStub = mySandBox.stub(UserInputUtil, 'showInputBox');
            showInputBoxStub.onFirstCall().resolves('identityOne');
            showInputBoxStub.onSecondCall().resolves('org1MSP');

            updateStub = mySandBox.stub(FabricEnvironment.prototype, 'updateNode').resolves();

            commandsStub = mySandBox.stub(vscode.commands, 'executeCommand');
            commandsStub.callThrough();
            commandsStub.withArgs(ExtensionCommands.REFRESH_WALLETS).resolves();
            commandsStub.withArgs(ExtensionCommands.ADD_WALLET).resolves(wallet);
            commandsStub.withArgs(ExtensionCommands.REFRESH_ENVIRONMENTS).resolves();
            commandsStub.withArgs(ExtensionCommands.ADD_WALLET_IDENTITY).resolves('identityOne');

            certAuthorityStub = mySandBox.stub(FabricCertificateAuthority.prototype, 'enroll').resolves({ certificate: 'myCert', privateKey: 'myKey' });
        });

        afterEach(async () => {
            mySandBox.restore();
        });

        describe('associate from the tree', () => {

            ['peerNode', 'ordererNode', 'caNodeWithCreds', 'caNodeWithoutCreds'].forEach((nodeString: string) => {

                it(`should test a wallet can be associated with a node using the tree (${nodeString})`, async () => {
                    const node: FabricNode = nodes[nodeString];

                    await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_IDENTITY_NODE, ...[environmentRegistryEntry, node]);

                    if (node.type === FabricNodeType.PEER) {
                        showWalletsQuickPickBoxStub.should.have.been.calledWith(`An admin identity for "${node.msp_id}" is required to perform installs. Which wallet is it in?`);
                    } else if (node.type === FabricNodeType.ORDERER) {
                        showWalletsQuickPickBoxStub.should.have.been.calledWith(`An admin identity for "${node.msp_id}" is required to perform instantiates. Which wallet is it in?`);
                    } else if (node.type === FabricNodeType.CERTIFICATE_AUTHORITY && !node.enroll_id) {
                        showWalletsQuickPickBoxStub.should.have.been.calledWith(`An Admin identity for ${node.name} is required to register identities. Which wallet is it in?`);
                    } else if (node.type === FabricNodeType.CERTIFICATE_AUTHORITY && node.enroll_id) {
                        showWalletsQuickPickBoxStub.should.have.been.calledWith(`Which wallet is the admin identity in?`);
                    }

                    if (node.type === FabricNodeType.CERTIFICATE_AUTHORITY) {
                        showIdentityQuickPickStub.should.have.been.calledWith(`Select the admin identity`);
                    } else {
                        showIdentityQuickPickStub.should.have.been.calledWith(`Select the admin identity for ${node.msp_id}`);
                    }

                    node.identity = 'identityOne';
                    node.wallet = 'blueWallet';
                    updateStub.should.have.been.calledWith(node);

                    logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associate identity with node');
                    logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Succesfully associated node ${node.name} with wallet ${node.wallet} and identity ${node.identity}`);
                });
            });

            it('should handle cancel when choosing wallet', async () => {
                showWalletsQuickPickBoxStub.resolves();

                await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_IDENTITY_NODE, ...[environmentRegistryEntry, peerNode]);

                showWalletsQuickPickBoxStub.should.have.been.called;
                showIdentityQuickPickStub.should.not.have.been.called;

                logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associate identity with node');
                logSpy.should.not.have.been.calledWith(LogType.SUCCESS);
            });

            it('should handle cancel identities quick pick', async () => {
                showIdentityQuickPickStub.resolves();

                await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_IDENTITY_NODE, ...[environmentRegistryEntry, peerNode]);

                showIdentityQuickPickStub.should.have.been.called;

                logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associate identity with node');
                logSpy.should.not.have.been.calledWith(LogType.SUCCESS);
            });

            it('should handle cancel when choosing to enroll or use existing identity', async () => {
                showQuickPickStub.resolves();

                await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_IDENTITY_NODE, ...[environmentRegistryEntry, caNodeWithCreds]);

                logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associate identity with node');
                logSpy.should.not.have.been.calledWithExactly(LogType.SUCCESS, `Succesfully associated node ${caNodeWithCreds.name} with wallet ${caNodeWithCreds.wallet} and identity ${caNodeWithCreds.identity}`);
            });

            it('should create a new wallet if option selected', async () => {
                showWalletsQuickPickBoxStub.resolves({ label: '+ create new wallet', data: undefined });

                await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_IDENTITY_NODE, ...[environmentRegistryEntry, peerNode]);

                commandsStub.should.have.been.calledWith(ExtensionCommands.ADD_WALLET);

                peerNode.identity = 'identityOne';
                peerNode.wallet = 'blueWallet';
                updateStub.should.have.been.calledWith(peerNode);

                logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associate identity with node');
                logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Succesfully associated node ${peerNode.name} with wallet ${peerNode.wallet} and identity ${peerNode.identity}`);
            });

            it(`should add identity if option selected`, async () => {
                showIdentityQuickPickStub.resolves(UserInputUtil.ADD_IDENTITY);
                await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_IDENTITY_NODE, ...[environmentRegistryEntry, peerNode]);

                commandsStub.should.have.been.calledWith(ExtensionCommands.ADD_WALLET_IDENTITY);

                peerNode.identity = 'identityOne';
                peerNode.wallet = 'blueWallet';
                updateStub.should.have.been.calledWith(peerNode);

                logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associate identity with node');
                logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Succesfully associated node ${peerNode.name} with wallet ${peerNode.wallet} and identity ${peerNode.identity}`);
            });

            it(`should handle cancel from create wallet`, async () => {
                showWalletsQuickPickBoxStub.resolves({ label: '+ create new wallet', data: undefined });
                commandsStub.withArgs(ExtensionCommands.ADD_WALLET).resolves();
                await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_IDENTITY_NODE, ...[environmentRegistryEntry, peerNode]);

                commandsStub.should.have.been.calledWith(ExtensionCommands.ADD_WALLET);

                logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associate identity with node');
                logSpy.should.not.have.been.calledWithExactly(LogType.SUCCESS, `Succesfully associated node ${peerNode.name} with wallet ${peerNode.wallet} and identity ${peerNode.identity}`);
            });

            it(`should handle cancel from add identity`, async () => {
                showIdentityQuickPickStub.resolves(UserInputUtil.ADD_IDENTITY);
                commandsStub.withArgs(ExtensionCommands.ADD_WALLET_IDENTITY).resolves();
                await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_IDENTITY_NODE, ...[environmentRegistryEntry, peerNode]);

                commandsStub.should.have.been.calledWith(ExtensionCommands.ADD_WALLET_IDENTITY);

                logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associate identity with node');
                logSpy.should.not.have.been.calledWithExactly(LogType.SUCCESS, `Succesfully associated node ${peerNode.name} with wallet ${peerNode.wallet} and identity ${peerNode.identity}`);
            });

            it('should throw an error if can\'t update node', async () => {
                const error: Error = new Error('some error');
                updateStub.throws(error);

                await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_IDENTITY_NODE, ...[environmentRegistryEntry, peerNode]);

                logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associate identity with node');
                logSpy.getCall(1).should.have.been.calledWithExactly(LogType.ERROR, `Failed to associate identity with node ${error.message}`, `Failed to associate identity with node ${error.toString()}`);
            });
        });

        describe('associate from command', () => {
            it('should test a wallet can be associated with a node using command', async () => {
                await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_IDENTITY_NODE);

                peerNode.identity = 'identityOne';
                peerNode.wallet = 'blueWallet';
                updateStub.should.have.been.calledWith(peerNode);

                logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associate identity with node');
                logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Succesfully associated node ${peerNode.name} with wallet ${peerNode.wallet} and identity ${peerNode.identity}`);
            });

            it('should give error if no environments', async () => {
                await FabricEnvironmentRegistry.instance().clear();
                await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_IDENTITY_NODE);

                logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associate identity with node');
                logSpy.getCall(1).should.have.been.calledWithExactly(LogType.ERROR, `Add an environment to associate identities with nodes. ${FabricRuntimeUtil.LOCAL_FABRIC} cannot be editted.`);
                logSpy.should.not.have.been.calledWith(LogType.SUCCESS);
            });

            it('should handle cancel from choosing environment', async () => {
                showEnvironmentQuickPickBoxStub.resolves();
                await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_IDENTITY_NODE);

                logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associate identity with node');
                logSpy.should.not.have.been.calledWith(LogType.SUCCESS);
            });

            it('should handle cancel from choosing node', async () => {
                showFabricNodeQuickPickStub.resolves();
                await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_IDENTITY_NODE);

                logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associate identity with node');
                logSpy.should.not.have.been.calledWith(LogType.SUCCESS);
            });
        });

        describe('enroll', () => {
            it('should enroll if has enroll id and secret', async () => {
                showQuickPickStub.resolves('Use ID and secret to enroll a new identity');

                await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_IDENTITY_NODE, environmentRegistryEntry, caNodeWithCreds);

                showWalletsQuickPickBoxStub.should.have.been.calledWith(`Which wallet do you want to add the admin identitiy to?`);

                showInputBoxStub.should.have.been.calledWith(`Provide a name for the identity`);
                showInputBoxStub.should.have.been.calledWith('Enter MSPID');

                caNodeWithCreds.identity = 'identityOne';
                caNodeWithCreds.wallet = 'blueWallet';
                updateStub.should.have.been.calledWith(caNodeWithCreds);

                certAuthorityStub.should.have.been.calledWith(caNodeWithCreds.api_url, caNodeWithCreds.enroll_id, caNodeWithCreds.enroll_secret);

                commandsStub.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);

                logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associate identity with node');
                logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Succesfully associated node ${caNodeWithCreds.name} with wallet ${caNodeWithCreds.wallet} and identity ${caNodeWithCreds.identity}`);
            });

            it('should only ask for mspid if not set', async () => {
                showQuickPickStub.resolves('Use ID and secret to enroll a new identity');
                caNodeWithCreds.msp_id = 'Org1MSP';

                await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_IDENTITY_NODE, environmentRegistryEntry, caNodeWithCreds);

                showWalletsQuickPickBoxStub.should.have.been.calledWith(`Which wallet do you want to add the admin identitiy to?`);

                showInputBoxStub.should.have.been.calledWith(`Provide a name for the identity`);
                showInputBoxStub.should.not.have.been.calledWith('Enter MSPID');

                caNodeWithCreds.identity = 'identityOne';
                caNodeWithCreds.wallet = 'blueWallet';
                updateStub.should.have.been.calledWith(caNodeWithCreds);

                certAuthorityStub.should.have.been.calledWith(caNodeWithCreds.api_url, caNodeWithCreds.enroll_id, caNodeWithCreds.enroll_secret);

                commandsStub.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);

                logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associate identity with node');
                logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Succesfully associated node ${caNodeWithCreds.name} with wallet ${caNodeWithCreds.wallet} and identity ${caNodeWithCreds.identity}`);
            });

            it('should handle cancel from giving identity name', async () => {
                showInputBoxStub.onFirstCall().resolves();
                showQuickPickStub.resolves('Use ID and secret to enroll a new identity');

                await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_IDENTITY_NODE, environmentRegistryEntry, caNodeWithCreds);

                showWalletsQuickPickBoxStub.should.have.been.calledWith(`Which wallet do you want to add the admin identitiy to?`);

                showInputBoxStub.should.have.been.calledWith(`Provide a name for the identity`);

                logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associate identity with node');
                logSpy.should.not.have.been.calledWith(LogType.SUCCESS);
            });

            it('should handle cancel from choosing mspid', async () => {
                showInputBoxStub.onSecondCall().resolves();
                showQuickPickStub.resolves('Use ID and secret to enroll a new identity');

                await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_IDENTITY_NODE, environmentRegistryEntry, caNodeWithCreds);

                showWalletsQuickPickBoxStub.should.have.been.calledWith(`Which wallet do you want to add the admin identitiy to?`);

                showInputBoxStub.should.have.been.calledWith(`Provide a name for the identity`);
                showInputBoxStub.should.have.been.calledWith('Enter MSPID');

                logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associate identity with node');
                logSpy.should.not.have.been.calledWith(LogType.SUCCESS);
            });

            it('should give error if identity name already exists', async () => {
                identityExistsStub.resolves(true);
                showQuickPickStub.resolves('Use ID and secret to enroll a new identity');

                await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_IDENTITY_NODE, environmentRegistryEntry, caNodeWithCreds);

                showWalletsQuickPickBoxStub.should.have.been.calledWith(`Which wallet do you want to add the admin identitiy to?`);

                showInputBoxStub.should.have.been.calledWith(`Provide a name for the identity`);

                logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associate identity with node');
                logSpy.getCall(1).should.have.been.calledWithExactly(LogType.ERROR, `An identity called identityOne already exists`);
                logSpy.should.not.have.been.calledWith(LogType.SUCCESS);
            });
        });
    });
});
