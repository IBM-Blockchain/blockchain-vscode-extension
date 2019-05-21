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
import { Reporter } from '../util/Reporter';
import { UserInputUtil, IBlockchainQuickPickItem } from './UserInputUtil';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../logging/OutputAdapter';
import { IFabricWallet } from '../fabric/IFabricWallet';
import { IFabricWalletGenerator } from '../fabric/IFabricWalletGenerator';
import { FabricWalletGeneratorFactory } from '../fabric/FabricWalletGeneratorFactory';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricWalletRegistryEntry } from '../fabric/FabricWalletRegistryEntry';
import { FabricGatewayRegistryEntry } from '../fabric/FabricGatewayRegistryEntry';
import { IFabricCertificateAuthority } from '../fabric/IFabricCertificateAuthority';
import { FabricCertificateAuthorityFactory } from '../fabric/FabricCertificateAuthorityFactory';
import { FabricRuntimeManager } from '../fabric/FabricRuntimeManager';
import { FabricGatewayRegistry } from '../fabric/FabricGatewayRegistry';
import { WalletTreeItem } from '../explorer/wallets/WalletTreeItem';

export async function addWalletIdentity(walletItem: WalletTreeItem | IFabricWallet): Promise<{} | void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, 'addWalletIdentity');

    const fabricWalletGenerator: IFabricWalletGenerator = FabricWalletGeneratorFactory.createFabricWalletGenerator();
    let wallet: IFabricWallet;
    let walletRegistryEntry: FabricWalletRegistryEntry;

    if (walletItem) {
        // Command called from the tree by selecting a WalletTreeItem or LocalWalletTreeItem
        if (walletItem instanceof WalletTreeItem) {

            walletRegistryEntry = walletItem.registryEntry;
            wallet = fabricWalletGenerator.getNewWallet(walletRegistryEntry.walletPath);

        } else {
            // called from addWallet command - walletItem is IFabricWallet
            // walletRegistryEntry remains undefined, as we've not created it yet
            // If this command fails, we don't want to add the non existent wallet to the registry
            wallet = walletItem;
        }
    } else {
        // Called from the command palette
        const chosenWallet: IBlockchainQuickPickItem<FabricWalletRegistryEntry> = await UserInputUtil.showWalletsQuickPickBox('Choose a wallet to add identity to', true);
        if (!chosenWallet) {
            return Promise.resolve();
        }
        wallet = fabricWalletGenerator.getNewWallet(chosenWallet.data.walletPath);
        walletRegistryEntry = chosenWallet.data;
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

    const mspID: string = await UserInputUtil.showInputBox('Enter MSPID');
    if (!mspID) {
        // User cancelled entering mspid
        return Promise.resolve();
    }

    let certificate: string;
    let privateKey: string;
    let certificatePath: string;
    let privateKeyPath: string;

    let isLocalWallet: boolean;
    if (walletRegistryEntry && walletRegistryEntry.managedWallet) {
        isLocalWallet = true;
    } else {
        isLocalWallet = false;
    }

    // User selects if they want to add an identity using either a cert/key or an id/secret
    const addIdentityMethod: string = await UserInputUtil.addIdentityMethod(isLocalWallet);
    if (!addIdentityMethod) {
        return Promise.resolve();
    }

    if (addIdentityMethod === UserInputUtil.ADD_CERT_KEY_OPTION) {
        // User wants to add an identity by providing a certificate and private key
        const certKey: {certificatePath: string, privateKeyPath: string} = await UserInputUtil.getCertKey();
        if (!certKey) {
            return Promise.resolve();
        }
        certificatePath = certKey.certificatePath;
        privateKeyPath = certKey.privateKeyPath;
    } else {
        // User wants to add an identity by providing a enrollment id and secret

        // Ask them what gateway they want to use for enrollment.
        // We can't tell this automatically as a wallet is associated with a gateway (and a wallet can be associated with multiple gateways)
        let gatewayRegistryEntry: FabricGatewayRegistryEntry;

        // Limit the user to use local_fabric for local_fabric_wallet identities
        if (walletRegistryEntry && walletRegistryEntry.managedWallet) {
            // wallet is managed so use local_fabric as the gateway
            // assume there is only one
            const runtimeGateways: Array<FabricGatewayRegistryEntry> = await FabricRuntimeManager.instance().getGatewayRegistryEntries();
            gatewayRegistryEntry = runtimeGateways[0];

        } else {
            // select from other gateways
            // Check there is at least one
            let gateways: Array<FabricGatewayRegistryEntry> = [];
            gateways = FabricGatewayRegistry.instance().getAll();
            if (gateways.length === 0) {
                outputAdapter.log(LogType.ERROR, `Please add a gateway in order to enroll a new identity`);
                return;
            }

            const chosenEntry: IBlockchainQuickPickItem<FabricGatewayRegistryEntry> = await UserInputUtil.showGatewayQuickPickBox('Choose a gateway to enroll the identity with', false);
            if (!chosenEntry) {
                return Promise.resolve();
            }
            gatewayRegistryEntry = chosenEntry.data;
        }

        const enrollIdSecret: {enrollmentID: string, enrollmentSecret: string} = await UserInputUtil.getEnrollIdSecret();
        if (!enrollIdSecret) {
            return Promise.resolve();
        }

        const enrollmentID: string = enrollIdSecret.enrollmentID;
        const enrollmentSecret: string = enrollIdSecret.enrollmentSecret;

        const certificateAuthority: IFabricCertificateAuthority = FabricCertificateAuthorityFactory.createCertificateAuthority();

        const enrollment: {certificate: string, privateKey: string} = await certificateAuthority.enroll(gatewayRegistryEntry.connectionProfilePath, enrollmentID, enrollmentSecret);
        certificate = enrollment.certificate;
        privateKey = enrollment.privateKey;
    }

    if (certificatePath && privateKeyPath) {
        certificate = await fs.readFile(certificatePath, 'utf8');
        privateKey = await fs.readFile(privateKeyPath, 'utf8');
    }
    // Else certificate and privateKey have already been read in FabricCertificateAuthority.enroll

    try {
        await wallet.importIdentity(certificate, privateKey, identity.identityName, mspID);
    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Unable to add identity to wallet: ${error.message}`, `Unable to add identity to wallet: ${error.toString()}`);
        return;
    }

    await vscode.commands.executeCommand(ExtensionCommands.REFRESH_WALLETS);
    outputAdapter.log(LogType.SUCCESS, 'Successfully added identity', `Successfully added identity to wallet`);

    // Send telemetry event
    if (addIdentityMethod === UserInputUtil.ADD_CERT_KEY_OPTION) {
        Reporter.instance().sendTelemetryEvent('addWalletIdentityCommand', {method: 'Certificate'});
    } else {
        Reporter.instance().sendTelemetryEvent('addWalletIdentityCommand', {method: 'enrollmentID'});
    }
}
