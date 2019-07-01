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
import { IFabricWallet } from './IFabricWallet';
import { FabricWalletGeneratorFactory } from './FabricWalletGeneratorFactory';
import { IFabricWalletGenerator } from './IFabricWalletGenerator';
import { FabricGatewayRegistryEntry } from './FabricGatewayRegistryEntry';
import { FabricWalletUtil } from './FabricWalletUtil';
import { FabricGateway } from './FabricGateway';
import { FabricWalletRegistryEntry } from './FabricWalletRegistryEntry';
import * as semver from 'semver';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { CommandUtil } from '../util/CommandUtil';
import * as path from 'path';
import { LogType } from '../logging/OutputAdapter';
import { SettingConfigurations } from '../../SettingConfigurations';
import { FabricRuntimeUtil } from './FabricRuntimeUtil';
import { FabricEnvironmentRegistryEntry } from './FabricEnvironmentRegistryEntry';
import { FabricEnvironmentManager } from './FabricEnvironmentManager';
import { VSCodeBlockchainDockerOutputAdapter } from '../logging/VSCodeBlockchainDockerOutputAdapter';

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
        if (runtimeObject.ports && runtimeObject.developmentMode !== undefined) {
            this.runtime = new FabricRuntime();
            this.runtime.ports = runtimeObject.ports;
            this.runtime.developmentMode = runtimeObject.developmentMode;
        } else {
            // Generate a range of ports for this Fabric runtime.
            const ports: FabricRuntimePorts = await this.generatePortConfiguration();

            // Add the Fabric runtime to the internal cache.
            this.runtime = new FabricRuntime();
            this.runtime.ports = ports;
            this.runtime.developmentMode = false;
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

    public async getGatewayRegistryEntries(): Promise<FabricGatewayRegistryEntry[]> {
        const runtime: FabricRuntime = this.getRuntime();
        const gateways: FabricGateway[] = await runtime.getGateways();
        return gateways.map((gateway: FabricGateway) => new FabricGatewayRegistryEntry({
            name: gateway.name,
            managedRuntime: true,
            connectionProfilePath: gateway.path,
            associatedWallet: FabricWalletUtil.LOCAL_WALLET
        }));
    }

    public getEnvironmentRegistryEntry(): FabricEnvironmentRegistryEntry {
        const runtime: FabricRuntime = this.getRuntime();
        return new FabricEnvironmentRegistryEntry({
            name: runtime.getName(),
            managedRuntime: true,
            associatedWallet: FabricWalletUtil.LOCAL_WALLET
        });
    }

    public async getWalletRegistryEntries(): Promise<FabricWalletRegistryEntry[]> {
        const runtime: FabricRuntime = this.getRuntime();
        const walletNames: string[] = await runtime.getWalletNames();
        const entries: FabricWalletRegistryEntry[] = [];
        const walletGenerator: IFabricWalletGenerator = FabricWalletGeneratorFactory.createFabricWalletGenerator();
        for (const walletName of walletNames) {
            const wallet: IFabricWallet = await walletGenerator.createLocalWallet(walletName);
            entries.push(new FabricWalletRegistryEntry({
                name: walletName,
                walletPath: wallet.getWalletPath(),
                managedWallet: true
            }));
        }
        return entries;
    }

    public async migrate(oldVersion: string): Promise<void> {
        const runtimeSetting: any = await this.migrateRuntimesConfiguration();
        await this.migrateRuntimeConfiguration(runtimeSetting);
        await this.migrateRuntimeContainers(oldVersion);
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
            },
            developmentMode: boolean
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
                },
                developmentMode: runtimeSettings.developmentMode
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
                ports: {},
                developmentMode: false
            };
            for (const oldRuntime of oldRuntimeSettings) {
                if (oldRuntime.name === FabricRuntimeUtil.LOCAL_FABRIC) {
                    runtimeToCopy.ports = oldRuntime.ports;
                    runtimeToCopy.developmentMode = oldRuntime.developmentMode;

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

    private async migrateRuntimeConfiguration(oldRuntimeSetting: any): Promise<void> {
        const runtimeObj: any = await this.readRuntimeUserSettings();
        if (oldRuntimeSetting && !runtimeObj.ports) {
            const runtimeToCopy: any = {
                ports: {},
                developmentMode: false
            };

            runtimeToCopy.ports = oldRuntimeSetting.ports;
            runtimeToCopy.developmentMode = oldRuntimeSetting.developmentMode;

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
        outputAdapter.log(LogType.WARNING, null, 'Attempting to teardown old local Fabric from version <= 0.3.3');
        outputAdapter.log(LogType.WARNING, null, 'Any error messages from this process can be safely ignored (for example, container does not exist');
        if (process.platform === 'win32') {
            await CommandUtil.sendCommandWithOutput('cmd', ['/c', 'teardown.cmd'], basicNetworkPath, null, outputAdapter);
        } else {
            await CommandUtil.sendCommandWithOutput('/bin/sh', ['teardown.sh'], basicNetworkPath, null, outputAdapter);
        }
        outputAdapter.log(LogType.WARNING, null, 'Finished attempting to teardown old local Fabric from version <= 0.3.3');

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
