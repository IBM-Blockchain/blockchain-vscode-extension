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
import { IBlockchainQuickPickItem, UserInputUtil } from './UserInputUtil';
import { PackageTreeItem } from '../explorer/model/PackageTreeItem';
import { PackageRegistry } from '../packages/PackageRegistry';
import { PackageRegistryEntry } from '../packages/PackageRegistryEntry';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../logging/OutputAdapter';
import { ExtensionCommands } from '../../ExtensionCommands';

export async function deleteSmartContractPackage(packageTreeItem: PackageTreeItem): Promise<{} | void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, `deleteSmartContractPackage`);
    let packagesToDelete: PackageRegistryEntry[];
    if (packageTreeItem) {
        packagesToDelete = [packageTreeItem.packageEntry];
    } else {
        const chosenPackages: IBlockchainQuickPickItem<PackageRegistryEntry>[] = await UserInputUtil.showSmartContractPackagesQuickPickBox('Choose the smart contract package(s) that you want to delete', true) as IBlockchainQuickPickItem<PackageRegistryEntry>[];
        if (!chosenPackages || chosenPackages.length === 0) {
            // If the user cancels, or they do not select any packages to delete
            return;
        }

        packagesToDelete = chosenPackages.map((_package: IBlockchainQuickPickItem<PackageRegistryEntry>) => {
            return _package.data;
        });
    }

    const areYouSure: boolean = await UserInputUtil.showConfirmationWarningMessage(`This will delete the selected package(s) from your file system. Do you want to continue?`);

    if (areYouSure) {
        const packageRegistry: PackageRegistry = PackageRegistry.instance();

        for (const _package of packagesToDelete) {
            await packageRegistry.delete(_package);
        }

        await vscode.commands.executeCommand(ExtensionCommands.REFRESH_PACKAGES);

        outputAdapter.log(LogType.SUCCESS, `Succesfully deleted package(s)`);
    }
}
