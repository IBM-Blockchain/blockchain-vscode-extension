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
import { UserInputUtil } from './UserInputUtil';
import { PackageTreeItem } from '../explorer/model/PackageTreeItem';
import * as myExtension from '../extension';
import * as fs from 'fs-extra';
import * as homeDir from 'home-dir';
import { CommandUtil } from '../util/CommandUtil';
import { PackageRegistryManager } from '../explorer/packages/PackageRegistryManager';
import { PackageRegistryEntry } from '../explorer/packages/PackageRegistryEntry';

export async function deleteSmartContractPackage(packageTreeItem: PackageTreeItem): Promise<{} | void> {
    console.log('deleteSmartContractPackage');
    let packagesToDelete: string[];
    if (packageTreeItem) {
        packagesToDelete = [packageTreeItem.name];
     } else {
        packagesToDelete = await UserInputUtil.showSmartContractPackagesQuickPickBox('Choose the smart contract package(s) that you want to delete');
    }

    if (packagesToDelete === undefined) {
        return;
    }

    const packageRegistryManager: PackageRegistryManager = new PackageRegistryManager();

    for (const _package of packagesToDelete) {
        await packageRegistryManager.delete(_package);
    }

    return vscode.commands.executeCommand('blockchainAPackageExplorer.refreshEntry');
}
