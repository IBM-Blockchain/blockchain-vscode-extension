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
import { Reporter } from '../util/Reporter';
import { IBlockchainQuickPickItem, UserInputUtil } from './UserInputUtil';
import { PackageTreeItem } from '../explorer/model/PackageTreeItem';
import { PackageRegistryEntry } from '../registries/PackageRegistryEntry';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { LogType } from 'ibm-blockchain-platform-common';

export async function viewPackageInformation(packageTreeItem?: PackageTreeItem): Promise<void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, 'viewPackageInformation');
    try {

        let packageToView: PackageRegistryEntry;
        if (packageTreeItem) {
            packageToView = packageTreeItem.packageEntry;
        } else {
            const chosenPackage: IBlockchainQuickPickItem<PackageRegistryEntry> = await UserInputUtil.showSmartContractPackagesQuickPickBox('Choose the smart contract package that you want to view information for', false) as IBlockchainQuickPickItem<PackageRegistryEntry>;
            if (!chosenPackage) {
                return;
            }
            packageToView = chosenPackage.data;
        }

        let fileNames: string[];
        try {
            const { ListFilesInPackage } = await import('ibm-blockchain-platform-environment-v1');
            fileNames = await ListFilesInPackage.listFiles(packageToView.path);
            outputAdapter.log(LogType.INFO, undefined, `Found ${fileNames.length} file(s) in smart contract package ${packageToView.name}@${packageToView.version}:`);
            for (const file of fileNames) {
                outputAdapter.log(LogType.INFO, undefined, `- ${file}`);
            }
            outputAdapter.show();
        } catch (error) {
            throw new Error(`Unable to extract file list from ${packageToView.name}@${packageToView.version}: ${error.message}`);
        }

        outputAdapter.log(LogType.SUCCESS, `Displayed information for smart contract package ${packageToView.name}@${packageToView.version}.`);
        Reporter.instance().sendTelemetryEvent('viewPackageInformationCommand');
    } catch (error) {
        outputAdapter.log(LogType.ERROR, error.message, error.toString());
    }
}
