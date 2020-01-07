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
import { UserInputUtil, IBlockchainQuickPickItem, EnvironmentType } from './UserInputUtil';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { NodeTreeItem } from '../explorer/runtimeOps/connectedTree/NodeTreeItem';
import { FabricEnvironmentManager } from '../fabric/environments/FabricEnvironmentManager';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricEnvironmentRegistry, FabricEnvironmentRegistryEntry, FabricNode, FabricRuntimeUtil, LogType, FabricEnvironment } from 'ibm-blockchain-platform-common';
import { EnvironmentFactory } from '../fabric/environments/EnvironmentFactory';

export async function deleteNode(nodeTreeItem: NodeTreeItem, hideNode?: boolean): Promise<void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();

    let action: string;
    if (hideNode) {
        action = 'hide';
        outputAdapter.log(LogType.INFO, undefined, 'hide node');
    } else {
        action = 'delete';
        outputAdapter.log(LogType.INFO, undefined, 'delete node');
    }

    let deleteEnvironment: boolean = false;
    let disconnectEnvironment: boolean = false;
    let environmentRegistryEntry: FabricEnvironmentRegistryEntry;
    try {
        let nodesToDelete: FabricNode[];

        if (!nodeTreeItem) {
            // If called from command palette
            // Ask for environment to delete
            // First check there is at least one that isn't local_fabric
            const environments: Array<FabricEnvironmentRegistryEntry> = await FabricEnvironmentRegistry.instance().getAll(false, false, true);
            if (environments.length === 0) {
                outputAdapter.log(LogType.ERROR, `No environments to choose from. Nodes from ${FabricRuntimeUtil.LOCAL_FABRIC} environments and environments created using ansible cannot be modified.`);
                return;
            }

            let chosenEnvironment: IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>;
            if (hideNode) {
                chosenEnvironment = await UserInputUtil.showFabricEnvironmentQuickPickBox('Choose an OpsTool environment to hide a node from', false, true, false, EnvironmentType.OPSTOOLSENV, false, true) as IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>;
            } else {
                chosenEnvironment = await UserInputUtil.showFabricEnvironmentQuickPickBox('Choose an environment to delete a node from', false, true, false, EnvironmentType.ALLENV, false, true) as IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>;
            }

            if (!chosenEnvironment) {
                return;
            }

            environmentRegistryEntry = chosenEnvironment.data;

            const chosenNodes: IBlockchainQuickPickItem<FabricNode>[] = await UserInputUtil.showNodesInEnvironmentQuickPick(`Choose a node to ${action}`, environmentRegistryEntry.name, [], false, true) as IBlockchainQuickPickItem<FabricNode>[];
            if (!chosenNodes || chosenNodes.length === 0) {
                return;
            }

            nodesToDelete = chosenNodes.map((chosenNode: IBlockchainQuickPickItem<FabricNode>) => chosenNode.data);
        } else {
            nodesToDelete = [nodeTreeItem.node];
            environmentRegistryEntry = FabricEnvironmentManager.instance().getEnvironmentRegistryEntry();
        }

        const environment: FabricEnvironment = EnvironmentFactory.getEnvironment(environmentRegistryEntry);
        const nodes: FabricNode[] = await environment.getNodes();

        let reallyDoIt: boolean = false;
        if (nodes.length === nodesToDelete.length) {
            if (hideNode) {
                reallyDoIt = await UserInputUtil.showConfirmationWarningMessage(`This will hide the remaining node(s), and disconnect from the environment. Do you want to continue?`);
            } else {
                reallyDoIt = await UserInputUtil.showConfirmationWarningMessage(`This will delete the remaining node(s), and the environment. Do you want to continue?`);
            }
            if (!reallyDoIt) {
                return;
            }

            if (hideNode) {
                disconnectEnvironment = true;
            } else {
                deleteEnvironment = true;
            }
        } else {
            reallyDoIt = await UserInputUtil.showConfirmationWarningMessage(`This will ${action} the node(s). Do you want to continue?`);
            if (!reallyDoIt) {
                return;
            }
        }

        if (hideNode) {
            for (const nodeToDelete of nodesToDelete) {
                nodeToDelete.hidden = true;
                await environment.updateNode(nodeToDelete);
            }
        } else {
            for (const nodeToDelete of nodesToDelete) {
                await environment.deleteNode(nodeToDelete);
            }
        }

        if (!deleteEnvironment && !disconnectEnvironment) {
            const connectedRegistry: FabricEnvironmentRegistryEntry = FabricEnvironmentManager.instance().getEnvironmentRegistryEntry();
            if (connectedRegistry && connectedRegistry.name === environmentRegistryEntry.name) {
                // only connect if already connected to this environment or in setup for this environment
                await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT, connectedRegistry);
            }
        }

        if (hideNode) {
            if (nodesToDelete.length === 1) {
                outputAdapter.log(LogType.SUCCESS, `Successfully hid node ${nodesToDelete[0].name}`);
            } else {
                outputAdapter.log(LogType.SUCCESS, `Successfully hid nodes`);
            }
        } else {
            if (nodesToDelete.length === 1) {
                outputAdapter.log(LogType.SUCCESS, `Successfully deleted node ${nodesToDelete[0].name}`);
            } else {
                outputAdapter.log(LogType.SUCCESS, `Successfully deleted nodes`);
            }
        }

    } catch (error) {
            outputAdapter.log(LogType.ERROR, `Cannot ${action} node: ${error.message}`, `Cannot ${action} node: ${error.toString()}`);
        }

    if (deleteEnvironment) {
        await vscode.commands.executeCommand(ExtensionCommands.DELETE_ENVIRONMENT, environmentRegistryEntry, true);
    }
    if (disconnectEnvironment) {
        await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT_ENVIRONMENT);
    }
}
