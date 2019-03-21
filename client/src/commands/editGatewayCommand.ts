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
import { UserInputUtil, IBlockchainQuickPickItem } from './UserInputUtil';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../logging/OutputAdapter';
import { FabricGatewayRegistry } from '../fabric/FabricGatewayRegistry';
import { FabricGatewayRegistryEntry } from '../fabric/FabricGatewayRegistryEntry';
import { FabricGatewayHelper } from '../fabric/FabricGatewayHelper';
import { GatewayTreeItem } from '../explorer/model/GatewayTreeItem';
import { GatewayPropertyTreeItem } from '../explorer/model/GatewayPropertyTreeItem';

export async function editGatewayCommand(treeItem: GatewayPropertyTreeItem | GatewayTreeItem): Promise<{} | void> {

    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, `editGateway`);

    let gateway: FabricGatewayRegistryEntry;

    try {
        if (!treeItem) {
            // If called from command palette
            // Ask for gateway
            const chosenGateway: IBlockchainQuickPickItem<FabricGatewayRegistryEntry> = await UserInputUtil.showGatewayQuickPickBox('Choose the gateway that you want to edit', false);
            if (!chosenGateway) {
                return;
            }
            gateway = chosenGateway.data;

            // Check if the gateway is completed
            const completedGateway: boolean = FabricGatewayHelper.connectionProfilePathComplete(gateway);

            if (completedGateway) {
                // Open up the user settings
                await UserInputUtil.openUserSettings(gateway.name);
                return;
            }
        } else {
            // If called using tree item
            gateway = treeItem.gateway;
            // Get the name of the property the user clicked on
            if (!treeItem.label.includes('+')) {
                // If trying to edit an uncompleted connection by right-clicking and selecting 'Edit Connection'
                await UserInputUtil.openUserSettings(gateway.name);
                return;
            }
        }
        // Edit the connection profile
        // Do nothing if user cancels adding input
        await editConnectionProfile(gateway, outputAdapter);
    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Failed to edit gateway: ${error.message}`, `Failed to edit gateway: ${error.toString()}`);
        return;
    }

}

async function editConnectionProfile(gateway: FabricGatewayRegistryEntry, outputAdapter: VSCodeBlockchainOutputAdapter): Promise<void> {

    const quickPickItems: string[] = [UserInputUtil.BROWSE_LABEL, UserInputUtil.EDIT_LABEL];
    const openDialogOptions: vscode.OpenDialogOptions = {
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        openLabel: 'Select',
        filters: {
            'Connection Profiles' : ['json', 'yaml', 'yml']
        }
    };

    // Ask for connection profile
    const result: string = await UserInputUtil.browseEdit('Enter a file path to a connection profile file', quickPickItems, openDialogOptions, gateway.name) as string;
    if (!result) {
        return;
    }

    // Copy the user given connection profile to the gateway directory (in the blockchain extension directory)
    gateway.connectionProfilePath = await FabricGatewayHelper.copyConnectionProfile(gateway.name, result);
    const fabricGatewayRegistry: FabricGatewayRegistry = FabricGatewayRegistry.instance();
    await fabricGatewayRegistry.update(gateway);
    outputAdapter.log(LogType.SUCCESS, 'Successfully updated gateway');

}
