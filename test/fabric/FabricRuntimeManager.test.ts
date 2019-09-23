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

import { FabricGatewayRegistry } from '../../src/fabric/FabricGatewayRegistry';
import { FabricRuntimeManager } from '../../src/fabric/FabricRuntimeManager';
import { FabricRuntime } from '../../src/fabric/FabricRuntime';
import { ExtensionUtil } from '../../src/util/ExtensionUtil';
import { TestUtil } from '../TestUtil';
import { FabricEnvironmentConnection } from '../../src/fabric/FabricEnvironmentConnection';
import { FabricConnectionFactory } from '../../src/fabric/FabricConnectionFactory';
import * as chai from 'chai';
import * as sinon from 'sinon';
import { FabricWallet } from '../../src/fabric/FabricWallet';
import { FabricWalletGenerator } from '../../src/fabric/FabricWalletGenerator';
import * as vscode from 'vscode';
import { FabricGatewayRegistryEntry } from '../../src/fabric/FabricGatewayRegistryEntry';
import { FabricRuntimeUtil } from '../../src/fabric/FabricRuntimeUtil';
import { FabricWalletUtil } from '../../src/fabric/FabricWalletUtil';
import { FabricGateway } from '../../src/fabric/FabricGateway';
import { FabricWalletRegistryEntry } from '../../src/fabric/FabricWalletRegistryEntry';
import { FabricWalletGeneratorFactory } from '../../src/fabric/FabricWalletGeneratorFactory';
import { CommandUtil } from '../../src/util/CommandUtil';
import { version } from '../../package.json';
import { VSCodeBlockchainOutputAdapter } from '../../src/logging/VSCodeBlockchainOutputAdapter';
import { SettingConfigurations } from '../../SettingConfigurations';
import { FabricEnvironmentManager, ConnectedState } from '../../src/fabric/FabricEnvironmentManager';
import { FabricEnvironmentRegistryEntry } from '../../src/fabric/FabricEnvironmentRegistryEntry';
import * as fs from 'fs-extra';
import * as path from 'path';
import { UserInputUtil } from '../../src/commands/UserInputUtil';

chai.should();

// tslint:disable no-unused-expression
describe('FabricRuntimeManager', () => {

    const connectionRegistry: FabricGatewayRegistry = FabricGatewayRegistry.instance();
    const runtimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
    let mockRuntime: sinon.SinonStubbedInstance<FabricRuntime>;
    let mockConnection: sinon.SinonStubbedInstance<FabricEnvironmentConnection>;

    let sandbox: sinon.SinonSandbox;
    let findFreePortStub: sinon.SinonStub;

    before(async () => {
        await TestUtil.storeAll();
    });

    after(async () => {
        await TestUtil.restoreAll();
    });

    beforeEach(async () => {
        sandbox = sinon.createSandbox();
        await ExtensionUtil.activateExtension();
        await connectionRegistry.clear();
        mockRuntime = sinon.createStubInstance(FabricRuntime);
        runtimeManager['connection'] = runtimeManager['connectingPromise'] = undefined;
        runtimeManager['runtime'] = ((mockRuntime as any) as FabricRuntime);
        mockConnection = sinon.createStubInstance(FabricEnvironmentConnection);
        sandbox.stub(FabricConnectionFactory, 'createFabricEnvironmentConnection').returns(mockConnection);
        findFreePortStub = sinon.stub().resolves([17050, 17051, 17052, 17053, 17054, 17055, 17056]);
        sandbox.stub(FabricRuntimeManager, 'findFreePort').value(findFreePortStub);
    });

    afterEach(async () => {
        sandbox.restore();
        runtimeManager['connection'] = runtimeManager['connectingPromise'] = undefined;
        runtimeManager['runtime'] = undefined;
        await connectionRegistry.clear();
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
                get: (): FabricRuntime => (mockRuntime as any) as FabricRuntime,
                set: (): void => { /* Ignore the new value */ }
            });
        });

        it('should use existing configuration and import all wallets/identities', async () => {
            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, {
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
            await runtimeManager.initialize();
            mockRuntime.ports.should.deep.equal({
                certificateAuthority: 17054,
                couchDB: 17055,
                logs: 17056,
                orderer: 17050,
                peerChaincode: 17052,
                peerEventHub: 17053,
                peerRequest: 17051
            });
            mockRuntime.updateUserSettings.should.not.have.been.called;
            mockRuntime.importWalletsAndIdentities.should.have.been.calledOnce;
            mockRuntime.importGateways.should.have.been.calledOnce;
        });

        it('should generate new configuration and import all wallets/identities', async () => {
            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, {}, vscode.ConfigurationTarget.Global);
            await runtimeManager.initialize();
            mockRuntime.ports.should.deep.equal({
                certificateAuthority: 17054,
                couchDB: 17055,
                logs: 17056,
                orderer: 17050,
                peerChaincode: 17052,
                peerEventHub: 17053,
                peerRequest: 17051
            });
            mockRuntime.updateUserSettings.should.have.been.calledOnce;
            mockRuntime.importWalletsAndIdentities.should.have.been.calledOnce;
            mockRuntime.importGateways.should.have.been.calledOnce;
        });

        it('create the runtime if it is not already created', async () => {
            mockRuntime.isCreated.resolves(false);
            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, {}, vscode.ConfigurationTarget.Global);
            await runtimeManager.initialize();
            mockRuntime.ports.should.deep.equal({
                certificateAuthority: 17054,
                couchDB: 17055,
                logs: 17056,
                orderer: 17050,
                peerChaincode: 17052,
                peerEventHub: 17053,
                peerRequest: 17051
            });
            mockRuntime.updateUserSettings.should.have.been.calledOnce;
            mockRuntime.importWalletsAndIdentities.should.have.been.calledOnce;
            mockRuntime.importGateways.should.have.been.calledOnce;
            mockRuntime.create.should.have.been.calledOnce;
        });

        it('should not start the logs when other fabric connected', async () => {
            mockRuntime.isCreated.resolves(false);
            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, {}, vscode.ConfigurationTarget.Global);
            await runtimeManager.initialize();

            const registryEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
            registryEntry.name = 'myFabric';
            registryEntry.managedRuntime = true;
            registryEntry.associatedWallet = FabricWalletUtil.LOCAL_WALLET;
            FabricEnvironmentManager.instance().connect(mockConnection, registryEntry, ConnectedState.CONNECTED);

            mockRuntime.startLogs.should.not.have.been.called;
        });

        it('should stop the logs when disconnected', async () => {
            mockRuntime.isCreated.resolves(false);
            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, {}, vscode.ConfigurationTarget.Global);
            await runtimeManager.initialize();

            FabricEnvironmentManager.instance().disconnect();

            mockRuntime.stopLogs.should.have.been.called;
        });
    });

    describe('#getGatewayRegistryEntries', () => {
        it('should return an array of gateway registry entries', async () => {
            const instance: FabricRuntimeManager = FabricRuntimeManager.instance();
            mockRuntime.getGateways.resolves([
                new FabricGateway(FabricRuntimeUtil.LOCAL_FABRIC, 'SOME_PATH', { connection: 'profile' })
            ]);

            const registryEntries: FabricGatewayRegistryEntry[] = await instance.getGatewayRegistryEntries();
            registryEntries.should.have.lengthOf(1);
            registryEntries[0].name.should.equal(FabricRuntimeUtil.LOCAL_FABRIC);
            registryEntries[0].associatedWallet.should.equal(FabricWalletUtil.LOCAL_WALLET);
        });
    });

    describe('#getEnvironmentRegistryEntry', () => {
        it('should return environment registry entry', async () => {
            const instance: FabricRuntimeManager = FabricRuntimeManager.instance();
            mockRuntime.getName.returns(FabricRuntimeUtil.LOCAL_FABRIC);

            const registryEntry: FabricEnvironmentRegistryEntry = await instance.getEnvironmentRegistryEntry();

            registryEntry.name.should.equal(FabricRuntimeUtil.LOCAL_FABRIC);
            registryEntry.managedRuntime.should.equal(true);
            registryEntry.associatedWallet.should.equal(FabricWalletUtil.LOCAL_WALLET);
        });
    });

    describe('#getWalletRegistryEntries', () => {

        it('should return an array of wallet registry entries', async () => {
            const instance: FabricRuntimeManager = FabricRuntimeManager.instance();
            mockRuntime.getWalletNames.resolves([FabricWalletUtil.LOCAL_WALLET]);
            const mockWalletGenerator: sinon.SinonStubbedInstance<FabricWalletGenerator> = sinon.createStubInstance(FabricWalletGenerator);
            sandbox.stub(FabricWalletGeneratorFactory, 'createFabricWalletGenerator').returns(mockWalletGenerator);
            const mockWallet: sinon.SinonStubbedInstance<FabricWallet> = sinon.createStubInstance(FabricWallet);
            mockWallet.getWalletPath.returns('SOME_PATH');
            mockWalletGenerator.getWallet.resolves(mockWallet);

            const registryEntries: FabricWalletRegistryEntry[] = await instance.getWalletRegistryEntries();
            registryEntries.should.have.lengthOf(1);
            registryEntries[0].name.should.equal(FabricWalletUtil.LOCAL_WALLET);
            registryEntries[0].walletPath.should.equal('SOME_PATH');
            registryEntries[0].managedWallet.should.be.true;
        });

    });

    describe('#migrate', () => {

        let getStub: sinon.SinonStub;
        let updateStub: sinon.SinonStub;
        let sendCommandWithOutputStub: sinon.SinonStub;

        beforeEach(() => {
            getStub = sinon.stub();
            getStub.withArgs(SettingConfigurations.FABRIC_RUNTIME).returns({
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
            getStub.withArgs('fabric.runtime').returns({});
            getStub.withArgs(SettingConfigurations.EXTENSION_DIRECTORY).returns(path.join('myPath'));
            updateStub = sinon.stub().resolves();
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
                    logs: 17056,
                    orderer: 17050,
                    peerChaincode: 17052,
                    peerEventHub: 17053,
                    peerRequest: 17051
                }
            }, vscode.ConfigurationTarget.Global);

            findFreePortStub.should.have.been.calledOnce;

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
                    logs: 17056,
                    orderer: 17050,
                    peerChaincode: 17052,
                    peerEventHub: 17053,
                    peerRequest: 17051
                }
            }, vscode.ConfigurationTarget.Global);

            findFreePortStub.should.have.been.calledOnce;
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
            getStub.withArgs(SettingConfigurations.FABRIC_WALLETS).returns({});
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
            extDir = UserInputUtil.getDirPath(extDir);

            sandbox.stub(fs, 'pathExists').resolves(true);
            const moveStub: sinon.SinonStub = sandbox.stub(fs, 'move').resolves();

            await runtimeManager.migrate(version);
            moveStub.should.have.been.calledWith(path.join(extDir, 'runtime'), path.join(extDir, 'environments', FabricRuntimeUtil.LOCAL_FABRIC));
        });

        it('should not move if does not exist', async () => {
            let extDir: string = vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_DIRECTORY);
            extDir = UserInputUtil.getDirPath(extDir);

            sandbox.stub(fs, 'pathExists').resolves(false);
            const moveStub: sinon.SinonStub = sandbox.stub(fs, 'move').resolves();

            await runtimeManager.migrate(version);
            moveStub.should.not.have.been.called;
        });

        it('should handle error moving', async () => {
            const error: Error = new Error('some error');
            let extDir: string = vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_DIRECTORY);
            extDir = UserInputUtil.getDirPath(extDir);

            sandbox.stub(fs, 'pathExists').resolves(true);
            const moveStub: sinon.SinonStub = sandbox.stub(fs, 'move').throws(error);

            await runtimeManager.migrate(version).should.eventually.be.rejectedWith(`Issue migrating runtime folder ${error.message}`);
            moveStub.should.have.been.calledWith(path.join(extDir, 'runtime'), path.join(extDir, 'environments', FabricRuntimeUtil.LOCAL_FABRIC));
        });
    });
});
