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
import { IFabricWalletGenerator } from '../fabric/IFabricWalletGenerator';
import { FabricWalletGeneratorFactory } from '../fabric/FabricWalletGeneratorFactory';
import { ExtensionUtil } from '../util/ExtensionUtil';
import { ParsedCertificate } from '../fabric/ParsedCertificate';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../logging/OutputAdapter';
import { IFabricWallet } from '../fabric/IFabricWallet';
import { FabricGatewayRegistry } from '../fabric/FabricGatewayRegistry';
import { FabricGatewayRegistryEntry } from '../fabric/FabricGatewayRegistryEntry';
import { FabricGatewayHelper } from '../fabric/FabricGatewayHelper';
import { GatewayTreeItem } from '../explorer/model/GatewayTreeItem';
import { GatewayPropertyTreeItem } from '../explorer/model/GatewayPropertyTreeItem';
import { ExtensionCommands } from '../../ExtensionCommands';

export async function editGatewayCommand(treeItem: GatewayPropertyTreeItem | GatewayTreeItem): Promise < {} | void > {

    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, `editGateway ${treeItem}`);

    const fabricGatewayRegistry: FabricGatewayRegistry = FabricGatewayRegistry.instance();
    let propertyToEdit: string;
    let gateway: FabricGatewayRegistryEntry;

    try {
        if (!treeItem) {
            // If called from command palette
            // Ask for gateway
            const chosenGateway: IBlockchainQuickPickItem<FabricGatewayRegistryEntry> = await UserInputUtil.showGatewayQuickPickBox('Choose the gateway that you want to edit', false);
            if (!chosenGateway) {
                return;
            }
            gateway = chosenGateway.data;

            // Check if the gateway is completed
            const completedGateway: boolean = FabricGatewayHelper.isCompleted(chosenGateway.data);

            if (completedGateway) {
                // Open up the user settings
                await UserInputUtil.openUserSettings(chosenGateway.label);
                return;
            } else {
                // Browse or Edit for uncompleted fields
                propertyToEdit = await getProperty(chosenGateway.data);
                if (!propertyToEdit) {
                    return;
                }
            }

        } else {
            // If called using tree item
            gateway = treeItem.gateway;
            // Get the name of the property the user clicked on
            if (treeItem.label.includes('✓')) {
                // Don't allow user to change already completed connection properties
                return;
            } else if (treeItem.label.includes('+')) {
                propertyToEdit = treeItem.label.split('+ ')[1];
            }
            if (!propertyToEdit) {
                // If trying to edit an uncompleted connection by right-clicking and selecting 'Edit Connection'
                await UserInputUtil.openUserSettings(gateway.name);
                return;
            }
        }
        // Handle the property to edit
        // Do nothing if user cancels adding input
        if (propertyToEdit === 'Connection Profile') {

            await editConnectionProfile(gateway, fabricGatewayRegistry, outputAdapter);

        } else if (propertyToEdit === 'Wallet') {

            await editWallet(gateway, fabricGatewayRegistry, outputAdapter);

        } else {
            // PropertyToEdit is Identity
            await editIdentity(gateway, fabricGatewayRegistry, outputAdapter);
        }
    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Failed to edit gateway: ${error.message}`, `Failed to edit gateway: ${error.toString()}`);
        return;
    }

}

async function addIdentitytoNewWallet(gateway: FabricGatewayRegistryEntry, identityName: string, certPath: string, keyPath: string): Promise<string> {

    const connectionProfile: object = await ExtensionUtil.readConnectionProfile(gateway.connectionProfilePath);
    const certificate: string = await fs.readFile(certPath, 'utf8');
    const privateKey: string = await fs.readFile(keyPath, 'utf8');

    const FabricWalletGenerator: IFabricWalletGenerator = FabricWalletGeneratorFactory.createFabricWalletGenerator();
    const wallet: IFabricWallet = await FabricWalletGenerator.createLocalWallet(gateway.name);
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
            await vscode.commands.executeCommand(ExtensionCommands.REFRESH_GATEWAYS);
        } else {
            throw error;
        }
    }
    await vscode.commands.executeCommand(ExtensionCommands.REFRESH_GATEWAYS);
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

    const quickPickItems: string[] = [UserInputUtil.BROWSE_LABEL, UserInputUtil.EDIT_LABEL];
    const openDialogOptions: vscode.OpenDialogOptions = {
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        openLabel: 'Select',
        filters: undefined
    };

    result.certificatePath = await UserInputUtil.browseEdit('Browse for a certificate file', quickPickItems, openDialogOptions, connectionName);
    if (!result.certificatePath) {
        return result;
    }
    ParsedCertificate.validPEM(result.certificatePath, 'certificate');

    result.privateKeyPath = await UserInputUtil.browseEdit('Browse for a private key file', quickPickItems, openDialogOptions, connectionName);
    if (!result.privateKeyPath) {
        return result;
    }
    ParsedCertificate.validPEM(result.privateKeyPath, 'private key');

    return result;
}

function getOptions(gateway: any): string[] {
    const options: string[] = [];

    if (!FabricGatewayHelper.connectionProfilePathComplete(gateway)) {
        options.push('Connection Profile');
    }
    if (!FabricGatewayHelper.walletPathComplete(gateway)) {
        options.push('Wallet', 'Identity');
    }
    return options;
}

async function getProperty(gateway: any): Promise<string> {
    // Get the uncomplete properties
    const options: string[] = getOptions(gateway);
    if (options.length === 1) {
        return options[0];
    }

    const placeHolder: string = 'Select a gateway property to edit:';
    const propertyToEdit: string = await vscode.window.showQuickPick(options, { placeHolder });
    if (!propertyToEdit) {
        return;
    }

    return propertyToEdit;
}

async function editConnectionProfile(gateway: FabricGatewayRegistryEntry, fabricGatewayRegistry: FabricGatewayRegistry, outputAdapter: VSCodeBlockchainOutputAdapter): Promise<void> {

    const quickPickItems: string[] = [UserInputUtil.BROWSE_LABEL, UserInputUtil.EDIT_LABEL];
    const openDialogOptions: vscode.OpenDialogOptions = {
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        openLabel: 'Select',
        filters: {
            'Connection Profiles' : ['json', 'yaml', 'yml']
        }
    };

    // Ask for connection profile
    const result: string = await UserInputUtil.browseEdit('Enter a file path to a connection profile file', quickPickItems, openDialogOptions, gateway.name) as string;
    if (!result) {
        return;
    }
    gateway.connectionProfilePath = result;
    await fabricGatewayRegistry.update(gateway);
    outputAdapter.log(LogType.SUCCESS, 'Successfully updated gateway');

    if (!FabricGatewayHelper.walletPathComplete(gateway) ) {
        // Ask method to import identity
        const answer: string = await UserInputUtil.showAddIdentityOptionsQuickPick('Chose a method for importing identity to connect with:');
        if (!answer) {
            return;
        } else if (answer === UserInputUtil.WALLET) {
            // Ask for wallet

            openDialogOptions.filters = undefined;
            openDialogOptions.canSelectFiles = false;
            openDialogOptions.canSelectFolders = true;

            const walletResult: string = await UserInputUtil.browseEdit('Enter a file path to a wallet directory', quickPickItems, openDialogOptions, gateway.name) as string;
            if (!walletResult) {
                return;
            }
            gateway.walletPath = walletResult;
            await fabricGatewayRegistry.update(gateway);
            outputAdapter.log(LogType.SUCCESS, 'Successfully updated gateway');

        } else {
            // Ask for identity info
            const identityObject: any = await getIdentity(gateway.name);
            if (!identityObject.identityName || !identityObject.certificatePath || !identityObject.privateKeyPath) {
                return;
            }
            // Import to new wallet
            const walletPath: string = await addIdentitytoNewWallet(gateway, identityObject.identityName, identityObject.certificatePath, identityObject.privateKeyPath);
            gateway.walletPath = walletPath;
            await fabricGatewayRegistry.update(gateway);
            outputAdapter.log(LogType.SUCCESS, 'Successfully updated gateway');
        }
    }
}

async function editWallet(gateway: FabricGatewayRegistryEntry, fabricGatewayRegistry: FabricGatewayRegistry, outputAdapter: VSCodeBlockchainOutputAdapter): Promise<void> {
    const quickPickItems: string[] = [UserInputUtil.BROWSE_LABEL, UserInputUtil.EDIT_LABEL];
    const openDialogOptions: vscode.OpenDialogOptions = {
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: 'Select',
        filters: undefined
    };

    // Ask for wallet
    const result: string = await UserInputUtil.browseEdit('Enter a file path to a wallet directory', quickPickItems, openDialogOptions, gateway.name) as string;
    if (!result) {
        return;
    }
    gateway.walletPath = result;
    await fabricGatewayRegistry.update(gateway);
    outputAdapter.log(LogType.SUCCESS, 'Successfully updated gateway');

    if (!FabricGatewayHelper.connectionProfilePathComplete(gateway) ) {
        openDialogOptions.canSelectFiles = true;
        openDialogOptions.canSelectFolders = false;
        openDialogOptions.filters = {
            'Connection Profiles' : ['json', 'yaml', 'yml']
        };

        // Ask for Connection Profile
        const ccpResult: string = await UserInputUtil.browseEdit('Enter a file path to a connection profile file', quickPickItems, openDialogOptions, gateway.name) as string;
        if (!ccpResult) {
            return;
        }
        gateway.connectionProfilePath = ccpResult;
        await fabricGatewayRegistry.update(gateway);
        outputAdapter.log(LogType.SUCCESS, 'Successfully updated gateway');
    }

}

async function editIdentity(gateway: FabricGatewayRegistryEntry, fabricGatewayRegistry: FabricGatewayRegistry, outputAdapter: VSCodeBlockchainOutputAdapter): Promise<void> {
    // PropertyToEdit is Identity

    const identityObject: any = await getIdentity(gateway.name);
    if (!identityObject.identityName || !identityObject.certificatePath || !identityObject.privateKeyPath) {
        return;
    }
    if (!FabricGatewayHelper.connectionProfilePathComplete(gateway) ) {

        const quickPickItems: string[] = [UserInputUtil.BROWSE_LABEL, UserInputUtil.EDIT_LABEL];
        const openDialogOptions: vscode.OpenDialogOptions = {
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            openLabel: 'Select',
            filters: {
                'Connection Profiles' : ['json', 'yaml', 'yml']
            }
        };

        // Ask for Connection Profile
        const result: string = await UserInputUtil.browseEdit('Enter a file path to a connection profile file', quickPickItems, openDialogOptions, gateway.name) as string;
        if (!result) {
            // Connection Profile is needed to import identity so throw error if not given
            throw new Error('Connection Profile required to import identity to file system wallet');
        }
        gateway.connectionProfilePath = result;
        await fabricGatewayRegistry.update(gateway);
        outputAdapter.log(LogType.SUCCESS, 'Successfully updated gateway');
    }
    // Import identity to new wallet
    const walletPath: string = await addIdentitytoNewWallet(gateway, identityObject.identityName, identityObject.certificatePath, identityObject.privateKeyPath);
    if (!walletPath) {
        return;
    }
    gateway.walletPath = walletPath;
    await fabricGatewayRegistry.update(gateway);
    outputAdapter.log(LogType.SUCCESS, 'Successfully updated gateway');
}
