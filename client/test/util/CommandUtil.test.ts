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
import { ExtensionUtil } from '../../src/util/ExtensionUtil';
import { LogType } from '../../src/logging/OutputAdapter';

chai.should();
chai.use(sinonChai);

// tslint:disable no-unused-expression
describe('CommandUtil Tests', () => {

    let mySandBox: sinon.SinonSandbox;

    beforeEach(() => {
        mySandBox = sinon.createSandbox();
    });

    afterEach(() => {
        mySandBox.restore();
    });

    describe('sendCommand', () => {
        it('should send a shell command', async () => {
            const rootPath: string = path.dirname(__dirname);
            const uri: vscode.Uri = vscode.Uri.file(path.join(rootPath, '../../test'));
            const command: string = await CommandUtil.sendCommand('echo Hyperledgendary', uri.fsPath);
            command.should.equal('Hyperledgendary');
        });
    });

    describe('sendCommandWithProgress', () => {
        it('should send a shell command', async () => {
            const rootPath: string = path.dirname(__dirname);
            const uri: vscode.Uri = vscode.Uri.file(path.join(rootPath, '../../test'));
            const command: string = await CommandUtil.sendCommandWithProgress('echo Hyperledgendary', uri.fsPath, 'such progress message');
            command.should.equal('Hyperledgendary');
        });
    });

    describe('sendCommandWithOutput', () => {
        it('should send a command and get output', async () => {
            const spawnSpy: sinon.SinonSpy = mySandBox.spy(child_process, 'spawn');

            const cmd: string = process.platform === 'win32' ? 'cmd' : 'echo';
            const args: string[] = process.platform === 'win32' ? ['/c', 'echo hyperlegendary'] : ['hyperlegendary'];
            await CommandUtil.sendCommandWithOutput(cmd, args);
            spawnSpy.should.have.been.calledOnce;
            spawnSpy.should.have.been.calledWith(cmd, args);
            spawnSpy.getCall(0).args[2].shell.should.equal(false);
        });

        it('should send a script and get output', async () => {
            const spawnSpy: sinon.SinonSpy = mySandBox.spy(child_process, 'spawn');

            await CommandUtil.sendCommandWithOutput('echo', ['hyperlegendary'], undefined, undefined, undefined, true);
            spawnSpy.should.have.been.calledOnce;
            spawnSpy.should.have.been.calledWith('echo', ['hyperlegendary']);
            spawnSpy.getCall(0).args[2].shell.should.equal(true);
        });

        it('should send a command and get output with cwd set', async () => {
            const spawnSpy: sinon.SinonSpy = mySandBox.spy(child_process, 'spawn');

            const cmd: string = process.platform === 'win32' ? 'cmd' : 'echo';
            const args: string[] = process.platform === 'win32' ? ['/c', 'echo hyperlegendary'] : ['hyperlegendary'];
            await CommandUtil.sendCommandWithOutput(cmd, args, ExtensionUtil.getExtensionPath());
            spawnSpy.should.have.been.calledOnce;
            spawnSpy.should.have.been.calledWith(cmd, args);
            spawnSpy.getCall(0).args[2].cwd.should.equal(ExtensionUtil.getExtensionPath());
        });

        it('should send a command and get output with env set', async () => {
            const spawnSpy: sinon.SinonSpy = mySandBox.spy(child_process, 'spawn');

            const env: any = Object.assign({}, process.env, {
                TEST_ENV: 'my env',
            });

            const cmd: string = process.platform === 'win32' ? 'cmd' : 'echo';
            const args: string[] = process.platform === 'win32' ? ['/c', 'echo hyperlegendary'] : ['hyperlegendary'];
            await CommandUtil.sendCommandWithOutput(cmd, args, null, env);
            spawnSpy.should.have.been.calledOnce;
            spawnSpy.should.have.been.calledWith(cmd, args);
            spawnSpy.getCall(0).args[2].env.TEST_ENV.should.equal('my env');
        });

        it('should send a command and get output with custom output adapter', async () => {
            const spawnSpy: sinon.SinonSpy = mySandBox.spy(child_process, 'spawn');

            const output: VSCodeOutputAdapter = VSCodeOutputAdapter.instance();
            const outputSpy: sinon.SinonSpy = mySandBox.spy(output, 'log');

            const cmd: string = process.platform === 'win32' ? 'cmd' : 'echo';
            const args: string[] = process.platform === 'win32' ? ['/c', 'echo hyperlegendary'] : ['hyperlegendary'];
            await CommandUtil.sendCommandWithOutput(cmd, args, null, null, output, true);
            spawnSpy.should.have.been.calledOnce;
            spawnSpy.should.have.been.calledWith(cmd, args);

            outputSpy.should.have.been.calledWith(LogType.INFO, undefined, 'hyperlegendary');
        });

        it('should send a command and handle error', async () => {
            const spawnSpy: sinon.SinonSpy = mySandBox.spy(child_process, 'spawn');

            await CommandUtil.sendCommandWithOutput('bob', ['hyperlegendary']).should.be.rejectedWith(/spawn bob ENOENT/);
            spawnSpy.should.have.been.calledOnce;
            spawnSpy.should.have.been.calledWith('bob', ['hyperlegendary']);
        });

        it('should send a command and handle error code', async () => {
            const spawnSpy: sinon.SinonSpy = mySandBox.spy(child_process, 'spawn');
            if (process.platform === 'win32') {
                await CommandUtil.sendCommandWithOutput('cmd', [ '/c', 'echo stdout && echo stderr >&2 && exit 1']).should.be.rejectedWith(`Failed to execute command "cmd" with  arguments "/c, echo stdout && echo stderr >&2 && exit 1" return code 1`);
                spawnSpy.should.have.been.calledOnce;
                spawnSpy.should.have.been.calledWith('cmd', ['/c', 'echo stdout && echo stderr >&2 && exit 1']);
            } else {
                await CommandUtil.sendCommandWithOutput('/bin/sh', [ '-c', 'echo stdout && echo stderr >&2 && false']).should.be.rejectedWith(`Failed to execute command "/bin/sh" with  arguments "-c, echo stdout && echo stderr >&2 && false" return code 1`);
                spawnSpy.should.have.been.calledOnce;
                spawnSpy.should.have.been.calledWith('/bin/sh', ['-c', 'echo stdout && echo stderr >&2 && false']);
            }
        });
    });
});
