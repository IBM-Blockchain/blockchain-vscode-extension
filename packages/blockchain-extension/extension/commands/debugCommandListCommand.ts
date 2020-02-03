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
import { FabricGatewayConnectionManager } from '../fabric/FabricGatewayConnectionManager';
import { FabricGatewayRegistryEntry } from 'ibm-blockchain-platform-common/src/registries/FabricGatewayRegistryEntry';
import { FabricEnvironmentManager } from '../fabric/environments/FabricEnvironmentManager';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { IFabricEnvironmentConnection, LogType, FabricGatewayRegistry, FabricRuntimeUtil } from 'ibm-blockchain-platform-common';
import { FabricDebugConfigurationProvider } from '../debug/FabricDebugConfigurationProvider';

export async function debugCommandList(commandName?: string): Promise<void> {

    // Get the debug configuration
    const configuration: vscode.DebugConfiguration = vscode.debug.activeDebugSession.configuration;
    if (configuration.debugEvent !== FabricDebugConfigurationProvider.debugEvent) {
        VSCodeBlockchainOutputAdapter.instance().log(LogType.ERROR, undefined, 'The current debug session is not debugging a smart contract, this command can only be run when debugging a smart contract');
        return;
    }
    const chaincodeContainerName: string = configuration.env.CORE_CHAINCODE_ID_NAME;
    const smartContractName: string = chaincodeContainerName.split(':')[0];

    // Determine whether to show Instantiate or Upgrade command
    const connection: IFabricEnvironmentConnection = FabricEnvironmentManager.instance().getConnection();
    if (!connection) {
        VSCodeBlockchainOutputAdapter.instance().log(LogType.ERROR, undefined, 'No connection to a blockchain found');
        return;
    }
    const channelMap: Map<string, string[]> = await connection.createChannelMap();
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

        if (!FabricGatewayConnectionManager.instance().getConnection()) {
            // Connect to local_fabric gateway before submitting/evaluating transaction
            // TODO: Support multi-org debugging
            const runtimeGateway: FabricGatewayRegistryEntry = await FabricGatewayRegistry.instance().get(`${FabricRuntimeUtil.LOCAL_FABRIC} - Org1`);
            // Assume one runtime gateway registry entry
            await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_GATEWAY, runtimeGateway);
            if (!FabricGatewayConnectionManager.instance().getConnection()) {
                // either the user cancelled or ther was an error so don't carry on
                return;
            }
        }

        vscode.commands.executeCommand(commandName, undefined, channelName, smartContractName);

    } else {
        // Instantiate or Upgrade command
        vscode.commands.executeCommand(commandName, undefined, channelName, peerNames);
    }
}
