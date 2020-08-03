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
import { Reporter } from './util/Reporter';
import { ExtensionUtil } from './util/ExtensionUtil';
import { VSCodeBlockchainOutputAdapter } from './logging/VSCodeBlockchainOutputAdapter';
import { DependencyManager } from './dependencies/DependencyManager';
import { TemporaryCommandRegistry } from './dependencies/TemporaryCommandRegistry';
import { ExtensionCommands } from '../ExtensionCommands';
import { version as currentExtensionVersion } from '../package.json';
import { SettingConfigurations } from '../configurations';
import { UserInputUtil } from './commands/UserInputUtil';
import { GlobalState, ExtensionData } from './util/GlobalState';
import { FabricGatewayHelper } from './fabric/FabricGatewayHelper';
import { FabricWalletHelper } from './fabric/FabricWalletHelper';
import { FabricWalletRegistry, FabricEnvironmentRegistry, LogType, FabricGatewayRegistry, FileSystemUtil } from 'ibm-blockchain-platform-common';
import { RepositoryRegistry } from './registries/RepositoryRegistry';

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
        deletedOneOrgLocalFabric: originalExtensionData.deletedOneOrgLocalFabric
    };

    let extDir: string = vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_DIRECTORY);
    extDir = FileSystemUtil.getDirPath(extDir);
    FabricWalletRegistry.instance().setRegistryPath(extDir);
    FabricGatewayRegistry.instance().setRegistryPath(extDir);
    FabricEnvironmentRegistry.instance().setRegistryPath(extDir);
    RepositoryRegistry.instance().setRegistryPath(extDir);

    const isIBMer: boolean = ExtensionUtil.checkIfIBMer();

    if (originalExtensionData.migrationCheck !== newExtensionData.migrationCheck) {
        // Migrate old user setting configurations to use newer values
        await ExtensionUtil.migrateSettingConfigurations();

        // Remove managedWallet boolean from wallets in user settings
        // Ensure wallets are stored correctly
        outputAdapter.log(LogType.INFO, undefined, 'Tidying wallet, gateway, environment and repository settings');
        await FabricWalletHelper.tidyWalletSettings();
        // Ensure gateways are stored correctly
        await FabricGatewayHelper.migrateGateways();
        await ExtensionUtil.migrateEnvironments();
        await ExtensionUtil.migrateRepositories();
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

        const bypassPreReqs: boolean = vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_BYPASS_PREREQS);
        let dependenciesInstalled: boolean;
        if (!bypassPreReqs) {
            dependenciesInstalled = await dependencyManager.hasPreReqsInstalled();
        }

        const tempCommandRegistry: TemporaryCommandRegistry = TemporaryCommandRegistry.instance();

        // Register the 'Open Pre Req' command
        context = await ExtensionUtil.registerPreReqAndReleaseNotesCommand(context);

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
                await vscode.commands.executeCommand(ExtensionCommands.OPEN_PRE_REQ_PAGE);

                // Update global state
                newExtensionData.preReqPageShown = true;
                await GlobalState.update(newExtensionData);

            } else if (!dependenciesInstalled) {

                // Show prereq page if they don't have everything installed
                await vscode.commands.executeCommand(ExtensionCommands.OPEN_PRE_REQ_PAGE);
            }
        }

        GlobalState.setExtensionContext(context);

        // We only want to do this stuff if the extension has all the required dependencies
        if (dependenciesInstalled || bypassPreReqs) {
            await ExtensionUtil.completeActivation(extensionUpdated);

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
