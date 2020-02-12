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
import { FabricRuntimePorts } from '../FabricRuntimePorts';
import { FabricEnvironmentRegistryEntry, FabricEnvironmentRegistry } from 'ibm-blockchain-platform-common';
import { SettingConfigurations } from '../../../configurations';
import { LocalEnvironment } from './LocalEnvironment';

export class LocalEnvironmentManager {

    public static findFreePort: any = require('find-free-port');

    public static instance(): LocalEnvironmentManager {
        return this._instance;
    }

    private static _instance: LocalEnvironmentManager = new LocalEnvironmentManager();

    private runtimes: Map<string, LocalEnvironment> = new Map();

    private constructor() {
    }

    public updateRuntime(name: string, runtime: LocalEnvironment): void {
        this.runtimes.set(name, runtime);
    }

    public removeRuntime(name: string): void {
        // Delete from map if it exists
        this.runtimes.delete(name);
    }

    public getRuntime(name: string): LocalEnvironment {
        return this.runtimes.get(name);
    }

    public async ensureRuntime(name: string, ports?: FabricRuntimePorts, numberOfOrgs?: number): Promise<LocalEnvironment> {
        let runtime: LocalEnvironment = this.getRuntime(name);
        if (!runtime) {
            runtime = await this.addRuntime(name, ports, numberOfOrgs);
        }
        return runtime;
    }

    public async addRuntime(name: string, ports?: FabricRuntimePorts, numberOfOrgs?: number): Promise<LocalEnvironment> {

        let portsToUse: FabricRuntimePorts;
        if (!ports) {
            const settingPorts: any = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_RUNTIME, vscode.ConfigurationTarget.Global);
            if (settingPorts[name] && settingPorts[name].ports && settingPorts[name].ports.startPort && settingPorts[name].ports.endPort) {
                portsToUse = settingPorts[name].ports;
            } else {
                // generate and update
                portsToUse = await this.generatePortConfiguration();
                settingPorts[name] = {
                    ports: portsToUse
                };
            }
        } else {
            portsToUse = ports;
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

        const runtime: LocalEnvironment = new LocalEnvironment(name, portsToUse, orgsToUse);
        this.runtimes.set(name, runtime);

        return runtime;
    }

    public async initialize(name: string, numberOfOrgs: number): Promise<void> {

        // only generate a range of ports if it doesn't already exist
        const runtimeObject: any = this.readRuntimeUserSettings(name);
        let runtime: LocalEnvironment;
        if (runtimeObject.ports) {
            runtime = await this.addRuntime(name, runtimeObject.ports, numberOfOrgs);

        } else {
            // Generate a range of ports for this Fabric runtime.
            const ports: FabricRuntimePorts = await this.generatePortConfiguration();

            // Add the Fabric runtime to the internal cache.
            runtime = await this.addRuntime(name, ports, numberOfOrgs);

            await runtime.updateUserSettings(name);
        }

        // Check to see if the runtime has been created.
        const created: boolean = await runtime.isCreated();
        if (!created) {
            await runtime.create();
        }

    }

    private readRuntimeUserSettings(name: string): any {
        const runtimeSettings: any = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_RUNTIME);
        if (name && runtimeSettings[name] && runtimeSettings[name].ports) {
            return runtimeSettings[name];
        } else {
            return {};
        }

    }

    private async generatePortConfiguration(): Promise<FabricRuntimePorts> {
        // Check user settings to see what ranges are in use. Find the next free port based on that, and use that as the start port for findFreePort();

        const ports: FabricRuntimePorts = new FabricRuntimePorts();

        const settings: any = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_RUNTIME);

        let startPort: number;
        if (Object.keys(settings).length !== 0) {
            // We want to find the largest port in the already existing ports. For this, we can just get the largest endPort.
            let largestEndPort: number;

            // For each 'named' section in the settings
            for (const section of Object.values(settings) as { ports: FabricRuntimePorts }[]) {
                if (!largestEndPort) {
                    largestEndPort = section.ports.endPort;
                } else {
                    if (section.ports.endPort > largestEndPort) {
                        largestEndPort = section.ports.endPort;
                    }
                }
            }

            // We should start looking for free ports beginning with this.
            startPort = largestEndPort + 1;
        } else {
            // User has no settings, so let's just use this port as the default to start.
            startPort = 17050;
        }

        const freePorts: number[] = await LocalEnvironmentManager.findFreePort(startPort, null, null, 20);
        ports.startPort = freePorts[0];
        ports.endPort = freePorts[freePorts.length - 1];

        return ports;
    }
}
