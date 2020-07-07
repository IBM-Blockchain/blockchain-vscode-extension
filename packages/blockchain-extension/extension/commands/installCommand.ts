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

export async function installSmartContract(orgMap: Map<string, string[]>, chosenPackage: PackageRegistryEntry): Promise<string> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, 'installSmartContract');

    let packageId: string;

    let connection: IFabricEnvironmentConnection = FabricEnvironmentManager.instance().getConnection();
    if (!connection) {
        await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT);
        connection = FabricEnvironmentManager.instance().getConnection();
        if (!connection) {
            // something went wrong with connecting so return
            return;
        }
    }

    let successfulInstall: boolean = true; // Have all packages been installed successfully
    let peerCount: number = 0;
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'IBM Blockchain Platform Extension',
        cancellable: false
    }, async (progress: vscode.Progress<{ message: string }>) => {

        const environmentRegistryEntry: FabricEnvironmentRegistryEntry = FabricEnvironmentManager.instance().getEnvironmentRegistryEntry();
        if (environmentRegistryEntry.environmentType === EnvironmentType.LOCAL_ENVIRONMENT) {
            VSCodeBlockchainDockerOutputAdapter.instance(environmentRegistryEntry.name).show();
        }

        for (const org of orgMap.keys()) {
            const peers: string[] = orgMap.get(org);
            for (const peer of peers) {
                peerCount++;
                progress.report({ message: `Installing Smart Contract on peer ${peer}` });
                try {
                    let timeout: number = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_CLIENT_TIMEOUT);
                    // convert from seconds to milliseconds
                    if (timeout) {
                        timeout = timeout * 1000;
                    }

                    // try {
                    packageId = await connection.installSmartContract(chosenPackage.path, peer, timeout);

                    // } catch (err) {
                    // if (err.message.includes('already successfully installed')) {

                    // const packages: FabricInstalledSmartContract[] = await connection.getInstalledSmartContracts(peer);
                    // let existingPackage: FabricInstalledSmartContract;
                    // const lastSlash: number = chosenPackage.path.lastIndexOf('/');
                    // const packageLabel: string = chosenPackage.path.substring(lastSlash + 1);
                    // if (packageLabel.includes('@')) {
                    //     const packageParts: string[] = packageLabel.split('@');
                    //     const packageName: string = packageParts[0];
                    //     const packageVersion: string = packageParts[1].split('.tar.gz')[0];
                    //     const possiblePackages: FabricInstalledSmartContract[] = packages.filter((_package: FabricInstalledSmartContract) => {
                    //         return _package.label.includes(`${packageName}_${packageVersion}`);
                    //     });

                    //     if (possiblePackages.length > 1) {
                    //         for (const _package of possiblePackages) {
                    //             if (!existingPackage) {
                    //                 existingPackage = _package;
                    //             } else {
                    //                 const _label: string = _package.label;
                    //                 const _labelParts: string[] = _label.split('_');

                    //                 const _currentLabel: string = existingPackage.label;
                    //                 const _currentLabelParts: string[] = _currentLabel.split('_');

                    //                 if (Number(_labelParts[2]) > Number(_currentLabelParts[2])) {
                    //                     existingPackage = _package;
                    //                 }
                    //             }
                    //         }

                    //     } else if (possiblePackages.length === 1) {

                    //         existingPackage = possiblePackages[0];
                    //     } else {
                    //         // Unable to determine packageId
                    //         return;
                    //     }
                    //     // split it up
                    //     // get name and ver
                    //     // name_ver
                    //     // find package with label === name_ver
                    // } else {
                    //     // handle somehow - will need to in packaging code as well
                    //     return;
                    // }

                    // // We have the latest installed package
                    // outputAdapter.log(LogType.SUCCESS, `Package already installed on ${peer}`);
                    // packageId = existingPackage.packageId;

                    // }
                    // }

                    outputAdapter.log(LogType.SUCCESS, `Successfully installed on peer ${peer}`);
                } catch (error) {
                    outputAdapter.log(LogType.ERROR, `Failed to install on peer ${peer} with reason: ${error.message}`, `Failed to install on peer ${peer} with reason: ${error.toString()}`);
                    successfulInstall = false;
                }
            }
        }

        await vscode.commands.executeCommand(ExtensionCommands.REFRESH_GATEWAYS);
        await vscode.commands.executeCommand(ExtensionCommands.REFRESH_ENVIRONMENTS);
    });

    if (successfulInstall) {
        // Package was installed on all peers successfully
        if (peerCount > 1) {
            // If the package has only been installed on one peer, we disregard this success message
            outputAdapter.log(LogType.SUCCESS, 'Successfully installed smart contract on all peers');
        }

        Reporter.instance().sendTelemetryEvent('installCommand');
        return packageId;
    } else {
        // Failed to install package on all peers
        return;
    }
}
