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
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../logging/OutputAdapter';
import { ExtensionCommands } from '../../ExtensionCommands';

/**
 * Main function which calls the methods and refreshes the blockchain explorer box each time that it runs succesfully.
 * This will be used in other files to call the command to package a smart contract project.
 */
export async function packageSmartContract(workspace?: vscode.WorkspaceFolder, overrideName?: string, overrideVersion?: string): Promise<PackageRegistryEntry> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, 'packageSmartContract');

    let resolvedPkgDir: string;
    let properties: { workspacePackageName: string, workspacePackageVersion: string };
    let language: ChaincodeType;

    try {
        // Determine the directory that will contain the packages and ensure it exists.
        const extDir: string = vscode.workspace.getConfiguration().get('blockchain.ext.directory');
        const pkgDir: string = path.join(extDir, 'packages');
        resolvedPkgDir = await UserInputUtil.getDirPath(pkgDir);
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
        language = await getLanguage(workspace);

        // Determine the package name and version.
        if (language === 'golang') {
            properties = await golangPackageAndVersion(overrideName, overrideVersion);
        } else if (language === 'java') {
            properties = await javaPackageAndVersion(overrideName, overrideVersion);
        } else {
            properties = await packageJsonNameAndVersion(workspace, overrideName, overrideVersion);
        }
        if (!properties) {
            // User cancelled.
            return;
        }

    } catch (err) {
        outputAdapter.log(LogType.ERROR, err.message, err.toString());
        return;
    }

    return vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'IBM Blockchain Platform Extension',
        cancellable: false
    }, async (progress: vscode.Progress<{ message: string }>) => {
        progress.report({ message: `Packaging Smart Contract` });
        try {

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

                if (!process.env.GOPATH) {
                    // The path is relative to $GOPATH/src for Go smart contracts.
                    const srcPath: string = path.join(pkgPath, '..', '..', 'src');
                    pkgPath = path.basename(pkgPath);
                    const exists: boolean = await fs.pathExists(srcPath);

                    if (!exists) {
                        // Project path is not under GOPATH.
                        throw new Error('The enviroment variable GOPATH has not been set, and the extension was not able to automatically detect the correct value. You cannot package a Go smart contract without setting the environment variable GOPATH.');
                    } else {
                        process.env.GOPATH = path.join(srcPath, '..');
                    }
                } else {
                    // The path is relative to $GOPATH/src for Go smart contracts.
                    const srcPath: string = path.join(process.env.GOPATH, 'src');
                    pkgPath = path.relative(srcPath, pkgPath);
                    if (!pkgPath || pkgPath.startsWith('..') || path.isAbsolute(pkgPath)) {
                        // Project path is not under GOPATH.
                        throw new Error('The Go smart contract is not a subdirectory of the path specified by the environment variable GOPATH. Please correct the environment variable GOPATH.');
                    }
                }
            }

            // Determine if there is a metadata path.
            const metadataPath: string = path.join(workspace.uri.fsPath, 'META-INF');
            const metadataPathExists: boolean = await fs.pathExists(metadataPath);

            // Create the package. Need to dynamically load the package class
            // from the Fabric SDK to avoid early native module loading.
            const {Package} = await import('fabric-client');
            const pkg: any = await Package.fromDirectory({
                name: properties.workspacePackageName,
                version: properties.workspacePackageVersion,
                path: pkgPath,
                type: language,
                metadataPath: metadataPathExists ? metadataPath : null
            });
            const pkgBuffer: any = await pkg.toBuffer();
            await fs.writeFile(pkgFile, pkgBuffer);

            Reporter.instance().sendTelemetryEvent('packageCommand');

            await vscode.commands.executeCommand(ExtensionCommands.REFRESH_PACKAGES);
            outputAdapter.log(LogType.SUCCESS, `Smart Contract packaged: ${pkgFile}`);

            const packageEntry: PackageRegistryEntry = new PackageRegistryEntry();
            packageEntry.name = properties.workspacePackageName;
            packageEntry.version = properties.workspacePackageVersion;
            packageEntry.path = pkgFile;

            return packageEntry;
        } catch (err) {
            outputAdapter.log(LogType.ERROR, err.message, err.toString());
            return;
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
        const message: string = `Issue determining available smart contracts. Please open the smart contract you want to be packaged.`;
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

    // Is this a Node.js smart contract (JavaScript, TypeScript, etc)?
    const packageJsonFile: string = path.join(workspaceDir.uri.fsPath, 'package.json');
    const packageJsonFileExists: boolean = await fs.pathExists(packageJsonFile);
    if (packageJsonFileExists) {
        return 'node';
    }

    // Is this a Java smart contract (Java, Kotlin, etc)?
    const gradleFile: string = path.join(workspaceDir.uri.fsPath, 'build.gradle');
    const gradleFileExists: boolean = await fs.pathExists(gradleFile);
    const mavenFile: string = path.join(workspaceDir.uri.fsPath, 'pom.xml');
    const mavenFileExists: boolean = await fs.pathExists(mavenFile);
    if (gradleFileExists || mavenFileExists) {
        return 'java';
    }

    // Is this a Go smart contract?
    const goFiles: vscode.Uri[] = await vscode.workspace.findFiles(
        new vscode.RelativePattern(workspaceDir, '**/*.go'),
        null,
        1
    );
    if (goFiles.length > 0) {
        return 'golang';
    }

    // Its not java/node/go contract, so error
    const message: string = `Failed to determine workspace language type, supported languages are JavaScript, TypeScript, Go and Java. Please ensure your contract's root-level directory is open in the Explorer.`;
    throw new Error(message);

}

/**
 * Method to retrieve the package name and version from the projects package.json file, and returns them to be used in the getFinalDirectory() method.
 * @param workspaceDir {String} workspaceDir A string containing the path to the current active workspace (the workspace of the project the user is packaging).
 * @returns {string, string}An object with the workspacePackageName and workspacePackageVersion which will be used in the createPackageDir() method.
 */
async function packageJsonNameAndVersion(workspaceDir: vscode.WorkspaceFolder, overrideName?: string, overrideVersion?: string): Promise<{ workspacePackageName: string, workspacePackageVersion: string }> {

    const workspacePackage: string = path.join(workspaceDir.uri.fsPath, '/package.json');
    const workspacePackageContents: Buffer = await fs.readFile(workspacePackage);
    const workspacePackageObj: any = JSON.parse(workspacePackageContents.toString('utf8'));
    let workspacePackageName: string = workspacePackageObj.name;
    let workspacePackageVersion: string = workspacePackageObj.version;

    if (overrideName) {
        workspacePackageName = overrideName;
    }
    if (overrideVersion) {
        workspacePackageVersion = overrideVersion;
    }

    if (!workspacePackageName || !workspacePackageVersion) {
        const message: string = 'Please enter a package name and/or package version into your package.json';
        throw new Error(message);
    }
    return {workspacePackageName, workspacePackageVersion};
}

/**
 * Method which calls an input box should the project be coded in java, which asks the user for a package name and version
 * (as java projects do not contain a package.json file), and returns an object containing both these values.
 * @returns {string, string} Returns an object with the workspacePackageName and workspacePackageVersion which will be used in the createPackageDir() method
 */
async function javaPackageAndVersion(overrideName?: string, overrideVersion?: string): Promise<{ workspacePackageName: string, workspacePackageVersion: string }> {

    let workspacePackageName: string = overrideName;
    if (!workspacePackageName) {
        workspacePackageName = await UserInputUtil.showInputBox('Enter a name for your Java package'); // Getting the specified name and package from the user
        if (!workspacePackageName) {
            // User has cancelled the input box
            return;
        }
    }
    let workspacePackageVersion: string = overrideVersion;
    if (!workspacePackageVersion) {
        workspacePackageVersion = await UserInputUtil.showInputBox('Enter a version for your Java package'); // Getting the specified name and package from the user
        if (!workspacePackageVersion) {
            // User has cancelled the input box
            return;
        }
    }

    return {workspacePackageName, workspacePackageVersion};
}

/**
 * Method which calls an input box should the project be coded in golang, which asks the user for a package name and version
 * (as golang projects do not contain a package.json file), and returns an object containing both these values.
 * @returns {string, string} Returns an object with the workspacePackageName and workspacePackageVersion which will be used in the createPackageDir() method
 */
async function golangPackageAndVersion(overrideName?: string, overrideVersion?: string): Promise<{ workspacePackageName: string, workspacePackageVersion: string }> {

    let workspacePackageName: string = overrideName;
    if (!workspacePackageName) {
        workspacePackageName = await UserInputUtil.showInputBox('Enter a name for your Go package'); // Getting the specified name and package from the user
        if (!workspacePackageName) {
            // User has cancelled the input box
            return;
        }
    }
    let workspacePackageVersion: string = overrideVersion;
    if (!workspacePackageVersion) {
        workspacePackageVersion = await UserInputUtil.showInputBox('Enter a version for your Go package'); // Getting the specified name and package from the user
        if (!workspacePackageVersion) {
            // User has cancelled the input box
            return;
        }
    }

    return {workspacePackageName, workspacePackageVersion};
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
        } else if (task.name.match(/watch/i)) {
            // We don't want anything with "watch" in the name!
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
