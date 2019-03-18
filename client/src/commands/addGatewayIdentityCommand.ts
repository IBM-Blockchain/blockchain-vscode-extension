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
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../logging/OutputAdapter';
import { ParsedCertificate } from '../fabric/ParsedCertificate';
import { IFabricWallet } from '../fabric/IFabricWallet';
import { IFabricWalletGenerator } from '../fabric/IFabricWalletGenerator';
import { FabricWalletGeneratorFactory } from '../fabric/FabricWalletGeneratorFactory';
import { GatewayTreeItem } from '../explorer/model/GatewayTreeItem';
import { FabricGatewayRegistryEntry } from '../fabric/FabricGatewayRegistryEntry';
import { FabricGatewayHelper } from '../fabric/FabricGatewayHelper';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricCertificateAuthority } from '../fabric/FabricCertificateAuthority';

export async function addGatewayIdentity(gatewayItem: GatewayTreeItem | FabricGatewayRegistryEntry): Promise<{} | void | FabricGatewayRegistryEntry> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    let gatewayRegistryEntry: FabricGatewayRegistryEntry;
    outputAdapter.log(LogType.INFO, undefined, 'addGatewayIdentity');

    if (gatewayItem instanceof GatewayTreeItem) {
        gatewayRegistryEntry = gatewayItem.gateway;
    } else if (!gatewayItem) {
        const chosenEntry: IBlockchainQuickPickItem<FabricGatewayRegistryEntry> = await UserInputUtil.showGatewayQuickPickBox('Choose a gateway to add an identity to', false);
        if (!chosenEntry) {
            return;
        }

        gatewayRegistryEntry = chosenEntry.data;
    } else {
        gatewayRegistryEntry = gatewayItem;
    }

    if (gatewayItem instanceof GatewayTreeItem || !gatewayItem) {
        if (!FabricGatewayHelper.isCompleted(gatewayRegistryEntry)) {
            outputAdapter.log(LogType.ERROR, 'Blockchain gateway must be completed first!');
            return;
        }
    }

    const identity: {identityName: string, mspid: string} = {
        identityName: '',
        mspid: ''
    };

    // Ask for an identity name
    identity.identityName = await UserInputUtil.showInputBox('Provide a name for the identity');
    if (!identity.identityName) {
        return Promise.resolve();
    }

    let certificate: string;
    let privateKey: string;
    let certificatePath: string;
    let privateKeyPath: string;

    // User selects if they want to add an identity using either a cert/key or an id/secret
    const addIdentityMethod: string = await UserInputUtil.addIdentityMethod();
    if (!addIdentityMethod) {
        return Promise.resolve();
    }
    const mspID: string = await UserInputUtil.showInputBox('Enter MSP ID');
    if (!mspID) {
        // User cancelled entering mspid
        return Promise.resolve();
    }

    if (addIdentityMethod === UserInputUtil.ADD_CERT_KEY_OPTION) {
        // User wants to add an identity by providing a certificate and private key
        const certKey: {certificatePath: string, privateKeyPath: string} = await UserInputUtil.getCertKey(gatewayRegistryEntry.name);
        if (!certKey) {
            return Promise.resolve();
        }
        certificatePath = certKey.certificatePath;
        privateKeyPath = certKey.privateKeyPath;
    } else {
        // User wants to add an identity by providing a enrollment id and secret
        const enrollIdSecret: {enrollmentID: string, enrollmentSecret: string} = await UserInputUtil.getEnrollIdSecret();
        if (!enrollIdSecret) {
            return Promise.resolve();
        }

        const enrollmentID: string = enrollIdSecret.enrollmentID;
        const enrollmentSecret: string = enrollIdSecret.enrollmentSecret;

        const enrollment: {certificate: string, privateKey: string} = await FabricCertificateAuthority.enroll(gatewayRegistryEntry.connectionProfilePath, enrollmentID, enrollmentSecret);
        certificate = enrollment.certificate;
        privateKey = enrollment.privateKey;
    }

    // Create a local wallet and import that identity
    const fabricWalletGenerator: IFabricWalletGenerator = FabricWalletGeneratorFactory.createFabricWalletGenerator();

    let wallet: IFabricWallet;
    if (gatewayItem instanceof FabricGatewayRegistryEntry) {
        wallet = await fabricWalletGenerator.createLocalWallet(gatewayRegistryEntry.name);
    } else {
        wallet = fabricWalletGenerator.getNewWallet(gatewayRegistryEntry.name, gatewayRegistryEntry.walletPath);
    }

    if (certificatePath && privateKeyPath) {
        certificate = await fs.readFile(certificatePath, 'utf8');
        privateKey = await fs.readFile(privateKeyPath, 'utf8');
    }
    // Else certificate and privateKey have already been read in FabricCertificateAuthority.enroll

    try {
        await wallet.importIdentity(certificate, privateKey, identity.identityName, mspID);
    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Unable to add identity to gateway: ${error.message}`, `Unable to add identity to gateway: ${error.toString()}`);
        return;
    }

    if (gatewayItem instanceof FabricGatewayRegistryEntry) {
        gatewayRegistryEntry.walletPath = wallet.getWalletPath();
        return gatewayRegistryEntry;
    }
    await vscode.commands.executeCommand(ExtensionCommands.REFRESH_GATEWAYS);
    outputAdapter.log(LogType.SUCCESS, 'Successfully added identity', `Successfully added identity to gateway '${gatewayRegistryEntry.name}'`);
}
