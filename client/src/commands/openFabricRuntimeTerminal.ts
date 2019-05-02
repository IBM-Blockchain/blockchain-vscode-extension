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
import { Reporter } from '../util/Reporter';
import { FabricRuntime } from '../fabric/FabricRuntime';
import { FabricRuntimeManager } from '../fabric/FabricRuntimeManager';
import { FabricRuntimeUtil } from '../fabric/FabricRuntimeUtil';

export async function openFabricRuntimeTerminal(): Promise<void> {
    const runtime: FabricRuntime = FabricRuntimeManager.instance().getRuntime();

    const name: string = `Fabric runtime - ${runtime.getName()}`;
    const shellPath: string = 'docker';
    const peerContainerName: string = await runtime.getPeerContainerName();
    const shellArgs: string[] = [
        'exec',
        '-e',
        'CORE_PEER_LOCALMSPID=Org1MSP',
        '-e',
        `CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/msp/users/${FabricRuntimeUtil.ADMIN_USER}/msp`,
        '-ti',
        peerContainerName,
        'bash'
    ];
    Reporter.instance().sendTelemetryEvent('openFabricRuntimeTerminalCommand');
    const terminal: vscode.Terminal = vscode.window.createTerminal(name, shellPath, shellArgs);
    terminal.show();
}
