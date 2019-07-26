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
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../logging/OutputAdapter';
import { IBlockchainQuickPickItem, UserInputUtil } from './UserInputUtil';
import { FabricWalletRegistryEntry } from '../fabric/FabricWalletRegistryEntry';
import { FabricRuntimeUtil } from '../fabric/FabricRuntimeUtil';
import { FabricEnvironmentRegistry } from '../fabric/FabricEnvironmentRegistry';
import { FabricEnvironmentRegistryEntry } from '../fabric/FabricEnvironmentRegistryEntry';
import { FabricEnvironment } from '../fabric/FabricEnvironment';
import { FabricNode, FabricNodeType } from '../fabric/FabricNode';
import { IFabricWallet } from '../fabric/IFabricWallet';
import * as vscode from 'vscode';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricEnvironmentTreeItem } from '../explorer/runtimeOps/disconnectedTree/FabricEnvironmentTreeItem';
import { FabricCertificateAuthorityFactory } from '../fabric/FabricCertificateAuthorityFactory';
import { IFabricCertificateAuthority } from '../fabric/IFabricCertificateAuthority';
import { IFabricWalletGenerator } from '../fabric/IFabricWalletGenerator';
import { FabricWalletGeneratorFactory } from '../fabric/FabricWalletGeneratorFactory';

export async function associateIdentityWithNode(environmentRegistryEntry: FabricEnvironmentRegistryEntry, node: FabricNode): Promise<any> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, 'associate identity with node');

    try {
        if (!environmentRegistryEntry || !node) {
            // If called from command palette
            const environemts: Array<FabricEnvironmentRegistryEntry> = FabricEnvironmentRegistry.instance().getAll();
            if (environemts.length === 0) {
                outputAdapter.log(LogType.ERROR, `Add an environment to associate identities with nodes. ${FabricRuntimeUtil.LOCAL_FABRIC} cannot be editted.`);
                return;
            }

            const chosenEnvironment: IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry> = await UserInputUtil.showFabricEnvironmentQuickPickBox('Choose an environment to use');
            if (!chosenEnvironment) {
                return;
            }

            environmentRegistryEntry = chosenEnvironment.data;

            const chosenNode: IBlockchainQuickPickItem<FabricNode> = await UserInputUtil.showFabricNodeQuickPick('Choose a node to associate an identity with', environmentRegistryEntry.name, [FabricNodeType.CERTIFICATE_AUTHORITY, FabricNodeType.ORDERER, FabricNodeType.PEER]);
            if (!chosenNode) {
                return;
            }

            node = chosenNode.data;
        }

        let walletRegistryEntry: FabricWalletRegistryEntry;
        let walletMessage: string;

        if (node.type === FabricNodeType.PEER) {
            walletMessage = `An admin identity for "${node.msp_id}" is required to perform installs. Which wallet is it in?`;
        } else if (node.type === FabricNodeType.ORDERER) {
            walletMessage = `An admin identity for "${node.msp_id}" is required to perform instantiates. Which wallet is it in?`;
        } else if (node.type === FabricNodeType.CERTIFICATE_AUTHORITY && !node.enroll_id && !node.enroll_secret) {
            walletMessage = `An Admin identity for ${node.name} is required to register identities. Which wallet is it in?`;
        }

        let enroll: boolean = false;
        if (node.type === FabricNodeType.CERTIFICATE_AUTHORITY && node.enroll_id && node.enroll_secret) {
            const enrollNew: string = 'Use ID and secret to enroll a new identity';
            const chooseExisting: string = 'Choose an existing identity';
            const chosenMethod: string = await UserInputUtil.showQuickPick('The JSON for this certificate authority includes an enrollment ID and secret...', [enrollNew, chooseExisting]);
            if (!chosenMethod) {
                return;
            }

            if (chosenMethod === enrollNew) {
                walletMessage = 'Which wallet do you want to add the admin identitiy to?';
                enroll = true;
            } else {
                walletMessage = 'Which wallet is the admin identity in?';
            }
        }

        const chosenWallet: IBlockchainQuickPickItem<FabricWalletRegistryEntry> = await UserInputUtil.showWalletsQuickPickBox(walletMessage, false, true);
        if (!chosenWallet) {
            return;
        }

        if (!chosenWallet.data) {
            walletRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET) as FabricWalletRegistryEntry;
            if (!walletRegistryEntry) {
                return;
            }
        } else {
            walletRegistryEntry = chosenWallet.data;
        }

        node.wallet = walletRegistryEntry.name;

        const walletGenerator: IFabricWalletGenerator = FabricWalletGeneratorFactory.createFabricWalletGenerator();
        const wallet: IFabricWallet = walletGenerator.getNewWallet(walletRegistryEntry.walletPath);

        if (enroll) {
            node = await enrollIdAndSecret(node, wallet);
            if (!node) {
                return;
            }
        } else {
            const identitiies: Array<string> = await wallet.getIdentityNames();
            let identityMessage: string = `Select the admin identity for ${node.msp_id}`;

            if (!node.msp_id) {
                // cas might not have msp id in
                identityMessage = `Select the admin identity`;
            }
            let chosenIdentity: string = await UserInputUtil.showIdentitiesQuickPickBox(identityMessage, identitiies, true);

            if (!chosenIdentity) {
                return;
            }

            if (chosenIdentity === UserInputUtil.ADD_IDENTITY) {
                chosenIdentity = await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET_IDENTITY, wallet) as string;
                if (!chosenIdentity) {
                    return;
                }
            }

            node.identity = chosenIdentity;
        }

        const environment: FabricEnvironment = new FabricEnvironment(environmentRegistryEntry.name);

        await environment.updateNode(node);

        // This is weird but need to refresh with the tree item to keep the setup open
        const environmentTreeItem: FabricEnvironmentTreeItem = new FabricEnvironmentTreeItem(undefined, environmentRegistryEntry.name, environmentRegistryEntry, {
            command: ExtensionCommands.CONNECT_TO_ENVIRONMENT,
            title: '',
            arguments: [environmentRegistryEntry]
        });
        vscode.commands.executeCommand(ExtensionCommands.REFRESH_ENVIRONMENTS, environmentTreeItem);
        outputAdapter.log(LogType.SUCCESS, `Succesfully associated node ${node.name} with wallet ${node.wallet} and identity ${node.identity}`);

    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Failed to associate identity with node ${error.message}`, `Failed to associate identity with node ${error.toString()}`);
    }
}

async function enrollIdAndSecret(node: FabricNode, wallet: IFabricWallet): Promise<FabricNode> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    const fabricCertificateAuthority: IFabricCertificateAuthority = FabricCertificateAuthorityFactory.createCertificateAuthority();
    const certs: { certificate: string, privateKey: string } = await fabricCertificateAuthority.enroll(node.api_url, node.enroll_id, node.enroll_secret);

    // Ask for identity name
    const identityName: string = await UserInputUtil.showInputBox('Provide a name for the identity');
    if (!identityName) {
        return;
    }

    // check to see if identity of same name exists
    const identityExists: boolean = await wallet.exists(identityName);
    if (identityExists) {
        outputAdapter.log(LogType.ERROR, `An identity called ${identityName} already exists`);
        return;
    }

    node.identity = identityName;

    if (!node.msp_id) {
        const chosenMspid: string = await UserInputUtil.showInputBox('Enter MSPID');
        if (!chosenMspid) {
            return;
        }

        node.msp_id = chosenMspid;
    }

    await wallet.importIdentity(certs.certificate, certs.privateKey, identityName, node.msp_id);
    await vscode.commands.executeCommand(ExtensionCommands.REFRESH_WALLETS);

    return node;
}
