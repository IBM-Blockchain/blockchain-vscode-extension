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
import { Reporter } from '../util/Reporter';
import { PackageRegistryEntry } from '../packages/PackageRegistryEntry';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../logging/OutputAdapter';
import { BlockchainTreeItem } from '../explorer/model/BlockchainTreeItem';
import { ChannelTreeItem } from '../explorer/model/ChannelTreeItem';
import { FabricRuntimeManager } from '../fabric/FabricRuntimeManager';
import { ExtensionCommands } from '../../ExtensionCommands';
import { InstantiatedTreeItem } from '../explorer/model/InstantiatedTreeItem';
import { IFabricRuntimeConnection } from '../fabric/IFabricRuntimeConnection';

export async function upgradeSmartContract(treeItem?: BlockchainTreeItem): Promise<void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, 'upgradeSmartContract');
    let channelName: string;
    let peerNames: Array<string>;
    let packageEntry: PackageRegistryEntry;
    let contractName: string;
    let contractVersion: string;

    if ((treeItem instanceof InstantiatedTreeItem)) {
        // Called on instantiated chaincode tree item
        contractName = treeItem.name;
        contractVersion = treeItem.version;
        channelName = treeItem.channel.label;
        peerNames = treeItem.channel.peers;

    } else if ((treeItem instanceof ChannelTreeItem)) {
        // Called on a channel
        channelName = treeItem.label;
        peerNames = treeItem.peers;

        // We should now ask for the instantiated smart contract to upgrade
        const initialSmartContract: IBlockchainQuickPickItem<{ name: string, channel: string, version: string}> = await UserInputUtil.showRuntimeInstantiatedSmartContractsQuickPick('Select the instantiated smart contract to upgrade', channelName);
        contractName = initialSmartContract.data.name;
        contractVersion = initialSmartContract.data.version;

    } else {
        // called on '+ Instantiate' or via the command palette
        const isRunning: boolean = await FabricRuntimeManager.instance().getRuntime().isRunning();
        if (!isRunning) {
            // Start local_fabric to connect
            await vscode.commands.executeCommand(ExtensionCommands.START_FABRIC);
            if (!(await FabricRuntimeManager.instance().getRuntime().isRunning())) {
                // Start local_fabric failed so return
                return;
            }
        }
        const chosenChannel: IBlockchainQuickPickItem<Array<string>> = await UserInputUtil.showChannelQuickPickBox('Choose a channel to upgrade the smart contract on');
        if (!chosenChannel) {
            return;
        }
        channelName = chosenChannel.label;
        peerNames = chosenChannel.data;

        // We should now ask for the instantiated smart contract to upgrade
        const initialSmartContract: IBlockchainQuickPickItem<{ name: string, channel: string, version: string}> = await UserInputUtil.showRuntimeInstantiatedSmartContractsQuickPick('Select the instantiated smart contract to upgrade', channelName);
        contractName = initialSmartContract.data.name;
        contractVersion = initialSmartContract.data.version;
    }

    try {
        const chosenChaincode: IBlockchainQuickPickItem<{ packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder }> = await UserInputUtil.showChaincodeAndVersionQuickPick('Select the smart contract version to perform an upgrade with', peerNames, contractName, contractVersion);
        if (!chosenChaincode) {
            return;
        }

        const data: {packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder} = chosenChaincode.data;

        if (chosenChaincode.description === 'Packaged') {
            packageEntry = await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, peerNames, data.packageEntry) as PackageRegistryEntry;
            if (!packageEntry) {
                // Either a package wasn't selected or the package didnt successfully install on all peers and an error was thrown
                return;
            }
        }
        if (chosenChaincode.description === 'Open Project') {
            // Project needs packaging and installing

            // Package smart contract project using the given 'open workspace'
            const _package: PackageRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT, data.workspace) as PackageRegistryEntry;

            // Install smart contract package
            packageEntry = await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, peerNames, _package) as PackageRegistryEntry;
            if (!packageEntry) {
                return;
            }
        }

        // Project should be packaged and installed. Now the package can be upgraded.

        const fcn: string = await UserInputUtil.showInputBox('optional: What function do you want to call?');

        let args: Array<string>;
        if (fcn) {
            const argsString: string = await UserInputUtil.showInputBox('optional: What are the arguments to the function, (comma seperated)');
            if (argsString === undefined) {
                return;
            } else if (argsString === '') {
                args = [];
            } else {
                args = argsString.split(','); // If empty, args will be ['']
            }
        }

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Blockchain Extension',
            cancellable: false
        }, async (progress: vscode.Progress<{message: string}>) => {

            progress.report({message: 'Upgrading Smart Contract'});
            const connection: IFabricRuntimeConnection = await FabricRuntimeManager.instance().getConnection();

            if (packageEntry) {
                // If the package has been installed as part of this command
                await connection.upgradeChaincode(packageEntry.name, packageEntry.version, peerNames, channelName, fcn, args);
            } else {
                // If the package was already installed
                await connection.upgradeChaincode(data.packageEntry.name, data.packageEntry.version, peerNames, channelName, fcn, args);
            }

            Reporter.instance().sendTelemetryEvent('upgradeCommand');

            outputAdapter.log(LogType.SUCCESS, `Successfully upgraded smart contract`);
            await vscode.commands.executeCommand(ExtensionCommands.REFRESH_GATEWAYS);
            await vscode.commands.executeCommand(ExtensionCommands.REFRESH_LOCAL_OPS);
        });
    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Error upgrading smart contract: ${error.message}`);
        return;
    }
}
