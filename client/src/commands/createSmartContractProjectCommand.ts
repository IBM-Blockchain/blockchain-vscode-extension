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
import { window, Uri, commands } from 'vscode';
import { VSCodeOutputAdapter } from '../logging/VSCodeOutputAdapter';
import { CommandUtil } from '../util/CommandUtil';
import * as child_process from 'child_process';
import * as path from 'path';

export async function createSmartContractProject(): Promise<void> {
    console.log('create Smart Contract Project');
    // check for yo and generator-fabric
    let needYo: boolean = false;
    let needGenFab: boolean = false;

    try {
        await CommandUtil.sendCommand('npm view yo version');
        console.log('yo is installed');
        try {
            await CommandUtil.sendCommand('npm view generator-fabric version');
            console.log('generator-fabric installed');
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
            window.showErrorMessage('npm is required before creating a smart contract project');
            return;
        }
    }
    // if yo/generator fabric are missing, ask if we can install them
    if (needYo || needGenFab) {
        const quickPickOptions = {
            placeHolder: 'Can this extension install missing npm packages before proceeding?',
            ignoreFocusOut: true
        };
        const installPermission: string = await window.showQuickPick(['yes', 'no'], quickPickOptions);
        if (installPermission !== 'yes') {
            window.showErrorMessage('npm modules: yo and generator-fabric are required before creating a smart contract project');
            return;
        }
    }

    // Create and show output channel
    const outputAdapter: VSCodeOutputAdapter = VSCodeOutputAdapter.instance();

    // Install missing node modules
    if (needYo) {
        outputAdapter.log('Installing yo');
        try {
            const yoInstOut: string = await CommandUtil.sendCommand('npm install -g yo');
            outputAdapter.log(yoInstOut);
        } catch (error) {
            window.showErrorMessage('Issue installing yo node module');
            outputAdapter.log(error);
            return;
        }
    }
    if (needGenFab) {
        outputAdapter.log('Installing generator-fabric');
        try {
            const genFabInstOut: string = await CommandUtil.sendCommand('npm install -g generator-fabric');
            outputAdapter.log(genFabInstOut);
        } catch (error) {
            window.showErrorMessage('Issue installing generator-fabric module');
            outputAdapter.log(error);
            return;
        }
    }

    let smartContractLanguageOptions: string[];
    let smartContractLanguage: string;
    outputAdapter.log('Getting smart contract languages...');
    try {
        smartContractLanguageOptions = await getSmartContractLanguageOptions();
    } catch (error) {
        console.log('Issue determining available smart contract languages:', error);
        window.showErrorMessage('Issue determining available smart contract language options');
        return;
    }
    const choseSmartContractLanguageQuickPickOptions = {
        placeHolder: 'Chose smart contract language (Esc to cancel)',
        ignoreFocusOut: true,
        matchOnDetail: true
    };
    smartContractLanguage = await window.showQuickPick(smartContractLanguageOptions, choseSmartContractLanguageQuickPickOptions);
    if (!smartContractLanguageOptions.includes(smartContractLanguage)) {
        // User has cancelled the QuickPick box
        return;
    }
    smartContractLanguage = smartContractLanguage.toLowerCase();
    console.log('chosen contract language is:' + smartContractLanguage);

    // Prompt the user for a file system folder
    const openDialogOptions = {
        canSelectFolders: true,
        openLabel: 'Open'
    };
    const folderSelect: Uri[] | undefined = await window.showOpenDialog(openDialogOptions);
    if (folderSelect) {  // undefined if the user cancels the open dialog box

        const folderUri: Uri = folderSelect[0];
        const folderPath: string = folderUri.fsPath;
        const folderName: string = path.basename(folderPath);

        // Open the returned folder in explorer, in a new window
        console.log('new smart contract project folder is :' + folderPath);
        await commands.executeCommand('vscode.openFolder', folderUri, true);

        // Run yo:fabric with default options in folderSelect
        // redirect to stdout as yo fabric prints to stderr
        const yoFabricCmd: string = `yo fabric:contract -- --language="${smartContractLanguage}" --name="${folderName}" --version=0.0.1 --description="My Smart Contract" --author="John Doe" --license=Apache-2.0 2>&1`;
        try {
            const yoFabricOut = await CommandUtil.sendCommand(yoFabricCmd, folderPath);
            outputAdapter.log(yoFabricOut);
            outputAdapter.log('Successfully generated smart contract project');
        } catch (error) {
            console.log('found issue running yo:fabric command:', error);
            window.showErrorMessage('Issue creating smart contract project');
            outputAdapter.log(error);
        }

    } // end of if folderSelect

} // end of createSmartContractProject function

export async function getSmartContractLanguageOptions(): Promise<string[]> {
    const yoFabricChild: child_process.ChildProcess = await child_process.spawn('/bin/sh', ['-c', 'yo fabric:contract < /dev/null']);
    return new Promise<string[]>((resolve, reject) => {
        yoFabricChild.on('exit', (returnCode: number) => {
            const stdout: Buffer = yoFabricChild.stdout.read();
            if (returnCode) {
                return reject(new Error(`yo fabric: contract failed to run with return code ${returnCode}`));
            } else if (stdout) {
                const smartContractLanguageArray: string[] = stdout.toString().split('\n');
                smartContractLanguageArray.shift();
                const cleanSmartContractLangaugeArray: string[] = [];
                for (const language of smartContractLanguageArray) {
                    if (language !== '') {
                        // Grab the first word in the string and remove non-word characters
                        const regex: RegExp = /^[^\w]*([\w]+)/g;
                        const regexMatchArray: RegExpMatchArray = regex.exec(language);
                        cleanSmartContractLangaugeArray.push(regexMatchArray[1]);
                    }
                }
                console.log('printing available contract languages from yo fabric:contract output:', cleanSmartContractLangaugeArray);
                return resolve(cleanSmartContractLangaugeArray);
            } else {
                return reject(new Error(`Failed to get output from yo fabric:contract`));
            }
        });
    });
}
