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
import { UserInputUtil, IBlockchainQuickPickItem } from './UserInputUtil';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricGatewayConnectionManager } from '../fabric/FabricGatewayConnectionManager';
import { FabricEnvironmentRegistryEntry, LogType, FabricGatewayRegistryEntry, IFabricEnvironmentConnection, FabricEnvironmentRegistry, EnvironmentFlags } from 'ibm-blockchain-platform-common';
import { FabricEnvironmentManager } from '../fabric/environments/FabricEnvironmentManager';
import { EnvironmentFactory } from '../fabric/environments/EnvironmentFactory';
import { RuntimeTreeItem } from '../explorer/runtimeOps/disconnectedTree/RuntimeTreeItem';
import { ExtensionUtil } from '../util/ExtensionUtil';
import { LocalMicroEnvironment } from '../fabric/environments/LocalMicroEnvironment';
import { LocalEnvironment } from '../fabric/environments/LocalEnvironment';

export async function teardownFabricRuntime(runtimeTreeItem: RuntimeTreeItem, force: boolean = false, environmentName?: string, ignoreRefresh: boolean = false): Promise<void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, 'teardownFabricRuntime');

    // If we're running on Eclipse Che, this is not a supported feature.
    if (ExtensionUtil.isChe()) {
        outputAdapter.log(LogType.ERROR, 'Local Fabric functionality is not supported in Eclipse Che or Red Hat CodeReady Workspaces.');
        return;
    }

    let registryEntry: FabricEnvironmentRegistryEntry;
    if (environmentName) {
        registryEntry = await FabricEnvironmentRegistry.instance().get(environmentName);
    } else if (!runtimeTreeItem) {
        const connection: IFabricEnvironmentConnection = FabricEnvironmentManager.instance().getConnection();
        if (connection) {
            registryEntry = FabricEnvironmentManager.instance().getEnvironmentRegistryEntry();
        }

        if ((registryEntry && !registryEntry.managedRuntime) || !registryEntry) {
            const chosenEnvironment: IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry> = await UserInputUtil.showFabricEnvironmentQuickPickBox('Select an environment to teardown', false, true, [EnvironmentFlags.MANAGED_MICROFAB]) as IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>;
            if (!chosenEnvironment) {
                return;
            }

            registryEntry = chosenEnvironment.data;
        }

    } else {
        registryEntry = runtimeTreeItem.environmentRegistryEntry;
    }

    const runtime: LocalMicroEnvironment | LocalEnvironment = EnvironmentFactory.getEnvironment(registryEntry) as LocalMicroEnvironment | LocalEnvironment;

    if (!force) {
        const reallyDoIt: boolean = await UserInputUtil.showConfirmationWarningMessage(`All world state and ledger data for the Fabric runtime ${runtime.getName()} will be destroyed. Do you want to continue?`);
        if (!reallyDoIt) {
            return;
        }
    }

    const runtimeName: string = runtime.getName();

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'IBM Blockchain Platform Extension',
        cancellable: false
    }, async (progress: vscode.Progress<{ message: string }>) => {
        progress.report({ message: `Tearing down Fabric environment ${runtimeName}` });

        const connectedGatewayRegistry: FabricGatewayRegistryEntry = await FabricGatewayConnectionManager.instance().getGatewayRegistryEntry();
        if (connectedGatewayRegistry && connectedGatewayRegistry.fromEnvironment === registryEntry.name) {
            await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT_GATEWAY);
        }

        const connectedEnvironmentRegistry: FabricEnvironmentRegistryEntry = FabricEnvironmentManager.instance().getEnvironmentRegistryEntry();
        if (connectedEnvironmentRegistry && registryEntry.name === connectedEnvironmentRegistry.name) {
            await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT_ENVIRONMENT);
        }

        try {
            await runtime.teardown(outputAdapter);
        } catch (error) {
            outputAdapter.log(LogType.ERROR, `Failed to teardown ${runtimeName}: ${error.message}`, `Failed to teardown ${runtimeName}: ${error.toString()}`);
        }
    });

    if (!ignoreRefresh) {
        await vscode.commands.executeCommand(ExtensionCommands.REFRESH_ENVIRONMENTS);
        await vscode.commands.executeCommand(ExtensionCommands.REFRESH_GATEWAYS);
        await vscode.commands.executeCommand(ExtensionCommands.REFRESH_WALLETS);
    }
}
