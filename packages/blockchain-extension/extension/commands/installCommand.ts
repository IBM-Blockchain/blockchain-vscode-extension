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
import { IBlockchainQuickPickItem, UserInputUtil } from './UserInputUtil';
import { PeerTreeItem } from '../explorer/runtimeOps/connectedTree/PeerTreeItem';
import { BlockchainTreeItem } from '../explorer/model/BlockchainTreeItem';
import { PackageRegistryEntry } from '../registries/PackageRegistryEntry';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { ExtensionCommands } from '../../ExtensionCommands';
import { VSCodeBlockchainDockerOutputAdapter } from '../logging/VSCodeBlockchainDockerOutputAdapter';
import { FabricEnvironmentRegistryEntry, IFabricEnvironmentConnection, LogType, FabricRuntimeUtil } from 'ibm-blockchain-platform-common';
import { Reporter } from '../util/Reporter';
import { FabricEnvironmentManager } from '../fabric/environments/FabricEnvironmentManager';

export async function installSmartContract(treeItem?: BlockchainTreeItem, peerNames?: Set<string>, chosenPackage?: PackageRegistryEntry): Promise<PackageRegistryEntry | undefined> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, 'installSmartContract');

    try {
        let connection: IFabricEnvironmentConnection = FabricEnvironmentManager.instance().getConnection();
        if (!connection) {
            await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT);
            connection = FabricEnvironmentManager.instance().getConnection();
            if (!connection) {
                // something went wrong with connecting so return
                return;
            }
        }

        if ((treeItem instanceof PeerTreeItem)) {
            // Clicked on peer in runtimes view to install
            peerNames = new Set([treeItem.peerName]);
        } else {
            let peerNameArray: string[];
            if (peerNames) {
                peerNameArray = Array.from(peerNames);
            }
            const chosenPeerNames: string[] = await UserInputUtil.showPeersQuickPickBox('Choose which peers to install the smart contract on', peerNameArray);
            if (!chosenPeerNames || chosenPeerNames.length === 0) {
                return;
            }
            peerNames = new Set(chosenPeerNames);
        }

        if (!chosenPackage) {
            const chosenInstallable: IBlockchainQuickPickItem<{ packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder }> = await UserInputUtil.showInstallableSmartContractsQuickPick('Choose which package to install on the peer', peerNames) as IBlockchainQuickPickItem<{ packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder }>;
            if (!chosenInstallable) {
                return;
            }

            const data: { packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder } = chosenInstallable.data;
            if (chosenInstallable.description === 'Open Project') {
                // Project needs packaging, using the given 'open workspace'
                const _package: PackageRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT, data.workspace);
                if (!_package) {
                    return;
                }
                chosenPackage = _package;
            } else {
                chosenPackage = chosenInstallable.data.packageEntry;
            }
        }

        let successfulInstall: boolean = true; // Have all packages been installed successfully
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'IBM Blockchain Platform Extension',
            cancellable: false
        }, async (progress: vscode.Progress<{ message: string }>) => {

            const environmentRegistryEntry: FabricEnvironmentRegistryEntry = FabricEnvironmentManager.instance().getEnvironmentRegistryEntry();
            if (environmentRegistryEntry.name === FabricRuntimeUtil.LOCAL_FABRIC) {
                VSCodeBlockchainDockerOutputAdapter.instance().show();
            }

            for (const peer of peerNames) {
                progress.report({ message: `Installing Smart Contract on peer ${peer}` });
                try {
                    await connection.installChaincode(chosenPackage.path, peer);
                    outputAdapter.log(LogType.SUCCESS, `Successfully installed on peer ${peer}`);
                } catch (error) {
                    outputAdapter.log(LogType.ERROR, `Failed to install on peer ${peer} with reason: ${error.message}`, `Failed to install on peer ${peer} with reason: ${error.toString()}`);
                    successfulInstall = false;
                }
            }

            await vscode.commands.executeCommand(ExtensionCommands.REFRESH_GATEWAYS);
            await vscode.commands.executeCommand(ExtensionCommands.REFRESH_ENVIRONMENTS);
        });

        if (successfulInstall) {
            // Package was installed on all peers successfully
            if (peerNames.size > 1) {
                // If the package has only been installed on one peer, we disregard this success message
                outputAdapter.log(LogType.SUCCESS, 'Successfully installed smart contract on all peers');
            }

            Reporter.instance().sendTelemetryEvent('installCommand');
            return chosenPackage;
        } else {
            // Failed to install package on all peers
            return;
        }

    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Error installing smart contract: ${error.message}`, `Error installing smart contract: ${error.toString()}`);
        return;
    }
}
