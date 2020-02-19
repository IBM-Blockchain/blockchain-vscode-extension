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

import { TestUtil } from '../../TestUtil';
import * as chai from 'chai';
import * as sinon from 'sinon';
import { FabricGatewayRegistry } from 'ibm-blockchain-platform-common';
import * as path from 'path';
import { ManagedAnsibleEnvironment } from '../../../extension/fabric/environments/ManagedAnsibleEnvironment';
import { ManagedAnsibleEnvironmentManager } from '../../../extension/fabric/environments/ManagedAnsibleEnvironmentManager';

chai.should();

// tslint:disable no-unused-expression
describe('ManagedAnsibleEnvironmentManager', () => {

    const connectionRegistry: FabricGatewayRegistry = FabricGatewayRegistry.instance();
    const runtimeManager: ManagedAnsibleEnvironmentManager = ManagedAnsibleEnvironmentManager.instance();

    let sandbox: sinon.SinonSandbox;
    let backupRuntime: ManagedAnsibleEnvironment;
    let originalRuntime: ManagedAnsibleEnvironment;

    const managedPath: string = path.join(__dirname, '..', '..', 'data', 'managedAnsible');

    before(async () => {
        await TestUtil.setupTests(sandbox);
        backupRuntime = new ManagedAnsibleEnvironment('managedAnsible', managedPath);
    });

    beforeEach(async () => {
        originalRuntime = backupRuntime;
        sandbox = sinon.createSandbox();
        await connectionRegistry.clear();

        runtimeManager['runtimes'] = new Map();
        runtimeManager['runtimes'].set('managedAnsible', originalRuntime);
    });

    afterEach(async () => {
        sandbox.restore();
        runtimeManager['runtimes'] = undefined;
        await connectionRegistry.clear();
    });

    describe('#getRuntime', () => {
        it('should return the runtime', () => {
            runtimeManager.getRuntime('managedAnsible').should.deep.equal(originalRuntime);
        });
    });

    describe('#ensureRuntime', () => {
        it('should get runtime if it already exists', () => {
            runtimeManager['runtimes'].size.should.equal(1);
            runtimeManager.ensureRuntime('managedAnsible', managedPath).should.deep.equal(originalRuntime);
            runtimeManager['runtimes'].size.should.equal(1);
        });

        it(`should create runtime if it doesn't exist and return it`, async () => {
            runtimeManager['runtimes'] = new Map();
            runtimeManager['runtimes'].size.should.equal(0);
            runtimeManager.ensureRuntime('managedAnsible', managedPath).should.deep.equal(originalRuntime);
            runtimeManager['runtimes'].size.should.equal(1);
        });
    });

    describe('#removeRuntime', () => {
        it('should remove runtime from manager if it exists', async () => {
            runtimeManager['runtimes'].size.should.equal(1);
            runtimeManager.removeRuntime('managedAnsible');
            runtimeManager['runtimes'].size.should.equal(0);
        });

        it(`should not do anything (or error) if the runtime doesn't exist to delete`, async () => {
            runtimeManager['runtimes'] = new Map();
            runtimeManager['runtimes'].size.should.equal(0);

            ((): void => {
                runtimeManager.removeRuntime('managedAnsible');
            }).should.not.throw;

            runtimeManager['runtimes'].size.should.equal(0);
        });
    });

});
