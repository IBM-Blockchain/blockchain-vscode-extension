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
import { IFabricWallet } from '../fabric/IFabricWallet';
import { IFabricWalletGenerator } from '../fabric/IFabricWalletGenerator';
import { FabricWalletGeneratorFactory } from '../fabric/FabricWalletGeneratorFactory';
import { WalletTreeItem } from '../explorer/wallets/WalletTreeItem';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricWalletRegistryEntry } from '../fabric/FabricWalletRegistryEntry';
import { FabricWalletRegistry } from '../fabric/FabricWalletRegistry';
import { FabricRuntimeManager } from '../fabric/FabricRuntimeManager';
import { FabricRuntime } from '../fabric/FabricRuntime';
import { FabricCertificateAuthority } from '../fabric/FabricCertificateAuthority';
import { FabricGatewayRegistryEntry } from '../fabric/FabricGatewayRegistryEntry';

export async function addWalletIdentity(walletItem: WalletTreeItem | IFabricWallet): Promise<{} | void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, 'addWalletIdentity');

    const fabricWalletGenerator: IFabricWalletGenerator = FabricWalletGeneratorFactory.createFabricWalletGenerator();
    let wallet: IFabricWallet;

    if (walletItem && walletItem instanceof WalletTreeItem) {
        // can't get it from the registry if it's local_fabric because it doesn't exist
        // TODO: hardcoded name
        if (walletItem.name === 'local_wallet') {
            wallet = await FabricWalletGeneratorFactory.createFabricWalletGenerator().createLocalWallet('local_wallet');
        } else {
            const walletRegistryEntry: FabricWalletRegistryEntry = await FabricWalletRegistry.instance().get(walletItem.name);
            wallet = fabricWalletGenerator.getNewWallet(walletRegistryEntry.walletPath);
        }
    } else if (walletItem && !(walletItem instanceof WalletTreeItem) ) {
        // called from addWallet command - walletItem is IFabricWallet
        wallet = walletItem;
    } else {
        // Called from the command palette
        const chosenWallet: IBlockchainQuickPickItem<FabricWalletRegistryEntry> = await UserInputUtil.showWalletsQuickPickBox('Choose a wallet to add identity to');
        if (!chosenWallet) {
            return Promise.resolve();
        }
        wallet = fabricWalletGenerator.getNewWallet(chosenWallet.data.walletPath);
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

    // User selects if they want to add an identity using either a cert/key or an id/secret
    const addIdentityMethod: string = await UserInputUtil.addIdentityMethod();
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
        // Ask them what gateway they want to use
        // TODO: only show completed connections - this will change with wallet association code
        const chosenEntry: IBlockchainQuickPickItem<FabricGatewayRegistryEntry> = await UserInputUtil.showGatewayQuickPickBox('Choose a gateway to enroll the identity with', true);
        if (!chosenEntry) {
            return Promise.resolve();
        }

        const gatewayRegistryEntry: FabricGatewayRegistryEntry = chosenEntry.data;
        if (gatewayRegistryEntry.managedRuntime) {
            const runtimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
            const runtime: FabricRuntime = runtimeManager.getRuntime();

            gatewayRegistryEntry.connectionProfilePath = await runtime.getConnectionProfilePath();
        }

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
}
