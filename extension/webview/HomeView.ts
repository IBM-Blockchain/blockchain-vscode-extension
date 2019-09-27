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
import { ExtensionCommands } from '../../ExtensionCommands';
import { View } from './View';
import { Reporter } from '../util/Reporter';

export class HomeView extends View {

    constructor(context: vscode.ExtensionContext) {
        super(context, 'extensionHome', 'IBM Blockchain Platform Home');
    }

    async openPanelInner(panel: vscode.WebviewPanel): Promise<void> {
        Reporter.instance().sendTelemetryEvent('openedView', {openedView: panel.title}); // Report that a user has opened a new panel

        const extensionPath: string = ExtensionUtil.getExtensionPath();
        const panelIcon: vscode.Uri = vscode.Uri.file(path.join(extensionPath, 'resources', 'logo.svg'));

        panel.iconPath = panelIcon;

        panel.webview.onDidReceiveMessage(async (message: any) => {
            if (message.command === 'telemetry') {
                Reporter.instance().sendTelemetryEvent('Referral', {source: 'homepage', destination: message.url});
            }
        });
    }

    async getHomePage(options: any): Promise<any> {
        const templatePath: string = path.join(__dirname, '..', '..', '..', 'templates', 'HomeView.ejs');
        return await new Promise((resolve: any, reject: any): any => {
            ejs.renderFile(templatePath, options, { async: true }, (error: any, data: string) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(data);
                }
            });
        });
    }

    loadComponent(_panel: vscode.WebviewPanel): void {
        return;
    }

    async getHTMLString(): Promise<string> {
        const packageJson: any = await ExtensionUtil.getPackageJSON();
        const extensionVersion: string = packageJson.version;
        const extensionPath: string = ExtensionUtil.getExtensionPath();

        // Images
        const marketplaceIcon: vscode.Uri = vscode.Uri.file(path.join(extensionPath, 'resources', 'blockchain_marketplace.png')).with({ scheme: 'vscode-resource' });
        const githubDark: vscode.Uri = vscode.Uri.file(path.join(extensionPath, 'resources', 'github_dark.svg')).with({ scheme: 'vscode-resource' });
        const documentDark: vscode.Uri = vscode.Uri.file(path.join(extensionPath, 'resources', 'document_dark.svg')).with({ scheme: 'vscode-resource' });
        const searchDark: vscode.Uri = vscode.Uri.file(path.join(extensionPath, 'resources', 'search_dark.svg')).with({ scheme: 'vscode-resource' });
        const githubLight: vscode.Uri = vscode.Uri.file(path.join(extensionPath, 'resources', 'github_light.svg')).with({ scheme: 'vscode-resource' });
        const documentLight: vscode.Uri = vscode.Uri.file(path.join(extensionPath, 'resources', 'document_light.svg')).with({ scheme: 'vscode-resource' });
        const searchLight: vscode.Uri = vscode.Uri.file(path.join(extensionPath, 'resources', 'search_light.svg')).with({ scheme: 'vscode-resource' });

        const images: any = {
            marketplaceIcon: marketplaceIcon,
            githubDark: githubDark,
            documentDark: documentDark,
            searchDark: searchDark,
            githubLight: githubLight,
            documentLight: documentLight,
            searchLight: searchLight
        };

        const repositories: any[] = await this.getRepositories();

        const options: any = {
            extensionVersion: extensionVersion,
            commands : {
                OPEN_SAMPLE_PAGE: ExtensionCommands.OPEN_SAMPLE_PAGE,
                OPEN_TUTORIAL_GALLERY: ExtensionCommands.OPEN_TUTORIAL_GALLERY,
                OPEN_TUTORIAL_PAGE: ExtensionCommands.OPEN_TUTORIAL_PAGE
            },
            images: images,
            repositories: repositories
        };

        const homeString: string = await this.getHomePage(options);
        return homeString;
    }
}
