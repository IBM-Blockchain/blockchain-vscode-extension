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

export async function installSmartContract(peerTreeItem?: PeerTreeItem, peerNames?: Set<string>): Promise<PackageRegistryEntry | boolean> {
    if (!peerTreeItem && !peerNames) {
        if (!FabricConnectionManager.instance().getConnection()) {
            await vscode.commands.executeCommand('blockchainExplorer.connectEntry');
            if (!FabricConnectionManager.instance().getConnection()) {
                // either the user cancelled or ther was an error so don't carry on
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
        const chosenPackage: IBlockchainQuickPickItem<PackageRegistryEntry> = await UserInputUtil.showSmartContractPackagesQuickPickBox('Choose which package to install on the peer', false) as IBlockchainQuickPickItem<PackageRegistryEntry>;
        if (!chosenPackage) {
            return;
        }

        const fabricClientConnection: IFabricConnection = FabricConnectionManager.instance().getConnection();

        const promises: Promise<string | void>[] = [];
        for (const peer of peerNames) {
            const install: Promise<string | void> = fabricClientConnection.installChaincode(chosenPackage.data, peer).catch((error: Error) => {
                return error.message as string; // We return the error message so we can display it to the user
            });
            promises.push(install); // All successful installs will return undefined
        }

        const outputAdapter: VSCodeOutputAdapter = VSCodeOutputAdapter.instance();

        let successfulInstall: boolean = true; // Have all packages been installed successfully

        const peerSet: IterableIterator<string> = peerNames.values(); // Values in the peerNames set

        await Promise.all(promises).then((result: string[]) => {
            let counter: number = 0; // Used for iterating through installChaincode results
            for (const peer of peerSet) {
                if (!result[counter]) {
                    vscode.window.showInformationMessage(`Successfully installed on peer ${peer}`);
                    outputAdapter.log(`Successfully installed on peer ${peer}`);
                    counter++;
                } else {
                    successfulInstall = false; // Install on peer failed
                    vscode.window.showErrorMessage(`Failed to install on peer ${peer} with reason: ${result[counter]}`);
                    outputAdapter.error(`Failed to install on peer ${peer} with reason: ${result[counter]}`);
                    counter++;
                }
            }
        });

        await vscode.commands.executeCommand('blockchainExplorer.refreshEntry');

        if (successfulInstall) {
            // Package was installed on all peers successfully
            vscode.window.showInformationMessage('Successfully installed smart contract');
            return chosenPackage.data;
        } else {
            // Failed to install package on all peers.
            return;
        }

    } catch (error) {
        vscode.window.showErrorMessage('Error installing smart contract: ' + error.message);
        throw error;
    }
}
