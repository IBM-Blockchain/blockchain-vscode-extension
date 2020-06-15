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
import { Reporter } from '../util/Reporter';
import { UserInputUtil } from './UserInputUtil';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { LogType, FileSystemUtil } from 'ibm-blockchain-platform-common';
import { ExtensionCommands } from '../../ExtensionCommands';
import { SettingConfigurations } from '../configurations';
import { DeployView } from '../webview/DeployView';

export async function importSmartContractPackageCommand(): Promise<void> {

    VSCodeBlockchainOutputAdapter.instance().log(LogType.INFO, undefined, 'Import smart contract package');

    const openDialogOptions: vscode.OpenDialogOptions = {
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        openLabel: 'Select',
        // TODO put this back in when vscode fix a bug with filters
        // filters: { Packages: ['tar.gz', 'tgz'] }
    };

    const packagePath: string = await UserInputUtil.browse('Browse for a package to import', UserInputUtil.BROWSE_LABEL, openDialogOptions) as string;

    if (!packagePath) {
        return;
    }

    try {
        const extDir: string = SettingConfigurations.getExtensionDir();
        const pkgDir: string = path.join(extDir, 'packages');
        const resolvedPkgDir: string = FileSystemUtil.getDirPath(pkgDir);
        await fs.ensureDir(resolvedPkgDir);

        const packageName: string = path.basename(packagePath);

        const resolvedPkgPath: string = path.join(resolvedPkgDir, packageName);

        const nameRegex: RegExp = new RegExp(/^(.+?)(\.tar\.gz|\.tgz)$/);

        const result: RegExpExecArray = nameRegex.exec(packageName);

        if (!result) {
            throw new Error('Incorrect file type, file extension must be "tar.gz" or "tgz"');
        }

        const newName: string = result[1];

        let existingPackages: string[] = await fs.readdir(resolvedPkgDir);

        existingPackages = existingPackages.filter((name: string) => {
            const existingName: RegExpExecArray = nameRegex.exec(name);

            if (!existingName) {
                return false;
            }

            return newName === existingName[1];
        });

        const bypassOverwriteWarning: boolean = vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_PACKAGE_OVERWRITE_WARNING);
        if (existingPackages.length > 0 && bypassOverwriteWarning) {

            const warnOverwrite: vscode.MessageItem = await vscode.window.showWarningMessage(`${newName} already exists. Would you like to replace the existing package? (You can set 'ibm-blockchain-platform.ext.showWarningOnPackageOverwrite: false' to make this the default).`, { title: UserInputUtil.OPEN_SETTINGS }, { title: UserInputUtil.CANCEL }, { title: UserInputUtil.REPLACE });
            if (warnOverwrite) {
                if (warnOverwrite.title === UserInputUtil.OPEN_SETTINGS) {
                    await UserInputUtil.openUserSettings();
                    return;
                } else if (warnOverwrite.title === UserInputUtil.CANCEL) {
                    return;
                }
            } else {
                return;
            }
        }

        await fs.copy(packagePath, resolvedPkgPath);
        await vscode.commands.executeCommand(ExtensionCommands.REFRESH_PACKAGES);

        const panel: vscode.WebviewPanel = DeployView.panel;
        if (panel) {
           await DeployView.updatePackages();
        }

        VSCodeBlockchainOutputAdapter.instance().log(LogType.SUCCESS, 'Successfully imported smart contract package', `Successfully imported smart contract package ${packageName}`);
        Reporter.instance().sendTelemetryEvent('importSmartContractPackageCommand');
    } catch (error) {
        VSCodeBlockchainOutputAdapter.instance().log(LogType.ERROR, `Failed to import smart contract package: ${error.message}`, `Failed to import smart contract package: ${error}`);
    }
}
