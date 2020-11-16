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
import * as vscode from 'vscode';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import { TestUtil } from '../../TestUtil';
import * as path from 'path';
import { YeomanUtil } from '../../../extension/util/YeomanUtil';
import { SettingConfigurations } from '../../../extension/configurations';
import { FabricRuntimeState } from '../../../extension/fabric/FabricRuntimeState';
import { LocalMicroEnvironment } from '../../../extension/fabric/environments/LocalMicroEnvironment';
import { OutputAdapter, LogType, FabricEnvironmentRegistry, FabricRuntimeUtil, FabricEnvironmentRegistryEntry, EnvironmentType } from 'ibm-blockchain-platform-common';
import * as stream from 'stream';
import { VSCodeBlockchainDockerOutputAdapter } from '../../../extension/logging/VSCodeBlockchainDockerOutputAdapter';
import { TimerUtil } from '../../../extension/util/TimerUtil';

const should: Chai.Should = chai.should();
chai.use(chaiAsPromised);

// tslint:disable no-unused-expression
describe('LocalMicroEnvironment', () => {

    const originalPlatform: string = process.platform;
    const originalSpawn: any = child_process.spawn;
    const environmentPath: string = path.join(__dirname, '..', '..', 'test', 'tmp', 'environments', FabricRuntimeUtil.LOCAL_FABRIC);

    let environment: LocalMicroEnvironment;
    let sandbox: sinon.SinonSandbox;

    let stopLogsStub: sinon.SinonStub;
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
        // await TestUtil.setupLocalFabric();
    });

    beforeEach(async () => {
        sandbox = sinon.createSandbox();

        await TestUtil.startLocalFabric();

        environment = new LocalMicroEnvironment(FabricRuntimeUtil.LOCAL_FABRIC, 8080, 1);
        environment['path'] = environmentPath;
        const localSetting: any = {};
        localSetting[FabricRuntimeUtil.LOCAL_FABRIC] = 8080;

        await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, localSetting,  vscode.ConfigurationTarget.Global);

        stopLogsStub = sandbox.stub(LocalMicroEnvironment.prototype, 'stopLogs').returns(undefined);

    });

    afterEach(async () => {
        sandbox.restore();
    });

    describe('#create', () => {
        it('should create a new network for the first time', async () => {
            const localSetting: any = {};

            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, localSetting,  vscode.ConfigurationTarget.Global);

            const addSpy: sinon.SinonSpy = sandbox.spy(FabricEnvironmentRegistry.instance(), 'add');
            const deleteSpy: sinon.SinonSpy = sandbox.spy(FabricEnvironmentRegistry.instance(), 'delete');

            const runStub: sinon.SinonStub = sandbox.stub(YeomanUtil, 'run').resolves();

            await environment.create();

            environment.port.should.equal(8080);

            deleteSpy.should.have.been.calledOnceWithExactly(FabricRuntimeUtil.LOCAL_FABRIC, true);
            addSpy.should.have.been.calledOnceWithExactly({
                name: FabricRuntimeUtil.LOCAL_FABRIC,
                managedRuntime: true,
                environmentType: EnvironmentType.LOCAL_MICROFAB_ENVIRONMENT,
                environmentDirectory: environment.getPath(),
                numberOfOrgs: 1,
                url: environment.getURL()
            } as FabricEnvironmentRegistryEntry);

            runStub.should.have.been.calledOnceWithExactly('fabric:network', {
                destination: environment.getPath(),
                dockerName: FabricRuntimeUtil.LOCAL_FABRIC.replace(/[^A-Za-z0-9]/g, ''),
                name: FabricRuntimeUtil.LOCAL_FABRIC,
                numOrganizations: 1,
                port: 8080
            });
        });
        it('should create a new network using the ports in the settings', async () => {

            const addSpy: sinon.SinonSpy = sandbox.spy(FabricEnvironmentRegistry.instance(), 'add');
            const deleteSpy: sinon.SinonSpy = sandbox.spy(FabricEnvironmentRegistry.instance(), 'delete');

            const runStub: sinon.SinonStub = sandbox.stub(YeomanUtil, 'run').resolves();
            await environment.create();

            deleteSpy.should.have.been.calledOnceWithExactly(FabricRuntimeUtil.LOCAL_FABRIC, true);
            addSpy.should.have.been.calledOnceWithExactly({
                name: FabricRuntimeUtil.LOCAL_FABRIC,
                managedRuntime: true,
                environmentType: EnvironmentType.LOCAL_MICROFAB_ENVIRONMENT,
                environmentDirectory: environment.getPath(),
                numberOfOrgs: 1,
                url: environment.getURL()
            } as FabricEnvironmentRegistryEntry);

            runStub.should.have.been.calledOnceWithExactly('fabric:network', {
                destination: environment.getPath(),
                dockerName: FabricRuntimeUtil.LOCAL_FABRIC.replace(/[^A-Za-z0-9]/g, ''),
                name: FabricRuntimeUtil.LOCAL_FABRIC,
                numOrganizations: 1,
                port: 8080
            });
        });

        it('should create a new network using ports which have been updated in the settings', async () => {
            const localSetting: any = {};
            localSetting[FabricRuntimeUtil.LOCAL_FABRIC] = 9080;

            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, localSetting,  vscode.ConfigurationTarget.Global);

            const addSpy: sinon.SinonSpy = sandbox.spy(FabricEnvironmentRegistry.instance(), 'add');
            const deleteSpy: sinon.SinonSpy = sandbox.spy(FabricEnvironmentRegistry.instance(), 'delete');

            const runStub: sinon.SinonStub = sandbox.stub(YeomanUtil, 'run').resolves();
            await environment.create();
            environment.port.should.equal(9080);

            deleteSpy.should.have.been.calledOnceWithExactly(FabricRuntimeUtil.LOCAL_FABRIC, true);

            addSpy.should.have.been.calledOnceWithExactly({
                name: FabricRuntimeUtil.LOCAL_FABRIC,
                managedRuntime: true,
                environmentType: EnvironmentType.LOCAL_MICROFAB_ENVIRONMENT,
                environmentDirectory: environment.getPath(),
                numberOfOrgs: 1,
                url: environment.getURL()
            } as FabricEnvironmentRegistryEntry);

            runStub.should.have.been.calledOnceWithExactly('fabric:network', {
                destination: environment.getPath(),
                dockerName: FabricRuntimeUtil.LOCAL_FABRIC.replace(/[^A-Za-z0-9]/g, ''),
                name: FabricRuntimeUtil.LOCAL_FABRIC,
                numOrganizations: 1,
                port: 9080
            });
        });

    });

    ['start', 'stop', 'teardown', 'kill_chaincode'].forEach((verb: string) => {

        describe(`#${verb}`, () => {

            let createStub: sinon.SinonStub;
            let isRunningStub: sinon.SinonStub;
            let setStateSpy: sinon.SinonSpy;
            let getConfigurationStub: sinon.SinonStub;
            let getSettingsStub: sinon.SinonStub;
            let isCreatedStub: sinon.SinonStub;

            beforeEach(() => {
                createStub = sandbox.stub(environment, 'create');
                isCreatedStub = sandbox.stub(environment, 'isCreated');
                isCreatedStub.resolves(true);
                isRunningStub = sandbox.stub(environment, 'isRunning').resolves(false);
                setStateSpy = sandbox.spy(LocalMicroEnvironment.prototype, 'setState');
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
                    await environment[verb]();
                } else {
                    await environment['killChaincode'](['mySmartContract', '0.0.1']);
                }

                spawnStub.should.have.been.calledOnce;

                spawnStub.getCall(0).args[2].env.CORE_CHAINCODE_MODE.should.equal('dev');
                spawnStub.getCall(0).args[2].env.CORE_CHAINCODE_EXECUTETIMEOUT.should.equal('120s');

                if (verb !== 'start' && verb !== 'kill_chaincode') {
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
                    await environment[verb]().should.be.rejectedWith(`Failed to execute command "/bin/sh" with  arguments "${verb}.sh" return code 1`);
                } else {
                    await environment['killChaincode'](['mySmartContract', '0.0.1']).should.be.rejectedWith(`Failed to execute command "/bin/sh" with  arguments "${verb}.sh, mySmartContract, 0.0.1" return code 1`);
                }

                spawnStub.should.have.been.calledOnce;

                if (verb !== 'kill_chaincode') {
                    spawnStub.should.have.been.calledWith('/bin/sh', [`${verb}.sh`], sinon.match.any);
                } else {
                    spawnStub.should.have.been.calledWith('/bin/sh', [`${verb}.sh`, 'mySmartContract', '0.0.1'], sinon.match.any);
                }

                if (verb !== 'start' && verb !== 'kill_chaincode') {
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
                    await environment[verb](outputAdapter);
                } else {
                    await environment['killChaincode'](['mySmartContract', '0.0.1'], outputAdapter);
                }
                outputAdapter.log.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'stdout');
                outputAdapter.log.getCall(1).should.have.been.calledWith(LogType.INFO, undefined, 'stderr');

                if (verb !== 'start' && verb !== 'kill_chaincode') {
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
                    environment.on('busy', eventStub);

                    if (verb === 'start') {
                        isRunningStub.resolves(true);
                    } else {
                        isRunningStub.resolves(false);
                    }

                    await environment[verb]();
                    eventStub.should.have.been.calledTwice;
                    eventStub.should.have.been.calledWithExactly(true);
                    eventStub.should.have.been.calledWithExactly(false);

                    if (verb === 'start') {
                        environment.getState().should.equal(FabricRuntimeState.STARTED);
                        setStateSpy.should.have.been.calledTwice;
                        setStateSpy.firstCall.should.have.been.calledWith(FabricRuntimeState.STARTING);
                        setStateSpy.secondCall.should.have.been.calledWith(FabricRuntimeState.STARTED);

                    } else if (verb === 'stop' || verb === 'teardown') {
                        environment.getState().should.equal(FabricRuntimeState.STOPPED);
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

                    if (verb === 'start') {
                        isRunningStub.resolves(false);
                    } else {
                        isRunningStub.resolves(true);
                    }
                    environment.on('busy', eventStub);

                    await environment[verb]().should.be.rejectedWith(`Failed to execute command "/bin/sh" with  arguments "${verb}.sh" return code 1`);
                    eventStub.should.have.been.calledTwice;
                    eventStub.should.have.been.calledWithExactly(true);
                    eventStub.should.have.been.calledWithExactly(false);

                    if (verb === 'start') {
                        environment.getState().should.equal(FabricRuntimeState.STOPPED);
                        setStateSpy.should.have.been.calledTwice;
                        setStateSpy.firstCall.should.have.been.calledWith(FabricRuntimeState.STARTING);
                        setStateSpy.secondCall.should.have.been.calledWith(FabricRuntimeState.STOPPED);

                    } else if (verb === 'stop' || verb === 'teardown') {
                        environment.getState().should.equal(FabricRuntimeState.STARTED);
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
                    await environment[verb]();
                } else {
                    await environment['killChaincode'](['mySmartContract', '0.0.1']);
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
                    await environment[verb]().should.be.rejectedWith(`Failed to execute command "cmd" with  arguments "/c, ${verb}.cmd" return code 1`);
                } else {
                    await environment['killChaincode'](['mySmartContract', '0.0.1']).should.be.rejectedWith(`Failed to execute command "cmd" with  arguments "/c, ${verb}.cmd, mySmartContract, 0.0.1" return code 1`);
                }

                spawnStub.should.have.been.calledOnce;

                if (verb !== 'kill_chaincode') {
                    spawnStub.should.have.been.calledWith('cmd', ['/c', `${verb}.cmd`], sinon.match.any);
                } else {
                    spawnStub.should.have.been.calledWith('cmd', ['/c', `${verb}.cmd`, 'mySmartContract', '0.0.1'], sinon.match.any);
                }

                if (verb !== 'start' && verb !== 'kill_chaincode') {
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
                    await environment[verb](outputAdapter);
                } else {
                    await environment['killChaincode'](['mySmartContract', '0.0.1'], outputAdapter);
                }
                outputAdapter.log.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'stdout');
                outputAdapter.log.getCall(1).should.have.been.calledWith(LogType.INFO, undefined, 'stderr');

                if (verb !== 'start' && verb !== 'kill_chaincode') {
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

                    if (verb === 'start') {
                        isRunningStub.resolves(true);
                    } else {
                        isRunningStub.resolves(false);
                    }

                    environment.on('busy', eventStub);
                    await environment[verb]();
                    eventStub.should.have.been.calledTwice;
                    eventStub.should.have.been.calledWithExactly(true);
                    eventStub.should.have.been.calledWithExactly(false);

                    if (verb === 'start') {
                        environment.getState().should.equal(FabricRuntimeState.STARTED);
                        setStateSpy.should.have.been.calledTwice;
                        setStateSpy.firstCall.should.have.been.calledWith(FabricRuntimeState.STARTING);
                        setStateSpy.secondCall.should.have.been.calledWith(FabricRuntimeState.STARTED);

                    } else if (verb === 'stop' || verb === 'teardown') {
                        environment.getState().should.equal(FabricRuntimeState.STOPPED);
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
                    environment.on('busy', eventStub);

                    if (verb === 'start') {
                        isRunningStub.resolves(false);
                    } else {
                        isRunningStub.resolves(true);
                    }

                    await environment[verb]().should.be.rejectedWith(`Failed to execute command "cmd" with  arguments "/c, ${verb}.cmd" return code 1`);
                    eventStub.should.have.been.calledTwice;
                    eventStub.should.have.been.calledWithExactly(true);
                    eventStub.should.have.been.calledWithExactly(false);

                    if (verb === 'start') {
                        environment.getState().should.equal(FabricRuntimeState.STOPPED);
                        setStateSpy.should.have.been.calledTwice;
                        setStateSpy.firstCall.should.have.been.calledWith(FabricRuntimeState.STARTING);
                        setStateSpy.secondCall.should.have.been.calledWith(FabricRuntimeState.STOPPED);

                    } else if (verb === 'stop' || verb === 'teardown') {
                        environment.getState().should.equal(FabricRuntimeState.STARTED);
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
                    await environment.teardown();
                    createStub.should.have.been.calledOnce;
                });
            }

            if (verb === 'start') {
                it('should create the runtime if not created', async () => {
                    sandbox.stub(child_process, 'spawn').callsFake(() => {
                        return mockSuccessCommand();
                    });

                    isCreatedStub.resolves(false);
                    await environment[verb]();
                    createStub.should.have.been.calledOnce;
                });

            }
        });
    });

    describe('#delete', () => {
        it('shouldnt recreate the runtime after deleting it', async () => {
            const createStub: sinon.SinonStub = sandbox.stub(environment, 'create');

            sandbox.stub(child_process, 'spawn').callsFake(() => {
                return mockSuccessCommand();
            });
            await environment.delete();
            createStub.should.not.have.been.called;
        });
    });

    describe('#isCreated', () => {

        it('should return true if the runtime directory exists', async () => {
            await environment.isCreated().should.eventually.be.true;
        });

        it('should return false if the runtime directory does not exist', async () => {
            await FabricEnvironmentRegistry.instance().clear();
            await environment.isCreated().should.eventually.be.false;
        });

    });

    describe('#updateUserSettings', () => {
        it('should update the user settings if the runtime exists', async () => {
            const updateStub: sinon.SinonStub = sandbox.stub();
            const getConfigurationStub: sinon.SinonStub = sandbox.stub(vscode.workspace, 'getConfiguration');
            const setting: any = {};
            setting[FabricRuntimeUtil.LOCAL_FABRIC] = 10080;
            getConfigurationStub.returns({
                get: sandbox.stub().returns(setting),
                update: updateStub
            });

            await environment.updateUserSettings(FabricRuntimeUtil.LOCAL_FABRIC);

            setting[FabricRuntimeUtil.LOCAL_FABRIC] = environment.port;

            updateStub.should.have.been.calledWith(SettingConfigurations.FABRIC_RUNTIME, setting);
        });

        it(`should update the user settings if the runtime doesn't exist`, async () => {
            const updateStub: sinon.SinonStub = sandbox.stub();
            const getConfigurationStub: sinon.SinonStub = sandbox.stub(vscode.workspace, 'getConfiguration');
            getConfigurationStub.returns({
                get: sandbox.stub().resolves({}),
                update: updateStub
            });

            await environment.updateUserSettings(FabricRuntimeUtil.LOCAL_FABRIC);

            updateStub.should.have.been.calledWith(SettingConfigurations.FABRIC_RUNTIME,
                {
                    '1 Org Local Fabric': 8080
                });
        });
    });

    describe('#isRunning', () => {

        it('should return false if not created (Linux/MacOS)', async () => {
            sandbox.stub(process, 'platform').value('linux');
            sandbox.stub(environment, 'isCreated').resolves(false);
            await environment.isRunning().should.eventually.be.false;
        });

        it('should return false if not created (Windows)', async () => {
            sandbox.stub(process, 'platform').value('win32');
            sandbox.stub(environment, 'isCreated').resolves(false);
            await environment.isRunning().should.eventually.be.false;
        });

        it('should execute the is_generated.sh script and return true if successful (Linux/MacOS)', async () => {
            sandbox.stub(process, 'platform').value('linux');
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('/bin/sh', ['is_running.sh'], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            await environment.isRunning().should.eventually.be.true;
            spawnStub.should.have.been.calledOnce;
            spawnStub.should.have.been.calledWith('/bin/sh', ['is_running.sh'], sinon.match.any);
        });

        it('should execute the is_generated.sh script and return false if unsuccessful (Linux/MacOS)', async () => {
            sandbox.stub(process, 'platform').value('linux');
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('/bin/sh', ['is_running.sh'], sinon.match.any).callsFake(() => {
                return mockFailureCommand();
            });
            await environment.isRunning().should.eventually.be.false;
            spawnStub.should.have.been.calledOnce;
            spawnStub.should.have.been.calledWith('/bin/sh', ['is_running.sh'], sinon.match.any);
        });

        it('should execute the is_generated.sh script and return true if successful (Windows)', async () => {
            sandbox.stub(process, 'platform').value('win32');
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('cmd', ['/c', 'is_running.cmd'], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            await environment.isRunning().should.eventually.be.true;
            spawnStub.should.have.been.calledOnce;
            spawnStub.should.have.been.calledWith('cmd', ['/c', 'is_running.cmd'], sinon.match.any);
        });

        it('should execute the is_generated.sh script and return false if unsuccessful (Windows)', async () => {
            sandbox.stub(process, 'platform').value('win32');
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('cmd', ['/c', 'is_running.cmd'], sinon.match.any).callsFake(() => {
                return mockFailureCommand();
            });
            await environment.isRunning().should.eventually.be.false;
            spawnStub.should.have.been.calledOnce;
            spawnStub.should.have.been.calledWith('cmd', ['/c', 'is_running.cmd'], sinon.match.any);
        });

        it('should return the same promise if a request is already running (Linux/MacOS)', async () => {
            sandbox.stub(process, 'platform').value('linux');
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('/bin/sh', ['is_running.sh'], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            const promise1: any = environment.isRunning();
            const promise2: any = environment.isRunning();
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
            const promise1: any = environment.isRunning();
            const promise2: any = environment.isRunning();
            (promise1 === promise2).should.be.true;
            await promise1.should.eventually.be.true;
            spawnStub.should.have.been.calledOnce;
            spawnStub.should.have.been.calledWith('cmd', ['/c', 'is_running.cmd'], sinon.match.any);
        });

    });

    describe('#startLogs', () => {

        it('should start the logs', async () => {
            const fakeStream: stream.Readable = new stream.Readable();
            fakeStream._read = (_size: any): any => {
                //
            };
            const logHoseStub: sinon.SinonStub = sandbox.stub(environment, 'getLoghose');
            logHoseStub.returns(fakeStream);
            const adapter: VSCodeBlockchainDockerOutputAdapter = VSCodeBlockchainDockerOutputAdapter.instance(FabricRuntimeUtil.LOCAL_FABRIC);
            const outputAdapter: sinon.SinonSpy = sandbox.spy(adapter, 'log');

            environment.startLogs(adapter);

            fakeStream.emit('data', { name: 'jake', line: 'simon dodges his unit tests' });
            outputAdapter.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `jake|simon dodges his unit tests`);

            // let formattedName: string = environment.getName().replace(/\s+/g, '');
            // formattedName += '_network';

            // const opts: any = logHoseStub.args[0][0];

            // const networkObject: any = {NetworkSettings: {Networks: {}}};
            // networkObject.NetworkSettings.Networks[formattedName] = {
            //     some: 'stuff'
            // };

            // opts.attachFilter('someid', networkObject).should.be.true;

        });
    });

    describe('#stopLogs', () => {
        it('should stop the logs if loghose is active', () => {
            stopLogsStub.restore();

            const fakeStream: stream.Readable = new stream.Readable();
            fakeStream._read = (_size: any): any => {
                //
            };
            environment['lh'] = fakeStream;

            const destroyStub: sinon.SinonStub = sandbox.stub(fakeStream, 'destroy').resolves();

            environment.stopLogs();
            destroyStub.should.have.been.calledOnce;

        });

        it('should set loghose to null', () => {
            stopLogsStub.restore();

            environment['lh'] = undefined;
            environment.stopLogs();
            should.not.exist(environment['lh]']);
        });

    });
    describe('getLoghose', () => {

        it('should get loghose', async () => {
            const fakeStream: stream.Readable = new stream.Readable();
            const result: any = environment.getLoghose({events: fakeStream});
            should.exist(result);
        });
    });

    describe('#restart', () => {

        let isRunningStub: sinon.SinonStub;

        beforeEach(() => {
            isRunningStub = sandbox.stub(environment, 'isRunning').resolves(false);
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
            await environment.restart();
            spawnStub.should.have.been.calledTwice;
            spawnStub.should.have.been.calledWith('/bin/sh', ['start.sh'], sinon.match.any);
            spawnStub.should.have.been.calledWith('/bin/sh', ['stop.sh'], sinon.match.any);
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
            await environment.restart(outputAdapter);
            outputAdapter.log.callCount.should.equal(4);

            outputAdapter.log.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'stdout');
            outputAdapter.log.getCall(1).should.have.been.calledWith(LogType.INFO, undefined, 'stderr');
            outputAdapter.log.getCall(2).should.have.been.calledWith(LogType.INFO, undefined, 'stdout');
            outputAdapter.log.getCall(3).should.have.been.calledWith(LogType.INFO, undefined, 'stderr');
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
            environment.on('busy', eventStub);
            isRunningStub.resolves(true);
            const setStateSpy: sinon.SinonSpy = sandbox.spy(environment, 'setState');
            await environment.restart();
            eventStub.should.have.been.calledTwice;
            eventStub.should.have.been.calledWithExactly(true);
            eventStub.should.have.been.calledWithExactly(false);

            setStateSpy.should.have.been.calledTwice;
            setStateSpy.firstCall.should.have.been.calledWith(FabricRuntimeState.RESTARTING);
            setStateSpy.secondCall.should.have.been.calledWith(FabricRuntimeState.STARTED);
            environment.getState().should.equal(FabricRuntimeState.STARTED);
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
            environment.on('busy', eventStub);
            isRunningStub.resolves(true);
            const setStateSpy: sinon.SinonSpy = sandbox.spy(environment, 'setState');
            await environment.restart().should.be.rejectedWith(`Failed to execute command "/bin/sh" with  arguments "stop.sh" return code 1`);
            eventStub.should.have.been.calledTwice;
            eventStub.should.have.been.calledWithExactly(true);
            eventStub.should.have.been.calledWithExactly(false);

            setStateSpy.should.have.been.calledTwice;
            setStateSpy.firstCall.should.have.been.calledWith(FabricRuntimeState.RESTARTING);
            setStateSpy.secondCall.should.have.been.calledWith(FabricRuntimeState.STARTED);
            environment.getState().should.equal(FabricRuntimeState.STARTED);
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
            environment.on('busy', eventStub);
            isRunningStub.resolves(false);
            const setStateSpy: sinon.SinonSpy = sandbox.spy(environment, 'setState');
            await environment.restart().should.be.rejectedWith(`Failed to execute command "/bin/sh" with  arguments "start.sh" return code 1`);
            eventStub.should.have.been.calledTwice;
            eventStub.should.have.been.calledWithExactly(true);
            eventStub.should.have.been.calledWithExactly(false);

            setStateSpy.should.have.been.calledTwice;
            setStateSpy.firstCall.should.have.been.calledWith(FabricRuntimeState.RESTARTING);
            setStateSpy.secondCall.should.have.been.calledWith(FabricRuntimeState.STOPPED);
            environment.getState().should.equal(FabricRuntimeState.STOPPED);
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
            await environment.restart();
            spawnStub.should.have.been.calledTwice;
            spawnStub.should.have.been.calledWith('cmd', ['/c', 'start.cmd'], sinon.match.any);
            spawnStub.should.have.been.calledWith('cmd', ['/c', 'stop.cmd'], sinon.match.any);
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
            await environment.restart(outputAdapter);
            outputAdapter.log.callCount.should.equal(4);
            outputAdapter.log.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'stdout');
            outputAdapter.log.getCall(1).should.have.been.calledWith(LogType.INFO, undefined, 'stderr');
            outputAdapter.log.getCall(2).should.have.been.calledWith(LogType.INFO, undefined, 'stdout');
            outputAdapter.log.getCall(3).should.have.been.calledWith(LogType.INFO, undefined, 'stderr');
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
            environment.on('busy', eventStub);
            isRunningStub.resolves(true);
            const setStateSpy: sinon.SinonSpy = sandbox.spy(environment, 'setState');
            await environment.restart();
            eventStub.should.have.been.calledTwice;
            eventStub.should.have.been.calledWithExactly(true);
            eventStub.should.have.been.calledWithExactly(false);

            setStateSpy.should.have.been.calledTwice;
            setStateSpy.firstCall.should.have.been.calledWith(FabricRuntimeState.RESTARTING);
            setStateSpy.secondCall.should.have.been.calledWith(FabricRuntimeState.STARTED);
            environment.getState().should.equal(FabricRuntimeState.STARTED);
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
            environment.on('busy', eventStub);
            isRunningStub.resolves(true);
            const setStateSpy: sinon.SinonSpy = sandbox.spy(environment, 'setState');
            await environment.restart().should.be.rejectedWith(`Failed to execute command "cmd" with  arguments "/c, stop.cmd" return code 1`);
            eventStub.should.have.been.calledTwice;
            eventStub.should.have.been.calledWithExactly(true);
            eventStub.should.have.been.calledWithExactly(false);

            setStateSpy.should.have.been.calledTwice;
            setStateSpy.firstCall.should.have.been.calledWith(FabricRuntimeState.RESTARTING);
            setStateSpy.secondCall.should.have.been.calledWith(FabricRuntimeState.STARTED);
            environment.getState().should.equal(FabricRuntimeState.STARTED);
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
            environment.on('busy', eventStub);
            isRunningStub.resolves(false);
            const setStateSpy: sinon.SinonSpy = sandbox.spy(environment, 'setState');
            await environment.restart().should.be.rejectedWith(`Failed to execute command "cmd" with  arguments "/c, start.cmd" return code 1`);
            eventStub.should.have.been.calledTwice;
            eventStub.should.have.been.calledWithExactly(true);
            eventStub.should.have.been.calledWithExactly(false);

            setStateSpy.should.have.been.calledTwice;
            setStateSpy.firstCall.should.have.been.calledWith(FabricRuntimeState.RESTARTING);
            setStateSpy.secondCall.should.have.been.calledWith(FabricRuntimeState.STOPPED);
            environment.getState().should.equal(FabricRuntimeState.STOPPED);
        });
    });

    describe('#getState', () => {
        it('should return starting if the runtime is starting', () => {
            (environment as any).state = FabricRuntimeState.STARTING;
            environment.getState().should.equal(FabricRuntimeState.STARTING);
        });

        it('should return stopping if the runtime is stopping', () => {
            (environment as any).state = FabricRuntimeState.STOPPING;
            environment.getState().should.equal(FabricRuntimeState.STOPPING);
        });

        it('should return restarting if the runtime is restarting', () => {
            (environment as any).state = FabricRuntimeState.RESTARTING;
            environment.getState().should.equal(FabricRuntimeState.RESTARTING);
        });

        it('should return stopped if the runtime is stopped', () => {
            (environment as any).state = FabricRuntimeState.STOPPED;
            environment.getState().should.equal(FabricRuntimeState.STOPPED);
        });

        it('should return started if the runtime is started', () => {
            (environment as any).state = FabricRuntimeState.STARTED;
            environment.getState().should.equal(FabricRuntimeState.STARTED);
        });
    });

    describe('#getPeerChaincodeURL', () => {

        it('should get the peer chaincode URL', async () => {
            const url: string = await environment.getPeerChaincodeURL();
            url.should.equal('grpc://org1peer-chaincode.127-0-0-1.nip.io:8080');
        });

        it('should be able to get peer chaincode url for an organisation', async () => {
            // No peers for Org2
            await environment.getPeerChaincodeURL('Org2').should.be.rejectedWith(/There are no Fabric peer nodes/);

            // Should get the peer chaincode url
            const url: string = await environment.getPeerChaincodeURL('Org1');
            url.should.equal('grpc://org1peer-chaincode.127-0-0-1.nip.io:8080');
        });

        it('should throw an error if there are no peer nodes', async () => {
            sandbox.stub(environment, 'getNodes').resolves([]);
            await environment.getPeerChaincodeURL().should.be.rejectedWith(/There are no Fabric peer nodes/);
        });

    });

    describe('#isBusy', () => {
        it('should return false if the runtime is not busy', () => {
            (environment as any).busy = false;
            environment.isBusy().should.be.false;
        });

        it('should return true if the runtime is busy', () => {
            (environment as any).busy = true;
            environment.isBusy().should.be.true;
        });
    });

    describe('#waitFor', () => {

        it('should respond immediately if network is alive', async () => {
            const isAliveStub: sinon.SinonStub = sandbox.stub(environment, 'isAlive').resolves(true);
            const result: boolean = await environment.waitFor();
            result.should.equal(true);
            isAliveStub.should.have.been.calledOnce;
        });

        it('should return false if never alive', async () => {
            const numberOfAttempts: number = 10;
            const interval: number = 2;
            const isAliveStub: sinon.SinonStub = sandbox.stub(environment, 'isAlive').resolves(false);
            const sleepStub: sinon.SinonStub = sandbox.stub(TimerUtil, 'sleep').resolves();
            const result: boolean = await environment.waitFor(numberOfAttempts, interval);
            result.should.equal(false);
            sleepStub.callCount.should.equal(numberOfAttempts);
            sleepStub.should.have.been.calledWith(interval * 1000);
            isAliveStub.callCount.should.equal(numberOfAttempts + 1);
        });

        it('should return true if local microfab is eventually alive', async () => {
            const numberOfAttempts: number = 10;
            const interval: number = 2;
            const isAliveStub: sinon.SinonStub = sandbox.stub(environment, 'isAlive');
            isAliveStub.onCall(0).resolves(false); // This is the immediate call to check whether to loop

            isAliveStub.onCall(1).resolves(false);
            isAliveStub.onCall(2).resolves(false);
            isAliveStub.onCall(3).resolves(true);
            const sleepStub: sinon.SinonStub = sandbox.stub(TimerUtil, 'sleep').resolves();
            const result: boolean = await environment.waitFor(numberOfAttempts, interval);
            result.should.equal(true);
            sleepStub.callCount.should.equal(2);
            sleepStub.should.have.been.calledWith(interval * 1000);
            isAliveStub.callCount.should.equal(4);
        });
    });
});
