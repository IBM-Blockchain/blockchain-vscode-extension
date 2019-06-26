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
'use strict';
import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as yaml from 'js-yaml';
import * as os from 'os';

import { SettingConfigurations } from '../../SettingConfigurations';
import * as dateFormat from 'dateformat';

export class ExtensionData {
    public activationCount: number;
    public version: string;
    public migrationCheck: number;
    public generatorVersion: string;
}

export const EXTENSION_DATA_KEY: string = 'ibm-blockchain-platform-extension-data';

export const DEFAULT_EXTENSION_DATA: ExtensionData = {
    activationCount: 0,
    version: null,
    migrationCheck: 0,
    generatorVersion: null // Used to check if the generator needs updating
};

export const FABRIC_CLIENT_VERSION: string = '1.4.3';
export const FABRIC_NETWORK_VERSION: string = '1.4.2';

// tslint:disable-next-line: max-classes-per-file
export class ExtensionUtil {

    static readonly DEBUG_PACKAGE_PREFIX: string = 'vscode-debug';

    public static getPackageJSON(): any {
        return this.getExtension().packageJSON;
    }

    public static isActive(): boolean {
        return this.getExtension().isActive;
    }

    public static activateExtension(): Thenable<void> {
        return this.getExtension().activate();
    }

    public static getExtensionPath(): string {
        return this.getExtension().extensionPath;
    }

    public static getExtensionContext(): vscode.ExtensionContext {
        return this.extensionContext;
    }

    public static setExtensionContext(context: vscode.ExtensionContext): void {
        this.extensionContext = context;
    }

    public static async getContractNameAndVersion(folder: vscode.WorkspaceFolder): Promise<{ name: string, version: string }> {
        try {
            const packageJson: any = await this.loadJSON(folder, 'package.json');
            return { name: packageJson.name, version: packageJson.version };
        } catch (error) {
            return;
        }
    }

    public static async loadJSON(folder: vscode.WorkspaceFolder, file: string): Promise<any> {
        try {
            const workspacePackage: string = path.join(folder.uri.fsPath, file);
            const workspacePackageContents: string = await fs.readFile(workspacePackage, 'utf8');
            return JSON.parse(workspacePackageContents);
        } catch (error) {
            throw new Error('error reading package.json from project ' + error.message);
        }
    }

    public static async readConnectionProfile(connectionProfilePath: string): Promise<object> {
        const connectionProfileContents: string = await fs.readFile(connectionProfilePath, 'utf8');
        let connectionProfile: object;
        if (connectionProfilePath.endsWith('.json')) {
            connectionProfile = JSON.parse(connectionProfileContents);
        } else if (connectionProfilePath.endsWith('.yaml') || connectionProfilePath.endsWith('.yml')) {
            connectionProfile = yaml.safeLoad(connectionProfileContents);
        } else {
            throw new Error('Connection profile must be in JSON or yaml format');
        }
        return connectionProfile;
    }

    // Migrate user setting configurations
    public static async migrateSettingConfigurations(): Promise<any> {
        // No need to handle migrating 'fabric.runtime' to the new configuration as this is handled in FabricRuntimeManager

        // Migrate Fabric gateways
        const oldGateways: any = vscode.workspace.getConfiguration().get('fabric.gateways');
        if (oldGateways !== undefined) {
            const newGateways: any = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_GATEWAYS);
            if (oldGateways && newGateways.length === 0) {
                await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_GATEWAYS, oldGateways, vscode.ConfigurationTarget.Global);
            }
        }

        // Migrate Fabric gateways
        const oldWallets: any = vscode.workspace.getConfiguration().get('fabric.wallets');
        if (oldWallets !== undefined) {
            const newWallets: any = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_WALLETS);
            if (oldWallets && newWallets.length === 0) {
                await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_WALLETS, oldWallets, vscode.ConfigurationTarget.Global);
            }
        }

        // Migrate extension repositories
        const oldRepositories: any = vscode.workspace.getConfiguration().get('blockchain.repositories');
        if (oldRepositories !== undefined) {
            const newRepositories: any = vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_REPOSITORIES);
            if (oldRepositories && newRepositories.length === 0) {
                await vscode.workspace.getConfiguration().update(SettingConfigurations.EXTENSION_REPOSITORIES, oldRepositories, vscode.ConfigurationTarget.Global);
            }
        }

        // Migrate extension directory
        const oldDirectory: any = vscode.workspace.getConfiguration().get('blockchain.ext.directory');
        if (oldDirectory !== undefined) {
            await vscode.workspace.getConfiguration().update(SettingConfigurations.EXTENSION_DIRECTORY, oldDirectory, vscode.ConfigurationTarget.Global);
        }

    }

    public static skipNpmInstall(): boolean {
        return false; // We should never skip npm install, except for unit tests
    }

    public static checkIfIBMer(): boolean {
        let isIBMer: boolean = false;
        const networkInterfaces: { [index: string]: os.NetworkInterfaceInfo[] } = os.networkInterfaces();
        const keys: string[] = Object.keys(networkInterfaces);
        keys.forEach((key: string) => {
            const interfaces: os.NetworkInterfaceInfo[] = networkInterfaces[key];
            const foundInterfaces: os.NetworkInterfaceInfo[] = interfaces.filter((_interface: os.NetworkInterfaceInfo) => {
                return _interface.family === 'IPv4' && _interface.address.startsWith('9.');
            });

            if (foundInterfaces.length > 0) {
                isIBMer = true;
            }
        });
        return isIBMer;
    }

    public static getNewDebugVersion(): string {
        const date: Date = new Date();
        const formattedDate: string = dateFormat(date, 'yyyymmddHHMMss');
        return `${this.DEBUG_PACKAGE_PREFIX}-${formattedDate}`;
    }

    private static extensionContext: vscode.ExtensionContext;

    private static getExtension(): vscode.Extension<any> {
        return vscode.extensions.getExtension('IBMBlockchain.ibm-blockchain-platform');
    }
}
