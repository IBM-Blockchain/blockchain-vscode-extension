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
import { IFabricGatewayConnection, FabricSmartContractDefinition, LogType, FabricGatewayRegistryEntry } from 'ibm-blockchain-platform-common';
import { GlobalState } from '../util/GlobalState';
import ITransaction from '../interfaces/ITransaction';
import ISmartContract from '../interfaces/ISmartContract';
import IAssociatedTxData from '../interfaces/IAssociatedTxData';

interface IAppState {
    gatewayName: string;
    smartContracts: ISmartContract[];
    associatedTxdata: IAssociatedTxData;
    preselectedSmartContract: ISmartContract;
    preselectedTransaction: ITransaction;
}

export async function getSmartContracts(connection: IFabricGatewayConnection, smartContractName: string, smartContractVersion?: string): Promise<ISmartContract[]> {
    let contract: { name: string, contractInstance: {}, transactions: ITransaction[], info: {} };
    let data: ISmartContract;
    let smartContracts: ISmartContract[] = [];

    const channelMap: Map<string, Array<string>> = await connection.createChannelMap();

    for (const [thisChannelName] of channelMap) {
        const chaincodes: Array<FabricSmartContractDefinition> = await connection.getInstantiatedChaincode(thisChannelName); // returns array of objects
        const channelPeerInfo: {name: string, mspID: string}[] = await connection.getChannelPeersInfo(thisChannelName);
        const peerNames: string[] = channelPeerInfo.map((peer: {name: string, mspID: string}) => {
            return peer.name;
        });
        for (const chaincode of chaincodes) {
            let metadataObj: any;
            try {
                metadataObj = await connection.getMetadata(chaincode.name, thisChannelName);
            } catch (error) {
                // If unable to get metadata, set contract without namespace.
                if ((chaincode.name === smartContractName) && (!smartContractVersion || chaincode.version === smartContractVersion)) {
                    data = {
                        name: chaincode.name,
                        version: chaincode.version,
                        channel: thisChannelName,
                        label: chaincode.name + '@' + chaincode.version,
                        transactions: [],
                        namespace: undefined,
                        contractName: undefined,
                        peerNames
                    };
                    smartContracts.push(data);
                }
                continue;
            }
            const contractsObject: any = metadataObj.contracts;
            Object.keys(contractsObject).forEach((key: string) => {
                if (key !== 'org.hyperledger.fabric' && (contractsObject[key].transactions.length > 0)) {
                    // Always match name, match version if smartContractVersion is supplied
                    if ((chaincode.name === smartContractName) && (!smartContractVersion || chaincode.version === smartContractVersion)) {
                        contract = metadataObj.contracts[key];
                        data = {
                            name: chaincode.name,
                            version: chaincode.version,
                            channel: thisChannelName,
                            label: chaincode.name + '@' + chaincode.version,
                            transactions: contract.transactions,
                            contractName: contract.name,
                            namespace: contract.name,
                            peerNames,
                        };
                        smartContracts.push(data);
                    }
                }
            });
        }
    }
    return smartContracts;
}

function getPreselectedSmartContract(smartContracts: ISmartContract[], selectedSmartContract: string): ISmartContract {
    if (smartContracts.length === 0 || !selectedSmartContract) {
        return undefined;
    } else if (smartContracts.length === 1) {
        return smartContracts[0];
    }
    return smartContracts.find(({ contractName }) => contractName && contractName === selectedSmartContract);
}

function getPreselectedTransaction(smartContracts: ISmartContract[], selectedTransactionName: string): ITransaction {
    for (const contract of smartContracts) {
        const foundTransaction: ITransaction | undefined = contract.transactions.find(({ name }: { name: string }) => name === selectedTransactionName);
        if (foundTransaction) {
            return foundTransaction;
        }
    }
}

export async function openTransactionView(treeItem?: InstantiatedTreeItem, selectedTransactionName?: string): Promise<IAppState> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, `Open Transaction View`);
    let smartContractName: string;
    let smartContractVersion: string;

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
        smartContractName = treeItem.instantiatedChaincode ? treeItem.instantiatedChaincode.name : treeItem.name;
        smartContractVersion = treeItem.instantiatedChaincode ? treeItem.instantiatedChaincode.version : treeItem.version;
    } else {
        const chosenSmartContract: IBlockchainQuickPickItem<{ name: string, channel: string, version: string }> = await UserInputUtil.showClientInstantiatedSmartContractsQuickPick(`Choose a smart contract`, null);
        if (!chosenSmartContract) {
            return;
        }
        smartContractName = chosenSmartContract.data.name;
        smartContractVersion = chosenSmartContract.data.version;
    }

    const smartContracts: ISmartContract[] = await getSmartContracts(connection, smartContractName, smartContractVersion);

    // If multiple smartContracts use the treeItem.name to set the user selected one
    const preselectedSmartContract: ISmartContract = getPreselectedSmartContract(smartContracts, treeItem && treeItem.name);
    const preselectedTransaction: ITransaction = selectedTransactionName && getPreselectedTransaction(smartContracts, selectedTransactionName);

    const associatedTxdata: IAssociatedTxData = {};
    if (gatewayRegistryEntry && gatewayRegistryEntry.transactionDataDirectories && gatewayRegistryEntry.transactionDataDirectories.length > 0) {
        await Promise.all(gatewayRegistryEntry.transactionDataDirectories.map(async ({ chaincodeName, channelName, transactionDataPath }: { chaincodeName: string, channelName: string, transactionDataPath: string }) => {
            const transactions = await TransactionView.readTxdataFiles(transactionDataPath);
            associatedTxdata[chaincodeName] = {
                channelName,
                transactionDataPath,
                transactions,
            }
        }));
    }

    const appState: IAppState = {
        gatewayName,
        smartContracts,
        preselectedSmartContract,
        preselectedTransaction,
        associatedTxdata,
    };

    const context: vscode.ExtensionContext = GlobalState.getExtensionContext();
    const reactView: TransactionView = new TransactionView(context, appState);
    await reactView.openView(true);
    return appState;
}
