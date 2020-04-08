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
import { NodeTreeItem } from '../explorer/runtimeOps/connectedTree/NodeTreeItem';
import { FabricEnvironmentManager } from '../fabric/environments/FabricEnvironmentManager';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricEnvironmentRegistry, FabricEnvironmentRegistryEntry, FabricNode, LogType, FabricEnvironment, EnvironmentType, EnvironmentFlags } from 'ibm-blockchain-platform-common';
import { EnvironmentFactory } from '../fabric/environments/EnvironmentFactory';

export async function deleteNode(nodeTreeItem: NodeTreeItem | FabricNode, hideNode?: boolean): Promise<void> {
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
            // First check there is at least one that isn't ansible
            const environments: Array<FabricEnvironmentRegistryEntry> = await FabricEnvironmentRegistry.instance().getAll([], [EnvironmentFlags.ANSIBLE]);
            if (environments.length === 0) {
                outputAdapter.log(LogType.ERROR, `No environments to choose from. Nodes from local environments and environments created using ansible cannot be modified.`);
                return;
            }

            let chosenEnvironment: IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>;
            if (hideNode) {
                chosenEnvironment = await UserInputUtil.showFabricEnvironmentQuickPickBox('Choose an OpsTools environment to hide a node from', false, true, [EnvironmentFlags.OPS_TOOLS]) as IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>;
            } else {
                chosenEnvironment = await UserInputUtil.showFabricEnvironmentQuickPickBox('Choose an environment to delete a node from', false, true, [], [EnvironmentFlags.ANSIBLE]) as IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>;
            }

            if (!chosenEnvironment) {
                return;
            }

            environmentRegistryEntry = chosenEnvironment.data;

            const chosenNodes: IBlockchainQuickPickItem<FabricNode>[] = await UserInputUtil.showNodesInEnvironmentQuickPick(`Choose a node to ${action}`, environmentRegistryEntry, [], false, true) as IBlockchainQuickPickItem<FabricNode>[];
            if (!chosenNodes || chosenNodes.length === 0) {
                return;
            }

            nodesToDelete = chosenNodes.map((chosenNode: IBlockchainQuickPickItem<FabricNode>) => chosenNode.data);
        } else {
            if (nodeTreeItem instanceof NodeTreeItem) {
                nodesToDelete = [nodeTreeItem.node];
            } else {
                nodesToDelete = [nodeTreeItem];
            }
            environmentRegistryEntry = FabricEnvironmentManager.instance().getEnvironmentRegistryEntry();
        }

        const environment: FabricEnvironment = EnvironmentFactory.getEnvironment(environmentRegistryEntry);
        const allNodes: FabricNode[] = await environment.getNodes(false, true);
        const nodes: FabricNode[] = allNodes.filter((_node: FabricNode) => !_node.hidden);

        let reallyDoIt: boolean = false;
        let allOpsNodesDeleted: boolean = false;
        if (environmentRegistryEntry.environmentType === EnvironmentType.OPS_TOOLS_ENVIRONMENT || environmentRegistryEntry.environmentType === EnvironmentType.SAAS_OPS_TOOLS_ENVIRONMENT) {
            if (hideNode) {
                if (nodes.length === nodesToDelete.length) {
                    reallyDoIt = await UserInputUtil.showConfirmationWarningMessage(`This will ${action} the remaining node(s), and disconnect from the environment. Do you want to continue?`);
                    disconnectEnvironment = true;
                } else {
                    reallyDoIt = await UserInputUtil.showConfirmationWarningMessage(`This will ${action} the node(s). Do you want to continue?`);
                }
            } else {
                reallyDoIt = true;
                const visibleNodesUrls: string[] = nodes.map((_node: FabricNode) => _node.api_url);
                const visibleTodDelete: FabricNode[] = nodesToDelete.filter((_node: FabricNode) => visibleNodesUrls.indexOf(_node.api_url) !== -1);
                if (nodesToDelete.length === allNodes.length) {
                    allOpsNodesDeleted = true;
                } else if (visibleTodDelete.length >= nodes.length) {
                    // All visible nodes are being deleted, but hidden nodes remain. Disconnect from environment.
                    disconnectEnvironment = true;
                }
            }
        } else {
            if (nodes.length === nodesToDelete.length) {
                reallyDoIt = await UserInputUtil.showConfirmationWarningMessage(`This will ${action} the remaining node(s), and the environment. Do you want to continue?`);
                deleteEnvironment = reallyDoIt;
            } else {
                reallyDoIt = await UserInputUtil.showConfirmationWarningMessage(`This will ${action} the node(s). Do you want to continue?`);
            }
        }

        if (!reallyDoIt) {
            return;
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

        if (!deleteEnvironment && !disconnectEnvironment && !allOpsNodesDeleted) {
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
            if (nodesToDelete.length === 1 && (environmentRegistryEntry.environmentType === EnvironmentType.OPS_TOOLS_ENVIRONMENT || environmentRegistryEntry.environmentType === EnvironmentType.SAAS_OPS_TOOLS_ENVIRONMENT)) {
                outputAdapter.log(LogType.SUCCESS, `Node ${nodesToDelete[0].name} was removed from ${environmentRegistryEntry.name}`);
            } else if (nodesToDelete.length === 1) {
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
