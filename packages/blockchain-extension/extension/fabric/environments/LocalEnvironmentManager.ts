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
import { FabricEnvironmentRegistryEntry, FabricRuntimeUtil, LogType, FileSystemUtil, FabricEnvironmentRegistry } from 'ibm-blockchain-platform-common';
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
        const oldRuntimeObject: any = this.readOldRuntimeUserSettings();
        let updatedPorts: boolean = false;
        let runtime: LocalEnvironment;
        if (runtimeObject.ports || oldRuntimeObject.ports) {
            // Check to see if ports.orderer, ports.peer, etc.
            // If so, then we'll need to migrate to use startPoor and endPort.

            if (oldRuntimeObject.ports) {
                const updatedPortObject: FabricRuntimePorts = this.updatePortsToNames(oldRuntimeObject.ports);
                runtimeObject.ports = updatedPortObject;

                updatedPorts = true;

            }

            runtime = await this.addRuntime(name, runtimeObject.ports, numberOfOrgs);

        } else {
            updatedPorts = true;

            // Generate a range of ports for this Fabric runtime.
            const ports: FabricRuntimePorts = await this.generatePortConfiguration();

            // Add the Fabric runtime to the internal cache.
            runtime = await this.addRuntime(name, ports, numberOfOrgs);
        }

        if (updatedPorts) {
            await runtime.updateUserSettings(name);
        }

        // Check to see if the runtime has been created.
        const created: boolean = await runtime.isCreated();
        if (!created) {
            await runtime.create();
        }

    }

    public async migrate(oldVersion: string): Promise<void> {
        const runtimeSetting: any = await this.migrateRuntimesConfiguration();
        await this.migrateRuntimeConfiguration(runtimeSetting);
        await this.migrateRuntimeContainers(oldVersion);
        await this.migrateRuntimeFolder();
    }

    private readRuntimeUserSettings(name: string): any {
        const runtimeSettings: any = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_RUNTIME);
        if (name && runtimeSettings[name] && runtimeSettings[name].ports) {
            return runtimeSettings[name];
        } else {
            return {};
        }

    }

    private readOldRuntimeUserSettings(): any {
        const runtimeSettings: any = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_RUNTIME);
        if (runtimeSettings && runtimeSettings.ports) {
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
        /*
        Delete runtime folder
        The previous behaviour would result in this moving the old 'runtime' directory to 'environments/1 Org Local Fabric'.
        We probably don't want to do this anymore as we have moved to Ansible based networks.
        Instead we should now probably just delete it.
        */

        let extDir: string = vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_DIRECTORY);
        extDir = FileSystemUtil.getDirPath(extDir);
        const runtimesExtDir: string = path.join(extDir, 'runtime');
        const exists: boolean = await fs.pathExists(runtimesExtDir);
        if (exists) {
            try {
                await fs.rmdir(runtimesExtDir);
            } catch (error) {
                throw new Error(`Error removing old runtime folder: ${error.message}`);
            }
        }
    }

    private async migrateRuntimeConfiguration(oldRuntimeSetting: any): Promise<void> {
        const _runtimeObj: any = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_RUNTIME); // {} || {ports: {}}
        const runtimeObj: any = JSON.parse(JSON.stringify(_runtimeObj));
        if (oldRuntimeSetting && !runtimeObj.ports && !runtimeObj[FabricRuntimeUtil.LOCAL_FABRIC]) {

            const runtimeToCopy: any = {
                ports: {}
            };

            runtimeToCopy.ports = oldRuntimeSetting.ports;

            // If either fabric.runtimes and fabric.runtime existed and has ports
            if (runtimeToCopy.ports) {

                const newPorts: FabricRuntimePorts = this.updatePortsToNames(runtimeToCopy.ports);
                // Update new property with old settings values
                runtimeToCopy[FabricRuntimeUtil.LOCAL_FABRIC] = {
                    ports: newPorts
                };
                delete runtimeToCopy.ports;

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

        // Presumably we want to teardown every local Fabric (?)
        for (const runtime of this.runtimes.values()) {

            outputAdapter.log(LogType.WARNING, null, `Attempting to teardown old ${runtime.getName()} from version <= 0.3.3`);
            outputAdapter.log(LogType.WARNING, null, 'Any error messages from this process can be safely ignored (for example, container does not exist');
            if (process.platform === 'win32') {
                await CommandUtil.sendCommandWithOutput('cmd', ['/c', 'teardown.cmd'], basicNetworkPath, null, outputAdapter);
            } else {
                await CommandUtil.sendCommandWithOutput('/bin/sh', ['teardown.sh'], basicNetworkPath, null, outputAdapter);
            }
            outputAdapter.log(LogType.WARNING, null, `Finished attempting to teardown old ${runtime.getName()} from version <= 0.3.3`);

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
            for (const section of Object.values(settings) as {ports: FabricRuntimePorts}[]) {
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

    private updatePortsToNames(ports: any): FabricRuntimePorts {
        // Assume they have the old style ports
        const portList: number[] = Object.values(ports);

        if (portList.length === 0) {
            // Push a default port number
            portList.push(17050);
        }

        const startPort: number = Math.min(...portList);

        // Decide on end port
        const endPort: number = startPort + 20;
        return {
            startPort,
            endPort
        };
    }
}
