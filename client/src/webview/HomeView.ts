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
import * as ejs from 'ejs';
import * as path from 'path';
import { ExtensionUtil } from '../util/ExtensionUtil';
import { SampleView } from './SampleView';

let openPanels: Array<vscode.WebviewPanel> = [];

export class HomeView {

    static async openHomePage(context: vscode.ExtensionContext): Promise<any> {

        // Check to see if the panel is already open

        openPanels = openPanels.filter((_panel: vscode.WebviewPanel) => {
            return _panel['_isDisposed'] !== true;
        });

        let panel: vscode.WebviewPanel = openPanels.find((tempPanel: vscode.WebviewPanel) => {
            return tempPanel.title === `IBM Blockchain Platform Home`;
        });

        if (panel) {
            // Focus on the panel if it is already open
            panel.reveal(undefined);
        } else {

            // Create the Home panel
            panel = vscode.window.createWebviewPanel(
                'extensionHome', // Identifies the type of the webview. Used internally
                'IBM Blockchain Platform Home', // Title of the panel displayed to the user
                vscode.ViewColumn.One, // Editor column to show the new webview panel in.
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    enableCommandUris: true,
                    localResourceRoots: [
                        vscode.Uri.file(path.join(context.extensionPath, 'resources'))
                    ]
                },
            );

            const extensionPath: string = ExtensionUtil.getExtensionPath();
            const panelIcon: vscode.Uri = vscode.Uri.file(path.join(extensionPath, 'resources', 'logo.svg'));

            panel.iconPath = panelIcon;

            // Set the webview's html
            panel.webview.html = await this.getExtensionHomepage();

            // Keep track of the panels open
            openPanels.push(panel);

            // Handle messages from the webview
            panel.webview.onDidReceiveMessage(async (message: any) => {
                if (message.command === 'command') {
                    // Used for running VS Code commands directly from the webviews
                    await vscode.commands.executeCommand(message.executeCommand);
                } else if (message.command === 'openSample') {
                    // Creates and opens a webview for the given sample
                    await vscode.commands.executeCommand('sample.open', message.repoName, message.sampleName);
                }
            }, undefined, context.subscriptions);

            // Reset when the current panel is closed
            panel.onDidDispose(() => {
                // Delete the closed panel from the list of open panels
                openPanels = openPanels.filter((tempPanel: vscode.WebviewPanel) => {
                    return tempPanel.title !== `IBM Blockchain Platform Home`;
                });
            }, null, context.subscriptions);
        }
    }

    static async getHomePage(options: any): Promise<any> {
        const templatePath: string = path.join(__dirname, '..', '..', '..', 'templates', 'HomeView.ejs');
        return await new Promise ((resolve: any, reject: any): any => {
            ejs.renderFile(templatePath, options, {async: true}, (error: any, data: string) => {
                if (error) {
                    reject(error);
                } else {
                    console.log('data', data);
                    resolve(data);
                }
             });
        });
    }

    static async getExtensionHomepage(): Promise<string> {
        const packageJson: any = await ExtensionUtil.getPackageJSON();
        const extensionVersion: string = packageJson.version;
        const extensionPath: string = ExtensionUtil.getExtensionPath();
        const marketplaceIcon: vscode.Uri = vscode.Uri.file(path.join(extensionPath, 'resources', 'blockchain_marketplace.png')).with({ scheme: 'vscode-resource' });

        const repositories: any[] = await SampleView.getRepositories();

        const options: any = {
            extensionVersion: extensionVersion,
            marketplaceIcon: marketplaceIcon,
            repositories: repositories
        };

        const homeString: string = await HomeView.getHomePage(options);
        return homeString;
    }
}
