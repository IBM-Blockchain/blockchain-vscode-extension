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
import IAssociatedTxData from '../interfaces/IAssociatedTxData';
import { ExtensionUtil } from '../util/ExtensionUtil';
import ITxDataFile from '../interfaces/ITxDataFile';

interface IAppState {
    gatewayName: string;
    smartContracts: ISmartContract[];
    associatedTxdata: IAssociatedTxData;
    preselectedSmartContract: ISmartContract;
    preselectedTransaction: ITransaction;
}

export class TransactionView extends ReactView {
    public static panel: vscode.WebviewPanel;
    public static appState: IAppState;

    static async updateSmartContracts(smartContracts: ISmartContract[]): Promise<void> {
        TransactionView.appState.smartContracts = smartContracts;
        TransactionView.panel.webview.postMessage({
            transactionViewData: {
                ...TransactionView.appState,
                smartContracts,
            }
        });
    }

    static closeView(): void {
        TransactionView.panel.dispose();
    }

    static async readTxdataFiles(txdataDirectoryPath: string): Promise<any> {
        const transactionsInFiles: ITxDataFile[] = [];

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

    protected appState: any;

    constructor(context: vscode.ExtensionContext, appState: IAppState) {
        super(context, 'transactionView', 'Transaction View');
        TransactionView.appState = appState;
    }

    public async openView(keepContext: boolean, viewColumn: vscode.ViewColumn = vscode.ViewColumn.One): Promise<void> {
        if (TransactionView.panel) {
            TransactionView.panel.webview.postMessage({
                transactionViewData: TransactionView.appState,
            });
        }

        return super.openView(keepContext, viewColumn);
    }

    async handleTransactionMessage(message: {command: string, data: any}, panel: vscode.WebviewPanel): Promise<void> {
        const response: string = await vscode.commands.executeCommand(message.command, undefined, undefined, undefined, message.data);
        panel.webview.postMessage({
            transactionOutput: response
        });
    }

    async handleTxdataMessage(message: {command: string, data: any}, panel: vscode.WebviewPanel): Promise<void> {
        const response: {chaincodeName: string, channelName: string, transactionDataPath: string} = await vscode.commands.executeCommand(message.command, undefined, message.data);

        // If txData added, add it to the object, if removed, delete it
        let updatedAssociatedTxdata: IAssociatedTxData;
        if (response) {
            updatedAssociatedTxdata = {
                ...TransactionView.appState.associatedTxdata,
                [response.chaincodeName]: {
                    channelName: response.channelName,
                    transactionDataPath: response.transactionDataPath,
                    transactions: await TransactionView.readTxdataFiles(response.transactionDataPath),
                }
            }
        } else {
            updatedAssociatedTxdata = TransactionView.appState.associatedTxdata;
            delete updatedAssociatedTxdata[message.data.name];
        }

        const newAppState: IAppState = {
            gatewayName: TransactionView.appState.gatewayName,
            smartContracts: TransactionView.appState.smartContracts,
            preselectedSmartContract: TransactionView.appState.preselectedSmartContract,
            preselectedTransaction: TransactionView.appState.preselectedTransaction,
            associatedTxdata: updatedAssociatedTxdata,
        };

        panel.webview.postMessage({
            transactionViewData: newAppState
        });
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
        panel.webview.postMessage({
            path: '/transaction',
            transactionViewData: TransactionView.appState
        });
    }
}
