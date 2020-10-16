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
import { FabricEnvironmentRegistryEntry, FabricEnvironmentRegistry } from 'ibm-blockchain-platform-common';
import { SettingConfigurations } from '../../configurations';
import { LocalMicroEnvironment } from './LocalMicroEnvironment';

export class LocalMicroEnvironmentManager {

    public static findFreePort: any = require('find-free-port');

    public static instance(): LocalMicroEnvironmentManager {
        return this._instance;
    }

    private static _instance: LocalMicroEnvironmentManager = new LocalMicroEnvironmentManager();

    public runtimes: Map<string, LocalMicroEnvironment> = new Map();

    private constructor() {
    }

    public updateRuntime(name: string, runtime: LocalMicroEnvironment): void {
        this.runtimes.set(name, runtime);
    }

    public removeRuntime(name: string): void {
        // Delete from map if it exists
        this.runtimes.delete(name);
    }

    public getRuntime(name: string): LocalMicroEnvironment {
        return this.runtimes.get(name);
    }

    public async ensureRuntime(name: string, port?: number, numberOfOrgs?: number): Promise<LocalMicroEnvironment> {
        let runtime: LocalMicroEnvironment = this.getRuntime(name);
        if (!runtime) {
            runtime = await this.addRuntime(name, port, numberOfOrgs);
        }
        return runtime;
    }

    public async addRuntime(name: string, port?: number, numberOfOrgs?: number): Promise<LocalMicroEnvironment> {

        let portToUse: number;
        if (!port) {
            const settingPorts: any = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_RUNTIME, vscode.ConfigurationTarget.Global);
            if (settingPorts[name]) {
                portToUse = settingPorts[name];
            } else {
                // generate and update
                settingPorts[name] = await this.generatePortConfiguration();
                portToUse = settingPorts[name];
                await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, settingPorts, vscode.ConfigurationTarget.Global);
            }
        } else {
            portToUse = port;
        }

        let orgsToUse: number;
        if (!numberOfOrgs) {
            let entry: FabricEnvironmentRegistryEntry;
            try {
                entry = await FabricEnvironmentRegistry.instance().get(name);
            } catch (error) {
                throw new Error(`Unable to add runtime as environment '${name}' does not exist.`);
            }
            if (entry.numberOfOrgs) {
                orgsToUse = entry.numberOfOrgs;
            } else {
                throw new Error(`Unable to add runtime as environment '${name}' does not have 'numberOfOrgs' property.`);
            }

        } else {
            orgsToUse = numberOfOrgs;
        }

        const runtime: LocalMicroEnvironment = new LocalMicroEnvironment(name, portToUse, orgsToUse);
        this.runtimes.set(name, runtime);

        return runtime;
    }

    public async initialize(name: string, numberOfOrgs: number): Promise<void> {

        // only generate a range of ports if it doesn't already exist
        let port: any = this.getPort(name);
        let runtime: LocalMicroEnvironment;
        if (port) {
            runtime = await this.addRuntime(name, port, numberOfOrgs);
        } else {
            // Generate a range of ports for this Fabric runtime.
            port = await this.generatePortConfiguration();

            // Add the Fabric runtime to the internal cache.
            runtime = await this.addRuntime(name, port, numberOfOrgs);

            await runtime.updateUserSettings(name);
        }

        // Check to see if the runtime has been created.
        const created: boolean = await runtime.isCreated();
        if (!created) {
            await runtime.create();
        } else {
            const entry: FabricEnvironmentRegistryEntry = await FabricEnvironmentRegistry.instance().get(name);
            if (!entry.url.includes(`${port}`)) {
                await runtime.teardown();
            }
        }

    }

    private getPort(name: string): any {
        const runtimeSettings: any = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_RUNTIME);
        if (name && runtimeSettings[name]) {
            return runtimeSettings[name];
        } else {
            return;
        }

    }

    private async generatePortConfiguration(): Promise<number> {
        // Check user settings to see what ranges are in use. Find the next free port based on that, and use that as the start port for findFreePort();

        let port: number;

        const settings: any = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_RUNTIME);

        let startPort: number;
        if (Object.keys(settings).length !== 0) {
            // We want to find the largest port in the already existing ports. For this, we can just get the largest endPort.
            const ports: number[] = Object.values(settings);
            const largestPort: number = Math.max(...ports);

            // We should start looking for free ports beginning with this.
            startPort = largestPort + 1;
        } else {
            // User has no settings, so let's just use this port as the default to start.
            startPort = 8080;
        }

        const freePorts: number[] = await LocalMicroEnvironmentManager.findFreePort(startPort, null, null, 20);
        port = freePorts[0];

        return port;
    }
}
