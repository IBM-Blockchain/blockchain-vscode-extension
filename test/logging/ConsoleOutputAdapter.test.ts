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

import { ConsoleOutputAdapter } from '../../extension/logging/ConsoleOutputAdapter';

import * as chai from 'chai';
import * as sinon from 'sinon';
import { LogType } from '../../extension/logging/OutputAdapter';

chai.should();
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
            consoleLogStub.should.have.been.calledWithExactly('hello world');
        });

        it('should log to the error console', () => {
            const consoleLogStub: sinon.SinonStub = sandbox.stub(console, 'error');
            outputAdapter.log(LogType.ERROR, 'hello', 'hello world');
            consoleLogStub.should.have.been.calledTwice;
            consoleLogStub.firstCall.should.have.been.calledWithExactly('hello');
            consoleLogStub.should.have.been.calledWithExactly('hello world');
        });

    });
});
