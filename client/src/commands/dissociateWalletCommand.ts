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
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { GatewayAssociatedTreeItem } from '../explorer/model/GatewayAssociatedTreeItem';
import { LogType } from '../logging/OutputAdapter';
import { FabricGatewayRegistryEntry } from '../fabric/FabricGatewayRegistryEntry';
import { IBlockchainQuickPickItem, UserInputUtil } from './UserInputUtil';
import { FabricGatewayRegistry } from '../fabric/FabricGatewayRegistry';

export async function dissociateWallet(associatedGatewayTreeItem: GatewayAssociatedTreeItem): Promise<any> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, 'dissociateWallet');

    let gateway: FabricGatewayRegistryEntry;

    if (!associatedGatewayTreeItem) {
        // If called from command palette

        // Ask for gateway
        const chosenGateway: IBlockchainQuickPickItem<FabricGatewayRegistryEntry> = await UserInputUtil.showGatewayQuickPickBox('Pick a gateway to dissociate a wallet for', false, true);
        if (!chosenGateway) {
            return;
        }
        gateway = chosenGateway.data;
    } else {
        // If called using tree item
        gateway = associatedGatewayTreeItem.gateway;
    }

    try {
        // Dissociate the wallet by setting to an empty string

        const fabricGatewayRegistry: FabricGatewayRegistry = FabricGatewayRegistry.instance();
        gateway.associatedWallet = '';
        await fabricGatewayRegistry.update(gateway);
    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Unable to dissociate wallet: ${error.message}`, `Unable to dissociate wallet: ${error.toString()}`);
        throw new Error(`Unable to dissociate wallet: ${error.message}`);

    }

    outputAdapter.log(LogType.SUCCESS, `Successfully dissociated wallet from "${gateway.name}" gateway`);

}
