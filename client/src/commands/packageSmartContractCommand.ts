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
import { PackageRegistryEntry } from '../packages/PackageRegistryEntry';

/**
 * Main function which calls the methods and refreshes the blockchain explorer box each time that it runs succesfully.
 * This will be used in other files to call the command to package a smart contract project.
 */
export async function packageSmartContract(workspace?: vscode.WorkspaceFolder, version?: string): Promise<PackageRegistryEntry> {
    return vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Blockchain Extension',
        cancellable: false
    }, async (progress: vscode.Progress<{ message: string }>) => {
        progress.report({ message: `Packaging Smart Contract` });
        try {

            // Determine the directory that will contain the packages and ensure it exists.
            const extDir: string = vscode.workspace.getConfiguration().get('blockchain.ext.directory');
            const pkgDir: string = path.join(extDir, 'packages');
            const resolvedPkgDir: string = await UserInputUtil.getDirPath(pkgDir);
            await fs.ensureDir(resolvedPkgDir);

            // Choose the workspace directory.
            if (!workspace) {
                workspace = await chooseWorkspace();
                if (!workspace) {
                    // User cancelled.
                    return;
                }
            }

            // Build the workspace.
            await buildWorkspace(workspace);

            // Determine the language.
            const language: ChaincodeType = await getLanguage(workspace);

            // Determine the package name and version.
            let properties: { workspacePackageName: string, workspacePackageVersion: string };
            if (language === 'golang') {
                properties = await golangPackageAndVersion();
            } else if (language === 'java') {
                properties = await javaPackageAndVersion();
            } else {
                properties = await packageJsonNameAndVersion(workspace);
            }
            if (!properties) {
                // User cancelled.
                return;
            }

            if (version) {
                // update version to our custom one (used for debugging the contract)
                properties.workspacePackageVersion = version;
            }

            // Determine the filename of the new package.
            const pkgFile: string = path.join(resolvedPkgDir, `${properties.workspacePackageName}@${properties.workspacePackageVersion}.cds`);
            const pkgFileExists: boolean = await fs.pathExists(pkgFile);
            if (pkgFileExists) {
                if (language === 'golang') {
                    throw new Error('Package with name and version already exists. Please input a different name or version for your Go project.');
                } else if (language === 'java') {
                    throw new Error('Package with name and version already exists. Please input a different name or version for your Java project.');
                } else {
                    throw new Error('Package with name and version already exists. Please change the name and/or the version of the project in your package.json file.');
                }
            }

            // Determine the path argument.
            let pkgPath: string = workspace.uri.fsPath;
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
            const pkgBuffer: any = await pkg.toBuffer();
            await fs.writeFile(pkgFile, pkgBuffer);

            Reporter.instance().sendTelemetryEvent('packageCommand');

            await vscode.commands.executeCommand('blockchainAPackageExplorer.refreshEntry');
            vscode.window.showInformationMessage('Smart Contract packaged: ' + pkgFile);
            const packageEntry: PackageRegistryEntry = new PackageRegistryEntry();
            packageEntry.name = properties.workspacePackageName;
            packageEntry.version = properties.workspacePackageVersion;
            packageEntry.path = pkgFile;

            return packageEntry;
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
    workspaceFolderOptions = await UserInputUtil.getWorkspaceFolders();
    if (workspaceFolderOptions.length === 0) {
        const message: string = `Issue determining available workspace folders. Please open the workspace that you want to be packaged.`;
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

    // Do the workspace search once, and then filter the responses.
    const interestingFiles: vscode.Uri[] = await vscode.workspace.findFiles(
        new vscode.RelativePattern(workspaceDir, '**/*.{js,ts,go,java,kt}'),
        '**/node_modules/**',
        1
    );
    const jsFiles: vscode.Uri[] = interestingFiles.filter((uri: vscode.Uri) => uri.fsPath.match(/\.js$/));
    const tsFiles: vscode.Uri[] = interestingFiles.filter((uri: vscode.Uri) => uri.fsPath.match(/\.ts$/));
    const goFiles: vscode.Uri[] = interestingFiles.filter((uri: vscode.Uri) => uri.fsPath.match(/\.go$/));
    const javaFiles: vscode.Uri[] = interestingFiles.filter((uri: vscode.Uri) => uri.fsPath.match(/\.(java|kt)$/));

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
    } else if (javaFiles.length > 0) {
        language = 'java';
    } else {
        const message: string = 'Failed to determine workspace language type, supported languages are JavaScript, TypeScript, Go and Java';
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
    return { workspacePackageName, workspacePackageVersion };
}

/**
 * Method which calls an input box should the project be coded in java, which asks the user for a package name and version
 * (as java projects do not contain a package.json file), and returns an object containing both these values.
 * @returns {string, string} Returns an object with the workspacePackageName and workspacePackageVersion which will be used in the createPackageDir() method
 */
async function javaPackageAndVersion(): Promise<{ workspacePackageName: string, workspacePackageVersion: string }> {

    const workspacePackageName: string = await UserInputUtil.showInputBox('Enter a name for your Java package'); // Getting the specified name and package from the user
    if (!workspacePackageName) {
        // User has cancelled the input box
        return;
    }
    const workspacePackageVersion: string = await UserInputUtil.showInputBox('Enter a version for your Java package'); // Getting the specified name and package from the user
    if (!workspacePackageVersion) {
        // User has cancelled the input box
        return;
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

    return { workspacePackageName, workspacePackageVersion };
}

async function buildWorkspace(workspaceDir: vscode.WorkspaceFolder): Promise<void> {

    // Find all of the tasks.
    const tasks: vscode.Task[] = await vscode.tasks.fetchTasks();

    // Then limit the tasks to build tasks that we can actually use.
    const buildTasks: vscode.Task[] = tasks.filter((task: vscode.Task) => {
        if (!task.scope || task.scope === vscode.TaskScope.Global || task.scope === vscode.TaskScope.Workspace) {
            // We don't want unscoped tasks, global tasks, or workspace tasks.
            return false;
        } else if (task.scope.uri.fsPath !== workspaceDir.uri.fsPath) {
            // We only want tasks for our smart contract project.
            return false;
        } else if (task.group !== vscode.TaskGroup.Build) {
            // We only want build tasks.
            return false;
        } else if (task.isBackground) {
            // We only want foreground tasks (not "npm watch").
            return false;
        } else {
            return true;
        }
    });

    // If we have a set of build tasks, then execute the first one.
    if (buildTasks.length > 0) {
        const buildTask: vscode.Task = buildTasks[0];
        const buildTaskExecution: vscode.TaskExecution = await vscode.tasks.executeTask(buildTask);
        await new Promise((resolve: any): any => {
            const buildTaskListener: vscode.Disposable = vscode.tasks.onDidEndTask((e: vscode.TaskEndEvent) => {
                if (e.execution === buildTaskExecution) {
                    buildTaskListener.dispose();
                    resolve();
                }
            });
        });
    }

}
