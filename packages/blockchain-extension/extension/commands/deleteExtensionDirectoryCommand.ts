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
import { FabricEnvironmentRegistryEntry, LogType, FabricEnvironmentRegistry, EnvironmentType, FabricGatewayRegistryEntry, FileSystemUtil } from 'ibm-blockchain-platform-common';
import { SettingConfigurations } from '../../configurations';
import { UserInputUtil } from './UserInputUtil';
import { FabricEnvironmentManager } from '../fabric/environments/FabricEnvironmentManager';
import { FabricGatewayConnectionManager } from '../fabric/FabricGatewayConnectionManager';

export async function deleteExtensionDirectory(): Promise<void> {

    try {
        const confirmed: boolean = await UserInputUtil.showConfirmationWarningMessage(`This will delete the extension directory. Do you want to continue?`);
        if (!confirmed) {
            return;
        }
        const environments: FabricEnvironmentRegistryEntry[] = await FabricEnvironmentRegistry.instance().getAll(true);

        try {
            const connectedGatewayRegistry: FabricGatewayRegistryEntry = await FabricGatewayConnectionManager.instance().getGatewayRegistryEntry();
            if (connectedGatewayRegistry) {
                await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT_GATEWAY);
            }
        } catch (error) {
            // ignore
        }

        try {
            const connectedEnvironmentRegistry: FabricEnvironmentRegistryEntry = FabricEnvironmentManager.instance().getEnvironmentRegistryEntry();
            if (connectedEnvironmentRegistry) {
                await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            }
        } catch (error) {
            // ignore
        }

        for (const environment of environments) {
            if (environment.environmentType === EnvironmentType.LOCAL_ENVIRONMENT) {
                try {
                    await vscode.commands.executeCommand(ExtensionCommands.TEARDOWN_FABRIC, undefined, true, environment.name);
                } catch (error) {
                    // ignore
                }
                try {
                    await FabricEnvironmentRegistry.instance().delete(environment.name);
                } catch (error) {
                    // ignore
                }
            }
        }
        const extDir: string = vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_DIRECTORY);
        const resolvedExtDir: string = FileSystemUtil.getDirPath(extDir);
        const exists: boolean = await fs.pathExists(resolvedExtDir);
        if (!exists) {
            throw new Error('Extension path not found');
        }
        await fs.remove(resolvedExtDir);
        await vscode.commands.executeCommand('workbench.action.reloadWindow');
    } catch (error) {
        VSCodeBlockchainOutputAdapter.instance().log(LogType.ERROR, `Error deleting directory: ${error.message}`, `Error deleting directory: ${error.toString()}`);
    }
}
