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
import { LogType } from '../logging/OutputAdapter';
import { FabricEnvironmentRegistryEntry } from '../registries/FabricEnvironmentRegistryEntry';
import { FabricNode } from '../fabric/FabricNode';
import { FabricEnvironment } from '../fabric/FabricEnvironment';
import { NodeTreeItem } from '../explorer/runtimeOps/connectedTree/NodeTreeItem';
import { FabricEnvironmentManager } from '../fabric/FabricEnvironmentManager';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricEnvironmentRegistry } from '../registries/FabricEnvironmentRegistry';
import { FabricRuntimeUtil } from 'ibm-blockchain-platform-common';

export async function deleteNode(nodeTreeItem: NodeTreeItem): Promise<void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, 'delete node');

    let removeEnvironment: boolean = false;
    let environmentRegistryEntry: FabricEnvironmentRegistryEntry;
    try {
        let nodesToDelete: FabricNode[];

        if (!nodeTreeItem) {
            // If called from command palette
            // Ask for environment to delete
            // First check there is at least one that isn't local_fabric
            const environments: Array<FabricEnvironmentRegistryEntry> = await FabricEnvironmentRegistry.instance().getAll(false);
            if (environments.length === 0) {
                outputAdapter.log(LogType.ERROR, `No environments to choose from. Nodes from ${FabricRuntimeUtil.LOCAL_FABRIC} cannot be deleted.`);
                return;
            }

            const chosenEnvironment: IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry> = await UserInputUtil.showFabricEnvironmentQuickPickBox('Choose an environment to delete a node from', false, true, false) as IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>;
            if (!chosenEnvironment) {
                return;
            }

            environmentRegistryEntry = chosenEnvironment.data;

            const chosenNodes: IBlockchainQuickPickItem<FabricNode>[] = await UserInputUtil.showFabricNodeQuickPick('Choose a node to delete', environmentRegistryEntry.name, [], false, true) as IBlockchainQuickPickItem<FabricNode>[];
            if (!chosenNodes || chosenNodes.length === 0) {
                return;
            }

            nodesToDelete = chosenNodes.map((chosenNode: IBlockchainQuickPickItem<FabricNode>) => chosenNode.data);
        } else {
            nodesToDelete = [nodeTreeItem.node];
            environmentRegistryEntry = FabricEnvironmentManager.instance().getEnvironmentRegistryEntry();
        }

        const environment: FabricEnvironment = new FabricEnvironment(environmentRegistryEntry.name);
        const nodes: FabricNode[] = await environment.getNodes();

        let reallyDoIt: boolean = false;
        if (nodes.length === nodesToDelete.length) {
            reallyDoIt = await UserInputUtil.showConfirmationWarningMessage(`This will remove the remaining node(s), and the environment. Do you want to continue?`);
            if (!reallyDoIt) {
                return;
            }

            removeEnvironment = true;
        } else {
            reallyDoIt = await UserInputUtil.showConfirmationWarningMessage(`This will remove the node(s). Do you want to continue?`);
            if (!reallyDoIt) {
                return;
            }
        }

        for (const nodeToDelete of nodesToDelete) {
            await environment.deleteNode(nodeToDelete);
        }

        if (!removeEnvironment) {
            const connectedRegistry: FabricEnvironmentRegistryEntry = FabricEnvironmentManager.instance().getEnvironmentRegistryEntry();
            if (connectedRegistry && connectedRegistry.name === environmentRegistryEntry.name) {
                // only connect if already connected to this environment or in setup for this environment
                await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT, connectedRegistry);
            }
        }

        if (nodesToDelete.length === 1) {
            outputAdapter.log(LogType.SUCCESS, `Successfully deleted node ${nodesToDelete[0].name}`);
        } else {
            outputAdapter.log(LogType.SUCCESS, `Successfully deleted nodes`);
        }

    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Error deleting node: ${error.message}`, `Error deleting node: ${error.toString()}`);
    }

    if (removeEnvironment) {
        await vscode.commands.executeCommand(ExtensionCommands.DELETE_ENVIRONMENT, environmentRegistryEntry, true);
    }
}
