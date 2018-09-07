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
import * as vscode from 'vscode';
import * as path from 'path';
import * as child_process from 'child_process';

import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { CommandUtil } from '../../src/util/CommandUtil';
import { VSCodeOutputAdapter } from '../../src/logging/VSCodeOutputAdapter';
import { ConsoleOutputAdapter } from '../../src/logging/ConsoleOutputAdapter';
import { ExtensionUtil } from '../../src/util/ExtensionUtil';
import * as homeDir from 'home-dir';
import * as fs_extra from 'fs-extra';
import * as tmp from 'tmp';

chai.should();
chai.use(sinonChai);

// tslint:disable no-unused-expression
describe('CommandUtil Tests', () => {

    let mySandBox;
    let rootPath;
    let errorSpy;
    let USER_PACKAGE_DIRECTORY;

    before(async () => {
        USER_PACKAGE_DIRECTORY = await vscode.workspace.getConfiguration().get('fabric.package.directory');
    });

    beforeEach(() => {
        mySandBox = sinon.createSandbox();
        rootPath = path.dirname(__dirname);
        errorSpy = mySandBox.spy(vscode.window, 'showErrorMessage');

    });

    after(async () => {
        await vscode.workspace.getConfiguration().update('fabric.package.directory', USER_PACKAGE_DIRECTORY, vscode.ConfigurationTarget.Global);
    });

    afterEach(() => {
        mySandBox.restore();
    });

    describe('sendCommand', () => {
        it('should send a shell command', async () => {
            const uri: vscode.Uri = vscode.Uri.file(path.join(rootPath, '../../test'));
            const command = await CommandUtil.sendCommand('echo Hyperledgendary', uri.fsPath);
            command.should.equal('Hyperledgendary');
        });
    });

    describe('sendCommandWithProgress', () => {
        it('should send a shell command', async () => {
            const uri: vscode.Uri = vscode.Uri.file(path.join(rootPath, '../../test'));
            const command = await CommandUtil.sendCommandWithProgress('echo Hyperledgendary', uri.fsPath, 'such progress message');
            command.should.equal('Hyperledgendary');
        });
    });

    describe('sendCommandWithOutput', () => {
        it('should send a command and get output', async () => {
            const spawnSpy = mySandBox.spy(child_process, 'spawn');

            await CommandUtil.sendCommandWithOutput('echo', ['hyperlegendary']);
            spawnSpy.should.have.been.calledOnce;
            spawnSpy.should.have.been.calledWith('echo', ['hyperlegendary']);
        });

        it('should send a command and get output with cwd set', async () => {
            const spawnSpy = mySandBox.spy(child_process, 'spawn');

            await CommandUtil.sendCommandWithOutput('echo', ['hyperlegendary'], ExtensionUtil.getExtensionPath());
            spawnSpy.should.have.been.calledOnce;
            spawnSpy.should.have.been.calledWith('echo', ['hyperlegendary']);
            spawnSpy.getCall(0).args[2].cwd.should.equal(ExtensionUtil.getExtensionPath());
        });

        it('should send a command and get output with env set', async () => {
            const spawnSpy = mySandBox.spy(child_process, 'spawn');

            const env: any = Object.assign({}, process.env, {
                TEST_ENV: 'my env',
            });

            await CommandUtil.sendCommandWithOutput('echo', ['hyperlegendary'], null, env);
            spawnSpy.should.have.been.calledOnce;
            spawnSpy.should.have.been.calledWith('echo', ['hyperlegendary']);
            spawnSpy.getCall(0).args[2].env.TEST_ENV.should.equal('my env');
        });

        it('should send a command and get output with custom output adapter', async () => {
            const spawnSpy = mySandBox.spy(child_process, 'spawn');

            const output: VSCodeOutputAdapter = VSCodeOutputAdapter.instance();
            const outputSpy = mySandBox.spy(output, 'log');

            await CommandUtil.sendCommandWithOutput('echo', ['hyperlegendary'], null, null, output);
            spawnSpy.should.have.been.calledOnce;
            spawnSpy.should.have.been.calledWith('echo', ['hyperlegendary']);

            outputSpy.should.have.been.calledWith('hyperlegendary');
        });

        it('should send a command and handle error', async () => {
            const spawnSpy = mySandBox.spy(child_process, 'spawn');

            await CommandUtil.sendCommandWithOutput('bob', ['hyperlegendary']).should.be.rejectedWith(/spawn bob ENOENT/);
            spawnSpy.should.have.been.calledOnce;
            spawnSpy.should.have.been.calledWith('bob', ['hyperlegendary']);
        });

        it('should send a command and handle error code', async () => {
            const spawnSpy = mySandBox.spy(child_process, 'spawn');

            await CommandUtil.sendCommandWithOutput('/bin/sh', [ '-c', 'echo stdout && echo stderr >&2 && false']).should.be.rejectedWith(`Failed to execute command "/bin/sh" with  arguments "-c,echo stdout && echo stderr >&2 && false" return code 1`);
            spawnSpy.should.have.been.calledOnce;
            spawnSpy.should.have.been.calledWith('/bin/sh', ['-c', 'echo stdout && echo stderr >&2 && false']);
        });
    });
    describe('getPackages', () => {
        it('should run getPackages', async () => {
            const TEST_PACKAGE_DIRECTORY = path.join(path.dirname(__dirname), '../../test/data/smartContractDir');
            await vscode.workspace.getConfiguration().update('fabric.package.directory', TEST_PACKAGE_DIRECTORY, true);

            const packages: string[] = await CommandUtil.getPackages();
            packages.length.should.equal(6);
        });

        it('should run getPackages with a package directory location containing a tilda', async () => {
            const TEST_PACKAGE_DIRECTORY = path.join(path.dirname(__dirname), '../../test/data/smartContractDir');

            const homeDirectory = homeDir();
            const strippedDirectory = TEST_PACKAGE_DIRECTORY.replace(homeDirectory, '');
            const tildaTestDir: string = '~' + strippedDirectory;

            await vscode.workspace.getConfiguration().update('fabric.package.directory', tildaTestDir, vscode.ConfigurationTarget.Global);

            const packages: string[] = await CommandUtil.getPackages();
            packages.length.should.equal(6);
        });

        it('should throw an error if it fails to create the smart contract package directory', async () => {
            const packagesDir: string = path.join(rootPath, '../../test/data/cake');
            await vscode.workspace.getConfiguration().update('fabric.package.directory', packagesDir, true);

            const readDirStub = mySandBox.stub(fs_extra, 'readdir');
            readDirStub.onCall(0).rejects({message: 'no such file or directory'});
            const mkdirpStub = mySandBox.stub(fs_extra, 'mkdirp');
            mkdirpStub.onCall(0).rejects();
            await CommandUtil.getPackages();
            errorSpy.should.have.been.calledWith('Issue creating smart contract package folder:' + packagesDir);
        });

        it('should return empty package array if no smart contract package directory exists', async () => {
            const packagesDir: string = path.join(rootPath, '../../test/data/cake');
            await vscode.workspace.getConfiguration().update('fabric.package.directory', packagesDir, true);

            const readDirStub = mySandBox.stub(fs_extra, 'readdir');
            readDirStub.onCall(0).rejects({message: 'no such file or directory'});
            const mkdirpStub = mySandBox.stub(fs_extra, 'mkdirp');

            const packages: string[] = await CommandUtil.getPackages();
            errorSpy.should.not.have.been.calledWith('Issue creating smart contract package folder:' + packagesDir);
            packages.should.deep.equal([]);
        });

        it('should throw an error if smart contract package folder cant be read', async () => {
            const packagesDir: string = path.join(rootPath, '../../test/data/cake');
            await vscode.workspace.getConfiguration().update('fabric.package.directory', packagesDir, true);

            const readDirStub = mySandBox.stub(fs_extra, 'readdir');
            readDirStub.onCall(0).rejects({message: 'other error message'});

            await CommandUtil.getPackages();
            errorSpy.should.have.been.calledWith('Issue reading smart contract package folder:' + packagesDir);
        });

        it('should create the smart contract package directory if it doesn\'t exist', async () => {
            const packagesDir: string = tmp.dirSync().name;
            await vscode.workspace.getConfiguration().update('fabric.package.directory', packagesDir, true);

            const packages: string[] = await CommandUtil.getPackages();
            errorSpy.should.not.have.been.called;
            const smartContactPackageDirExists: boolean = await fs_extra.pathExists(packagesDir);
            smartContactPackageDirExists.should.be.true;
            packages.length.should.equal(0);
        });
    });

    describe('getPackageDirectory', () => {
        it('should get user package directory', async () => {
            await vscode.workspace.getConfiguration().update('fabric.package.directory', USER_PACKAGE_DIRECTORY, true);

            const packageDirectory = await CommandUtil.getPackageDirectory();

            packageDirectory.should.deep.equal(USER_PACKAGE_DIRECTORY);
        });
    });

});
