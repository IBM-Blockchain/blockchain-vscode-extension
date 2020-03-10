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
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { FabricGatewayRegistryEntry, FabricGatewayRegistry, LogType } from 'ibm-blockchain-platform-common';
import { IBlockchainQuickPickItem, UserInputUtil } from './UserInputUtil';
import { InstantiatedTreeItem } from '../explorer/model/InstantiatedTreeItem';
import { ContractTreeItem } from '../explorer/model/ContractTreeItem';
import { FabricGatewayConnectionManager } from '../fabric/FabricGatewayConnectionManager';
import { ExtensionCommands } from '../../ExtensionCommands';

export async function dissociateTransactionDataDirectory(chaincode?: InstantiatedTreeItem | ContractTreeItem): Promise<any> {
    let gateway: FabricGatewayRegistryEntry;
    let chosenChaincode: IBlockchainQuickPickItem<{ name: string, channel: string, version: string }>;
    let chaincodeName: string;
    let chaincodeLabel: string;
    let channelName: string;
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, 'dissociateTestDataDirectory');

    // If called from the command palette, ask for instantiated smart contract to test
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
        chosenChaincode = await UserInputUtil.showClientInstantiatedSmartContractsQuickPick('Please choose instantiated smart contract to dissociate a transaction data directory from', undefined, true);
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

    try {
        // Dissociate the transaction data directory by removing the entry from the array
        const fabricGatewayRegistry: FabricGatewayRegistry = FabricGatewayRegistry.instance();

        if (!gateway.transactionDataDirectories) {
            throw new Error(`no transaction data directories associated with ${chaincodeLabel}`);
        }

        const indexToRemove: number = gateway.transactionDataDirectories.findIndex((item: {chaincodeName: string, channelName: string, transactionDataPath: string}) => {
            return item.chaincodeName === chaincodeName && item.channelName === channelName;
        });

        if (indexToRemove === -1) {
            throw new Error(`no transaction data directories associated with ${chaincodeLabel}`);
        }
        gateway.transactionDataDirectories.splice(indexToRemove, 1);
        await fabricGatewayRegistry.update(gateway);

        outputAdapter.log(LogType.SUCCESS, `Successfully dissociated "${chaincodeLabel}" from its transaction data directory`);

    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Unable to dissociate transaction data directory: ${error.message}`, `Unable to dissociate transaction data directory: ${error.toString()}`);
    }
}
