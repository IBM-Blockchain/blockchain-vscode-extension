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
import { PackageRegistryEntry } from '../registries/PackageRegistryEntry';
import { FabricEnvironmentRegistryEntry, IFabricEnvironmentConnection, LogType, FabricSmartContractDefinition } from 'ibm-blockchain-platform-common';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricEnvironmentManager } from '../fabric/environments/FabricEnvironmentManager';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';

export async function deploySmartContract(requireCommit: boolean, fabricEnvironmentRegistryEntry: FabricEnvironmentRegistryEntry, ordererName: string, channelName: string, installApproveMap: Map<string, string[]>, chosenPackage: PackageRegistryEntry, smartContractDefinition: FabricSmartContractDefinition, commitMap?: Map<string, string[]>): Promise<void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, 'Deploy Smart Contract');
    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'IBM Blockchain Platform Extension',
            cancellable: false
        }, async (progress: vscode.Progress<{ message: string }>) => {

            let packageId: string;

            await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT, fabricEnvironmentRegistryEntry);
            const connection: IFabricEnvironmentConnection = FabricEnvironmentManager.instance().getConnection();
            if (!connection) {
                // something went wrong with connecting so return
                return;
            }

            progress.report({ message: `Installing Smart Contract on peer(s)` });
            packageId = await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT, installApproveMap, chosenPackage);
            if (!packageId) {
                throw new Error('Package was not installed. No packageId was returned');
            }

            smartContractDefinition.packageId = packageId;

            progress.report({ message: `Approving Smart Contract` });
            await vscode.commands.executeCommand(ExtensionCommands.APPROVE_SMART_CONTRACT, ordererName, channelName, installApproveMap, smartContractDefinition);

            if (requireCommit) {
                progress.report({ message: `Committing Smart Contract` });
                if (!commitMap) {
                    commitMap = installApproveMap;
                }
                await vscode.commands.executeCommand(ExtensionCommands.COMMIT_SMART_CONTRACT, ordererName, channelName, commitMap, smartContractDefinition);
                outputAdapter.log(LogType.SUCCESS, 'Successfully deployed smart contract');
            } else {
                outputAdapter.log(LogType.SUCCESS, 'Partially deployed smart contract - commit not performed');
            }
        });

    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Failed to deploy smart contract, ${error.message}`, `Failed to deploy smart contract, ${error.toString()}`);
    }
}
