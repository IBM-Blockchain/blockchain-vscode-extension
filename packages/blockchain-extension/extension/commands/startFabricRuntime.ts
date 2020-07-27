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
import { LocalEnvironment } from '../fabric/environments/LocalEnvironment';
import { ManagedAnsibleEnvironment } from '../fabric/environments/ManagedAnsibleEnvironment';
import { IBlockchainQuickPickItem, UserInputUtil, IncludeEnvironmentOptions } from './UserInputUtil';
import { LogType, FabricEnvironmentRegistryEntry, EnvironmentType } from 'ibm-blockchain-platform-common';
import { TimerUtil } from '../util/TimerUtil';
import { EnvironmentFactory } from '../fabric/environments/EnvironmentFactory';
import { RuntimeTreeItem } from '../explorer/runtimeOps/disconnectedTree/RuntimeTreeItem';
import { ExtensionUtil } from '../util/ExtensionUtil';

async function update() {
    await TimerUtil.sleep(1000);
    await vscode.commands.executeCommand(ExtensionCommands.REFRESH_ENVIRONMENTS);
    await vscode.commands.executeCommand(ExtensionCommands.REFRESH_GATEWAYS);
    await vscode.commands.executeCommand(ExtensionCommands.REFRESH_WALLETS);
}

export async function startFabricRuntime(registryEntry?: RuntimeTreeItem | FabricEnvironmentRegistryEntry): Promise<void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, 'startFabricRuntime');

    // If we're running on Eclipse Che, this is not a supported feature.
    if (ExtensionUtil.isChe()) {
        outputAdapter.log(LogType.ERROR, 'Local Fabric functionality is not supported in Eclipse Che or Red Hat CodeReady Workspaces.');
        return;
    }

    if (!registryEntry) {
        const chosenEnvironment: IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry> = await UserInputUtil.showFabricEnvironmentQuickPickBox('Select an environment to start', false, true, true, IncludeEnvironmentOptions.ALLENV, true, undefined, false) as IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>;
        if (!chosenEnvironment) {
            return;
        }

        registryEntry = chosenEnvironment.data;

    }

    if (registryEntry instanceof RuntimeTreeItem) {
        // Get entry from tree item
        registryEntry = registryEntry.environmentRegistryEntry;
    }

    const runtime: LocalEnvironment | ManagedAnsibleEnvironment = EnvironmentFactory.getEnvironment(registryEntry) as LocalEnvironment | ManagedAnsibleEnvironment;

    if (registryEntry.environmentType === EnvironmentType.LOCAL_ENVIRONMENT) {
        VSCodeBlockchainOutputAdapter.instance().show();
    }

    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'IBM Blockchain Platform Extension',
            cancellable: false
        }, async (progress: vscode.Progress<{ message: string }>) => {
            progress.report({ message: `Starting Fabric runtime ${runtime.getName()}` });

            if (runtime instanceof LocalEnvironment) {
                const isCreated: boolean = await runtime.isCreated();
                if (!isCreated) {
                    await runtime.create();
                }
            }
            await runtime.start(outputAdapter);
            await update();
        });
    }
    catch (error)
    {
        await update();
        await UserInputUtil.failedNetworkStart(`Failed to start ${runtime.getName()}: ${error.message}`, `Failed to start ${runtime.getName()}: ${error.toString()}`);
    }
}
