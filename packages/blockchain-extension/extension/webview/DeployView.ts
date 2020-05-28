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
import {ReactView} from './ReactView';
import {ExtensionUtil} from '../util/ExtensionUtil';
import {Reporter} from '../util/Reporter';
import {PackageRegistryEntry} from '../registries/PackageRegistryEntry';
import {ExtensionCommands} from '../../ExtensionCommands';
import {
    FabricEnvironmentRegistryEntry,
    FabricEnvironmentRegistry,
    IFabricEnvironmentConnection,
    FabricSmartContractDefinition,
    LogType
} from 'ibm-blockchain-platform-common';
import {FabricEnvironmentManager} from '../fabric/environments/FabricEnvironmentManager';
import {VSCodeBlockchainOutputAdapter} from '../logging/VSCodeBlockchainOutputAdapter';
import {PackageRegistry} from '../registries/PackageRegistry';
import {UserInputUtil} from '../commands/UserInputUtil';

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
        Reporter.instance().sendTelemetryEvent('openedView', {openedView: panel.title}); // Report that a user has opened a new panel

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
                await this.deploy(channelName, environmentName, selectedPackage, definitionName, definitionVersion, commitSmartContract);
            } else if (message.command === 'package') {
                const workspaceName: string = message.data.workspaceName;
                const entry: PackageRegistryEntry = await this.package(workspaceName);
                if (entry) {
                    DeployView.appState.selectedPackage = entry;
                    await DeployView.updatePackages();
                }
                // Else workspace failed to package
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

    async deploy(channelName: string, environmentName: string, selectedPackage: PackageRegistryEntry, definitionName: string, definitionVersion: string, commitSmartContract: boolean): Promise<void> {
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

            const channelMap: Map<string, string[]> = await connection.createChannelMap();

            const channelPeers: string[] = channelMap.get(channelName);

            const orgMap: Map<string, string[]> = new Map<string, string[]>();
            const orgNames: string[] = connection.getAllOrganizationNames();

            for (const orgName of orgNames) {
                let peerNames: string[] = connection.getAllPeerNamesForOrg(orgName);
                // ignore any orderer orgs
                if (peerNames.length > 0) {
                    // filter out any peers that are not part of the channel
                    peerNames = peerNames.filter((peerName: string) => {
                        return channelPeers.includes(peerName);
                    });

                    orgMap.set(orgName, peerNames);
                }
            }

            // Does this get the orderer on the channel?
            const ordererNames: string[] = connection.getAllOrdererNames();

            const allCommittedContracts: FabricSmartContractDefinition[] = await connection.getCommittedSmartContractDefinitions(channelPeers, channelName);

            const committedContract: FabricSmartContractDefinition = allCommittedContracts.find((_contract: FabricSmartContractDefinition) => {
                return _contract.name === definitionName;
            });

            let sequenceNumber: number;

            // TODO: Increment sequence number if endorsement policy or collection is passed.
            // https://hyperledger-fabric.readthedocs.io/en/release-2.0/chaincode_lifecycle.html for more info.

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

            if (commitSmartContract === undefined) {
                commitSmartContract = true; // Commit by default
            }

            await vscode.commands.executeCommand(ExtensionCommands.DEPLOY_SMART_CONTRACT, commitSmartContract, environmentEntry, ordererNames[0], channelName, orgMap, selectedPackage, new FabricSmartContractDefinition(definitionName, definitionVersion, sequenceNumber));
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
}
