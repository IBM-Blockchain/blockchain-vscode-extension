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

import * as vscode from 'vscode';
import Dockerode = require('dockerode');
import { Container } from 'dockerode';
import ContainerImpl = require('dockerode/lib/container');
import * as child_process from 'child_process';
import { FabricRuntimeRegistry } from '../../src/fabric/FabricRuntimeRegistry';
import { FabricRuntimeRegistryEntry } from '../../src/fabric/FabricRuntimeRegistryEntry';
import { FabricRuntime } from '../../src/fabric/FabricRuntime';

import * as chai from 'chai';
import * as sinon from 'sinon';
import { OutputAdapter } from '../../src/logging/OutputAdapter';
import { ExtensionUtil } from '../../src/util/ExtensionUtil';
import { TestUtil } from '../TestUtil';
chai.should();

// tslint:disable no-unused-expression
describe('FabricRuntime', () => {

    const originalPlatform: string = process.platform;
    const originalSpawn: any = child_process.spawn;
    const runtimeRegistry: FabricRuntimeRegistry = FabricRuntimeRegistry.instance();

    let runtimeRegistryEntry: FabricRuntimeRegistryEntry;
    let runtime: FabricRuntime;
    let sandbox: sinon.SinonSandbox;
    let mockPeerContainer: sinon.SinonStubbedInstance<Container>;
    let mockOrdererContainer: sinon.SinonStubbedInstance<Container>;
    let mockCAContainer: sinon.SinonStubbedInstance<Container>;
    let mockPeerInspect: any;
    let mockOrdererInspect: any;
    let mockCAInspect: any;

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
            return originalSpawn('cmd', [ '/c', 'echo stdout&& echo stderr>&2&& exit 0' ]);
        } else {
            return originalSpawn('/bin/sh', [ '-c', 'echo stdout && echo stderr >&2 && true' ]);
        }
    }

    function mockFailureCommand(): any {
        if (originalPlatform === 'win32') {
            return originalSpawn('cmd', [ '/c', 'echo stdout&& echo stderr>&2&& exit 1' ]);
        } else {
            return originalSpawn('/bin/sh', [ '-c', 'echo stdout && echo stderr >&2 && false' ]);
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
        await runtimeRegistry.add(runtimeRegistryEntry);
        runtime = new FabricRuntime(runtimeRegistryEntry);
        sandbox = sinon.createSandbox();
        const docker: Dockerode = (runtime as any).docker;
        mockPeerContainer = sinon.createStubInstance(ContainerImpl);
        mockPeerInspect = {
            NetworkSettings: {
                Ports: {
                    '7051/tcp': [{ HostIp: '0.0.0.0', HostPort: '12345' }],
                    '7053/tcp': [{ HostIp: '0.0.0.0', HostPort: '12346' }]
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
                    '7050/tcp': [{ HostIp: '127.0.0.1', HostPort: '12347' }]
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
                    '7054/tcp': [{ HostIp: '127.0.0.1', HostPort: '12348' }]
                }
            },
            State: {
                Running: true
            }
        };
        mockCAContainer.inspect.resolves(mockCAInspect);
        const getContainerStub: sinon.SinonStub = sandbox.stub(docker, 'getContainer');
        getContainerStub.withArgs('fabricvscoderuntime1_peer0.org1.example.com_1').returns(mockPeerContainer);
        getContainerStub.withArgs('fabricvscoderuntime1_orderer.example.com_1').returns(mockOrdererContainer);
        getContainerStub.withArgs('fabricvscoderuntime1_ca.example.com_1').returns(mockCAContainer);
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

    describe('#start', () => {

        it('should execute the start.sh script and handle success for non-development mode (Linux/MacOS)', async () => {
            sandbox.stub(process, 'platform').value('linux');
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('/bin/sh', [ 'start.sh' ], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            await runtime.start();
            spawnStub.should.have.been.calledOnce;
            spawnStub.should.have.been.calledWith('/bin/sh', [ 'start.sh' ], sinon.match.any);
            spawnStub.getCall(0).args[2].env.CORE_CHAINCODE_MODE.should.equal('net');
        });

        it('should execute the start.sh script and handle success for development mode (Linux/MacOS)', async () => {
            sandbox.stub(process, 'platform').value('linux');
            runtimeRegistryEntry.developmentMode = true;
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('/bin/sh', [ 'start.sh' ], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            await runtime.start();
            spawnStub.should.have.been.calledOnce;
            spawnStub.should.have.been.calledWith('/bin/sh', [ 'start.sh' ], sinon.match.any);
            spawnStub.getCall(0).args[2].env.CORE_CHAINCODE_MODE.should.equal('dev');
        });

        it('should execute the start.sh script and handle an error (Linux/MacOS)', async () => {
            sandbox.stub(process, 'platform').value('linux');
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('/bin/sh', [ 'start.sh' ], sinon.match.any).callsFake(() => {
                return mockFailureCommand();
            });
            await runtime.start().should.be.rejectedWith(`Failed to execute command "/bin/sh" with  arguments "start.sh" return code 1`);
            spawnStub.should.have.been.calledOnce;
            spawnStub.should.have.been.calledWith('/bin/sh', [ 'start.sh' ], sinon.match.any);
        });

        it('should execute the start.sh script using a custom output adapter (Linux/MacOS)', async () => {
            sandbox.stub(process, 'platform').value('linux');
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('/bin/sh', [ 'start.sh' ], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            const outputAdapter: sinon.SinonStubbedInstance<TestFabricOutputAdapter> = sinon.createStubInstance(TestFabricOutputAdapter);
            await runtime.start(outputAdapter);
            outputAdapter.log.should.have.been.calledOnceWith('stdout');
            outputAdapter.error.should.have.been.calledOnceWith('stderr');
        });

        it('should publish busy events before and after handling success (Linux/MacOS)', async () => {
            sandbox.stub(process, 'platform').value('linux');
            const eventStub: sinon.SinonStub = sinon.stub();
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('/bin/sh', [ 'start.sh' ], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            runtime.on('busy', eventStub);
            await runtime.start();
            eventStub.should.have.been.calledTwice;
            eventStub.should.have.been.calledWithExactly(true);
            eventStub.should.have.been.calledWithExactly(false);
        });

        it('should publish busy events before and after handling an error (Linux/MacOS)', async () => {
            sandbox.stub(process, 'platform').value('linux');
            const eventStub: sinon.SinonStub = sinon.stub();
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('/bin/sh', [ 'start.sh' ], sinon.match.any).callsFake(() => {
                return mockFailureCommand();
            });
            runtime.on('busy', eventStub);
            await runtime.start().should.be.rejectedWith(`Failed to execute command "/bin/sh" with  arguments "start.sh" return code 1`);
            eventStub.should.have.been.calledTwice;
            eventStub.should.have.been.calledWithExactly(true);
            eventStub.should.have.been.calledWithExactly(false);
        });

        it('should execute the start.cmd script and handle success for non-development mode (Windows)', async () => {
            sandbox.stub(process, 'platform').value('win32');
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('cmd', [ '/c', 'start.cmd' ], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            await runtime.start();
            spawnStub.should.have.been.calledOnce;
            spawnStub.should.have.been.calledWith('cmd', [ '/c', 'start.cmd' ], sinon.match.any);
            spawnStub.getCall(0).args[2].env.CORE_CHAINCODE_MODE.should.equal('net');
        });

        it('should execute the start.cmd script and handle success for development mode (Windows)', async () => {
            sandbox.stub(process, 'platform').value('win32');
            runtimeRegistryEntry.developmentMode = true;
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('cmd', [ '/c', 'start.cmd' ], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            await runtime.start();
            spawnStub.should.have.been.calledOnce;
            spawnStub.should.have.been.calledWith('cmd', [ '/c', 'start.cmd' ], sinon.match.any);
            spawnStub.getCall(0).args[2].env.CORE_CHAINCODE_MODE.should.equal('dev');
        });

        it('should execute the start.cmd script and handle an error (Windows)', async () => {
            sandbox.stub(process, 'platform').value('win32');
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('cmd', [ '/c', 'start.cmd' ], sinon.match.any).callsFake(() => {
                return mockFailureCommand();
            });
            await runtime.start().should.be.rejectedWith(`Failed to execute command "cmd" with  arguments "/c, start.cmd" return code 1`);
            spawnStub.should.have.been.calledOnce;
            spawnStub.should.have.been.calledWith('cmd', [ '/c', 'start.cmd' ], sinon.match.any);
        });

        it('should execute the start.cmd script using a custom output adapter (Windows)', async () => {
            sandbox.stub(process, 'platform').value('win32');
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('cmd', [ '/c', 'start.cmd' ], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            const outputAdapter: sinon.SinonStubbedInstance<TestFabricOutputAdapter> = sinon.createStubInstance(TestFabricOutputAdapter);
            await runtime.start(outputAdapter);
            outputAdapter.log.should.have.been.calledOnceWith('stdout');
            outputAdapter.error.should.have.been.calledOnceWith('stderr');
        });

        it('should publish busy events before and after handling success (Windows)', async () => {
            sandbox.stub(process, 'platform').value('win32');
            const eventStub: sinon.SinonStub = sinon.stub();
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('cmd', [ '/c', 'start.cmd' ], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            runtime.on('busy', eventStub);
            await runtime.start();
            eventStub.should.have.been.calledTwice;
            eventStub.should.have.been.calledWithExactly(true);
            eventStub.should.have.been.calledWithExactly(false);
        });

        it('should publish busy events before and after handling an error (Windows)', async () => {
            sandbox.stub(process, 'platform').value('win32');
            const eventStub: sinon.SinonStub = sinon.stub();
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('cmd', [ '/c', 'start.cmd' ], sinon.match.any).callsFake(() => {
                return mockFailureCommand();
            });
            runtime.on('busy', eventStub);
            await runtime.start().should.be.rejectedWith(`Failed to execute command "cmd" with  arguments "/c, start.cmd" return code 1`);
            eventStub.should.have.been.calledTwice;
            eventStub.should.have.been.calledWithExactly(true);
            eventStub.should.have.been.calledWithExactly(false);
        });

    });

    describe('#stop', () => {

        it('should execute the stop.sh and teardown.sh scripts and handle success (Linux/MacOS)', async () => {
            sandbox.stub(process, 'platform').value('darwin');
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('/bin/sh', [ 'stop.sh' ], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            spawnStub.withArgs('/bin/sh', [ 'teardown.sh' ], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            await runtime.stop();
            spawnStub.should.have.been.calledTwice;
            spawnStub.should.have.been.calledWith('/bin/sh', [ 'stop.sh' ], sinon.match.any);
            spawnStub.should.have.been.calledWith('/bin/sh', [ 'teardown.sh' ], sinon.match.any);
        });

        it('should execute the stop.sh and teardown.sh scripts and handle an error from stop.sh (Linux/MacOS)', async () => {
            sandbox.stub(process, 'platform').value('darwin');
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('/bin/sh', [ 'stop.sh' ], sinon.match.any).callsFake(() => {
                return mockFailureCommand();
            });
            spawnStub.withArgs('/bin/sh', [ 'teardown.sh' ], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            await runtime.stop().should.be.rejectedWith(`Failed to execute command "/bin/sh" with  arguments "stop.sh" return code 1`);
            spawnStub.should.have.been.calledOnce;
            spawnStub.should.have.been.calledWith('/bin/sh', [ 'stop.sh' ], sinon.match.any);
        });

        it('should execute the stop.sh and teardown.sh scripts and handle an error from teardown.sh (Linux/MacOS)', async () => {
            sandbox.stub(process, 'platform').value('darwin');
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('/bin/sh', [ 'stop.sh' ], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            spawnStub.withArgs('/bin/sh', [ 'teardown.sh' ], sinon.match.any).callsFake(() => {
                return mockFailureCommand();
            });
            await runtime.stop().should.be.rejectedWith(`Failed to execute command "/bin/sh" with  arguments "teardown.sh" return code 1`);
            spawnStub.should.have.been.calledTwice;
            spawnStub.should.have.been.calledWith('/bin/sh', [ 'stop.sh' ], sinon.match.any);
            spawnStub.should.have.been.calledWith('/bin/sh', [ 'teardown.sh' ], sinon.match.any);
        });

        it('should execute the stop.sh script using a custom output adapter (Linux/MacOS)', async () => {
            sandbox.stub(process, 'platform').value('darwin');
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('/bin/sh', [ 'stop.sh' ], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            spawnStub.withArgs('/bin/sh', [ 'teardown.sh' ], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            const outputAdapter: sinon.SinonStubbedInstance<TestFabricOutputAdapter> = sinon.createStubInstance(TestFabricOutputAdapter);
            await runtime.stop(outputAdapter);
            outputAdapter.log.should.have.been.calledTwice;
            outputAdapter.error.should.have.been.calledTwice;
            outputAdapter.log.should.have.been.calledWith('stdout');
            outputAdapter.error.should.have.been.calledWith('stderr');
            outputAdapter.log.should.have.been.calledWith('stdout');
            outputAdapter.error.should.have.been.calledWith('stderr');
        });

        it('should publish busy events before and after handling success (Linux/MacOS)', async () => {
            sandbox.stub(process, 'platform').value('darwin');
            const eventStub: sinon.SinonStub = sinon.stub();
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('/bin/sh', [ 'stop.sh' ], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            spawnStub.withArgs('/bin/sh', [ 'teardown.sh' ], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            runtime.on('busy', eventStub);
            await runtime.stop();
            eventStub.should.have.been.calledTwice;
            eventStub.should.have.been.calledWithExactly(true);
            eventStub.should.have.been.calledWithExactly(false);
        });

        it('should publish busy events before and after handling an error (Linux/MacOS)', async () => {
            sandbox.stub(process, 'platform').value('darwin');
            const eventStub: sinon.SinonStub = sinon.stub();
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('/bin/sh', [ 'stop.sh' ], sinon.match.any).callsFake(() => {
                return mockFailureCommand();
            });
            spawnStub.withArgs('/bin/sh', [ 'teardown.sh' ], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            runtime.on('busy', eventStub);
            await runtime.stop().should.be.rejectedWith(`Failed to execute command "/bin/sh" with  arguments "stop.sh" return code 1`);
            eventStub.should.have.been.calledTwice;
            eventStub.should.have.been.calledWithExactly(true);
            eventStub.should.have.been.calledWithExactly(false);
        });

        it('should execute the stop.cmd and teardown.cmd scripts and handle success (Windows)', async () => {
            sandbox.stub(process, 'platform').value('win32');
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('cmd', [ '/c', 'stop.cmd' ], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            spawnStub.withArgs('cmd', [ '/c', 'teardown.cmd' ], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            await runtime.stop();
            spawnStub.should.have.been.calledTwice;
            spawnStub.should.have.been.calledWith('cmd', [ '/c', 'stop.cmd' ], sinon.match.any);
            spawnStub.should.have.been.calledWith('cmd', [ '/c', 'teardown.cmd' ], sinon.match.any);
        });

        it('should execute the stop.cmd and teardown.cmd scripts and handle an error from stop.cmd (Windows)', async () => {
            sandbox.stub(process, 'platform').value('win32');
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('cmd', [ '/c', 'stop.cmd' ], sinon.match.any).callsFake(() => {
                return mockFailureCommand();
            });
            spawnStub.withArgs('cmd', [ '/c', 'teardown.cmd' ], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            await runtime.stop().should.be.rejectedWith(`Failed to execute command "cmd" with  arguments "/c, stop.cmd" return code 1`);
            spawnStub.should.have.been.calledOnce;
            spawnStub.should.have.been.calledWith('cmd', [ '/c', 'stop.cmd' ], sinon.match.any);
        });

        it('should execute the stop.cmd and teardown.cmd scripts and handle an error from teardown.cmd (Windows)', async () => {
            sandbox.stub(process, 'platform').value('win32');
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('cmd', [ '/c', 'stop.cmd' ], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            spawnStub.withArgs('cmd', [ '/c', 'teardown.cmd' ], sinon.match.any).callsFake(() => {
                return mockFailureCommand();
            });
            await runtime.stop().should.be.rejectedWith(`Failed to execute command "cmd" with  arguments "/c, teardown.cmd" return code 1`);
            spawnStub.should.have.been.calledTwice;
            spawnStub.should.have.been.calledWith('cmd', [ '/c', 'stop.cmd' ], sinon.match.any);
            spawnStub.should.have.been.calledWith('cmd', [ '/c', 'teardown.cmd' ], sinon.match.any);
        });

        it('should execute the stop.cmd script using a custom output adapter (Windows)', async () => {
            sandbox.stub(process, 'platform').value('win32');
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('cmd', [ '/c', 'stop.cmd' ], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            spawnStub.withArgs('cmd', [ '/c', 'teardown.cmd' ], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            const outputAdapter: sinon.SinonStubbedInstance<TestFabricOutputAdapter> = sinon.createStubInstance(TestFabricOutputAdapter);
            await runtime.stop(outputAdapter);
            outputAdapter.log.should.have.been.calledTwice;
            outputAdapter.error.should.have.been.calledTwice;
            outputAdapter.log.should.have.been.calledWith('stdout');
            outputAdapter.error.should.have.been.calledWith('stderr');
            outputAdapter.log.should.have.been.calledWith('stdout');
            outputAdapter.error.should.have.been.calledWith('stderr');
        });

        it('should publish busy events before and after handling success (Windows)', async () => {
            sandbox.stub(process, 'platform').value('win32');
            const eventStub: sinon.SinonStub = sinon.stub();
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('cmd', [ '/c', 'stop.cmd' ], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            spawnStub.withArgs('cmd', [ '/c', 'teardown.cmd' ], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            runtime.on('busy', eventStub);
            await runtime.stop();
            eventStub.should.have.been.calledTwice;
            eventStub.should.have.been.calledWithExactly(true);
            eventStub.should.have.been.calledWithExactly(false);
        });

        it('should publish busy events before and after handling an error (Windows)', async () => {
            sandbox.stub(process, 'platform').value('win32');
            const eventStub: sinon.SinonStub = sinon.stub();
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('cmd', [ '/c', 'stop.cmd' ], sinon.match.any).callsFake(() => {
                return mockFailureCommand();
            });
            spawnStub.withArgs('cmd', [ '/c', 'teardown.cmd' ], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            runtime.on('busy', eventStub);
            await runtime.stop().should.be.rejectedWith(`Failed to execute command "cmd" with  arguments "/c, stop.cmd" return code 1`);
            eventStub.should.have.been.calledTwice;
            eventStub.should.have.been.calledWithExactly(true);
            eventStub.should.have.been.calledWithExactly(false);
        });

    });

    describe('#restart', () => {

        it('should execute the start.sh, stop.sh and teardown.sh scripts and handle success (Linux/MacOS)', async () => {
            sandbox.stub(process, 'platform').value('linux');
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('/bin/sh', [ 'start.sh' ], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            spawnStub.withArgs('/bin/sh', [ 'stop.sh' ], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            spawnStub.withArgs('/bin/sh', [ 'teardown.sh' ], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            await runtime.restart();
            spawnStub.should.have.been.calledThrice;
            spawnStub.should.have.been.calledWith('/bin/sh', [ 'start.sh' ], sinon.match.any);
            spawnStub.should.have.been.calledWith('/bin/sh', [ 'stop.sh' ], sinon.match.any);
            spawnStub.should.have.been.calledWith('/bin/sh', [ 'teardown.sh' ], sinon.match.any);
        });

        it('should execute the start.sh, stop.sh and teardown.sh scripts using a custom output adapter (Linux/MacOS)', async () => {
            sandbox.stub(process, 'platform').value('linux');
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('/bin/sh', [ 'start.sh' ], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            spawnStub.withArgs('/bin/sh', [ 'stop.sh' ], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            spawnStub.withArgs('/bin/sh', [ 'teardown.sh' ], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            const outputAdapter: sinon.SinonStubbedInstance<TestFabricOutputAdapter> = sinon.createStubInstance(TestFabricOutputAdapter);
            await runtime.restart(outputAdapter);
            outputAdapter.log.should.have.been.calledThrice;
            outputAdapter.error.should.have.been.calledThrice;
            outputAdapter.log.should.have.been.calledWith('stdout');
            outputAdapter.error.should.have.been.calledWith('stderr');
            outputAdapter.log.should.have.been.calledWith('stdout');
            outputAdapter.error.should.have.been.calledWith('stderr');
            outputAdapter.log.should.have.been.calledWith('stdout');
            outputAdapter.error.should.have.been.calledWith('stderr');
        });

        it('should publish busy events before and after handling success (Linux/MacOS)', async () => {
            sandbox.stub(process, 'platform').value('linux');
            const eventStub: sinon.SinonStub = sinon.stub();
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('/bin/sh', [ 'start.sh' ], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            spawnStub.withArgs('/bin/sh', [ 'stop.sh' ], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            spawnStub.withArgs('/bin/sh', [ 'teardown.sh' ], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            runtime.on('busy', eventStub);
            await runtime.restart();
            eventStub.should.have.been.calledTwice;
            eventStub.should.have.been.calledWithExactly(true);
            eventStub.should.have.been.calledWithExactly(false);
        });

        it('should publish busy events before and after handling an error (Linux/MacOS)', async () => {
            sandbox.stub(process, 'platform').value('linux');
            const eventStub: sinon.SinonStub = sinon.stub();
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('/bin/sh', [ 'start.sh' ], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            spawnStub.withArgs('/bin/sh', [ 'stop.sh' ], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            spawnStub.withArgs('/bin/sh', [ 'teardown.sh' ], sinon.match.any).callsFake(() => {
                return mockFailureCommand();
            });
            runtime.on('busy', eventStub);
            await runtime.restart().should.be.rejectedWith(`Failed to execute command "/bin/sh" with  arguments "teardown.sh" return code 1`);
            eventStub.should.have.been.calledTwice;
            eventStub.should.have.been.calledWithExactly(true);
            eventStub.should.have.been.calledWithExactly(false);
        });

        it('should execute the start.cmd, stop.cmd and teardown.cmd scripts and handle success (Windows)', async () => {
            sandbox.stub(process, 'platform').value('win32');
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('cmd', [ '/c', 'start.cmd' ], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            spawnStub.withArgs('cmd', [ '/c', 'stop.cmd' ], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            spawnStub.withArgs('cmd', [ '/c', 'teardown.cmd' ], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            await runtime.restart();
            spawnStub.should.have.been.calledThrice;
            spawnStub.should.have.been.calledWith('cmd', [ '/c', 'start.cmd' ], sinon.match.any);
            spawnStub.should.have.been.calledWith('cmd', [ '/c', 'stop.cmd' ], sinon.match.any);
            spawnStub.should.have.been.calledWith('cmd', [ '/c', 'teardown.cmd' ], sinon.match.any);
        });

        it('should execute the start.sh, stop.sh and teardown.sh scripts using a custom output adapter (Windows)', async () => {
            sandbox.stub(process, 'platform').value('win32');
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('cmd', [ '/c', 'start.cmd' ], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            spawnStub.withArgs('cmd', [ '/c', 'stop.cmd' ], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            spawnStub.withArgs('cmd', [ '/c', 'teardown.cmd' ], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            const outputAdapter: sinon.SinonStubbedInstance<TestFabricOutputAdapter> = sinon.createStubInstance(TestFabricOutputAdapter);
            await runtime.restart(outputAdapter);
            outputAdapter.log.should.have.been.calledThrice;
            outputAdapter.error.should.have.been.calledThrice;
            outputAdapter.log.should.have.been.calledWith('stdout');
            outputAdapter.error.should.have.been.calledWith('stderr');
            outputAdapter.log.should.have.been.calledWith('stdout');
            outputAdapter.error.should.have.been.calledWith('stderr');
            outputAdapter.log.should.have.been.calledWith('stdout');
            outputAdapter.error.should.have.been.calledWith('stderr');
        });

        it('should publish busy events before and after handling success (Windows)', async () => {
            sandbox.stub(process, 'platform').value('win32');
            const eventStub: sinon.SinonStub = sinon.stub();
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('cmd', [ '/c', 'start.cmd' ], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            spawnStub.withArgs('cmd', [ '/c', 'stop.cmd' ], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            spawnStub.withArgs('cmd', [ '/c', 'teardown.cmd' ], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            runtime.on('busy', eventStub);
            await runtime.restart();
            eventStub.should.have.been.calledTwice;
            eventStub.should.have.been.calledWithExactly(true);
            eventStub.should.have.been.calledWithExactly(false);
        });

        it('should publish busy events before and after handling an error (Windows)', async () => {
            sandbox.stub(process, 'platform').value('win32');
            const eventStub: sinon.SinonStub = sinon.stub();
            const spawnStub: sinon.SinonStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('cmd', [ '/c', 'start.cmd' ], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            spawnStub.withArgs('cmd', [ '/c', 'stop.cmd' ], sinon.match.any).callsFake(() => {
                return mockSuccessCommand();
            });
            spawnStub.withArgs('cmd', [ '/c', 'teardown.cmd' ], sinon.match.any).callsFake(() => {
                return mockFailureCommand();
            });
            runtime.on('busy', eventStub);
            await runtime.restart().should.be.rejectedWith(`Failed to execute command "cmd" with  arguments "/c, teardown.cmd" return code 1`);
            eventStub.should.have.been.calledTwice;
            eventStub.should.have.been.calledWithExactly(true);
            eventStub.should.have.been.calledWithExactly(false);
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

    describe('#isRunning', () => {

        it('should return true if the peer, orderer, and CA are running', async () => {
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

});
