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
import * as path from 'path';
import * as fs from 'fs-extra';
import { ParsedCertificate } from '../fabric/ParsedCertificate';
import { FabricConnectionManager } from '../fabric/FabricConnectionManager';
import { PackageRegistry } from '../packages/PackageRegistry';
import { PackageRegistryEntry } from '../packages/PackageRegistryEntry';
import { FabricConnectionRegistry } from '../fabric/FabricConnectionRegistry';
import { FabricConnectionRegistryEntry } from '../fabric/FabricConnectionRegistryEntry';
import { FabricRuntimeManager } from '../fabric/FabricRuntimeManager';
import { FabricRuntime } from '../fabric/FabricRuntime';
import { IFabricConnection } from '../fabric/IFabricConnection';
import { FabricRuntimeRegistryEntry } from '../fabric/FabricRuntimeRegistryEntry';
import { FabricRuntimeRegistry } from '../fabric/FabricRuntimeRegistry';
import { ExtensionUtil } from '../util/ExtensionUtil';

export interface IBlockchainQuickPickItem<T = undefined> extends vscode.QuickPickItem {
    data: T;
}

export class UserInputUtil {

    static readonly ADD_TO_WORKSPACE: string = 'Add to workspace';
    static readonly OPEN_IN_CURRENT_WINDOW: string = 'Open in current window';
    static readonly OPEN_IN_NEW_WINDOW: string = 'Open in new window';
    static readonly YES: string = 'yes';
    static readonly NO: string = 'no';
    static readonly OVERWRITE_FILE: string = 'Overwrite file';
    static readonly SKIP_FILE: string = 'Skip file';
    static readonly FORCE_FILES: string = 'Force all files to overwrite';
    static readonly ABORT_GENERATOR: string = 'Abort generator';
    static readonly BROWSE_LABEL: string = '📁 Browse';
    static readonly EDIT_LABEL: string = '✎ Edit in User Settings';
    static readonly GENERATE_NEW_TEST_FILE: string = 'Generate new test file';

    public static showConnectionQuickPickBox(prompt: string, showManagedRuntimes?: boolean): Thenable<IBlockchainQuickPickItem<FabricConnectionRegistryEntry> | undefined> {
        const connections: Array<FabricConnectionRegistryEntry> = FabricConnectionRegistry.instance().getAll();

        const quickPickOptions: vscode.QuickPickOptions = {
            ignoreFocusOut: false,
            canPickMany: false,
            placeHolder: prompt
        };

        const managedRuntimes: Array<FabricConnectionRegistryEntry> = [];
        if (showManagedRuntimes) {
            // Allow users to choose from managed runtimes
            const runtimeRegistryManager: FabricRuntimeRegistry = FabricRuntimeRegistry.instance();
            const allRuntimes: FabricRuntimeRegistryEntry[] = runtimeRegistryManager.getAll();
            for (const runtime of allRuntimes) {
                const connection: FabricConnectionRegistryEntry = new FabricConnectionRegistryEntry();
                connection.name = runtime.name;
                connection.managedRuntime = true;
                managedRuntimes.push(connection);
            }
        }

        const allConnections: Array<FabricConnectionRegistryEntry> = [];
        allConnections.push(...connections);
        allConnections.push(...managedRuntimes);

        const connectionsQuickPickItems: Array<IBlockchainQuickPickItem<FabricConnectionRegistryEntry>> = allConnections.map((connection: FabricConnectionRegistryEntry) => {
            return { label: connection.name, data: connection };
        });

        return vscode.window.showQuickPick(connectionsQuickPickItems, quickPickOptions);
    }

    public static showInputBox(question: string): Thenable<string | undefined> {
        const inputBoxOptions: vscode.InputBoxOptions = {
            prompt: question,
            ignoreFocusOut: true
        };

        return vscode.window.showInputBox(inputBoxOptions);
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
    public static async getDirPath(dir: string): Promise<string> {

        if (dir.startsWith('~')) {
            dir = await homeDir(dir.replace('~', ''));
        }
        return dir;
    }

    public static showIdentityConnectionQuickPickBox(prompt: string, connection: FabricConnectionRegistryEntry): Thenable<IBlockchainQuickPickItem<{ certificatePath: string, privateKeyPath: string }> | undefined> {

        const quickPickOptions: vscode.QuickPickOptions = {
            ignoreFocusOut: false,
            canPickMany: false,
            placeHolder: prompt
        };

        const identityQuickPickItems: Array<IBlockchainQuickPickItem<any>> = connection.identities.map((identity: { certificatePath: string, privateKeyPath: string }) => {
            const parsedCert: ParsedCertificate = new ParsedCertificate(identity.certificatePath);
            return { label: parsedCert.getCommonName(), data: identity };
        });

        return vscode.window.showQuickPick(identityQuickPickItems, quickPickOptions);
    }

    public static showRuntimeQuickPickBox(prompt: string): Thenable<IBlockchainQuickPickItem<FabricRuntime> | undefined> {
        const runtimes: FabricRuntime[] = FabricRuntimeManager.instance().getAll();

        const runtimeQuickPickItems: Array<IBlockchainQuickPickItem<FabricRuntime>> = runtimes.map((runtime: FabricRuntime) => {
            return { label: runtime.getName(), data: runtime };
        });

        const quickPickOptions: vscode.QuickPickOptions = {
            ignoreFocusOut: false,
            canPickMany: false,
            placeHolder: prompt
        };

        return vscode.window.showQuickPick(runtimeQuickPickItems, quickPickOptions);
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
        const options: Array<string> = [this.YES, this.NO];

        const quickPickOptions: vscode.QuickPickOptions = {
            ignoreFocusOut: true,
            canPickMany: false,
            placeHolder: prompt
        };

        return vscode.window.showQuickPick(options, quickPickOptions);
    }

    public static showPeerQuickPickBox(prompt: string): Thenable<string | undefined> {
        const fabricConnectionManager: FabricConnectionManager = FabricConnectionManager.instance();
        const connection: IFabricConnection = fabricConnectionManager.getConnection();
        if (!connection) {
            return Promise.reject('No connection to a blockchain found');
        }
        const peerNames: Array<string> = connection.getAllPeerNames();

        const quickPickOptions: vscode.QuickPickOptions = {
            ignoreFocusOut: false,
            canPickMany: false,
            placeHolder: prompt
        };

        return vscode.window.showQuickPick(peerNames, quickPickOptions);
    }

    public static async showChaincodeAndVersionQuickPick(prompt: string, peers: Set<string>, contractName?: string, contractVersion?: string): Promise<IBlockchainQuickPickItem<{ packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder }> | undefined> {
        const fabricConnectionManager: FabricConnectionManager = FabricConnectionManager.instance();
        const connection: IFabricConnection = fabricConnectionManager.getConnection();
        if (!connection) {
            return Promise.reject('No connection to a blockchain found');
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

        const channels: Array<IBlockchainQuickPickItem<Set<string>>> = await this.getChannels();

        // Next, we get all the instantiated smart contracts
        const allSmartContracts: any[] = [];
        for (const channel of channels) {
            const instantiatedSmartContracts: any[] = await connection.getInstantiatedChaincode(channel.label);
            // if (!instantiatedSmartContracts || instantiatedSmartContracts.length === 0) {
            //     continue;
            // }
            allSmartContracts.push(...instantiatedSmartContracts);
        }

        const quickPickItems: Array<IBlockchainQuickPickItem<{ packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder }>> = [];

        for (const tempItem of tempQuickPickItems) {
            const workspace: vscode.WorkspaceFolder = tempItem.data.workspace;

            // If the tempItem is an Open Project
            if (!tempItem.data.packageEntry) {
                const data: { packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder } = {packageEntry: undefined, workspace: workspace};
                quickPickItems.push({label: `${tempItem.data.workspace.name}`, description: tempItem.description, data: data});

            } else {
                const itemName: string = tempItem.data.packageEntry.name;
                const itemVersion: string = tempItem.data.packageEntry.version;

                // If the user is performing an upgrade, we want to show all smart contracts with the same name (but not the currently instantiated version)
                if (contractName && contractVersion) {
                    if (itemName === contractName && itemVersion !== contractVersion) {
                        const data: { packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder } = {packageEntry: tempItem.data.packageEntry, workspace: workspace};
                        quickPickItems.push({label: `${itemName}@${itemVersion}`, description: tempItem.description, data: data});
                    }
                } else {
                    // Show all smart contracts which haven't had a previous version instantiated
                    if (allSmartContracts.findIndex((contract: any) => {
                        return itemName === contract.name;
                    }) === -1) {
                        const data: { packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder } = {packageEntry: tempItem.data.packageEntry, workspace: workspace};
                        quickPickItems.push({label: `${itemName}@${itemVersion}`, description: tempItem.description, data: data});
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

    public static async showChannelQuickPickBox(prompt: string): Promise<IBlockchainQuickPickItem<Set<string>> | undefined> {
        const quickPickItems: Array<IBlockchainQuickPickItem<Set<string>>> = await UserInputUtil.getChannels();

        const quickPickOptions: vscode.QuickPickOptions = {
            ignoreFocusOut: false,
            canPickMany: false,
            placeHolder: prompt
        };

        return vscode.window.showQuickPick(quickPickItems, quickPickOptions);
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

    public static showLanguagesQuickPick(prompt: string, languages: Array<string>): Thenable<string | undefined> {
        const choseLanguageQuickPickOptions: vscode.QuickPickOptions = {
            placeHolder: prompt,
            ignoreFocusOut: true,
            matchOnDetail: true
        };

        return vscode.window.showQuickPick(languages, choseLanguageQuickPickOptions);
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

    public static async browseEdit(placeHolder: string, connectionName: string): Promise<string> {
        const options: string[] = [this.BROWSE_LABEL, this.EDIT_LABEL];
        try {
            const result: string = await vscode.window.showQuickPick(options, { placeHolder });
            if (!result) {
                return;
            } else if (result === this.BROWSE_LABEL) {
                // Browse file and get path
                // see method comment for details of this workaround
                await UserInputUtil.delayWorkaround(500);
                const fileBrowser: vscode.Uri[] = await vscode.window.showOpenDialog({
                    canSelectFiles: true,
                    canSelectFolders: false,
                    canSelectMany: false,
                    openLabel: 'Select'
                });

                if (!fileBrowser) {
                    return;
                }

                return fileBrowser[0].fsPath;

            } else {

                // Edit in user settings
                await this.openUserSettings(connectionName);

            }
        } catch (error) {
            vscode.window.showErrorMessage(error.message);
        }

    }

    public static async openUserSettings(connectionName: string): Promise<void> {
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
            const text: string[] = document.getText().split('\n');

            let startIndex: number;

            // Find the user settings line number
            for (let x: number = 0; x < text.length; x++) {
                const searchTerm: string = '"name": "' + connectionName + '",';
                if (text[x].includes(searchTerm)) {
                    startIndex = x;
                    break;
                }
            }

            // Define the section to highlight
            const startLine: number = startIndex - 2;
            const endLine: number = startIndex + 8;

            // Show the user settings and highlight the connection
            await vscode.window.showTextDocument(document, {
                selection: new vscode.Range(new vscode.Position(startLine, 0), new vscode.Position(endLine, 0))
            });
        } catch (error) {
            vscode.window.showErrorMessage(error.message);
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

    public static async showInstantiatedSmartContractsQuickPick(prompt: string, channelName?: string): Promise<IBlockchainQuickPickItem<{ name: string, channel: string, version: string }> | undefined> {
        const fabricConnectionManager: FabricConnectionManager = FabricConnectionManager.instance();
        const connection: IFabricConnection = fabricConnectionManager.getConnection();

        if (!connection) {
            vscode.window.showErrorMessage('No connection to a blockchain found');
            return;
        }

        let channels: Array<string> = [];
        if (!channelName) {
            const channelQuickPicks: Array<IBlockchainQuickPickItem<Set<string>>> = await this.getChannels();
            channels = channelQuickPicks.map((channelQuickPick: IBlockchainQuickPickItem<Set<string>>) => {
                return channelQuickPick.label;
            });
        } else {
            channels.push(channelName);
        }

        const instantiatedChaincodes: Array<{ name: string, version: string, channel: string }> = [];

        for (const channel of channels) {
            const chaincodes: Array<{ name: string, version: string }> = await connection.getInstantiatedChaincode(channel); // returns array of objects
            for (const chaincode of chaincodes) {
                const data: {name: string, version: string, channel: string} = {name: chaincode.name, version: chaincode.version, channel: channel};
                instantiatedChaincodes.push(data);
            }
        }

        if (instantiatedChaincodes.length === 0) {
            vscode.window.showInformationMessage('No instantiated chaincodes within connection');
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

    public static async showTransactionQuickPick(prompt: string, chaincodeName: string, channelName: string): Promise<string | undefined> {
        const fabricConnectionManager: FabricConnectionManager = FabricConnectionManager.instance();
        const connection: IFabricConnection = fabricConnectionManager.getConnection();

        if (!connection) {
            vscode.window.showErrorMessage('No connection to a blockchain found');
            return;
        }

        const metaData: any = await connection.getMetadata(chaincodeName, channelName);
        const quickPickItems: Array<string> = metaData[''];

        const quickPickOptions: vscode.QuickPickOptions = {
            ignoreFocusOut: false,
            canPickMany: false,
            placeHolder: prompt
        };

        return vscode.window.showQuickPick(quickPickItems, quickPickOptions);
    }

    public static async showInstallableSmartContractsQuickPick(prompt: string, peers: Set<string>): Promise<Array<IBlockchainQuickPickItem<PackageRegistryEntry>> | IBlockchainQuickPickItem<PackageRegistryEntry> | undefined> {
        const fabricConnectionManager: FabricConnectionManager = FabricConnectionManager.instance();
        const connection: IFabricConnection = fabricConnectionManager.getConnection();
        if (!connection) {
            return Promise.reject('No connection to a blockchain found');
        }

        const quickPickItems: IBlockchainQuickPickItem<PackageRegistryEntry>[] = [];
        let packages: PackageRegistryEntry[] = await PackageRegistry.instance().getAll();

        for (const peer of peers) {
            const chaincodes: Map<string, Array<string>> = await connection.getInstalledChaincode(peer);
            chaincodes.forEach((versions: string[], chaincodeName: string) => {
                versions.forEach((version: string) => {
                    const label: string = `${chaincodeName}@${version}`;

                    packages = packages.filter((_package: PackageRegistryEntry) => {
                        const _packageLabel: string = `${_package.name}@${_package.version}`;
                        return label !== _packageLabel;
                    });
                });
            });
        }

        packages.forEach((_package: PackageRegistryEntry) => {
            quickPickItems.push({label: _package.name, description: _package.version, data: _package});
        });

        const quickPickOptions: vscode.QuickPickOptions = {
            ignoreFocusOut: false,
            canPickMany: false,
            placeHolder: prompt
        };

        return vscode.window.showQuickPick(quickPickItems, quickPickOptions);
    }

    private static async getChannels(): Promise<Array<IBlockchainQuickPickItem<Set<string>>>> {
        const fabricConnectionManager: FabricConnectionManager = FabricConnectionManager.instance();
        const connection: IFabricConnection = fabricConnectionManager.getConnection();
        if (!connection) {
            return Promise.reject('No connection to a blockchain found');
        }

        const quickPickItems: Array<IBlockchainQuickPickItem<Set<string>>> = [];
        const peerNames: Array<string> = connection.getAllPeerNames();
        for (const peerName of peerNames) {
            const allChannels: Array<string> = await connection.getAllChannelsForPeer(peerName);
            allChannels.forEach((channel: string) => {
                const foundItem: IBlockchainQuickPickItem<Set<string>> = quickPickItems.find((item: IBlockchainQuickPickItem<Set<string>>) => {
                    return channel === item.label;
                });
                if (foundItem) {
                    foundItem.data.add(peerName);
                } else {
                    const data: Set<string> = new Set<string>();
                    data.add(peerName);
                    quickPickItems.push({ label: channel, data: data });
                }
            });
        }
        return quickPickItems;
    }

    private static async getInstalledContracts(connection: IFabricConnection, peers: Set<string>): Promise<IBlockchainQuickPickItem<{ packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder }>[]> {
        const tempQuickPickItems: IBlockchainQuickPickItem<{ packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder }>[] = [];
        for (const peer of peers) {
            const chaincodes: Map<string, Array<string>> = await connection.getInstalledChaincode(peer);
            chaincodes.forEach((versions: string[], chaincodeName: string) => {
                versions.forEach((version: string) => {
                    const _package: PackageRegistryEntry = new PackageRegistryEntry({name: chaincodeName, version: version, path: undefined });
                    const data: {packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder} = {packageEntry: _package, workspace: undefined};
                    const label: string = `${chaincodeName}@${version}`;
                    tempQuickPickItems.push({label: label, description: 'Installed', data: data});
                });
            });
        }
        return tempQuickPickItems;
    }

    private static async getPackagedContracts(): Promise<IBlockchainQuickPickItem<{ packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder }>[]> {
        const tempQuickPickItems: IBlockchainQuickPickItem<{ packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder }>[] = [];
        const packages: Array<PackageRegistryEntry> = await PackageRegistry.instance().getAll();

        for (const _package of packages) {
            const data: {packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder} = {packageEntry: _package, workspace: undefined};
            const label: string = `${_package.name}@${_package.version}`;
            tempQuickPickItems.push({label: label, description: 'Packaged', data: data});
        }

        return tempQuickPickItems;
    }

    private static async getOpenProjects(): Promise<IBlockchainQuickPickItem<{ packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder }>[]> {
        const tempQuickPickItems: IBlockchainQuickPickItem<{ packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder }>[] = [];
        const workspaceFolderOptions: vscode.WorkspaceFolder[] = UserInputUtil.getWorkspaceFolders();
        for (const workspace of workspaceFolderOptions) {

            const data: {packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder} = {packageEntry: undefined, workspace: workspace};

            const label: string = `${workspace.name}`;
            tempQuickPickItems.push({label: label, description: 'Open Project', data: data});

        }

        return tempQuickPickItems;
    }
}
