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
import { FabricConnectionFactory } from '../fabric/FabricConnectionFactory';
import { FabricGatewayConnectionManager } from '../fabric/FabricGatewayConnectionManager';
import { Reporter } from '../util/Reporter';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { FabricWalletRegistry, FabricWalletRegistryEntry, IFabricWalletGenerator, FabricGatewayRegistryEntry, FabricWalletGeneratorFactory, IFabricGatewayConnection, IFabricWallet, LogType, FabricEnvironmentRegistry, FabricEnvironmentRegistryEntry, FabricIdentity, EnvironmentType } from 'ibm-blockchain-platform-common';
import { ExtensionUtil } from '../util/ExtensionUtil';
import { SettingConfigurations } from '../configurations';
import { FabricGatewayHelper } from '../fabric/FabricGatewayHelper';
import { EnvironmentFactory } from '../fabric/environments/EnvironmentFactory';
import { LocalMicroEnvironment } from '../fabric/environments/LocalMicroEnvironment';
import { FabricWalletHelper } from '../fabric/FabricWalletHelper';

export async function gatewayConnect(gatewayRegistryEntry: FabricGatewayRegistryEntry, identityName?: string): Promise<void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, `connect`);

    let runtimeData: string;

    if (!gatewayRegistryEntry) {
        const chosenEntry: IBlockchainQuickPickItem<FabricGatewayRegistryEntry> = await UserInputUtil.showGatewayQuickPickBox('Choose a gateway to connect with', false, true) as IBlockchainQuickPickItem<FabricGatewayRegistryEntry>;
        if (!chosenEntry) {
            return;
        }

        gatewayRegistryEntry = chosenEntry.data;
    }

    const gatewayName: string = gatewayRegistryEntry.name;

    const environmentName: string = gatewayRegistryEntry.fromEnvironment;
    let environmentEntry: FabricEnvironmentRegistryEntry;
    if (environmentName) {
        environmentEntry = await FabricEnvironmentRegistry.instance().get(environmentName);
    }

    if (environmentEntry && environmentEntry.managedRuntime) {
        const environment: LocalMicroEnvironment = EnvironmentFactory.getEnvironment(environmentEntry) as LocalMicroEnvironment;
        const running: boolean = await environment.isRunning();
        if (!running) {
            outputAdapter.log(LogType.ERROR, `${environmentName} has not been started, please start it before connecting.`);
            return;
        }

        runtimeData = 'managed runtime';
    }

    let walletName: string;
    let walletRegistryEntry: FabricWalletRegistryEntry;

    if (!gatewayRegistryEntry.associatedWallet) {
        // If there is no wallet associated with the gateway, we should ask for a wallet to connect with
        // First check there is at least one that isn't local_fabric_wallet
        const wallets: Array<FabricWalletRegistryEntry> = await FabricWalletRegistry.instance().getAll(false);
        if (wallets.length === 0) {
            outputAdapter.log(LogType.ERROR, `You must first add a wallet with identities to connect to this gateway`);
            return;
        }

        // Choose a wallet to connect with
        const chosenWallet: IBlockchainQuickPickItem<FabricWalletRegistryEntry> = await UserInputUtil.showWalletsQuickPickBox('Choose a wallet to connect with', false, false) as IBlockchainQuickPickItem<FabricWalletRegistryEntry>;
        if (!chosenWallet) {
            return;
        }
        walletName = chosenWallet.data.name;
        walletRegistryEntry = chosenWallet.data;
    } else {
        walletName = gatewayRegistryEntry.associatedWallet;

        const fabricWalletRegistry: FabricWalletRegistry = FabricWalletRegistry.instance();
        walletRegistryEntry = await fabricWalletRegistry.get(walletName, gatewayRegistryEntry.fromEnvironment);
    }

    const FabricWalletGenerator: IFabricWalletGenerator = FabricWalletGeneratorFactory.getFabricWalletGenerator();
    const wallet: IFabricWallet = await FabricWalletGenerator.getWallet(walletRegistryEntry);

    let identityNames: string[];
    if (environmentEntry && environmentEntry.environmentType === EnvironmentType.LOCAL_MICROFAB_ENVIRONMENT) {
        const identities: FabricIdentity[] = await FabricWalletHelper.getVisibleIdentities(environmentEntry, walletRegistryEntry);
        identityNames = identities.map((identity: FabricIdentity) => identity.name);
    } else {
        // Get the identities
        identityNames = await wallet.getIdentityNames();

    }

    if (identityNames.length > 1) {
        identityName = await UserInputUtil.showIdentitiesQuickPickBox('Choose an identity to connect with', false, identityNames) as string;
        if (!identityName) {
            // User cancelled selecting an identity
            return;
        }
    } else if (identityNames.length === 0) {
        outputAdapter.log(LogType.ERROR, 'No identities found in wallet: ' + walletName);
        return;
    } else {
        identityName = identityNames[0];
    }

    const connectionProfilePath: string = await FabricGatewayHelper.getConnectionProfilePath(gatewayRegistryEntry);

    const connection: IFabricGatewayConnection = FabricConnectionFactory.createFabricGatewayConnection(connectionProfilePath);

    try {
        const timeout: number = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_CLIENT_TIMEOUT);

        await connection.connect(wallet, identityName, timeout);
        connection.identityName = identityName;
        FabricGatewayConnectionManager.instance().connect(connection, gatewayRegistryEntry, walletRegistryEntry);

        // Inform the user if any of the channels is does not have v2_0 capability enabled.
        const createChannelsResult: {channelMap: Map<string, Array<string>>, v1channels: Array<string>} = await connection.createChannelMap();
        if (createChannelsResult.v1channels.length !== 0) {
            VSCodeBlockchainOutputAdapter.instance().log(LogType.WARNING, `Detected channels without V2_0 capabilities enabled: ${createChannelsResult.v1channels.join(', ')}.`);
        }

        outputAdapter.log(LogType.SUCCESS, `Connecting to ${gatewayName}`);
        if (!runtimeData) {
            const isIBP: boolean = connection.isIBPConnection();
            runtimeData = (isIBP ? 'IBP instance' : 'user runtime');
        }

        const isIBMer: boolean = ExtensionUtil.checkIfIBMer();
        Reporter.instance().sendTelemetryEvent('connectCommand', { runtimeData: runtimeData, connectIBM: isIBMer + '' });
    } catch (error) {
        outputAdapter.log(LogType.ERROR, error.message, error.toString());
        return;
    }
}
