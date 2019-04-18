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

import { ExtensionUtil } from '../src/util/ExtensionUtil';
import * as myExtension from '../src/extension';
import * as vscode from 'vscode';
import * as fs from 'fs-extra';

export class TestUtil {
    static async setupTests(): Promise<void> {
        if (!ExtensionUtil.isActive()) {
            await ExtensionUtil.activateExtension();
        } else {
            const context: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();
            await myExtension.registerCommands(context);
        }
    }
    static async storeExtensionDirectoryConfig(): Promise<void> {
        this.USER_PACKAGE_DIR_CONFIG = await vscode.workspace.getConfiguration().get('blockchain.ext.directory');
        console.log('Storing user extension directory:', this.USER_PACKAGE_DIR_CONFIG);
    }
    static async restoreExtensionDirectoryConfig(): Promise<void> {
        console.log('Restoring user extension directory to settings:', this.USER_PACKAGE_DIR_CONFIG);
        await vscode.workspace.getConfiguration().update('blockchain.ext.directory', this.USER_PACKAGE_DIR_CONFIG, vscode.ConfigurationTarget.Global);
    }
    static async storeGatewaysConfig(): Promise<void> {
        this.USER_GATEWAYS_CONFIG = await vscode.workspace.getConfiguration().get('fabric.gateways');
        console.log('Storing user connections config:', this.USER_GATEWAYS_CONFIG);
    }
    static async restoreGatewaysConfig(): Promise<void> {
        console.log('Restoring user connections config to settings:', this.USER_GATEWAYS_CONFIG);
        await vscode.workspace.getConfiguration().update('fabric.gateways', this.USER_GATEWAYS_CONFIG, vscode.ConfigurationTarget.Global);
    }

    static async storeRuntimesConfig(): Promise<void> {
        this.USER_RUNTIMES_CONFIG = await vscode.workspace.getConfiguration().get('fabric.runtime');
        console.log('Storing user runtimes:', this.USER_RUNTIMES_CONFIG);
    }
    static async restoreRuntimesConfig(): Promise<void> {
        console.log('Restoring user runtimes config to settings:', this.USER_RUNTIMES_CONFIG);
        await vscode.workspace.getConfiguration().update('fabric.runtime', this.USER_RUNTIMES_CONFIG, vscode.ConfigurationTarget.Global);
    }

    static async storeWalletsConfig(): Promise<void> {
        this.USER_WALLETS_CONFIG = await vscode.workspace.getConfiguration().get('fabric.wallets');
        console.log('Storing user wallets:', this.USER_WALLETS_CONFIG);
    }
    static async restoreWalletsConfig(): Promise<void> {
        console.log('Restoring user wallets config to settings:', this.USER_WALLETS_CONFIG);
        await vscode.workspace.getConfiguration().update('fabric.wallets', this.USER_WALLETS_CONFIG, vscode.ConfigurationTarget.Global);
    }

    static async storeRepositoriesConfig(): Promise<void> {
        this.USER_REPOSITORIES = await vscode.workspace.getConfiguration().get('blockchain.repositories');
        console.log('Storing repositories:', this.USER_REPOSITORIES);
    }
    static async restoreRepositoriesConfig(): Promise<void> {
        console.log('Restoring repositories config to settings:', this.USER_REPOSITORIES);
        await vscode.workspace.getConfiguration().update('blockchain.repositories', this.USER_REPOSITORIES, vscode.ConfigurationTarget.Global);
    }

    static async storeShowHomeOnStart(): Promise<void> {
        this.HOME_STARTUP = await vscode.workspace.getConfiguration().get('extension.home.showOnStartup');
        console.log('Storing home startup:', this.HOME_STARTUP);
    }
    static async restoreShowHomeOnStart(): Promise<void> {
        console.log('Restoring show home on startup config to settings:', this.HOME_STARTUP);
        await vscode.workspace.getConfiguration().update('extension.home.showOnStartup', this.HOME_STARTUP, vscode.ConfigurationTarget.Global);
    }

    static async deleteTestFiles(deletePath: string): Promise<void> {
        try {
            await fs.remove(deletePath);
        } catch (error) {
            if (!error.message.includes('ENOENT: no such file or directory')) {
                throw error;
            }
        }
    }

    private static USER_PACKAGE_DIR_CONFIG: any;
    private static USER_GATEWAYS_CONFIG: any;
    private static USER_RUNTIMES_CONFIG: any;
    private static USER_WALLETS_CONFIG: any;
    private static USER_REPOSITORIES: any;
    private static HOME_STARTUP: any;
}
