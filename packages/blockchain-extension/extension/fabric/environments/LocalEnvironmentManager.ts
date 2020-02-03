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
import * as semver from 'semver';
import { VSCodeBlockchainOutputAdapter } from '../../logging/VSCodeBlockchainOutputAdapter';
import { CommandUtil } from '../../util/CommandUtil';
import * as path from 'path';
import * as fs from 'fs-extra';
import { FabricEnvironmentRegistryEntry, FabricRuntimeUtil, LogType, FileSystemUtil } from 'ibm-blockchain-platform-common';
import { SettingConfigurations } from '../../../configurations';
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

        let updatedPorts: boolean = false;
        if (runtimeObject.ports) {
            // Check to see if ports.orderer, ports.peer, etc.
            // If so, then we'll need to migrate to use startPoor and endPort.

            if (runtimeObject.ports.orderer || runtimeObject.ports.peerRequest || runtimeObject.ports.peerChaincode ||
                runtimeObject.ports.peerEventHub || runtimeObject.ports.certificateAuthority || runtimeObject.ports.couchDB) {
                    // Assume they have the old style ports
                    const portList: number[] = Object.values(runtimeObject.ports);

                    const startPort: number = Math.min(...portList);

                    // Decide on end port
                    const endPort: number = startPort + 20;
                    runtimeObject.ports = {
                        startPort,
                        endPort
                    };

                    updatedPorts = true;

            }

            this.runtime = new LocalEnvironment();
            this.runtime.ports = runtimeObject.ports;

        } else {
            updatedPorts = true;

            // Generate a range of ports for this Fabric runtime.
            const ports: FabricRuntimePorts = await this.generatePortConfiguration();

            // Add the Fabric runtime to the internal cache.
            this.runtime = new LocalEnvironment();
            this.runtime.ports = ports;
        }

        if (updatedPorts) {
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

    public async migrate(oldVersion: string): Promise<void> {
        const runtimeSetting: any = await this.migrateRuntimesConfiguration();
        await this.migrateRuntimeConfiguration(runtimeSetting);
        await this.migrateRuntimeContainers(oldVersion);
        await this.migrateRuntimeFolder();
    }

    private readRuntimeUserSettings(): any {
        const runtimeSettings: any = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_RUNTIME);
        if (runtimeSettings.ports) {
            return runtimeSettings;
        } else {
            return {};
        }
    }

    private async migrateRuntimesConfiguration(): Promise<any> {
        const oldRuntimeSettings: any[] = vscode.workspace.getConfiguration().get('fabric.runtimes');
        let runtimeObj: any = vscode.workspace.getConfiguration().get('fabric.runtime');
        if (!runtimeObj) { // If the user has no fabric.runtime setting
            runtimeObj = {};
        }
        if (oldRuntimeSettings && !runtimeObj.ports) {
            const runtimeToCopy: any = {
                ports: {}
            };
            for (const oldRuntime of oldRuntimeSettings) {
                if (oldRuntime.name === FabricRuntimeUtil.OLD_LOCAL_FABRIC) {
                    runtimeToCopy.ports = oldRuntime.ports;
                }
            }

            return runtimeToCopy;

        } else {
            return runtimeObj;
        }

    }

    private async migrateRuntimeFolder(): Promise<void> {
        // Move runtime folder under environments
        let extDir: string = vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_DIRECTORY);
        extDir = FileSystemUtil.getDirPath(extDir);
        const runtimesExtDir: string = path.join(extDir, 'runtime');
        const exists: boolean = await fs.pathExists(runtimesExtDir);
        if (exists) {
            try {
                const newPath: string = path.join(extDir, 'environments', FabricRuntimeUtil.LOCAL_FABRIC);
                const newPathExists: boolean = await fs.pathExists(newPath);
                if (!newPathExists) {
                    await fs.move(runtimesExtDir, newPath);
                }
            } catch (error) {
                throw new Error(`Issue migrating runtime folder ${error.message}`);
            }
        }
    }

    private async migrateRuntimeConfiguration(oldRuntimeSetting: any): Promise<void> {
        const runtimeObj: any = await this.readRuntimeUserSettings();
        if (oldRuntimeSetting && !runtimeObj.ports) {
            const runtimeToCopy: any = {
                ports: {}
            };

            runtimeToCopy.ports = oldRuntimeSetting.ports;

            // If either fabric.runtimes and fabric.runtime existed and has ports
            if (runtimeToCopy.ports) {

                // Update new property with old settings values
                await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, runtimeToCopy, vscode.ConfigurationTarget.Global);

            }

            // Else fabric.runtimes/fabric.runtime didn't exist, hence no migration is required

        }
    }

    private async migrateRuntimeContainers(oldVersion: string): Promise<void> {

        // Determine if we need to try to teardown the old "basic-network" version of local_fabric.
        if (!oldVersion) {
            // New install, or version before we tracked which version was last used.
        } else if (semver.lte(oldVersion, '0.3.3')) {
            // Upgrade from version that has the old "basic-network" version of local_fabric.
        } else {
            return;
        }

        // Execute the teardown scripts.
        const basicNetworkPath: string = path.resolve(__dirname, '..', '..', '..', 'basic-network');
        const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
        outputAdapter.log(LogType.WARNING, null, `Attempting to teardown old ${this.runtime.getName()} from version <= 0.3.3`);
        outputAdapter.log(LogType.WARNING, null, 'Any error messages from this process can be safely ignored (for example, container does not exist');
        if (process.platform === 'win32') {
            await CommandUtil.sendCommandWithOutput('cmd', ['/c', 'teardown.cmd'], basicNetworkPath, null, outputAdapter);
        } else {
            await CommandUtil.sendCommandWithOutput('/bin/sh', ['teardown.sh'], basicNetworkPath, null, outputAdapter);
        }
        outputAdapter.log(LogType.WARNING, null, `Finished attempting to teardown old ${this.runtime.getName()} from version <= 0.3.3`);

    }

    private async generatePortConfiguration(): Promise<FabricRuntimePorts> {
        const ports: FabricRuntimePorts = new FabricRuntimePorts();
        const freePorts: number[] = await LocalEnvironmentManager.findFreePort(17050, null, null, 20);
        ports.startPort = freePorts[0];
        ports.endPort = freePorts[freePorts.length - 1];

        return ports;
    }
}
