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

import { FabricEnvironmentManager } from '../../src/fabric/FabricEnvironmentManager';

import * as chai from 'chai';
import * as sinon from 'sinon';
import { FabricEnvironmentRegistryEntry } from '../../src/fabric/FabricEnvironmentRegistryEntry';
import { FabricEnvironmentConnection } from '../../src/fabric/FabricEnvironmentConnection';

const should: Chai.Should = chai.should();

describe('FabricEnvironmentManager', () => {

    const environmentManager: FabricEnvironmentManager = FabricEnvironmentManager.instance();
    let mockEnvironmentConnection: sinon.SinonStubbedInstance<FabricEnvironmentConnection>;
    let sandbox: sinon.SinonSandbox;
    let registryEntry: FabricEnvironmentRegistryEntry;

    beforeEach(async () => {
        sandbox = sinon.createSandbox();
        mockEnvironmentConnection = sinon.createStubInstance(FabricEnvironmentConnection);
        environmentManager['connection'] = null;

        registryEntry = new FabricEnvironmentRegistryEntry();
        registryEntry.name = 'myConnection';
        registryEntry.managedRuntime = false;
    });

    afterEach(async () => {
        sandbox.restore();
        environmentManager['connection'] = null;
    });

    describe('#getConnection', () => {
        it('should get the connection', () => {
            environmentManager['connection'] = ((mockEnvironmentConnection as any) as FabricEnvironmentConnection);
            environmentManager.getConnection().should.equal(mockEnvironmentConnection);
        });
    });

    describe('#getGatewayRegistryEntry', () => {
        it('should get the registry entry', () => {
            environmentManager['environmentRegistryEntry'] = registryEntry;
            environmentManager.getEnvironmentRegistryEntry().should.equal(registryEntry);
        });
    });

    describe('#connect', () => {
        it('should store the connection and emit an event', () => {
            const listenerStub: sinon.SinonStub = sinon.stub();
            environmentManager.once('connected', listenerStub);
            environmentManager.connect((mockEnvironmentConnection as any) as FabricEnvironmentConnection, registryEntry);
            environmentManager.getConnection().should.equal(mockEnvironmentConnection);
            environmentManager.getEnvironmentRegistryEntry().should.equal(registryEntry);
            listenerStub.should.have.been.calledOnceWithExactly(mockEnvironmentConnection);
        });
    });

    describe('#disconnect', () => {
        it('should clear the connection and emit an event', () => {
            const listenerStub: sinon.SinonStub = sinon.stub();
            environmentManager.once('disconnected', listenerStub);
            environmentManager.disconnect();
            should.equal(environmentManager.getConnection(), null);
            listenerStub.should.have.been.calledOnceWithExactly();
        });
    });
});
