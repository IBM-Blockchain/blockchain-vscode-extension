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
import * as yaml from 'js-yaml';
import { GatewayTreeItem } from '../explorer/model/GatewayTreeItem';
import { FabricGatewayHelper } from '../fabric/FabricGatewayHelper';
import { FabricGatewayConnectionManager } from '../fabric/FabricGatewayConnectionManager';
import { ConnectionProfileUtil, LogType, FabricGatewayRegistryEntry } from 'ibm-blockchain-platform-common';
import * as lodash from 'lodash';

export async function exportConnectionProfile(gatewayTreeItem: GatewayTreeItem, isConnected?: boolean): Promise<void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, 'exportConnectionProfileCommand');

    let gatewayEntry: FabricGatewayRegistryEntry;
    if (isConnected) {
        const connectedGateway: FabricGatewayRegistryEntry = await FabricGatewayConnectionManager.instance().getGatewayRegistryEntry();
        gatewayEntry = connectedGateway;

    } else if (!gatewayTreeItem) {
        const chosenGateway: IBlockchainQuickPickItem<FabricGatewayRegistryEntry> = await UserInputUtil.showGatewayQuickPickBox('Choose a gateway to export a connection profile from', false, true) as IBlockchainQuickPickItem<FabricGatewayRegistryEntry>;
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
    let fileName: string = gatewayEntry.name;
    const firstAlphaIndex: number = fileName.search(/[a-zA-Z]/);
    const beforeFirstAlpha: string = lodash.camelCase(fileName.substr(0, firstAlphaIndex)) + fileName.charAt(firstAlphaIndex).toUpperCase();
    fileName = beforeFirstAlpha + lodash.camelCase(fileName.slice(firstAlphaIndex + 1)) + `Connection.json`;
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

    try {
        const connectionProfilePath: string = await FabricGatewayHelper.getConnectionProfilePath(gatewayEntry);

        const connectionProfile: any = await ConnectionProfileUtil.readConnectionProfile(connectionProfilePath);
        delete connectionProfile.wallet;

        let connectionProfileData: any;
        if (connectionProfilePath.endsWith('.json')) {
            connectionProfileData = JSON.stringify(connectionProfile, null, 4);
        } else {
            // Assume its a yml/yaml file type
            connectionProfileData = yaml.dump(connectionProfile);
        }

        await fs.writeFile(chosenPathUri.fsPath, connectionProfileData);
    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Issue exporting connection profile: ${error.message}`, `Issue exporting connection profile: ${error.toString()}`);
        return;
    }
    outputAdapter.log(LogType.SUCCESS, `Successfully exported connection profile to ${chosenPathUri.fsPath}`);
    Reporter.instance().sendTelemetryEvent('exportConnectionProfileCommand');
}
