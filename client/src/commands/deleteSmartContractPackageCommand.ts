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

    let index: number;
    let deleteObject: object; // Used for mapping packages to their deletion status
    let objectKeys: string[] = []; // Array of deleteObject keys

    if (packageTreeItem) {
        packageToDelete = packageTreeItem.name;
    } else {
        packageToDelete = await UserInputUtil.showSmartContractPackagesQuickPickBox('Choose the smart contract package that you want to delete');
    }

    const packages: string[] = await CommandUtil.getPackages();

    if (packageToDelete === undefined) {
        return;
    }

    if (typeof packageToDelete === 'string') {
        index = packages.findIndex((_package) => {
            return _package === packageToDelete;
        });
    } else {
        deleteObject = {}; // tslint:disable-line

        for (let x = 0; x < packages.length; x++) {
            deleteObject[x] = packageToDelete.indexOf(packages[x]);
        }

        objectKeys = Object.keys(deleteObject);

    }

    let packageDir: string = vscode.workspace.getConfiguration().get('fabric.package.directory');

    if (packageDir.startsWith('~')) {
        // Remove tilda and replace with home dir
        packageDir = homeDir(packageDir.replace('~', ''));
    }

    if (objectKeys.length > 0) {
        for (const key of objectKeys) {
            if (deleteObject[key] > -1) {
                console.log('Deleting', packageDir + '/' + packages[key]);
                await fs.remove(packageDir + '/' + packages[key]);
            }
        }
    }

    if (index > -1) {
        console.log('Deleting', packageDir + '/' + packages[index]);

        await fs.remove(packageDir + '/' + packages[index]);
    }

    return vscode.commands.executeCommand('blockchainAPackageExplorer.refreshEntry');
}
