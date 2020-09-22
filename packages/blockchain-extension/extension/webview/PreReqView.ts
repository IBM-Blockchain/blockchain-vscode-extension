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
import * as ejs from 'ejs';
import * as path from 'path';
import { ExtensionUtil } from '../util/ExtensionUtil';
import { View } from './View';
import { Reporter } from '../util/Reporter';
import { DependencyManager } from '../dependencies/DependencyManager';
import { ExtensionCommands } from '../../ExtensionCommands';
import { SettingConfigurations } from '../../configurations';
import { GlobalState, ExtensionData } from '../util/GlobalState';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { LogType } from 'ibm-blockchain-platform-common';
import { Dependencies } from '../dependencies/Dependencies';

export class PreReqView extends View {

    public dependencies: any;
    public restoreCommandHijack: boolean = false;

    constructor(context: vscode.ExtensionContext) {
        super(context, 'preReq', 'Prerequisites');
    }

    async openPanelInner(panel: vscode.WebviewPanel): Promise<void> {
        let outputAdapter: VSCodeBlockchainOutputAdapter;

        Reporter.instance().sendTelemetryEvent('openedView', {name: panel.title}); // Report that a user has opened a new panel

        const extensionPath: string = ExtensionUtil.getExtensionPath();
        const panelIcon: vscode.Uri = vscode.Uri.file(path.join(extensionPath, 'resources', 'logo.svg'));

        panel.iconPath = panelIcon;
        panel.onDidDispose(async () => {
            let isComplete: boolean = true;

            if (!this.restoreCommandHijack) {
                // If they close the panel by pressing 'x', we need to determine whether to restore command hijacking.
                // This is because it's possible to open the prereq page even after having installed all the prereqs.
                const dependencyManager: DependencyManager = DependencyManager.instance();
                isComplete = await dependencyManager.hasPreReqsInstalled();
            }

            const bypassPreReqs: boolean = vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_BYPASS_PREREQS);

            if (isComplete || bypassPreReqs) {

                // Restores command hijacking
                await ExtensionUtil.setupCommands();

                await ExtensionUtil.completeActivation();

                await vscode.commands.executeCommand(ExtensionCommands.OPEN_HOME_PAGE);

            } else {
                // User won't be able to do anything so warn them they need to install all the prereqs
                outputAdapter = VSCodeBlockchainOutputAdapter.instance();
                outputAdapter.log(LogType.WARNING, `Required prerequisites are missing. They must be installed before the extension can be used.`);
            }

        });

        panel.webview.onDidReceiveMessage(async (message: any) => {

            if (message.command === 'finish') {

                this.restoreCommandHijack = true;

                const localFabricFunctionality: boolean = message.localFabricFunctionality;

                await vscode.workspace.getConfiguration().update(SettingConfigurations.EXTENSION_LOCAL_FABRIC, localFabricFunctionality, vscode.ConfigurationTarget.Global);
                await vscode.commands.executeCommand('setContext', 'local-fabric-enabled', localFabricFunctionality);

                panel.dispose();

            } else if (message.command === 'check') {

                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: 'IBM Blockchain Platform Extension',
                    cancellable: false
                }, async (progress: vscode.Progress<{ message: string }>) => {
                    progress.report({ message: `Checking installed dependencies` });

                    const localFabricFunctionality: boolean = message.localFabricFunctionality;
                    await vscode.workspace.getConfiguration().update(SettingConfigurations.EXTENSION_LOCAL_FABRIC, localFabricFunctionality, vscode.ConfigurationTarget.Global);
                    if (message.toggle) {
                        outputAdapter = VSCodeBlockchainOutputAdapter.instance();
                        outputAdapter.log(LogType.INFO, `Local Fabric functionality set to '${localFabricFunctionality.toString()}'.`);
                    }
                    await vscode.commands.executeCommand('setContext', 'local-fabric-enabled', localFabricFunctionality);

                    const dependencyManager: DependencyManager = DependencyManager.instance();
                    const dependencies: any = await dependencyManager.getPreReqVersions();

                    if (message.dockerForWindows) {
                        // They have accepted that Docker for Windows has been configured correctly.
                        const extensionData: ExtensionData = GlobalState.get();
                        extensionData.dockerForWindows = true;
                        dependencies.dockerForWindows.complete = true;

                        // Update global state
                        await GlobalState.update(extensionData);
                    }

                    if (message.systemRequirements) {
                        // They have accepted that Docker for Windows has been configured correctly.
                        const extensionData: ExtensionData = GlobalState.get();
                        dependencies.systemRequirements.complete = true;

                        // Update global state
                        await GlobalState.update(extensionData);
                    }

                    // Are all the required dependencies installed?
                    const isComplete: boolean = await dependencyManager.hasPreReqsInstalled(dependencies);

                    panel.webview.html = await this.getHTMLString(dependencies, isComplete, localFabricFunctionality);

                    outputAdapter = VSCodeBlockchainOutputAdapter.instance();
                    outputAdapter.log(LogType.SUCCESS, undefined, 'Finished checking installed dependencies');
                });

            } else if (message.command === 'skip') {
                const dependencyManager: DependencyManager = DependencyManager.instance();
                const dependencies: any = await dependencyManager.getPreReqVersions();
                const dependenciesMissingObject: any = {};

                for (const dependency of Object.keys(dependencies)) {
                    const isInstalled: boolean = dependencyManager.isValidDependency(dependencies[dependency]);
                    if (!isInstalled) {
                        dependenciesMissingObject[dependency] = 'missing';
                    }

                    // Else, dependency has been installed/confirmed

                }

                if (Object.keys(dependenciesMissingObject).length > 0) {
                    // Report that a user is skipping installing the prereqs
                    // We report this as it might be possible that our regex's need improving and haven't picked up on a user's installation of a dependency
                    // In which case, we should try to find out what dependency has a different version response
                    Reporter.instance().sendTelemetryEvent('skipPreReqs', dependenciesMissingObject);
                }

                await vscode.workspace.getConfiguration().update(SettingConfigurations.EXTENSION_BYPASS_PREREQS, true, vscode.ConfigurationTarget.Global);

                const localFabricFunctionality: boolean = message.localFabricFunctionality;
                await vscode.workspace.getConfiguration().update(SettingConfigurations.EXTENSION_LOCAL_FABRIC, localFabricFunctionality, vscode.ConfigurationTarget.Global);
                await vscode.commands.executeCommand('setContext', 'local-fabric-enabled', localFabricFunctionality);

                this.restoreCommandHijack = true;
                panel.dispose();
            }
        });
    }

    loadComponent(_panel: vscode.WebviewPanel): void {
        return;
    }

    async getHTMLString(dependencies?: any, isComplete?: boolean, localFabricFunctionality?: boolean): Promise<any> {
        const packageJson: any = await ExtensionUtil.getPackageJSON();
        const extensionPath: string = ExtensionUtil.getExtensionPath();
        const extensionVersion: string = packageJson.version;
        const dependencyManager: DependencyManager = DependencyManager.instance();

        if (!dependencies) {
            dependencies = await dependencyManager.getPreReqVersions();
        }

        if (isComplete === undefined) {
            isComplete = await dependencyManager.hasPreReqsInstalled(dependencies);
        }

        const installedDependencies: any = {};
        const missingDependencies: any = {};
        let missingPrerequisitesLength: number = 0;

        for (const _dependency of Object.keys(dependencies)) {

            // Make node version requirements more readable
            if (dependencies[_dependency].name === 'Node.js') {
                const required: string = Dependencies.NODEJS_REQUIRED.replace(/<.*\|\|/, '||').replace(/<.*/, '');
                dependencies[_dependency].requiredVersion  = required;
            }
            
            const isInstalled: boolean = dependencyManager.isValidDependency(dependencies[_dependency]);
            if (isInstalled) {
                installedDependencies[_dependency] = dependencies[_dependency];
            } else {
                missingDependencies[_dependency] = dependencies[_dependency];

                // Count the required missing prerequisites
                if (missingDependencies[_dependency].required === true) {
                    missingPrerequisitesLength = missingPrerequisitesLength + 1;
                }
            }
        }

        const launchDark: vscode.Uri = vscode.Uri.file(path.join(extensionPath, 'resources', 'light', 'launch.svg')).with({ scheme: 'vscode-resource' });
        const launchLight: vscode.Uri = vscode.Uri.file(path.join(extensionPath, 'resources', 'dark', 'launch.svg')).with({ scheme: 'vscode-resource' });
        const chevronDark: vscode.Uri = vscode.Uri.file(path.join(extensionPath, 'resources', 'dark', 'chevron.svg')).with({ scheme: 'vscode-resource' });
        const chevronLight: vscode.Uri = vscode.Uri.file(path.join(extensionPath, 'resources', 'light', 'chevron.svg')).with({ scheme: 'vscode-resource' });
        const infoIconDark: vscode.Uri = vscode.Uri.file(path.join(extensionPath, 'resources', 'dark', 'info.svg')).with({ scheme: 'vscode-resource' });
        const infoIconLight: vscode.Uri = vscode.Uri.file(path.join(extensionPath, 'resources', 'light', 'info.svg')).with({ scheme: 'vscode-resource' });
        const celebrateImage: vscode.Uri = vscode.Uri.file(path.join(extensionPath, 'resources', 'celebrate.svg')).with({ scheme: 'vscode-resource' });

        const images: any = {
            launchDark,
            launchLight,
            chevronDark,
            chevronLight,
            infoIconDark,
            infoIconLight,
            celebrateImage
        };

        if (localFabricFunctionality === undefined) {
            localFabricFunctionality = vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_LOCAL_FABRIC);
        }

        const options: any = {
            extensionVersion,
            installedDependencies,
            missingDependencies,
            missingPrerequisitesLength,
            images,
            commands : {
                OPEN_HOME_PAGE: ExtensionCommands.OPEN_HOME_PAGE
            },
            isComplete,
            localFabricFunctionality
        };

        const templatePath: string = path.join(__dirname, '..', '..', '..', 'templates', 'PreReqView.ejs');
        return await new Promise((resolve: any, reject: any): any => {
            ejs.renderFile(templatePath, options, { async: true }, (error: any, data: string) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(data);
                }
            });
        });

    }

}
