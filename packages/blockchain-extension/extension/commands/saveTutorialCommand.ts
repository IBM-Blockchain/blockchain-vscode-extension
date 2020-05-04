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
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { LogType } from 'ibm-blockchain-platform-common';
import { ExtensionUtil } from '../util/ExtensionUtil';

export async function saveTutorial(tutorialObject: any, saveAll?: boolean, tutorialFolder?: string): Promise<void> {

    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, 'saveTutorial');
    try {

        let packageUri: vscode.Uri;
        let folderPath: string;
        let defaultPath: string;
        let fileName: string;
        const extensionPath: string = ExtensionUtil.getExtensionPath();

        if (saveAll) {
            folderPath = path.join(extensionPath, 'tutorials', 'new-tutorials', tutorialFolder, 'pdf');
            defaultPath = path.join(os.homedir(), tutorialFolder);
            packageUri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file(defaultPath)
            });

            if (!packageUri) {
                return;
            }

            await fs.copy(folderPath, packageUri.fsPath);
            outputAdapter.log(LogType.SUCCESS, `Downloaded all ${tutorialFolder} to ${packageUri.fsPath}.`);
        } else {
            const pathToFolder: string = (tutorialObject.file).substring(0, tutorialObject.file.lastIndexOf('/'));
            folderPath = path.join(extensionPath, 'tutorials', pathToFolder, 'pdf');
            const tutorialPDF: string = tutorialObject.title.split(':')[0].toLocaleLowerCase();
            const pdfPath: string = path.join(folderPath, `${tutorialPDF}.pdf`);

            fileName = `${tutorialPDF}.pdf`;
            defaultPath = path.join(os.homedir(), fileName);

            packageUri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file(defaultPath)
            });

            if (!packageUri) {
                return;
            }

            await fs.copy(pdfPath, packageUri.fsPath);
            outputAdapter.log(LogType.SUCCESS, `Downloaded tutorial ${tutorialPDF}.pdf to ${packageUri.fsPath}.`);
        }

        Reporter.instance().sendTelemetryEvent('saveTutorialCommand');
    } catch (error) {
        outputAdapter.log(LogType.ERROR, error.message, error.toString());
    }
}
