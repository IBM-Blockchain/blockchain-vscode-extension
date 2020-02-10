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
import * as fs from 'fs-extra';
import * as path from 'path';
import { FabricEnvironmentRegistryEntry, FabricNode, LogType, FabricEnvironment } from 'ibm-blockchain-platform-common';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricEnvironmentManager } from '../fabric/environments/FabricEnvironmentManager';
import { EnvironmentFactory } from '../fabric/environments/EnvironmentFactory';

export async function importNodesToEnvironment(environmentRegistryEntry: FabricEnvironmentRegistryEntry, fromAddEnvironment: boolean = false): Promise<boolean> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, 'Import nodes to environment');

    try {
        if (!environmentRegistryEntry) {
            const chosenEnvironment: IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry> = await UserInputUtil.showFabricEnvironmentQuickPickBox('Choose an environment to import nodes to', false, true) as IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>;
            if (!chosenEnvironment) {
                return;
            }

            environmentRegistryEntry = chosenEnvironment.data;
        }

        const environment: FabricEnvironment = EnvironmentFactory.getEnvironment(environmentRegistryEntry);
        const environmentBaseDir: string = path.resolve(environment.getPath());

        const nodesToUpdate: FabricNode[] = [];
        let addedAllNodes: boolean = true;

        const openDialogOptions: vscode.OpenDialogOptions = {
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: true,
            openLabel: 'Select',
            filters: {
                'Node Files': ['json']
            }
        };

        const nodeUris: vscode.Uri[] = [];
        let addMore: boolean = true;
        do {
            const selectedNodeUris: vscode.Uri[] = await UserInputUtil.browse('Select all the Fabric node (JSON) files you want to import', UserInputUtil.BROWSE_LABEL, openDialogOptions, true) as vscode.Uri[];

            if (selectedNodeUris) {
                nodeUris.push(...selectedNodeUris);
            }

            if (!nodeUris || nodeUris.length === 0) {
                return;
            }

            const addMoreString: string = await UserInputUtil.addMoreNodes(`${nodeUris.length} JSON file(s) added successfully`);
            if (addMoreString === UserInputUtil.ADD_MORE_NODES) {
                addMore = true;
            } else if (addMoreString === UserInputUtil.DONE_ADDING_NODES) {
                addMore = false;
            } else {
                // cancelled so exit
                return;
            }
        } while (addMore);

        for (const nodeUri of nodeUris) {
            try {
                let nodes: FabricNode | Array<FabricNode> = await fs.readJson(nodeUri.fsPath);
                if (!Array.isArray(nodes)) {
                    nodes = [nodes];
                }

                nodesToUpdate.push(...nodes);
            } catch (error) {
                addedAllNodes = false;
                outputAdapter.log(LogType.ERROR, `Error importing node file ${nodeUri.fsPath}: ${error.message}`, `Error importing node file ${nodeUri.fsPath}: ${error.toString()}`);
            }
        }

        const environmentNodesPath: string = path.join(environmentBaseDir, 'nodes');
        await fs.ensureDir(environmentNodesPath);

        const oldNodes: FabricNode[] = await environment.getNodes();
        for (const node of nodesToUpdate) {
            try {
                const alreadyExists: boolean = oldNodes.some((_node: FabricNode) => _node.name === node.name);
                if (alreadyExists) {
                    throw new Error(`Node with name ${node.name} already exists`);
                }
                FabricNode.validateNode(node);
                await environment.updateNode(node);
            } catch (error) {
                addedAllNodes = false;
                if (!node.name) {
                    outputAdapter.log(LogType.ERROR, `Error importing node: ${error.message}`, `Error importing node: ${error.toString()}`);
                } else {
                    outputAdapter.log(LogType.ERROR, `Error importing node ${node.name}: ${error.message}`, `Error importing node ${node.name}: ${error.toString()}`);
                }
            }
        }

        // check if any nodes were added

        const newEnvironment: FabricEnvironment = EnvironmentFactory.getEnvironment(environmentRegistryEntry);
        const newNodes: FabricNode[] = await newEnvironment.getNodes();
        if (newNodes.length === oldNodes.length) {
            throw new Error('no nodes were added');
        }

        if (addedAllNodes) {
            outputAdapter.log(LogType.SUCCESS, 'Successfully imported all nodes');
        } else {
            outputAdapter.log(LogType.WARNING, 'Finished importing nodes but some nodes could not be added');
        }

        const connectedRegistryEntry: FabricEnvironmentRegistryEntry = FabricEnvironmentManager.instance().getEnvironmentRegistryEntry();
        if (connectedRegistryEntry && connectedRegistryEntry.name === environmentRegistryEntry.name) {
            // only do this if we run the command if we are connected to the one we are updating
            await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);
        }

        return addedAllNodes;

    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Error importing nodes: ${error.message}`);
        if (fromAddEnvironment) {
            throw error;
        }
    }
}
