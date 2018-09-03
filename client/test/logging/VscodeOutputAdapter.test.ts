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

import { VSCodeOutputAdapter } from '../../src/logging/VSCodeOutputAdapter';

import * as chai from 'chai';
import * as sinon from 'sinon';

chai.should();

// tslint:disable no-unused-expression
describe('VSCodeOutputAdapter', () => {

    const outputAdapter: VSCodeOutputAdapter = VSCodeOutputAdapter.instance();
    let sandbox: sinon.SinonSandbox;

    beforeEach(async () => {
        sandbox = sinon.createSandbox();
    });

    afterEach(async () => {
        sandbox.restore();
    });

    describe('#log', () => {

        it('should log to the output channel', () => {
            const outputSpy = sandbox.spy(outputAdapter['outputChannel'], 'appendLine');
            outputAdapter.log('hello world');
            outputSpy.should.have.been.calledOnceWithExactly('hello world');
        });
    });

    describe('#error', () => {
        it('should log to the output channel', () => {
            const outputSpy = sandbox.spy(outputAdapter['outputChannel'], 'appendLine');
            outputAdapter.error('hello world');
            outputSpy.should.have.been.calledOnceWithExactly('hello world');
        });
    });

    describe('#show', () => {
        it('should show the output channel', () => {
            const outputSpy = sandbox.spy(outputAdapter['outputChannel'], 'show');
            outputAdapter.show();
            outputSpy.should.have.been.calledOnce;
        });
    });
});
