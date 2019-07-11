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

import { Dependency } from './Dependency';
import { ExtensionUtil } from '../util/ExtensionUtil';

import * as path from 'path';
import * as fs from 'fs-extra';
import * as vscode from 'vscode';

import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { CommandUtil } from '../util/CommandUtil';
import { TemporaryCommandRegistry } from './TemporaryCommandRegistry';
import { LogType } from '../logging/OutputAdapter';

export class DependencyManager {

    public static instance(): DependencyManager {
        return this._instance;
    }

    private static _instance: DependencyManager = new DependencyManager();

    private dependencies: Array<Dependency> = [];

    private constructor() {

    }

    // Need this function as proxyquire doesn't work
    public async requireNativeDependencies(): Promise<void> {
        const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
        const packageJSON: any = await this.getRawPackageJson();
        const nativeModules: string[] = Object.keys(packageJSON.nativeDependencies);
        for (const _module of nativeModules) {
            outputAdapter.log(LogType.INFO, undefined, `Attempting to require dependency: ${_module}`);
            require(_module);
        }
    }

    public async hasNativeDependenciesInstalled(): Promise<boolean> {
        const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();

        try {
            await this.requireNativeDependencies();
        } catch (error) {
            outputAdapter.log(LogType.INFO, undefined, `Error requiring dependency: ${error.message}`);
            return false; // Dependency cannot be required
        }

        const packageJSON: any = await this.getRawPackageJson();
        return packageJSON.activationEvents.length > 1;
    }

    public async installNativeDependencies(): Promise<void> {
        const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();

        const tempCommandRegistry: TemporaryCommandRegistry = TemporaryCommandRegistry.instance();
        tempCommandRegistry.createTempCommands();
        this.loadDependencies();
        await this.installNativeDependenciesInternal();

        outputAdapter.log(LogType.INFO, undefined, 'Rewriting activation events');
        await this.rewritePackageJson();

        outputAdapter.log(LogType.INFO, undefined, 'Clearing extension cache');
        await this.clearExtensionCache();

        outputAdapter.log(LogType.INFO, undefined, 'Restoring command registry');
        await tempCommandRegistry.restoreCommands();
    }

    private getPackageJsonPath(): string {
        return path.resolve(ExtensionUtil.getExtensionPath(), 'package.json');
    }

    private loadDependencies(): void {
        const os: string = `${process.platform}-${process.arch}`;
        const packageJSON: any = ExtensionUtil.getPackageJSON();

        this.dependencies = [];

        const dependencyKeys: Array<string> = Object.keys(packageJSON.nativeDependencies);

        for (const moduleName of dependencyKeys) {
            const module: string = packageJSON.nativeDependencies[moduleName];
            const moduleOS: any = module[os];

            const dependency: Dependency = new Dependency();

            dependency.moduleName = moduleName;
            dependency.original = moduleOS.original;
            dependency.new = moduleOS.new;

            this.dependencies.push(dependency);
        }
    }

    private async installNativeDependenciesInternal(): Promise<void> {
        const extensionPath: string = ExtensionUtil.getExtensionPath();

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'IBM Blockchain Platform Extension',
            cancellable: false
        }, async (progress: vscode.Progress<{message: string}>) => {

            const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();

            outputAdapter.log(LogType.INFO, undefined, 'Updating native node modules');
            progress.report({message: 'Updating native node modules'});

            for (const dependency of this.dependencies) {
                outputAdapter.log(LogType.INFO, undefined, 'Rebuilding native node modules');
                progress.report({message: 'Rebuilding native node modules'});

                // npm needs to run in a shell on Windows
                const shell: boolean = (process.platform === 'win32') ? true : false;

                try {
                    const architecture: string = process.arch; // Returns the architecture Code is running on
                    await CommandUtil.sendCommandWithOutput('npm', ['rebuild', dependency.moduleName, '--target=4.1.5', '--runtime=electron', '--dist-url=https://atom.io/download/electron', '--update-binary', '--fallback-to-build', `--target_arch=${architecture}`], extensionPath, null, outputAdapter, shell);

                } catch (error) {
                    outputAdapter.log(LogType.ERROR, `Could not rebuild native dependencies ${error.message}. Please ensure that you have node and npm installed`);
                    throw error;
                }

                progress.report({message: `Updating ${dependency.moduleName}`});
                outputAdapter.log(LogType.INFO, undefined, `Updating ${dependency.moduleName}`);
                await fs.remove(`${extensionPath}/${dependency.original}`);
                await fs.rename(`${extensionPath}/${dependency.new}`, `${extensionPath}/${dependency.original}`);
            }

            outputAdapter.log(LogType.SUCCESS, undefined, 'Finished updating native node modules');
            progress.report({message: 'Finished updating native node modules'});
        });
    }

    private async getRawPackageJson(): Promise<any> {
        // Use getRawPackageJson to read and write back to package.json
        // This prevents obtaining any of VSCode's expanded variables.
        const fileContents: Buffer = await fs.readFile(this.getPackageJsonPath());
        return JSON.parse(fileContents.toString());
    }

    private async writePackageJson(packageJson: any): Promise<void> {
        const packageJsonString: string = JSON.stringify(packageJson, null, 4);

        return fs.writeFile(this.getPackageJsonPath(), packageJsonString, 'utf8');
    }

    private async rewritePackageJson(): Promise<void> {
        // Replace activationEvents with the events that the extension should be activated for subsequent sessions.
        const packageJson: any = await this.getRawPackageJson();

        packageJson.activationEvents = [];

        packageJson.actualActivationEvents.onView.forEach((event: string) => {
            packageJson.activationEvents.push('onView:' + event);
        });

        packageJson.actualActivationEvents.onCommand.forEach((event: string) => {
            packageJson.activationEvents.push('onCommand:' + event);
        });

        packageJson.actualActivationEvents.other.forEach((event: string) => {
            packageJson.activationEvents.push(event);
        });

        return this.writePackageJson(packageJson);
    }

    private async clearExtensionCache(): Promise<void> {
        const extensionPath: string = ExtensionUtil.getExtensionPath();
        const extensionsPath: string = path.resolve(extensionPath, '..');
        const currentDate: Date = new Date();
        await fs.utimes(extensionsPath, currentDate, currentDate);
    }

}
