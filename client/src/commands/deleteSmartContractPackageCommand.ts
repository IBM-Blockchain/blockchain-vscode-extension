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
import { UserInputUtil } from './userInputUtil';
import { PackageTreeItem } from '../explorer/model/PackageTreeItem';
import * as myExtension from '../extension';
import * as fs from 'fs-extra';
import * as homeDir from 'home-dir';
import { CommandUtil } from '../util/CommandUtil';

export async function deleteSmartContractPackage(packageTreeItem: PackageTreeItem): Promise<{} | void> {
    console.log('deleteSmartContractPackage');

    let packageToDelete: string | string[];

    if (packageTreeItem) {
        packageToDelete = [packageTreeItem.name];

    } else {
        packageToDelete = await UserInputUtil.showSmartContractPackagesQuickPickBox('Choose the smart contract package(s) that you want to delete');
    }

    const packages: string[] = await CommandUtil.getPackages();

    if (packageToDelete === undefined) {
        return;
    }

    let packageDir: string = vscode.workspace.getConfiguration().get('fabric.package.directory');

    if (packageDir.startsWith('~')) {
        // Remove tilda and replace with home dir
        packageDir = homeDir(packageDir.replace('~', ''));
    }

    for (const _package of packages) {
        if (packageToDelete.includes(_package)) {
            await fs.remove(packageDir + '/' + _package);
        }
    }

    return vscode.commands.executeCommand('blockchainAPackageExplorer.refreshEntry');
}
