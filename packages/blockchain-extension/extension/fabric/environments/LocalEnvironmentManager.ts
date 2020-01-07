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
import { FabricEnvironmentRegistryEntry, FabricRuntimeUtil } from 'ibm-blockchain-platform-common';
import { SettingConfigurations } from '../../configurations';
import { FabricEnvironmentManager } from './FabricEnvironmentManager';
import { VSCodeBlockchainDockerOutputAdapter } from '../../logging/VSCodeBlockchainDockerOutputAdapter';
import { LocalEnvironment } from './LocalEnvironment';

export class LocalEnvironmentManager {

    public static findFreePort: any = require('find-free-port');

    public static instance(): LocalEnvironmentManager {
        return this._instance;
    }

    private static _instance: LocalEnvironmentManager = new LocalEnvironmentManager();

    private runtime: LocalEnvironment;

    private constructor() {
    }

    public getRuntime(): LocalEnvironment {
        return this.runtime;
    }

    public async initialize(): Promise<void> {

        // only generate a range of ports if it doesn't already exist
        const runtimeObject: any = this.readRuntimeUserSettings();

        if (runtimeObject.ports) {
            this.runtime = new LocalEnvironment();
            this.runtime.ports = runtimeObject.ports;
        } else {
            // Generate a range of ports for this Fabric runtime.
            const ports: FabricRuntimePorts = await this.generatePortConfiguration();

            // Add the Fabric runtime to the internal cache.
            this.runtime = new LocalEnvironment();
            this.runtime.ports = ports;
            await this.runtime.updateUserSettings();
        }

        // Check to see if the runtime has been created.
        const created: boolean = await this.runtime.isCreated();
        if (!created) {
            await this.runtime.create();
        }

        FabricEnvironmentManager.instance().on('connected', async () => {
            const registryEntry: FabricEnvironmentRegistryEntry = FabricEnvironmentManager.instance().getEnvironmentRegistryEntry();
            if (registryEntry.managedRuntime && registryEntry.name === FabricRuntimeUtil.LOCAL_FABRIC) {
                const outputAdapter: VSCodeBlockchainDockerOutputAdapter = VSCodeBlockchainDockerOutputAdapter.instance();
                await this.runtime.startLogs(outputAdapter);
            }
        });

        FabricEnvironmentManager.instance().on('disconnected', async () => {
            this.runtime.stopLogs();
        });
    }

    private readRuntimeUserSettings(): any {
        const runtimeSettings: any = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_RUNTIME);
        if (runtimeSettings.ports) {
            return runtimeSettings;
        } else {
            return {};
        }
    }

    private async generatePortConfiguration(): Promise<FabricRuntimePorts> {
        const ports: FabricRuntimePorts = new FabricRuntimePorts();
        const freePorts: number[] = await LocalEnvironmentManager.findFreePort(17050, null, null, 20);
        ports.startPort = freePorts[0];
        ports.endPort = freePorts[freePorts.length - 1];

        return ports;
    }
}
