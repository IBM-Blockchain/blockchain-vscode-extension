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
import { CommandsUtil } from './commandsUtil';
import { IFabricConnection } from '../fabric/IFabricConnection';
import { ParsedCertificate } from '../fabric/ParsedCertificate';
import { FabricConnectionFactory } from '../fabric/FabricConnectionFactory';
import { FabricConnectionManager } from '../fabric/FabricConnectionManager';
import { FabricConnectionRegistryEntry } from '../fabric/FabricConnectionRegistryEntry';
import { FabricConnectionRegistry } from '../fabric/FabricConnectionRegistry';
import { FabricRuntimeManager } from '../fabric/FabricRuntimeManager';
import { FabricRuntime } from '../fabric/FabricRuntime';

export async function connect(connectionName: string, identityName?: string): Promise<void> {
    console.log('connect', connectionName, identityName);

    if (!connectionName) {
        connectionName = await CommandsUtil.showConnectionQuickPickBox('Choose a connection to connect with');
        if (!connectionName) {
            return;
        }
    }

    const connectionRegistry: FabricConnectionRegistry = FabricConnectionRegistry.instance();
    if (!connectionRegistry.exists(connectionName)) {
        vscode.window.showErrorMessage('Could not connect as no connection found');
        return;
    }
    const connectionRegistryEntry: FabricConnectionRegistryEntry = connectionRegistry.get(connectionName);

    let connection: IFabricConnection;
    if (connectionRegistryEntry.managedRuntime) {

        const runtimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
        const runtime: FabricRuntime = runtimeManager.get(connectionName);
        connection = FabricConnectionFactory.createFabricRuntimeConnection(runtime);

    } else {

        const connectionData = {
            connectionProfilePath: connectionRegistryEntry.connectionProfilePath,
            privateKeyPath: null,
            certificatePath: null
        };

        let foundIdentity: { certificatePath: string, privateKeyPath: string };
        if (connectionRegistryEntry.identities.length > 1) {

            if (!identityName) {
                identityName = await CommandsUtil.showIdentityConnectionQuickPickBox('Choose an identity to connect with', connectionRegistryEntry);
                if (!identityName) {
                    return;
                }
            }

            foundIdentity = connectionRegistryEntry.identities.find(((identity: { certificatePath: string, privateKeyPath: string }) => {
                const parsedCertificate: ParsedCertificate = new ParsedCertificate(identity.certificatePath);
                return parsedCertificate.getCommonName() === identityName;
            }));

            if (!foundIdentity) {
                vscode.window.showErrorMessage('Could not connect as no identity found');
                return;
            }

        } else {
            foundIdentity = connectionRegistryEntry.identities[0];
        }

        connectionData.certificatePath = foundIdentity.certificatePath;
        connectionData.privateKeyPath = foundIdentity.privateKeyPath;

        connection = FabricConnectionFactory.createFabricClientConnection(connectionData);

    }

    try {
        await connection.connect();
        FabricConnectionManager.instance().connect(connection);
    } catch (error) {
        vscode.window.showErrorMessage(error.message);
        throw error;
    }
}
