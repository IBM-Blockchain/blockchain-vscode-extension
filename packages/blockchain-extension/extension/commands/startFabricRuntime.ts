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
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricRuntimeUtil } from 'ibm-blockchain-platform-common';

export async function startFabricRuntime(): Promise<void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, 'startFabricRuntime');
    const runtime: FabricRuntime = FabricRuntimeManager.instance().getRuntime();
    VSCodeBlockchainOutputAdapter.instance().show();

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'IBM Blockchain Platform Extension',
        cancellable: false
    }, async (progress: vscode.Progress<{ message: string }>) => {
        progress.report({ message: `Starting Fabric runtime ${FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME}` });
        try {
            const isCreated: boolean = await runtime.isCreated();
            if (!isCreated) {
                await runtime.create();
            }
            const generated: boolean = await runtime.isGenerated();
            if (!generated) {
                await runtime.generate(outputAdapter);
            }
            await runtime.start(outputAdapter);
            await runtime.importWalletsAndIdentities();
        } catch (error) {
            outputAdapter.log(LogType.ERROR, `Failed to start ${FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME}: ${error.message}`, `Failed to start ${FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME}: ${error.toString()}`);
        }

        await vscode.commands.executeCommand(ExtensionCommands.REFRESH_ENVIRONMENTS);
        await vscode.commands.executeCommand(ExtensionCommands.REFRESH_GATEWAYS);
        await vscode.commands.executeCommand(ExtensionCommands.REFRESH_WALLETS);
    });
}
