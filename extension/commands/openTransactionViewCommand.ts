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
import { FabricConnectionManager } from '../fabric/FabricConnectionManager';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../logging/OutputAdapter';
import { ExtensionCommands } from '../../ExtensionCommands';
import { InstantiatedTreeItem } from '../explorer/model/InstantiatedTreeItem';
import { FabricChaincode } from '../fabric/FabricChaincode';
import { IFabricClientConnection } from '../fabric/IFabricClientConnection';
import { GlobalState } from '../util/GlobalState';

export async function openTransactionView(treeItem?: InstantiatedTreeItem): Promise<void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, `Open Transaction View`);
    let smartContractLabel: string;
    let contract: { name: string, contractInstance: {}, transactions: Array<{}>, info: {} };
    let data: { name: string, version: string, channel: string, label: string, transactions: Array<{}>, namespace: string };

    let connection: IFabricClientConnection = FabricConnectionManager.instance().getConnection();

    if (!connection) {
        await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_GATEWAY);
        connection = FabricConnectionManager.instance().getConnection();
        if (!connection) {
            // either the user cancelled or there was an error so don't carry on
            return;
        }
    }

    if (treeItem) {
        smartContractLabel = treeItem.name + '@' + treeItem.version;
    } else {
        const chosenSmartContract: IBlockchainQuickPickItem<{ name: string, channel: string, version: string }> = await UserInputUtil.showClientInstantiatedSmartContractsQuickPick(`Choose a smart contract`, null);
        if (!chosenSmartContract) {
            return;
        }
        smartContractLabel = chosenSmartContract.data.name + '@' + chosenSmartContract.data.version;
    }

    const channelMap: Map<string, Array<string>> = await connection.createChannelMap();

    const instantiatedChaincodes: Array<{ label: string, channel: string }> = [];

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
            contract = metadataObj.contracts[Object.keys(metadataObj.contracts)[0]];
            data = {
                name: chaincode.name,
                version: chaincode.version,
                channel: thisChannelName,
                label: chaincode.name + '@' + chaincode.version,
                transactions: contract.transactions,
                namespace: contract.name
            };
            instantiatedChaincodes.push(data);
        }
    }

    const appState: {} = {
        smartContracts: instantiatedChaincodes,
        activeSmartContract: instantiatedChaincodes.filter((obj: any) => obj.label === smartContractLabel)[0]
    };

    const context: vscode.ExtensionContext = GlobalState.getExtensionContext();
    const reactView: TransactionView = new TransactionView(context, appState);
    await reactView.openView(true);
}
