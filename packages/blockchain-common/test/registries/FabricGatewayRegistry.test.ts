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
import { FabricWalletUtil } from '../../src/util/FabricWalletUtil';
import { FabricEnvironmentRegistry } from '../../src/registries/FabricEnvironmentRegistry';
import { FabricEnvironmentRegistryEntry, EnvironmentType } from '../../src/registries/FabricEnvironmentRegistryEntry';

// tslint:disable no-unused-expression
chai.should();
chai.use(chaiAsPromised);

describe('FabricGatewayRegistry', () => {

    const registry: FabricGatewayRegistry = FabricGatewayRegistry.instance();
    const environmentRegistry: FabricEnvironmentRegistry = FabricEnvironmentRegistry.instance();

    before(async () => {
        const registryPath: string = path.join(__dirname, 'tmp', 'registries');
        registry.setRegistryPath(registryPath);
        environmentRegistry.setRegistryPath(registryPath);
    });

    beforeEach(async () => {
        await registry.clear();
        await environmentRegistry.clear();
    });

    afterEach(async () => {
        await registry.clear();
        await environmentRegistry.clear();
    });

    it('should get all the gateways and put local fabric first', async () => {
        const gatewayOne: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry({
            name: 'gatewayOne',
            associatedWallet: ''
        });

        await registry.getAll().should.eventually.deep.equal([]);

        const localFabricEntry: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry({ name: FabricRuntimeUtil.LOCAL_FABRIC, associatedWallet: FabricWalletUtil.OLD_LOCAL_WALLET, displayName: `${FabricRuntimeUtil.LOCAL_FABRIC} - org1` });

        await registry.add(gatewayOne);
        await registry.add(localFabricEntry);
        const gateways: FabricGatewayRegistryEntry[] = await registry.getAll();
        gateways.should.deep.equal([localFabricEntry, gatewayOne]);
    });

    it('should get all gateways but not show local fabric', async () => {
        const gatewayOne: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry({
            name: 'gatewayOne',
            associatedWallet: ''
        });

        await registry.getAll().should.eventually.deep.equal([]);

        const localFabricEntry: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry({ name: FabricRuntimeUtil.LOCAL_FABRIC, associatedWallet: FabricWalletUtil.OLD_LOCAL_WALLET, displayName: `${FabricRuntimeUtil.LOCAL_FABRIC} - org1` });

        await registry.add(gatewayOne);
        await registry.add(localFabricEntry);
        await registry.getAll(false).should.eventually.deep.equal([gatewayOne]);
    });

    it('should get all including environments ones', async () => {
        const gatewayOne: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry({
            name: 'gatewayOne',
            associatedWallet: ''
        });

        await registry.getAll().should.eventually.deep.equal([]);

        await registry.add(gatewayOne);

        await environmentRegistry.add(new FabricEnvironmentRegistryEntry({ name: 'myEnvironment', environmentDirectory: path.join('test', 'data', 'nonManagedAnsible'), environmentType: EnvironmentType.ANSIBLE_ENVIRONMENT, managedRuntime: false }));

        const entries: FabricGatewayRegistryEntry[] = await FabricGatewayRegistry.instance().getAll();

        entries.length.should.equal(4);

        entries[0].should.deep.equal(gatewayOne);

        entries[1].name.should.equal('myEnvironment - myGateway');
        entries[2].name.should.equal('myEnvironment - yofn-org1');
        entries[3].name.should.equal('myEnvironment - yofn-org2');
    });

    it('should update an unmanaged gateway', async () => {
        const gatewayOne: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry({
            name: 'gatewayOne',
            associatedWallet: ''
        });

        await registry.getAll().should.eventually.deep.equal([]);

        await registry.add(gatewayOne);

        const transactionDataDirectories: Array<{chaincodeName: string, channelName: string, transactionDataPath: string}> = [{
            chaincodeName: 'mySmartContract',
            channelName: 'myChannel',
            transactionDataPath: 'my/transaction/data/path'
        }] ;

        gatewayOne.transactionDataDirectories = transactionDataDirectories;

        await registry.update(gatewayOne);

        await registry.getAll(false).should.eventually.deep.equal([gatewayOne]);
    });

    it('should update a gateway in a managed environment', async () => {
        const writeFileStub: sinon.SinonStub = sinon.stub(fs, 'writeJson');

        const gatewayOne: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry({
            name: 'gatewayOne',
            associatedWallet: ''
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
