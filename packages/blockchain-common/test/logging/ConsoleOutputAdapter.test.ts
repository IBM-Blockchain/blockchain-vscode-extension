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

import { ConsoleOutputAdapter } from '../../src/logging/ConsoleOutputAdapter';

import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { LogType } from '../../src/logging/OutputAdapter';

chai.should();
chai.use(sinonChai);
// tslint:disable no-unused-expression
describe('ConsoleOutputAdapter', () => {

    const outputAdapter: ConsoleOutputAdapter = ConsoleOutputAdapter.instance();
    let sandbox: sinon.SinonSandbox;

    beforeEach(async () => {
        sandbox = sinon.createSandbox();
    });

    afterEach(async () => {
        sandbox.restore();
    });

    describe('#log', () => {

        it('should log to the console', () => {
            const consoleLogStub: sinon.SinonStub = sandbox.stub(console, 'log');
            outputAdapter.log(LogType.INFO, 'hello', 'hello world');
            consoleLogStub.should.have.been.calledTwice;
            consoleLogStub.firstCall.should.have.been.calledWithExactly('hello');
            consoleLogStub.secondCall.should.have.been.calledWithExactly('hello world');
        });

        it('should log to the console with no popup', () => {
            const consoleLogStub: sinon.SinonStub = sandbox.stub(console, 'log');
            outputAdapter.log(LogType.INFO, undefined, 'hello');
            consoleLogStub.should.have.been.calledOnceWithExactly('hello');
        });

        it('should log to the console with no output', () => {
            const consoleLogStub: sinon.SinonStub = sandbox.stub(console, 'log');
            outputAdapter.log(LogType.INFO, 'hello');
            consoleLogStub.should.have.been.calledOnceWithExactly('hello');
        });

        it('should log to the error console', () => {
            const consoleLogStub: sinon.SinonStub = sandbox.stub(console, 'error');
            outputAdapter.log(LogType.ERROR, 'hello', 'hello world');
            consoleLogStub.should.have.been.calledTwice;
            consoleLogStub.firstCall.should.have.been.calledWithExactly('hello');
            consoleLogStub.should.have.been.calledWithExactly('hello world');
        });

        it('should log to the error console with no popup', () => {
            const consoleLogStub: sinon.SinonStub = sandbox.stub(console, 'error');
            outputAdapter.log(LogType.ERROR, undefined, 'hello');
            consoleLogStub.should.have.been.calledOnceWithExactly('hello');
        });

        it('should log to the error console with no output', () => {
            const consoleLogStub: sinon.SinonStub = sandbox.stub(console, 'error');
            outputAdapter.log(LogType.ERROR, 'hello');
            consoleLogStub.should.have.been.calledOnce;
            consoleLogStub.firstCall.should.have.been.calledWithExactly('hello');
        });

        it('should log to the error console with stack trace', () => {
            const consoleLogStub: sinon.SinonStub = sandbox.stub(console, 'error');
            outputAdapter.log(LogType.ERROR, 'hello', undefined, 'error');
            consoleLogStub.should.have.been.calledTwice;
            consoleLogStub.firstCall.should.have.been.calledWithExactly('hello');
            consoleLogStub.secondCall.should.have.been.calledWithExactly('error');
        });
    });
});
