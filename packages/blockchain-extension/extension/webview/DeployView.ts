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
import { Reporter } from '../../extension/util/Reporter';

export class DeployView extends ReactView {
    protected appState: any;

    constructor(context: vscode.ExtensionContext, appState: any) {
        super(context, 'deploySmartContract', 'Deploy Smart Contract');
        this.appState = appState;
    }

    async openPanelInner(panel: vscode.WebviewPanel): Promise<void> {
        Reporter.instance().sendTelemetryEvent('openedView', {openedView: panel.title}); // Report that a user has opened a new panel

        const extensionPath: string = ExtensionUtil.getExtensionPath();
        const panelIcon: vscode.Uri = vscode.Uri.file(path.join(extensionPath, 'resources', 'logo.svg'));

        panel.iconPath = panelIcon;

        await this.loadComponent(panel);
    }

    async loadComponent(panel: vscode.WebviewPanel): Promise<void> {

        panel.webview.postMessage({
            path: '/deploy',
            deployData: this.appState
        });
    }
}
