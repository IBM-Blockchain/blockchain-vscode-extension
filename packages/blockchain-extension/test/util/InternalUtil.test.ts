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
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';
import { InternalUtil } from '../../extension/util/InternalUtil';

// tslint:disable no-unused-expression
const should: Chai.Should = chai.should();
chai.use(sinonChai);

describe('InternalUtil Test', () => {

    let mySandBox: sinon.SinonSandbox;
    let someMooduleFunction: sinon.SinonStub;
    let requireAsarModuleStub: sinon.SinonStub;
    let requireModuleStub: sinon.SinonStub;
    let myModuleName: string;

    before(async () => {
        mySandBox = sinon.createSandbox();
        someMooduleFunction = mySandBox.stub().resolves();
        requireAsarModuleStub = mySandBox.stub(ExtensionUtil, 'getModuleAsar');
        requireModuleStub =  mySandBox.stub(ExtensionUtil, 'getModule');
        requireAsarModuleStub.returns({someMooduleFunction: someMooduleFunction});
        requireModuleStub.returns({someMooduleFunction: someMooduleFunction});
        myModuleName = 'someModule';
    });

    afterEach(() => {
        mySandBox.reset();
    });

    describe('#getCoreNodeModule', () => {

        it('should return undefined if tried and failed to get module', async () => {
            const error: Error = new Error('Failed to get module');
            requireAsarModuleStub.throws(error);
            requireModuleStub.throws(error);

            const result: any = InternalUtil.getCoreNodeModule(myModuleName);

            requireAsarModuleStub.should.have.been.calledOnce;
            requireModuleStub.should.have.been.calledOnce;
            should.equal(result, undefined);
        });

        it('should not try getModule if getModuleAsar works', async () => {
            const error: Error = new Error('Failed to get module');
            requireAsarModuleStub.returns({someMooduleFunction: someMooduleFunction});
            requireModuleStub.throws(error);

            const result: any = InternalUtil.getCoreNodeModule(myModuleName);

            requireAsarModuleStub.should.have.been.calledOnce;
            requireModuleStub.should.not.have.been.called;
            result.should.deep.equal({someMooduleFunction: someMooduleFunction});
        });

        it('should try getModule if getModuleAsar fails', async () => {
            const error: Error = new Error('Failed to get module');
            requireAsarModuleStub.throws(error);
            requireModuleStub.returns({someMooduleFunction: someMooduleFunction});

            const result: any = InternalUtil.getCoreNodeModule(myModuleName);

            requireAsarModuleStub.should.have.been.calledOnce;
            requireModuleStub.should.have.been.calledOnce;
            result.should.deep.equal({someMooduleFunction: someMooduleFunction});
        });

    });

});
