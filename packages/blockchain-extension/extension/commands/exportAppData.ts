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
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs-extra';
import { InstantiatedTreeItem } from '../explorer/model/InstantiatedTreeItem';
import { ContractTreeItem } from '../explorer/model/ContractTreeItem';
import { FabricGatewayConnectionManager } from '../fabric/FabricGatewayConnectionManager';
import { ExtensionCommands } from '../../ExtensionCommands';
import { UserInputUtil, IBlockchainQuickPickItem } from './UserInputUtil';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { LogType, FabricGatewayRegistryEntry, ConnectionProfileUtil, FabricWalletRegistryEntry, IFabricWallet, FabricWalletGeneratorFactory, IFabricWalletGenerator, FabricIdentity, FabricEnvironmentRegistryEntry, FabricEnvironmentRegistry, FabricNode, FabricEnvironment } from 'ibm-blockchain-platform-common';
import { FabricGatewayHelper } from '../fabric/FabricGatewayHelper';
import { Reporter } from '../util/Reporter';
import { EnvironmentFactory } from '../fabric/environments/EnvironmentFactory';

export async function exportAppData(chaincode?: InstantiatedTreeItem | ContractTreeItem): Promise<any> {
    let chosenChaincode: IBlockchainQuickPickItem<{ name: string, channel: string, version: string }>;
    let appData: string = '';
    let chaincodeName: string;
    let channelName: string;
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();

    outputAdapter.log(LogType.INFO, undefined, 'exportAppData');

    // ask for gateway and smart contract if called from command palette
    if (!chaincode) {
        if (!FabricGatewayConnectionManager.instance().getConnection()) {
            // connect if not already connected
            await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_GATEWAY);
            if (!FabricGatewayConnectionManager.instance().getConnection()) {
                // either the user cancelled or there was an error so don't carry on
                return;
            }
        }
        chosenChaincode = await UserInputUtil.showClientInstantiatedSmartContractsQuickPick('Choose the smart contract you want to generate client app assets from');
        if (!chosenChaincode) {
            return;
        }
        chaincodeName = chosenChaincode.data.name;
        channelName = chosenChaincode.data.channel;
    } else {
        if (chaincode instanceof ContractTreeItem) {
            chaincodeName = chaincode.instantiatedChaincode.name;
            channelName = chaincode.channelName;
        } else {
            chaincodeName = chaincode.name;
            channelName = chaincode.channels[0].label;
        }
    }

    const items: IBlockchainQuickPickItem<string>[] = [{ label: UserInputUtil.GENERATE_ENVIRONMENT_PROFILE, data: UserInputUtil.GENERATE_ENVIRONMENT_PROFILE, description: UserInputUtil.GENERATE_ENVIRONMENT_PROFILE_DESCRIPTION }];
    const appAssets: IBlockchainQuickPickItem<string>[] = await UserInputUtil.showQuickPickItem('Choose which client app assets to generate', items, true) as IBlockchainQuickPickItem<string>[];
    if (!appAssets || appAssets.length === 0) {
        return;
    }

    // Ask the user where they want to export it to
    // set the default path to be the first open workspace folder
    let defaultPath: string;
    const fileName: string = 'env.properties';
    const workspaceFolders: Array<vscode.WorkspaceFolder> = UserInputUtil.getWorkspaceFolders();
    if (workspaceFolders.length > 0) {
        defaultPath = path.join(workspaceFolders[0].uri.fsPath, fileName);
    } else {
        defaultPath = path.join(os.homedir(), fileName);
    }

    let chosenPathUri: vscode.Uri;

    try {
        const connectedGateway: FabricGatewayRegistryEntry = await FabricGatewayConnectionManager.instance().getGatewayRegistryEntry();

        const connectionProfilePath: string = await FabricGatewayHelper.getConnectionProfilePath(connectedGateway);

        let connectionProfile: any = await ConnectionProfileUtil.readConnectionProfile(connectionProfilePath);
        delete connectionProfile.wallet;

        const connectionProfileString: string = JSON.stringify(connectionProfile);

        // check if the connection profile has localhost anywhere..
        if (connectionProfileString.includes('localhost')) {
            const envName: string = connectedGateway.fromEnvironment;
            if (!envName) {
                throw new Error('Gateway not supported');
            } else {
                connectionProfile = await updateConnectionProfile(envName, connectionProfile);
            }
        }

        const connectionProfileData: string = JSON.stringify(connectionProfile);

        appData += `FABRIC_CONNECTION_PROFILE=${connectionProfileData}\n`;

        const identityName: string = FabricGatewayConnectionManager.instance().getConnectionIdentity();
        const walletEntry: FabricWalletRegistryEntry = FabricGatewayConnectionManager.instance().getConnectionWallet();
        const FabricWalletGenerator: IFabricWalletGenerator = FabricWalletGeneratorFactory.getFabricWalletGenerator();
        const wallet: IFabricWallet = await FabricWalletGenerator.getWallet(walletEntry);
        const idNames: any = wallet.getIdentityNames();

        const chosenIDs: any = await UserInputUtil.showIdentitiesQuickPickBox('Choose the identities which you would like to export', true, idNames);
        if (!chosenIDs) {
            // User cancelled quickpick box
            return;
        } else if (chosenIDs.length === 0) {
            throw new Error('No identities were selected.');
        }

        const allIDs: FabricIdentity[] = await wallet.getIDs(chosenIDs);

        appData += `FABRIC_WALLET_CREDENTIALS=${[JSON.stringify(allIDs)]}\n`;
        appData += `FABRIC_DEFAULT_IDENTITY=${identityName}\n`;
        appData += `FABRIC_CHANNEL=${channelName}\n`;
        appData += `FABRIC_CONTRACT=${chaincodeName}`;

        chosenPathUri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file(defaultPath),
            saveLabel: 'Export'
        });
        if (!chosenPathUri) {
            // User cancelled save dialog box
            return;
        }

        await fs.writeFile(chosenPathUri.fsPath, appData);
    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Error exporting application data: ${error.message}`, `Error exporting application data: ${error.toString()}`);
        return;
    }
    outputAdapter.log(LogType.SUCCESS, `Successfully exported application data to ${chosenPathUri.fsPath}`);
    Reporter.instance().sendTelemetryEvent('exportAppDataCommand');
}

async function updateConnectionProfile(envName: string, connectionProfile: any): Promise<any> {
    const environmentEntry: FabricEnvironmentRegistryEntry = await FabricEnvironmentRegistry.instance().get(envName);
    const environment: FabricEnvironment = EnvironmentFactory.getEnvironment(environmentEntry) as FabricEnvironment;

    const nodes: FabricNode[] = await environment.getNodes();

    const peers: any = connectionProfile.peers;
    const certificateAuthorities: any = connectionProfile.certificateAuthorities;

    const peerKeys: string[] = Object.keys(peers);
    const caKeys: string[] = Object.keys(certificateAuthorities);
    peerKeys.forEach((key: string) => {
        const url: string = peers[key].url;
        const peer: FabricNode = nodes.find((node: FabricNode) => {
            if (node.name === key) {
                return node;
            }
        });
        const newURL: string = url.replace('localhost', peer.container_name.split('_')[1]);

        peers[key].url = newURL;
    });

    caKeys.forEach((key: string) => {
        const url: string = certificateAuthorities[key].url;
        const ca: FabricNode = nodes.find((node: FabricNode) => {
            if (node.name === key) {
                return node;
            }
        });
        const newURL: string = url.replace('localhost', ca.container_name.split('_')[1]);

        certificateAuthorities[key].url = newURL;
    });

    connectionProfile.peers = peers;
    connectionProfile.certificateAuthorities = certificateAuthorities;

    return connectionProfile;
}
