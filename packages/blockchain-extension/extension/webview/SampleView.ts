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
import { Reporter } from '../util/Reporter';
import { CommandUtil } from '../util/CommandUtil';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { UserInputUtil } from '../commands/UserInputUtil';
import * as path from 'path';
import * as fs from 'fs-extra';
import Axios from 'axios';
import * as showdown from 'showdown';
import * as os from 'os';
import { RepositoryRegistry } from '../registries/RepositoryRegistry';
import * as shell from 'shelljs';
import { ExtensionUtil } from '../util/ExtensionUtil';
import * as ejs from 'ejs';
import { LogType } from 'ibm-blockchain-platform-common';
import { View } from './View';
import { RepositoryRegistryEntry } from '../registries/RepositoryRegistryEntry';

export class SampleView extends View {

    private repoName: string;
    private sampleName: string;

    constructor(context: vscode.ExtensionContext, repoName: string, sampleName: string) {
        super(context, sampleName, `${sampleName} Sample`);

        this.repoName = repoName;
        this.sampleName = sampleName;
    }

    loadComponent(_panel: vscode.WebviewPanel): void {
        return;
    }

    async openPanelInner(panel: vscode.WebviewPanel): Promise<void> {

        Reporter.instance().sendTelemetryEvent('openedView', {openedView: panel.title}); // Report that a user has opened a new panel

        const extensionPath: string = ExtensionUtil.getExtensionPath();
        const whitePanelIcon: vscode.Uri = vscode.Uri.file(path.join(extensionPath, 'resources', 'github_black.svg'));
        const blackPanelIcon: vscode.Uri = vscode.Uri.file(path.join(extensionPath, 'resources', 'github_white.svg'));

        panel.iconPath = {
            light: whitePanelIcon,
            dark: blackPanelIcon
        };

        panel.webview.onDidReceiveMessage(async (message: any) => {
            if (message.command === 'clone') {
                // Clone a repository from the sample page
                await this.cloneRepository(message.recloning);

                // Set the webview's html
                panel.webview.html = await this.getHTMLString();
                Reporter.instance().sendTelemetryEvent('Sample Cloned', {sample: this.sampleName});

            } else if (message.command === 'open') {
                // Open a contract/application
                const fileName: string = message.fileName;
                const fileType: string = message.fileType;
                const language: string = message.language;

                // Open the file
                await this.openFile(fileType, fileName, language);

                // Refresh the webviews html
                panel.webview.html = await this.getHTMLString();
                Reporter.instance().sendTelemetryEvent('Sample Opened', {sample: this.sampleName, name: fileName, type: fileType, language: language});

            } else if (message.command === 'getLanguageVersion') {
                // Gets the version for the selected contract language (used for updating the view)
                const contractName: string = message.contractName;
                const languageType: string = message.languageType;

                // Get the version of the language selected
                const version: string = await this.getLanguageVersion(contractName, languageType);

                // Send the version back to the view
                panel.webview.postMessage({ version: version });

            }
        }, undefined, this.context.subscriptions);
    }

    async getHTMLString(): Promise<string> {
        const extensionPath: string = ExtensionUtil.getExtensionPath();

        // Images
        const marketplaceIcon: vscode.Uri = vscode.Uri.file(path.join(extensionPath, 'resources', 'blockchain_marketplace.png')).with({ scheme: 'vscode-resource' });
        const contractsIconWhite: vscode.Uri = vscode.Uri.file(path.join(extensionPath, 'resources', 'contracts_icon_white.svg')).with({ scheme: 'vscode-resource' });
        const contractsIconBlack: vscode.Uri = vscode.Uri.file(path.join(extensionPath, 'resources', 'contracts_icon_black.svg')).with({ scheme: 'vscode-resource' });
        const applicationsIconWhite: vscode.Uri = vscode.Uri.file(path.join(extensionPath, 'resources', 'applications_icon_white.svg')).with({ scheme: 'vscode-resource' });
        const applicationsIconBlack: vscode.Uri = vscode.Uri.file(path.join(extensionPath, 'resources', 'applications_icon_black.svg')).with({ scheme: 'vscode-resource' });

        const repository: any = await this.getRepository(this.repoName);
        const sample: any = this.getSample(repository, this.sampleName);

        const images: any = {
            marketplaceIcon: marketplaceIcon,
            contractsIconWhite: contractsIconWhite,
            contractsIconBlack: contractsIconBlack,
            applicationsIconWhite: applicationsIconWhite,
            applicationsIconBlack: applicationsIconBlack,
        };

        // Find out if repository exists in user settings
        const repositoryName: string = repository.name;
        const repositoryRegistry: RepositoryRegistry = RepositoryRegistry.instance();

        let repositoryConfig: RepositoryRegistryEntry;
        try {
            repositoryConfig = await repositoryRegistry.get(repositoryName);
        } catch (error) {
            repositoryConfig = undefined;
        }

        const options: any = {
            repositoryName: repositoryName,
            repositoryOrgName: repository.orgName,
            sample: sample,
            repositoryConfig: repositoryConfig,
            images: images
        };

        const samplePageHtml: string = await this.getSamplePage(options);
        return samplePageHtml;
    }

    private async getSamplePage(options: any): Promise<any> {
        let validInternetConnection: boolean = true;
        const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
        const templatePath: string = path.join(__dirname, '..', '..', '..', 'templates', 'SampleView.ejs');

        const converter: showdown.Converter = new showdown.Converter();
        try {
            const response: any = await Axios.get(options.sample.readme);
            const text: string = response.data;
            const html: string = converter.makeHtml(text);
            options.html = html;
        } catch (error) {
            validInternetConnection = false;
        }

        if (!validInternetConnection) {
            const repositoryRegistry: RepositoryRegistry = RepositoryRegistry.instance();
            const repoIsCloned: boolean = await repositoryRegistry.exists(options.repositoryName);
            if (repoIsCloned) {
                const clonedRepo: RepositoryRegistryEntry = await repositoryRegistry.get(options.repositoryName);
                const repoPath: string = clonedRepo.path;
                const readMeOnJSON: string = options.sample.readme;
                const splitPath: string[] = readMeOnJSON.split(options.repositoryOrgName);

                const branchedPath: string = splitPath[1];
                const endOfBranchName: number = branchedPath.lastIndexOf('/');
                const slicedPath: string = branchedPath.slice(endOfBranchName + 1, branchedPath.length);

                const readMe: string = await fs.readFile(path.join(repoPath, slicedPath), 'utf8');
                const html: string = converter.makeHtml(readMe);
                options.html = html;
            } else {
                options.html = 'No internet connection - unable to retrieve the README.';
                outputAdapter.log(LogType.WARNING, 'Unable to retrieve README');
            }
        }

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

    private async cloneRepository(recloning: boolean = false): Promise<void> {
        const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();

        const repository: any = await this.getRepository(this.repoName);
        const url: string = repository.remote;

        const defaultPath: string = path.join(os.homedir(), this.repoName);

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
        try {
            const cloneOutput: string = await CommandUtil.sendCommandWithProgress(command, path.dirname(savePath.fsPath), `Cloning ${this.repoName} repository`);
            outputAdapter.log(LogType.INFO, undefined, cloneOutput);
        } catch (error) {
            outputAdapter.log(LogType.ERROR, `Could not clone sample: ${error.message}`);
            return;
        }
        // Store the location of the repository in the user settings
        const repositoryRegistry: RepositoryRegistry = RepositoryRegistry.instance();

        if (recloning) {
            await repositoryRegistry.update({
                name: this.repoName,
                path: savePath.fsPath
            });
        } else {
            await repositoryRegistry.add({
                name: this.repoName,
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
    private async openFile(fileType: string, fileName: string, language?: string): Promise<void> {

        // Get data about the sample and the specific download
        const repository: any = await this.getRepository(this.repoName);
        const sample: any = this.getSample(repository, this.sampleName);

        let samplePath: string; // Relative location from the repository
        let branch: string; // Git branch
        let workspaceLabel: string; // Workspace label if user 'Adds to Workspace'
        let onOpen: any[]; // Commands to run after the sample is open

        if (fileType === 'contracts') {
            const contract: any = this.getContract(sample, fileName);

            const foundLanguage: any = contract.languages.find((_language: any) => {
                if (_language.type === language) {
                    samplePath = _language.remote.path;
                    branch = _language.remote.branch;
                    workspaceLabel = _language.workspaceLabel;
                    onOpen = _language.onOpen;
                    return true;
                }
            });

            if (!foundLanguage) {
                throw new Error('Language type not supported');
            }

        } else if (fileType === 'applications') {
            const download: any = this.getApplication(sample, fileName, language);
            samplePath = download.remote.path;
            branch = download.remote.branch;
            workspaceLabel = download.workspaceLabel;
            onOpen = download.onOpen;
        } else {
            /* Need to make it possible to get the location information of additional materials
                e.g samplePath = download.url;
            */
            throw new Error('File type not supported');
        }

        // If the file extension is 'git', then we want to clone the repository
        let folderUri: vscode.Uri;

        folderUri = await this.cloneAndOpenRepository(samplePath, branch, workspaceLabel, onOpen);

        // Check to see if the user cancelled the command prompt(s).
        if (!folderUri) {
            return;
        }
    }

    // Called by the panels view. Updates the version shown in the contract's row based on the chosen language (from the dropdown)
    private async getLanguageVersion(contractName: string, languageType: string): Promise<string> {
        const repository: any = await this.getRepository(this.repoName);
        const sample: any = this.getSample(repository, this.sampleName);
        const contract: any = this.getContract(sample, contractName);

        const language: any = contract.languages.find((lang: any) => {
            return lang.type === languageType;
        });

        const version: string = language.version;

        return version;

    }

    // Get contract from sample
    private getContract(sample: any, contractName: string): any {
        const contracts: any[] = sample.category.contracts;
        const contract: any = contracts.find((cont: any) => {
            return cont.name === contractName;
        });
        return contract;
    }

    // Get application from sample
    private getApplication(sample: any, applicationName: string, applicationLanguage: string): any {
        const applications: any[] = sample.category.applications;
        const application: any = applications.find((app: any) => {
            return app.name === applicationName && app.language === applicationLanguage;
        });
        return application;
    }

    private async cloneAndOpenRepository(samplePath: string, branch: string, workspaceLabel: string, onOpen: any[]): Promise<vscode.Uri> {
        const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();

        // Find out where sample repository is
        const repositoryRegistry: RepositoryRegistry = RepositoryRegistry.instance();
        let repositoryData: RepositoryRegistryEntry;
        try {
            repositoryData = await repositoryRegistry.get(this.repoName);
        } catch (error) {
            outputAdapter.log(LogType.ERROR, `The location of the cloned repository on the disk is unknown. Try re-cloning the sample repository.`);
            return;
        }
        const baseDirectory: string = repositoryData.path;

        // Check if directory exists
        const directoryExists: boolean = await fs.pathExists(baseDirectory);

        if (!directoryExists) {
            // If the directory doesn't exist anymore, the user needs to re-clone the repository
            await repositoryRegistry.delete(this.repoName);
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

        // samplePath is the relative path from the root Git repo
        const folderPath: string = path.join(baseDirectory, samplePath);

        // Create the URI to the folder to open
        const folderUri: vscode.Uri = vscode.Uri.file(folderPath);

        // Execute any commands that are meant to run after the sample is opened.
        if (onOpen) {
            for (const item of onOpen) {
                outputAdapter.log(LogType.INFO, null, `Starting command "${item.command}" with arguments "${item.arguments}" for sample "${this.sampleName}"`);
                await CommandUtil.sendCommandWithOutputAndProgress(item.command, item.arguments, item.message, folderUri.fsPath, null, outputAdapter);
                outputAdapter.log(LogType.INFO, null, `Finished command "${item.command}" with arguments "${item.arguments}" for sample "${this.sampleName}"`);
            }
        }

        // Ask the user if they want to open the project now
        await ExtensionUtil.sleep(500);
        const openMethod: string = await UserInputUtil.showFolderOptions('Choose how to open the sample files');
        if (!openMethod) {
            // User cancelled dialog
            return;
        }

        // Open the downloaded project
        await UserInputUtil.openNewProject(openMethod, folderUri, workspaceLabel);
        return folderUri;
    }
}
