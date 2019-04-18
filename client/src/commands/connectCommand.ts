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
import { FabricRuntimeManager } from '../fabric/FabricRuntimeManager';
import { FabricRuntime } from '../fabric/FabricRuntime';
import { Reporter } from '../util/Reporter';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../logging/OutputAdapter';
import { IFabricWallet } from '../fabric/IFabricWallet';
import { IFabricWalletGenerator } from '../fabric/IFabricWalletGenerator';
import { FabricWalletGeneratorFactory } from '../fabric/FabricWalletGeneratorFactory';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricWalletRegistryEntry } from '../fabric/FabricWalletRegistryEntry';
import { IFabricClientConnection } from '../fabric/IFabricClientConnection';
import { FabricWalletRegistry } from '../fabric/FabricWalletRegistry';
import { FabricWalletUtil } from '../fabric/FabricWalletUtil';

export async function connect(gatewayRegistryEntry: FabricGatewayRegistryEntry, identityName?: string): Promise<void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, `connect`);

    let runtimeData: string;

    if (!gatewayRegistryEntry) {
        const chosenEntry: IBlockchainQuickPickItem<FabricGatewayRegistryEntry> = await UserInputUtil.showGatewayQuickPickBox('Choose a gateway to connect with', true);
        if (!chosenEntry) {
            return;
        }

        gatewayRegistryEntry = chosenEntry.data;
    }

    let wallet: IFabricWallet;
    let walletPath: string;
    let walletName: string;
    let walletData: any;

    // If the user is trying to connect to the local_fabric, we should always use the local_wallet
    if (!gatewayRegistryEntry.associatedWallet && !gatewayRegistryEntry.managedRuntime) {
        // If there is no wallet associated with the gateway, we should ask for a wallet to connect with

        // Choose a wallet to connect with
        const chosenWallet: IBlockchainQuickPickItem<FabricWalletRegistryEntry> = await UserInputUtil.showWalletsQuickPickBox('Choose a wallet to connect with', true);
        if (!chosenWallet) {
            return;
        }
        walletName = chosenWallet.data.name;
        walletPath = chosenWallet.data.walletPath;
        walletData = chosenWallet.data;
    } else {
        walletName = gatewayRegistryEntry.associatedWallet;

        if (walletName === FabricWalletUtil.LOCAL_WALLET) {
            // We don't want to attempt to get it from the wallet registry
            wallet = await FabricWalletGeneratorFactory.createFabricWalletGenerator().createLocalWallet(FabricWalletUtil.LOCAL_WALLET);

            const runtimeWalletRegistryEntry: FabricWalletRegistryEntry = new FabricWalletRegistryEntry();

            runtimeWalletRegistryEntry.name = FabricWalletUtil.LOCAL_WALLET;
            runtimeWalletRegistryEntry.walletPath = wallet.getWalletPath();

            walletData = runtimeWalletRegistryEntry;

        } else {
            const fabricWalletRegistry: FabricWalletRegistry = FabricWalletRegistry.instance();
            walletData = fabricWalletRegistry.get(walletName);
        }

        walletPath = walletData.walletPath;

    }

    if (!wallet) {
        // If we haven't already retrieved the wallet
        // Get the wallet
        const FabricWalletGenerator: IFabricWalletGenerator = FabricWalletGeneratorFactory.createFabricWalletGenerator();
        wallet = FabricWalletGenerator.getNewWallet(walletPath);
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

    let connection: IFabricClientConnection;
    if (gatewayRegistryEntry.managedRuntime) {

        const runtimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
        const runtime: FabricRuntime = runtimeManager.getRuntime();
        const running: boolean = await runtime.isRunning();
        if (!running) {
            await vscode.commands.executeCommand(ExtensionCommands.START_FABRIC);
            if (!(await runtimeManager.getRuntime().isRunning())) {
                // Start local_fabric failed so return
                return;
            }
        }

        runtimeData = 'managed runtime';
    }

    const connectionData: { connectionProfilePath: string } = {
        connectionProfilePath: gatewayRegistryEntry.connectionProfilePath
    };
    connection = FabricConnectionFactory.createFabricClientConnection(connectionData);

    try {
        await connection.connect(wallet, identityName);
        connection.wallet = walletData;
        connection.identityName = identityName;
        FabricConnectionManager.instance().connect(connection, gatewayRegistryEntry);

        outputAdapter.log(LogType.SUCCESS, `Connecting to ${gatewayRegistryEntry.name}`, `Connecting to ${gatewayRegistryEntry.name}`);
        if (!runtimeData) {
            const isIBP: boolean = connection.isIBPConnection();
            runtimeData = (isIBP ? 'IBP instance' : 'user runtime');
        }
        Reporter.instance().sendTelemetryEvent('connectCommand', { runtimeData: runtimeData });
    } catch (error) {
        outputAdapter.log(LogType.ERROR, error.message, error.toString());
        return;
    }
}
