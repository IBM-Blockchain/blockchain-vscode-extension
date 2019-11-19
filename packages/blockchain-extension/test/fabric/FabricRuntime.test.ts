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

import * as child_process from 'child_process';
import { FabricRuntime, FabricRuntimeState } from '../../extension/fabric/FabricRuntime';
import * as vscode from 'vscode';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import { OutputAdapter } from '../../extension/logging/OutputAdapter';
import { TestUtil } from '../TestUtil';
import * as fs from 'fs-extra';
import * as path from 'path';
import { LogType } from '../../extension/logging/OutputAdapter';
import { CommandUtil } from '../../extension/util/CommandUtil';
import { VSCodeBlockchainDockerOutputAdapter } from '../../extension/logging/VSCodeBlockchainDockerOutputAdapter';
import { YeomanUtil } from '../../extension/util/YeomanUtil';
import { IFabricWalletGenerator } from '../../extension/fabric/IFabricWalletGenerator';
import { FabricWalletGeneratorFactory } from '../../extension/fabric/FabricWalletGeneratorFactory';
import { FabricWalletGenerator } from '../../extension/fabric/FabricWalletGenerator';
import { FabricIdentity, IFabricWallet } from 'ibm-blockchain-platform-common';
import { FabricWallet } from 'ibm-blockchain-platform-gateway-v1';
import { FabricWalletUtil } from '../../extension/fabric/FabricWalletUtil';
import { SettingConfigurations } from '../../configurations';
import { FabricGateway } from '../../extension/fabric/FabricGateway';
import { FileSystemUtil } from '../../extension/util/FileSystemUtil';
import { FabricWalletRegistry } from '../../extension/registries/FabricWalletRegistry';
import { FabricWalletRegistryEntry } from '../../extension/registries/FabricWalletRegistryEntry';
import { FabricEnvironmentRegistry } from '../../extension/registries/FabricEnvironmentRegistry';

chai.should();
chai.use(chaiAsPromised);

// tslint:disable no-unused-expression
describe('FabricRuntime', () => {

    const originalPlatform: string = process.platform;
    const originalSpawn: any = child_process.spawn;
    const rootPath: string = path.dirname(__dirname);
    const runtimePath: string = path.resolve(rootPath, '..', '..', 'test', 'data', 'yofn');

    let runtime: FabricRuntime;
    let sandbox: sinon.SinonSandbox;

    // tslint:disable max-classes-per-file
    // tslint:disable no-console
    class TestFabricOutputAdapter implements OutputAdapter {

        public log(value: string): void {
            console.log(value);
        }

        public error(value: string): void {
            console.error(value);
        }
    }

    function mockSuccessCommand(): any {
        if (originalPlatform === 'win32') {
            return originalSpawn('cmd', ['/c', 'echo stdout&& echo stderr>&2&& exit 0']);
        } else {
            return originalSpawn('/bin/sh', ['-c', 'echo stdout && echo stderr >&2 && true']);
        }
    }

    function mockFailureCommand(): any {
        if (originalPlatform === 'win32') {
            return originalSpawn('cmd', ['/c', 'echo stdout&& echo stderr>&2&& exit 1']);
        } else {
            return originalSpawn('/bin/sh', ['-c', 'echo stdout && echo stderr >&2 && false']);
        }
    }

    before(async () => {
        await TestUtil.setupTests(sandbox);
    });

    beforeEach(async () => {
        runtime = new FabricRuntime();
        runtime.ports = {
            orderer: 12347,
            peerRequest: 12345,
            peerChaincode: 54321,
            peerEventHub: 12346,
            certificateAuthority: 12348,
            couchDB: 12349,
            logs: 12387
        };

        await runtime.create();

        runtime['path'] = runtimePath;
        sandbox = sinon.createSandbox();
    });

    afterEach(async () => {
        sandbox.restore();
    });

    describe('#getDockerName', () => {
        it('should return the Docker name of the runtime', () => {
            runtime.getDockerName().should.equal('fabricvscodelocalfabric');
        });
    });

    describe('#isBusy', () => {
        it('should return false if the runtime is not busy', () => {
            runtime.isBusy().should.be.false;
        });

        it('should return true if the runtime is busy', () => {
            (runtime as any).busy = true;
            runtime.isBusy().should.be.true;
        });
    });

    describe('#getState', () => {
        it('should return starting if the runtime is starting', () => {
            (runtime as any).state = FabricRuntimeState.STARTING;
            runtime.getState().should.equal(FabricRuntimeState.STARTING);
        });

        it('should return stopping if the runtime is stopping', () => {
            (runtime as any).state = FabricRuntimeState.STOPPING;
            runtime.getState().should.equal(FabricRuntimeState.STOPPING);
        });

        it('should return restarting if the runtime is restarting', () => {
            (runtime as any).state = FabricRuntimeState.RESTARTING;
            runtime.getState().should.equal(FabricRuntimeState.RESTARTING);
        });

        it('should return stopped if the runtime is stopped', () => {
            (runtime as any).state = FabricRuntimeState.STOPPED;
            runtime.getState().should.equal(FabricRuntimeState.STOPPED);
        });

        it('should return started if the runtime is started', () => {
            (runtime as any).state = FabricRuntimeState.STARTED;
            runtime.getState().should.equal(FabricRuntimeState.STARTED);
        });
    });

    describe('#create', () => {
        it('should create a new network', async () => {
            const runStub: sinon.SinonStub = sandbox.stub(YeomanUtil, 'run');
            await runtime.create();

            runStub.should.have.been.calledOnceWithExactly('fabric:network', {
                certificateAuthority: 12348,
                couchDB: 12349,
                destination: runtime.getPath(),
                dockerName: 'fabricvscodelocalfabric',
                logspout: 12387,
                name: 'local_fabric',
                orderer: 12347,
                peerChaincode: 54321,
                peerRequest: 12345
            });
        });

    });

    describe('#importWalletsAndIdentities', () => {
        it('should create all wallets and import all identities', async () => {
            const mockFabricWalletGenerator: sinon.SinonStubbedInstance<IFabricWalletGenerator> = sandbox.createStubInstance(FabricWalletGenerator);
            sandbox.stub(FabricWalletGeneratorFactory, 'createFabricWalletGenerator').returns(mockFabricWalletGenerator);
            const mockFabricWallet: sinon.SinonStubbedInstance<IFabricWallet> = sandbox.createStubInstance(FabricWallet);
            mockFabricWalletGenerator.getWallet.returns(mockFabricWallet);
            await runtime.importWalletsAndIdentities();
            mockFabricWalletGenerator.getWallet.should.have.been.calledOnceWithExactly(FabricWalletUtil.LOCAL_WALLET);
            mockFabricWallet.importIdentity.should.have.been.calledOnceWithExactly(sinon.match.string, sinon.match.string, 'admin', 'Org1MSP');
        });

        it(`should include a walletPath and managedRuntime options if not present for ${FabricWalletUtil.LOCAL_WALLET}`, async () => {
            const mockFabricWalletGenerator: sinon.SinonStubbedInstance<IFabricWalletGenerator> = sandbox.createStubInstance(FabricWalletGenerator);
            sandbox.stub(FabricWalletGeneratorFactory, 'createFabricWalletGenerator').returns(mockFabricWalletGenerator);
            const mockFabricWallet: sinon.SinonStubbedInstance<IFabricWallet> = sandbox.createStubInstance(FabricWallet);
            mockFabricWalletGenerator.getWallet.returns(mockFabricWallet);
            sandbox.stub(FabricWalletRegistry.instance(), 'exists').withArgs(FabricWalletUtil.LOCAL_WALLET).resolves(true);
            sandbox.stub(FabricWalletRegistry.instance(), 'get').withArgs(FabricWalletUtil.LOCAL_WALLET).resolves(
                {
                    name: FabricWalletUtil.LOCAL_WALLET

                } as FabricWalletRegistryEntry
            );
            const updateStub: sinon.SinonStub = sandbox.stub(FabricWalletRegistry.instance(), 'update').resolves();
            await runtime.importWalletsAndIdentities();
            updateStub.should.have.been.calledWith({
                name: FabricWalletUtil.LOCAL_WALLET,
                walletPath: path.join(TestUtil.EXTENSION_TEST_DIR, 'wallets', FabricWalletUtil.LOCAL_WALLET),
                managedWallet: true
            });
            mockFabricWalletGenerator.getWallet.should.have.been.calledOnceWithExactly(FabricWalletUtil.LOCAL_WALLET);
            mockFabricWallet.importIdentity.should.have.been.calledOnceWithExactly(sinon.match.string, sinon.match.string, 'admin', 'Org1MSP');

        });

    });

    describe('#importGateways', () => {
        it('should create all gateways', async () => {
            const extDir: string = vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_DIRECTORY);
            const homeExtDir: string = FileSystemUtil.getDirPath(extDir);
            const profileDirPath: string = path.join(homeExtDir, 'gateways', 'yofn');

            await runtime.importGateways();

            const gateways: FabricGateway[] = await runtime.getGateways();
            const profilePath: string = path.join(profileDirPath, path.basename(gateways[0].path));

            await fs.pathExists(profilePath).should.eventually.be.true;
        });
    });

    describe('#deleteWalletsAndIdentities', () => {
        it('should delete all known identities that exist', async () => {
            await FabricWalletRegistry.instance().clear();
            await runtime.importWalletsAndIdentities();

            let results: FabricWalletRegistryEntry[] = await FabricWalletRegistry.instance().getAll();
            results.length.should.equal(1);
            results[0].name.should.equal(FabricWalletUtil.LOCAL_WALLET);
            await runtime.deleteWalletsAndIdentities();

            results = await FabricWalletRegistry.instance().getAll();
            results.length.should.equal(0);
        });
    });

    ['generate', 'start', 'stop', 'teardown', 'kill_chaincode'].forEach((verb: string) => {

        describe(`#${verb}`, () => {

            let createStub: sinon.SinonStub;
            let importWalletsAndIdentitiesStub: sinon.SinonStub;
            let importGatewaysStub: sinon.SinonStub;
            let isRunningStub: sinon.SinonStub;
            let setStateSpy: sinon.SinonSpy;
            let stopLogsStub: sinon.SinonStub;
            let getConfigurationStub: sinon.SinonStub;
            let getSettingsStub: sinon.SinonStub;

            beforeEach(() => {
                createStub = sandbox.stub(runtime, 'create');
                importWalletsAndIdentitiesStub = sandbox.stub(runtime, 'importWalletsAndIdentities');
                importGatewaysStub = sandbox.stub(runtime, 'importGateways');
                isRunningStub = sandbox.stub(runtime, 'isRunning').resolves(false);
                setStateSpy = sandbox.spy(runtime, 'setState');
                stopLogsStub = sandbox.stub(runtime, 'stopLogs');
                getSettingsStub = sandbox.stub();
                getSettingsStub.withArgs(SettingConfigurations.FABRIC_CHAINCODE_TIMEOUT).returns(120);

                getConfigurationStub = sandbox.stub(vscode.workspace, 'getConfiguration');
                getConfigurationStub.returns({
                    get: getSettingsStub,
                    update: sandbox.stub().callThrough()
                });
            });

            it(`should execute the ${verb}.sh script and handle success (Linux/MacOS)`, async () => {
                sandbox.stub(process, 'platform').value('linux');
                const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');

                if (verb !== 'kill_chaincode') {
                    spawnStub.withArgs('/bin/sh', [`${verb}.sh`], sinon.match.any).callsFake(() => {
                        return mockSuccessCommand();
                    });
                } else {
                    spawnStub.withArgs('/bin/sh', [`${verb}.sh`, 'mySmartContract', '0.0.1'], sinon.match.any).callsFake(() => {
                        return mockSuccessCommand();
                    });
                }

                if (verb !== 'kill_chaincode') {
                    await runtime[verb]();
                } else {
                    await runtime['killChaincode'](['mySmartContract', '0.0.1']);
                }

                spawnStub.should.have.been.calledOnce;

                spawnStub.getCall(0).args[2].env.CORE_CHAINCODE_MODE.should.equal('dev');
                spawnStub.getCall(0).args[2].env.CORE_CHAINCODE_EXECUTETIMEOUT.should.equal('120s');

                if (verb !== 'generate' && verb !== 'start' && verb !== 'kill_chaincode') {
                    stopLogsStub.should.have.been.called;
                }

                if (verb === 'kill_chaincode') {
                    spawnStub.should.have.been.calledWith('/bin/sh', [`${verb}.sh`, 'mySmartContract', '0.0.1'], sinon.match.any);
                } else {
                    spawnStub.should.have.been.calledWith('/bin/sh', [`${verb}.sh`], sinon.match.any);
                }
            });

            it(`should execute the ${verb}.sh script and handle an error (Linux/MacOS)`, async () => {
                sandbox.stub(process, 'platform').value('linux');
                const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');

                if (verb !== 'kill_chaincode') {
                    spawnStub.withArgs('/bin/sh', [`${verb}.sh`], sinon.match.any).callsFake(() => {
                        return mockFailureCommand();
                    });
                } else {
                    spawnStub.withArgs('/bin/sh', [`${verb}.sh`, 'mySmartContract', '0.0.1'], sinon.match.any).callsFake(() => {
                        return mockFailureCommand();
                    });
                }

                if (verb !== 'kill_chaincode') {
                    await runtime[verb]().should.be.rejectedWith(`Failed to execute command "/bin/sh" with  arguments "${verb}.sh" return code 1`);
                } else {
                    await runtime['killChaincode'](['mySmartContract', '0.0.1']).should.be.rejectedWith(`Failed to execute command "/bin/sh" with  arguments "${verb}.sh, mySmartContract, 0.0.1" return code 1`);
                }

                spawnStub.should.have.been.calledOnce;

                if (verb !== 'kill_chaincode') {
                    spawnStub.should.have.been.calledWith('/bin/sh', [`${verb}.sh`], sinon.match.any);
                } else {
                    spawnStub.should.have.been.calledWith('/bin/sh', [`${verb}.sh`, 'mySmartContract', '0.0.1'], sinon.match.any);
                }

                if (verb !== 'generate' && verb !== 'start' && verb !== 'kill_chaincode') {
                    stopLogsStub.should.have.been.called;
                }
            });

            it(`should execute the ${verb}.sh script using a custom output adapter (Linux/MacOS)`, async () => {
                sandbox.stub(process, 'platform').value('linux');
                const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
                if (verb !== 'kill_chaincode') {
                    spawnStub.withArgs('/bin/sh', [`${verb}.sh`], sinon.match.any).callsFake(() => {
                        return mockSuccessCommand();
                    });
                } else {
                    spawnStub.withArgs('/bin/sh', [`${verb}.sh`, 'mySmartContract', '0.0.1'], sinon.match.any).callsFake(() => {
                        return mockSuccessCommand();
                    });
                }

                const outputAdapter: sinon.SinonStubbedInstance<TestFabricOutputAdapter> = sandbox.createStubInstance(TestFabricOutputAdapter);

                if (verb !== 'kill_chaincode') {
                    await runtime[verb](outputAdapter);
                } else {
                    await runtime['killChaincode'](['mySmartContract', '0.0.1'], outputAdapter);
                }
                outputAdapter.log.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'stdout');
                outputAdapter.log.getCall(1).should.have.been.calledWith(LogType.INFO, undefined, 'stderr');

                if (verb !== 'generate' && verb !== 'start' && verb !== 'kill_chaincode') {
                    stopLogsStub.should.have.been.called;
                }
            });

            if (verb !== 'kill_chaincode') {

                it(`should publish busy events and set state before and after handling success (Linux/MacOS)`, async () => {

                    sandbox.stub(process, 'platform').value('linux');
                    const eventStub: sinon.SinonStub = sandbox.stub();
                    const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
                    spawnStub.withArgs('/bin/sh', [`${verb}.sh`], sinon.match.any).callsFake(() => {
                        return mockSuccessCommand();
                    });
                    runtime.on('busy', eventStub);

                    if (verb === 'generate' || verb === 'start') {
                        isRunningStub.resolves(true);
                    } else {
                        isRunningStub.resolves(false);
                    }

                    await runtime[verb]();
                    eventStub.should.have.been.calledTwice;
                    eventStub.should.have.been.calledWithExactly(true);
                    eventStub.should.have.been.calledWithExactly(false);

                    if (verb === 'generate' || verb === 'start') {
                        runtime.getState().should.equal(FabricRuntimeState.STARTED);
                        setStateSpy.should.have.been.calledTwice;
                        setStateSpy.firstCall.should.have.been.calledWith(FabricRuntimeState.STARTING);
                        setStateSpy.secondCall.should.have.been.calledWith(FabricRuntimeState.STARTED);

                    } else if (verb === 'stop' || verb === 'teardown') {
                        runtime.getState().should.equal(FabricRuntimeState.STOPPED);
                        setStateSpy.should.have.been.calledTwice;
                        setStateSpy.firstCall.should.have.been.calledWith(FabricRuntimeState.STOPPING);
                        setStateSpy.secondCall.should.have.been.calledWith(FabricRuntimeState.STOPPED);
                        stopLogsStub.should.have.been.called;
                    }
                });

                it(`should publish busy events and set state before and after handling an error (Linux/MacOS)`, async () => {

                    sandbox.stub(process, 'platform').value('linux');
                    const eventStub: sinon.SinonStub = sandbox.stub();
                    const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
                    spawnStub.withArgs('/bin/sh', [`${verb}.sh`], sinon.match.any).callsFake(() => {
                        return mockFailureCommand();
                    });

                    if (verb === 'generate' || verb === 'start') {
                        isRunningStub.resolves(false);
                    } else {
                        isRunningStub.resolves(true);
                    }
                    runtime.on('busy', eventStub);

                    await runtime[verb]().should.be.rejectedWith(`Failed to execute command "/bin/sh" with  arguments "${verb}.sh" return code 1`);
                    eventStub.should.have.been.calledTwice;
                    eventStub.should.have.been.calledWithExactly(true);
                    eventStub.should.have.been.calledWithExactly(false);

                    if (verb === 'generate' || verb === 'start') {
                        runtime.getState().should.equal(FabricRuntimeState.STOPPED);
                        setStateSpy.should.have.been.calledTwice;
                        setStateSpy.firstCall.should.have.been.calledWith(FabricRuntimeState.STARTING);
                        setStateSpy.secondCall.should.have.been.calledWith(FabricRuntimeState.STOPPED);

                    } else if (verb === 'stop' || verb === 'teardown') {
                        runtime.getState().should.equal(FabricRuntimeState.STARTED);
                        setStateSpy.should.have.been.calledTwice;
                        setStateSpy.firstCall.should.have.been.calledWith(FabricRuntimeState.STOPPING);
                        setStateSpy.secondCall.should.have.been.calledWith(FabricRuntimeState.STARTED);
                        stopLogsStub.should.have.been.called;
                    }
                });
            }

            it(`should execute the ${verb}.cmd script and handle success (Windows)`, async () => {
                sandbox.stub(process, 'platform').value('win32');
                const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');

                if (verb !== 'kill_chaincode') {
                    spawnStub.withArgs('cmd', ['/c', `${verb}.cmd`], sinon.match.any).callsFake(() => {
                        return mockSuccessCommand();
                    });
                } else {
                    spawnStub.withArgs('cmd', ['/c', `${verb}.cmd`, 'mySmartContract', '0.0.1'], sinon.match.any).callsFake(() => {
                        return mockSuccessCommand();
                    });
                }

                if (verb !== 'kill_chaincode') {
                    await runtime[verb]();
                } else {
                    await runtime['killChaincode'](['mySmartContract', '0.0.1']);
                }

                spawnStub.should.have.been.calledOnce;
                if (verb !== 'kill_chaincode') {
                    spawnStub.should.have.been.calledWith('cmd', ['/c', `${verb}.cmd`], sinon.match.any);
                } else {
                    spawnStub.should.have.been.calledWith('cmd', ['/c', `${verb}.cmd`, 'mySmartContract', '0.0.1'], sinon.match.any);
                }

                spawnStub.getCall(0).args[2].env.CORE_CHAINCODE_MODE.should.equal('dev');
                spawnStub.getCall(0).args[2].env.CORE_CHAINCODE_EXECUTETIMEOUT.should.equal('120s');

                if (verb !== 'generate' && verb !== 'start' && verb !== 'kill_chaincode') {
                    stopLogsStub.should.have.been.called;
                }
            });

            it(`should execute the ${verb}.cmd script and handle an error (Windows)`, async () => {
                sandbox.stub(process, 'platform').value('win32');
                const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
                if (verb !== 'kill_chaincode') {
                    spawnStub.withArgs('cmd', ['/c', `${verb}.cmd`], sinon.match.any).callsFake(() => {
                        return mockFailureCommand();
                    });
                } else {
                    spawnStub.withArgs('cmd', ['/c', `${verb}.cmd`, 'mySmartContract', '0.0.1'], sinon.match.any).callsFake(() => {
                        return mockFailureCommand();
                    });
                }

                if (verb !== 'kill_chaincode') {
                    await runtime[verb]().should.be.rejectedWith(`Failed to execute command "cmd" with  arguments "/c, ${verb}.cmd" return code 1`);
                } else {
                    await runtime['killChaincode'](['mySmartContract', '0.0.1']).should.be.rejectedWith(`Failed to execute command "cmd" with  arguments "/c, ${verb}.cmd, mySmartContract, 0.0.1" return code 1`);
                }

                spawnStub.should.have.been.calledOnce;

                if (verb !== 'kill_chaincode') {
                    spawnStub.should.have.been.calledWith('cmd', ['/c', `${verb}.cmd`], sinon.match.any);
                } else {
                    spawnStub.should.have.been.calledWith('cmd', ['/c', `${verb}.cmd`, 'mySmartContract', '0.0.1'], sinon.match.any);
                }

                if (verb !== 'generate' && verb !== 'start' && verb !== 'kill_chaincode') {
                    stopLogsStub.should.have.been.called;
                }
            });

            it(`should execute the ${verb}.cmd script using a custom output adapter (Windows)`, async () => {
                sandbox.stub(process, 'platform').value('win32');
                const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
                if (verb !== 'kill_chaincode') {
                    spawnStub.withArgs('cmd', ['/c', `${verb}.cmd`], sinon.match.any).callsFake(() => {
                        return mockSuccessCommand();
                    });
                } else {
                    spawnStub.withArgs('cmd', ['/c', `${verb}.cmd`, 'mySmartContract', '0.0.1'], sinon.match.any).callsFake(() => {
                        return mockSuccessCommand();
                    });
                }

                const outputAdapter: sinon.SinonStubbedInstance<TestFabricOutputAdapter> = sandbox.createStubInstance(TestFabricOutputAdapter);
                if (verb !== 'kill_chaincode') {
                    await runtime[verb](outputAdapter);
                } else {
                    await runtime['killChaincode'](['mySmartContract', '0.0.1'], outputAdapter);
                }
                outputAdapter.log.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'stdout');
                outputAdapter.log.getCall(1).should.have.been.calledWith(LogType.INFO, undefined, 'stderr');

                if (verb !== 'generate' && verb !== 'start' && verb !== 'kill_chaincode') {
                    stopLogsStub.should.have.been.called;
                }
            });

            if (verb !== 'kill_chaincode') {

                it(`should publish busy events and set state before and after handling success (Windows)`, async () => {
                    if (verb === 'kill_chaincode') {
                        // don't need to do test for kill chaincode
                        return;
                    }

                    sandbox.stub(process, 'platform').value('win32');
                    const eventStub: sinon.SinonStub = sandbox.stub();
                    const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
                    spawnStub.withArgs('cmd', ['/c', `${verb}.cmd`], sinon.match.any).callsFake(() => {
                        return mockSuccessCommand();
                    });

                    if (verb === 'generate' || verb === 'start') {
                        isRunningStub.resolves(true);
                    } else {
                        isRunningStub.resolves(false);
                    }

                    runtime.on('busy', eventStub);
                    await runtime[verb]();
                    eventStub.should.have.been.calledTwice;
                    eventStub.should.have.been.calledWithExactly(true);
                    eventStub.should.have.been.calledWithExactly(false);

                    if (verb === 'generate' || verb === 'start') {
                        runtime.getState().should.equal(FabricRuntimeState.STARTED);
                        setStateSpy.should.have.been.calledTwice;
                        setStateSpy.firstCall.should.have.been.calledWith(FabricRuntimeState.STARTING);
                        setStateSpy.secondCall.should.have.been.calledWith(FabricRuntimeState.STARTED);

                    } else if (verb === 'stop' || verb === 'teardown') {
                        runtime.getState().should.equal(FabricRuntimeState.STOPPED);
                        setStateSpy.should.have.been.calledTwice;
                        setStateSpy.firstCall.should.have.been.calledWith(FabricRuntimeState.STOPPING);
                        setStateSpy.secondCall.should.have.been.calledWith(FabricRuntimeState.STOPPED);
                        stopLogsStub.should.have.been.called;
                    }
                });

                it(`should publish busy events and set state before and after handling an error (Windows)`, async () => {
                    sandbox.stub(process, 'platform').value('win32');
                    const eventStub: sinon.SinonStub = sandbox.stub();
                    const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
                    spawnStub.withArgs('cmd', ['/c', `${verb}.cmd`], sinon.match.any).callsFake(() => {
                        return mockFailureCommand();
                    });
                    runtime.on('busy', eventStub);

                    if (verb === 'generate' || verb === 'start') {
                        isRunningStub.resolves(false);
                    } else {
                        isRunningStub.resolves(true);
                    }

                    await runtime[verb]().should.be.rejectedWith(`Failed to execute command "cmd" with  arguments "/c, ${verb}.cmd" return code 1`);
                    eventStub.should.have.been.calledTwice;
                    eventStub.should.have.been.calledWithExactly(true);
                    eventStub.should.have.been.calledWithExactly(false);

                    if (verb === 'generate' || verb === 'start') {
                        runtime.getState().should.equal(FabricRuntimeState.STOPPED);
                        setStateSpy.should.have.been.calledTwice;
                        setStateSpy.firstCall.should.have.been.calledWith(FabricRuntimeState.STARTING);
                        setStateSpy.secondCall.should.have.been.calledWith(FabricRuntimeState.STOPPED);

                    } else if (verb === 'stop' || verb === 'teardown') {
                        runtime.getState().should.equal(FabricRuntimeState.STARTED);
                        setStateSpy.should.have.been.calledTwice;
                        setStateSpy.firstCall.should.have.been.calledWith(FabricRuntimeState.STOPPING);
                        setStateSpy.secondCall.should.have.been.calledWith(FabricRuntimeState.STARTED);
                        stopLogsStub.should.have.been.called;
                    }
                });
            }

            if (verb === 'teardown') {

                it('should recreate the runtime after tearing it down', async () => {
                    sandbox.stub(child_process, 'spawn').callsFake(() => {
                        return mockSuccessCommand();
                    });
                    await runtime.teardown();
                    createStub.should.have.been.calledOnce;
                    importWalletsAndIdentitiesStub.should.have.been.calledOnce;
                    importGatewaysStub.should.have.been.calledOnce;
                });
            }
        });
    });

    describe('#restart', () => {

        let isRunningStub: sinon.SinonStub;
        let stopLogsStub: sinon.SinonStub;

        beforeEach(() => {
            isRunningStub = sandbox.stub(runtime, 'isRunning').resolves(false);
            stopLogsStub = sandbox.stub(runtime, 'stopLogs');
        });

        it('should execute the start.sh and stop.sh scripts and handle success (Linux/MacOS)', async () => {
            sandbox.stub(process, 'platform').value('linux');
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('/bin/sh', ['start.sh'], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            spawnStub.withArgs('/bin/sh', ['stop.sh'], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            await runtime.restart();
            spawnStub.should.have.been.calledTwice;
            spawnStub.should.have.been.calledWith('/bin/sh', ['start.sh'], sinon.match.any);
            spawnStub.should.have.been.calledWith('/bin/sh', ['stop.sh'], sinon.match.any);

            stopLogsStub.should.have.been.called;
        });

        it('should execute the start.sh and stop.sh scripts using a custom output adapter (Linux/MacOS)', async () => {
            sandbox.stub(process, 'platform').value('linux');
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('/bin/sh', ['start.sh'], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            spawnStub.withArgs('/bin/sh', ['stop.sh'], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            const outputAdapter: sinon.SinonStubbedInstance<TestFabricOutputAdapter> = sandbox.createStubInstance(TestFabricOutputAdapter);
            await runtime.restart(outputAdapter);
            outputAdapter.log.callCount.should.equal(4);

            outputAdapter.log.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'stdout');
            outputAdapter.log.getCall(1).should.have.been.calledWith(LogType.INFO, undefined, 'stderr');
            outputAdapter.log.getCall(2).should.have.been.calledWith(LogType.INFO, undefined, 'stdout');
            outputAdapter.log.getCall(3).should.have.been.calledWith(LogType.INFO, undefined, 'stderr');
            stopLogsStub.should.have.been.called;
        });

        it('should publish busy events and set state before and after handling success (Linux/MacOS)', async () => {
            sandbox.stub(process, 'platform').value('linux');
            const eventStub: sinon.SinonStub = sandbox.stub();
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('/bin/sh', ['start.sh'], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            spawnStub.withArgs('/bin/sh', ['stop.sh'], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            runtime.on('busy', eventStub);
            isRunningStub.resolves(true);
            const setStateSpy: sinon.SinonSpy = sandbox.spy(runtime, 'setState');
            await runtime.restart();
            eventStub.should.have.been.calledTwice;
            eventStub.should.have.been.calledWithExactly(true);
            eventStub.should.have.been.calledWithExactly(false);

            setStateSpy.should.have.been.calledTwice;
            setStateSpy.firstCall.should.have.been.calledWith(FabricRuntimeState.RESTARTING);
            setStateSpy.secondCall.should.have.been.calledWith(FabricRuntimeState.STARTED);
            runtime.getState().should.equal(FabricRuntimeState.STARTED);
            stopLogsStub.should.have.been.called;
        });

        it('should publish busy events and set state before and after handling an error, failure to stop (Linux/MacOS)', async () => {
            sandbox.stub(process, 'platform').value('linux');
            const eventStub: sinon.SinonStub = sandbox.stub();
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('/bin/sh', ['start.sh'], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            spawnStub.withArgs('/bin/sh', ['stop.sh'], sinon.match.any).callsFake(() => {
                return mockFailureCommand();
            });
            runtime.on('busy', eventStub);
            isRunningStub.resolves(true);
            const setStateSpy: sinon.SinonSpy = sandbox.spy(runtime, 'setState');
            await runtime.restart().should.be.rejectedWith(`Failed to execute command "/bin/sh" with  arguments "stop.sh" return code 1`);
            eventStub.should.have.been.calledTwice;
            eventStub.should.have.been.calledWithExactly(true);
            eventStub.should.have.been.calledWithExactly(false);

            setStateSpy.should.have.been.calledTwice;
            setStateSpy.firstCall.should.have.been.calledWith(FabricRuntimeState.RESTARTING);
            setStateSpy.secondCall.should.have.been.calledWith(FabricRuntimeState.STARTED);
            runtime.getState().should.equal(FabricRuntimeState.STARTED);
            stopLogsStub.should.have.been.called;
        });

        it('should publish busy events and set state before and after handling an error, failure to start (Linux/MacOS)', async () => {
            sandbox.stub(process, 'platform').value('linux');
            const eventStub: sinon.SinonStub = sandbox.stub();
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('/bin/sh', ['start.sh'], sinon.match.any).callsFake(() => {
                return mockFailureCommand();
            });
            spawnStub.withArgs('/bin/sh', ['stop.sh'], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            runtime.on('busy', eventStub);
            isRunningStub.resolves(false);
            const setStateSpy: sinon.SinonSpy = sandbox.spy(runtime, 'setState');
            await runtime.restart().should.be.rejectedWith(`Failed to execute command "/bin/sh" with  arguments "start.sh" return code 1`);
            eventStub.should.have.been.calledTwice;
            eventStub.should.have.been.calledWithExactly(true);
            eventStub.should.have.been.calledWithExactly(false);

            setStateSpy.should.have.been.calledTwice;
            setStateSpy.firstCall.should.have.been.calledWith(FabricRuntimeState.RESTARTING);
            setStateSpy.secondCall.should.have.been.calledWith(FabricRuntimeState.STOPPED);
            runtime.getState().should.equal(FabricRuntimeState.STOPPED);
            stopLogsStub.should.have.been.called;
        });

        it('should execute the start.cmd and stop.cmd scripts and handle success (Windows)', async () => {
            sandbox.stub(process, 'platform').value('win32');
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('cmd', ['/c', 'start.cmd'], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            spawnStub.withArgs('cmd', ['/c', 'stop.cmd'], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            await runtime.restart();
            spawnStub.should.have.been.calledTwice;
            spawnStub.should.have.been.calledWith('cmd', ['/c', 'start.cmd'], sinon.match.any);
            spawnStub.should.have.been.calledWith('cmd', ['/c', 'stop.cmd'], sinon.match.any);
            stopLogsStub.should.have.been.called;
        });

        it('should execute the start.sh and stop.sh scripts using a custom output adapter (Windows)', async () => {
            sandbox.stub(process, 'platform').value('win32');
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('cmd', ['/c', 'start.cmd'], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            spawnStub.withArgs('cmd', ['/c', 'stop.cmd'], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            const outputAdapter: sinon.SinonStubbedInstance<TestFabricOutputAdapter> = sandbox.createStubInstance(TestFabricOutputAdapter);
            await runtime.restart(outputAdapter);
            outputAdapter.log.callCount.should.equal(4);
            outputAdapter.log.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'stdout');
            outputAdapter.log.getCall(1).should.have.been.calledWith(LogType.INFO, undefined, 'stderr');
            outputAdapter.log.getCall(2).should.have.been.calledWith(LogType.INFO, undefined, 'stdout');
            outputAdapter.log.getCall(3).should.have.been.calledWith(LogType.INFO, undefined, 'stderr');
            stopLogsStub.should.have.been.called;
        });

        it('should publish busy events and set state before and after handling success (Windows)', async () => {
            sandbox.stub(process, 'platform').value('win32');
            const eventStub: sinon.SinonStub = sandbox.stub();
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('cmd', ['/c', 'start.cmd'], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            spawnStub.withArgs('cmd', ['/c', 'stop.cmd'], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            runtime.on('busy', eventStub);
            isRunningStub.resolves(true);
            const setStateSpy: sinon.SinonSpy = sandbox.spy(runtime, 'setState');
            await runtime.restart();
            eventStub.should.have.been.calledTwice;
            eventStub.should.have.been.calledWithExactly(true);
            eventStub.should.have.been.calledWithExactly(false);

            setStateSpy.should.have.been.calledTwice;
            setStateSpy.firstCall.should.have.been.calledWith(FabricRuntimeState.RESTARTING);
            setStateSpy.secondCall.should.have.been.calledWith(FabricRuntimeState.STARTED);
            runtime.getState().should.equal(FabricRuntimeState.STARTED);
            stopLogsStub.should.have.been.called;
        });

        it('should publish busy events and set state before and after handling an error, on stopping (Windows)', async () => {
            sandbox.stub(process, 'platform').value('win32');
            const eventStub: sinon.SinonStub = sandbox.stub();
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('cmd', ['/c', 'start.cmd'], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            spawnStub.withArgs('cmd', ['/c', 'stop.cmd'], sinon.match.any).callsFake(() => {
                return mockFailureCommand();
            });
            runtime.on('busy', eventStub);
            isRunningStub.resolves(true);
            const setStateSpy: sinon.SinonSpy = sandbox.spy(runtime, 'setState');
            await runtime.restart().should.be.rejectedWith(`Failed to execute command "cmd" with  arguments "/c, stop.cmd" return code 1`);
            eventStub.should.have.been.calledTwice;
            eventStub.should.have.been.calledWithExactly(true);
            eventStub.should.have.been.calledWithExactly(false);

            setStateSpy.should.have.been.calledTwice;
            setStateSpy.firstCall.should.have.been.calledWith(FabricRuntimeState.RESTARTING);
            setStateSpy.secondCall.should.have.been.calledWith(FabricRuntimeState.STARTED);
            runtime.getState().should.equal(FabricRuntimeState.STARTED);
            stopLogsStub.should.have.been.called;
        });

        it('should publish busy events and set state before and after handling an error, on starting (Windows)', async () => {
            sandbox.stub(process, 'platform').value('win32');
            const eventStub: sinon.SinonStub = sandbox.stub();
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('cmd', ['/c', 'start.cmd'], sinon.match.any).callsFake(() => {
                return mockFailureCommand();
            });
            spawnStub.withArgs('cmd', ['/c', 'stop.cmd'], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            runtime.on('busy', eventStub);
            isRunningStub.resolves(false);
            const setStateSpy: sinon.SinonSpy = sandbox.spy(runtime, 'setState');
            await runtime.restart().should.be.rejectedWith(`Failed to execute command "cmd" with  arguments "/c, start.cmd" return code 1`);
            eventStub.should.have.been.calledTwice;
            eventStub.should.have.been.calledWithExactly(true);
            eventStub.should.have.been.calledWithExactly(false);

            setStateSpy.should.have.been.calledTwice;
            setStateSpy.firstCall.should.have.been.calledWith(FabricRuntimeState.RESTARTING);
            setStateSpy.secondCall.should.have.been.calledWith(FabricRuntimeState.STOPPED);
            runtime.getState().should.equal(FabricRuntimeState.STOPPED);
            stopLogsStub.should.have.been.called;
        });
    });

    describe('#isCreated', () => {

        it('should return true if the runtime directory exists', async () => {
            await runtime.isCreated().should.eventually.be.true;
        });

        it('should return false if the runtime directory does not exist', async () => {
            await FabricEnvironmentRegistry.instance().clear();
            await runtime.isCreated().should.eventually.be.false;
        });

    });

    describe('#isGenerated', () => {

        it('should return false if not created (Linux/MacOS)', async () => {
            sandbox.stub(process, 'platform').value('linux');
            sandbox.stub(runtime, 'isCreated').resolves(false);
            await runtime.isGenerated().should.eventually.be.false;
        });

        it('should return false if not created (Windows)', async () => {
            sandbox.stub(process, 'platform').value('win32');
            sandbox.stub(runtime, 'isCreated').resolves(false);
            await runtime.isGenerated().should.eventually.be.false;
        });

        it('should execute the is_generated.sh script and return true if successful (Linux/MacOS)', async () => {
            sandbox.stub(process, 'platform').value('linux');
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('/bin/sh', ['is_generated.sh'], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            await runtime.isGenerated().should.eventually.be.true;
            spawnStub.should.have.been.calledOnce;
            spawnStub.should.have.been.calledWith('/bin/sh', ['is_generated.sh'], sinon.match.any);
        });

        it('should execute the is_generated.sh script and return false if unsuccessful (Linux/MacOS)', async () => {
            sandbox.stub(process, 'platform').value('linux');
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('/bin/sh', ['is_generated.sh'], sinon.match.any).callsFake(() => {
                return mockFailureCommand();
            });
            await runtime.isGenerated().should.eventually.be.false;
            spawnStub.should.have.been.calledOnce;
            spawnStub.should.have.been.calledWith('/bin/sh', ['is_generated.sh'], sinon.match.any);
        });

        it('should execute the is_generated.sh script and return true if successful (Windows)', async () => {
            sandbox.stub(process, 'platform').value('win32');
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('cmd', ['/c', 'is_generated.cmd'], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            await runtime.isGenerated().should.eventually.be.true;
            spawnStub.should.have.been.calledOnce;
            spawnStub.should.have.been.calledWith('cmd', ['/c', 'is_generated.cmd'], sinon.match.any);
        });

        it('should execute the is_generated.sh script and return false if unsuccessful (Windows)', async () => {
            sandbox.stub(process, 'platform').value('win32');
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('cmd', ['/c', 'is_generated.cmd'], sinon.match.any).callsFake(() => {
                return mockFailureCommand();
            });
            await runtime.isGenerated().should.eventually.be.false;
            spawnStub.should.have.been.calledOnce;
            spawnStub.should.have.been.calledWith('cmd', ['/c', 'is_generated.cmd'], sinon.match.any);
        });

    });

    describe('#isRunning', () => {

        it('should return false if not created (Linux/MacOS)', async () => {
            sandbox.stub(process, 'platform').value('linux');
            sandbox.stub(runtime, 'isCreated').resolves(false);
            await runtime.isRunning().should.eventually.be.false;
        });

        it('should return false if not created (Windows)', async () => {
            sandbox.stub(process, 'platform').value('win32');
            sandbox.stub(runtime, 'isCreated').resolves(false);
            await runtime.isRunning().should.eventually.be.false;
        });

        it('should execute the is_generated.sh script and return true if successful (Linux/MacOS)', async () => {
            sandbox.stub(process, 'platform').value('linux');
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('/bin/sh', ['is_running.sh'], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            await runtime.isRunning().should.eventually.be.true;
            spawnStub.should.have.been.calledOnce;
            spawnStub.should.have.been.calledWith('/bin/sh', ['is_running.sh'], sinon.match.any);
        });

        it('should execute the is_generated.sh script and return false if unsuccessful (Linux/MacOS)', async () => {
            sandbox.stub(process, 'platform').value('linux');
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('/bin/sh', ['is_running.sh'], sinon.match.any).callsFake(() => {
                return mockFailureCommand();
            });
            await runtime.isRunning().should.eventually.be.false;
            spawnStub.should.have.been.calledOnce;
            spawnStub.should.have.been.calledWith('/bin/sh', ['is_running.sh'], sinon.match.any);
        });

        it('should execute the is_generated.sh script and return true if successful (Windows)', async () => {
            sandbox.stub(process, 'platform').value('win32');
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('cmd', ['/c', 'is_running.cmd'], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            await runtime.isRunning().should.eventually.be.true;
            spawnStub.should.have.been.calledOnce;
            spawnStub.should.have.been.calledWith('cmd', ['/c', 'is_running.cmd'], sinon.match.any);
        });

        it('should execute the is_generated.sh script and return false if unsuccessful (Windows)', async () => {
            sandbox.stub(process, 'platform').value('win32');
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('cmd', ['/c', 'is_running.cmd'], sinon.match.any).callsFake(() => {
                return mockFailureCommand();
            });
            await runtime.isRunning().should.eventually.be.false;
            spawnStub.should.have.been.calledOnce;
            spawnStub.should.have.been.calledWith('cmd', ['/c', 'is_running.cmd'], sinon.match.any);
        });

        it('should return the same promise if a request is already running (Linux/MacOS)', async () => {
            sandbox.stub(process, 'platform').value('linux');
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('/bin/sh', ['is_running.sh'], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            const promise1: any = runtime.isRunning();
            const promise2: any = runtime.isRunning();
            (promise1 === promise2).should.be.true;
            await promise1.should.eventually.be.true;
            spawnStub.should.have.been.calledOnce;
            spawnStub.should.have.been.calledWith('/bin/sh', ['is_running.sh'], sinon.match.any);
        });

        it('should return the same promise if a request is already running (Linux/MacOS)', async () => {
            sandbox.stub(process, 'platform').value('win32');
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('cmd', ['/c', 'is_running.cmd'], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            const promise1: any = runtime.isRunning();
            const promise2: any = runtime.isRunning();
            (promise1 === promise2).should.be.true;
            await promise1.should.eventually.be.true;
            spawnStub.should.have.been.calledOnce;
            spawnStub.should.have.been.calledWith('cmd', ['/c', 'is_running.cmd'], sinon.match.any);
        });

    });

    describe('#getPeerChaincodeURL', () => {

        it('should get the peer chaincode URL', async () => {
            await runtime.getPeerChaincodeURL().should.eventually.equal('grpc://localhost:17052');
        });

        it('should throw an error if there are no peer nodes', async () => {
            sandbox.stub(runtime, 'getNodes').resolves([]);
            await runtime.getPeerChaincodeURL().should.be.rejectedWith(/There are no Fabric peer nodes/);
        });

    });

    describe('#getLogspoutURL', () => {

        it('should get the logspout URL', async () => {
            await runtime.getLogspoutURL().should.eventually.equal('http://localhost:17056');
        });

        it('should throw an error if there are no logspout nodes', async () => {
            sandbox.stub(runtime, 'getNodes').resolves([]);
            await runtime.getLogspoutURL().should.be.rejectedWith(/There are no Logspout nodes/);
        });

    });

    describe('#getPeerContainerName', () => {

        it('should get the peer container name', async () => {
            await runtime.getPeerContainerName().should.eventually.equal('yofn_peer0.org1.example.com');
        });

        it('should throw an error if there are no peer nodes', async () => {
            sandbox.stub(runtime, 'getNodes').resolves([]);
            await runtime.getPeerContainerName().should.be.rejectedWith(/There are no Fabric peer nodes/);
        });

    });

    describe('#startLogs', () => {

        it('should start the logs', async () => {
            const sendRequest: sinon.SinonStub = sandbox.stub(CommandUtil, 'sendRequestWithOutput');

            await runtime.startLogs(VSCodeBlockchainDockerOutputAdapter.instance());

            sendRequest.should.have.been.calledWith('http://localhost:17056/logs', VSCodeBlockchainDockerOutputAdapter.instance());
        });
    });

    describe('#stopLogs', () => {
        it('should stop the logs', () => {
            const abortRequestStub: sinon.SinonStub = sandbox.stub(CommandUtil, 'abortRequest');

            runtime['logsRequest'] = { abort: sandbox.stub() };
            runtime.stopLogs();

            abortRequestStub.should.have.been.calledWith(runtime['logsRequest']);
        });

        it('should not stop the logs if no request', () => {
            const abortRequestStub: sinon.SinonStub = sandbox.stub(CommandUtil, 'abortRequest');

            runtime.stopLogs();

            abortRequestStub.should.not.have.been.called;
        });
    });

    describe('#getGateways', () => {

        it('should return an empty array if no gateways directory', async () => {
            sandbox.stub(fs, 'pathExists').resolves(false);
            await runtime.getGateways().should.eventually.deep.equal([]);
        });

        it('should return all of the gateways', async () => {
            await runtime.getGateways().should.eventually.deep.equal([
                {
                    name: 'yofn',
                    path: path.resolve(runtimePath, 'gateways', 'yofn.json'),
                    connectionProfile: {
                        name: 'yofn',
                        version: '1.0.0',
                        wallet: FabricWalletUtil.LOCAL_WALLET,
                        client: {
                            organization: 'Org1',
                            connection: {
                                timeout: {
                                    peer: {
                                        endorser: '300'
                                    },
                                    orderer: '300'
                                }
                            }
                        },
                        organizations: {
                            Org1: {
                                mspid: 'Org1MSP',
                                peers: [
                                    'peer0.org1.example.com'
                                ],
                                certificateAuthorities: [
                                    'ca.org1.example.com'
                                ]
                            }
                        },
                        peers: {
                            'peer0.org1.example.com': {
                                url: 'grpc://localhost:17051'
                            }
                        },
                        certificateAuthorities: {
                            'ca.org1.example.com': {
                                url: 'http://localhost:17054',
                                caName: 'ca.org1.example.com'
                            }
                        }
                    }
                }
            ]);
        });
    });

    describe('#getWalletNames', () => {

        it('should return an empty array if no wallets directory', async () => {
            sandbox.stub(fs, 'pathExists').resolves(false);
            await runtime.getWalletNames().should.eventually.deep.equal([]);
        });

        it('should return all of the wallet names', async () => {
            await runtime.getWalletNames().should.eventually.deep.equal([FabricWalletUtil.LOCAL_WALLET]);
        });

    });

    describe('#getIdentities', () => {

        it('should return an empty array if no wallet directory', async () => {
            sandbox.stub(fs, 'pathExists').resolves(false);
            await runtime.getIdentities(FabricWalletUtil.LOCAL_WALLET).should.eventually.deep.equal([]);
        });

        it('should return all of the identities', async () => {
            await runtime.getIdentities(FabricWalletUtil.LOCAL_WALLET).should.eventually.deep.equal([
                new FabricIdentity(
                    'admin',
                    'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUNXRENDQWYrZ0F3SUJBZ0lVUU4zUlE1MFB6R0wrZFRBc2haeXJRNGc2MEFZd0NnWUlLb1pJemowRUF3SXcKY3pFTE1Ba0dBMVVFQmhNQ1ZWTXhFekFSQmdOVkJBZ1RDa05oYkdsbWIzSnVhV0V4RmpBVUJnTlZCQWNURFZOaApiaUJHY21GdVkybHpZMjh4R1RBWEJnTlZCQW9URUc5eVp6RXVaWGhoYlhCc1pTNWpiMjB4SERBYUJnTlZCQU1UCkUyTmhMbTl5WnpFdVpYaGhiWEJzWlM1amIyMHdIaGNOTVRrd05ERTRNVFl4TkRBd1doY05NakF3TkRFM01UWXgKT1RBd1dqQmRNUXN3Q1FZRFZRUUdFd0pWVXpFWE1CVUdBMVVFQ0JNT1RtOXlkR2dnUTJGeWIyeHBibUV4RkRBUwpCZ05WQkFvVEMwaDVjR1Z5YkdWa1oyVnlNUTh3RFFZRFZRUUxFd1pqYkdsbGJuUXhEakFNQmdOVkJBTVRCV0ZrCmJXbHVNRmt3RXdZSEtvWkl6ajBDQVFZSUtvWkl6ajBEQVFjRFFnQUVDSTNkbnI1ekx0b3VmbmF4N0l2bnRMQ3EKY0gyMlZveXhYck43RHNZTG1MOExIWHFkTE9STGRCMHlBeVQ5a3FqRVJlYVFGUys5eWY0RGhFUVh5YTRsaEtPQgpoakNCZ3pBT0JnTlZIUThCQWY4RUJBTUNCNEF3REFZRFZSMFRBUUgvQkFJd0FEQWRCZ05WSFE0RUZnUVUvR2x6CjB0TWowYkRxblZ2YXBRcG1MY0Fscmdnd0t3WURWUjBqQkNRd0lvQWdNRklUMFpYR1dhMzU1THlUNEJ6c2RHNGoKdy9RNHBkeTByTzUrdEtGVEY1SXdGd1lEVlIwUkJCQXdEb0lNWkRnek5UVTFaRGsxT1dNNU1Bb0dDQ3FHU000OQpCQU1DQTBjQU1FUUNJQ2VrdEcrejAxUkZHOTc2bStNWnJyckFZN0srckxVYXFPYmk1YStsSWs0ckFpQTBsMzN2CjU4dkFvMFhYbU9ncnQrUmQwWFZJbDZJUW1EVFFrZnNwT3RsVDV3PT0KLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQo=',
                    'LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JR0hBZ0VBTUJNR0J5cUdTTTQ5QWdFR0NDcUdTTTQ5QXdFSEJHMHdhd0lCQVFRZ3RGK29wMGFWMWx1TTU0VGoKTVV1Rnhod3pSUmM3S1VMMDhjT0IyZFRjTG1HaFJBTkNBQVFJamQyZXZuTXUyaTUrZHJIc2krZTBzS3B3ZmJaVwpqTEZlczNzT3hndVl2d3NkZXAwczVFdDBIVElESlAyU3FNUkY1cEFWTDczSi9nT0VSQmZKcmlXRQotLS0tLUVORCBQUklWQVRFIEtFWS0tLS0tCg==',
                    'Org1MSP'
                )
            ]);
        });

    });

    describe('#updateUserSettings', () => {
        it('should update the user settings', async () => {
            const updateStub: sinon.SinonStub = sandbox.stub();
            const getConfigurationStub: sinon.SinonStub = sandbox.stub(vscode.workspace, 'getConfiguration');
            getConfigurationStub.returns({
                get: sandbox.stub().callThrough,
                update: updateStub
            });

            await runtime.updateUserSettings();

            updateStub.should.have.been.calledWith(SettingConfigurations.FABRIC_RUNTIME,
                {
                    ports: {
                        certificateAuthority: 12348,
                        couchDB: 12349,
                        logs: 12387,
                        orderer: 12347,
                        peerChaincode: 54321,
                        peerEventHub: 12346,
                        peerRequest: 12345
                    }
                });
        });
    });
});
