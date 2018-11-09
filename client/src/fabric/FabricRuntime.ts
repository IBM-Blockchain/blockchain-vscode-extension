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

import * as path from 'path';
import * as fs from 'fs-extra';
import { FabricRuntimeRegistryEntry } from './FabricRuntimeRegistryEntry';
import { FabricRuntimeRegistry } from './FabricRuntimeRegistry';
import { OutputAdapter } from '../logging/OutputAdapter';
import { ConsoleOutputAdapter } from '../logging/ConsoleOutputAdapter';
import { CommandUtil } from '../util/CommandUtil';
import { EventEmitter } from 'events';
import { Docker, ContainerPorts } from '../docker/Docker';
import * as vscode from 'vscode';
import { UserInputUtil } from '../commands/UserInputUtil';

const basicNetworkPath: string = path.resolve(__dirname, '..', '..', '..', 'basic-network');
const basicNetworkConnectionProfilePath: string = path.resolve(basicNetworkPath, 'connection.json');
const basicNetworkConnectionProfile: string = JSON.parse(fs.readFileSync(basicNetworkConnectionProfilePath).toString());
const basicNetworkAdminPath: string = path.resolve(basicNetworkPath, 'crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com');
const basicNetworkAdminCertificatePath: string = path.resolve(basicNetworkAdminPath, 'msp/signcerts/Admin@org1.example.com-cert.pem');
const basicNetworkAdminCertificate: string = fs.readFileSync(basicNetworkAdminCertificatePath, 'utf8');
const basicNetworkAdminPrivateKeyPath: string = path.resolve(basicNetworkAdminPath, 'msp/keystore/cd96d5260ad4757551ed4a5a991e62130f8008a0bf996e4e4b84cd097a747fec_sk');
const basicNetworkAdminPrivateKey: string = fs.readFileSync(basicNetworkAdminPrivateKeyPath, 'utf8');

export class FabricRuntime extends EventEmitter {

    private runtimeRegistry: FabricRuntimeRegistry = FabricRuntimeRegistry.instance();
    private docker: Docker;
    private name: string;
    private busy: boolean = false;

    constructor(private runtimeRegistryEntry: FabricRuntimeRegistryEntry) {
        super();
        this.name = runtimeRegistryEntry.name;
        this.docker = new Docker(this.name);
    }

    public getName(): string {
        return this.name;
    }

    public isBusy(): boolean {
        return this.busy;
    }

    public async start(outputAdapter?: OutputAdapter): Promise<void> {
        try {
            this.setBusy(true);
            await this.startInner(outputAdapter);
        } finally {
            this.setBusy(false);
        }
    }

    public async stop(outputAdapter?: OutputAdapter): Promise<void> {
        try {
            this.setBusy(true);
            await this.stopInner(outputAdapter);
        } finally {
            this.setBusy(false);
        }
    }

    public async teardown(outputAdapter?: OutputAdapter): Promise<void> {
        try {
            this.setBusy(true);
            await this.teardownInner(outputAdapter);
        } finally {
            this.setBusy(false);
        }
    }

    public async restart(outputAdapter?: OutputAdapter): Promise<void> {
        try {
            this.setBusy(true);
            await this.stopInner(outputAdapter);
            await this.startInner(outputAdapter);
        } finally {
            this.setBusy(false);
        }
    }

    public async getConnectionProfile(): Promise<object> {
        const containerPrefix: string = this.docker.getContainerPrefix();
        const connectionProfile: any = basicNetworkConnectionProfile;
        const peerPorts: ContainerPorts = await this.docker.getContainerPorts(`${containerPrefix}_peer0.org1.example.com_1`);
        const peerRequestHost: string = Docker.fixHost(peerPorts['7051/tcp'][0].HostIp);
        const peerRequestPort: string = peerPorts['7051/tcp'][0].HostPort;
        const peerEventHost: string = Docker.fixHost(peerPorts['7053/tcp'][0].HostIp);
        const peerEventPort: string = peerPorts['7053/tcp'][0].HostPort;
        const ordererPorts: ContainerPorts = await this.docker.getContainerPorts(`${containerPrefix}_orderer.example.com_1`);
        const ordererHost: string = Docker.fixHost(ordererPorts['7050/tcp'][0].HostIp);
        const ordererPort: string = ordererPorts['7050/tcp'][0].HostPort;
        const caPorts: ContainerPorts = await this.docker.getContainerPorts(`${containerPrefix}_ca.example.com_1`);
        const caHost: string = Docker.fixHost(caPorts['7054/tcp'][0].HostIp);
        const caPort: string = caPorts['7054/tcp'][0].HostPort;
        connectionProfile.peers['peer0.org1.example.com'].url = `grpc://${peerRequestHost}:${peerRequestPort}`;
        connectionProfile.peers['peer0.org1.example.com'].eventUrl = `grpc://${peerEventHost}:${peerEventPort}`;
        connectionProfile.orderers['orderer.example.com'].url = `grpc://${ordererHost}:${ordererPort}`;
        connectionProfile.certificateAuthorities['ca.org1.example.com'].url = `http://${caHost}:${caPort}`;
        return connectionProfile;
    }

    public async getCertificate(): Promise<string> {
        return basicNetworkAdminCertificate;
    }

    public getCertificatePath(): string {
        return basicNetworkAdminCertificatePath;
    }

    public async getPrivateKey(): Promise<string> {
        return basicNetworkAdminPrivateKey;
    }

    public getPrivateKeyPath(): string {
        return basicNetworkAdminPrivateKeyPath;
    }

    public async isCreated(): Promise<boolean> {
        const containerPrefix: string = this.docker.getContainerPrefix();
        const created: boolean[] = await Promise.all([
            this.docker.doesVolumeExist(`${containerPrefix}_peer0.org1.example.com`),
            this.docker.doesVolumeExist(`${containerPrefix}_orderer.example.com`),
            this.docker.doesVolumeExist(`${containerPrefix}_ca.example.com`),
            this.docker.doesVolumeExist(`${containerPrefix}_couchdb`),
        ]);
        return created.some((value: boolean) => value === true);
    }

    public async isRunning(): Promise<boolean> {
        const containerPrefix: string = this.docker.getContainerPrefix();
        const running: boolean[] = await Promise.all([
            this.docker.isContainerRunning(`${containerPrefix}_peer0.org1.example.com_1`),
            this.docker.isContainerRunning(`${containerPrefix}_orderer.example.com_1`),
            this.docker.isContainerRunning(`${containerPrefix}_ca.example.com_1`),
            this.docker.isContainerRunning(`${containerPrefix}_couchdb_1`)
        ]);
        return !running.some((value: boolean) => value === false);
    }

    public isDevelopmentMode(): boolean {
        return this.runtimeRegistryEntry.developmentMode;
    }

    public async setDevelopmentMode(developmentMode: boolean): Promise<void> {
        this.runtimeRegistryEntry.developmentMode = developmentMode;
        await this.runtimeRegistry.update(this.runtimeRegistryEntry);
    }

    public async getChaincodeAddress(): Promise<string> {
        const prefix: string = this.docker.getContainerPrefix();
        const peerPorts: ContainerPorts = await this.docker.getContainerPorts(`${prefix}_peer0.org1.example.com_1`);
        const peerRequestHost: string = Docker.fixHost(peerPorts['7052/tcp'][0].HostIp);
        const peerRequestPort: string = peerPorts['7052/tcp'][0].HostPort;
        return `${peerRequestHost}:${peerRequestPort}`;
    }

    private setBusy(busy: boolean): void {
        this.busy = busy;
        this.emit('busy', busy);
    }

    private async startInner(outputAdapter?: OutputAdapter): Promise<void> {
        await this.execute('start', outputAdapter);
        await this.writeConnectionDetailsToDisk();
    }

    private async stopInner(outputAdapter?: OutputAdapter): Promise<void> {
        await this.execute('stop', outputAdapter);
    }

    private async teardownInner(outputAdapter?: OutputAdapter): Promise<void> {
        await this.execute('teardown', outputAdapter);
    }

    private async execute(script: string, outputAdapter?: OutputAdapter): Promise<void> {
        if (!outputAdapter) {
            outputAdapter = ConsoleOutputAdapter.instance();
        }

        const env: any = Object.assign({}, process.env, {
            COMPOSE_PROJECT_NAME: this.docker.getContainerPrefix(),
            CORE_CHAINCODE_MODE: this.runtimeRegistryEntry.developmentMode ? 'dev' : 'net'
        });

        if (process.platform === 'win32') {
            await CommandUtil.sendCommandWithOutput('cmd', ['/c', `${script}.cmd`], basicNetworkPath, env, outputAdapter);
        } else {
            await CommandUtil.sendCommandWithOutput('/bin/sh', [`${script}.sh`], basicNetworkPath, env, outputAdapter);
        }
    }

    private async writeConnectionDetailsToDisk(): Promise<void> {

        const certificate: string = await this.getCertificate();
        const privateKey: string = await this.getPrivateKey();
        const connectionProfileObj: any = await this.getConnectionProfile();
        const connectionProfile: string = JSON.stringify(connectionProfileObj, null, 4);

        const extDir: string = vscode.workspace.getConfiguration().get('blockchain.ext.directory');
        const homeExtDir: string = await UserInputUtil.getDirPath(extDir);
        const runtimeDir: string = path.join(homeExtDir, this.name);

        const connectionProfilePath: string = path.join(runtimeDir, 'connection.json');
        const certificatePath: string = path.join(runtimeDir, 'certificate');
        const privateKeyPath: string = path.join(runtimeDir, 'privateKey');

        try {
            await fs.ensureFileSync(connectionProfilePath);
            await fs.ensureFileSync(certificatePath);
            await fs.ensureFileSync(privateKeyPath);
            await fs.writeFileSync(connectionProfilePath, connectionProfile);
            await fs.writeFileSync(certificatePath, certificate);
            await fs.writeFileSync(privateKeyPath, privateKey);
        } catch (error) {
            vscode.window.showErrorMessage('Issue saving runtime connection details in extension directory with error: ' + error.message);
        }

    }

}
