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
/* istanbul ignore file */
'use strict';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';
import { ReactView } from './ReactView';
import { ExtensionCommands } from '../../ExtensionCommands';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { LogType } from 'ibm-blockchain-platform-common';
import ITransaction from '../interfaces/ITransaction';
import ISmartContract from '../interfaces/ISmartContract';
import { ExtensionUtil } from '../util/ExtensionUtil';

interface IAppState {
    gatewayName: string;
    smartContract: ISmartContract;
    associatedTxdata: undefined | { chaincodeName: string, channelName: string, transactionDataPath: string };
    txdataTransactions?: string[];
    preselectedTransaction?: ITransaction;
}
export class TransactionView extends ReactView {
    public static panel: vscode.WebviewPanel;
    public static appState: any;

    static async updateSmartContract(smartContract: ISmartContract): Promise<void> {
        TransactionView.appState.smartContract = smartContract;
        TransactionView.panel.webview.postMessage({
            transactionViewData: {
                ...TransactionView.appState,
                smartContract,
            }
        });
    }

    static closeView(): void {
        TransactionView.panel.dispose();
    }

    protected appState: any;

    constructor(context: vscode.ExtensionContext, appState: any) {
        super(context, 'transactionView', 'Transaction View');
        TransactionView.appState = appState;
    }

    async handleTransactionMessage(message: {command: string, data: any}, panel: vscode.WebviewPanel): Promise<void> {
        const response: string = await vscode.commands.executeCommand(message.command, undefined, undefined, undefined, message.data);
        panel.webview.postMessage({
            transactionOutput: response
        });
    }

    async handleTxdataMessage(message: {command: string, data: any}, panel: vscode.WebviewPanel): Promise<void> {
        const response: {chaincodeName: string, channelName: string, transactionDataPath: string} = await vscode.commands.executeCommand(message.command, undefined, message.data);
        const txdataTransactions: string[] = response !== undefined ? await this.readTxdataFiles(response.transactionDataPath) : [];
        const newAppState: IAppState = {
            gatewayName: TransactionView.appState.gatewayName,
            smartContract: TransactionView.appState.smartContract,
            associatedTxdata: response,
            txdataTransactions
        };

        panel.webview.postMessage({
            transactionViewData: newAppState
        });
    }

    async readTxdataFiles(txdataDirectoryPath: string): Promise<any> {
        const transactionsInFiles: { transactionName: string, transactionLabel: string, txDataFile: string, arguments: [], transientData: { [key: string]: Buffer } }[] = [];

        const allFiles: string[] = await fs.readdir(txdataDirectoryPath);
        const txDataFiles: string[] = allFiles.filter((file: string) => file.endsWith('.txdata'));

        if (txDataFiles.length > 0) {
            for (const file of txDataFiles) {
                const fullpath: string = path.join(txdataDirectoryPath, file);
                try {
                    const fileJson: any = await fs.readJSON(fullpath);
                    fileJson.forEach(({ transactionName, transactionLabel, arguments: args, transientData }: any) => {
                        transactionsInFiles.push({
                            transactionName,
                            transactionLabel,
                            arguments: args,
                            transientData,
                            txDataFile: fullpath,
                        });
                    });
                } catch (error) {
                    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
                    outputAdapter.log(LogType.ERROR, undefined, `Invalid JSON in ${fullpath}.\n${error.toString()}`);
                }
            }
        }
        return transactionsInFiles;
    }

    async openPanelInner(panel: vscode.WebviewPanel): Promise<void> {
        TransactionView.panel = panel;
        panel.onDidDispose(() => {
            TransactionView.panel = undefined;
        });

        const extensionPath: string = ExtensionUtil.getExtensionPath();
        const panelIcon: vscode.Uri = vscode.Uri.file(path.join(extensionPath, 'resources', 'logo.svg'));

        panel.iconPath = panelIcon;

        panel.webview.onDidReceiveMessage(async (message: {command: string, data: any}) => {
            if (message.command === ExtensionCommands.SUBMIT_TRANSACTION || message.command === ExtensionCommands.EVALUATE_TRANSACTION) {
                await this.handleTransactionMessage(message, panel);
            } else if ([ExtensionCommands.ASSOCIATE_TRANSACTION_DATA_DIRECTORY, ExtensionCommands.DISSOCIATE_TRANSACTION_DATA_DIRECTORY].includes(message.command)) {
                await this.handleTxdataMessage(message, panel);
            } else {
                await vscode.commands.executeCommand(message.command, ...message.data);
            }
        });
        await this.loadComponent(panel);
    }

    async loadComponent(panel: vscode.WebviewPanel): Promise<void> {
        if (TransactionView.appState.associatedTxdata !== undefined) {
            TransactionView.appState.txdataTransactions = await this.readTxdataFiles(TransactionView.appState.associatedTxdata.transactionDataPath);
        }

        panel.webview.postMessage({
            path: '/transaction',
            transactionViewData: TransactionView.appState
        });
    }
}
