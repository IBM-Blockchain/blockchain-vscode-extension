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
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { FabricGatewayConnectionManager } from '../fabric/FabricGatewayConnectionManager';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricEnvironmentManager } from '../fabric/environments/FabricEnvironmentManager';
import { FabricEnvironmentRegistryEntry, LogType, FabricGatewayRegistryEntry, IFabricEnvironmentConnection } from 'ibm-blockchain-platform-common';
import { ManagedAnsibleEnvironment } from '../fabric/environments/ManagedAnsibleEnvironment';
import { LocalEnvironment } from '../fabric/environments/LocalEnvironment';
import { RuntimeTreeItem } from '../explorer/runtimeOps/disconnectedTree/RuntimeTreeItem';
import { UserInputUtil, IBlockchainQuickPickItem, IncludeEnvironmentOptions } from './UserInputUtil';
import { EnvironmentFactory } from '../fabric/environments/EnvironmentFactory';
import { ExtensionUtil } from '../util/ExtensionUtil';

export async function restartFabricRuntime(runtimeTreeItem?: RuntimeTreeItem): Promise<void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, 'restartFabricRuntime');

    // If we're running on Eclipse Che, this is not a supported feature.
    if (ExtensionUtil.isChe()) {
        outputAdapter.log(LogType.ERROR, 'Local Fabric functionality is not supported in Eclipse Che or Red Hat CodeReady Workspaces.');
        return;
    }

    let registryEntry: FabricEnvironmentRegistryEntry;
    if (!runtimeTreeItem) {

        const connection: IFabricEnvironmentConnection = FabricEnvironmentManager.instance().getConnection();
        if (connection) {
            registryEntry = FabricEnvironmentManager.instance().getEnvironmentRegistryEntry();
        }

        if ((registryEntry && !registryEntry.managedRuntime) || !registryEntry) {
            const chosenEnvironment: IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry> = await UserInputUtil.showFabricEnvironmentQuickPickBox('Select an environment to restart', false, true, true, IncludeEnvironmentOptions.ALLENV, true, undefined, true) as IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>;
            if (!chosenEnvironment) {
                return;
            }

            registryEntry = chosenEnvironment.data;
        }

    } else {
        registryEntry = runtimeTreeItem.environmentRegistryEntry;
    }
    const runtime: LocalEnvironment | ManagedAnsibleEnvironment = EnvironmentFactory.getEnvironment(registryEntry) as LocalEnvironment | ManagedAnsibleEnvironment;

    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'IBM Blockchain Platform Extension',
            cancellable: false
        }, async (progress: vscode.Progress<{ message: string }>) => {
            progress.report({ message: `Restarting Fabric runtime ${runtime.getName()}` });

            const connectedGatewayRegistry: FabricGatewayRegistryEntry = await FabricGatewayConnectionManager.instance().getGatewayRegistryEntry();
            if (connectedGatewayRegistry && connectedGatewayRegistry.fromEnvironment === registryEntry.name) {
                await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT_GATEWAY);
            }

            const connectedEnvironmentRegistry: FabricEnvironmentRegistryEntry = FabricEnvironmentManager.instance().getEnvironmentRegistryEntry();
            if (connectedEnvironmentRegistry && registryEntry.name === connectedEnvironmentRegistry.name) {
                await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            }
            await runtime.restart(outputAdapter);
        });
    }
    catch (error)
    {
        await UserInputUtil.failedNetworkStart(`Failed to restart ${runtime.getName()}: ${error.message}`, `Failed to restart ${runtime.getName()}: ${error.toString()}`);
    }
}
