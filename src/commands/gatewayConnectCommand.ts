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
import { FabricConnectionManager } from '../fabric/FabricConnectionManager';
import { FabricGatewayRegistryEntry } from '../fabric/FabricGatewayRegistryEntry';
import { Reporter } from '../util/Reporter';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../logging/OutputAdapter';
import { IFabricWallet } from '../fabric/IFabricWallet';
import { IFabricWalletGenerator } from '../fabric/IFabricWalletGenerator';
import { FabricWalletGeneratorFactory } from '../fabric/FabricWalletGeneratorFactory';
import { FabricWalletRegistryEntry } from '../fabric/FabricWalletRegistryEntry';
import { IFabricClientConnection } from '../fabric/IFabricClientConnection';
import { FabricWalletRegistry } from '../fabric/FabricWalletRegistry';
import { FabricWalletUtil } from '../fabric/FabricWalletUtil';
import { FabricRuntimeManager } from '../fabric/FabricRuntimeManager';
import { FabricRuntimeUtil } from '../fabric/FabricRuntimeUtil';
import { ExtensionUtil } from '../util/ExtensionUtil';
import { SettingConfigurations } from '../../SettingConfigurations';

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

    if (gatewayRegistryEntry.managedRuntime) {
        const running: boolean = await FabricRuntimeManager.instance().getRuntime().isRunning();
        if (!running) {
            outputAdapter.log(LogType.ERROR, `${FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME} has not been started, please start it before connecting.`);
            return;
        }

        runtimeData = 'managed runtime';
    }

    let wallet: IFabricWallet;
    let walletName: string;
    let walletData: FabricWalletRegistryEntry;

    // If the user is trying to connect to the local_fabric, we should always use the local_fabric_wallet
    if (!gatewayRegistryEntry.associatedWallet && !gatewayRegistryEntry.managedRuntime) {
        // If there is no wallet associated with the gateway, we should ask for a wallet to connect with
        // First check there is at least one that isn't local_fabric_wallet
        const wallets: Array<FabricWalletRegistryEntry> = FabricWalletRegistry.instance().getAll();
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
        walletData = chosenWallet.data;
    } else {
        walletName = gatewayRegistryEntry.associatedWallet;

        if (walletName === FabricWalletUtil.LOCAL_WALLET) {
            // We don't want to attempt to get it from the wallet registry
            wallet = await FabricWalletGeneratorFactory.createFabricWalletGenerator().getWallet(FabricWalletUtil.LOCAL_WALLET);

            const runtimeWalletRegistryEntry: FabricWalletRegistryEntry = new FabricWalletRegistryEntry();

            runtimeWalletRegistryEntry.name = FabricWalletUtil.LOCAL_WALLET;
            runtimeWalletRegistryEntry.walletPath = wallet.getWalletPath();
            runtimeWalletRegistryEntry.managedWallet = true;

            walletData = runtimeWalletRegistryEntry;

        } else {
            const fabricWalletRegistry: FabricWalletRegistry = FabricWalletRegistry.instance();
            walletData = fabricWalletRegistry.get(walletName);
        }
    }

    if (!wallet) {
        // If we haven't already retrieved the wallet
        // Get the wallet
        const FabricWalletGenerator: IFabricWalletGenerator = FabricWalletGeneratorFactory.createFabricWalletGenerator();
        wallet = await FabricWalletGenerator.getWallet(walletName);
    }

    // Get the identities
    const identityNames: string[] = await wallet.getIdentityNames();
    if (identityNames.length > 1) {
        identityName = await UserInputUtil.showIdentitiesQuickPickBox('Choose an identity to connect with', identityNames);
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

    const connectionData: { connectionProfilePath: string } = {
        connectionProfilePath: gatewayRegistryEntry.connectionProfilePath
    };
    const connection: IFabricClientConnection = FabricConnectionFactory.createFabricClientConnection(connectionData);

    try {
        const timeout: number = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_CLIENT_TIMEOUT) as number;

        await connection.connect(wallet, identityName, timeout);
        connection.wallet = walletData;
        connection.identityName = identityName;
        FabricConnectionManager.instance().connect(connection, gatewayRegistryEntry);

        let gatewayName: string;
        if (gatewayRegistryEntry.name === FabricRuntimeUtil.LOCAL_FABRIC) {
            gatewayName = FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME;
        } else {
            gatewayName = gatewayRegistryEntry.name;
        }

        outputAdapter.log(LogType.SUCCESS, `Connecting to ${gatewayName}`);
        if (!runtimeData) {
            const isIBP: boolean = connection.isIBPConnection();
            runtimeData = (isIBP ? 'IBP instance' : 'user runtime');
        }

        const isIBMer: boolean = ExtensionUtil.checkIfIBMer();
        Reporter.instance().sendTelemetryEvent('connectCommand', { runtimeData: runtimeData, connectIBM: isIBMer + ''});
    } catch (error) {
        outputAdapter.log(LogType.ERROR, error.message, error.toString());
        return;
    }
}
