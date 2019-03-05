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
import { BlockchainGatewayExplorerProvider } from '../../src/explorer/gatewayExplorer';
import { VSCodeBlockchainOutputAdapter } from '../../src/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../../src/logging/OutputAdapter';
import { ExtensionCommands } from '../../ExtensionCommands';
import { GatewayTreeItem } from '../../src/explorer/model/GatewayTreeItem';
import { FabricWalletGeneratorFactory } from '../../src/fabric/FabricWalletGeneratorFactory';
import { FabricWallet } from '../../src/fabric/FabricWallet';
import { FabricCertificateAuthority } from '../../src/fabric/FabricCertificateAuthority';
import { IFabricWallet } from '../../src/fabric/IFabricWallet';
import { FabricWalletGenerator } from '../../src/fabric/FabricWalletGenerator';

// tslint:disable no-unused-expression

const should: Chai.Should = chai.should();
chai.use(sinonChai);

describe('AddGatewayIdentityCommand', () => {

    before(async () => {
        await TestUtil.setupTests();
        await TestUtil.storeGatewaysConfig();
    });

    after(async () => {
        await TestUtil.restoreGatewaysConfig();
    });

    describe('addGatewayIdentity', () => {
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
        beforeEach(async () => {
            mySandBox = sinon.createSandbox();

            // reset the available connections
            await vscode.workspace.getConfiguration().update('fabric.gateways', [], vscode.ConfigurationTarget.Global);

            const connectionOne: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry({
                name: 'myGatewayA',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                managedRuntime: false,
                walletPath: walletPath
            });

            const connectionTwo: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry({
                name: 'myGatewayB',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json'),
                managedRuntime: false,
                walletPath: walletPath
            });

            await FabricGatewayRegistry.instance().clear();
            await FabricGatewayRegistry.instance().add(connectionOne);
            await FabricGatewayRegistry.instance().add(connectionTwo);

            HelperStub = mySandBox.stub(FabricGatewayHelper, 'isCompleted').returns(true);
            inputBoxStub = mySandBox.stub(UserInputUtil, 'showInputBox');
            fsReadFile = mySandBox.stub(fs, 'readFile');
            logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
            addIdentityMethodStub = mySandBox.stub(UserInputUtil, 'addIdentityMethod');
            getCertKeyStub = mySandBox.stub(UserInputUtil, 'getCertKey');
            showGatewayQuickPickBoxStub = mySandBox.stub(UserInputUtil, 'showGatewayQuickPickBox');
            getEnrollIdSecretStub = mySandBox.stub(UserInputUtil, 'getEnrollIdSecret');
            enrollStub = mySandBox.stub(FabricCertificateAuthority, 'enroll');
            executeCommandSpy = mySandBox.spy(vscode.commands, 'executeCommand');

            fabricWallet = new FabricWallet('fab_wallet', walletPath);
            createLocalWalletStub = mySandBox.stub(FabricWalletGenerator.instance(), 'createLocalWallet').resolves(fabricWallet);
            getNewWalletStub = mySandBox.stub(FabricWalletGenerator.instance(), 'getNewWallet').returns(fabricWallet);
            importIdentityStub = mySandBox.stub(fabricWallet, 'importIdentity');

        });

        afterEach(async () => {
            mySandBox.restore();
        });

        it('should test an identity can be added from the command', async () => {
            showGatewayQuickPickBoxStub.resolves({
                label: 'myGatewayB',
                data: FabricGatewayRegistry.instance().get('myGatewayA')
            });

            inputBoxStub.onFirstCall().resolves('greenConga');
            inputBoxStub.onSecondCall().resolves('myMSPID');

            addIdentityMethodStub.resolves(UserInputUtil.ADD_ID_SECRET_OPTION);

            importIdentityStub.resolves();
            getEnrollIdSecretStub.resolves({enrollmentID: 'enrollID', enrollmentSecret: 'enrollSecret'});
            enrollStub.resolves({certificate: '---CERT---', privateKey: '---KEY---'});
            const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = myExtension.getBlockchainGatewayExplorerProvider();

            const treeItems: Array<BlockchainTreeItem> = await blockchainGatewayExplorerProvider.getChildren();

            await vscode.commands.executeCommand(ExtensionCommands.ADD_GATEWAY_IDENTITY);
            inputBoxStub.should.have.been.calledTwice;
            const allChildren: BlockchainTreeItem[] = await blockchainGatewayExplorerProvider.getChildren();
            const gatewayTreeItem: GatewayTreeItem = allChildren[1] as GatewayTreeItem;
            gatewayTreeItem.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Expanded);

            fsReadFile.should.not.have.been.called;
            getEnrollIdSecretStub.should.have.been.calledOnce;
            enrollStub.should.have.been.calledOnceWith(path.join(rootPath, '../../test/data/connectionOne/connection.json'), 'enrollID', 'enrollSecret');
            importIdentityStub.should.have.been.calledWith('---CERT---', '---KEY---', 'greenConga', 'myMSPID');
            executeCommandSpy.getCall(1).should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'addGatewayIdentity');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added identity', `Successfully added identity to gateway 'myGatewayA'`);
        });

        it('should test an identity can be cancelled when choosing a connection', async () => {
            showGatewayQuickPickBoxStub.resolves();
            await vscode.commands.executeCommand(ExtensionCommands.ADD_GATEWAY_IDENTITY);

            const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = myExtension.getBlockchainGatewayExplorerProvider();
            const allChildren: BlockchainTreeItem[] = await blockchainGatewayExplorerProvider.getChildren();
            const gatewayTreeItem: GatewayTreeItem = allChildren[2] as GatewayTreeItem;
            gatewayTreeItem.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Expanded);
            const identities: BlockchainTreeItem[] = await blockchainGatewayExplorerProvider.getChildren(gatewayTreeItem);
            identities.length.should.equal(2);
        });

        it('should test an identity can be cancelled when giving an identity name', async () => {
            showGatewayQuickPickBoxStub.resolves({
                label: 'myGatewayB',
                data: FabricGatewayRegistry.instance().get('myGatewayB')
            });
            inputBoxStub.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.ADD_GATEWAY_IDENTITY);
            addIdentityMethodStub.should.not.have.been.called;

            const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = myExtension.getBlockchainGatewayExplorerProvider();
            const allChildren: BlockchainTreeItem[] = await blockchainGatewayExplorerProvider.getChildren();
            const gatewayTreeItem: GatewayTreeItem = allChildren[2] as GatewayTreeItem;
            gatewayTreeItem.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Expanded);
            const identities: BlockchainTreeItem[] = await blockchainGatewayExplorerProvider.getChildren(gatewayTreeItem);
            identities.length.should.equal(2);
        });

        it('should test an identity can be cancelled when asked to select a method for adding an identity', async () => {
            showGatewayQuickPickBoxStub.resolves({
                label: 'myGatewayB',
                data: FabricGatewayRegistry.instance().get('myGatewayB')
            });

            inputBoxStub.resolves('blueConga');

            addIdentityMethodStub.resolves();

            getCertKeyStub.resolves({mspID: 'myMSPID', certificatePath: path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'), privateKeyPath: path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey')});

            await vscode.commands.executeCommand(ExtensionCommands.ADD_GATEWAY_IDENTITY);
            inputBoxStub.should.have.been.calledOnce;
            const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = myExtension.getBlockchainGatewayExplorerProvider();
            const allChildren: BlockchainTreeItem[] = await blockchainGatewayExplorerProvider.getChildren();
            const gatewayTreeItem: GatewayTreeItem = allChildren[2] as GatewayTreeItem;
            gatewayTreeItem.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Expanded);
            const identities: BlockchainTreeItem[] = await blockchainGatewayExplorerProvider.getChildren(gatewayTreeItem);
            identities.length.should.equal(2);

            getCertKeyStub.should.not.have.been.called;
        });

        it('should test an identity can be cancelled when asked to give an MSP ID', async () => {
            showGatewayQuickPickBoxStub.resolves({
                label: 'myGatewayB',
                data: FabricGatewayRegistry.instance().get('myGatewayB')
            });

            inputBoxStub.onFirstCall().resolves('blueConga');
            inputBoxStub.onSecondCall().resolves();

            addIdentityMethodStub.resolves(UserInputUtil.ADD_CERT_KEY_OPTION);

            getCertKeyStub.resolves({mspID: 'myMSPID', certificatePath: path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'), privateKeyPath: path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey')});

            await vscode.commands.executeCommand(ExtensionCommands.ADD_GATEWAY_IDENTITY);
            inputBoxStub.should.have.been.calledTwice;
            const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = myExtension.getBlockchainGatewayExplorerProvider();
            const allChildren: BlockchainTreeItem[] = await blockchainGatewayExplorerProvider.getChildren();
            const gatewayTreeItem: GatewayTreeItem = allChildren[2] as GatewayTreeItem;
            gatewayTreeItem.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Expanded);
            const identities: BlockchainTreeItem[] = await blockchainGatewayExplorerProvider.getChildren(gatewayTreeItem);
            identities.length.should.equal(2);

            getCertKeyStub.should.not.have.been.called;
        });

        it('should test an identity can be added using a certificate and private key', async () => {
            showGatewayQuickPickBoxStub.resolves({
                label: 'myGatewayB',
                data: FabricGatewayRegistry.instance().get('myGatewayB')
            });

            inputBoxStub.onFirstCall().resolves('blueConga');
            inputBoxStub.onSecondCall().resolves('myMSPID');

            addIdentityMethodStub.resolves(UserInputUtil.ADD_CERT_KEY_OPTION);

            importIdentityStub.resolves();

            getCertKeyStub.resolves({certificatePath: path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'), privateKeyPath: path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey')});

            fsReadFile.onFirstCall().resolves('---CERT---');
            fsReadFile.onSecondCall().resolves('---KEY---');
            await vscode.commands.executeCommand(ExtensionCommands.ADD_GATEWAY_IDENTITY);
            inputBoxStub.should.have.been.calledTwice;
            const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = myExtension.getBlockchainGatewayExplorerProvider();
            const allChildren: BlockchainTreeItem[] = await blockchainGatewayExplorerProvider.getChildren();
            const gatewayTreeItem: GatewayTreeItem = allChildren[2] as GatewayTreeItem;
            gatewayTreeItem.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Expanded);
            const identities: BlockchainTreeItem[] = await blockchainGatewayExplorerProvider.getChildren(gatewayTreeItem);
            identities.length.should.equal(2);
            fsReadFile.should.have.been.calledTwice;

            getCertKeyStub.should.have.been.calledOnceWithExactly('myGatewayB');
            importIdentityStub.should.have.been.calledWith('---CERT---', '---KEY---', 'blueConga', 'myMSPID');
            executeCommandSpy.getCall(1).should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'addGatewayIdentity');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added identity', `Successfully added identity to gateway 'myGatewayB'`);
        });

        it('should test an identity can be cancelled when adding using a certificate and private key', async () => {
            showGatewayQuickPickBoxStub.resolves({
                label: 'myGatewayB',
                data: FabricGatewayRegistry.instance().get('myGatewayB')
            });

            inputBoxStub.onFirstCall().resolves('blueConga');
            inputBoxStub.onSecondCall().resolves('myMSPID');

            addIdentityMethodStub.resolves(UserInputUtil.ADD_CERT_KEY_OPTION);
            importIdentityStub.resolves();

            getCertKeyStub.resolves();

            fsReadFile.onFirstCall().resolves('---CERT---');
            fsReadFile.onSecondCall().resolves('---KEY---');
            await vscode.commands.executeCommand(ExtensionCommands.ADD_GATEWAY_IDENTITY);
            inputBoxStub.should.have.been.calledTwice;
            const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = myExtension.getBlockchainGatewayExplorerProvider();
            const allChildren: BlockchainTreeItem[] = await blockchainGatewayExplorerProvider.getChildren();
            const gatewayTreeItem: GatewayTreeItem = allChildren[2] as GatewayTreeItem;
            gatewayTreeItem.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Expanded);
            const identities: BlockchainTreeItem[] = await blockchainGatewayExplorerProvider.getChildren(gatewayTreeItem);
            identities.length.should.equal(2);
            fsReadFile.should.not.have.been.called;

            getCertKeyStub.should.have.been.calledOnceWithExactly('myGatewayB');
            importIdentityStub.should.not.have.been.called;
            executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'addGatewayIdentity');
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS, 'Successfully added identity', `Successfully added identity to gateway 'myGatewayB'`);
        });

        it('should test an identity can be added using an identity and secret', async () => {
            showGatewayQuickPickBoxStub.resolves({
                label: 'myGatewayB',
                data: FabricGatewayRegistry.instance().get('myGatewayB')
            });

            inputBoxStub.onFirstCall().resolves('blueConga');
            inputBoxStub.onSecondCall().resolves('myMSPID');

            addIdentityMethodStub.resolves(UserInputUtil.ADD_ID_SECRET_OPTION);

            importIdentityStub.resolves();

            getEnrollIdSecretStub.resolves({enrollmentID: 'enrollID', enrollmentSecret: 'enrollSecret'});
            enrollStub.resolves({certificate: '---CERT---', privateKey: '---KEY---'});
            await vscode.commands.executeCommand(ExtensionCommands.ADD_GATEWAY_IDENTITY);
            inputBoxStub.should.have.been.calledTwice;

            fsReadFile.should.not.have.been.called;
            getEnrollIdSecretStub.should.have.been.calledOnce;
            enrollStub.should.have.been.calledOnceWith(path.join(rootPath, '../../test/data/connectionTwo/connection.json'), 'enrollID', 'enrollSecret');
            importIdentityStub.should.have.been.calledWith('---CERT---', '---KEY---', 'blueConga', 'myMSPID');
            executeCommandSpy.getCall(1).should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'addGatewayIdentity');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added identity', `Successfully added identity to gateway 'myGatewayB'`);
        });

        it('should test an identity can be cancelled when adding using an identity and secret', async () => {
            showGatewayQuickPickBoxStub.resolves({
                label: 'myGatewayB',
                data: FabricGatewayRegistry.instance().get('myGatewayB')
            });

            inputBoxStub.onFirstCall().resolves('blueConga');
            inputBoxStub.onSecondCall().resolves('myMSPID');

            addIdentityMethodStub.resolves(UserInputUtil.ADD_ID_SECRET_OPTION);

            importIdentityStub.resolves();
            getEnrollIdSecretStub.resolves();
            await vscode.commands.executeCommand(ExtensionCommands.ADD_GATEWAY_IDENTITY);
            const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = myExtension.getBlockchainGatewayExplorerProvider();
            const allChildren: BlockchainTreeItem[] = await blockchainGatewayExplorerProvider.getChildren();
            const gatewayTreeItem: GatewayTreeItem = allChildren[2] as GatewayTreeItem;
            gatewayTreeItem.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Expanded);
            const identities: BlockchainTreeItem[] = await blockchainGatewayExplorerProvider.getChildren(gatewayTreeItem);
            identities.length.should.equal(2);
            inputBoxStub.should.have.been.calledTwice;
            fsReadFile.should.not.have.been.called;
            getEnrollIdSecretStub.should.have.been.calledOnce;
            enrollStub.should.not.have.been.called;
            importIdentityStub.should.not.have.been.called;
            executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'addGatewayIdentity');
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS, 'Successfully added identity', `Successfully added identity to gateway 'myGatewayB'`);
        });

        it('should error if an identity is unable to be imported', async () => {
            showGatewayQuickPickBoxStub.resolves({
                label: 'myGatewayB',
                data: FabricGatewayRegistry.instance().get('myGatewayB')
            });

            inputBoxStub.onFirstCall().resolves('blueConga');
            inputBoxStub.onSecondCall().resolves('myMSPID');

            addIdentityMethodStub.resolves(UserInputUtil.ADD_ID_SECRET_OPTION);

            const error: Error = new Error('Already exists');
            importIdentityStub.throws(error);

            getEnrollIdSecretStub.resolves({enrollmentID: 'enrollID', enrollmentSecret: 'enrollSecret'});
            enrollStub.resolves({certificate: '---CERT---', privateKey: '---KEY---'});

            await vscode.commands.executeCommand(ExtensionCommands.ADD_GATEWAY_IDENTITY);
            const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = myExtension.getBlockchainGatewayExplorerProvider();
            const allChildren: BlockchainTreeItem[] = await blockchainGatewayExplorerProvider.getChildren();
            const gatewayTreeItem: GatewayTreeItem = allChildren[2] as GatewayTreeItem;
            gatewayTreeItem.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Expanded);
            const identities: BlockchainTreeItem[] = await blockchainGatewayExplorerProvider.getChildren(gatewayTreeItem);
            identities.length.should.equal(2);

            inputBoxStub.should.have.been.calledTwice;
            fsReadFile.should.not.have.been.called;
            getEnrollIdSecretStub.should.have.been.calledOnce;
            enrollStub.should.have.been.calledOnceWith(path.join(rootPath, '../../test/data/connectionTwo/connection.json'), 'enrollID', 'enrollSecret');
            importIdentityStub.should.have.been.calledWith('---CERT---', '---KEY---', 'blueConga', 'myMSPID');

            executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'addGatewayIdentity');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Unable to add identity to gateway: ${error.message}`, `Unable to add identity to gateway: ${error.toString()}`);
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS, 'Successfully added identity', `Successfully added identity to gateway 'myGatewayB'`);
        });

        it('should show an error if connection is not complete', async () => {
            HelperStub.returns(false);
            showGatewayQuickPickBoxStub.resolves({
                label: 'myGateway',
                data: {
                    connectionProfilePath: FabricGatewayHelper.CONNECTION_PROFILE_PATH_DEFAULT,
                    name: 'myConnection',
                    walletPath: FabricGatewayHelper.WALLET_PATH_DEFAULT
                }
            });

            await vscode.commands.executeCommand(ExtensionCommands.ADD_GATEWAY_IDENTITY);

            logSpy.should.have.been.calledWith(LogType.ERROR, 'Blockchain gateway must be completed first!');
        });

        it('should test an identity can be added when given a new gateway', async () => {
            showGatewayQuickPickBoxStub.resolves({
                label: 'myGatewayB',
                data: FabricGatewayRegistry.instance().get('myGatewayB')
            });

            inputBoxStub.onFirstCall().resolves('blueConga');
            inputBoxStub.onSecondCall().resolves('myMSPID');

            addIdentityMethodStub.resolves(UserInputUtil.ADD_ID_SECRET_OPTION);

            const getWalletPath: sinon.SinonStub = mySandBox.stub(fabricWallet, 'getWalletPath').returns('some_wallet_path');
            importIdentityStub.resolves();

            getEnrollIdSecretStub.resolves({enrollmentID: 'enrollID', enrollmentSecret: 'enrollSecret'});
            enrollStub.resolves({certificate: '---CERT---', privateKey: '---KEY---'});

            const newGateway: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry({
                name: 'newGateway',
                connectionProfilePath: 'connectionProfilePath',
                managedRuntime: false,
                walletPath: undefined
            });
            const result: any = await vscode.commands.executeCommand(ExtensionCommands.ADD_GATEWAY_IDENTITY, newGateway);

            inputBoxStub.should.have.been.calledTwice;
            fsReadFile.should.not.have.been.called;
            getEnrollIdSecretStub.should.have.been.calledOnce;
            enrollStub.should.have.been.calledOnceWith('connectionProfilePath', 'enrollID', 'enrollSecret');

            importIdentityStub.should.have.been.calledOnceWith('---CERT---', '---KEY---', 'blueConga', 'myMSPID');
            executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'addGatewayIdentity');
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS, 'Successfully added identity', `Successfully added identity to gateway 'myGatewayB'`);

            getWalletPath.should.have.been.calledOnce;
            result.should.deep.equal({
                name: 'newGateway',
                connectionProfilePath: 'connectionProfilePath',
                managedRuntime: false,
                walletPath: 'some_wallet_path'
            });
        });

        it('should test an identity can be added from the tree', async () => {

            inputBoxStub.onFirstCall().resolves('greenConga');
            inputBoxStub.onSecondCall().resolves('myMSPID');

            addIdentityMethodStub.resolves(UserInputUtil.ADD_ID_SECRET_OPTION);

            importIdentityStub.resolves();
            getEnrollIdSecretStub.resolves({enrollmentID: 'enrollID', enrollmentSecret: 'enrollSecret'});
            enrollStub.resolves({certificate: '---CERT---', privateKey: '---KEY---'});
            const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = myExtension.getBlockchainGatewayExplorerProvider();

            const treeItems: Array<BlockchainTreeItem> = await blockchainGatewayExplorerProvider.getChildren();
            const gatewayToAddTo: GatewayTreeItem = treeItems[1] as GatewayTreeItem;

            await vscode.commands.executeCommand(ExtensionCommands.ADD_GATEWAY_IDENTITY, gatewayToAddTo);

            inputBoxStub.should.have.been.calledTwice;
            fsReadFile.should.not.have.been.called;
            getEnrollIdSecretStub.should.have.been.calledOnce;
            enrollStub.should.have.been.calledOnceWith(path.join(rootPath, '../../test/data/connectionOne/connection.json'), 'enrollID', 'enrollSecret');
            importIdentityStub.should.have.been.calledWith('---CERT---', '---KEY---', 'greenConga', 'myMSPID');
            executeCommandSpy.getCall(1).should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'addGatewayIdentity');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added identity', `Successfully added identity to gateway 'myGatewayA'`);
        });

    });
});
