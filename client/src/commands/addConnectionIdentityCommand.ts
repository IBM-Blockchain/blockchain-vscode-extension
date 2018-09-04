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
import { ConnectionTreeItem } from '../explorer/model/ConnectionTreeItem';

export async function addConnectionIdentity(connectionItem: ConnectionTreeItem): Promise<{} | void> {
    console.log('addConnectionIdentity');

    let connectionName: string;
    if (connectionItem) {
        connectionName = connectionItem.connection.name;
    } else {
        connectionName = await CommandsUtil.showConnectionQuickPickBox('Choose a connection to add an identity to');
    }

    if (!connectionName) {
        return Promise.resolve();
    }

    const certificatePath: string = await CommandsUtil.showInputBox('Enter a file path to the certificate file');

    if (!certificatePath) {
        return Promise.resolve();
    }

    const privateKeyPath: string = await CommandsUtil.showInputBox('Enter a file path to the private key file');

    if (!privateKeyPath) {
        return Promise.resolve();
    }

    const connections: Array<any> = vscode.workspace.getConfiguration().get('fabric.connections');
    const foundConnection: any = connections.find((connection) => {
        return connection.name === connectionName;
    });

    if (!foundConnection) {
        vscode.window.showErrorMessage('Could not add the identity');
        return Promise.resolve();
    }

    foundConnection.identities.push({certificatePath, privateKeyPath});

    return vscode.workspace.getConfiguration().update('fabric.connections', connections, vscode.ConfigurationTarget.Global);
}
