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
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { LogType, FabricEnvironmentRegistryEntry, IFabricEnvironmentConnection, FabricSmartContractDefinition } from 'ibm-blockchain-platform-common';
import { DeployView } from '../webview/DeployView';
import { GlobalState } from '../util/GlobalState';
import { UserInputUtil, IBlockchainQuickPickItem } from './UserInputUtil';
import { FabricEnvironmentManager } from '../fabric/environments/FabricEnvironmentManager';
import { ExtensionCommands } from '../../ExtensionCommands';
import { PackageRegistryEntry } from '../registries/PackageRegistryEntry';
import { PackageRegistry } from '../registries/PackageRegistry';

export async function openDeployView(fabricRegistryEntry?: FabricEnvironmentRegistryEntry, channelName?: string): Promise<void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();

    try {
        if (!fabricRegistryEntry) {
            // Select environment
            const _chosenEnvironment: IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry> = await UserInputUtil.showFabricEnvironmentQuickPickBox('Select an environment', false, false) as IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>;
            if (!_chosenEnvironment) {
                return;
            }

            fabricRegistryEntry = _chosenEnvironment.data;
        }

        const selectedEnvironmentName: string = fabricRegistryEntry.name;

        let connection: IFabricEnvironmentConnection = FabricEnvironmentManager.instance().getConnection();

        if (connection) {
            // Check we're connected to the selected environment
            const connectedName: string = connection.environmentName;
            if (connectedName !== selectedEnvironmentName) {
                // If we're not connected to the selected environment we should disconnect, then connect to the correct environment.
                await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT_ENVIRONMENT);
                await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT, fabricRegistryEntry);
                connection = FabricEnvironmentManager.instance().getConnection();
            }
        } else {
            await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT, fabricRegistryEntry);
            connection = FabricEnvironmentManager.instance().getConnection();
        }

        if (!connection) {
            // This can occur if the runtime isn't running, then gets started by the connect, but it fails.
            throw new Error(`Unable to connect to environment: ${selectedEnvironmentName}`);
        }

        if (!channelName) {
            // Select environment's channel
            const _chosenChannel: IBlockchainQuickPickItem<Array<string>> = await UserInputUtil.showChannelQuickPickBox('Select a channel');
            if (!_chosenChannel) {
                return;
            }

            channelName = _chosenChannel.label;
        }

        const channelMap: Map<string, string[]> = await connection.createChannelMap();
        const channelPeers: string[] = channelMap.get(channelName);

        let hasV1Capabilities: boolean = false;
        for (const peer of channelPeers) {
            const capabilities: string[] = await connection.getChannelCapabilityFromPeer(channelName, peer);
            if (!capabilities.includes('V2_0')) {
                hasV1Capabilities = true;
            }
        }

        let packageEntries: PackageRegistryEntry[] = [];
        const allPackageEntries: PackageRegistryEntry[] = await PackageRegistry.instance().getAll();
        packageEntries = allPackageEntries.filter((entry: PackageRegistryEntry) => {
            const fileExtension: string = UserInputUtil.getPackageFileExtension(entry.path);
            return hasV1Capabilities ? fileExtension === '.cds' : fileExtension !== '.cds';
        });

        const workspaceFolders: readonly vscode.WorkspaceFolder[] = UserInputUtil.getWorkspaceFolders();
        const workspaceNames: string[] = workspaceFolders.map((item: vscode.WorkspaceFolder) => item.name);

        const allCommittedContracts: FabricSmartContractDefinition[] = await connection.getCommittedSmartContractDefinitions(channelPeers, channelName);
        const committedDefinitions: string[] = allCommittedContracts.map((definition: FabricSmartContractDefinition) => `${definition.name}@${definition.version}`);

        // All discovered peers (including connecting orgs peers)
        const allDiscoveredPeers: string[] = await connection.getAllDiscoveredPeerNames(channelName);

        // Filter all discovered peers, so we only have those not part of the org
        const environmentPeers: string[] = [];
        const discoveredPeers: string[] = [];
        for (const peer of allDiscoveredPeers) {
            if (channelPeers.includes(peer)) {
                environmentPeers.push(peer);
            } else {
                discoveredPeers.push(peer);
            }
        }

        const _orgMap: Map<string, string[]> = await connection.getDiscoveredOrgs(channelName);

        // Covert map to object, as React doesn't understand.
        const orgMap: any = {};
        _orgMap.forEach((peers: string[], org: string) => {
            orgMap[org] = peers;
        });

        const appState: { channelName: string, hasV1Capabilities: boolean, environmentName: string, packageEntries: PackageRegistryEntry[], workspaceNames: string[], committedDefinitions: string[], environmentPeers: string[], discoveredPeers: string[], orgMap: any } = {
            channelName,
            hasV1Capabilities,
            environmentName: selectedEnvironmentName,
            packageEntries,
            workspaceNames,
            committedDefinitions,
            environmentPeers,
            discoveredPeers,
            orgMap
        };

        const context: vscode.ExtensionContext = GlobalState.getExtensionContext();

        const deployView: DeployView = new DeployView(context, appState);
        await deployView.openView(true);

    } catch (error) {
        outputAdapter.log(LogType.ERROR, error.message, error.toString());
    }
}
