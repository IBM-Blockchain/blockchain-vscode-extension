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
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricEnvironmentManager } from '../fabric/environments/FabricEnvironmentManager';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { IFabricEnvironmentConnection, LogType } from 'ibm-blockchain-platform-common';
import { FabricDebugConfigurationProvider } from '../debug/FabricDebugConfigurationProvider';

export async function debugCommandList(commandName?: string): Promise<void> {

    // Get the debug configuration
    const debugSession: vscode.DebugSession = vscode.debug.activeDebugSession;
    if (!debugSession || debugSession.configuration.debugEvent !== FabricDebugConfigurationProvider.debugEvent) {
        VSCodeBlockchainOutputAdapter.instance().log(LogType.ERROR, undefined, 'The current debug session is not debugging a smart contract, this command can only be run when debugging a smart contract');
        return;
    }
    const chaincodeContainerName: string = debugSession.configuration.env.CORE_CHAINCODE_ID_NAME;
    const smartContractName: string = chaincodeContainerName.split(':')[0];

    // Determine whether to show Instantiate or Upgrade command
    const connection: IFabricEnvironmentConnection = FabricEnvironmentManager.instance().getConnection();
    if (!connection) {
        VSCodeBlockchainOutputAdapter.instance().log(LogType.ERROR, undefined, 'No connection to a blockchain found');
        return;
    }
    const createChannelsResult: {channelMap: Map<string, string[]>, v2channels: string[]}  = await connection.createChannelMap();
    const channelMap: Map<string, string[]> = createChannelsResult.channelMap;
    // Assume local_fabric was one channel so just get the first
    const channelName: string = Array.from(channelMap.keys())[0];
    const peerNames: Array<string> = channelMap.get(channelName);

    if (!commandName) {
        // Always show Submit and Evaluate commands
        const commands: Array<{ name: string, command: string }> = [
            {
                name: 'Submit Transaction',
                command: ExtensionCommands.SUBMIT_TRANSACTION
            },
            {
                name: 'Evaluate Transaction',
                command: ExtensionCommands.EVALUATE_TRANSACTION
            }
        ];

        const chosenCommand: IBlockchainQuickPickItem<string> = await UserInputUtil.showDebugCommandList(commands, 'Choose a command to execute');
        if (!chosenCommand) {
            return;
        }

        commandName = chosenCommand.data;
    }

    if (commandName === ExtensionCommands.SUBMIT_TRANSACTION || commandName === ExtensionCommands.EVALUATE_TRANSACTION) {
        // Connect to the gateway for the org that was selected when debug was started.
        const connected: boolean = await FabricDebugConfigurationProvider.connectToGateway();
        if (!connected) {
            return;
        }
        await vscode.commands.executeCommand(commandName, undefined, channelName, smartContractName);

    } else {
        // Instantiate or Upgrade command
        await vscode.commands.executeCommand(commandName, undefined, channelName, peerNames);
    }
}
