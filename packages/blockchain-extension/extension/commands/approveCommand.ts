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
import { FabricEnvironmentRegistryEntry, IFabricEnvironmentConnection, LogType, EnvironmentType, FabricSmartContractDefinition } from 'ibm-blockchain-platform-common';
import { FabricEnvironmentManager } from '../fabric/environments/FabricEnvironmentManager';
import { SettingConfigurations } from '../configurations';

export async function approveSmartContract(ordererName: string, channelName: string, orgMap: Map<string, string[]>, smartContractDefinition: FabricSmartContractDefinition): Promise<void> {

    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, 'approveSmartContract');

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

            progress.report({ message: 'Approving Smart Contract Definition' });

            const fabricEnvironmentRegistryEntry: FabricEnvironmentRegistryEntry = FabricEnvironmentManager.instance().getEnvironmentRegistryEntry();
            if (fabricEnvironmentRegistryEntry.environmentType === EnvironmentType.LOCAL_ENVIRONMENT) {
                VSCodeBlockchainDockerOutputAdapter.instance(fabricEnvironmentRegistryEntry.name).show();
            }

            let anyApproved: boolean = false;
            for (const org of orgMap.keys()) {
                progress.report({ message: `Approving Smart Contract for org ${org}` });
                const peers: string[] = orgMap.get(org);
                let timeout: number = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_CLIENT_TIMEOUT);
                // convert from seconds to milliseconds
                if (timeout) {
                    timeout = timeout * 1000;
                }
                const approved: boolean = await connection.approveSmartContractDefinition(ordererName, channelName, peers, smartContractDefinition, timeout);
                if (!approved) {
                    outputAdapter.log(LogType.INFO, `Smart contract definition alreay approved by organisation ${org}`);
                }
                anyApproved = anyApproved || approved;
            }

            Reporter.instance().sendTelemetryEvent('approveCommand');
            if (anyApproved) {
                outputAdapter.log(LogType.SUCCESS, 'Successfully approved smart contract definition');
                await vscode.commands.executeCommand(ExtensionCommands.REFRESH_GATEWAYS);
                await vscode.commands.executeCommand(ExtensionCommands.REFRESH_ENVIRONMENTS);
            }
        });
    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Error approving smart contract: ${error.message}`, `Error approving smart contract: ${error.toString()}`);
        throw error;
    }
}
