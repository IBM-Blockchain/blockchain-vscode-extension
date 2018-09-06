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
import * as myExtension from '../../src/extension';
import { PackageTreeItem } from '../explorer/model/PackageTreeItem';

export class CommandsUtil {

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

    static async showSmartContractPackagesQuickPickBox(prompt: string): Promise<string | undefined> {
        const blockchainPackageExplorerProvider = myExtension.getBlockchainPackageExplorerProvider();

        const projects: Array<PackageTreeItem> = await blockchainPackageExplorerProvider.getChildren();

        const quickPickOptions = {
            ignoreFocusOut: false,
            canPickMany: false,
            placeHolder: prompt
        };

        const projectNames = [];

        projects.forEach((project) => {
            projectNames.push(project.name);
        });

        return vscode.window.showQuickPick(projectNames, quickPickOptions);
    }

}
