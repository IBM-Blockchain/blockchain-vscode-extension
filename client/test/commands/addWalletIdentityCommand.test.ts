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
import * as path from 'path';
import * as fs from 'fs-extra';
import * as myExtension from '../../src/extension';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { BlockchainTreeItem } from '../../src/explorer/model/BlockchainTreeItem';
import { TestUtil } from '../TestUtil';
import { FabricGatewayRegistryEntry } from '../../src/fabric/FabricGatewayRegistryEntry';
import { FabricGatewayRegistry } from '../../src/fabric/FabricGatewayRegistry';
import { FabricGatewayHelper } from '../../src/fabric/FabricGatewayHelper';
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import { VSCodeBlockchainOutputAdapter } from '../../src/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../../src/logging/OutputAdapter';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricWalletRegistry } from '../../src/fabric/FabricWalletRegistry';
import { FabricWalletRegistryEntry } from '../../src/fabric/FabricWalletRegistryEntry';
import { FabricWallet } from '../../src/fabric/FabricWallet';
import { FabricCertificateAuthorityFactory } from '../../src/fabric/FabricCertificateAuthorityFactory';
import { IFabricWallet } from '../../src/fabric/IFabricWallet';
import { FabricWalletGenerator } from '../../src/fabric/FabricWalletGenerator';
import { BlockchainWalletExplorerProvider } from '../../src/explorer/walletExplorer';
import { WalletTreeItem } from '../../src/explorer/wallets/WalletTreeItem';
import { FabricRuntimeManager } from '../../src/fabric/FabricRuntimeManager';
import { FabricRuntime } from '../../src/fabric/FabricRuntime';

// tslint:disable no-unused-expression
chai.use(sinonChai);

describe('AddWalletIdentityCommand', () => {

    before(async () => {
        await TestUtil.setupTests();
        await TestUtil.storeGatewaysConfig();
        await TestUtil.storeWalletsConfig();
    });

    after(async () => {
        await TestUtil.restoreGatewaysConfig();
        await TestUtil.restoreWalletsConfig();
    });

    describe('addWalletIdentity', () => {
        let mySandBox: sinon.SinonSandbox;
        let HelperStub: sinon.SinonStub;
        let inputBoxStub: sinon.SinonStub;
        const rootPath: string = path.dirname(__dirname);
        const walletPath: string = path.join(rootPath, '../../test/data/walletDir/wallet');
        let fsReadFile: sinon.SinonStub;
        let logSpy: sinon.SinonSpy;
        let addIdentityMethodStub: sinon.SinonStub;
        let getCertKeyStub: sinon.SinonStub;
        let showGatewayQuickPickBoxStub: sinon.SinonStub;
        let importIdentityStub: sinon.SinonStub;
        let fabricWallet: IFabricWallet;
        let getEnrollIdSecretStub: sinon.SinonStub;
        let enrollStub: sinon.SinonStub;
        let executeCommandSpy: sinon.SinonSpy;
        let createLocalWalletStub: sinon.SinonStub;
        let getNewWalletStub: sinon.SinonStub;
        let showWalletsQuickPickStub: sinon.SinonStub;

        beforeEach(async () => {
            mySandBox = sinon.createSandbox();

            // reset the stored gateways and wallets
            await vscode.workspace.getConfiguration().update('fabric.gateways', [], vscode.ConfigurationTarget.Global);
            await vscode.workspace.getConfiguration().update('fabric.wallets', [], vscode.ConfigurationTarget.Global);

            const connectionOne: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry({
                name: 'myGatewayA',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                managedRuntime: false,
            });

            const connectionTwo: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry({
                name: 'myGatewayB',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json'),
                managedRuntime: false,
            });

            await FabricGatewayRegistry.instance().clear();
            await FabricGatewayRegistry.instance().add(connectionOne);
            await FabricGatewayRegistry.instance().add(connectionTwo);

            const connectionOneWallet: FabricWalletRegistryEntry = new FabricWalletRegistryEntry({
                name: 'blueWallet',
                walletPath: walletPath
            });

            await FabricWalletRegistry.instance().clear();
            await FabricWalletRegistry.instance().add(connectionOneWallet);

            HelperStub = mySandBox.stub(FabricGatewayHelper, 'connectionProfilePathComplete').returns(true);
            inputBoxStub = mySandBox.stub(UserInputUtil, 'showInputBox');
            fsReadFile = mySandBox.stub(fs, 'readFile');
            logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
            addIdentityMethodStub = mySandBox.stub(UserInputUtil, 'addIdentityMethod');
            getCertKeyStub = mySandBox.stub(UserInputUtil, 'getCertKey');
            showGatewayQuickPickBoxStub = mySandBox.stub(UserInputUtil, 'showGatewayQuickPickBox');
            getEnrollIdSecretStub = mySandBox.stub(UserInputUtil, 'getEnrollIdSecret');
            enrollStub = mySandBox.stub(FabricCertificateAuthorityFactory.createCertificateAuthority(), 'enroll');
            executeCommandSpy = mySandBox.spy(vscode.commands, 'executeCommand');

            fabricWallet = new FabricWallet(walletPath);
            createLocalWalletStub = mySandBox.stub(FabricWalletGenerator.instance(), 'createLocalWallet');
            createLocalWalletStub.resolves(fabricWallet);
            getNewWalletStub = mySandBox.stub(FabricWalletGenerator.instance(), 'getNewWallet');
            getNewWalletStub.returns(fabricWallet);
            importIdentityStub = mySandBox.stub(fabricWallet, 'importIdentity');
            showWalletsQuickPickStub = mySandBox.stub(UserInputUtil, 'showWalletsQuickPickBox');

        });

        afterEach(async () => {
            mySandBox.restore();
        });

        it('should test an identity can be added with an enroll id and secret, when called from the command palette', async () => {
            showWalletsQuickPickStub.resolves({
                label: 'blueWallet',
                data: FabricWalletRegistry.instance().get('blueWallet')
            });

            inputBoxStub.onFirstCall().resolves('greenConga');
            inputBoxStub.onSecondCall().resolves('myMSPID');
            addIdentityMethodStub.resolves(UserInputUtil.ADD_ID_SECRET_OPTION);
            showGatewayQuickPickBoxStub.resolves({
                label: 'myGatewayA',
                data: FabricGatewayRegistry.instance().get('myGatewayA')
            });
            getEnrollIdSecretStub.resolves({enrollmentID: 'enrollID', enrollmentSecret: 'enrollSecret'});
            enrollStub.resolves({certificate: '---CERT---', privateKey: '---KEY---'});
            importIdentityStub.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET_IDENTITY);
            inputBoxStub.should.have.been.calledTwice;

            fsReadFile.should.not.have.been.called;
            getEnrollIdSecretStub.should.have.been.calledOnce;
            enrollStub.should.have.been.calledOnceWith(path.join(rootPath, '../../test/data/connectionOne/connection.json'), 'enrollID', 'enrollSecret');
            importIdentityStub.should.have.been.calledWith('---CERT---', '---KEY---', 'greenConga', 'myMSPID');
            executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);

            logSpy.should.have.been.calledTwice;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'addWalletIdentity');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added identity', `Successfully added identity to wallet`);
        });

        it('should test adding an identity can be cancelled when choosing a wallet', async () => {
            showWalletsQuickPickStub.resolves();
            await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET_IDENTITY);

            inputBoxStub.should.not.have.been.called;
            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'addWalletIdentity');
        });

        it('should test adding an identity can be cancelled when failing to give an identity name', async () => {
            showWalletsQuickPickStub.resolves({
                label: 'blueWallet',
                data: FabricWalletRegistry.instance().get('blueWallet')
            });
            inputBoxStub.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET_IDENTITY);
            inputBoxStub.should.have.been.calledOnce;
            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'addWalletIdentity');
        });

        it('should test adding an identity can be cancelled when asked to select a method for adding an identity', async () => {
            showWalletsQuickPickStub.resolves({
                label: 'blueWallet',
                data: FabricWalletRegistry.instance().get('blueWallet')
            });

            inputBoxStub.onFirstCall().resolves('greenConga');
            inputBoxStub.onSecondCall().resolves('myMSPID');
            addIdentityMethodStub.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET_IDENTITY);
            inputBoxStub.should.have.been.calledTwice;
            addIdentityMethodStub.should.have.been.calledOnce;
            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'addWalletIdentity');
        });

        it('should test adding an identity can be cancelled when asked to give an MSPID', async () => {
            showWalletsQuickPickStub.resolves({
                label: 'blueWallet',
                data: FabricWalletRegistry.instance().get('blueWallet')
            });

            inputBoxStub.onFirstCall().resolves('greenConga');
            inputBoxStub.onSecondCall().resolves();

            await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET_IDENTITY);
            inputBoxStub.should.have.been.calledTwice;
            addIdentityMethodStub.should.not.have.been.called;
            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'addWalletIdentity');
        });

        it('should test adding an identity can be cancelled chosing a gateway to enroll with', async () => {
            showWalletsQuickPickStub.resolves({
                label: 'blueWallet',
                data: FabricWalletRegistry.instance().get('blueWallet')
            });

            inputBoxStub.onFirstCall().resolves('greenConga');
            inputBoxStub.onSecondCall().resolves('myMSPID');
            addIdentityMethodStub.resolves(UserInputUtil.ADD_ID_SECRET_OPTION);
            showGatewayQuickPickBoxStub.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET_IDENTITY);
            inputBoxStub.should.have.been.calledTwice;
            getEnrollIdSecretStub.should.not.have.been.called;
            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'addWalletIdentity');
        });

        it('should test adding an identity can be cancelled when adding using an identity and secret', async () => {
            showWalletsQuickPickStub.resolves({
                label: 'blueWallet',
                data: FabricWalletRegistry.instance().get('blueWallet')
            });

            inputBoxStub.onFirstCall().resolves('greenConga');
            inputBoxStub.onSecondCall().resolves('myMSPID');
            addIdentityMethodStub.resolves(UserInputUtil.ADD_ID_SECRET_OPTION);
            showGatewayQuickPickBoxStub.resolves({
                label: 'myGatewayB',
                data: FabricGatewayRegistry.instance().get('myGatewayB')
            });
            getEnrollIdSecretStub.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET_IDENTITY);
            inputBoxStub.should.have.been.calledTwice;
            fsReadFile.should.not.have.been.called;
            enrollStub.should.not.have.been.called;
            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'addWalletIdentity');
        });

        it('should test an identity can be added using a certificate and private key', async () => {
            showWalletsQuickPickStub.resolves({
                label: 'blueWallet',
                data: FabricWalletRegistry.instance().get('blueWallet')
            });

            inputBoxStub.onFirstCall().resolves('blueConga');
            inputBoxStub.onSecondCall().resolves('myMSPID');
            addIdentityMethodStub.resolves(UserInputUtil.ADD_CERT_KEY_OPTION);
            getCertKeyStub.resolves({certificatePath: path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'), privateKeyPath: path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey')});
            fsReadFile.onFirstCall().resolves('---CERT---');
            fsReadFile.onSecondCall().resolves('---KEY---');
            importIdentityStub.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET_IDENTITY);
            inputBoxStub.should.have.been.calledTwice;
            fsReadFile.should.have.been.calledTwice;
            showGatewayQuickPickBoxStub.should.not.have.been.called;
            getCertKeyStub.should.have.been.calledOnce;
            importIdentityStub.should.have.been.calledWith('---CERT---', '---KEY---', 'blueConga', 'myMSPID');
            logSpy.should.have.been.calledTwice;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'addWalletIdentity');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added identity', `Successfully added identity to wallet`);
        });

        it('should test adding an identity can be cancelled when adding using a certificate and private key', async () => {
            showWalletsQuickPickStub.resolves({
                label: 'blueWallet',
                data: FabricWalletRegistry.instance().get('blueWallet')
            });
            inputBoxStub.onFirstCall().resolves('blueConga');
            inputBoxStub.onSecondCall().resolves('myMSPID');
            addIdentityMethodStub.resolves(UserInputUtil.ADD_CERT_KEY_OPTION);
            getCertKeyStub.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET_IDENTITY);
            fsReadFile.should.not.have.been.called;
            getCertKeyStub.should.have.been.calledOnce;
            importIdentityStub.should.not.have.been.called;
            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'addWalletIdentity');
        });

        it('should error if an identity is unable to be imported', async () => {
            showWalletsQuickPickStub.resolves({
                label: 'blueWallet',
                data: FabricWalletRegistry.instance().get('blueWallet')
            });
            inputBoxStub.onFirstCall().resolves('greenConga');
            inputBoxStub.onSecondCall().resolves('myMSPID');
            addIdentityMethodStub.resolves(UserInputUtil.ADD_ID_SECRET_OPTION);
            showGatewayQuickPickBoxStub.resolves({
                label: 'myGatewayB',
                data: FabricGatewayRegistry.instance().get('myGatewayB')
            });
            getEnrollIdSecretStub.resolves({enrollmentID: 'enrollID', enrollmentSecret: 'enrollSecret'});
            enrollStub.resolves({certificate: '---CERT---', privateKey: '---KEY---'});
            const error: Error = new Error('Already exists');
            importIdentityStub.throws(error);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET_IDENTITY);
            inputBoxStub.should.have.been.calledTwice;
            fsReadFile.should.not.have.been.called;
            getEnrollIdSecretStub.should.have.been.calledOnce;
            enrollStub.should.have.been.calledOnceWith(path.join(rootPath, '../../test/data/connectionTwo/connection.json'), 'enrollID', 'enrollSecret');
            importIdentityStub.should.have.been.calledWith('---CERT---', '---KEY---', 'greenConga', 'myMSPID');
            logSpy.should.have.been.calledTwice;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'addWalletIdentity');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Unable to add identity to wallet: ${error.message}`, `Unable to add identity to wallet: ${error.toString()}`);
        });

        xit('should show an error if connection is not complete', async () => {
            HelperStub.returns(false);
            showGatewayQuickPickBoxStub.resolves({
                label: 'myGateway',
                data: {
                    connectionProfilePath: FabricGatewayHelper.CONNECTION_PROFILE_PATH_DEFAULT,
                    name: 'myConnection',
                }
            });

            await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET_IDENTITY);

            logSpy.should.have.been.calledWith(LogType.ERROR, 'Blockchain gateway must be completed first!');
        });

        describe('called from WalletTreeItem', () => {

            it('should test an identity can be added from a WalletTreeItem', async () => {
                inputBoxStub.onFirstCall().resolves('greenConga');
                inputBoxStub.onSecondCall().resolves('myMSPID');
                addIdentityMethodStub.resolves(UserInputUtil.ADD_ID_SECRET_OPTION);
                showGatewayQuickPickBoxStub.resolves({
                    label: 'myGatewayA',
                    data: FabricGatewayRegistry.instance().get('myGatewayA')
                });
                getEnrollIdSecretStub.resolves({enrollmentID: 'enrollID', enrollmentSecret: 'enrollSecret'});
                enrollStub.resolves({certificate: '---CERT---', privateKey: '---KEY---'});
                importIdentityStub.resolves();
                const blockchainWalletExplorerProvider: BlockchainWalletExplorerProvider = myExtension.getBlockchainWalletExplorerProvider();

                const walletItems: Array<BlockchainTreeItem> = await blockchainWalletExplorerProvider.getChildren();
                const walletItem: WalletTreeItem = walletItems[1] as WalletTreeItem;

                await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET_IDENTITY, walletItem);

                showWalletsQuickPickStub.should.not.have.been.called;
                inputBoxStub.should.have.been.calledTwice;
                fsReadFile.should.not.have.been.called;
                getEnrollIdSecretStub.should.have.been.calledOnce;
                enrollStub.should.have.been.calledOnceWith(path.join(rootPath, '../../test/data/connectionOne/connection.json'), 'enrollID', 'enrollSecret');
                importIdentityStub.should.have.been.calledWith('---CERT---', '---KEY---', 'greenConga', 'myMSPID');
                executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);

                logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'addWalletIdentity');
                logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added identity', `Successfully added identity to wallet`);
            });

            it('should test an identity can be enrolled to local_wallet using local_fabric', async () => {
                inputBoxStub.onFirstCall().resolves('greenConga');
                inputBoxStub.onSecondCall().resolves('myMSPID');
                addIdentityMethodStub.resolves(UserInputUtil.ADD_ID_SECRET_OPTION);
                showGatewayQuickPickBoxStub.resolves({
                    label: 'local_fabric',
                    data: new FabricGatewayRegistryEntry({
                        name: 'local_fabric',
                        connectionProfilePath: undefined,
                        managedRuntime: true
                    })
                });
                const runtime: FabricRuntime = new FabricRuntime();
                mySandBox.stub(runtime, 'getConnectionProfilePath').resolves('/some/path');
                mySandBox.stub(FabricRuntimeManager.instance(), 'getRuntime').returns(runtime);
                getEnrollIdSecretStub.resolves({enrollmentID: 'enrollID', enrollmentSecret: 'enrollSecret'});
                enrollStub.resolves({certificate: '---CERT---', privateKey: '---KEY---'});
                importIdentityStub.resolves();
                const blockchainWalletExplorerProvider: BlockchainWalletExplorerProvider = myExtension.getBlockchainWalletExplorerProvider();

                const walletItems: Array<BlockchainTreeItem> = await blockchainWalletExplorerProvider.getChildren();
                const walletItem: WalletTreeItem = walletItems[0] as WalletTreeItem;

                await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET_IDENTITY, walletItem);

                showWalletsQuickPickStub.should.not.have.been.called;
                inputBoxStub.should.have.been.calledTwice;
                fsReadFile.should.not.have.been.called;
                getEnrollIdSecretStub.should.have.been.calledOnce;
                enrollStub.should.have.been.calledOnceWith('/some/path', 'enrollID', 'enrollSecret');
                importIdentityStub.should.have.been.calledWith('---CERT---', '---KEY---', 'greenConga', 'myMSPID');
                executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);

                logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'addWalletIdentity');
                logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added identity', `Successfully added identity to wallet`);
            });

        });

        describe('called from IFabricWallet - addWallet command', () => {
            it('should test an identity can be enrolled to a new wallet', async () => {
                inputBoxStub.onFirstCall().resolves('greenConga');
                inputBoxStub.onSecondCall().resolves('myMSPID');
                addIdentityMethodStub.resolves(UserInputUtil.ADD_ID_SECRET_OPTION);
                showGatewayQuickPickBoxStub.resolves({
                    label: 'myGatewayA',
                    data: FabricGatewayRegistry.instance().get('myGatewayA')
                });
                getEnrollIdSecretStub.resolves({enrollmentID: 'enrollID', enrollmentSecret: 'enrollSecret'});
                enrollStub.resolves({certificate: '---CERT---', privateKey: '---KEY---'});

                const emptyWallet: IFabricWallet = new FabricWallet(path.join(rootPath, '../../test/data/walletDir/emptyWallet'));
                const otherImportIdentityStub: sinon.SinonStub = mySandBox.stub(emptyWallet, 'importIdentity').resolves();

                await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET_IDENTITY, emptyWallet);

                getNewWalletStub.should.not.have.been.called;
                showWalletsQuickPickStub.should.not.have.been.called;
                inputBoxStub.should.have.been.calledTwice;
                fsReadFile.should.not.have.been.called;
                getEnrollIdSecretStub.should.have.been.calledOnce;
                enrollStub.should.have.been.calledOnceWith(path.join(rootPath, '../../test/data/connectionOne/connection.json'), 'enrollID', 'enrollSecret');
                otherImportIdentityStub.should.have.been.calledOnceWith('---CERT---', '---KEY---', 'greenConga', 'myMSPID');
                executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);

                logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'addWalletIdentity');
                logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added identity', `Successfully added identity to wallet`);

            });
        });
    });
});
