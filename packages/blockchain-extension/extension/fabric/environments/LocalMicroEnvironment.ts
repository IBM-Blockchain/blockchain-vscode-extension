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
import * as path from 'path';
import * as fs from 'fs-extra';
import { YeomanUtil } from '../../util/YeomanUtil';
import { FabricEnvironmentRegistry, FabricEnvironmentRegistryEntry, EnvironmentType, OutputAdapter, FileSystemUtil, FileConfigurations, LogType, MicrofabEnvironment, ConsoleOutputAdapter, FabricNode, FabricNodeType } from 'ibm-blockchain-platform-common';
import { SettingConfigurations } from '../../configurations';
import * as loghose from 'docker-loghose';
import * as through from 'through2';
import stripAnsi = require('strip-ansi');
import { FabricRuntimeState } from '../FabricRuntimeState';
import { CommandUtil } from '../../util/CommandUtil';
import { TimerUtil } from '../../util/TimerUtil';

export class LocalMicroEnvironment extends MicrofabEnvironment {
    public ourLoghose: any;
    public port: number;
    public numberOfOrgs: number;
    protected busy: boolean;
    protected state: FabricRuntimeState;
    protected isRunningPromise: Promise<boolean>;
    protected lh: any;
    private dockerName: string;

    constructor(name: string, port: number, numberOfOrgs: number) {
        const extDir: string = SettingConfigurations.getExtensionDir();
        const resolvedExtDir: string = FileSystemUtil.getDirPath(extDir);
        const envPath: string = path.join(resolvedExtDir, FileConfigurations.FABRIC_ENVIRONMENTS, name);
        const url: string = `http://console.127-0-0-1.nip.io:${port}`;
        super(name, envPath, url);
        const dockerName: string = name.replace(/[^A-Za-z0-9]/g, ''); // Filter out invalid characters
        this.dockerName = dockerName;

        this.port = port;
        this.numberOfOrgs = numberOfOrgs;

    }

    public async create(): Promise<void> {

        // Delete any existing runtime directory, and then recreate it.
        await FabricEnvironmentRegistry.instance().delete(this.name, true);

        const settings: any = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_RUNTIME, vscode.ConfigurationTarget.Global);
        const port: any = settings[this.name];

        if (port) {

            if (!this.port || (port !== this.port)) {
                // If the port has changed in the user setting, then regenerate using the new port.
                this.port = port;
            }
        }

        this.url = `console.127-0-0-1.nip.io:${this.port}`;
        this.setClient(this.url);

        const registryEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry({
            name: this.name,
            managedRuntime: true,
            environmentType: EnvironmentType.LOCAL_MICROFAB_ENVIRONMENT,
            environmentDirectory: path.join(this.path),
            numberOfOrgs: this.numberOfOrgs,
            url: this.url
        });

        await FabricEnvironmentRegistry.instance().add(registryEntry);

        // Use Yeoman to generate a new network configuration.
        await YeomanUtil.run('fabric:network', {
            destination: this.path,
            name: this.name,
            dockerName: this.dockerName,
            numOrganizations: this.numberOfOrgs,
            port: this.port
        });
    }

    public async start(outputAdapter?: OutputAdapter): Promise<void> {
        try {
            // check if isgenerated
            const created: boolean = await this.isCreated();
            if (!created) {
                await this.create();
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

    public async restart(outputAdapter?: OutputAdapter): Promise<void> {
        try {
            this.setBusy(true);
            this.setState(FabricRuntimeState.RESTARTING);
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

    /**
     * Wait for environment to be alive and ready to interact with.
     * @param attempts {number} The number of attempts to check if the environment is alive
     * @param interval {number} The interval in seconds in which to check if the environment is alive
     * @returns {Promise<boolean>}
     */
    public async waitFor(attempts: number = 10, interval: number = 2): Promise<boolean> {
        let isAlive: boolean = await this.isAlive();
        if (!isAlive) {
            for (let currentAttempt: number = 1; currentAttempt <= attempts; currentAttempt++) {
                isAlive = await this.isAlive();
                if (isAlive) {
                    break;
                } else {
                    await TimerUtil.sleep(interval * 1000);
                }
            }
        }

        return isAlive;
    }

    public getState(): FabricRuntimeState {
        return this.state;
    }

    public isBusy(): boolean {
        return this.busy;
    }

    public async isCreated(): Promise<boolean> {
        // We should check the start file exists, as we might get in a state where the entry is in the registry but the generated files don't exist.
        let entry: FabricEnvironmentRegistryEntry;
        try {
            entry = await FabricEnvironmentRegistry.instance().get(this.name);
        } catch (err) {
            // Entry doesn't exist.
            return false;
        }

        const startFilePath: string = path.join(entry.environmentDirectory, 'start.sh');
        const startFileExists: boolean = await fs.pathExists(startFilePath);

        // We know the entry exists at this point, so determining whether the microfab environment is created depends on if the start file exists.
        return startFileExists;
    }

    public async teardown(outputAdapter?: OutputAdapter): Promise<void> {
        try {
            await this.teardownInner(outputAdapter);
            await this.create();
        } finally {
            await this.setTeardownState();
        }
    }

    public async delete(outputAdapter?: OutputAdapter): Promise<void> {
        try {
            await this.teardownInner(outputAdapter);
        } finally {
            await this.setTeardownState();
        }
    }

    public async updateUserSettings(name: string): Promise<void> {
        const _settings: any = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_RUNTIME, vscode.ConfigurationTarget.Global);
        const settings: any = JSON.parse(JSON.stringify(_settings));

        settings[name] = this.port;
        await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, settings, vscode.ConfigurationTarget.Global);
    }

    public async killChaincode(args?: string[], outputAdapter?: OutputAdapter): Promise<void> {
        await this.killChaincodeInner(args, outputAdapter);
    }

    public startLogs(outputAdapter: OutputAdapter): void {
        const opts: any = {
            newline: true
        };
        const lh: any = this.getLoghose(opts);

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

    public getLoghose(opts: any): any {
        // This makes the startLogs testable
        return loghose(opts);
    }

    public setBusy(busy: boolean): void {
        this.busy = busy;
        this.emit('busy', busy);
    }

    public setState(state: FabricRuntimeState): void {
        this.state = state;
    }

    public async execute(script: string, args: string[] = [], outputAdapter?: OutputAdapter): Promise<void> {
        if (!outputAdapter) {
            outputAdapter = ConsoleOutputAdapter.instance();
        }

        const env: any = Object.assign({}, process.env, {
            CORE_CHAINCODE_MODE: 'dev'
        });

        if (process.platform === 'win32') {
            await CommandUtil.sendCommandWithOutput('cmd', ['/c', `${script}.cmd`, ...args], this.path, env, outputAdapter);
        } else {
            await CommandUtil.sendCommandWithOutput('/bin/sh', [`${script}.sh`, ...args], this.path, env, outputAdapter);
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

    public async getPeerChaincodeURL(orgName?: string): Promise<string> {
        let nodes: FabricNode[] = await this.getNodes();
        if (orgName) {
            nodes = nodes.filter((node: FabricNode) => {
                // Can either check the wallet, or check that the node.name includes the orgName.
                return node.wallet === orgName;
            });
        }

        const peer: FabricNode = nodes.find((node: FabricNode) => node.type === FabricNodeType.PEER);
        if (!peer) {
            throw new Error('There are no Fabric peer nodes');
        }
        return peer.chaincode_url;
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

    protected async isRunningInner(args?: string[]): Promise<boolean> {
        const created: boolean = await this.isCreated();
        if (!created) {
            return false;
        }
        try {
            await this.execute('is_running', args);
            return true;
        } catch (error) {
            return false;
        }
    }

    protected async teardownInner(outputAdapter?: OutputAdapter): Promise<void> {
        this.setBusy(true);
        this.setState(FabricRuntimeState.STOPPING);
        this.stopLogs();
        await this.execute('teardown', [], outputAdapter);
    }

    protected async stopInner(outputAdapter?: OutputAdapter): Promise<void> {
        this.stopLogs();
        await this.execute('stop', [], outputAdapter);
    }

    private async startInner(outputAdapter?: OutputAdapter): Promise<void> {
        await this.execute('start', [], outputAdapter);
    }

    private async killChaincodeInner(args: string[], outputAdapter?: OutputAdapter): Promise<void> {
        await this.execute('kill_chaincode', args, outputAdapter);
    }
}
