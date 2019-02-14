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

export async function submitTransaction(transactionTreeItem?: TransactionTreeItem): Promise<void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, 'submitTransaction');
    let smartContract: string;
    let transactionName: string;
    let channelName: string;
    let namespace: string;
    if (!transactionTreeItem) {
        if (!FabricConnectionManager.instance().getConnection()) {
            await vscode.commands.executeCommand(ExtensionCommands.CONNECT);
            if (!FabricConnectionManager.instance().getConnection()) {
                // either the user cancelled or ther was an error so don't carry on
                return;
            }
        }

        const chosenSmartContract: IBlockchainQuickPickItem<{ name: string, channel: string, version: string }> = await UserInputUtil.showInstantiatedSmartContractsQuickPick('Choose a smart contract to submit a transaction to', null);
        if (!chosenSmartContract) {
            return;
        }

        channelName = chosenSmartContract.data.channel;
        smartContract = chosenSmartContract.data.name;

        const chosenTransaction: IBlockchainQuickPickItem<{ name: string, contract: string }> = await UserInputUtil.showTransactionQuickPick('Choose a transaction to submit', smartContract, channelName);
        if (!chosenTransaction) {
            return;
        } else {
            transactionName = chosenTransaction.data.name;
            namespace = chosenTransaction.data.contract;
        }
    } else {
        smartContract = transactionTreeItem.chaincodeName;
        transactionName = transactionTreeItem.name;
        channelName = transactionTreeItem.channelName;
        namespace = transactionTreeItem.contractName;
    }

    let args: Array<string> = [];
    const argsString: string = await UserInputUtil.showInputBox('optional: What are the arguments to the function, (comma seperated)');
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
            progress.report({message: `Submitting transaction ${transactionName}`});
            outputAdapter.log(LogType.INFO, undefined, `Submitting transaction ${transactionName} with args ${args}`);
            VSCodeBlockchainDockerOutputAdapter.instance().show();
            await FabricConnectionManager.instance().getConnection().submitTransaction(smartContract, transactionName, channelName, args, namespace);
            Reporter.instance().sendTelemetryEvent('submit transaction');
            outputAdapter.log(LogType.SUCCESS, 'Successfully submitted transaction');
        } catch (error) {
            outputAdapter.log(LogType.ERROR, `Error submitting transaction: ${error.message}`);
        }
    });
}
