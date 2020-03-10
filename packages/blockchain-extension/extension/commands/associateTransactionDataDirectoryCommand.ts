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
import * as path from 'path';
import * as fs from 'fs-extra';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { FabricGatewayRegistryEntry, FabricGatewayRegistry } from 'ibm-blockchain-platform-common';
import { IBlockchainQuickPickItem, UserInputUtil } from './UserInputUtil';
import { LogType } from 'ibm-blockchain-platform-common';
import { InstantiatedTreeItem } from '../explorer/model/InstantiatedTreeItem';
import { ContractTreeItem } from '../explorer/model/ContractTreeItem';
import { FabricGatewayConnectionManager } from '../fabric/FabricGatewayConnectionManager';
import { ExtensionCommands } from '../../ExtensionCommands';

export async function associateTransactionDataDirectory(chaincode?: InstantiatedTreeItem | ContractTreeItem): Promise<any> {
    let gateway: FabricGatewayRegistryEntry;
    let chosenChaincode: IBlockchainQuickPickItem<{ name: string, channel: string, version: string }>;
    let chaincodeName: string;
    let chaincodeLabel: string;
    let channelName: string;
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, 'associateTestDataDirectory');

    // If called from the command palette, ask for instantiated smart contract to associate
    if (!chaincode) {
        if (!FabricGatewayConnectionManager.instance().getConnection()) {
            // Connect if not already connected
            await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_GATEWAY);
            if (!FabricGatewayConnectionManager.instance().getConnection()) {
                // either the user cancelled or there was an error so don't carry on
                return;
            }
        }

        // Ask for instantiated smart contract
        chosenChaincode = await UserInputUtil.showClientInstantiatedSmartContractsQuickPick('Please choose an instantiated smart contract to associate a transaction data directory with');
        if (!chosenChaincode) {
            return;
        }
        chaincodeLabel = chosenChaincode.label;
        chaincodeName = chosenChaincode.data.name;
        channelName = chosenChaincode.data.channel;
    } else {
        if (chaincode instanceof ContractTreeItem) {
            chaincodeLabel = chaincode.instantiatedChaincode.label;
            chaincodeName = chaincode.instantiatedChaincode.name;
            channelName = chaincode.channelName;
        } else {
            // Smart Contract selected from the tree item, so assign label and name
            chaincodeLabel = chaincode.label;
            chaincodeName = chaincode.name;
            channelName = chaincode.channels[0].label;
        }
    }

    gateway = await FabricGatewayConnectionManager.instance().getGatewayRegistryEntry();

    const quickPickItems: IBlockchainQuickPickItem<string>[] = [];
    const workspaceFolders: Array<vscode.WorkspaceFolder> = UserInputUtil.getWorkspaceFolders();
    for (const folder of workspaceFolders) {
        const txnDataPath: string = path.join(folder.uri.path, 'transaction_data');
        if (fs.existsSync(txnDataPath)) {
            quickPickItems.push({
                label: `Transaction data directory for ${folder.name}`,
                description: txnDataPath,
                data: txnDataPath
            });
        }
    }
    quickPickItems.push({label: UserInputUtil.BROWSE_LABEL, data: '', description: ''});
    const openDialogOptions: vscode.OpenDialogOptions = {
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: 'Select',
        filters: undefined
    };

    const chosenDirectory: string  | IBlockchainQuickPickItem<string> = await UserInputUtil.browseWithOptions(`Choose a directory to associate with ${chaincodeLabel}`, quickPickItems, openDialogOptions) as string | IBlockchainQuickPickItem<string>;
    if (!chosenDirectory) {
        return;
    } else {
        try {
            const transactionDataPath: string = (typeof chosenDirectory === 'string') ? chosenDirectory : chosenDirectory.description;
            const fabricGatewayRegistry: FabricGatewayRegistry = FabricGatewayRegistry.instance();
            if (!gateway.transactionDataDirectories) {
                gateway.transactionDataDirectories = [];
            }

            // if we already have an association with this chaincode then update it, else add a new one
            const indexToUpdate: number = gateway.transactionDataDirectories.findIndex((item: {chaincodeName: string, transactionDataPath: string}) => {
                return item.chaincodeName === chaincodeName;
            });
            if (indexToUpdate > -1) {
                gateway.transactionDataDirectories[indexToUpdate] = {
                    chaincodeName,
                    channelName,
                    transactionDataPath
                };
            } else {
                gateway.transactionDataDirectories.push({
                    chaincodeName,
                    channelName,
                    transactionDataPath
                });
            }
            await fabricGatewayRegistry.update(gateway);

            outputAdapter.log(LogType.SUCCESS, `Successfully associated the directory "${transactionDataPath}" with "${chaincodeLabel}"`);

        } catch (error) {
            outputAdapter.log(LogType.ERROR, `Unable to associate transaction data directory: ${error.message}`, `Unable to associate transaction data directory: ${error.toString()}`);
        }
    }
}
