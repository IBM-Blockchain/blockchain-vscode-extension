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
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../logging/OutputAdapter';
import { FabricGatewayRegistryEntry } from '../fabric/FabricGatewayRegistryEntry';
import { FabricGatewayHelper } from '../fabric/FabricGatewayHelper';
import { FabricGatewayRegistry } from '../fabric/FabricGatewayRegistry';
import { FabricWalletRegistryEntry } from '../fabric/FabricWalletRegistryEntry';
import { FabricWalletRegistry } from '../fabric/FabricWalletRegistry';
import { ExtensionCommands } from '../../ExtensionCommands';

export async function addGateway(): Promise<{} | void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    try {
        outputAdapter.log(LogType.INFO, undefined, 'addGateway');

        const gatewayName: string = await UserInputUtil.showInputBox('Enter a name for the gateway');
        if (!gatewayName) {
            return Promise.resolve();
        }

        // Create the connection immediately
        let fabricGatewayEntry: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
        fabricGatewayEntry.connectionProfilePath = FabricGatewayHelper.CONNECTION_PROFILE_PATH_DEFAULT;
        fabricGatewayEntry.name = gatewayName;
        fabricGatewayEntry.walletPath = FabricGatewayHelper.WALLET_PATH_DEFAULT;

        const fabricGatewayRegistry: FabricGatewayRegistry = FabricGatewayRegistry.instance();
        await fabricGatewayRegistry.add(fabricGatewayEntry);

        const fabricWalletRegistry: FabricWalletRegistry = FabricWalletRegistry.instance();
        const fabricWalletRegistryEntry: FabricWalletRegistryEntry = new FabricWalletRegistryEntry();
        fabricWalletRegistryEntry.name = fabricGatewayEntry.name;
        await fabricWalletRegistry.add(fabricWalletRegistryEntry);

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

        // Get the connection profile json file path
        const connectionProfilePath: string = await UserInputUtil.browseEdit('Enter a file path to a connection profile file', quickPickItems, openDialogOptions, gatewayName) as string;
        if (!connectionProfilePath) {
            return Promise.resolve();
        }

        // Copy the user given connection profile to the gateway directory (in the blockchain extension directory)
        fabricGatewayEntry.connectionProfilePath = await FabricGatewayHelper.copyConnectionProfile(gatewayName, connectionProfilePath);
        await fabricGatewayRegistry.update(fabricGatewayEntry);

        // Ask the user whether they want to provide a wallet or certficate and privateKey file paths
        const answer: string = await UserInputUtil.showAddIdentityOptionsQuickPick('Chose a method for importing identity to connect with:');
        if (!answer) {
            // User cancelled, so do nothing
            return Promise.resolve();
        } else if (answer === UserInputUtil.CERT_KEY) {

            fabricGatewayEntry = await vscode.commands.executeCommand(ExtensionCommands.ADD_GATEWAY_IDENTITY, fabricGatewayEntry) as FabricGatewayRegistryEntry;

            if (!fabricGatewayEntry) {
                return Promise.resolve();
            }
            await fabricGatewayRegistry.update(fabricGatewayEntry);
            fabricWalletRegistryEntry.walletPath = fabricGatewayEntry.walletPath;
            await fabricWalletRegistry.update(fabricWalletRegistryEntry);
            outputAdapter.log(LogType.SUCCESS, 'Successfully added a new gateway');

        } else {

            openDialogOptions.filters = undefined;
            openDialogOptions.canSelectFiles = false;
            openDialogOptions.canSelectFolders = true;
            // User has a wallet - get the path
            const walletPath: string = await UserInputUtil.browseEdit('Enter a file path to a wallet directory', quickPickItems, openDialogOptions, gatewayName) as string;
            if (!walletPath) {
                return Promise.resolve();
            }
            fabricGatewayEntry.walletPath = walletPath;
            await fabricGatewayRegistry.update(fabricGatewayEntry);

            fabricWalletRegistryEntry.walletPath = walletPath;
            await fabricWalletRegistry.update(fabricWalletRegistryEntry);

            outputAdapter.log(LogType.SUCCESS, 'Successfully added a new gateway');
        }
    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Failed to add a new connection: ${error.message}`, `Failed to add a new connection: ${error.toString()}`);
    }
}
