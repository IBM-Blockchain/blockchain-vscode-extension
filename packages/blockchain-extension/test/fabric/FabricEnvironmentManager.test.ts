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

import { FabricEnvironmentManager, ConnectedState } from '../../extension/fabric/FabricEnvironmentManager';

import * as chai from 'chai';
import * as sinon from 'sinon';
import { FabricEnvironmentRegistryEntry, IFabricEnvironmentConnection } from 'ibm-blockchain-platform-common';
import { FabricEnvironmentConnection } from 'ibm-blockchain-platform-environment-v1';

const should: Chai.Should = chai.should();

// tslint:disable: no-unused-expression
describe('FabricEnvironmentManager', () => {

    const environmentManager: FabricEnvironmentManager = FabricEnvironmentManager.instance();
    let mockEnvironmentConnection: sinon.SinonStubbedInstance<FabricEnvironmentConnection>;
    let sandbox: sinon.SinonSandbox;
    let registryEntry: FabricEnvironmentRegistryEntry;

    beforeEach(async () => {
        sandbox = sinon.createSandbox();
        mockEnvironmentConnection = sandbox.createStubInstance(FabricEnvironmentConnection);
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
            environmentManager['connection'] = ((mockEnvironmentConnection as any) as IFabricEnvironmentConnection);
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
            const listenerStub: sinon.SinonStub = sandbox.stub();
            environmentManager.once('connected', listenerStub);
            environmentManager.connect((mockEnvironmentConnection as any) as IFabricEnvironmentConnection, registryEntry, ConnectedState.CONNECTED);
            environmentManager.getConnection().should.equal(mockEnvironmentConnection);
            environmentManager.getEnvironmentRegistryEntry().should.equal(registryEntry);
            environmentManager.getState().should.equal(ConnectedState.CONNECTED);
            listenerStub.should.have.been.calledOnceWithExactly();
        });
    });

    describe('#disconnect', () => {
        it('should clear the connection and emit an event', () => {
            const listenerStub: sinon.SinonStub = sandbox.stub();
            environmentManager['connection'] = mockEnvironmentConnection;
            environmentManager['environmentRegistryEntry'] = registryEntry;
            environmentManager['state'] = ConnectedState.CONNECTED;
            environmentManager.once('disconnected', listenerStub);
            environmentManager.disconnect();
            should.equal(environmentManager.getConnection(), null);
            should.equal(environmentManager.getEnvironmentRegistryEntry(), null);
            environmentManager.getState().should.equal(ConnectedState.DISCONNECTED);
            mockEnvironmentConnection.disconnect.should.have.been.called;
            listenerStub.should.have.been.calledOnceWithExactly();
        });

        it('should handle no connectionn and emit an event', () => {
            const listenerStub: sinon.SinonStub = sandbox.stub();
            environmentManager.once('disconnected', listenerStub);
            environmentManager.disconnect();
            should.equal(environmentManager.getConnection(), null);
            should.equal(environmentManager.getEnvironmentRegistryEntry(), null);
            environmentManager.getState().should.equal(ConnectedState.DISCONNECTED);
            listenerStub.should.have.been.calledOnceWithExactly();
        });
    });

    describe('#getState', () => {
        it('should get that state', () => {
            environmentManager['state'] = ConnectedState.CONNECTED;
            const result: ConnectedState = environmentManager.getState();
            result.should.equal(ConnectedState.CONNECTED);
        });
    });

    describe('#setState', () => {
        it('should set new state', () => {
            environmentManager['state'] = ConnectedState.CONNECTING;
            environmentManager.setState(ConnectedState.CONNECTED);
            const result: ConnectedState = environmentManager.getState();
            result.should.equal(ConnectedState.CONNECTED);
        });
    });
});
