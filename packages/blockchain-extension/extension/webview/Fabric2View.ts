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
import * as path from 'path';
import { ReactView } from './ReactView';
import { ExtensionUtil } from '../util/ExtensionUtil';
import { Reporter } from '../util/Reporter';

export class Fabric2View extends ReactView {
    constructor(context: vscode.ExtensionContext) {
        super(context, 'fabric2view', `What's new with Fabric v2.0`);
    }

    async openPanelInner(panel: vscode.WebviewPanel): Promise<void> {
        Reporter.instance().sendTelemetryEvent('openedView', {openedView: panel.title}); // Report that a user has opened a new panel

        const extensionPath: string = ExtensionUtil.getExtensionPath();
        const panelIcon: vscode.Uri = vscode.Uri.file(path.join(extensionPath, 'resources', 'logo.svg'));

        panel.iconPath = panelIcon;

        panel.webview.onDidReceiveMessage(async (message: {command: string, data: any}) => {
            if (message.data) {
                await vscode.commands.executeCommand(message.command, ...message.data);
            } else {
                await vscode.commands.executeCommand(message.command);
            }
        });

        await this.loadComponent(panel);
    }

    async loadComponent(panel: vscode.WebviewPanel): Promise<void> {
        panel.webview.postMessage({
            path: '/fabric2'
        });
    }
}
