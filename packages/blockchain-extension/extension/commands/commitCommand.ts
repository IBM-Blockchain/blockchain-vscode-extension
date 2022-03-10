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
import { Reporter } from '../util/Reporter';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { ExtensionCommands } from '../../ExtensionCommands';
import { VSCodeBlockchainDockerOutputAdapter } from '../logging/VSCodeBlockchainDockerOutputAdapter';
import {
    FabricEnvironmentRegistryEntry,
    IFabricEnvironmentConnection,
    LogType,
    EnvironmentType,
    FabricSmartContractDefinition
} from 'ibm-blockchain-platform-common';
import { FabricEnvironmentManager } from '../fabric/environments/FabricEnvironmentManager';
import { SettingConfigurations } from '../configurations';

export async function commitSmartContract(ordererName: string, channelName: string, orgMap: Map<string, string[]>, smartContractDefinition: FabricSmartContractDefinition): Promise<void | Error> {

    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, 'commitSmartContract');

    let connection: IFabricEnvironmentConnection = FabricEnvironmentManager.instance().getConnection();
    if (!connection) {
        await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT);
        connection = FabricEnvironmentManager.instance().getConnection();
        if (!connection) {
            // something went wrong with connecting so return
            return;
        }
    }

    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'IBM Blockchain Platform Extension',
            cancellable: false
        }, async (progress: vscode.Progress<{ message: string }>) => {

            progress.report({ message: 'Committing Smart Contract Definition' });

            const fabricEnvironmentRegistryEntry: FabricEnvironmentRegistryEntry = FabricEnvironmentManager.instance().getEnvironmentRegistryEntry();
            if (fabricEnvironmentRegistryEntry.environmentType === EnvironmentType.LOCAL_MICROFAB_ENVIRONMENT) {
                VSCodeBlockchainDockerOutputAdapter.instance(fabricEnvironmentRegistryEntry.name).show();
            }

            const peerNames: string[] = [];
            for (const org of orgMap.keys()) {
                const peers: string[] = orgMap.get(org);
                peerNames.push(...peers);
            }
            let timeout: number = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_CLIENT_TIMEOUT);

            await connection.commitSmartContractDefinition(ordererName, channelName, peerNames, smartContractDefinition, timeout);

            Reporter.instance().sendTelemetryEvent('commitCommand');

            outputAdapter.log(LogType.SUCCESS, 'Successfully committed smart contract definition');
            await vscode.commands.executeCommand(ExtensionCommands.REFRESH_GATEWAYS);
            await vscode.commands.executeCommand(ExtensionCommands.REFRESH_ENVIRONMENTS);
        });
    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Error committing smart contract: ${error.message}`, `Error committing smart contract: ${error.toString()}`);
        return error;
    }
}
