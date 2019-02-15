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

import Dockerode = require('dockerode');
import { Container, Volume } from 'dockerode';
import ContainerImpl = require('dockerode/lib/container');
import VolumeImpl = require('dockerode/lib/volume');
import * as child_process from 'child_process';
import { FabricRuntimeRegistry } from '../../src/fabric/FabricRuntimeRegistry';
import { FabricRuntimeRegistryEntry } from '../../src/fabric/FabricRuntimeRegistryEntry';
import { FabricRuntime, FabricRuntimeState } from '../../src/fabric/FabricRuntime';

import * as chai from 'chai';
import * as sinon from 'sinon';
import { OutputAdapter } from '../../src/logging/OutputAdapter';
import { ExtensionUtil } from '../../src/util/ExtensionUtil';
import { TestUtil } from '../TestUtil';
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import * as path from 'path';
import * as fs from 'fs-extra';
import { VSCodeBlockchainOutputAdapter } from '../../src/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../../src/logging/OutputAdapter';
import { CommandUtil } from '../../src/util/CommandUtil';
import { VSCodeBlockchainDockerOutputAdapter } from '../../src/logging/VSCodeBlockchainDockerOutputAdapter';

chai.should();

// tslint:disable no-unused-expression
describe('FabricRuntime', () => {

    const originalPlatform: string = process.platform;
    const originalSpawn: any = child_process.spawn;
    const runtimeRegistry: FabricRuntimeRegistry = FabricRuntimeRegistry.instance();
    const rootPath: string = path.dirname(__dirname);

    let runtimeRegistryEntry: FabricRuntimeRegistryEntry;
    let runtime: FabricRuntime;
    let sandbox: sinon.SinonSandbox;
    let mockPeerContainer: sinon.SinonStubbedInstance<Container>;
    let mockOrdererContainer: sinon.SinonStubbedInstance<Container>;
    let mockCAContainer: sinon.SinonStubbedInstance<Container>;
    let mockCouchContainer: sinon.SinonStubbedInstance<Container>;
    let mockLogsContainer: sinon.SinonStubbedInstance<Container>;
    let mockPeerInspect: any;
    let mockOrdererInspect: any;
    let mockCAInspect: any;
    let mockCouchInspect: any;
    let mockLogsInspect: any;
    let mockPeerVolume: sinon.SinonStubbedInstance<Volume>;
    let mockOrdererVolume: sinon.SinonStubbedInstance<Volume>;
    let mockCAVolume: sinon.SinonStubbedInstance<Volume>;
    let mockCouchVolume: sinon.SinonStubbedInstance<Volume>;
    let mockLogsVolume: sinon.SinonStubbedInstance<Volume>;
    let connectionProfilePath: string;
    let runtimeDetailsDir: string;
    let getDirPathStub: sinon.SinonStub;
    let ensureFileStub: sinon.SinonStub;
    let writeFileStub: sinon.SinonStub;
    let copyStub: sinon.SinonStub;
    let removeStub: sinon.SinonStub;
    let errorSpy: sinon.SinonSpy;
    let runtimeDir: string;

    // tslint:disable max-classes-per-file
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
        await TestUtil.storeRuntimesConfig();
    });

    after(async () => {
        await TestUtil.restoreRuntimesConfig();
    });

    beforeEach(async () => {
        await ExtensionUtil.activateExtension();
        await runtimeRegistry.clear();
        runtimeRegistryEntry = new FabricRuntimeRegistryEntry();
        runtimeRegistryEntry.name = 'runtime1';
        runtimeRegistryEntry.developmentMode = false;
        runtimeRegistryEntry.ports = {
            orderer: 12347,
            peerRequest: 12345,
            peerChaincode: 54321,
            peerEventHub: 12346,
            certificateAuthority: 12348,
            couchDB: 12349,
            logs: 12387
        };
        await runtimeRegistry.add(runtimeRegistryEntry);
        runtime = new FabricRuntime(runtimeRegistryEntry);
        sandbox = sinon.createSandbox();

        const docker: Dockerode = (runtime as any).docker['docker'];
        mockPeerContainer = sinon.createStubInstance(ContainerImpl);
        mockPeerInspect = {
            NetworkSettings: {
                Ports: {
                    '7051/tcp': [{HostIp: '0.0.0.0', HostPort: '12345'}],
                    '7052/tcp': [{HostIp: '0.0.0.0', HostPort: '54321'}],
                    '7053/tcp': [{HostIp: '0.0.0.0', HostPort: '12346'}]
                }
            },
            State: {
                Running: true
            }
        };
        mockPeerContainer.inspect.resolves(mockPeerInspect);
        mockOrdererContainer = sinon.createStubInstance(ContainerImpl);
        mockOrdererInspect = {
            NetworkSettings: {
                Ports: {
                    '7050/tcp': [{HostIp: '127.0.0.1', HostPort: '12347'}]
                }
            },
            State: {
                Running: true
            }
        };
        mockOrdererContainer.inspect.resolves(mockOrdererInspect);
        mockCAContainer = sinon.createStubInstance(ContainerImpl);
        mockCAInspect = {
            NetworkSettings: {
                Ports: {
                    '7054/tcp': [{HostIp: '127.0.0.1', HostPort: '12348'}]
                }
            },
            State: {
                Running: true
            }
        };
        mockCAContainer.inspect.resolves(mockCAInspect);
        mockCouchContainer = sinon.createStubInstance(ContainerImpl);
        mockCouchInspect = {
            NetworkSettings: {
                Ports: {
                    '5984/tcp': [{HostIp: '127.0.0.1', HostPort: '12349'}]
                }
            },
            State: {
                Running: true
            }
        };
        mockCouchContainer.inspect.resolves(mockCouchInspect);

        mockLogsContainer = sinon.createStubInstance(ContainerImpl);
        mockLogsInspect = {
            NetworkSettings: {
                Ports: {
                    '80/tcp': [{HostIp: '0.0.0.0', HostPort: 12387}]
                }
            },
            State: {
                Running: true
            }
        };
        mockLogsContainer.inspect.resolves(mockLogsInspect);
        const getContainerStub: sinon.SinonStub = sandbox.stub(docker, 'getContainer');
        getContainerStub.withArgs('fabricvscoderuntime1_peer0.org1.example.com').returns(mockPeerContainer);
        getContainerStub.withArgs('fabricvscoderuntime1_orderer.example.com').returns(mockOrdererContainer);
        getContainerStub.withArgs('fabricvscoderuntime1_ca.example.com').returns(mockCAContainer);
        getContainerStub.withArgs('fabricvscoderuntime1_couchdb').returns(mockCouchContainer);
        getContainerStub.withArgs('fabricvscoderuntime1_logs').returns(mockLogsContainer);
        mockPeerVolume = sinon.createStubInstance(VolumeImpl);
        mockOrdererVolume = sinon.createStubInstance(VolumeImpl);
        mockCAVolume = sinon.createStubInstance(VolumeImpl);
        mockCouchVolume = sinon.createStubInstance(VolumeImpl);
        mockLogsVolume = sinon.createStubInstance(VolumeImpl);
        const getVolumeStub: sinon.SinonStub = sandbox.stub(docker, 'getVolume');
        getVolumeStub.withArgs('fabricvscoderuntime1_peer0.org1.example.com').returns(mockPeerVolume);
        getVolumeStub.withArgs('fabricvscoderuntime1_orderer.example.com').returns(mockOrdererVolume);
        getVolumeStub.withArgs('fabricvscoderuntime1_ca.example.com').returns(mockCAVolume);
        getVolumeStub.withArgs('fabricvscoderuntime1_couchdb').returns(mockCouchVolume);
        getVolumeStub.withArgs('fabricvscoderuntime1_logs').returns(mockLogsVolume);

        runtimeDir = path.join(rootPath, '..', 'data');
        getDirPathStub = sandbox.stub(UserInputUtil, 'getDirPath').resolves(runtimeDir);
        ensureFileStub = sandbox.stub(fs, 'ensureFileSync').resolves();
        writeFileStub = sandbox.stub(fs, 'writeFileSync').resolves();
        copyStub = sandbox.stub(fs, 'copySync').resolves();
        removeStub = sandbox.stub(fs, 'remove').resolves();
    });

    afterEach(async () => {
        await runtimeRegistry.clear();
        sandbox.restore();
    });

    describe('#getName', () => {

        it('should return the name of the runtime', () => {
            runtime.getName().should.equal('runtime1');
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
    });

    ['start', 'stop', 'teardown'].forEach((verb: string) => {

        describe(`#${verb}`, () => {

            it(`should execute the ${verb}.sh script and handle success for non-development mode (Linux/MacOS)`, async () => {
                sandbox.stub(process, 'platform').value('linux');
                const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
                spawnStub.withArgs('/bin/sh', [`${verb}.sh`], sinon.match.any).callsFake(() => {
                    return mockSuccessCommand();
                });
                await runtime[verb]();
                spawnStub.should.have.been.calledOnce;
                spawnStub.should.have.been.calledWith('/bin/sh', [`${verb}.sh`], sinon.match.any);
                spawnStub.getCall(0).args[2].env.CORE_CHAINCODE_MODE.should.equal('net');
            });

            it(`should execute the ${verb}.sh script and handle success for development mode (Linux/MacOS)`, async () => {
                sandbox.stub(process, 'platform').value('linux');
                runtimeRegistryEntry.developmentMode = true;
                const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
                spawnStub.withArgs('/bin/sh', [`${verb}.sh`], sinon.match.any).callsFake(() => {
                    return mockSuccessCommand();
                });
                await runtime[verb]();
                spawnStub.should.have.been.calledOnce;
                spawnStub.should.have.been.calledWith('/bin/sh', [`${verb}.sh`], sinon.match.any);
                spawnStub.getCall(0).args[2].env.CORE_CHAINCODE_MODE.should.equal('dev');
            });

            it(`should execute the ${verb}.sh script and handle an error (Linux/MacOS)`, async () => {
                sandbox.stub(process, 'platform').value('linux');
                const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
                spawnStub.withArgs('/bin/sh', [`${verb}.sh`], sinon.match.any).callsFake(() => {
                    return mockFailureCommand();
                });
                await runtime[verb]().should.be.rejectedWith(`Failed to execute command "/bin/sh" with  arguments "${verb}.sh" return code 1`);
                spawnStub.should.have.been.calledOnce;
                spawnStub.should.have.been.calledWith('/bin/sh', [`${verb}.sh`], sinon.match.any);
            });

            it(`should execute the ${verb}.sh script using a custom output adapter (Linux/MacOS)`, async () => {
                sandbox.stub(process, 'platform').value('linux');
                const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
                spawnStub.withArgs('/bin/sh', [`${verb}.sh`], sinon.match.any).callsFake(() => {
                    return mockSuccessCommand();
                });
                const outputAdapter: sinon.SinonStubbedInstance<TestFabricOutputAdapter> = sinon.createStubInstance(TestFabricOutputAdapter);
                await runtime[verb](outputAdapter);
                outputAdapter.log.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'stdout');
                outputAdapter.log.getCall(1).should.have.been.calledWith(LogType.INFO, undefined, 'stderr');
            });

            it(`should publish busy events and set state before and after handling success (Linux/MacOS)`, async () => {
                sandbox.stub(process, 'platform').value('linux');
                const eventStub: sinon.SinonStub = sinon.stub();
                const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
                spawnStub.withArgs('/bin/sh', [`${verb}.sh`], sinon.match.any).callsFake(() => {
                    return mockSuccessCommand();
                });
                runtime.on('busy', eventStub);
                await runtime[verb]();
                eventStub.should.have.been.calledTwice;
                eventStub.should.have.been.calledWithExactly(true);
                eventStub.should.have.been.calledWithExactly(false);

                if (verb === 'start') {
                    runtime.getState().should.equal(FabricRuntimeState.STARTING);
                } else if (verb === 'stop' || verb === 'teardown') {
                    runtime.getState().should.equal(FabricRuntimeState.STOPPING);
                }
            });

            it(`should publish busy events and set state before and after handling an error (Linux/MacOS)`, async () => {
                sandbox.stub(process, 'platform').value('linux');
                const eventStub: sinon.SinonStub = sinon.stub();
                const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
                spawnStub.withArgs('/bin/sh', [`${verb}.sh`], sinon.match.any).callsFake(() => {
                    return mockFailureCommand();
                });
                runtime.on('busy', eventStub);
                await runtime[verb]().should.be.rejectedWith(`Failed to execute command "/bin/sh" with  arguments "${verb}.sh" return code 1`);
                eventStub.should.have.been.calledTwice;
                eventStub.should.have.been.calledWithExactly(true);
                eventStub.should.have.been.calledWithExactly(false);

                if (verb === 'start') {
                    runtime.getState().should.equal(FabricRuntimeState.STARTING);
                } else if (verb === 'stop' || verb === 'teardown') {
                    runtime.getState().should.equal(FabricRuntimeState.STOPPING);
                }
            });

            it(`should execute the ${verb}.cmd script and handle success for non-development mode (Windows)`, async () => {
                sandbox.stub(process, 'platform').value('win32');
                const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
                spawnStub.withArgs('cmd', ['/c', `${verb}.cmd`], sinon.match.any).callsFake(() => {
                    return mockSuccessCommand();
                });
                await runtime[verb]();
                spawnStub.should.have.been.calledOnce;
                spawnStub.should.have.been.calledWith('cmd', ['/c', `${verb}.cmd`], sinon.match.any);
                spawnStub.getCall(0).args[2].env.CORE_CHAINCODE_MODE.should.equal('net');
            });

            it(`should execute the ${verb}.cmd script and handle success for development mode (Windows)`, async () => {
                sandbox.stub(process, 'platform').value('win32');
                runtimeRegistryEntry.developmentMode = true;
                const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
                spawnStub.withArgs('cmd', ['/c', `${verb}.cmd`], sinon.match.any).callsFake(() => {
                    return mockSuccessCommand();
                });
                await runtime[verb]();
                spawnStub.should.have.been.calledOnce;
                spawnStub.should.have.been.calledWith('cmd', ['/c', `${verb}.cmd`], sinon.match.any);
                spawnStub.getCall(0).args[2].env.CORE_CHAINCODE_MODE.should.equal('dev');
            });

            it(`should execute the ${verb}.cmd script and handle an error (Windows)`, async () => {
                sandbox.stub(process, 'platform').value('win32');
                const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
                spawnStub.withArgs('cmd', ['/c', `${verb}.cmd`], sinon.match.any).callsFake(() => {
                    return mockFailureCommand();
                });
                await runtime[verb]().should.be.rejectedWith(`Failed to execute command "cmd" with  arguments "/c, ${verb}.cmd" return code 1`);
                spawnStub.should.have.been.calledOnce;
                spawnStub.should.have.been.calledWith('cmd', ['/c', `${verb}.cmd`], sinon.match.any);
            });

            it(`should execute the ${verb}.cmd script using a custom output adapter (Windows)`, async () => {
                sandbox.stub(process, 'platform').value('win32');
                const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
                spawnStub.withArgs('cmd', ['/c', `${verb}.cmd`], sinon.match.any).callsFake(() => {
                    return mockSuccessCommand();
                });
                const outputAdapter: sinon.SinonStubbedInstance<TestFabricOutputAdapter> = sinon.createStubInstance(TestFabricOutputAdapter);
                await runtime[verb](outputAdapter);
                outputAdapter.log.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'stdout');
                outputAdapter.log.getCall(1).should.have.been.calledWith(LogType.INFO, undefined, 'stderr');
                // outputAdapter.error.should.have.been.calledOnceWith('stderr');
            }).timeout(4000);

            it(`should publish busy events and set state before and after handling success (Windows)`, async () => {
                sandbox.stub(process, 'platform').value('win32');
                const eventStub: sinon.SinonStub = sinon.stub();
                const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
                spawnStub.withArgs('cmd', ['/c', `${verb}.cmd`], sinon.match.any).callsFake(() => {
                    return mockSuccessCommand();
                });
                runtime.on('busy', eventStub);
                await runtime[verb]();
                eventStub.should.have.been.calledTwice;
                eventStub.should.have.been.calledWithExactly(true);
                eventStub.should.have.been.calledWithExactly(false);

                if (verb === 'start') {
                    runtime.getState().should.equal(FabricRuntimeState.STARTING);
                } else if (verb === 'stop' || verb === 'teardown') {
                    runtime.getState().should.equal(FabricRuntimeState.STOPPING);
                }
            });

            it(`should publish busy events and set state before and after handling an error (Windows)`, async () => {
                sandbox.stub(process, 'platform').value('win32');
                const eventStub: sinon.SinonStub = sinon.stub();
                const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
                spawnStub.withArgs('cmd', ['/c', `${verb}.cmd`], sinon.match.any).callsFake(() => {
                    return mockFailureCommand();
                });
                runtime.on('busy', eventStub);
                await runtime[verb]().should.be.rejectedWith(`Failed to execute command "cmd" with  arguments "/c, ${verb}.cmd" return code 1`);
                eventStub.should.have.been.calledTwice;
                eventStub.should.have.been.calledWithExactly(true);
                eventStub.should.have.been.calledWithExactly(false);

                if (verb === 'start') {
                    runtime.getState().should.equal(FabricRuntimeState.STARTING);
                } else if (verb === 'stop' || verb === 'teardown') {
                    runtime.getState().should.equal(FabricRuntimeState.STOPPING);
                }
            });

        });
    });

    describe('#restart', () => {

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
            const outputAdapter: sinon.SinonStubbedInstance<TestFabricOutputAdapter> = sinon.createStubInstance(TestFabricOutputAdapter);
            await runtime.restart(outputAdapter);
            outputAdapter.log.callCount.should.equal(4);

            outputAdapter.log.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'stdout');
            outputAdapter.log.getCall(1).should.have.been.calledWith(LogType.INFO, undefined, 'stderr');
            outputAdapter.log.getCall(2).should.have.been.calledWith(LogType.INFO, undefined, 'stdout');
            outputAdapter.log.getCall(3).should.have.been.calledWith(LogType.INFO, undefined, 'stderr');
        });

        it('should publish busy events and set state before and after handling success (Linux/MacOS)', async () => {
            sandbox.stub(process, 'platform').value('linux');
            const eventStub: sinon.SinonStub = sinon.stub();
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('/bin/sh', ['start.sh'], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            spawnStub.withArgs('/bin/sh', ['stop.sh'], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            runtime.on('busy', eventStub);
            await runtime.restart();
            eventStub.should.have.been.calledTwice;
            eventStub.should.have.been.calledWithExactly(true);
            eventStub.should.have.been.calledWithExactly(false);

            runtime.getState().should.equal(FabricRuntimeState.RESTARTING);
        });

        it('should publish busy events and set state before and after handling an error (Linux/MacOS)', async () => {
            sandbox.stub(process, 'platform').value('linux');
            const eventStub: sinon.SinonStub = sinon.stub();
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('/bin/sh', ['start.sh'], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            spawnStub.withArgs('/bin/sh', ['stop.sh'], sinon.match.any).callsFake(() => {
                return mockFailureCommand();
            });
            runtime.on('busy', eventStub);
            await runtime.restart().should.be.rejectedWith(`Failed to execute command "/bin/sh" with  arguments "stop.sh" return code 1`);
            eventStub.should.have.been.calledTwice;
            eventStub.should.have.been.calledWithExactly(true);
            eventStub.should.have.been.calledWithExactly(false);

            runtime.getState().should.equal(FabricRuntimeState.RESTARTING);
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
            const outputAdapter: sinon.SinonStubbedInstance<TestFabricOutputAdapter> = sinon.createStubInstance(TestFabricOutputAdapter);
            await runtime.restart(outputAdapter);
            outputAdapter.log.callCount.should.equal(4);
            outputAdapter.log.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'stdout');
            outputAdapter.log.getCall(1).should.have.been.calledWith(LogType.INFO, undefined, 'stderr');
            outputAdapter.log.getCall(2).should.have.been.calledWith(LogType.INFO, undefined, 'stdout');
            outputAdapter.log.getCall(3).should.have.been.calledWith(LogType.INFO, undefined, 'stderr');
        }).timeout(4000);

        it('should publish busy events and set state before and after handling success (Windows)', async () => {
            sandbox.stub(process, 'platform').value('win32');
            const eventStub: sinon.SinonStub = sinon.stub();
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('cmd', ['/c', 'start.cmd'], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            spawnStub.withArgs('cmd', ['/c', 'stop.cmd'], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            runtime.on('busy', eventStub);
            await runtime.restart();
            eventStub.should.have.been.calledTwice;
            eventStub.should.have.been.calledWithExactly(true);
            eventStub.should.have.been.calledWithExactly(false);

            runtime.getState().should.equal(FabricRuntimeState.RESTARTING);
        });

        it('should publish busy events and set state before and after handling an error (Windows)', async () => {
            sandbox.stub(process, 'platform').value('win32');
            const eventStub: sinon.SinonStub = sinon.stub();
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('cmd', ['/c', 'start.cmd'], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            spawnStub.withArgs('cmd', ['/c', 'stop.cmd'], sinon.match.any).callsFake(() => {
                return mockFailureCommand();
            });
            runtime.on('busy', eventStub);
            await runtime.restart().should.be.rejectedWith(`Failed to execute command "cmd" with  arguments "/c, stop.cmd" return code 1`);
            eventStub.should.have.been.calledTwice;
            eventStub.should.have.been.calledWithExactly(true);
            eventStub.should.have.been.calledWithExactly(false);

            runtime.getState().should.equal(FabricRuntimeState.RESTARTING);
        });
    });

    describe('#getConnectionProfile', () => {

        it('should get a connection profile', async () => {
            const connectionProfile: object = await runtime.getConnectionProfile();
            connectionProfile.should.deep.equal({
                name: 'basic-network',
                version: '1.0.0',
                client: {
                    organization: 'Org1',
                    connection: {
                        timeout: {
                            peer: {
                                endorser: '300',
                                eventHub: '300',
                                eventReg: '300'
                            },
                            orderer: '300'
                        }
                    }
                },
                channels: {
                    mychannel: {
                        orderers: [
                            'orderer.example.com'
                        ],
                        peers: {
                            'peer0.org1.example.com': {}
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
                orderers: {
                    'orderer.example.com': {
                        url: 'grpc://127.0.0.1:12347'
                    }
                },
                peers: {
                    'peer0.org1.example.com': {
                        url: 'grpc://localhost:12345',
                        eventUrl: 'grpc://localhost:12346'
                    }
                },
                certificateAuthorities: {
                    'ca.org1.example.com': {
                        url: 'http://127.0.0.1:12348',
                        caName: 'ca.org1.example.com'
                    }
                }
            });
        });
    });

    describe('#getCertificate', () => {

        it('should get the PEM encoded certificate', async () => {
            let certificate: string = await runtime.getCertificate();
            certificate = certificate.replace(/\r/g, ''); // Windows!
            certificate.should.equal('-----BEGIN CERTIFICATE-----\nMIICGDCCAb+gAwIBAgIQFSxnLAGsu04zrFkAEwzn6zAKBggqhkjOPQQDAjBzMQsw\nCQYDVQQGEwJVUzETMBEGA1UECBMKQ2FsaWZvcm5pYTEWMBQGA1UEBxMNU2FuIEZy\nYW5jaXNjbzEZMBcGA1UEChMQb3JnMS5leGFtcGxlLmNvbTEcMBoGA1UEAxMTY2Eu\nb3JnMS5leGFtcGxlLmNvbTAeFw0xNzA4MzEwOTE0MzJaFw0yNzA4MjkwOTE0MzJa\nMFsxCzAJBgNVBAYTAlVTMRMwEQYDVQQIEwpDYWxpZm9ybmlhMRYwFAYDVQQHEw1T\nYW4gRnJhbmNpc2NvMR8wHQYDVQQDDBZBZG1pbkBvcmcxLmV4YW1wbGUuY29tMFkw\nEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEV1dfmKxsFKWo7o6DNBIaIVebCCPAM9C/\nsLBt4pJRre9pWE987DjXZoZ3glc4+DoPMtTmBRqbPVwYcUvpbYY8p6NNMEswDgYD\nVR0PAQH/BAQDAgeAMAwGA1UdEwEB/wQCMAAwKwYDVR0jBCQwIoAgQjmqDc122u64\nugzacBhR0UUE0xqtGy3d26xqVzZeSXwwCgYIKoZIzj0EAwIDRwAwRAIgXMy26AEU\n/GUMPfCMs/nQjQME1ZxBHAYZtKEuRR361JsCIEg9BOZdIoioRivJC+ZUzvJUnkXu\no2HkWiuxLsibGxtE\n-----END CERTIFICATE-----\n');
        });
    });

    describe('#getPrivateKey', () => {

        it('should get the PEM encoded private key', async () => {
            let privateKey: string = await runtime.getPrivateKey();
            privateKey = privateKey.replace(/\r/g, ''); // Windows!
            privateKey.should.equal('-----BEGIN PRIVATE KEY-----\nMIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgRgQr347ij6cjwX7m\nKjzbbD8Tlwdfu6FaubjWJWLGyqahRANCAARXV1+YrGwUpajujoM0EhohV5sII8Az\n0L+wsG3iklGt72lYT3zsONdmhneCVzj4Og8y1OYFGps9XBhxS+lthjyn\n-----END PRIVATE KEY-----\n');
        });

    });

    describe('#getCertificatePath', () => {

        it('should get the runtime certificate path', async () => {
            const certPath: string = await runtime.getCertificatePath();
            certPath.should.equal(path.join(rootPath, '..', '..', 'basic-network', 'crypto-config', 'peerOrganizations', 'org1.example.com', 'users', 'Admin@org1.example.com', 'msp', 'signcerts', 'Admin@org1.example.com-cert.pem'));
        });

    });

    describe('#getConnectionProfilePath', () => {

        it('should get the runtime connection profile path', async () => {
            const connectionPath: string = await runtime.getConnectionProfilePath();
            connectionPath.should.equal(path.join(rootPath, '..', '..', 'out', 'data', 'runtime1', 'connection.json'));
        });

    });

    describe('#isCreated', () => {

        it('should return true if the peer, orderer, CA, couchdb, and logs exist', async () => {
            await runtime.isCreated().should.eventually.be.true;
        });

        it('should return true if the peer does not exist, but everything else does', async () => {
            mockPeerVolume.inspect.rejects(new Error('blah'));
            await runtime.isCreated().should.eventually.be.true;
        });

        it('should return true if the orderer does not exist, but everything else does', async () => {
            mockOrdererVolume.inspect.rejects(new Error('blah'));
            await runtime.isCreated().should.eventually.be.true;
        });

        it('should return true if the CA does not exist, but everything else does', async () => {
            mockCAVolume.inspect.rejects(new Error('blah'));
            await runtime.isCreated().should.eventually.be.true;
        });

        it('should return true if Couch does not exist, but everything else does', async () => {
            mockCouchVolume.inspect.rejects(new Error('blah'));
            await runtime.isCreated().should.eventually.be.true;
        });

        it('should return true if logs does not exist, but everything else does', async () => {
            mockLogsVolume.inspect.rejects(new Error('blah'));
            await runtime.isCreated().should.eventually.be.true;
        });

        it('should return false if nothing exists', async () => {
            mockPeerVolume.inspect.rejects(new Error('blah'));
            mockOrdererVolume.inspect.rejects(new Error('blah'));
            mockCAVolume.inspect.rejects(new Error('blah'));
            mockCouchVolume.inspect.rejects(new Error('blah'));
            mockLogsVolume.inspect.rejects(new Error('blah'));
            await runtime.isCreated().should.eventually.be.false;
        });
    });

    describe('#isRunning', () => {

        it('should return true if the peer, orderer, CA, Couch and Logs are running', async () => {
            await runtime.isRunning().should.eventually.be.true;
        });

        it('should return false if the peer does not exist', async () => {
            mockPeerContainer.inspect.rejects(new Error('blah'));
            await runtime.isRunning().should.eventually.be.false;
        });

        it('should return false if the peer is not running', async () => {
            mockPeerInspect.State.Running = false;
            await runtime.isRunning().should.eventually.be.false;
        });

        it('should return false if the orderer does not exist', async () => {
            mockOrdererContainer.inspect.rejects(new Error('blah'));
            await runtime.isRunning().should.eventually.be.false;
        });

        it('should return false if the orderer is not running', async () => {
            mockOrdererInspect.State.Running = false;
            await runtime.isRunning().should.eventually.be.false;
        });

        it('should return false if the CA does not exist', async () => {
            mockCAContainer.inspect.rejects(new Error('blah'));
            await runtime.isRunning().should.eventually.be.false;
        });

        it('should return false if the CA is not running', async () => {
            mockCAInspect.State.Running = false;
            await runtime.isRunning().should.eventually.be.false;
        });

        it('should return false if Couch does not exist', async () => {
            mockCouchContainer.inspect.rejects(new Error('blah'));
            await runtime.isRunning().should.eventually.be.false;
        });

        it('should return false if Couch is not running', async () => {
            mockCouchInspect.State.Running = false;
            await runtime.isRunning().should.eventually.be.false;
        });

        it('should return false if Logs does not exist', async () => {
            mockLogsContainer.inspect.rejects(new Error('blah'));
            await runtime.isRunning().should.eventually.be.false;
        });

        it('should return false if Logs is not running', async () => {
            mockLogsInspect.State.Running = false;
            await runtime.isRunning().should.eventually.be.false;
        });

    });

    describe('#isDevelopmentMode', () => {

        it('should return false if the runtime is in development mode', () => {
            runtimeRegistryEntry.developmentMode = false;
            runtime.isDevelopmentMode().should.be.false;
        });

        it('should return true if the runtime is in development mode', () => {
            runtimeRegistryEntry.developmentMode = true;
            runtime.isDevelopmentMode().should.be.true;
        });
    });

    describe('#setDevelopmentMode', () => {
        it('should set the runtime development mode to false', async () => {
            await runtime.setDevelopmentMode(false);
            const updatedRuntimeRegistryEntry: FabricRuntimeRegistryEntry = await runtimeRegistry.get('runtime1');
            updatedRuntimeRegistryEntry.developmentMode.should.be.false;
        });

        it('should set the runtime development mode to true', async () => {
            await runtime.setDevelopmentMode(true);
            const updatedRuntimeRegistryEntry: FabricRuntimeRegistryEntry = await runtimeRegistry.get('runtime1');
            updatedRuntimeRegistryEntry.developmentMode.should.be.true;
        });
    });

    describe('#getChaincodeAddress', () => {
        it('should get the chaincode address', async () => {
            const result: string = await runtime.getChaincodeAddress();
            result.should.equal('localhost:54321');
        });
    });

    describe('#getLogsAddress', () => {
        it('should get the logs address', async () => {
            const result: string = await runtime.getLogsAddress();
            result.should.equal('localhost:12387');
        });
    });

    describe('#getPeerContainerName', () => {
        it('should get the chaincode address', () => {
            const result: string = runtime.getPeerContainerName();
            result.should.equal('fabricvscoderuntime1_peer0.org1.example.com');
        });
    });

    describe('#exportConnectionDetails', () => {

        beforeEach(async () => {
            connectionProfilePath = path.join(runtimeDir, 'runtime1', 'connection.json');
            errorSpy = sandbox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
        });

        it('should save runtime connection details to disk', async () => {
            await runtime.exportConnectionDetails(VSCodeBlockchainOutputAdapter.instance());
            ensureFileStub.getCall(0).should.have.been.calledWith(connectionProfilePath);
            writeFileStub.should.have.been.calledOnce;
            copyStub.should.not.have.been.called;
            errorSpy.should.not.have.been.called;
        });

        it('should save runtime connection details to a specified place', async () => {
            runtimeDir = 'myPath';
            connectionProfilePath = path.join(runtimeDir, 'runtime1', 'connection.json');

            await runtime.exportConnectionDetails(VSCodeBlockchainOutputAdapter.instance(), 'myPath');
            ensureFileStub.getCall(0).should.have.been.calledWith(connectionProfilePath);
            writeFileStub.should.have.been.calledOnce;
            copyStub.should.have.been.calledOnce;
            errorSpy.should.not.have.been.called;
        });

        it('should show an error message if we fail to save connection details to disk', async () => {
            writeFileStub.onCall(0).rejects({message: 'oops'});

            await runtime.exportConnectionDetails(VSCodeBlockchainOutputAdapter.instance()).should.have.been.rejected;
            ensureFileStub.should.have.been.calledOnce;
            writeFileStub.should.have.been.calledOnce;
            errorSpy.should.have.been.calledWith(LogType.ERROR, `Issue saving runtime connection details in directory ${path.join(runtimeDir, 'runtime1')} with error: oops`);
        });
    });

    describe('#deleteConnectionDetails', () => {

        beforeEach(async () => {
            errorSpy = sandbox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
            runtimeDetailsDir = path.join(runtimeDir, 'runtime1');

        });

        it('should delete runtime connection details', async () => {
            await runtime.deleteConnectionDetails(VSCodeBlockchainOutputAdapter.instance());
            removeStub.getCall(0).should.have.been.calledWith(runtimeDetailsDir);
            errorSpy.should.not.have.been.called;
        });

        it('should show an error message if we fail to delete the connection details', async () => {
            removeStub.onCall(0).rejects({message: 'oops'});

            await runtime.deleteConnectionDetails(VSCodeBlockchainOutputAdapter.instance());
            errorSpy.should.have.been.calledWith(LogType.ERROR, `Error removing runtime connection details: oops`), `Error removing runtime connection details: oops`;
        });

        it('should not show an error message if the runtime connection details folder doesnt exist', async () => {
            removeStub.onCall(0).rejects({message: 'ENOENT: no such file or directory'});

            await runtime.deleteConnectionDetails(VSCodeBlockchainOutputAdapter.instance());
            errorSpy.should.not.have.been.called;
        });
    });

    describe('#startLogs', () => {

        it('should start the logs', async () => {
            const sendRequest: sinon.SinonStub = sandbox.stub(CommandUtil, 'sendRequestWithOutput');

            await runtime.startLogs(VSCodeBlockchainDockerOutputAdapter.instance());

            sendRequest.should.have.been.calledWith('http://localhost:12387/logs', VSCodeBlockchainDockerOutputAdapter.instance());
        });
    });
});
