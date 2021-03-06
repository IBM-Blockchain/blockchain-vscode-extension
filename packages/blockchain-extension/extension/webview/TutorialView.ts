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
import * as fs from 'fs-extra';
import { ReactView } from './ReactView';
import { ExtensionUtil } from '../util/ExtensionUtil';
import { Reporter } from '../util/Reporter';

export class TutorialView extends ReactView {

    private seriesName: string;
    private tutorialName: string;

    constructor(context: vscode.ExtensionContext, seriesName: string, tutorialName: string) {
        const seriesAndName: string = `${tutorialName} (${seriesName})`;
        super(context, seriesAndName, seriesAndName);
        this.seriesName = seriesName;
        this.tutorialName = tutorialName;
    }

    async openPanelInner(panel: vscode.WebviewPanel): Promise<void> {
        Reporter.instance().sendTelemetryEvent('openedView', {openedView: panel.title}); // Report that a user has opened a new panel

        const extensionPath: string = ExtensionUtil.getExtensionPath();
        const panelIcon: vscode.Uri = vscode.Uri.file(path.join(extensionPath, 'resources', 'logo.svg'));

        panel.iconPath = panelIcon;

        panel.webview.onDidReceiveMessage(async (message: {command: string, data: any}) => {
            await vscode.commands.executeCommand(message.command, ...message.data);
        });

        await this.loadComponent(panel);
    }

    async loadComponent(panel: vscode.WebviewPanel): Promise<void> {
        Reporter.instance().sendTelemetryEvent('Tutorial Viewed', { series: this.seriesName, tutorial: this.tutorialName });

        const series: any = await this.getSeries(this.seriesName);
        const tutorial: any = await this.getTutorial(series, this.tutorialName);

        const tutorialPath: string = path.join(this.getTutorialsDirectory(), tutorial.file);
        const markdown: string = await fs.readFile(tutorialPath, 'utf8');

        const tutorials: Array<{seriesName: string, seriesTutorials: any[]}> = await this.getTutorialInfo();

        panel.webview.postMessage({
            path: '/viewTutorial',
            // Add the active tutorial into the tutorials data
            tutorialData: {
                tutorials,
                activeTutorial: {
                    ...tutorial,
                    markdown,
                },
            }
        });
    }
}
