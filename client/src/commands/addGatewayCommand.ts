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
import {UserInputUtil} from './UserInputUtil';
import { ParsedCertificate } from '../fabric/ParsedCertificate';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../logging/OutputAdapter';
import { IFabricWallet } from '../fabric/IFabricWallet';
import { IFabricWalletGenerator } from '../fabric/IFabricWalletGenerator';
import { FabricWalletGeneratorFactory } from '../fabric/FabricWalletGeneratorFactory';
import * as fs from 'fs-extra';
import { FabricGatewayRegistryEntry } from '../fabric/FabricGatewayRegistryEntry';
import { FabricGatewayHelper } from '../fabric/FabricGatewayHelper';
import { FabricGatewayRegistry } from '../fabric/FabricGatewayRegistry';
import { FabricWalletRegistryEntry } from '../fabric/FabricWalletRegistryEntry';
import { FabricWalletRegistry } from '../fabric/FabricWalletRegistry';

export async function addGateway(): Promise<{} | void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    try {
        outputAdapter.log(LogType.INFO, undefined, 'addGateway');

        let identityObject: any;

        const gatewayName: string = await UserInputUtil.showInputBox('Enter a name for the gateway');
        if (!gatewayName) {
            return Promise.resolve();
        }

        // Create the connection immediately
        const fabricGatewayEntry: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
        fabricGatewayEntry.connectionProfilePath = FabricGatewayHelper.CONNECTION_PROFILE_PATH_DEFAULT;
        fabricGatewayEntry.name = gatewayName;
        fabricGatewayEntry.walletPath = FabricGatewayHelper.WALLET_PATH_DEFAULT;

        const fabricGatewayRegistry: FabricGatewayRegistry = FabricGatewayRegistry.instance();
        await fabricGatewayRegistry.add(fabricGatewayEntry);

        const fabricWalletRegistry: FabricWalletRegistry = FabricWalletRegistry.instance();
        const fabricWalletRegistryEntry: FabricWalletRegistryEntry = new FabricWalletRegistryEntry();
        fabricWalletRegistryEntry.name = fabricGatewayEntry.name;
        await fabricWalletRegistry.add(fabricWalletRegistryEntry);

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

        // Get the connection profile json file path
        const connectionProfilePath: string = await UserInputUtil.browseEdit('Enter a file path to a connection profile file', quickPickItems, openDialogOptions, gatewayName) as string;
        if (!connectionProfilePath) {
            return Promise.resolve();
        }

        // Copy the user given connection profile to the gateway directory (in the blockchain extension directory)
        fabricGatewayEntry.connectionProfilePath = await FabricGatewayHelper.copyConnectionProfile(gatewayName, connectionProfilePath);
        await fabricGatewayRegistry.update(fabricGatewayEntry);

        // Ask the user whether they want to provide a wallet or certficate and privateKey file paths
        const answer: string = await UserInputUtil.showAddIdentityOptionsQuickPick('Chose a method for importing identity to connect with:');
        if (!answer) {
            // User cancelled, so do nothing
            return Promise.resolve();
        } else if (answer === UserInputUtil.CERT_KEY) {
            identityObject = await getIdentity(gatewayName);
            if (!identityObject) {
                // Either a certificate or private key wasn't given
                return;
            }

            await createWalletAndImport(fabricGatewayEntry, identityObject, fabricWalletRegistryEntry);

            await fabricGatewayRegistry.update(fabricGatewayEntry);
            outputAdapter.log(LogType.SUCCESS, 'Successfully added a new gateway');

        } else {

            openDialogOptions.filters = undefined;
            openDialogOptions.canSelectFiles = false;
            openDialogOptions.canSelectFolders = true;
            // User has a wallet - get the path
            const walletPath: string = await UserInputUtil.browseEdit('Enter a file path to a wallet directory', quickPickItems, openDialogOptions, gatewayName) as string;
            if (!walletPath) {
                return Promise.resolve();
            }
            fabricGatewayEntry.walletPath = walletPath;
            await fabricGatewayRegistry.update(fabricGatewayEntry);

            fabricWalletRegistryEntry.walletPath = walletPath;
            await fabricWalletRegistry.update(fabricWalletRegistryEntry);

            outputAdapter.log(LogType.SUCCESS, 'Successfully added a new gateway');
        }
    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Failed to add a new connection: ${error.message}`, `Failed to add a new connection: ${error.toString()}`);
    }
}

async function getIdentity(gatewayName: string): Promise<any> {
    const result: any = {
        identityName: '',
        certificatePath: '',
        privateKeyPath: '',
    };

    // Ask for an identity name
    result.identityName = await UserInputUtil.showInputBox('Provide a name for the identity');
    if (!result.identityName) {
        return Promise.resolve();
    }

    const quickPickItems: string[] = [UserInputUtil.BROWSE_LABEL, UserInputUtil.EDIT_LABEL];
    const openDialogOptions: vscode.OpenDialogOptions = {
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        openLabel: 'Select',
        filters: undefined
    };

    // Get the certificate file path
    result.certificatePath = await UserInputUtil.browseEdit('Browse for a certificate file', quickPickItems, openDialogOptions, gatewayName);
    if (!result.certificatePath) {
        return Promise.resolve();
    }
    ParsedCertificate.validPEM(result.certificatePath, 'certificate');

    // Get the private key file path
    result.privateKeyPath = await UserInputUtil.browseEdit('Browse for a private key file', quickPickItems, openDialogOptions, gatewayName);
    if (!result.privateKeyPath) {
        return Promise.resolve();
    }
    ParsedCertificate.validPEM(result.privateKeyPath, 'private key');

    return result;

}

async function createWalletAndImport(fabricGatewayEntry: FabricGatewayRegistryEntry, identityObject: any, fabricWalletRegistryEntry: FabricWalletRegistryEntry): Promise<void> {

    let wallet: IFabricWallet;

    // Create a local wallet and import that identity
    const FabricWalletGenerator: IFabricWalletGenerator = FabricWalletGeneratorFactory.createFabricWalletGenerator();
    wallet = await FabricWalletGenerator.createLocalWallet(fabricGatewayEntry.name);

    const certificate: string = await fs.readFile(identityObject.certificatePath, 'utf8');
    const privateKey: string = await fs.readFile(identityObject.privateKeyPath, 'utf8');
    try {

        const mspid: string = await UserInputUtil.showInputBox('Enter a mspid');
        if (!mspid) {
            // User cancelled entering mspid
            return;
        }
        await wallet.importIdentity(certificate, privateKey, identityObject.identityName, mspid);
    } catch (error) {
        throw error;
    }

    fabricWalletRegistryEntry.walletPath = wallet.getWalletPath();
    const fabricWalletRegistry: FabricWalletRegistry = FabricWalletRegistry.instance();
    await fabricWalletRegistry.update(fabricWalletRegistryEntry);
    fabricGatewayEntry.walletPath = wallet.getWalletPath();
}
