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
import * as path from 'path';
import * as fs from 'fs-extra';
import * as vscode from 'vscode';
import { ExtensionUtil } from '../util/ExtensionUtil';

export abstract class View {

    protected static openPanels: Array<vscode.WebviewPanel> = [];
    protected panelTitle: string;
    protected panelID: string;
    protected context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext, panelID: string, panelTitle: string) {
        this.panelID = panelID;
        this.panelTitle = panelTitle;
        this.context = context;
    }

    public async openView(keepContext: boolean): Promise<void> {

        // Check to see if the panel is already open
        // In 1.44.x, they changed the structure of vscode.WebviewPanel - the second part of the statement supports this change.
        View.openPanels = View.openPanels.filter((_panel: vscode.WebviewPanel) => {
            return _panel['_isDisposed'] === false || _panel['_store'] && _panel['_store']['_isDisposed'] === false;
        });

        let panel: vscode.WebviewPanel = View.openPanels.find((tempPanel: vscode.WebviewPanel) => {
            return tempPanel.title === this.panelTitle;
        });

        if (panel) {
            // Focus on the panel if it is already open
            panel.reveal(undefined);
        } else {

            // Create the panel
            panel = vscode.window.createWebviewPanel(
                this.panelID, // Identifies the type of the webview. Used internally
                this.panelTitle, // Title of the panel displayed to the user
                vscode.ViewColumn.One, // Editor column to show the new webview panel in.
                {
                    enableScripts: true,
                    retainContextWhenHidden: keepContext,
                    enableCommandUris: true,
                    localResourceRoots: [
                        vscode.Uri.file(path.join(this.context.extensionPath, 'resources')),
                        vscode.Uri.file(path.join(this.context.extensionPath, 'build'))
                    ]
                },
            );

            // Keep track of the panels open
            View.openPanels.push(panel);

            // Reset when the current panel is closed
            panel.onDidDispose(() => {
                // Delete the closed panel from the list of open panels
                View.openPanels = View.openPanels.filter((tempPanel: vscode.WebviewPanel) => {
                    return tempPanel.title !== this.panelTitle;
                });
            }, null, this.context.subscriptions);

            // Set the webview's html
            panel.webview.html = await this.getHTMLString();
            this.loadComponent(panel);

            if (!keepContext) {
                panel.onDidChangeViewState(async () => {
                    // Whenever the View becomes active, rebuild the UI
                    panel.webview.html = await this.getHTMLString();
                    this.loadComponent(panel);
                });
            }

            await this.openPanelInner(panel);
        }
    }

    // Get all repositories
    public async getRepositories(): Promise<any[]> {
        const extensionPath: any = ExtensionUtil.getExtensionPath();
        const repositoriesPath: string = path.join(extensionPath, 'repositories.json');
        const json: any = await fs.readJson(repositoriesPath);
        const repositories: any[] = json.repositories;
        return repositories;
    }

    // Get individual repository
    public async getRepository(name: string): Promise<any> {
        const repositories: any[] = await this.getRepositories();
        const repository: any = repositories.find((repo: any) => {
            return repo.name === name;
        });
        return repository;
    }

    // Get individual series
    async getSeries(name: string): Promise<any> {
        const extensionPath: any = ExtensionUtil.getExtensionPath();
        const tutorialsPath: string = path.join(extensionPath, 'tutorials.json');
        const json: any[] = await fs.readJson(tutorialsPath);
        const series: any = json.find((_series: {name: string, tutorials: any[]}) => {
            return _series.name === name;
        });
        return series;
    }

    // Get tutorials from a series
    public async getTutorial(series: any, tutorialName: string): Promise<any> {
        const tutorials: any[] = series.tutorials;
        const tutorial: any = tutorials.find((tut: any) => {
            return tut.title === tutorialName;
        });
        return tutorial;
    }

    // Get sample from repository
    public getSample(repository: any, sampleName: string): any {
        const samples: any[] = repository.samples;
        const sample: any = samples.find((samp: any) => {
            return samp.name === sampleName;
        });
        return sample;
    }

    protected async abstract openPanelInner(panel: vscode.WebviewPanel): Promise<void>;

    protected async abstract getHTMLString(): Promise<string>;

    protected abstract loadComponent(panel: vscode.WebviewPanel): void;
}
