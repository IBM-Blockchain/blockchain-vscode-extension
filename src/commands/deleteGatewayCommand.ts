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
import { SettingConfigurations } from '../../SettingConfigurations';
import { FabricRuntimeUtil } from '../fabric/FabricRuntimeUtil';

export async function deleteGateway(gatewayTreeItem: GatewayTreeItem): Promise<void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, `deleteGateway`);
    let gatewaysToDelete: FabricGatewayRegistryEntry[];

    if (!gatewayTreeItem) {
        // If called from command palette
        // Ask for gateway to delete
        // First check there is at least one that isn't local_fabric
        let gateways: Array<FabricGatewayRegistryEntry> = [];
        gateways = FabricGatewayRegistry.instance().getAll();
        if (gateways.length === 0) {
            outputAdapter.log(LogType.ERROR, `No gateways to delete. ${FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME} cannot be deleted.`, `No gateways to delete. ${FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME} cannot be deleted.`);
            return;
        }

        const chosenGateway: IBlockchainQuickPickItem<FabricGatewayRegistryEntry>[] = await UserInputUtil.showGatewayQuickPickBox('Choose the gateway(s) that you want to delete', true, false) as IBlockchainQuickPickItem<FabricGatewayRegistryEntry>[];
        if (!chosenGateway || chosenGateway.length === 0) {
            return;
        }
        gatewaysToDelete = chosenGateway.map((_gateway: IBlockchainQuickPickItem<FabricGatewayRegistryEntry>) => {
            return _gateway.data;
        });

    } else {
        gatewaysToDelete = [gatewayTreeItem.gateway];
    }

    const reallyDoIt: boolean = await UserInputUtil.showConfirmationWarningMessage(`This will remove the gateway(s). Do you want to continue?`);
    if (!reallyDoIt) {
        return;
    }

    const extDir: string = vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_DIRECTORY);
    const homeExtDir: string = UserInputUtil.getDirPath(extDir);

    for (const _gateway of gatewaysToDelete) {
        const gatewayPath: string = path.join(homeExtDir, 'gateways', _gateway.name);
        await fs.remove(gatewayPath);
        await FabricGatewayRegistry.instance().delete(_gateway.name);
    }

    if (gatewaysToDelete.length > 1) {
        outputAdapter.log(LogType.SUCCESS, `Successfully deleted gateway(s)`);
        return;
    } else {
        outputAdapter.log(LogType.SUCCESS, `Successfully deleted ${gatewaysToDelete[0].name} gateway`);
        return;
    }

}
