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
import * as fs from 'fs-extra';
import * as path from 'path';
import { Reporter } from '../util/Reporter';
import { View } from './View';
import { ExtensionUtil } from '../util/ExtensionUtil';

export class ReactTutorialView extends View {

    private seriesName: string;
    private tutorialName: string;

    constructor(seriesName: string, tutorialName: string) {
        super(null, null, null);
        this.seriesName = seriesName;
        this.tutorialName = tutorialName;
    }

    loadComponent(_panel: vscode.WebviewPanel): void {
        return;
    }

    async getSeries(name: string): Promise<any> {
        const extensionPath: any = ExtensionUtil.getExtensionPath();
        const tutorialsPath: string = path.join(extensionPath, 'new-tutorials.json');
        const json: any[] = await fs.readJson(tutorialsPath);
        const series: any = json.find((_series: {name: string, tutorials: any[]}) => {
            return _series.name === name;
        });
        return series;
    }

    public async openView(): Promise<void> {
        const series: any = await this.getSeries(this.seriesName);
        const tutorial: any = await this.getTutorial(series, this.tutorialName);

        const tutorialPath: string = path.join(__dirname, '..', '..', '..', 'tutorials', tutorial.file);

        const uri: vscode.Uri = vscode.Uri.file(tutorialPath);

        await vscode.commands.executeCommand('markdown.showPreview', uri);
        Reporter.instance().sendTelemetryEvent('Tutorial Viewed', {series: this.seriesName, tutorial: this.tutorialName});
    }

    // Not needed for a tutorial view
    protected async openPanelInner(): Promise<void> {
        return;
    }

    // Not needed for a tutorial view
    protected async getHTMLString(): Promise<string> {
        return '';
    }
}
