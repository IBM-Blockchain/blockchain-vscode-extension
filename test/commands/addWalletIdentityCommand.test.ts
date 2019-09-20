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
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { BlockchainTreeItem } from '../../src/explorer/model/BlockchainTreeItem';
import { TestUtil } from '../TestUtil';
import { FabricGatewayRegistryEntry } from '../../src/fabric/FabricGatewayRegistryEntry';
import { FabricGatewayRegistry } from '../../src/fabric/FabricGatewayRegistry';
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
import { LocalWalletTreeItem } from '../../src/explorer/wallets/LocalWalletTreeItem';
import { FabricRuntimeManager } from '../../src/fabric/FabricRuntimeManager';
import { FabricRuntime } from '../../src/fabric/FabricRuntime';
import { FabricRuntimeUtil } from '../../src/fabric/FabricRuntimeUtil';
import { FabricWalletUtil } from '../../src/fabric/FabricWalletUtil';
import { Reporter } from '../../src/util/Reporter';
import { SettingConfigurations } from '../../SettingConfigurations';
import { FabricEnvironmentConnection } from '../../src/fabric/FabricEnvironmentConnection';
import { FabricEnvironmentManager } from '../../src/fabric/FabricEnvironmentManager';
import { ExtensionUtil } from '../../src/util/ExtensionUtil';
import { FabricGatewayHelper } from '../../src/fabric/FabricGatewayHelper';

// tslint:disable no-unused-expression
chai.use(sinonChai);
const should: Chai.Should = chai.should();
describe('AddWalletIdentityCommand', () => {
    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();

    before(async () => {
        await TestUtil.setupTests(mySandBox);
        await TestUtil.storeGatewaysConfig();
        await TestUtil.storeWalletsConfig();
    });

    after(async () => {
        await TestUtil.restoreGatewaysConfig();
        await TestUtil.restoreWalletsConfig();
    });

    describe('addWalletIdentity', () => {
        let fabricEnvironmentConnectionMock: sinon.SinonStubbedInstance<FabricEnvironmentConnection>;
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
        let executeCommandStub: sinon.SinonStub;
        let getWalletStub: sinon.SinonStub;
        let showWalletsQuickPickStub: sinon.SinonStub;
        let sendTelemetryEventStub: sinon.SinonStub;
        let browseStub: sinon.SinonStub;
        let connectionProfilePathStub: sinon.SinonStub;

        beforeEach(async () => {

            // reset the stored gateways and wallets
            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_GATEWAYS, [], vscode.ConfigurationTarget.Global);
            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_WALLETS, [], vscode.ConfigurationTarget.Global);

            const connectionOne: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry({
                name: 'myGatewayA',
                associatedWallet: ''
            });

            const connectionTwo: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry({
                name: 'myGatewayB',
                associatedWallet: ''
            });

            const connectionThree: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry({
                name: 'myGatewayC',
                associatedWallet: ''
            });

            await FabricGatewayRegistry.instance().clear();
            await FabricGatewayRegistry.instance().add(connectionOne);
            await FabricGatewayRegistry.instance().add(connectionTwo);
            await FabricGatewayRegistry.instance().add(connectionThree);

            connectionProfilePathStub = mySandBox.stub(FabricGatewayHelper, 'getConnectionProfilePath').resolves(path.join('myPath', 'connection.json'));

            const connectionOneWallet: FabricWalletRegistryEntry = new FabricWalletRegistryEntry({
                name: 'blueWallet',
                walletPath: walletPath,
                managedWallet: true
            });

            const connectionTwoWallet: FabricWalletRegistryEntry = new FabricWalletRegistryEntry({
                name: 'externalWallet',
                walletPath: walletPath
            });

            await FabricWalletRegistry.instance().clear();
            await FabricWalletRegistry.instance().add(connectionOneWallet);
            await FabricWalletRegistry.instance().add(connectionTwoWallet);

            fabricEnvironmentConnectionMock = sinon.createStubInstance(FabricEnvironmentConnection);
            fabricEnvironmentConnectionMock.connect.resolves();
            fabricEnvironmentConnectionMock.getAllOrganizationNames.resolves();
            const fabricEnvironmentManager: FabricEnvironmentManager = FabricEnvironmentManager.instance();
            mySandBox.stub(fabricEnvironmentManager, 'getConnection').returns(fabricEnvironmentConnectionMock);
            fabricEnvironmentConnectionMock.getAllOrganizationNames.returns(['myMSPID']);

            inputBoxStub = mySandBox.stub(UserInputUtil, 'showInputBox');
            fsReadFile = mySandBox.stub(fs, 'readFile');
            logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
            addIdentityMethodStub = mySandBox.stub(UserInputUtil, 'addIdentityMethod');
            getCertKeyStub = mySandBox.stub(UserInputUtil, 'getCertKey');
            showGatewayQuickPickBoxStub = mySandBox.stub(UserInputUtil, 'showGatewayQuickPickBox');
            getEnrollIdSecretStub = mySandBox.stub(UserInputUtil, 'getEnrollIdSecret');
            enrollStub = mySandBox.stub(FabricCertificateAuthorityFactory.createCertificateAuthority(), 'enroll');
            executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand');
            executeCommandStub.callThrough();

            fabricWallet = new FabricWallet(walletPath);
            getWalletStub = mySandBox.stub(FabricWalletGenerator.instance(), 'getWallet');
            getWalletStub.returns(fabricWallet);
            importIdentityStub = mySandBox.stub(fabricWallet, 'importIdentity');
            importIdentityStub.resolves();
            showWalletsQuickPickStub = mySandBox.stub(UserInputUtil, 'showWalletsQuickPickBox');
            sendTelemetryEventStub = mySandBox.stub(Reporter.instance(), 'sendTelemetryEvent');
            browseStub = mySandBox.stub(UserInputUtil, 'browse');

        });

        afterEach(async () => {
            mySandBox.restore();
        });

        it('should test an identity can be added with an enroll id and secret, when called from the command palette using a JSON file', async () => {
            showWalletsQuickPickStub.resolves({
                label: 'externalWallet',
                data: FabricWalletRegistry.instance().get('externalWallet')
            });

            fsReadFile.resolves(`{
                "certificateAuthorities": {
                    "ca0": {
                        "url": "http://ca0url"
                    }
                }
            }`);

            inputBoxStub.onFirstCall().resolves('greenConga');
            inputBoxStub.onSecondCall().resolves('myMSPID');
            addIdentityMethodStub.resolves(UserInputUtil.ADD_ID_SECRET_OPTION);
            showGatewayQuickPickBoxStub.resolves({
                label: 'myGatewayA',
                data: FabricGatewayRegistry.instance().get('myGatewayA')
            });
            getEnrollIdSecretStub.resolves({ enrollmentID: 'enrollID', enrollmentSecret: 'enrollSecret' });
            enrollStub.resolves({ certificate: '---CERT---', privateKey: '---KEY---' });

            const result: string = await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET_IDENTITY) as string;
            result.should.equal('greenConga');

            inputBoxStub.should.have.been.calledTwice;

            fsReadFile.should.have.been.calledOnce;
            getEnrollIdSecretStub.should.have.been.calledOnce;
            enrollStub.should.have.been.calledOnceWith('http://ca0url', 'enrollID', 'enrollSecret');
            importIdentityStub.should.have.been.calledWith('---CERT---', '---KEY---', 'greenConga', 'myMSPID');
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);

            logSpy.should.have.been.calledTwice;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'addWalletIdentity');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added identity', `Successfully added identity to wallet`);
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('addWalletIdentityCommand', { method: 'enrollmentID' });
        });

        it('should test an identity can be added with an enroll id and secret, when called from the command palette using a JSON file and mspid passed in', async () => {
            connectionProfilePathStub.resolves(path.join('myPath', 'connection.yml'));
            showWalletsQuickPickStub.resolves({
                label: 'externalWallet',
                data: FabricWalletRegistry.instance().get('externalWallet')
            });

            fsReadFile.resolves(`{
                "certificateAuthorities": {
                    "ca0": {
                        "url": "http://ca0url"
                    }
                }
            }`);

            inputBoxStub.onFirstCall().resolves('greyConga');

            addIdentityMethodStub.resolves(UserInputUtil.ADD_ID_SECRET_OPTION);
            showGatewayQuickPickBoxStub.resolves({
                label: 'myGatewayA',
                data: FabricGatewayRegistry.instance().get('myGatewayA')
            });
            getEnrollIdSecretStub.resolves({ enrollmentID: 'enrollID', enrollmentSecret: 'enrollSecret' });
            enrollStub.resolves({ certificate: '---CERT---', privateKey: '---KEY---' });

            const result: string = await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET_IDENTITY, undefined, 'myMSPID') as string;
            result.should.equal('greyConga');

            inputBoxStub.should.have.been.calledOnce;

            fsReadFile.should.have.been.calledOnce;
            getEnrollIdSecretStub.should.have.been.calledOnce;
            enrollStub.should.have.been.calledOnceWith('http://ca0url', 'enrollID', 'enrollSecret');
            importIdentityStub.should.have.been.calledWith('---CERT---', '---KEY---', 'greyConga', 'myMSPID');
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);

            logSpy.should.have.been.calledTwice;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'addWalletIdentity');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added identity', `Successfully added identity to wallet`);
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('addWalletIdentityCommand', { method: 'enrollmentID' });
        });

        it('should test an identity can be added with an enroll id and secret, when called from the command palette using a yaml file', async () => {
            connectionProfilePathStub.resolves(path.join('myPath', 'connection.yml'));
            showWalletsQuickPickStub.resolves({
                label: 'externalWallet',
                data: FabricWalletRegistry.instance().get('externalWallet')
            });

            fsReadFile.resolves(`---
            certificateAuthorities:
              ca0:
                url: http://ca0url`);

            inputBoxStub.onFirstCall().resolves('greenConga');
            inputBoxStub.onSecondCall().resolves('myMSPID');
            addIdentityMethodStub.resolves(UserInputUtil.ADD_ID_SECRET_OPTION);
            showGatewayQuickPickBoxStub.resolves({
                label: 'myGatewayC',
                data: FabricGatewayRegistry.instance().get('myGatewayC')
            });
            getEnrollIdSecretStub.resolves({ enrollmentID: 'enrollID', enrollmentSecret: 'enrollSecret' });
            enrollStub.resolves({ certificate: '---CERT---', privateKey: '---KEY---' });

            const result: string = await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET_IDENTITY) as string;
            result.should.equal('greenConga');

            inputBoxStub.should.have.been.calledTwice;

            fsReadFile.should.have.been.calledOnce;
            getEnrollIdSecretStub.should.have.been.calledOnce;
            enrollStub.should.have.been.calledOnceWith('http://ca0url', 'enrollID', 'enrollSecret');
            importIdentityStub.should.have.been.calledWith('---CERT---', '---KEY---', 'greenConga', 'myMSPID');
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);

            logSpy.should.have.been.calledTwice;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'addWalletIdentity');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added identity', `Successfully added identity to wallet`);
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('addWalletIdentityCommand', { method: 'enrollmentID' });
        });

        it('should test an identity can be added with an enroll id and secret, when called from the command palette using a yaml file with caName', async () => {
            connectionProfilePathStub.resolves(path.join('myPath', 'connection.yml'));
            showWalletsQuickPickStub.resolves({
                label: 'externalWallet',
                data: FabricWalletRegistry.instance().get('externalWallet')
            });

            fsReadFile.resolves(`---
            certificateAuthorities:
              ca0:
                url: http://ca0url
                caName: clientCA`);

            inputBoxStub.onFirstCall().resolves('greenConga');
            inputBoxStub.onSecondCall().resolves('myMSPID');
            addIdentityMethodStub.resolves(UserInputUtil.ADD_ID_SECRET_OPTION);
            showGatewayQuickPickBoxStub.resolves({
                label: 'myGatewayC',
                data: FabricGatewayRegistry.instance().get('myGatewayC')
            });
            getEnrollIdSecretStub.resolves({ enrollmentID: 'enrollID', enrollmentSecret: 'enrollSecret' });
            enrollStub.resolves({ certificate: '---CERT---', privateKey: '---KEY---' });

            const result: string = await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET_IDENTITY) as string;
            result.should.equal('greenConga');

            inputBoxStub.should.have.been.calledTwice;

            fsReadFile.should.have.been.calledOnce;
            getEnrollIdSecretStub.should.have.been.calledOnce;
            enrollStub.should.have.been.calledOnceWith('http://ca0url', 'enrollID', 'enrollSecret', 'clientCA');
            importIdentityStub.should.have.been.calledWith('---CERT---', '---KEY---', 'greenConga', 'myMSPID');
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);

            logSpy.should.have.been.calledTwice;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'addWalletIdentity');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added identity', `Successfully added identity to wallet`);
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('addWalletIdentityCommand', { method: 'enrollmentID' });
        });

        it('should return when user cancels when selecting a CA to enroll with', async () => {
            showWalletsQuickPickStub.resolves({
                label: 'externalWallet',
                data: FabricWalletRegistry.instance().get('externalWallet')
            });

            fsReadFile.resolves(`{
                "certificateAuthorities": {
                    "ca0": {
                        "url": "http://ca0url"
                    },
                    "ca1": {
                        "url": "http://ca1url"
                    }
                }
            }`);

            const showQuickPickCAStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'showQuickPickCA').resolves();

            inputBoxStub.onFirstCall().resolves('greenConga');
            inputBoxStub.onSecondCall().resolves('myMSPID');
            addIdentityMethodStub.resolves(UserInputUtil.ADD_ID_SECRET_OPTION);
            showGatewayQuickPickBoxStub.resolves({
                label: 'myGatewayA',
                data: FabricGatewayRegistry.instance().get('myGatewayA')
            });
            getEnrollIdSecretStub.resolves({ enrollmentID: 'enrollID', enrollmentSecret: 'enrollSecret' });
            enrollStub.resolves({ certificate: '---CERT---', privateKey: '---KEY---' });

            const result: string = await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET_IDENTITY) as string;
            should.not.exist(result);

            inputBoxStub.should.have.been.calledTwice;

            showQuickPickCAStub.should.have.been.calledOnce;
            fsReadFile.should.have.been.calledOnce;
            getEnrollIdSecretStub.should.have.been.calledOnce;
            enrollStub.should.not.have.been.called;
            importIdentityStub.should.not.have.been.called;

            logSpy.should.have.been.calledOnce;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'addWalletIdentity');
            sendTelemetryEventStub.should.not.have.been.called;
        });

        it('should ask which ca if more than one', async () => {
            showWalletsQuickPickStub.resolves({
                label: 'externalWallet',
                data: FabricWalletRegistry.instance().get('externalWallet')
            });

            fsReadFile.resolves(`{
                "certificateAuthorities": {
                    "ca0": {
                        "url": "http://ca0url"
                    },
                    "ca1": {
                        "url": "http://ca1url"
                    }
                }
            }`);

            const showQuickPickCAStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'showQuickPickCA').resolves('ca1');

            inputBoxStub.onFirstCall().resolves('greenConga');
            inputBoxStub.onSecondCall().resolves('myMSPID');
            addIdentityMethodStub.resolves(UserInputUtil.ADD_ID_SECRET_OPTION);
            showGatewayQuickPickBoxStub.resolves({
                label: 'myGatewayA',
                data: FabricGatewayRegistry.instance().get('myGatewayA')
            });
            getEnrollIdSecretStub.resolves({ enrollmentID: 'enrollID', enrollmentSecret: 'enrollSecret' });
            enrollStub.resolves({ certificate: '---CERT---', privateKey: '---KEY---' });

            const result: string = await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET_IDENTITY) as string;
            result.should.equal('greenConga');

            inputBoxStub.should.have.been.calledTwice;

            showQuickPickCAStub.should.have.been.calledOnce;
            fsReadFile.should.have.been.calledOnce;
            getEnrollIdSecretStub.should.have.been.calledOnce;
            enrollStub.should.have.been.calledOnceWith('http://ca1url', 'enrollID', 'enrollSecret');
            importIdentityStub.should.have.been.calledWith('---CERT---', '---KEY---', 'greenConga', 'myMSPID');
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);

            logSpy.should.have.been.calledTwice;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'addWalletIdentity');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added identity', `Successfully added identity to wallet`);
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('addWalletIdentityCommand', { method: 'enrollmentID' });
        });

        it('should test adding an identity can be cancelled when choosing a wallet', async () => {
            showWalletsQuickPickStub.resolves();
            const result: string = await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET_IDENTITY) as string;
            should.not.exist(result);
            inputBoxStub.should.not.have.been.called;
            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'addWalletIdentity');
            sendTelemetryEventStub.should.not.have.been.called;
        });

        it('should test adding an identity can be cancelled when failing to give an identity name', async () => {
            showWalletsQuickPickStub.resolves({
                label: 'blueWallet',
                data: FabricWalletRegistry.instance().get('blueWallet')
            });
            inputBoxStub.resolves();

            const result: string = await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET_IDENTITY) as string;
            should.not.exist(result);
            inputBoxStub.should.have.been.calledOnce;
            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'addWalletIdentity');
            sendTelemetryEventStub.should.not.have.been.called;
        });

        it('should test adding an identity can be cancelled when asked to select a method for adding an identity', async () => {
            showWalletsQuickPickStub.resolves({
                label: 'blueWallet',
                data: FabricWalletRegistry.instance().get('blueWallet')
            });

            inputBoxStub.onFirstCall().resolves('greenConga');
            inputBoxStub.onSecondCall().resolves('myMSPID');
            addIdentityMethodStub.resolves();

            const result: string = await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET_IDENTITY) as string;
            should.not.exist(result);
            inputBoxStub.should.have.been.calledOnce;
            addIdentityMethodStub.should.have.been.calledOnce;
            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'addWalletIdentity');
            sendTelemetryEventStub.should.not.have.been.called;
        });

        it('should test adding an identity can be cancelled when asked to give an MSPID', async () => {
            showWalletsQuickPickStub.resolves({
                label: 'externalWallet',
                data: FabricWalletRegistry.instance().get('externalWallet')
            });

            inputBoxStub.onFirstCall().resolves('greenConga');
            inputBoxStub.onSecondCall().resolves();

            const result: string = await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET_IDENTITY) as string;
            should.not.exist(result);
            inputBoxStub.should.have.been.calledTwice;
            addIdentityMethodStub.should.not.have.been.called;
            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'addWalletIdentity');
        });

        it('should test adding an identity can be cancelled chosing a gateway to enroll with', async () => {
            showWalletsQuickPickStub.resolves({
                label: 'externalWallet',
                data: FabricWalletRegistry.instance().get('externalWallet')
            });

            inputBoxStub.onFirstCall().resolves('greenConga');
            inputBoxStub.onSecondCall().resolves('myMSPID');
            addIdentityMethodStub.resolves(UserInputUtil.ADD_ID_SECRET_OPTION);
            showGatewayQuickPickBoxStub.resolves();

            const result: string = await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET_IDENTITY) as string;
            should.not.exist(result);
            inputBoxStub.should.have.been.calledTwice;
            getEnrollIdSecretStub.should.not.have.been.called;
            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'addWalletIdentity');
        });

        it('should test adding an identity can be cancelled when adding using an identity and secret', async () => {
            showWalletsQuickPickStub.resolves({
                label: 'externalWallet',
                data: FabricWalletRegistry.instance().get('externalWallet')
            });

            inputBoxStub.onFirstCall().resolves('greenConga');
            inputBoxStub.onSecondCall().resolves('myMSPID');
            addIdentityMethodStub.resolves(UserInputUtil.ADD_ID_SECRET_OPTION);
            showGatewayQuickPickBoxStub.resolves({
                label: 'myGatewayB',
                data: FabricGatewayRegistry.instance().get('myGatewayB')
            });
            getEnrollIdSecretStub.resolves();

            const result: string = await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET_IDENTITY) as string;
            should.not.exist(result);
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
            getCertKeyStub.resolves({
                certificatePath: path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'),
                privateKeyPath: path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey')
            });
            fsReadFile.onFirstCall().resolves('---CERT---');
            fsReadFile.onSecondCall().resolves('---KEY---');

            const result: string = await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET_IDENTITY) as string;
            result.should.equal('blueConga');
            inputBoxStub.should.have.been.calledOnce;
            fsReadFile.should.have.been.calledTwice;
            showGatewayQuickPickBoxStub.should.not.have.been.called;
            getCertKeyStub.should.have.been.calledOnce;
            importIdentityStub.should.have.been.calledWith('---CERT---', '---KEY---', 'blueConga', 'myMSPID');
            logSpy.should.have.been.calledTwice;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'addWalletIdentity');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added identity', `Successfully added identity to wallet`);
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('addWalletIdentityCommand', { method: 'Certificate' });
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

            const result: string = await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET_IDENTITY) as string;
            should.not.exist(result);
            fsReadFile.should.not.have.been.called;
            getCertKeyStub.should.have.been.calledOnce;
            importIdentityStub.should.not.have.been.called;
            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'addWalletIdentity');
        });

        it('should show an error if parsing the certificate file fails', async () => {
            showWalletsQuickPickStub.resolves({
                label: 'blueWallet',
                data: FabricWalletRegistry.instance().get('blueWallet')
            });
            inputBoxStub.onFirstCall().resolves('blueConga');
            inputBoxStub.onSecondCall().resolves('myMSPID');
            addIdentityMethodStub.resolves(UserInputUtil.ADD_CERT_KEY_OPTION);
            const error: Error = new Error('certificate invalid');
            getCertKeyStub.throws(error);

            const result: string = await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET_IDENTITY) as string;
            should.not.exist(result);
            fsReadFile.should.not.have.been.called;
            getCertKeyStub.should.have.been.calledOnce;
            importIdentityStub.should.not.have.been.called;
            logSpy.should.have.been.calledTwice;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'addWalletIdentity');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Unable to add identity to wallet: ${error.message}`, `Unable to add identity to wallet: ${error.toString()}`);
            sendTelemetryEventStub.should.not.have.been.called;
        });

        it('should error if an identity is unable to be imported', async () => {

            fsReadFile.resolves(`{
                "certificateAuthorities": {
                    "ca0": {
                        "url": "http://ca0url"
                    }
                }
            }`);

            showWalletsQuickPickStub.resolves({
                label: 'externalWallet',
                data: FabricWalletRegistry.instance().get('externalWallet')
            });
            inputBoxStub.onFirstCall().resolves('greenConga');
            inputBoxStub.onSecondCall().resolves('myMSPID');
            addIdentityMethodStub.resolves(UserInputUtil.ADD_ID_SECRET_OPTION);
            showGatewayQuickPickBoxStub.resolves({
                label: 'myGatewayB',
                data: FabricGatewayRegistry.instance().get('myGatewayB')
            });
            getEnrollIdSecretStub.resolves({ enrollmentID: 'enrollID', enrollmentSecret: 'enrollSecret' });
            enrollStub.resolves({ certificate: '---CERT---', privateKey: '---KEY---' });
            const error: Error = new Error('Already exists');
            importIdentityStub.throws(error);

            const result: string = await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET_IDENTITY) as string;
            should.not.exist(result);

            inputBoxStub.should.have.been.calledTwice;
            fsReadFile.should.have.been.calledOnce;
            getEnrollIdSecretStub.should.have.been.calledOnce;
            enrollStub.should.have.been.calledOnceWith('http://ca0url', 'enrollID', 'enrollSecret');
            importIdentityStub.should.have.been.calledWith('---CERT---', '---KEY---', 'greenConga', 'myMSPID');
            logSpy.should.have.been.calledTwice;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'addWalletIdentity');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Unable to add identity to wallet: ${error.message}`, `Unable to add identity to wallet: ${error.toString()}`);
            sendTelemetryEventStub.should.not.have.been.called;
        });

        it('should test an error is thrown if trying to add an identity when no gateway doesnt exist', async () => {
            showWalletsQuickPickStub.resolves({
                label: 'externalWallet',
                data: FabricWalletRegistry.instance().get('externalWallet')
            });
            mySandBox.stub(FabricGatewayRegistry.instance(), 'getAll').returns([]);
            inputBoxStub.onFirstCall().resolves('greenConga');
            inputBoxStub.onSecondCall().resolves('myMSPID');
            addIdentityMethodStub.resolves(UserInputUtil.ADD_ID_SECRET_OPTION);
            showGatewayQuickPickBoxStub.resolves({
                label: 'myGatewayB',
                data: FabricGatewayRegistry.instance().get('myGatewayB')
            });
            getEnrollIdSecretStub.resolves();

            const result: string = await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET_IDENTITY) as string;
            should.not.exist(result);
            inputBoxStub.should.have.been.calledTwice;
            fsReadFile.should.not.have.been.called;
            enrollStub.should.not.have.been.called;
            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'addWalletIdentity');
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.ERROR, `Please add a gateway in order to enroll a new identity`);
        });

        it('should test an identity can be added via a json identity file', async () => {
            showWalletsQuickPickStub.resolves({
                label: 'externalWallet',
                data: FabricWalletRegistry.instance().get('externalWallet')
            });

            inputBoxStub.onFirstCall().resolves('purpleConga');
            inputBoxStub.onSecondCall().resolves('myMSPID');
            addIdentityMethodStub.resolves(UserInputUtil.ADD_JSON_ID_OPTION);
            browseStub.resolves('myTestPath');
            fsReadFile.resolves('{"name": "purpleConga","cert": "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0", "private_key": "LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0"}');

            const result: string = await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET_IDENTITY) as string;
            result.should.equal('purpleConga');
            inputBoxStub.should.have.been.calledTwice;
            browseStub.should.have.been.calledOnce;
            fsReadFile.should.have.been.calledOnce;
            showGatewayQuickPickBoxStub.should.not.have.been.called;
            importIdentityStub.should.have.been.calledWith('-----BEGIN CERTIFICATE----', '-----BEGIN PRIVATE KEY----', 'purpleConga', 'myMSPID');
            logSpy.should.have.been.calledTwice;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'addWalletIdentity');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added identity', `Successfully added identity to wallet`);
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('addWalletIdentityCommand', { method: 'json' });
        });

        it('should handle the user cancelling selecting a json file to create an identity', async () => {
            showWalletsQuickPickStub.resolves({
                label: 'externalWallet',
                data: FabricWalletRegistry.instance().get('externalWallet')
            });

            inputBoxStub.onFirstCall().resolves('purpleConga');
            inputBoxStub.onSecondCall().resolves('myMSPID');
            addIdentityMethodStub.resolves(UserInputUtil.ADD_JSON_ID_OPTION);
            browseStub.resolves();

            const result: string = await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET_IDENTITY) as string;
            should.not.exist(result);
            inputBoxStub.should.have.been.calledTwice;
            browseStub.should.have.been.calledOnce;
            fsReadFile.should.not.have.been.called;
            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'addWalletIdentity');
            sendTelemetryEventStub.should.not.have.been.called;
        });

        it('should display an error if the json file does not contain the correct properties', async () => {
            showWalletsQuickPickStub.resolves({
                label: 'externalWallet',
                data: FabricWalletRegistry.instance().get('externalWallet')
            });

            inputBoxStub.onFirstCall().resolves('purpleConga');
            inputBoxStub.onSecondCall().resolves('myMSPID');
            addIdentityMethodStub.resolves(UserInputUtil.ADD_JSON_ID_OPTION);
            browseStub.resolves('myTestPath');
            fsReadFile.resolves('{"name": "purpleConga","certificate": "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0", "privateKEy": "LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0"}');

            const result: string = await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET_IDENTITY) as string;
            should.not.exist(result);
            inputBoxStub.should.have.been.calledTwice;
            browseStub.should.have.been.calledOnce;
            fsReadFile.should.have.been.calledOnce;
            showGatewayQuickPickBoxStub.should.not.have.been.called;
            importIdentityStub.should.not.have.been.called;
            logSpy.should.have.been.calledTwice;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'addWalletIdentity');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Unable to add identity to wallet: JSON file missing properties "cert" or "private_key"`, `Unable to add identity to wallet: Error: JSON file missing properties "cert" or "private_key"`);
            sendTelemetryEventStub.should.not.have.been.called;
        });

        describe('called from WalletTreeItem', () => {

            it('should test an identity can be added from a WalletTreeItem', async () => {

                fsReadFile.resolves(`{
                    "certificateAuthorities": {
                        "ca0": {
                            "url": "http://ca0url"
                        }
                    }
                }`);

                inputBoxStub.onFirstCall().resolves('greenConga');
                inputBoxStub.onSecondCall().resolves('myMSPID');
                addIdentityMethodStub.resolves(UserInputUtil.ADD_ID_SECRET_OPTION);
                showGatewayQuickPickBoxStub.resolves({
                    label: 'myGatewayA',
                    data: FabricGatewayRegistry.instance().get('myGatewayA')
                });
                getEnrollIdSecretStub.resolves({ enrollmentID: 'enrollID', enrollmentSecret: 'enrollSecret' });
                enrollStub.resolves({ certificate: '---CERT---', privateKey: '---KEY---' });
                importIdentityStub.resolves();
                const blockchainWalletExplorerProvider: BlockchainWalletExplorerProvider = ExtensionUtil.getBlockchainWalletExplorerProvider();

                const walletItems: Array<BlockchainTreeItem> = await blockchainWalletExplorerProvider.getChildren();
                const walletItem: WalletTreeItem = walletItems[2] as WalletTreeItem;

                const result: string = await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET_IDENTITY, walletItem) as string;
                result.should.equal('greenConga');
                showWalletsQuickPickStub.should.not.have.been.called;
                inputBoxStub.should.have.been.calledTwice;
                fsReadFile.should.have.been.called;
                getEnrollIdSecretStub.should.have.been.calledOnce;
                enrollStub.should.have.been.calledOnceWith('http://ca0url', 'enrollID', 'enrollSecret');
                importIdentityStub.should.have.been.calledWith('---CERT---', '---KEY---', 'greenConga', 'myMSPID');
                executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);

                logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'addWalletIdentity');
                logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added identity', `Successfully added identity to wallet`);
                sendTelemetryEventStub.should.have.been.calledOnceWithExactly('addWalletIdentityCommand', { method: 'enrollmentID' });
            });

            it(`should test an identity can be enrolled to ${FabricWalletUtil.LOCAL_WALLET} using ${FabricRuntimeUtil.LOCAL_FABRIC}`, async () => {

                fsReadFile.resolves(`{
                    "certificateAuthorities": {
                        "ca0": {
                            "url": "http://ca0url"
                        }
                    }
                }`);

                mySandBox.stub(FabricRuntimeManager.instance(), 'getGatewayRegistryEntries').resolves([{
                    name: FabricRuntimeUtil.LOCAL_FABRIC,
                    connectionProfilePath: '/some/path/connection.json',
                    managedRuntime: true,
                    associatedWallet: FabricWalletUtil.LOCAL_WALLET
                } as FabricGatewayRegistryEntry]);
                inputBoxStub.onFirstCall().resolves('greenConga');
                addIdentityMethodStub.resolves(UserInputUtil.ADD_LOCAL_ID_SECRET_OPTION);

                const mockRuntime: sinon.SinonStubbedInstance<FabricRuntime> = sinon.createStubInstance(FabricRuntime);
                mockRuntime.isRunning.resolves(true);
                mockRuntime.getWalletNames.resolves([FabricWalletUtil.LOCAL_WALLET]);
                mySandBox.stub(FabricRuntimeManager.instance(), 'getRuntime').returns(mockRuntime);
                getEnrollIdSecretStub.resolves({ enrollmentID: 'enrollID', enrollmentSecret: 'enrollSecret' });
                enrollStub.resolves({ certificate: '---CERT---', privateKey: '---KEY---' });
                importIdentityStub.resolves();
                const blockchainWalletExplorerProvider: BlockchainWalletExplorerProvider = ExtensionUtil.getBlockchainWalletExplorerProvider();

                const walletItems: Array<BlockchainTreeItem> = await blockchainWalletExplorerProvider.getChildren();
                const walletItem: WalletTreeItem = walletItems[0] as LocalWalletTreeItem;

                const result: string = await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET_IDENTITY, walletItem) as string;
                result.should.equal('greenConga');

                showWalletsQuickPickStub.should.not.have.been.called;
                inputBoxStub.should.have.been.calledOnce;
                fsReadFile.should.have.been.called;
                getEnrollIdSecretStub.should.have.been.calledOnce;
                enrollStub.should.have.been.calledOnceWith('http://ca0url', 'enrollID', 'enrollSecret');
                importIdentityStub.should.have.been.calledWith('---CERT---', '---KEY---', 'greenConga', 'myMSPID');
                executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);
                executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.START_FABRIC);

                logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'addWalletIdentity');
                logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added identity', `Successfully added identity to wallet`);
                sendTelemetryEventStub.should.have.been.calledOnceWithExactly('addWalletIdentityCommand', { method: 'enrollmentID' });
            });

            it(`should start ${FabricRuntimeUtil.LOCAL_FABRIC} before attempting to enroll an identity`, async () => {

                fsReadFile.resolves(`{
                    "certificateAuthorities": {
                        "ca0": {
                            "url": "http://ca0url"
                        }
                    }
                }`);

                mySandBox.stub(FabricRuntimeManager.instance(), 'getGatewayRegistryEntries').resolves([{
                    name: FabricRuntimeUtil.LOCAL_FABRIC,
                    connectionProfilePath: '/some/path/connection.json',
                    managedRuntime: true,
                    associatedWallet: FabricWalletUtil.LOCAL_WALLET
                } as FabricGatewayRegistryEntry]);
                inputBoxStub.onFirstCall().resolves('greenConga');
                inputBoxStub.onSecondCall().resolves('myMSPID');
                addIdentityMethodStub.resolves(UserInputUtil.ADD_LOCAL_ID_SECRET_OPTION);

                const mockRuntime: sinon.SinonStubbedInstance<FabricRuntime> = sinon.createStubInstance(FabricRuntime);
                mockRuntime.importWalletsAndIdentities.resolves();
                mockRuntime.isRunning.onCall(0).resolves(false);
                mockRuntime.isRunning.onCall(1).resolves(true);
                mockRuntime.getWalletNames.resolves([FabricWalletUtil.LOCAL_WALLET]);
                mySandBox.stub(FabricRuntimeManager.instance(), 'getRuntime').returns(mockRuntime);
                executeCommandStub.withArgs(ExtensionCommands.START_FABRIC).resolves();
                getEnrollIdSecretStub.resolves({ enrollmentID: 'enrollID', enrollmentSecret: 'enrollSecret' });
                enrollStub.resolves({ certificate: '---CERT---', privateKey: '---KEY---' });
                importIdentityStub.resolves();
                const blockchainWalletExplorerProvider: BlockchainWalletExplorerProvider = ExtensionUtil.getBlockchainWalletExplorerProvider();

                const walletItems: Array<BlockchainTreeItem> = await blockchainWalletExplorerProvider.getChildren();
                const walletItem: WalletTreeItem = walletItems[0] as LocalWalletTreeItem;

                const result: string = await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET_IDENTITY, walletItem) as string;
                result.should.equal('greenConga');

                showWalletsQuickPickStub.should.not.have.been.called;
                inputBoxStub.should.have.been.calledOnce;
                fsReadFile.should.have.been.called;
                getEnrollIdSecretStub.should.have.been.calledOnce;
                enrollStub.should.have.been.calledOnceWith('http://ca0url', 'enrollID', 'enrollSecret');
                importIdentityStub.should.have.been.calledWith('---CERT---', '---KEY---', 'greenConga', 'myMSPID');
                executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);

                logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'addWalletIdentity');
                logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added identity', `Successfully added identity to wallet`);
                sendTelemetryEventStub.should.have.been.calledOnceWithExactly('addWalletIdentityCommand', { method: 'enrollmentID' });
            });

            it(`should handle ${FabricRuntimeUtil.LOCAL_FABRIC} failing to start`, async () => {
                mySandBox.stub(FabricRuntimeManager.instance(), 'getGatewayRegistryEntries').resolves([{
                    name: FabricRuntimeUtil.LOCAL_FABRIC,
                    connectionProfilePath: '/some/path/connection.json',
                    managedRuntime: true,
                    associatedWallet: FabricWalletUtil.LOCAL_WALLET
                } as FabricGatewayRegistryEntry]);
                inputBoxStub.onFirstCall().resolves('greenConga');
                inputBoxStub.onSecondCall().resolves('myMSPID');
                addIdentityMethodStub.resolves(UserInputUtil.ADD_LOCAL_ID_SECRET_OPTION);

                const mockRuntime: sinon.SinonStubbedInstance<FabricRuntime> = sinon.createStubInstance(FabricRuntime);
                mockRuntime.importWalletsAndIdentities.resolves();
                mockRuntime.isRunning.resolves(false);
                mockRuntime.getWalletNames.resolves([FabricWalletUtil.LOCAL_WALLET]);
                mySandBox.stub(FabricRuntimeManager.instance(), 'getRuntime').returns(mockRuntime);
                executeCommandStub.withArgs(ExtensionCommands.START_FABRIC).resolves();

                const blockchainWalletExplorerProvider: BlockchainWalletExplorerProvider = ExtensionUtil.getBlockchainWalletExplorerProvider();
                const walletItems: Array<BlockchainTreeItem> = await blockchainWalletExplorerProvider.getChildren();
                const walletItem: WalletTreeItem = walletItems[0] as LocalWalletTreeItem;

                const result: string = await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET_IDENTITY, walletItem) as string;
                should.not.exist(result);
                showWalletsQuickPickStub.should.not.have.been.called;
                inputBoxStub.should.have.been.calledOnce;
                fsReadFile.should.not.have.been.called;
                logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'addWalletIdentity');
                sendTelemetryEventStub.should.not.have.been.called;
            });
        });

        describe('called from IFabricWallet - addWallet command', () => {

            it('should test an identity can be enrolled to a new wallet', async () => {

                fsReadFile.resolves(`{
                    "certificateAuthorities": {
                        "ca0": {
                            "url": "http://ca0url"
                        }
                    }
                }`);

                showWalletsQuickPickStub.resolves({
                    label: 'externalWallet',
                    data: FabricWalletRegistry.instance().get('externalWallet')
                });

                inputBoxStub.onFirstCall().resolves('greenConga');
                inputBoxStub.onSecondCall().resolves('myMSPID');
                addIdentityMethodStub.resolves(UserInputUtil.ADD_ID_SECRET_OPTION);
                showGatewayQuickPickBoxStub.resolves({
                    label: 'myGatewayA',
                    data: FabricGatewayRegistry.instance().get('myGatewayA')
                });
                getEnrollIdSecretStub.resolves({ enrollmentID: 'enrollID', enrollmentSecret: 'enrollSecret' });
                enrollStub.resolves({ certificate: '---CERT---', privateKey: '---KEY---' });

                const emptyWallet: IFabricWallet = new FabricWallet(path.join(rootPath, '../../test/data/walletDir/emptyWallet'));
                const otherImportIdentityStub: sinon.SinonStub = mySandBox.stub(emptyWallet, 'importIdentity').resolves();

                const result: string = await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET_IDENTITY, emptyWallet) as string;
                result.should.equal('greenConga');

                getWalletStub.should.not.have.been.called;
                showWalletsQuickPickStub.should.not.have.been.called;
                inputBoxStub.should.have.been.calledTwice;
                fsReadFile.should.have.been.called;
                getEnrollIdSecretStub.should.have.been.calledOnce;
                enrollStub.should.have.been.calledOnceWith('http://ca0url', 'enrollID', 'enrollSecret');
                otherImportIdentityStub.should.have.been.calledOnceWith('---CERT---', '---KEY---', 'greenConga', 'myMSPID');
                executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_WALLETS);

                logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'addWalletIdentity');
                logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added identity', `Successfully added identity to wallet`);
                sendTelemetryEventStub.should.have.been.calledOnceWithExactly('addWalletIdentityCommand', { method: 'enrollmentID' });
            });
        });
    });
});
