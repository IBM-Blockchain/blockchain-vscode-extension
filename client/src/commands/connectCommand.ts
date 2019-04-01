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

    // Choose a wallet to connect with
    const chosenWallet: IBlockchainQuickPickItem<FabricWalletRegistryEntry> = await UserInputUtil.showWalletsQuickPickBox('Choose a wallet to connect with', true);
    if (!chosenWallet) {
        return;
    }

    // Get the wallet
    const FabricWalletGenerator: IFabricWalletGenerator = FabricWalletGeneratorFactory.createFabricWalletGenerator();
    let wallet: IFabricWallet;
    wallet = FabricWalletGenerator.getNewWallet(chosenWallet.data.walletPath);

    // Get the identities
    const identityNames: string[] = await wallet.getIdentityNames();
    if (identityNames.length > 1) {
        identityName = await UserInputUtil.showIdentitiesQuickPickBox('Choose an identity to connect with', identityNames);
        if (!identityName) {
            // User cancelled selecting an identity
            return;
        }
    } else if (identityNames.length === 0) {
        outputAdapter.log(LogType.ERROR, 'No identities found in wallet: ' + chosenWallet.data.name);
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
        connection.wallet = chosenWallet.data;
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
