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
import { ModuleUtil } from '../../extension/util/ModuleUtil';

// tslint:disable no-unused-expression
const should: Chai.Should = chai.should();
chai.use(sinonChai);

describe('ModuleUtil Test', () => {

    let mySandBox: sinon.SinonSandbox;
    let someModuleFunction: sinon.SinonStub;
    let requireAsarModuleStub: sinon.SinonStub;
    let requireModuleStub: sinon.SinonStub;
    let myModuleName: string;
    let importedModule: any;

    before(async () => {
        mySandBox = sinon.createSandbox();
        someModuleFunction = mySandBox.stub().resolves();
        requireAsarModuleStub = mySandBox.stub(ModuleUtil, 'getModuleAsar');
        requireModuleStub =  mySandBox.stub(ModuleUtil, 'getModule');
        myModuleName = 'keytar';
    });

    beforeEach(async () => {
        requireAsarModuleStub.returns({someModuleFunction: someModuleFunction});
        requireModuleStub.returns({someModuleFunction: someModuleFunction});
        importedModule = undefined;
    });
    afterEach(() => {
        mySandBox.reset();
    });

    describe('#getModuleAsar', () => {
        it('should test that a module can be imported via .asar', async () => {
            should.equal(importedModule, undefined);
            requireAsarModuleStub.callThrough();
            importedModule = ModuleUtil.getModuleAsar(myModuleName);
            should.exist(importedModule);
        });
    });

    describe('#getModuleAsar', () => {
        it('should test that a module can be imported without .asar', async () => {
            should.equal(importedModule, undefined);
            requireModuleStub.callThrough();
            importedModule = ModuleUtil.getModule(myModuleName);
            should.exist(importedModule);
        });
    });

    describe('#getCoreNodeModule', () => {
        it('should return undefined if tried and failed to get module', async () => {
            const error: Error = new Error('Failed to get module');
            requireAsarModuleStub.throws(error);
            requireModuleStub.throws(error);

            const result: any = ModuleUtil.getCoreNodeModule(myModuleName);

            requireAsarModuleStub.should.have.been.calledOnce;
            requireModuleStub.should.have.been.calledOnce;
            should.equal(result, undefined);
        });

        it('should not try getModule if getModuleAsar works', async () => {
            const error: Error = new Error('Failed to get module');
            requireAsarModuleStub.returns({someMooduleFunction: someModuleFunction});
            requireModuleStub.throws(error);

            const result: any = ModuleUtil.getCoreNodeModule(myModuleName);

            requireAsarModuleStub.should.have.been.calledOnce;
            requireModuleStub.should.not.have.been.called;
            result.should.deep.equal({someMooduleFunction: someModuleFunction});
        });

        it('should try getModule if getModuleAsar fails', async () => {
            const error: Error = new Error('Failed to get module');
            requireAsarModuleStub.throws(error);
            requireModuleStub.returns({someMooduleFunction: someModuleFunction});

            const result: any = ModuleUtil.getCoreNodeModule(myModuleName);

            requireAsarModuleStub.should.have.been.calledOnce;
            requireModuleStub.should.have.been.calledOnce;
            result.should.deep.equal({someMooduleFunction: someModuleFunction});
        });

    });

});
