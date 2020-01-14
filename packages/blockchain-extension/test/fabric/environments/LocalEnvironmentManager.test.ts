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
import { FabricEnvironmentManager, ConnectedState } from '../../../extension/fabric/environments/FabricEnvironmentManager';
import { FabricEnvironmentRegistryEntry, FabricRuntimeUtil, FileSystemUtil, FabricEnvironmentRegistry, FabricGatewayRegistry } from 'ibm-blockchain-platform-common';
import * as fs from 'fs-extra';
import * as path from 'path';
import { LocalEnvironment } from '../../../extension/fabric/environments/LocalEnvironment';

chai.should();

// tslint:disable no-unused-expression
describe('LocalEnvironmentManager', () => {

    const connectionRegistry: FabricGatewayRegistry = FabricGatewayRegistry.instance();
    const runtimeManager: LocalEnvironmentManager = LocalEnvironmentManager.instance();
    let mockRuntime: sinon.SinonStubbedInstance<LocalEnvironment>;
    let mockConnection: sinon.SinonStubbedInstance<FabricEnvironmentConnection>;

    let sandbox: sinon.SinonSandbox;
    let findFreePortStub: sinon.SinonStub;
    let originalRuntime: LocalEnvironment;

    before(async () => {
        await TestUtil.setupTests(sandbox);
        await TestUtil.setupLocalFabric();
        originalRuntime = runtimeManager.getRuntime();
    });

    beforeEach(async () => {
        sandbox = sinon.createSandbox();
        await connectionRegistry.clear();
        mockRuntime = sandbox.createStubInstance(LocalEnvironment);
        runtimeManager['connection'] = runtimeManager['connectingPromise'] = undefined;
        runtimeManager['runtime'] = ((mockRuntime as any) as LocalEnvironment);
        mockConnection = sandbox.createStubInstance(FabricEnvironmentConnection);
        sandbox.stub(FabricConnectionFactory, 'createFabricEnvironmentConnection').returns(mockConnection);
        findFreePortStub = sandbox.stub().resolves([17050, 17051, 17052, 17053, 17054, 17055, 17056]);
        sandbox.stub(LocalEnvironmentManager, 'findFreePort').value(findFreePortStub);
    });

    afterEach(async () => {
        sandbox.restore();
        runtimeManager['connection'] = runtimeManager['connectingPromise'] = undefined;
        runtimeManager['runtime'] = undefined;
        await connectionRegistry.clear();
    });

    after(() => {
        // need to restore the runtime
        Object.defineProperty(runtimeManager, 'runtime', {
            configurable: true,
            enumerable: true,
            get: (): LocalEnvironment => (originalRuntime as any) as LocalEnvironment
        });
    });

    describe('#getRuntime', () => {
        it('should return the runtime', () => {
            runtimeManager.getRuntime().should.equal(mockRuntime);
        });
    });

    describe('#initialize', () => {
        beforeEach(() => {
            mockRuntime.isCreated.resolves(true);
            Object.defineProperty(runtimeManager, 'runtime', {
                configurable: true,
                enumerable: true,
                get: (): LocalEnvironment => (mockRuntime as any) as LocalEnvironment,
                set: (): void => { /* Ignore the new value */ }
            });
        });

        it('should use existing configuration and import all wallets/identities', async () => {
            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, {
                ports: {
                    startPort: 17050,
                    endPort: 17070
                }
            }, vscode.ConfigurationTarget.Global);
            await runtimeManager.initialize();
            mockRuntime.ports.should.deep.equal({
                startPort: 17050,
                endPort: 17070
            });
            mockRuntime.updateUserSettings.should.not.have.been.called;
        });

        it('should generate new configuration', async () => {
            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, {}, vscode.ConfigurationTarget.Global);

            findFreePortStub.returns([17050, 17070]);
            await runtimeManager.initialize();
            mockRuntime.ports.should.deep.equal({
                startPort: 17050,
                endPort: 17070
            });
            mockRuntime.updateUserSettings.should.have.been.calledOnce;
        });

        it('create the runtime if it is not already created', async () => {
            mockRuntime.isCreated.resolves(false);
            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, {}, vscode.ConfigurationTarget.Global);
            findFreePortStub.returns([17050, 17070]);

            await runtimeManager.initialize();
            mockRuntime.ports.should.deep.equal({
                startPort: 17050,
                endPort: 17070
            });
            mockRuntime.updateUserSettings.should.have.been.calledOnce;
            mockRuntime.create.should.have.been.calledOnce;
        });

        it(`should start logs if ${FabricRuntimeUtil.LOCAL_FABRIC} is connected`, async () => {
            mockRuntime.isCreated.resolves(true);
            await runtimeManager.initialize();
            const registryEntry: FabricEnvironmentRegistryEntry = await FabricEnvironmentRegistry.instance().get(FabricRuntimeUtil.LOCAL_FABRIC);
            mockRuntime.startLogs.resetHistory();
            FabricEnvironmentManager.instance().connect(mockConnection, registryEntry, ConnectedState.CONNECTED);
            mockRuntime.startLogs.should.have.been.called;
        });

        it('should not start the logs when other fabric connected', async () => {
            mockRuntime.isCreated.resolves(false);
            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, {}, vscode.ConfigurationTarget.Global);
            await runtimeManager.initialize();

            const registryEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
            registryEntry.name = 'myFabric';
            registryEntry.managedRuntime = true;
            FabricEnvironmentManager.instance().connect(mockConnection, registryEntry, ConnectedState.CONNECTED);

            mockRuntime.startLogs.should.not.have.been.called;
        });

        it('should stop the logs when disconnected', async () => {
            FabricEnvironmentManager.instance()['connection'] = undefined;
            mockRuntime.isCreated.resolves(false);
            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, {}, vscode.ConfigurationTarget.Global);
            await runtimeManager.initialize();

            FabricEnvironmentManager.instance().disconnect();

            mockRuntime.stopLogs.should.have.been.called;
        });

        it('should migrate if old style-ports are used and need to be updated to a start and end port range', async () => {
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
            await runtimeManager.initialize();
            mockRuntime.ports.should.deep.equal({
                startPort: 1,
                endPort: 21
            });
            mockRuntime.updateUserSettings.should.have.been.calledOnce;
        });
    });

    describe('#migrate', () => {

        let getStub: sinon.SinonStub;
        let updateStub: sinon.SinonStub;
        let sendCommandWithOutputStub: sinon.SinonStub;

        beforeEach(() => {
            getStub = sandbox.stub();
            getStub.withArgs(SettingConfigurations.FABRIC_RUNTIME).returns({
                ports: {
                    startPort: 17050,
                    endPort: 17070
                }
            });
            getStub.withArgs('fabric.runtime').returns({});
            getStub.withArgs(SettingConfigurations.EXTENSION_DIRECTORY).returns(path.join('myPath'));
            updateStub = sandbox.stub().resolves();
            sandbox.stub(vscode.workspace, 'getConfiguration').returns({ get: getStub, update: updateStub});
            sendCommandWithOutputStub = sandbox.stub(CommandUtil, 'sendCommandWithOutput');
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

            updateStub.should.have.been.calledOnceWithExactly(SettingConfigurations.FABRIC_RUNTIME, {
                ports: {
                    certificateAuthority: 17054,
                    couchDB: 17055,
                    orderer: 17050,
                    peerChaincode: 17052,
                    peerEventHub: 17053,
                    peerRequest: 17051
                }
            }, vscode.ConfigurationTarget.Global);

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

            updateStub.should.have.been.calledOnceWithExactly(SettingConfigurations.FABRIC_RUNTIME, {
                ports: {
                    certificateAuthority: 17054,
                    couchDB: 17055,
                    orderer: 17050,
                    peerChaincode: 17052,
                    peerEventHub: 17053,
                    peerRequest: 17051
                }
            }, vscode.ConfigurationTarget.Global);

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

            updateStub.should.have.been.calledOnceWithExactly(SettingConfigurations.FABRIC_RUNTIME, {
                ports: {
                    certificateAuthority: 17054,
                    couchDB: 17055,
                    logs: 17056,
                    orderer: 17050,
                    peerChaincode: 17052,
                    peerEventHub: 17053,
                    peerRequest: 17051
                }
            }, vscode.ConfigurationTarget.Global);
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
            updateStub.should.have.been.calledOnceWithExactly(SettingConfigurations.FABRIC_RUNTIME, {
                ports: {
                    certificateAuthority: 17054,
                    couchDB: 17055,
                    logs: 17056,
                    orderer: 17050,
                    peerChaincode: 17052,
                    peerEventHub: 17053,
                    peerRequest: 17051
                }
            }, vscode.ConfigurationTarget.Global);
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

        it('should move the runtimes foler if exists', async () => {
            let extDir: string = vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_DIRECTORY);
            extDir = FileSystemUtil.getDirPath(extDir);

            sandbox.stub(fs, 'pathExists').onFirstCall().resolves(true).onSecondCall().resolves(false);
            const moveStub: sinon.SinonStub = sandbox.stub(fs, 'move').resolves();

            await runtimeManager.migrate(version);
            moveStub.should.have.been.calledWith(path.join(extDir, 'runtime'), path.join(extDir, 'environments', FabricRuntimeUtil.LOCAL_FABRIC));
        });

        it('should not move if does not exist', async () => {
            sandbox.stub(fs, 'pathExists').resolves(false);
            const moveStub: sinon.SinonStub = sandbox.stub(fs, 'move').resolves();

            await runtimeManager.migrate(version);
            moveStub.should.not.have.been.called;
        });

        it ('should not move if environment folder already exists', async () => {
            sandbox.stub(fs, 'pathExists').resolves(true);
            const moveStub: sinon.SinonStub = sandbox.stub(fs, 'move').resolves();

            await runtimeManager.migrate(version);
            moveStub.should.not.have.been.called;
        });

        it('should handle error moving', async () => {
            const error: Error = new Error('some error');
            let extDir: string = vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_DIRECTORY);
            extDir = FileSystemUtil.getDirPath(extDir);

            sandbox.stub(fs, 'pathExists').onFirstCall().resolves(true).onSecondCall().resolves(false);
            const moveStub: sinon.SinonStub = sandbox.stub(fs, 'move').throws(error);

            await runtimeManager.migrate(version).should.eventually.be.rejectedWith(`Issue migrating runtime folder ${error.message}`);
            moveStub.should.have.been.calledWith(path.join(extDir, 'runtime'), path.join(extDir, 'environments', FabricRuntimeUtil.LOCAL_FABRIC));
        });
    });
});
