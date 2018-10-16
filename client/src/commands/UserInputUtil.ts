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
import { ParsedCertificate } from '../fabric/ParsedCertificate';
import { FabricConnectionManager } from '../fabric/FabricConnectionManager';
import { PackageRegistry } from '../packages/PackageRegistry';
import { PackageRegistryEntry } from '../packages/PackageRegistryEntry';
import { FabricConnectionRegistry } from '../fabric/FabricConnectionRegistry';
import { FabricConnectionRegistryEntry } from '../fabric/FabricConnectionRegistryEntry';
import { FabricRuntimeManager } from '../fabric/FabricRuntimeManager';
import { FabricRuntime } from '../fabric/FabricRuntime';
import { IFabricConnection } from '../fabric/IFabricConnection';

export interface IBlockchainQuickPickItem<T = undefined> extends vscode.QuickPickItem {
    data: T;
}

export class UserInputUtil {

    static readonly ADD_TO_WORKSPACE = 'Add to workspace';
    static readonly OPEN_IN_CURRENT_WINDOW = 'Open in current window';
    static readonly OPEN_IN_NEW_WINDOW = 'Open in new window';
    static readonly YES = 'yes';
    static readonly NO = 'no';
    static readonly OVERWRITE_FILE = 'Overwrite file';
    static readonly SKIP_FILE = 'Skip file';
    static readonly FORCE_FILES = 'Force all files to overwrite';
    static readonly ABORT_GENERATOR = 'Abort generator';
    static readonly BROWSE_LABEL = '📁 Browse';
    static readonly EDIT_LABEL = '✎ Edit in User Settings';

    public static showConnectionQuickPickBox(prompt: string, hideManagedRuntime?: boolean): Thenable<IBlockchainQuickPickItem<FabricConnectionRegistryEntry> | undefined> {
        const connections: Array<FabricConnectionRegistryEntry> = FabricConnectionRegistry.instance().getAll();

        const quickPickOptions: vscode.QuickPickOptions = {
            ignoreFocusOut: false,
            canPickMany: false,
            placeHolder: prompt
        };

        let connectionsQuickPickItems: Array<IBlockchainQuickPickItem<FabricConnectionRegistryEntry>> = connections.map((connection: FabricConnectionRegistryEntry) => {
            return {label: connection.name, data: connection};
        });

        if (hideManagedRuntime) {
            connectionsQuickPickItems = connectionsQuickPickItems.filter((connection) => {
                return connection.label !== 'local_fabric';
            });
        }

        return vscode.window.showQuickPick(connectionsQuickPickItems, quickPickOptions);
    }

    public static showInputBox(question: string): Thenable<string | undefined> {
        const inputBoxOptions: vscode.InputBoxOptions = {
            prompt: question,
            ignoreFocusOut: true
        };

        return vscode.window.showInputBox(inputBoxOptions);
    }

    public static async showWorkspaceQuickPickBox(prompt: string): Promise<IBlockchainQuickPickItem<vscode.WorkspaceFolder>| undefined>  {
        const workspaceFolderOptions: vscode.WorkspaceFolder[] = UserInputUtil.getWorkspaceFolders();

        const workspaceQuickPickItems: Array<IBlockchainQuickPickItem<vscode.WorkspaceFolder>> = workspaceFolderOptions.map((workspaceFolderOption: vscode.WorkspaceFolder) => {
            return {label: workspaceFolderOption.name, data: workspaceFolderOption};
        });
        const quickPickOptions = {
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
        const workspace: vscode.WorkspaceFolder[] = vscode.workspace.workspaceFolders;
        if (!workspace) {
            const message: string = 'Please open the workspace that you want to be packaged.';
            vscode.window.showErrorMessage(message);
            throw new Error(message);
        }
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
            return {label: parsedCert.getCommonName(), data: identity};
        });

        return vscode.window.showQuickPick(identityQuickPickItems, quickPickOptions);
    }

    public static showRuntimeQuickPickBox(prompt: string): Thenable<IBlockchainQuickPickItem<FabricRuntime> | undefined> {
        const runtimes: FabricRuntime[] = FabricRuntimeManager.instance().getAll();

        const runtimeQuickPickItems: Array<IBlockchainQuickPickItem<FabricRuntime>> = runtimes.map((runtime: FabricRuntime) => {
            return {label: runtime.getName(), data: runtime};
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

    public static async showChaincodeAndVersionQuickPick(prompt: string, peers: Array<string>): Promise<IBlockchainQuickPickItem<{ chaincode: string, version: string }> | undefined> {
        const fabricConnectionManager: FabricConnectionManager = FabricConnectionManager.instance();
        const connection: IFabricConnection = fabricConnectionManager.getConnection();
        if (!connection) {
            return Promise.reject('No connection to a blockchain found');
        }

        const quickPickItems: Array<IBlockchainQuickPickItem<{ chaincode: string, version: string }>> = [];

        for (const peer of peers) {
            const chaincodes: Map<string, Array<string>> = await connection.getInstalledChaincode(peer);
            chaincodes.forEach((versions: string[], chaincodeName: string) => {
                versions.forEach((version: string) => {
                    const data = {chaincode: chaincodeName, version: version};
                    quickPickItems.push({label: `${chaincodeName}@${version}`, data: data});
                });
            });
        }

        // If there are no installed smart contract packages
        if (quickPickItems.length === 0) {
            vscode.window.showErrorMessage('No smart contracts are installed on peers in this channel. Install a smart contract before instantiating.');
            return;
        }

        const quickPickOptions: vscode.QuickPickOptions = {
            ignoreFocusOut: false,
            canPickMany: false,
            placeHolder: prompt
        };

        return await vscode.window.showQuickPick(quickPickItems, quickPickOptions);
    }

    public static async showChannelQuickPickBox(prompt: string): Promise<IBlockchainQuickPickItem<Array<string>> | undefined> {
        const fabricConnectionManager: FabricConnectionManager = FabricConnectionManager.instance();
        const connection: IFabricConnection = fabricConnectionManager.getConnection();
        if (!connection) {
            return Promise.reject('No connection to a blockchain found');
        }

        const quickPickItems: Array<IBlockchainQuickPickItem<Array<string>>> = [];
        const peerNames: Array<string> = connection.getAllPeerNames();
        for (const peerName of peerNames) {
            const allChannels: Array<string> = await connection.getAllChannelsForPeer(peerName);
            allChannels.forEach((channel: string) => {
                const foundItem: IBlockchainQuickPickItem<Array<string>> = quickPickItems.find((item: IBlockchainQuickPickItem<Array<string>>) => {
                    return channel === item.label;
                });

                if (foundItem) {
                    foundItem.data.push(channel);
                } else {
                    quickPickItems.push({label: channel, data: [peerName]});
                }
            });
        }

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
            return {label: _package.name, description: _package.version, data: _package};
        });

        const quickPickOptions: vscode.QuickPickOptions = {
            ignoreFocusOut: false,
            canPickMany: canPickMany,
            placeHolder: prompt
        };

        return vscode.window.showQuickPick(quickPickItems, quickPickOptions);
    }

    public static showSmartContractLanguagesQuickPick(prompt: string, languages: Array<string>): Thenable<string | undefined> {
        const choseSmartContractLanguageQuickPickOptions: vscode.QuickPickOptions = {
            placeHolder: prompt,
            ignoreFocusOut: true,
            matchOnDetail: true
        };

        return vscode.window.showQuickPick(languages, choseSmartContractLanguageQuickPickOptions);
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
                settingsPath = path.join(process.env.APPDATA, 'Code' , 'User', 'settings.json');
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

}
