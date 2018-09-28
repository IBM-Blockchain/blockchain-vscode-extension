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

export async function installSmartContract(peerTreeItem?: PeerTreeItem): Promise<void> {

    let peerName: string;

    if (!peerTreeItem) {
        if (!FabricConnectionManager.instance().getConnection()) {
            await vscode.commands.executeCommand('blockchainExplorer.connectEntry');
            if (!FabricConnectionManager.instance().getConnection()) {
                // either the user cancelled or ther was an error so don't carry on
                return;
            }
        }

        const chosenPeerName: string = await UserInputUtil.showPeerQuickPickBox('Choose a peer to install the chaincode on');
        if (!chosenPeerName) {
            return;
        }

        peerName = chosenPeerName;
    } else {
        peerName = peerTreeItem.peerName;
    }

    try {
        const chosenPackage: IBlockchainQuickPickItem<PackageRegistryEntry> = await UserInputUtil.showSmartContractPackagesQuickPickBox('Choose which package to install on the peer', false) as IBlockchainQuickPickItem<PackageRegistryEntry>;
        if (!chosenPackage) {
            return;
        }

        const fabricClientConnection: IFabricConnection = FabricConnectionManager.instance().getConnection();
        await fabricClientConnection.installChaincode(chosenPackage.data, peerName);
        vscode.window.showInformationMessage('Successfully installed smart contract');
        await vscode.commands.executeCommand('blockchainExplorer.refreshEntry');
    } catch (error) {
        vscode.window.showErrorMessage('Error installing smart contract ' + error.message);
        throw error;
    }
}
