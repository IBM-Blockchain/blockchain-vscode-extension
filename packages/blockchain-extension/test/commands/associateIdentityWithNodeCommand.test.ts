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
import { ExtensionCommands } from '../../ExtensionCommands';
import { UserInputUtil } from '../../extension/commands/UserInputUtil';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { FabricWallet } from 'ibm-blockchain-platform-wallet';
import { FabricCertificateAuthority } from 'ibm-blockchain-platform-environment-v1';
import { FabricEnvironmentRegistry, FabricEnvironmentRegistryEntry, FabricNode, FabricNodeType, FabricWalletRegistry, FabricWalletRegistryEntry, LogType, FabricEnvironment, EnvironmentType } from 'ibm-blockchain-platform-common';
import { NodeTreeItem } from '../../extension/explorer/runtimeOps/connectedTree/NodeTreeItem';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';
import { BlockchainEnvironmentExplorerProvider } from '../../extension/explorer/environmentExplorer';
import { FabricEnvironmentManager, ConnectedState } from '../../extension/fabric/environments/FabricEnvironmentManager';

// tslint:disable no-unused-expression
chai.use(sinonChai);

describe('AssociateIdentityWithNodeCommand', () => {
    let mySandBox: sinon.SinonSandbox;

    before(async () => {
        mySandBox = sinon.createSandbox();
        await TestUtil.setupTests(mySandBox);
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
        let showQuickPickYesNoStub: sinon.SinonStub;
        let environmentRegistryEntry: FabricEnvironmentRegistryEntry;
        let peerNode: FabricNode;
        let caNodeWithoutCreds: FabricNode;
        let caNodeWithCreds: FabricNode;
        let ordererNode: FabricNode;
        let updateStub: sinon.SinonStub;
        let getNodesStub: sinon.SinonStub;
        let commandsStub: sinon.SinonStub;
        let certAuthorityStub: sinon.SinonStub;
        let wallet: FabricWalletRegistryEntry;
        let identityExistsStub: sinon.SinonStub;
        let showNodesInEnvironmentQuickPickStub: sinon.SinonStub;
        let updateWalletSpy: sinon.SinonSpy;

        const nodes: any = {};

        beforeEach(async () => {
            await FabricEnvironmentRegistry.instance().clear();
            await FabricWalletRegistry.instance().clear();

            environmentRegistryEntry = new FabricEnvironmentRegistryEntry({
                name: 'myEnvironment',
                managedRuntime: false
            });

            await FabricEnvironmentRegistry.instance().clear();
            await FabricEnvironmentRegistry.instance().add(environmentRegistryEntry);

            wallet = new FabricWalletRegistryEntry({
                name: 'blueWallet',
                walletPath: walletPath
            });

            peerNode = FabricNode.newPeer('peerNode', 'peer.org1.example.com', 'http://localhost:17051', undefined, undefined, 'Org1MSP');
            caNodeWithoutCreds = FabricNode.newCertificateAuthority('caNodeWithoutCreds', 'ca.org1.example.com', 'http://localhost:17054', 'ca.org1.example.com', undefined, undefined, undefined, undefined, undefined);
            caNodeWithCreds = FabricNode.newCertificateAuthority('caNodeWithCreds', 'ca.org1.example.com', 'http://localhost:17054', 'ca.org1.example.com', undefined, undefined, undefined, 'admin', 'adminpw');
            ordererNode = FabricNode.newOrderer('ordererNode', 'orderer.example.com', 'http://localhost:17056', undefined, undefined, 'osmsp', undefined);

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
            showNodesInEnvironmentQuickPickStub = mySandBox.stub(UserInputUtil, 'showNodesInEnvironmentQuickPick').resolves({ label: peerNode.name, data: peerNode });

            showIdentityQuickPickStub = mySandBox.stub(UserInputUtil, 'showIdentitiesQuickPickBox').resolves('identityOne');
            showQuickPickStub = mySandBox.stub(UserInputUtil, 'showQuickPick').resolves('Choose an existing identity');
            showQuickPickYesNoStub = mySandBox.stub(UserInputUtil, 'showQuickPickYesNo').withArgs('Do you want to associate the same identity with another node?').resolves(UserInputUtil.NO);
            showInputBoxStub = mySandBox.stub(UserInputUtil, 'showInputBox');
            showInputBoxStub.onFirstCall().resolves('identityOne');
            showInputBoxStub.onSecondCall().resolves('org1MSP');

            updateStub = mySandBox.stub(FabricEnvironment.prototype, 'updateNode').resolves();
            getNodesStub = mySandBox.stub(FabricEnvironment.prototype, 'getNodes').resolves([ordererNode, caNodeWithoutCreds]);

            commandsStub = mySandBox.stub(vscode.commands, 'executeCommand');
            commandsStub.callThrough();
            commandsStub.withArgs(ExtensionCommands.REFRESH_WALLETS).resolves();
            commandsStub.withArgs(ExtensionCommands.ADD_WALLET).resolves(wallet);
            commandsStub.withArgs(ExtensionCommands.CONNECT_TO_ENVIRONMENT).resolves();
            commandsStub.withArgs(ExtensionCommands.ADD_WALLET_IDENTITY).resolves('identityOne');

            certAuthorityStub = mySandBox.stub(FabricCertificateAuthority.prototype, 'enroll').resolves({ certificate: 'myCert', privateKey: 'myKey' });

            updateWalletSpy = mySandBox.spy(FabricWalletRegistry.instance(), 'update');
        });

        afterEach(async () => {
            mySandBox.restore();
        });

        describe('associate from the tree', () => {

            ['peerNode', 'ordererNode', 'caNodeWithCreds', 'caNodeWithoutCreds'].forEach((nodeString: string) => {

                it(`should test an identity can be associated with a node using the tree (${nodeString})`, async () => {
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
                    updateStub.should.have.been.calledOnceWith(node);

                    updateWalletSpy.should.have.been.called;

                    commandsStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);

                    logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associate identity with node');
                    logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully associated identity ${node.identity} from wallet ${node.wallet} with node ${node.name}`);
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
                logSpy.should.not.have.been.calledWithExactly(LogType.SUCCESS, `Successfully associated identity ${caNodeWithCreds.identity} from wallet ${caNodeWithCreds.wallet} with node ${caNodeWithCreds.name}`);
            });

            it(`should update the wallet's environmentGroups property if associating with nodes in another environment`, async () => {
                wallet.environmentGroups = ['someEnvironment'];
                const node: FabricNode = nodes.peerNode;

                await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_IDENTITY_NODE, ...[environmentRegistryEntry, node]);

                showWalletsQuickPickBoxStub.should.have.been.calledWith(`An admin identity for "${node.msp_id}" is required to perform installs. Which wallet is it in?`);
                showIdentityQuickPickStub.should.have.been.calledWith(`Select the admin identity for ${node.msp_id}`);

                node.identity = 'identityOne';
                node.wallet = 'blueWallet';
                updateStub.should.have.been.calledOnceWith(node);

                updateWalletSpy.should.have.been.calledWith({
                    name: 'blueWallet',
                    walletPath: walletPath,
                    environmentGroups: ['someEnvironment', environmentRegistryEntry.name]
                });

                commandsStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);

                logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associate identity with node');
                logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully associated identity ${node.identity} from wallet ${node.wallet} with node ${node.name}`);
            });

            it('should associate with nodes from an environment that has already been associated with', async () => {
                wallet.environmentGroups = [environmentRegistryEntry.name];
                const node: FabricNode = nodes.peerNode;

                await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_IDENTITY_NODE, ...[environmentRegistryEntry, node]);

                showWalletsQuickPickBoxStub.should.have.been.calledWith(`An admin identity for "${node.msp_id}" is required to perform installs. Which wallet is it in?`);
                showIdentityQuickPickStub.should.have.been.calledWith(`Select the admin identity for ${node.msp_id}`);

                node.identity = 'identityOne';
                node.wallet = 'blueWallet';
                updateStub.should.have.been.calledOnceWith(node);

                updateWalletSpy.should.have.been.calledWith({
                    name: 'blueWallet',
                    walletPath: walletPath,
                    environmentGroups: [environmentRegistryEntry.name]
                });

                commandsStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);

                logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associate identity with node');
                logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully associated identity ${node.identity} from wallet ${node.wallet} with node ${node.name}`);
            });

            it('should create a new wallet if option selected', async () => {
                showWalletsQuickPickBoxStub.resolves({ label: '+ create new wallet', data: undefined });

                await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_IDENTITY_NODE, ...[environmentRegistryEntry, peerNode]);

                commandsStub.should.have.been.calledWith(ExtensionCommands.ADD_WALLET, false);

                peerNode.identity = 'identityOne';
                peerNode.wallet = 'blueWallet';
                updateStub.should.have.been.calledOnceWith(peerNode);

                updateWalletSpy.should.have.been.called;

                commandsStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);

                logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associate identity with node');
                logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully associated identity ${peerNode.identity} from wallet ${peerNode.wallet} with node ${peerNode.name}`);
            });

            it('should create a new wallet and add environmentGroup if created from an ops tools environment', async () => {
                showWalletsQuickPickBoxStub.resolves({ label: '+ create new wallet', data: undefined });

                const opsToolsEnv: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
                opsToolsEnv.name = 'opsToolsEnv';
                opsToolsEnv.environmentType = EnvironmentType.OPS_TOOLS_ENVIRONMENT;

                await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_IDENTITY_NODE, ...[opsToolsEnv, peerNode]);

                commandsStub.should.have.been.calledWith(ExtensionCommands.ADD_WALLET, false, opsToolsEnv.name);

                peerNode.identity = 'identityOne';
                peerNode.wallet = 'blueWallet';
                updateStub.should.have.been.calledOnceWith(peerNode);

                updateWalletSpy.should.have.been.calledWith({
                    name: 'blueWallet',
                    walletPath: walletPath,
                    environmentGroups: [opsToolsEnv.name]
                });

                commandsStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, opsToolsEnv);

                logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associate identity with node');
                logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully associated identity ${peerNode.identity} from wallet ${peerNode.wallet} with node ${peerNode.name}`);
            });

            it('should create a new wallet and add environmentGroup if created from a saas ops tools environment', async () => {
                showWalletsQuickPickBoxStub.resolves({ label: '+ create new wallet', data: undefined });

                const saasEnv: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
                saasEnv.name = 'saasEnv';
                saasEnv.environmentType = EnvironmentType.OPS_TOOLS_ENVIRONMENT;

                await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_IDENTITY_NODE, ...[saasEnv, peerNode]);

                commandsStub.should.have.been.calledWith(ExtensionCommands.ADD_WALLET, false, saasEnv.name);

                peerNode.identity = 'identityOne';
                peerNode.wallet = 'blueWallet';
                updateStub.should.have.been.calledOnceWith(peerNode);

                updateWalletSpy.should.have.been.calledWith({
                    name: 'blueWallet',
                    walletPath: walletPath,
                    environmentGroups: [saasEnv.name]
                });

                commandsStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, saasEnv);

                logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associate identity with node');
                logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully associated identity ${peerNode.identity} from wallet ${peerNode.wallet} with node ${peerNode.name}`);
            });

            it(`should add identity if option selected`, async () => {
                showIdentityQuickPickStub.resolves(UserInputUtil.ADD_IDENTITY);
                await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_IDENTITY_NODE, ...[environmentRegistryEntry, peerNode]);

                commandsStub.should.have.been.calledWith(ExtensionCommands.ADD_WALLET_IDENTITY, sinon.match.instanceOf(FabricWalletRegistryEntry), peerNode.msp_id);

                peerNode.identity = 'identityOne';
                peerNode.wallet = 'blueWallet';
                updateStub.should.have.been.calledOnceWith(peerNode);

                updateWalletSpy.should.have.been.called;

                commandsStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);

                logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associate identity with node');
                logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully associated identity ${peerNode.identity} from wallet ${peerNode.wallet} with node ${peerNode.name}`);
            });

            it('should associate identity with multiple nodes', async () => {
                showNodesInEnvironmentQuickPickStub.withArgs('Choose the nodes you wish to associate with this identity').resolves([{label: ordererNode.name, data: ordererNode}]);
                showQuickPickYesNoStub.withArgs('Do you want to associate the same identity with another node?').resolves(UserInputUtil.YES);

                await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_IDENTITY_NODE, ...[environmentRegistryEntry, peerNode]);

                peerNode.identity = 'identityOne';
                peerNode.wallet = 'blueWallet';
                ordererNode.identity = 'identityOne';
                ordererNode.wallet = 'blueWallet';
                updateStub.should.have.been.calledTwice;
                updateStub.firstCall.should.have.been.calledWith(peerNode);
                updateStub.secondCall.should.have.been.calledWith(ordererNode);

                updateWalletSpy.should.have.been.called;

                commandsStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);

                logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associate identity with node');
                logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully associated identity ${peerNode.identity} from wallet ${peerNode.wallet} with node ${peerNode.name}`);
                logSpy.getCall(2).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully associated identities`);
            });

            it('should associate identity with multiple nodes by allowing user to select multiple nodes using a checkbox', async () => {
                showNodesInEnvironmentQuickPickStub.withArgs('Choose the nodes you wish to associate with this identity').resolves([{label: ordererNode.name, data: ordererNode}, {label: caNodeWithoutCreds.name, data: caNodeWithoutCreds}]);
                showQuickPickYesNoStub.withArgs('Do you want to associate the same identity with another node?').resolves(UserInputUtil.YES);

                await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_IDENTITY_NODE, ...[environmentRegistryEntry, peerNode]);

                peerNode.identity = 'identityOne';
                peerNode.wallet = 'blueWallet';
                ordererNode.identity = 'identityOne';
                ordererNode.wallet = 'blueWallet';
                caNodeWithoutCreds.identity = 'identityOne';
                caNodeWithoutCreds.wallet = 'blueWallet';
                updateStub.should.have.been.calledThrice;
                updateStub.firstCall.should.have.been.calledWith(peerNode);
                updateStub.secondCall.should.have.been.calledWith(ordererNode);
                updateStub.thirdCall.should.have.been.calledWith(caNodeWithoutCreds);

                updateWalletSpy.should.have.been.called;

                commandsStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);

                logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associate identity with node');
                logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully associated identity ${peerNode.identity} from wallet ${peerNode.wallet} with node ${peerNode.name}`);
                logSpy.getCall(2).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully associated identities`);
            });

            it('should handle cancel when choosing to associate more identities', async () => {
                showQuickPickYesNoStub.withArgs('Do you want to associate the same identity with another node?').onFirstCall().resolves(UserInputUtil.YES);
                showNodesInEnvironmentQuickPickStub.withArgs('Choose the nodes you wish to associate with this identity').resolves([]);
                await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_IDENTITY_NODE, ...[environmentRegistryEntry, peerNode]);

                peerNode.identity = 'identityOne';
                peerNode.wallet = 'blueWallet';
                updateStub.should.have.been.calledOnce;
                updateStub.firstCall.should.have.been.calledWith(peerNode);

                updateWalletSpy.should.have.been.called;

                commandsStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);

                logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associate identity with node');
                logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully associated identity ${peerNode.identity} from wallet ${peerNode.wallet} with node ${peerNode.name}`);
            });

            it('should not ask if no more nodes', async () => {
                getNodesStub.resolves([]);
                await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_IDENTITY_NODE, ...[environmentRegistryEntry, peerNode]);

                peerNode.identity = 'identityOne';
                peerNode.wallet = 'blueWallet';
                updateStub.should.have.been.calledOnce;
                updateStub.firstCall.should.have.been.calledWith(peerNode);

                updateWalletSpy.should.have.been.called;

                showQuickPickStub.withArgs('Do you want to associate the same identity with another node?').should.not.have.been.called;

                commandsStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);

                logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associate identity with node');
                logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully associated identity ${peerNode.identity} from wallet ${peerNode.wallet} with node ${peerNode.name}`);
            });

            it(`should handle cancel from create wallet`, async () => {
                showWalletsQuickPickBoxStub.resolves({ label: '+ create new wallet', data: undefined });
                commandsStub.withArgs(ExtensionCommands.ADD_WALLET).resolves();
                await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_IDENTITY_NODE, ...[environmentRegistryEntry, peerNode]);

                commandsStub.should.have.been.calledWith(ExtensionCommands.ADD_WALLET);

                logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associate identity with node');
                logSpy.should.not.have.been.calledWithExactly(LogType.SUCCESS, `Successfully associated identity ${peerNode.identity} from wallet ${peerNode.wallet} with node ${peerNode.name}`);
            });

            it(`should handle cancel from add identity`, async () => {
                showIdentityQuickPickStub.resolves(UserInputUtil.ADD_IDENTITY);
                commandsStub.withArgs(ExtensionCommands.ADD_WALLET_IDENTITY).resolves();
                await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_IDENTITY_NODE, ...[environmentRegistryEntry, peerNode]);

                commandsStub.should.have.been.calledWith(ExtensionCommands.ADD_WALLET_IDENTITY, sinon.match.instanceOf(FabricWalletRegistryEntry));

                logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associate identity with node');
                logSpy.should.not.have.been.calledWithExactly(LogType.SUCCESS, `Successfully associated identity ${peerNode.identity} from wallet ${peerNode.wallet} with node ${peerNode.name}`);
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

                showNodesInEnvironmentQuickPickStub.should.have.been.calledWith('Choose a node to associate an identity with');

                peerNode.identity = 'identityOne';
                peerNode.wallet = 'blueWallet';
                updateStub.should.have.been.calledOnceWith(peerNode);

                commandsStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);

                logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associate identity with node');
                logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully associated identity ${peerNode.identity} from wallet ${peerNode.wallet} with node ${peerNode.name}`);
            });

            it('should give error if no environments', async () => {
                await FabricEnvironmentRegistry.instance().clear();
                await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_IDENTITY_NODE);

                logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associate identity with node');
                logSpy.getCall(1).should.have.been.calledWithExactly(LogType.ERROR, `Add an environment to associate identities with nodes. Local environments cannot be edited.`);
                logSpy.should.not.have.been.calledWith(LogType.SUCCESS);
            });

            it('should handle cancel from choosing environment', async () => {
                showEnvironmentQuickPickBoxStub.resolves();
                await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_IDENTITY_NODE);

                logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associate identity with node');
                logSpy.should.not.have.been.calledWith(LogType.SUCCESS);
            });

            it('should handle cancel from choosing node', async () => {
                showNodesInEnvironmentQuickPickStub.resolves();
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
                updateStub.should.have.been.calledOnceWith(caNodeWithCreds);

                certAuthorityStub.should.have.been.calledWith(caNodeWithCreds.api_url, caNodeWithCreds.enroll_id, caNodeWithCreds.enroll_secret);

                commandsStub.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);
                commandsStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);

                logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associate identity with node');
                logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully associated identity ${caNodeWithCreds.identity} from wallet ${caNodeWithCreds.wallet} with node ${caNodeWithCreds.name}`);
            });

            it('should create a new wallet if option selected but not create identity', async () => {
                showWalletsQuickPickBoxStub.resolves({ label: '+ create new wallet', data: undefined });
                showQuickPickStub.resolves('Use ID and secret to enroll a new identity');

                await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_IDENTITY_NODE, environmentRegistryEntry, caNodeWithCreds);

                commandsStub.should.have.been.calledWith(ExtensionCommands.ADD_WALLET, false);

                showWalletsQuickPickBoxStub.should.have.been.calledWith(`Which wallet do you want to add the admin identitiy to?`);

                showInputBoxStub.should.have.been.calledWith(`Provide a name for the identity`);
                showInputBoxStub.should.have.been.calledWith('Enter MSPID');

                caNodeWithCreds.identity = 'identityOne';
                caNodeWithCreds.wallet = 'blueWallet';
                updateStub.should.have.been.calledOnceWith(caNodeWithCreds);

                certAuthorityStub.should.have.been.calledWith(caNodeWithCreds.api_url, caNodeWithCreds.enroll_id, caNodeWithCreds.enroll_secret);

                commandsStub.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);
                commandsStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);

                logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associate identity with node');
                logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully associated identity ${caNodeWithCreds.identity} from wallet ${caNodeWithCreds.wallet} with node ${caNodeWithCreds.name}`);

                await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_IDENTITY_NODE, ...[environmentRegistryEntry, caNodeWithCreds]);

                commandsStub.should.have.been.calledWith(ExtensionCommands.ADD_WALLET, false);

                caNodeWithCreds.identity = 'identityOne';
                caNodeWithCreds.wallet = 'blueWallet';
                updateStub.should.have.been.calledOnceWith(caNodeWithCreds);

                commandsStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);

                logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associate identity with node');
                logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully associated identity ${caNodeWithCreds.identity} from wallet ${caNodeWithCreds.wallet} with node ${caNodeWithCreds.name}`);
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
                updateStub.should.have.been.calledOnceWith(caNodeWithCreds);

                certAuthorityStub.should.have.been.calledWith(caNodeWithCreds.api_url, caNodeWithCreds.enroll_id, caNodeWithCreds.enroll_secret);

                commandsStub.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);
                commandsStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);

                logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associate identity with node');
                logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully associated identity ${caNodeWithCreds.identity} from wallet ${caNodeWithCreds.wallet} with node ${caNodeWithCreds.name}`);
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

        describe('replace', () => {

            let nodeTreeItems: NodeTreeItem[];

            beforeEach(async () => {
                const environmentExplorer: BlockchainEnvironmentExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();
                mySandBox.stub(FabricEnvironmentManager.instance(), 'getState').returns(ConnectedState.SETUP);
                mySandBox.stub(FabricEnvironmentManager.instance(), 'getEnvironmentRegistryEntry').returns(environmentRegistryEntry);
                getNodesStub.resolves([peerNode, ordererNode, caNodeWithCreds, caNodeWithoutCreds]);
                nodeTreeItems = await environmentExplorer.getChildren() as NodeTreeItem[];
            });

            ['peerNode', 'ordererNode', 'caNodeWithCreds', 'caNodeWithoutCreds'].forEach((nodeString: string) => {
                it(`should test a different identity can be associated with a node using the tree (${nodeString})`, async () => {
                    const nodeTreeItem: NodeTreeItem = nodeTreeItems.find((_nodeTreeItem: NodeTreeItem) => {
                        return _nodeTreeItem.node && _nodeTreeItem.node.short_name === nodeString;
                    });

                    await vscode.commands.executeCommand(ExtensionCommands.REPLACE_ASSOCIATED_IDENTITY, nodeTreeItem);

                    showWalletsQuickPickBoxStub.should.have.been.calledWith(`Which wallet is the admin identity in?`);

                    if (nodeTreeItem.node.type === FabricNodeType.CERTIFICATE_AUTHORITY) {
                        showIdentityQuickPickStub.should.have.been.calledWith(`Select the admin identity`);
                    } else {
                        showIdentityQuickPickStub.should.have.been.calledWith(`Select the admin identity for ${nodeTreeItem.node.msp_id}`);
                    }

                    nodeTreeItem.node.identity = 'identityOne';
                    nodeTreeItem.node.wallet = 'blueWallet';
                    updateStub.should.have.been.calledOnceWith(nodeTreeItem.node);

                    commandsStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);

                    logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associate identity with node');
                    logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully associated identity ${nodeTreeItem.node.identity} from wallet ${nodeTreeItem.node.wallet} with node ${nodeTreeItem.node.name}`);
                });
            });

            it(`should test a different identity can be associated with a node using the command`, async () => {
                await vscode.commands.executeCommand(ExtensionCommands.REPLACE_ASSOCIATED_IDENTITY);

                showNodesInEnvironmentQuickPickStub.should.have.been.calledWith('Choose a node to replace the identity');

                showWalletsQuickPickBoxStub.should.have.been.calledWith(`Which wallet is the admin identity in?`);

                showIdentityQuickPickStub.should.have.been.calledWith(`Select the admin identity for ${peerNode.msp_id}`);

                peerNode.identity = 'identityOne';
                peerNode.wallet = 'blueWallet';
                updateStub.should.have.been.calledOnceWith(peerNode);

                commandsStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);

                logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associate identity with node');
                logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully associated identity ${peerNode.identity} from wallet ${peerNode.wallet} with node ${peerNode.name}`);
            });

            it('should throw an error if no environments found', async () => {
                await FabricEnvironmentRegistry.instance().clear();
                await vscode.commands.executeCommand(ExtensionCommands.REPLACE_ASSOCIATED_IDENTITY);

                updateStub.should.not.have.been.called;

                logSpy.should.have.been.calledWith(LogType.ERROR, `No environments found to use for replacing the identity associated with a node. Local environments cannot be edited.`);
            });
        });
    });
});
