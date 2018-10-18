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
import { ChaincodeType } from 'fabric-client';

/**
 * Main function which calls the methods and refreshes the blockchain explorer box each time that it runs succesfully.
 * This will be used in other files to call the command to package a smart contract project.
 */
export async function packageSmartContract(): Promise<void> {
    return vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Blockchain Extension',
        cancellable: false
    }, async (progress) => {
        progress.report({message: `Packaging Smart Contract`});
        try {

            // Determine the directory that will contain the packages and ensure it exists.
            const pkgDir: string = vscode.workspace.getConfiguration().get('fabric.package.directory');
            const resolvedPkgDir: string = await UserInputUtil.getDirPath(pkgDir);
            await fs.ensureDir(resolvedPkgDir);

            // Choose the workspace directory.
            const workspaceDir: vscode.WorkspaceFolder = await chooseWorkspace();
            if (!workspaceDir) {
                // User cancelled.
                return;
            }

            // Determine the language.
            const language: ChaincodeType = await getLanguage(workspaceDir);

            // Determine the package name and version.
            let properties: { workspacePackageName: string, workspacePackageVersion: string };
            if (language === 'golang') {
                properties = await golangPackageAndVersion();
            } else {
                properties = await packageJsonNameAndVersion(workspaceDir);
            }
            if (!properties) {
                // User cancelled.
                return;
            }

            // Determine the filename of the new package.
            const pkgFile: string = path.join(resolvedPkgDir, `${properties.workspacePackageName}@${properties.workspacePackageVersion}.cds`);
            const pkgFileExists: boolean = await fs.pathExists(pkgFile);
            if (pkgFileExists) {
                if (language === 'golang') {
                    throw new Error('Package with name and version already exists. Please input a different name or version for your Go project.');
                } else {
                    throw new Error('Package with name and version already exists. Please change the name and/or the version of the project in your package.json file.');
                }
            }

            // Determine the path argument.
            let pkgPath: string = workspaceDir.uri.fsPath;
            if (language === 'golang') {
                // Ensure GOPATH is set for Go smart contracts.
                if (!process.env.GOPATH) {
                    throw new Error('The enviroment variable GOPATH has not been set. You cannot package a Go smart contract without setting the environment variable GOPATH.');
                }
                // The path is relative to $GOPATH/src for Go smart contracts.
                const srcPath: string = path.join(process.env.GOPATH, 'src');
                pkgPath = path.relative(srcPath, pkgPath);
                if (!pkgPath || pkgPath.startsWith('..') || path.isAbsolute(pkgPath)) {
                    // Project path is not under GOPATH.
                    throw new Error('The Go smart contract is not a subdirectory of the path specified by the environment variable GOPATH. Please correct the environment variable GOPATH.');
                }
            }

            // Create the package.Need to dynamically load the package class
            // from the Fabric SDK to avoid early native module loading.
            const { Package } = await import('fabric-client');
            const pkg: any = await Package.fromDirectory({
                name: properties.workspacePackageName,
                version: properties.workspacePackageVersion,
                path: pkgPath,
                type: language
            });
            const pkgBuffer = await pkg.toBuffer();
            await fs.writeFile(pkgFile, pkgBuffer);

            Reporter.instance().sendTelemetryEvent('packageCommand');

            await vscode.commands.executeCommand('blockchainAPackageExplorer.refreshEntry');
            vscode.window.showInformationMessage('Smart Contract packaged: ' + pkgFile);
        } catch (err) {
            vscode.window.showErrorMessage(err.message);
        }
    });
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
 * Method to determine the language used in the development of the smart contract project, which will be used to determine the correct directories
 * to package the projects.
 * @param workspaceDir {String} workspaceDir A string containing the path to the current active workspace (the workspace of the project the user is packaging).
 * @returns {string} The language used in the development of this smart contract project. Used to package in the correct respective directory.
 */
async function getLanguage(workspaceDir: vscode.WorkspaceFolder): Promise<ChaincodeType> {
    let language: ChaincodeType;

    const jsFiles: Array<vscode.Uri> = await vscode.workspace.findFiles(new vscode.RelativePattern(workspaceDir, '**/*.js'), '**/node_modules/**', 1);

    const tsFiles: Array<vscode.Uri> = await vscode.workspace.findFiles(new vscode.RelativePattern(workspaceDir, '**/*.ts'), '**/node_modules/**', 1);

    const goFiles: Array<vscode.Uri> = await vscode.workspace.findFiles(new vscode.RelativePattern(workspaceDir, '**/*.go'), '**/node_modules/**', 1);

    if (jsFiles.length > 0 && tsFiles.length > 0) {
        language = 'node';
    } else if (tsFiles.length > 0 && jsFiles.length === 0) {
        const message: string = 'Please ensure you have compiled your TypeScript files into JavaScript.';
        vscode.window.showErrorMessage(message);
        throw new Error(message);
    } else if (goFiles.length > 0) {
        language = 'golang';
    } else if (jsFiles.length > 0) {
        language = 'node';
    } else {
        const message: string = 'Failed to determine workspace language type, supported languages are JavaScript, TypeScript, and Go';
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
async function packageJsonNameAndVersion(workspaceDir: vscode.WorkspaceFolder): Promise<{ workspacePackageName: string, workspacePackageVersion: string }> {
    const workspacePackage: string = path.join(workspaceDir.uri.fsPath, '/package.json');
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
async function golangPackageAndVersion(): Promise<{ workspacePackageName: string, workspacePackageVersion: string }> {

    const workspacePackageName: string = await UserInputUtil.showInputBox('Enter a name for your Go package'); // Getting the specified name and package from the user
    if (!workspacePackageName) {
        // User has cancelled the input box
        return;
    }
    const workspacePackageVersion: string = await UserInputUtil.showInputBox('Enter a version for your Go package'); // Getting the specified name and package from the user
    if (!workspacePackageVersion) {
        // User has cancelled the input box
        return;
    }

    return {workspacePackageName, workspacePackageVersion};
}
