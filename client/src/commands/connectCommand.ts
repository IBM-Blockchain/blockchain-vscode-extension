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
import { ParsedCertificate } from '../fabric/ParsedCertificate';
import { FabricConnectionFactory } from '../fabric/FabricConnectionFactory';
import { FabricConnectionManager } from '../fabric/FabricConnectionManager';
import { FabricConnectionRegistryEntry } from '../fabric/FabricConnectionRegistryEntry';
import { FabricRuntimeManager } from '../fabric/FabricRuntimeManager';
import { FabricRuntime } from '../fabric/FabricRuntime';
import { Reporter } from '../util/Reporter';

export async function connect(connectionRegistryEntry: FabricConnectionRegistryEntry, identity?: { certificatePath: string, privateKeyPath: string }): Promise<void> {
    console.log('connect', connectionRegistryEntry, identity);

    let runtimeData: string;

    if (!connectionRegistryEntry) {
        const chosenEntry: IBlockchainQuickPickItem<FabricConnectionRegistryEntry> = await UserInputUtil.showConnectionQuickPickBox('Choose a connection to connect with', true);
        if (!chosenEntry) {
            return;
        }

        connectionRegistryEntry = chosenEntry.data;
    }

    let connection: IFabricConnection;
    if (connectionRegistryEntry.managedRuntime) {

        const runtimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
        const runtime: FabricRuntime = runtimeManager.get(connectionRegistryEntry.name);
        const running: boolean = await runtime.isRunning();
        if (!running) {
            await vscode.commands.executeCommand('blockchainExplorer.startFabricRuntime', runtime);
        }
        connection = FabricConnectionFactory.createFabricRuntimeConnection(runtime);

        runtimeData = 'managed runtime';
    } else {
        const connectionData: {connectionProfilePath: string, privateKeyPath: string, certificatePath: string} = {
            connectionProfilePath: connectionRegistryEntry.connectionProfilePath,
            privateKeyPath: null,
            certificatePath: null
        };

        if (connectionRegistryEntry.identities.length > 1) {

            if (!identity) {
                const chosenIdentity: IBlockchainQuickPickItem<any> = await UserInputUtil.showIdentityConnectionQuickPickBox('Choose an identity to connect with', connectionRegistryEntry);
                if (!chosenIdentity) {
                    return;
                }

                identity = connectionRegistryEntry.identities.find(((_identity: { certificatePath: string, privateKeyPath: string }): boolean => {
                    const parsedCertificate: ParsedCertificate = new ParsedCertificate(_identity.certificatePath);
                    return parsedCertificate.getCommonName() === chosenIdentity.label;
                }));

                if (!identity) {
                    vscode.window.showErrorMessage('Could not connect as no identity found');
                    return;
                }
            }
        } else {
            identity = connectionRegistryEntry.identities[0];
        }

        connectionData.certificatePath = identity.certificatePath;
        connectionData.privateKeyPath = identity.privateKeyPath;

        connection = FabricConnectionFactory.createFabricClientConnection(connectionData);
    }

    try {
        await connection.connect();
    } catch (error) {
        if (error.message.includes(`Client.createUser parameter 'opts mspid' is required`)) {
            // Error thrown when the client section is missing from the connection profile, so ask the user for it
            const mspid: string = await UserInputUtil.showInputBox('Client section of the connection profile does not specify mspid. Please enter mspid:');
            if (!mspid) {
                // User cancelled entering mspid
                return;
            }
            await connection.connect(mspid);
        } else {
            vscode.window.showErrorMessage(error.message);
            throw error;
        }
    } finally {
        FabricConnectionManager.instance().connect(connection, connectionRegistryEntry);

        if (!runtimeData) {
            const isIBP: boolean = connection.isIBPConnection();
            runtimeData = (isIBP ? 'IBP instance' : 'user runtime');
        }
        Reporter.instance().sendTelemetryEvent('connectCommand', {runtimeData: runtimeData});
    }
}
