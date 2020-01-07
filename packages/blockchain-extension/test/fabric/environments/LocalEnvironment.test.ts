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
import { LocalEnvironment } from '../../../extension/fabric/environments/LocalEnvironment';
import { OutputAdapter, LogType, FabricEnvironmentRegistry, FabricRuntimeUtil } from 'ibm-blockchain-platform-common';

chai.should();
chai.use(chaiAsPromised);

// tslint:disable no-unused-expression
describe('LocalEnvironment', () => {

    const originalPlatform: string = process.platform;
    const originalSpawn: any = child_process.spawn;
    const rootPath: string = path.dirname(__dirname);
    const environmentPath: string = path.resolve(rootPath, '..', '..', '..', 'test', 'data', 'yofn2');

    let environment: LocalEnvironment;
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
        sandbox = sinon.createSandbox();

        environment = new LocalEnvironment();
        environment.ports = {
            startPort: 17050,
            endPort: 17070
        };

        await TestUtil.setupLocalFabric();

        environment['path'] = environmentPath;
    });

    afterEach(async () => {
        sandbox.restore();
    });

    describe('#create', () => {
        it('should create a new network', async () => {
            const runStub: sinon.SinonStub = sandbox.stub(YeomanUtil, 'run').resolves();
            await environment.create();

            runStub.should.have.been.calledOnceWithExactly('fabric:network', {
                destination: environment.getPath(),
                dockerName: 'fabricvscodelocalfabric',
                name: FabricRuntimeUtil.LOCAL_FABRIC,
                numOrganizations: 1,
                startPort: 17050,
                endPort: 17070
            });
        });

    });

    ['generate', 'start', 'stop', 'teardown', 'kill_chaincode'].forEach((verb: string) => {

        describe(`#${verb}`, () => {

            let createStub: sinon.SinonStub;
            let isRunningStub: sinon.SinonStub;
            let setStateSpy: sinon.SinonSpy;
            let stopLogsStub: sinon.SinonStub;
            let getConfigurationStub: sinon.SinonStub;
            let getSettingsStub: sinon.SinonStub;

            beforeEach(() => {
                createStub = sandbox.stub(environment, 'create');
                sandbox.stub(environment, 'isGenerated').resolves(true);
                isRunningStub = sandbox.stub(environment, 'isRunning').resolves(false);
                setStateSpy = sandbox.spy(environment, 'setState');
                stopLogsStub = sandbox.stub(environment, 'stopLogs');
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
                    await environment[verb](outputAdapter);
                } else {
                    await environment['killChaincode'](['mySmartContract', '0.0.1'], outputAdapter);
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
                    environment.on('busy', eventStub);

                    if (verb === 'generate' || verb === 'start') {
                        isRunningStub.resolves(true);
                    } else {
                        isRunningStub.resolves(false);
                    }

                    await environment[verb]();
                    eventStub.should.have.been.calledTwice;
                    eventStub.should.have.been.calledWithExactly(true);
                    eventStub.should.have.been.calledWithExactly(false);

                    if (verb === 'generate' || verb === 'start') {
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

                    if (verb === 'generate' || verb === 'start') {
                        isRunningStub.resolves(false);
                    } else {
                        isRunningStub.resolves(true);
                    }
                    environment.on('busy', eventStub);

                    await environment[verb]().should.be.rejectedWith(`Failed to execute command "/bin/sh" with  arguments "${verb}.sh" return code 1`);
                    eventStub.should.have.been.calledTwice;
                    eventStub.should.have.been.calledWithExactly(true);
                    eventStub.should.have.been.calledWithExactly(false);

                    if (verb === 'generate' || verb === 'start') {
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
                    await environment[verb](outputAdapter);
                } else {
                    await environment['killChaincode'](['mySmartContract', '0.0.1'], outputAdapter);
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

                    environment.on('busy', eventStub);
                    await environment[verb]();
                    eventStub.should.have.been.calledTwice;
                    eventStub.should.have.been.calledWithExactly(true);
                    eventStub.should.have.been.calledWithExactly(false);

                    if (verb === 'generate' || verb === 'start') {
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

                    if (verb === 'generate' || verb === 'start') {
                        isRunningStub.resolves(false);
                    } else {
                        isRunningStub.resolves(true);
                    }

                    await environment[verb]().should.be.rejectedWith(`Failed to execute command "cmd" with  arguments "/c, ${verb}.cmd" return code 1`);
                    eventStub.should.have.been.calledTwice;
                    eventStub.should.have.been.calledWithExactly(true);
                    eventStub.should.have.been.calledWithExactly(false);

                    if (verb === 'generate' || verb === 'start') {
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

    describe('#isGenerated', () => {

        it('should return false if not created (Linux/MacOS)', async () => {
            sandbox.stub(process, 'platform').value('linux');
            sandbox.stub(environment, 'isCreated').resolves(false);
            await environment.isGenerated().should.eventually.be.false;
        });

        it('should return false if not created (Windows)', async () => {
            sandbox.stub(process, 'platform').value('win32');
            sandbox.stub(environment, 'isCreated').resolves(false);
            await environment.isGenerated().should.eventually.be.false;
        });

        it('should execute the is_generated.sh script and return true if successful (Linux/MacOS)', async () => {
            sandbox.stub(process, 'platform').value('linux');
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('/bin/sh', ['is_generated.sh'], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            await environment.isGenerated().should.eventually.be.true;
            spawnStub.should.have.been.calledOnce;
            spawnStub.should.have.been.calledWith('/bin/sh', ['is_generated.sh'], sinon.match.any);
        });

        it('should execute the is_generated.sh script and return false if unsuccessful (Linux/MacOS)', async () => {
            sandbox.stub(process, 'platform').value('linux');
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('/bin/sh', ['is_generated.sh'], sinon.match.any).callsFake(() => {
                return mockFailureCommand();
            });
            await environment.isGenerated().should.eventually.be.false;
            spawnStub.should.have.been.calledOnce;
            spawnStub.should.have.been.calledWith('/bin/sh', ['is_generated.sh'], sinon.match.any);
        });

        it('should execute the is_generated.sh script and return true if successful (Windows)', async () => {
            sandbox.stub(process, 'platform').value('win32');
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('cmd', ['/c', 'is_generated.cmd'], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            await environment.isGenerated().should.eventually.be.true;
            spawnStub.should.have.been.calledOnce;
            spawnStub.should.have.been.calledWith('cmd', ['/c', 'is_generated.cmd'], sinon.match.any);
        });

        it('should execute the is_generated.sh script and return false if unsuccessful (Windows)', async () => {
            sandbox.stub(process, 'platform').value('win32');
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('cmd', ['/c', 'is_generated.cmd'], sinon.match.any).callsFake(() => {
                return mockFailureCommand();
            });
            await environment.isGenerated().should.eventually.be.false;
            spawnStub.should.have.been.calledOnce;
            spawnStub.should.have.been.calledWith('cmd', ['/c', 'is_generated.cmd'], sinon.match.any);
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

            await environment.updateUserSettings();

            updateStub.should.have.been.calledWith(SettingConfigurations.FABRIC_RUNTIME,
                {
                    ports: {
                        startPort: 17050,
                        endPort: 17070
                    }
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
});
