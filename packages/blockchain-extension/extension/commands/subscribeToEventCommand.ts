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
import { IBlockchainQuickPickItem, UserInputUtil } from './UserInputUtil';
import { LogType, IFabricGatewayConnection } from 'ibm-blockchain-platform-common';
import { InstantiatedTreeItem } from '../explorer/model/InstantiatedTreeItem';
import { ContractTreeItem } from '../explorer/model/ContractTreeItem';
import { FabricGatewayConnectionManager } from '../fabric/FabricGatewayConnectionManager';
import { ExtensionCommands } from '../../ExtensionCommands';

export async function subscribeToEvent(chaincode?: InstantiatedTreeItem | ContractTreeItem): Promise<any> {
    let chosenChaincode: IBlockchainQuickPickItem<{ name: string, channel: string, version: string }>;
    let chaincodeName: string;
    let chaincodeLabel: string;
    let channelName: string;
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, 'subscribeToEventCommand');

    // ask for gateway and smart contract if called from command palette
    if (!chaincode) {
        if (!FabricGatewayConnectionManager.instance().getConnection()) {
            // connect if not already connected
            await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_GATEWAY);
            if (!FabricGatewayConnectionManager.instance().getConnection()) {
                // either the user cancelled or there was an error so don't carry on
                return;
            }
        }
        chosenChaincode = await UserInputUtil.showClientInstantiatedSmartContractsQuickPick('Choose the smart contract you want to subscribe to events from');
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
            chaincodeLabel = chaincode.label;
            chaincodeName = chaincode.name;
            channelName = chaincode.channels[0].label;
        }
    }

    const eventName: string = await UserInputUtil.showInputBox('Enter the name of the event in your smart contract you want to subscribe to - use regular expressions to specifiy multiple events');
    if (!eventName) {
        return;
    }

    const connection: IFabricGatewayConnection = FabricGatewayConnectionManager.instance().getConnection();

    try {
        await connection.addContractListener(channelName, chaincodeName, eventName, outputAdapter);
        outputAdapter.log(LogType.SUCCESS, `Successfully subscribed to ${eventName} events emitted from ${chaincodeLabel}`);
    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Unable to subscribe to ${eventName} events emitted from ${chaincodeLabel}: ${error.message}`, `Unable to subscribe to ${eventName} events emitted from ${chaincodeLabel}: ${error.toString()}`);
    }
}
