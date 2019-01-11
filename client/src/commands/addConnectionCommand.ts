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
import {UserInputUtil} from './UserInputUtil';
import { FabricConnectionRegistryEntry } from '../fabric/FabricConnectionRegistryEntry';
import { FabricConnectionRegistry } from '../fabric/FabricConnectionRegistry';
import { FabricConnectionHelper } from '../fabric/FabricConnectionHelper';
import { ParsedCertificate } from '../fabric/ParsedCertificate';
import { VSCodeOutputAdapter } from '../logging/VSCodeOutputAdapter';
import { LogType } from '../logging/OutputAdapter';
import { IFabricWallet } from '../fabric/IFabricWallet';
import { IFabricWalletGenerator } from '../fabric/IFabricWalletGenerator';
import { FabricWalletGeneratorFactory } from '../fabric/FabricWalletGeneratorFactory';
import * as fs from 'fs-extra';
import { ExtensionUtil } from '../util/ExtensionUtil';

export async function addConnection(): Promise<{} | void> {
    const outputAdapter: VSCodeOutputAdapter = VSCodeOutputAdapter.instance();
    try {
        outputAdapter.log(LogType.INFO, undefined, 'addConnection');

        let identityObject: any;

        const connectionName: string = await UserInputUtil.showInputBox('Enter a name for the connection');
        if (!connectionName) {
            return Promise.resolve();
        }

        // Create the connection immediately
        const fabricConnectionEntry: FabricConnectionRegistryEntry = new FabricConnectionRegistryEntry();
        fabricConnectionEntry.connectionProfilePath = FabricConnectionHelper.CONNECTION_PROFILE_PATH_DEFAULT;
        fabricConnectionEntry.name = connectionName;
        fabricConnectionEntry.walletPath = FabricConnectionHelper.WALLET_PATH_DEFAULT;

        const fabricConnectionRegistry: FabricConnectionRegistry = FabricConnectionRegistry.instance();
        await fabricConnectionRegistry.add(fabricConnectionEntry);

        // Get the connection profile json file path
        const connectionProfilePath: string = await UserInputUtil.browseEdit('Enter a file path to a connection profile file', connectionName, false, {
            'Connection Profiles' : ['json', 'yaml', 'yml']
        });
        if (!connectionProfilePath) {
            return Promise.resolve();
        }

        fabricConnectionEntry.connectionProfilePath = connectionProfilePath;
        await fabricConnectionRegistry.update(fabricConnectionEntry);

        // Ask the user whether they want to provide a wallet or certficate and privateKey file paths
        const answer: string = await UserInputUtil.showAddIdentityOptionsQuickPick('Chose a method for importing identity to connect with:');
        if (!answer) {
            // User cancelled, so do nothing
            return Promise.resolve();
        } else if (answer === UserInputUtil.CERT_KEY) {

            identityObject = await getIdentity(connectionName);

            await createWalletAndImport(fabricConnectionEntry, identityObject);

            await fabricConnectionRegistry.update(fabricConnectionEntry);
            outputAdapter.log(LogType.SUCCESS, 'Successfully added a new connection');

        } else {
            // User has a wallet - get the path
            const walletPath: string = await UserInputUtil.browseEdit('Enter a file path to a wallet directory', connectionName, true);
            if (!walletPath) {
                return Promise.resolve();
            }
            fabricConnectionEntry.walletPath = walletPath;
            await fabricConnectionRegistry.update(fabricConnectionEntry);
            outputAdapter.log(LogType.SUCCESS, 'Successfully added a new connection');
        }
    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Failed to add a new connection: ${error.message}`, `Failed to add a new connection: ${error.toString()}`);
    }
}

async function getIdentity(connectionName: string): Promise<any> {
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

    // Get the certificate file path
    result.certificatePath = await UserInputUtil.browseEdit('Browse for a certificate file', connectionName);
    if (!result.certificatePath) {
        return Promise.resolve();
    }
    ParsedCertificate.validPEM(result.certificatePath, 'certificate');

    // Get the private key file path
    result.privateKeyPath = await UserInputUtil.browseEdit('Browse for a private key file', connectionName);
    if (!result.privateKeyPath) {
        return Promise.resolve();
    }
    ParsedCertificate.validPEM(result.privateKeyPath, 'private key');

    return result;

}

async function createWalletAndImport(fabricConnectionEntry: FabricConnectionRegistryEntry, identityObject: any): Promise<void> {

    let wallet: IFabricWallet;

    // Create a local wallet and import that identity
    const FabricWalletGenerator: IFabricWalletGenerator = FabricWalletGeneratorFactory.createFabricWalletGenerator();
    wallet = await FabricWalletGenerator.createLocalWallet(fabricConnectionEntry.name);

    const connectionProfile: object = await ExtensionUtil.readConnectionProfile(fabricConnectionEntry.connectionProfilePath);
    const certificate: string = await fs.readFile(identityObject.certificatePath, 'utf8');
    const privateKey: string = await fs.readFile(identityObject.privateKeyPath, 'utf8');
    try {
        await wallet.importIdentity(connectionProfile, certificate, privateKey, identityObject.identityName);
    } catch (error) {
        if (error.message.includes(`Client.createUser parameter 'opts mspid' is required`)) {
            // Error thrown when the client section is missing from the connection profile, so ask the user for it
            const mspid: string = await UserInputUtil.showInputBox('Client section of the connection profile does not specify mspid. Please enter mspid:');
            if (!mspid) {
                // User cancelled entering mspid
                return Promise.resolve();
            }
            await wallet.importIdentity(connectionProfile, certificate, privateKey, identityObject.identityName, mspid);
        } else {
            throw error;
        }
    }

    fabricConnectionEntry.walletPath = wallet.getWalletPath();

}
