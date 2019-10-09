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
import * as fs from 'fs-extra';
import * as path from 'path';
import { SettingConfigurations } from '../../SettingConfigurations';
import { FabricNode } from '../fabric/FabricNode';
import { FabricEnvironment } from '../fabric/FabricEnvironment';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FileSystemUtil } from '../util/FileSystemUtil';

export async function importNodesToEnvironment(environmentRegistryEntry: FabricEnvironmentRegistryEntry, fromAddEnvironment: boolean = false): Promise<boolean> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, 'Import nodes to environment');

    try {

        if (!environmentRegistryEntry) {
            const chosenEnvironment: IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry> = await UserInputUtil.showFabricEnvironmentQuickPickBox('Choose an environment to import nodes to', false);
            if (!chosenEnvironment) {
                return;
            }

            environmentRegistryEntry = chosenEnvironment.data;
        }

        const quickPickItems: string[] = [UserInputUtil.BROWSE_LABEL];
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
            const selectedNodeUris: vscode.Uri[] = await UserInputUtil.browse('Select all the Fabric node (JSON) files you want to import', quickPickItems, openDialogOptions, true) as vscode.Uri[];

            if (selectedNodeUris) {
                nodeUris.push(...selectedNodeUris);
            }

            if (!nodeUris || nodeUris.length === 0) {
                if (fromAddEnvironment) {
                    return undefined;
                } else {
                    return;
                }
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

        const dirPath: string = await vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_DIRECTORY) as string;
        const homeExtDir: string = FileSystemUtil.getDirPath(dirPath);
        const environmentPath: string = path.join(homeExtDir, 'environments', environmentRegistryEntry.name, 'nodes');

        const environment: FabricEnvironment = new FabricEnvironment(environmentRegistryEntry.name);
        const oldNodes: FabricNode[] = await environment.getNodes();

        await fs.ensureDir(environmentPath);
        let addedAllNodes: boolean = true;
        for (const nodeUri of nodeUris) {
            try {
                let nodes: FabricNode | Array<FabricNode> = await fs.readJson(nodeUri.fsPath);
                if (!Array.isArray(nodes)) {
                    nodes = [nodes];
                }

                for (const node of nodes) {
                    try {
                        const alreadyExists: boolean = oldNodes.some((_node: FabricNode) => _node.name === node.name);

                        if (alreadyExists) {
                            throw new Error(`Node with name ${node.name} already exists`);
                        }
                        await FabricNode.validateNode(node);
                        await environment.updateNode(node);
                    } catch (error) {
                        addedAllNodes = false;
                        if (!node.name) {
                            outputAdapter.log(LogType.ERROR, `Error importing node from file ${nodeUri.fsPath}: ${error.message}`, `Error importing node from file ${nodeUri.fsPath}: ${error.toString()}`);
                        } else {
                            outputAdapter.log(LogType.ERROR, `Error importing node ${node.name} from file ${nodeUri.fsPath}: ${error.message}`, `Error importing node ${node.name} from file ${nodeUri.fsPath}: ${error.toString()}`);
                        }
                    }
                }
            } catch (error) {
                addedAllNodes = false;
                outputAdapter.log(LogType.ERROR, `Error importing node file ${nodeUri.fsPath}: ${error.message}`, `Error importing node file ${nodeUri.fsPath}: ${error.toString()}`);
            }
        }

        // check if any nodes were added
        const newNodes: FabricNode[] = await environment.getNodes();
        if (newNodes.length === oldNodes.length) {
            throw new Error('no nodes were added');
        }

        if (addedAllNodes) {
            outputAdapter.log(LogType.SUCCESS, 'Successfully imported all node files');
        } else {
            outputAdapter.log(LogType.WARNING, 'Finished importing nodes but some nodes could not be added');
        }

        if (!fromAddEnvironment && environmentRegistryEntry) {
            // only do this if we run the command from the tree as need to refresh the tree to do setup
            await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);
        }

        return addedAllNodes;

    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Error importing node files: ${error.message}`, `Error importing node files: ${error.toString()}`);
        if (fromAddEnvironment) {
            throw error;
        }
    }
}
