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

import { FabricRuntime, FabricRuntimeState } from './FabricRuntime';
import { FabricRuntimeRegistry } from './FabricRuntimeRegistry';
import { FabricRuntimeRegistryEntry } from './FabricRuntimeRegistryEntry';
import { FabricGatewayRegistry } from './FabricGatewayRegistry';
import { FabricRuntimeRegistryPorts } from './FabricRuntimeRegistryPorts';
import { IFabricConnection } from './IFabricConnection';
import { FabricConnectionFactory } from './FabricConnectionFactory';
import { IFabricWallet } from './IFabricWallet';
import { FabricWalletGeneratorFactory } from './FabricWalletGeneratorFactory';
import { VSCodeBlockchainDockerOutputAdapter } from '../logging/VSCodeBlockchainDockerOutputAdapter';
import { IFabricWalletGenerator } from './IFabricWalletGenerator';

export class FabricRuntimeManager {

    public static findFreePort: any = require('find-free-port');

    public static instance(): FabricRuntimeManager {
        return this._instance;
    }

    private static _instance: FabricRuntimeManager = new FabricRuntimeManager();

    private connectionRegistry: FabricGatewayRegistry = FabricGatewayRegistry.instance();
    private runtimeRegistry: FabricRuntimeRegistry = FabricRuntimeRegistry.instance();
    private runtimes: Map<string, FabricRuntime> = new Map<string, FabricRuntime>();

    private connection: IFabricConnection;

    private connectingPromise: Promise<IFabricConnection>;

    private constructor() {
    }

    public async getConnection(): Promise<IFabricConnection> {
        if (this.connectingPromise) {
            return this.connectingPromise;
        }

        if (this.connection) {
            return this.connection;
        }

        this.connectingPromise = this.getConnectionInner().then((connection: IFabricConnection) => {
            this.connectingPromise = undefined;
            return connection;
        });

        return this.connectingPromise;
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
            // logs was added after so could have been migrated but not have been set
            if (!runtimeRegistryEntry.ports || !runtimeRegistryEntry.ports.logs) {
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
            couchDB,
            logs
        ]: number[] = await FabricRuntimeManager.findFreePort(startPort, null, null, 7);
        ports.orderer = orderer;
        ports.peerRequest = peerRequest;
        ports.peerChaincode = peerChaincode;
        ports.peerEventHub = peerEventHub;
        ports.certificateAuthority = certificateAuthority;
        ports.couchDB = couchDB;
        ports.logs = logs;
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

    private async getConnectionInner(): Promise<IFabricConnection> {
        const identityName: string = 'Admin@org1.example.com';
        const mspid: string = 'Org1MSP';
        const enrollmentID: string = 'admin';
        const enrollmentSecret: string = 'adminpw';

        const runtime: FabricRuntime = this.get('local_fabric');
        // register for events to disconnect
        runtime.on('busy', () => {
            if (runtime.getState() === FabricRuntimeState.STOPPED) {
                if (this.connection) {
                    this.connection.disconnect();
                }

                this.connection = undefined;
            }
        });

        const connection: IFabricConnection = FabricConnectionFactory.createFabricRuntimeConnection(runtime);
        const fabricWalletGenerator: IFabricWalletGenerator = FabricWalletGeneratorFactory.createFabricWalletGenerator();

        // our secret wallet
        const runtimeWallet: IFabricWallet = await fabricWalletGenerator.createLocalWallet(runtime.getName() + '-ops');

        const adminExists: boolean = await runtimeWallet.exists(identityName);

        if (!adminExists) {
            const certificate: string = await runtime.getCertificate();
            const privateKey: string = await runtime.getPrivateKey();
            await runtimeWallet.importIdentity(certificate, privateKey, identityName, mspid);
        }

        await connection.connect(runtimeWallet, identityName);

        // enroll a user
        const gatewayWallet: IFabricWallet = await fabricWalletGenerator.createLocalWallet(runtime.getName());

        const otherAdminExists: boolean = await gatewayWallet.exists(identityName);

        if (!otherAdminExists) {
            const enrollment: { certificate: string, privateKey: string } = await connection.enroll(enrollmentID, enrollmentSecret);
            gatewayWallet.importIdentity(enrollment.certificate, enrollment.privateKey, identityName, mspid);
        }

        const outputAdapter: VSCodeBlockchainDockerOutputAdapter = VSCodeBlockchainDockerOutputAdapter.instance();
        await runtime.startLogs(outputAdapter);

        this.connection = connection;
        return this.connection;
    }
}
