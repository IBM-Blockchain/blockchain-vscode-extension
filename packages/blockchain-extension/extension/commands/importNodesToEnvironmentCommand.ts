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
import * as https from 'https';
import * as path from 'path';
import { FabricEnvironmentRegistryEntry, FabricNode, LogType, FabricEnvironment, FabricNodeType, FabricEnvironmentRegistry, EnvironmentType, EnvironmentFlags} from 'ibm-blockchain-platform-common';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricEnvironmentManager } from '../fabric/environments/FabricEnvironmentManager';
import { EnvironmentFactory } from '../fabric/environments/EnvironmentFactory';
import Axios from 'axios';
import { ModuleUtil } from '../util/ModuleUtil';
import { ExtensionsInteractionUtil } from '../util/ExtensionsInteractionUtil';

export async function importNodesToEnvironment(environmentRegistryEntry: FabricEnvironmentRegistryEntry, fromAddEnvironment: boolean = false, createMethod?: string, informOfChanges: boolean = false, showSuccess: boolean = true, fromConnectEnvironment: boolean = false): Promise<boolean> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    const methodMessageString: string = createMethod !== UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS ? 'import' : 'filter';
    if (showSuccess) {
        if (createMethod === UserInputUtil.ADD_ENVIRONMENT_FROM_NODES) {
            outputAdapter.log(LogType.INFO, undefined, 'Import nodes to environment');
        } else {
            outputAdapter.log(LogType.INFO, undefined, 'Edit node filters');
        }
    }

    try {

        let justUpdate: boolean = false;

        let chosenEnvironment: IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>;
        if (!environmentRegistryEntry) {
            if (createMethod === UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS) {
                chosenEnvironment = await UserInputUtil.showFabricEnvironmentQuickPickBox('Choose an OpsTool environment to filter nodes', false, true, [EnvironmentFlags.OPS_TOOLS]) as IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>;
            } else {
                chosenEnvironment = await UserInputUtil.showFabricEnvironmentQuickPickBox('Choose an environment to import nodes to', false, true, [], [EnvironmentFlags.OPS_TOOLS, EnvironmentFlags.ANSIBLE]) as IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>;
            }

            if (!chosenEnvironment) {
                return;
            }

            environmentRegistryEntry = chosenEnvironment.data;
        }

        const connectedRegistryEntry: FabricEnvironmentRegistryEntry = FabricEnvironmentManager.instance().getEnvironmentRegistryEntry();

        // need to stop it refreshing if we are editting the one we are connected to
        if (connectedRegistryEntry && connectedRegistryEntry.name === environmentRegistryEntry.name) {
            FabricEnvironmentManager.instance().stopEnvironmentRefresh();
        }

        if (!fromAddEnvironment) {
            if (environmentRegistryEntry.environmentType && (environmentRegistryEntry.environmentType === EnvironmentType.OPS_TOOLS_ENVIRONMENT || environmentRegistryEntry.environmentType === EnvironmentType.SAAS_OPS_TOOLS_ENVIRONMENT)) {
                createMethod = UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS;
            } else {
                createMethod = UserInputUtil.ADD_ENVIRONMENT_FROM_NODES;
            }
        }

        const environment: FabricEnvironment = EnvironmentFactory.getEnvironment(environmentRegistryEntry);
        const environmentBaseDir: string = path.resolve(environment.getPath());
        const allNodes: FabricNode[] = await environment.getNodes(false, true);
        const oldNodes: FabricNode[] = allNodes.filter((_node: FabricNode) => !_node.hidden);

        const nodesToUpdate: FabricNode[] = [];
        let nodesToDelete: FabricNode[] = [];

        let addedAllNodes: boolean = true;
        if (createMethod === UserInputUtil.ADD_ENVIRONMENT_FROM_NODES) {
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

                    for (const node of nodes) {
                        if (node.display_name) {
                            node.name = node.display_name;
                            delete node.display_name;
                        }

                        if (node.type === 'fabric-ca') {
                            if (node.tls_cert) {
                                node.pem = node.tls_cert;
                                delete node.tls_cert;
                            }
                        } else {
                            if (node.tls_ca_root_cert) {
                                node.pem = node.tls_ca_root_cert;
                                delete node.tls_ca_root_cert;
                            }
                        }
                    }

                    nodesToUpdate.push(...nodes);
                } catch (error) {
                    addedAllNodes = false;
                    outputAdapter.log(LogType.ERROR, `Error importing node file ${nodeUri.fsPath}: ${error.message}`, `Error importing node file ${nodeUri.fsPath}: ${error.toString()}`);
                }
            }
        } else {
            const GET_ALL_COMPONENTS: string = '/ak/api/v1/components';
            const api: string = environmentRegistryEntry.url.replace(/\/$/, '') + GET_ALL_COMPONENTS;
            let response: any;
            let requestOptions: any;

            // establish connection to Ops Tools
            try {
                if (environmentRegistryEntry.environmentType === EnvironmentType.SAAS_OPS_TOOLS_ENVIRONMENT) {
                    const accessToken: string = await ExtensionsInteractionUtil.cloudAccountGetAccessToken();
                    if (!accessToken) {
                        if (fromConnectEnvironment) {
                            throw new Error('User must be logged in to an IBM Cloud account');
                        }
                        return;
                    }
                    requestOptions = { headers: { Authorization: `Bearer ${accessToken}` } };
                } else {
                    const keytar: any = ModuleUtil.getCoreNodeModule('keytar');
                    if (!keytar) {
                        throw new Error('Error importing the keytar module');
                    }

                    const credentials: string = await keytar.getPassword('blockchain-vscode-ext', environmentRegistryEntry.url);
                    const credentialsArray: string[] = credentials.split(':'); // 'API key or User ID' : 'API secret or password' : rejectUnauthorized
                    if (credentialsArray.length !== 3) {
                        throw new Error(`Unable to retrieve the stored credentials`);
                    }
                    const userAuth1: string = credentialsArray[0];
                    const userAuth2: string = credentialsArray[1];
                    const rejectUnauthorized: boolean = credentialsArray[2] === 'true';
                    requestOptions = {
                        headers: { 'Content-Type': 'application/json' },
                        auth: { username: userAuth1, password: userAuth2 }
                    };
                    requestOptions.httpsAgent = new https.Agent({rejectUnauthorized: rejectUnauthorized});
                }

                // retrieve json file
                response = await Axios.get(api, requestOptions);

                // process node data
                const data: any = response.data;
                let filteredData: FabricNode[] = [];

                if (data && data.length > 0) {
                    filteredData = data.filter((_data: any) => _data.api_url)
                        .map((_data: any) => {
                            _data.name = _data.display_name;
                            delete _data.display_name;

                            if (_data.tls_cert) {
                                _data.pem = _data.tls_cert;
                                delete _data.tls_cert;
                            }

                            if (_data.type !== 'fabric-ca') {
                                if (_data.tls_ca_root_cert) {
                                    _data.pem = _data.tls_ca_root_cert;
                                    delete _data.tls_ca_root_cert;
                                }
                            }

                            return FabricNode.pruneNode(_data);
                        });

                    let chosenNodes: IBlockchainQuickPickItem<FabricNode>[];
                    chosenNodes = await UserInputUtil.showNodesQuickPickBox('Edit filters: Which nodes would you like to include?', filteredData, true, allNodes, informOfChanges) as IBlockchainQuickPickItem<FabricNode>[];

                    let chosenNodesNames: string[] = [];
                    let chosenNodesUrls: string[] = [];
                    if (chosenNodes === undefined) {
                        if (fromAddEnvironment) {
                            return;
                        }
                        justUpdate = true;
                        chosenNodesNames = oldNodes.map((_node: FabricNode) => _node.type === FabricNodeType.ORDERER && _node.cluster_name ? _node.cluster_name : _node.name);
                        chosenNodesUrls = oldNodes.map((_node: FabricNode) => _node.api_url);
                    } else {
                        if (!Array.isArray(chosenNodes)) {
                            chosenNodes = [chosenNodes];
                        }
                        if (chosenNodes.length > 0) {
                            chosenNodesNames = chosenNodes.map((_chosenNode: IBlockchainQuickPickItem<FabricNode>) => _chosenNode.label);
                            chosenNodesUrls = chosenNodes.map((_chosenNode: IBlockchainQuickPickItem<FabricNode>) => _chosenNode.data.api_url);
                        }
                    }
                    filteredData.forEach((node: FabricNode) => {
                        if (node.type === FabricNodeType.ORDERER && node.cluster_name) {
                            node.hidden = chosenNodesNames.indexOf(node.cluster_name) === -1;
                        } else if (chosenNodesUrls.indexOf(node.api_url) === -1) {
                            node.hidden = true;
                        }
                    });
                }

                if (allNodes.length > 0) {
                    const filteredNodesUrls: string[] = filteredData.map((_node: FabricNode) => _node.api_url);
                    nodesToDelete = allNodes.filter((_node: FabricNode) => filteredNodesUrls.indexOf(_node.api_url) === -1);
                }

                nodesToUpdate.push(...filteredData);
            } catch (error) {
                if (fromConnectEnvironment) {
                    const newError: Error = new Error(`Nodes in ${environmentRegistryEntry.name} might be out of date. Unable to connect to the IBM Blockchain Platform Console with error: ${error.message}`);
                    outputAdapter.log(LogType.ERROR, undefined, error.toString());
                    outputAdapter.log(LogType.WARNING, newError.message, newError.toString());
                    throw newError;
                } else {
                    outputAdapter.log(LogType.ERROR, `Failed to acquire nodes from ${environmentRegistryEntry.url}, with error ${error.message}`, `Failed to acquire nodes from ${environmentRegistryEntry.url}, with error ${error.toString()}`);
                    throw error;
                }
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
                const alreadyExists: boolean = oldNodes.some((_node: FabricNode) => _node.name === node.name);
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

        if (createMethod === UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS && (nodesToDelete.length > 0 || nodesToUpdate.length === 0)) {
            for (const node of nodesToDelete) {
                try {
                    await vscode.commands.executeCommand(ExtensionCommands.DELETE_NODE, node, false);
                } catch (error) {
                    if (!node.name) {
                        outputAdapter.log(LogType.ERROR, `Error deleting node: ${error.message}`, `Error deleting node: ${error.toString()}`);
                    } else {
                        outputAdapter.log(LogType.ERROR, `Error deletinging node ${node.name}: ${error.message}`, `Error deleting node ${node.name}: ${error.toString()}`);
                    }
                }
            }
            if (nodesToUpdate.length === 0 && !fromAddEnvironment) {
                const deleteEnvironment: boolean = await UserInputUtil.showConfirmationWarningMessage(`There are no nodes in ${environment.getName()}. Do you want to delete this environment?`);
                if (deleteEnvironment) {
                    await vscode.commands.executeCommand(ExtensionCommands.DELETE_ENVIRONMENT, environmentRegistryEntry, true);
                }
            } else if (nodesToUpdate.length === 0) {
                const addEnvironment: string = await UserInputUtil.showQuickPickYesNo(`There are no nodes in ${environment.getName()}. Do you still want to add this environment?`);
                if (addEnvironment !== UserInputUtil.YES) {
                    return;
                }
            }
            const currentEnvironents: Array<FabricEnvironmentRegistryEntry> = await FabricEnvironmentRegistry.instance().getAll([], [EnvironmentFlags.LOCAL]);
            const stillExists: boolean = currentEnvironents.some((_env: FabricEnvironmentRegistryEntry) => _env.name === environment.getName());
            if (!stillExists) {
                return;
            }
        }

        // check if any nodes were added
        const newEnvironment: FabricEnvironment = EnvironmentFactory.getEnvironment(environmentRegistryEntry);
        const newNodes: FabricNode[] = await newEnvironment.getNodes();
        if (newNodes.length === oldNodes.length && createMethod === UserInputUtil.ADD_ENVIRONMENT_FROM_NODES) {
            throw new Error('no nodes were added');
        }
        if (justUpdate) {
            return;
        } else if (addedAllNodes) {
            outputAdapter.log(LogType.SUCCESS, `Successfully ${methodMessageString}ed nodes`);
        } else {
            outputAdapter.log(LogType.WARNING, `Finished ${methodMessageString}ing nodes but some nodes could not be ${methodMessageString}ed`);
        }

        if (connectedRegistryEntry && connectedRegistryEntry.name === environmentRegistryEntry.name && !informOfChanges) {
            // only do this if we run the command if we are connected to the one we are updating
            if (newNodes.length > 0) {
                await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);
            } else {
                await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            }
        }

        return addedAllNodes;

    } catch (error) {
        if (fromConnectEnvironment) {
            throw error;
        }
        outputAdapter.log(LogType.ERROR, `Error ${methodMessageString}ing nodes: ${error.message}`);
        if (fromAddEnvironment) {
            throw error;
        }
    }
}
