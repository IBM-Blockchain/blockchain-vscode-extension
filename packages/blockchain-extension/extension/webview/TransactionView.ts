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
import { ReactView } from './ReactView';
import { ExtensionCommands } from '../../ExtensionCommands';

export class TransactionView extends ReactView {
    public appState: any;

    constructor(context: vscode.ExtensionContext, appState: any) {
        super(context, 'transactionView', 'Transaction View');
        this.appState = appState;
    }

    async openPanelInner(panel: vscode.WebviewPanel): Promise<void> {
        panel.webview.onDidReceiveMessage(async (message: {command: string, data: any}) => {
            if (message.command === 'submit') {
                await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION, undefined, undefined, undefined, message.data);
            } else if (message.command === 'evaluate') {
                await vscode.commands.executeCommand(ExtensionCommands.EVALUATE_TRANSACTION, undefined, undefined, undefined, message.data);
            }
        });
        this.loadComponent(panel);
    }

    loadComponent(panel: vscode.WebviewPanel): void {
        panel.webview.postMessage({
            path: '/transaction',
            state: this.appState
        });
    }
}
