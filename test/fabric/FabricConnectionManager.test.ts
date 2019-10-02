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

import { FabricConnectionManager } from '../../extension/fabric/FabricConnectionManager';

import * as chai from 'chai';
import * as sinon from 'sinon';
import { FabricGatewayRegistryEntry } from '../../extension/registries/FabricGatewayRegistryEntry';
import { FabricWalletRegistryEntry } from '../../extension/registries/FabricWalletRegistryEntry';
import { FabricClientConnection } from '../../extension/fabric/FabricClientConnection';

const should: Chai.Should = chai.should();

describe('FabricConnectionManager', () => {

    const connectionManager: FabricConnectionManager = FabricConnectionManager.instance();
    let mockFabricConnection: sinon.SinonStubbedInstance<FabricClientConnection>;
    let sandbox: sinon.SinonSandbox;
    let registryEntry: FabricGatewayRegistryEntry;

    beforeEach(async () => {
        sandbox = sinon.createSandbox();
        mockFabricConnection = sinon.createStubInstance(FabricClientConnection);
        connectionManager['connection'] = null;

        registryEntry = new FabricGatewayRegistryEntry();
        registryEntry.name = 'myConnection';
    });

    afterEach(async () => {
        sandbox.restore();
        connectionManager['connection'] = null;
    });

    describe('#getConnection', () => {

        it('should get the connection', () => {
            connectionManager['connection'] = ((mockFabricConnection as any) as FabricClientConnection);
            connectionManager.getConnection().should.equal(mockFabricConnection);
        });

    });

    describe('#getGatewayRegistryEntry', () => {
        it('should get the registry entry', () => {
        connectionManager['gatewayRegistryEntry'] = registryEntry;
        connectionManager.getGatewayRegistryEntry().should.equal(registryEntry);
        });
    });

    describe('#connect', () => {

        it('should store the connection and emit an event', () => {
            const listenerStub: sinon.SinonStub = sinon.stub();
            connectionManager.once('connected', listenerStub);
            connectionManager.connect((mockFabricConnection as any) as FabricClientConnection, registryEntry);
            connectionManager.getConnection().should.equal(mockFabricConnection);
            connectionManager.getGatewayRegistryEntry().should.equal(registryEntry);
            listenerStub.should.have.been.calledOnceWithExactly(mockFabricConnection);
        });

    });

    describe('#disconnect', () => {

        it('should clear the connection and emit an event', () => {
            const listenerStub: sinon.SinonStub = sinon.stub();
            connectionManager.once('disconnected', listenerStub);
            connectionManager.disconnect();
            should.equal(connectionManager.getConnection(), null);
            listenerStub.should.have.been.calledOnceWithExactly();
        });

    });

    describe('#getConnectionIdentity', () => {

        it('should get the name of the identity used to connect', () => {
            mockFabricConnection.identityName = 'admin@conga';
            connectionManager['connection'] = ((mockFabricConnection as any) as FabricClientConnection);
            connectionManager.getConnectionIdentity().should.equal('admin@conga');
        });

    });

    describe('#getConnectionWallet', () => {

        it('should get the wallet registry entry used to connect', () => {
            const walletRegistryEntry: FabricWalletRegistryEntry = new FabricWalletRegistryEntry({
                name: 'congaWallet',
                walletPath: '/some/path'
            });
            mockFabricConnection.wallet = walletRegistryEntry;
            connectionManager['connection'] = ((mockFabricConnection as any) as FabricClientConnection);
            connectionManager.getConnectionWallet().should.deep.equal(walletRegistryEntry);
        });

    });

});
