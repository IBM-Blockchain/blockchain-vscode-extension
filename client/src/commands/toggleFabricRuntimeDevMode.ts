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
import { RuntimeTreeItem } from '../explorer/model/RuntimeTreeItem';
import { VSCodeOutputAdapter } from '../logging/VSCodeOutputAdapter';
import { FabricRuntime } from '../fabric/FabricRuntime';
import { FabricConnectionManager } from '../fabric/FabricConnectionManager';
import { FabricRuntimeManager } from '../fabric/FabricRuntimeManager';

export async function toggleFabricRuntimeDevMode(runtimeTreeItem?: RuntimeTreeItem): Promise<void> {
    let runtime: FabricRuntime;
    if (!runtimeTreeItem) {
        const runtimes: Array<FabricRuntime> = FabricRuntimeManager.instance().getAll();
        if (runtimes.length > 1) {
            const chosenRuntime: IBlockchainQuickPickItem<FabricRuntime> = await UserInputUtil.showRuntimeQuickPickBox('Select the Fabric runtime to toggle development mode');
            if (!chosenRuntime) {
                return;
            }

            runtime = chosenRuntime.data;
        } else {
            runtime = runtimes[0];
        }
    } else {
        runtime = runtimeTreeItem.getRuntime();
    }

    const oldDevelopmentMode: boolean = runtime.isDevelopmentMode();
    const newDevelopmentMode: boolean = !oldDevelopmentMode;

    if (FabricConnectionManager.instance().getConnection()) {
        // Disconnect if connected
        await vscode.commands.executeCommand('blockchainConnectionsExplorer.disconnectEntry');
    }

    await runtime.setDevelopmentMode(newDevelopmentMode);
    const running: boolean = await runtime.isRunning();
    if (running) {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'IBM Blockchain Platform Extension',
            cancellable: false
        }, async (progress: vscode.Progress<{ message: string }>) => {
            progress.report({ message: `Restarting Fabric runtime ${runtime.getName()}` });
            const outputAdapter: VSCodeOutputAdapter = VSCodeOutputAdapter.instance();
            await runtime.restart(outputAdapter);
        });
    }

    vscode.window.showInformationMessage('Successfully toggled development mode');

}
