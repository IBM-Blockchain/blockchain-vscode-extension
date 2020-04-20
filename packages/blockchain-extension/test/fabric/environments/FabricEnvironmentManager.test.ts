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

import { FabricEnvironmentManager, ConnectedState } from '../../../extension/fabric/environments/FabricEnvironmentManager';

import * as chai from 'chai';
import * as sinon from 'sinon';
import { FabricEnvironmentRegistryEntry, IFabricEnvironmentConnection, EnvironmentType } from 'ibm-blockchain-platform-common';
import { FabricEnvironmentConnection } from 'ibm-blockchain-platform-environment-v1';
import { TestUtil } from '../../TestUtil';
import { TimerUtil } from '../../../extension/util/TimerUtil';
import { ExtensionCommands } from '../../../ExtensionCommands';

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

    before(async () => {
        await TestUtil.setupTests(sandbox);
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

    describe('#getEnvironmentRegistryEntry', () => {
        it('should get the registry entry', () => {
            environmentManager['environmentRegistryEntry'] = registryEntry;
            environmentManager.getEnvironmentRegistryEntry().should.equal(registryEntry);
        });
    });

    describe('#connect', () => {
        it('should store the connection and emit an event', () => {
            const listenerStub: sinon.SinonStub = sandbox.stub();
            const startEnivronmentRefreshStub: sinon.SinonStub = sandbox.stub(FabricEnvironmentManager.instance(), 'startEnvironmentRefresh');
            environmentManager.once('connected', listenerStub);
            environmentManager.connect((mockEnvironmentConnection as any) as IFabricEnvironmentConnection, registryEntry, ConnectedState.CONNECTED);
            environmentManager.getConnection().should.equal(mockEnvironmentConnection);
            environmentManager.getEnvironmentRegistryEntry().should.equal(registryEntry);
            environmentManager.getState().should.equal(ConnectedState.CONNECTED);
            listenerStub.should.have.been.calledOnceWithExactly();
            startEnivronmentRefreshStub.should.have.been.calledOnce;
        });
        it('should not start environment refresh if requested', () => {
            const listenerStub: sinon.SinonStub = sandbox.stub();
            const startEnivronmentRefreshStub: sinon.SinonStub = sandbox.stub(FabricEnvironmentManager.instance(), 'startEnvironmentRefresh');
            environmentManager.once('connected', listenerStub);
            environmentManager.connect((mockEnvironmentConnection as any) as IFabricEnvironmentConnection, registryEntry, ConnectedState.CONNECTED, false);
            environmentManager.getConnection().should.equal(mockEnvironmentConnection);
            environmentManager.getEnvironmentRegistryEntry().should.equal(registryEntry);
            environmentManager.getState().should.equal(ConnectedState.CONNECTED);
            listenerStub.should.have.been.calledOnceWithExactly();
            startEnivronmentRefreshStub.should.have.not.been.called;
        });
    });

    describe('#disconnect', () => {
        it('should clear the connection and emit an event', () => {
            const stopEnivronmentRefreshStub: sinon.SinonStub = sandbox.stub(FabricEnvironmentManager.instance(), 'stopEnvironmentRefresh');
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
            stopEnivronmentRefreshStub.should.have.been.calledOnce;
        });

        it('should handle no connectionn and emit an event', () => {
            const stopEnivronmentRefreshStub: sinon.SinonStub = sandbox.stub(FabricEnvironmentManager.instance(), 'stopEnvironmentRefresh');
            const listenerStub: sinon.SinonStub = sandbox.stub();
            environmentManager.once('disconnected', listenerStub);
            environmentManager.disconnect();
            should.equal(environmentManager.getConnection(), null);
            should.equal(environmentManager.getEnvironmentRegistryEntry(), null);
            environmentManager.getState().should.equal(ConnectedState.DISCONNECTED);
            listenerStub.should.have.been.calledOnceWithExactly();
            stopEnivronmentRefreshStub.should.have.been.calledOnce;
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

    describe('#startEnvironmentRefresh', () => {
        let setIntervalStub: sinon.SinonStub;
        let cancelIntervalStub: sinon.SinonStub;

        beforeEach(() => {
            setIntervalStub = sandbox.stub(TimerUtil, 'setInterval').returns({ name: 'timeout' });
            cancelIntervalStub = sandbox.stub(TimerUtil, 'cancelInterval');
        });

        it('should start the auto refresh interval', () => {
            const entry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry({ name: 'myFabric', environmentType: EnvironmentType.OPS_TOOLS_ENVIRONMENT });
            environmentManager['state'] = ConnectedState.CONNECTING;
            environmentManager['environmentRegistryEntry'] = entry;
            environmentManager['timeoutObject'] = undefined;

            environmentManager.startEnvironmentRefresh();

            setIntervalStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, [entry, false], 10000);
            cancelIntervalStub.should.not.have.been.called;
        });

        it('should start the auto refresh interval and cancel the old one if set', () => {
            const entry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry({ name: 'myFabric', environmentType: EnvironmentType.OPS_TOOLS_ENVIRONMENT });
            environmentManager['state'] = ConnectedState.CONNECTING;
            environmentManager['environmentRegistryEntry'] = entry;
            environmentManager['timeoutObject'] = { name: 'timeout' } as any;

            environmentManager.startEnvironmentRefresh();

            setIntervalStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, [entry, false], 10000);
            cancelIntervalStub.should.have.been.calledWith({ name: 'timeout' });
        });

        it('should not start the auto refresh interval if not ops tools', () => {
            const entry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry({ name: 'myFabric', environmentType: EnvironmentType.ENVIRONMENT });
            environmentManager['state'] = ConnectedState.CONNECTING;
            environmentManager['environmentRegistryEntry'] = entry;

            environmentManager.startEnvironmentRefresh();

            setIntervalStub.should.not.have.been.called;
            cancelIntervalStub.should.have.been.called;
        });

        it('should not start the auto refresh interval if state is not connecting or connected', () => {
            const entry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry({ name: 'myFabric', environmentType: EnvironmentType.OPS_TOOLS_ENVIRONMENT });
            environmentManager['state'] = ConnectedState.DISCONNECTED;
            environmentManager['environmentRegistryEntry'] = entry;

            environmentManager.startEnvironmentRefresh();

            setIntervalStub.should.not.have.been.called;
            cancelIntervalStub.should.have.been.called;
        });
    });

    describe('#stopEnvironmentRefresh', () => {
        let cancelIntervalStub: sinon.SinonStub;

        beforeEach(() => {
            cancelIntervalStub = sandbox.stub(TimerUtil, 'cancelInterval');
        });

        it('should cancel interval', () => {
            environmentManager['timeoutObject'] = { name: 'timeout' } as any;

            environmentManager.stopEnvironmentRefresh();

            cancelIntervalStub.should.have.been.called;
        });

        it('should not cancel interval if timeout object not set', () => {
            environmentManager['timeoutObject'] = undefined;
            environmentManager.stopEnvironmentRefresh();

            cancelIntervalStub.should.not.have.been.called;
        });
    });
});
