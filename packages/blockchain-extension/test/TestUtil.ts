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
// tslint:disable: no-console

import { ExtensionUtil } from '../extension/util/ExtensionUtil';
import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as sinon from 'sinon';
import * as path from 'path';
import { SettingConfigurations } from '../extension/configurations';
import { SinonSandbox, SinonStub } from 'sinon';
import { FabricRuntimeUtil, FileConfigurations, FabricEnvironmentRegistryEntry } from 'ibm-blockchain-platform-common';
import { GlobalState, ExtensionData } from '../extension/util/GlobalState';
import { LocalEnvironment } from '../extension/fabric/environments/LocalEnvironment';
// import { YeomanUtil } from '../extension/util/YeomanUtil';

export class TestUtil {

    public static EXTENSION_TEST_DIR: string = path.join(__dirname, '..', '..', 'test', 'tmp');

    static async setupTests(sandbox?: SinonSandbox): Promise<void> {
        if (!ExtensionUtil.isActive()) {
            await this.storeAll();
            await vscode.workspace.getConfiguration().update(SettingConfigurations.EXTENSION_DIRECTORY, this.EXTENSION_TEST_DIR, vscode.ConfigurationTarget.Global);
            await vscode.workspace.getConfiguration().update(SettingConfigurations.EXTENSION_BYPASS_PREREQS, true, vscode.ConfigurationTarget.Global);
            await vscode.workspace.getConfiguration().update(SettingConfigurations.EXTENSION_LOCAL_FABRIC, true, vscode.ConfigurationTarget.Global);
            await vscode.workspace.getConfiguration().update(SettingConfigurations.HOME_SHOW_ON_NEXT_ACTIVATION, false, vscode.ConfigurationTarget.Global);

            if (!sandbox) {
                sandbox = sinon.createSandbox();
            }

            // Uncommenting this showConfirmationWarningMessage stuff makes the test run correctly now for some reason. Maybe because the local fabric name changed?
            // const showConfirmationWarningMessage: SinonStub = sandbox.stub(UserInputUtil, 'showConfirmationWarningMessage');
            // showConfirmationWarningMessage.withArgs(`The ${FabricRuntimeUtil.LOCAL_FABRIC} configuration is out of date and must be torn down before updating. Do you want to teardown your ${FabricRuntimeUtil.LOCAL_FABRIC} now?`).resolves(false);
            const createStub: SinonStub = sandbox.stub(LocalEnvironment.prototype, 'create').resolves();
            await this.setupLocalFabric();
            await ExtensionUtil.activateExtension();

            createStub.restore();
            // showConfirmationWarningMessage.restore();
        }
    }

    static async setupLocalFabric(): Promise<void> {

        await fs.ensureDir(this.EXTENSION_TEST_DIR);

        // Ensure the environments directory exists first
        const environmentDir: string = path.join(this.EXTENSION_TEST_DIR, 'v2', FileConfigurations.FABRIC_ENVIRONMENTS, FabricRuntimeUtil.LOCAL_FABRIC);
        await fs.ensureDir(environmentDir);

        // Copy the generated 'Local Fabric' directory into the environments directory.
        const localFabricDir: string = path.join(this.EXTENSION_TEST_DIR, '..', 'data', FabricRuntimeUtil.LOCAL_FABRIC);
        await fs.copy(localFabricDir, environmentDir);
        const envReg: FabricEnvironmentRegistryEntry = await fs.readJSON(path.join(environmentDir, '.config.json'));
        envReg.environmentDirectory = environmentDir;
        await fs.writeJSON(path.join(environmentDir, '.config.json'), envReg);
    }

    static async storeAll(): Promise<void> {
        await this.storeExtensionDirectoryConfig();
        await this.storeRuntimesConfig();
        await this.storeShowHomeOnStart();
        await this.storeBypassPreReqs();
        await this.storeEnableLocalFabric();
        try {
            await this.storeGlobalState();
        } catch (error) {
            // ignore
        }
    }

    static async restoreAll(): Promise<void> {
        await this.restoreExtensionDirectoryConfig();
        await this.restoreRuntimesConfig();
        await this.restoreShowHomeOnStart();
        await this.restoreBypassPreReqs();
        await this.restoreEnableLocalFabric();
        try {
            await this.restoreGlobalState();
        } catch (error) {
            // ignore
        }
    }

    static async storeExtensionDirectoryConfig(): Promise<void> {
        this.USER_PACKAGE_DIR_CONFIG = await vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_DIRECTORY);
        console.log('Storing user extension directory:', this.USER_PACKAGE_DIR_CONFIG);
    }
    static async restoreExtensionDirectoryConfig(): Promise<void> {
        console.log('Restoring user extension directory to settings:', this.USER_PACKAGE_DIR_CONFIG);
        await vscode.workspace.getConfiguration().update(SettingConfigurations.EXTENSION_DIRECTORY, this.USER_PACKAGE_DIR_CONFIG, vscode.ConfigurationTarget.Global);
    }
    static async storeRuntimesConfig(): Promise<void> {
        this.USER_RUNTIMES_CONFIG = await vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_RUNTIME);
        console.log('Storing user runtimes:', this.USER_RUNTIMES_CONFIG);
    }
    static async restoreRuntimesConfig(): Promise<void> {
        console.log('Restoring user runtimes config to settings:', this.USER_RUNTIMES_CONFIG);
        await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, this.USER_RUNTIMES_CONFIG, vscode.ConfigurationTarget.Global);
    }

    static async storeShowHomeOnStart(): Promise<void> {
        this.HOME_STARTUP = await vscode.workspace.getConfiguration().get(SettingConfigurations.HOME_SHOW_ON_STARTUP);
        console.log('Storing home startup:', this.HOME_STARTUP);
    }
    static async restoreShowHomeOnStart(): Promise<void> {
        console.log('Restoring show home on startup config to settings:', this.HOME_STARTUP);
        await vscode.workspace.getConfiguration().update(SettingConfigurations.HOME_SHOW_ON_STARTUP, this.HOME_STARTUP, vscode.ConfigurationTarget.Global);
    }

    static async storeBypassPreReqs(): Promise<void> {
        this.BYPASS_PREREQS = await vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_BYPASS_PREREQS);
        console.log('Storing bypass prereqs:', this.BYPASS_PREREQS);
    }
    static async restoreBypassPreReqs(): Promise<void> {
        console.log('Restoring bypass prereqs to settings:', this.BYPASS_PREREQS);
        await vscode.workspace.getConfiguration().update(SettingConfigurations.EXTENSION_BYPASS_PREREQS, this.BYPASS_PREREQS, vscode.ConfigurationTarget.Global);
    }

    static async storeGlobalState(): Promise<void> {
        this.GLOBAL_STATE = GlobalState.get();
    }

    static async restoreGlobalState(): Promise<void> {
        await GlobalState.update(this.GLOBAL_STATE);
    }

    static async storeEnableLocalFabric(): Promise<void> {
        this.ENABLE_LOCAL_FABRIC = await vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_LOCAL_FABRIC);
        console.log('Storing enable Local Fabric to settings:', this.ENABLE_LOCAL_FABRIC);
    }

    static async restoreEnableLocalFabric(): Promise<void> {
        console.log('Restoring enable Local Fabric to settings:', this.ENABLE_LOCAL_FABRIC);
        await vscode.workspace.getConfiguration().update(SettingConfigurations.EXTENSION_LOCAL_FABRIC, this.ENABLE_LOCAL_FABRIC, vscode.ConfigurationTarget.Global);
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
    static async storeShowHomeOnNextStart(): Promise<void> {
        this.HOME_STARTUP_NEXT = await vscode.workspace.getConfiguration().get(SettingConfigurations.HOME_SHOW_ON_NEXT_ACTIVATION);
        console.log('Storing home startup on next activation:', this.HOME_STARTUP_NEXT);
    }
    static async restoreShowHomeOnNextStart(): Promise<void> {
        console.log('Restoring show home startup on next activation config to settings:', this.HOME_STARTUP_NEXT);
        await vscode.workspace.getConfiguration().update(SettingConfigurations.HOME_SHOW_ON_NEXT_ACTIVATION, this.HOME_STARTUP_NEXT, vscode.ConfigurationTarget.Global);
    }

    private static USER_PACKAGE_DIR_CONFIG: any;
    private static USER_RUNTIMES_CONFIG: any;
    private static HOME_STARTUP: any;
    private static BYPASS_PREREQS: any;
    private static GLOBAL_STATE: ExtensionData;
    private static ENABLE_LOCAL_FABRIC: boolean;
    private static HOME_STARTUP_NEXT: boolean;
}
