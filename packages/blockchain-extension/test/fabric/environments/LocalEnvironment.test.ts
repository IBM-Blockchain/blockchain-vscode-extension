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

import * as sinon from 'sinon';
import { TestUtil } from '../../TestUtil';
import { LocalEnvironment } from '../../../extension/fabric/environments/LocalEnvironment';
import { CommandUtil } from '../../../extension/util/CommandUtil';

// tslint:disable no-unused-expression

describe('LocalEnvironment', () => {
    let sendCommandWithOutputStub: sinon.SinonStub;
    let sandbox: sinon.SinonSandbox;
    before(async () => {
        await TestUtil.setupTests(sandbox);
    });

    beforeEach(async () => {
        sandbox = sinon.createSandbox();
        sendCommandWithOutputStub = sandbox.stub(CommandUtil, 'sendCommandWithOutput');
        sendCommandWithOutputStub.resolves();
    });
    afterEach(async () => {
        sandbox.restore();
    });

    it('should teardown (windows)', async () => {
        const enviroment: LocalEnvironment = new LocalEnvironment('localenvironment', 'somepath');
        sandbox.stub(process, 'platform').value('win32');
        await enviroment.teardown();

        sendCommandWithOutputStub.should.have.been.calledOnceWithExactly('cmd', ['/c', `teardown.cmd`], 'somepath');
    });

    it('should teardown (mac)', async () => {
        const enviroment: LocalEnvironment = new LocalEnvironment('localenvironment', 'somepath');
        sandbox.stub(process, 'platform').value('darwin');
        await enviroment.teardown();

        sendCommandWithOutputStub.should.have.been.calledOnceWithExactly('/bin/sh', [`teardown.sh`], 'somepath');
    });

    it('should teardown (linux)', async () => {
        const enviroment: LocalEnvironment = new LocalEnvironment('localenvironment', 'somepath');
        sandbox.stub(process, 'platform').value('linux');
        await enviroment.teardown();

        sendCommandWithOutputStub.should.have.been.calledOnceWithExactly('/bin/sh', [`teardown.sh`], 'somepath');
    });

    it(`should do nothing if there's an error on teardown`, async () => {
        const enviroment: LocalEnvironment = new LocalEnvironment('localenvironment', 'somepath');
        sandbox.stub(process, 'platform').value('linux');
        const error: Error = new Error('some error');
        sendCommandWithOutputStub.rejects(error);
        await enviroment.teardown();

        sendCommandWithOutputStub.should.have.been.calledOnceWithExactly('/bin/sh', [`teardown.sh`], 'somepath');
    });
});
