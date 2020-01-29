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
import {UserInputUtil, IBlockchainQuickPickItem, EnvironmentType} from './UserInputUtil';
import {VSCodeBlockchainOutputAdapter} from '../logging/VSCodeBlockchainOutputAdapter';
import * as fs from 'fs-extra';
import * as https from 'https';
import * as path from 'path';
import {SettingConfigurations} from '../../configurations';
import {
    FabricEnvironmentRegistryEntry,
    FabricNode,
    LogType,
    FabricEnvironment,
    FileSystemUtil
} from 'ibm-blockchain-platform-common';
import {ExtensionCommands} from '../../ExtensionCommands';
import {FabricEnvironmentManager} from '../fabric/environments/FabricEnvironmentManager';
import {EnvironmentFactory} from '../fabric/environments/EnvironmentFactory';
import Axios from 'axios';
import { ModuleUtil } from '../util/ModuleUtil';

export async function importNodesToEnvironment(environmentRegistryEntry: FabricEnvironmentRegistryEntry, fromAddEnvironment: boolean = false, createMethod?: string, informOfChanges: boolean = false): Promise<boolean> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    const methodMessageString: string = createMethod !== UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS ? 'import' : 'filter';
    outputAdapter.log(LogType.INFO, undefined, 'Import nodes to environment');

    try {

        let chosenEnvironment: IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>;
        if (!environmentRegistryEntry) {
            if (createMethod === UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS) {
                chosenEnvironment = await UserInputUtil.showFabricEnvironmentQuickPickBox('Choose an OpsTool environment to filter nodes', false, true, false, EnvironmentType.OPSTOOLSENV) as IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>;
            } else {
                chosenEnvironment = await UserInputUtil.showFabricEnvironmentQuickPickBox('Choose an environment to import nodes to', false, true, false, EnvironmentType.OTHERENV) as IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>;
            }

            if (!chosenEnvironment) {
                return;
            }

            environmentRegistryEntry = chosenEnvironment.data;
        }

        if (!fromAddEnvironment) {
            if (environmentRegistryEntry.url) {
                createMethod = UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS;
            } else {
                createMethod = UserInputUtil.ADD_ENVIRONMENT_FROM_NODES;
            }
        }

        const environment: FabricEnvironment = new FabricEnvironment(environmentRegistryEntry.name);
        const environmentBaseDir: string = path.resolve(environment.getPath());
        const oldNodes: FabricNode[] = await environment.getNodes(false, true);

        const nodesToUpdate: FabricNode[] = [];
        let addedAllNodes: boolean = true;
        if (createMethod === UserInputUtil.ADD_ENVIRONMENT_FROM_NODES) {
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
                }
                while (addMore) {
                    ;
                }

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
        } else {
            const keytar: any = ModuleUtil.getCoreNodeModule('keytar');
                if (!keytar) {
                    throw new Error('Error importing the keytar module');
                }

                const GET_ALL_COMPONENTS: string = '/ak/api/v1/components';
            const api: string = environmentRegistryEntry.url.replace(/\/$/, '') + GET_ALL_COMPONENTS;
                let response: any;

            try {
                // establish connection to Ops Tools and retrieve json file
                const credentials: string = await keytar.getPassword('blockchain-vscode-ext', environmentRegistryEntry.url);
                const credentialsArray: string[] = credentials.split(':');
                if (credentialsArray.length !== 2) {
                    throw new Error(`Unable to retrieve the stored credentials`);
                }
                const apiKey: string = credentialsArray[0];
                const apiSecret: string = credentialsArray[1];
                const requestOptions: any = {
                    headers: {'Content-Type': 'application/json'},
                    auth: {username: apiKey, password: apiSecret}
                };
                    try {
                        response = await Axios.get(api, requestOptions);
                    } catch (error) {
                        // This needs to be fixed - exactly what codes can we get that will require this behaviour?
                        if (error.code === 'DEPTH_ZERO_SELF_SIGNED_CERT') {
                        const environmentBaseDirExists: boolean = await fs.pathExists(environmentBaseDir);
                            let caCertificate: string;
                        if (environmentBaseDirExists) {
                            let certificateFiles: string[] = await fs.readdir(environmentBaseDir);
                            certificateFiles = certificateFiles.filter((fileName: string) => fileName.endsWith('.pem')).map((fileName: string) => path.resolve(environmentBaseDir, fileName));

                            if (certificateFiles.length > 1) {
                                throw new Error(`Unable to connect: There are multiple certificates in ${environmentBaseDir}`);
                            } else if (certificateFiles.length === 1) {
                                caCertificate = await fs.readFile(certificateFiles[0], 'utf8');
                                requestOptions.httpsAgent = new https.Agent({ca: caCertificate});
                            }
                        }
                        if (!caCertificate) {
                                requestOptions.httpsAgent = new https.Agent({rejectUnauthorized: false});
                            }
                            response = await Axios.get(api, requestOptions);

                        } else {
                            throw error;
                        }
                    }

                    const data: any = response.data;
                    const filteredData: FabricNode[] = data.filter((_data: any) => _data.api_url)
                        .map((_data: any) => {
                                if (_data.tls_cert) {
                                    _data.pem = _data.tls_cert;
                                    delete _data.tls_cert;
                                }

                                _data.name = _data.display_name;
                                delete _data.display_name;
                                return FabricNode.pruneNode(_data);
                            }
                        );

                let chosenNodes: IBlockchainQuickPickItem<FabricNode>[];
                chosenNodes = await UserInputUtil.showNodesQuickPickBox(`Which nodes would you like to ${methodMessageString}?`, filteredData, true, oldNodes, informOfChanges) as IBlockchainQuickPickItem<FabricNode>[];

                    if (!chosenNodes || chosenNodes.length === 0) {
                    return true;
                    } else if (!Array.isArray(chosenNodes)) {
                        chosenNodes = [chosenNodes];
                    }

                    const chosenNodesNames: string[] = chosenNodes.map((_chosenNode: IBlockchainQuickPickItem<FabricNode>) => {
                        return _chosenNode.label;
                    });

                    filteredData.forEach((node: FabricNode) => {
                        if (node.type === FabricNodeType.ORDERER && node.cluster_name) {
                            node.hidden = chosenNodesNames.indexOf(node.cluster_name) === -1;
                        } else if (chosenNodesNames.indexOf(node.name) === -1) {
                            node.hidden = true;
                        }
                    });
                    nodesToUpdate.push(...filteredData);
                } catch (error) {
                outputAdapter.log(LogType.ERROR, `Failed to acquire nodes from ${environmentRegistryEntry.url}, with error ${error.message}`, `Failed to acquire nodes from ${environmentRegistryEntry.url}, with error ${error.toString()}`);
                        throw error;
                    }
                }

            nodesToUpdate.forEach((node: FabricNode) => {
                if (node.hidden === undefined) {
                    node.hidden = false;
                }
            });

            const environmentNodesPath: string = path.join(environmentBaseDir, 'nodes');
            await fs.ensureDir(environmentNodesPath);

            for (const node of nodesToUpdate) {
                try {
                const alreadyExists: boolean = oldNodes.some((_node: FabricNode) => _node.name === node.name && ( _node.hidden === false || _node.hidden === undefined ));
                    if (alreadyExists && createMethod === UserInputUtil.ADD_ENVIRONMENT_FROM_NODES) {
                        throw new Error(`Node with name ${node.name} already exists`);
                    }
                    FabricNode.validateNode(node);
                await environment.updateNode(node, createMethod === UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);
                } catch (error) {
                    addedAllNodes = false;
                    if (!node.name) {
                    outputAdapter.log(LogType.ERROR, `Error ${methodMessageString}ing node: ${error.message}`, `Error ${methodMessageString}ing node: ${error.toString()}`);
                    } else {
                    outputAdapter.log(LogType.ERROR, `Error ${methodMessageString}ing node ${node.name}: ${error.message}`, `Error ${methodMessageString}ing node ${node.name}: ${error.toString()}`);
                    }
                }
            }

            // check if any nodes were added
            const newEnvironment: FabricEnvironment = EnvironmentFactory.getEnvironment(environmentRegistryEntry);
            const newNodes: FabricNode[] = await newEnvironment.getNodes();
            if (newNodes.length === oldNodes.length && createMethod !== UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS) {
                throw new Error('no nodes were added');
            }

            if (addedAllNodes) {
            outputAdapter.log(LogType.SUCCESS, `Successfully ${methodMessageString}ed all nodes`);
            } else {
            outputAdapter.log(LogType.WARNING, `Finished ${methodMessageString}ing nodes but some nodes could not be ${methodMessageString}ed`);
            }

            const connectedRegistryEntry: FabricEnvironmentRegistryEntry = FabricEnvironmentManager.instance().getEnvironmentRegistryEntry();
            if (connectedRegistryEntry && connectedRegistryEntry.name === environmentRegistryEntry.name && !informOfChanges) {
                // only do this if we run the command if we are connected to the one we are updating
                await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);
            }

            return addedAllNodes;

    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Error ${methodMessageString}ing nodes: ${error.message}`);
            if (fromAddEnvironment) {
                throw error;
            }
        }
    }
