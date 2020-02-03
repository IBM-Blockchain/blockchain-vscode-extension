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
import { UserInputUtil, IBlockchainQuickPickItem } from './UserInputUtil';
import { Reporter } from '../util/Reporter';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { FabricGatewayHelper } from '../fabric/FabricGatewayHelper';
import { FabricEnvironmentRegistryEntry, FabricNode, FabricNodeType, FabricRuntimeUtil, LogType, FabricGatewayRegistry, FabricGatewayRegistryEntry, FabricEnvironmentRegistry } from 'ibm-blockchain-platform-common';

export async function addGateway(): Promise<{} | void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    try {
        outputAdapter.log(LogType.INFO, undefined, 'addGateway');

        const fabricGatewayRegistry: FabricGatewayRegistry = FabricGatewayRegistry.instance();

        const items: string[] = [UserInputUtil.ADD_GATEWAY_FROM_CCP, UserInputUtil.ADD_GATEWAY_FROM_ENVIRONMENT];

        const gatewayMethod: string = await UserInputUtil.showQuickPick('Choose a method to add a gateway', items) as string;

        if (!gatewayMethod) {
            return;
        }

        let chosenEnvironment: IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>;
        let gatewayName: string;

        if (gatewayMethod === UserInputUtil.ADD_GATEWAY_FROM_ENVIRONMENT) {

            const environments: FabricEnvironmentRegistryEntry[] = await FabricEnvironmentRegistry.instance().getAll(false, false, true);
            if (environments.length === 0) {
                throw new Error(`No environments to choose from. Gateways cannot be created from managed Ansible or ${FabricRuntimeUtil.LOCAL_FABRIC} environments.`);
            }

            chosenEnvironment = await UserInputUtil.showFabricEnvironmentQuickPickBox('Choose an environment to create a gateway from', false, true, false, false, true) as IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>;
            if (!chosenEnvironment) {
                return;
            }
            gatewayName = await UserInputUtil.showInputBox('Enter a name for the gateway', chosenEnvironment.label + '_gw');
            if (!gatewayName) {
                return;
            }
        } else {
            gatewayName = await UserInputUtil.showInputBox('Enter a name for the gateway');
            if (!gatewayName) {
                return;
            }
        }

        const exists: boolean = await fabricGatewayRegistry.exists(gatewayName);
        if (exists || gatewayName === FabricRuntimeUtil.LOCAL_FABRIC) {
            // Gateway already exists
            throw new Error('A gateway with this name already exists.');
        }

        let gatewayRegistryEntry: FabricGatewayRegistryEntry;
        if (gatewayMethod === UserInputUtil.ADD_GATEWAY_FROM_CCP) {
            gatewayRegistryEntry = await createGatewayFromCCP(gatewayName);
        } else {
            gatewayRegistryEntry = await createGatewayFromEnvironment(gatewayName, chosenEnvironment.data);
        }

        if (!gatewayRegistryEntry) {
            // no entry so probably cancelled somewhere
            return;
        }

        outputAdapter.log(LogType.SUCCESS, 'Successfully added a new gateway');
        Reporter.instance().sendTelemetryEvent('addGatewayCommand');
    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Failed to add a new gateway: ${error.message}`, `Failed to add a new gateway: ${error.toString()}`);
    }
}

async function createGatewayFromEnvironment(gatewayName: string, environmentRegistryEntry: FabricEnvironmentRegistryEntry): Promise<FabricGatewayRegistryEntry> {

    const chosenOrg: IBlockchainQuickPickItem<FabricNode> = await UserInputUtil.showOrgQuickPick('Choose an organisation to create the gateway for', environmentRegistryEntry);

    if (!chosenOrg) {
        return;
    }

    let caNode: FabricNode;

    try {
        const chosenCA: IBlockchainQuickPickItem<FabricNode> = await UserInputUtil.showFabricNodeQuickPick('Choose a certificate authority for the gateway connection', environmentRegistryEntry, [FabricNodeType.CERTIFICATE_AUTHORITY]) as IBlockchainQuickPickItem<FabricNode>;

        if (!chosenCA) {
            return;
        }

        caNode = chosenCA.data;
    } catch (error) {
        VSCodeBlockchainOutputAdapter.instance().log(LogType.INFO, 'Could not find a certifcate authority to add to the connection profile');
    }

    const peerNode: FabricNode = chosenOrg.data;

    const fabricGatewayEntry: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
    fabricGatewayEntry.name = gatewayName;
    fabricGatewayEntry.associatedWallet = peerNode.wallet;
    fabricGatewayEntry.fromEnvironment = environmentRegistryEntry.name;

    const fabricGatewayRegistry: FabricGatewayRegistry = FabricGatewayRegistry.instance();
    await fabricGatewayRegistry.add(fabricGatewayEntry);

    await FabricGatewayHelper.generateConnectionProfile(gatewayName, peerNode, caNode);

    return fabricGatewayEntry;
}

async function createGatewayFromCCP(gatewayName: string): Promise<FabricGatewayRegistryEntry> {
    const quickPickItems: string[] = [UserInputUtil.BROWSE_LABEL];
    const openDialogOptions: vscode.OpenDialogOptions = {
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        openLabel: 'Select',
        filters: {
            'Connection Profiles': ['json', 'yaml', 'yml']
        }
    };

    // Get the connection profile json file path
    const connectionProfilePath: string = await UserInputUtil.browse('Enter a file path to a connection profile file', quickPickItems, openDialogOptions) as string;
    if (!connectionProfilePath) {
        return;
    }

    const fabricGatewayEntry: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
    fabricGatewayEntry.name = gatewayName;
    fabricGatewayEntry.associatedWallet = '';

    const fabricGatewayRegistry: FabricGatewayRegistry = FabricGatewayRegistry.instance();
    await fabricGatewayRegistry.add(fabricGatewayEntry);
    // Copy the user given connection profile to the gateway directory (in the blockchain extension directory)
    await FabricGatewayHelper.copyConnectionProfile(gatewayName, connectionProfilePath);

    return fabricGatewayEntry;
}
