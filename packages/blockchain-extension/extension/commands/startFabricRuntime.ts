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
import { EnvironmentFactory } from '../fabric/environments/EnvironmentFactory';
import { ManagedAnsibleEnvironment } from '../fabric/environments/ManagedAnsibleEnvironment';
import { IBlockchainQuickPickItem, UserInputUtil } from './UserInputUtil';
import { LogType, FabricEnvironmentRegistryEntry } from 'ibm-blockchain-platform-common';

export async function startFabricRuntime(registryEntry?: FabricEnvironmentRegistryEntry): Promise<void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, 'startFabricRuntime');

    if (!registryEntry) {
        const chosenEnvironment: IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry> = await UserInputUtil.showFabricEnvironmentQuickPickBox('Select an environment to start', false, true, true, true) as IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>;
        if (!chosenEnvironment) {
            return;
        }

        registryEntry = chosenEnvironment.data;

    }

    const runtime: ManagedAnsibleEnvironment | LocalEnvironment = await EnvironmentFactory.getEnvironment(registryEntry) as ManagedAnsibleEnvironment | LocalEnvironment;
    VSCodeBlockchainOutputAdapter.instance().show();

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'IBM Blockchain Platform Extension',
        cancellable: false
    }, async (progress: vscode.Progress<{ message: string }>) => {
        progress.report({ message: `Starting Fabric runtime ${runtime.getName()}` });
        try {

            if (runtime instanceof LocalEnvironment) {
                const isCreated: boolean = await runtime.isCreated();
                if (!isCreated) {
                    await runtime.create();
                }

                const isGenerated: boolean = await runtime.isGenerated();
                if (!isGenerated) {
                    await runtime.generate(outputAdapter);
                    await runtime.importWalletsAndIdentities();
                    await runtime.importGateways();
                }
            }
            await runtime.start(outputAdapter);
            // await runtime.importWalletsAndIdentities();
            // await runtime.importGateways();
        } catch (error) {
            outputAdapter.log(LogType.ERROR, `Failed to start ${runtime.getName()}: ${error.message}`, `Failed to start ${runtime.getName()}: ${error.toString()}`);
        }

        await vscode.commands.executeCommand(ExtensionCommands.REFRESH_ENVIRONMENTS);
        await vscode.commands.executeCommand(ExtensionCommands.REFRESH_GATEWAYS);
        await vscode.commands.executeCommand(ExtensionCommands.REFRESH_WALLETS);
    });
}
