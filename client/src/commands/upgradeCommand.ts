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
import { IFabricConnection } from '../fabric/IFabricConnection';
import { Reporter } from '../util/Reporter';
import { PackageRegistryEntry } from '../packages/PackageRegistryEntry';
import { InstantiatedChaincodeTreeItem } from '../explorer/model/InstantiatedChaincodeTreeItem';
import { VSCodeOutputAdapter } from '../logging/VSCodeOutputAdapter';
import { LogType } from '../logging/OutputAdapter';

export async function upgradeSmartContract(instantiatedChainCodeTreeItem?: InstantiatedChaincodeTreeItem): Promise<void> {
    const outputAdapter: VSCodeOutputAdapter = VSCodeOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, 'upgradeSmartContract');
    let channelName: string;
    let peers: Set<string>;
    let packageEntry: PackageRegistryEntry;
    let contractName: string;
    let contractVersion: string;
    // if (!instantiatedChainCodeTreeItem) {
    if (!FabricConnectionManager.instance().getConnection()) {
        await vscode.commands.executeCommand('blockchainConnectionsExplorer.connectEntry');
        if (!FabricConnectionManager.instance().getConnection()) {
            // either the user cancelled or ther was an error so don't carry on
            return;
        }
    }

    const chosenChannel: IBlockchainQuickPickItem<Set<string>> = await UserInputUtil.showChannelQuickPickBox('Choose a channel to upgrade the smart contract on');
    if (!chosenChannel) {
        return;
    }

    channelName = chosenChannel.label;
    peers = chosenChannel.data;

    // We should now ask for the instantiated smart contract to upgrade
    const initialSmartContract: IBlockchainQuickPickItem<{ name: string, channel: string, version: string}> = await UserInputUtil.showInstantiatedSmartContractsQuickPick('Select the instantiated smart contract to upgrade', channelName);
    contractName = initialSmartContract.data.name;
    contractVersion = initialSmartContract.data.version;
    // } else {
    //     contractName = instantiatedChainCodeTreeItem.name;
    //     contractVersion = instantiatedChainCodeTreeItem.version;
    //     channelName = instantiatedChainCodeTreeItem.channel.label;
    //     peers = new Set(instantiatedChainCodeTreeItem.channel.peers);
    // }

    try {
        const chosenChaincode: IBlockchainQuickPickItem<{ packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder }> = await UserInputUtil.showChaincodeAndVersionQuickPick('Select the smart contract version to perform an upgrade with', peers, contractName, contractVersion);
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
        }
        if (chosenChaincode.description === 'Open Project') {
            // Project needs packaging and installing

            // Package smart contract project using the given 'open workspace'
            const _package: PackageRegistryEntry = await vscode.commands.executeCommand('blockchainAPackageExplorer.packageSmartContractProjectEntry', data.workspace) as PackageRegistryEntry;

            // Install smart contract package
            packageEntry = await vscode.commands.executeCommand('blockchainExplorer.installSmartContractEntry', undefined, peers, _package) as PackageRegistryEntry;
            if (!packageEntry) {
                return;
            }
        }

        // Project should be packaged and installed. Now the package can be upgraded.

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

            progress.report({message: 'Upgrading Smart Contract'});
            const fabricClientConnection: IFabricConnection = FabricConnectionManager.instance().getConnection();
            if (packageEntry) {
                // If the package has been installed as part of this command
                await fabricClientConnection.upgradeChaincode(packageEntry.name, packageEntry.version, channelName, fcn, args);
            } else {
                // If the package was already installed
                await fabricClientConnection.upgradeChaincode(data.packageEntry.name, data.packageEntry.version, channelName, fcn, args);
            }

            Reporter.instance().sendTelemetryEvent('upgradeCommand');

            outputAdapter.log(LogType.SUCCESS, `Successfully upgraded smart contract`);
            await vscode.commands.executeCommand('blockchainConnectionsExplorer.refreshEntry');
            await vscode.commands.executeCommand('blockchainARuntimeExplorer.refreshEntry');
        });
    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Error upgrading smart contract: ${error.message}`);
        throw error;
    }
}
