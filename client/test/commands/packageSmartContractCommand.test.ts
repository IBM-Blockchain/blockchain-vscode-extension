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
import { TestUtil } from '../TestUtil';
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import { Package } from 'fabric-client';

chai.should();
chai.use(sinonChai);
// tslint:disable no-unused-expression
describe('packageSmartContract', () => {

    const rootPath: string = path.dirname(__dirname);
    const extDir: string = path.join(rootPath, '../../test/data');
    const fileDest: string = path.join(extDir, 'packages');
    const testWorkspace: string = path.join(rootPath, '..', '..', 'test', 'data', 'testWorkspace');
    const javascriptPath: string = path.join(testWorkspace, 'javascriptProject');
    const typescriptPath: string = path.join(testWorkspace, 'typescriptProject');
    const golangPath: string = path.join(testWorkspace, 'src', 'goProject');
    const javaPath: string = path.join(testWorkspace, 'javaProject');
    const emptyContent: string = '{}';

    const folders: Array<any> = [];

    async function createTestFiles(packageName: string, version: string, language: string, createValid: boolean): Promise<void> {
        let projectDir: string;
        if (language === 'golang') {
            projectDir = path.join(testWorkspace, 'src', packageName);
        } else {
            projectDir = path.join(testWorkspace, packageName);
        }

        try {
            await fs.mkdirp(projectDir);
        } catch (error) {
            console.log(error);
        }

        if (createValid) {
            if (language === 'javascript' || language === 'typescript') {
                const packageJsonFile: string = path.join(projectDir, 'package.json');
                const jsChaincode: string = path.join(projectDir, 'chaincode.js');
                const jsonContent: any = {
                    name: `${packageName}`,
                    version: version,
                    description: 'My Smart Contract',
                    author: 'John Doe',
                    license: 'Apache-2.0'
                };
                if (language === 'typescript') {
                    const textFile: string = path.join(projectDir, 'chaincode.ts');
                    await fs.writeFile(textFile, emptyContent);
                }
                await fs.writeFile(jsChaincode, emptyContent);
                await fs.writeFile(packageJsonFile, JSON.stringify(jsonContent));
            } else if (language === 'golang') {
                const goChaincode: string = path.join(projectDir, 'chaincode.go');
                await fs.writeFile(goChaincode, emptyContent);
            } else if (language === 'java') {
                const goChaincode: string = path.join(projectDir, 'chaincode.java');
                await fs.writeFile(goChaincode, emptyContent);
            } else {
                throw new Error(`unrecognised language ${language}, y u no update tests?`);
            }
        } else {
            const textFile: string = projectDir + '/text.txt';
            const content: string = 'hello';
            await fs.writeFile(textFile, content);
        }
    }

    before(async () => {
        await TestUtil.setupTests();
        await TestUtil.storeExtensionDirectoryConfig();
        await fs.mkdirp(fileDest);
    });

    after(async () => {
        await TestUtil.restoreExtensionDirectoryConfig();
    });

    let mySandBox: sinon.SinonSandbox;
    let errorSpy: sinon.SinonSpy;
    let informationSpy: sinon.SinonSpy;
    let showInputStub: sinon.SinonStub;
    let workspaceFoldersStub: sinon.SinonStub;
    let showWorkspaceQuickPickStub: sinon.SinonStub;
    let findFilesStub: sinon.SinonStub;
    let buildTasks: vscode.Task[];
    let executeTaskStub: sinon.SinonStub;

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();

        await TestUtil.deleteTestFiles(fileDest);
        await TestUtil.deleteTestFiles(testWorkspace);

        folders.push(...[
            {name: 'javascriptProject', uri: vscode.Uri.file(javascriptPath)},
            {name: 'typescriptProject', uri: vscode.Uri.file(typescriptPath)},
            {name: 'goProject', uri: vscode.Uri.file(golangPath)},
            {name: 'javaProject', uri: vscode.Uri.file(javaPath)}
        ]);

        errorSpy = mySandBox.spy(vscode.window, 'showErrorMessage');
        showInputStub = mySandBox.stub(UserInputUtil, 'showInputBox');
        showWorkspaceQuickPickStub = mySandBox.stub(UserInputUtil, 'showWorkspaceQuickPickBox');
        workspaceFoldersStub = mySandBox.stub(UserInputUtil, 'getWorkspaceFolders');
        informationSpy = mySandBox.spy(vscode.window, 'showInformationMessage');
        await vscode.workspace.getConfiguration().update('blockchain.ext.directory', extDir, true);

        findFilesStub = mySandBox.stub(vscode.workspace, 'findFiles').resolves([]);

        process.env.GOPATH = testWorkspace;

        // Create a bunch of tasks that should never get executed.
        const unscopedTask: vscode.Task = new vscode.Task({ type: 'npm' }, 'unscopedTask', 'npm');
        const globalTask: vscode.Task = new vscode.Task({ type: 'npm' }, vscode.TaskScope.Global, 'globalTask', 'npm');
        const workspaceTask: vscode.Task = new vscode.Task({ type: 'npm' }, vscode.TaskScope.Workspace, 'workspaceTask', 'npm');
        const differentUriTask: vscode.Task = new vscode.Task({ type: 'npm' }, { index: 0, name: 'randomProject', uri: vscode.Uri.file('/randomProject') }, 'workspaceTask', 'npm');
        const testTasks: vscode.Task[] = [
            new vscode.Task({ type: 'npm' }, { index: 0, name: 'javascriptProject', uri: vscode.Uri.file(javascriptPath) }, 'javascriptProject test task', 'npm'),
            new vscode.Task({ type: 'npm' }, { index: 0, name: 'typescriptProject', uri: vscode.Uri.file(typescriptPath) }, 'typescriptProject test task', 'npm'),
            new vscode.Task({ type: 'npm' }, { index: 0, name: 'goProject', uri: vscode.Uri.file(golangPath) }, 'goProject test task', 'npm'),
            new vscode.Task({ type: 'npm' }, { index: 0, name: 'javaProject', uri: vscode.Uri.file(javaPath) }, 'javaProject test task', 'npm')
        ].map((task: vscode.Task) => {
            task.group = vscode.TaskGroup.Test;
            return task;
        });
        const backgroundTasks: vscode.Task[] = [
            new vscode.Task({ type: 'npm' }, { index: 0, name: 'javascriptProject', uri: vscode.Uri.file(javascriptPath) }, 'javascriptProject build task', 'npm'),
            new vscode.Task({ type: 'npm' }, { index: 0, name: 'typescriptProject', uri: vscode.Uri.file(typescriptPath) }, 'typescriptProject build task', 'npm'),
            new vscode.Task({ type: 'npm' }, { index: 0, name: 'goProject', uri: vscode.Uri.file(golangPath) }, 'goProject build task', 'npm'),
            new vscode.Task({ type: 'npm' }, { index: 0, name: 'javaProject', uri: vscode.Uri.file(javaPath) }, 'javaProject build task', 'npm')
        ].map((task: vscode.Task) => {
            task.group = vscode.TaskGroup.Build;
            task.isBackground = true;
            return task;
        });

        // These are the tasks we do want to execute.
        buildTasks = [
            undefined, // no build task for javascript
            new vscode.Task({ type: 'npm' }, { index: 0, name: 'typescriptProject', uri: vscode.Uri.file(typescriptPath) }, 'typescriptProject build task', 'npm'),
            new vscode.Task({ type: 'npm' }, { index: 0, name: 'goProject', uri: vscode.Uri.file(golangPath) }, 'goProject build task', 'npm'),
            new vscode.Task({ type: 'npm' }, { index: 0, name: 'javaProject', uri: vscode.Uri.file(javaPath) }, 'javaProject build task', 'npm'),
        ].map((task: vscode.Task) => {
            if (!task) {
                return task;
            }
            task.group = vscode.TaskGroup.Build;
            return task;
        });

        // Stub the list of tasks VSCode knows about.
        mySandBox.stub(vscode.tasks, 'fetchTasks').resolves(
            [ unscopedTask, globalTask, workspaceTask, differentUriTask ]
                .concat(testTasks, backgroundTasks, buildTasks)
                .filter((task: vscode.Task) => !!task)
        );

        // Fake executeTask so that it emits the right event.
        const onDidEndTaskEventEmitter: vscode.EventEmitter<vscode.TaskEndEvent> = new vscode.EventEmitter<vscode.TaskEndEvent>();
        const onDidEndTaskEvent: vscode.Event<vscode.TaskEndEvent> = onDidEndTaskEventEmitter.event;
        mySandBox.stub(vscode.tasks, 'onDidEndTask').value(onDidEndTaskEvent);
        executeTaskStub = mySandBox.stub(vscode.tasks, 'executeTask').callsFake(async (task: vscode.Task) => {
            const terminate: sinon.SinonStub = sinon.stub();
            const testExecution: vscode.TaskExecution = { terminate, task: testTasks[0] };
            const buildExecution: vscode.TaskExecution = { terminate, task };
            setTimeout(() => {
                // Always fire another task completion that isn't the one we're looking for.
                onDidEndTaskEventEmitter.fire({ execution: testExecution });
                onDidEndTaskEventEmitter.fire({ execution: buildExecution });
            }, 1);
            return buildExecution;
        });

    });

    afterEach(async () => {
        delete process.env.GOPATH;

        await TestUtil.deleteTestFiles(fileDest);
        await TestUtil.deleteTestFiles(testWorkspace);
        mySandBox.restore();
    });

    describe('#packageSmartContract', () => {

        it('should package the JavaScript project', async () => {
            await createTestFiles('javascriptProject', '0.0.1', 'javascript', true);
            const testIndex: number = 0;

            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.onFirstCall().resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.{js,ts,go,java,kt}')).resolves([vscode.Uri.file('chaincode.js')]);

            await vscode.commands.executeCommand('blockchainAPackageExplorer.packageSmartContractProjectEntry');

            const pkgFile: string = path.join(fileDest, folders[testIndex].name + '@0.0.1.cds');
            const pkgBuffer: Buffer = await fs.readFile(pkgFile);
            const pkg: Package = await Package.fromBuffer(pkgBuffer);
            pkg.getName().should.equal('javascriptProject');
            pkg.getVersion().should.equal('0.0.1');
            pkg.getType().should.equal('node');
            pkg.getFileNames().should.deep.equal([
                'src/chaincode.js',
                'src/package.json'
            ]);
            errorSpy.should.not.have.been.called;
            informationSpy.should.have.been.calledOnce;
            executeTaskStub.should.have.not.been.called;
        });

        it('should package the JavaScript project with specified folder and version', async () => {
            await createTestFiles('javascriptProject', '0.0.3', 'javascript', true);
            const testIndex: number = 0;

            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.onFirstCall().resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.{js,ts,go,java,kt}')).resolves([vscode.Uri.file('chaincode.js')]);

            await vscode.commands.executeCommand('blockchainAPackageExplorer.packageSmartContractProjectEntry', folders[testIndex], '0.0.3');

            const pkgFile: string = path.join(fileDest, folders[testIndex].name + '@0.0.3.cds');
            const pkgBuffer: Buffer = await fs.readFile(pkgFile);
            const pkg: Package = await Package.fromBuffer(pkgBuffer);
            pkg.getName().should.equal('javascriptProject');
            pkg.getVersion().should.equal('0.0.3');
            pkg.getType().should.equal('node');
            pkg.getFileNames().should.deep.equal([
                'src/chaincode.js',
                'src/package.json'
            ]);
            errorSpy.should.not.have.been.called;
            informationSpy.should.have.been.calledOnce;
            executeTaskStub.should.have.not.been.called;
        });

        it('should package the TypeScript project', async () => {
            await createTestFiles('typescriptProject', '0.0.1', 'typescript', true);

            const testIndex: number = 1;
            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.onFirstCall().resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.{js,ts,go,java,kt}'), '**/node_modules/**', 1).resolves([vscode.Uri.file('chaincode.ts'), vscode.Uri.file('chaincode.js')]);

            await vscode.commands.executeCommand('blockchainAPackageExplorer.packageSmartContractProjectEntry');

            const pkgFile: string = path.join(fileDest, folders[testIndex].name + '@0.0.1.cds');
            const pkgBuffer: Buffer = await fs.readFile(pkgFile);
            const pkg: Package = await Package.fromBuffer(pkgBuffer);
            pkg.getName().should.equal('typescriptProject');
            pkg.getVersion().should.equal('0.0.1');
            pkg.getType().should.equal('node');
            pkg.getFileNames().should.deep.equal([
                'src/chaincode.js',
                'src/chaincode.ts',
                'src/package.json'
            ]);
            errorSpy.should.not.have.been.called;
            informationSpy.should.have.been.calledOnce;
            executeTaskStub.should.have.been.calledOnce;
            executeTaskStub.should.have.been.calledWithExactly(buildTasks[testIndex]);
        });

        it('should package the Go project', async () => {
            await createTestFiles('goProject', '0.0.1', 'golang', true);

            const testIndex: number = 2;

            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.onFirstCall().resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            showInputStub.onFirstCall().resolves('myProject');
            showInputStub.onSecondCall().resolves('0.0.3');

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.{js,ts,go,java,kt}'), '**/node_modules/**', 1).resolves([vscode.Uri.file('chaincode.go')]);

            await vscode.commands.executeCommand('blockchainAPackageExplorer.packageSmartContractProjectEntry');

            const pkgFile: string = path.join(fileDest, 'myProject@0.0.3.cds');
            const pkgBuffer: Buffer = await fs.readFile(pkgFile);
            const pkg: Package = await Package.fromBuffer(pkgBuffer);
            pkg.getName().should.equal('myProject');
            pkg.getVersion().should.equal('0.0.3');
            pkg.getType().should.equal('golang');
            pkg.getFileNames().should.deep.equal([
                'src/goProject/chaincode.go'
            ]);
            errorSpy.should.not.have.been.called;
            informationSpy.should.have.been.calledOnce;
            executeTaskStub.should.have.been.calledOnce;
            executeTaskStub.should.have.been.calledWithExactly(buildTasks[testIndex]);
        });

        it('should package the Java project', async () => {
            await createTestFiles('javaProject', '0.0.1', 'java', true);

            const testIndex: number = 3;

            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.onFirstCall().resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            showInputStub.onFirstCall().resolves('myProject');
            showInputStub.onSecondCall().resolves('0.0.3');

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.{js,ts,go,java,kt}'), '**/node_modules/**', 1).resolves([vscode.Uri.file('chaincode.java')]);

            await vscode.commands.executeCommand('blockchainAPackageExplorer.packageSmartContractProjectEntry');

            const pkgFile: string = path.join(fileDest, 'myProject@0.0.3.cds');
            const pkgBuffer: Buffer = await fs.readFile(pkgFile);
            const pkg: Package = await Package.fromBuffer(pkgBuffer);
            pkg.getName().should.equal('myProject');
            pkg.getVersion().should.equal('0.0.3');
            pkg.getType().should.equal('java');
            pkg.getFileNames().should.deep.equal([
                'src/chaincode.java'
            ]);
            errorSpy.should.not.have.been.called;
            informationSpy.should.have.been.calledOnce;
            executeTaskStub.should.have.been.calledOnce;
            executeTaskStub.should.have.been.calledWithExactly(buildTasks[testIndex]);
        });

        it('should throw an error as the package json does not contain a name or version', async () => {
            await createTestFiles('javascriptProject', '0.0.1', 'javascript', true);

            const testIndex: number = 0;
            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.onFirstCall().resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.{js,ts,go,java,kt}'), '**/node_modules/**', 1).resolves([vscode.Uri.file('chaincode.js')]);

            const packageDir: string = path.join(fileDest, folders[testIndex].name + '@0.0.1');

            await TestUtil.deleteTestFiles(path.join(javascriptPath, '/package.json'));
            await fs.writeFile(path.join(javascriptPath, '/package.json'), emptyContent);
            await vscode.commands.executeCommand('blockchainAPackageExplorer.packageSmartContractProjectEntry');

            const smartContractExists: boolean = await fs.pathExists(packageDir);

            smartContractExists.should.be.false;
            errorSpy.should.have.been.calledWith('Please enter a package name and/or package version into your package.json');
            informationSpy.should.not.have.been.called;
        });

        it('should throw an error as the project does not contain a chaincode file', async () => {
            await createTestFiles('javascriptProject', '0.0.1', 'javascript', true);

            const testIndex: number = 0;

            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.onFirstCall().resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });
            const packageDir: string = path.join(fileDest, folders[testIndex].name + '@0.0.1');
            await TestUtil.deleteTestFiles(path.join(javascriptPath, '/chaincode.js'));

            await vscode.commands.executeCommand('blockchainAPackageExplorer.packageSmartContractProjectEntry');

            const smartContractExists: boolean = await fs.pathExists(packageDir);
            smartContractExists.should.be.false;
            errorSpy.should.have.been.calledWith('Failed to determine workspace language type, supported languages are JavaScript, TypeScript, Go and Java');
            informationSpy.should.not.have.been.called;
        });

        it('should throw an error if the JavaScript project already exists', async () => {
            await createTestFiles('javascriptProject', '0.0.1', 'javascript', true);

            const testIndex: number = 0;
            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.{js,ts,go,java,kt}'), '**/node_modules/**', 1).resolves([vscode.Uri.file('chaincode.js')]);

            await vscode.commands.executeCommand('blockchainAPackageExplorer.packageSmartContractProjectEntry');

            await vscode.commands.executeCommand('blockchainAPackageExplorer.packageSmartContractProjectEntry');

            errorSpy.should.have.been.calledWith('Package with name and version already exists. Please change the name and/or the version of the project in your package.json file.');
        });

        it('should throw an error as the Go project already exists', async () => {
            await createTestFiles('goProject', '0.0.1', 'golang', true);

            const testIndex: number = 2;
            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.{js,ts,go,java,kt}'), '**/node_modules/**', 1).resolves([vscode.Uri.file('chaincode.go')]);

            showInputStub.onFirstCall().resolves('myProject');
            showInputStub.onSecondCall().resolves('0.0.3');
            showInputStub.onThirdCall().resolves('myProject');
            showInputStub.onCall(3).resolves('0.0.3');

            await vscode.commands.executeCommand('blockchainAPackageExplorer.packageSmartContractProjectEntry');

            await vscode.commands.executeCommand('blockchainAPackageExplorer.packageSmartContractProjectEntry');

            errorSpy.should.have.been.calledWith('Package with name and version already exists. Please input a different name or version for your Go project.');
        });

        it('should throw an error as the Java project already exists', async () => {
            await createTestFiles('javaProject', '0.0.1', 'java', true);

            const testIndex: number = 3;
            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.{js,ts,go,java,kt}'), '**/node_modules/**', 1).resolves([vscode.Uri.file('chaincode.java')]);

            showInputStub.onFirstCall().resolves('myProject');
            showInputStub.onSecondCall().resolves('0.0.3');
            showInputStub.onThirdCall().resolves('myProject');
            showInputStub.onCall(3).resolves('0.0.3');

            await vscode.commands.executeCommand('blockchainAPackageExplorer.packageSmartContractProjectEntry');

            await vscode.commands.executeCommand('blockchainAPackageExplorer.packageSmartContractProjectEntry');

            errorSpy.should.have.been.calledWith('Package with name and version already exists. Please input a different name or version for your Java project.');
        });

        it('should throw an error if the GOPATH environment variable is not set', async () => {
            await createTestFiles('goProject', '0.0.1', 'golang', true);

            const testIndex: number = 2;
            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.{js,ts,go,java,kt}'), '**/node_modules/**', 1).resolves([vscode.Uri.file('chaincode.go')]);

            showInputStub.onFirstCall().resolves('myProject');
            showInputStub.onSecondCall().resolves('0.0.3');
            showInputStub.onThirdCall().resolves('myProject');
            showInputStub.onCall(3).resolves('0.0.3');

            delete process.env.GOPATH;
            await vscode.commands.executeCommand('blockchainAPackageExplorer.packageSmartContractProjectEntry');

            errorSpy.should.have.been.calledWith('The enviroment variable GOPATH has not been set. You cannot package a Go smart contract without setting the environment variable GOPATH.');
        });

        it('should throw an error if the GOPATH environment variable is set to the project directory', async () => {
            await createTestFiles('goProject', '0.0.1', 'golang', true);

            const testIndex: number = 2;
            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.{js,ts,go,java,kt}'), '**/node_modules/**', 1).resolves([vscode.Uri.file('chaincode.go')]);

            showInputStub.onFirstCall().resolves('myProject');
            showInputStub.onSecondCall().resolves('0.0.3');
            showInputStub.onThirdCall().resolves('myProject');
            showInputStub.onCall(3).resolves('0.0.3');

            process.env.GOPATH = golangPath;
            await vscode.commands.executeCommand('blockchainAPackageExplorer.packageSmartContractProjectEntry');

            errorSpy.should.have.been.calledWith('The Go smart contract is not a subdirectory of the path specified by the environment variable GOPATH. Please correct the environment variable GOPATH.');
        });

        it('should throw an error if the project directory is not inside the directory specified by the GOPATH environment variable ', async () => {
            await createTestFiles('goProject', '0.0.1', 'golang', true);

            const testIndex: number = 2;
            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.{js,ts,go,java,kt}'), '**/node_modules/**', 1).resolves([vscode.Uri.file('chaincode.go')]);

            showInputStub.onFirstCall().resolves('myProject');
            showInputStub.onSecondCall().resolves('0.0.3');
            showInputStub.onThirdCall().resolves('myProject');
            showInputStub.onCall(3).resolves('0.0.3');

            process.env.GOPATH = javascriptPath;
            await vscode.commands.executeCommand('blockchainAPackageExplorer.packageSmartContractProjectEntry');

            errorSpy.should.have.been.calledWith('The Go smart contract is not a subdirectory of the path specified by the environment variable GOPATH. Please correct the environment variable GOPATH.');
        });

        it('should throw an error if the GOPATH environment variable is set to the root directory', async () => {
            await createTestFiles('goProject', '0.0.1', 'golang', true);

            const testIndex: number = 2;
            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.{js,ts,go,java,kt}'), '**/node_modules/**', 1).resolves([vscode.Uri.file('chaincode.go')]);

            showInputStub.onFirstCall().resolves('myProject');
            showInputStub.onSecondCall().resolves('0.0.3');
            showInputStub.onThirdCall().resolves('myProject');
            showInputStub.onCall(3).resolves('0.0.3');

            process.env.GOPATH = path.resolve('/');
            await vscode.commands.executeCommand('blockchainAPackageExplorer.packageSmartContractProjectEntry');

            errorSpy.should.have.been.calledWith('The Go smart contract is not a subdirectory of the path specified by the environment variable GOPATH. Please correct the environment variable GOPATH.');
        });

        it('should fail packaging the TypeScript project as there is no compiled chaincode.js file', async () => {
            await createTestFiles('typescriptProject', '0.0.1', 'typescript', true);

            const testIndex: number = 1;
            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.onFirstCall().resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.{js,ts,go,java,kt}'), '**/node_modules/**', 1).resolves([vscode.Uri.file('chaincode.ts')]);

            const packageDir: string = path.join(fileDest, folders[testIndex].name + '@0.0.1');

            await TestUtil.deleteTestFiles(path.join(typescriptPath, '/chaincode.js'));

            await vscode.commands.executeCommand('blockchainAPackageExplorer.packageSmartContractProjectEntry');

            const smartContractExists: boolean = await fs.pathExists(packageDir);

            smartContractExists.should.be.false;
            errorSpy.should.have.been.called;
            informationSpy.should.not.have.been.called;
        });

        it('should run execute the refreshEntry command', async () => {
            await createTestFiles('javascriptProject', '0.0.1', 'javascript', true);

            const testIndex: number = 0;
            const commandSpy: sinon.SinonSpy = mySandBox.spy(vscode.commands, 'executeCommand');
            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.onFirstCall().resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.{js,ts,go,java,kt}'), '**/node_modules/**', 1).resolves([vscode.Uri.file('chaincode.js')]);

            await vscode.commands.executeCommand('blockchainAPackageExplorer.packageSmartContractProjectEntry');
            commandSpy.should.have.been.calledWith('blockchainAPackageExplorer.refreshEntry');
        });

        it('should not show package chooser when only one folder', async () => {
            await createTestFiles('javascriptProject', '0.0.1', 'javascript', true);
            const testIndex: number = 0;

            folders.splice(1, folders.length - 1);

            workspaceFoldersStub.returns(folders);

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.{js,ts,go,java,kt}'), '**/node_modules/**', 1).resolves([vscode.Uri.file('chaincode.js')]);

            await vscode.commands.executeCommand('blockchainAPackageExplorer.packageSmartContractProjectEntry');

            showWorkspaceQuickPickStub.should.not.have.been.called;

            const pkgFile: string = path.join(fileDest, folders[testIndex].name + '@0.0.1.cds');
            const pkgBuffer: Buffer = await fs.readFile(pkgFile);
            const pkg: Package = await Package.fromBuffer(pkgBuffer);
            pkg.getName().should.equal('javascriptProject');
            pkg.getVersion().should.equal('0.0.1');
            pkg.getType().should.equal('node');
            pkg.getFileNames().should.deep.equal([
                'src/chaincode.js',
                'src/package.json'
            ]);
            errorSpy.should.not.have.been.called;
            informationSpy.should.have.been.calledOnce;
        });

        it('should handle error from get workspace folders', async () => {
            await createTestFiles('javascriptProject', '0.0.1', 'javascript', true);
            const testIndex: number = 0;

            folders.splice(1, folders.length - 1);

            workspaceFoldersStub.returns([]);

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.{js,ts,go,java,kt}'), '**/node_modules/**', 1).resolves([vscode.Uri.file('chaincode.js')]);

            await vscode.commands.executeCommand('blockchainAPackageExplorer.packageSmartContractProjectEntry');

            errorSpy.should.have.been.calledWith('Issue determining available workspace folders. Please open the workspace that you want to be packaged.');
        }).timeout(4000);

        it('should handle not choosing folder', async () => {
            await createTestFiles('javascriptProject', '0.0.1', 'javascript', true);

            const testIndex: number = 0;
            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.resolves();

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.{js,ts,go,java,kt}'), '**/node_modules/**', 1).resolves([vscode.Uri.file('chaincode.js')]);

            const packageDir: string = path.join(fileDest, folders[testIndex].name + '@0.0.1');

            await vscode.commands.executeCommand('blockchainAPackageExplorer.packageSmartContractProjectEntry');

            const smartContractExists: boolean = await fs.pathExists(packageDir);

            smartContractExists.should.equal(false);
        });

        it('should handle cancelling the input box for the Go project name', async () => {
            await createTestFiles('goProject', '0.0.1', 'golang', true);

            const testIndex: number = 2;

            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.onFirstCall().resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });
            const packageDir: string = path.join(fileDest, 'myProject' + '@0.0.1');

            showInputStub.onFirstCall().resolves();

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.{js,ts,go,java,kt}'), '**/node_modules/**', 1).resolves([vscode.Uri.file('chaincode.go')]);

            await vscode.commands.executeCommand('blockchainAPackageExplorer.packageSmartContractProjectEntry');

            const smartContractExists: boolean = await fs.pathExists(packageDir);

            smartContractExists.should.equal(false);
        });

        it('should handle cancelling the input box for the Go project version', async () => {
            await createTestFiles('goProject', '0.0.1', 'golang', true);

            const testIndex: number = 2;

            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.onFirstCall().resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });
            const packageDir: string = path.join(fileDest, 'myProject' + '@0.0.1');

            showInputStub.onFirstCall().resolves('myProject');
            showInputStub.onSecondCall().resolves();

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.{js,ts,go,java,kt}'), '**/node_modules/**', 1).resolves([vscode.Uri.file('chaincode.go')]);

            await vscode.commands.executeCommand('blockchainAPackageExplorer.packageSmartContractProjectEntry');

            const smartContractExists: boolean = await fs.pathExists(packageDir);

            smartContractExists.should.equal(false);
        });

        it('should handle cancelling the input box for the Java project name', async () => {
            await createTestFiles('javaProject', '0.0.1', 'java', true);

            const testIndex: number = 3;

            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.onFirstCall().resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });
            const packageDir: string = path.join(fileDest, 'myProject' + '@0.0.1');

            showInputStub.onFirstCall().resolves();

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.{js,ts,go,java,kt}'), '**/node_modules/**', 1).resolves([vscode.Uri.file('chaincode.java')]);

            await vscode.commands.executeCommand('blockchainAPackageExplorer.packageSmartContractProjectEntry');

            const smartContractExists: boolean = await fs.pathExists(packageDir);

            smartContractExists.should.equal(false);
        });

        it('should handle cancelling the input box for the Java project version', async () => {
            await createTestFiles('javaProject', '0.0.1', 'java', true);

            const testIndex: number = 3;

            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.onFirstCall().resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });
            const packageDir: string = path.join(fileDest, 'myProject' + '@0.0.1');

            showInputStub.onFirstCall().resolves('myProject');
            showInputStub.onSecondCall().resolves();

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.{js,ts,go,java,kt}'), '**/node_modules/**', 1).resolves([vscode.Uri.file('chaincode.java')]);

            await vscode.commands.executeCommand('blockchainAPackageExplorer.packageSmartContractProjectEntry');

            const smartContractExists: boolean = await fs.pathExists(packageDir);

            smartContractExists.should.equal(false);
        }).timeout(4000);

        it('should package a smart contract given a project workspace', async () => {
            await createTestFiles('javascriptProject', '0.0.1', 'javascript', true);
            const testIndex: number = 0;

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.{js,ts,go,java,kt}')).resolves([vscode.Uri.file('chaincode.js')]);

            const workspaceFolderMock: vscode.WorkspaceFolder = {name: 'javascriptProject', uri: vscode.Uri.file(javascriptPath)} as vscode.WorkspaceFolder;

            await vscode.commands.executeCommand('blockchainAPackageExplorer.packageSmartContractProjectEntry', workspaceFolderMock);

            // chooseWorkspace() should not have been called
            workspaceFoldersStub.should.not.have.been.called;
            showWorkspaceQuickPickStub.should.not.have.been.called;

            const pkgFile: string = path.join(fileDest, folders[testIndex].name + '@0.0.1.cds');
            const pkgBuffer: Buffer = await fs.readFile(pkgFile);
            const pkg: Package = await Package.fromBuffer(pkgBuffer);
            pkg.getName().should.equal('javascriptProject');
            pkg.getVersion().should.equal('0.0.1');
            pkg.getType().should.equal('node');
            pkg.getFileNames().should.deep.equal([
                'src/chaincode.js',
                'src/package.json'
            ]);
            errorSpy.should.not.have.been.called;
            informationSpy.should.have.been.calledOnce;
            executeTaskStub.should.have.not.been.called;
        }).timeout(10000);
    });
});
