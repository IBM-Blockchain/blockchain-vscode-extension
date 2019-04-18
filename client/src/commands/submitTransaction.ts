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
import { FabricConnectionManager } from '../fabric/FabricConnectionManager';
import { TransactionTreeItem } from '../explorer/model/TransactionTreeItem';
import { Reporter } from '../util/Reporter';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../logging/OutputAdapter';
import { ExtensionCommands } from '../../ExtensionCommands';
import { VSCodeBlockchainDockerOutputAdapter } from '../logging/VSCodeBlockchainDockerOutputAdapter';
import { InstantiatedTreeItem } from '../explorer/model/InstantiatedTreeItem';

export async function submitTransaction(evaluate: boolean, treeItem?: InstantiatedTreeItem | TransactionTreeItem): Promise<void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    let action: string;
    let actioning: string;
    if (evaluate) {
        action = 'evaluate';
        actioning = 'evaluating';
    } else {
        action = 'submit';
        actioning = 'submitting';
    }
    outputAdapter.log(LogType.INFO, undefined, `${action}Transaction`);
    let smartContract: string;
    let transactionName: string;
    let channelName: string;
    let namespace: string;
    if (!treeItem) {
        if (!FabricConnectionManager.instance().getConnection()) {
            await vscode.commands.executeCommand(ExtensionCommands.CONNECT);
            if (!FabricConnectionManager.instance().getConnection()) {
                // either the user cancelled or ther was an error so don't carry on
                return;
            }
        }

        const chosenSmartContract: IBlockchainQuickPickItem<{ name: string, channel: string, version: string }> = await UserInputUtil.showClientInstantiatedSmartContractsQuickPick(`Choose a smart contract to ${action} a transaction from`, null);
        if (!chosenSmartContract) {
            return;
        }

        channelName = chosenSmartContract.data.channel;
        smartContract = chosenSmartContract.data.name;

        const chosenTransaction: IBlockchainQuickPickItem<{ name: string, contract: string }> = await UserInputUtil.showTransactionQuickPick(`Choose a transaction to ${action}`, smartContract, channelName);
        if (!chosenTransaction) {
            return;
        } else {
            transactionName = chosenTransaction.data.name;
            namespace = chosenTransaction.data.contract;
        }
    } else if (treeItem instanceof InstantiatedTreeItem) {
        channelName = treeItem.channel.label;
        smartContract = treeItem.name;
        transactionName = await UserInputUtil.showInputBox(`What transaction do you want to ${action}?`);
        if (!transactionName) {
            return;
        }
    } else {
        smartContract = treeItem.chaincodeName;
        transactionName = treeItem.name;
        channelName = treeItem.channelName;
        namespace = treeItem.contractName;
    }

    let args: Array<string> = [];
    const argsString: string = await UserInputUtil.showInputBox('optional: What are the arguments to the transaction, (comma seperated)');
    if (argsString === undefined) {
        return;
    } else if (argsString === '') {
        args = [];
    } else {
        args = argsString.split(','); // If empty, args will be ['']
    }

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'IBM Blockchain Platform Extension',
        cancellable: false
    }, async (progress: vscode.Progress<{ message: string }>) => {

        try {
            progress.report({message: `${actioning} transaction ${transactionName}`});
            outputAdapter.log(LogType.INFO, undefined, `${actioning} transaction ${transactionName} with args ${args}`);
            VSCodeBlockchainDockerOutputAdapter.instance().show();
            let result: string | undefined;
            if (evaluate) {
                result = await FabricConnectionManager.instance().getConnection().submitTransaction(smartContract, transactionName, channelName, args, namespace, true);

            } else {
                result = await FabricConnectionManager.instance().getConnection().submitTransaction(smartContract, transactionName, channelName, args, namespace);
            }

            Reporter.instance().sendTelemetryEvent(`${action} transaction`);

            let message: string;
            if (result === undefined) {
                message = `No value returned from ${transactionName}`;
            } else {
                message = `Returned value from ${transactionName}: ${result}`;
            }
            outputAdapter.log(LogType.SUCCESS, `Successful ${action}Transaction`, message);
            outputAdapter.show(); // Bring the 'Blockchain' output channel into focus.
        } catch (error) {
            outputAdapter.log(LogType.ERROR, `Error ${actioning} transaction: ${error.message}`);
        }
    });
}
