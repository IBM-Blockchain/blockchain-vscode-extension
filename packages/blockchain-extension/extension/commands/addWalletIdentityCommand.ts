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
import * as yaml from 'js-yaml';
import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import { Reporter } from '../util/Reporter';
import { UserInputUtil, IBlockchainQuickPickItem } from './UserInputUtil';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricCertificateAuthorityFactory } from '../fabric/FabricCertificateAuthorityFactory';
import { WalletTreeItem } from '../explorer/wallets/WalletTreeItem';
import { FabricGatewayHelper } from '../fabric/FabricGatewayHelper';
import { FabricWalletRegistryEntry, IFabricCertificateAuthority, IFabricWallet, IFabricWalletGenerator, LogType, FabricEnvironmentRegistryEntry, FabricEnvironmentRegistry, FabricGatewayRegistryEntry, FabricWalletGeneratorFactory, FabricNode } from 'ibm-blockchain-platform-common';
import { ManagedAnsibleEnvironment } from '../fabric/environments/ManagedAnsibleEnvironment';
import { EnvironmentFactory } from '../fabric/environments/EnvironmentFactory';
import { LocalEnvironment } from '../fabric/environments/LocalEnvironment';

export async function addWalletIdentity(walletItem: WalletTreeItem | FabricWalletRegistryEntry, mspid: string): Promise<string> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, 'addWalletIdentity');

    const fabricWalletGenerator: IFabricWalletGenerator = FabricWalletGeneratorFactory.getFabricWalletGenerator();
    let wallet: IFabricWallet;
    let walletRegistryEntry: FabricWalletRegistryEntry;

    if (walletItem) {
        // Command called from the tree by selecting a WalletTreeItem or LocalWalletTreeItem
        if (walletItem instanceof WalletTreeItem) {
            walletRegistryEntry = walletItem.registryEntry;
        } else {
            // called from addWallet command - walletItem is FabricWalletRegistryEntry
            walletRegistryEntry = walletItem;
        }

        wallet = await fabricWalletGenerator.getWallet(walletRegistryEntry);
    } else {
        // Called from the command palette
        const chosenWallet: IBlockchainQuickPickItem<FabricWalletRegistryEntry> = await UserInputUtil.showWalletsQuickPickBox('Choose a wallet to add identity to', false, true) as IBlockchainQuickPickItem<FabricWalletRegistryEntry>;
        if (!chosenWallet) {
            return;
        }
        wallet = await fabricWalletGenerator.getWallet(chosenWallet.data);
        walletRegistryEntry = chosenWallet.data;
    }

    // Ask for an identity name
    const identityName: string = await UserInputUtil.showInputBox('Provide a name for the identity');
    if (!identityName) {
        return;
    }

    let isManagedWallet: boolean;
    if (walletRegistryEntry && walletRegistryEntry.managedWallet) {
        isManagedWallet = true;
    } else {
        isManagedWallet = false;
    }

    let environmentEntry: FabricEnvironmentRegistryEntry;
    if (isManagedWallet) {
        // using a managed wallet

        environmentEntry = await FabricEnvironmentRegistry.instance().get(walletRegistryEntry.fromEnvironment);

        const chosenOrg: IBlockchainQuickPickItem<FabricNode> = await UserInputUtil.showOrgQuickPick(`Select the organization which the identity belongs to`, environmentEntry);
        if (!chosenOrg) {
            return;
        }

        mspid = chosenOrg.data.msp_id;

    } else if (!mspid) {
        mspid = await UserInputUtil.showInputBox('Enter MSPID');
        if (!mspid) {
            // User cancelled entering mspid
            return;
        }
    }

    let certificate: string;
    let privateKey: string;
    let certificatePath: string;
    let privateKeyPath: string;

    // User selects if they want to add an identity using either a cert/key or an id/secret
    const addIdentityMethod: string = await UserInputUtil.addIdentityMethod(isManagedWallet);
    if (!addIdentityMethod) {
        return;
    }

    try {

        if (addIdentityMethod === UserInputUtil.ADD_CERT_KEY_OPTION) {
            // User wants to add an identity by providing a certificate and private key
            const certKey: { certificatePath: string, privateKeyPath: string } = await UserInputUtil.getCertKey();
            if (!certKey) {
                return;
            }
            certificatePath = certKey.certificatePath;
            privateKeyPath = certKey.privateKeyPath;

        } else if (addIdentityMethod === UserInputUtil.ADD_JSON_ID_OPTION) {
            // User to provide path to json file
            const openDialogOptions: vscode.OpenDialogOptions = {
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                openLabel: 'Select',
                filters: {
                    Identity: ['json']
                }
            };
            // Get the json identity file path
            const jsonIdentityPath: vscode.Uri = await UserInputUtil.browse('Browse for a JSON identity file', [UserInputUtil.BROWSE_LABEL], openDialogOptions, true) as vscode.Uri;
            if (!jsonIdentityPath) {
                return;
            }
            const certProperty: string = 'cert';
            const privateKeyProperty: string = 'private_key';
            const jsonIdentityContents: string = await fs.readFile(jsonIdentityPath.fsPath, 'utf8');
            const jsonIdentity: any = JSON.parse(jsonIdentityContents);

            if (jsonIdentity[certProperty] && jsonIdentity[privateKeyProperty]) {
                certificate = Buffer.from(jsonIdentity[certProperty], 'base64').toString();
                privateKey = Buffer.from(jsonIdentity[privateKeyProperty], 'base64').toString();
            } else {
                throw new Error(`JSON file missing properties \"${certProperty}\" or \"${privateKeyProperty}\"`);
            }

        } else {
            // User wants to add an identity by providing a enrollment id and secret

            // Ask them what gateway they want to use for enrollment.
            // We can't tell this automatically as a wallet is associated with a gateway (and a wallet can be associated with multiple gateways)
            let gatewayRegistryEntry: FabricGatewayRegistryEntry;

            if (isManagedWallet) {
                // make sure environment is running

                let environment: ManagedAnsibleEnvironment | LocalEnvironment = await EnvironmentFactory.getEnvironment(environmentEntry) as ManagedAnsibleEnvironment | LocalEnvironment;

                let isRunning: boolean = await environment.isRunning();
                if (!isRunning) {
                    // Start local_fabric to enroll identity
                    await vscode.commands.executeCommand(ExtensionCommands.START_FABRIC, environmentEntry);
                    environment = await EnvironmentFactory.getEnvironment(environmentEntry) as ManagedAnsibleEnvironment | LocalEnvironment;
                    isRunning = await environment.isRunning();
                    if (!isRunning) {
                        // Start local_fabric failed so return
                        return;
                    }
                }
            }

            const chosenEntry: IBlockchainQuickPickItem<FabricGatewayRegistryEntry> = await UserInputUtil.showGatewayQuickPickBox('Choose a gateway to enroll the identity with', false, true, true, walletRegistryEntry.fromEnvironment) as IBlockchainQuickPickItem<FabricGatewayRegistryEntry>;
            if (!chosenEntry) {
                return;
            }
            gatewayRegistryEntry = chosenEntry.data;

            const enrollIdSecret: { enrollmentID: string, enrollmentSecret: string } = await UserInputUtil.getEnrollIdSecret();
            if (!enrollIdSecret) {
                return;
            }

            const enrollmentID: string = enrollIdSecret.enrollmentID;
            const enrollmentSecret: string = enrollIdSecret.enrollmentSecret;

            const certificateAuthority: IFabricCertificateAuthority = FabricCertificateAuthorityFactory.createCertificateAuthority();

            // Read connection profile
            const connectionProfilePath: string = await FabricGatewayHelper.getConnectionProfilePath(gatewayRegistryEntry);
            const connectionProfileFile: string = await fs.readFile(connectionProfilePath, 'utf8');
            let connectionProfile: any;

            if (connectionProfilePath.endsWith('.json')) {
                connectionProfile = JSON.parse(connectionProfileFile);
            } else {
                // Assume its a yml/yaml file type
                connectionProfile = yaml.safeLoad(connectionProfileFile);
            }

            // Get a list of CAs
            const caKeys: string[] = Object.keys(connectionProfile.certificateAuthorities);
            let caUrl: string;
            let caName: string;

            if (caKeys.length > 1) {
                const showMoreCAs: string = await UserInputUtil.showQuickPickCA(caKeys);
                if (!showMoreCAs) {
                    return;
                } else {
                    caUrl = connectionProfile.certificateAuthorities[showMoreCAs].url;
                    caName = connectionProfile.certificateAuthorities[showMoreCAs].caName;
                }
            } else {
                caUrl = connectionProfile.certificateAuthorities[caKeys[0]].url;
                caName = connectionProfile.certificateAuthorities[caKeys[0]].caName;
            }

            const enrollment: { certificate: string, privateKey: string } = await certificateAuthority.enroll(caUrl, enrollmentID, enrollmentSecret, caName);
            certificate = enrollment.certificate;
            privateKey = enrollment.privateKey;
        }

        if (certificatePath && privateKeyPath) {
            certificate = await fs.readFile(certificatePath, 'utf8');
            privateKey = await fs.readFile(privateKeyPath, 'utf8');
        }
        // Else certificate and privateKey have already been read in FabricCertificateAuthority.enroll
        // Or certificate and privateKey has been read from json file

        await wallet.importIdentity(certificate, privateKey, identityName, mspid);

    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Unable to add identity to wallet: ${error.message}`, `Unable to add identity to wallet: ${error.toString()}`);
        return;
    }

    await vscode.commands.executeCommand(ExtensionCommands.REFRESH_WALLETS);
    outputAdapter.log(LogType.SUCCESS, 'Successfully added identity', `Successfully added identity to wallet`);

    // Send telemetry event
    if (addIdentityMethod === UserInputUtil.ADD_CERT_KEY_OPTION) {
        Reporter.instance().sendTelemetryEvent('addWalletIdentityCommand', { method: 'Certificate' });
    } else if (addIdentityMethod === UserInputUtil.ADD_JSON_ID_OPTION) {
        Reporter.instance().sendTelemetryEvent('addWalletIdentityCommand', { method: 'json' });
    } else {
        Reporter.instance().sendTelemetryEvent('addWalletIdentityCommand', { method: 'enrollmentID' });
    }

    return identityName;
}
