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
import { UserInputUtil, IBlockchainQuickPickItem } from './UserInputUtil';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { FabricEnvironmentTreeItem } from '../explorer/runtimeOps/disconnectedTree/FabricEnvironmentTreeItem';
import { FabricEnvironmentRegistryEntry, LogType, IFabricEnvironmentConnection, EnvironmentType, EnvironmentFlags } from 'ibm-blockchain-platform-common';
import { FabricEnvironmentManager } from '../fabric/environments/FabricEnvironmentManager';

export async function openConsoleInBrowser(environment?: FabricEnvironmentTreeItem ): Promise<void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, 'open console in browser');
    let cloudEnvironment: FabricEnvironmentRegistryEntry;
    try {
        if (!environment) {
            // possibly called from connected environment
            const connection: IFabricEnvironmentConnection = FabricEnvironmentManager.instance().getConnection();
            if (connection) {
                cloudEnvironment = FabricEnvironmentManager.instance().getEnvironmentRegistryEntry();
            }

            if (!cloudEnvironment || !cloudEnvironment.environmentType || (cloudEnvironment.environmentType !== EnvironmentType.OPS_TOOLS_ENVIRONMENT && cloudEnvironment.environmentType !== EnvironmentType.SAAS_OPS_TOOLS_ENVIRONMENT)) {
                // called from command palette
                const chosenEnvironment: IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry> = await UserInputUtil.showFabricEnvironmentQuickPickBox('Choose an IBM Blockchain Platform environment to open in browser', false, true, [EnvironmentFlags.OPS_TOOLS]) as IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>;
                if (!chosenEnvironment) {
                    return;
                }
                cloudEnvironment = chosenEnvironment.data;
            }
        } else {
            cloudEnvironment = environment.environmentRegistryEntry;
        }

        if (!cloudEnvironment.url) {
            throw new Error(`Environment ${cloudEnvironment.name} doesn't have a URL associated with it`);
        }

        await vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(cloudEnvironment.url));

        outputAdapter.log(LogType.SUCCESS, undefined, 'Successfully opened console in browser');

    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Error opening console in browser: ${error.message}`, `Error opening console in browser: ${error.toString()}`);
    }
}
