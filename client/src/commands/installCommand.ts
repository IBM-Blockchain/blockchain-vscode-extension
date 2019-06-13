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
import { PeerTreeItem } from '../explorer/runtimeOps/PeerTreeItem';
import { BlockchainTreeItem } from '../explorer/model/BlockchainTreeItem';
import { PackageRegistryEntry } from '../packages/PackageRegistryEntry';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../logging/OutputAdapter';
import { FabricRuntimeManager } from '../fabric/FabricRuntimeManager';
import { ExtensionCommands } from '../../ExtensionCommands';
import { VSCodeBlockchainDockerOutputAdapter } from '../logging/VSCodeBlockchainDockerOutputAdapter';
import { IFabricRuntimeConnection } from '../fabric/IFabricRuntimeConnection';
import { Reporter } from '../util/Reporter';

export async function installSmartContract(treeItem?: BlockchainTreeItem, peerNames?: Set<string>, chosenPackage?: PackageRegistryEntry): Promise<PackageRegistryEntry | undefined> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, 'installSmartContract');

    try {

        if ((treeItem instanceof PeerTreeItem)) {
            // Clicked on peer in runtimes view to install
            peerNames = new Set([treeItem.peerName]);
        } else {
            // Called from command, or runtimes installed tree
            const isRunning: boolean = await FabricRuntimeManager.instance().getRuntime().isRunning();
            if (!isRunning) {
                // Start local_fabric to connect
                await vscode.commands.executeCommand(ExtensionCommands.START_FABRIC);
                if (!(await FabricRuntimeManager.instance().getRuntime().isRunning())) {
                    // Start local_fabric failed so return
                    return;
                }
            }
            const chosenPeerNames: string[] = await UserInputUtil.showPeersQuickPickBox('Choose which peers to install the smart contract on');
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
                const _package: PackageRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT, data.workspace) as PackageRegistryEntry;
                if (!_package) {
                    return;
                }
                chosenPackage = _package;
            } else {
                chosenPackage = chosenInstallable.data.packageEntry;
            }
        }

        const connection: IFabricRuntimeConnection = await FabricRuntimeManager.instance().getConnection();

        let successfulInstall: boolean = true; // Have all packages been installed successfully
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'IBM Blockchain Platform Extension',
            cancellable: false
        }, async (progress: vscode.Progress<{ message: string }>) => {
            VSCodeBlockchainDockerOutputAdapter.instance().show();

            for (const peer of peerNames) {
                progress.report({ message: `Installing Smart Contract on peer ${peer}` });
                try {
                    await connection.installChaincode(chosenPackage, peer);
                    outputAdapter.log(LogType.SUCCESS, `Successfully installed on peer ${peer}`);
                } catch (error) {
                    outputAdapter.log(LogType.ERROR, `Failed to install on peer ${peer} with reason: ${error.message}`, `Failed to install on peer ${peer} with reason: ${error.toString()}`);
                    successfulInstall = false;
                }
            }

            await vscode.commands.executeCommand(ExtensionCommands.REFRESH_GATEWAYS);
            await vscode.commands.executeCommand(ExtensionCommands.REFRESH_LOCAL_OPS);
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
