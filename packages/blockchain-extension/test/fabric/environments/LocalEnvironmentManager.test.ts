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
import { CommandUtil } from '../../../extension/util/CommandUtil';
import { version } from '../../../package.json';
import { VSCodeBlockchainOutputAdapter } from '../../../extension/logging/VSCodeBlockchainOutputAdapter';
import { SettingConfigurations } from '../../../configurations';
import { FabricEnvironmentRegistryEntry, FabricRuntimeUtil, FileSystemUtil, FabricEnvironmentRegistry, FabricGatewayRegistry, EnvironmentType } from 'ibm-blockchain-platform-common';
import * as fs from 'fs-extra';
import * as path from 'path';
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

        it('should migrate if old style-ports are used and need to be updated to a start and end port range', async () => {
            originalRuntime.ports = {startPort: 1, endPort: 21};
            sandbox.stub(LocalEnvironmentManager.instance(), 'ensureRuntime').returns(originalRuntime);

            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, {
                ports: {
                    orderer: 8,
                    peerRequest: 6,
                    peerChaincode: 1,
                    peerEventHub: 3,
                    certificateAuthority: 2,
                    couchDB: 4,
                    otherRandomVariable: 12
                }
            }, vscode.ConfigurationTarget.Global);
            await runtimeManager.initialize(FabricRuntimeUtil.LOCAL_FABRIC, 1);
            const runtime: LocalEnvironment = runtimeManager['runtimes'].get(FabricRuntimeUtil.LOCAL_FABRIC);

            runtime.ports.should.deep.equal({
                startPort: 1,
                endPort: 21
            });
            updateUserSettingsStub.should.have.been.calledOnce;
        });

        it('should migrate if old style-ports are used with no values and need to be updated to a start and end port range', async () => {
            originalRuntime.ports = {startPort: 17050, endPort: 17070};
            sandbox.stub(LocalEnvironmentManager.instance(), 'ensureRuntime').returns(originalRuntime);

            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, {
                ports: {

                }
            }, vscode.ConfigurationTarget.Global);
            await runtimeManager.initialize(FabricRuntimeUtil.LOCAL_FABRIC, 1);
            const runtime: LocalEnvironment = runtimeManager['runtimes'].get(FabricRuntimeUtil.LOCAL_FABRIC);

            runtime.ports.should.deep.equal({
                startPort: 17050,
                endPort: 17070
            });
            updateUserSettingsStub.should.have.been.calledOnce;
        });
    });

    describe('#migrate', () => {

        let getStub: sinon.SinonStub;
        let updateStub: sinon.SinonStub;
        let sendCommandWithOutputStub: sinon.SinonStub;

        beforeEach(() => {
            getStub = sandbox.stub();
            getStub.withArgs(SettingConfigurations.FABRIC_RUNTIME).returns({
                '1 Org Local Fabric': {
                    ports: {
                        startPort: 17050,
                        endPort: 17070
                    }
                }
            });
            getStub.withArgs('fabric.runtime').returns({});
            getStub.withArgs(SettingConfigurations.EXTENSION_DIRECTORY).returns(path.join('myPath'));
            updateStub = sandbox.stub().resolves();
            sandbox.stub(vscode.workspace, 'getConfiguration').returns({ get: getStub, update: updateStub});
            sendCommandWithOutputStub = sandbox.stub(CommandUtil, 'sendCommandWithOutput');
            updateStub.resetHistory();
        });

        it('should not migrate anything for a new configuration', async () => {
            await runtimeManager.migrate(version);
            updateStub.should.not.have.been.called;
            sendCommandWithOutputStub.should.not.have.been.called;
        });

        it(`should migrate from fabric.runtimes to ${SettingConfigurations.FABRIC_RUNTIME}`, async () => {
            findFreePortStub.returns([17056]);
            getStub.withArgs('fabric.runtimes').returns([{
                name: 'local_fabric',
                ports: {
                    certificateAuthority: 17054,
                    couchDB: 17055,
                    orderer: 17050,
                    peerChaincode: 17052,
                    peerEventHub: 17053,
                    peerRequest: 17051
                }
            }]);

            getStub.withArgs('fabric.runtime').returns(undefined);
            getStub.withArgs(SettingConfigurations.FABRIC_RUNTIME).returns({});

            await runtimeManager.migrate(version);

            const expectedPorts: any = {};
            expectedPorts[FabricRuntimeUtil.LOCAL_FABRIC] = {
                ports: {
                    startPort: 17050,
                    endPort: 17070
                }
            };
            updateStub.should.have.been.calledOnceWithExactly(SettingConfigurations.FABRIC_RUNTIME, expectedPorts, vscode.ConfigurationTarget.Global);

        });

        it(`should migrate from fabric.runtime to ${SettingConfigurations.FABRIC_RUNTIME} (not previously migrated)`, async () => {
            findFreePortStub.returns([17056]);
            getStub.withArgs('fabric.runtimes').returns(undefined);

            getStub.withArgs('fabric.runtime').returns({
                name: 'local_fabric',
                ports: {
                    certificateAuthority: 17054,
                    couchDB: 17055,
                    orderer: 17050,
                    peerChaincode: 17052,
                    peerEventHub: 17053,
                    peerRequest: 17051
                }
            });
            getStub.withArgs(SettingConfigurations.FABRIC_RUNTIME).returns({});

            await runtimeManager.migrate(version);

            const expectedPorts: any = {};
            expectedPorts[FabricRuntimeUtil.LOCAL_FABRIC] = {
                ports: {
                    startPort: 17050,
                    endPort: 17070
                }
            };
            updateStub.should.have.been.calledOnceWithExactly(SettingConfigurations.FABRIC_RUNTIME, expectedPorts, vscode.ConfigurationTarget.Global);

        });

        it(`should migrate from fabric.runtime to ${SettingConfigurations.FABRIC_RUNTIME} (previously migrated)`, async () => {
            findFreePortStub.returns([17056]);
            getStub.withArgs('fabric.runtimes').returns([
                {
                    name: 'local_fabric',
                    ports: {
                        certificateAuthority: 17054,
                        couchDB: 17055,
                        orderer: 17050,
                        peerChaincode: 17052,
                        peerEventHub: 17053,
                        peerRequest: 17051
                    }
                }
            ]);

            getStub.withArgs('fabric.runtime').returns({
                name: 'local_fabric',
                ports: {
                    certificateAuthority: 17054,
                    couchDB: 17055,
                    orderer: 17050,
                    logs: 17056,
                    peerChaincode: 17052,
                    peerEventHub: 17053,
                    peerRequest: 17051
                }
            });
            getStub.withArgs(SettingConfigurations.FABRIC_RUNTIME).returns({});

            await runtimeManager.migrate(version);

            const expectedPorts: any = {};
            expectedPorts[FabricRuntimeUtil.LOCAL_FABRIC] = {
                ports: {
                    startPort: 17050,
                    endPort: 17070
                }
            };

            updateStub.should.have.been.calledOnceWithExactly(SettingConfigurations.FABRIC_RUNTIME, expectedPorts, vscode.ConfigurationTarget.Global);

            findFreePortStub.should.not.have.been.called;
        });

        it('should not migrate the old configuration value when there is a value for the new configuration', async () => {
            getStub.withArgs('fabric.runtimes').returns([{
                name: 'local_fabric',
                ports: {
                    certificateAuthority: 17054,
                    couchDB: 17055,
                    logs: 17056,
                    orderer: 17050,
                    peerChaincode: 17052,
                    peerEventHub: 17053,
                    peerRequest: 17051
                }
            }]);
            await runtimeManager.migrate(version);

            updateStub.should.not.have.been.called;
            sendCommandWithOutputStub.should.not.have.been.called;
        });

        it('should not migrate old configurations when there is no value for the new configuration', async () => {
            getStub.withArgs('fabric.runtimes').returns(undefined);
            getStub.withArgs('fabric.runtime').returns(undefined);
            getStub.withArgs(SettingConfigurations.FABRIC_RUNTIME).returns({});

            await runtimeManager.migrate(version);
            updateStub.should.not.have.been.called;
            sendCommandWithOutputStub.should.not.have.been.called;
        });

        it('should copy logs port if already set', async () => {
            getStub.withArgs(SettingConfigurations.FABRIC_RUNTIME).returns({});
            getStub.withArgs('fabric.runtime').returns({
                name: 'local_fabric',
                ports: {
                    certificateAuthority: 17054,
                    couchDB: 17055,
                    logs: 17056,
                    orderer: 17050,
                    peerChaincode: 17052,
                    peerEventHub: 17053,
                    peerRequest: 17051
                }
            });
            await runtimeManager.migrate(version);

            const expectedPorts: any = {};
            expectedPorts[FabricRuntimeUtil.LOCAL_FABRIC] = {
                ports: {
                    startPort: 17050,
                    endPort: 17070
                }
            };

            updateStub.should.have.been.calledOnceWithExactly(SettingConfigurations.FABRIC_RUNTIME, expectedPorts, vscode.ConfigurationTarget.Global);

            sendCommandWithOutputStub.should.not.have.been.called;
            findFreePortStub.should.not.have.been.called;
        });

        it('should not migrate an old configuration with any other name when no new configuration', async () => {
            getStub.withArgs(SettingConfigurations.OLD_FABRIC_WALLETS).returns({});
            getStub.withArgs('fabric.runtimes').returns([{
                name: 'some_other_fabric',
                ports: {
                    certificateAuthority: 17054,
                    couchDB: 17055,
                    orderer: 17050,
                    peerChaincode: 17052,
                    peerEventHub: 17053,
                    peerRequest: 17051
                }
            }]);
            await runtimeManager.migrate(version);

            updateStub.should.not.have.been.called;
            sendCommandWithOutputStub.should.not.have.been.called;
        });

        it('should attempt to teardown any old runtimes if no previous version (Linux/MacOS)', async () => {
            sandbox.stub(process, 'platform').value('linux');
            await runtimeManager.migrate(undefined);
            updateStub.should.not.have.been.called;
            sendCommandWithOutputStub.should.have.been.calledOnceWithExactly('/bin/sh', ['teardown.sh'], sinon.match.any, null, VSCodeBlockchainOutputAdapter.instance());
        });

        it('should attempt to teardown any old runtimes if no previous version (Windows)', async () => {
            sandbox.stub(process, 'platform').value('win32');
            await runtimeManager.migrate(undefined);
            updateStub.should.not.have.been.called;
            sendCommandWithOutputStub.should.have.been.calledOnceWithExactly('cmd', ['/c', 'teardown.cmd'], sinon.match.any, null, VSCodeBlockchainOutputAdapter.instance());
        });

        it('should attempt to teardown any old runtimes if migrating from >=0.3.3 (Linux/MacOS)', async () => {
            sandbox.stub(process, 'platform').value('linux');
            await runtimeManager.migrate('0.3.3');
            updateStub.should.not.have.been.called;
            sendCommandWithOutputStub.should.have.been.calledOnceWithExactly('/bin/sh', ['teardown.sh'], sinon.match.any, null, VSCodeBlockchainOutputAdapter.instance());
        });

        it('should attempt to teardown any old runtimes if migrating from >=0.3.3 (Windows)', async () => {
            sandbox.stub(process, 'platform').value('win32');
            await runtimeManager.migrate('0.3.3');
            updateStub.should.not.have.been.called;
            sendCommandWithOutputStub.should.have.been.calledOnceWithExactly('cmd', ['/c', 'teardown.cmd'], sinon.match.any, null, VSCodeBlockchainOutputAdapter.instance());
        });

        it('should delete the old runtime folder if exists', async () => {
            let extDir: string = vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_DIRECTORY);
            extDir = FileSystemUtil.getDirPath(extDir);

            sandbox.stub(fs, 'pathExists').onFirstCall().resolves(true).onSecondCall().resolves(false);
            const deleteStub: sinon.SinonStub = sandbox.stub(fs, 'rmdir').resolves();

            await runtimeManager.migrate(version);
            deleteStub.should.have.been.calledWith(path.join(extDir, 'runtime'));
        });

        it('should not delete old runtime directory if does not exist', async () => {
            sandbox.stub(fs, 'pathExists').resolves(false);
            const deleteStub: sinon.SinonStub = sandbox.stub(fs, 'rmdir').resolves();

            await runtimeManager.migrate(version);
            deleteStub.should.not.have.been.called;
        });

        // it ('should not move if environment folder already exists', async () => {
        //     sandbox.stub(fs, 'pathExists').resolves(true);
        //     const moveStub: sinon.SinonStub = sandbox.stub(fs, 'move').resolves();

        //     await runtimeManager.migrate(version);
        //     moveStub.should.not.have.been.called;
        // });

        it('should handle error deleting', async () => {
            const error: Error = new Error('some error');
            let extDir: string = vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_DIRECTORY);
            extDir = FileSystemUtil.getDirPath(extDir);

            sandbox.stub(fs, 'pathExists').onFirstCall().resolves(true).onSecondCall().resolves(false);
            const deleteStub: sinon.SinonStub = sandbox.stub(fs, 'rmdir').throws(error);

            await runtimeManager.migrate(version).should.eventually.be.rejectedWith(`Error removing old runtime folder: ${error.message}`);
            deleteStub.should.have.been.calledWith(path.join(extDir, 'runtime'));
        });
    });
});
