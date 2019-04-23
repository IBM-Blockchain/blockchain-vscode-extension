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

import * as yeoman from 'yeoman-environment';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { YeomanUtil } from '../../src/util/YeomanUtil';
chai.should();
chai.use(sinonChai);

// tslint:disable no-unused-expression
describe('YeomanUtil', () => {

    let mySandBox: sinon.SinonSandbox;
    let mockEnv: any;

    beforeEach(() => {
        mySandBox = sinon.createSandbox();
        mockEnv = {
            registerStub: sinon.stub(),
            lookup: sinon.stub().yields(),
            run: sinon.stub().yields()
        };
        mySandBox.stub(yeoman, 'createEnv').returns(mockEnv);
    });

    afterEach(() => {
        mySandBox.restore();
    });

    describe('#run', () => {

        it('should run the specified Yeoman generator', async () => {
            await YeomanUtil.run('fabric:network', { some: 'option', another: 'test' });
            mockEnv.registerStub.should.have.been.calledOnceWithExactly(sinon.match.func, 'fabric');
            mockEnv.lookup.should.have.been.calledOnceWithExactly(sinon.match.func);
            mockEnv.run.should.have.been.calledOnceWithExactly('fabric:network', { some: 'option', another: 'test' }, sinon.match.func);
        });

    });

});
