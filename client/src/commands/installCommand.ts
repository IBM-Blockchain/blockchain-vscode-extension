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
import { FabricConnectionManager } from '../fabric/FabricConnectionManager';
import { PeerTreeItem } from '../explorer/model/PeerTreeItem';
import { PackageRegistryEntry } from '../packages/PackageRegistryEntry';
import { IFabricConnection } from '../fabric/IFabricConnection';
import { VSCodeOutputAdapter } from '../logging/VSCodeOutputAdapter';
import { LogType } from '../logging/OutputAdapter';

export async function installSmartContract(peerTreeItem?: PeerTreeItem, peerNames?: Set<string>, chosenPackage?: PackageRegistryEntry): Promise<PackageRegistryEntry | boolean> {
    const outputAdapter: VSCodeOutputAdapter = VSCodeOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, 'installSmartContract');
    if (!peerTreeItem && !peerNames) {
        if (!FabricConnectionManager.instance().getConnection()) {
            await vscode.commands.executeCommand('blockchainConnectionsExplorer.connectEntry');
            if (!FabricConnectionManager.instance().getConnection()) {
                // either the user cancelled or there was an error so don't carry on
                return;
            }
        }

        const chosenPeerName: string = await UserInputUtil.showPeerQuickPickBox('Choose a peer to install the smart contract on');
        if (!chosenPeerName) {
            return;
        }

        peerNames = new Set([chosenPeerName]);
    } else if (!peerNames) {
        peerNames = new Set([peerTreeItem.peerName]);
    }

    try {
        if (!chosenPackage) {
            const chosenInstallable: IBlockchainQuickPickItem<{ packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder }> = await UserInputUtil.showInstallableSmartContractsQuickPick('Choose which package to install on the peer', peerNames) as IBlockchainQuickPickItem<{ packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder }>;
            if (!chosenInstallable) {
                return;
            }

            const data: {packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder} = chosenInstallable.data;
            if (chosenInstallable.description === 'Open Project') {
                // Project needs packaging, using the given 'open workspace'
                const _package: PackageRegistryEntry = await vscode.commands.executeCommand('blockchainAPackageExplorer.packageSmartContractProjectEntry', data.workspace) as PackageRegistryEntry;
                chosenPackage = _package;
            } else {
                chosenPackage = chosenInstallable.data.packageEntry;
            }

        }

        const fabricClientConnection: IFabricConnection = FabricConnectionManager.instance().getConnection();

        const promises: Promise<string | void>[] = [];
        for (const peer of peerNames) {
            const install: Promise<string | void> = fabricClientConnection.installChaincode(chosenPackage, peer).catch((error: Error) => {
                return error.message as string; // We return the error message so we can display it to the user
            });
            promises.push(install); // All successful installs will return undefined
        }

        let successfulInstall: boolean = true; // Have all packages been installed successfully

        const peerSet: IterableIterator<string> = peerNames.values(); // Values in the peerNames set

        await Promise.all(promises).then((result: string[]) => {
            let counter: number = 0; // Used for iterating through installChaincode results
            for (const peer of peerSet) {
                if (!result[counter]) {
                    outputAdapter.log(LogType.SUCCESS, `Successfully installed on peer ${peer}`);
                    counter++;
                } else {
                    successfulInstall = false; // Install on peer failed
                    outputAdapter.log(LogType.ERROR, `Failed to install on peer ${peer} with reason: ${result[counter]}`);
                    counter++;
                }
            }
        });

        await vscode.commands.executeCommand('blockchainConnectionsExplorer.refreshEntry');

        if (successfulInstall) {
            // Package was installed on all peers successfully
            if (peerNames.size !== 1) {
                // If the package has only been installed on one peer, we disregard this success message
                outputAdapter.log(LogType.SUCCESS, 'Successfully installed smart contract on all peers');
            }
            return chosenPackage;
        } else {
            // Failed to install package on all peers.
            return;
        }

    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Error installing smart contract: ${error.message}`, `Error installing smart contract: ${error.toString()}`);
        throw error;
    }
}
