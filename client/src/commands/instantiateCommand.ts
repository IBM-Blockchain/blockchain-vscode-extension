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
import { ChannelTreeItem } from '../explorer/model/ChannelTreeItem';
import { BlockchainTreeItem } from '../explorer/model/BlockchainTreeItem';
import { Reporter } from '../util/Reporter';
import { PackageRegistryEntry } from '../packages/PackageRegistryEntry';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../logging/OutputAdapter';
import { FabricRuntimeManager } from '../fabric/FabricRuntimeManager';
import { ExtensionCommands } from '../../ExtensionCommands';
import { VSCodeBlockchainDockerOutputAdapter } from '../logging/VSCodeBlockchainDockerOutputAdapter';
import { IFabricRuntimeConnection } from '../fabric/IFabricRuntimeConnection';

export async function instantiateSmartContract(treeItem?: BlockchainTreeItem): Promise<void> {

    let channelName: string;
    let peerNames: Array<string>;
    let packageEntry: PackageRegistryEntry;
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, 'instantiateSmartContract');

    if (treeItem instanceof ChannelTreeItem) {
        // If clicked on runtime channel
        const channelTreeItem: ChannelTreeItem = treeItem as ChannelTreeItem;
        channelName = channelTreeItem.label;
        peerNames = channelTreeItem.peers;
    } else {
        // Called from command palette or Instantiated runtime tree item
        const isRunning: boolean = await FabricRuntimeManager.instance().getRuntime().isRunning();
        if (!isRunning) {
            // Start local_fabric to connect
            await vscode.commands.executeCommand(ExtensionCommands.START_FABRIC);
            if (!(await FabricRuntimeManager.instance().getRuntime().isRunning())) {
                // Start local_fabric failed so return
                return;
            }
        }

        const chosenChannel: IBlockchainQuickPickItem<Array<string>> = await UserInputUtil.showChannelQuickPickBox('Choose a channel to instantiate the smart contract on');
        if (!chosenChannel) {
            return;
        }
        channelName = chosenChannel.label;
        peerNames = chosenChannel.data;
    }

    try {

        const chosenChaincode: IBlockchainQuickPickItem<{ packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder }> = await UserInputUtil.showChaincodeAndVersionQuickPick('Choose a smart contract and version to instantiate', peerNames);
        if (!chosenChaincode) {
            return;
        }
        const data: { packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder } = chosenChaincode.data;
        if (chosenChaincode.description === 'Packaged') {
            packageEntry = await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, peerNames, data.packageEntry) as PackageRegistryEntry;
            if (!packageEntry) {
                // Either a package wasn't selected or the package didnt successfully install on all peers and an error was thrown
                return;
            }
        } else if (chosenChaincode.description === 'Open Project') {
            // Project needs packaging and installing

            // Package smart contract project using the given 'open workspace'
            const _package: PackageRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT, data.workspace) as PackageRegistryEntry;
            if (!_package) {
                return;
            }

            // Install smart contract package
            packageEntry = await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, peerNames, _package) as PackageRegistryEntry;
            if (!packageEntry) {
                return;
            }
        }

        // Project should be packaged and installed. Now the package can be instantiated.

        const fcn: string = await UserInputUtil.showInputBox('optional: What function do you want to call?');

        let args: Array<string>;
        if (fcn) {
            const argsString: string = await UserInputUtil.showInputBox('optional: What are the arguments to the function, (e.g. ["arg1", "arg2"])', '[]');
            if (argsString === undefined) {
                return;
            } else if (argsString === '') {
                args = [];
            } else {
                try {
                    if (!argsString.startsWith('[') || !argsString.endsWith(']')) {
                        throw new Error('instantiate function arguments should be in the format ["arg1", {"key" : "value"}]');
                    }
                    args = JSON.parse(argsString);
                } catch (error) {
                    outputAdapter.log(LogType.ERROR, `Error with instantiate function arguments: ${error.message}`);
                    return;
                }
            }
        }

        let collectionPath: string;
        const wantCollection: string = await UserInputUtil.showQuickPickYesNo('Do you want to provide a private data collection configuration file?');

        if (!wantCollection) {
            return;
        } else if (wantCollection === UserInputUtil.YES) {
            let defaultUri: vscode.Uri;
            const workspaceFolders: Array<vscode.WorkspaceFolder> = UserInputUtil.getWorkspaceFolders();
            if (workspaceFolders.length > 0) {
                defaultUri = workspaceFolders[0].uri;
            }

            const quickPickItems: string[] = [UserInputUtil.BROWSE_LABEL];
            const openDialogOptions: vscode.OpenDialogOptions = {
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                openLabel: 'Select',
                defaultUri: defaultUri
            };

            collectionPath = await UserInputUtil.browse('Enter a file path to the collection configuration', quickPickItems, openDialogOptions) as string;
            if (collectionPath === undefined) {
                return;
            }
        }

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'IBM Blockchain Platform Extension',
            cancellable: false
        }, async (progress: vscode.Progress<{ message: string }>) => {

            progress.report({ message: 'Instantiating Smart Contract' });
            const connection: IFabricRuntimeConnection = await FabricRuntimeManager.instance().getConnection();

            VSCodeBlockchainDockerOutputAdapter.instance().show();
            let smartContractName: string;
            let smartContractVersion: string;
            if (packageEntry) {
                smartContractName = packageEntry.name;
                smartContractVersion = packageEntry.version;
            } else {
                smartContractName = data.packageEntry.name;
                smartContractVersion = data.packageEntry.version;
            }

            await connection.instantiateChaincode(smartContractName, smartContractVersion, peerNames, channelName, fcn, args, collectionPath);

            Reporter.instance().sendTelemetryEvent('instantiateCommand');

            outputAdapter.log(LogType.SUCCESS, 'Successfully instantiated smart contract');
            await vscode.commands.executeCommand(ExtensionCommands.REFRESH_GATEWAYS);
            await vscode.commands.executeCommand(ExtensionCommands.REFRESH_LOCAL_OPS);
        });
    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Error instantiating smart contract: ${error.message}`, `Error instantiating smart contract: ${error.toString()}`);
        return;
    }
}
