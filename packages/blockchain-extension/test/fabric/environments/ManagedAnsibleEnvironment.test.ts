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
import { VSCodeBlockchainDockerOutputAdapter } from '../../../extension/logging/VSCodeBlockchainDockerOutputAdapter';
import { SettingConfigurations } from '../../../extension/configurations';
import { FabricRuntimeState } from '../../../extension/fabric/FabricRuntimeState';
import { ManagedAnsibleEnvironment } from '../../../extension/fabric/environments/ManagedAnsibleEnvironment';
import { OutputAdapter, FabricWalletRegistry, LogType } from 'ibm-blockchain-platform-common';
import * as stream from 'stream';

const should: Chai.Should = chai.should();
chai.use(chaiAsPromised);

// tslint:disable no-unused-expression
describe('ManagedAnsibleEnvironment', () => {

    const originalPlatform: string = process.platform;
    const originalSpawn: any = child_process.spawn;
    const rootPath: string = path.dirname(__dirname);
    const environmentPath: string = path.resolve(rootPath, '..', '..', '..', 'test', 'data', 'yofn2');

    let environment: ManagedAnsibleEnvironment;
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
        environment = new ManagedAnsibleEnvironment('managedAnsible', environmentPath);
        sandbox = sinon.createSandbox();
        await FabricWalletRegistry.instance().clear();
    });

    afterEach(async () => {
        sandbox.restore();
    });

    describe('#isBusy', () => {
        it('should return false if the runtime is not busy', () => {
            environment.isBusy().should.be.false;
        });

        it('should return true if the runtime is busy', () => {
            (environment as any).busy = true;
            environment.isBusy().should.be.true;
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

    ['generate', 'start', 'stop', 'teardown'].forEach((verb: string) => {

        describe(`#${verb}`, () => {

            let isRunningStub: sinon.SinonStub;
            let setStateSpy: sinon.SinonSpy;
            let stopLogsStub: sinon.SinonStub;
            let getConfigurationStub: sinon.SinonStub;
            let getSettingsStub: sinon.SinonStub;

            beforeEach(() => {
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

                spawnStub.withArgs('/bin/sh', [`${verb}.sh`], sinon.match.any).callsFake(() => {
                    return mockSuccessCommand();
                });

                await environment[verb]();

                spawnStub.should.have.been.calledOnce;

                spawnStub.getCall(0).args[2].env.CORE_CHAINCODE_MODE.should.equal('dev');
                spawnStub.getCall(0).args[2].env.CORE_CHAINCODE_EXECUTETIMEOUT.should.equal('120s');

                if (verb !== 'generate' && verb !== 'start') {
                    stopLogsStub.should.have.been.called;
                }

                spawnStub.should.have.been.calledWith('/bin/sh', [`${verb}.sh`], sinon.match.any);

            });

            it(`should execute the ${verb}.sh script and handle an error (Linux/MacOS)`, async () => {
                sandbox.stub(process, 'platform').value('linux');
                const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');

                spawnStub.withArgs('/bin/sh', [`${verb}.sh`], sinon.match.any).callsFake(() => {
                    return mockFailureCommand();
                });

                await environment[verb]().should.be.rejectedWith(`Failed to execute command "/bin/sh" with  arguments "${verb}.sh" return code 1`);

                spawnStub.should.have.been.calledOnce;

                spawnStub.should.have.been.calledWith('/bin/sh', [`${verb}.sh`], sinon.match.any);

                if (verb !== 'generate' && verb !== 'start') {
                    stopLogsStub.should.have.been.called;
                }
            });

            it(`should execute the ${verb}.sh script using a custom output adapter (Linux/MacOS)`, async () => {
                sandbox.stub(process, 'platform').value('linux');
                const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
                spawnStub.withArgs('/bin/sh', [`${verb}.sh`], sinon.match.any).callsFake(() => {
                    return mockSuccessCommand();
                });

                const outputAdapter: sinon.SinonStubbedInstance<TestFabricOutputAdapter> = sandbox.createStubInstance(TestFabricOutputAdapter);

                await environment[verb](outputAdapter);

                outputAdapter.log.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'stdout');
                outputAdapter.log.getCall(1).should.have.been.calledWith(LogType.INFO, undefined, 'stderr');

                if (verb !== 'generate' && verb !== 'start') {
                    stopLogsStub.should.have.been.called;
                }
            });

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

            it(`should execute the ${verb}.cmd script and handle success (Windows)`, async () => {
                sandbox.stub(process, 'platform').value('win32');
                const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');

                spawnStub.withArgs('cmd', ['/c', `${verb}.cmd`], sinon.match.any).callsFake(() => {
                    return mockSuccessCommand();
                });

                await environment[verb]();

                spawnStub.should.have.been.calledOnce;
                spawnStub.should.have.been.calledWith('cmd', ['/c', `${verb}.cmd`], sinon.match.any);

                spawnStub.getCall(0).args[2].env.CORE_CHAINCODE_MODE.should.equal('dev');
                spawnStub.getCall(0).args[2].env.CORE_CHAINCODE_EXECUTETIMEOUT.should.equal('120s');

                if (verb !== 'generate' && verb !== 'start') {
                    stopLogsStub.should.have.been.called;
                }
            });

            it(`should execute the ${verb}.cmd script and handle an error (Windows)`, async () => {
                sandbox.stub(process, 'platform').value('win32');
                const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
                spawnStub.withArgs('cmd', ['/c', `${verb}.cmd`], sinon.match.any).callsFake(() => {
                    return mockFailureCommand();
                });

                await environment[verb]().should.be.rejectedWith(`Failed to execute command "cmd" with  arguments "/c, ${verb}.cmd" return code 1`);

                spawnStub.should.have.been.calledOnce;

                spawnStub.should.have.been.calledWith('cmd', ['/c', `${verb}.cmd`], sinon.match.any);

                if (verb !== 'generate' && verb !== 'start') {
                    stopLogsStub.should.have.been.called;
                }
            });

            it(`should execute the ${verb}.cmd script using a custom output adapter (Windows)`, async () => {
                sandbox.stub(process, 'platform').value('win32');
                const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
                spawnStub.withArgs('cmd', ['/c', `${verb}.cmd`], sinon.match.any).callsFake(() => {
                    return mockSuccessCommand();
                });

                const outputAdapter: sinon.SinonStubbedInstance<TestFabricOutputAdapter> = sandbox.createStubInstance(TestFabricOutputAdapter);
                await environment[verb](outputAdapter);

                outputAdapter.log.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'stdout');
                outputAdapter.log.getCall(1).should.have.been.calledWith(LogType.INFO, undefined, 'stderr');

                if (verb !== 'generate' && verb !== 'start') {
                    stopLogsStub.should.have.been.called;
                }
            });

            it(`should publish busy events and set state before and after handling success (Windows)`, async () => {

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
        });
    });

    describe('#start', () => {
        let isGeneratedStub: sinon.SinonStub;
        let generateStub: sinon.SinonStub;
        beforeEach(async () => {
            isGeneratedStub = sandbox.stub(environment, 'isGenerated').resolves(false);
            sandbox.stub(environment, 'isRunning').resolves(false);
            generateStub = sandbox.stub(environment, 'generate').resolves();
        });

        it('should start if not generated', async () => {
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');

            spawnStub.withArgs('/bin/sh', [`start.sh`], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });

            await environment['start']();

            isGeneratedStub.should.have.been.calledOnce;
            generateStub.should.have.been.calledOnce;
        });
    });

    describe('#restart', () => {

        let isRunningStub: sinon.SinonStub;
        let stopLogsStub: sinon.SinonStub;

        beforeEach(() => {
            isRunningStub = sandbox.stub(environment, 'isRunning').resolves(false);
            stopLogsStub = sandbox.stub(environment, 'stopLogs');
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
            await environment.restart(outputAdapter);
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
            await environment.restart();
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
            await environment.restart(outputAdapter);
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
            stopLogsStub.should.have.been.called;
        });
    });

    describe('#isGenerated', () => {

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

    describe('#isRunning', () => {

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

    describe('#getPeerChaincodeURL', () => {

        it('should get the peer chaincode URL', async () => {
            await environment.getPeerChaincodeURL().should.eventually.equal('grpc://localhost:17052');
        });

        it('should throw an error if there are no peer nodes', async () => {
            sandbox.stub(environment, 'getNodes').resolves([]);
            await environment.getPeerChaincodeURL().should.be.rejectedWith(/There are no Fabric peer nodes/);
        });

    });

    describe('#getPeerContainerName', () => {

        it('should get the peer container name', async () => {
            await environment.getPeerContainerName().should.eventually.equal('fabricvscodelocalfabric_peer0.org1.example.com');
        });

        it('should throw an error if there are no peer nodes', async () => {
            sandbox.stub(environment, 'getNodes').resolves([]);
            await environment.getPeerContainerName().should.be.rejectedWith(/There are no Fabric peer nodes/);
        });

    });

    describe('#startLogs', () => {

        it('should start the logs', async () => {
            const fakeStream: stream.Readable = new stream.Readable();
            fakeStream._read = (_size: any): any => {
                //
            };
            const logHoseStub: sinon.SinonStub = sandbox.stub(environment, 'ourLoghose');
            logHoseStub.returns(fakeStream);
            const adapter: VSCodeBlockchainDockerOutputAdapter = VSCodeBlockchainDockerOutputAdapter.instance();
            const outputAdapter: sinon.SinonSpy = sandbox.spy(adapter, 'log');

            await environment.startLogs(adapter);

            fakeStream.emit('data', { name: 'jake', line: 'simon dodges his unit tests' });
            outputAdapter.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `jake|simon dodges his unit tests`);

            const opts: any = logHoseStub.args[0][0];
            opts.attachFilter('someid', {
                Name: '/something',
                Config: {
                    Labels: {

                    }
                }
            }).should.be.false;
            opts.attachFilter('someid', {
                Name: '/something',
                Config: {
                    Labels: {
                        'fabric-environment-name': 'jake'
                    }
                }
            }).should.be.false;
            opts.attachFilter('someid', {
                Name: '/something',
                Config: {
                    Labels: {
                        'fabric-environment-name': 'managedAnsible'
                    }
                }
            }).should.be.true;

            opts.attachFilter('someid', {
                Name: '/fabricvscodelocalfabric'
            }).should.be.true;
        });
    });

    describe('#stopLogs', () => {
        it('should stop the logs if loghose is active', () => {
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
            environment['lh'] = undefined;
            environment.stopLogs();
            should.not.exist(environment['lh]']);
        });

    });

});
