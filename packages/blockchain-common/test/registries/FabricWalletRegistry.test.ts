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
import * as fs from 'fs-extra';
import * as sinon from 'sinon';
import * as chaiAsPromised from 'chai-as-promised';
import { FabricWalletRegistryEntry } from '../../src/registries/FabricWalletRegistryEntry';
import { FabricWalletRegistry } from '../../src/registries/FabricWalletRegistry';
import { FabricRuntimeUtil } from '../../src/util/FabricRuntimeUtil';
import { FabricEnvironmentRegistryEntry, EnvironmentType } from '../../src/registries/FabricEnvironmentRegistryEntry';
import { FabricEnvironmentRegistry } from '../../src/registries/FabricEnvironmentRegistry';
import { FileConfigurations } from '../../src/registries/FileConfigurations';
import { FabricWalletGeneratorFactory } from '../../src/util/FabricWalletGeneratorFactory';
import { MicrofabEnvironment } from '../../src/environments/MicrofabEnvironment';
import { FileRegistry } from '../../src/registries/FileRegistry';

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

        let sandbox: sinon.SinonSandbox;

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

            await environmentRegistry.add(new FabricEnvironmentRegistryEntry({
                name: 'ansibleEnvironment',
                environmentDirectory: path.join('test', 'data', 'nonManagedAnsible'),
                environmentType: EnvironmentType.ANSIBLE_ENVIRONMENT,
                managedRuntime: false
            }));
            await environmentRegistry.add(new FabricEnvironmentRegistryEntry({
                name: 'microfabEnvironment',
                environmentDirectory: path.join('test', 'data', 'microfab'),
                environmentType: EnvironmentType.MICROFAB_ENVIRONMENT,
                managedRuntime: false
            }));

            const newMicrofabEnvironmentStub: sinon.SinonStub = sandbox.stub(FabricWalletRegistry.instance(), 'newMicrofabEnvironment');
            const mockMicrofabEnvironment: sinon.SinonStubbedInstance<MicrofabEnvironment> = sinon.createStubInstance(MicrofabEnvironment);
            mockMicrofabEnvironment.getWalletsAndIdentities.resolves([
                {
                    name: 'myWallet',
                    displayName: 'microfabEnvironment - myWallet'
                }
            ]);
            newMicrofabEnvironmentStub.callsFake((name: string, directory: string, url: string): sinon.SinonStubbedInstance<MicrofabEnvironment> => {
                newMicrofabEnvironmentStub['wrappedMethod'](name, directory, url);
                return mockMicrofabEnvironment;
            });

            const entries: FabricWalletRegistryEntry[] = await FabricWalletRegistry.instance().getAll();

            entries.length.should.equal(3);

            entries[0].displayName.should.equal('ansibleEnvironment - myWallet');
            entries[1].displayName.should.equal('microfabEnvironment - myWallet');
            entries[2].should.deep.equal(walletOne);

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

        it('should get the wallet if it has environmentGroups', async () => {
            walletOne.environmentGroups = ['myEnvironment'];
            await FabricWalletRegistry.instance().update(walletOne);

            const result: FabricWalletRegistryEntry = await FabricWalletRegistry.instance().get('walletOne');

            result.should.deep.equal(walletOne);
        });

        it('should get the wallet if it has been associated with the env name', async () => {
            walletOne.environmentGroups = ['myEnvironment'];
            await FabricWalletRegistry.instance().update(walletOne);

            const result: FabricWalletRegistryEntry = await FabricWalletRegistry.instance().get('walletOne', 'myEnvironment');

            result.should.deep.equal(walletOne);
        });

        it('should throw an error if does not exist', async () => {
            await FabricWalletRegistry.instance().get('blah', 'myEnvironment').should.eventually.be.rejectedWith(`Entry "blah" from environment "myEnvironment" in registry "${FileConfigurations.FABRIC_WALLETS}" does not exist`);
        });

        it('should throw an error if does not exist and no from environment', async () => {
            await FabricWalletRegistry.instance().get('blah').should.eventually.be.rejectedWith(`Entry "blah" in registry "${FileConfigurations.FABRIC_WALLETS}" does not exist`);
        });
    });

    describe('update', () => {

        let sandbox: sinon.SinonSandbox;

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

        it('should call the super update function', async () => {
            const updateStub: sinon.SinonStub = sandbox.stub(FileRegistry.prototype, 'update').resolves();

            const walletOne: FabricWalletRegistryEntry = new FabricWalletRegistryEntry({
                name: 'walletOne',
                walletPath: 'myPath'
            });

            await registry.getAll().should.eventually.deep.equal([]);

            await registry.add(walletOne);

            await FabricWalletRegistry.instance().update(walletOne);

            updateStub.should.have.been.calledWith(walletOne);
        });

        it('should write a config file if from an environment', async () => {
            const ensureDirStub: sinon.SinonStub = sandbox.stub(fs, 'ensureDir').resolves(true);
            const writeStub: sinon.SinonStub = sandbox.stub(fs, 'writeJSON').resolves();

            const walletOne: FabricWalletRegistryEntry = new FabricWalletRegistryEntry({
                name: 'walletOne',
                walletPath: 'myPath',
                fromEnvironment: 'myEnvironment'
            });

            await registry.getAll().should.eventually.deep.equal([]);

            await registry.add(walletOne);

            await FabricWalletRegistry.instance().update(walletOne);

            ensureDirStub.should.have.been.calledWith(path.join(walletOne.walletPath));
            writeStub.should.have.been.calledWith(path.join(walletOne.walletPath, '.config.json'), walletOne);
        });
    });
});
