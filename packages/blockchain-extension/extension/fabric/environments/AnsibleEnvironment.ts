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
import * as vscode from 'vscode';
import { FabricRuntimePorts } from './FabricRuntimePorts';
import { CommandUtil } from '../util/CommandUtil';
import * as request from 'request';
import { FabricEnvironmentRegistry, FabricEnvironmentRegistryEntry, FabricIdentity, FabricNode, FabricNodeType, FabricRuntimeUtil, FabricWalletRegistry, FabricWalletRegistryEntry, FabricWalletUtil, FileConfigurations, IFabricWallet, IFabricWalletGenerator, ConsoleOutputAdapter, OutputAdapter } from 'ibm-blockchain-platform-common';
import { FabricGateway } from '../FabricGateway';
import { YeomanUtil } from '../../util/YeomanUtil';
import { FabricWalletGeneratorFactory } from '../FabricWalletGeneratorFactory';
import { SettingConfigurations } from '../../../configurations';
import { FabricEnvironment } from './FabricEnvironment';
import { FileSystemUtil } from '../../util/FileSystemUtil';
import { FabricGatewayRegistryEntry } from '../../registries/FabricGatewayRegistryEntry';
import { FabricGatewayRegistry } from '../../registries/FabricGatewayRegistry';
import { FabricRuntimeState } from '../FabricRuntimeState';

export class AnsibleEnvironment extends FabricEnvironment {

    public ports?: FabricRuntimePorts;

    protected dockerName: string;
    protected busy: boolean = false;
    protected state: FabricRuntimeState;
    protected isRunningPromise: Promise<boolean>;

    protected logsRequest: request.Request;

    constructor(name: string) {
        super(name);
        this.dockerName = `fabricvscodelocalfabric`;
    }

    // Both (?)
    public getDockerName(): string {
        return this.dockerName;
    }

    // Both
    public isBusy(): boolean {
        return this.busy;
    }

    // Both
    public getState(): FabricRuntimeState {
        return this.state;
    }

    // Both
    // when they give directory, there will be a wallets directory
    public async importWalletsAndIdentities(): Promise<void> {

        // Ensure that all wallets are created and populated with identities.
        const fabricWalletGenerator: IFabricWalletGenerator = FabricWalletGeneratorFactory.createFabricWalletGenerator();
        const walletNames: string[] = await this.getWalletNames();
        for (const walletName of walletNames) {
            const exists: boolean = await FabricWalletRegistry.instance().exists(walletName);
            if (!exists) {
                const extDir: string = vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_DIRECTORY);
                const homeExtDir: string = FileSystemUtil.getDirPath(extDir);
                const walletRegistryEntry: FabricWalletRegistryEntry = new FabricWalletRegistryEntry();
                walletRegistryEntry.name = walletName;
                walletRegistryEntry.walletPath = path.join(homeExtDir, FileConfigurations.FABRIC_WALLETS, walletName);
                walletRegistryEntry.managedWallet = true;
                await FabricWalletRegistry.instance().add(walletRegistryEntry);
            } else {
                // Fallback solution if FabricWalletUtil.tidyWalletSettings() fix for "No path for wallet has been provided" doesn't work - https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1593
                // I think the problem occurred because we weren't setting a walletPath or managedWallet in FabricWalletUtil.tidyWalletSettings().
                const walletRegistryEntry: FabricWalletRegistryEntry = await FabricWalletRegistry.instance().get(walletName);
                if (!walletRegistryEntry.walletPath || !walletRegistryEntry.managedWallet) {
                    const extDir: string = vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_DIRECTORY);
                    const homeExtDir: string = FileSystemUtil.getDirPath(extDir);
                    walletRegistryEntry.walletPath = path.join(homeExtDir, FileConfigurations.FABRIC_WALLETS, walletName);
                    walletRegistryEntry.managedWallet = true;
                    await FabricWalletRegistry.instance().update(walletRegistryEntry);
                }
            }

            const localWallet: IFabricWallet = await fabricWalletGenerator.getWallet(walletName);
            const identities: FabricIdentity[] = await this.getIdentities(walletName);
            for (const identity of identities) {
                await localWallet.importIdentity(
                    Buffer.from(identity.cert, 'base64').toString('utf8'),
                    Buffer.from(identity.private_key, 'base64').toString('utf8'),
                    identity.name,
                    identity.msp_id
                );
            }
        }
    }

    // Both see above
    public async importGateways(): Promise<void> {
        const extDir: string = vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_DIRECTORY);
        const homeExtDir: string = FileSystemUtil.getDirPath(extDir);

        const fabricGateways: FabricGateway[] = await this.getGateways();
        for (const gateway of fabricGateways) {
            await FabricGatewayRegistry.instance().delete(gateway.name, true);

            const profileDirPath: string = path.join(homeExtDir, FileConfigurations.FABRIC_GATEWAYS, gateway.name);
            const profilePath: string = path.join(profileDirPath, path.basename(gateway.path));
            await fs.ensureDir(profileDirPath);
            await fs.copy(gateway.path, profilePath);
            const gatewayRegistryEntry: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
            gatewayRegistryEntry.name = gateway.name;
            gatewayRegistryEntry.associatedWallet = (gateway.connectionProfile as any).wallet || FabricWalletUtil.LOCAL_WALLET;
            await FabricGatewayRegistry.instance().add(gatewayRegistryEntry);
        }
    }

    // Both (?)
    public async deleteWalletsAndIdentities(): Promise<void> {
        // Ensure that all known identities in all known wallets are deleted.
        const walletNames: string[] = await this.getWalletNames();
        for (const walletName of walletNames) {
            await FabricWalletRegistry.instance().delete(walletName);
        }
    }

    // Both
    public async start(outputAdapter?: OutputAdapter): Promise<void> {
        try {
            this.setBusy(true);
            this.setState(FabricRuntimeState.STARTING);
            await this.startInner(outputAdapter);
        } finally {
            this.setBusy(false);
            const running: boolean = await this.isRunning();
            if (running) {
                this.setState(FabricRuntimeState.STARTED);
            } else {
                this.setState(FabricRuntimeState.STOPPED);
            }
        }
    }

    // Both
    public async stop(outputAdapter?: OutputAdapter): Promise<void> {
        try {
            this.setBusy(true);
            this.setState(FabricRuntimeState.STOPPING);
            await this.stopInner(outputAdapter);
        } finally {
            this.setBusy(false);
            const running: boolean = await this.isRunning();
            if (running) {
                this.setState(FabricRuntimeState.STARTED);
            } else {
                this.setState(FabricRuntimeState.STOPPED);
            }
        }
    }

    // Both - see what the ansible generated scripts look like
    // I guess it could be possible that we have multiple implementations of the same function for AnsibleEnvironments and LocalEnvironment
    public async teardown(outputAdapter?: OutputAdapter): Promise<void> {
        try {
            await this.teardownInner(outputAdapter);
        } catch (err) {
            // ignore
        }

        await this.setTeardownState();

    }

    // Both
    public async restart(outputAdapter?: OutputAdapter): Promise<void> {
        try {
            this.setBusy(true);
            this.setState(FabricRuntimeState.RESTARTING);
            this.stopLogs();
            await this.stopInner(outputAdapter);
            await this.startInner(outputAdapter);
        } finally {
            this.setBusy(false);
            const running: boolean = await this.isRunning();
            if (running) {
                this.setState(FabricRuntimeState.STARTED);
            } else {
                this.setState(FabricRuntimeState.STOPPED);
            }
        }
    }

    // Both
    public async getGateways(): Promise<FabricGateway[]> {
        const gatewaysPath: string = path.resolve(this.path, FileConfigurations.FABRIC_GATEWAYS);
        return this.loadGateways(gatewaysPath);
    }

    // Both
    public async getWalletNames(): Promise<string[]> {
        const walletsPath: string = path.resolve(this.path, 'wallets');
        const walletsExist: boolean = await fs.pathExists(walletsPath);
        if (!walletsExist) {
            return [];
        }
        const walletPaths: string[] = await fs.readdir(walletsPath);
        return walletPaths
            .sort()
            .filter((walletPath: string) => !walletPath.startsWith('.'));
    }

    // Both
    public async getIdentities(walletName: string): Promise<FabricIdentity[]> {
        const walletPath: string = path.resolve(this.path, 'wallets', walletName);
        const walletExists: boolean = await fs.pathExists(walletPath);
        if (!walletExists) {
            return [];
        }
        let identityPaths: string[] = await fs.readdir(walletPath);
        identityPaths = identityPaths
            .sort()
            .filter((identityPath: string) => !identityPath.startsWith('.') && identityPath.endsWith('.json'))
            .map((identityPath: string) => path.resolve(this.path, 'wallets', walletName, identityPath));
        const identities: FabricIdentity[] = [];
        for (const identityPath of identityPaths) {
            const stats: fs.Stats = await fs.lstat(identityPath);
            if (!stats.isFile()) {
                continue;
            }
            const identity: FabricIdentity = await fs.readJson(identityPath);
            identities.push(identity);
        }
        return identities;
    }

    // Both
    public isRunning(args?: string[]): Promise<boolean> {
        if (this.isRunningPromise) {
            return this.isRunningPromise;
        }
        this.isRunningPromise = this.isRunningInner(args).then((result: boolean) => {
            this.isRunningPromise = undefined;
            return result;
        });
        return this.isRunningPromise;
    }

    // Both
    public async getPeerChaincodeURL(): Promise<string> {
        const nodes: FabricNode[] = await this.getNodes();
        const peer: FabricNode = nodes.find((node: FabricNode) => node.type === FabricNodeType.PEER);
        if (!peer) {
            throw new Error('There are no Fabric peer nodes');
        }
        return peer.chaincode_url;
    }

    // Both - ask simon where logging is implemented (?)
    public async getLogspoutURL(): Promise<string> {
        const nodes: FabricNode[] = await this.getNodes();
        const logspout: FabricNode = nodes.find((node: FabricNode) => node.type === FabricNodeType.LOGSPOUT);
        if (!logspout) {
            throw new Error('There are no Logspout nodes');
        }
        return logspout.api_url;
    }

    // Both
    public async getPeerContainerName(): Promise<string> {
        const nodes: FabricNode[] = await this.getNodes();
        const peer: FabricNode = nodes.find((node: FabricNode) => node.type === FabricNodeType.PEER);
        if (!peer) {
            throw new Error('There are no Fabric peer nodes');
        }
        return peer.container_name;
    }

    // Both - see getLogspoutUrl
    public async startLogs(outputAdapter: OutputAdapter): Promise<void> {
        const logspoutURL: string = await this.getLogspoutURL();
        this.logsRequest = CommandUtil.sendRequestWithOutput(`${logspoutURL}/logs`, outputAdapter);
    }

    // Both
    public stopLogs(): void {
        if (this.logsRequest) {
            CommandUtil.abortRequest(this.logsRequest);
        }
    }

    // Both
    public setState(state: FabricRuntimeState): void {
        this.state = state;

    }

    // Both
    public async execute(script: string, args: string[] = [], outputAdapter?: OutputAdapter): Promise<void> {
        if (!outputAdapter) {
            outputAdapter = ConsoleOutputAdapter.instance();
        }

        const chaincodeTimeout: number = this.getChaincodeTimeout();

        const env: any = Object.assign({}, process.env, {
            CORE_CHAINCODE_MODE: 'dev',
            CORE_CHAINCODE_EXECUTETIMEOUT: `${chaincodeTimeout}s` // This is needed as well as 'request-timeout' to change TX timeout
        });

        if (process.platform === 'win32') {
            await CommandUtil.sendCommandWithOutput('cmd', ['/c', `${script}.cmd`, ...args], this.path, env, outputAdapter);
        } else {
            await CommandUtil.sendCommandWithOutput('/bin/sh', [`${script}.sh`, ...args], this.path, env, outputAdapter);
        }
    }

    // Both
    public setBusy(busy: boolean): void {
        this.busy = busy;
        this.emit('busy', busy);
    }

    protected async setTeardownState(): Promise<void> {
        this.setBusy(false);
        const running: boolean = await this.isRunning();
        if (running) {
            this.setState(FabricRuntimeState.STARTED);
        } else {
            this.setState(FabricRuntimeState.STOPPED);
        }
    }

    // Both
    protected async teardownInner(outputAdapter?: OutputAdapter): Promise<void> {
        this.setBusy(true);
        this.setState(FabricRuntimeState.STOPPING);
        this.stopLogs();
        await this.execute('teardown', [], outputAdapter);
    }

    private async loadGateways(gatewaysPath: string): Promise<FabricGateway[]> {
        const gatewaysExist: boolean = await fs.pathExists(gatewaysPath);
        if (!gatewaysExist) {
            return [];
        }
        let gatewayPaths: string[] = await fs.readdir(gatewaysPath);
        gatewayPaths = gatewayPaths
            .sort()
            .filter((gatewayPath: string) => !gatewayPath.startsWith('.'))
            .map((gatewayPath: string) => path.resolve(gatewaysPath, gatewayPath));
        const gateways: FabricGateway[] = [];
        for (const gatewayPath of gatewayPaths) {
            const stats: fs.Stats = await fs.lstat(gatewayPath);
            if (stats.isDirectory()) {
                const subGateways: FabricGateway[] = await this.loadGateways(gatewayPath);
                gateways.push(...subGateways);
            } else if (stats.isFile() && gatewayPath.endsWith('.json')) {
                const connectionProfile: any = await fs.readJson(gatewayPath);
                const gateway: FabricGateway = new FabricGateway(connectionProfile.name, gatewayPath, connectionProfile);
                gateways.push(gateway);
            }
        }
        return gateways;
    }

    private async isRunningInner(args?: string[]): Promise<boolean> {
        try {
            const created: boolean = await this.isCreated();
            if (!created) {
                return false;
            }

            await this.execute('is_running', args);
            return true;
        } catch (error) {
            return false;
        }
    }

    // Both
    private async startInner(outputAdapter?: OutputAdapter): Promise<void> {
        await this.execute('start', [], outputAdapter);
    }

    // Both
    private async stopInner(outputAdapter?: OutputAdapter): Promise<void> {
        this.stopLogs();
        await this.execute('stop', [], outputAdapter);
    }

    // I think this is okay here
    private getChaincodeTimeout(): number {
        return vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_CHAINCODE_TIMEOUT) as number;
    }
}
