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
import { YeomanUtil } from '../../extension/util/YeomanUtil';
chai.should();
chai.use(sinonChai);

// tslint:disable no-unused-expression
describe('YeomanUtil', () => {

    let mySandBox: sinon.SinonSandbox;
    let mockEnv: any;

    beforeEach(() => {
        mySandBox = sinon.createSandbox();
        mockEnv = {
            registerStub: mySandBox.stub(),
            run: mySandBox.stub().yields()
        };
        mySandBox.stub(yeoman, 'createEnv').returns(mockEnv);
    });

    afterEach(() => {
        mySandBox.restore();
    });

    describe('#run', () => {

        it('should run the specified Yeoman generator, and change working directory back on success', async () => {
            const cwd: string = process.cwd();
            const chdirSpy: sinon.SinonSpy = mySandBox.spy(process, 'chdir');
            await YeomanUtil.run('fabric:network', { some: 'option', another: 'test' });
            mockEnv.registerStub.should.have.callCount(4);
            mockEnv.registerStub.should.have.been.calledWithExactly(sinon.match.func, 'fabric', require.resolve('generator-fabric'));
            mockEnv.registerStub.should.have.been.calledWithExactly(sinon.match.func, 'fabric:chaincode', require.resolve('generator-fabric/generators/chaincode'));
            mockEnv.registerStub.should.have.been.calledWithExactly(sinon.match.func, 'fabric:contract', require.resolve('generator-fabric/generators/contract'));
            mockEnv.registerStub.should.have.been.calledWithExactly(sinon.match.func, 'fabric:network', require.resolve('generator-fabric/generators/network'));
            mockEnv.run.should.have.been.calledOnceWithExactly('fabric:network', { some: 'option', another: 'test' }, sinon.match.func);
            chdirSpy.should.have.been.calledOnceWithExactly(cwd);
        });

        it('should run the specified Yeoman generator, and change working directory back on failure', async () => {
            const cwd: string = process.cwd();
            const chdirSpy: sinon.SinonSpy = mySandBox.spy(process, 'chdir');
            mockEnv.run.yields(new Error('such error'));
            await YeomanUtil.run('fabric:network', { some: 'option', another: 'test' })
                .should.be.rejectedWith(/such error/);
            mockEnv.registerStub.should.have.callCount(4);
            mockEnv.registerStub.should.have.been.calledWithExactly(sinon.match.func, 'fabric', require.resolve('generator-fabric'));
            mockEnv.registerStub.should.have.been.calledWithExactly(sinon.match.func, 'fabric:chaincode', require.resolve('generator-fabric/generators/chaincode'));
            mockEnv.registerStub.should.have.been.calledWithExactly(sinon.match.func, 'fabric:contract', require.resolve('generator-fabric/generators/contract'));
            mockEnv.registerStub.should.have.been.calledWithExactly(sinon.match.func, 'fabric:network', require.resolve('generator-fabric/generators/network'));
            mockEnv.run.should.have.been.calledOnceWithExactly('fabric:network', { some: 'option', another: 'test' }, sinon.match.func);
            chdirSpy.should.have.been.calledOnceWithExactly(cwd);
        });

    });

});
