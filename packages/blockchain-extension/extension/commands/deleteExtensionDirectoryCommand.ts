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
import { ExtensionCommands } from '../../ExtensionCommands';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { FabricEnvironmentRegistryEntry, LogType, FabricEnvironmentRegistry, EnvironmentType } from 'ibm-blockchain-platform-common';
import { SettingConfigurations } from '../../configurations';
import { UserInputUtil } from './UserInputUtil';

export async function deleteExtensionDirectory(): Promise<void> {

    try {
        const confirmed: boolean = await UserInputUtil.showConfirmationWarningMessage(`This will delete the extension directory. Do you want to continue?`);
        if (!confirmed) {
            return;
        }
        const environments: FabricEnvironmentRegistryEntry[] = await FabricEnvironmentRegistry.instance().getAll(true);
        for (const environment of environments) {
            if (environment.environmentType === EnvironmentType.LOCAL_ENVIRONMENT) {
                await vscode.commands.executeCommand(ExtensionCommands.TEARDOWN_FABRIC, undefined, true, environment.name);
                await FabricEnvironmentRegistry.instance().delete(environment.name);
            }
        }
        const extDir: string = vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_DIRECTORY);
        await fs.remove(extDir);
        await vscode.commands.executeCommand('workbench.action.reloadWindow');
    } catch (error) {
        VSCodeBlockchainOutputAdapter.instance().log(LogType.ERROR, `Error deleting directory: ${error.message}`, `Error deleting directory: ${error.toString()}`);
    }
}
