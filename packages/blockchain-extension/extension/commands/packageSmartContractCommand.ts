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
import { UserInputUtil } from './UserInputUtil';
import { Reporter } from '../util/Reporter';
import { PackageRegistryEntry } from '../registries/PackageRegistryEntry';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { LogType, FileSystemUtil } from 'ibm-blockchain-platform-common';
import { ExtensionCommands } from '../../ExtensionCommands';
import { SettingConfigurations } from '../../configurations';
import { CommandUtil } from '../util/CommandUtil';

/**
 * Main function which calls the methods and refreshes the blockchain explorer box each time that it runs successfully.
 * This will be used in other files to call the command to package a smart contract project.
 */
export async function packageSmartContract(workspace?: vscode.WorkspaceFolder, overrideName?: string, overrideVersion?: string): Promise<PackageRegistryEntry> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, 'packageSmartContract');

    let resolvedPkgDir: string;
    let properties: { workspacePackageName: string, workspacePackageVersion: string };
    let language: string;
    let packageError: string;

    try {
        // Determine the directory that will contain the packages and ensure it exists.
        const extDir: string = vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_DIRECTORY);
        const pkgDir: string = path.join(extDir, 'packages');
        resolvedPkgDir = FileSystemUtil.getDirPath(pkgDir);
        await fs.ensureDir(resolvedPkgDir);

        // Choose the workspace directory.
        if (!workspace || !workspace.uri) {
            // The second check above is to ensure we dont hit the `cannot read property "fsPath" of undefined` on VSCode v1.44.2
            workspace = await UserInputUtil.chooseWorkspace(true);
            if (!workspace) {
                // User cancelled.
                return;
            }
        }

        // Build the workspace.
        await buildWorkspace(workspace);

        checkForProjectErrors(workspace);

        // Determine the language.
        language = await UserInputUtil.getLanguage(workspace);

        // Determine the package name and version.
        if (language === 'golang') {
            properties = await golangPackageAndVersion(overrideName, overrideVersion);
            packageError = 'Go package name';
        } else if (language === 'java') {
            properties = await javaPackageAndVersion(overrideName, overrideVersion);
            packageError = 'Java package name';
        } else {
            properties = await packageJsonNameAndVersion(workspace, overrideName, overrideVersion);
            packageError = 'package.json name';
        }
        if (!properties) {
            // User cancelled.
            return;
        }

        const regex: RegExp = /^[a-zA-Z0-9-_]+$/;
        const replaceRegex: RegExp = /@.*?\//;
        properties.workspacePackageName = properties.workspacePackageName.replace(replaceRegex, '');
        const validPackageName: boolean = regex.test(properties.workspacePackageName); // Check contract meets Fabric naming requirement
        if (!validPackageName) {
            outputAdapter.log(LogType.ERROR, `Invalid ${packageError}. Name can only include alphanumeric, "_" and "-" characters.`);
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
        let originalGOPATH: string = '';
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
            let contractPath: string = workspace.uri.fsPath; // Workspace path
            if (language === 'golang') {

                // fabric-client requires the project to be under the GOPATH
                // https://github.com/hyperledger/fabric-sdk-node/blob/release-1.3/fabric-client/lib/packager/Golang.js#L34
                const isModule: boolean = await fs.pathExists(path.join(contractPath, 'go.mod'));
                if (isModule) {
                    await CommandUtil.sendCommandWithOutput('go', ['mod', 'vendor'], contractPath);
                }

                if (!process.env.GOPATH) {
                    // The path is relative to $GOPATH/src for Go smart contracts.
                    const indexSrc: number = contractPath.indexOf(path.sep + 'src' + path.sep);
                    if (indexSrc === -1) {
                        // Project path is not under GOPATH.
                        throw new Error('The environment variable GOPATH has not been set, and the extension was not able to automatically detect the correct value. You cannot package a Go smart contract without setting the environment variable GOPATH.');
                    } else {
                        const srcPath: string = contractPath.substring(0, indexSrc + 4);
                        contractPath = path.relative(srcPath, contractPath);
                        process.env.GOPATH = path.join(srcPath, '..');
                    }
                } else {
                    // The path is relative to $GOPATH/src for Go smart contracts.
                    const indexSrc: number = contractPath.indexOf(path.sep + 'src' + path.sep);
                    let pathsMatch: boolean = false;
                    if (indexSrc !== -1) {
                        const srcPath: string = contractPath.substring(0, indexSrc + 4);
                        const goPaths: string[] = process.env.GOPATH.split(path.delimiter);
                        if (goPaths.length > 1) {
                            originalGOPATH = process.env.GOPATH;
                        }
                        goPaths.forEach((value: string) => {
                            if (value.charAt(value.length - 1) === path.sep) {
                                value = value.substr(0, value.length - 1);
                            }
                            if (value === srcPath.substr(0, srcPath.length - 4)) {
                                process.env.GOPATH = value;
                                pathsMatch = true;
                            }
                        });
                        contractPath = path.relative(srcPath, contractPath);
                    }
                    if (!pathsMatch || !contractPath || contractPath.startsWith('..') || path.isAbsolute(contractPath)) {
                        throw new Error('The Go smart contract is not a subdirectory of the path specified by the environment variable GOPATH. Please correct the environment variable GOPATH.');
                    }
                }
            }

            // Determine if there is a metadata path.
            let metadataPath: string = path.join(workspace.uri.fsPath, 'META-INF');
            const metadataPathExists: boolean = await fs.pathExists(metadataPath);

            if (!metadataPathExists) {
                metadataPath = null;
            }

            // Create the package. Need to dynamically load the package class
            // from the Fabric SDK to avoid early native module loading.
            const { PackageSmartContract } = await import('ibm-blockchain-platform-environment-v1');
            const fileNames: string[] = await PackageSmartContract.packageContract(properties.workspacePackageName, properties.workspacePackageVersion, contractPath, pkgFile, language, metadataPath);

            Reporter.instance().sendTelemetryEvent('packageCommand');

            await vscode.commands.executeCommand(ExtensionCommands.REFRESH_PACKAGES);
            outputAdapter.log(LogType.SUCCESS, `Smart Contract packaged: ${pkgFile}`);

            outputAdapter.log(LogType.INFO, undefined, `${fileNames.length} file(s) packaged:`);
            for (const file of fileNames) {
                outputAdapter.log(LogType.INFO, undefined, `- ${file}`);
            }
            const packageEntry: PackageRegistryEntry = new PackageRegistryEntry();
            packageEntry.name = properties.workspacePackageName;
            packageEntry.version = properties.workspacePackageVersion;
            packageEntry.path = pkgFile;
            if (originalGOPATH) {
                process.env.GOPATH = originalGOPATH;
            }
            return packageEntry;
        } catch (err) {
            outputAdapter.log(LogType.ERROR, err.message, err.toString());
            if (originalGOPATH) {
                process.env.GOPATH = originalGOPATH;
            }
            return;
        }
    });
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
    return { workspacePackageName, workspacePackageVersion };
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

    return { workspacePackageName, workspacePackageVersion };
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

    return { workspacePackageName, workspacePackageVersion };
}

function checkForProjectErrors(workspaceDir: vscode.WorkspaceFolder): void {
    const collections: [vscode.Uri, vscode.Diagnostic[]][] = vscode.languages.getDiagnostics();
    for (const collection of collections) {
        for (const thing of collection) {
            if (thing instanceof vscode.Uri) {
                const uri: vscode.Uri = thing;
                const relativePath: string = path.relative(workspaceDir.uri.fsPath, uri.fsPath);
                if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
                    // not in this project must have another project open in the workspace
                    break;
                }
            } else {
                const diagnostics: vscode.Diagnostic[] = thing;
                for (const diagnostic of diagnostics) {
                    // only check for errors
                    if (diagnostic.severity === 0) {
                        throw new Error('Smart contract project has errors please fix them before packaging');
                    }
                }
            }

        }
    }
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
        await vscode.tasks.executeTask(buildTask);
        await new Promise((resolve: any): any => {
            const buildTaskListener: vscode.Disposable = vscode.tasks.onDidEndTask((_e: vscode.TaskEndEvent) => {
                buildTaskListener.dispose();
                resolve();
            });
        });
    }
}
