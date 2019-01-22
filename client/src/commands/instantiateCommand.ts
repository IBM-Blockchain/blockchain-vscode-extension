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
import { PackageRegistryEntry } from '../packages/PackageRegistryEntry';
import { VSCodeOutputAdapter } from '../logging/VSCodeOutputAdapter';
import { LogType } from '../logging/OutputAdapter';

export async function instantiateSmartContract(channelTreeItem?: ChannelTreeItem): Promise<void> {

    let channelName: string;
    let peers: Set<string>;
    let packageEntry: PackageRegistryEntry;
    const outputAdapter: VSCodeOutputAdapter = VSCodeOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, 'instantiateSmartContract');

    if (!channelTreeItem) {
        if (!FabricConnectionManager.instance().getConnection()) {
            await vscode.commands.executeCommand('blockchainExplorer.connectEntry');
            if (!FabricConnectionManager.instance().getConnection()) {
                // either the user cancelled or ther was an error so don't carry on
                return;
            }
        }

        const chosenChannel: IBlockchainQuickPickItem<Set<string>> = await UserInputUtil.showChannelQuickPickBox('Choose a channel to instantiate the smart contract on');
        if (!chosenChannel) {
            return;
        }
        channelName = chosenChannel.label;
        peers = chosenChannel.data;
    } else {
        channelName = channelTreeItem.label;
        peers = new Set(channelTreeItem.peers);
    }

    try {

        const chosenChaincode: IBlockchainQuickPickItem<{ packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder }> = await UserInputUtil.showChaincodeAndVersionQuickPick('Choose a smart contract and version to instantiate', peers);
        if (!chosenChaincode) {
            return;
        }
        const data: {packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder} = chosenChaincode.data;
        if (chosenChaincode.description === 'Packaged') {
            packageEntry = await vscode.commands.executeCommand('blockchainExplorer.installSmartContractEntry', undefined, peers, data.packageEntry) as PackageRegistryEntry;
            if (!packageEntry) {
                // Either a package wasn't selected or the package didnt successfully install on all peers and an error was thrown
                return;
            }
        } else if (chosenChaincode.description === 'Open Project') {
            // Project needs packaging and installing

            // Package smart contract project using the given 'open workspace'
            const _package: PackageRegistryEntry = await vscode.commands.executeCommand('blockchainAPackageExplorer.packageSmartContractProjectEntry', data.workspace) as PackageRegistryEntry;

            // Install smart contract package
            packageEntry = await vscode.commands.executeCommand('blockchainExplorer.installSmartContractEntry', undefined, peers, _package) as PackageRegistryEntry;
            if (!packageEntry) {
                return;
            }
        }

        // Project should be packaged and installed. Now the package can be instantiated.

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
            title: 'IBM Blockchain Platform Extension',
            cancellable: false
        }, async (progress: vscode.Progress<{message: string}>) => {

            progress.report({message: 'Instantiating Smart Contract'});
            const fabricClientConnection: IFabricConnection = FabricConnectionManager.instance().getConnection();

            if (packageEntry) {
                // If the package has been installed as part of this command
                await fabricClientConnection.instantiateChaincode(packageEntry.name, packageEntry.version, channelName, fcn, args);
            } else {
                // If the package was already installed
                await fabricClientConnection.instantiateChaincode(data.packageEntry.name, data.packageEntry.version, channelName, fcn, args);
            }

            Reporter.instance().sendTelemetryEvent('instantiateCommand');

            outputAdapter.log(LogType.SUCCESS, 'Successfully instantiated smart contract');
            await vscode.commands.executeCommand('blockchainExplorer.refreshEntry');
        });
    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Error instantiating smart contract: ${error.message}`, `Error instantiating smart contract: ${error.toString()}`);
        throw error;
    }
}
