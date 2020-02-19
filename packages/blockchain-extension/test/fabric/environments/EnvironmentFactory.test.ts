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
import { EnvironmentFactory } from '../../../extension/fabric/environments/EnvironmentFactory';
import { FabricRuntimeUtil, FabricEnvironmentRegistryEntry, EnvironmentType, AnsibleEnvironment, FabricEnvironment } from 'ibm-blockchain-platform-common';
import { LocalEnvironment } from '../../../extension/fabric/environments/LocalEnvironment';
import { ManagedAnsibleEnvironment } from '../../../extension/fabric/environments/ManagedAnsibleEnvironment';
import { LocalEnvironmentManager } from '../../../extension/fabric/environments/LocalEnvironmentManager';
import { ManagedAnsibleEnvironmentManager } from '../../../extension/fabric/environments/ManagedAnsibleEnvironmentManager';

chai.should();

// tslint:disable no-unused-expression
describe('EnvironmentFactory', () => {

    let sandbox: sinon.SinonSandbox;

    before(async () => {
        await TestUtil.setupTests(sandbox);
    });

    beforeEach(async () => {
        sandbox = sinon.createSandbox();
    });

    afterEach(async () => {
        sandbox.restore();
    });

    it('should throw an error if no name is provided', async () => {

        const registryEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();

        try {
            await EnvironmentFactory.getEnvironment(registryEntry);
        } catch (error) {
            error.message.should.equal('Unable to get environment, a name must be provided');
        }
    });

    it(`should return a local environment`, async () => {
        await TestUtil.setupLocalFabric();

        const registryEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
        registryEntry.name = FabricRuntimeUtil.LOCAL_FABRIC;
        registryEntry.managedRuntime = true;
        registryEntry.environmentType = EnvironmentType.LOCAL_ENVIRONMENT;
        registryEntry.environmentDirectory = '/some/path';

        const localEnvironment: LocalEnvironment = new LocalEnvironment(registryEntry.name, {startPort: 17050, endPort: 17069}, 1);
        const ensureRuntimeStub: sinon.SinonStub = sandbox.stub(LocalEnvironmentManager.instance(), 'ensureRuntime').resolves(localEnvironment);

        const environment: LocalEnvironment | ManagedAnsibleEnvironment | AnsibleEnvironment | FabricEnvironment = await EnvironmentFactory.getEnvironment(registryEntry);
        environment.should.be.an.instanceOf(LocalEnvironment);

        ensureRuntimeStub.should.have.been.calledOnce;
    });

    it('should return a managed ansible environment', async () => {
        const registryEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
        registryEntry.name = 'managedAnsibleEnvironment';
        registryEntry.managedRuntime = true;
        registryEntry.environmentType = EnvironmentType.ANSIBLE_ENVIRONMENT;
        registryEntry.environmentDirectory = '/some/path';

        const managedAnsibleEnvironment: ManagedAnsibleEnvironment = new ManagedAnsibleEnvironment(registryEntry.name, registryEntry.environmentDirectory);
        const ensureRuntimeStub: sinon.SinonStub = sandbox.stub(ManagedAnsibleEnvironmentManager.instance(), 'ensureRuntime').resolves(managedAnsibleEnvironment);

        const environment: LocalEnvironment | ManagedAnsibleEnvironment | AnsibleEnvironment | FabricEnvironment = await EnvironmentFactory.getEnvironment(registryEntry);
        ensureRuntimeStub.should.have.been.calledOnceWithExactly(registryEntry.name, registryEntry.environmentDirectory);
        environment.should.be.an.instanceOf(ManagedAnsibleEnvironment);
        environment.should.deep.equal(managedAnsibleEnvironment);

    });

    it('should return an ansible environment', async () => {

        const registryEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
        registryEntry.name = 'ansibleEnvironment';
        registryEntry.managedRuntime = false;
        registryEntry.environmentType = EnvironmentType.ANSIBLE_ENVIRONMENT;

        const environment: LocalEnvironment | ManagedAnsibleEnvironment | AnsibleEnvironment | FabricEnvironment = await EnvironmentFactory.getEnvironment(registryEntry);
        environment.should.be.an.instanceOf(AnsibleEnvironment);

    });

    it('should return a remote fabric environment', async () => {
        const registryEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
        registryEntry.name = 'fabricEnvironment';
        registryEntry.managedRuntime = false;
        registryEntry.environmentType = EnvironmentType.ENVIRONMENT;

        const environment: LocalEnvironment | ManagedAnsibleEnvironment | AnsibleEnvironment | FabricEnvironment = await EnvironmentFactory.getEnvironment(registryEntry);
        environment.should.be.an.instanceOf(FabricEnvironment);
    });

    it('should return a remote fabric environment if only the name is passed', async () => {
        const registryEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
        registryEntry.name = 'fabricEnvironment';

        const environment: LocalEnvironment | ManagedAnsibleEnvironment | AnsibleEnvironment | FabricEnvironment = await EnvironmentFactory.getEnvironment(registryEntry);
        environment.should.be.an.instanceOf(FabricEnvironment);
    });

    it('should assume the environment is not managed if not explictitly stated', async () => {
        const registryEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
        registryEntry.name = 'ansibleEnvironment';
        registryEntry.environmentType = EnvironmentType.ANSIBLE_ENVIRONMENT;

        const environment: LocalEnvironment | ManagedAnsibleEnvironment | AnsibleEnvironment | FabricEnvironment = await EnvironmentFactory.getEnvironment(registryEntry);
        environment.should.be.an.instanceOf(AnsibleEnvironment);
    });

});
