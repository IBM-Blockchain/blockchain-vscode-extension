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
import * as path from 'path';
import * as vscode from 'vscode';
import { ExtensionUtil } from '../util/ExtensionUtil';
import { LogType } from 'ibm-blockchain-platform-common';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';

export async function openReleaseNotes(): Promise<void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, `openReleaseNotes`);

    try {
        // Open up Release Notes markdown
        const getExtensionPath: string = ExtensionUtil.getExtensionPath();
        const releaseNotes: string = path.join(getExtensionPath, 'RELEASE-NOTES.md');
        const uri: vscode.Uri = vscode.Uri.file(releaseNotes);

        await vscode.commands.executeCommand('markdown.showPreview', uri);
    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Unable to open release notes: ${error.toString()}`);
    }
}
