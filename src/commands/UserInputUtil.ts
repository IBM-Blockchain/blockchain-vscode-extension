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
import * as homeDir from 'home-dir';
import * as fs from 'fs-extra';
import * as path from 'path';
import { FabricConnectionManager } from '../fabric/FabricConnectionManager';
import { PackageRegistry } from '../packages/PackageRegistry';
import { PackageRegistryEntry } from '../packages/PackageRegistryEntry';
import { FabricGatewayRegistryEntry } from '../fabric/FabricGatewayRegistryEntry';
import { MetadataUtil } from '../util/MetadataUtil';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../logging/OutputAdapter';
import { FabricRuntimeManager } from '../fabric/FabricRuntimeManager';
import { FabricGatewayRegistry } from '../fabric/FabricGatewayRegistry';
import { FabricCertificate } from '../fabric/FabricCertificate';
import { FabricWalletRegistryEntry } from '../fabric/FabricWalletRegistryEntry';
import { FabricWalletRegistry } from '../fabric/FabricWalletRegistry';
import { IFabricWallet } from '../fabric/IFabricWallet';
import { FabricWalletGeneratorFactory } from '../fabric/FabricWalletGeneratorFactory';
import { IFabricEnvironmentConnection } from '../fabric/IFabricEnvironmentConnection';
import { IFabricClientConnection } from '../fabric/IFabricClientConnection';
import { FabricWalletUtil } from '../fabric/FabricWalletUtil';
import { FabricNode, FabricNodeType } from '../fabric/FabricNode';
import { SettingConfigurations } from '../../SettingConfigurations';
import { FabricEnvironmentRegistryEntry } from '../fabric/FabricEnvironmentRegistryEntry';
import { FabricEnvironmentManager } from '../fabric/FabricEnvironmentManager';
import { FabricEnvironment } from '../fabric/FabricEnvironment';
import { FabricEnvironmentRegistry } from '../fabric/FabricEnvironmentRegistry';

export interface IBlockchainQuickPickItem<T = undefined> extends vscode.QuickPickItem {
    data: T;
}

export enum LanguageType {
    CHAINCODE = 'chaincode',
    CONTRACT = 'contract'
}

export interface LanguageQuickPickItem extends vscode.QuickPickItem {
    type: LanguageType;
}

export class UserInputUtil {

    static readonly ADD_TO_WORKSPACE: string = 'Add to workspace';
    static readonly OPEN_IN_CURRENT_WINDOW: string = 'Open in current window';
    static readonly OPEN_IN_NEW_WINDOW: string = 'Open in new window';
    static readonly YES: string = 'Yes';
    static readonly NO: string = 'No';
    static readonly OVERWRITE_FILE: string = 'Overwrite file';
    static readonly SKIP_FILE: string = 'Skip file';
    static readonly FORCE_FILES: string = 'Force all files to overwrite';
    static readonly ABORT_GENERATOR: string = 'Abort generator';
    static readonly BROWSE_LABEL: string = '📁 Browse';
    static readonly VALID_FOLDER_NAME: string = '- Folder can only contain alphanumeric, "-" and "_" characters';
    static readonly GENERATE_NEW_TEST_FILE: string = 'Generate new test file';
    static readonly IMPORT_WALLET: string = 'Specify an existing file system wallet';
    static readonly WALLET_NEW_ID: string = 'Create a new wallet and add an identity';
    static readonly WALLET: string = 'Create a new wallet';
    static readonly ADD_IDENTITY_METHOD: string = 'Choose a method for adding an identity';
    static readonly ADD_CERT_KEY_OPTION: string = 'Provide certificate and private key files';
    static readonly ADD_ID_SECRET_OPTION: string = 'Select a gateway and provide an enrollment ID and secret';
    static readonly ADD_LOCAL_ID_SECRET_OPTION: string = 'Provide an enrollment ID and secret';
    static readonly ADD_JSON_ID_OPTION: string = 'Provide a JSON identity file from IBM Blockchain Platform';

    static readonly ADD_MORE_NODES: string = 'Add more (JSON) node definitions';
    static readonly DONE_ADDING_NODES: string = 'Done adding nodes';
    static readonly ADD_IDENTITY: string = '+ Add identity';
    static readonly ADD_GATEWAY_FROM_ENVIRONMENT: string = 'Create a gateway from a Fabric environment';
    static readonly ADD_GATEWAY_FROM_CCP: string = 'Create a gateway from a connection profile';

    public static async showQuickPick(prompt: string, items: string[]): Promise<string> {
        const quickPickOptions: vscode.QuickPickOptions = {
            ignoreFocusOut: false,
            canPickMany: false,
            placeHolder: prompt
        };

        return vscode.window.showQuickPick(items, quickPickOptions);
    }

    public static async showOrgQuickPick(prompt: string, environmentName: string): Promise<IBlockchainQuickPickItem<FabricNode>> {
        const quickPickOptions: vscode.QuickPickOptions = {
            ignoreFocusOut: false,
            canPickMany: false,
            placeHolder: prompt
        };

        const environment: FabricEnvironment = new FabricEnvironment(environmentName);
        let nodes: FabricNode[] = await environment.getNodes();

        nodes = nodes.filter((node: FabricNode) => node.type === FabricNodeType.PEER);

        const items: Array<IBlockchainQuickPickItem<FabricNode>> = [];

        for (const node of nodes) {
            const found: boolean = items.some((item: IBlockchainQuickPickItem<FabricNode>) => item.data.msp_id === node.msp_id);

            if (!found) {
                items.push({ label: node.msp_id, data: node });
            }
        }

        if (items.length === 0) {
            throw new Error('No organisations found');
        } else if (items.length === 1) {
            return items[0];
        }

        return vscode.window.showQuickPick(items, quickPickOptions);
    }

    public static async showFabricEnvironmentQuickPickBox(prompt: string, showLocalFabric: boolean = false): Promise<IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry> | undefined> {
        const quickPickOptions: vscode.QuickPickOptions = {
            ignoreFocusOut: false,
            canPickMany: false,
            placeHolder: prompt
        };

        const allEnvironments: Array<FabricEnvironmentRegistryEntry> = [];

        if (showLocalFabric) {
            const runtimeEnvironment: FabricEnvironmentRegistryEntry = await FabricRuntimeManager.instance().getEnvironmentRegistryEntry();
            allEnvironments.push(runtimeEnvironment);
        }

        const environments: FabricEnvironmentRegistryEntry[] = await FabricEnvironmentRegistry.instance().getAll();
        allEnvironments.push(...environments);

        const environmentsQuickPickItems: Array<IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>> = allEnvironments.map((environment: FabricEnvironmentRegistryEntry) => {
            return { label: environment.name, data: environment };
        });

        if (environmentsQuickPickItems.length === 1) {
            return environmentsQuickPickItems[0];
        } else if (environmentsQuickPickItems.length === 0) {
            throw new Error('Error when choosing environment, no environments found to choose from.');
        }

        return vscode.window.showQuickPick(environmentsQuickPickItems, quickPickOptions);
    }

    public static async showGatewayQuickPickBox(prompt: string, showManagedRuntime?: boolean, showAssociatedGateways?: boolean): Promise<IBlockchainQuickPickItem<FabricGatewayRegistryEntry> | undefined> {
        const quickPickOptions: vscode.QuickPickOptions = {
            ignoreFocusOut: false,
            canPickMany: false,
            placeHolder: prompt
        };

        const allGateways: Array<FabricGatewayRegistryEntry> = [];

        if (showManagedRuntime) {
            // Allow users to choose local_fabric
            const runtimeGateways: Array<FabricGatewayRegistryEntry> = await FabricRuntimeManager.instance().getGatewayRegistryEntries();
            allGateways.push(...runtimeGateways);
        }

        let gateways: Array<FabricGatewayRegistryEntry> = FabricGatewayRegistry.instance().getAll();

        if (showAssociatedGateways !== undefined) {
            gateways = gateways.filter((gateway: FabricGatewayRegistryEntry) => {
                if (showAssociatedGateways) {
                    return gateway.associatedWallet;
                } else {
                    return !gateway.associatedWallet;
                }

            });
        }

        allGateways.push(...gateways);

        const gatewaysQuickPickItems: Array<IBlockchainQuickPickItem<FabricGatewayRegistryEntry>> = allGateways.map((gateway: FabricGatewayRegistryEntry) => {
            return { label: gateway.name, data: gateway };
        });

        return vscode.window.showQuickPick(gatewaysQuickPickItems, quickPickOptions);
    }

    public static showInputBox(question: string, defaultValue?: string): Thenable<string | undefined> {
        const inputBoxOptions: vscode.InputBoxOptions = {
            prompt: question,
            ignoreFocusOut: true,
            value: defaultValue,
            valueSelection: [0, 0]
        };

        return vscode.window.showInputBox(inputBoxOptions);
    }

    public static async addMoreNodes(prompt: string): Promise<string> {
        const quickPickOptions: vscode.QuickPickOptions = {
            ignoreFocusOut: false,
            canPickMany: false,
            placeHolder: prompt
        };

        const quickPickItems: string[] = [UserInputUtil.ADD_MORE_NODES, UserInputUtil.DONE_ADDING_NODES];
        return vscode.window.showQuickPick(quickPickItems, quickPickOptions);
    }

    public static async showWorkspaceQuickPickBox(prompt: string): Promise<IBlockchainQuickPickItem<vscode.WorkspaceFolder> | undefined> {
        const workspaceFolderOptions: vscode.WorkspaceFolder[] = UserInputUtil.getWorkspaceFolders();

        const workspaceQuickPickItems: Array<IBlockchainQuickPickItem<vscode.WorkspaceFolder>> = workspaceFolderOptions.map((workspaceFolderOption: vscode.WorkspaceFolder) => {
            return { label: workspaceFolderOption.name, data: workspaceFolderOption };
        });
        const quickPickOptions: vscode.QuickPickOptions = {
            ignoreFocusOut: true,
            canPickMany: false,
            matchOnDetail: true,
            placeHolder: prompt
        };

        return vscode.window.showQuickPick(workspaceQuickPickItems, quickPickOptions);
    }
    /**
     * Method to retrieve all the smart contract projects within the active workspace.
     * @returns {<Array<vscode.WorkspaceFolder>>} An Array of all folders in the current workspace
     */
    public static getWorkspaceFolders(): Array<vscode.WorkspaceFolder> {
        const workspace: vscode.WorkspaceFolder[] = vscode.workspace.workspaceFolders || [];
        return workspace;
    }
    /**
     * Method to replace ~ with OS's home directory, of a path
     * @param {String} dir String containing path
     * @returns {String} Returns dir.
     *
     */
    public static getDirPath(dir: string): string {
        if (dir.startsWith('~')) {
            dir = homeDir(dir.replace('~', ''));
        }
        return dir;
    }

    public static showIdentitiesQuickPickBox(prompt: string, identities: string[], showCreate: boolean = false): Thenable<string> {

        const quickPickOptions: vscode.QuickPickOptions = {
            ignoreFocusOut: true,
            canPickMany: false,
            placeHolder: prompt
        };

        if (showCreate) {
            identities.push(UserInputUtil.ADD_IDENTITY);
        }

        return vscode.window.showQuickPick(identities, quickPickOptions);
    }

    public static showFolderOptions(prompt: string): Thenable<string | undefined> {
        const options: Array<string> = [this.ADD_TO_WORKSPACE, this.OPEN_IN_NEW_WINDOW, this.OPEN_IN_CURRENT_WINDOW];

        const quickPickOptions: vscode.QuickPickOptions = {
            ignoreFocusOut: true,
            canPickMany: false,
            placeHolder: prompt
        };

        return vscode.window.showQuickPick(options, quickPickOptions);
    }

    public static showQuickPickYesNo(prompt: string): Thenable<string | undefined> {
        const options: Array<string> = [this.NO, this.YES];

        const quickPickOptions: vscode.QuickPickOptions = {
            ignoreFocusOut: true,
            canPickMany: false,
            placeHolder: prompt
        };

        return vscode.window.showQuickPick(options, quickPickOptions);
    }

    public static showQuickPickCA(listOfCAs: string[]): Thenable<string | undefined> {
        const prompt: string = 'Choose your desired CA from the list';

        const quickPickOptions: vscode.QuickPickOptions = {
            ignoreFocusOut: true,
            canPickMany: false,
            placeHolder: prompt
        };

        return vscode.window.showQuickPick(listOfCAs, quickPickOptions);
    }

    public static async showPeersQuickPickBox(prompt: string): Promise<string[] | undefined> {
        const connection: IFabricEnvironmentConnection = await FabricEnvironmentManager.instance().getConnection();
        if (!connection) {
            VSCodeBlockchainOutputAdapter.instance().log(LogType.ERROR, undefined, 'No connection to a blockchain found');
            return;
        }

        const peerNames: Array<string> = connection.getAllPeerNames();

        if (peerNames.length > 1) {
            return vscode.window.showQuickPick(peerNames, {
                ignoreFocusOut: false,
                canPickMany: true,
                placeHolder: prompt
            });
        } else {
            return peerNames;
        }
    }

    public static async showChaincodeAndVersionQuickPick(prompt: string, peers: Array<string>, contractName?: string, contractVersion?: string): Promise<IBlockchainQuickPickItem<{ packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder }> | undefined> {
        const connection: IFabricEnvironmentConnection = await FabricEnvironmentManager.instance().getConnection();
        if (!connection) {
            VSCodeBlockchainOutputAdapter.instance().log(LogType.ERROR, undefined, 'No connection to a blockchain found');
            return;
        }

        const tempQuickPickItems: IBlockchainQuickPickItem<{ packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder }>[] = [];

        // Get all installed smart contracts
        const installedContracts: IBlockchainQuickPickItem<{ packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder }>[] = await this.getInstalledContracts(connection, peers);
        tempQuickPickItems.push(...installedContracts);

        // Get all packaged smart contracts
        let packagedContracts: IBlockchainQuickPickItem<{ packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder }>[] = await this.getPackagedContracts();
        packagedContracts = packagedContracts.filter((_package: IBlockchainQuickPickItem<{ packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder }>) => {
            const existingPackage: IBlockchainQuickPickItem<{ packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder }> = tempQuickPickItems.find((item: IBlockchainQuickPickItem<{ packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder }>) => {
                return item.label === _package.label;
            });

            return ((!existingPackage) ? true : false);
        });

        tempQuickPickItems.push(...packagedContracts);

        // Get all open projects in workspace
        const openProjects: IBlockchainQuickPickItem<{ packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder }>[] = await this.getOpenProjects();

        tempQuickPickItems.push(...openProjects);

        // We need to find out the instantiated smart contracts so that we can filter them from being shown. This is because they should be shown in the 'Upgrade Smart Contract' instead.
        // First, we need to create a list of channels

        const channelMap: Map<string, Array<string>> = await connection.createChannelMap();

        // Next, we get all the instantiated smart contracts
        const allSmartContracts: any[] = [];
        for (const [channelName, peerNames] of channelMap) {
            const instantiatedSmartContracts: Array<{ name: string, version: string }> = await connection.getInstantiatedChaincode(peerNames, channelName);
            allSmartContracts.push(...instantiatedSmartContracts);
        }

        const quickPickItems: Array<IBlockchainQuickPickItem<{ packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder }>> = [];

        for (const tempItem of tempQuickPickItems) {
            const workspace: vscode.WorkspaceFolder = tempItem.data.workspace;

            // If the tempItem is an Open Project
            if (!tempItem.data.packageEntry) {
                const data: { packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder } = { packageEntry: undefined, workspace: workspace };
                quickPickItems.push({ label: `${tempItem.data.workspace.name}`, description: tempItem.description, data: data });

            } else {
                const itemName: string = tempItem.data.packageEntry.name;
                const itemVersion: string = tempItem.data.packageEntry.version;

                // If the user is performing an upgrade, we want to show all smart contracts with the same name (but not the currently instantiated version)
                if (contractName && contractVersion) {
                    if (itemName === contractName && itemVersion !== contractVersion) {
                        const data: { packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder } = { packageEntry: tempItem.data.packageEntry, workspace: workspace };
                        quickPickItems.push({ label: `${itemName}@${itemVersion}`, description: tempItem.description, data: data });
                    }
                } else {
                    // Show all smart contracts which haven't had a previous version instantiated
                    const searchResult: number = allSmartContracts.findIndex((contract: any) => {
                        return itemName === contract.name;
                    });
                    if (searchResult === -1) { // if index of itemName in allSmartContracts is not found
                        const data: { packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder } = { packageEntry: tempItem.data.packageEntry, workspace: workspace };
                        quickPickItems.push({ label: `${itemName}@${itemVersion}`, description: tempItem.description, data: data });
                    }
                }
            }
        }

        const quickPickOptions: vscode.QuickPickOptions = {
            ignoreFocusOut: false,
            canPickMany: false,
            placeHolder: prompt
        };

        return await vscode.window.showQuickPick(quickPickItems, quickPickOptions);
    }

    public static async showChannelQuickPickBox(prompt: string): Promise<IBlockchainQuickPickItem<Array<string>> | undefined> {
        const connection: IFabricEnvironmentConnection = await FabricEnvironmentManager.instance().getConnection();
        if (!connection) {
            VSCodeBlockchainOutputAdapter.instance().log(LogType.ERROR, undefined, 'No connection to a blockchain found');
            return;
        }

        const channelMap: Map<string, Array<string>> = await connection.createChannelMap();
        const channels: Array<string> = Array.from(channelMap.keys());

        const quickPickItems: Array<IBlockchainQuickPickItem<Array<string>>> = channels.map((channel: string) => {
            return { label: channel, data: channelMap.get(channel) };
        });

        const quickPickOptions: vscode.QuickPickOptions = {
            ignoreFocusOut: false,
            canPickMany: false,
            placeHolder: prompt
        };

        if (quickPickItems.length > 1) {
            return vscode.window.showQuickPick(quickPickItems, quickPickOptions);
        } else {
            return quickPickItems[0];
        }
    }

    public static async showSmartContractPackagesQuickPickBox(prompt: string, canPickMany: boolean): Promise<Array<IBlockchainQuickPickItem<PackageRegistryEntry>> | IBlockchainQuickPickItem<PackageRegistryEntry> | undefined> {
        const packages: Array<PackageRegistryEntry> = await PackageRegistry.instance().getAll();

        const quickPickItems: IBlockchainQuickPickItem<PackageRegistryEntry>[] = packages.map((_package: PackageRegistryEntry) => {
            return { label: _package.name, description: _package.version, data: _package };
        });

        const quickPickOptions: vscode.QuickPickOptions = {
            ignoreFocusOut: false,
            canPickMany: canPickMany,
            placeHolder: prompt
        };

        return vscode.window.showQuickPick(quickPickItems, quickPickOptions);
    }

    public static async showLanguagesQuickPick(prompt: string, chaincodeLanguages: Array<string>, contractLanguages: Array<string>): Promise<LanguageQuickPickItem | undefined> {
        const choseLanguageQuickPickOptions: vscode.QuickPickOptions = {
            placeHolder: prompt,
            ignoreFocusOut: true,
            matchOnDetail: true
        };
        const chaincodeQuickPickItems: Array<LanguageQuickPickItem> =
            chaincodeLanguages
                .filter((chaincodeLanguage: string) => contractLanguages.indexOf(chaincodeLanguage) === -1)
                .sort()
                .map((chaincodeLanguage: string) => {
                    return {
                        label: chaincodeLanguage,
                        description: 'Low-level programming model',
                        type: LanguageType.CHAINCODE
                    };
                });
        const contractQuickPickItems: Array<LanguageQuickPickItem> =
            contractLanguages
                .sort()
                .map((contractLanguage: string) => {
                    return {
                        label: contractLanguage,
                        type: LanguageType.CONTRACT
                    };
                });
        const quickPickItems: Array<LanguageQuickPickItem> = contractQuickPickItems.concat(chaincodeQuickPickItems);
        const chosenItem: LanguageQuickPickItem = await vscode.window.showQuickPick<LanguageQuickPickItem>(quickPickItems, choseLanguageQuickPickOptions);
        if (chosenItem) {
            return chosenItem;
        } else {
            return undefined;
        }
    }

    public static showGeneratorOptions(prompt: string): Thenable<string | undefined> {
        const options: Array<string> = [this.OVERWRITE_FILE, this.SKIP_FILE, this.FORCE_FILES, this.ABORT_GENERATOR];
        const quickPickOptions: vscode.QuickPickOptions = {
            ignoreFocusOut: true,
            canPickMany: false,
            placeHolder: prompt
        };

        return vscode.window.showQuickPick(options, quickPickOptions);
    }

    public static async openUserSettings(name: string, searchWallets?: boolean): Promise<void> {
        const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();

        let settingsPath: string;

        try {
            // Get the 'user settings' file path
            if (process.platform === 'win32') {
                // Windows
                settingsPath = path.join(process.env.APPDATA, 'Code', 'User', 'settings.json');
            } else if (process.platform === 'darwin') {
                // Mac
                settingsPath = path.join(homeDir(), 'Library', 'Application Support', 'Code', 'User', 'settings.json');
            } else {
                // Linux
                settingsPath = path.join(homeDir(), '.config', 'Code', 'User', 'settings.json');
            }

            // Open the user settings (but don't display yet)
            const document: vscode.TextDocument = await vscode.workspace.openTextDocument(vscode.Uri.file(settingsPath));
            const settingsText: string[] = document.getText().split('\n');

            let highlightStart: number;

            // Find the user settings line number
            for (let index: number = 0; index < settingsText.length; index++) {
                let section: string = `"${SettingConfigurations.FABRIC_GATEWAYS}": [`;
                if (searchWallets) {
                    section = `"${SettingConfigurations.FABRIC_WALLETS}": [`;
                }
                if (settingsText[index].includes(section)) {
                    // We've found the section
                    const entry: string = '"name": "' + name;

                    for (let searchIndex: number = index; searchIndex < settingsText.length; searchIndex++) {
                        // Search for the specific name and set the line number if found
                        if (settingsText[searchIndex].includes(entry)) {
                            highlightStart = searchIndex;
                            break;
                        }
                    }

                    if (highlightStart) {
                        // If the starting highlighting position is found, we can break from the loop
                        break;
                    }
                }
            }

            if (!highlightStart) {
                outputAdapter.log(LogType.ERROR, `Could not find ${name} entry in user settings`);
                await vscode.window.showTextDocument(document);
                return;
            }

            // Define the section to highlight
            const startLine: number = highlightStart;
            const endLine: number = highlightStart + 2;

            // Show the user settings and highlight the connection
            await vscode.window.showTextDocument(document, {
                selection: new vscode.Range(new vscode.Position(startLine, 0), new vscode.Position(endLine, 0))
            });
        } catch (error) {
            outputAdapter.log(LogType.ERROR, error.message, error.toString());
        }
    }

    public static async showConfirmationWarningMessage(prompt: string): Promise<boolean> {
        const reallyDoIt: vscode.MessageItem = await vscode.window.showWarningMessage(prompt, { title: 'Yes' }, { title: 'No' });
        if (!reallyDoIt) {
            return false;
        }
        return reallyDoIt.title === 'Yes';
    }

    /** Delay for a set number of ms; this code is added in order to workaround the VSCode issue
     * https://github.com/Microsoft/vscode/issues/52778
     *
     * See comment on this post for discussion.
     * @param {number} ms milliseconds to pause for
     */
    public static delayWorkaround(ms: number): Promise<any> {
        return new Promise((resolve: any): any => setTimeout(resolve, ms));
    }

    public static async showClientInstantiatedSmartContractsQuickPick(prompt: string, channelName?: string): Promise<IBlockchainQuickPickItem<{ name: string, channel: string, version: string }> | undefined> {
        const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
        const connection: IFabricClientConnection = FabricConnectionManager.instance().getConnection();
        const channelMap: Map<string, Array<string>> = await connection.createChannelMap();

        const instantiatedChaincodes: Array<{ name: string, version: string, channel: string }> = [];

        for (const [thisChannelName] of channelMap) {
            if (channelName && (channelName !== thisChannelName)) {
                continue;
            }
            const chaincodes: Array<{ name: string, version: string }> = await connection.getInstantiatedChaincode(thisChannelName); // returns array of objects
            for (const chaincode of chaincodes) {
                const data: { name: string, version: string, channel: string } = { name: chaincode.name, version: chaincode.version, channel: thisChannelName };
                instantiatedChaincodes.push(data);
            }
        }

        if (instantiatedChaincodes.length === 0) {
            outputAdapter.log(LogType.ERROR, 'Local runtime has no instantiated chaincodes');
            return;
        }

        const quickPickItems: Array<IBlockchainQuickPickItem<{ name: string, channel: string, version: string }>> = [];
        for (const chaincode of instantiatedChaincodes) {
            const data: { name: string, channel: string, version: string } = { name: chaincode.name, channel: chaincode.channel, version: chaincode.version };
            quickPickItems.push({ label: `${chaincode.name}@${chaincode.version}`, data: data });
        }

        const quickPickOptions: vscode.QuickPickOptions = {
            ignoreFocusOut: true,
            canPickMany: false,
            placeHolder: prompt
        };

        return vscode.window.showQuickPick(quickPickItems, quickPickOptions);
    }

    public static async showRuntimeInstantiatedSmartContractsQuickPick(prompt: string, channelName?: string): Promise<IBlockchainQuickPickItem<{ name: string, channel: string, version: string }> | undefined> {
        const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
        const connection: IFabricEnvironmentConnection = await FabricEnvironmentManager.instance().getConnection();
        if (!connection) {
            VSCodeBlockchainOutputAdapter.instance().log(LogType.ERROR, undefined, 'No connection to a blockchain found');
            return;
        }

        const channelMap: Map<string, Array<string>> = await connection.createChannelMap();

        const instantiatedChaincodes: Array<{ name: string, version: string, channel: string }> = [];

        for (const [thisChannelName, peerNames] of channelMap) {
            if (channelName && (channelName !== thisChannelName)) {
                continue;
            }
            const chaincodes: Array<{ name: string, version: string }> = await connection.getInstantiatedChaincode(peerNames, thisChannelName); // returns array of objects
            for (const chaincode of chaincodes) {
                const data: { name: string, version: string, channel: string } = { name: chaincode.name, version: chaincode.version, channel: thisChannelName };
                instantiatedChaincodes.push(data);
            }
        }

        if (instantiatedChaincodes.length === 0) {
            outputAdapter.log(LogType.ERROR, 'Local runtime has no instantiated chaincodes');
            return;
        }

        const quickPickItems: Array<IBlockchainQuickPickItem<{ name: string, channel: string, version: string }>> = [];
        for (const chaincode of instantiatedChaincodes) {
            const data: { name: string, channel: string, version: string } = { name: chaincode.name, channel: chaincode.channel, version: chaincode.version };
            quickPickItems.push({ label: `${chaincode.name}@${chaincode.version}`, data: data });
        }

        const quickPickOptions: vscode.QuickPickOptions = {
            ignoreFocusOut: true,
            canPickMany: false,
            placeHolder: prompt
        };

        return vscode.window.showQuickPick(quickPickItems, quickPickOptions);
    }

    public static async showTestFileOverwriteQuickPick(prompt: string): Promise<string | undefined> {
        const options: Array<string> = [this.YES, this.NO, this.GENERATE_NEW_TEST_FILE];
        const quickPickOptions: vscode.QuickPickOptions = {
            ignoreFocusOut: false,
            canPickMany: false,
            placeHolder: prompt
        };

        return vscode.window.showQuickPick(options, quickPickOptions);

    }

    public static async showContractQuickPick(prompt: string, contracts: Array<string>): Promise<string> {
        const quickPickOptions: vscode.QuickPickOptions = {
            ignoreFocusOut: false,
            canPickMany: false,
            placeHolder: prompt
        };

        return vscode.window.showQuickPick(contracts, quickPickOptions);
    }

    public static async showTransactionQuickPick(prompt: string, chaincodeName: string, channelName: string): Promise<IBlockchainQuickPickItem<{ name: string, contract: string }> | undefined> {
        const fabricConnectionManager: FabricConnectionManager = FabricConnectionManager.instance();
        const connection: IFabricClientConnection = fabricConnectionManager.getConnection();

        if (!connection) {
            VSCodeBlockchainOutputAdapter.instance().log(LogType.ERROR, 'No connection to a blockchain found');
            return;
        }

        const quickPickItems: Array<IBlockchainQuickPickItem<{ name: string, contract: string }>> = [];
        let transactionNamesMap: Map<string, string[]>;
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'IBM Blockchain Platform Extension',
            cancellable: false
        }, async (progress: vscode.Progress<{ message: string }>) => {
            progress.report({ message: 'Getting transaction information' });
            transactionNamesMap = await MetadataUtil.getTransactionNames(connection, chaincodeName, channelName);
        });

        if (!transactionNamesMap) {
            const transactionName: string = await UserInputUtil.showInputBox('What function do you want to call?');
            if (!transactionName) {
                return;
            }
            return { label: null, data: { name: transactionName, contract: null } };
        }

        for (const [name, transactionArray] of transactionNamesMap) {
            for (const transaction of transactionArray) {
                const data: { name: string, contract: string } = { name: transaction, contract: name };
                if (name !== '') {
                    quickPickItems.push({ label: `${name} - ${transaction}`, data: data });
                } else {
                    quickPickItems.push({ label: `${transaction}`, data: data });
                }
            }
        }

        const quickPickOptions: vscode.QuickPickOptions = {
            ignoreFocusOut: false,
            canPickMany: false,
            placeHolder: prompt
        };

        return vscode.window.showQuickPick(quickPickItems, quickPickOptions);
    }

    public static async showInstallableSmartContractsQuickPick(prompt: string, peers: Set<string>): Promise<IBlockchainQuickPickItem<{ packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder }> | undefined> {
        // Get connection
        const connection: IFabricEnvironmentConnection = await FabricEnvironmentManager.instance().getConnection();
        if (!connection) {
            VSCodeBlockchainOutputAdapter.instance().log(LogType.ERROR, undefined, 'No connection to a blockchain found');
            return;
        }

        const quickPickItems: IBlockchainQuickPickItem<{ packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder }>[] = [];
        // Get packaged contracts
        let packagedContracts: IBlockchainQuickPickItem<{ packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder }>[] = await this.getPackagedContracts();

        // For each peer, get the installed chaincode, and remove already installed contracts from the packagedContracts array
        for (const peer of peers) {
            const chaincodes: Map<string, Array<string>> = await connection.getInstalledChaincode(peer);
            chaincodes.forEach((versions: string[], chaincodeName: string) => {
                versions.forEach((version: string) => {
                    const label: string = `${chaincodeName}@${version}`;

                    packagedContracts = packagedContracts.filter((_package: IBlockchainQuickPickItem<{ packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder }>) => {
                        return label !== _package.label;
                    });
                });
            });
        }
        quickPickItems.push(...packagedContracts);

        // Get all open projects in workspace
        const openProjects: IBlockchainQuickPickItem<{ packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder }>[] = await this.getOpenProjects();
        for (const openProject of openProjects) {
            const workspace: vscode.WorkspaceFolder = openProject.data.workspace;

            const data: { packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder } = { packageEntry: undefined, workspace: workspace };
            quickPickItems.push(
                { label: `${openProject.data.workspace.name}`, description: openProject.description, data: data }
            );
        }

        const quickPickOptions: vscode.QuickPickOptions = {
            ignoreFocusOut: false,
            canPickMany: false,
            placeHolder: prompt
        };

        return vscode.window.showQuickPick(quickPickItems, quickPickOptions);
    }

    public static async openNewProject(openMethod: string, uri: vscode.Uri, workspaceLabel?: string): Promise<void> {
        if (openMethod === UserInputUtil.ADD_TO_WORKSPACE) {
            const openFolders: Array<vscode.WorkspaceFolder> = vscode.workspace.workspaceFolders || [];
            const options: any = (workspaceLabel) ? { uri: uri, name: workspaceLabel } : { uri: uri };
            vscode.workspace.updateWorkspaceFolders(openFolders.length, 0, options);
        } else {
            let openNewWindow: boolean = true;

            if (openMethod === UserInputUtil.OPEN_IN_CURRENT_WINDOW) {
                openNewWindow = false;
                await this.checkForUnsavedFiles();
            }

            await vscode.commands.executeCommand('vscode.openFolder', uri, openNewWindow);
        }
    }

    public static async showAddWalletOptionsQuickPick(prompt: string, addIdentity: boolean): Promise<string | undefined> {
        const addIdentityOptions: Array<string> = [this.IMPORT_WALLET];
        if (addIdentity) {
            addIdentityOptions.push(this.WALLET_NEW_ID);
        } else {
            addIdentityOptions.push(this.WALLET);
        }

        const quickPickOptions: vscode.QuickPickOptions = {
            matchOnDetail: true,
            placeHolder: prompt,
            ignoreFocusOut: true,
            canPickMany: false,
        };

        return vscode.window.showQuickPick(addIdentityOptions, quickPickOptions);

    }

    public static async browse(placeHolder: string, quickPickItems: string[] | { label: string, description: string }[], openDialogOptions: vscode.OpenDialogOptions, returnUri?: boolean): Promise<string | vscode.Uri | vscode.Uri[]> {
        const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();

        try {

            const result: string = await vscode.window.showQuickPick(quickPickItems as any[], { placeHolder });
            if (!result) {
                return;
            } else { // result === this.BROWSE_LABEL
                // Browse file and get path
                // work around for #135
                await UserInputUtil.delayWorkaround(500);

                const fileBrowser: vscode.Uri[] = await vscode.window.showOpenDialog(openDialogOptions);

                if (!fileBrowser) {
                    return;
                }

                if (returnUri) {
                    if (openDialogOptions.canSelectMany) {
                        return fileBrowser;
                    } else {
                        return fileBrowser[0];
                    }
                } else {
                    return fileBrowser[0].fsPath;
                }

            }
        } catch (error) {
            outputAdapter.log(LogType.ERROR, error.message, error.toString());
        }
    }

    public static async showCertificateAuthorityQuickPickBox(prompt: string): Promise<string | undefined> {
        const connection: IFabricEnvironmentConnection = await FabricEnvironmentManager.instance().getConnection();
        if (!connection) {
            VSCodeBlockchainOutputAdapter.instance().log(LogType.ERROR, undefined, 'No connection to a blockchain found');
            return;
        }
        const caNames: string[] = connection.getAllCertificateAuthorityNames();

        const quickPickOptions: vscode.QuickPickOptions = {
            ignoreFocusOut: false,
            canPickMany: false,
            placeHolder: prompt
        };

        if (caNames.length > 1) {
            return vscode.window.showQuickPick(caNames, quickPickOptions);
        } else {
            return caNames[0];
        }
    }

    public static async showWalletsQuickPickBox(prompt: string, showLocalWallet?: boolean, showCreateWallet?: boolean): Promise<IBlockchainQuickPickItem<FabricWalletRegistryEntry> | undefined> {
        const walletQuickPickItems: Array<IBlockchainQuickPickItem<FabricWalletRegistryEntry>> = [];

        if (showLocalWallet) {
            // Push local_fabric wallet
            const runtimeWallet: IFabricWallet = await FabricWalletGeneratorFactory.createFabricWalletGenerator().createLocalWallet(FabricWalletUtil.LOCAL_WALLET);

            const runtimeWalletRegistryEntry: FabricWalletRegistryEntry = new FabricWalletRegistryEntry();

            runtimeWalletRegistryEntry.name = FabricWalletUtil.LOCAL_WALLET;
            runtimeWalletRegistryEntry.walletPath = runtimeWallet.getWalletPath();
            runtimeWalletRegistryEntry.managedWallet = true;
            walletQuickPickItems.push({
                label: runtimeWalletRegistryEntry.name,
                data: runtimeWalletRegistryEntry
            });
        }

        const wallets: Array<FabricWalletRegistryEntry> = FabricWalletRegistry.instance().getAll();
        for (const walletRegistryEntry of wallets) {
            walletQuickPickItems.push({
                label: walletRegistryEntry.name,
                data: walletRegistryEntry
            });
        }

        if (showCreateWallet) {
            walletQuickPickItems.push({
                label: '+ Add new wallet',
                data: undefined
            });
        }

        const quickPickOptions: vscode.QuickPickOptions = {
            ignoreFocusOut: false,
            canPickMany: false,
            placeHolder: prompt
        };

        return vscode.window.showQuickPick(walletQuickPickItems, quickPickOptions);
    }

    public static async addIdentityMethod(isLocalWallet: boolean): Promise<any> {
        const options: Array<string> = [UserInputUtil.ADD_CERT_KEY_OPTION, UserInputUtil.ADD_JSON_ID_OPTION];

        if (isLocalWallet) {
            options.push(UserInputUtil.ADD_LOCAL_ID_SECRET_OPTION);
        } else {
            options.push(UserInputUtil.ADD_ID_SECRET_OPTION);
        }
        const quickPickOptions: vscode.QuickPickOptions = {
            ignoreFocusOut: true,
            canPickMany: false,
            placeHolder: UserInputUtil.ADD_IDENTITY_METHOD
        };

        return vscode.window.showQuickPick(options, quickPickOptions);
    }

    public static async getCertKey(): Promise<{ certificatePath: string, privateKeyPath: string }> {
        const quickPickItems: string[] = [UserInputUtil.BROWSE_LABEL];
        const openDialogOptions: vscode.OpenDialogOptions = {
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            openLabel: 'Select',
            filters: undefined
        };

        // Get the certificate file path
        const certificatePath: string = await UserInputUtil.browse('Browse for a certificate file', quickPickItems, openDialogOptions) as string;
        if (!certificatePath) {
            return;
        }

        const certificate: string = FabricCertificate.loadFileFromDisk(certificatePath);
        FabricCertificate.validateCertificate(certificate);

        // Get the private key file path
        const privateKeyPath: string = await UserInputUtil.browse('Browse for a private key file', quickPickItems, openDialogOptions) as string;
        if (!privateKeyPath) {
            return;
        }

        const privateKey: string = FabricCertificate.loadFileFromDisk(privateKeyPath);
        FabricCertificate.validatePrivateKey(privateKey);

        return { certificatePath, privateKeyPath };
    }

    public static async getEnrollIdSecret(): Promise<{ enrollmentID: string, enrollmentSecret: string }> {

        const enrollmentID: string = await UserInputUtil.showInputBox('Enter enrollment ID');
        if (!enrollmentID) {
            return;
        }

        const enrollmentSecret: string = await UserInputUtil.showInputBox('Enter enrollment secret');
        if (!enrollmentSecret) {
            return;
        }

        return { enrollmentID, enrollmentSecret };
    }

    public static async showDebugCommandList(commands: Array<{ name: string, command: string }>, prompt: string): Promise<IBlockchainQuickPickItem<string>> {
        const quickPickItems: IBlockchainQuickPickItem<string>[] = [];

        for (const command of commands) {
            quickPickItems.push(
                { label: command.name, data: command.command }
            );
        }

        const quickPickOptions: vscode.QuickPickOptions = {
            ignoreFocusOut: false,
            canPickMany: false,
            placeHolder: prompt
        };

        return vscode.window.showQuickPick(quickPickItems, quickPickOptions);
    }

    public static async showFabricNodeQuickPick(prompt: string, environmentName: string, nodeTypefilter: FabricNodeType[], orgFilter: string[]): Promise<IBlockchainQuickPickItem<FabricNode>> {
        const environment: FabricEnvironment = new FabricEnvironment(environmentName);
        let nodes: FabricNode[] = await environment.getNodes();
        nodes = nodes.filter((node: FabricNode) => nodeTypefilter.indexOf(node.type) !== -1);

        if (orgFilter && orgFilter.length > 0) {
            nodes = nodes.filter((node: FabricNode) => orgFilter.indexOf(node.msp_id) !== -1);
        }

        const quickPickItems: IBlockchainQuickPickItem<FabricNode>[] = [];
        for (const _node of nodes) {
            if (_node.type === FabricNodeType.ORDERER && _node.cluster_name) {
                const foundItem: IBlockchainQuickPickItem<FabricNode> = quickPickItems.find((item: IBlockchainQuickPickItem<FabricNode>) => item.data.cluster_name === _node.cluster_name);

                if (!foundItem) {
                    quickPickItems.push({ label: _node.cluster_name, data: _node });
                }
            } else {
                quickPickItems.push({ label: _node.name, data: _node });
            }
        }

        const quickPickOptions: vscode.QuickPickOptions = {
            ignoreFocusOut: false,
            canPickMany: false,
            placeHolder: prompt
        };

        if (quickPickItems.length === 1) {
            return quickPickItems[0];
        } else if (quickPickItems.length === 0) {
            throw new Error('No nodes found to choose from');
        }

        return vscode.window.showQuickPick<IBlockchainQuickPickItem<FabricNode>>(quickPickItems, quickPickOptions);
    }

    public static async failedActivationWindow(error: string): Promise<void> {

        const retryPrompt: string = 'Retry activation';
        const response: string = await vscode.window.showErrorMessage(`Failed to activate extension: ${error}`, retryPrompt);
        if (response === retryPrompt) {
            await vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
    }

    /**
     * Method to determine if there are multiple smart contracts within the active workspace.
     * If creating automated functional tests, a quick pick boxt will be provided so the developer can pick which smart contract to use, even if there is only one open.
     * If packaging, a quick pick box will be provided if there are two or more contracts open, otherwise it will automatically get the path of the only smart contract project there is.
     * @returns Returns the path of the workspace to be used in packaging process.
     */
    public static async chooseWorkspace(isPackaging: boolean): Promise<vscode.WorkspaceFolder> {
        let workspaceFolderOptions: Array<vscode.WorkspaceFolder>;
        let workspaceFolder: vscode.WorkspaceFolder;
        const text: string = isPackaging ? 'package' : 'create functional tests for';
        workspaceFolderOptions = UserInputUtil.getWorkspaceFolders();
        if (workspaceFolderOptions.length === 0) {
            const message: string = `Issue determining available smart contracts. Please open the smart contract you want to ${text}.`;
            throw new Error(message);
        }
        const minOpenToPick: number = isPackaging ? 2 : 1;
        if (workspaceFolderOptions.length >= minOpenToPick) {
            const chosenFolder: IBlockchainQuickPickItem<vscode.WorkspaceFolder> = await UserInputUtil.showWorkspaceQuickPickBox(`Choose a workspace folder to ${text}`);
            if (!chosenFolder) {
                return;
            }
            workspaceFolder = chosenFolder.data;
        } else {
            workspaceFolder = workspaceFolderOptions[0];
        }
        return workspaceFolder;
    }

/**
 * Method to determine the language used in the development of the smart contract project, which will be used to determine the correct directories
 * to package the projects, as well as aiding the language decision for automated functional tests.
 * @param workspaceDir {String} workspaceDir A string containing the path to the current active workspace (the workspace of the project the user is packaging).
 * @returns {string} The language used in the development of this smart contract project. Used to package in the correct respective directory, as well as aiding the language decision for automated functional tests.
 */
    public static async getLanguage(workspaceDir: vscode.WorkspaceFolder): Promise<string> {

    // Is this a Node.js smart contract (JavaScript, TypeScript, etc)?
    const packageJsonFile: string = path.join(workspaceDir.uri.fsPath, 'package.json');
    const packageJsonFileExists: boolean = await fs.pathExists(packageJsonFile);
    if (packageJsonFileExists) {
        return 'node';
    }

    // Is this a Java smart contract (Java, Kotlin, etc)?
    const gradleFile: string = path.join(workspaceDir.uri.fsPath, 'build.gradle');
    const gradleFileExists: boolean = await fs.pathExists(gradleFile);
    const mavenFile: string = path.join(workspaceDir.uri.fsPath, 'pom.xml');
    const mavenFileExists: boolean = await fs.pathExists(mavenFile);
    if (gradleFileExists || mavenFileExists) {
        return 'java';
    }

    // Is this a Go smart contract?
    const goFiles: vscode.Uri[] = await vscode.workspace.findFiles(
        new vscode.RelativePattern(workspaceDir, '**/*.go'),
        null,
        1
    );
    if (goFiles.length > 0) {
        return 'golang';
    }

    // Its not java/node/go contract, so error
    const message: string = `Failed to determine workspace language type, supported languages are JavaScript, TypeScript, Go and Java. Please ensure your contract's root-level directory is open in the Explorer.`;
    throw new Error(message);

}

    private static async checkForUnsavedFiles(): Promise<void> {
        const unsavedFiles: vscode.TextDocument = vscode.workspace.textDocuments.find((document: vscode.TextDocument) => {
            return document.isDirty;
        });

        if (unsavedFiles) {
            const answer: string = await UserInputUtil.showQuickPickYesNo('Do you want to save any unsaved changes?');
            if (answer === UserInputUtil.YES) {
                await vscode.workspace.saveAll(true);
            }
        }
    }

    private static async getInstalledContracts(connection: IFabricEnvironmentConnection, peers: Array<string>): Promise<IBlockchainQuickPickItem<{ packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder }>[]> {
        const tempQuickPickItems: IBlockchainQuickPickItem<{ packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder }>[] = [];
        for (const peer of peers) {
            const chaincodes: Map<string, Array<string>> = await connection.getInstalledChaincode(peer);
            chaincodes.forEach((versions: string[], chaincodeName: string) => {
                versions.forEach((version: string) => {
                    const _package: PackageRegistryEntry = new PackageRegistryEntry({ name: chaincodeName, version: version, path: undefined });
                    const data: { packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder } = { packageEntry: _package, workspace: undefined };
                    const label: string = `${chaincodeName}@${version}`;
                    const foundItem: IBlockchainQuickPickItem<{ packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder }> = tempQuickPickItems.find((item: IBlockchainQuickPickItem<{ packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder }>) => {
                        return item.label === label;
                    });

                    if (!foundItem) {
                        tempQuickPickItems.push({ label: label, description: 'Installed', data: data });
                    }
                });
            });
        }
        return tempQuickPickItems;
    }

    private static async getPackagedContracts(): Promise<IBlockchainQuickPickItem<{ packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder }>[]> {
        const tempQuickPickItems: IBlockchainQuickPickItem<{ packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder }>[] = [];
        const packages: Array<PackageRegistryEntry> = await PackageRegistry.instance().getAll();

        for (const _package of packages) {
            const data: { packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder } = { packageEntry: _package, workspace: undefined };
            const label: string = `${_package.name}@${_package.version}`;
            tempQuickPickItems.push({ label: label, description: 'Packaged', data: data });
        }

        return tempQuickPickItems;
    }

    private static async getOpenProjects(): Promise<IBlockchainQuickPickItem<{ packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder }>[]> {
        const tempQuickPickItems: IBlockchainQuickPickItem<{ packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder }>[] = [];
        const workspaceFolderOptions: vscode.WorkspaceFolder[] = UserInputUtil.getWorkspaceFolders();
        for (const workspace of workspaceFolderOptions) {

            const data: { packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder } = { packageEntry: undefined, workspace: workspace };

            const label: string = `${workspace.name}`;
            tempQuickPickItems.push({ label: label, description: 'Open Project', data: data });

        }

        return tempQuickPickItems;
    }
}
