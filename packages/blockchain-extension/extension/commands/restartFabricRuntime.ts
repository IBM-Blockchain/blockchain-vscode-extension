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
import { FabricRuntime } from '../fabric/FabricRuntime';
import { FabricRuntimeManager } from '../fabric/FabricRuntimeManager';
import { LogType } from '../logging/OutputAdapter';
import { FabricRuntimeUtil } from 'ibm-blockchain-platform-common';
import { FabricGatewayRegistryEntry } from '../registries/FabricGatewayRegistryEntry';
import { FabricGatewayConnectionManager } from '../fabric/FabricGatewayConnectionManager';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricEnvironmentRegistryEntry } from '../registries/FabricEnvironmentRegistryEntry';
import { FabricEnvironmentManager } from '../fabric/FabricEnvironmentManager';

export async function restartFabricRuntime(): Promise<void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, 'restartFabricRuntime');
    const runtime: FabricRuntime = FabricRuntimeManager.instance().getRuntime();

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'IBM Blockchain Platform Extension',
        cancellable: false
    }, async (progress: vscode.Progress<{ message: string }>) => {
        progress.report({ message: `Restarting Fabric runtime ${FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME}` });

        const connectedGatewayRegistry: FabricGatewayRegistryEntry = FabricGatewayConnectionManager.instance().getGatewayRegistryEntry();
        if (connectedGatewayRegistry && connectedGatewayRegistry.name === FabricRuntimeUtil.LOCAL_FABRIC) {
            await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT_GATEWAY);
        }

        const connectedEnvironmentRegistry: FabricEnvironmentRegistryEntry = FabricEnvironmentManager.instance().getEnvironmentRegistryEntry();
        if (connectedEnvironmentRegistry && connectedEnvironmentRegistry.managedRuntime) {
            await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT_ENVIRONMENT);
        }

        try {
            await runtime.restart(outputAdapter);
        } catch (error) {
            outputAdapter.log(LogType.ERROR, `Failed to restart ${FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME}: ${error.message}`, `Failed to restart ${FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME}: ${error.toString()}`);
        }
    });
}
