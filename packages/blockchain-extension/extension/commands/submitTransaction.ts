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
import { IBlockchainQuickPickItem, UserInputUtil } from './UserInputUtil';
import { FabricGatewayConnectionManager } from '../fabric/FabricGatewayConnectionManager';
import { TransactionTreeItem } from '../explorer/model/TransactionTreeItem';
import { Reporter } from '../util/Reporter';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../logging/OutputAdapter';
import { ExtensionCommands } from '../../ExtensionCommands';
import { VSCodeBlockchainDockerOutputAdapter } from '../logging/VSCodeBlockchainDockerOutputAdapter';
import { InstantiatedTreeItem } from '../explorer/model/InstantiatedTreeItem';
import { FabricGatewayRegistryEntry } from '../registries/FabricGatewayRegistryEntry';
import { IFabricGatewayConnection, FabricRuntimeUtil } from 'ibm-blockchain-platform-common';

export async function submitTransaction(evaluate: boolean, treeItem?: InstantiatedTreeItem | TransactionTreeItem, channelName?: string, smartContract?: string, transactionObject?: any): Promise<void | string> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    let action: string;
    let actioning: string;
    let actioned: string;
    if (evaluate) {
        action = 'evaluate';
        actioning = 'evaluating';
        actioned = 'evaluated';
    } else {
        action = 'submit';
        actioning = 'submitting';
        actioned = 'submitted';
    }
    outputAdapter.log(LogType.INFO, undefined, `${action}Transaction`);

    let transactionName: string;
    let namespace: string;
    let args: Array<string> = [];
    let transientData: { [key: string]: Buffer };
    let peerTargetNames: string[] = [];
    let peerTargetMessage: string = '';
    let connection: IFabricGatewayConnection;
    let errorMessage: string;

    if (transactionObject) {
        channelName = transactionObject.channelName;
        smartContract = transactionObject.smartContract;
        transactionName = transactionObject.transactionName;
        namespace = transactionObject.namespace;
    } else if (treeItem instanceof TransactionTreeItem) {
        smartContract = treeItem.chaincodeName;
        transactionName = treeItem.name;
        channelName = treeItem.channelName;
        namespace = treeItem.contractName;
    } else {
        if (!treeItem && !channelName && !smartContract) {
            if (!FabricGatewayConnectionManager.instance().getConnection()) {
                await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_GATEWAY);
                if (!FabricGatewayConnectionManager.instance().getConnection()) {
                    // either the user cancelled or there was an error so don't carry on
                    return;
                }
            }

            const chosenSmartContract: IBlockchainQuickPickItem<{ name: string, channel: string, version: string }> = await UserInputUtil.showClientInstantiatedSmartContractsQuickPick(`Choose a smart contract to ${action} a transaction from`, null);
            if (!chosenSmartContract) {
                return;
            }

            channelName = chosenSmartContract.data.channel;
            smartContract = chosenSmartContract.data.name;
        } else if (treeItem instanceof InstantiatedTreeItem) {
            channelName = treeItem.channels[0].label;
            smartContract = treeItem.name;
        }

        const chosenTransaction: IBlockchainQuickPickItem<{ name: string, contract: string }> = await UserInputUtil.showTransactionQuickPick(`Choose a transaction to ${action}`, smartContract, channelName);
        if (!chosenTransaction) {
            return;
        } else {
            transactionName = chosenTransaction.data.name;
            namespace = chosenTransaction.data.contract;
        }
    }

    let argsString: string;
    if (transactionObject) {
        argsString = transactionObject.args;
    } else {
        argsString = await UserInputUtil.showInputBox('optional: What are the arguments to the transaction, (e.g. ["arg1", "arg2"])', '[]');
    }

    if (argsString === undefined) {
        return;
    } else if (argsString === '') {
        args = [];
    } else {
        try {
            if (!argsString.startsWith('[') || !argsString.endsWith(']')) {
                throw new Error('transaction arguments should be in the format ["arg1", {"key" : "value"}]');
            }
            args = JSON.parse(argsString);
        } catch (error) {
            errorMessage = `Error with transaction arguments: ${error.message}`;
            outputAdapter.log(LogType.ERROR, errorMessage);
            return transactionObject ? errorMessage : undefined;
        }
    }

    try {

        let transientDataString: string;
        if (transactionObject) {
            transientDataString = transactionObject.transientData;
        } else {
            transientDataString = await UserInputUtil.showInputBox('optional: What is the transient data for the transaction, e.g. {"key": "value"}', '{}');
        }

        if (transientDataString === undefined) {
            return;
        } else if (transientDataString !== '' && transientDataString !== '{}') {
            if (!transientDataString.startsWith('{') || !transientDataString.endsWith('}')) {
                throw new Error('transient data should be in the format {"key": "value"}');
            }
            transientData = JSON.parse(transientDataString);
            const keys: Array<string> = Array.from(Object.keys(transientData));

            keys.forEach((key: string) => {
                transientData[key] = Buffer.from(transientData[key]);
            });
        }
    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Error with transaction transient data: ${error.message}`);
        return;
    }

    connection = FabricGatewayConnectionManager.instance().getConnection();
    const channelPeerInfo: {name: string, mspID: string}[] = await connection.getChannelPeersInfo(channelName);

    let selectPeers: string;

    if (transactionObject) {
        peerTargetNames = transactionObject.peerTargetNames;
        peerTargetMessage = '';
    } else {
        if (channelPeerInfo.length === 0) {
            outputAdapter.log(LogType.ERROR, `No channel peers available to target`);
            return;
        } else if (channelPeerInfo.length === 1) {
            selectPeers = UserInputUtil.DEFAULT;
        } else {
            selectPeers = await UserInputUtil.showQuickPick('Select a peer-targeting policy for this transaction', [UserInputUtil.DEFAULT, UserInputUtil.CUSTOM]) as string;
        }

        if (!selectPeers) {
            return;
        } else if (selectPeers === UserInputUtil.CUSTOM) {

            const peerTargets: Array<IBlockchainQuickPickItem<string>> = await UserInputUtil.showChannelPeersQuickPick(channelPeerInfo) as Array<IBlockchainQuickPickItem<string>>;

            if (!peerTargets || peerTargets.length === 0) {
                return;
            } else {
                peerTargetNames = peerTargets.map((peer: IBlockchainQuickPickItem<string>) => {
                    return peer.data;
                });

                peerTargetMessage = ` to peers ${peerTargetNames}`;
            }
        }
    }

    return await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'IBM Blockchain Platform Extension',
        cancellable: false
    }, async (progress: vscode.Progress<{ message: string }>) => {

        try {
            progress.report({ message: `${actioning} transaction ${transactionName}` });
            if (args.length === 0) {
                outputAdapter.log(LogType.INFO, undefined, `${actioning} transaction ${transactionName} with no args on channel ${channelName}${peerTargetMessage}`);
            } else {
                outputAdapter.log(LogType.INFO, undefined, `${actioning} transaction ${transactionName} with args ${args} on channel ${channelName}${peerTargetMessage}`);
            }

            const gatewayRegistyrEntry: FabricGatewayRegistryEntry = FabricGatewayConnectionManager.instance().getGatewayRegistryEntry();
            if (gatewayRegistyrEntry.name === FabricRuntimeUtil.LOCAL_FABRIC) {
                VSCodeBlockchainDockerOutputAdapter.instance().show();
            }

            let result: string | undefined;
            if (evaluate) {
                result = await connection.submitTransaction(smartContract, transactionName, channelName, args, namespace, transientData, true, peerTargetNames);

            } else {
                result = await connection.submitTransaction(smartContract, transactionName, channelName, args, namespace, transientData, false, peerTargetNames);
            }

            Reporter.instance().sendTelemetryEvent(`${action} transaction`);

            let message: string;
            if (result === undefined) {
                message = `No value returned from ${transactionName}`;
            } else {
                message = `Returned value from ${transactionName}: ${result}`;
            }
            outputAdapter.log(LogType.SUCCESS, `Successfully ${actioned} transaction`, message);

            outputAdapter.show(); // Bring the 'Blockchain' output channel into focus.

            if (transactionObject) {
                return message;
            }

        } catch (error) {
            errorMessage = `Error ${actioning} transaction: ${error.message}`;
            outputAdapter.log(LogType.ERROR, errorMessage);
            if (error.endorsements) {
                for (const endorsement of error.endorsements) {
                    const endorsementError: string = `Endorsement failed with: ${endorsement.message}`;
                    outputAdapter.log(LogType.ERROR, endorsementError);
                    errorMessage += `\n${endorsementError}`;
                }
            }
            if (transactionObject) {
                return errorMessage;
            }
        }
    });
}
