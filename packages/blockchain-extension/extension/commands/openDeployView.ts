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
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { LogType, FabricEnvironmentRegistryEntry, IFabricEnvironmentConnection } from 'ibm-blockchain-platform-common';
import { DeployView } from '../webview/DeployView';
import { GlobalState } from '../util/GlobalState';
import { UserInputUtil, IBlockchainQuickPickItem } from './UserInputUtil';
import { FabricEnvironmentManager } from '../fabric/environments/FabricEnvironmentManager';
import { ExtensionCommands } from '../../ExtensionCommands';

export async function openDeployView(): Promise<void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();

    try {

        // Select environment
        const _chosenEnvironment: IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry> =  await UserInputUtil.showFabricEnvironmentQuickPickBox('Select an environment', false, false) as IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>;
        if (!_chosenEnvironment) {
            return;
        }

        const selectedEnvironmentName: string = _chosenEnvironment.label;

        let connection: IFabricEnvironmentConnection = FabricEnvironmentManager.instance().getConnection();

        if (connection) {
            // Check we're connected to the selected environment
            const connectedName: string = connection.environmentName;
            if (connectedName !== selectedEnvironmentName) {
                // If we're not connected to the selected environment we should disconnect, then connect to the correct environment.
                await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT_ENVIRONMENT);
                await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT, _chosenEnvironment.data);
                connection = FabricEnvironmentManager.instance().getConnection();
            }
        } else {
            await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT, _chosenEnvironment.data);
            connection = FabricEnvironmentManager.instance().getConnection();
        }

        if (!connection) {
            // This can occur if the runtime isn't running, then gets started by the connect, but it fails.
            throw new Error(`Unable to connect to environment: ${selectedEnvironmentName}`);
        }

        // Select environment's channel

        const _chosenChannel: IBlockchainQuickPickItem<Array<string>> = await UserInputUtil.showChannelQuickPickBox('Select a channel');
        if (!_chosenChannel) {
            return;
        }

        const selectedChannelName: string = _chosenChannel.label;

        const appState: {channelName: string, environmentName: string} = {
            channelName: selectedChannelName,
            environmentName: selectedEnvironmentName
        };

        const context: vscode.ExtensionContext = GlobalState.getExtensionContext();

        const deployView: DeployView = new DeployView(context, appState);
        await deployView.openView(true);

    } catch (error) {
        outputAdapter.log(LogType.ERROR, error.message, error.toString());
    }
}
