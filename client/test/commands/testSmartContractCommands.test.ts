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
import * as ejs from 'ejs';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { TestUtil } from '../TestUtil';
import { FabricConnectionManager } from '../../src/fabric/FabricConnectionManager';
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import { BlockchainTreeItem } from '../../src/explorer/model/BlockchainTreeItem';
import { BlockchainNetworkExplorerProvider } from '../../src/explorer/BlockchainNetworkExplorer';
import * as myExtension from '../../src/extension';
import { ChannelTreeItem } from '../../src/explorer/model/ChannelTreeItem';
import { Reporter } from '../../src/util/Reporter';
import { FabricClientConnection } from '../../src/fabric/FabricClientConnection';
import { ExtensionUtil } from '../../src/util/ExtensionUtil';
import { FabricRuntimeConnection } from '../../src/fabric/FabricRuntimeConnection';
import { CommandUtil } from '../../src/util/CommandUtil';
import { InstantiatedChaincodeChildTreeItem } from '../../src/explorer/model/InstantiatedChaincodeChildTreeItem';
import { FabricConnectionRegistryEntry } from '../../src/fabric/FabricConnectionRegistryEntry';

const should: Chai.Should = chai.should();
chai.use(sinonChai);
// tslint:disable no-unused-expression

describe('testSmartContractCommand', () => {
    let mySandBox: sinon.SinonSandbox;
    let fabricClientConnectionMock: sinon.SinonStubbedInstance<FabricClientConnection>;
    let fabricRuntimeConnectionMock: sinon.SinonStubbedInstance<FabricRuntimeConnection>;
    let executeCommandStub: sinon.SinonStub;
    let errorSpy: sinon.SinonSpy;
    let fsRemoveStub: sinon.SinonStub;
    let reporterStub: sinon.SinonStub;
    let getConnectionStub: sinon.SinonStub;
    let showInstantiatedSmartContractsQuickPickStub: sinon.SinonStub;
    let openTextDocumentStub: sinon.SinonStub;
    let showTextDocumentStub: sinon.SinonStub;
    let getDirPathStub: sinon.SinonStub;
    let allChildren: Array<BlockchainTreeItem>;
    let blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider;
    let fabricConnectionManager: FabricConnectionManager;
    let channel: ChannelTreeItem;
    let chaincodes: any[];
    let instantiatedSmartContract: InstantiatedChaincodeChildTreeItem;
    let fakeMetadataFunctions: string[];
    let fakeConnectionDetails: { connectionProfilePath: string, certificatePath: string, privateKeyPath: string };
    let fakeRuntimeConnectionDetails: { connectionProfile: object, certificatePath: string, privateKeyPath: string };
    let smartContractName: string;
    let smartContractLabel: string;
    const rootPath: string = path.dirname(__dirname);
    let testFileDir: string;
    let mockDocumentStub: any;
    let mockDocumentSaveSpy: sinon.SinonSpy;
    let mockEditBuilder: any;
    let mockEditBuilderReplaceSpy: sinon.SinonSpy;
    let mockTextEditor: any;
    let findFilesStub: sinon.SinonStub;
    let readFileStub: sinon.SinonStub;
    let workspaceFoldersStub: sinon.SinonStub;
    let sendCommandStub: sinon.SinonStub;
    let showLanguageQuickPickStub: sinon.SinonStub;
    let registryEntry: FabricConnectionRegistryEntry;
    let getRegistryStub: sinon.SinonStub;
    let getConfigurationStub: sinon.SinonStub;
    let workspaceConfigurationUpdateStub: sinon.SinonStub;
    let workspaceConfigurationGetStub: sinon.SinonStub ;

    before(async () => {
        await TestUtil.setupTests();
    });

    afterEach(async () => {
        mySandBox.restore();
        await vscode.commands.executeCommand('blockchainExplorer.disconnectEntry');
        await TestUtil.deleteTestFiles(testFileDir);
    });

    describe('Generate tests for Fabric Client Connection instantiated smart contract', () => {

        beforeEach(async () => {
            mySandBox = sinon.createSandbox();
            errorSpy = mySandBox.spy(vscode.window, 'showErrorMessage');
            reporterStub = mySandBox.stub(Reporter.instance(), 'sendTelemetryEvent');
            fsRemoveStub = mySandBox.stub(fs, 'remove').resolves();
            // ExecuteCommand stub
            executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand');
            executeCommandStub.withArgs('blockchainExplorer.connectEntry').resolves();
            executeCommandStub.callThrough();
            // Client Connection stubs
            fakeMetadataFunctions = ['instantiate', 'wagonwheeling', 'transaction2'];
            fakeConnectionDetails = {
                connectionProfilePath: 'fakeConnectionProfilePath',
                certificatePath: 'fakeCertificatePath',
                privateKeyPath: 'fakePrivateKeyPath'
            };
            fabricClientConnectionMock = sinon.createStubInstance(FabricClientConnection);
            fabricClientConnectionMock.connect.resolves();
            fabricClientConnectionMock.instantiateChaincode.resolves();
            fabricClientConnectionMock.getMetadata.resolves(JSON.parse('{"":{"functions":["instantiate","wagonwheeling","transaction2"]},"org.hyperledger.fabric":{"functions":["getMetaData"]}}'));
            fabricClientConnectionMock.getConnectionDetails.resolves(fakeConnectionDetails);
            fabricConnectionManager = FabricConnectionManager.instance();
            getConnectionStub = mySandBox.stub(fabricConnectionManager, 'getConnection').returns(fabricClientConnectionMock);

            registryEntry = new FabricConnectionRegistryEntry();
            registryEntry.name = 'myConnection';
            registryEntry.connectionProfilePath = 'myPath';
            registryEntry.managedRuntime = false;
            getRegistryStub = mySandBox.stub(fabricConnectionManager, 'getConnectionRegistryEntry').returns(registryEntry);
            fabricClientConnectionMock.getAllPeerNames.returns(['peerOne']);
            fabricClientConnectionMock.getAllChannelsForPeer.withArgs('peerOne').resolves(['myEnglishChannel']);
            fabricClientConnectionMock.getInstantiatedChaincode.resolves([
                {
                    name: 'wagonwheel',
                    version: '0.0.1',
                    label: 'wagonwheel@0.0.1',
                    channel: 'myEnglishChannel'
                }
            ]);
            // UserInputUtil stubs
            showInstantiatedSmartContractsQuickPickStub = mySandBox.stub(UserInputUtil, 'showInstantiatedSmartContractsQuickPick').withArgs(sinon.match.any).resolves({
                label: 'wagonwheel@0.0.1',
                data: { name: 'wagonwheel', channel: 'myEnglishChannel', version: '0.0.1' }
            });
            // Explorer provider stuff
            blockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
            allChildren = await blockchainNetworkExplorerProvider.getChildren();
            channel = allChildren[0] as ChannelTreeItem;
            chaincodes = channel.chaincodes;
            instantiatedSmartContract = chaincodes[0] as InstantiatedChaincodeChildTreeItem;
            smartContractLabel = instantiatedSmartContract.label;
            smartContractName = instantiatedSmartContract.name;
            // Document editor stubs
            testFileDir = path.join(rootPath, '..', 'data', 'smartContractTests');
            mockDocumentStub = {
                lineCount: 8,
                save: (): any => {
                    return Promise.resolve();
                }
            };
            mockDocumentSaveSpy = mySandBox.spy(mockDocumentStub, 'save');
            mockEditBuilder = {
                replace: (): any => {
                    return Promise.resolve();
                }
            };
            mockEditBuilderReplaceSpy = mySandBox.spy(mockEditBuilder, 'replace');
            mockTextEditor = {
                edit: mySandBox.stub()
            };
            mockTextEditor.edit.yields(mockEditBuilder);
            mockTextEditor.edit.resolves(true);
            openTextDocumentStub = mySandBox.stub(vscode.workspace, 'openTextDocument').resolves(mockDocumentStub);
            showTextDocumentStub = mySandBox.stub(vscode.window, 'showTextDocument').resolves(mockTextEditor);
            const packageJSONPath: string = path.join(testFileDir, 'package.json');
            findFilesStub = mySandBox.stub(vscode.workspace, 'findFiles').resolves([vscode.Uri.file(packageJSONPath)]);
            const smartContractNameBuffer: Buffer = Buffer.from(`{"name": "${smartContractName}"}`);
            readFileStub = mySandBox.stub(fs, 'readFile').resolves(smartContractNameBuffer);
            workspaceFoldersStub = mySandBox.stub(UserInputUtil, 'getWorkspaceFolders').resolves([{ name: 'wagonwheeling' }]);
            // Other stubs
            sendCommandStub = mySandBox.stub(CommandUtil, 'sendCommand').resolves();
            showLanguageQuickPickStub = mySandBox.stub(UserInputUtil, 'showLanguagesQuickPick').resolves('JavaScript');
            workspaceConfigurationUpdateStub = mySandBox.stub();
            workspaceConfigurationGetStub = mySandBox.stub();

        });

        it('should generate a javascript test file for a selected instantiated smart contract', async () => {
            mySandBox.stub(fs, 'pathExists').resolves(false);
            mySandBox.stub(fs, 'ensureFile').resolves();
            const testFilePath: string = path.join(testFileDir, 'functionalTests', `${smartContractLabel}.test.js`);
            const testUri: vscode.Uri = vscode.Uri.file(testFilePath);

            await vscode.commands.executeCommand('blockchainExplorer.testSmartContractEntry', instantiatedSmartContract);
            openTextDocumentStub.should.have.been.calledWith(testUri.fsPath);
            showTextDocumentStub.should.have.been.called;
            const templateData: string = mockEditBuilderReplaceSpy.args[0][1];
            templateData.should.not.equal('');
            templateData.includes(smartContractLabel).should.be.true;
            templateData.includes(fakeMetadataFunctions[0]).should.be.true;
            templateData.includes(fakeMetadataFunctions[1]).should.be.true;
            templateData.includes(fakeMetadataFunctions[2]).should.be.true;
            templateData.startsWith('/*').should.be.true;
            templateData.includes('gateway.connect').should.be.true;
            templateData.includes('submitTransaction').should.be.true;
            templateData.includes('require').should.be.true;
            sendCommandStub.should.have.been.calledThrice;
            errorSpy.should.not.have.been.called;
        });

        it('should generate a typescript test file for a selected instantiated smart contract', async () => {
            workspaceConfigurationGetStub.onCall(0).returns('some command');
            getConfigurationStub = mySandBox.stub(vscode.workspace, 'getConfiguration');
            getConfigurationStub.returns({
                get: workspaceConfigurationGetStub,
                update: workspaceConfigurationUpdateStub
            });
            showLanguageQuickPickStub.resolves('TypeScript');
            mySandBox.stub(fs, 'pathExists').resolves(false);
            mySandBox.stub(fs, 'ensureFile').resolves();
            const testFilePath: string = path.join(testFileDir, 'functionalTests', `${smartContractLabel}.test.ts`);
            const testUri: vscode.Uri = vscode.Uri.file(testFilePath);

            await vscode.commands.executeCommand('blockchainExplorer.testSmartContractEntry', instantiatedSmartContract);
            openTextDocumentStub.should.have.been.calledWith(testUri.fsPath);
            showTextDocumentStub.should.have.been.called;
            const templateData: string = mockEditBuilderReplaceSpy.args[0][1];
            templateData.should.not.equal('');
            templateData.includes(smartContractLabel).should.be.true;
            templateData.includes(fakeMetadataFunctions[0]).should.be.true;
            templateData.includes(fakeMetadataFunctions[1]).should.be.true;
            templateData.includes(fakeMetadataFunctions[2]).should.be.true;
            templateData.startsWith('/*').should.be.true;
            templateData.includes('gateway.connect').should.be.true;
            templateData.includes('submitTransaction').should.be.true;
            templateData.includes(': string').should.be.true;
            sendCommandStub.callCount.should.equal(4);
            workspaceConfigurationUpdateStub.should.have.been.calledOnce;
            errorSpy.should.not.have.been.called;
        });

        it('should ask the user for an instantiated smart contract to test if none selected', async () => {
            mySandBox.stub(fs, 'pathExists').resolves(false);
            mySandBox.stub(fs, 'ensureFile').resolves();

            await vscode.commands.executeCommand('blockchainExplorer.testSmartContractEntry');
            showInstantiatedSmartContractsQuickPickStub.should.have.been.called;
            errorSpy.should.not.have.been.called;
        });

        it('should connect if there is no connection', async () => {
            getConnectionStub.onCall(4).returns(null);
            getConnectionStub.onCall(5).returns(fabricClientConnectionMock);
            mySandBox.stub(fs, 'pathExists').resolves(false);
            mySandBox.stub(fs, 'ensureFile').resolves();

            await vscode.commands.executeCommand('blockchainExplorer.testSmartContractEntry');
            showInstantiatedSmartContractsQuickPickStub.should.have.been.called;
            openTextDocumentStub.should.have.been.called;
            showTextDocumentStub.should.have.been.called;
            errorSpy.should.not.have.been.called;
        });

        it('should handle connecting being cancelled', async () => {
            getConnectionStub.returns(null);

            await vscode.commands.executeCommand('blockchainExplorer.testSmartContractEntry');
            executeCommandStub.should.have.been.calledWith('blockchainExplorer.connectEntry');
            showInstantiatedSmartContractsQuickPickStub.should.not.have.been.called;
        });

        it('should do nothing if the user cancels selecting an instantiated smart contract', async () => {
            showInstantiatedSmartContractsQuickPickStub.resolves();

            await vscode.commands.executeCommand('blockchainExplorer.testSmartContractEntry');
            showInstantiatedSmartContractsQuickPickStub.should.have.been.called;
            fabricClientConnectionMock.getMetadata.should.not.have.been.called;
            errorSpy.should.not.have.been.called;
        });

        it('should show an error message if the user has no workspaces open', async () => {
            workspaceFoldersStub.resolves([]);

            await vscode.commands.executeCommand('blockchainExplorer.testSmartContractEntry', instantiatedSmartContract);
            errorSpy.should.have.been.calledWith(`Smart contract project ${smartContractName} is not open in workspace`);
        });

        it('should show an error message if the smart contract project isnt open in the workspace', async () => {
            const incorrectBuffer: Buffer = Buffer.from(`{"name": "double_decker"}`);
            readFileStub.resolves(incorrectBuffer);

            await vscode.commands.executeCommand('blockchainExplorer.testSmartContractEntry', instantiatedSmartContract);
            errorSpy.should.have.been.calledWith(`Smart contract project ${smartContractName} is not open in workspace`);
        });

        it('should handle errors with running getMetaData by showing an error message to the user', async () => {
            fabricClientConnectionMock.getMetadata.rejects({ message: 'some error' });

            await vscode.commands.executeCommand('blockchainExplorer.testSmartContractEntry');
            showInstantiatedSmartContractsQuickPickStub.should.have.been.called;
            fabricClientConnectionMock.getMetadata.should.have.been.called;
            errorSpy.should.have.been.calledWith('Error getting metadata for smart contract: some error');
        });

        it('should handle errors with creating the template data', async () => {
            mySandBox.stub(ejs, 'renderFile').yields({ message: 'some error' }, null);

            await vscode.commands.executeCommand('blockchainExplorer.testSmartContractEntry', instantiatedSmartContract);
            mySandBox.stub(fs, 'pathExists').should.not.have.been.called;
            errorSpy.should.have.been.calledWith('Error creating template data: some error');
        });

        it('should not overwrite an existing test file if the user says no', async () => {
            mySandBox.stub(fs, 'pathExists').resolves(true);
            const showTestFileOverwriteQuickPickStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'showTestFileOverwriteQuickPick').resolves(UserInputUtil.NO);

            await vscode.commands.executeCommand('blockchainExplorer.testSmartContractEntry', instantiatedSmartContract);
            showTestFileOverwriteQuickPickStub.should.have.been.called;
            mySandBox.stub(fs, 'ensureFile').should.not.have.been.called;
            errorSpy.should.not.have.been.called;
        });

        it('should not overwrite an existing test file if the user cancels the overwrite quick pick box', async () => {
            mySandBox.stub(fs, 'pathExists').resolves(true);
            const showTestFileOverwriteQuickPickStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'showTestFileOverwriteQuickPick').resolves(undefined);

            await vscode.commands.executeCommand('blockchainExplorer.testSmartContractEntry', instantiatedSmartContract);
            showTestFileOverwriteQuickPickStub.should.have.been.called;
            mySandBox.stub(fs, 'ensureFile').should.not.have.been.called;
            errorSpy.should.not.have.been.called;
        });

        it('should overwrite an existing test file if the user says yes', async () => {
            mySandBox.stub(fs, 'pathExists').resolves(true);
            const showTestFileOverwriteQuickPickStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'showTestFileOverwriteQuickPick').resolves(UserInputUtil.YES);

            await vscode.commands.executeCommand('blockchainExplorer.testSmartContractEntry', instantiatedSmartContract);
            showTestFileOverwriteQuickPickStub.should.have.been.called;
            openTextDocumentStub.should.have.been.called;
            showTextDocumentStub.should.have.been.called;
            const templateData: string = mockEditBuilderReplaceSpy.args[0][1];
            templateData.should.not.equal('');
            templateData.includes(smartContractLabel).should.be.true;
            templateData.includes(fakeMetadataFunctions[0]).should.be.true;
            templateData.includes(fakeMetadataFunctions[1]).should.be.true;
            templateData.includes(fakeMetadataFunctions[2]).should.be.true;
            templateData.startsWith('/*').should.be.true;
            templateData.includes('gateway.connect').should.be.true;
            templateData.includes('submitTransaction').should.be.true;
            errorSpy.should.not.have.been.called;
        });

        it('should generate a copy of the test file if the user tells it to', async () => {
            const pathExistsStub: sinon.SinonStub = mySandBox.stub(fs, 'pathExists');
            pathExistsStub.onCall(0).resolves(true);
            pathExistsStub.onCall(1).resolves(true);
            pathExistsStub.callThrough();
            const showTestFileOverwriteQuickPickStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'showTestFileOverwriteQuickPick').resolves(UserInputUtil.GENERATE_NEW_TEST_FILE);
            const testFilePath: string = path.join(testFileDir, 'functionalTests', `${smartContractLabel}-copy1.test.js`);
            const testUri: vscode.Uri = vscode.Uri.file(testFilePath);

            await vscode.commands.executeCommand('blockchainExplorer.testSmartContractEntry', instantiatedSmartContract);
            showTestFileOverwriteQuickPickStub.should.have.been.called;
            openTextDocumentStub.should.have.been.calledWith(testUri.fsPath);
            showTextDocumentStub.should.have.been.called;
            const templateData: string = mockEditBuilderReplaceSpy.args[0][1];
            templateData.should.not.equal('');
            templateData.includes(smartContractName).should.be.true;
            templateData.includes(fakeMetadataFunctions[0]).should.be.true;
            templateData.includes(fakeMetadataFunctions[1]).should.be.true;
            templateData.includes(fakeMetadataFunctions[2]).should.be.true;
            errorSpy.should.not.have.been.called;
        });

        it('should show an error if it fails to create test file', async () => {
            mySandBox.stub(fs, 'pathExists').resolves(false);
            mySandBox.stub(fs, 'ensureFile').rejects({ message: 'some error' });

            await vscode.commands.executeCommand('blockchainExplorer.testSmartContractEntry', instantiatedSmartContract);
            openTextDocumentStub.should.not.have.been.called;
            errorSpy.should.have.been.calledWith('Error creating test file: some error');
            fsRemoveStub.should.have.been.called;
        });

        it('should handle errors writing data to the file', async () => {
            mySandBox.stub(fs, 'pathExists').resolves(false);
            mySandBox.stub(fs, 'ensureFile').resolves();
            const testFilePath: string = path.join(testFileDir, 'functionalTests', `${smartContractLabel}.test.js`);
            const testUri: vscode.Uri = vscode.Uri.file(testFilePath);
            mockTextEditor.edit.resolves(false);

            await vscode.commands.executeCommand('blockchainExplorer.testSmartContractEntry', instantiatedSmartContract);
            openTextDocumentStub.should.have.been.called;
            showTextDocumentStub.should.have.been.called;
            mockDocumentSaveSpy.should.not.have.been.called;
            errorSpy.should.have.been.calledWith('Error editing test file: ' + testUri.fsPath);
            fsRemoveStub.should.have.been.called;
        });

        it('should send a telemetry event for testSmartContract if the extension is for production', async () => {
            mySandBox.stub(ExtensionUtil, 'getPackageJSON').returns({ production: true });
            mySandBox.stub(fs, 'pathExists').resolves(false);
            mySandBox.stub(fs, 'ensureFile').resolves();

            await vscode.commands.executeCommand('blockchainExplorer.testSmartContractEntry', instantiatedSmartContract);
            openTextDocumentStub.should.have.been.called;
            showTextDocumentStub.should.have.been.called;
            errorSpy.should.not.have.been.called;

            reporterStub.should.have.been.calledWith('testSmartContractCommand');
        });

        it('should handle errors when attempting to remove created test file', async () => {
            mySandBox.stub(fs, 'ensureFile').rejects();
            fsRemoveStub.rejects({ message: 'some other error' });

            await vscode.commands.executeCommand('blockchainExplorer.testSmartContractEntry', instantiatedSmartContract);
            mySandBox.stub(fs, 'pathExists').should.not.have.been.called;
            errorSpy.should.have.been.calledWith('Error removing test file: some other error');
            fsRemoveStub.should.have.been.called;
            openTextDocumentStub.should.not.have.been.called;
        });

        it('should not show error for removing non-existent test file', async () => {
            mockTextEditor.edit.resolves(false);
            fsRemoveStub.rejects({ message: 'ENOENT: no such file or directory' });
            const testFilePath: string = path.join(testFileDir, 'functionalTests', `${smartContractLabel}.test.js`);
            const testUri: vscode.Uri = vscode.Uri.file(testFilePath);

            await vscode.commands.executeCommand('blockchainExplorer.testSmartContractEntry', instantiatedSmartContract);
            mySandBox.stub(fs, 'pathExists').should.not.have.been.called;
            errorSpy.should.have.been.calledOnceWith('Error editing test file: ' + testUri.fsPath);
            fsRemoveStub.should.have.been.called;
        });

        it('should show an error if the npm install fails', async () => {
            sendCommandStub.onCall(0).rejects({ message: 'horrible error' });

            await vscode.commands.executeCommand('blockchainExplorer.testSmartContractEntry', instantiatedSmartContract);
            errorSpy.should.have.been.calledOnceWith('Error installing node modules in smart contract project: horrible error');
            sendCommandStub.should.have.been.calledOnce;
        });

        it('should show an error if installing generator-network fails', async () => {
            sendCommandStub.onCall(1).rejects({ message: 'other horrible error' });

            await vscode.commands.executeCommand('blockchainExplorer.testSmartContractEntry', instantiatedSmartContract);
            errorSpy.should.have.been.calledOnceWith('Error installing node modules in smart contract project: other horrible error');
            sendCommandStub.should.have.been.calledTwice;
        });

        it('should show an error if installing generator-client fails', async () => {
            sendCommandStub.onCall(2).rejects({ message: 'other terrible error' });

            await vscode.commands.executeCommand('blockchainExplorer.testSmartContractEntry', instantiatedSmartContract);
            errorSpy.should.have.been.calledOnceWith('Error installing node modules in smart contract project: other terrible error');
            sendCommandStub.should.have.been.calledThrice;
        });

        it('should show an error if installing mocha types fails', async () => {
            showLanguageQuickPickStub.resolves('TypeScript');
            sendCommandStub.onCall(3).rejects({message: 'it all went wrong'});

            await vscode.commands.executeCommand('blockchainExplorer.testSmartContractEntry', instantiatedSmartContract);
            errorSpy.should.have.been.calledOnceWith('Error installing node modules in smart contract project: it all went wrong');
            sendCommandStub.callCount.should.equal(4);
        });

        it('should correctly detect existing test runner user settings for typescript tests', async () => {
            workspaceConfigurationGetStub.onCall(0).returns('-r ts-node/register');
            getConfigurationStub = mySandBox.stub(vscode.workspace, 'getConfiguration');
            getConfigurationStub.returns({
                get: workspaceConfigurationGetStub,
                update: workspaceConfigurationUpdateStub
            });
            showLanguageQuickPickStub.resolves('TypeScript');
            mySandBox.stub(fs, 'pathExists').resolves(false);
            mySandBox.stub(fs, 'ensureFile').resolves();

            await vscode.commands.executeCommand('blockchainExplorer.testSmartContractEntry', instantiatedSmartContract);
            workspaceConfigurationUpdateStub.should.not.have.been.called;
            errorSpy.should.not.have.been.called;
        });

        it('should correctly detect no test runner user settings for typescript tests', async () => {
            workspaceConfigurationGetStub.onCall(0).returns(undefined);
            getConfigurationStub = mySandBox.stub(vscode.workspace, 'getConfiguration');
            getConfigurationStub.returns({
                get: workspaceConfigurationGetStub,
                update: workspaceConfigurationUpdateStub
            });
            showLanguageQuickPickStub.resolves('TypeScript');
            mySandBox.stub(fs, 'pathExists').resolves(false);
            mySandBox.stub(fs, 'ensureFile').resolves();

            await vscode.commands.executeCommand('blockchainExplorer.testSmartContractEntry', instantiatedSmartContract);
            workspaceConfigurationUpdateStub.should.have.been.called;
            errorSpy.should.not.have.been.called;
        });

    });

    describe('Generate tests for Fabric Runtime Connection instantiated smart contract', () => {

        beforeEach(async () => {
            mySandBox = sinon.createSandbox();
            errorSpy = mySandBox.spy(vscode.window, 'showErrorMessage');
            reporterStub = mySandBox.stub(Reporter.instance(), 'sendTelemetryEvent');
            fsRemoveStub = mySandBox.stub(fs, 'remove').resolves();
            // ExecuteCommand stub
            executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand');
            executeCommandStub.withArgs('blockchainExplorer.connectEntry').resolves();
            executeCommandStub.callThrough();
            // Runtime Connection stubs
            fakeMetadataFunctions = ['instantiate', 'doubledecking', 'transaction4'];
            fakeRuntimeConnectionDetails = {
                connectionProfile: {
                    channels: {
                        name: 'myChannelTunnel'
                    },
                    name: 'conga@network',
                    version: '0.1.0',
                    peers: ['peerThree']
                },
                certificatePath: 'fakeCertificatePath',
                privateKeyPath: 'fakePrivateKeyPath'
            };
            fabricRuntimeConnectionMock = sinon.createStubInstance(FabricRuntimeConnection);
            fabricRuntimeConnectionMock.connect.resolves();
            fabricRuntimeConnectionMock.instantiateChaincode.resolves();
            fabricRuntimeConnectionMock.getMetadata.resolves(JSON.parse('{"":{"functions":["instantiate","doubledecking","transaction4"]},"org.hyperledger.fabric":{"functions":["getMetaData"]}}'));
            fabricRuntimeConnectionMock.getConnectionDetails.resolves(fakeRuntimeConnectionDetails);
            fabricConnectionManager = FabricConnectionManager.instance();
            getConnectionStub = mySandBox.stub(fabricConnectionManager, 'getConnection').returns(fabricRuntimeConnectionMock);
            fabricRuntimeConnectionMock.getAllPeerNames.returns(['peerThree']);
            fabricRuntimeConnectionMock.getAllChannelsForPeer.withArgs('peerThree').resolves(['myChannelTunnel']);
            fabricRuntimeConnectionMock.getInstantiatedChaincode.resolves([
                {
                    name: 'doubleDecker',
                    version: '0.0.7',
                    label: 'doubleDecker@0.0.7',
                    channel: 'myChannelTunnel'
                }
            ]);

            registryEntry = new FabricConnectionRegistryEntry();
            registryEntry.name = 'myConnection';
            registryEntry.connectionProfilePath = 'myPath';
            registryEntry.managedRuntime = true;
            getRegistryStub = mySandBox.stub(fabricConnectionManager, 'getConnectionRegistryEntry').returns(registryEntry);

            // UserInputUtil stubs
            showInstantiatedSmartContractsQuickPickStub = mySandBox.stub(UserInputUtil, 'showInstantiatedSmartContractsQuickPick').withArgs(sinon.match.any, 'myChannelTunnel').resolves('doubleDecker@0.0.7');
            // Explorer provider stuff
            blockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
            allChildren = await blockchainNetworkExplorerProvider.getChildren();
            channel = allChildren[0] as ChannelTreeItem;
            chaincodes = channel.chaincodes;
            instantiatedSmartContract = chaincodes[0] as InstantiatedChaincodeChildTreeItem;
            smartContractLabel = instantiatedSmartContract.label;
            smartContractName = instantiatedSmartContract.name;
            // Document editor stubs
            testFileDir = path.join(rootPath, '..', 'data', 'smartContractTests');
            mockDocumentStub = {
                lineCount: 8,
                save: (): any => {
                    return Promise.resolve();
                }
            };
            mockDocumentSaveSpy = mySandBox.spy(mockDocumentStub, 'save');
            mockEditBuilder = {
                replace: (): any => {
                    return Promise.resolve();
                }
            };
            mockEditBuilderReplaceSpy = mySandBox.spy(mockEditBuilder, 'replace');
            mockTextEditor = {
                edit: mySandBox.stub()
            };
            mockTextEditor.edit.yields(mockEditBuilder);
            mockTextEditor.edit.resolves(true);
            openTextDocumentStub = mySandBox.stub(vscode.workspace, 'openTextDocument').resolves(mockDocumentStub);
            showTextDocumentStub = mySandBox.stub(vscode.window, 'showTextDocument').resolves(mockTextEditor);
            getDirPathStub = mySandBox.stub(UserInputUtil, 'getDirPath').resolves(testFileDir);
            const packageJSONPath: string = path.join(testFileDir, 'package.json');
            findFilesStub = mySandBox.stub(vscode.workspace, 'findFiles').resolves([vscode.Uri.file(packageJSONPath)]);
            const smartContractNameBuffer: Buffer = Buffer.from(`{"name": "${smartContractName}"}`);
            readFileStub = mySandBox.stub(fs, 'readFile').resolves(smartContractNameBuffer);
            workspaceFoldersStub = mySandBox.stub(UserInputUtil, 'getWorkspaceFolders').resolves([{ name: 'wagonwheeling' }]);
            sendCommandStub = mySandBox.stub(CommandUtil, 'sendCommand').resolves();
            showLanguageQuickPickStub = mySandBox.stub(UserInputUtil, 'showLanguagesQuickPick').resolves('JavaScript');

        });

        it('should generate tests for a runtime connection', async () => {
            mySandBox.stub(fs, 'pathExists').resolves(false);

            await vscode.commands.executeCommand('blockchainExplorer.testSmartContractEntry', instantiatedSmartContract);
            openTextDocumentStub.should.have.been.called;
            showTextDocumentStub.should.have.been.called;
            const templateData: string = mockEditBuilderReplaceSpy.args[0][1];
            templateData.should.not.equal('');
            templateData.includes(smartContractLabel).should.be.true;
            templateData.includes(fakeMetadataFunctions[0]).should.be.true;
            templateData.includes(fakeMetadataFunctions[1]).should.be.true;
            templateData.includes(fakeMetadataFunctions[2]).should.be.true;
            templateData.startsWith('/*').should.be.true;
            templateData.includes('gateway.connect').should.be.true;
            templateData.includes('submitTransaction').should.be.true;
            templateData.includes(testFileDir).should.be.true;
            templateData.includes('connection.json').should.be.true;
            templateData.includes('certificate').should.be.true;
            templateData.includes('privateKey').should.be.true;
            sendCommandStub.should.have.been.calledThrice;
            errorSpy.should.not.have.been.called;
        });

    });

});
