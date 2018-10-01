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
import * as fs from 'fs-extra';

chai.use(sinonChai);
import * as fs_extra from 'fs-extra';
import * as child_process from 'child_process';
import { CommandUtil } from '../../src/util/CommandUtil';
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import { TestUtil } from '../TestUtil';
import { VSCodeOutputAdapter } from '../../src/logging/VSCodeOutputAdapter';
import { Reporter } from '../../src/util/Reporter';
import { ExtensionUtil } from '../../src/util/ExtensionUtil';
import * as yeoman from 'yeoman-environment';
import * as util from 'util';

// Defines a Mocha test suite to group tests of similar kind together
// tslint:disable no-unused-expression
describe('CreateSmartContractProjectCommand', () => {
    // suite variables
    let mySandBox: sinon.SinonSandbox;
    let sendCommandStub: sinon.SinonStub;
    let errorSpy: sinon.SinonSpy;
    let quickPickStub: sinon.SinonStub;
    let openDialogStub: sinon.SinonStub;
    let executeCommandStub: sinon.SinonStub;
    let uri: vscode.Uri;
    let uriArr: Array<vscode.Uri>;
    const USER_TEST_DATA = path.join(path.dirname(__dirname), '../../test/data');

    before(async () => {
        await TestUtil.setupTests();
    });

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
        sendCommandStub = mySandBox.stub(CommandUtil, 'sendCommand');
        errorSpy = mySandBox.spy(vscode.window, 'showErrorMessage');
        quickPickStub = mySandBox.stub(vscode.window, 'showQuickPick');
        openDialogStub = mySandBox.stub(vscode.window, 'showOpenDialog');
        const originalExecuteCommand = vscode.commands.executeCommand;
        executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand');
        executeCommandStub.callsFake(async function fakeExecuteCommand(command: string) {
            // Don't open the folder as this causes lots of windows to pop up, and random
            // test failures.
            if (command !== 'vscode.openFolder') {
                return originalExecuteCommand.apply(this, arguments);
            }
        });
        // Create a tmp directory for Smart Contract packages, and create a Uri of it
        uri = vscode.Uri.file(tmp.dirSync().name);
        uriArr = [uri];
    });
    afterEach(() => {
        mySandBox.restore();
    });

    // Define assertion
    it('should start a typescript smart contract project, in a new window', async () => {
        // We actually want to execute the command!
        sendCommandStub.restore();

        quickPickStub.onFirstCall().resolves('TypeScript');
        quickPickStub.onSecondCall().resolves(UserInputUtil.OPEN_IN_NEW_WINDOW);
        openDialogStub.resolves(uriArr);

        await vscode.commands.executeCommand('blockchain.createSmartContractProjectEntry');
        const pathToCheck = path.join(uri.fsPath, 'package.json');
        const smartContractExists = await fs_extra.pathExists(pathToCheck);
        const fileContents = await fs_extra.readFile(pathToCheck, 'utf8');
        const packageJSON = JSON.parse(fileContents);
        smartContractExists.should.be.true;
        executeCommandStub.should.have.been.calledTwice;
        executeCommandStub.should.have.been.calledWith('vscode.openFolder', uriArr[0], true);
        errorSpy.should.not.have.been.called;
        packageJSON.name.should.equal(path.basename(uri.fsPath));
        packageJSON.version.should.equal('0.0.1');
        packageJSON.description.should.equal('My Smart Contract');
        packageJSON.author.should.equal('John Doe');
        packageJSON.license.should.equal('Apache-2.0');
    }).timeout(40000);

    it('should start a typescript smart contract project, in current window', async () => {
        // We actually want to execute the command!
        sendCommandStub.restore();

        quickPickStub.onFirstCall().resolves('TypeScript');
        quickPickStub.onSecondCall().resolves(UserInputUtil.OPEN_IN_CURRENT_WINDOW);
        openDialogStub.resolves(uriArr);

        await vscode.commands.executeCommand('blockchain.createSmartContractProjectEntry');
        const pathToCheck = path.join(uri.fsPath, 'package.json');
        const smartContractExists = await fs_extra.pathExists(pathToCheck);
        const fileContents = await fs_extra.readFile(pathToCheck, 'utf8');
        const packageJSON = JSON.parse(fileContents);
        smartContractExists.should.be.true;
        executeCommandStub.should.have.been.calledTwice;
        executeCommandStub.should.have.been.calledWith('vscode.openFolder', uriArr[0], false);
        errorSpy.should.not.have.been.called;
        packageJSON.name.should.equal(path.basename(uri.fsPath));
        packageJSON.version.should.equal('0.0.1');
        packageJSON.description.should.equal('My Smart Contract');
        packageJSON.author.should.equal('John Doe');
        packageJSON.license.should.equal('Apache-2.0');
    }).timeout(40000);

    it('should start a typescript smart contract project, in current window with unsaved files and save', async () => {
        // We actually want to execute the command!
        sendCommandStub.restore();

        quickPickStub.onFirstCall().resolves('TypeScript');
        quickPickStub.onSecondCall().resolves(UserInputUtil.OPEN_IN_CURRENT_WINDOW);
        quickPickStub.onThirdCall().resolves(UserInputUtil.YES);
        openDialogStub.resolves(uriArr);

        const saveDialogStub = mySandBox.stub(vscode.workspace, 'saveAll').resolves(true);

        await vscode.workspace.openTextDocument({language: 'text', content: 'my text file'});

        await vscode.commands.executeCommand('blockchain.createSmartContractProjectEntry');
        const pathToCheck = path.join(uri.fsPath, 'package.json');
        const smartContractExists = await fs_extra.pathExists(pathToCheck);
        const fileContents = await fs_extra.readFile(pathToCheck, 'utf8');
        const packageJSON = JSON.parse(fileContents);
        smartContractExists.should.be.true;
        executeCommandStub.should.have.been.calledTwice;
        executeCommandStub.should.have.been.calledWith('vscode.openFolder', uriArr[0], false);
        saveDialogStub.should.have.been.calledWith(true);
        errorSpy.should.not.have.been.called;
        packageJSON.name.should.equal(path.basename(uri.fsPath));
        packageJSON.version.should.equal('0.0.1');
        packageJSON.description.should.equal('My Smart Contract');
        packageJSON.author.should.equal('John Doe');
        packageJSON.license.should.equal('Apache-2.0');
    }).timeout(40000);

    it('should start a typescript smart contract project, in current window with unsaved files and not save', async () => {
        // We actually want to execute the command!
        sendCommandStub.restore();

        quickPickStub.onFirstCall().resolves('TypeScript');
        quickPickStub.onSecondCall().resolves(UserInputUtil.OPEN_IN_CURRENT_WINDOW);
        quickPickStub.onThirdCall().resolves(UserInputUtil.NO);
        openDialogStub.resolves(uriArr);

        const saveDialogStub = mySandBox.stub(vscode.workspace, 'saveAll');

        await vscode.workspace.openTextDocument({language: 'text', content: 'my text file'});

        await vscode.commands.executeCommand('blockchain.createSmartContractProjectEntry');
        const pathToCheck = path.join(uri.fsPath, 'package.json');
        const smartContractExists = await fs_extra.pathExists(pathToCheck);
        const fileContents = await fs_extra.readFile(pathToCheck, 'utf8');
        const packageJSON = JSON.parse(fileContents);
        smartContractExists.should.be.true;
        executeCommandStub.should.have.been.calledTwice;
        executeCommandStub.should.have.been.calledWith('vscode.openFolder', uriArr[0], false);
        saveDialogStub.should.not.have.been.called;
        errorSpy.should.not.have.been.called;
        packageJSON.name.should.equal(path.basename(uri.fsPath));
        packageJSON.version.should.equal('0.0.1');
        packageJSON.description.should.equal('My Smart Contract');
        packageJSON.author.should.equal('John Doe');
        packageJSON.license.should.equal('Apache-2.0');
    }).timeout(40000);

    it('should start a typescript smart contract project, in a new workspace with no folders', async () => {
        // We actually want to execute the command!
        sendCommandStub.restore();

        // executeCommandStub.restore();

        const updateWorkspaceSpy = mySandBox.stub(vscode.workspace, 'updateWorkspaceFolders');

        quickPickStub.onFirstCall().resolves('TypeScript');
        quickPickStub.onSecondCall().resolves(UserInputUtil.ADD_TO_WORKSPACE);
        openDialogStub.resolves(uriArr);

        await vscode.commands.executeCommand('workbench.action.closeFolder');

        await vscode.commands.executeCommand('blockchain.createSmartContractProjectEntry');
        const pathToCheck = path.join(uri.fsPath, 'package.json');
        const smartContractExists = await fs_extra.pathExists(pathToCheck);
        const fileContents = await fs_extra.readFile(pathToCheck, 'utf8');
        const packageJSON = JSON.parse(fileContents);
        smartContractExists.should.be.true;
        executeCommandStub.should.have.been.calledTwice;
        updateWorkspaceSpy.should.have.been.calledWith(sinon.match.number, 0, {uri: uriArr[0]});
        errorSpy.should.not.have.been.called;
        packageJSON.name.should.equal(path.basename(uri.fsPath));
        packageJSON.version.should.equal('0.0.1');
        packageJSON.description.should.equal('My Smart Contract');
        packageJSON.author.should.equal('John Doe');
        packageJSON.license.should.equal('Apache-2.0');
    }).timeout(40000);

    it('should start a typescript smart contract project, in a new workspace with folders', async () => {
        // We actually want to execute the command!
        sendCommandStub.restore();

        const updateWorkspaceSpy = mySandBox.stub(vscode.workspace, 'updateWorkspaceFolders');

        quickPickStub.onFirstCall().resolves('TypeScript');
        quickPickStub.onSecondCall().resolves(UserInputUtil.ADD_TO_WORKSPACE);
        openDialogStub.resolves(uriArr);

        await vscode.commands.executeCommand('blockchain.createSmartContractProjectEntry');
        const pathToCheck = path.join(uri.fsPath, 'package.json');
        const smartContractExists = await fs_extra.pathExists(pathToCheck);
        const fileContents = await fs_extra.readFile(pathToCheck, 'utf8');
        const packageJSON = JSON.parse(fileContents);
        smartContractExists.should.be.true;
        executeCommandStub.should.have.been.calledOnce;
        updateWorkspaceSpy.should.have.been.calledWith(sinon.match.number, 0, {uri: uriArr[0]});
        errorSpy.should.not.have.been.called;
        packageJSON.name.should.equal(path.basename(uri.fsPath));
        packageJSON.version.should.equal('0.0.1');
        packageJSON.description.should.equal('My Smart Contract');
        packageJSON.author.should.equal('John Doe');
        packageJSON.license.should.equal('Apache-2.0');
    }).timeout(40000);

    it('should show error if npm is not installed', async () => {
        // npm not installed
        sendCommandStub.onCall(0).rejects();
        await vscode.commands.executeCommand('blockchain.createSmartContractProjectEntry');
        errorSpy.should.have.been.calledWith('npm is required before creating a smart contract project');
    }).timeout(20000);

    it('should show error is yo is not installed and not wanted', async () => {
        // yo not installed and not wanted
        sendCommandStub.onCall(0).rejects({message: 'npm ERR'});
        quickPickStub.resolves(UserInputUtil.NO);
        await vscode.commands.executeCommand('blockchain.createSmartContractProjectEntry');
        errorSpy.should.have.been.calledWith('npm modules: yo and generator-fabric are required before creating a smart contract project');
    }).timeout(20000);

    it('should show error message if generator-fabric fails to install', async () => {
        // generator-fabric not installed and wanted but fails to install
        sendCommandStub.onCall(0).resolves();
        sendCommandStub.onCall(1).rejects();
        quickPickStub.resolves(UserInputUtil.YES);
        sendCommandStub.onCall(2).rejects();
        await vscode.commands.executeCommand('blockchain.createSmartContractProjectEntry');
        errorSpy.should.have.been.calledWith('Issue installing generator-fabric module');
    }).timeout(20000);

    it('should install latest version of generator-fabric', async () => {
        sendCommandStub.withArgs('npm config get prefix').resolves(USER_TEST_DATA);
        sendCommandStub.onCall(0).resolves();
        sendCommandStub.onCall(1).resolves('0.0.8'); // latest version available from 'npm view'
        sendCommandStub.onCall(2).resolves(USER_TEST_DATA); // npm prefix path
        const sendCommandWithProgressSpy = mySandBox.spy(CommandUtil, 'sendCommandWithProgress');

        await vscode.commands.executeCommand('blockchain.createSmartContractProjectEntry');

        sendCommandWithProgressSpy.should.have.been.calledWith('npm install -g generator-fabric@' + '0.0.8', '', 'Updating generator-fabric...');

    });

    it('should continue if latest version of generator-fabric is installed', async () => {
        sendCommandStub.onCall(0).resolves();

        sendCommandStub.onCall(1).resolves('0.0.7');
        sendCommandStub.onCall(2).resolves(USER_TEST_DATA);

        const outputAdapterSpy = mySandBox.spy(VSCodeOutputAdapter.instance(), 'log');

        await vscode.commands.executeCommand('blockchain.createSmartContractProjectEntry');

        outputAdapterSpy.should.not.have.been.calledWith('Successfully updated to latest version of generator-fabric');
    });

    it('should show error message if yo fails to install', async () => {
        // yo not installed and wanted but fails to install
        sendCommandStub.onCall(0).rejects({message: 'npm ERR'});
        quickPickStub.resolves(UserInputUtil.YES);
        sendCommandStub.onCall(1).rejects();
        await vscode.commands.executeCommand('blockchain.createSmartContractProjectEntry');
        errorSpy.should.have.been.calledWith('Issue installing yo node module');
    }).timeout(20000);

    it('should show error message if we fail to create a smart contract', async () => {
        // generator-fabric and yo not installed and wanted
        sendCommandStub.withArgs('npm config get prefix').resolves(USER_TEST_DATA);
        sendCommandStub.onCall(0).rejects({message: 'npm ERR'});
        quickPickStub.onCall(0).resolves('yes');
        // npm install works
        sendCommandStub.onCall(1).resolves(USER_TEST_DATA);
        const promisifyStub = mySandBox.stub(util, 'promisify').onCall(0).returns(mySandBox.stub().resolves());
        promisifyStub.onCall(1).returns(mySandBox.stub().rejects());
        quickPickStub.onCall(1).returns('JavaScript');
        quickPickStub.onCall(2).resolves(UserInputUtil.OPEN_IN_NEW_WINDOW);
        openDialogStub.resolves(uriArr);
        await vscode.commands.executeCommand('blockchain.createSmartContractProjectEntry');
        errorSpy.should.have.been.calledWith('Issue creating smart contract project');
    }).timeout(20000);

    it('should not do anything if the user cancels the open dialog', async () => {
        // We actually want to execute the command!
        sendCommandStub.restore();

        quickPickStub.onCall(0).resolves('JavaScript');

        openDialogStub.resolves();
        await vscode.commands.executeCommand('blockchain.createSmartContractProjectEntry');
        openDialogStub.should.have.been.calledOnce;
        executeCommandStub.should.have.been.calledOnce;
        executeCommandStub.should.have.not.been.calledWith('vscode.openFolder');
        errorSpy.should.not.have.been.called;
    }).timeout(20000);

    it('should not do anything if the user cancels the open project ', async () => {
        // We actually want to execute the command!
        sendCommandStub.restore();

        quickPickStub.onCall(0).resolves('JavaScript');
        quickPickStub.onCall(1).resolves();
        sendCommandStub.onCall(0).resolves();

        sendCommandStub.onCall(1).resolves('0.0.7');
        sendCommandStub.onCall(2).resolves(USER_TEST_DATA);

        quickPickStub.onCall(0).returns('JavaScript');

        openDialogStub.resolves(uriArr);
        await vscode.commands.executeCommand('blockchain.createSmartContractProjectEntry');
        openDialogStub.should.have.been.calledOnce;
        executeCommandStub.should.have.been.calledOnce;
        executeCommandStub.should.have.not.been.calledWith('vscode.openFolder');
        errorSpy.should.not.have.been.called;
    }).timeout(20000);

    // Go not currently supported as a smart contract language (targetted at Fabric v1.4).
    it.skip('should create a go smart contract project when the user selects go as the language', async () => {
        sendCommandStub.restore();

        const originalSpawn = child_process.spawn;
        const spawnStub: sinon.SinonStub = mySandBox.stub(child_process, 'spawn');
        spawnStub.withArgs('/bin/sh', ['-c', 'yo fabric:contract < /dev/null']).callsFake(() => {
            return originalSpawn('/bin/sh', ['-c', 'echo blah && echo "  Go" && echo "  JavaScript" && echo "  TypeScript  [45R"']);
        });
        quickPickStub.onCall(0).resolves('Go');
        openDialogStub.resolves(uriArr);

        await vscode.commands.executeCommand('blockchain.createSmartContractProjectEntry');
        const pathToCheck = path.join(uri.fsPath, 'main.go');
        const smartContractExists = await fs_extra.pathExists(pathToCheck);
        smartContractExists.should.be.true;
        spawnStub.should.have.been.calledWith('/bin/sh', ['-c', 'yo fabric:contract < /dev/null']);
        executeCommandStub.should.have.been.calledTwice;
        executeCommandStub.should.have.been.calledWith('vscode.openFolder', uriArr[0], true);
        errorSpy.should.not.have.been.called;
    }).timeout(20000);

    it('should not do anything if the user cancels chosing a smart contract language', async () => {
        sendCommandStub.restore();
        quickPickStub.resolves(undefined);
        await vscode.commands.executeCommand('blockchain.createSmartContractProjectEntry');
        quickPickStub.should.have.been.calledOnce;
        errorSpy.should.not.have.been.called;
        openDialogStub.should.not.have.been.called;
    }).timeout(20000);

    it('should show an error if generator-fabric package.json does not exist', async () => {
        sendCommandStub.onCall(0).resolves();

        sendCommandStub.onCall(1).resolves('0.0.7');
        const wrongPath = path.join(path.dirname(__dirname), '../../test/data/nonexistent');
        sendCommandStub.onCall(2).resolves(wrongPath);

        await vscode.commands.executeCommand('blockchain.createSmartContractProjectEntry');
        errorSpy.should.have.been.calledWith('npm modules: yo and generator-fabric are required before creating a smart contract project');
    });

    it('should show an error if contract languages doesnt exist in generator-fabric package.json', async () => {
        sendCommandStub.withArgs('npm config get prefix').resolves(USER_TEST_DATA);

        mySandBox.stub(fs, 'readJson').resolves({name: 'generator-fabric', version: '0.0.7'});
        sendCommandStub.onCall(0).resolves();

        sendCommandStub.onCall(1).resolves('0.0.7');

        sendCommandStub.onCall(2).resolves(USER_TEST_DATA);

        await vscode.commands.executeCommand('blockchain.createSmartContractProjectEntry');
        const error = 'Contract languages not found in package.json';
        errorSpy.should.have.been.calledWith('Issue determining available smart contract language options:', error);
    });

    it('should send a telemetry event if the extension is for production', async () => {
        mySandBox.stub(ExtensionUtil, 'getPackageJSON').returns({production: true});
        const reporterSpy = mySandBox.spy(Reporter.instance(), 'sendTelemetryEvent');

        sendCommandStub.restore();

        quickPickStub.onFirstCall().resolves('TypeScript');
        quickPickStub.onSecondCall().resolves(UserInputUtil.OPEN_IN_NEW_WINDOW);
        openDialogStub.resolves(uriArr);
        await vscode.commands.executeCommand('blockchain.createSmartContractProjectEntry');
        reporterSpy.should.have.been.calledWith('createSmartContractProject', {contractLanguage: 'typescript'});
    }).timeout(40000);

}); // end of createFabricCommand tests
