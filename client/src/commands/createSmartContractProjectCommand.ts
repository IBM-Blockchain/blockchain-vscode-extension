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
import * as nls from 'vscode-nls';
import { Reporter } from '../util/Reporter';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { CommandUtil } from '../util/CommandUtil';
import * as path from 'path';
import { UserInputUtil, LanguageQuickPickItem, LanguageType } from './UserInputUtil';
import { ExtensionUtil } from '../util/ExtensionUtil';
import { LogType } from '../logging/OutputAdapter';
import * as GeneratorFabricPackageJSON from 'generator-fabric/package.json';
import { YeomanUtil } from '../util/YeomanUtil';

const localize: nls.LocalizeFunc = nls.loadMessageBundle();

export async function createSmartContractProject(): Promise<void> {
    // Create and show output channel
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();

    // If the user is on a Mac (Darwin)
    if (process.platform === 'darwin') {
        // Check to see if Xcode is installed (and assume gcc and other dependencies have been installed)
        const isInstalled: boolean = await isXcodeInstalled();
        if (!isInstalled) {
            return;
        }
    }

    const chaincodeLanguageOptions: string[] = getChaincodeLanguageOptions();
    const smartContractLanguageOptions: string[] = getSmartContractLanguageOptions();

    const smartContractLanguagePrompt: string = localize('smartContractLanguage.prompt', 'Choose smart contract language (Esc to cancel)');
    const smartContractLanguageItem: LanguageQuickPickItem = await UserInputUtil.showLanguagesQuickPick(smartContractLanguagePrompt, chaincodeLanguageOptions, smartContractLanguageOptions);
    if (!smartContractLanguageItem) {
        // User has cancelled the QuickPick box
        return;
    }

    const generator: string = `fabric:${smartContractLanguageItem.type.toLowerCase()}`;
    const smartContractLanguage: string = smartContractLanguageItem.label.toLowerCase();

    let assetType: string;
    if (smartContractLanguageItem.type === LanguageType.CONTRACT) {
        assetType = await UserInputUtil.showInputBox('Name the type of asset managed by this smart contract', 'MyAsset');
        if (!assetType) {
            // User has cancelled the input box
            return;
        }
    }

    const quickPickItems: {label: string, description: string}[] = [{label: UserInputUtil.BROWSE_LABEL, description: UserInputUtil.VALID_FOLDER_NAME}];
    const openDialogOptions: vscode.OpenDialogOptions = {
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: 'Save',
        filters: undefined
    };

    const folderUri: vscode.Uri = await UserInputUtil.browse('Choose the location to save the smart contract.', quickPickItems, openDialogOptions, true) as vscode.Uri;
    if (!folderUri) {
        return;
    }
    const folderPath: string = folderUri.fsPath;
    const folderName: string = path.basename(folderPath);

    const regex: RegExp = /^[a-zA-Z0-9-_]+$/;
    const validPackageName: boolean = regex.test(folderName); // Check contract meets Fabric naming requirement
    if (!validPackageName) {
        outputAdapter.log(LogType.ERROR, `Please choose a folder which only includes alphanumeric, "_" and "-" characters.`);
        return;
    }

    const openMethod: string = await UserInputUtil.showFolderOptions('Choose how to open your new project');

    if (!openMethod) {
        return;
    }

    try {

        const skipInstall: boolean = ExtensionUtil.skipNpmInstall();

        const runOptions: any = {
            'destination': folderPath,
            'language': smartContractLanguage,
            'name': folderName,
            'version': '0.0.1',
            'description': 'My Smart Contract',
            'author': 'John Doe',
            'license': 'Apache-2.0',
            'skip-install': skipInstall,
            'asset': assetType
        };

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'IBM Blockchain Platform Extension',
            cancellable: false
        }, async (progress: vscode.Progress<{message: string}>): Promise<void> => {
            progress.report({message: 'Generating smart contract project'});
            await YeomanUtil.run(generator, runOptions);
        });

        outputAdapter.log(LogType.SUCCESS, 'Successfully generated smart contract project');

        Reporter.instance().sendTelemetryEvent('createSmartContractProject', {contractLanguage: smartContractLanguage});
        // Open the returned folder in explorer, in a new window
        await UserInputUtil.openNewProject(openMethod, folderUri);
        await vscode.commands.executeCommand('workbench.files.action.focusFilesExplorer');
    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Issue creating smart contract project: ${error.message}`, `Issue creating smart contract project: ${error.toString()}`);
        return;
    }

} // end of createSmartContractProject function

function getChaincodeLanguageOptions(): string[] {
    return GeneratorFabricPackageJSON.chaincodeLanguages;

}

function getSmartContractLanguageOptions(): string[] {
     // change this back once support java
     const languages: string[] = GeneratorFabricPackageJSON.contractLanguages;
     return languages.filter((language: string) => {
         return language !== 'Java';
     });

}

async function isXcodeInstalled(): Promise<any> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    try {
        const output: string = await CommandUtil.sendCommand('xcode-select -p'); // Get path of active developer directory
        if (!output || output.includes('unable to get active developer directory')) {
            outputAdapter.log(LogType.ERROR, 'Xcode and the Command Line Tools are required to install smart contract dependencies');
            return false;
        } else {
            return true;
        }
    } catch (error) {
        outputAdapter.log(LogType.ERROR, 'Xcode and the Command Line Tools are required to install smart contract dependencies');
        return false;
    }

}
