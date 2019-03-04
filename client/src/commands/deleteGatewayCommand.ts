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
import * as path from 'path';
import * as fs from 'fs-extra';
import { UserInputUtil, IBlockchainQuickPickItem } from './UserInputUtil';
import { FabricGatewayRegistryEntry } from '../fabric/FabricGatewayRegistryEntry';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../logging/OutputAdapter';
import { GatewayTreeItem } from '../explorer/model/GatewayTreeItem';
import { FabricGatewayRegistry } from '../fabric/FabricGatewayRegistry';

export async function deleteGateway(gatewayTreeItem: GatewayTreeItem): Promise<{} | void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, `deleteGateway`);
    let gatewayRegistryEntry: FabricGatewayRegistryEntry;
    if (!gatewayTreeItem) {
        const chosenGateway: IBlockchainQuickPickItem<FabricGatewayRegistryEntry> = await UserInputUtil.showGatewayQuickPickBox('Choose the gateway that you want to delete', false);
        if (!chosenGateway) {
            return;
        }

        gatewayRegistryEntry = chosenGateway.data;
    } else {
        gatewayRegistryEntry = gatewayTreeItem.gateway;
    }

    const reallyDoIt: boolean = await UserInputUtil.showConfirmationWarningMessage(`This will remove the gateway. Do you want to continue?`);
    if (!reallyDoIt) {
        return;
    }

    const extDir: string = vscode.workspace.getConfiguration().get('blockchain.ext.directory');
    const homeExtDir: string = await UserInputUtil.getDirPath(extDir);
    const gatewayPath: string = path.join(homeExtDir, gatewayRegistryEntry.name);
    await fs.remove(gatewayPath);

    await FabricGatewayRegistry.instance().delete(gatewayRegistryEntry.name);
    outputAdapter.log(LogType.SUCCESS, `Successfully deleted ${gatewayRegistryEntry.name} gateway`);
    return;
}
