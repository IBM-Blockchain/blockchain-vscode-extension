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
import { UserInputUtil, IBlockchainQuickPickItem } from './UserInputUtil';
import { Reporter } from '../util/Reporter';

/**
 * Main function which calls the methods and refreshes the blockchain explorer box each time that it runs succesfully.
 * This will be used in other files to call the command to package a smart contract project.
 */
export async function packageSmartContract(): Promise<void> {
    let packageDir: string = vscode.workspace.getConfiguration().get('fabric.package.directory');

    return vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Blockchain Extension',
        cancellable: false
    }, async (progress) => {
        progress.report({message: `Packaging Smart Contract`});
        try {
            packageDir = await UserInputUtil.getDirPath(packageDir);
            await createPackageDir(packageDir);

            Reporter.instance().sendTelemetryEvent('packageCommand');

            await vscode.commands.executeCommand('blockchainAPackageExplorer.refreshEntry');
        } catch (err) {
            vscode.window.showErrorMessage(err.message);
        }
    });
}

/**
 * This method checks to see whether the smart contract project contains javascript, typescript or golang files to determine the chosen language of this project.
 * It then calls one of two methods, packageJsonNameAndVersion() and golandPackageAndVersion(), and uses the retrieved information to determine the absolute path of the package directory
 * and calls the createAndPackage method with this full directory.
 * @param {String} packageDir A string containing the path of the directory of packaged smart contracts defined in User Settings.
 */
async function createPackageDir(packageDir: string): Promise<void> {
    const workspaceDir: vscode.WorkspaceFolder = await chooseWorkspace();
    if (workspaceDir) {
        const dir: string = await getFinalDirectory(packageDir, workspaceDir);
        if (dir) {
            await createAndPackage(dir, workspaceDir.uri.path);
        }
    }
}

/**
 * Method to determine if there are multiple smart contracts within the active workspace. If so, it will provide a quick pick box
 * to have the developer choose which smart contract he wishes to package and get its path. If not, it will automatically get the path of the only smart contract project there is.
 * @returns Returns the path of the workspace to be used in packaging process.
 */
async function chooseWorkspace(): Promise<vscode.WorkspaceFolder> {
    let workspaceFolderOptions: Array<vscode.WorkspaceFolder>;
    let workspaceFolder: vscode.WorkspaceFolder;
    try {
        workspaceFolderOptions = await UserInputUtil.getWorkspaceFolders();
    } catch (error) {
        const message: string = `Issue determining available workspace folders ${error.message}`;
        throw new Error(message);
    }
    if (workspaceFolderOptions.length > 1) {
        const chosenFolder: IBlockchainQuickPickItem<vscode.WorkspaceFolder> = await UserInputUtil.showWorkspaceQuickPickBox('Choose a workspace folder to package');
        if (!chosenFolder) {
            return;
        }
        workspaceFolder = chosenFolder.data;
    } else {
        workspaceFolder = workspaceFolderOptions[0];
    }

    return workspaceFolder;
}

/**
 * This method uses a glob function to go through all directories and sub-directories in the active workspace to determine what
 * language was used to develop this smart contract.
 * @param {String} packageDir Package directory which is defined in User Settings. This is the directory where smart contracts will be packaged to.
 * @param {String} workspaceDir Path of the active smart contract to be packaged.
 * @returns {String} Returns the full directory of where the smart contract will be found within the package directory.
 */
async function getFinalDirectory(packageDir: string, workspaceDir: vscode.WorkspaceFolder): Promise<string> {
    let language: string;
    let properties: any = {};
    language = await getLanguage(workspaceDir);
    let message: string;

    if (language === '/go/src/') {
        properties = await golangPackageAndVersion();
    } else {
        properties = await packageJsonNameAndVersion(workspaceDir.uri.path);
    }

    if (!properties) {
        return;
    }
    const dir: string = path.join(packageDir, language, properties.workspacePackageName + '@' + properties.workspacePackageVersion);
    try {
        // Checking to see if there is an existing package with the same name and version
        await fs.stat(dir);
        if (language === '/go/src/') {
            message = 'Package with name and version already exists. Please input a different name or version for your go project.';
        } else {
            message = 'Package with name and version already exists. Please change the name and/or the version of the project in your package.json file.';
        }

        throw new Error(message);

    } catch (err) {
        if (err.code === 'ENOENT') { // If the directory does not exist, it will create and package the Smart Contract
            return dir;
        } else {
            throw new Error(err);
        }
    }
}

/**
 * Method to determine the language used in the development of the smart contract project, which will be used to determine the correct directories
 * to package the projects.
 * @param workspaceDir {String} workspaceDir A string containing the path to the current active workspace (the workspace of the project the user is packaging).
 * @returns {string} The language used in the development of this smart contract project. Used to package in the correct respective directory.
 */
async function getLanguage(workspaceDir: vscode.WorkspaceFolder): Promise<string> {
    let language: string;

    const jsFiles: Array<vscode.Uri> = await vscode.workspace.findFiles(new vscode.RelativePattern(workspaceDir, '**/*.js'), '**/node_modules/**', 1);

    const tsFiles: Array<vscode.Uri> = await vscode.workspace.findFiles(new vscode.RelativePattern(workspaceDir, '**/*.ts'), '**/node_modules/**', 1);

    const goFiles: Array<vscode.Uri> = await vscode.workspace.findFiles(new vscode.RelativePattern(workspaceDir, '**/*.go'), '**/node_modules/**', 1);

    if (jsFiles.length > 0 && tsFiles.length > 0) {
        language = '/typescript/';
    } else if (tsFiles.length > 0 && jsFiles.length === 0) {
        const message: string = 'Please ensure you have compiled your typescript files into javascript.';
        vscode.window.showErrorMessage(message);
        throw new Error(message);
    } else if (goFiles.length > 0) {
        language = '/go/src/';
    } else if (jsFiles.length > 0) {
        language = '/javascript/';
    } else {
        const message: string = 'Failed to determine workspace language type, supported languages are javascript, typescript, and go';
        vscode.window.showErrorMessage(message);
        throw new Error(message);
    }

    return language;
}

/**
 * Method to retrieve the package name and version from the projects package.json file, and returns them to be used in the getFinalDirectory() method.
 * @param workspaceDir {String} workspaceDir A string containing the path to the current active workspace (the workspace of the project the user is packaging).
 * @returns {string, string}An object with the workspacePackageName and workspacePackageVersion which will be used in the createPackageDir() method.
 */
async function packageJsonNameAndVersion(workspaceDir: string): Promise<{ workspacePackageName: string, workspacePackageVersion: string }> {
    const workspacePackage: string = path.join(workspaceDir, '/package.json');
    const workspacePackageContents: Buffer = await fs.readFile(workspacePackage);
    const workspacePackageObj: any = JSON.parse(workspacePackageContents.toString('utf8'));
    const workspacePackageName: string = workspacePackageObj.name;
    const workspacePackageVersion: string = workspacePackageObj.version;

    if (!workspacePackageName || !workspacePackageVersion) {
        const message: string = 'Please enter a package name and/or package version into your package.json';
        vscode.window.showErrorMessage(message);
        throw new Error(message);
    }
    return {workspacePackageName, workspacePackageVersion};
}

/**
 * Method which calls an input box should the project be coded in golang, which asks the user for a package name and version
 * (as golang projects do not contain a package.json file), and returns an object containing both these values.
 * @returns {string, string} Returns an object with the workspacePackageName and workspacePackageVersion which will be used in the createPackageDir() method
 */
async function golangPackageAndVersion(): Promise<{ workspacePackageName: string, workspacePackageVersion: string } | void> {

    const workspacePackageName: string = await UserInputUtil.showInputBox('Enter a name for your go package'); // Getting the specified name and package from the user
    if (!workspacePackageName) {
        // User has cancelled the input box
        return;
    }
    const workspacePackageVersion: string = await UserInputUtil.showInputBox('Enter a version for your go package'); // Getting the specified name and package from the user
    if (!workspacePackageVersion) {
        // User has cancelled the input box
        return;
    }

    return {workspacePackageName, workspacePackageVersion};
}

/**
 * Method to create the directory previously determined in the createPackageDir() method. It will check to see if the directory already exists,
 * hence meaning the developer has tried to package the same smart contract, and if the directory does not exist, will create it and all its subdirectories
 * using 'fs.mkdirp() and package the smart contract project using fs.copy().
 * @param {String} dir A string containing the full absolute path of the packaged smart contract.
 * @param {String} workspaceDir A string containing the path to the current active workspace (the workspace of the project the user is packaging).
 */
async function createAndPackage(dir: string, workspaceDir: string): Promise<void> {
    try {
        await fs.mkdirp(dir);
        await fs.copy(workspaceDir, dir, {
            filter: (filePath) => {
                return !filePath.includes('node_modules');
            }
        });
        vscode.window.showInformationMessage('Smart Contract packaged: ' + dir);
    } catch (err) {
        vscode.window.showErrorMessage(err);
        throw new Error(err);
    }
}
