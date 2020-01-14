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
import { FabricGatewayRegistryEntry } from '../registries/FabricGatewayRegistryEntry';
import { FabricEnvironmentRegistryEntry, LogType } from 'ibm-blockchain-platform-common';
import { FabricEnvironmentManager } from '../fabric/environments/FabricEnvironmentManager';
import { ManagedAnsibleEnvironment } from '../fabric/environments/ManagedAnsibleEnvironment';
import { EnvironmentFactory } from '../fabric/environments/EnvironmentFactory';
import { LocalEnvironment } from '../fabric/environments/LocalEnvironment';
import { RuntimeTreeItem } from '../explorer/runtimeOps/disconnectedTree/RuntimeTreeItem';

export async function teardownFabricRuntime(runtimeTreeItem: RuntimeTreeItem, force: boolean = false): Promise<void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, 'teardownFabricRuntime');
    let registryEntry: FabricEnvironmentRegistryEntry;
    if (!runtimeTreeItem) {
        const chosenEnvironment: IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry> = await UserInputUtil.showFabricEnvironmentQuickPickBox('Select an environment to teardown', false, true, true, true) as IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>;
        if (!chosenEnvironment) {
            return;
        }

        registryEntry = chosenEnvironment.data;

    } else {
        registryEntry = runtimeTreeItem.environmentRegistryEntry;
    }
    const runtime: ManagedAnsibleEnvironment | LocalEnvironment = await EnvironmentFactory.getEnvironment(registryEntry) as ManagedAnsibleEnvironment | LocalEnvironment;
    const associatedGateways: string[] = registryEntry.associatedGateways ? registryEntry.associatedGateways : [];
    if (!force) {
        const reallyDoIt: boolean = await UserInputUtil.showConfirmationWarningMessage(`All world state and ledger data for the Fabric runtime ${runtime.getDisplayName()} will be destroyed. Do you want to continue?`);
        if (!reallyDoIt) {
            return;
        }
    }

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'IBM Blockchain Platform Extension',
        cancellable: false
    }, async (progress: vscode.Progress<{ message: string }>) => {
        progress.report({ message: `Tearing down Fabric environment ${runtime.getDisplayName()}` });

        const connectedGatewayRegistry: FabricGatewayRegistryEntry = FabricGatewayConnectionManager.instance().getGatewayRegistryEntry();
        if (connectedGatewayRegistry && associatedGateways.includes(connectedGatewayRegistry.name)) {
            await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT_GATEWAY);
        }

        const connectedEnvironmentRegistry: FabricEnvironmentRegistryEntry = FabricEnvironmentManager.instance().getEnvironmentRegistryEntry();
        if (connectedEnvironmentRegistry && registryEntry.name === connectedEnvironmentRegistry.name) {
            await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT_ENVIRONMENT);
        }

        try {
            await runtime.teardown(outputAdapter);
            await runtime.deleteWalletsAndIdentities();
        } catch (error) {
            outputAdapter.log(LogType.ERROR, `Failed to teardown ${runtime.getDisplayName()}: ${error.message}`, `Failed to teardown ${runtime.getDisplayName()}: ${error.toString()}`);
        }
    });

    await vscode.commands.executeCommand(ExtensionCommands.REFRESH_ENVIRONMENTS);
    await vscode.commands.executeCommand(ExtensionCommands.REFRESH_GATEWAYS);
    await vscode.commands.executeCommand(ExtensionCommands.REFRESH_WALLETS);
}
