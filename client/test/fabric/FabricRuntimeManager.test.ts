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
import { FabricConnectionRegistry } from '../../src/fabric/FabricConnectionRegistry';
import { FabricRuntimeManager } from '../../src/fabric/FabricRuntimeManager';
import { FabricRuntimeRegistry } from '../../src/fabric/FabricRuntimeRegistry';

import * as chai from 'chai';
import { FabricRuntime } from '../../src/fabric/FabricRuntime';
import { FabricRuntimeRegistryEntry } from '../../src/fabric/FabricRuntimeRegistryEntry';
import { FabricConnectionRegistryEntry } from '../../src/fabric/FabricConnectionRegistryEntry';
import { ExtensionUtil } from '../../src/util/ExtensionUtil';

chai.should();

// tslint:disable no-unused-expression
describe('FabricRuntimeManager', () => {

    const connectionRegistry: FabricConnectionRegistry = FabricConnectionRegistry.instance();
    const runtimeRegistry: FabricRuntimeRegistry = FabricRuntimeRegistry.instance();
    const runtimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();

    beforeEach(async () => {
        await ExtensionUtil.activateExtension();
        await connectionRegistry.clear();
        await runtimeRegistry.clear();
        await runtimeManager.clear();
    });

    afterEach(async () => {
        await connectionRegistry.clear();
        await runtimeRegistry.clear();
        await runtimeManager.clear();
    });

    describe('#getAll', () => {

        it('should get no runtimes if no runtimes exist', async () => {
            const testEntries: FabricRuntime[] = [];
            runtimeManager.getAll().should.deep.equal([]);
        });

        it('should get all runtimes if some runtimes exist', async () => {
            const testEntries: FabricRuntimeRegistryEntry[] = [{ name: 'runtime1', developmentMode: true}, { name: 'runtime2', developmentMode: false}];
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
            const testEntries: FabricRuntimeRegistryEntry[] = [{ name: 'runtime1', developmentMode: true}, { name: 'runtime2', developmentMode: false}];
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
            (() => {
                runtimeManager.get('runtime0');
            }).should.throw(/Entry "runtime0" in Fabric registry "fabric.runtimes" does not exist/);
        });

        it('should get the runtime if it exists', async () => {
            const testEntries: FabricRuntimeRegistryEntry[] = [{ name: 'runtime1', developmentMode: true}, { name: 'runtime2', developmentMode: false}];
            await runtimeRegistry.add(testEntries[0]);
            await runtimeRegistry.add(testEntries[1]);
            const runtime: FabricRuntime = runtimeManager.get('runtime2');
            runtime.getName().should.equal(testEntries[1].name);
            runtime.isDevelopmentMode().should.equal(testEntries[1].developmentMode);
        });

        it('should get the runtime if it is already cached', async () => {
            const testEntries: FabricRuntimeRegistryEntry[] = [{ name: 'runtime1', developmentMode: true}, { name: 'runtime2', developmentMode: false}];
            await runtimeRegistry.add(testEntries[0]);
            await runtimeRegistry.add(testEntries[1]);
            const runtime1: FabricRuntime = runtimeManager.get('runtime2');
            const runtime2: FabricRuntime = runtimeManager.get('runtime2');
            runtime1.should.equal(runtime2);
        });

    });

    describe('#exists', () => {

        it('should return true if the specified runtime exists', async () => {
            const testEntries: FabricRuntimeRegistryEntry[] = [{ name: 'runtime1', developmentMode: true}, { name: 'runtime2', developmentMode: false}];
            await runtimeRegistry.add(testEntries[0]);
            await runtimeRegistry.add(testEntries[1]);
            runtimeManager.exists('runtime2').should.be.true;
        });

        it('should return false if the specified runtime does not exist', async () => {
            const testEntries: FabricRuntimeRegistryEntry[] = [{ name: 'runtime1', developmentMode: true}, { name: 'runtime2', developmentMode: false}];
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
            const testConnectionEntry: FabricConnectionRegistryEntry = {
                name: 'runtime1',
                connectionProfilePath: '/tmp/connection.json',
                identities: [
                    {
                        certificatePath: '/tmp/cert.pem',
                        privateKeyPath: '/tmp/key.pem'
                    }
                ],
                managedRuntime: false
            };
            await connectionRegistry.add(testConnectionEntry);
            await runtimeManager.add('runtime1').should.be.rejectedWith(/Entry "runtime1" in Fabric registry "fabric.connections" already exists/);
        });

        it('should add the specified runtime if it does not exist', async () => {
            await runtimeManager.add('runtime1');
            runtimeRegistry.get('runtime1').should.deep.equal({
                name: 'runtime1',
                developmentMode: false
            });
            connectionRegistry.get('runtime1').should.deep.equal({
                name: 'runtime1',
                managedRuntime: true
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
            const testConnectionEntry: FabricConnectionRegistryEntry = {
                name: 'runtime1',
                connectionProfilePath: '/tmp/connection.json',
                identities: [
                    {
                        certificatePath: '/tmp/cert.pem',
                        privateKeyPath: '/tmp/key.pem'
                    }
                ],
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

});
