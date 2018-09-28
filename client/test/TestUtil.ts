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

export class TestUtil {
    static async setupTests() {
        if (!ExtensionUtil.isActive()) {
            await ExtensionUtil.activateExtension();
        } else {
            const context: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();
            myExtension.registerCommands(context);
        }
    }
    static async storePackageDirectoryConfig() {
        this.USER_PACKAGE_DIR_CONFIG = await vscode.workspace.getConfiguration().get('fabric.package.directory');
        console.log('Storing user package directory:', this.USER_PACKAGE_DIR_CONFIG);
    }
    static async restorePackageDirectoryConfig() {
        console.log('Restoring user package directory to settings:', this.USER_PACKAGE_DIR_CONFIG);
        await vscode.workspace.getConfiguration().update('fabric.package.directory', this.USER_PACKAGE_DIR_CONFIG, vscode.ConfigurationTarget.Global);
    }
    static async storeConnectionsConfig() {
        this.USER_CONNECTIONS_CONFIG = await vscode.workspace.getConfiguration().get('fabric.connections');
        console.log('Storing user connections config:', this.USER_CONNECTIONS_CONFIG);
    }
    static async restoreConnectionsConfig() {
        console.log('Restoring user connections config to settings:', this.USER_CONNECTIONS_CONFIG);
        await vscode.workspace.getConfiguration().update('fabric.connections', this.USER_CONNECTIONS_CONFIG, vscode.ConfigurationTarget.Global);
    }

    static async storeRuntimesConfig() {
        this.USER_RUNTIMES_CONFIG = await vscode.workspace.getConfiguration().get('fabric.runtimes');
        console.log('Storing user runtimes:', this.USER_RUNTIMES_CONFIG);
    }
    static async restoreRuntimesConfig() {
        console.log('Restoring user runtimes config to settings:', this.USER_RUNTIMES_CONFIG);
        await vscode.workspace.getConfiguration().update('fabric.runtimes', this.USER_RUNTIMES_CONFIG, vscode.ConfigurationTarget.Global);
    }

    private static USER_PACKAGE_DIR_CONFIG;
    private static USER_CONNECTIONS_CONFIG;
    private static USER_RUNTIMES_CONFIG;
}
