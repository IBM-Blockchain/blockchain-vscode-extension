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

import { FabricConnection } from '../../src/fabric/FabricConnection';
import { FabricConnectionManager } from '../../src/fabric/FabricConnectionManager';

import * as chai from 'chai';
import * as sinon from 'sinon';

const should = chai.should();

describe('FabricConnectionManager', () => {

    class TestFabricConnection extends FabricConnection {

        async connect(): Promise<void> {
            return;
        }

    }

    const connectionManager: FabricConnectionManager = FabricConnectionManager.instance();
    let mockFabricConnection: sinon.SinonStubbedInstance<TestFabricConnection>;
    let sandbox: sinon.SinonSandbox;

    beforeEach(async () => {
        sandbox = sinon.createSandbox();
        mockFabricConnection = sinon.createStubInstance(TestFabricConnection);
        connectionManager['connection'] = null;
    });

    afterEach(async () => {
        sandbox.restore();
        connectionManager['connection'] = null;
    });

    describe('#getConnection', () => {

        it('should get the connection', () => {
            connectionManager['connection'] = ((mockFabricConnection as any) as FabricConnection);
            connectionManager.getConnection().should.equal(mockFabricConnection);
        });

    });

    describe('#connect', () => {

        it('should store the connection and emit an event', () => {
            const listenerStub = sinon.stub();
            connectionManager.once('connected', listenerStub);
            connectionManager.connect((mockFabricConnection as any) as FabricConnection);
            connectionManager.getConnection().should.equal(mockFabricConnection);
            listenerStub.should.have.been.calledOnceWithExactly(mockFabricConnection);
        });

    });

    describe('#disconnect', () => {

        it('should clear the connection and emit an event', () => {
            const listenerStub = sinon.stub();
            connectionManager.once('disconnected', listenerStub);
            connectionManager.disconnect();
            should.equal(connectionManager.getConnection(), null);
            listenerStub.should.have.been.calledOnceWithExactly();
        });

    });

});
