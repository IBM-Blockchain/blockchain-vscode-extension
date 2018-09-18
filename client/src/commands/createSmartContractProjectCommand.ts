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
import { VSCodeOutputAdapter } from '../logging/VSCodeOutputAdapter';
import { CommandUtil } from '../util/CommandUtil';
import * as child_process from 'child_process';
import * as path from 'path';
import { UserInputUtil } from './UserInputUtil';
import * as fs from 'fs-extra';

class GeneratorDependencies {
    needYo: boolean = false;
    needGenFab: boolean = false;

    constructor(options?: object) {
        Object.assign(this, options);
    }

    missingDependencies(): boolean {
        return this.needYo || this.needGenFab;
    }
}

export async function createSmartContractProject(): Promise<void> {
    console.log('create Smart Contract Project');

    // check for yo and generator-fabric
    const dependencies: GeneratorDependencies = await checkGeneratorDependenciesWithProgress();
    if (!dependencies) {
        return;
    }

    // if yo/generator fabric are missing, ask if we can install them
    if (dependencies.missingDependencies()) {
        const installPermission: string = await UserInputUtil.showQuickPickYesNo('Can this extension install missing npm packages before proceeding?');
        if (installPermission !== UserInputUtil.YES) {
            vscode.window.showErrorMessage('npm modules: yo and generator-fabric are required before creating a smart contract project');
            return;
        }
    }

    // Create and show output channel
    const outputAdapter: VSCodeOutputAdapter = VSCodeOutputAdapter.instance();

    // Install missing node modules
    if (dependencies.missingDependencies()) {
        const successful: boolean = await installGeneratorDependenciesWithProgress(dependencies);
        if (!successful) {
            return;
        }
    }

    let smartContractLanguageOptions: string[];
    let smartContractLanguage: string;
    outputAdapter.log('Getting smart contract languages...');
    try {
        smartContractLanguageOptions = await getSmartContractLanguageOptionsWithProgress();
    } catch (error) {
        vscode.window.showErrorMessage('Issue determining available smart contract language options:', error);
        return;
    }
    const choseSmartContractLanguageQuickPickOptions = {
        placeHolder: 'Chose smart contract language (Esc to cancel)',
        ignoreFocusOut: true,
        matchOnDetail: true
    };
    smartContractLanguage = await vscode.window.showQuickPick(smartContractLanguageOptions, choseSmartContractLanguageQuickPickOptions);
    if (!smartContractLanguageOptions.includes(smartContractLanguage)) {
        // User has cancelled the QuickPick box
        return;
    }
    smartContractLanguage = smartContractLanguage.toLowerCase();

    // Prompt the user for a file system folder
    const openDialogOptions = {
        canSelectFolders: true,
        openLabel: 'Open'
    };
    const folderSelect: vscode.Uri[] | undefined = await vscode.window.showOpenDialog(openDialogOptions);
    if (!folderSelect) {  // undefined if the user cancels the open dialog box
        return;
    }

    const folderUri: vscode.Uri = folderSelect[0];
    const folderPath: string = folderUri.fsPath;
    const folderName: string = path.basename(folderPath);

    const openMethod: string = await UserInputUtil.showFolderOptions('Choose how to open your new project');

    if (!openMethod) {
        return;
    }

    // Run yo:fabric with default options in folderSelect
    // redirect to stdout as yo fabric prints to stderr
    const yoFabricCmd: string = `yo fabric:contract -- --language="${smartContractLanguage}" --name="${folderName}" --version=0.0.1 --description="My Smart Contract" --author="John Doe" --license=Apache-2.0 2>&1`;
    try {
        const yoFabricOut = await CommandUtil.sendCommandWithProgress(yoFabricCmd, folderPath, 'Generating smart contract...');
        outputAdapter.log(yoFabricOut);
        outputAdapter.log('Successfully generated smart contract project');

        // Open the returned folder in explorer, in a new window
        console.log('new smart contract project folder is :' + folderPath);
        await openNewProject(openMethod, folderUri);
    } catch (error) {
        console.log('found issue running yo:fabric command:', error);
        vscode.window.showErrorMessage('Issue creating smart contract project');
        outputAdapter.log(error);
        return;
    }

} // end of createSmartContractProject function

async function checkGeneratorDependenciesWithProgress(): Promise<GeneratorDependencies> {
    return vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Blockchain Extension',
        cancellable: false
    }, async (progress): Promise<GeneratorDependencies> => {
        progress.report({message: `Checking smart contract generator dependencies...`});
        return checkGeneratorDependencies();
    });
}

async function checkGeneratorDependencies(): Promise<GeneratorDependencies> {
    let needYo: boolean = false;
    let needGenFab: boolean = false;

    try {
        await CommandUtil.sendCommand('npm view yo version');
        console.log('yo is installed');
        try {

            const newestVersion = await CommandUtil.sendCommand('npm view generator-fabric version');

            const parsedJson: any = await getPackageJson();

            let installedVersion = parsedJson.version;
            installedVersion = installedVersion.substring(installedVersion.indexOf('@') + 1);

            if (installedVersion !== newestVersion) {
                // The users global installation of generator-fabric is out of date
                console.log('Updating generator-fabric as it is out of date');

                const outputAdapter: VSCodeOutputAdapter = VSCodeOutputAdapter.instance();

                const npmUpdateOut = await CommandUtil.sendCommandWithProgress('npm install -g generator-fabric@' + newestVersion, '', 'Updating generator-fabric...');
                outputAdapter.log(npmUpdateOut);
                outputAdapter.log('Successfully updated to latest version of generator-fabric');
            }

        } catch (error) {
            needGenFab = true;
            console.log('generator-fabric missing');
        }
    } catch (error) {
        if (error.message.includes('npm ERR')) {
            console.log('npm installed, yo missing');
            needYo = true;
            needGenFab = true; // assume generator-fabric isn't installed either
        } else {
            console.log('npm not installed');
            vscode.window.showErrorMessage('npm is required before creating a smart contract project');
            return null;
        }
    }

    return new GeneratorDependencies({needYo, needGenFab});
}

async function installGeneratorDependenciesWithProgress(dependencies: GeneratorDependencies): Promise<boolean> {
    return vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Blockchain Extension',
        cancellable: false
    }, async (progress) => {
        progress.report({message: `Installing smart contract generator dependencies...`});
        return installGeneratorDependencies(dependencies);
    });
}

async function installGeneratorDependencies(dependencies: GeneratorDependencies): Promise<boolean> {

    // Create and show output channel
    const outputAdapter: VSCodeOutputAdapter = VSCodeOutputAdapter.instance();

    // Install missing node modules
    if (dependencies.needYo) {
        outputAdapter.log('Installing yo');
        try {
            const yoInstOut: string = await CommandUtil.sendCommand('npm install -g yo');
            outputAdapter.log(yoInstOut);
        } catch (error) {
            vscode.window.showErrorMessage('Issue installing yo node module');
            outputAdapter.log(error);
            return false;
        }
    }

    // it is assumed that if we got here we need to install the generator.
    outputAdapter.log('Installing generator-fabric');
    try {
        const genFabInstOut: string = await CommandUtil.sendCommand('npm install -g generator-fabric');
        outputAdapter.log(genFabInstOut);
    } catch (error) {
        vscode.window.showErrorMessage('Issue installing generator-fabric module');
        outputAdapter.log(error);
        return false;
    }
    return true;

}

async function getSmartContractLanguageOptionsWithProgress(): Promise<string[]> {
    return vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Blockchain Extension',
        cancellable: false
    }, async (progress): Promise<string[]> => {
        progress.report({message: `Getting smart contract languages...`});
        return getSmartContractLanguageOptions();
    });
}

async function getSmartContractLanguageOptions(): Promise<string[]> {
    try {

        const parsedJson: any = await getPackageJson();
        if (parsedJson.contractLanguages === undefined) {
            return Promise.reject('Contract languages not found in package.json');
        } else {
            return Promise.resolve(parsedJson.contractLanguages);
        }
    } catch (error) {
        return Promise.reject(error);
    }

}

async function openNewProject(openMethod: string, uri: vscode.Uri): Promise<void> {
    if (openMethod === UserInputUtil.ADD_TO_WORKSPACE) {
        const openFolders: Array<vscode.WorkspaceFolder> = vscode.workspace.workspaceFolders || [];
        vscode.workspace.updateWorkspaceFolders(openFolders.length, 0, {uri: uri});
    } else {
        let openNewWindow = true;

        if (openMethod === UserInputUtil.OPEN_IN_CURRENT_WINDOW) {
            openNewWindow = false;
            await checkForUnsavedFiles();
        }

        await vscode.commands.executeCommand('vscode.openFolder', uri, openNewWindow);
    }
}

async function checkForUnsavedFiles(): Promise<void> {
    const unsavedFiles = vscode.workspace.textDocuments.find((document: vscode.TextDocument) => {
        return document.isDirty;
    });

    if (unsavedFiles) {
        const answer: string = await UserInputUtil.showQuickPickYesNo('Do you want to save any unsaved changes?');
        if (answer === UserInputUtil.YES) {
            await vscode.workspace.saveAll(true);
        }
    }
}

async function getPackageJson(): Promise<any> {
    const npmPrefix: string = await CommandUtil.sendCommand('npm config get prefix');
    const packagePath: string = npmPrefix + '/lib/node_modules/generator-fabric/package.json';
    const packageJson: any = await fs.readJson(packagePath);
    return packageJson;
}
