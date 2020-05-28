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
import { UserInputUtil, IBlockchainQuickPickItem, IncludeEnvironmentOptions } from './UserInputUtil';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricGatewayConnectionManager } from '../fabric/FabricGatewayConnectionManager';
import { FabricEnvironmentRegistryEntry, LogType, FabricGatewayRegistryEntry, IFabricEnvironmentConnection, FabricEnvironmentRegistry } from 'ibm-blockchain-platform-common';
import { FabricEnvironmentManager } from '../fabric/environments/FabricEnvironmentManager';
import { ManagedAnsibleEnvironment } from '../fabric/environments/ManagedAnsibleEnvironment';
import { EnvironmentFactory } from '../fabric/environments/EnvironmentFactory';
import { LocalEnvironment } from '../fabric/environments/LocalEnvironment';
import { RuntimeTreeItem } from '../explorer/runtimeOps/disconnectedTree/RuntimeTreeItem';
import { ExtensionUtil } from '../util/ExtensionUtil';

export async function teardownFabricRuntime(runtimeTreeItem: RuntimeTreeItem, force: boolean = false, environmentName?: string): Promise<void> {
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

            const chosenEnvironment: IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry> = await UserInputUtil.showFabricEnvironmentQuickPickBox('Select an environment to teardown', false, true, true, IncludeEnvironmentOptions.ALLENV, true) as IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>;
            if (!chosenEnvironment) {
                return;
            }

            registryEntry = chosenEnvironment.data;
        }

    } else {
        registryEntry = runtimeTreeItem.environmentRegistryEntry;
    }

    let runtime: ManagedAnsibleEnvironment | LocalEnvironment = EnvironmentFactory.getEnvironment(registryEntry) as ManagedAnsibleEnvironment | LocalEnvironment;

    if (!force) {
        const reallyDoIt: boolean = await UserInputUtil.showConfirmationWarningMessage(`All world state and ledger data for the Fabric runtime ${runtime.getName()} will be destroyed. Do you want to continue?`);
        if (!reallyDoIt) {
            return;
        }
    }

    let runtimeName: string;
    let oldRuntime: boolean = false;

    if (runtime) {
        runtimeName = runtime.getName();
    } else {
        // This is the case when we try to teardown an old 'Local Fabric' runtime, which won't be returned from getEnvironment.
        runtimeName = registryEntry.name;
        runtime = new LocalEnvironment(runtimeName, undefined, undefined);
        oldRuntime = true;
    }

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
            if (oldRuntime) {
                await (runtime as LocalEnvironment).delete();
            } else {
                await runtime.teardown(outputAdapter);
            }
        } catch (error) {
            outputAdapter.log(LogType.ERROR, `Failed to teardown ${runtimeName}: ${error.message}`, `Failed to teardown ${runtimeName}: ${error.toString()}`);
        }
    });

    await vscode.commands.executeCommand(ExtensionCommands.REFRESH_ENVIRONMENTS);
    await vscode.commands.executeCommand(ExtensionCommands.REFRESH_GATEWAYS);
    await vscode.commands.executeCommand(ExtensionCommands.REFRESH_WALLETS);
}
