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
import { FabricRuntimeRegistry } from '../../src/fabric/FabricRuntimeRegistry';
import { FabricRuntime } from '../../src/fabric/FabricRuntime';
import { FabricRuntimeRegistryEntry } from '../../src/fabric/FabricRuntimeRegistryEntry';
import { FabricGatewayRegistryEntry } from '../../src/fabric/FabricGatewayRegistryEntry';
import { ExtensionUtil } from '../../src/util/ExtensionUtil';
import { TestUtil } from '../TestUtil';
import { FabricRuntimeConnection } from '../../src/fabric/FabricRuntimeConnection';
import { IFabricConnection } from '../../src/fabric/IFabricConnection';
import { FabricConnectionFactory } from '../../src/fabric/FabricConnectionFactory';

import * as chai from 'chai';
import * as sinon from 'sinon';
import { FabricWallet } from '../../src/fabric/FabricWallet';
import { FabricWalletGenerator } from '../../src/fabric/FabricWalletGenerator';
import * as vscode from 'vscode';

chai.should();

// tslint:disable no-unused-expression
describe('FabricRuntimeManager', () => {

    const connectionRegistry: FabricGatewayRegistry = FabricGatewayRegistry.instance();
    const runtimeRegistry: FabricRuntimeRegistry = FabricRuntimeRegistry.instance();
    const runtimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
    let connection: sinon.SinonStubbedInstance<FabricRuntimeConnection>;

    let sandbox: sinon.SinonSandbox;

    before(async () => {
        await TestUtil.storeGatewaysConfig();
        await TestUtil.storeRuntimesConfig();
    });

    after(async () => {
        await TestUtil.restoreGatewaysConfig();
        await TestUtil.restoreRuntimesConfig();
    });

    beforeEach(async () => {
        sandbox = sinon.createSandbox();
        await ExtensionUtil.activateExtension();
        await connectionRegistry.clear();
        await runtimeRegistry.clear();
        await runtimeManager.clear();
        connection = sinon.createStubInstance(FabricRuntimeConnection);

    });

    afterEach(async () => {
        sandbox.restore();
        await connectionRegistry.clear();
        await runtimeRegistry.clear();
        await runtimeManager.clear();
    });

    describe('getConnection', () => {
        it('should return the connection if there is a connection', async () => {
            runtimeManager['connection'] = connection;

            const result: IFabricConnection = await runtimeManager.getConnection();
            result.should.deep.equal(connection);
        });

        it('should connect if not connection', async () => {
            runtimeManager['connection'] = undefined;
            await runtimeManager.add('local_fabric');
            const runtime: FabricRuntime = runtimeManager.get('local_fabric');
            sandbox.stub(runtime, 'getConnectionProfile');
            sandbox.stub(runtimeManager, 'get').returns(runtime);
            sandbox.stub(runtime, 'startLogs');
            connection.connect.resolves();
            sandbox.stub(FabricConnectionFactory, 'createFabricRuntimeConnection').returns(connection);
            const walletStub: sinon.SinonStubbedInstance<FabricWallet> = sinon.createStubInstance(FabricWallet);
            walletStub.importIdentity.resolves();
            sandbox.stub(FabricWalletGenerator.instance(), 'createLocalWallet').resolves(walletStub);

            const result: IFabricConnection = await runtimeManager.getConnection();
            connection.connect.should.have.been.calledWith(sinon.match.instanceOf(FabricWallet), 'Admin@org1.example.com');
            runtime.startLogs.should.have.been.called;
            result.should.deep.equal(connection);
        });
    });

    describe('#getAll', () => {

        it('should get no runtimes if no runtimes exist', async () => {
            const testEntries: FabricRuntime[] = [];
            runtimeManager.getAll().should.deep.equal([]);
        });

        it('should get all runtimes if some runtimes exist', async () => {
            const testEntries: FabricRuntimeRegistryEntry[] = [{ name: 'runtime1', developmentMode: true }, { name: 'runtime2', developmentMode: false }];
            await runtimeRegistry.add(testEntries[0]);
            await runtimeRegistry.add(testEntries[1]);
            const runtimes: FabricRuntime[] = runtimeManager.getAll();
            runtimes.should.have.lengthOf(2);
            runtimes[0].getName().should.equal(testEntries[0].name);
            runtimes[0].isDevelopmentMode().should.equal(testEntries[0].developmentMode);
            runtimes[1].getName().should.equal(testEntries[1].name);
            runtimes[1].isDevelopmentMode().should.equal(testEntries[1].developmentMode);
        });

        it('should get all runtimes if they are already cached', async () => {
            const testEntries: FabricRuntimeRegistryEntry[] = [{ name: 'runtime1', developmentMode: true }, { name: 'runtime2', developmentMode: false }];
            await runtimeRegistry.add(testEntries[0]);
            await runtimeRegistry.add(testEntries[1]);
            const runtimes1: FabricRuntime[] = runtimeManager.getAll();
            runtimes1.should.have.lengthOf(2);
            const runtimes2: FabricRuntime[] = runtimeManager.getAll();
            runtimes2.should.have.lengthOf(2);
            runtimes1[0].should.equal(runtimes2[0]);
            runtimes1[1].should.equal(runtimes2[1]);
        });

    });

    describe('#get', () => {

        it('should throw if the specified runtime does not exist', async () => {
            ((): any => {
                runtimeManager.get('runtime0');
            }).should.throw(/Entry "runtime0" in Fabric registry "fabric.runtimes" does not exist/);
        });

        it('should get the runtime if it exists', async () => {
            const testEntries: FabricRuntimeRegistryEntry[] = [{ name: 'runtime1', developmentMode: true }, { name: 'runtime2', developmentMode: false }];
            await runtimeRegistry.add(testEntries[0]);
            await runtimeRegistry.add(testEntries[1]);
            const runtime: FabricRuntime = runtimeManager.get('runtime2');
            runtime.getName().should.equal(testEntries[1].name);
            runtime.isDevelopmentMode().should.equal(testEntries[1].developmentMode);
        });

        it('should get the runtime if it is already cached', async () => {
            const testEntries: FabricRuntimeRegistryEntry[] = [{ name: 'runtime1', developmentMode: true }, { name: 'runtime2', developmentMode: false }];
            await runtimeRegistry.add(testEntries[0]);
            await runtimeRegistry.add(testEntries[1]);
            const runtime1: FabricRuntime = runtimeManager.get('runtime2');
            const runtime2: FabricRuntime = runtimeManager.get('runtime2');
            runtime1.should.equal(runtime2);
        });

    });

    describe('#exists', () => {

        it('should return true if the specified runtime exists', async () => {
            const testEntries: FabricRuntimeRegistryEntry[] = [{ name: 'runtime1', developmentMode: true }, { name: 'runtime2', developmentMode: false }];
            await runtimeRegistry.add(testEntries[0]);
            await runtimeRegistry.add(testEntries[1]);
            runtimeManager.exists('runtime2').should.be.true;
        });

        it('should return false if the specified runtime does not exist', async () => {
            const testEntries: FabricRuntimeRegistryEntry[] = [{ name: 'runtime1', developmentMode: true }, { name: 'runtime2', developmentMode: false }];
            await runtimeRegistry.add(testEntries[0]);
            await runtimeRegistry.add(testEntries[1]);
            runtimeManager.exists('runtime0').should.be.false;
        });

    });

    describe('#add', () => {

        it('should throw if the specified runtime already exists in the runtime registry', async () => {
            const testRuntimeEntry: FabricRuntimeRegistryEntry = { name: 'runtime1', developmentMode: true };
            await runtimeRegistry.add(testRuntimeEntry);
            await runtimeManager.add('runtime1').should.be.rejectedWith(/Entry "runtime1" in Fabric registry "fabric.runtimes" already exists/);

        });

        it('should throw if the specified runtime already exists in the connection registry', async () => {
            await runtimeManager.add('runtime1');
            await runtimeManager.add('runtime1').should.be.rejectedWith(/Entry "runtime1" in Fabric registry "fabric.runtimes" already exists/);
        });

        it('should add the specified runtime if it does not exist', async () => {
            sandbox.stub(FabricRuntimeManager, 'findFreePort').withArgs(17050, null, null, 7).resolves([17050, 17051, 17052, 17053, 17054, 17055, 17056]);
            await runtimeManager.add('runtime1');
            runtimeRegistry.get('runtime1').should.deep.equal({
                name: 'runtime1',
                developmentMode: false,
                ports: {
                    certificateAuthority: 17054,
                    couchDB: 17055,
                    orderer: 17050,
                    peerChaincode: 17052,
                    peerEventHub: 17053,
                    peerRequest: 17051,
                    logs: 17056
                }
            });
            const runtime: FabricRuntime = runtimeManager.get('runtime1');
            runtime.getName().should.equal('runtime1');
            runtime.isDevelopmentMode().should.be.false;
        });

        it('should add the specified runtime using a base port higher than one existing runtime', async () => {
            await runtimeRegistry.add({
                name: 'runtimeA',
                developmentMode: false,
                ports: {
                    certificateAuthority: 17054,
                    couchDB: 17055,
                    orderer: 17050,
                    peerChaincode: 17052,
                    peerEventHub: 17053,
                    peerRequest: 17051,
                    logs: 17056
                }
            });
            sandbox.stub(FabricRuntimeManager, 'findFreePort').withArgs(17057, null, null, 7).resolves([17057, 17058, 17059, 17060, 17061, 17062, 17063]);
            await runtimeManager.add('runtime1');
            runtimeRegistry.get('runtime1').should.deep.equal({
                name: 'runtime1',
                developmentMode: false,
                ports: {
                    certificateAuthority: 17061,
                    couchDB: 17062,
                    orderer: 17057,
                    peerChaincode: 17059,
                    peerEventHub: 17060,
                    peerRequest: 17058,
                    logs: 17063
                }
            });
            const runtime: FabricRuntime = runtimeManager.get('runtime1');
            runtime.getName().should.equal('runtime1');
            runtime.isDevelopmentMode().should.be.false;
        });

        it('should add the specified runtime using a base port higher than two existing runtimes', async () => {
            await runtimeRegistry.add({
                name: 'runtimeA',
                developmentMode: false,
                ports: {
                    certificateAuthority: 7054,
                    couchDB: 7055,
                    orderer: 7050,
                    peerChaincode: 7052,
                    peerEventHub: 7053,
                    peerRequest: 7051,
                    logs: 80
                }
            });
            await runtimeRegistry.add({
                name: 'runtimeB',
                developmentMode: false,
                ports: {
                    certificateAuthority: 17054,
                    couchDB: 17055,
                    orderer: 17050,
                    peerChaincode: 17052,
                    peerEventHub: 17053,
                    peerRequest: 17051,
                    logs: 17056
                }
            });
            sandbox.stub(FabricRuntimeManager, 'findFreePort').withArgs(17057, null, null, 7).resolves([17057, 17058, 17059, 17060, 17061, 17062, 17063]);
            await runtimeManager.add('runtime1');
            runtimeRegistry.get('runtime1').should.deep.equal({
                name: 'runtime1',
                developmentMode: false,
                ports: {
                    certificateAuthority: 17061,
                    couchDB: 17062,
                    orderer: 17057,
                    peerChaincode: 17059,
                    peerEventHub: 17060,
                    peerRequest: 17058,
                    logs: 17063
                }
            });
            const runtime: FabricRuntime = runtimeManager.get('runtime1');
            runtime.getName().should.equal('runtime1');
            runtime.isDevelopmentMode().should.be.false;
        });

    });

    describe('#delete', () => {

        it('should throw if the specified runtime does not exist', async () => {
            await runtimeManager.delete('runtime0').should.be.rejectedWith(/Entry "runtime0" in Fabric registry "fabric.runtimes" does not exist/);
        });

        it('should delete the runtime if it exists', async () => {
            const testRuntimeEntry: FabricRuntimeRegistryEntry = { name: 'runtime1', developmentMode: true };
            await runtimeRegistry.add(testRuntimeEntry);
            const testConnectionEntry: FabricGatewayRegistryEntry = {
                name: 'runtime1',
                connectionProfilePath: '/tmp/connection.json',
                walletPath: 'tmp/wallet',
                managedRuntime: false
            };
            await connectionRegistry.add(testConnectionEntry);
            await runtimeManager.delete('runtime1');
            runtimeRegistry.exists('runtime1').should.be.false;
            connectionRegistry.exists('runtime1').should.be.false;
        });

        it('should delete the runtime if it exists in the runtime registry but not the connection registry', async () => {
            const testRuntimeEntry: FabricRuntimeRegistryEntry = { name: 'runtime1', developmentMode: true };
            await runtimeRegistry.add(testRuntimeEntry);
            await runtimeManager.delete('runtime1');
            runtimeRegistry.exists('runtime1').should.be.false;
            connectionRegistry.exists('runtime1').should.be.false;
        });

    });

    describe('#migrate', () => {

        it('should do nothing if there are no existing runtimes', async () => {
            sandbox.stub(FabricRuntimeManager, 'findFreePort').rejects(new Error('such error'));
            runtimeManager.getAll().should.have.lengthOf(0);
            await runtimeManager.migrate();
            runtimeManager.getAll().should.have.lengthOf(0);
        });

        it('should do nothing if an existing runtime has a port configuration', async () => {
            sandbox.stub(FabricRuntimeManager, 'findFreePort').rejects(new Error('such error'));
            await runtimeRegistry.add({
                name: 'runtime1',
                developmentMode: false,
                ports: {
                    certificateAuthority: 17054,
                    couchDB: 17055,
                    orderer: 17050,
                    peerChaincode: 17052,
                    peerEventHub: 17053,
                    peerRequest: 17051,
                    logs: 17056
                }
            });
            await runtimeManager.migrate();
            runtimeRegistry.get('runtime1').should.deep.equal({
                name: 'runtime1',
                developmentMode: false,
                ports: {
                    certificateAuthority: 17054,
                    couchDB: 17055,
                    orderer: 17050,
                    peerChaincode: 17052,
                    peerEventHub: 17053,
                    peerRequest: 17051,
                    logs: 17056
                }
            });
        });

        it('should add a port configuration to an existing runtime without one', async () => {
            sandbox.stub(FabricRuntimeManager, 'findFreePort').withArgs(17050, null, null, 7).resolves([17050, 17051, 17052, 17053, 17054, 17055, 17056]);
            await runtimeRegistry.add({
                name: 'runtime1',
                developmentMode: false
            });
            await runtimeManager.migrate();
            runtimeRegistry.get('runtime1').should.deep.equal({
                name: 'runtime1',
                developmentMode: false,
                ports: {
                    certificateAuthority: 17054,
                    couchDB: 17055,
                    orderer: 17050,
                    peerChaincode: 17052,
                    peerEventHub: 17053,
                    peerRequest: 17051,
                    logs: 17056
                }
            });
        });

        it('should update if doesn\'t have logs section', async () => {
            sandbox.stub(FabricRuntimeManager, 'findFreePort').withArgs(17056, null, null, 7).resolves([17056, 17057, 17058, 17059, 17060, 17061, 17062]);

            const entry: any = [
                {
                    name: 'runtime1',
                    developmentMode: false,
                    ports: {
                        certificateAuthority: 17054,
                        couchDB: 17055,
                        orderer: 17050,
                        peerChaincode: 17052,
                        peerEventHub: 17053,
                        peerRequest: 17051
                    }
                }
            ];

            await vscode.workspace.getConfiguration().update('fabric.runtimes', entry, vscode.ConfigurationTarget.Global);

            await runtimeManager.migrate();
            runtimeRegistry.get('runtime1').should.deep.equal({
                name: 'runtime1',
                developmentMode: false,
                ports: {
                    certificateAuthority: 17060,
                    couchDB: 17061,
                    orderer: 17056,
                    peerChaincode: 17058,
                    peerEventHub: 17059,
                    peerRequest: 17057,
                    logs: 17062
                }
            });
        });
    });
});
