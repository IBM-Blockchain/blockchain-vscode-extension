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

import * as homeDir from 'home-dir';
import * as vscode from 'vscode';

export class FileSystemUtil {

    /**
     * Method to replace ~ with OS's home directory, of a path
     * @param {String} dir String containing path
     * @returns {String} Returns dir.
     *
     */
    public static getDirPath(dir: string): string {
        if (dir.startsWith('~')) {
            dir = homeDir(dir.replace('~', ''));
        }
        return dir;
    }

    public static async readFile(path: vscode.Uri): Promise<string> {
        const contents: Uint8Array = await vscode.workspace.fs.readFile(path);
        return contents.toString();
    }

    public static async readJSONFile(path: vscode.Uri): Promise<any> {
        const contentString: string = await FileSystemUtil.readFile(path);
        return JSON.parse(contentString);
    }
}
