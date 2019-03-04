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
import { FabricRuntime, FabricRuntimeState } from './FabricRuntime';
import { FabricRuntimePorts } from './FabricRuntimePorts';
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

    private runtime: FabricRuntime;

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

    public getRuntime(): FabricRuntime {
        return this.runtime;
    }

    public exists(): boolean {
        return (this.runtime ? true : false);
    }

    public async add(): Promise<void> {

        // Copy old local_fabric runtime to new fabric.runtime setting
        await this.migrate();

        // only generate a range of ports if it doesn't already exist
        const runtimeObject: any = this.readRuntimeUserSettings();
        if (runtimeObject.ports && runtimeObject.developmentMode !== undefined) {
            this.runtime = new FabricRuntime();
            this.runtime.ports = runtimeObject.ports;
            this.runtime.developmentMode = runtimeObject.developmentMode;
        } else {
            // Generate a range of ports for this Fabric runtime.
            const ports: FabricRuntimePorts = await this.generatePortConfiguration();

            // Add the Fabric runtime to the internal cache.
            this.runtime = new FabricRuntime();
            this.runtime.ports = ports;
            this.runtime.developmentMode = false;
            await this.runtime.updateUserSettings();
        }
    }

    private readRuntimeUserSettings(): any {
        const runtimeSettings: any = vscode.workspace.getConfiguration().get('fabric.runtime') as {
            ports: {
                orderer: number,
                peerRequest: number,
                peerChaincode: number,
                peerEventHub: number,
                certificateAuthority: number,
                couchDB: number,
                logs: number
            },
            developmentMode: boolean
        };
        if (runtimeSettings.ports) {
            const runtimeObject: any = {
                ports: {
                    orderer: runtimeSettings.ports.orderer,
                    peerRequest: runtimeSettings.ports.peerRequest,
                    peerChaincode: runtimeSettings.ports.peerChaincode,
                    peerEventHub: runtimeSettings.ports.peerEventHub,
                    certificateAuthority: runtimeSettings.ports.certificateAuthority,
                    couchDB: runtimeSettings.ports.couchDB,
                    logs: runtimeSettings.ports.logs
                },
                developmentMode: runtimeSettings.developmentMode
            };
            return runtimeObject;
        } else {
            return {};
        }
    }

    private async migrate(): Promise<void> {
        const oldRuntimeSettings: any[] = vscode.workspace.getConfiguration().get('fabric.runtimes');
        const runtimeObj: any = await this.readRuntimeUserSettings();
        if (oldRuntimeSettings && !runtimeObj.ports) {
            const runtimeToCopy: any = {
                ports: {},
                developmentMode: false
            };
            for (const oldRuntime of oldRuntimeSettings) {
                if (oldRuntime.name === 'local_fabric') {
                    runtimeToCopy.ports = oldRuntime.ports;
                    runtimeToCopy.developmentMode = oldRuntime.developmentMode;

                    // Generate a logs port
                    const highestPort: number = this.getHighestPort(runtimeToCopy.ports);
                    runtimeToCopy.ports.logs = await this.generateLogsPort(highestPort);

                    // Update the new user settings
                    await vscode.workspace.getConfiguration().update('fabric.runtime', runtimeToCopy, vscode.ConfigurationTarget.Global);
                }
            }
        }

    }

    private async generateLogsPort(highestPort: number): Promise<number> {

        const freep: number[] = await FabricRuntimeManager.findFreePort(highestPort + 1, null, null, 1);

        return freep[0];

    }

    private getHighestPort(ports: FabricRuntimePorts): number {
        let port: number = 17050;
        const portNames: string[] = Object.keys(ports);
        for (const portName of portNames) {
            const thisPort: number = ports[portName];
            if (thisPort > port) {
                port = thisPort;
            }
        }
        return port;
    }

    private async generatePortConfiguration(): Promise<FabricRuntimePorts> {
        const ports: FabricRuntimePorts = new FabricRuntimePorts();
        const [
            orderer,
            peerRequest,
            peerChaincode,
            peerEventHub,
            certificateAuthority,
            couchDB,
            logs
        ]: number[] = await FabricRuntimeManager.findFreePort(17050, null, null, 7);
        ports.orderer = orderer;
        ports.peerRequest = peerRequest;
        ports.peerChaincode = peerChaincode;
        ports.peerEventHub = peerEventHub;
        ports.certificateAuthority = certificateAuthority;
        ports.couchDB = couchDB;
        ports.logs = logs;
        return ports;
    }

    private async getConnectionInner(): Promise<IFabricConnection> {
        const identityName: string = 'Admin@org1.example.com';
        const mspid: string = 'Org1MSP';
        const enrollmentID: string = 'admin';
        const enrollmentSecret: string = 'adminpw';

        const runtime: FabricRuntime = this.getRuntime();
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
            await gatewayWallet.importIdentity(enrollment.certificate, enrollment.privateKey, identityName, mspid);
        }

        const outputAdapter: VSCodeBlockchainDockerOutputAdapter = VSCodeBlockchainDockerOutputAdapter.instance();
        await runtime.startLogs(outputAdapter);

        this.connection = connection;
        return this.connection;
    }
}
