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
import * as path from 'path';
import * as sinon from 'sinon';
import * as chaiAsPromised from 'chai-as-promised';
import { FabricWalletRegistryEntry } from '../../src/registries/FabricWalletRegistryEntry';
import { FabricWalletRegistry } from '../../src/registries/FabricWalletRegistry';
import { FabricRuntimeUtil } from '../../src/util/FabricRuntimeUtil';
import { FabricEnvironmentRegistryEntry, EnvironmentType } from '../../src/registries/FabricEnvironmentRegistryEntry';
import { FabricEnvironmentRegistry } from '../../src/registries/FabricEnvironmentRegistry';
import { FileConfigurations } from '../../src/registries/FileConfigurations';
import { FabricWalletGeneratorFactory } from '../../src/util/FabricWalletGeneratorFactory';

chai.use(chaiAsPromised);
chai.should();

describe('FabricWalletRegistry', () => {

    const registry: FabricWalletRegistry = FabricWalletRegistry.instance();
    const environmentRegistry: FabricEnvironmentRegistry = FabricEnvironmentRegistry.instance();

    before(async () => {
        const registryPath: string = path.join(__dirname, 'tmp', 'registries');
        registry.setRegistryPath(registryPath);
        environmentRegistry.setRegistryPath(registryPath);
        const importIdentityStub: sinon.SinonStub = sinon.stub().resolves();
        const getIdentitiesStub: sinon.SinonStub = sinon.stub().resolves([]);
        const mockFabricWallet: any = {
            importIdentity: importIdentityStub,
            getIdentities: getIdentitiesStub
        };

        const mockFabricWalletGenerator: any = {
            getWallet: sinon.stub().resolves(mockFabricWallet)
        };

        FabricWalletGeneratorFactory.setFabricWalletGenerator(mockFabricWalletGenerator);
    });

    describe('getAll', () => {

        beforeEach(async () => {
            await registry.clear();
            await environmentRegistry.clear();
        });

        afterEach(async () => {
            await registry.clear();
            await environmentRegistry.clear();
        });

        it('should get all the wallets and put local fabric first', async () => {
            const walletOne: FabricWalletRegistryEntry = new FabricWalletRegistryEntry({
                name: 'walletOne',
                walletPath: 'myPath',
            });
            const walletTwo: FabricWalletRegistryEntry = new FabricWalletRegistryEntry({
                name: 'walletTwo',
                walletPath: 'otherPath',
            });

            await registry.getAll().should.eventually.deep.equal([]);

            await FabricEnvironmentRegistry.instance().add({name: FabricRuntimeUtil.LOCAL_FABRIC, environmentDirectory: path.join(__dirname, '..', '..', '..', '..', 'test', 'data', FabricRuntimeUtil.LOCAL_FABRIC), environmentType: EnvironmentType.LOCAL_ENVIRONMENT, numberOfOrgs: 1, managedRuntime: true});
            await FabricEnvironmentRegistry.instance().add({name: 'otherLocalEnv', environmentType: EnvironmentType.LOCAL_ENVIRONMENT, managedRuntime: true, environmentDirectory : path.join(__dirname, '..', 'data', 'otherLocalEnv'), numberOfOrgs: 1});

            const localFabricOrgEntry: FabricWalletRegistryEntry = await FabricWalletRegistry.instance().get('Org1', FabricRuntimeUtil.LOCAL_FABRIC);
            const localFabricOrdererEntry: FabricWalletRegistryEntry = await FabricWalletRegistry.instance().get('Orderer', FabricRuntimeUtil.LOCAL_FABRIC);
            const otherLocalOrgEntry: FabricWalletRegistryEntry = await FabricWalletRegistry.instance().get('Org1', 'otherLocalEnv');
            const otherLocalOrdererEntry: FabricWalletRegistryEntry = await FabricWalletRegistry.instance().get('Orderer', 'otherLocalEnv');

            await registry.add(walletOne);
            await registry.add(walletTwo);

            const wallets: any = await registry.getAll();
            wallets.length.should.equal(6);

            wallets[0].should.deep.equal(localFabricOrdererEntry);
            wallets[1].should.deep.equal(localFabricOrgEntry);
            wallets[2].should.deep.equal(otherLocalOrdererEntry);
            wallets[3].should.deep.equal(otherLocalOrgEntry);
            wallets[4].should.deep.equal(walletOne);
            wallets[5].should.deep.equal(walletTwo);
        });

        it('should get all wallets but not show local fabric', async () => {
            const walletOne: FabricWalletRegistryEntry = new FabricWalletRegistryEntry({
                name: 'walletOne',
                walletPath: 'myPath'
            });

            await registry.getAll().should.eventually.deep.equal([]);

            await FabricEnvironmentRegistry.instance().add({name: FabricRuntimeUtil.LOCAL_FABRIC, environmentDirectory: path.join(__dirname, '..', 'data', FabricRuntimeUtil.LOCAL_FABRIC), environmentType: EnvironmentType.LOCAL_ENVIRONMENT, managedRuntime: true, numberOfOrgs: 1});
            await FabricEnvironmentRegistry.instance().add({name: 'otherLocalEnv', environmentType: EnvironmentType.LOCAL_ENVIRONMENT, managedRuntime: true, environmentDirectory : path.join(__dirname, '..', 'data', 'otherLocalEnv'), numberOfOrgs: 1});

            await registry.add(walletOne);
            await registry.getAll(false).should.eventually.deep.equal([walletOne]);
        });

        it('should get all including environments ones', async () => {
            const walletOne: FabricWalletRegistryEntry = new FabricWalletRegistryEntry({
                name: 'walletOne',
                walletPath: 'myPath'
            });

            await registry.getAll().should.eventually.deep.equal([]);

            await registry.add(walletOne);

            await environmentRegistry.add(new FabricEnvironmentRegistryEntry({ name: 'myEnvironment', environmentDirectory: path.join('test', 'data', 'nonManagedAnsible'), environmentType: EnvironmentType.ANSIBLE_ENVIRONMENT, managedRuntime: false }));

            const entries: FabricWalletRegistryEntry[] = await FabricWalletRegistry.instance().getAll();

            entries.length.should.equal(2);

            entries[0].name.should.equal('myWallet');

            entries[1].should.deep.equal(walletOne);
        });

        it('should get all including environments ones and set managed if from a managed environment', async () => {
            const walletOne: FabricWalletRegistryEntry = new FabricWalletRegistryEntry({
                name: 'walletOne',
                walletPath: 'myPath'
            });

            await registry.getAll().should.eventually.deep.equal([]);

            await registry.add(walletOne);

            await environmentRegistry.add(new FabricEnvironmentRegistryEntry({ name: 'myEnvironment', environmentDirectory: path.join('test', 'data', 'nonManagedAnsible'), environmentType: EnvironmentType.ANSIBLE_ENVIRONMENT, managedRuntime: true }));

            const entries: FabricWalletRegistryEntry[] = await FabricWalletRegistry.instance().getAll();

            entries.length.should.equal(2);

            entries[0].name.should.equal('myWallet');
            entries[0].managedWallet.should.equal(true);

            entries[1].should.deep.equal(walletOne);
        });
    });

    describe('get', () => {

        let walletOne: FabricWalletRegistryEntry;

        beforeEach(async () => {
            await FabricEnvironmentRegistry.instance().clear();
            await FabricWalletRegistry.instance().clear();
            walletOne = new FabricWalletRegistryEntry({
                name: 'walletOne',
                walletPath: 'myPath'
            });

            await FabricWalletRegistry.instance().add(walletOne);

            const environmentPath: string = path.resolve('test', 'data', 'nonManagedAnsible');

            await FabricEnvironmentRegistry.instance().add(new FabricEnvironmentRegistryEntry({ name: 'myEnvironment', environmentDirectory: environmentPath, environmentType: EnvironmentType.ANSIBLE_ENVIRONMENT }));
        });

        it('should get the wallet just based on the name', async () => {
            const result: FabricWalletRegistryEntry = await FabricWalletRegistry.instance().get('walletOne');

            result.should.deep.equal(walletOne);
        });

        it('should get the wallet based on the env name and name', async () => {
            const result: FabricWalletRegistryEntry = await FabricWalletRegistry.instance().get('myWallet', 'myEnvironment');

            result.name.should.equal('myWallet');
        });

        it('should throw an error if does not exist', async () => {
            await FabricWalletRegistry.instance().get('blah', 'myEnvironment').should.eventually.be.rejectedWith(`Entry "blah" from environment "myEnvironment" in registry "${FileConfigurations.FABRIC_WALLETS}" does not exist`);
        });

        it('should throw an error if does not exist and no from environment', async () => {
            await FabricWalletRegistry.instance().get('blah').should.eventually.be.rejectedWith(`Entry "blah" in registry "${FileConfigurations.FABRIC_WALLETS}" does not exist`);
        });
    });
});
