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
import { MicrofabClient } from '../../src/environments/MicrofabClient';

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
        const getIdentitiesStub: sinon.SinonStub = sinon.stub().resolves([
            {
                id: 'org1admin',
                display_name: 'Org1 Admin',
                type: 'identity',
                cert: 'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUJ6RENDQVhTZ0F3SUJBZ0lRZHBtaE9FOVkxQ3V3WHl2b3pmMjFRakFLQmdncWhrak9QUVFEQWpBU01SQXcKRGdZRFZRUURFd2RQY21jeElFTkJNQjRYRFRJd01EVXhOREV3TkRjd01Gb1hEVE13TURVeE1qRXdORGN3TUZvdwpKVEVPTUF3R0ExVUVDeE1GWVdSdGFXNHhFekFSQmdOVkJBTVRDazl5WnpFZ1FXUnRhVzR3V1RBVEJnY3Foa2pPClBRSUJCZ2dxaGtqT1BRTUJCd05DQUFSN0l4UmRGb0theE1ZWHFyK01zU1F6UDhIS1lITVphRmYrVmt3SnpsbisKNGJsa1M0aWVxZFRiRWhqUThvc1F2QmxpZk1Ca29YeUVKd3JkNHdmUzNtc1dvNEdZTUlHVk1BNEdBMVVkRHdFQgovd1FFQXdJRm9EQWRCZ05WSFNVRUZqQVVCZ2dyQmdFRkJRY0RBZ1lJS3dZQkJRVUhBd0V3REFZRFZSMFRBUUgvCkJBSXdBREFwQmdOVkhRNEVJZ1FnNEpNUmx6cVhxaEFTaE1EaHIrOE5Hd0FFVE85bDFld3lJcDh0RHBMMTZMa3cKS3dZRFZSMGpCQ1F3SW9BZ21qczI3VG56V0ZvZWZ4Y3RYMGRZWUl4UnJKRmpVeXdyTHJ3YzMzdkp3Tmd3Q2dZSQpLb1pJemowRUF3SURSZ0F3UXdJZkVkS2xoSCsySk4yNDhVQnE3UjBtWnU5NGxiK1BXRFA4QnAxN0hMSHpMQUlnClRSMVF4ZUUrUitkNDhpWjB0ZEZ2S1FRVGQvWTJlZXJZMnJiUDZsQzVYWUU9Ci0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K',
                private_key: 'LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JR0hBZ0VBTUJNR0J5cUdTTTQ5QWdFR0NDcUdTTTQ5QXdFSEJHMHdhd0lCQVFRZ1RMdWdydldMaXVvNWM5dnUKenh4MjBmZzBJS1B2c0haV2NLenUrTUVUcmNhaFJBTkNBQVI3SXhSZEZvS2F4TVlYcXIrTXNTUXpQOEhLWUhNWgphRmYrVmt3Snpsbis0YmxrUzRpZXFkVGJFaGpROG9zUXZCbGlmTUJrb1h5RUp3cmQ0d2ZTM21zVwotLS0tLUVORCBQUklWQVRFIEtFWS0tLS0tCg==',
                msp_id: 'Org1MSP',
                wallet: 'Org1'
            }
        ]);
        const existsStub: sinon.SinonStub = sinon.stub().resolves(true);
        const mockFabricWallet: any = {
            importIdentity: importIdentityStub,
            getIdentities: getIdentitiesStub,
            exists: existsStub
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

            await FabricEnvironmentRegistry.instance().add({name: FabricRuntimeUtil.LOCAL_FABRIC, environmentDirectory: path.join(__dirname, '..', '..', '..', '..', 'test', 'data', FabricRuntimeUtil.LOCAL_FABRIC), environmentType: EnvironmentType.LOCAL_MICROFAB_ENVIRONMENT, numberOfOrgs: 1, managedRuntime: true,  url: 'http://someurl:9000', fabricCapabilities: 'V2_0'});

            sandbox.stub(MicrofabClient.prototype, 'isAlive').resolves(true);
            // // This will get the code working.
            sandbox.stub(MicrofabClient.prototype, 'getComponents').resolves([
                {
                    id: 'org1admin',
                    display_name: 'Org1 Admin',
                    type: 'identity',
                    cert: 'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUJ6RENDQVhTZ0F3SUJBZ0lRZHBtaE9FOVkxQ3V3WHl2b3pmMjFRakFLQmdncWhrak9QUVFEQWpBU01SQXcKRGdZRFZRUURFd2RQY21jeElFTkJNQjRYRFRJd01EVXhOREV3TkRjd01Gb1hEVE13TURVeE1qRXdORGN3TUZvdwpKVEVPTUF3R0ExVUVDeE1GWVdSdGFXNHhFekFSQmdOVkJBTVRDazl5WnpFZ1FXUnRhVzR3V1RBVEJnY3Foa2pPClBRSUJCZ2dxaGtqT1BRTUJCd05DQUFSN0l4UmRGb0theE1ZWHFyK01zU1F6UDhIS1lITVphRmYrVmt3SnpsbisKNGJsa1M0aWVxZFRiRWhqUThvc1F2QmxpZk1Ca29YeUVKd3JkNHdmUzNtc1dvNEdZTUlHVk1BNEdBMVVkRHdFQgovd1FFQXdJRm9EQWRCZ05WSFNVRUZqQVVCZ2dyQmdFRkJRY0RBZ1lJS3dZQkJRVUhBd0V3REFZRFZSMFRBUUgvCkJBSXdBREFwQmdOVkhRNEVJZ1FnNEpNUmx6cVhxaEFTaE1EaHIrOE5Hd0FFVE85bDFld3lJcDh0RHBMMTZMa3cKS3dZRFZSMGpCQ1F3SW9BZ21qczI3VG56V0ZvZWZ4Y3RYMGRZWUl4UnJKRmpVeXdyTHJ3YzMzdkp3Tmd3Q2dZSQpLb1pJemowRUF3SURSZ0F3UXdJZkVkS2xoSCsySk4yNDhVQnE3UjBtWnU5NGxiK1BXRFA4QnAxN0hMSHpMQUlnClRSMVF4ZUUrUitkNDhpWjB0ZEZ2S1FRVGQvWTJlZXJZMnJiUDZsQzVYWUU9Ci0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K',
                    private_key: 'LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JR0hBZ0VBTUJNR0J5cUdTTTQ5QWdFR0NDcUdTTTQ5QXdFSEJHMHdhd0lCQVFRZ1RMdWdydldMaXVvNWM5dnUKenh4MjBmZzBJS1B2c0haV2NLenUrTUVUcmNhaFJBTkNBQVI3SXhSZEZvS2F4TVlYcXIrTXNTUXpQOEhLWUhNWgphRmYrVmt3Snpsbis0YmxrUzRpZXFkVGJFaGpROG9zUXZCbGlmTUJrb1h5RUp3cmQ0d2ZTM21zVwotLS0tLUVORCBQUklWQVRFIEtFWS0tLS0tCg==',
                    msp_id: 'Org1MSP',
                    wallet: 'Org1'
                }
            ]);

            sandbox.stub(MicrofabEnvironment.prototype, 'getIdentities').resolves([
                {
                    id: 'org1admin',
                    display_name: 'Org1 Admin',
                    type: 'identity',
                    cert: 'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUJ6RENDQVhTZ0F3SUJBZ0lRZHBtaE9FOVkxQ3V3WHl2b3pmMjFRakFLQmdncWhrak9QUVFEQWpBU01SQXcKRGdZRFZRUURFd2RQY21jeElFTkJNQjRYRFRJd01EVXhOREV3TkRjd01Gb1hEVE13TURVeE1qRXdORGN3TUZvdwpKVEVPTUF3R0ExVUVDeE1GWVdSdGFXNHhFekFSQmdOVkJBTVRDazl5WnpFZ1FXUnRhVzR3V1RBVEJnY3Foa2pPClBRSUJCZ2dxaGtqT1BRTUJCd05DQUFSN0l4UmRGb0theE1ZWHFyK01zU1F6UDhIS1lITVphRmYrVmt3SnpsbisKNGJsa1M0aWVxZFRiRWhqUThvc1F2QmxpZk1Ca29YeUVKd3JkNHdmUzNtc1dvNEdZTUlHVk1BNEdBMVVkRHdFQgovd1FFQXdJRm9EQWRCZ05WSFNVRUZqQVVCZ2dyQmdFRkJRY0RBZ1lJS3dZQkJRVUhBd0V3REFZRFZSMFRBUUgvCkJBSXdBREFwQmdOVkhRNEVJZ1FnNEpNUmx6cVhxaEFTaE1EaHIrOE5Hd0FFVE85bDFld3lJcDh0RHBMMTZMa3cKS3dZRFZSMGpCQ1F3SW9BZ21qczI3VG56V0ZvZWZ4Y3RYMGRZWUl4UnJKRmpVeXdyTHJ3YzMzdkp3Tmd3Q2dZSQpLb1pJemowRUF3SURSZ0F3UXdJZkVkS2xoSCsySk4yNDhVQnE3UjBtWnU5NGxiK1BXRFA4QnAxN0hMSHpMQUlnClRSMVF4ZUUrUitkNDhpWjB0ZEZ2S1FRVGQvWTJlZXJZMnJiUDZsQzVYWUU9Ci0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K',
                    private_key: 'LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JR0hBZ0VBTUJNR0J5cUdTTTQ5QWdFR0NDcUdTTTQ5QXdFSEJHMHdhd0lCQVFRZ1RMdWdydldMaXVvNWM5dnUKenh4MjBmZzBJS1B2c0haV2NLenUrTUVUcmNhaFJBTkNBQVI3SXhSZEZvS2F4TVlYcXIrTXNTUXpQOEhLWUhNWgphRmYrVmt3Snpsbis0YmxrUzRpZXFkVGJFaGpROG9zUXZCbGlmTUJrb1h5RUp3cmQ0d2ZTM21zVwotLS0tLUVORCBQUklWQVRFIEtFWS0tLS0tCg==',
                    msp_id: 'Org1MSP',
                    wallet: 'Org1'
                }
            ]);

            const localFabricOrgEntry: FabricWalletRegistryEntry = await FabricWalletRegistry.instance().get('Org1', FabricRuntimeUtil.LOCAL_FABRIC);

            await registry.add(walletOne);
            await registry.add(walletTwo);

            const wallets: any = await registry.getAll();
            wallets.length.should.equal(3);

            wallets[0].should.deep.equal(localFabricOrgEntry);
            wallets[1].should.deep.equal(walletOne);
            wallets[2].should.deep.equal(walletTwo);
        });

        it('should get all wallets but not show local fabric', async () => {
            const walletOne: FabricWalletRegistryEntry = new FabricWalletRegistryEntry({
                name: 'walletOne',
                walletPath: 'myPath'
            });

            await registry.getAll().should.eventually.deep.equal([]);

            await FabricEnvironmentRegistry.instance().add({name: FabricRuntimeUtil.LOCAL_FABRIC, environmentDirectory: path.join(__dirname, '..', 'data', FabricRuntimeUtil.LOCAL_FABRIC), environmentType: EnvironmentType.LOCAL_MICROFAB_ENVIRONMENT, managedRuntime: true, numberOfOrgs: 1,  url: 'http://someurl:9000', fabricCapabilities: 'V2_0'});
            await FabricEnvironmentRegistry.instance().add({name: 'otherLocalEnv', environmentType: EnvironmentType.LOCAL_MICROFAB_ENVIRONMENT, managedRuntime: true, environmentDirectory : path.join(__dirname, '..', 'data', 'otherLocalEnv'), numberOfOrgs: 1,  url: 'http://anotherurl:9000', fabricCapabilities: 'V2_0'});

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
                managedRuntime: false,
                url: 'http://someurl:9001'
            }));

            const newMicrofabEnvironmentStub: sinon.SinonStub = sandbox.stub(FabricWalletRegistry.instance(), 'newMicrofabEnvironment');
            const mockMicrofabEnvironment: sinon.SinonStubbedInstance<MicrofabEnvironment> = sinon.createStubInstance(MicrofabEnvironment);
            mockMicrofabEnvironment.isAlive.resolves(true);
            const mockClient: sinon.SinonStubbedInstance<MicrofabClient> = sinon.createStubInstance(MicrofabClient);
            mockMicrofabEnvironment.url = 'http://someurl:9001';
            mockMicrofabEnvironment['client'] = mockClient as any;
            mockMicrofabEnvironment.setClient.returns(undefined);

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

        it('should get all including environments ones, but excluding Microfab ones that are not alive', async () => {
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
                environmentType: EnvironmentType.LOCAL_MICROFAB_ENVIRONMENT,
                managedRuntime: false,
                url: 'http://someurl:9001'
            }));

            const newMicrofabEnvironmentStub: sinon.SinonStub = sandbox.stub(FabricWalletRegistry.instance(), 'newMicrofabEnvironment');
            const mockMicrofabEnvironment: sinon.SinonStubbedInstance<MicrofabEnvironment> = sinon.createStubInstance(MicrofabEnvironment);
            mockMicrofabEnvironment.isAlive.resolves(false);
            mockMicrofabEnvironment.getWalletsAndIdentities.rejects(new Error('should not be called'));
            mockMicrofabEnvironment.setClient.returns(undefined);
            mockMicrofabEnvironment.url = 'http://someurl:9001';
            newMicrofabEnvironmentStub.callsFake((name: string, directory: string, url: string): sinon.SinonStubbedInstance<MicrofabEnvironment> => {
                newMicrofabEnvironmentStub['wrappedMethod'](name, directory, url);
                return mockMicrofabEnvironment;
            });

            const entries: FabricWalletRegistryEntry[] = await FabricWalletRegistry.instance().getAll();

            entries.length.should.equal(2);

            entries[0].displayName.should.equal('ansibleEnvironment - myWallet');
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
