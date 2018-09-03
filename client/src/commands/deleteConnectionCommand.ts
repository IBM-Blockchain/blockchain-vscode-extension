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
import {CommandsUtil} from './commandsUtil';
import { ConnectionTreeItem } from '../explorer/model/ConnectionTreeItem';

export async function deleteConnection(connectionItem: ConnectionTreeItem): Promise<{} | void> {
    console.log('deleteConnection');

    let connectionToDelete: string;

    if (connectionItem) {
        connectionToDelete = connectionItem.connection.name;
    } else {
        connectionToDelete = await CommandsUtil.showConnectionQuickPickBox('Choose the connection that you want to delete');
    }

    const connections: Array<any> = vscode.workspace.getConfiguration().get('fabric.connections');
    const index = connections.findIndex((connection) => {
        return connection.name === connectionToDelete;
    });

    if (index > -1) {
        connections.splice(index, 1);
    }

    return vscode.workspace.getConfiguration().update('fabric.connections', connections, vscode.ConfigurationTarget.Global);
}
