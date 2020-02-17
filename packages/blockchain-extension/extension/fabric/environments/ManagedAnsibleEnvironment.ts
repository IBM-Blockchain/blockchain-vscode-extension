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
import { AnsibleEnvironment, OutputAdapter, FabricNode, FabricNodeType, ConsoleOutputAdapter, LogType } from 'ibm-blockchain-platform-common';
import * as loghose from 'docker-loghose';
import * as through from 'through2';
import stripAnsi = require('strip-ansi');

export class ManagedAnsibleEnvironment extends AnsibleEnvironment {
    public ourLoghose: any = loghose;
    protected busy: boolean = false;
    protected state: FabricRuntimeState;
    protected isRunningPromise: Promise<boolean>;

    protected logsRequest: request.Request;
    protected lh: any = null;

    constructor(name: string, environmentPath: string) {
        super(name, environmentPath);
    }

    public isBusy(): boolean {
        return this.busy;
    }

    public getState(): FabricRuntimeState {
        return this.state;
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
            // check if isgenerated
            const generated: boolean = await this.isGenerated();
            if (!generated) {
                await this.generate(outputAdapter);
            }

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

    public async getPeerContainerName(): Promise<string> {
        const nodes: FabricNode[] = await this.getNodes();
        const peer: FabricNode = nodes.find((node: FabricNode) => node.type === FabricNodeType.PEER);
        if (!peer) {
            throw new Error('There are no Fabric peer nodes');
        }
        return peer.container_name;
    }

    public async startLogs(outputAdapter: OutputAdapter): Promise<void> {
        const opts: any = {
            attachFilter: (_id: any, dockerInspectInfo: any): boolean => {
                if (dockerInspectInfo.Name.startsWith('/fabricvscodelocalfabric')) {
                    return true;
                } else {
                    const labels: object = dockerInspectInfo.Config.Labels;
                    const environmentName: string = labels['fabric-environment-name'];
                    return environmentName === this.name;
                }
            },
            newline: true
        };
        const lh: any = this.ourLoghose(opts);

        lh.pipe(through.obj((chunk: any, _enc: any, cb: any) => {
            const name: string = chunk.name;
            const line: string = stripAnsi(chunk.line);
            outputAdapter.log(LogType.INFO, undefined, `${name}|${line}`);
            cb();
        }));

        this.lh = lh;
    }

    public stopLogs(): void {
        if (this.lh) {
            this.lh.destroy();
        }
        this.lh = null;
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
        return vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_CHAINCODE_TIMEOUT);
    }
}
