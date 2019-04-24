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
import { UserInputUtil, IBlockchainQuickPickItem } from './UserInputUtil';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../logging/OutputAdapter';
import { FabricGatewayRegistryEntry } from '../fabric/FabricGatewayRegistryEntry';
import { GatewayTreeItem } from '../explorer/model/GatewayTreeItem';

export async function editGatewayCommand(treeItem: GatewayTreeItem): Promise<void> {

    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, `editGateway`);

    let gateway: FabricGatewayRegistryEntry;

    if (!treeItem) {
        // If called from command palette
        // Ask for gateway
        const chosenGateway: IBlockchainQuickPickItem<FabricGatewayRegistryEntry> = await UserInputUtil.showGatewayQuickPickBox('Choose the gateway that you want to edit', false);
        if (!chosenGateway) {
            return;
        }
        gateway = chosenGateway.data;
    } else {
        // If called using tree item
        gateway = treeItem.gateway;

    }
    await UserInputUtil.openUserSettings(gateway.name);
    return;

}
