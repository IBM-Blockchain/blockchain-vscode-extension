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
import { VSCodeOutputAdapter } from '../logging/VSCodeOutputAdapter';
import { CommandUtil } from '../util/CommandUtil';
import * as path from 'path';
import { UserInputUtil } from './UserInputUtil';
import * as fs from 'fs-extra';
import * as yeoman from 'yeoman-environment';
import { YeomanAdapter } from '../util/YeomanAdapter';
import * as util from 'util';
import { ExtensionUtil } from '../util/ExtensionUtil';
import { LogType } from '../logging/OutputAdapter';

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

export async function createSmartContractProject(generator: string = 'fabric:contract'): Promise<void> {
    console.log('create Smart Contract Project');
    // Create and show output channel
    const outputAdapter: VSCodeOutputAdapter = VSCodeOutputAdapter.instance();

    // check for yo and generator-fabric
    const dependencies: GeneratorDependencies = await checkGeneratorDependenciesWithProgress();
    if (!dependencies) {
        return;
    }

    // if yo/generator fabric are missing, ask if we can install them
    if (dependencies.missingDependencies()) {
        const installPermission: string = await UserInputUtil.showQuickPickYesNo('Can this extension install missing npm packages before proceeding?');
        if (installPermission !== UserInputUtil.YES) {
            outputAdapter.log(LogType.ERROR, 'npm modules: yo and generator-fabric are required before creating a smart contract project');
            return;
        }
    }

    // Install missing node modules
    if (dependencies.missingDependencies()) {
        const successful: boolean = await installGeneratorDependenciesWithProgress(dependencies);
        if (!successful) {
            return;
        }
    }

    let smartContractLanguageOptions: string[];
    let smartContractLanguage: string;
    outputAdapter.log(LogType.INFO, 'Getting smart contract languages...');
    try {
        smartContractLanguageOptions = await getSmartContractLanguageOptionsWithProgress();
    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Issue determining available smart contract language options: ${error.message}`, `Issue determining available smart contract language options: ${error.toString()}`);
        return;
    }

    smartContractLanguage = await UserInputUtil.showLanguagesQuickPick('Choose smart contract language (Esc to cancel)', smartContractLanguageOptions);
    if (!smartContractLanguage) {
        // User has cancelled the QuickPick box
        return;
    }

    smartContractLanguage = smartContractLanguage.toLowerCase();

    // Prompt the user for a file system folder
    const openDialogOptions: vscode.OpenDialogOptions = {
        canSelectFolders: true,
        openLabel: 'Open'
    };

    // see method comment for details of this workaround
    await UserInputUtil.delayWorkaround(200);
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

    try {
        const npmPrefix: string = await CommandUtil.sendCommand('npm config get prefix');

        // tslint:disable-next-line
        let env = yeoman.createEnv([], {}, new YeomanAdapter());

        env.lookup = util.promisify(env.lookup);
        env.run = util.promisify(env.run);
        await env.lookup();

        // tslint:disable-next-line
        const packageJson: any = ExtensionUtil.getPackageJSON();
        const runOptions: any = {
            'destination': folderPath,
            'language': smartContractLanguage,
            'name': folderName,
            'version': '0.0.1',
            'description': 'My Smart Contract',
            'author': 'John Doe',
            'license': 'Apache-2.0',
            'skip-install': !packageJson.production
        };

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'IBM Blockchain Platform Extension',
            cancellable: false
        }, async (progress: vscode.Progress<{message: string}>, token: vscode.CancellationToken): Promise<void> => {
            progress.report({message: 'Generating smart contract project'});
            await env.run(generator, runOptions);
        });

        outputAdapter.log(LogType.SUCCESS, 'Successfully generated smart contract project');

        Reporter.instance().sendTelemetryEvent('createSmartContractProject', {contractLanguage: smartContractLanguage});
        // Open the returned folder in explorer, in a new window
        console.log('new smart contract project folder is :' + folderPath);
        await UserInputUtil.openNewProject(openMethod, folderUri);
    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Issue creating smart contract project: ${error.message}`, `Issue creating smart contract project: ${error.toString()}`);
        return;
    }

} // end of createSmartContractProject function

async function checkGeneratorDependenciesWithProgress(): Promise<GeneratorDependencies> {
    return vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'IBM Blockchain Platform Extension',
        cancellable: false
    }, async (progress: vscode.Progress<{message: string}>): Promise<GeneratorDependencies> => {
        progress.report({message: `Checking smart contract generator dependencies...`});
        return checkGeneratorDependencies();
    });
}

async function checkGeneratorDependencies(): Promise<GeneratorDependencies> {
    let needYo: boolean = false;
    let needGenFab: boolean = false;

    // Create and show output channel
    const outputAdapter: VSCodeOutputAdapter = VSCodeOutputAdapter.instance();

    try {
        await CommandUtil.sendCommand('npm view yo version');
        console.log('yo is installed');
        try {

            // Hardcoded version of generator-fabric in extensions package.json
            const packageJson: any = ExtensionUtil.getPackageJSON();
            const versionToInstall: string = packageJson.generatorFabricVersion;

            const parsedJson: any = await getGeneratorFabricPackageJson();

            let installedVersion: string = parsedJson.version;
            installedVersion = installedVersion.substring(installedVersion.indexOf('@') + 1);

            if (installedVersion !== versionToInstall) {
                // The users global installation of generator-fabric is out of date
                console.log('Updating generator-fabric as it is out of date');

                const npmUpdateOut: string = await CommandUtil.sendCommandWithProgress('npm install -g generator-fabric@' + versionToInstall, '', 'Updating generator-fabric...');
                outputAdapter.log(LogType.INFO, undefined, npmUpdateOut);
                outputAdapter.log(LogType.SUCCESS, 'Successfully updated to latest version of generator-fabric');
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
            outputAdapter.log(LogType.ERROR, 'npm is required before creating a smart contract project');

            return null;
        }
    }

    return new GeneratorDependencies({needYo, needGenFab});
}

async function installGeneratorDependenciesWithProgress(dependencies: GeneratorDependencies): Promise<boolean> {
    return vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'IBM Blockchain Platform Extension',
        cancellable: false
    }, async (progress: vscode.Progress<{message: string}>) => {
        progress.report({message: `Installing smart contract generator dependencies...`});
        return installGeneratorDependencies(dependencies);
    });
}

async function installGeneratorDependencies(dependencies: GeneratorDependencies): Promise<boolean> {

    // Create and show output channel
    const outputAdapter: VSCodeOutputAdapter = VSCodeOutputAdapter.instance();

    // Install missing node modules
    if (dependencies.needYo) {
        outputAdapter.log(LogType.INFO, undefined, 'Installing yo');
        try {
            const yoInstOut: string = await CommandUtil.sendCommand('npm install -g yo');
            outputAdapter.log(LogType.INFO, undefined, yoInstOut);
        } catch (error) {
            outputAdapter.log(LogType.ERROR, `Issue installing yo node module: ${error.message}`, `Issue installing yo node module: ${error.toString()}`);
            return false;
        }
    }

    // it is assumed that if we got here we need to install the generator.
    outputAdapter.log(LogType.INFO, undefined, 'Installing generator-fabric');
    try {
        const genFabInstOut: string = await CommandUtil.sendCommand('npm install -g generator-fabric');
        outputAdapter.log(LogType.INFO, undefined, genFabInstOut);
    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Issue installing generator-fabric module: ${error.message}`, `Issue installing generator-fabric module: ${error.toString()}`);
        return false;
    }
    return true;

}

async function getSmartContractLanguageOptionsWithProgress(): Promise<string[]> {
    return vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'IBM Blockchain Platform Extension',
        cancellable: false
    }, async (progress: vscode.Progress<{message: string}>): Promise<string[]> => {
        progress.report({message: `Getting smart contract languages...`});
        return getSmartContractLanguageOptions();
    });
}

async function getSmartContractLanguageOptions(): Promise<string[]> {
    const parsedJson: any = await getGeneratorFabricPackageJson();
    if (parsedJson.contractLanguages === undefined) {
        throw new Error('Contract languages not found in package.json');
    }
    return parsedJson.contractLanguages;
}

async function getGeneratorFabricPackageJson(): Promise<any> {
    const npmPrefix: string = await CommandUtil.sendCommand('npm config get prefix');
    const packagePath: string = path.join(npmPrefix, (process.platform === 'win32') ? '' : 'lib', 'node_modules', 'generator-fabric', 'package.json');
    const packageJson: any = await fs.readJson(packagePath);
    return packageJson;
}
