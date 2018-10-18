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
import {UserInputUtil} from './UserInputUtil';
import { FabricConnectionRegistryEntry } from '../fabric/FabricConnectionRegistryEntry';
import { FabricConnectionRegistry } from '../fabric/FabricConnectionRegistry';
import { FabricConnectionHelper } from '../fabric/FabricConnectionHelper';

export async function addConnection(): Promise<{} | void> {
    console.log('addConnection');

    const connectionName: string = await UserInputUtil.showInputBox('Enter a name for the connection');
    if (!connectionName) {
        return Promise.resolve();
    }

    // Create the connection immediately
    const fabricConnectionEntry: FabricConnectionRegistryEntry = new FabricConnectionRegistryEntry();
    fabricConnectionEntry.connectionProfilePath = FabricConnectionHelper.CONNECTION_PROFILE_PATH_DEFAULT;
    fabricConnectionEntry.name = connectionName;
    fabricConnectionEntry.identities = [{
        certificatePath: FabricConnectionHelper.CERTIFICATE_PATH_DEFAULT,
        privateKeyPath: FabricConnectionHelper.PRIVATE_KEY_PATH_DEFAULT
    }];

    const fabricConnectionRegistry: FabricConnectionRegistry = FabricConnectionRegistry.instance();
    await fabricConnectionRegistry.add(fabricConnectionEntry);

    // Get the connection profile json file path
    const connectionProfilePath: string = await UserInputUtil.browseEdit('Enter a file path to the connection profile json file', connectionName);
    if (!connectionProfilePath) {
        return Promise.resolve();
    }

    fabricConnectionEntry.connectionProfilePath = connectionProfilePath;
    await fabricConnectionRegistry.update(fabricConnectionEntry);

    // Get the certificate file path
    const certificatePath: string = await UserInputUtil.browseEdit('Enter a file path to the certificate file', connectionName);
    if (!certificatePath) {
        return Promise.resolve();
    }

    fabricConnectionEntry.identities[0].certificatePath = certificatePath;
    await fabricConnectionRegistry.update(fabricConnectionEntry);

    // Get the private key file path
    const privateKeyPath: string = await UserInputUtil.browseEdit('Enter a file path to the private key file', connectionName);
    if (!privateKeyPath) {
        return Promise.resolve();
    }

    fabricConnectionEntry.identities[0].privateKeyPath = privateKeyPath;
    await fabricConnectionRegistry.update(fabricConnectionEntry);

}
