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
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricGatewayConnectionManager } from '../fabric/FabricGatewayConnectionManager';
import { FabricEnvironmentRegistryEntry, LogType, FabricGatewayRegistryEntry, IFabricEnvironmentConnection } from 'ibm-blockchain-platform-common';
import { FabricEnvironmentManager } from '../fabric/environments/FabricEnvironmentManager';
import { ManagedAnsibleEnvironment } from '../fabric/environments/ManagedAnsibleEnvironment';
import { EnvironmentFactory } from '../fabric/environments/EnvironmentFactory';
import { LocalEnvironment } from '../fabric/environments/LocalEnvironment';
import { RuntimeTreeItem } from '../explorer/runtimeOps/disconnectedTree/RuntimeTreeItem';
import { IBlockchainQuickPickItem, UserInputUtil } from './UserInputUtil';

export async function stopFabricRuntime(runtimeTreeItem?: RuntimeTreeItem): Promise<void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, 'stopFabricRuntime');
    let registryEntry: FabricEnvironmentRegistryEntry;
    if (!runtimeTreeItem) {

        const connection: IFabricEnvironmentConnection = FabricEnvironmentManager.instance().getConnection();
        if (connection) {
            registryEntry = FabricEnvironmentManager.instance().getEnvironmentRegistryEntry();
        }

        if ((registryEntry && !registryEntry.managedRuntime) || !registryEntry) {
            const chosenEnvironment: IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry> = await UserInputUtil.showFabricEnvironmentQuickPickBox('Select an environment to stop', false, true, true, true) as IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>;
            if (!chosenEnvironment) {
                return;
            }

            registryEntry = chosenEnvironment.data;
        }

    } else {
        registryEntry = runtimeTreeItem.environmentRegistryEntry;
    }
    const runtime: ManagedAnsibleEnvironment | LocalEnvironment = EnvironmentFactory.getEnvironment(registryEntry) as ManagedAnsibleEnvironment | LocalEnvironment;

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'IBM Blockchain Platform Extension',
        cancellable: false
    }, async (progress: vscode.Progress<{ message: string }>) => {
        progress.report({ message: `Stopping Fabric runtime ${runtime.getName()}` });

        const connectedGatewayRegistry: FabricGatewayRegistryEntry = FabricGatewayConnectionManager.instance().getGatewayRegistryEntry();
        if (connectedGatewayRegistry && connectedGatewayRegistry.fromEnvironment === registryEntry.name) {
            await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT_GATEWAY);
        }

        const connectedEnvironmentRegistry: FabricEnvironmentRegistryEntry = FabricEnvironmentManager.instance().getEnvironmentRegistryEntry();
        if (connectedEnvironmentRegistry && registryEntry.name === connectedEnvironmentRegistry.name) {
            await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT_ENVIRONMENT);
        }

        try {
            await runtime.stop(outputAdapter);
        } catch (error) {
            outputAdapter.log(LogType.ERROR, `Failed to stop ${runtime.getName()}: ${error.message}`, `Failed to stop ${runtime.getName()}: ${error.toString()}`);
        }

        await vscode.commands.executeCommand(ExtensionCommands.REFRESH_ENVIRONMENTS);
        await vscode.commands.executeCommand(ExtensionCommands.REFRESH_GATEWAYS);
    });
}
