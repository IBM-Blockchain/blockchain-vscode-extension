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

import { LocalEnvironmentManager } from '../../../extension/fabric/environments/LocalEnvironmentManager';
import { TestUtil } from '../../TestUtil';
import { FabricEnvironmentConnection } from 'ibm-blockchain-platform-environment-v1';
import { FabricConnectionFactory } from '../../../extension/fabric/FabricConnectionFactory';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { SettingConfigurations } from '../../../configurations';
import { FabricEnvironmentRegistryEntry, FabricRuntimeUtil, FabricEnvironmentRegistry, FabricGatewayRegistry, EnvironmentType } from 'ibm-blockchain-platform-common';
import { LocalEnvironment } from '../../../extension/fabric/environments/LocalEnvironment';
import { EnvironmentFactory } from '../../../extension/fabric/environments/EnvironmentFactory';

chai.should();

// tslint:disable no-unused-expression
describe('LocalEnvironmentManager', () => {

    const connectionRegistry: FabricGatewayRegistry = FabricGatewayRegistry.instance();
    const runtimeManager: LocalEnvironmentManager = LocalEnvironmentManager.instance();
    let mockConnection: sinon.SinonStubbedInstance<FabricEnvironmentConnection>;

    let sandbox: sinon.SinonSandbox;
    let findFreePortStub: sinon.SinonStub;
    let backupRuntime: LocalEnvironment;
    let originalRuntime: LocalEnvironment;

    before(async () => {
        await TestUtil.setupTests(sandbox);
        backupRuntime = new LocalEnvironment(FabricRuntimeUtil.LOCAL_FABRIC, {startPort: 17050, endPort: 17070}, 1);
    });

    beforeEach(async () => {
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
        findFreePortStub = sandbox.stub().resolves([17050, 17051, 17052, 17053, 17054, 17055, 17056, 17058, 17059, 17060, 17070]);
        sandbox.stub(LocalEnvironmentManager, 'findFreePort').value(findFreePortStub);
    });

    afterEach(async () => {
        sandbox.restore();
        runtimeManager['connection'] = runtimeManager['connectingPromise'] = undefined;
        runtimeManager['runtimes'] = undefined;
        await connectionRegistry.clear();
    });

    describe('#getRuntime', () => {
        it('should return the runtime', () => {
            runtimeManager.getRuntime(FabricRuntimeUtil.LOCAL_FABRIC).should.deep.equal(originalRuntime);
        });
    });

    describe('#updateRuntime', () => {
        it('should return the runtime', async () => {
            runtimeManager['runtimes'].size.should.equal(1);
            const newEnv: LocalEnvironment = new LocalEnvironment(FabricRuntimeUtil.LOCAL_FABRIC, {startPort: 21212, endPort: 21232}, 1);
            runtimeManager.updateRuntime(FabricRuntimeUtil.LOCAL_FABRIC, newEnv);
            runtimeManager['runtimes'].get(FabricRuntimeUtil.LOCAL_FABRIC).should.deep.equal(newEnv);
            runtimeManager['runtimes'].size.should.equal(1);
        });
    });

    describe('#ensureRuntime', () => {
        it('should get runtime if it already exists', async () => {
            runtimeManager['runtimes'].size.should.equal(1);
            const runtime: LocalEnvironment = await runtimeManager.ensureRuntime(FabricRuntimeUtil.LOCAL_FABRIC);
            runtime.should.deep.equal(originalRuntime);
            runtimeManager['runtimes'].size.should.equal(1);
        });

        it(`should create and add runtime if it doesn't exist already`, async () => {
            runtimeManager['runtimes'] = new Map();
            runtimeManager['runtimes'].size.should.equal(0);
            const runtime: LocalEnvironment = await runtimeManager.ensureRuntime(FabricRuntimeUtil.LOCAL_FABRIC, {startPort: 17050, endPort: 17070}, 1);
            runtime.should.deep.equal(originalRuntime);
            runtimeManager['runtimes'].size.should.equal(1);
        });

    });

    describe('#addRuntime', () => {

        beforeEach(async () => {
            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, {}, vscode.ConfigurationTarget.Global);
        });

        it(`should add runtime when ports and orgs are passed in`, async () => {
            runtimeManager['runtimes'] = new Map();
            runtimeManager['runtimes'].size.should.equal(0);
            const runtime: LocalEnvironment = await runtimeManager.addRuntime(FabricRuntimeUtil.LOCAL_FABRIC, {startPort: 17050, endPort: 17070}, 1);
            runtime.should.deep.equal(originalRuntime);
            runtimeManager['runtimes'].size.should.equal(1);
        });

        it(`should add runtime when orgs are passed in and ports exist in settings`, async () => {
            const settings: any = {};
            settings[FabricRuntimeUtil.LOCAL_FABRIC] = {
                ports: {
                    startPort: 17050,
                    endPort: 17070
                }
            };
            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, settings, vscode.ConfigurationTarget.Global);

            runtimeManager['runtimes'] = new Map();
            runtimeManager['runtimes'].size.should.equal(0);
            const runtime: LocalEnvironment = await runtimeManager.addRuntime(FabricRuntimeUtil.LOCAL_FABRIC, undefined, 1);
            runtime.should.deep.equal(originalRuntime);
            runtimeManager['runtimes'].size.should.equal(1);
        });

        it(`should add runtime when orgs are passed in and ports don't exist in settings`, async () => {
            const settings: any = {};
            settings[FabricRuntimeUtil.LOCAL_FABRIC] = {
                ports: {}
            };
            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, settings, vscode.ConfigurationTarget.Global);

            runtimeManager['runtimes'] = new Map();
            runtimeManager['runtimes'].size.should.equal(0);
            const runtime: LocalEnvironment = await runtimeManager.addRuntime(FabricRuntimeUtil.LOCAL_FABRIC, undefined, 1);
            runtime.should.deep.equal(originalRuntime);

            runtimeManager['runtimes'].size.should.equal(1);
        });

        it(`should add runtime when ports are passed in but orgs aren't`, async () => {
            runtimeManager['runtimes'] = new Map();
            runtimeManager['runtimes'].size.should.equal(0);

            const runtime: LocalEnvironment = await runtimeManager.addRuntime(FabricRuntimeUtil.LOCAL_FABRIC, {startPort: 17050, endPort: 17070});
            runtime.numberOfOrgs.should.equal(1);
            runtime.should.deep.equal(originalRuntime);
            runtimeManager['runtimes'].size.should.equal(1);
        });

        it(`should throw an error when runtime with ports are passed in but orgs aren't, and environment doesn't exist`, async () => {
            runtimeManager['runtimes'] = new Map();
            runtimeManager['runtimes'].size.should.equal(0);

            await FabricEnvironmentRegistry.instance().clear();

            try {
                await runtimeManager.addRuntime(FabricRuntimeUtil.LOCAL_FABRIC, {startPort: 17050, endPort: 17070});
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
                await runtimeManager.addRuntime(FabricRuntimeUtil.LOCAL_FABRIC, {startPort: 17050, endPort: 17070});
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

        beforeEach(async () => {
            const registryEntry: FabricEnvironmentRegistryEntry = await FabricEnvironmentRegistry.instance().get(FabricRuntimeUtil.LOCAL_FABRIC);
            const getEnvironmentStub: sinon.SinonStub = sandbox.stub(EnvironmentFactory, 'getEnvironment');
            getEnvironmentStub.callThrough();
            getEnvironmentStub.withArgs(registryEntry).returns(originalRuntime);

            isCreatedStub = sandbox.stub(LocalEnvironment.prototype, 'isCreated').resolves(true);
            updateUserSettingsStub = sandbox.stub(LocalEnvironment.prototype, 'updateUserSettings').resolves(); // these need to be on the runtime we retrieve
            createStub = sandbox.stub(LocalEnvironment.prototype, 'create').resolves();
        });

        it('should use existing configuration and import all wallets/identities', async () => {
            sandbox.stub(LocalEnvironmentManager.instance(), 'ensureRuntime').returns(originalRuntime);
            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, {
                '1 Org Local Fabric': {
                    ports: {
                        startPort: 17050,
                        endPort: 17070
                    }
                }
            }, vscode.ConfigurationTarget.Global);
            await runtimeManager.initialize(FabricRuntimeUtil.LOCAL_FABRIC, 1);
            const runtime: LocalEnvironment = runtimeManager['runtimes'].get(FabricRuntimeUtil.LOCAL_FABRIC);

            runtime.ports.should.deep.equal({
                startPort: 17050,
                endPort: 17070
            });

            updateUserSettingsStub.should.not.have.been.called;
        });

        it('should generate new configuration', async () => {

            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, {}, vscode.ConfigurationTarget.Global);

            findFreePortStub.returns([17050, 17070]);
            await runtimeManager.initialize(FabricRuntimeUtil.LOCAL_FABRIC, 1);
            const runtime: LocalEnvironment = runtimeManager['runtimes'].get(FabricRuntimeUtil.LOCAL_FABRIC);

            runtime.ports.should.deep.equal({
                startPort: 17050,
                endPort: 17070
            });
            updateUserSettingsStub.should.have.been.calledOnce;
        });

        it('create the runtime if it is not already created', async () => {
            isCreatedStub.resolves(false);
            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, {}, vscode.ConfigurationTarget.Global);
            findFreePortStub.returns([17050, 17070]);

            await runtimeManager.initialize(FabricRuntimeUtil.LOCAL_FABRIC, 1);
            const runtime: LocalEnvironment = runtimeManager['runtimes'].get(FabricRuntimeUtil.LOCAL_FABRIC);

            runtime.ports.should.deep.equal({
                startPort: 17050,
                endPort: 17070
            });
            updateUserSettingsStub.should.have.been.calledOnce;
            createStub.should.have.been.calledOnce;
        });

        it('create the runtime on ports not already used in the settings', async () => {
            isCreatedStub.resolves(false);

            const runtimes: any = {
                localRuntime1: {
                    ports: {
                        startPort: 17050,
                        endPort: 17070
                    }
                },
                localRuntime2: {
                    ports: {
                        startPort: 19050,
                        endPort: 19070
                    }
                },
                localRuntime3: {
                    ports: {
                        startPort: 18050,
                        endPort: 18070
                    }
                }
            };

            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, runtimes, vscode.ConfigurationTarget.Global);
            findFreePortStub.returns([19075, 19095]);

            await runtimeManager.initialize(FabricRuntimeUtil.LOCAL_FABRIC, 1);
            findFreePortStub.should.have.been.calledOnceWithExactly(19071, null, null, 20);
            const runtime: LocalEnvironment = runtimeManager['runtimes'].get(FabricRuntimeUtil.LOCAL_FABRIC);

            runtime.ports.should.deep.equal({
                startPort: 19075,
                endPort: 19095
            });
            updateUserSettingsStub.should.have.been.calledOnce;
            createStub.should.have.been.calledOnce;
        });
    });
});
