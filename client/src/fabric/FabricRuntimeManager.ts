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

import { FabricRuntime } from './FabricRuntime';
import { FabricRuntimeRegistry } from './FabricRuntimeRegistry';
import { FabricRuntimeRegistryEntry } from './FabricRuntimeRegistryEntry';
import { FabricConnectionRegistry } from './FabricConnectionRegistry';
import { FabricRuntimeRegistryPorts } from './FabricRuntimeRegistryPorts';
import { IFabricConnection } from './IFabricConnection';
import { FabricConnectionFactory } from './FabricConnectionFactory';
import { IFabricWallet } from './IFabricWallet';
import { FabricWalletGeneratorFactory } from './FabricWalletGeneratorFactory';

export class FabricRuntimeManager {

    public static findFreePort: any = require('find-free-port');

    public static instance(): FabricRuntimeManager {
        return this._instance;
    }

    private static _instance: FabricRuntimeManager = new FabricRuntimeManager();

    private connectionRegistry: FabricConnectionRegistry = FabricConnectionRegistry.instance();
    private runtimeRegistry: FabricRuntimeRegistry = FabricRuntimeRegistry.instance();
    private runtimes: Map<string, FabricRuntime> = new Map<string, FabricRuntime>();

    private connection: IFabricConnection;

    private constructor() {
    }

    public async getConnection(): Promise<IFabricConnection> {
        if (this.connection) {
            return this.connection;
        }

        const runtime: FabricRuntime = this.get('local_fabric');
        this.connection = FabricConnectionFactory.createFabricRuntimeConnection(runtime);
        const runtimeWallet: IFabricWallet = await FabricWalletGeneratorFactory.createFabricWalletGenerator().createLocalWallet(runtime.getName());
        const connectionProfile: any = await runtime.getConnectionProfile();
        const certificate: string = await runtime.getCertificate();
        const privateKey: string = await runtime.getPrivateKey();
        const identityName: string = 'Admin@org1.example.com';
        await runtimeWallet.importIdentity(connectionProfile, certificate, privateKey, identityName);
        await this.connection.connect(runtimeWallet, 'Admin@org1.example.com');

        return this.connection;
    }

    public getAll(): FabricRuntime[] {
        const runtimeRegistryEntries: FabricRuntimeRegistryEntry[] = this.runtimeRegistry.getAll();
        return runtimeRegistryEntries.map((runtimeRegistryEntry: FabricRuntimeRegistryEntry) => {
            const name: string = runtimeRegistryEntry.name;
            let runtime: FabricRuntime = this.runtimes.get(name);
            if (!runtime) {
                runtime = new FabricRuntime(runtimeRegistryEntry);
                this.runtimes.set(name, runtime);
            }
            return runtime;
        });
    }

    public get(name: string): FabricRuntime {
        const runtimeRegistryEntry: FabricRuntimeRegistryEntry = this.runtimeRegistry.get(name);
        let runtime: FabricRuntime = this.runtimes.get(name);
        if (!runtime) {
            runtime = new FabricRuntime(runtimeRegistryEntry);
            this.runtimes.set(name, runtime);
        }
        return runtime;
    }

    public exists(name: string): boolean {
        return this.runtimeRegistry.exists(name);
    }

    public async add(name: string): Promise<void> {

        // Generate a range of ports for this Fabric runtime.
        const ports: FabricRuntimeRegistryPorts = await this.generatePortConfiguration();

        // Add the Fabric runtime to the runtime registry.
        const runtimeRegistryEntry: FabricRuntimeRegistryEntry = new FabricRuntimeRegistryEntry();
        runtimeRegistryEntry.name = name;
        runtimeRegistryEntry.developmentMode = false;
        runtimeRegistryEntry.ports = ports;
        await this.runtimeRegistry.add(runtimeRegistryEntry);

        // Add the Fabric runtime to the internal cache.
        const runtime: FabricRuntime = new FabricRuntime(runtimeRegistryEntry);
        this.runtimes.set(name, runtime);

    }

    public async delete(name: string): Promise<void> {

        // Remove the Fabric runtime.
        await this.runtimeRegistry.delete(name);

        // Remove the Fabric connection.
        if (this.connectionRegistry.exists(name)) {
            await this.connectionRegistry.delete(name);
        }

        // Delete the Fabric runtime from the internal cache.
        this.runtimes.delete(name);

    }

    public async clear(): Promise<void> {
        this.runtimes.clear();
    }

    public async migrate(): Promise<void> {
        const runtimeRegistryEntries: FabricRuntimeRegistryEntry[] = this.runtimeRegistry.getAll();
        for (const runtimeRegistryEntry of runtimeRegistryEntries) {
            if (!runtimeRegistryEntry.ports) {
                runtimeRegistryEntry.ports = await this.generatePortConfiguration();
            }
            await this.runtimeRegistry.update(runtimeRegistryEntry);
        }
    }

    private async generatePortConfiguration(): Promise<FabricRuntimeRegistryPorts> {
        const startPort: number = this.getStartPort();
        const ports: FabricRuntimeRegistryPorts = new FabricRuntimeRegistryPorts();
        const [
            orderer,
            peerRequest,
            peerChaincode,
            peerEventHub,
            certificateAuthority,
            couchDB
        ]: number[] = await FabricRuntimeManager.findFreePort(startPort, null, null, 6);
        ports.orderer = orderer;
        ports.peerRequest = peerRequest;
        ports.peerChaincode = peerChaincode;
        ports.peerEventHub = peerEventHub;
        ports.certificateAuthority = certificateAuthority;
        ports.couchDB = couchDB;
        return ports;
    }

    private getStartPort(): number {
        let startPort: number = 17050;
        const runtimeRegistryEntries: FabricRuntimeRegistryEntry[] = this.runtimeRegistry.getAll();
        for (const runtimeRegistryEntry of runtimeRegistryEntries) {
            if (!runtimeRegistryEntry.ports) {
                continue;
            }
            const highestPort: number = this.getHighestPort(runtimeRegistryEntry.ports);
            if (highestPort > startPort) {
                startPort = highestPort + 1;
            }
        }
        return startPort;
    }

    private getHighestPort(ports: FabricRuntimeRegistryPorts): number {
        let port: number = 0;
        const portNames: string[] = Object.keys(ports);
        for (const portName of portNames) {
            const thisPort: number = ports[portName];
            if (thisPort > port) {
                port = thisPort;
            }
        }
        return port;
    }

}
