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
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { ExtensionCommands } from '../../ExtensionCommands';
import { VSCodeBlockchainDockerOutputAdapter } from '../logging/VSCodeBlockchainDockerOutputAdapter';
import { FabricEnvironmentRegistryEntry, IFabricEnvironmentConnection, LogType, EnvironmentType } from 'ibm-blockchain-platform-common';
import { Reporter } from '../util/Reporter';
import { FabricEnvironmentManager } from '../fabric/environments/FabricEnvironmentManager';
import { SettingConfigurations } from '../configurations';

export async function installSmartContract(orgMap?: Map<string, string[]>, chosenPackage?: PackageRegistryEntry): Promise<string[]> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, 'installSmartContract');

    let packageId: string;

    let connection: IFabricEnvironmentConnection = FabricEnvironmentManager.instance().getConnection();
    if (!connection) {
        await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT);
        connection = FabricEnvironmentManager.instance().getConnection();
        if (!connection) {
            // something went wrong with connecting so return
            return [];
        }
    }

    const enum InstallError {
        NONE = 'none',
        TIMEOUT = 'timeout',
        OTHER = 'other',
    }
    let successfulInstall: string = InstallError.NONE; // Have all packages been installed successfully
    let peerCount: number = 0;
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'IBM Blockchain Platform Extension',
        cancellable: false
    }, async (progress: vscode.Progress<{ message: string }>) => {

        const environmentRegistryEntry: FabricEnvironmentRegistryEntry = FabricEnvironmentManager.instance().getEnvironmentRegistryEntry();
        if (environmentRegistryEntry.environmentType === EnvironmentType.LOCAL_MICROFAB_ENVIRONMENT) {
            VSCodeBlockchainDockerOutputAdapter.instance(environmentRegistryEntry.name).show();
        }

        const peerNameArray: string[] = [];
        let peerNames: Set<string>;
        for (const org of orgMap.keys()) {
            peerNameArray.push(...orgMap.get(org));
        }
        peerNames = new Set(peerNameArray);

        for (const peer of peerNames) {
            peerCount++;
            progress.report({ message: `Installing Smart Contract on peer ${peer}` });
            try {
                let timeout: number = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_CLIENT_TIMEOUT);

                packageId = await connection.installSmartContract(chosenPackage.path, peer, `${chosenPackage.name}_${chosenPackage.version}`, timeout);
                outputAdapter.log(LogType.SUCCESS, `Successfully installed on peer ${peer}`);
            } catch (error) {
                outputAdapter.log(LogType.ERROR, `Failed to install on peer ${peer} with reason: ${error.message}`, `Failed to install on peer ${peer} with reason: ${error.toString()}`);
                if (error.message.includes('REQUEST TIMEOUT')){
                    successfulInstall = InstallError.TIMEOUT;
                } else {
                    successfulInstall = InstallError.OTHER;
                }
            }
        }

        await vscode.commands.executeCommand(ExtensionCommands.REFRESH_GATEWAYS);
        await vscode.commands.executeCommand(ExtensionCommands.REFRESH_ENVIRONMENTS);
    });

    if (successfulInstall === InstallError.NONE) {
        // Package was installed on all peers successfully
        if (peerCount > 1) {
            // If the package has only been installed on one peer, we disregard this success message
            outputAdapter.log(LogType.SUCCESS, 'Successfully installed smart contract on all peers');
        }

        Reporter.instance().sendTelemetryEvent('installCommand');
        return [packageId, undefined];
    } else {
        // Failed to install package on all peers
        return [undefined, successfulInstall];
    }
}
