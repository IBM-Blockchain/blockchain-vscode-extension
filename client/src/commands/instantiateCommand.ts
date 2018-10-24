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
import { ChannelTreeItem } from '../explorer/model/ChannelTreeItem';
import { IFabricConnection } from '../fabric/IFabricConnection';
import { Reporter } from '../util/Reporter';

export async function instantiateSmartContract(channelTreeItem?: ChannelTreeItem): Promise<void> {

    let channelName: string;
    let peers: Array<string>;

    if (!channelTreeItem) {
        if (!FabricConnectionManager.instance().getConnection()) {
            await vscode.commands.executeCommand('blockchainExplorer.connectEntry');
            if (!FabricConnectionManager.instance().getConnection()) {
                // either the user cancelled or ther was an error so don't carry on
                return;
            }
        }

        const chosenChannel: IBlockchainQuickPickItem<Array<string>> = await UserInputUtil.showChannelQuickPickBox('Choose a channel to instaniate the smart contract on');
        if (!chosenChannel) {
            return;
        }

        channelName = chosenChannel.label;
        peers = chosenChannel.data;
    } else {
        channelName = channelTreeItem.label;
        peers = channelTreeItem.peers;
    }

    try {
        const chosenChaincode: IBlockchainQuickPickItem<{ chaincode: string, version: string }> = await UserInputUtil.showChaincodeAndVersionQuickPick('Choose a smart contract and version to instantiate', peers);
        if (!chosenChaincode) {
            return;
        }

        const data: { chaincode: string, version: string } = chosenChaincode.data;

        const fcn: string = await UserInputUtil.showInputBox('optional: What function do you want to call?');

        let args: Array<string>;
        if (fcn) {
            const argsString: string = await UserInputUtil.showInputBox('optional: What are the arguments to the function, (comma seperated)');
            if (argsString) {
                args = argsString.split(',');
            }
        }

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Blockchain Extension',
            cancellable: false
        }, async (progress: vscode.Progress<{message: string}>) => {

            progress.report({message: 'Instantiating / Upgrading Smart Contract'});
            const fabricClientConnection: IFabricConnection = FabricConnectionManager.instance().getConnection();

            await fabricClientConnection.instantiateChaincode(data.chaincode, data.version, channelName, fcn, args);
            Reporter.instance().sendTelemetryEvent('instantiateCommand');

            vscode.window.showInformationMessage('Successfully instantiated / upgraded smart contract');
            await vscode.commands.executeCommand('blockchainExplorer.refreshEntry');
        });
    } catch (error) {
        vscode.window.showErrorMessage('Error instantiating smart contract ' + error.message);
        throw error;
    }
}
