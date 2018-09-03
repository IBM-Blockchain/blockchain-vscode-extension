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
chai.should();

// tslint:disable no-unused-expression
describe('FabricRuntime', () => {

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
                    '7050/tcp': [{ HostIp: '0.0.0.0', HostPort: '12347' }]
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
                    '7054/tcp': [{ HostIp: '0.0.0.0', HostPort: '12348' }]
                }
            },
            State: {
                Running: true
            }
        };
        mockCAContainer.inspect.resolves(mockCAInspect);
        const getContainerStub: sinon.SinonStub = sandbox.stub(docker, 'getContainer');
        getContainerStub.withArgs('fabric-vscode-runtime1_peer0.org1.example.com_1').returns(mockPeerContainer);
        getContainerStub.withArgs('fabric-vscode-runtime1_orderer.example.com_1').returns(mockOrdererContainer);
        getContainerStub.withArgs('fabric-vscode-runtime1_ca.example.com_1').returns(mockCAContainer);
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

        it('should execute the start.sh script and handle success for non-development mode', async () => {
            const originalSpawn = child_process.spawn;
            const spawnStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('/bin/sh', [ 'start.sh' ], sinon.match.any).callsFake(() => {
                return originalSpawn('/bin/sh', [ '-c', 'echo stdout && echo stderr >&2 && true' ]);
            });
            await runtime.start();
            spawnStub.should.have.been.calledOnce;
            spawnStub.should.have.been.calledWith('/bin/sh', [ 'start.sh' ], sinon.match.any);
            spawnStub.getCall(0).args[2].env.CORE_CHAINCODE_MODE.should.equal('net');
        });

        it('should execute the start.sh script and handle success for development mode', async () => {
            runtimeRegistryEntry.developmentMode = true;
            const originalSpawn = child_process.spawn;
            const spawnStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('/bin/sh', [ 'start.sh' ], sinon.match.any).callsFake(() => {
                return originalSpawn('/bin/sh', [ '-c', 'echo stdout && echo stderr >&2 && true' ]);
            });
            await runtime.start();
            spawnStub.should.have.been.calledOnce;
            spawnStub.should.have.been.calledWith('/bin/sh', [ 'start.sh' ], sinon.match.any);
            spawnStub.getCall(0).args[2].env.CORE_CHAINCODE_MODE.should.equal('dev');
        });

        it('should execute the start.sh script and handle an error', async () => {
            const originalSpawn = child_process.spawn;
            const spawnStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('/bin/sh', [ 'start.sh' ], sinon.match.any).callsFake(() => {
                return originalSpawn('/bin/sh', [ '-c', 'echo stdout && echo stderr >&2 && false' ]);
            });
            await runtime.start().should.be.rejectedWith(`Failed to execute command "/bin/sh" with  arguments "start.sh" return code 1`);
            spawnStub.should.have.been.calledOnce;
            spawnStub.should.have.been.calledWith('/bin/sh', [ 'start.sh' ], sinon.match.any);
        });

        it('should execute the start.sh script using a custom output adapter', async () => {
            const originalSpawn = child_process.spawn;
            const spawnStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('/bin/sh', [ 'start.sh' ], sinon.match.any).callsFake(() => {
                return originalSpawn('/bin/sh', [ '-c', 'echo stdout && echo stderr >&2 && true' ]);
            });
            const outputAdapter = sinon.createStubInstance(TestFabricOutputAdapter);
            await runtime.start(outputAdapter);
            outputAdapter.log.should.have.been.calledOnceWith('stdout');
            outputAdapter.error.should.have.been.calledOnceWith('stderr');
        });

    });

    describe('#stop', () => {

        it('should execute the stop.sh and teardown.sh scripts and handle success', async () => {
            const originalSpawn = child_process.spawn;
            const spawnStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('/bin/sh', [ 'stop.sh' ], sinon.match.any).callsFake(() => {
                return originalSpawn('/bin/sh', [ '-c', 'echo stdout && echo stderr >&2 && true' ]);
            });
            spawnStub.withArgs('/bin/sh', [ 'teardown.sh' ], sinon.match.any).callsFake(() => {
                return originalSpawn('/bin/sh', [ '-c', 'echo stdout && echo stderr >&2 && true' ]);
            });
            await runtime.stop();
            spawnStub.should.have.been.calledTwice;
            spawnStub.should.have.been.calledWith('/bin/sh', [ 'stop.sh' ], sinon.match.any);
            spawnStub.should.have.been.calledWith('/bin/sh', [ 'teardown.sh' ], sinon.match.any);
        });

        it('should execute the stop.sh and teardown.sh scripts and handle an error from stop.sh', async () => {
            const originalSpawn = child_process.spawn;
            const spawnStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('/bin/sh', [ 'stop.sh' ], sinon.match.any).callsFake(() => {
                return originalSpawn('/bin/sh', [ '-c', 'echo stdout && echo stderr >&2 && false' ]);
            });
            spawnStub.withArgs('/bin/sh', [ 'teardown.sh' ], sinon.match.any).callsFake(() => {
                return originalSpawn('/bin/sh', [ '-c', 'echo stdout && echo stderr >&2 && true' ]);
            });
            await runtime.stop().should.be.rejectedWith(`Failed to execute command "/bin/sh" with  arguments "stop.sh" return code 1`);
            spawnStub.should.have.been.calledOnce;
            spawnStub.should.have.been.calledWith('/bin/sh', [ 'stop.sh' ], sinon.match.any);
        });

        it('should execute the stop.sh and teardown.sh scripts and handle an error from teardown.sh', async () => {
            const originalSpawn = child_process.spawn;
            const spawnStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('/bin/sh', [ 'stop.sh' ], sinon.match.any).callsFake(() => {
                return originalSpawn('/bin/sh', [ '-c', 'echo stdout && echo stderr >&2 && true' ]);
            });
            spawnStub.withArgs('/bin/sh', [ 'teardown.sh' ], sinon.match.any).callsFake(() => {
                return originalSpawn('/bin/sh', [ '-c', 'echo stdout && echo stderr >&2 && false' ]);
            });
            await runtime.stop().should.be.rejectedWith(`Failed to execute command "/bin/sh" with  arguments "teardown.sh" return code 1`);
            spawnStub.should.have.been.calledTwice;
            spawnStub.should.have.been.calledWith('/bin/sh', [ 'stop.sh' ], sinon.match.any);
            spawnStub.should.have.been.calledWith('/bin/sh', [ 'teardown.sh' ], sinon.match.any);
        });

        it('should execute the stop.sh script using a custom output adapter', async () => {
            const originalSpawn = child_process.spawn;
            const spawnStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('/bin/sh', [ 'stop.sh' ], sinon.match.any).callsFake(() => {
                return originalSpawn('/bin/sh', [ '-c', 'echo stdout && echo stderr >&2 && true' ]);
            });
            spawnStub.withArgs('/bin/sh', [ 'teardown.sh' ], sinon.match.any).callsFake(() => {
                return originalSpawn('/bin/sh', [ '-c', 'echo stdout && echo stderr >&2 && true' ]);
            });
            const outputAdapter = sinon.createStubInstance(TestFabricOutputAdapter);
            await runtime.stop(outputAdapter);
            outputAdapter.log.should.have.been.calledTwice;
            outputAdapter.error.should.have.been.calledTwice;
            outputAdapter.log.should.have.been.calledWith('stdout');
            outputAdapter.error.should.have.been.calledWith('stderr');
            outputAdapter.log.should.have.been.calledWith('stdout');
            outputAdapter.error.should.have.been.calledWith('stderr');
        });

    });

    describe('#restart', () => {

        it('should execute the start.sh, stop.sh and teardown.sh scripts and handle success', async () => {
            const originalSpawn = child_process.spawn;
            const spawnStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('/bin/sh', [ 'start.sh' ], sinon.match.any).callsFake(() => {
                return originalSpawn('/bin/sh', [ '-c', 'echo stdout && echo stderr >&2 && true' ]);
            });
            spawnStub.withArgs('/bin/sh', [ 'stop.sh' ], sinon.match.any).callsFake(() => {
                return originalSpawn('/bin/sh', [ '-c', 'echo stdout && echo stderr >&2 && true' ]);
            });
            spawnStub.withArgs('/bin/sh', [ 'teardown.sh' ], sinon.match.any).callsFake(() => {
                return originalSpawn('/bin/sh', [ '-c', 'echo stdout && echo stderr >&2 && true' ]);
            });
            await runtime.restart();
            spawnStub.should.have.been.calledThrice;
            spawnStub.should.have.been.calledWith('/bin/sh', [ 'start.sh' ], sinon.match.any);
            spawnStub.should.have.been.calledWith('/bin/sh', [ 'stop.sh' ], sinon.match.any);
            spawnStub.should.have.been.calledWith('/bin/sh', [ 'teardown.sh' ], sinon.match.any);
        });

        it('should execute the start.sh, stop.sh and teardown.sh scripts using a custom output adapter', async () => {
            const originalSpawn = child_process.spawn;
            const spawnStub = sandbox.stub(child_process, 'spawn');
            spawnStub.withArgs('/bin/sh', [ 'start.sh' ], sinon.match.any).callsFake(() => {
                return originalSpawn('/bin/sh', [ '-c', 'echo stdout && echo stderr >&2 && true' ]);
            });
            spawnStub.withArgs('/bin/sh', [ 'stop.sh' ], sinon.match.any).callsFake(() => {
                return originalSpawn('/bin/sh', [ '-c', 'echo stdout && echo stderr >&2 && true' ]);
            });
            spawnStub.withArgs('/bin/sh', [ 'teardown.sh' ], sinon.match.any).callsFake(() => {
                return originalSpawn('/bin/sh', [ '-c', 'echo stdout && echo stderr >&2 && true' ]);
            });
            const outputAdapter = sinon.createStubInstance(TestFabricOutputAdapter);
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
                        url: 'grpc://0.0.0.0:12347'
                    }
                },
                peers: {
                    'peer0.org1.example.com': {
                        url: 'grpc://0.0.0.0:12345',
                        eventUrl: 'grpc://0.0.0.0:12346'
                    }
                },
                certificateAuthorities: {
                    'ca.org1.example.com': {
                        url: 'http://0.0.0.0:12348',
                        caName: 'ca.org1.example.com'
                    }
                }
            });
        });

    });

    describe('#getCertificate', () => {

        it('should get the PEM encoded certificate', async () => {
            const certificate: string = await runtime.getCertificate();
            certificate.should.equal('-----BEGIN CERTIFICATE-----\nMIICGDCCAb+gAwIBAgIQFSxnLAGsu04zrFkAEwzn6zAKBggqhkjOPQQDAjBzMQsw\nCQYDVQQGEwJVUzETMBEGA1UECBMKQ2FsaWZvcm5pYTEWMBQGA1UEBxMNU2FuIEZy\nYW5jaXNjbzEZMBcGA1UEChMQb3JnMS5leGFtcGxlLmNvbTEcMBoGA1UEAxMTY2Eu\nb3JnMS5leGFtcGxlLmNvbTAeFw0xNzA4MzEwOTE0MzJaFw0yNzA4MjkwOTE0MzJa\nMFsxCzAJBgNVBAYTAlVTMRMwEQYDVQQIEwpDYWxpZm9ybmlhMRYwFAYDVQQHEw1T\nYW4gRnJhbmNpc2NvMR8wHQYDVQQDDBZBZG1pbkBvcmcxLmV4YW1wbGUuY29tMFkw\nEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEV1dfmKxsFKWo7o6DNBIaIVebCCPAM9C/\nsLBt4pJRre9pWE987DjXZoZ3glc4+DoPMtTmBRqbPVwYcUvpbYY8p6NNMEswDgYD\nVR0PAQH/BAQDAgeAMAwGA1UdEwEB/wQCMAAwKwYDVR0jBCQwIoAgQjmqDc122u64\nugzacBhR0UUE0xqtGy3d26xqVzZeSXwwCgYIKoZIzj0EAwIDRwAwRAIgXMy26AEU\n/GUMPfCMs/nQjQME1ZxBHAYZtKEuRR361JsCIEg9BOZdIoioRivJC+ZUzvJUnkXu\no2HkWiuxLsibGxtE\n-----END CERTIFICATE-----\n');
        });

    });

    describe('#getPrivateKey', () => {

        it('should get the PEM encoded private key', async () => {
            const privateKey: string = await runtime.getPrivateKey();
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
