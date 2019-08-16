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
import { UserInputUtil } from './UserInputUtil';
import { Reporter } from '../util/Reporter';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../logging/OutputAdapter';
import { FabricGatewayRegistryEntry } from '../fabric/FabricGatewayRegistryEntry';
import { FabricGatewayHelper } from '../fabric/FabricGatewayHelper';
import { FabricGatewayRegistry } from '../fabric/FabricGatewayRegistry';
import { FabricRuntimeUtil } from '../fabric/FabricRuntimeUtil';

export async function addGateway(): Promise<{} | void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    try {
        outputAdapter.log(LogType.INFO, undefined, 'addGateway');

        const fabricGatewayRegistry: FabricGatewayRegistry = FabricGatewayRegistry.instance();

        const gatewayName: string = await UserInputUtil.showInputBox('Enter a name for the gateway');
        if (!gatewayName) {
            return;
        }

        if (fabricGatewayRegistry.exists(gatewayName) || gatewayName === FabricRuntimeUtil.LOCAL_FABRIC) {
            // Gateway already exists
            throw new Error('A gateway with this name already exists.');
        }

        const quickPickItems: string[] = [UserInputUtil.BROWSE_LABEL];
        const openDialogOptions: vscode.OpenDialogOptions = {
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            openLabel: 'Select',
            filters: {
                'Connection Profiles' : ['json', 'yaml', 'yml']
            }
        };

        // Get the connection profile json file path
        const connectionProfilePath: string = await UserInputUtil.browse('Enter a file path to a connection profile file', quickPickItems, openDialogOptions) as string;
        if (!connectionProfilePath) {
            return;
        }

        const fabricGatewayEntry: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
        // Copy the user given connection profile to the gateway directory (in the blockchain extension directory)
        fabricGatewayEntry.name = gatewayName;
        fabricGatewayEntry.connectionProfilePath = await FabricGatewayHelper.copyConnectionProfile(gatewayName, connectionProfilePath);
        fabricGatewayEntry.associatedWallet = '';
        await fabricGatewayRegistry.add(fabricGatewayEntry);

        outputAdapter.log(LogType.SUCCESS, 'Successfully added a new gateway');
        Reporter.instance().sendTelemetryEvent('addGatewayCommand');
    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Failed to add a new gateway: ${error.message}`, `Failed to add a new gateway: ${error.toString()}`);
    }
}
