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
import * as fs from 'fs-extra';
import { ReactView } from './ReactView';
import { ExtensionUtil } from '../util/ExtensionUtil';
import { Reporter } from '../util/Reporter';
import { PackageRegistryEntry } from '../registries/PackageRegistryEntry';
import { ExtensionCommands } from '../../ExtensionCommands';
import {
    FabricEnvironmentRegistryEntry,
    FabricEnvironmentRegistry,
    IFabricEnvironmentConnection,
    FabricSmartContractDefinition,
    LogType,
    FabricCollectionDefinition
} from 'ibm-blockchain-platform-common';
import { FabricEnvironmentManager } from '../fabric/environments/FabricEnvironmentManager';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { PackageRegistry } from '../registries/PackageRegistry';
import { UserInputUtil } from '../commands/UserInputUtil';

export class DeployView extends ReactView {
    public static panel: vscode.WebviewPanel;
    public static appState: any;

    static async updatePackages(): Promise<void> {
        const packages: PackageRegistryEntry[] = await PackageRegistry.instance().getAll();
        DeployView.appState.packageEntries = packages;
        DeployView.panel.webview.postMessage({
            path: '/deploy',
            deployData: DeployView.appState
        });
    }

    constructor(context: vscode.ExtensionContext, appState: any) {
        super(context, 'deploySmartContract', 'Deploy Smart Contract');
        DeployView.appState = appState;
    }

    async openPanelInner(panel: vscode.WebviewPanel): Promise<void> {
        Reporter.instance().sendTelemetryEvent('openedView', { openedView: panel.title }); // Report that a user has opened a new panel

        DeployView.panel = panel;

        panel.onDidDispose(() => {
            DeployView.panel = undefined;
        });

        const extensionPath: string = ExtensionUtil.getExtensionPath();
        const panelIcon: vscode.Uri = vscode.Uri.file(path.join(extensionPath, 'resources', 'logo.svg'));

        panel.iconPath = panelIcon;

        panel.webview.onDidReceiveMessage(async (message: { command: string, data: any }) => {
            if (message.command === 'deploy') {
                const channelName: string = message.data.channelName;
                const environmentName: string = message.data.environmentName;
                const selectedPackage: PackageRegistryEntry = message.data.selectedPackage;
                const definitionName: string = message.data.definitionName;
                const definitionVersion: string = message.data.definitionVersion;
                const commitSmartContract: boolean = message.data.commitSmartContract;
                const endorsementPolicy: string = message.data.endorsementPolicy;
                const collectionConfigPath: string = message.data.collectionConfigPath;
                const selectedPeers: string[] = message.data.selectedPeers;

                await this.deploy(channelName, environmentName, selectedPackage, definitionName, definitionVersion, commitSmartContract, endorsementPolicy, collectionConfigPath, selectedPeers);
            } else if (message.command === 'package') {
                const workspaceName: string = message.data.workspaceName;
                const entry: PackageRegistryEntry = await this.package(workspaceName);
                if (entry) {
                    DeployView.appState.selectedPackage = entry;
                    await DeployView.updatePackages();
                }
                // Else workspace failed to package
            } else if (message.command === 'getOrgApprovals') {
                const environmentName: string = message.data.environmentName;
                const channelName: string = message.data.channelName;
                const definitionName: string = message.data.definitionName;
                const definitionVersion: string = message.data.definitionVersion;
                const endorsementPolicy: string = message.data.endorsementPolicy;
                const collectionConfigPath: string = message.data.collectionConfigPath;

                await this.getOrgApprovals(environmentName, channelName, definitionName, definitionVersion, endorsementPolicy, collectionConfigPath);
            }
        });

        await this.loadComponent(panel);
    }

    async loadComponent(panel: vscode.WebviewPanel): Promise<void> {

        panel.webview.postMessage({
            path: '/deploy',
            deployData: DeployView.appState
        });
    }

    async deploy(channelName: string, environmentName: string, selectedPackage: PackageRegistryEntry, definitionName: string, definitionVersion: string, commitSmartContract: boolean, endorsementPolicy: string, collectionConfigPath: string, selectedPeers: string[]): Promise<void> {
        const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();

        try {
            DeployView.panel.dispose(); // Close the panel before attempting to deploy.

            const environmentEntry: FabricEnvironmentRegistryEntry = await FabricEnvironmentRegistry.instance().get(environmentName);

            let connection: IFabricEnvironmentConnection = FabricEnvironmentManager.instance().getConnection();
            if (connection) {
                // Check we're connected to the selected environment
                const connectedName: string = connection.environmentName;
                if (connectedName !== environmentEntry.name) {
                    // If we're not connected to the selected environment we should disconnect, then connect to the correct environment.
                    await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT_ENVIRONMENT);
                    await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentEntry);
                    connection = FabricEnvironmentManager.instance().getConnection();
                }
            } else {
                await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentEntry);
                connection = FabricEnvironmentManager.instance().getConnection();
            }

            if (!connection) {
                // This can occur if the runtime isn't running, then gets started by the connect, but it fails.
                throw new Error(`Unable to deploy, cannot connect to environment: ${environmentEntry.name}`);
            }

            // All discovered orgs and peers.
            const orgMap: Map<string, string[]> = await connection.getDiscoveredOrgs(channelName);

            const channelMap: Map<string, string[]> = await connection.createChannelMap();

            // Environment's peers
            const channelPeers: string[] = channelMap.get(channelName);

            const installApproveMap: Map<string, string[]> = new Map();
            const commitMap: Map<string, string[]> = new Map();

            // For all discovered org & peers
            for (const [org, peers] of orgMap.entries()) {
                for (const peer of peers) {
                    // If the peer is in the environment
                    if (channelPeers.includes(peer)) {
                        if (!installApproveMap.has(org)) {
                            installApproveMap.set(org, [peer]);
                            commitMap.set(org, [peer]);
                        } else {
                            installApproveMap.get(org).push(peer);
                            commitMap.get(org).push(peer);
                        }
                    } else {
                        // If the peer isn't in the environment but it has been selected for committing, add it to the commit map only
                        if (selectedPeers.includes(peer)) {
                            if (!commitMap.has(org)) {
                                commitMap.set(org, [peer]);
                            } else {
                                commitMap.get(org).push(peer);
                            }
                        }

                    }
                }
            }

            const ordererNames: string[] = connection.getAllOrdererNames();

            const allCommittedContracts: FabricSmartContractDefinition[] = await connection.getCommittedSmartContractDefinitions(channelPeers, channelName);

            const committedContract: FabricSmartContractDefinition = allCommittedContracts.find((_contract: FabricSmartContractDefinition) => {
                return _contract.name === definitionName;
            });

            let sequenceNumber: number;

            if (!committedContract) {
                // New contract
                sequenceNumber = 1;
            } else {
                if (committedContract.version !== definitionVersion) {
                    // If the definition version has changed, bump the sequence number
                    sequenceNumber = committedContract.sequence + 1;
                } else {
                    // Upgrade - package has changed, but definition is the same (?)
                    sequenceNumber = committedContract.sequence;
                    if (commitSmartContract === undefined) {
                        commitSmartContract = false;
                    }
                }
            }

            if (collectionConfigPath || endorsementPolicy) {
                // Always increment sequence
                sequenceNumber = committedContract ? committedContract.sequence + 1 : 1;
            }

            let collectionFile: FabricCollectionDefinition[];
            if (collectionConfigPath) {
                collectionFile = await fs.readJSON(collectionConfigPath) as FabricCollectionDefinition[];
            }

            if (endorsementPolicy) {
                // Replace double quotes with single quotes
                endorsementPolicy = endorsementPolicy.replace(/"/g, "\'");
            }

            if (commitSmartContract === undefined) {
                commitSmartContract = true; // Commit by default
            }

            await vscode.commands.executeCommand(ExtensionCommands.DEPLOY_SMART_CONTRACT, commitSmartContract, environmentEntry, ordererNames[0], channelName, installApproveMap, selectedPackage, new FabricSmartContractDefinition(definitionName, definitionVersion, sequenceNumber, undefined, endorsementPolicy, collectionFile), commitMap);
        } catch (error) {
            outputAdapter.log(LogType.ERROR, error.message, error.toString());
        }

    }

    async package(workspaceName: string): Promise<PackageRegistryEntry> {
        const workspaces: vscode.WorkspaceFolder[] = UserInputUtil.getWorkspaceFolders();
        const workspace: vscode.WorkspaceFolder = workspaces.find((_workspace: vscode.WorkspaceFolder) => _workspace.name === workspaceName);

        const packageEntry: PackageRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT, workspace);
        return packageEntry;
    }

    async getOrgApprovals(environmentName: string, channelName: string, definitionName: string, definitionVersion: string, endorsementPolicy: string, collectionConfigPath: string): Promise<void> {
        const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();

        try {

            const environmentEntry: FabricEnvironmentRegistryEntry = await FabricEnvironmentRegistry.instance().get(environmentName);

            let connection: IFabricEnvironmentConnection = FabricEnvironmentManager.instance().getConnection();
            if (connection) {
                // Check we're connected to the selected environment
                const connectedName: string = connection.environmentName;
                if (connectedName !== environmentEntry.name) {
                    // If we're not connected to the selected environment we should disconnect, then connect to the correct environment.
                    await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT_ENVIRONMENT);
                    await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentEntry);
                    connection = FabricEnvironmentManager.instance().getConnection();
                }
            } else {
                await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentEntry);
                connection = FabricEnvironmentManager.instance().getConnection();
            }

            if (!connection) {
                // This can occur if the runtime isn't running, then gets started by the connect, but it fails.
                throw new Error(`Unable to deploy, cannot connect to environment: ${environmentEntry.name}`);
            }

            const channelMap: Map<string, string[]> = await connection.createChannelMap();
            const channelPeers: string[] = channelMap.get(channelName);

            const allCommittedContracts: FabricSmartContractDefinition[] = await connection.getCommittedSmartContractDefinitions(channelPeers, channelName);

            const committedContract: FabricSmartContractDefinition = allCommittedContracts.find((_contract: FabricSmartContractDefinition) => {
                return _contract.name === definitionName;
            });

            let sequenceNumber: number;

            if (!committedContract) {
                // New contract
                sequenceNumber = 1;
            } else if (committedContract && committedContract.version !== definitionVersion) {
                sequenceNumber = committedContract.sequence + 1;
            } else {
                sequenceNumber = committedContract.sequence; // This should throw an error in the view
            }

            const definition: FabricSmartContractDefinition = new FabricSmartContractDefinition(definitionName, definitionVersion, sequenceNumber);

            if (collectionConfigPath) {
                const collectionFile: FabricCollectionDefinition[] = await fs.readJSON(collectionConfigPath) as FabricCollectionDefinition[];
                definition.collectionConfig = collectionFile;
            }

            if (endorsementPolicy) {
                // Replace double quotes with single quotes
                definition.endorsementPolicy = endorsementPolicy.replace(/"/g, "\'");
            }

            let orgApprovals: Map<string, boolean> = new Map();
            try {
                orgApprovals = await connection.getOrgApprovals(channelName, channelPeers[0], definition);
            } catch (error) {
                // Likely errored as the contract has been committed already.
                // orgApprovals will remain an empty map and the view will handle the error message.
            }

            // Covert map to object, as React doesn't understand.
            const orgObject: any = {};
            orgApprovals.forEach((approval: boolean, org: string) => {
                orgObject[org] = approval;
            });

            DeployView.appState.orgApprovals = orgObject;
            DeployView.panel.webview.postMessage({
                path: '/deploy',
                deployData: DeployView.appState
            });
        } catch (error) {
            outputAdapter.log(LogType.ERROR, error.message, error.toString());
        }
    }
}
