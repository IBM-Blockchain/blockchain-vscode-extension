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

import { FabricGatewayRegistry } from '../../src/registries/FabricGatewayRegistry';

import * as sinon from 'sinon';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as path from 'path';
import * as fs from 'fs-extra';
import { FabricGatewayRegistryEntry } from '../../src/registries/FabricGatewayRegistryEntry';
import { FabricRuntimeUtil } from '../../src/util/FabricRuntimeUtil';
import { FabricEnvironmentRegistry } from '../../src/registries/FabricEnvironmentRegistry';
import { FabricEnvironmentRegistryEntry, EnvironmentType } from '../../src/registries/FabricEnvironmentRegistryEntry';
import { FabletEnvironment } from '../../src/environments/FabletEnvironment';

// tslint:disable no-unused-expression
chai.should();
chai.use(chaiAsPromised);

describe('FabricGatewayRegistry', () => {

    const registry: FabricGatewayRegistry = FabricGatewayRegistry.instance();
    const environmentRegistry: FabricEnvironmentRegistry = FabricEnvironmentRegistry.instance();
    let sandbox: sinon.SinonSandbox;

    before(async () => {
        const registryPath: string = path.join(__dirname, 'tmp', 'registries');
        registry.setRegistryPath(registryPath);
        environmentRegistry.setRegistryPath(registryPath);
    });

    beforeEach(async () => {
        await registry.clear();
        await environmentRegistry.clear();
        sandbox = sinon.createSandbox();
    });

    afterEach(async () => {
        await registry.clear();
        await environmentRegistry.clear();
        sandbox.restore();
    });

    it('should get all the gateways and put local fabrics first', async () => {
        const gatewayOne: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry({
            name: 'gatewayOne',
            associatedWallet: '',
            connectionProfilePath: path.join('myPath', 'connection.json')
        });

        await registry.getAll().should.eventually.deep.equal([]);

        await FabricEnvironmentRegistry.instance().add({ name: FabricRuntimeUtil.LOCAL_FABRIC, environmentDirectory: '', environmentType: EnvironmentType.LOCAL_ENVIRONMENT, numberOfOrgs: 1, managedRuntime: true });
        await FabricEnvironmentRegistry.instance().add({ name: 'otherLocalEnv', environmentType: EnvironmentType.LOCAL_ENVIRONMENT, managedRuntime: true, environmentDirectory: '', numberOfOrgs: 1 });

        const localFabricEntry: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry({ name: FabricRuntimeUtil.LOCAL_FABRIC, fromEnvironment: FabricRuntimeUtil.LOCAL_FABRIC, associatedWallet: 'Org1', displayName: `Org1`, connectionProfilePath: path.join('localFabric', 'connection.json') });
        const otherLocalEntry: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry({ name: 'otherLocal', fromEnvironment: 'otherLocalEnv', associatedWallet: 'Org1', displayName: `Org1`, connectionProfilePath: path.join('localFabric', 'connection.json') });

        await registry.add(gatewayOne);
        await registry.add(localFabricEntry);
        await registry.add(otherLocalEntry);

        const gateways: FabricGatewayRegistryEntry[] = await registry.getAll();
        gateways.should.deep.equal([localFabricEntry, otherLocalEntry, gatewayOne]);
    });

    it('should get all gateways but not show local fabric', async () => {
        const gatewayOne: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry({
            name: 'gatewayOne',
            associatedWallet: '',
            connectionProfilePath: path.join('myPath', 'connection.json')
        });

        await registry.getAll().should.eventually.deep.equal([]);

        await FabricEnvironmentRegistry.instance().add({ name: FabricRuntimeUtil.LOCAL_FABRIC, environmentDirectory: '', environmentType: EnvironmentType.LOCAL_ENVIRONMENT, managedRuntime: true });
        await FabricEnvironmentRegistry.instance().add({ name: 'otherLocalEnv', environmentType: EnvironmentType.LOCAL_ENVIRONMENT, managedRuntime: true, environmentDirectory: '' });

        const localFabricEntry: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry({ name: FabricRuntimeUtil.LOCAL_FABRIC, fromEnvironment: FabricRuntimeUtil.LOCAL_FABRIC, associatedWallet: 'Org1', displayName: `Org1`, connectionProfilePath: path.join('localFabric', 'connection.json') });
        const otherLocalEntry: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry({ name: 'otherLocal', fromEnvironment: 'otherLocalEnv', associatedWallet: 'Org1', displayName: `Org1`, connectionProfilePath: path.join('localFabric', 'connection.json') });

        await registry.add(gatewayOne);
        await registry.add(localFabricEntry);
        await registry.add(otherLocalEntry);
        await registry.getAll(false).should.eventually.deep.equal([gatewayOne]);
    });

    it('should get all including environments ones', async () => {
        const gatewayOne: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry({
            name: 'gatewayOne',
            associatedWallet: '',
            connectionProfilePath: path.join('myPath', 'connection.json')
        });

        await registry.getAll().should.eventually.deep.equal([]);

        await registry.add(gatewayOne);

        await environmentRegistry.add(new FabricEnvironmentRegistryEntry({
            name: 'ansibleEnvironment',
            environmentDirectory: path.join('test', 'data', 'nonManagedAnsible'),
            environmentType: EnvironmentType.ANSIBLE_ENVIRONMENT,
            managedRuntime: false
        }));
        await environmentRegistry.add(new FabricEnvironmentRegistryEntry({
            name: 'fabletEnvironment',
            environmentDirectory: path.join('test', 'data', 'fablet'),
            environmentType: EnvironmentType.FABLET_ENVIRONMENT,
            managedRuntime: false,
            url: 'http://console.fablet.example.org'
        }));

        const newFabletEnvironmentStub: sinon.SinonStub = sandbox.stub(FabricGatewayRegistry.instance(), 'newFabletEnvironment');
        const mockFabletEnvironment: sinon.SinonStubbedInstance<FabletEnvironment> = sinon.createStubInstance(FabletEnvironment);
        mockFabletEnvironment.getGateways.resolves([
            {
                name: 'fabletEnvironment - myGateway'
            }
        ]);
        newFabletEnvironmentStub.callsFake((name: string, directory: string, url: string): sinon.SinonStubbedInstance<FabletEnvironment> => {
            newFabletEnvironmentStub['wrappedMethod'](name, directory, url);
            return mockFabletEnvironment;
        });

        const entries: FabricGatewayRegistryEntry[] = await FabricGatewayRegistry.instance().getAll();

        entries.length.should.equal(5);

        entries[0].name.should.equal('ansibleEnvironment - myGateway');
        entries[1].name.should.equal('ansibleEnvironment - yofn-org1');
        entries[2].name.should.equal('ansibleEnvironment - yofn-org2');
        entries[3].name.should.equal('fabletEnvironment - myGateway');
        entries[4].should.deep.equal(gatewayOne);
    });

    it(`should remove the fromEnvironment property if the environment doesn't exist`, async () => {
        const gatewayOne: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry({
            name: 'gatewayOne',
            associatedWallet: '',
            fromEnvironment: 'someEnvironment',
            connectionProfilePath: path.join('myPath', 'connection.json')
        });

        await registry.getAll().should.eventually.deep.equal([]);

        await registry.add(gatewayOne);

        const entries: FabricGatewayRegistryEntry[] = await FabricGatewayRegistry.instance().getAll();

        entries.length.should.equal(1);

        entries[0].should.deep.equal({
            name: 'gatewayOne',
            associatedWallet: '',
            connectionProfilePath: path.join('myPath', 'connection.json')
        });
    });

    it('should update an unmanaged gateway', async () => {
        const gatewayOne: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry({
            name: 'gatewayOne',
            associatedWallet: '',
            connectionProfilePath: path.join('localFabric', 'connection.json')
        });

        await registry.getAll().should.eventually.deep.equal([]);

        await registry.add(gatewayOne);

        const transactionDataDirectories: Array<{ chaincodeName: string, channelName: string, transactionDataPath: string }> = [{
            chaincodeName: 'mySmartContract',
            channelName: 'myChannel',
            transactionDataPath: 'my/transaction/data/path'
        }];

        gatewayOne.transactionDataDirectories = transactionDataDirectories;

        await registry.update(gatewayOne);

        await registry.getAll(false).should.eventually.deep.equal([gatewayOne]);
    });

    it('should update a gateway in a managed environment', async () => {
        const writeFileStub: sinon.SinonStub = sinon.stub(fs, 'writeJson');

        const gatewayOne: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry({
            name: 'gatewayOne',
            associatedWallet: '',
            connectionProfilePath: path.join('localFabric', 'connection.json')
        });

        await registry.getAll().should.eventually.deep.equal([]);

        await registry.add(gatewayOne);

        gatewayOne.fromEnvironment = 'myEnvironment';
        gatewayOne.connectionProfilePath = 'my/connection/profile/path';
        gatewayOne.transactionDataDirectories = [{
            chaincodeName: 'mySmartContract',
            channelName: 'myChannel',
            transactionDataPath: 'my/transaction/data/path'
        }];

        await registry.update(gatewayOne);

        writeFileStub.should.have.been.called;
    });
});
