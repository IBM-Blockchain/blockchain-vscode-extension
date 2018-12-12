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
import { FabricConnectionRegistryEntry } from '../fabric/FabricConnectionRegistryEntry';
import { FabricConnectionRegistry } from '../fabric/FabricConnectionRegistry';
import { ConnectionTreeItem } from '../explorer/model/ConnectionTreeItem';
import { FabricConnectionHelper } from '../fabric/FabricConnectionHelper';
import { ConnectionPropertyTreeItem } from '../explorer/model/ConnectionPropertyTreeItem';
import { ParsedCertificate } from '../fabric/ParsedCertificate';

export async function editConnectionCommand(treeItem: ConnectionPropertyTreeItem | ConnectionTreeItem): Promise < {} | void > {
    console.log('editConnection', treeItem);

    let propertyToEdit: string;

    if (!treeItem) {
        // If called from command palette

        const chosenConnection: IBlockchainQuickPickItem<FabricConnectionRegistryEntry> = await UserInputUtil.showConnectionQuickPickBox('Choose the connection that you want to edit', false);
        if (!chosenConnection) {
            return;
        }

        // Check if the connection is completed
        const completedConnection: boolean = FabricConnectionHelper.isCompleted(chosenConnection.data);

        if (completedConnection) {
            // Open up the user settings
            return await UserInputUtil.openUserSettings(chosenConnection.label);
        } else {
            // Browse or Edit for uncompleted fields
            propertyToEdit = await getProperty(chosenConnection.data);

            await updateConnection(propertyToEdit, chosenConnection.label);
        }

    } else {
        // If called using tree item

        // Get the name of the property the user clicked on
        if (treeItem.label.includes('+')) {
            propertyToEdit = treeItem.label.split('+ ')[1];
        }
        if (treeItem.label.includes('✓')) {
            // Don't allow user to change already completed connection properties
            return;
        }

        if (!propertyToEdit) {
            // If trying to edit an uncompleted connection by right-clicking and selecting 'Edit Connection'
            await UserInputUtil.openUserSettings(treeItem.connection.name);
            return;
        } else {
            // If trying to edit a property of an uncompleted connection
            await updateConnection(propertyToEdit, treeItem.connection.name);
        }
    }
}

async function updateConnection(propertyToEdit: string, connectionName: string): Promise<void> {
    try {
        // Get the placeholder text for the chosen property
        const placeHolder: string = getPlaceHolder(propertyToEdit);
        if (!placeHolder) {
            return;
        }
        let result: string;
        if (propertyToEdit === 'Connection Profile') {
            result = await UserInputUtil.browseEdit(placeHolder, connectionName, {
                'Connection Profiles' : ['json', 'yaml', 'yml']
            });
        } else {
            result = await UserInputUtil.browseEdit(placeHolder, connectionName);
        }

        if (!result) {
            return;
        } else {

            // Get the connection from registry
            const fabricConnectionRegistry: FabricConnectionRegistry = FabricConnectionRegistry.instance();
            const connection: FabricConnectionRegistryEntry = fabricConnectionRegistry.get(connectionName);

            // Update the connection with data given for the property
            if (propertyToEdit === 'Connection Profile') {
                connection.connectionProfilePath = result;
            } else if (propertyToEdit === 'Certificate') {
                console.log('result', result);
                ParsedCertificate.validPEM(result, 'certificate');

                connection.identities[0].certificatePath = result;
            } else {
                ParsedCertificate.validPEM(result, 'private key');

                connection.identities[0].privateKeyPath = result;
            }

            // Update the registry with new connection data
            await fabricConnectionRegistry.update(connection);

            await vscode.window.showInformationMessage('Successfully updated connection');
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to edit connection: ${error.message}`);
    }
}

function getPlaceHolder(propertyToEdit: string): string {
    let placeHolder: string;

    if (propertyToEdit === 'Connection Profile') {
        placeHolder = 'Enter a file path to the connection profile file';
    } else if (propertyToEdit === 'Certificate') {
        placeHolder = 'Enter a file path to the certificate file';
    } else if (propertyToEdit === 'Private Key') {
        placeHolder = 'Enter a file path to the private key file';
    } else {
        return;
    }

    return placeHolder;
}

function getOptions(connection: any): string[] {
    const options: string[] = [];

    if (!FabricConnectionHelper.connectionProfilePathComplete(connection)) {
        options.push('Connection Profile');
    }
    if (!FabricConnectionHelper.certificatePathComplete(connection)) {
        options.push('Certificate');
    }
    if (!FabricConnectionHelper.privateKeyPathComplete(connection)) {
        options.push('Private Key');
    }

    return options;
}

async function getProperty(connection: any): Promise<string> {
    // Get the uncomplete properties
    const options: string[] = getOptions(connection);

    const placeHolder: string = 'Select a connection property to edit:';
    const propertyToEdit: string = await vscode.window.showQuickPick(options, { placeHolder });
    if (!propertyToEdit) {
        return;
    }

    return propertyToEdit;
}
