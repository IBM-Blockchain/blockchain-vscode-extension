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
import { UserInputUtil, IBlockchainQuickPickItem } from './UserInputUtil';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs-extra';
import { LogType } from '../logging/OutputAdapter';
import { GatewayTreeItem } from '../explorer/model/GatewayTreeItem';
import { FabricGatewayRegistryEntry } from '../fabric/FabricGatewayRegistryEntry';
import { FabricGatewayHelper } from '../fabric/FabricGatewayHelper';
import { FabricConnectionManager } from '../fabric/FabricConnectionManager';

export async function exportConnectionProfile(gatewayTreeItem: GatewayTreeItem, isConnected?: boolean): Promise<void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, 'exportConnectionProfileCommand');

    let gatewayEntry: FabricGatewayRegistryEntry;
    if (isConnected) {
        const connectedGateway: FabricGatewayRegistryEntry = FabricConnectionManager.instance().getGatewayRegistryEntry();
        gatewayEntry = connectedGateway;

    } else if (!gatewayTreeItem) {
        const chosenGateway: IBlockchainQuickPickItem<FabricGatewayRegistryEntry> = await UserInputUtil.showGatewayQuickPickBox('Choose a gateway to export a connection profile from', false, true, true) as IBlockchainQuickPickItem<FabricGatewayRegistryEntry>;
        if (!chosenGateway) {
            return;
        }

        gatewayEntry = chosenGateway.data;

    } else {
        gatewayEntry = gatewayTreeItem.gateway;
    }

    // Ask the user where they want to export it to
    // set the default path to be the first open workspace folder
    let defaultPath: string;
    const fileName: string = `${gatewayEntry.name}_connection.json`;
    const workspaceFolders: Array<vscode.WorkspaceFolder> = UserInputUtil.getWorkspaceFolders();
    if (workspaceFolders.length > 0) {
        defaultPath = path.join(workspaceFolders[0].uri.fsPath, fileName);
    } else {
        defaultPath = path.join(os.homedir(), fileName);
    }

    const chosenPathUri: vscode.Uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(defaultPath),
        saveLabel: 'Export'
    });
    if (!chosenPathUri) {
        // User cancelled save dialog box
        return;
    }

    // Copy the connection profile to the chosen location
    try {
        const connectionProfilePath: string = await FabricGatewayHelper.getConnectionProfilePath(gatewayEntry.name);
        await fs.copy(connectionProfilePath, chosenPathUri.fsPath);
    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Issue exporting connection profile: ${error.message}`, `Issue exporting connection profile: ${error.toString()}`);
        return;
    }
    outputAdapter.log(LogType.SUCCESS, `Successfully exported connection profile to ${chosenPathUri.fsPath}`);
    Reporter.instance().sendTelemetryEvent('exportConnectionProfileCommand');
}
