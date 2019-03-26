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
import * as fs from 'fs-extra';
import * as path from 'path';
import { UserInputUtil } from './UserInputUtil';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../logging/OutputAdapter';
import { ExtensionCommands } from '../../ExtensionCommands';

export async function importSmartContractPackageCommand(): Promise<void> {

    VSCodeBlockchainOutputAdapter.instance().log(LogType.INFO, undefined, 'Import smart contract package');

    const quickPickItems: string[] = [UserInputUtil.BROWSE_LABEL];
    const openDialogOptions: vscode.OpenDialogOptions = {
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        openLabel: 'Select',
        filters: { Packages: ['cds'] }
    };

    const packagePath: string = await UserInputUtil.browse('Browse for a package to import', quickPickItems, openDialogOptions) as string;

    if (!packagePath) {
        return;
    }

    try {
        const extDir: string = vscode.workspace.getConfiguration().get('blockchain.ext.directory');
        const pkgDir: string = path.join(extDir, 'packages');
        let resolvedPkgDir: string = await UserInputUtil.getDirPath(pkgDir);
        await fs.ensureDir(resolvedPkgDir);

        const packageName: string = path.basename(packagePath);

        resolvedPkgDir = path.join(resolvedPkgDir, packageName);
        await fs.copyFile(packagePath, resolvedPkgDir);
        await vscode.commands.executeCommand(ExtensionCommands.REFRESH_PACKAGES);

        VSCodeBlockchainOutputAdapter.instance().log(LogType.SUCCESS, 'Successfully imported smart contract package', `Successfully imported smart contract package ${packageName}`);
    } catch (error) {
        VSCodeBlockchainOutputAdapter.instance().log(LogType.ERROR, `Failed to import smart contract package: ${error.message}`, `Failed to import smart contract package: ${error}`);
    }
}
