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

export async function debugCommandList(): Promise<void> {

    const commands: Array<{ name: string, command: string }> = [
        {
            name: 'Submit Transaction',
            command: ExtensionCommands.SUBMIT_TRANSACTION
        },
        {
            name: 'Evaluate Transaction',
            command: ExtensionCommands.EVALUATE_TRANSACTION
        },
        {
            name: 'Instantiate Smart Contract',
            command: ExtensionCommands.INSTANTIATE_SMART_CONTRACT
        },
        {
            name: 'Upgrade Smart Contract',
            command: ExtensionCommands.UPGRADE_SMART_CONTRACT
        }
    ];

    const chosenCommand: IBlockchainQuickPickItem<string> = await UserInputUtil.showDebugCommandList(commands, 'Choose a command to execute') as IBlockchainQuickPickItem<string>;
    if (!chosenCommand) {
        return;
    }

    if (chosenCommand.data === ExtensionCommands.SUBMIT_TRANSACTION || chosenCommand.data === ExtensionCommands.EVALUATE_TRANSACTION) {
        const configuration: vscode.DebugConfiguration = vscode.debug.activeDebugSession.configuration;
        const chaincode: string = configuration.env.CORE_CHAINCODE_ID_NAME;

        const runtime: IFabricRuntimeConnection = await FabricRuntimeManager.instance().getConnection();
        const channelMap: Map<string, string[]> = await runtime.createChannelMap();

        // only one channel currently so just get the first
        const channelName: string = Array.from(channelMap.keys())[0];
        const smartContractName: string = chaincode.split(':')[0];

        vscode.commands.executeCommand(chosenCommand.data, undefined, channelName, smartContractName);

    } else {
        vscode.commands.executeCommand(chosenCommand.data);
    }
}
