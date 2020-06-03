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
import * as path from 'path';
import * as fs from 'fs-extra';
import { UserInputUtil, IBlockchainQuickPickItem } from './UserInputUtil';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { FabricEnvironmentRegistry, FabricEnvironmentRegistryEntry, LogType, FabricGatewayRegistryEntry, EnvironmentType, FabricRuntimeUtil } from 'ibm-blockchain-platform-common';
import { FabricEnvironmentTreeItem } from '../explorer/runtimeOps/disconnectedTree/FabricEnvironmentTreeItem';
import { FabricEnvironmentManager } from '../fabric/environments/FabricEnvironmentManager';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricGatewayConnectionManager } from '../fabric/FabricGatewayConnectionManager';
import { SettingConfigurations } from '../../configurations';
import { GlobalState, ExtensionData } from '../util/GlobalState';
import { LocalEnvironmentManager } from '../fabric/environments/LocalEnvironmentManager';
import { ManagedAnsibleEnvironmentManager } from '../fabric/environments/ManagedAnsibleEnvironmentManager';

export async function deleteEnvironment(environment: FabricEnvironmentTreeItem | FabricEnvironmentRegistryEntry, force: boolean = false): Promise<void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, `delete environment`);
    let environmentsToDelete: FabricEnvironmentRegistryEntry[];

    try {

        if (!environment) {
            // If called from command palette
            // Ask for environment to delete
            // Get all environments, including local environments.
            const environments: Array<FabricEnvironmentRegistryEntry> = await FabricEnvironmentRegistry.instance().getAll(true);
            if (environments.length === 0) {
                outputAdapter.log(LogType.ERROR, `No environments to delete.`);
                return;
            }

            const chosenEnvironment: IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>[] = await UserInputUtil.showFabricEnvironmentQuickPickBox('Choose the environment(s) that you want to delete', true, false, true) as IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>[];
            if (!chosenEnvironment || chosenEnvironment.length === 0) {
                return;
            }

            environmentsToDelete = chosenEnvironment.map((_environment: IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>) => {
                return _environment.data;
            });

        } else {
            if (environment instanceof FabricEnvironmentTreeItem) {
                environmentsToDelete = [environment.environmentRegistryEntry];
            } else {
                environmentsToDelete = [environment];
            }
        }

        if (!force) {
            const reallyDoIt: boolean = await UserInputUtil.showConfirmationWarningMessage(`This will remove the environment(s). Do you want to continue?`);
            if (!reallyDoIt) {
                return;
            }
        }

        const connectedEnvironmentRegistry: FabricEnvironmentRegistryEntry = FabricEnvironmentManager.instance().getEnvironmentRegistryEntry();
        const connectedGatewayRegistry: FabricGatewayRegistryEntry = await FabricGatewayConnectionManager.instance().getGatewayRegistryEntry();

        const _settings: any = await vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_RUNTIME, vscode.ConfigurationTarget.Global);
        const localSettings: any = JSON.parse(JSON.stringify(_settings));

        for (const _environment of environmentsToDelete) {
            if (connectedEnvironmentRegistry && connectedEnvironmentRegistry.name === _environment.name) {
                await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            }

            if (connectedGatewayRegistry && connectedGatewayRegistry.fromEnvironment === _environment.name) {
                await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT_GATEWAY);
            }

            if (_environment.environmentType === EnvironmentType.LOCAL_ENVIRONMENT) {
                delete localSettings[_environment.name];

                try {
                    await vscode.commands.executeCommand(ExtensionCommands.TEARDOWN_FABRIC, undefined, true, _environment.name);
                } catch (error) {
                    // Ignore
                    outputAdapter.log(LogType.WARNING, undefined, `Error whilst tearing down ${_environment.name} environment: ${error.message}`);
                }

                if (_environment.name === FabricRuntimeUtil.LOCAL_FABRIC) {
                    const extensionData: ExtensionData = GlobalState.get();
                    extensionData.deletedOneOrgLocalFabric = true;
                    await GlobalState.update(extensionData);
                }

            }

            await FabricEnvironmentRegistry.instance().delete(_environment.name);
            if (_environment.environmentType === EnvironmentType.LOCAL_ENVIRONMENT) {
                LocalEnvironmentManager.instance().removeRuntime(_environment.name);
            } else if (_environment.environmentType === EnvironmentType.ANSIBLE_ENVIRONMENT) {
                if (_environment.managedRuntime === true) {
                    ManagedAnsibleEnvironmentManager.instance().removeRuntime(_environment.name);
                }

                const walletsDirPath: string = path.join(_environment.environmentDirectory, 'wallets');
                const walletPaths: string[] = (await fs.readdir(walletsDirPath)).filter((walletPath: string) => !walletPath.startsWith('.'));
                for (const wallet of walletPaths) {
                    const configPath: string = path.join(walletsDirPath, wallet, '.config.json');
                    if (await fs.pathExists(configPath)) {
                        await fs.remove(configPath);
                    }
                }
            }
        }

        await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, localSettings, vscode.ConfigurationTarget.Global);

        if (environmentsToDelete.length > 1) {
            outputAdapter.log(LogType.SUCCESS, `Successfully deleted environments`);
            return;
        } else {
            outputAdapter.log(LogType.SUCCESS, `Successfully deleted ${environmentsToDelete[0].name} environment`);
            return;
        }
    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Error deleting environment: ${error.message}`, `Error deleting environment: ${error.toString()}`);
    }
}
