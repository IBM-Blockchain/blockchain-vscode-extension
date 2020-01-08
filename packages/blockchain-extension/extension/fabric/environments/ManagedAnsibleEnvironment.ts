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
import { CommandUtil } from '../../util/CommandUtil';
import * as request from 'request';
import { SettingConfigurations } from '../../configurations';
import { FabricRuntimeState } from '../FabricRuntimeState';
import { AnsibleEnvironment } from './AnsibleEnvironment';
import { OutputAdapter, FabricNode, FabricNodeType, ConsoleOutputAdapter, FabricWalletRegistry } from 'ibm-blockchain-platform-common';

export class ManagedAnsibleEnvironment extends AnsibleEnvironment {
    protected busy: boolean = false;
    protected state: FabricRuntimeState;
    protected isRunningPromise: Promise<boolean>;

    protected logsRequest: request.Request;

    constructor(name: string) {
        super(name);
    }

    public isBusy(): boolean {
        return this.busy;
    }

    public getState(): FabricRuntimeState {
        return this.state;
    }

    public async deleteWalletsAndIdentities(): Promise<void> {
        // Ensure that all known identities in all known wallets are deleted.
        const walletNames: string[] = await this.getWalletNames();
        for (const walletName of walletNames) {
            await FabricWalletRegistry.instance().delete(walletName);
        }
    }

    public async isGenerated(): Promise<boolean> {
        try {
            await this.execute('is_generated');
            return true;
        } catch (error) {
            return false;
        }
    }

    public async generate(outputAdapter?: OutputAdapter): Promise<void> {
        try {
            this.setBusy(true);
            this.setState(FabricRuntimeState.STARTING);
            await this.execute('generate', [], outputAdapter);
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

    public async teardown(outputAdapter?: OutputAdapter): Promise<void> {
        try {
            await this.teardownInner(outputAdapter);
        } finally {
            await this.setTeardownState();
        }

    }

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

    public async getPeerChaincodeURL(): Promise<string> {
        const nodes: FabricNode[] = await this.getNodes();
        const peer: FabricNode = nodes.find((node: FabricNode) => node.type === FabricNodeType.PEER);
        if (!peer) {
            throw new Error('There are no Fabric peer nodes');
        }
        return peer.chaincode_url;
    }

    public async getLogspoutURL(): Promise<string> {
        const nodes: FabricNode[] = await this.getNodes();
        const logspout: FabricNode = nodes.find((node: FabricNode) => node.type === FabricNodeType.LOGSPOUT);
        if (!logspout) {
            throw new Error('There are no Logspout nodes');
        }
        return logspout.api_url;
    }

    public async getPeerContainerName(): Promise<string> {
        const nodes: FabricNode[] = await this.getNodes();
        const peer: FabricNode = nodes.find((node: FabricNode) => node.type === FabricNodeType.PEER);
        if (!peer) {
            throw new Error('There are no Fabric peer nodes');
        }
        return peer.container_name;
    }

    public async startLogs(outputAdapter: OutputAdapter): Promise<void> {
        const logspoutURL: string = await this.getLogspoutURL();
        this.logsRequest = CommandUtil.sendRequestWithOutput(`${logspoutURL}/logs`, outputAdapter);
    }

    public stopLogs(): void {
        if (this.logsRequest) {
            CommandUtil.abortRequest(this.logsRequest);
        }
    }

    public setState(state: FabricRuntimeState): void {
        this.state = state;

    }

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

    protected async teardownInner(outputAdapter?: OutputAdapter): Promise<void> {
        this.setBusy(true);
        this.setState(FabricRuntimeState.STOPPING);
        this.stopLogs();
        await this.execute('teardown', [], outputAdapter);
    }

    protected async isRunningInner(args?: string[]): Promise<boolean> {
        try {
            await this.execute('is_running', args);
            return true;
        } catch (error) {
            return false;
        }
    }

    private async startInner(outputAdapter?: OutputAdapter): Promise<void> {
        await this.execute('start', [], outputAdapter);
    }

    private async stopInner(outputAdapter?: OutputAdapter): Promise<void> {
        this.stopLogs();
        await this.execute('stop', [], outputAdapter);
    }

    private getChaincodeTimeout(): number {
        return vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_CHAINCODE_TIMEOUT) as number;
    }
}
