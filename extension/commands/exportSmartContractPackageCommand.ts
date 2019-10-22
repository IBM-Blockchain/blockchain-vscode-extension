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
import { IBlockchainQuickPickItem, UserInputUtil } from './UserInputUtil';
import { PackageTreeItem } from '../explorer/packageModel/PackageTreeItem';
import { PackageRegistryEntry } from '../registries/PackageRegistryEntry';
import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../logging/OutputAdapter';

export async function exportSmartContractPackage(packageTreeItem?: PackageTreeItem): Promise<void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, 'exportSmartContractPackage');
    try {

        let packageToExport: PackageRegistryEntry;
        if (packageTreeItem) {
            packageToExport = packageTreeItem.packageEntry;
        } else {
            const chosenPackage: IBlockchainQuickPickItem<PackageRegistryEntry> = await UserInputUtil.showSmartContractPackagesQuickPickBox('Choose the smart contract package that you want to export', false) as IBlockchainQuickPickItem<PackageRegistryEntry>;
            if (!chosenPackage) {
                return;
            }
            packageToExport = chosenPackage.data;
        }
        const defaultPath: string = path.join(os.homedir(), `${packageToExport.name}@${packageToExport.version}.cds`);
        const packageUri: vscode.Uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file(defaultPath),
            saveLabel: 'Export'
        });
        if (!packageUri) {
            return;
        }
        await fs.copy(packageToExport.path, packageUri.fsPath, { overwrite: true });
        outputAdapter.log(LogType.SUCCESS, `Exported smart contract package ${packageToExport.name}@${packageToExport.version} to ${packageUri.fsPath}.`);
        Reporter.instance().sendTelemetryEvent('exportSmartContractPackageCommand');
    } catch (error) {
        outputAdapter.log(LogType.ERROR, error.message, error.toString());
    }
}
