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
import { UserInputUtil, IBlockchainQuickPickItem } from './UserInputUtil';
import { FabricConnectionRegistryEntry } from '../fabric/FabricConnectionRegistryEntry';
import { FabricConnectionRegistry } from '../fabric/FabricConnectionRegistry';
import { ConnectionPropertyTreeItem } from '../explorer/model/ConnectionPropertyTreeItem';
import { ConnectionTreeItem } from '../explorer/model/ConnectionTreeItem';
import { FabricConnectionHelper } from '../fabric/FabricConnectionHelper';
import { IFabricWalletGenerator } from '../fabric/IFabricWalletGenerator';
import { FabricWalletGeneratorFactory } from '../fabric/FabricWalletGeneratorFactory';
import { ExtensionUtil } from '../util/ExtensionUtil';
import { ParsedCertificate } from '../fabric/ParsedCertificate';
import { VSCodeOutputAdapter } from '../logging/VSCodeOutputAdapter';
import { LogType } from '../logging/OutputAdapter';
import { IFabricWallet } from '../fabric/IFabricWallet';

export async function editConnectionCommand(treeItem: ConnectionPropertyTreeItem | ConnectionTreeItem): Promise < {} | void > {

    const outputAdapter: VSCodeOutputAdapter = VSCodeOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, `editConnection ${treeItem}`);

    const fabricConnectionRegistry: FabricConnectionRegistry = FabricConnectionRegistry.instance();
    let propertyToEdit: string;
    let connection: FabricConnectionRegistryEntry;

    try {
        if (!treeItem) {
            // If called from command palette
            // Ask for connection
            const chosenConnection: IBlockchainQuickPickItem<FabricConnectionRegistryEntry> = await UserInputUtil.showConnectionQuickPickBox('Choose the connection that you want to edit', false);
            if (!chosenConnection) {
                return;
            }
            connection = chosenConnection.data;

            // Check if the connection is completed
            const completedConnection: boolean = FabricConnectionHelper.isCompleted(chosenConnection.data);

            if (completedConnection) {
                // Open up the user settings
                await UserInputUtil.openUserSettings(chosenConnection.label);
                return;
            } else {
                // Browse or Edit for uncompleted fields
                propertyToEdit = await getProperty(chosenConnection.data);
                if (!propertyToEdit) {
                    return;
                }
            }

        } else {
            // If called using tree item
            connection = treeItem.connection;
            // Get the name of the property the user clicked on
            if (treeItem.label.includes('✓')) {
                // Don't allow user to change already completed connection properties
                return;
            } else if (treeItem.label.includes('+')) {
                propertyToEdit = treeItem.label.split('+ ')[1];
            }
            if (!propertyToEdit) {
                // If trying to edit an uncompleted connection by right-clicking and selecting 'Edit Connection'
                await UserInputUtil.openUserSettings(connection.name);
                return;
            }
        }
        // Handle the property to edit
        // Do nothing if user cancels adding input
        if (propertyToEdit === 'Connection Profile') {

            await editConnectionProfile(connection, fabricConnectionRegistry, outputAdapter);

        } else if (propertyToEdit === 'Wallet') {

            await editWallet(connection, fabricConnectionRegistry, outputAdapter);

        } else {
            // PropertyToEdit is Identity
            await editIdentity(connection, fabricConnectionRegistry, outputAdapter);
        }
    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Failed to edit connection: ${error.message}`, `Failed to edit connection: ${error.toString()}`);
        return;
    }

}

async function addIdentitytoNewWallet(connection: FabricConnectionRegistryEntry, identityName: string, certPath: string, keyPath: string): Promise<string> {

    const connectionProfile: object = await ExtensionUtil.readConnectionProfile(connection.connectionProfilePath);
    const certificate: string = await fs.readFile(certPath, 'utf8');
    const privateKey: string = await fs.readFile(keyPath, 'utf8');

    const FabricWalletGenerator: IFabricWalletGenerator = FabricWalletGeneratorFactory.createFabricWalletGenerator();
    const wallet: IFabricWallet = await FabricWalletGenerator.createLocalWallet(connection.name);
    try {
        await wallet.importIdentity(connectionProfile, certificate, privateKey, identityName);
    } catch (error) {
        if (error.message.includes(`Client.createUser parameter 'opts mspid' is required`)) {
            // Error thrown when the client section is missing from the connection profile, so ask the user for it
            const mspid: string = await UserInputUtil.showInputBox('Client section of the connection profile does not specify mspid. Please enter mspid:');
            if (!mspid) {
                // User cancelled entering mspid
                return;
            }
            await wallet.importIdentity(connectionProfile, certificate, privateKey, identityName, mspid);
            await vscode.commands.executeCommand('blockchainExplorer.refreshEntry');
        } else {
            throw error;
        }
    }
    await vscode.commands.executeCommand('blockchainExplorer.refreshEntry');
    return wallet.getWalletPath();
}

async function getIdentity(connectionName: string): Promise<any> {
    const result: any = {
        identityName: '',
        certificatePath: '',
        privateKeyPath: '',
   };

    result.identityName = await UserInputUtil.showInputBox('Provide a name for the identity');
    if (!result.identityName) {
        return result;
    }

    result.certificatePath = await UserInputUtil.browseEdit('Browse for a certificate file', connectionName);
    if (!result.certificatePath) {
        return result;
    }
    ParsedCertificate.validPEM(result.certificatePath, 'certificate');

    result.privateKeyPath = await UserInputUtil.browseEdit('Browse for a private key file', connectionName);
    if (!result.privateKeyPath) {
        return result;
    }
    ParsedCertificate.validPEM(result.privateKeyPath, 'private key');

    return result;
}

function getOptions(connection: any): string[] {
    const options: string[] = [];

    if (!FabricConnectionHelper.connectionProfilePathComplete(connection)) {
        options.push('Connection Profile');
    }
    if (!FabricConnectionHelper.walletPathComplete(connection)) {
        options.push('Wallet', 'Identity');
    }
    return options;
}

async function getProperty(connection: any): Promise<string> {
    // Get the uncomplete properties
    const options: string[] = getOptions(connection);
    if (options.length === 1) {
        return options[0];
    }

    const placeHolder: string = 'Select a connection property to edit:';
    const propertyToEdit: string = await vscode.window.showQuickPick(options, { placeHolder });
    if (!propertyToEdit) {
        return;
    }

    return propertyToEdit;
}

async function editConnectionProfile(connection: FabricConnectionRegistryEntry, fabricConnectionRegistry: FabricConnectionRegistry, outputAdapter: VSCodeOutputAdapter): Promise<void> {

    // Ask for connection profile
    const result: string = await UserInputUtil.browseEdit('Enter a file path to a connection profile file', connection.name, false, {
        'Connection Profiles' : ['json', 'yaml', 'yml']
    });
    if (!result) {
        return;
    }
    connection.connectionProfilePath = result;
    await fabricConnectionRegistry.update(connection);
    outputAdapter.log(LogType.SUCCESS, 'Successfully updated connection');

    if (!FabricConnectionHelper.walletPathComplete(connection) ) {
        // Ask method to import identity
        const answer: string = await UserInputUtil.showAddIdentityOptionsQuickPick('Chose a method for importing identity to connect with:');
        if (!answer) {
            return;
        } else if (answer === UserInputUtil.WALLET) {
            // Ask for wallet
            const walletResult: string = await UserInputUtil.browseEdit('Enter a file path to a wallet directory', connection.name, true);
            if (!walletResult) {
                return;
            }
            connection.walletPath = walletResult;
            await fabricConnectionRegistry.update(connection);
            outputAdapter.log(LogType.SUCCESS, 'Successfully updated connection');

        } else {
            // Ask for identity info
            const identityObject: any = await getIdentity(connection.name);
            if (!identityObject.identityName || !identityObject.certificatePath || !identityObject.privateKeyPath) {
                return;
            }
            // Import to new wallet
            const walletPath: string = await addIdentitytoNewWallet(connection, identityObject.identityName, identityObject.certificatePath, identityObject.privateKeyPath);
            connection.walletPath = walletPath;
            await fabricConnectionRegistry.update(connection);
            outputAdapter.log(LogType.SUCCESS, 'Successfully updated connection');
        }
    }
}

async function editWallet(connection: FabricConnectionRegistryEntry, fabricConnectionRegistry: FabricConnectionRegistry, outputAdapter: VSCodeOutputAdapter): Promise<void> {
    // Ask for wallet
    const result: string = await UserInputUtil.browseEdit('Enter a file path to a wallet directory', connection.name, true);
    if (!result) {
        return;
    }
    connection.walletPath = result;
    await fabricConnectionRegistry.update(connection);
    outputAdapter.log(LogType.SUCCESS, 'Successfully updated connection');

    if (!FabricConnectionHelper.connectionProfilePathComplete(connection) ) {
        // Ask for Connection Profile
        const ccpResult: string = await UserInputUtil.browseEdit('Enter a file path to a connection profile file', connection.name, false, {
            'Connection Profiles' : ['json', 'yaml', 'yml']
        });
        if (!ccpResult) {
            return;
        }
        connection.connectionProfilePath = ccpResult;
        await fabricConnectionRegistry.update(connection);
        outputAdapter.log(LogType.SUCCESS, 'Successfully updated connection');
    }

}

async function editIdentity(connection: FabricConnectionRegistryEntry, fabricConnectionRegistry: FabricConnectionRegistry, outputAdapter: VSCodeOutputAdapter): Promise<void> {
    // PropertyToEdit is Identity

    const identityObject: any = await getIdentity(connection.name);
    if (!identityObject.identityName || !identityObject.certificatePath || !identityObject.privateKeyPath) {
        return;
    }
    if (!FabricConnectionHelper.connectionProfilePathComplete(connection) ) {
        // Ask for Connection Profile
        const result: string = await UserInputUtil.browseEdit('Enter a file path to a connection profile file', connection.name, false, {
            'Connection Profiles' : ['json', 'yaml', 'yml']
        });
        if (!result) {
            // Connection Profile is needed to import identity so throw error if not given
            throw new Error('Connection Profile required to import identity to file system wallet');
        }
        connection.connectionProfilePath = result;
        await fabricConnectionRegistry.update(connection);
        outputAdapter.log(LogType.SUCCESS, 'Successfully updated connection');
    }
    // Import identity to new wallet
    const walletPath: string = await addIdentitytoNewWallet(connection, identityObject.identityName, identityObject.certificatePath, identityObject.privateKeyPath);
    if (!walletPath) {
        return;
    }
    connection.walletPath = walletPath;
    await fabricConnectionRegistry.update(connection);
    outputAdapter.log(LogType.SUCCESS, 'Successfully updated connection');
}
