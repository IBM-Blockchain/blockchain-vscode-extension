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
import { ParsedCertificate } from '../fabric/ParsedCertificate';
import { FabricRuntimeRegistry } from '../fabric/FabricRuntimeRegistry';
import { FabricRuntimeRegistryEntry } from '../fabric/FabricRuntimeRegistryEntry';
import { PackageRegistryManager } from '../explorer/packages/PackageRegistryManager';
import { PackageRegistryEntry } from '../explorer/packages/PackageRegistryEntry';

export class UserInputUtil {

    static readonly ADD_TO_WORKSPACE = 'Add to workspace';
    static readonly OPEN_IN_CURRENT_WINDOW = 'Open in current window';
    static readonly OPEN_IN_NEW_WINDOW = 'Open in new window';
    static readonly YES = 'yes';
    static readonly NO = 'no';

    static showConnectionQuickPickBox(prompt: string): Thenable<string | undefined> {
        const connections: Array<any> = vscode.workspace.getConfiguration().get('fabric.connections');

        const quickPickOptions = {
            ignoreFocusOut: false,
            canPickMany: false,
            placeHolder: prompt
        };

        const connectionNames: Array<string> = [];

        connections.forEach((connection) => {
            connectionNames.push(connection.name);
        });

        return vscode.window.showQuickPick(connectionNames, quickPickOptions);
    }

    static showInputBox(question: string): Thenable<string | undefined> {
        const inputBoxOptions = {
            prompt: question
        };
        return vscode.window.showInputBox(inputBoxOptions);
    }

    static showIdentityConnectionQuickPickBox(prompt: string, connection: any): Thenable<string | undefined> {

        const quickPickOptions = {
            ignoreFocusOut: false,
            canPickMany: false,
            placeHolder: prompt
        };

        const identityNames: Array<string> = [];

        connection.identities.forEach((identity) => {
            const parsedCert: any = new ParsedCertificate(identity.certificatePath);
            identityNames.push(parsedCert.getCommonName());
        });

        return vscode.window.showQuickPick(identityNames, quickPickOptions);
    }

    static showRuntimeQuickPickBox(prompt: string): Thenable<string | undefined> {
        const runtimes: FabricRuntimeRegistryEntry[] = FabricRuntimeRegistry.instance().getAll();
        const runtimeNames: string[] = runtimes.map((runtime: FabricRuntimeRegistryEntry) => runtime.name);

        const quickPickOptions = {
            ignoreFocusOut: false,
            canPickMany: false,
            placeHolder: prompt
        };

        return vscode.window.showQuickPick(runtimeNames, quickPickOptions);
    }

    static async showSmartContractPackagesQuickPickBox(prompt: string): Promise<string[] | undefined> {
        const packageRegistryManager: PackageRegistryManager = new PackageRegistryManager();

        const packages: PackageRegistryEntry[] = await packageRegistryManager.getAll();
        const quickPickOptions: vscode.QuickPickOptions = {
           ignoreFocusOut: false,
           canPickMany: true,
           placeHolder: prompt
       };

        const packageNames = [];

        packages.forEach((_package) => {
           packageNames.push(_package.name);
       });

        return vscode.window.showQuickPick(packageNames, quickPickOptions);
    }

    static showFolderOptions(prompt: string): Thenable<string | undefined> {
        const options: Array<string> = [this.ADD_TO_WORKSPACE, this.OPEN_IN_NEW_WINDOW, this.OPEN_IN_CURRENT_WINDOW];

        const quickPickOptions = {
            ignoreFocusOut: true,
            canPickMany: false,
            placeHolder: prompt
        };

        return vscode.window.showQuickPick(options, quickPickOptions);
    }

    static showQuickPickYesNo(prompt: string): Thenable<string | undefined> {
        const options: Array<string> = [this.YES, this.NO];

        const quickPickOptions = {
            ignoreFocusOut: true,
            canPickMany: false,
            placeHolder: prompt
        };

        return vscode.window.showQuickPick(options, quickPickOptions);
    }
}
