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
import * as path from 'path';
import { UserInputUtil, LanguageQuickPickItem, LanguageType } from './UserInputUtil';
import { ExtensionUtil } from '../util/ExtensionUtil';
import { LogType } from 'ibm-blockchain-platform-common';
import * as GeneratorFabricPackageJSON from 'generator-fabric/package.json';
import { YeomanUtil } from '../util/YeomanUtil';

const localize: nls.LocalizeFunc = nls.loadMessageBundle();

export async function createSmartContractProject(): Promise<void> {
    // Create and show output channel
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();

    const chaincodeLanguageOptions: string[] = getChaincodeLanguageOptions();
    const smartContractLanguageOptions: string[] = getSmartContractLanguageOptions();
    let contractType: string;
    let privateOrDefault: string;

    contractType = await UserInputUtil.showQuickPick('Choose the type of contract you wish to generate', ['Default Smart Contract', 'Private Data Smart Contract']) as string;

    if (contractType === 'Default Smart Contract') {
        contractType = 'standard';
        privateOrDefault = ' ';
    } else if (contractType === 'Private Data Smart Contract') {
        contractType = 'private';
        privateOrDefault = ' Private Data ';
    } else {
        // User has cancelled the QuickPick box
        return;
    }

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
        const regexForAssetType: RegExp = /^[A-Z]+$/i;
        const validAssetType: boolean = regexForAssetType.test(assetType);
        if (!assetType) {
            // User has cancelled the input box
            return;
        }
        if (!validAssetType) {
            outputAdapter.log(LogType.ERROR, `Invalid asset name, it should only contain lowercase and uppercase letters.`);
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
            'contractType': contractType,
            'language': smartContractLanguage,
            'name': folderName,
            'version': '0.0.1',
            'description': `My${privateOrDefault}Smart Contract`,
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
            progress.report({message: `Generating${privateOrDefault}Smart Contract Project`});
            await YeomanUtil.run(generator, runOptions);
        });

        outputAdapter.log(LogType.SUCCESS, `Successfully generated${privateOrDefault}Smart Contract Project`);

        if (contractType === 'standard') {
            Reporter.instance().sendTelemetryEvent('createSmartContractProject', {contractLanguage: smartContractLanguage});
        } else {
            Reporter.instance().sendTelemetryEvent('createPrivateDataSmartContractProject', {contractLanguage: smartContractLanguage});
        }
        // Open the returned folder in explorer, in a new window
        await UserInputUtil.openNewProject(openMethod, folderUri);
        await vscode.commands.executeCommand('workbench.files.action.focusFilesExplorer');
    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Issue creating${privateOrDefault}Smart Contract Project: ${error.message}`, `Issue creating${privateOrDefault}Smart Contract Project: ${error.toString()}`);
        return;
    }

} // end of createSmartContractProject function

function getChaincodeLanguageOptions(): string[] {
    return GeneratorFabricPackageJSON.chaincodeLanguages;

}

function getSmartContractLanguageOptions(): string[] {
     return GeneratorFabricPackageJSON.contractLanguages;
}
