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
import { FabricRuntime } from './FabricRuntime';
import { FabricRuntimePorts } from './FabricRuntimePorts';
import * as semver from 'semver';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { CommandUtil } from '../util/CommandUtil';
import * as path from 'path';
import * as fs from 'fs-extra';
import { LogType } from '../logging/OutputAdapter';
import { SettingConfigurations } from '../../configurations';
import { FabricRuntimeUtil } from 'ibm-blockchain-platform-common';
import { FabricEnvironmentRegistryEntry } from '../registries/FabricEnvironmentRegistryEntry';
import { FabricEnvironmentManager } from './FabricEnvironmentManager';
import { VSCodeBlockchainDockerOutputAdapter } from '../logging/VSCodeBlockchainDockerOutputAdapter';
import { FileSystemUtil } from '../util/FileSystemUtil';

export class FabricRuntimeManager {

    public static findFreePort: any = require('find-free-port');

    public static instance(): FabricRuntimeManager {
        return this._instance;
    }

    private static _instance: FabricRuntimeManager = new FabricRuntimeManager();

    private runtime: FabricRuntime;

    private constructor() {
    }

    public getRuntime(): FabricRuntime {
        return this.runtime;
    }

    public async initialize(): Promise<void> {

        // only generate a range of ports if it doesn't already exist
        const runtimeObject: any = this.readRuntimeUserSettings();
        if (runtimeObject.ports) {
            this.runtime = new FabricRuntime();
            this.runtime.ports = runtimeObject.ports;
        } else {
            // Generate a range of ports for this Fabric runtime.
            const ports: FabricRuntimePorts = await this.generatePortConfiguration();

            // Add the Fabric runtime to the internal cache.
            this.runtime = new FabricRuntime();
            this.runtime.ports = ports;
            await this.runtime.updateUserSettings();
        }

        // Check to see if the runtime has been created.
        const created: boolean = await this.runtime.isCreated();
        if (!created) {
            // Nope - create it now.
            await this.runtime.create();

        }

        // Import all of the wallets and identities as well.
        await this.runtime.importWalletsAndIdentities();

        // Import all of the gateways
        await this.runtime.importGateways();

        FabricEnvironmentManager.instance().on('connected', async () => {
            const registryEntry: FabricEnvironmentRegistryEntry = FabricEnvironmentManager.instance().getEnvironmentRegistryEntry();
            if (registryEntry.name === FabricRuntimeUtil.LOCAL_FABRIC) {
                const outputAdapter: VSCodeBlockchainDockerOutputAdapter = VSCodeBlockchainDockerOutputAdapter.instance();
                await this.runtime.startLogs(outputAdapter);
            }
        });

        FabricEnvironmentManager.instance().on('disconnected', async () => {
            await this.runtime.stopLogs();
        });
    }

    public async migrate(oldVersion: string): Promise<void> {
        const runtimeSetting: any = await this.migrateRuntimesConfiguration();
        await this.migrateRuntimeConfiguration(runtimeSetting);
        await this.migrateRuntimeContainers(oldVersion);
        await this.migrateRuntimeFolder();
    }

    private readRuntimeUserSettings(): any {
        const runtimeSettings: any = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_RUNTIME) as {
            ports: {
                orderer: number,
                peerRequest: number,
                peerChaincode: number,
                peerEventHub: number,
                certificateAuthority: number,
                couchDB: number,
                logs: number
            }
        };
        if (runtimeSettings.ports) {
            const runtimeObject: any = {
                ports: {
                    orderer: runtimeSettings.ports.orderer,
                    peerRequest: runtimeSettings.ports.peerRequest,
                    peerChaincode: runtimeSettings.ports.peerChaincode,
                    peerEventHub: runtimeSettings.ports.peerEventHub,
                    certificateAuthority: runtimeSettings.ports.certificateAuthority,
                    couchDB: runtimeSettings.ports.couchDB,
                    logs: runtimeSettings.ports.logs
                }
            };
            return runtimeObject;
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
                if (oldRuntime.name === FabricRuntimeUtil.LOCAL_FABRIC) {
                    runtimeToCopy.ports = oldRuntime.ports;

                    // Generate a logs port
                    const highestPort: number = this.getHighestPort(runtimeToCopy.ports);
                    runtimeToCopy.ports.logs = await this.generateLogsPort(highestPort);

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

                // If previous settings didn't have 'logs' property
                if (!runtimeToCopy.ports.logs) {
                    // Generate a logs port
                    const highestPort: number = this.getHighestPort(runtimeToCopy.ports);
                    runtimeToCopy.ports.logs = await this.generateLogsPort(highestPort);
                }

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
        outputAdapter.log(LogType.WARNING, null, `Attempting to teardown old ${FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME} from version <= 0.3.3`);
        outputAdapter.log(LogType.WARNING, null, 'Any error messages from this process can be safely ignored (for example, container does not exist');
        if (process.platform === 'win32') {
            await CommandUtil.sendCommandWithOutput('cmd', ['/c', 'teardown.cmd'], basicNetworkPath, null, outputAdapter);
        } else {
            await CommandUtil.sendCommandWithOutput('/bin/sh', ['teardown.sh'], basicNetworkPath, null, outputAdapter);
        }
        outputAdapter.log(LogType.WARNING, null, `Finished attempting to teardown old ${FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME} from version <= 0.3.3`);

    }

    private async generateLogsPort(highestPort: number): Promise<number> {

        const freep: number[] = await FabricRuntimeManager.findFreePort(highestPort + 1, null, null, 1);

        return freep[0];

    }

    private getHighestPort(ports: FabricRuntimePorts): number {
        let port: number = 17050;
        const portNames: string[] = Object.keys(ports);
        for (const portName of portNames) {
            const thisPort: number = ports[portName];
            if (thisPort > port) {
                port = thisPort;
            }
        }
        return port;
    }

    private async generatePortConfiguration(): Promise<FabricRuntimePorts> {
        const ports: FabricRuntimePorts = new FabricRuntimePorts();
        const [
            orderer,
            peerRequest,
            peerChaincode,
            peerEventHub,
            certificateAuthority,
            couchDB,
            logs
        ]: number[] = await FabricRuntimeManager.findFreePort(17050, null, null, 7);
        ports.orderer = orderer;
        ports.peerRequest = peerRequest;
        ports.peerChaincode = peerChaincode;
        ports.peerEventHub = peerEventHub;
        ports.certificateAuthority = certificateAuthority;
        ports.couchDB = couchDB;
        ports.logs = logs;
        return ports;
    }
}
