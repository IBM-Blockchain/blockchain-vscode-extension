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
import { IFabricConnection } from '../fabric/IFabricConnection';
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

export async function connect(gatewayRegistryEntry: FabricGatewayRegistryEntry, identityName?: string): Promise<void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, `connect`);

    let runtimeData: string;
    let wallet: IFabricWallet;
    const FabricWalletGenerator: IFabricWalletGenerator = FabricWalletGeneratorFactory.createFabricWalletGenerator();

    if (!gatewayRegistryEntry) {
        const chosenEntry: IBlockchainQuickPickItem<FabricGatewayRegistryEntry> = await UserInputUtil.showGatewayQuickPickBox('Choose a gateway to connect with', true);
        if (!chosenEntry) {
            return;
        }

        gatewayRegistryEntry = chosenEntry.data;
    }

    let connection: IFabricConnection;
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

        wallet = await FabricWalletGeneratorFactory.createFabricWalletGenerator().createLocalWallet(runtime.getName());

        gatewayRegistryEntry.walletPath = wallet.getWalletPath();
        gatewayRegistryEntry.connectionProfilePath = await runtime.getConnectionProfilePath();
        connection = FabricConnectionFactory.createFabricRuntimeConnection(runtime);
        runtimeData = 'managed runtime';

        const identityNames: string[] = await wallet.getIdentityNames();
        identityName = identityNames[0];
    } else {
        const connectionData: { connectionProfilePath: string, walletPath: string } = {
            connectionProfilePath: gatewayRegistryEntry.connectionProfilePath,
            walletPath: gatewayRegistryEntry.walletPath
        };

        wallet = FabricWalletGenerator.getNewWallet(gatewayRegistryEntry.name, gatewayRegistryEntry.walletPath);

        const identityNames: string[] = await wallet.getIdentityNames();

        if (identityNames.length === 0) {
            outputAdapter.log(LogType.ERROR, 'No identities found in wallet: ' + gatewayRegistryEntry.walletPath);
            return;

        } else if (identityNames.length === 1) {
            identityName = identityNames[0];

        } else {
            if (!identityName) {
                identityName = await UserInputUtil.showIdentitiesQuickPickBox('Choose an identity to connect with', identityNames);
                if (!identityName) {
                    return;
                }
            }
        }

        connection = FabricConnectionFactory.createFabricClientConnection(connectionData);
    }

    try {
        await connection.connect(wallet, identityName);
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
