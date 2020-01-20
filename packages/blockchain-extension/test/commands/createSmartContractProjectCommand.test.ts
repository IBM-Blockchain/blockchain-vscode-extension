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
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as tmp from 'tmp';
import * as sinonChai from 'sinon-chai';
import * as fs_extra from 'fs-extra';
import { CommandUtil } from '../../extension/util/CommandUtil';
import { UserInputUtil, LanguageType, LanguageQuickPickItem } from '../../extension/commands/UserInputUtil';
import { TestUtil } from '../TestUtil';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { Reporter } from '../../extension/util/Reporter';
import { LogType } from 'ibm-blockchain-platform-common';
import { ExtensionCommands } from '../../ExtensionCommands';
import { YeomanUtil } from '../../extension/util/YeomanUtil';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';

chai.use(sinonChai);

// Defines a Mocha test suite to group tests of similar kind together
// tslint:disable no-unused-expression
describe('CreateSmartContractProjectCommand', () => {
    // suite variables
    let mySandBox: sinon.SinonSandbox;
    let logSpy: sinon.SinonSpy;
    let quickPickStub: sinon.SinonStub;
    let showLanguagesQuickPickStub: sinon.SinonStub;
    let showFolderOptionsStub: sinon.SinonStub;
    let showYesNoQuickPickStub: sinon.SinonStub;
    let showInputBoxStub: sinon.SinonStub;
    let browseStub: sinon.SinonStub;
    let executeCommandStub: sinon.SinonStub;
    let updateWorkspaceFoldersStub: sinon.SinonStub;
    let uri: vscode.Uri;
    let skipNpmInstallStub: sinon.SinonStub;
    let sendTelemetryEventStub: sinon.SinonStub;

    before(async () => {
        mySandBox = sinon.createSandbox();
        await TestUtil.setupTests(mySandBox);
    });

    beforeEach(async () => {
        mySandBox.stub(CommandUtil, 'sendCommandWithOutputAndProgress');
        logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
        quickPickStub = mySandBox.stub(UserInputUtil, 'showQuickPick');
        showLanguagesQuickPickStub = mySandBox.stub(UserInputUtil, 'showLanguagesQuickPick');
        showFolderOptionsStub = mySandBox.stub(UserInputUtil, 'showFolderOptions');
        showYesNoQuickPickStub = mySandBox.stub(UserInputUtil, 'showQuickPickYesNo');
        showInputBoxStub = mySandBox.stub(vscode.window, 'showInputBox');
        mySandBox.stub(vscode.window, 'showOpenDialog');
        browseStub = mySandBox.stub(UserInputUtil, 'browse');
        const originalExecuteCommand: any = vscode.commands.executeCommand;
        executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand');
        executeCommandStub.callsFake(async function fakeExecuteCommand(command: string): Promise<any> {
            // Don't open or close the folder as this causes lots of windows to popup, the
            // window to reload, random test failures, and duplicate test execution.
            if (command !== 'vscode.openFolder' && command !== 'workbench.action.closeFolder') {
                return originalExecuteCommand.apply(this, arguments);
            }
        });
        updateWorkspaceFoldersStub = mySandBox.stub(vscode.workspace, 'updateWorkspaceFolders');
        // Create a tmp directory for Smart Contracts, and create a Uri of it
        uri = vscode.Uri.file(tmp.dirSync().name);
        skipNpmInstallStub = mySandBox.stub(ExtensionUtil, 'skipNpmInstall');
        skipNpmInstallStub.resolves(true);  // we don't want npm install running during unit tests
        sendTelemetryEventStub = mySandBox.stub(Reporter.instance(), 'sendTelemetryEvent');
    });
    afterEach(() => {
        mySandBox.restore();
    });

    const testLanguageItems: LanguageQuickPickItem[] = [
        { label: 'javascript', type: LanguageType.CONTRACT },
        { label: 'typescript', type: LanguageType.CONTRACT },
        { label: 'java', type: LanguageType.CONTRACT },
        { label: 'go', type: LanguageType.CHAINCODE },
    ];

    for (const testLanguageItem of testLanguageItems) {

        async function checkNodeSmartContract(fileExtension: string): Promise<void> {
            const pathToCheck: string = path.join(uri.fsPath, 'package.json');
            const smartContractExists: boolean = await fs_extra.pathExists(pathToCheck);
            const fileContents: string = await fs_extra.readFile(pathToCheck, 'utf8');
            const packageJSON: any = JSON.parse(fileContents);
            smartContractExists.should.be.true;
            packageJSON.name.should.equal(path.basename(uri.fsPath));
            packageJSON.version.should.equal('0.0.1');
            packageJSON.description.should.equal('My Smart Contract');
            packageJSON.author.should.equal('John Doe');
            packageJSON.license.should.equal('Apache-2.0');
            let contractPath: string;
            if (fileExtension === 'js') {
                contractPath = path.join(uri.fsPath, 'lib', `conga-contract.${fileExtension}`);
            } else if (fileExtension === 'ts') {
                contractPath = path.join(uri.fsPath, 'src', `conga-contract.${fileExtension}`);

            } else {
                throw new Error('Invalid file extension');
            }
            const contractExists: boolean = await fs_extra.pathExists(contractPath);
            contractExists.should.be.true;
        }

        async function checkGoSmartContract(): Promise<void> {
            const pathToCheck: string = path.join(uri.fsPath, 'main.go');
            const smartContractExists: boolean = await fs_extra.pathExists(pathToCheck);
            smartContractExists.should.be.true;
        }

        async function checkJavaSmartContract(): Promise<void> {
            const gradlePath: string = path.join(uri.fsPath, 'build.gradle');
            const gradleExists: boolean = await fs_extra.pathExists(gradlePath);
            gradleExists.should.be.true;
            const contractPath: string = path.join(uri.fsPath, 'src', 'main', 'java', 'org', 'example', 'CongaContract.java');
            const contractExists: boolean = await fs_extra.pathExists(contractPath);
            contractExists.should.be.true;
        }

        async function checkSmartContract(): Promise<void> {
            if (testLanguageItem.label === 'javascript') {
                return checkNodeSmartContract('js');
            }
            if (testLanguageItem.label === 'typescript') {
                return checkNodeSmartContract('ts');
            } else if (testLanguageItem.label === 'go') {
                return checkGoSmartContract();
            } else if (testLanguageItem.label === 'java') {
                return checkJavaSmartContract();
            } else {
                throw new Error(`You must update this test to support the ${testLanguageItem.label} language`);
            }
        }

        it(`should start a ${testLanguageItem.label} smart contract project, in a new window`, async () => {
            quickPickStub.onFirstCall().resolves('Defualt Smart Contract');
            showLanguagesQuickPickStub.resolves(testLanguageItem);
            if (testLanguageItem.type === LanguageType.CONTRACT) {
                showInputBoxStub.onFirstCall().resolves('Conga');
            }
            showFolderOptionsStub.resolves(UserInputUtil.OPEN_IN_NEW_WINDOW);
            browseStub.resolves(uri);

            await vscode.commands.executeCommand(ExtensionCommands.CREATE_SMART_CONTRACT_PROJECT);
            executeCommandStub.should.have.been.calledThrice;
            executeCommandStub.should.have.been.calledWith('workbench.files.action.focusFilesExplorer');
            executeCommandStub.should.have.been.calledWith('vscode.openFolder', uri, true);
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully generated Smart Contract Project');
            await checkSmartContract();
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('createSmartContractProject', { contractLanguage: testLanguageItem.label });
        });

        it(`should start a ${testLanguageItem.label} smart contract project, in current window`, async () => {
            quickPickStub.onFirstCall().resolves('Defualt Smart Contract');
            showLanguagesQuickPickStub.resolves(testLanguageItem);
            if (testLanguageItem.type === LanguageType.CONTRACT) {
                showInputBoxStub.onFirstCall().resolves('Conga');
            }
            showFolderOptionsStub.resolves(UserInputUtil.OPEN_IN_CURRENT_WINDOW);

            browseStub.resolves(uri);
            await vscode.commands.executeCommand(ExtensionCommands.CREATE_SMART_CONTRACT_PROJECT);
            executeCommandStub.should.have.been.calledThrice;
            executeCommandStub.should.have.been.calledWith('workbench.files.action.focusFilesExplorer');
            executeCommandStub.should.have.been.calledWith('vscode.openFolder', uri, false);
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully generated Smart Contract Project');
            await checkSmartContract();
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('createSmartContractProject', { contractLanguage: testLanguageItem.label });
        });

        it(`should start a ${testLanguageItem.label} smart contract project, in current window with unsaved files and save`, async () => {
            quickPickStub.onFirstCall().resolves('Defualt Smart Contract');
            showLanguagesQuickPickStub.resolves(testLanguageItem);
            if (testLanguageItem.type === LanguageType.CONTRACT) {
                showInputBoxStub.onFirstCall().resolves('Conga');
            }
            showFolderOptionsStub.resolves(UserInputUtil.OPEN_IN_CURRENT_WINDOW);
            showYesNoQuickPickStub.resolves(UserInputUtil.YES);

            browseStub.resolves(uri);
            const saveDialogStub: sinon.SinonStub = mySandBox.stub(vscode.workspace, 'saveAll').resolves(true);

            await vscode.workspace.openTextDocument({ language: 'text', content: 'my text file' });

            await vscode.commands.executeCommand(ExtensionCommands.CREATE_SMART_CONTRACT_PROJECT);
            executeCommandStub.should.have.been.calledThrice;
            executeCommandStub.should.have.been.calledWith('workbench.files.action.focusFilesExplorer');
            executeCommandStub.should.have.been.calledWith('vscode.openFolder', uri, false);
            saveDialogStub.should.have.been.calledWith(true);
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully generated Smart Contract Project');
            await checkSmartContract();
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('createSmartContractProject', { contractLanguage: testLanguageItem.label });
        });

        it(`should start a ${testLanguageItem.label} smart contract project, in current window with unsaved files and not save`, async () => {
            quickPickStub.onFirstCall().resolves('Defualt Smart Contract');
            showLanguagesQuickPickStub.resolves(testLanguageItem);
            if (testLanguageItem.type === LanguageType.CONTRACT) {
                showInputBoxStub.onFirstCall().resolves('Conga');
            }
            showFolderOptionsStub.resolves(UserInputUtil.OPEN_IN_CURRENT_WINDOW);
            showYesNoQuickPickStub.resolves(UserInputUtil.NO);

            browseStub.resolves(uri);
            const saveDialogStub: sinon.SinonStub = mySandBox.stub(vscode.workspace, 'saveAll');

            await vscode.workspace.openTextDocument({ language: 'text', content: 'my text file' });

            await vscode.commands.executeCommand(ExtensionCommands.CREATE_SMART_CONTRACT_PROJECT);
            executeCommandStub.should.have.been.calledThrice;
            executeCommandStub.should.have.been.calledWith('workbench.files.action.focusFilesExplorer');
            executeCommandStub.should.have.been.calledWith('vscode.openFolder', uri, false);
            saveDialogStub.should.not.have.been.called;
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully generated Smart Contract Project');
            await checkSmartContract();
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('createSmartContractProject', { contractLanguage: testLanguageItem.label });
        });

        it(`should start a ${testLanguageItem.label} smart contract project, in a new workspace with no folders`, async () => {
            quickPickStub.onFirstCall().resolves('Defualt Smart Contract');
            showLanguagesQuickPickStub.resolves(testLanguageItem);
            if (testLanguageItem.type === LanguageType.CONTRACT) {
                showInputBoxStub.onFirstCall().resolves('Conga');
            }
            showFolderOptionsStub.resolves(UserInputUtil.ADD_TO_WORKSPACE);

            browseStub.resolves(uri);
            mySandBox.stub(vscode.workspace, 'workspaceFolders').value(undefined);

            await vscode.commands.executeCommand(ExtensionCommands.CREATE_SMART_CONTRACT_PROJECT);
            executeCommandStub.should.have.been.calledTwice;
            executeCommandStub.should.have.been.calledWith('workbench.files.action.focusFilesExplorer');
            updateWorkspaceFoldersStub.should.have.been.calledWith(sinon.match.number, 0, { uri: uri });
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully generated Smart Contract Project');
            await checkSmartContract();
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('createSmartContractProject', { contractLanguage: testLanguageItem.label });
        });

        it(`should start a ${testLanguageItem.label} smart contract project, in a new workspace with folders`, async () => {
            quickPickStub.onFirstCall().resolves('Defualt Smart Contract');
            showLanguagesQuickPickStub.resolves(testLanguageItem);
            if (testLanguageItem.type === LanguageType.CONTRACT) {
                showInputBoxStub.onFirstCall().resolves('Conga');
            }
            showFolderOptionsStub.resolves(UserInputUtil.ADD_TO_WORKSPACE);

            browseStub.resolves(uri);
            await vscode.commands.executeCommand(ExtensionCommands.CREATE_SMART_CONTRACT_PROJECT);
            executeCommandStub.should.have.been.calledTwice;
            executeCommandStub.should.have.been.calledWith('workbench.files.action.focusFilesExplorer');
            updateWorkspaceFoldersStub.should.have.been.calledWith(sinon.match.number, 0, { uri: uri });
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully generated Smart Contract Project');
            await checkSmartContract();
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('createSmartContractProject', { contractLanguage: testLanguageItem.label });
        });

    }

    it('should start a typescript private data smart contract project, in a new window', async () => {
        quickPickStub.onFirstCall().resolves('Private Data Smart Contract');
        showLanguagesQuickPickStub.resolves({ label: 'TypeScript', type: LanguageType.CONTRACT });
        showInputBoxStub.onFirstCall().resolves('Conga');
        showFolderOptionsStub.resolves(UserInputUtil.OPEN_IN_NEW_WINDOW);
        browseStub.resolves(uri);

        await vscode.commands.executeCommand(ExtensionCommands.CREATE_SMART_CONTRACT_PROJECT);
        executeCommandStub.should.have.been.calledThrice;
        executeCommandStub.should.have.been.calledWith('workbench.files.action.focusFilesExplorer');
        executeCommandStub.should.have.been.calledWith('vscode.openFolder', uri, true);
        logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully generated Private Data Smart Contract Project');
        sendTelemetryEventStub.should.have.been.calledOnceWithExactly('createPrivateDataSmartContractProject', { contractLanguage: 'typescript' });
    });

    it('should not do anything if the user cancels the type of smart contract', async () => {
        quickPickStub.onFirstCall().resolves(undefined);
        await vscode.commands.executeCommand(ExtensionCommands.CREATE_SMART_CONTRACT_PROJECT);
        browseStub.should.not.have.been.called;
        showLanguagesQuickPickStub.should.not.have.been.called;
        showInputBoxStub.should.not.have.been.called;
        sendTelemetryEventStub.should.not.have.been.called;
    });

    it('should show error message if we fail to create a smart contract', async () => {
        quickPickStub.onFirstCall().resolves('Defualt Smart Contract');
        mySandBox.stub(YeomanUtil, 'run').rejects(new Error('such error'));
        showLanguagesQuickPickStub.resolves({ label: 'JavaScript', type: LanguageType.CONTRACT });
        showInputBoxStub.onFirstCall().resolves('Conga');
        showFolderOptionsStub.resolves(UserInputUtil.OPEN_IN_NEW_WINDOW);

        browseStub.resolves(uri);
        await vscode.commands.executeCommand(ExtensionCommands.CREATE_SMART_CONTRACT_PROJECT);
        logSpy.should.have.been.calledWith(LogType.ERROR, 'Issue creating Smart Contract Project: such error');
        sendTelemetryEventStub.should.not.have.been.called;
    });

    it('should not do anything if the user cancels the open dialog', async () => {
        quickPickStub.onFirstCall().resolves('Defualt Smart Contract');
        showLanguagesQuickPickStub.resolves({ label: 'JavaScript', type: LanguageType.CONTRACT });
        showInputBoxStub.onFirstCall().resolves('Conga');

        browseStub.resolves();
        await vscode.commands.executeCommand(ExtensionCommands.CREATE_SMART_CONTRACT_PROJECT);
        browseStub.should.have.been.calledOnce;
        executeCommandStub.should.have.been.calledOnce;
        executeCommandStub.should.have.not.been.calledWith('vscode.openFolder');
    });

    it('should throw an error if the chosen folder has an invalid name', async () => {
        quickPickStub.onFirstCall().resolves('Defualt Smart Contract');
        showLanguagesQuickPickStub.resolves({ label: 'JavaScript', type: LanguageType.CONTRACT });
        showInputBoxStub.onFirstCall().resolves('Conga');
        const badUri: vscode.Uri = vscode.Uri.file(' Invalid Directory! ');
        browseStub.resolves(badUri);
        await vscode.commands.executeCommand(ExtensionCommands.CREATE_SMART_CONTRACT_PROJECT);
        browseStub.should.have.been.calledOnce;
        executeCommandStub.should.have.been.calledOnce;
        executeCommandStub.should.have.not.been.calledWith('vscode.openFolder');
        logSpy.should.have.been.calledWith(LogType.ERROR, `Please choose a folder which only includes alphanumeric, "_" and "-" characters.`);
    });

    it('should not do anything if the user cancels the open project ', async () => {
        quickPickStub.onFirstCall().resolves('Defualt Smart Contract');
        showLanguagesQuickPickStub.resolves({ label: 'JavaScript', type: LanguageType.CONTRACT });
        showInputBoxStub.onFirstCall().resolves('Conga');
        showFolderOptionsStub.resolves();
        browseStub.resolves(uri);
        await vscode.commands.executeCommand(ExtensionCommands.CREATE_SMART_CONTRACT_PROJECT);
        browseStub.should.have.been.calledOnce;
        executeCommandStub.should.have.been.calledOnce;
        executeCommandStub.should.have.not.been.calledWith('vscode.openFolder');
    });

    it('should not do anything if the user cancels chosing a smart contract language', async () => {
        quickPickStub.onFirstCall().resolves('Defualt Smart Contract');
        showLanguagesQuickPickStub.resolves(undefined);
        await vscode.commands.executeCommand(ExtensionCommands.CREATE_SMART_CONTRACT_PROJECT);
        showLanguagesQuickPickStub.should.have.been.calledOnce;
        quickPickStub.should.have.been.calledOnce;
        showInputBoxStub.should.not.have.been.called;
        browseStub.should.not.have.been.called;
    });

    it('should not do anything if the user cancels specifying an asset type', async () => {
        quickPickStub.onFirstCall().resolves('Defualt Smart Contract');
        showLanguagesQuickPickStub.resolves({ label: 'JavaScript', type: LanguageType.CONTRACT });
        showInputBoxStub.onCall(0).resolves(undefined);
        await vscode.commands.executeCommand(ExtensionCommands.CREATE_SMART_CONTRACT_PROJECT);
        showInputBoxStub.should.have.been.calledOnce;
        quickPickStub.should.have.been.calledOnce;
        browseStub.should.not.have.been.called;
    });

    it('should throw an error if the user specifies an invalid asset type', async () => {
        quickPickStub.onFirstCall().resolves('Defualt Smart Contract');
        showLanguagesQuickPickStub.resolves({ label: 'JavaScript', type: LanguageType.CONTRACT });
        showInputBoxStub.onCall(0).resolves('@xyz/myAsset');
        await vscode.commands.executeCommand(ExtensionCommands.CREATE_SMART_CONTRACT_PROJECT);
        quickPickStub.should.have.been.calledOnce;
        browseStub.should.not.have.been.called;
        logSpy.should.have.been.calledWith(LogType.ERROR, 'Invalid asset name, it should only contain lowercase and uppercase letters.');
    });

}); // end of createFabricCommand tests
