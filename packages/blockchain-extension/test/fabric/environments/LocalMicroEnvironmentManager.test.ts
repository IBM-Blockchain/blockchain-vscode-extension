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

import { LocalMicroEnvironmentManager } from '../../../extension/fabric/environments/LocalMicroEnvironmentManager';
import { TestUtil } from '../../TestUtil';
import { FabricEnvironmentConnection } from 'ibm-blockchain-platform-environment-v1';
import { FabricConnectionFactory } from '../../../extension/fabric/FabricConnectionFactory';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { SettingConfigurations } from '../../../extension/configurations';
import { FabricEnvironmentRegistryEntry, FabricRuntimeUtil, FabricEnvironmentRegistry, FabricGatewayRegistry, EnvironmentType } from 'ibm-blockchain-platform-common';
import { EnvironmentFactory } from '../../../extension/fabric/environments/EnvironmentFactory';
import { LocalMicroEnvironment } from '../../../extension/fabric/environments/LocalMicroEnvironment';

chai.should();

// tslint:disable no-unused-expression
describe('LocalMicroEnvironmentManager', () => {

    const connectionRegistry: FabricGatewayRegistry = FabricGatewayRegistry.instance();
    const runtimeManager: LocalMicroEnvironmentManager = LocalMicroEnvironmentManager.instance();
    let mockConnection: sinon.SinonStubbedInstance<FabricEnvironmentConnection>;

    let sandbox: sinon.SinonSandbox;
    let findFreePortStub: sinon.SinonStub;
    let backupRuntime: LocalMicroEnvironment;
    let originalRuntime: LocalMicroEnvironment;

    before(async () => {
        await TestUtil.setupTests(sandbox);
        backupRuntime = new LocalMicroEnvironment(FabricRuntimeUtil.LOCAL_FABRIC, 8080, 1);
    });

    beforeEach(async () => {
        await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, {}, vscode.ConfigurationTarget.Global);

        await FabricEnvironmentRegistry.instance().clear();
        await TestUtil.setupLocalFabric();
        originalRuntime = backupRuntime;
        sandbox = sinon.createSandbox();
        await connectionRegistry.clear();

        runtimeManager['connection'] = runtimeManager['connectingPromise'] = undefined;

        runtimeManager['runtimes'] = new Map();
        runtimeManager['runtimes'].set(FabricRuntimeUtil.LOCAL_FABRIC, originalRuntime);
        mockConnection = sandbox.createStubInstance(FabricEnvironmentConnection);
        sandbox.stub(FabricConnectionFactory, 'createFabricEnvironmentConnection').returns(mockConnection);
        findFreePortStub = sandbox.stub().resolves([8080, 8081, 8082]);
        sandbox.stub(LocalMicroEnvironmentManager, 'findFreePort').value(findFreePortStub);
    });

    afterEach(async () => {
        sandbox.restore();
        runtimeManager['connection'] = runtimeManager['connectingPromise'] = undefined;
        runtimeManager['runtimes'] = new Map();
        await connectionRegistry.clear();
        await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, {}, vscode.ConfigurationTarget.Global);
    });

    describe('#getRuntime', () => {
        it('should return the runtime', () => {
            runtimeManager.getRuntime(FabricRuntimeUtil.LOCAL_FABRIC).should.deep.equal(originalRuntime);
        });
    });

    describe('#updateRuntime', () => {
        it('should return the runtime', async () => {
            runtimeManager['runtimes'].size.should.equal(1);
            const newEnv: LocalMicroEnvironment = new LocalMicroEnvironment(FabricRuntimeUtil.LOCAL_FABRIC, 9080, 1);
            runtimeManager.updateRuntime(FabricRuntimeUtil.LOCAL_FABRIC, newEnv);
            runtimeManager['runtimes'].get(FabricRuntimeUtil.LOCAL_FABRIC).should.deep.equal(newEnv);
            runtimeManager['runtimes'].size.should.equal(1);
        });
    });

    describe('#ensureRuntime', () => {
        it('should get runtime if it already exists', async () => {
            runtimeManager['runtimes'].size.should.equal(1);
            const runtime: LocalMicroEnvironment = await runtimeManager.ensureRuntime(FabricRuntimeUtil.LOCAL_FABRIC);
            runtime.should.deep.equal(originalRuntime);
            runtimeManager['runtimes'].size.should.equal(1);
        });

        it(`should create and add runtime if it doesn't exist already`, async () => {
            runtimeManager['runtimes'] = new Map();
            runtimeManager['runtimes'].size.should.equal(0);
            const runtime: LocalMicroEnvironment = await runtimeManager.ensureRuntime(FabricRuntimeUtil.LOCAL_FABRIC, 8080, 1);
            runtimeManager['runtimes'].size.should.equal(1);
            runtime['dockerName'].should.equal(originalRuntime['dockerName']);
            runtime['name'].should.equal(originalRuntime['name']);
            runtime['numberOfOrgs'].should.equal(originalRuntime['numberOfOrgs']);
            runtime['path'].should.equal(originalRuntime['path']);
            runtime['port'].should.equal(originalRuntime['port']);
            runtime['url'].should.equal(originalRuntime['url']);
        });

    });

    describe('#addRuntime', () => {

        beforeEach(async () => {
            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, {}, vscode.ConfigurationTarget.Global);
        });

        it(`should add runtime when ports and orgs are passed in`, async () => {
            runtimeManager['runtimes'] = new Map();
            runtimeManager['runtimes'].size.should.equal(0);
            const runtime: LocalMicroEnvironment = await runtimeManager.addRuntime(FabricRuntimeUtil.LOCAL_FABRIC, 8080, 1);
            runtime['dockerName'].should.equal(originalRuntime['dockerName']);
            runtime['name'].should.equal(originalRuntime['name']);
            runtime['numberOfOrgs'].should.equal(originalRuntime['numberOfOrgs']);
            runtime['path'].should.equal(originalRuntime['path']);
            runtime['port'].should.equal(originalRuntime['port']);
            runtime['url'].should.equal(originalRuntime['url']);
            runtimeManager['runtimes'].size.should.equal(1);
        });

        it(`should add runtime when orgs are passed in and ports exist in settings`, async () => {
            const settings: any = {};
            settings[FabricRuntimeUtil.LOCAL_FABRIC] = 8080;
            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, settings, vscode.ConfigurationTarget.Global);

            runtimeManager['runtimes'] = new Map();
            runtimeManager['runtimes'].size.should.equal(0);
            const runtime: LocalMicroEnvironment = await runtimeManager.addRuntime(FabricRuntimeUtil.LOCAL_FABRIC, undefined, 1);
            runtime['dockerName'].should.equal(originalRuntime['dockerName']);
            runtime['name'].should.equal(originalRuntime['name']);
            runtime['numberOfOrgs'].should.equal(originalRuntime['numberOfOrgs']);
            runtime['path'].should.equal(originalRuntime['path']);
            runtime['port'].should.equal(originalRuntime['port']);
            runtime['url'].should.equal(originalRuntime['url']);
            runtimeManager['runtimes'].size.should.equal(1);
        });

        it(`should add runtime when orgs are passed in and ports don't exist in settings`, async () => {
            const settings: any = {};
            // settings[FabricRuntimeUtil.LOCAL_FABRIC] = undefined;
            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, settings, vscode.ConfigurationTarget.Global);

            runtimeManager['runtimes'] = new Map();
            runtimeManager['runtimes'].size.should.equal(0);
            const runtime: LocalMicroEnvironment = await runtimeManager.addRuntime(FabricRuntimeUtil.LOCAL_FABRIC, undefined, 1);
            runtime['dockerName'].should.equal(originalRuntime['dockerName']);
            runtime['name'].should.equal(originalRuntime['name']);
            runtime['numberOfOrgs'].should.equal(originalRuntime['numberOfOrgs']);
            runtime['path'].should.equal(originalRuntime['path']);
            runtime['port'].should.equal(originalRuntime['port']);
            runtime['url'].should.equal(originalRuntime['url']);

            runtimeManager['runtimes'].size.should.equal(1);
        });

        it(`should add runtime when ports are passed in but orgs aren't`, async () => {
            runtimeManager['runtimes'] = new Map();
            runtimeManager['runtimes'].size.should.equal(0);

            const runtime: LocalMicroEnvironment = await runtimeManager.addRuntime(FabricRuntimeUtil.LOCAL_FABRIC, 8080);
            runtime['dockerName'].should.equal(originalRuntime['dockerName']);
            runtime['name'].should.equal(originalRuntime['name']);
            runtime['numberOfOrgs'].should.equal(originalRuntime['numberOfOrgs']);
            runtime['path'].should.equal(originalRuntime['path']);
            runtime['port'].should.equal(originalRuntime['port']);
            runtime['url'].should.equal(originalRuntime['url']);
            runtimeManager['runtimes'].size.should.equal(1);
        });

        it(`should throw an error when runtime with ports are passed in but orgs aren't, and environment doesn't exist`, async () => {
            runtimeManager['runtimes'] = new Map();
            runtimeManager['runtimes'].size.should.equal(0);

            await FabricEnvironmentRegistry.instance().clear();

            try {
                await runtimeManager.addRuntime(FabricRuntimeUtil.LOCAL_FABRIC, 8080);
            } catch (error) {
                error.message.should.deep.equal(`Unable to add runtime as environment '${FabricRuntimeUtil.LOCAL_FABRIC}' does not exist.`);

            }

            runtimeManager['runtimes'].size.should.equal(0);
        });

        it(`should throw an error when runtime with ports are passed in but orgs aren't, and environment doesn't have 'numberOfOrgs' property`, async () => {
            runtimeManager['runtimes'] = new Map();
            runtimeManager['runtimes'].size.should.equal(0);

            await FabricEnvironmentRegistry.instance().clear();
            await FabricEnvironmentRegistry.instance().add({name: FabricRuntimeUtil.LOCAL_FABRIC, environmentType: EnvironmentType.LOCAL_ENVIRONMENT, managedRuntime: true});

            try {
                await runtimeManager.addRuntime(FabricRuntimeUtil.LOCAL_FABRIC, 8080);
            } catch (error) {
                error.message.should.deep.equal(`Unable to add runtime as environment '${FabricRuntimeUtil.LOCAL_FABRIC}' does not have 'numberOfOrgs' property.`);

            }

            runtimeManager['runtimes'].size.should.equal(0);
        });

    });

    describe('#removeRuntime', () => {
        it('should remove runtime from manager if it exists', async () => {
            runtimeManager['runtimes'].size.should.equal(1);
            runtimeManager.removeRuntime(FabricRuntimeUtil.LOCAL_FABRIC);
            runtimeManager['runtimes'].size.should.equal(0);
        });

        it(`should not do anything (or error) if the runtime doesn't exist to delete`, async () => {
            runtimeManager['runtimes'] = new Map();
            runtimeManager['runtimes'].size.should.equal(0);

            ((): void => {
                runtimeManager.removeRuntime(FabricRuntimeUtil.LOCAL_FABRIC);
            }).should.not.throw;

            runtimeManager['runtimes'].size.should.equal(0);
        });
    });

    describe('#initialize', () => {
        let isCreatedStub: sinon.SinonStub;
        let updateUserSettingsStub: sinon.SinonStub;
        let createStub: sinon.SinonStub;
        let teardownStub: sinon.SinonStub;
        beforeEach(async () => {
            const registryEntry: FabricEnvironmentRegistryEntry = await FabricEnvironmentRegistry.instance().get(FabricRuntimeUtil.LOCAL_FABRIC);
            const getEnvironmentStub: sinon.SinonStub = sandbox.stub(EnvironmentFactory, 'getEnvironment');
            getEnvironmentStub.callThrough();
            getEnvironmentStub.withArgs(registryEntry).returns(originalRuntime);

            isCreatedStub = sandbox.stub(LocalMicroEnvironment.prototype, 'isCreated').resolves(true);
            updateUserSettingsStub = sandbox.stub(LocalMicroEnvironment.prototype, 'updateUserSettings').resolves(); // these need to be on the runtime we retrieve
            createStub = sandbox.stub(LocalMicroEnvironment.prototype, 'create').resolves();
            teardownStub = sandbox.stub(LocalMicroEnvironment.prototype, 'teardown').resolves();
        });

        it('should use existing configuration and import all wallets/identities', async () => {
            sandbox.stub(LocalMicroEnvironmentManager.instance(), 'ensureRuntime').returns(originalRuntime);
            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, {
                '1 Org Local Fabric': 8080
            }, vscode.ConfigurationTarget.Global);
            await runtimeManager.initialize(FabricRuntimeUtil.LOCAL_FABRIC, 1);
            const runtime: LocalMicroEnvironment = runtimeManager['runtimes'].get(FabricRuntimeUtil.LOCAL_FABRIC);

            runtime.port.should.equal(8080);

            updateUserSettingsStub.should.not.have.been.called;
        });

        it('should generate new configuration', async () => {

            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, {}, vscode.ConfigurationTarget.Global);

            findFreePortStub.resolves([8080, 8081]);
            await runtimeManager.initialize(FabricRuntimeUtil.LOCAL_FABRIC, 1);
            const runtime: LocalMicroEnvironment = runtimeManager['runtimes'].get(FabricRuntimeUtil.LOCAL_FABRIC);

            runtime.port.should.equal(8080);
            updateUserSettingsStub.should.have.been.calledOnce;
        });

        it('create the runtime if it is not already created', async () => {
            isCreatedStub.resolves(false);
            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, {}, vscode.ConfigurationTarget.Global);
            findFreePortStub.resolves([8080, 8081]);

            await runtimeManager.initialize(FabricRuntimeUtil.LOCAL_FABRIC, 1);
            const runtime: LocalMicroEnvironment = runtimeManager['runtimes'].get(FabricRuntimeUtil.LOCAL_FABRIC);

            runtime.port.should.equal(8080);
            updateUserSettingsStub.should.have.been.calledOnce;
            createStub.should.have.been.calledOnce;
        });

        it('create the runtime on ports not already used in the settings', async () => {
            isCreatedStub.resolves(false);

            const runtimes: any = {
                localRuntime1: 8080,
                localRuntime2: 8081,
                localRuntime3: 8082
            };

            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, runtimes, vscode.ConfigurationTarget.Global);
            findFreePortStub.resolves([8083, 8084]);

            await runtimeManager.initialize(FabricRuntimeUtil.LOCAL_FABRIC, 1);
            findFreePortStub.should.have.been.calledOnceWithExactly(8083, null, null, 20);
            const runtime: LocalMicroEnvironment = runtimeManager['runtimes'].get(FabricRuntimeUtil.LOCAL_FABRIC);

            runtime.port.should.equal(8083);
            updateUserSettingsStub.should.have.been.calledOnce;
            createStub.should.have.been.calledOnce;
        });

        it('should teardown if entry url is out of date', async () => {
            isCreatedStub.resolves(true);
            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, {}, vscode.ConfigurationTarget.Global);
            findFreePortStub.resolves([8080, 8081]);
            const getEnvironmentEntryStub: sinon.SinonStub = sandbox.stub(FabricEnvironmentRegistry.instance(), 'get');
            getEnvironmentEntryStub.callThrough();
            getEnvironmentEntryStub.withArgs(FabricRuntimeUtil.LOCAL_FABRIC).resolves({
                url: 'http://localhost:9000'
            });
            await runtimeManager.initialize(FabricRuntimeUtil.LOCAL_FABRIC, 1);
            const runtime: LocalMicroEnvironment = runtimeManager['runtimes'].get(FabricRuntimeUtil.LOCAL_FABRIC);

            runtime.port.should.equal(8080);
            updateUserSettingsStub.should.have.been.calledOnce;
            createStub.should.not.have.been.called;
            teardownStub.should.have.been.calledOnce;
        });
    });
});
