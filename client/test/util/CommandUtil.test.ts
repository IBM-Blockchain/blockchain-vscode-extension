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

chai.should();
chai.use(sinonChai);

// tslint:disable no-unused-expression
describe('CommandUtil Tests', () => {

    let mySandBox;

    beforeEach(() => {
        mySandBox = sinon.createSandbox();
    });

    afterEach(() => {
        mySandBox.restore();
    });

    describe('sendCommand', () => {
        it('should send a shell command', async () => {
            const rootPath = path.dirname(__dirname);
            const uri: vscode.Uri = vscode.Uri.file(path.join(rootPath, '../../test'));
            const command = await CommandUtil.sendCommand('echo Hyperledgendary', uri.fsPath);
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
});
