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
import * as fs from 'fs-extra';
import { IBlockchainQuickPickItem, UserInputUtil } from './UserInputUtil';
import { ChannelTreeItem } from '../explorer/model/ChannelTreeItem';
import { BlockchainTreeItem } from '../explorer/model/BlockchainTreeItem';
import { Reporter } from '../util/Reporter';
import { PackageRegistryEntry } from '../registries/PackageRegistryEntry';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { ExtensionCommands } from '../../ExtensionCommands';
import { VSCodeBlockchainDockerOutputAdapter } from '../logging/VSCodeBlockchainDockerOutputAdapter';
import { FabricEnvironmentRegistryEntry, IFabricEnvironmentConnection, LogType, FabricRuntimeUtil } from 'ibm-blockchain-platform-common';
import { FabricEnvironmentManager } from '../fabric/environments/FabricEnvironmentManager';
import { PackageRegistry } from '../registries/PackageRegistry';
import { FabricDebugConfigurationProvider } from '../debug/FabricDebugConfigurationProvider';

export async function instantiateSmartContract(treeItem?: BlockchainTreeItem, channelName?: string, peerNames?: Array<string>): Promise<void> {

    let packageToInstall: PackageRegistryEntry;
    let packageEntry: PackageRegistryEntry;
    let smartContractName: string;
    let smartContractVersion: string;
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, 'instantiateSmartContract');

    let connection: IFabricEnvironmentConnection = FabricEnvironmentManager.instance().getConnection();
    if (!connection) {
        await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT);
        connection = FabricEnvironmentManager.instance().getConnection();
        if (!connection) {
            // something went wrong with connecting so return
            return;
        }
    }

    if (treeItem instanceof ChannelTreeItem) {
        // If clicked on runtime channel
        channelName = treeItem.label;
        peerNames = treeItem.peers;
    } else if (!channelName && !peerNames) {

        const chosenChannel: IBlockchainQuickPickItem<Array<string>> = await UserInputUtil.showChannelQuickPickBox('Choose a channel to instantiate the smart contract on');
        if (!chosenChannel) {
            return;
        }
        channelName = chosenChannel.label;
        peerNames = chosenChannel.data;

    }

    try {

        let data: { packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder };
        let chosenChaincode: IBlockchainQuickPickItem<{ packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder }>;

        if (vscode.debug.activeDebugSession && vscode.debug.activeDebugSession.configuration.debugEvent === FabricDebugConfigurationProvider.debugEvent) {
            // called from debug session - get the chaincode ID name and folder used to debug
            smartContractName = vscode.debug.activeDebugSession.configuration.env.CORE_CHAINCODE_ID_NAME.split(':')[0];
            smartContractVersion = vscode.debug.activeDebugSession.configuration.env.CORE_CHAINCODE_ID_NAME.split(':')[1];
        } else {
            // Not called during debugging, ask for smart contract to instantiate
            chosenChaincode = await UserInputUtil.showChaincodeAndVersionQuickPick('Choose a smart contract and version to instantiate', channelName, peerNames);
            if (!chosenChaincode) {
                return;
            }
            data = chosenChaincode.data;
            packageToInstall = chosenChaincode.data.packageEntry;
        }

        if (chosenChaincode && chosenChaincode.description === 'Open Project') {
            // Project needs packaging and installing

            // Package smart contract project using the given 'open workspace'
            packageToInstall = await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT, data.workspace);
            if (!packageToInstall) {
                return;
            }
        } else if (vscode.debug.activeDebugSession && vscode.debug.activeDebugSession.configuration.debugEvent === FabricDebugConfigurationProvider.debugEvent) {
            // Called from debug session so override package command parameters with smart contract name and version
            const packageRegistryEntry: PackageRegistryEntry = await PackageRegistry.instance().get(smartContractName, smartContractVersion);
            if (!packageRegistryEntry) {
                packageToInstall = await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT, vscode.debug.activeDebugSession.workspaceFolder, smartContractName, smartContractVersion);
                if (!packageToInstall) {
                    return;
                }
            } else {
                packageToInstall = packageRegistryEntry;
            }
        }
        if ((chosenChaincode && chosenChaincode.description === 'Open Project') || (chosenChaincode && chosenChaincode.description === 'Packaged') || vscode.debug.activeDebugSession) {
            let doInstall: boolean = true;
            if (vscode.debug.activeDebugSession && vscode.debug.activeDebugSession.configuration.debugEvent === FabricDebugConfigurationProvider.debugEvent) {
                // on local fabric so assume one peer
                const installedChaincode: Map<string, string[]> = await connection.getInstalledChaincode(peerNames[0]);
                if (installedChaincode.has(smartContractName)) {
                    const version: string = installedChaincode.get(smartContractName).find((_version: string) => _version === smartContractVersion);
                    if (version) {
                        doInstall = false;
                    }
                }
            }

            if (doInstall) {
                // Install smart contract package
                packageEntry = await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT, undefined, peerNames, packageToInstall);
                if (!packageEntry) {
                    // Either a package wasn't selected or the package didnt successfully install on all peers and an error was thrown
                    return;
                }

                smartContractName = packageEntry.name;
                smartContractVersion = packageEntry.version;
            }
        } else {
            // Installed smart contract chosen
            smartContractName = data.packageEntry.name;
            smartContractVersion = data.packageEntry.version;
        }
        // Project should be packaged and installed. Now the package can be instantiated.

        const fcn: string = await UserInputUtil.showInputBox('optional: What function do you want to call on instantiate?');

        let args: Array<string>;
        if (fcn === undefined) {
            return;
        } else if (fcn === '') {
            args = [];
        } else {
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

        let contractEP: any;
        const wantsContractEP: string = await UserInputUtil.showQuickPick('Choose a smart contract endorsement policy', [UserInputUtil.DEFAULT_SC_EP, UserInputUtil.CUSTOM]) as string;

        if (!wantsContractEP) {
            return;
        } else if (wantsContractEP === UserInputUtil.CUSTOM) {

            const openDialogOptions: vscode.OpenDialogOptions = {
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                openLabel: 'Select',
                filters: {
                    Identity: ['json']
                }
            };

            const jsonEpPath: vscode.Uri = await UserInputUtil.browse('Browse for the JSON file containing the smart contract endorsement policy', [UserInputUtil.BROWSE_LABEL], openDialogOptions, true) as vscode.Uri;
            if (!jsonEpPath) {
                return;
            }

            const jsonEpContents: string = await fs.readFile(jsonEpPath.fsPath, 'utf8');
            try {
                contractEP = JSON.parse(jsonEpContents);
            } catch (error) {
                outputAdapter.log(LogType.ERROR, `Unable to read smart contract endorsement policy: ${error.message}`);
                return;
            }

        }

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'IBM Blockchain Platform Extension',
            cancellable: false
        }, async (progress: vscode.Progress<{ message: string }>) => {

            progress.report({ message: 'Instantiating Smart Contract' });

            const fabricEnvironmentRegistryEntry: FabricEnvironmentRegistryEntry = FabricEnvironmentManager.instance().getEnvironmentRegistryEntry();
            if (fabricEnvironmentRegistryEntry.name === FabricRuntimeUtil.LOCAL_FABRIC) {
                VSCodeBlockchainDockerOutputAdapter.instance().show();
            }

            await connection.instantiateChaincode(smartContractName, smartContractVersion, peerNames, channelName, fcn, args, collectionPath, contractEP);

            Reporter.instance().sendTelemetryEvent('instantiateCommand');

            outputAdapter.log(LogType.SUCCESS, 'Successfully instantiated smart contract');
            await vscode.commands.executeCommand(ExtensionCommands.REFRESH_GATEWAYS);
            await vscode.commands.executeCommand(ExtensionCommands.REFRESH_ENVIRONMENTS);
        });
    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Error instantiating smart contract: ${error.message}`, `Error instantiating smart contract: ${error.toString()}`);
        return;
    }
}
