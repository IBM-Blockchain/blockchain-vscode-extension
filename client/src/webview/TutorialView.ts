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
import { Reporter } from '../util/Reporter';
import { View } from './View';

export class TutorialView extends View {

    private repoName: string;
    private tutorialName: string;

    constructor(repoName: string, tutorialName: string) {
        super(null, null, null);
        this.repoName = repoName;
        this.tutorialName = tutorialName;
    }

    public async openView(): Promise<void> {
        const repository: any = await this.getRepository(this.repoName);
        const tutorial: any = this.getTutorial(repository, this.tutorialName);

        const tutorialPath: string = path.join(__dirname, '..', '..', '..', 'tutorials', tutorial.file);

        const uri: vscode.Uri = vscode.Uri.file(tutorialPath);

        await vscode.commands.executeCommand('markdown.showPreviewToSide', uri);
        Reporter.instance().sendTelemetryEvent('Tutorial Viewed', {tutorial: this.tutorialName});
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
