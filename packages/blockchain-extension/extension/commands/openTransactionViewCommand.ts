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
import { TransactionView } from '../webview/TransactionView';
import { IBlockchainQuickPickItem, UserInputUtil } from './UserInputUtil';
import { FabricGatewayConnectionManager } from '../fabric/FabricGatewayConnectionManager';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { ExtensionCommands } from '../../ExtensionCommands';
import { InstantiatedTreeItem } from '../explorer/model/InstantiatedTreeItem';
import { IFabricGatewayConnection, FabricChaincode, LogType, FabricGatewayRegistryEntry } from 'ibm-blockchain-platform-common';
import { GlobalState } from '../util/GlobalState';

export async function openTransactionView(treeItem?: InstantiatedTreeItem): Promise<void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, `Open Transaction View`);
    let smartContractLabel: string;
    let contract: { name: string, contractInstance: {}, transactions: Array<{}>, info: {} };
    let data: { name: string, version: string, channel: string, label: string, transactions: Array<{}>, namespace: string };

    let connection: IFabricGatewayConnection = FabricGatewayConnectionManager.instance().getConnection();

    if (!connection) {
        await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_GATEWAY);
        connection = FabricGatewayConnectionManager.instance().getConnection();
        if (!connection) {
            // either the user cancelled or there was an error so don't carry on
            return;
        }
    }

    const gatewayRegistryEntry: FabricGatewayRegistryEntry = await FabricGatewayConnectionManager.instance().getGatewayRegistryEntry();
    const gatewayName: string = gatewayRegistryEntry.name;

    if (treeItem) {
        smartContractLabel = treeItem.name + '@' + treeItem.version;
    } else {
        const chosenSmartContract: IBlockchainQuickPickItem<{ name: string, channel: string, version: string }> = await UserInputUtil.showClientInstantiatedSmartContractsQuickPick(`Choose a smart contract`, null);
        if (!chosenSmartContract) {
            return;
        }
        smartContractLabel = chosenSmartContract.data.name + '@' + chosenSmartContract.data.version;
    }

    const createChannelsResult: {channelMap: Map<string, Array<string>>, v2channels: Array<string>} = await connection.createChannelMap();
    const channelMap: Map<string, Array<string>> = createChannelsResult.channelMap;

    let selectedSmartContract: {label: string, channel: string};

    let metadataObj: any = {
        contracts: {
            '' : {
                name: '',
                transactions: [],
            }
        }
    };

    for (const [thisChannelName] of channelMap) {
        const chaincodes: Array<FabricChaincode> = await connection.getInstantiatedChaincode(thisChannelName); // returns array of objects
        for (const chaincode of chaincodes) {
            metadataObj = await connection.getMetadata(chaincode.name, thisChannelName);
            const contractsObject: any = metadataObj.contracts;
            Object.keys(contractsObject).forEach((key: string) => {
                if (key !== 'org.hyperledger.fabric' && (contractsObject[key].transactions.length > 0)) {
                    if ((chaincode.name + '@' + chaincode.version) === smartContractLabel) {
                        contract = metadataObj.contracts[key];
                        data = {
                            name: chaincode.name,
                            version: chaincode.version,
                            channel: thisChannelName,
                            label: chaincode.name + '@' + chaincode.version,
                            transactions: contract.transactions,
                            namespace: contract.name
                        };
                        selectedSmartContract = data;
                        return;
                    }
                }
            });
        }
    }

    const appState: {gatewayName: string, smartContract: {label: string, channel: string}} = {
        gatewayName,
        smartContract: selectedSmartContract
    };

    const context: vscode.ExtensionContext = GlobalState.getExtensionContext();
    const reactView: TransactionView = new TransactionView(context, appState);
    await reactView.openView(true);
}
