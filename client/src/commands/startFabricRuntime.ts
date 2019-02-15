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
import { IFabricWallet } from '../fabric/IFabricWallet';
import { FabricWalletGeneratorFactory } from '../fabric/FabricWalletGeneratorFactory';
import { ExtensionCommands } from '../../ExtensionCommands';

export async function startFabricRuntime(): Promise<void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, 'startFabricRuntime');
    const runtime: FabricRuntime = FabricRuntimeManager.instance().get('local_fabric');

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'IBM Blockchain Platform Extension',
        cancellable: false
    }, async (progress: vscode.Progress<{ message: string }>) => {
        progress.report({ message: `Starting Fabric runtime ${runtime.getName()}` });
        await runtime.start(outputAdapter);

        const runtimeWallet: IFabricWallet = await FabricWalletGeneratorFactory.createFabricWalletGenerator().createLocalWallet(runtime['name']);
        const connectionProfile: any = await runtime.getConnectionProfile();
        const certificate: string = await runtime.getCertificate();
        const privateKey: string = await runtime.getPrivateKey();
        await runtimeWallet.importIdentity(connectionProfile, certificate, privateKey, 'Admin@org1.example.com');

        await vscode.commands.executeCommand(ExtensionCommands.REFRESH_LOCAL_OPS);
        await vscode.commands.executeCommand(ExtensionCommands.REFRESH_GATEWAYS);
    });
}
