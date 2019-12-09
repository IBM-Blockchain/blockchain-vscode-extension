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
import * as https from 'https';
import * as path from 'path';
import { FabricNode, FabricNodeType } from '../fabric/FabricNode';
import { FabricEnvironment } from '../fabric/FabricEnvironment';
import { ExtensionCommands } from '../../ExtensionCommands';
import Axios from 'axios';
import { ExtensionUtil } from '../util/ExtensionUtil';

export async function importNodesToEnvironment(environmentRegistryEntry: FabricEnvironmentRegistryEntry, fromAddEnvironment: boolean = false, createMethod?: string): Promise<boolean> {
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

        if (!fromAddEnvironment) {
            if (environmentRegistryEntry.url) {
                createMethod = UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS;
            } else {
                createMethod = UserInputUtil.ADD_ENVIRONMENT_FROM_NODES;
            }
        }

        const environment: FabricEnvironment = new FabricEnvironment(environmentRegistryEntry.name);
        const environmentBaseDir: string = path.resolve(environment.getPath());

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
        } else {
            const keytar: any = getCoreNodeModule('keytar');
            if (!keytar) {
                throw new Error('Error importing the keytar module');
            }

            const GET_ALL_COMPONENTS: string = '/ak/api/v1/components';
            const url: string = await UserInputUtil.showInputBox('Enter the url of the ops tools you want to connect to');
            if (!url) {
                return;
            }
            const apiKey: string = await UserInputUtil.showInputBox('Enter the api key of the ops tools you want to connect to');
            if (!apiKey) {
                return;
            }
            const apiSecret: string = await UserInputUtil.showInputBox('Enter the api secret of the ops tools you want to connect to');
            if (!apiSecret) {
                return;
            }

            const api: string = url.replace(/\/$/, '') + GET_ALL_COMPONENTS;
            let response: any;
            const requestOptions: any = {
                headers: { 'Content-Type': 'application/json' },
                auth: { username: apiKey, password: apiSecret }
            };
            try {
                try {
                    response = await Axios.get(api, requestOptions);
                } catch (error) {
                    // This needs to be fixed - exactly what codes can we get that will require this behaviour?
                    if (error.code === 'DEPTH_ZERO_SELF_SIGNED_CERT') {
                        let caCertificate: string;
                        let certificatePath: vscode.Uri;
                        const certificateUsage: string = await UserInputUtil.showQuickPick('Unable to perform certificate verification. Please choose how to proceed', [UserInputUtil.ADD_CA_CERT_CHAIN, UserInputUtil.CONNECT_NO_CA_CERT_CHAIN]) as string;
                        if (!certificateUsage) {
                            return;
                        } else if (certificateUsage === UserInputUtil.ADD_CA_CERT_CHAIN) {
                            const quickPickItems: string[] = [UserInputUtil.BROWSE_LABEL];
                            const browseOptions: vscode.OpenDialogOptions = {
                                canSelectFiles: true,
                                canSelectFolders: false,
                                canSelectMany: false,
                                openLabel: 'Select',
                                filters: {
                                    Certificates: ['pem']
                                }
                            };
                            certificatePath = await UserInputUtil.browse('Select CA certificate chain (.pem) file', quickPickItems, browseOptions, true) as vscode.Uri;
                            if (certificatePath === undefined) {
                                return;
                            } else if (Array.isArray(certificatePath)) {
                                certificatePath = certificatePath[0];
                            }
                            caCertificate = await fs.readFile(certificatePath.fsPath, 'utf8');
                            requestOptions.httpsAgent = new https.Agent({ ca: caCertificate });
                        } else {
                            requestOptions.httpsAgent = new https.Agent({ rejectUnauthorized: false });
                        }
                        response = await Axios.get(api, requestOptions);

                        try {
                            await keytar.setPassword('blockchain-vscode-ext', url, `${apiKey}:${apiSecret}`);
                            if (caCertificate) {
                                await fs.ensureDir(environmentBaseDir);
                                const separator: string = process.platform === 'win32' ? '\\' : '/';
                                const caCertificateCopy: string = path.join(environmentBaseDir, certificatePath.fsPath.split(separator).pop());
                                await fs.copy(certificatePath.fsPath, caCertificateCopy, { overwrite: true });
                            }
                        } catch (error) {
                            throw new Error(`Unable to store the required credentials: ${error.message}`);
                        }
                    } else {
                        throw error;
                    }
                }

                environmentRegistryEntry.url = url;

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

                // Ask user to chose which nodes to add to the environemnt.
                let chosenNodes: IBlockchainQuickPickItem<FabricNode>[] = await UserInputUtil.showNodesQuickPickBox('Which nodes would you like to import?', filteredData, true) as IBlockchainQuickPickItem<FabricNode>[];
                if (!chosenNodes || chosenNodes.length === 0) {
                    return;
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
                outputAdapter.log(LogType.ERROR, `Failed to acquire nodes from ${url}, with error ${error.message}`, `Failed to acquire nodes from ${url}, with error ${error.toString()}`);
                if (fromAddEnvironment) {
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

        const oldNodes: FabricNode[] = await environment.getNodes();
        for (const node of nodesToUpdate) {
            try {
                const alreadyExists: boolean = oldNodes.some((_node: FabricNode) => _node.name === node.name);
                if (alreadyExists && createMethod === UserInputUtil.ADD_ENVIRONMENT_FROM_NODES) {
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

        const newEnvironment: FabricEnvironment = new FabricEnvironment(environmentRegistryEntry.name);
        const newNodes: FabricNode[] = await newEnvironment.getNodes();
        if (newNodes.length === oldNodes.length) {
            throw new Error('no nodes were added');
        }

        if (addedAllNodes) {
            outputAdapter.log(LogType.SUCCESS, 'Successfully imported all nodes');
        } else {
            outputAdapter.log(LogType.WARNING, 'Finished importing nodes but some nodes could not be added');
        }

        if (!fromAddEnvironment && environmentRegistryEntry) {
            // only do this if we run the command from the tree as need to refresh the tree to do setup
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

function getCoreNodeModule(moduleName: string): any {
    try {
      return ExtensionUtil.getModuleAsar(moduleName);
    } catch (err) {
        // do nothing
    }
    try {
      return ExtensionUtil.getModule(moduleName);
    } catch (err) {
        // do nothing
    }
    return undefined;
  }
