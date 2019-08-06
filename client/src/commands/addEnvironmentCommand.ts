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
import { UserInputUtil } from './UserInputUtil';
import { Reporter } from '../util/Reporter';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../logging/OutputAdapter';
import { FabricRuntimeUtil } from '../fabric/FabricRuntimeUtil';
import { FabricEnvironmentRegistry } from '../fabric/FabricEnvironmentRegistry';
import { FabricEnvironmentRegistryEntry } from '../fabric/FabricEnvironmentRegistryEntry';
import * as fs from 'fs-extra';
import * as path from 'path';
import { SettingConfigurations } from '../../SettingConfigurations';
import { FabricNode } from '../fabric/FabricNode';
import { FabricEnvironment } from '../fabric/FabricEnvironment';

export async function addEnvironment(): Promise<{} | void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    try {
        outputAdapter.log(LogType.INFO, undefined, 'Add environment');

        const fabricEnvironmentRegistry: FabricEnvironmentRegistry = FabricEnvironmentRegistry.instance();

        const environmentName: string = await UserInputUtil.showInputBox('Enter a name for the environment');
        if (!environmentName) {
            return;
        }

        if (fabricEnvironmentRegistry.exists(environmentName) || environmentName === FabricRuntimeUtil.LOCAL_FABRIC) {
            // Environment already exists
            throw new Error('An environment with this name already exists.');
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
            const selectedNodeUris: vscode.Uri[] = await UserInputUtil.browse('Select all the Fabric node files you want to import', quickPickItems, openDialogOptions, true) as vscode.Uri[];

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

        const dirPath: string = await vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_DIRECTORY) as string;
        const homeExtDir: string = UserInputUtil.getDirPath(dirPath);
        const environmentPath: string = path.join(homeExtDir, 'environments', environmentName, 'nodes');

        await fs.ensureDir(environmentPath);
        let addedAllNodes: boolean = true;
        for (const nodeUri of nodeUris) {
            try {
                let nodes: FabricNode | Array<FabricNode> = await fs.readJson(nodeUri.fsPath);
                if (!Array.isArray(nodes)) {
                    nodes = [nodes];
                }

                const environment: FabricEnvironment = new FabricEnvironment(environmentName);
                for (const node of nodes) {
                    await FabricNode.validateNode(node);
                    await environment.updateNode(node);
                }
            } catch (error) {
                addedAllNodes = false;
                outputAdapter.log(LogType.ERROR, `Error importing node file ${nodeUri.fsPath}: ${error.message}`, `Error importing node file ${nodeUri.fsPath}: ${error.toString()}`);
            }
        }

        const fabricEnvironmentEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
        fabricEnvironmentEntry.name = environmentName;
        await fabricEnvironmentRegistry.add(fabricEnvironmentEntry);

        if (addedAllNodes) {
            outputAdapter.log(LogType.SUCCESS, 'Successfully added a new environment');
        } else {
            outputAdapter.log(LogType.WARNING, 'Added a new environment, but some nodes could not be added');
        }
        Reporter.instance().sendTelemetryEvent('addEnvironmentCommand');
    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Failed to add a new environment: ${error.message}`, `Failed to add a new environment: ${error.toString()}`);
    }
}
