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

export class ExtensionUtil {

    public static getPackageJSON(): any {
        return this.getExtension().packageJSON;
    }

    public static isActive(): boolean {
        return this.getExtension().isActive;
    }

    public static activateExtension(): Thenable<void> {
        return this.getExtension().activate();
    }

    public static getExtensionPath(): string {
        return this.getExtension().extensionPath;
    }

    public static getExtensionContext(): vscode.ExtensionContext {
        return this.extensionContext;
    }

    public static setExtensionContext(context: vscode.ExtensionContext): void {
        this.extensionContext = context;
    }

    private static extensionContext: vscode.ExtensionContext;

    private static getExtension(): vscode.Extension<any> {
        return vscode.extensions.getExtension('IBM.ibm-blockchain');
    }
}
