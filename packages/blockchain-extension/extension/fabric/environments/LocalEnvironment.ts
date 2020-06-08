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
import { ManagedAnsibleEnvironment } from './ManagedAnsibleEnvironment';
import { YeomanUtil } from '../../util/YeomanUtil';
import { FabricEnvironmentRegistry, FabricEnvironmentRegistryEntry, EnvironmentType, OutputAdapter, FileSystemUtil, FileConfigurations, LogType } from 'ibm-blockchain-platform-common';
import { SettingConfigurations } from '../../../configurations';
import { FabricRuntimePorts } from '../FabricRuntimePorts';
import * as loghose from 'docker-loghose';
import * as through from 'through2';
import stripAnsi = require('strip-ansi');
import { FabricRuntimeState } from '../FabricRuntimeState';

export class LocalEnvironment extends ManagedAnsibleEnvironment {
    public ourLoghose: any;
    public ports: FabricRuntimePorts;
    public numberOfOrgs: number;
    private dockerName: string;

    constructor(name: string, ports: FabricRuntimePorts, numberOfOrgs: number) {
        const extDir: string = vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_DIRECTORY);
        const resolvedExtDir: string = FileSystemUtil.getDirPath(extDir);
        const envPath: string = path.join(resolvedExtDir, FileConfigurations.FABRIC_ENVIRONMENTS, name);
        super(name, envPath);

        const dockerName: string = name.replace(/[^A-Za-z0-9]/g, ''); // Filter out invalid characters
        this.dockerName = dockerName;

        this.ports = ports;
        this.numberOfOrgs = numberOfOrgs;

    }

    public async create(): Promise<void> {

        // Delete any existing runtime directory, and then recreate it.
        await FabricEnvironmentRegistry.instance().delete(this.name, true);

        const registryEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry({
            name: this.name,
            managedRuntime: true,
            environmentType: EnvironmentType.LOCAL_ENVIRONMENT,
            environmentDirectory: path.join(this.path),
            numberOfOrgs: this.numberOfOrgs
        });

        await FabricEnvironmentRegistry.instance().add(registryEntry);
        const settings: any = await vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_RUNTIME, vscode.ConfigurationTarget.Global);
        const portObject: any = settings[this.name];

        if (portObject) {
            const newPorts: FabricRuntimePorts = portObject.ports;

            const startPort: number = newPorts.startPort;
            const endPort: number = newPorts.endPort;
            if (!this.ports || (startPort && endPort && (startPort !== this.ports.startPort || endPort !== this.ports.endPort))) {
                // If the ports have changed in the user setting, then regenerate using the new ports.
                this.ports = newPorts;
            }
        }

        // Use Yeoman to generate a new network configuration.
        await YeomanUtil.run('fabric:network', {
            destination: this.path,
            name: this.name,
            dockerName: this.dockerName,
            numOrganizations: this.numberOfOrgs,
            startPort: this.ports.startPort,
            endPort: this.ports.endPort
        });
    }

    public async isCreated(): Promise<boolean> {
        // We should check the playbook exists, as we might get in a state where the entry is in the registry but the playbook and other files don't exist.
        let entry: FabricEnvironmentRegistryEntry;
        try {
            entry = await FabricEnvironmentRegistry.instance().get(this.name);
        } catch (err) {
            // Entry doesn't exist.
            return false;
        }

        const playbookPath: string = path.join(entry.environmentDirectory, 'playbook.yml');
        const playbookExists: boolean = await fs.pathExists(playbookPath);

        // We know the entry exists at this point, so determining whether the local environment is created depends on if the playbook exists.
        return playbookExists;
    }

    public async isGenerated(): Promise<boolean> {
        const created: boolean = await this.isCreated();
        if (!created) {
            return false;
        }
        return await super.isGenerated();
    }

    public async teardown(outputAdapter?: OutputAdapter): Promise<void> {
        try {
            await this.teardownInner(outputAdapter);
            await this.create();
        } finally {
            await super.setTeardownState();
        }
    }

    public async delete(outputAdapter?: OutputAdapter): Promise<void> {
        try {
            await this.teardownInner(outputAdapter);
        } finally {
            await super.setTeardownState();
        }
    }

    public async updateUserSettings(name: string): Promise<void> {
        const _settings: any = await vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_RUNTIME, vscode.ConfigurationTarget.Global);
        const settings: any = JSON.parse(JSON.stringify(_settings));
        if (settings.ports) {
            // Delete old ports - the object should now have names, which have their own port range.
            delete settings.ports;
        }

        if (!settings[name]) {
            settings[name] = {
                ports: {
                    startPort: this.ports.startPort,
                    endPort: this.ports.endPort
                }
            };
        } else {
            settings[name].ports = this.ports;
        }
        await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, settings, vscode.ConfigurationTarget.Global);
    }

    public async killChaincode(args?: string[], outputAdapter?: OutputAdapter): Promise<void> {
        await this.killChaincodeInner(args, outputAdapter);
    }

    public startLogs(outputAdapter: OutputAdapter): void {
        const opts: any = {
            attachFilter: (_id: any, dockerInspectInfo: any): boolean => {

                const networks: object = dockerInspectInfo.NetworkSettings.Networks;

                // Strip spaces
                let formattedName: string = this.name.replace(/\s+/g, '');
                // E.g 1OrgLocalFabric_network
                formattedName += '_network';

                if (networks[formattedName]) {
                    return true;
                } else {
                    return false;
                }

            },
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

    protected async isRunningInner(args?: string[]): Promise<boolean> {

        const created: boolean = await this.isCreated();
        if (!created) {
            return false;
        }
        return await super.isRunningInner(args);
    }

    protected async teardownInner(outputAdapter?: OutputAdapter): Promise<void> {
        super.setBusy(true);
        super.setState(FabricRuntimeState.STOPPING);
        this.stopLogs();
        await super.execute('teardown', [], outputAdapter);
    }

    protected async stopInner(outputAdapter?: OutputAdapter): Promise<void> {
        this.stopLogs();
        await super.execute('stop', [], outputAdapter);
    }

    private async killChaincodeInner(args: string[], outputAdapter?: OutputAdapter): Promise<void> {
        await this.execute('kill_chaincode', args, outputAdapter);
    }
}
