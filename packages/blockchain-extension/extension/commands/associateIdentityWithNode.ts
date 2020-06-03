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
import { IBlockchainQuickPickItem, UserInputUtil } from './UserInputUtil';
import { FabricEnvironmentRegistry, FabricEnvironmentRegistryEntry, FabricNode, FabricNodeType, FabricWalletRegistryEntry, IFabricCertificateAuthority, IFabricWallet, IFabricWalletGenerator, LogType, FabricEnvironment, FabricWalletGeneratorFactory, FabricWalletRegistry, EnvironmentType } from 'ibm-blockchain-platform-common';
import * as vscode from 'vscode';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricCertificateAuthorityFactory } from '../fabric/FabricCertificateAuthorityFactory';
import { EnvironmentFactory } from '../fabric/environments/EnvironmentFactory';

export async function associateIdentityWithNode(replace: boolean = false, environmentRegistryEntry: FabricEnvironmentRegistryEntry, node: FabricNode): Promise<any> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, 'associate identity with node');

    try {
        let walletName: string;
        let identityName: string;
        if (!environmentRegistryEntry || !node) {
            // If called from command palette
            const environments: Array<FabricEnvironmentRegistryEntry> = await FabricEnvironmentRegistry.instance().getAll(false);
            if (environments.length === 0) {
                if (!replace) {
                    outputAdapter.log(LogType.ERROR, `Add an environment to associate identities with nodes. Local environments cannot be edited.`);
                } else {
                    outputAdapter.log(LogType.ERROR, `No environments found to use for replacing the identity associated with a node. Local environments cannot be edited.`);
                }
                return;
            }

            const chosenEnvironment: IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry> = await UserInputUtil.showFabricEnvironmentQuickPickBox('Choose an environment to use', false, true) as IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>;
            if (!chosenEnvironment) {
                return;
            }

            environmentRegistryEntry = chosenEnvironment.data;

            let chooseNodeMessage: string = 'Choose a node to associate an identity with';

            if (replace) {
                chooseNodeMessage = 'Choose a node to replace the identity';
            }

            const chosenNode: IBlockchainQuickPickItem<FabricNode> = await UserInputUtil.showNodesInEnvironmentQuickPick(chooseNodeMessage, environmentRegistryEntry, [FabricNodeType.CERTIFICATE_AUTHORITY, FabricNodeType.ORDERER, FabricNodeType.PEER], true) as IBlockchainQuickPickItem<FabricNode>;
            if (!chosenNode) {
                return;
            }

            node = chosenNode.data;
        }

        let walletRegistryEntry: FabricWalletRegistryEntry;
        let walletMessage: string;

        if (replace) {
            walletMessage = 'Which wallet is the admin identity in?';
        } else if (node.type === FabricNodeType.PEER) {
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
            const chosenMethod: string = await UserInputUtil.showQuickPick('The JSON for this certificate authority includes an enrollment ID and secret...', [enrollNew, chooseExisting]) as string;
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

        const chosenWallet: IBlockchainQuickPickItem<FabricWalletRegistryEntry> = await UserInputUtil.showWalletsQuickPickBox(walletMessage, false, false, true) as IBlockchainQuickPickItem<FabricWalletRegistryEntry>;
        if (!chosenWallet) {
            return;
        }

        if (!chosenWallet.data) {
            if (environmentRegistryEntry.environmentType === EnvironmentType.OPS_TOOLS_ENVIRONMENT || environmentRegistryEntry.environmentType === EnvironmentType.SAAS_OPS_TOOLS_ENVIRONMENT) {
                walletRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET, false, environmentRegistryEntry.name);
            } else {
                walletRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET, false);
            }
            if (!walletRegistryEntry) {
                return;
            }
        } else {
            walletRegistryEntry = chosenWallet.data;
        }

        walletName = walletRegistryEntry.name;

        const walletGenerator: IFabricWalletGenerator = FabricWalletGeneratorFactory.getFabricWalletGenerator();
        const wallet: IFabricWallet = await walletGenerator.getWallet(walletRegistryEntry);

        if (enroll) {
            node = await enrollIdAndSecret(node, wallet);
            if (!node) {
                return;
            }

            identityName = node.identity;
        } else {
            const identitiies: Array<string> = await wallet.getIdentityNames();
            let identityMessage: string = `Select the admin identity for ${node.msp_id}`;

            if (!node.msp_id) {
                // cas might not have msp id in
                identityMessage = `Select the admin identity`;
            }
            let chosenIdentity: string = await UserInputUtil.showIdentitiesQuickPickBox(identityMessage, false, identitiies, true) as string;

            if (!chosenIdentity) {
                return;
            }

            if (chosenIdentity === UserInputUtil.ADD_IDENTITY) {
                chosenIdentity = await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET_IDENTITY, walletRegistryEntry, node.msp_id);
                if (!chosenIdentity) {
                    return;
                }
            }

            identityName = chosenIdentity;
        }

        node.wallet = walletName;
        node.identity = identityName;
        const environment: FabricEnvironment = EnvironmentFactory.getEnvironment(environmentRegistryEntry);

        await environment.updateNode(node);

        if (!walletRegistryEntry.environmentGroups) {
            walletRegistryEntry.environmentGroups = [environmentRegistryEntry.name];
        } else if (!walletRegistryEntry.environmentGroups.includes(environmentRegistryEntry.name)) {
            walletRegistryEntry.environmentGroups.push(environmentRegistryEntry.name);
        }
        await FabricWalletRegistry.instance().update(walletRegistryEntry);

        await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);
        outputAdapter.log(LogType.SUCCESS, `Successfully associated identity ${node.identity} from wallet ${node.wallet} with node ${node.name}`);

        let otherNodes: FabricNode[] = [];
        otherNodes = await environment.getNodes(true);

        if (otherNodes.length === 0) {
            // shouldn't ask if no more nodes
            return;
        }

        const yesnoPick: string = await UserInputUtil.showQuickPickYesNo('Do you want to associate the same identity with another node?');

        if (!yesnoPick || yesnoPick === UserInputUtil.NO) {
            return;
        } else {
            const nodes: IBlockchainQuickPickItem<FabricNode>[] = await UserInputUtil.showNodesInEnvironmentQuickPick('Choose the nodes you wish to associate with this identity', environmentRegistryEntry, [], false, true, true) as IBlockchainQuickPickItem<FabricNode>[];

            if (!nodes || nodes.length === 0) {
                return;
            }

            for (const _node of nodes) {
                const foundNode: FabricNode = otherNodes.find((Fnode: FabricNode) => Fnode.name === _node.data.name);

                foundNode.wallet = walletName;
                foundNode.identity = identityName;

                await environment.updateNode(foundNode);

                vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);
            }
            outputAdapter.log(LogType.SUCCESS, `Successfully associated identities`);
        }
    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Failed to associate identity with node ${error.message}`, `Failed to associate identity with node ${error.toString()}`);
    }
}

async function enrollIdAndSecret(node: FabricNode, wallet: IFabricWallet): Promise<FabricNode> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    let certs: { certificate: string, privateKey: string };
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'IBM Blockchain Platform Extension',
        cancellable: false
    }, async (progress: vscode.Progress<{ message: string }>) => {
        progress.report({ message: `Enrolling identity` });
        const fabricCertificateAuthority: IFabricCertificateAuthority = FabricCertificateAuthorityFactory.createCertificateAuthority();
        certs = await fabricCertificateAuthority.enroll(node.api_url, node.enroll_id, node.enroll_secret);
    });

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
