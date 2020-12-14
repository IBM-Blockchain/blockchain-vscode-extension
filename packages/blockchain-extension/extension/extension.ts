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

// Note: vscode-nls *MUST* be configured before loading any other modules
// to ensure loadMessageBundle is not called before vscode-nls has been
// configured
import * as nls from 'vscode-nls';
nls.config({ messageFormat: nls.MessageFormat.both })();
import * as vscode from 'vscode';
import * as semver from 'semver';
import { Reporter } from './util/Reporter';
import { ExtensionUtil } from './util/ExtensionUtil';
import { VSCodeBlockchainOutputAdapter } from './logging/VSCodeBlockchainOutputAdapter';
import { DependencyManager } from './dependencies/DependencyManager';
import { TemporaryCommandRegistry } from './dependencies/TemporaryCommandRegistry';
import { ExtensionCommands } from '../ExtensionCommands';
import { version as currentExtensionVersion } from '../package.json';
import { SettingConfigurations } from './configurations';
import { UserInputUtil } from './commands/UserInputUtil';
import { GlobalState, ExtensionData } from './util/GlobalState';
import { FabricWalletRegistry, FabricEnvironmentRegistry, LogType, FabricGatewayRegistry, FileSystemUtil, FabricEnvironmentRegistryEntry, EnvironmentFlags, FabricRuntimeUtil } from 'ibm-blockchain-platform-common';
import { RepositoryRegistry } from './registries/RepositoryRegistry';
import { Dependencies } from './dependencies/Dependencies';
import { LocalMicroEnvironmentManager } from './fabric/environments/LocalMicroEnvironmentManager';

export async function activate(context: vscode.ExtensionContext): Promise<void> {

    GlobalState.setExtensionContext(context);

    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();

    const originalExtensionData: ExtensionData = GlobalState.get();

    if (originalExtensionData.createOneOrgLocalFabric === undefined) {
        originalExtensionData.createOneOrgLocalFabric = true;
    }

    if (originalExtensionData.deletedOneOrgLocalFabric === undefined) {
        originalExtensionData.deletedOneOrgLocalFabric = false;
    }

    const newExtensionData: ExtensionData = {
        activationCount: originalExtensionData.activationCount + 1,
        version: currentExtensionVersion,
        migrationCheck: 2, // Every time we change the setting configurations we need to change this to any other value
        generatorVersion: originalExtensionData.generatorVersion,
        preReqPageShown: originalExtensionData.preReqPageShown,
        dockerForWindows: originalExtensionData.dockerForWindows,
        createOneOrgLocalFabric: originalExtensionData.createOneOrgLocalFabric,
        deletedOneOrgLocalFabric: originalExtensionData.deletedOneOrgLocalFabric,
        shownFirstSubmissionSurveyURL: originalExtensionData.shownFirstSubmissionSurveyURL,
    };

    let extDir: string = SettingConfigurations.getExtensionDir();
    extDir = FileSystemUtil.getDirPath(extDir);
    FabricWalletRegistry.instance().setRegistryPath(extDir);
    FabricGatewayRegistry.instance().setRegistryPath(extDir);
    FabricEnvironmentRegistry.instance().setRegistryPath(extDir);
    RepositoryRegistry.instance().setRegistryPath(extDir);

    const isIBMer: boolean = ExtensionUtil.checkIfIBMer();

    if (originalExtensionData.migrationCheck !== newExtensionData.migrationCheck) {
        // add migration code here
    }

    const extensionUpdated: boolean = newExtensionData.version !== originalExtensionData.version;

    await GlobalState.update(newExtensionData);

    const packageJson: any = ExtensionUtil.getPackageJSON();

    if (packageJson.production !== true) {
        await Reporter.instance().dispose();
    }

    // Show the output adapter if the extension has been updated.

    if (extensionUpdated) {
        outputAdapter.show();

        if (!originalExtensionData.version) {
            Reporter.instance().sendTelemetryEvent('newInstall', { IBM: isIBMer + '' });
        } else {
            Reporter.instance().sendTelemetryEvent('updatedInstall', { IBM: isIBMer + '' });
        }
    }

    // At the moment, the 'Open Log File' doesn't display extension log files to open. https://github.com/Microsoft/vscode/issues/43064
    outputAdapter.log(LogType.IMPORTANT, undefined, 'Log files can be found by running the `Developer: Open Logs Folder` command from the palette', undefined, true); // Let users know how to get the log file

    outputAdapter.log(LogType.INFO, undefined, 'Starting IBM Blockchain Platform Extension');

    try {
        const dependencyManager: DependencyManager = DependencyManager.instance();
        const dependencies: Dependencies = await dependencyManager.getPreReqVersions();

        const bypassPreReqs: boolean = vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_BYPASS_PREREQS);
        let dependenciesInstalled: boolean;
        if (!bypassPreReqs) {
            dependenciesInstalled = await dependencyManager.hasPreReqsInstalled(dependencies);
        }

        const tempCommandRegistry: TemporaryCommandRegistry = TemporaryCommandRegistry.instance();

        // Register the 'Open Pre Req' command
        context = await ExtensionUtil.registerPreReqAndReleaseNotesCommand(context);

        let createLocalEnvironment: boolean = false;
        // Get all old local and ansible environments
        const oldAnsibleEnvironmentEntries: FabricEnvironmentRegistryEntry[] = await FabricEnvironmentRegistry.instance().getAll([EnvironmentFlags.ANSIBLE]);
        if (oldAnsibleEnvironmentEntries.length > 0) {
            // Delete any old local environments.
            for (const entry of oldAnsibleEnvironmentEntries) {

                await vscode.commands.executeCommand(ExtensionCommands.DELETE_ENVIRONMENT, entry, true, true);
                if (entry.name === FabricRuntimeUtil.LOCAL_FABRIC) {
                    createLocalEnvironment = true;
                }

            }
        }

        const _settings: any = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_RUNTIME, vscode.ConfigurationTarget.Global);
        const localSettings: any = JSON.parse(JSON.stringify(_settings));
        let updateSettings: boolean = false;
        for (const [key, value] of Object.entries(localSettings)) {
            // Delete any settings which don't have number values.
            if (typeof value !== 'number') {
                delete localSettings[key];
                updateSettings = true;
            }
        }
        if (updateSettings) {
            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, localSettings, vscode.ConfigurationTarget.Global);
        }

        if (createLocalEnvironment) {
            await LocalMicroEnvironmentManager.instance().initialize(FabricRuntimeUtil.LOCAL_FABRIC, 1);
        }

        // Only show the release notes if the extension has updated. This doesn't include the very first install.
        if (extensionUpdated && originalExtensionData.version) {
            await vscode.commands.executeCommand(ExtensionCommands.OPEN_RELEASE_NOTES);
        }

        if (dependenciesInstalled || bypassPreReqs) {
            tempCommandRegistry.createTempCommands(true);
            await ExtensionUtil.setupCommands();

        } else {
            tempCommandRegistry.createTempCommands(false, ExtensionCommands.OPEN_PRE_REQ_PAGE);
        }

        // Open the PreReq page if the user hasn't got all the required dependencies OR if the user has never seen the PreReq page before
        if (!bypassPreReqs) {
            if (!originalExtensionData.preReqPageShown) {

                // Show pre req page
                await vscode.commands.executeCommand(ExtensionCommands.OPEN_PRE_REQ_PAGE, dependencies);

                // Update global state
                newExtensionData.preReqPageShown = true;
                await GlobalState.update(newExtensionData);

            } else if (!dependenciesInstalled) {

                // Show prereq page if they don't have everything installed
                await vscode.commands.executeCommand(ExtensionCommands.OPEN_PRE_REQ_PAGE, dependencies);
            }
        }

        GlobalState.setExtensionContext(context);

        // We only want to do this stuff if the extension has all the required dependencies
        if (dependenciesInstalled || bypassPreReqs) {
            await ExtensionUtil.completeActivation(extensionUpdated);

        }

        if (originalExtensionData.version && newExtensionData.version) {
            const semverOriginal: number = semver.major(originalExtensionData.version);
            const semverNew: number = semver.major(newExtensionData.version);
            if (semverNew > semverOriginal) {
                // If user has migrated and installed a new major version

                const whatsNewPrompt: string = 'Learn more';
                const response: string = await vscode.window.showInformationMessage(`You have successfully updated to version 2 of the IBM Blockchain Platform extension. Lots of changes have happened since version 1, so be sure to check what's new!`, whatsNewPrompt);
                if (response === whatsNewPrompt) {
                    await vscode.commands.executeCommand(ExtensionCommands.OPEN_FABRIC_2_PAGE);
                }

            }
        }

    } catch (error) {
        outputAdapter.log(LogType.ERROR, undefined, `Failed to activate extension: ${error.toString()}`, error.stack);
        Reporter.instance().sendTelemetryEvent('activationFailed', { activationError: error.message });
        await UserInputUtil.failedActivationWindow(error.message);
    }
}

export async function deactivate(): Promise<void> {
    const context: vscode.ExtensionContext = GlobalState.getExtensionContext();
    await Reporter.instance().dispose();
    ExtensionUtil.disposeExtension(context);
}
