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

chai.should();
chai.use(sinonChai);
// tslint:disable no-unused-expression
describe('packageSmartContract', () => {
    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();
    let errorSpy: sinon.SinonSpy;
    let informationSpy: sinon.SinonSpy;
    let showInputStub: sinon.SinonStub;
    let workspaceFoldersStub: sinon.SinonStub;
    let showWorkspaceQuickPickStub: sinon.SinonStub;
    const rootPath: string = path.dirname(__dirname);
    const fileDest: string = path.join(rootPath, '../../test/data/packageContractDir');
    const testWorkspace: string = path.join(rootPath, '../../test/data/testWorkspace');
    const javascriptPath: string = path.join(rootPath, '../../test/data/testWorkspace/javascriptProject');
    const typescriptPath: string = path.join(rootPath, '../../test/data/testWorkspace/typescriptProject');
    const emptyContent: string = '{}';

    let findFilesStub: sinon.SinonStub;

    const golangPath: string = path.join(rootPath, '../../test/data/testWorkspace/goProject');
    const folders: Array<any> = [];
    const languages: Array<string> = [
        '/javascript/',
        '/typescript/',
        '/go/src/'
    ];

    async function createTestFiles(packageName: string, version: string, language: string, createValid: boolean): Promise<void> {
        const workspaceDir: string = path.join(rootPath, '../../test/data/testWorkspace/' + packageName);

        try {
            await fs.mkdirp(workspaceDir);
        } catch (error) {
            console.log(error);
        }

        if (createValid) {
            if (language !== 'golang') {
                const packageJsonFile: string = workspaceDir + '/package.json';
                const jsChaincode: string = workspaceDir + '/chaincode.js';
                const jsonContent: any = {
                    name: `${packageName}`,
                    version: version,
                    description: 'My Smart Contract',
                    author: 'John Doe',
                    license: 'Apache-2.0'
                };
                if (language === 'typescript') {
                    const textFile: string = workspaceDir + '/chaincode.ts';
                    await fs.writeFile(textFile, emptyContent);
                }
                await fs.writeFile(jsChaincode, emptyContent);
                await fs.writeFile(packageJsonFile, JSON.stringify(jsonContent));
            } else if (language === 'golang') {
                const goChaincode: string = workspaceDir + '/chaincode.go';
                await fs.writeFile(goChaincode, emptyContent);
            }
        } else {
            const textFile: string = workspaceDir + '/text.txt';
            const content: string = 'hello';
            await fs.writeFile(textFile, content);
        }
    }

    before(async () => {
        await TestUtil.setupTests();
        await TestUtil.storePackageDirectoryConfig();
        await fs.mkdirp(fileDest);
    });

    after(async () => {
        await TestUtil.restorePackageDirectoryConfig();
    });

    describe('#packageSmartContract', () => {

        beforeEach(async () => {
            await TestUtil.deleteTestFiles(fileDest);
            await TestUtil.deleteTestFiles(testWorkspace);

            folders.push(...[
                {name: 'javascriptProject', uri: vscode.Uri.file(javascriptPath)},
                {name: 'typescriptProject', uri: vscode.Uri.file(typescriptPath)},
                {name: 'goProject', uri: vscode.Uri.file(golangPath)}
            ]);

            errorSpy = mySandBox.spy(vscode.window, 'showErrorMessage');
            showInputStub = mySandBox.stub(UserInputUtil, 'showInputBox');
            showWorkspaceQuickPickStub = mySandBox.stub(UserInputUtil, 'showWorkspaceQuickPickBox');
            workspaceFoldersStub = mySandBox.stub(UserInputUtil, 'getWorkspaceFolders');
            informationSpy = mySandBox.spy(vscode.window, 'showInformationMessage');
            await vscode.workspace.getConfiguration().update('fabric.package.directory', fileDest, true);

            findFilesStub = mySandBox.stub(vscode.workspace, 'findFiles').resolves([]);
        });

        afterEach(async () => {
            await TestUtil.deleteTestFiles(fileDest);
            await TestUtil.deleteTestFiles(testWorkspace);
            mySandBox.restore();
        });

        it('should package the javascript project', async () => {
            await createTestFiles('javascriptProject', '0.0.1', 'javascript', true);
            const testIndex: number = 0;
            const language: string = languages[testIndex];

            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.onFirstCall().resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });
            const packageDir: string = path.join(fileDest + language, folders[testIndex].name + '@0.0.1');

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.js')).resolves([vscode.Uri.file('chaincode.js')]);

            await vscode.commands.executeCommand('blockchainAPackageExplorer.packageSmartContractProjectEntry');

            const packageJSONDir: string = path.join(packageDir, '/package.json');
            const smartContractEntities: string = path.join(packageDir, '/chaincode.js');
            const smartContractExists: boolean = await fs.pathExists(packageDir);
            const packageJSONExists: boolean = await fs.pathExists(packageJSONDir);
            const smartContractContains: boolean = await fs.pathExists(smartContractEntities);
            const fileContents: string = await fs.readFile(packageJSONDir, 'utf8');
            const packageJSON: any = JSON.parse(fileContents);
            smartContractExists.should.equal(true, 'Smart Contract does not exist');
            packageJSONExists.should.equal(true, 'javascript packageJSON does not exist');
            smartContractContains.should.equal(true, 'javascript chaincode file does not exist');
            errorSpy.should.not.have.been.called;
            packageJSON.name.should.equal('javascriptProject');
            packageJSON.version.should.equal('0.0.1');
            packageJSON.description.should.equal('My Smart Contract');
            packageJSON.author.should.equal('John Doe');
            packageJSON.license.should.equal('Apache-2.0');
            informationSpy.should.have.been.calledOnce;
        }).timeout(4000);

        it('should package the typescript project', async () => {
            await createTestFiles('typescriptProject', '0.0.1', 'typescript', true);

            const testIndex: number = 1;
            const language: string = languages[testIndex];
            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.onFirstCall().resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });
            const packageDir: string = path.join(fileDest + language, folders[testIndex].name + '@0.0.1');

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.ts'), '**/node_modules/**', 1).resolves([vscode.Uri.file('chaincode.ts')]);
            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.js'), '**/node_modules/**', 1).resolves([vscode.Uri.file('chaincode.js')]);

            await vscode.commands.executeCommand('blockchainAPackageExplorer.packageSmartContractProjectEntry');

            const packageJSONDir: string = path.join(packageDir, '/package.json');
            const smartContractExists: boolean = await fs.pathExists(packageDir);
            const packageJSONExists: boolean = await fs.pathExists(packageJSONDir);
            const smartContractEntities: string = path.join(packageDir, '/chaincode.js');
            const smartContractEntities2: string = path.join(packageDir, '/chaincode.ts');
            const smartContractContains: boolean = await fs.pathExists(smartContractEntities);
            const smartContractContains2: boolean = await fs.pathExists(smartContractEntities2);
            const fileContents: string = await fs.readFile(packageJSONDir, 'utf8');
            const packageJSON: any = JSON.parse(fileContents);

            smartContractExists.should.equal(true, 'Smart Contract does not exist');
            packageJSONExists.should.equal(true, 'typescript packageJSON does not exist');
            smartContractContains.should.equal(true, 'Compiled javascript chaincode file does not exist');
            smartContractContains2.should.equal(true, 'typescript chaincode file does not exist');
            errorSpy.should.not.have.been.called;
            packageJSON.name.should.equal('typescriptProject');
            packageJSON.version.should.equal('0.0.1');
            packageJSON.description.should.equal('My Smart Contract');
            packageJSON.author.should.equal('John Doe');
            packageJSON.license.should.equal('Apache-2.0');
            informationSpy.should.have.been.calledOnce;
        }).timeout(4000);

        it('should package the golang project', async () => {
            await createTestFiles('goProject', '0.0.1', 'golang', true);

            const testIndex: number = 2;
            const language: string = languages[testIndex];

            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.onFirstCall().resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });
            const packageDir: string = path.join(fileDest + language, 'myProject' + '@0.0.3');

            showInputStub.onFirstCall().resolves('myProject');
            showInputStub.onSecondCall().resolves('0.0.3');

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.go'), '**/node_modules/**', 1).resolves([vscode.Uri.file('chaincode.go')]);

            await vscode.commands.executeCommand('blockchainAPackageExplorer.packageSmartContractProjectEntry');

            const smartContractExists: boolean = await fs.pathExists(packageDir);
            const smartContractEntities: string = path.join(packageDir, '/chaincode.go');
            const smartContractContains: boolean = await fs.pathExists(smartContractEntities);

            smartContractExists.should.equal(true, 'Smart Contract does not exist');
            smartContractContains.should.equal(true, 'golang chaincode file does not exist');
            informationSpy.should.have.been.calledOnce;
            errorSpy.should.not.have.been.called;
        }).timeout(4000);

        it('should throw an error as the package json does not contain a name or version', async () => {
            await createTestFiles('javascriptProject', '0.0.1', 'javascript', true);

            const testIndex: number = 0;
            const language: string = languages[testIndex];
            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.onFirstCall().resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.js'), '**/node_modules/**', 1).resolves([vscode.Uri.file('chaincode.js')]);

            const packageDir: string = path.join(fileDest + language, folders[testIndex].name + '@0.0.1');

            await TestUtil.deleteTestFiles(path.join(javascriptPath, '/package.json'));
            await fs.writeFile(path.join(javascriptPath, '/package.json'), emptyContent);
            await vscode.commands.executeCommand('blockchainAPackageExplorer.packageSmartContractProjectEntry');

            const smartContractExists: boolean = await fs.pathExists(packageDir);

            smartContractExists.should.be.false;
            errorSpy.should.have.been.calledWith('Please enter a package name and/or package version into your package.json');
            informationSpy.should.not.have.been.called;
        }).timeout(4000);

        it('should throw an error as the project does not contain a chaincode file', async () => {
            await createTestFiles('javascriptProject', '0.0.1', 'javascript', true);

            const testIndex: number = 0;
            const language: string = languages[testIndex];

            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.onFirstCall().resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });
            const packageDir: string = path.join(fileDest + language, folders[testIndex].name + '@0.0.1');
            await TestUtil.deleteTestFiles(path.join(javascriptPath, '/chaincode.js'));

            await vscode.commands.executeCommand('blockchainAPackageExplorer.packageSmartContractProjectEntry');

            const smartContractExists: boolean = await fs.pathExists(packageDir);
            smartContractExists.should.be.false;
            errorSpy.should.have.been.calledWith('Failed to determine workspace language type, supported languages are javascript, typescript, and go');
            informationSpy.should.not.have.been.called;
        }).timeout(4000);

        it('should throw an error if the project already exists', async () => {
            await createTestFiles('javascriptProject', '0.0.1', 'javascript', true);

            const testIndex: number = 0;
            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.js'), '**/node_modules/**', 1).resolves([vscode.Uri.file('chaincode.js')]);

            await vscode.commands.executeCommand('blockchainAPackageExplorer.packageSmartContractProjectEntry');

            await vscode.commands.executeCommand('blockchainAPackageExplorer.packageSmartContractProjectEntry');

            errorSpy.should.have.been.calledWith('Error: Package with name and version already exists. Please change the name and/or the version of the project in your package.json file.');
        }).timeout(4000);

        it('should throw an error as the go project already exists', async () => {
            await createTestFiles('goProject', '0.0.1', 'golang', true);

            const testIndex: number = 0;
            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.go'), '**/node_modules/**', 1).resolves([vscode.Uri.file('chaincode.go')]);

            showInputStub.onFirstCall().resolves('myProject');
            showInputStub.onSecondCall().resolves('0.0.3');
            showInputStub.onThirdCall().resolves('myProject');
            showInputStub.onCall(3).resolves('0.0.3');

            await vscode.commands.executeCommand('blockchainAPackageExplorer.packageSmartContractProjectEntry');

            await vscode.commands.executeCommand('blockchainAPackageExplorer.packageSmartContractProjectEntry');

            errorSpy.should.have.been.calledWith('Error: Package with name and version already exists. Please input a different name or version for your go project.');
        }).timeout(4000);

        it('should fail packaging the typescript project as there is no compiled chaincode.js file', async () => {
            await createTestFiles('typescriptProject', '0.0.1', 'typescript', true);

            const testIndex: number = 1;
            const language: string = languages[testIndex];
            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.onFirstCall().resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.ts'), '**/node_modules/**', 1).resolves([vscode.Uri.file('chaincode.ts')]);

            const packageDir: string = path.join(fileDest + language, folders[testIndex].name + '@0.0.1');

            await TestUtil.deleteTestFiles(path.join(typescriptPath, '/chaincode.js'));

            await vscode.commands.executeCommand('blockchainAPackageExplorer.packageSmartContractProjectEntry');

            const smartContractExists: boolean = await fs.pathExists(packageDir);

            smartContractExists.should.be.false;
            errorSpy.should.have.been.called;
            informationSpy.should.not.have.been.called;
        }).timeout(4000);

        it('should run execute the refreshEntry command', async () => {
            await createTestFiles('javascriptProject', '0.0.1', 'javascript', true);

            const testIndex: number = 0;
            const commandSpy: sinon.SinonSpy = mySandBox.spy(vscode.commands, 'executeCommand');
            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.onFirstCall().resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.js'), '**/node_modules/**', 1).resolves([vscode.Uri.file('chaincode.js')]);

            await vscode.commands.executeCommand('blockchainAPackageExplorer.packageSmartContractProjectEntry');
            commandSpy.should.have.been.calledWith('blockchainAPackageExplorer.refreshEntry');
        });

        it('should not show package chooser when only one folder', async () => {
            await createTestFiles('javascriptProject', '0.0.1', 'javascript', true);
            const testIndex: number = 0;
            const language: string = languages[testIndex];

            folders.splice(1, folders.length - 1);

            workspaceFoldersStub.returns(folders);

            const packageDir: string = path.join(fileDest + language, folders[testIndex].name + '@0.0.1');

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.js'), '**/node_modules/**', 1).resolves([vscode.Uri.file('chaincode.js')]);

            await vscode.commands.executeCommand('blockchainAPackageExplorer.packageSmartContractProjectEntry');

            showWorkspaceQuickPickStub.should.not.have.been.called;

            const packageJSONDir: string = path.join(packageDir, '/package.json');
            const smartContractEntities: string = path.join(packageDir, '/chaincode.js');
            const smartContractExists: boolean = await fs.pathExists(packageDir);
            const packageJSONExists: boolean = await fs.pathExists(packageJSONDir);
            const smartContractContains: boolean = await fs.pathExists(smartContractEntities);
            const fileContents: string = await fs.readFile(packageJSONDir, 'utf8');
            const packageJSON: any = JSON.parse(fileContents);
            smartContractExists.should.equal(true, 'Smart Contract does not exist');
            packageJSONExists.should.equal(true, 'javascript packageJSON does not exist');
            smartContractContains.should.equal(true, 'javascript chaincode file does not exist');
            errorSpy.should.not.have.been.called;
            packageJSON.name.should.equal('javascriptProject');
            packageJSON.version.should.equal('0.0.1');
            packageJSON.description.should.equal('My Smart Contract');
            packageJSON.author.should.equal('John Doe');
            packageJSON.license.should.equal('Apache-2.0');
            informationSpy.should.have.been.calledOnce;
        }).timeout(4000);

        it('should handle error from get workspace folders', async () => {
            await createTestFiles('javascriptProject', '0.0.1', 'javascript', true);
            const testIndex: number = 0;

            folders.splice(1, folders.length - 1);

            workspaceFoldersStub.throws({message: 'some error'});

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.js'), '**/node_modules/**', 1).resolves([vscode.Uri.file('chaincode.js')]);

            await vscode.commands.executeCommand('blockchainAPackageExplorer.packageSmartContractProjectEntry');

            errorSpy.should.have.been.calledWith('Issue determining available workspace folders some error');
        }).timeout(4000);

        it('should handle not choosing folder', async () => {
            await createTestFiles('javascriptProject', '0.0.1', 'javascript', true);

            const testIndex: number = 0;
            const language: string = languages[testIndex];
            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.resolves();

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.js'), '**/node_modules/**', 1).resolves([vscode.Uri.file('chaincode.js')]);

            const packageDir: string = path.join(fileDest + language, folders[testIndex].name + '@0.0.1');

            await vscode.commands.executeCommand('blockchainAPackageExplorer.packageSmartContractProjectEntry');

            const smartContractExists: boolean = await fs.pathExists(packageDir);

            smartContractExists.should.equal(false);
        }).timeout(4000);

        it('should handle cancel name', async () => {
            await createTestFiles('goProject', '0.0.1', 'golang', true);

            const testIndex: number = 2;
            const language: string = languages[testIndex];

            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.onFirstCall().resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });
            const packageDir: string = path.join(fileDest + language, 'myProject' + '@0.0.1');

            showInputStub.onFirstCall().resolves();

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.go'), '**/node_modules/**', 1).resolves([vscode.Uri.file('chaincode.go')]);

            await vscode.commands.executeCommand('blockchainAPackageExplorer.packageSmartContractProjectEntry');

            const smartContractExists: boolean = await fs.pathExists(packageDir);

            smartContractExists.should.equal(false);
        }).timeout(4000);

        it('should handle cancel version', async () => {
            await createTestFiles('goProject', '0.0.1', 'golang', true);

            const testIndex: number = 2;
            const language: string = languages[testIndex];

            workspaceFoldersStub.returns(folders);
            showWorkspaceQuickPickStub.onFirstCall().resolves({
                label: folders[testIndex].name,
                data: folders[testIndex]
            });
            const packageDir: string = path.join(fileDest + language, 'myProject' + '@0.0.1');

            showInputStub.onFirstCall().resolves('myProject');
            showInputStub.onSecondCall().resolves();

            findFilesStub.withArgs(new vscode.RelativePattern(folders[testIndex], '**/*.go'), '**/node_modules/**', 1).resolves([vscode.Uri.file('chaincode.go')]);

            await vscode.commands.executeCommand('blockchainAPackageExplorer.packageSmartContractProjectEntry');

            const smartContractExists: boolean = await fs.pathExists(packageDir);

            smartContractExists.should.equal(false);
        }).timeout(4000);
    });
});
