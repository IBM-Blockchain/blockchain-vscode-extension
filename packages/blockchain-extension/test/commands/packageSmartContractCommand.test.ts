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
import { UserInputUtil } from '../../extension/commands/UserInputUtil';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from 'ibm-blockchain-platform-common';
import { ExtensionCommands } from '../../ExtensionCommands';
import { Reporter } from '../../extension/util/Reporter';
import { CommandUtil } from '../../extension/util/CommandUtil';

chai.should();
chai.use(sinonChai);
// tslint:disable no-unused-expression
// skip as tests keep stopping here
describe('packageSmartContract', () => {
    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();
    const rootPath: string = path.dirname(__dirname);
    const extDir: string = TestUtil.EXTENSION_TEST_DIR;
    const fileDest: string = path.join(extDir, 'packages');
    const testWorkspace: string = path.join(rootPath, '..', '..', 'test', 'data', 'testWorkspace');
    const javascriptPath: string = path.join(testWorkspace, 'javascriptProject');
    const typescriptPath: string = path.join(testWorkspace, 'typescriptProject');
    const invalidPath: string = path.join(testWorkspace, '  invalid package name! ');
    const golangPath: string = path.join(testWorkspace, 'src', 'goProject');
    const golangPathFurther: string = path.join(testWorkspace, 'src', 'some', 'path', 'goProject');
    const wrongGolangPath: string = path.join(testWorkspace, 'goProject');
    const javaPath: string = path.join(testWorkspace, 'javaProject');
    const emptyContent: string = '{}';

    let folders: Array<any> = [];

    async function createTestFiles(packageName: string, version: string, language: string, createValid: boolean, createMetadata: boolean, createWrongPlace: boolean = false, srcChild: boolean = true, goModule: boolean = false): Promise<void> {
        let projectDir: string;
        if (language === 'golang') {
            if (createWrongPlace) {
                folders[2].uri = vscode.Uri.file(wrongGolangPath);
                projectDir = path.join(testWorkspace, packageName);
            } else if (srcChild) {
                projectDir = path.join(testWorkspace, 'src', packageName);
            } else {
                projectDir = path.join(testWorkspace, 'src', 'some', 'path', packageName);
            }
        } else {
            const replaceRegex: RegExp = /@.*?\//;
            if (replaceRegex.test(packageName)) {
                projectDir = path.join(testWorkspace, packageName.replace(replaceRegex, ''));
            } else {
                projectDir = path.join(testWorkspace, packageName);
            }
        }

        try {
            await fs.remove(path.join(testWorkspace, packageName));
            await fs.remove(path.join(testWorkspace, 'src', packageName));
            await fs.remove(path.join(testWorkspace, 'src', 'some', 'path', packageName));
        } catch (error) {
            // tslint:disable no-console
            console.log(error);
        }

        try {
            await fs.mkdirp(projectDir);
        } catch (error) {
            // tslint:disable no-console
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
                if (goModule) {
                    const goMod: string = path.join(projectDir, 'go.mod');
                    await fs.ensureFile(goMod);
                }
            } else if (language === 'java-gradle' || language === 'java-maven') {
                if (language === 'java-gradle') {
                    const gradleFile: string = path.join(projectDir, 'build.gradle');
                    await fs.writeFile(gradleFile, emptyContent);
                } else if (language === 'java-maven') {
                    const gradleFile: string = path.join(projectDir, 'pom.xml');
                    await fs.writeFile(gradleFile, emptyContent);
                }
                const javaChaincode: string = path.join(projectDir, 'chaincode.java');
                await fs.writeFile(javaChaincode, emptyContent);
            } else {
                throw new Error(`unrecognised language ${language}, y u no update tests?`);
            }
        } else {
            const textFile: string = projectDir + '/text.txt';
            const content: string = 'hello';
            await fs.writeFile(textFile, content);
        }

        if (createMetadata) {
            const metadataDir: string = path.join(projectDir, 'META-INF', 'statedb', 'couchdb', 'indexes');
            await fs.mkdirp(metadataDir);
            const indexOwnerFile: string = path.join(metadataDir, 'indexOwner.json');
            await fs.writeJson(indexOwnerFile, {
                index: {
                    fields: ['docType', 'owner']
                },
                ddoc: 'indexOwnerDoc',
                name: 'indexOwner',
                type: 'json'
            });
        }
    }

    before(async () => {
        await TestUtil.setupTests(mySandBox);
        await fs.mkdirp(fileDest);
    });

    let logSpy: sinon.SinonSpy;
    let showInputStub: sinon.SinonStub;
    let workspaceFoldersStub: sinon.SinonStub;
    let showWorkspaceQuickPickStub: sinon.SinonStub;
    let findFilesStub: sinon.SinonStub;
    let buildTasks: vscode.Task[];
    let executeTaskStub: sinon.SinonStub;
    let sendTelemetryEventStub: sinon.SinonStub;

    beforeEach(async () => {

        delete process.env.GOPATH;

        await TestUtil.deleteTestFiles(fileDest);
        await TestUtil.deleteTestFiles(testWorkspace);

        folders = [
            { name: 'javascriptProject', uri: vscode.Uri.file(javascriptPath) },
            { name: 'typescriptProject', uri: vscode.Uri.file(typescriptPath) },
            { name: 'goProject', uri: vscode.Uri.file(golangPath) },
            { name: 'javaProject', uri: vscode.Uri.file(javaPath) },
            { name: '  invalid package name! ', uri: vscode.Uri.file(invalidPath) },
            { name: 'goProject', uri: vscode.Uri.file(golangPathFurther) }
        ];

        logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
        showInputStub = mySandBox.stub(UserInputUtil, 'showInputBox');
        showWorkspaceQuickPickStub = mySandBox.stub(UserInputUtil, 'showWorkspaceQuickPickBox');
        workspaceFoldersStub = mySandBox.stub(UserInputUtil, 'getWorkspaceFolders');
        sendTelemetryEventStub = mySandBox.stub(Reporter.instance(), 'sendTelemetryEvent');

        findFilesStub = mySandBox.stub(vscode.workspace, 'findFiles').resolves([]);

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
        const watchTasks: vscode.Task[] = [
            new vscode.Task({ type: 'npm' }, { index: 0, name: 'javascriptProject', uri: vscode.Uri.file(javascriptPath) }, 'javascriptProject watch task', 'npm'),
            new vscode.Task({ type: 'npm' }, { index: 0, name: 'typescriptProject', uri: vscode.Uri.file(typescriptPath) }, 'typescriptProject Watch task', 'npm'),
            new vscode.Task({ type: 'npm' }, { index: 0, name: 'goProject', uri: vscode.Uri.file(golangPath) }, 'goProject WATCH task', 'npm'),
            new vscode.Task({ type: 'npm' }, { index: 0, name: 'javaProject', uri: vscode.Uri.file(javaPath) }, 'javaProject WaTcH task', 'npm')
        ].map((task: vscode.Task) => {
            task.group = vscode.TaskGroup.Build;
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
            [unscopedTask, globalTask, workspaceTask, differentUriTask]
                .concat(testTasks, backgroundTasks, watchTasks, buildTasks)
                .filter((task: vscode.Task) => !!task)
        );

        // Fake executeTask so that it emits the right event.
        const onDidEndTaskEventEmitter: vscode.EventEmitter<vscode.TaskEndEvent> = new vscode.EventEmitter<vscode.TaskEndEvent>();
        const onDidEndTaskEvent: vscode.Event<vscode.TaskEndEvent> = onDidEndTaskEventEmitter.event;
        mySandBox.stub(vscode.tasks, 'onDidEndTask').value(onDidEndTaskEvent);
        executeTaskStub = mySandBox.stub(vscode.tasks, 'executeTask').callsFake(async (task: vscode.Task) => {
            const terminate: sinon.SinonStub = mySandBox.stub();
            const testExecution: vscode.TaskExecution = { terminate, task: testTasks[0] };
            const buildExecution: vscode.TaskExecution = { terminate, task };
            setTimeout(() => {
                // Always fire another task completion that isn't the one we're looking for.
                onDidEndTaskEventEmitter.fire({ execution: testExecution });
                onDidEndTaskEventEmitter.fire({ execution: buildExecution });
            }, 1);
        });

    });

    afterEach(async () => {
        await TestUtil.deleteTestFiles(fileDest);
        await TestUtil.deleteTestFiles(testWorkspace);
        mySandBox.restore();
    });

    describe('#packageSmartContract', () => {

        it('should package the JavaScript project', async () => {
            await createTestFiles('javascriptProject', '0.0.1', 'javascript', true, false);
            const testIndex: number = 0;

            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.onFirstCall().resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT);

            const pkgFile: string = path.join(fileDest, folders[testIndex].name + '@0.0.1.cds');

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'packageSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, `Smart Contract packaged: ${pkgFile}`);
            logSpy.getCall(2).should.have.been.calledWith(LogType.INFO, undefined, `2 file(s) packaged:`);
            logSpy.getCall(3).should.have.been.calledWith(LogType.INFO, undefined, `- src/chaincode.js`);
            logSpy.getCall(4).should.have.been.calledWith(LogType.INFO, undefined, `- src/package.json`);
            executeTaskStub.should.have.not.been.called;
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('packageCommand');
        });

        it('should package the project on VSCode version 1.44.2 successfully without throwing error mentioned in #2243', async () => {
            const workspaceFolderMock: vscode.WorkspaceFolder = { name: 'javascriptProject'} as vscode.WorkspaceFolder;
            await createTestFiles('javascriptProject', '0.0.1', 'javascript', true, false);
            const testIndex: number = 0;

            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.onFirstCall().resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT, workspaceFolderMock);

            const pkgFile: string = path.join(fileDest, folders[testIndex].name + '@0.0.1.cds');

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'packageSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, `Smart Contract packaged: ${pkgFile}`);
            logSpy.getCall(2).should.have.been.calledWith(LogType.INFO, undefined, `2 file(s) packaged:`);
            logSpy.getCall(3).should.have.been.calledWith(LogType.INFO, undefined, `- src/chaincode.js`);
            logSpy.getCall(4).should.have.been.calledWith(LogType.INFO, undefined, `- src/package.json`);
            executeTaskStub.should.have.not.been.called;
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('packageCommand');
        });

        it('should package the project with an npm package name', async () => {
            await createTestFiles('@removeThis/javascriptProject', '0.0.1', 'javascript', true, false);
            const testIndex: number = 0;

            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.onFirstCall().resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT);

            const pkgFile: string = path.join(fileDest, folders[testIndex].name + '@0.0.1.cds');

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'packageSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, `Smart Contract packaged: ${pkgFile}`);
            logSpy.getCall(2).should.have.been.calledWith(LogType.INFO, undefined, `2 file(s) packaged:`);
            logSpy.getCall(3).should.have.been.calledWith(LogType.INFO, undefined, `- src/chaincode.js`);
            logSpy.getCall(4).should.have.been.calledWith(LogType.INFO, undefined, `- src/package.json`);
            executeTaskStub.should.have.not.been.called;
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('packageCommand');
        });

        it('should package the JavaScript project with specified folder and name', async () => {
            await createTestFiles('javascriptProject', '0.0.3', 'javascript', true, false);
            const testIndex: number = 0;

            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.onFirstCall().resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT, folders[testIndex], 'dogechain');

            const pkgFile: string = path.join(fileDest, 'dogechain@0.0.3.cds');

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'packageSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, `Smart Contract packaged: ${pkgFile}`);
            logSpy.getCall(2).should.have.been.calledWith(LogType.INFO, undefined, `2 file(s) packaged:`);
            logSpy.getCall(3).should.have.been.calledWith(LogType.INFO, undefined, `- src/chaincode.js`);
            logSpy.getCall(4).should.have.been.calledWith(LogType.INFO, undefined, `- src/package.json`);
            executeTaskStub.should.have.not.been.called;
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('packageCommand');
        });

        it('should package the JavaScript project with specified folder and version', async () => {
            await createTestFiles('javascriptProject', '0.0.3', 'javascript', true, false);
            const testIndex: number = 0;

            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.onFirstCall().resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT, folders[testIndex], null, '0.0.3');

            const pkgFile: string = path.join(fileDest, folders[testIndex].name + '@0.0.3.cds');

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'packageSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, `Smart Contract packaged: ${pkgFile}`);
            logSpy.getCall(2).should.have.been.calledWith(LogType.INFO, undefined, `2 file(s) packaged:`);
            logSpy.getCall(3).should.have.been.calledWith(LogType.INFO, undefined, `- src/chaincode.js`);
            logSpy.getCall(4).should.have.been.calledWith(LogType.INFO, undefined, `- src/package.json`);
            executeTaskStub.should.have.not.been.called;
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('packageCommand');
        });

        it('should package the JavaScript project with specified folder, name and version', async () => {
            await createTestFiles('javascriptProject', '0.0.3', 'javascript', true, false);
            const testIndex: number = 0;

            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.onFirstCall().resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT, folders[testIndex], 'dogechain', '1.2.3');

            const pkgFile: string = path.join(fileDest, 'dogechain@1.2.3.cds');

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'packageSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, `Smart Contract packaged: ${pkgFile}`);
            logSpy.getCall(2).should.have.been.calledWith(LogType.INFO, undefined, `2 file(s) packaged:`);
            logSpy.getCall(3).should.have.been.calledWith(LogType.INFO, undefined, `- src/chaincode.js`);
            logSpy.getCall(4).should.have.been.calledWith(LogType.INFO, undefined, `- src/package.json`);
            executeTaskStub.should.have.not.been.called;
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('packageCommand');
        });

        it('should package the JavaScript project with a META-INF directory', async () => {
            await createTestFiles('javascriptProject', '0.0.1', 'javascript', true, true);
            const testIndex: number = 0;

            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.onFirstCall().resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT);

            const pkgFile: string = path.join(fileDest, folders[testIndex].name + '@0.0.1.cds');

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'packageSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, `Smart Contract packaged: ${pkgFile}`);
            logSpy.getCall(2).should.have.been.calledWith(LogType.INFO, undefined, `4 file(s) packaged:`);
            logSpy.getCall(3).should.have.been.calledWith(LogType.INFO, undefined, `- META-INF/statedb/couchdb/indexes/indexOwner.json`);
            logSpy.getCall(4).should.have.been.calledWith(LogType.INFO, undefined, `- src/META-INF/statedb/couchdb/indexes/indexOwner.json`);
            logSpy.getCall(5).should.have.been.calledWith(LogType.INFO, undefined, `- src/chaincode.js`);
            logSpy.getCall(6).should.have.been.calledWith(LogType.INFO, undefined, `- src/package.json`);
            executeTaskStub.should.have.not.been.called;
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('packageCommand');
        });

        it('should package the TypeScript project', async () => {
            await createTestFiles('typescriptProject', '0.0.1', 'typescript', true, false);

            const testIndex: number = 1;
            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.onFirstCall().resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT);

            const pkgFile: string = path.join(fileDest, folders[testIndex].name + '@0.0.1.cds');

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'packageSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, `Smart Contract packaged: ${pkgFile}`);
            logSpy.getCall(2).should.have.been.calledWith(LogType.INFO, undefined, `3 file(s) packaged:`);
            logSpy.getCall(3).should.have.been.calledWith(LogType.INFO, undefined, `- src/chaincode.js`);
            logSpy.getCall(4).should.have.been.calledWith(LogType.INFO, undefined, `- src/chaincode.ts`);
            logSpy.getCall(5).should.have.been.calledWith(LogType.INFO, undefined, '- src/package.json');
            executeTaskStub.should.have.been.calledOnceWithExactly(buildTasks[testIndex]);
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('packageCommand');
        });

        it('should package the Go project', async () => {
            await createTestFiles('goProject', '0.0.1', 'golang', true, false);

            const testIndex: number = 2;

            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.onFirstCall().resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            showInputStub.onFirstCall().resolves('myProject');
            showInputStub.onSecondCall().resolves('0.0.3');

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.go'), null, 1).resolves([vscode.Uri.file('chaincode.go')]);

            await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT);

            const pkgFile: string = path.join(fileDest, 'myProject@0.0.3.cds');

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'packageSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, `Smart Contract packaged: ${pkgFile}`);
            logSpy.getCall(2).should.have.been.calledWith(LogType.INFO, undefined, `1 file(s) packaged:`);
            logSpy.getCall(3).should.have.been.calledWith(LogType.INFO, undefined, `- src/goProject/chaincode.go`);
            executeTaskStub.should.have.been.calledOnceWithExactly(buildTasks[testIndex]);
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('packageCommand');
        });

        it('should package the Go project with specified name', async () => {
            await createTestFiles('goProject', '0.0.1', 'golang', true, false);

            const testIndex: number = 2;

            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.onFirstCall().resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            showInputStub.onFirstCall().resolves('0.0.3');

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.go'), null, 1).resolves([vscode.Uri.file('chaincode.go')]);

            await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT, null, 'dogechain');

            const pkgFile: string = path.join(fileDest, 'dogechain@0.0.3.cds');

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'packageSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, `Smart Contract packaged: ${pkgFile}`);
            logSpy.getCall(2).should.have.been.calledWith(LogType.INFO, undefined, `1 file(s) packaged:`);
            logSpy.getCall(3).should.have.been.calledWith(LogType.INFO, undefined, `- src/goProject/chaincode.go`);
            executeTaskStub.should.have.been.calledOnceWithExactly(buildTasks[testIndex]);
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('packageCommand');
        });

        it('should package the Go project with specified version', async () => {
            await createTestFiles('goProject', '0.0.1', 'golang', true, false);

            const testIndex: number = 2;

            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.onFirstCall().resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            showInputStub.onFirstCall().resolves('myProject');

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.go'), null, 1).resolves([vscode.Uri.file('chaincode.go')]);

            await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT, null, null, '1.2.3');

            const pkgFile: string = path.join(fileDest, 'myProject@1.2.3.cds');

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'packageSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, `Smart Contract packaged: ${pkgFile}`);
            logSpy.getCall(2).should.have.been.calledWith(LogType.INFO, undefined, `1 file(s) packaged:`);
            logSpy.getCall(3).should.have.been.calledWith(LogType.INFO, undefined, `- src/goProject/chaincode.go`);
            executeTaskStub.should.have.been.calledOnceWithExactly(buildTasks[testIndex]);
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('packageCommand');
        });

        it('should package the Go project with specified name and version', async () => {
            await createTestFiles('goProject', '0.0.1', 'golang', true, false);

            const testIndex: number = 2;

            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.onFirstCall().resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.go'), null, 1).resolves([vscode.Uri.file('chaincode.go')]);

            await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT, null, 'dogechain', '1.2.3');

            const pkgFile: string = path.join(fileDest, 'dogechain@1.2.3.cds');

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'packageSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, `Smart Contract packaged: ${pkgFile}`);
            logSpy.getCall(2).should.have.been.calledWith(LogType.INFO, undefined, `1 file(s) packaged:`);
            logSpy.getCall(3).should.have.been.calledWith(LogType.INFO, undefined, `- src/goProject/chaincode.go`);
            executeTaskStub.should.have.been.calledOnceWithExactly(buildTasks[testIndex]);
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('packageCommand');
        });

        it('should use the GOPATH if set', async () => {
            await createTestFiles('goProject', '0.0.1', 'golang', true, false);

            const testIndex: number = 2;

            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.onFirstCall().resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            showInputStub.onFirstCall().resolves('myProject');
            showInputStub.onSecondCall().resolves('0.0.3');

            process.env.GOPATH = testWorkspace;

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.go'), null, 1).resolves([vscode.Uri.file('chaincode.go')]);

            await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT);

            const pkgFile: string = path.join(fileDest, 'myProject@0.0.3.cds');

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'packageSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, `Smart Contract packaged: ${pkgFile}`);
            logSpy.getCall(2).should.have.been.calledWith(LogType.INFO, undefined, `1 file(s) packaged:`);
            logSpy.getCall(3).should.have.been.calledWith(LogType.INFO, undefined, `- src/goProject/chaincode.go`);
            executeTaskStub.should.have.been.calledOnceWithExactly(buildTasks[testIndex]);
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('packageCommand');
        });

        it('should run go mod vendor if the project has a go.mod file', async () => {
            await createTestFiles('goProject', '0.0.1', 'golang', true, false, false, true, true);

            const testIndex: number = 2;

            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.onFirstCall().resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            const runVendorStub: sinon.SinonStub = mySandBox.stub(CommandUtil, 'sendCommandWithOutput').resolves();

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.go'), null, 1).resolves([vscode.Uri.file('chaincode.go')]);

            await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT, null, 'dogechain', '1.2.3');

            runVendorStub.should.have.been.called;
            executeTaskStub.should.have.been.calledOnceWithExactly(buildTasks[testIndex]);
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('packageCommand');
        });

        it('should skip the go mod vendor if the project does not have a go.mod file', async () => {
            await createTestFiles('goProject', '0.0.1', 'golang', true, false, false, true, false);

            const testIndex: number = 2;

            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.onFirstCall().resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            const runVendorStub: sinon.SinonStub = mySandBox.stub(CommandUtil, 'sendCommandWithOutput').resolves();

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.go'), null, 1).resolves([vscode.Uri.file('chaincode.go')]);

            await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT, null, 'dogechain', '1.2.3');

            runVendorStub.should.not.have.been.called;
            executeTaskStub.should.have.been.calledOnceWithExactly(buildTasks[testIndex]);
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('packageCommand');
        });

        it('should package the Java (Gradle) project', async () => {
            await createTestFiles('javaProject', '0.0.1', 'java-gradle', true, false);

            const testIndex: number = 3;

            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.onFirstCall().resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            showInputStub.onFirstCall().resolves('myProject');
            showInputStub.onSecondCall().resolves('0.0.3');

            await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT);

            const pkgFile: string = path.join(fileDest, 'myProject@0.0.3.cds');

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'packageSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, `Smart Contract packaged: ${pkgFile}`);
            logSpy.getCall(2).should.have.been.calledWith(LogType.INFO, undefined, `2 file(s) packaged:`);
            logSpy.getCall(3).should.have.been.calledWith(LogType.INFO, undefined, `- src/build.gradle`);
            logSpy.getCall(4).should.have.been.calledWith(LogType.INFO, undefined, `- src/chaincode.java`);
            executeTaskStub.should.have.been.calledOnceWithExactly(buildTasks[testIndex]);
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('packageCommand');
        });

        it('should package the Java (Gradle) project with specified name', async () => {
            await createTestFiles('javaProject', '0.0.1', 'java-gradle', true, false);

            const testIndex: number = 3;

            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.onFirstCall().resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            showInputStub.onFirstCall().resolves('0.0.3');

            await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT, null, 'dogechain');

            const pkgFile: string = path.join(fileDest, 'dogechain@0.0.3.cds');

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'packageSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, `Smart Contract packaged: ${pkgFile}`);
            logSpy.getCall(2).should.have.been.calledWith(LogType.INFO, undefined, `2 file(s) packaged:`);
            logSpy.getCall(3).should.have.been.calledWith(LogType.INFO, undefined, `- src/build.gradle`);
            logSpy.getCall(4).should.have.been.calledWith(LogType.INFO, undefined, `- src/chaincode.java`);
            executeTaskStub.should.have.been.calledOnceWithExactly(buildTasks[testIndex]);
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('packageCommand');
        });

        it('should package the Java (Gradle) project with specified version', async () => {
            await createTestFiles('javaProject', '0.0.1', 'java-gradle', true, false);

            const testIndex: number = 3;

            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.onFirstCall().resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            showInputStub.onFirstCall().resolves('myProject');

            await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT, null, null, '1.2.3');

            const pkgFile: string = path.join(fileDest, 'myProject@1.2.3.cds');

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'packageSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, `Smart Contract packaged: ${pkgFile}`);
            logSpy.getCall(2).should.have.been.calledWith(LogType.INFO, undefined, `2 file(s) packaged:`);
            logSpy.getCall(3).should.have.been.calledWith(LogType.INFO, undefined, `- src/build.gradle`);
            logSpy.getCall(4).should.have.been.calledWith(LogType.INFO, undefined, `- src/chaincode.java`);
            executeTaskStub.should.have.been.calledOnceWithExactly(buildTasks[testIndex]);
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('packageCommand');
        });

        it('should package the Java (Gradle) project with specified name and version', async () => {
            await createTestFiles('javaProject', '0.0.1', 'java-gradle', true, false);

            const testIndex: number = 3;

            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.onFirstCall().resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            showInputStub.onFirstCall().resolves('dogechain');
            showInputStub.onSecondCall().resolves('1.2.3');

            await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT, null, 'dogechain', '1.2.3');

            const pkgFile: string = path.join(fileDest, 'dogechain@1.2.3.cds');

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'packageSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, `Smart Contract packaged: ${pkgFile}`);
            logSpy.getCall(2).should.have.been.calledWith(LogType.INFO, undefined, `2 file(s) packaged:`);
            logSpy.getCall(3).should.have.been.calledWith(LogType.INFO, undefined, `- src/build.gradle`);
            logSpy.getCall(4).should.have.been.calledWith(LogType.INFO, undefined, `- src/chaincode.java`);
            executeTaskStub.should.have.been.calledOnceWithExactly(buildTasks[testIndex]);
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('packageCommand');
        });

        it('should package the Java (Maven) project', async () => {
            await createTestFiles('javaProject', '0.0.1', 'java-maven', true, false);

            const testIndex: number = 3;

            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.onFirstCall().resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            showInputStub.onFirstCall().resolves('myProject');
            showInputStub.onSecondCall().resolves('0.0.3');

            await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT);

            const pkgFile: string = path.join(fileDest, 'myProject@0.0.3.cds');

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'packageSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, `Smart Contract packaged: ${pkgFile}`);
            logSpy.getCall(2).should.have.been.calledWith(LogType.INFO, undefined, `2 file(s) packaged:`);
            logSpy.getCall(3).should.have.been.calledWith(LogType.INFO, undefined, `- src/chaincode.java`);
            logSpy.getCall(4).should.have.been.calledWith(LogType.INFO, undefined, `- src/pom.xml`);
            executeTaskStub.should.have.been.calledOnceWithExactly(buildTasks[testIndex]);
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('packageCommand');
        });

        it('should throw an error as the package json does not contain a name or version', async () => {
            await createTestFiles('javascriptProject', '0.0.1', 'javascript', true, false);

            const testIndex: number = 0;
            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.onFirstCall().resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            const packageDir: string = path.join(fileDest, folders[testIndex].name + '@0.0.1');

            await TestUtil.deleteTestFiles(path.join(javascriptPath, '/package.json'));
            await fs.writeFile(path.join(javascriptPath, '/package.json'), emptyContent);
            await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT);

            const smartContractExists: boolean = await fs.pathExists(packageDir);
            smartContractExists.should.be.false;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'packageSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Please enter a package name and/or package version into your package.json`);
            logSpy.should.have.been.calledTwice;
            sendTelemetryEventStub.should.not.have.been.called;
        });

        it('should throw an error as the project does not contain a chaincode file', async () => {
            await createTestFiles('javascriptProject', '0.0.1', 'javascript', true, false);

            const testIndex: number = 0;

            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.onFirstCall().resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });
            const packageDir: string = path.join(fileDest, folders[testIndex].name + '@0.0.1');
            await TestUtil.deleteTestFiles(path.join(javascriptPath, '/package.json'));
            await TestUtil.deleteTestFiles(path.join(javascriptPath, '/chaincode.js'));

            await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT);

            const smartContractExists: boolean = await fs.pathExists(packageDir);
            smartContractExists.should.be.false;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'packageSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Failed to determine workspace language type, supported languages are JavaScript, TypeScript, Go and Java. Please ensure your contract's root-level directory is open in the Explorer.`);
            logSpy.should.have.been.calledTwice;
        });

        it('should throw an error if the JavaScript project already exists', async () => {
            await createTestFiles('javascriptProject', '0.0.1', 'javascript', true, false);

            const testIndex: number = 0;
            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.{js,ts,go,java,kt}'), '**/node_modules/**', 1).resolves([vscode.Uri.file('chaincode.js')]);

            await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT);

            const error: Error = new Error('Package with name and version already exists. Please change the name and/or the version of the project in your package.json file.');
            await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT);

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'packageSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, `Smart Contract packaged: ${path.join(extDir, 'packages', 'javascriptProject@0.0.1.cds')}`);
            logSpy.getCall(2).should.have.been.calledWith(LogType.INFO, undefined, `2 file(s) packaged:`);
            logSpy.getCall(3).should.have.been.calledWith(LogType.INFO, undefined, `- src/chaincode.js`);
            logSpy.getCall(4).should.have.been.calledWith(LogType.INFO, undefined, `- src/package.json`);
            logSpy.getCall(5).should.have.been.calledWith(LogType.INFO, undefined, 'packageSmartContract');
            logSpy.getCall(6).should.have.been.calledWith(LogType.ERROR, error.message, error.toString());
            logSpy.callCount.should.equal(7);
        });

        it('should throw an error as the Go project already exists', async () => {
            await createTestFiles('goProject', '0.0.1', 'golang', true, false);

            const testIndex: number = 2;
            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.go'), null, 1).resolves([vscode.Uri.file('chaincode.go')]);

            showInputStub.onFirstCall().resolves('myProject');
            showInputStub.onSecondCall().resolves('0.0.3');
            showInputStub.onThirdCall().resolves('myProject');
            showInputStub.onCall(3).resolves('0.0.3');

            await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT);

            const error: Error = new Error('Package with name and version already exists. Please input a different name or version for your Go project.');

            await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT);
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'packageSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, `Smart Contract packaged: ${path.join(extDir, 'packages', 'myProject@0.0.3.cds')}`);
            logSpy.getCall(2).should.have.been.calledWith(LogType.INFO, undefined, `1 file(s) packaged:`);
            logSpy.getCall(3).should.have.been.calledWith(LogType.INFO, undefined, `- src/goProject/chaincode.go`);
            logSpy.getCall(4).should.have.been.calledWith(LogType.INFO, undefined, 'packageSmartContract');
            logSpy.getCall(5).should.have.been.calledWith(LogType.ERROR, error.message, error.toString());
            logSpy.callCount.should.equal(6);
        });

        it('should throw an error as the Java project already exists', async () => {
            await createTestFiles('javaProject', '0.0.1', 'java-gradle', true, false);

            const testIndex: number = 3;
            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            showInputStub.onFirstCall().resolves('myProject');
            showInputStub.onSecondCall().resolves('0.0.3');
            showInputStub.onThirdCall().resolves('myProject');
            showInputStub.onCall(3).resolves('0.0.3');

            await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT);

            const error: Error = new Error('Package with name and version already exists. Please input a different name or version for your Java project.');

            await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT);
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'packageSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, `Smart Contract packaged: ${path.join(extDir, 'packages', 'myProject@0.0.3.cds')}`);
            logSpy.getCall(2).should.have.been.calledWith(LogType.INFO, undefined, `2 file(s) packaged:`);
            logSpy.getCall(3).should.have.been.calledWith(LogType.INFO, undefined, `- src/build.gradle`);
            logSpy.getCall(4).should.have.been.calledWith(LogType.INFO, undefined, `- src/chaincode.java`);
            logSpy.getCall(5).should.have.been.calledWith(LogType.INFO, undefined, 'packageSmartContract');
            logSpy.getCall(6).should.have.been.calledWith(LogType.ERROR, error.message, error.toString());
            logSpy.callCount.should.equal(7);
        });

        it('should throw an error if project not under src dir', async () => {
            await createTestFiles('goProject', '0.0.1', 'golang', false, false, true);
            const error: Error = new Error('The environment variable GOPATH has not been set, and the extension was not able to automatically detect the correct value. You cannot package a Go smart contract without setting the environment variable GOPATH.');

            const testIndex: number = 2;
            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.go'), null, 1).resolves([vscode.Uri.file('chaincode.go')]);

            showInputStub.onFirstCall().resolves('myProject');
            showInputStub.onSecondCall().resolves('0.0.3');
            showInputStub.onThirdCall().resolves('myProject');
            showInputStub.onCall(3).resolves('0.0.3');

            await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT);
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'packageSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, error.message, error.toString());
            logSpy.should.have.been.calledTwice;
        });

        it('should package if project is under src dir but not its child', async () => {
            await createTestFiles('goProject', '0.0.1', 'golang', true, false, false, false);
            const testIndex: number = 5;
            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.go'), null, 1).resolves([vscode.Uri.file('chaincode.go')]);

            showInputStub.onFirstCall().resolves('myProject');
            showInputStub.onSecondCall().resolves('0.0.3');
            showInputStub.onThirdCall().resolves('myProject');
            showInputStub.onCall(3).resolves('0.0.3');

            await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT);

            const pkgFile: string = path.join(fileDest, 'myProject@0.0.3.cds');

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'packageSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, `Smart Contract packaged: ${pkgFile}`);
            logSpy.getCall(2).should.have.been.calledWith(LogType.INFO, undefined, `1 file(s) packaged:`);
            logSpy.getCall(3).should.have.been.calledWith(LogType.INFO, undefined, `- src/some/path/goProject/chaincode.go`);
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('packageCommand');
        });

        it('should throw an error if the GOPATH environment variable is set to the project directory', async () => {
            await createTestFiles('goProject', '0.0.1', 'golang', true, false);
            const error: Error = new Error('The Go smart contract is not a subdirectory of the path specified by the environment variable GOPATH. Please correct the environment variable GOPATH.');

            const testIndex: number = 2;
            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.go'), null, 1).resolves([vscode.Uri.file('chaincode.go')]);

            showInputStub.onFirstCall().resolves('myProject');
            showInputStub.onSecondCall().resolves('0.0.3');
            showInputStub.onThirdCall().resolves('myProject');
            showInputStub.onCall(3).resolves('0.0.3');

            process.env.GOPATH = golangPath;
            await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT);
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'packageSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, error.message, error.toString());
            logSpy.should.have.been.calledTwice;
        });

        it('should throw an error if the project directory is not inside the directory specified by the GOPATH environment variable ', async () => {
            await createTestFiles('goProject', '0.0.1', 'golang', true, false);
            const error: Error = new Error('The Go smart contract is not a subdirectory of the path specified by the environment variable GOPATH. Please correct the environment variable GOPATH.');

            const testIndex: number = 2;
            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.go'), null, 1).resolves([vscode.Uri.file('chaincode.go')]);

            showInputStub.onFirstCall().resolves('myProject');
            showInputStub.onSecondCall().resolves('0.0.3');
            showInputStub.onThirdCall().resolves('myProject');
            showInputStub.onCall(3).resolves('0.0.3');

            process.env.GOPATH = javascriptPath;
            await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT);
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'packageSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, error.message, error.toString());
            logSpy.should.have.been.calledTwice;
        });

        it('should throw an error if the GOPATH environment variable is set to the root directory', async () => {
            await createTestFiles('goProject', '0.0.1', 'golang', true, false);
            const error: Error = new Error('The Go smart contract is not a subdirectory of the path specified by the environment variable GOPATH. Please correct the environment variable GOPATH.');

            const testIndex: number = 2;
            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.go'), null, 1).resolves([vscode.Uri.file('chaincode.go')]);

            showInputStub.onFirstCall().resolves('myProject');
            showInputStub.onSecondCall().resolves('0.0.3');
            showInputStub.onThirdCall().resolves('myProject');
            showInputStub.onCall(3).resolves('0.0.3');

            process.env.GOPATH = path.resolve('/');
            await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT);
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'packageSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, error.message, error.toString());
            logSpy.should.have.been.calledTwice;
        });

        it('should package if GOPATH contains multiple paths and one of them is right for the project', async () => {
            await createTestFiles('goProject', '0.0.1', 'golang', true, false);

            const testIndex: number = 2;
            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.go'), null, 1).resolves([vscode.Uri.file('chaincode.go')]);

            showInputStub.onFirstCall().resolves('myProject');
            showInputStub.onSecondCall().resolves('0.0.3');
            showInputStub.onThirdCall().resolves('myProject');
            showInputStub.onCall(3).resolves('0.0.3');

            process.env.GOPATH = path.join('/', 'other', 'path') + path.delimiter + testWorkspace;
            await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT);

            const pkgFile: string = path.join(fileDest, 'myProject@0.0.3.cds');

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'packageSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, `Smart Contract packaged: ${pkgFile}`);
            logSpy.getCall(2).should.have.been.calledWith(LogType.INFO, undefined, `1 file(s) packaged:`);
            logSpy.getCall(3).should.have.been.calledWith(LogType.INFO, undefined, `- src/goProject/chaincode.go`);
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('packageCommand');
            process.env.GOPATH.should.equal(path.join('/', 'other', 'path') + path.delimiter + testWorkspace);
        });

        it('should error if GOPATH contains multiple paths and none of them is right for the project', async () => {
            await createTestFiles('goProject', '0.0.1', 'golang', true, false);
            const error: Error = new Error('The Go smart contract is not a subdirectory of the path specified by the environment variable GOPATH. Please correct the environment variable GOPATH.');

            const testIndex: number = 2;
            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.go'), null, 1).resolves([vscode.Uri.file('chaincode.go')]);

            showInputStub.onFirstCall().resolves('myProject');
            showInputStub.onSecondCall().resolves('0.0.3');
            showInputStub.onThirdCall().resolves('myProject');
            showInputStub.onCall(3).resolves('0.0.3');

            process.env.GOPATH = path.resolve(path.join('/', 'other', 'path') + path.delimiter + path.join(testWorkspace, '..'));
            await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT);
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'packageSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, error.message, error.toString());
            logSpy.should.have.been.calledTwice;
        });

        it('should error if there is no src directory in the working directory', async () => {
            await createTestFiles('goProject', '0.0.1', 'golang', true, false, true);
            const error: Error = new Error('The Go smart contract is not a subdirectory of the path specified by the environment variable GOPATH. Please correct the environment variable GOPATH.');

            const testIndex: number = 2;
            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.go'), null, 1).resolves([vscode.Uri.file('chaincode.go')]);

            showInputStub.onFirstCall().resolves('myProject');
            showInputStub.onSecondCall().resolves('0.0.3');
            showInputStub.onThirdCall().resolves('myProject');
            showInputStub.onCall(3).resolves('0.0.3');

            process.env.GOPATH = path.resolve(path.join('/', 'other', 'path') + path.delimiter + path.join(testWorkspace, '..'));
            await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT);
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'packageSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, error.message, error.toString());
            logSpy.should.have.been.calledTwice;
        });

        it('should run execute the refreshEntry command', async () => {
            await createTestFiles('javascriptProject', '0.0.1', 'javascript', true, false);

            const testIndex: number = 0;
            const commandSpy: sinon.SinonSpy = mySandBox.spy(vscode.commands, 'executeCommand');
            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.onFirstCall().resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT);
            commandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_PACKAGES);
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'packageSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, `Smart Contract packaged: ${path.join(extDir, 'packages', 'javascriptProject@0.0.1.cds')}`);
            logSpy.getCall(2).should.have.been.calledWith(LogType.INFO, undefined, `2 file(s) packaged:`);
            logSpy.getCall(3).should.have.been.calledWith(LogType.INFO, undefined, `- src/chaincode.js`);
            logSpy.getCall(4).should.have.been.calledWith(LogType.INFO, undefined, `- src/package.json`);
            logSpy.callCount.should.equal(5);
        });

        it('should not show package chooser when only one folder', async () => {
            await createTestFiles('javascriptProject', '0.0.1', 'javascript', true, false);
            const testIndex: number = 0;

            folders.splice(1, folders.length - 1);

            workspaceFoldersStub.returns(folders);

            await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT);

            showWorkspaceQuickPickStub.should.not.have.been.called;

            const pkgFile: string = path.join(fileDest, folders[testIndex].name + '@0.0.1.cds');

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'packageSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, `Smart Contract packaged: ${pkgFile}`);
            logSpy.getCall(2).should.have.been.calledWith(LogType.INFO, undefined, `2 file(s) packaged:`);
            logSpy.getCall(3).should.have.been.calledWith(LogType.INFO, undefined, `- src/chaincode.js`);
            logSpy.getCall(4).should.have.been.calledWith(LogType.INFO, undefined, `- src/package.json`);
            logSpy.callCount.should.equal(5);
        });

        it('should handle error from get workspace folders', async () => {
            await createTestFiles('javascriptProject', '0.0.1', 'javascript', true, false);

            folders.splice(1, folders.length - 1);

            workspaceFoldersStub.returns([]);
            const error: Error = new Error('Issue determining available smart contracts. Please open the smart contract you want to package.');

            await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT);

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'packageSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, error.message, error.toString());
            logSpy.should.have.been.calledTwice;
        });

        it('should handle not choosing folder', async () => {
            await createTestFiles('javascriptProject', '0.0.1', 'javascript', true, false);

            const testIndex: number = 0;
            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.resolves();

            const packageDir: string = path.join(fileDest, folders[testIndex].name + '@0.0.1');

            await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT);

            const smartContractExists: boolean = await fs.pathExists(packageDir);

            smartContractExists.should.equal(false);
            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'packageSmartContract');
        });

        it('should handle cancelling the input box for the Go project name', async () => {
            await createTestFiles('goProject', '0.0.1', 'golang', true, false);

            const testIndex: number = 2;

            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.onFirstCall().resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });
            const packageDir: string = path.join(fileDest, 'myProject' + '@0.0.1');

            showInputStub.onFirstCall().resolves();

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.go'), null, 1).resolves([vscode.Uri.file('chaincode.go')]);

            await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT);

            const smartContractExists: boolean = await fs.pathExists(packageDir);

            smartContractExists.should.equal(false);
            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'packageSmartContract');
        });

        it('should handle cancelling the input box for the Go project version', async () => {
            await createTestFiles('goProject', '0.0.1', 'golang', true, false);

            const testIndex: number = 2;

            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.onFirstCall().resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });
            const packageDir: string = path.join(fileDest, 'myProject' + '@0.0.1');

            showInputStub.onFirstCall().resolves('myProject');
            showInputStub.onSecondCall().resolves();

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.go'), null, 1).resolves([vscode.Uri.file('chaincode.go')]);

            await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT);

            const smartContractExists: boolean = await fs.pathExists(packageDir);

            smartContractExists.should.equal(false);
            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'packageSmartContract');
        });

        it('should handle cancelling the input box for the Java project name', async () => {
            await createTestFiles('javaProject', '0.0.1', 'java-gradle', true, false);

            const testIndex: number = 3;

            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.onFirstCall().resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });
            const packageDir: string = path.join(fileDest, 'myProject' + '@0.0.1');

            showInputStub.onFirstCall().resolves();

            await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT);

            const smartContractExists: boolean = await fs.pathExists(packageDir);

            smartContractExists.should.equal(false);
            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'packageSmartContract');
        });

        it('should handle cancelling the input box for the Java project version', async () => {
            await createTestFiles('javaProject', '0.0.1', 'java-gradle', true, false);

            const testIndex: number = 3;

            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.onFirstCall().resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });
            const packageDir: string = path.join(fileDest, 'myProject' + '@0.0.1');

            showInputStub.onFirstCall().resolves('myProject');
            showInputStub.onSecondCall().resolves();

            await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT);

            const smartContractExists: boolean = await fs.pathExists(packageDir);

            smartContractExists.should.equal(false);
            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'packageSmartContract');

        });

        it('should package a smart contract given a project workspace', async () => {
            await createTestFiles('javascriptProject', '0.0.1', 'javascript', true, false);
            const testIndex: number = 0;

            const workspaceFolderMock: vscode.WorkspaceFolder = { name: 'javascriptProject', uri: vscode.Uri.file(javascriptPath) } as vscode.WorkspaceFolder;

            await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT, workspaceFolderMock);

            workspaceFoldersStub.should.not.have.been.called;
            showWorkspaceQuickPickStub.should.not.have.been.called;

            const pkgFile: string = path.join(fileDest, folders[testIndex].name + '@0.0.1.cds');

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'packageSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, `Smart Contract packaged: ${pkgFile}`);
            logSpy.getCall(2).should.have.been.calledWith(LogType.INFO, undefined, `2 file(s) packaged:`);
            logSpy.getCall(3).should.have.been.calledWith(LogType.INFO, undefined, `- src/chaincode.js`);
            logSpy.getCall(4).should.have.been.calledWith(LogType.INFO, undefined, `- src/package.json`);
            logSpy.callCount.should.equal(5);
            executeTaskStub.should.have.not.been.called;
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('packageCommand');
        });

        it('should throw an error if there are errors in project', async () => {
            await createTestFiles('typescriptProject', '0.0.1', 'typescript', true, false);

            const packageDir: string = path.join(fileDest, 'typescriptProject' + '@0.0.1');

            const testIndex: number = 1;
            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.onFirstCall().resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            const uri: vscode.Uri = vscode.Uri.file(path.join(folders[testIndex].uri.fsPath, 'src'));
            const mockDiagnostics: any = [[uri, [{ severity: 0 }]]];
            mySandBox.stub(vscode.languages, 'getDiagnostics').returns(mockDiagnostics);

            await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT);

            const smartContractExists: boolean = await fs.pathExists(packageDir);

            smartContractExists.should.equal(false);
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'packageSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Smart contract project has errors please fix them before packaging`);
            executeTaskStub.should.have.been.called;
        });

        it('should only throw error if there are errors', async () => {
            await createTestFiles('javascriptProject', '0.0.1', 'javascript', true, false);

            const testIndex: number = 0;
            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.onFirstCall().resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            const uri: vscode.Uri = vscode.Uri.file(path.join(folders[testIndex].uri.fsPath, 'src'));
            const mockDiagnostics: any = [[uri, [{ severity: 1 }]]];
            mySandBox.stub(vscode.languages, 'getDiagnostics').returns(mockDiagnostics);

            await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT);

            const pkgFile: string = path.join(fileDest, folders[testIndex].name + '@0.0.1.cds');

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'packageSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, `Smart Contract packaged: ${pkgFile}`);
            executeTaskStub.should.have.not.been.called;
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('packageCommand');
        });

        it('should ignore if errors in another project', async () => {
            await createTestFiles('javascriptProject', '0.0.1', 'javascript', true, false);

            const testIndex: number = 0;
            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.onFirstCall().resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            const uri: vscode.Uri = vscode.Uri.file('src');
            const mockDiagnostics: any = [[uri, [{ severity: 0 }]]];
            mySandBox.stub(vscode.languages, 'getDiagnostics').returns(mockDiagnostics);

            await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT);

            const pkgFile: string = path.join(fileDest, folders[testIndex].name + '@0.0.1.cds');

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'packageSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, `Smart Contract packaged: ${pkgFile}`);
            executeTaskStub.should.have.not.been.called;
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('packageCommand');
        });

        it('should throw an error if the package has an invalid name', async () => {
            await createTestFiles('  invalid package name! ', '0.0.1', 'typescript', true, false);

            const testIndex: number = 4;
            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.onFirstCall().resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT);

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'packageSmartContract');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Invalid package.json name. Name can only include alphanumeric, "_" and "-" characters.`);

            executeTaskStub.should.not.have.been.calledOnceWithExactly(buildTasks[testIndex]);
            sendTelemetryEventStub.should.not.have.been.calledOnceWithExactly('packageCommand');
        });
    });
});
