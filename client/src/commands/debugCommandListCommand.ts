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
import { FabricRuntimeManager } from '../fabric/FabricRuntimeManager';
import { IFabricRuntimeConnection } from '../fabric/IFabricRuntimeConnection';
import { FabricConnectionManager } from '../fabric/FabricConnectionManager';
import { FabricGatewayRegistryEntry } from '../fabric/FabricGatewayRegistryEntry';

export async function debugCommandList(): Promise<void> {

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

    // Get the debug configuration
    const configuration: vscode.DebugConfiguration = vscode.debug.activeDebugSession.configuration;
    const chaincodeContainerName: string = configuration.env.CORE_CHAINCODE_ID_NAME;
    const smartContractName: string = chaincodeContainerName.split(':')[0];

    // Determine whether to show Instantiate or Upgrade command
    const runtime: IFabricRuntimeConnection = await FabricRuntimeManager.instance().getConnection();
    const channelMap: Map<string, string[]> = await runtime.createChannelMap();
    // Assume local_fabric was one channel so just get the first
    const channelName: string = Array.from(channelMap.keys())[0];
    const peerNames: Array<string> = channelMap.get(channelName);
    const instantiatedSmartContracts: Array<{ name: string, version: string }> = await runtime.getInstantiatedChaincode(peerNames, channelName);
    // Search for debug package in instantiatedSmartContracts
    const searchResult: number = instantiatedSmartContracts.findIndex( (contract: any) => {
        return smartContractName === contract.name;
    });
    if (searchResult === -1) {
        // debug package smart contract is not already instantiated
        commands.unshift({
            name: 'Instantiate Smart Contract',
            command: ExtensionCommands.INSTANTIATE_SMART_CONTRACT
        });
    } else {
        // debug package smart contract is already instantiated so show upgrade
        commands.push({
            name: 'Upgrade Smart Contract',
            command: ExtensionCommands.UPGRADE_SMART_CONTRACT
        });
    }

    const chosenCommand: IBlockchainQuickPickItem<string> = await UserInputUtil.showDebugCommandList(commands, 'Choose a command to execute') as IBlockchainQuickPickItem<string>;
    if (!chosenCommand) {
        return;
    }

    if (chosenCommand.data === ExtensionCommands.SUBMIT_TRANSACTION || chosenCommand.data === ExtensionCommands.EVALUATE_TRANSACTION) {

        if (!FabricConnectionManager.instance().getConnection()) {
            // Connect to local_fabric gateway before submitting/evaluating transaction
            const runtimeGateways: Array<FabricGatewayRegistryEntry> = await FabricRuntimeManager.instance().getGatewayRegistryEntries();
            // Assume one runtime gateway registry entry
            await vscode.commands.executeCommand(ExtensionCommands.CONNECT, runtimeGateways[0]);
            if (!FabricConnectionManager.instance().getConnection()) {
                // either the user cancelled or ther was an error so don't carry on
                return;
            }
        }

        vscode.commands.executeCommand(chosenCommand.data, undefined, channelName, smartContractName);

    } else {
        // Instantiate or Upgrade command
        vscode.commands.executeCommand(chosenCommand.data, undefined, channelName, peerNames);
    }
}
