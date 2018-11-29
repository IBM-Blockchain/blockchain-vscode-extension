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
import { FabricRuntime } from '../fabric/FabricRuntime';
import { FabricRuntimeManager } from '../fabric/FabricRuntimeManager';

export async function openFabricRuntimeTerminal(runtimeTreeItem?: RuntimeTreeItem): Promise<void> {
    let runtime: FabricRuntime;
    if (!runtimeTreeItem) {
        const allRuntimes: Array<FabricRuntime> = FabricRuntimeManager.instance().getAll();
        if (allRuntimes.length > 1) {
            const chosenRuntime: IBlockchainQuickPickItem<FabricRuntime> = await UserInputUtil.showRuntimeQuickPickBox('Select the Fabric runtime to open a terminal for') as IBlockchainQuickPickItem<FabricRuntime>;
            if (!chosenRuntime) {
                return;
            }
            runtime = chosenRuntime.data;
        } else {
            runtime = allRuntimes[0];
        }
    } else {
        runtime = runtimeTreeItem.getRuntime();
    }

    const name: string = `Fabric runtime - ${runtime.getName()}`;
    const shellPath: string = 'docker';
    const peerContainerName: string = runtime.getPeerContainerName();
    const shellArgs: string[] = [
        'exec',
        '-e',
        'CORE_PEER_LOCALMSPID=Org1MSP',
        '-e',
        'CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/msp/users/Admin@org1.example.com/msp',
        '-ti',
        peerContainerName,
        'bash'
    ];

    const terminal: vscode.Terminal = vscode.window.createTerminal(name, shellPath, shellArgs);
    terminal.show();
}
