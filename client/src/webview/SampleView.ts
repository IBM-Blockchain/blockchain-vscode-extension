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
import { CommandUtil } from '../util/CommandUtil';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { UserInputUtil } from '../commands/UserInputUtil';
import * as path from 'path';
import * as fs from 'fs-extra';
import Axios from 'axios';
import * as showdown from 'showdown';
import * as os from 'os';
import { RepositoryRegistry } from '../repositories/RepositoryRegistry';
import * as shell from 'shelljs';
import { ExtensionUtil } from '../util/ExtensionUtil';
import * as ejs from 'ejs';
import { LogType } from '../logging/OutputAdapter';

let openPanels: Array<vscode.WebviewPanel> = [];

export class SampleView {

    public static async openContractSample(context: vscode.ExtensionContext, repoName: string, sampleName: string): Promise<void> {
        openPanels = openPanels.filter((_panel: vscode.WebviewPanel) => {
            return _panel['_isDisposed'] !== true;
        });

        // Check to see if the panel is already open
        let panel: vscode.WebviewPanel = openPanels.find((tempPanel: vscode.WebviewPanel) => {
            return tempPanel.title === `${sampleName} Sample`;
        });

        if (panel) {
            // Focus on the panel if it's already open
            panel.reveal(undefined);
        } else {

            // Create the sample panel
            panel = vscode.window.createWebviewPanel(
                `${sampleName}`, // Identifies the type of the webview. Used internally
                `${sampleName} Sample`, // Title of the panel displayed to the user
                vscode.ViewColumn.One, // Editor column to show the new webview panel in.
                {
                    retainContextWhenHidden: false,
                    enableScripts: true,
                    enableCommandUris: true,
                    localResourceRoots: [
                        vscode.Uri.file(path.join(context.extensionPath, 'resources'))
                    ]
                }
            );

            const extensionPath: string = ExtensionUtil.getExtensionPath();
            const whitePanelIcon: vscode.Uri = vscode.Uri.file(path.join(extensionPath, 'resources', 'github_black.svg'));
            const blackPanelIcon: vscode.Uri = vscode.Uri.file(path.join(extensionPath, 'resources', 'github_white.svg'));

            panel.iconPath = {
                light: whitePanelIcon,
                dark: blackPanelIcon
            };

            // Set the webview's html
            panel.webview.html = await this.getContractSample(repoName, sampleName);

            // Keep track of the panels open
            openPanels.push(panel);

            panel.onDidChangeViewState(async () => {
                // Whenever the View becomes active, rebuild the UI
                panel.webview.html = await this.getContractSample(repoName, sampleName);
            });

            panel.webview.onDidReceiveMessage(async (message: any) => {
                if (message.command === 'clone') {
                    // Clone a repository from the sample page
                    await SampleView.cloneRepository(message.repository, message.recloning);

                    // Set the webview's html
                    panel.webview.html = await this.getContractSample(repoName, sampleName);

                } else if (message.command === 'open') {
                    // Open a contract/application
                    const fileName: string = message.fileName;
                    const fileType: string = message.fileType;
                    const language: string = message.language;

                    // Open the file
                    await SampleView.openFile(repoName, sampleName, fileType, fileName, language);

                    // Refresh the webviews html
                    panel.webview.html = await this.getContractSample(repoName, sampleName);

                } else if (message.command === 'getLanguageVersion') {
                    // Gets the version for the selected contract language (used for updating the view)
                    const contractName: string = message.contractName;
                    const languageType: string = message.languageType;

                    // Get the version of the language selected
                    const version: string = await SampleView.getLanguageVersion(repoName, sampleName, contractName, languageType);

                    // Send the version back to the view
                    panel.webview.postMessage({ version: version });

                }
            }, undefined, context.subscriptions);

            // Reset when the current panel is closed
            panel.onDidDispose(() => {
                // Delete the closed panel from the list of open panels
                openPanels = openPanels.filter((tempPanel: vscode.WebviewPanel) => {
                    return tempPanel['_isDisposed'] === false;
                });
            }, null, context.subscriptions);
        }
    }

    public static async getSamplePage(options: any): Promise<any> {

        const templatePath: string = path.join(__dirname, '..', '..', '..', 'templates', 'SampleView.ejs');

        const converter: showdown.Converter = new showdown.Converter();
        const response: any = await Axios.get(options.sample.readme);
        const text: string = response.data;
        const html: string = converter.makeHtml(text);
        options.html = html;

        return await new Promise ((resolve: any, reject: any): any => {
            ejs.renderFile(templatePath, options, {async: true}, (error: any, data: string) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(data);
                }
            });
        });
    }

    public static async cloneRepository(repoName: string, recloning: boolean = false): Promise<void> {
        const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();

        const repository: any = await this.getRepository(repoName);
        const url: string = repository.remote;

        const defaultPath: string = path.join(os.homedir(), repoName);

        const savePath: vscode.Uri | undefined = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file(defaultPath),
            saveLabel: 'Clone Repository'
        });
        if (!savePath) {
            return;
        }

        // Create the command. Checkout a branch if given.

        // Get save directory location name
        const index: number = savePath.fsPath.lastIndexOf(path.sep);
        const saveDir: string = savePath.fsPath.substring(index + 1);

        const command: string = `git clone ${url} ${saveDir}`;
        console.log('Attempting to clone to:', savePath.fsPath);
        try {
            const cloneOutput: string = await CommandUtil.sendCommandWithProgress(command, path.dirname(savePath.fsPath), `Cloning ${repoName} repository`);
            outputAdapter.log(LogType.INFO, undefined, cloneOutput);
        } catch (error) {
            outputAdapter.log(LogType.ERROR, `Could not clone sample: ${error.message}`);
            return;
        }
        // Store the location of the repository in the user settings
        const repositoryRegistry: RepositoryRegistry = new RepositoryRegistry();

        if (recloning) {
            await repositoryRegistry.update({
                name: repoName,
                path: savePath.fsPath
            });
        } else {
            await repositoryRegistry.add({
                name: repoName,
                path: savePath.fsPath
            });
        }
        outputAdapter.log(LogType.SUCCESS, `Successfully cloned repository!`);

    }

    /**
     * Opens a file (contract of application)
     * @param repoName {String} The name of the repository
     * @param sampleName {String} The name of the sample
     * @param fileType {String} Either 'contracts' or 'applications'
     * @param fileName {String} Either the name of the application or the contract
     * @param language {String} If fileType is 'contracts', then this will be the language of the contract (fileName)
     * @returns {void}
     */
    public static async openFile(repoName: string, sampleName: string, fileType: string, fileName: string, language?: string): Promise<void> {

        // Get data about the sample and the specific download
        const repository: any = await this.getRepository(repoName);
        const sample: any = this.getSample(repository, sampleName);

        let samplePath: string; // Relative location from the repository
        let branch: string; // Git branch
        let workspaceLabel: string; // Workspace label if user 'Adds to Workspace'
        let onOpen: any[]; // Commands to run after the sample is open

        if (fileType === 'contracts') {
            const contract: any = this.getContract(sample, fileName);

            contract.languages.find((_language: any) => {
                if (_language.type === language) {
                    samplePath = _language.remote.path;
                    branch = _language.remote.branch;
                    language = language;
                    workspaceLabel = _language.workspaceLabel;
                    onOpen = _language.onOpen;
                    return true;
                }
            });

        } else if (fileType === 'applications') {
            const download: any = this.getApplication(sample, fileName);
            samplePath = download.remote.path;
            branch = download.remote.branch;
            language = download.language;
            workspaceLabel = download.workspaceLabel;
            onOpen = download.onOpen;
        } else {
            /* Need to make it possible to get the location information of additional materials
                e.g samplePath = download.url;
            */
            throw new Error('File type not supported');
        }

        // Get the repository url
        const sampleUrl: string = repository.remote;

        const fileExtension: string = sampleUrl.split('.').pop(); // Get everything after the last '.'

        // If the file extension is 'git', then we want to clone the repository
        let folderUri: vscode.Uri;
        if (fileExtension === 'git') {

            folderUri = await SampleView.cloneAndOpenRepository(repoName, samplePath, branch, workspaceLabel);
        } else {
            /* We might want to support other file formats in future such as zip, tar, etc.
            In which case, there's no need to checkout a local git branch. Instead we would:
            - Check directory exists
            - Open up the project
            */

            throw new Error(`Currently there is no support for opening files unless they're from a Git repository`);
        }

        // Check to see if the user cancelled the command prompt(s).
        if (!folderUri) {
            return;
        }

        // Execute any commands that are meant to run after the sample is opened.
        if (onOpen) {
            for (const item of onOpen) {
                const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
                outputAdapter.log(LogType.INFO, null, `Starting command "${item.command}" with arguments "${item.arguments}" for sample "${sampleName}"`);
                await CommandUtil.sendCommandWithOutputAndProgress(item.command, item.arguments, item.message, folderUri.fsPath, null, outputAdapter);
                outputAdapter.log(LogType.INFO, null, `Finished command "${item.command}" with arguments "${item.arguments}" for sample "${sampleName}"`);
            }
        }

    }

    // Called by the panels view. Updates the version shown in the contract's row based on the chosen language (from the dropdown)
    public static async getLanguageVersion(repoName: string, sampleName: string, contractName: string, languageType: string): Promise<string> {
        const repository: any = await this.getRepository(repoName);
        const sample: any = this.getSample(repository, sampleName);
        const contract: any = this.getContract(sample, contractName);

        const language: any = contract.languages.find((lang: any) => {
            return lang.type === languageType;
        });

        const version: string = language.version;

        return version;

    }

    // Get all repositories
    public static async getRepositories(): Promise<any[]> {
        const extensionPath: any = ExtensionUtil.getExtensionPath();
        const repositoriesPath: string = path.join(extensionPath, 'repositories.json');
        const json: any = await fs.readJson(repositoriesPath);
        const repositories: any[] = json.repositories;
        return repositories;
    }

    // Get individual repository
    public static async getRepository(name: string): Promise<any> {
        const repositories: any[] = await this.getRepositories();
        const repository: any = repositories.find((repo: any) => {
            return repo.name === name;
        });
        return repository;
    }

    // Get sample from repository
    public static getSample(repository: any, sampleName: string): any {
        const samples: any[] = repository.samples;
        const sample: any = samples.find((samp: any) => {
            return samp.name === sampleName;
        });
        return sample;
    }

    // Get contract from sample
    public static getContract(sample: any, contractName: string): any {
        const contracts: any[] = sample.category.contracts;
        const contract: any = contracts.find((cont: any) => {
            return cont.name === contractName;
        });
        return contract;
    }

    // Get application from sample
    public static getApplication(sample: any, applicationName: string): any {
        const applications: any[] = sample.category.applications;
        const application: any = applications.find((app: any) => {
            return app.name === applicationName;
        });
        return application;
    }

    public static async getContractSample(repoName: string, sampleName: string): Promise<string> {
        const extensionPath: string = ExtensionUtil.getExtensionPath();

        // Images
        const marketplaceIcon: vscode.Uri = vscode.Uri.file(path.join(extensionPath, 'resources', 'blockchain_marketplace.png')).with({ scheme: 'vscode-resource' });
        const contractsIconWhite: vscode.Uri = vscode.Uri.file(path.join(extensionPath, 'resources', 'contracts_icon_white.svg')).with({ scheme: 'vscode-resource' });
        const contractsIconBlack: vscode.Uri = vscode.Uri.file(path.join(extensionPath, 'resources', 'contracts_icon_black.svg')).with({ scheme: 'vscode-resource' });
        const applicationsIconWhite: vscode.Uri = vscode.Uri.file(path.join(extensionPath, 'resources', 'applications_icon_white.svg')).with({ scheme: 'vscode-resource' });
        const applicationsIconBlack: vscode.Uri = vscode.Uri.file(path.join(extensionPath, 'resources', 'applications_icon_black.svg')).with({ scheme: 'vscode-resource' });

        const repository: any = await SampleView.getRepository(repoName);
        const sample: any = SampleView.getSample(repository, sampleName);

        const images: any = {
            marketplaceIcon: marketplaceIcon,
            contractsIconWhite: contractsIconWhite,
            contractsIconBlack: contractsIconBlack,
            applicationsIconWhite: applicationsIconWhite,
            applicationsIconBlack: applicationsIconBlack,
        };

        // Find out if repository exists in user settings
        const repositoryName: string = repository.name;
        const repositoryRegistry: RepositoryRegistry = new RepositoryRegistry();

        let repositoryConfig: any;
        try {
            repositoryConfig = repositoryRegistry.get(repositoryName);
        } catch (error) {
            repositoryConfig = undefined;
        }

        const options: any = {
            repositoryName: repositoryName,
            sample: sample,
            repositoryConfig: repositoryConfig,
            images: images
        };

        const samplePageHtml: string = await SampleView.getSamplePage(options);
        return samplePageHtml;
    }

    public static async cloneAndOpenRepository(repoName: string, samplePath: string, branch: string, workspaceLabel: string): Promise<vscode.Uri> {
        const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();

        // Find out where sample repository is
        const repositoryRegistry: RepositoryRegistry = new RepositoryRegistry();
        const repositoryData: any = repositoryRegistry.get(repoName);
        if (!repositoryData) {
            // If the repo isn't in the user settings
            outputAdapter.log(LogType.ERROR, `The location of the cloned repository on the disk is unknown. Try re-cloning the sample repository.`);
            return;
        }
        const baseDirectory: string = repositoryData.path;

        // Check if directory exists
        const directoryExists: boolean = await fs.pathExists(baseDirectory);

        if (!directoryExists) {
            // If the directory doesn't exist anymore, the user needs to re-clone the repository
            await repositoryRegistry.delete(repoName);
            outputAdapter.log(LogType.ERROR, `The location of the file(s) you're trying to open is unknown. The sample repository has either been deleted or moved. Try re-cloning the sample repository.`);
            return;
        } else {
            // If the directory exists, we need to change into the directory
            shell.cd(baseDirectory);
        }

        // Create the command
        const command: string = `git checkout -b ${branch} origin/${branch}`;

        // Checkout the correct branch

        let fastFail: boolean = false; // Throw the error if not attempting to recover

        try {
            await CommandUtil.sendCommand(command);
        } catch (firstError) {
            try {
                if (firstError.message.includes('already exists')) {
                    // If the local branch has already been created, we just need to check it out
                    const checkoutCommand: string = `git checkout ${branch}`;
                    await CommandUtil.sendCommand(checkoutCommand);
                } else {
                    fastFail = true; // Throw only the error below
                    throw new Error(`Could not retrieve file(s) from repository: ${firstError.message}`);
                }
            } catch (secondError) {
                if (!fastFail) {
                    throw new Error(`Couldn't automatically checkout '${branch}' branch. Please checkout branch manually. Error: ${secondError.message}`);
                } else {
                    throw secondError;
                }
            }
        }

        // Ask the user if they want to open the project now
        await UserInputUtil.delayWorkaround(500);
        const openMethod: string = await UserInputUtil.showFolderOptions('Choose how to open the sample files');
        if (!openMethod) {
            // User cancelled dialog
            return;
        }

        // samplePath is the relative path from the root Git repo
        const folderPath: string = path.join(baseDirectory, samplePath);

        // Create the URI to the folder to open
        const folderUri: vscode.Uri = vscode.Uri.file(folderPath);

        // Open the downloaded project
        await UserInputUtil.openNewProject(openMethod, folderUri, workspaceLabel);
        return folderUri;
    }
}
