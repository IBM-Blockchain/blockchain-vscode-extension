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
import { TestUtil } from '../../TestUtil';
import { ManagedAnsibleEnvironment } from '../../../extension/fabric/environments/ManagedAnsibleEnvironment';
import { ManagedAnsibleEnvironmentManager } from '../../../extension/fabric/environments/ManagedAnsibleEnvironmentManager';
chai.should();

// tslint:disable no-unused-expression
describe('AnsibleEnvironmentManager', () => {

    const runtimeManager: ManagedAnsibleEnvironmentManager = ManagedAnsibleEnvironmentManager.instance();
    let managedRuntime: ManagedAnsibleEnvironment;

    let sandbox: sinon.SinonSandbox;

    before(async () => {
        await TestUtil.setupTests(sandbox);
    });

    beforeEach(async () => {
        sandbox = sinon.createSandbox();
        managedRuntime = new ManagedAnsibleEnvironment('myRuntime', '/some/path');
        runtimeManager['connection'] = runtimeManager['connectingPromise'] = undefined;
        runtimeManager['runtimes'] = new Map();
    });

    afterEach(async () => {
        sandbox.restore();
        runtimeManager['runtimes'] = undefined;
    });

    describe('#getRuntime', () => {
        it('should return the runtime', () => {
            runtimeManager['runtimes'].set('myRuntime', managedRuntime);
            runtimeManager.getRuntime('myRuntime').should.equal(managedRuntime);
        });
    });

    describe('#ensureRuntime', () => {
        it('should return runtime if it has already been added', async () => {
            runtimeManager['runtimes'].set('myRuntime', managedRuntime);

            const result: ManagedAnsibleEnvironment = runtimeManager.ensureRuntime('myRuntime', '/some/path');
            result.should.deep.equal(managedRuntime);
            runtimeManager['runtimes'].size.should.equal(1);

        });

        it(`should add runtime if it hasn't been added and return it`, async () => {
            runtimeManager['runtimes'].size.should.equal(0);

            const result: ManagedAnsibleEnvironment = runtimeManager.ensureRuntime('myRuntime', '/some/path');
            result.should.deep.equal(managedRuntime);
            runtimeManager['runtimes'].size.should.equal(1);
        });
    });
});
