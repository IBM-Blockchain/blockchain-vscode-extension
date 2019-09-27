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

import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { YeomanAdapter } from '../../extension/util/YeomanAdapter';
import { UserInputUtil } from '../../extension/commands/UserInputUtil';
chai.should();
chai.use(sinonChai);

// tslint:disable no-unused-expression
describe('Yeoman Adapter Tests', () => {

    let mySandBox: sinon.SinonSandbox;

    beforeEach(() => {
        mySandBox = sinon.createSandbox();
    });

    afterEach(() => {
        mySandBox.restore();
    });

    // tslint:disable-next-line
    let prompts = [{
        name: 'action',
        type: 'expand',
        message: 'Overwrite package.json?',
        choices: [{
            key: 'y',
            name: 'overwrite',
            value: 'write'
        },
        {
            key: 'n',
            name: 'do not overwrite',
            value: 'skip'
        },
        {
            key: 'a',
            name: 'overwrite this and all others',
            value: 'force'
        },
        {
            key: 'x',
            name: 'abort',
            value: 'abort'
        }]
    }];

    it('should overwrite file', async () => {
        prompts[0]['when'] = (): boolean => true;

        const generatorOptionsStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'showGeneratorOptions').resolves(UserInputUtil.OVERWRITE_FILE);

        const yeomanAdapter: YeomanAdapter = new YeomanAdapter();

        await yeomanAdapter.prompt(prompts, (result: string) => {
            generatorOptionsStub.should.have.been.calledWith('Overwrite package.json?');
            result.should.equal('write');
        });

    });

    it('should skip file', async () => {
        prompts[0]['when'] = (): boolean => true;

        const generatorOptionsStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'showGeneratorOptions').resolves(UserInputUtil.SKIP_FILE);

        const yeomanAdapter: YeomanAdapter = new YeomanAdapter();

        await yeomanAdapter.prompt(prompts, (result: string) => {
            generatorOptionsStub.should.have.been.calledWith('Overwrite package.json?');
            result.should.equal('skip');
        });

    });

    it('should force all files to overwrite', async () => {
        prompts[0]['when'] = (): boolean => true;

        const generatorOptionsStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'showGeneratorOptions').resolves(UserInputUtil.FORCE_FILES);

        const yeomanAdapter: YeomanAdapter = new YeomanAdapter();

        await yeomanAdapter.prompt(prompts, (result: string) => {
            generatorOptionsStub.should.have.been.calledWith('Overwrite package.json?');
            result.should.equal('force');
        });

    });

    it('should abort generation process', async () => {
        prompts[0]['when'] = (): boolean => true;

        const generatorOptionsStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'showGeneratorOptions').resolves(UserInputUtil.ABORT_GENERATOR);

        const yeomanAdapter: YeomanAdapter = new YeomanAdapter();

        await yeomanAdapter.prompt(prompts, (result: string) => {
            generatorOptionsStub.should.have.been.calledWith('Overwrite package.json?');
            result.should.equal('abort');
        });
    });

    it('should stop if no options provided for generator', async () => {
        prompts[0]['when'] = (): boolean => false;

        const generatorOptionsStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'showGeneratorOptions').resolves(UserInputUtil.OVERWRITE_FILE);

        const yeomanAdapter: YeomanAdapter = new YeomanAdapter();

        await yeomanAdapter.prompt(prompts, () => {
            generatorOptionsStub.should.not.have.been.called;
        });

    });

    it('should return if no callback given', async () => {
        prompts[0]['when'] = (): boolean => true;

        const generatorOptionsStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'showGeneratorOptions').resolves(UserInputUtil.OVERWRITE_FILE);

        const yeomanAdapter: YeomanAdapter = new YeomanAdapter();

        const result: string = await yeomanAdapter.prompt(prompts, null);
        generatorOptionsStub.should.have.been.calledWith('Overwrite package.json?');
        result.should.deep.equal({ action: 'write' });
    });
});
