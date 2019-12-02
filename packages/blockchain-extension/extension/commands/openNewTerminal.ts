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
import { FabricNode, FabricNodeType } from '../fabric/FabricNode';
import { NodeTreeItem } from '../explorer/runtimeOps/connectedTree/NodeTreeItem';
import { UserInputUtil, IBlockchainQuickPickItem } from './UserInputUtil';
import { FabricRuntimeUtil } from 'ibm-blockchain-platform-common';

export async function openNewTerminal(nodeItem: NodeTreeItem): Promise<void> {

    // Grab the node from the tree item, or ask the user to specify a node.
    let node: FabricNode;
    if (nodeItem) {
        node = nodeItem.node;
    } else {
        const chosenNode: IBlockchainQuickPickItem<FabricNode> = await UserInputUtil.showFabricNodeQuickPick(
            'Select a Fabric runtime node to open a new terminal for', FabricRuntimeUtil.LOCAL_FABRIC,
            [FabricNodeType.PEER, FabricNodeType.CERTIFICATE_AUTHORITY, FabricNodeType.ORDERER]
        ) as IBlockchainQuickPickItem<FabricNode>;

        // If no node at this point, most likely the user cancelled the quick pick.
        if (!chosenNode) {
            return;
        }

        node = chosenNode.data;
    }

    // Create and show a new terminal for the node.
    const name: string = `Fabric runtime - ${node.name}`;
    const shellPath: string = 'docker';
    const nodeContainerName: string = node.container_name;
    const shellArgs: string[] = [
        'exec',
        '-ti',
        nodeContainerName,
        'bash'
    ];
    Reporter.instance().sendTelemetryEvent('openFabricRuntimeTerminalCommand', {
        type: node.type
    });
    const terminal: vscode.Terminal = vscode.window.createTerminal(name, shellPath, shellArgs);
    terminal.show();

}
