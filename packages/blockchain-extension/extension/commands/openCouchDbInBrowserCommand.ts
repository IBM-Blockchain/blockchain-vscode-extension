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
import Axios from 'axios';
import * as vscode from 'vscode';
import { UserInputUtil, IBlockchainQuickPickItem } from './UserInputUtil';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { FabricEnvironmentTreeItem } from '../explorer/runtimeOps/disconnectedTree/FabricEnvironmentTreeItem';
import { FabricEnvironmentRegistryEntry, LogType, IFabricEnvironmentConnection, EnvironmentType, EnvironmentFlags } from 'ibm-blockchain-platform-common';
import { FabricEnvironmentManager } from '../fabric/environments/FabricEnvironmentManager';

export async function openCouchDbInBrowser(environment?: FabricEnvironmentTreeItem ): Promise<void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, 'open CouchDB in browser');
    let microfabEnv: FabricEnvironmentRegistryEntry;
    try {
        if (!environment) {
            // possibly called from connected environment
            const connection: IFabricEnvironmentConnection = FabricEnvironmentManager.instance().getConnection();
            if (connection) {
                microfabEnv = FabricEnvironmentManager.instance().getEnvironmentRegistryEntry();
            }

            if (!microfabEnv || !microfabEnv.environmentType || (microfabEnv.environmentType !== EnvironmentType.MICROFAB_ENVIRONMENT && microfabEnv.environmentType !== EnvironmentType.LOCAL_MICROFAB_ENVIRONMENT)) {
                // called from command palette
                const chosenEnvironment: IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry> = await UserInputUtil.showFabricEnvironmentQuickPickBox('Choose a microfab environment to open the CouchDB for', false, true, [EnvironmentFlags.MICROFAB]) as IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>;
                if (!chosenEnvironment) {
                    return;
                }
                microfabEnv = chosenEnvironment.data;
            }
        } else {
            microfabEnv = environment.environmentRegistryEntry;
        }

        if (!microfabEnv.url) {
            throw new Error(`Microfab environment ${microfabEnv.name} doesn't have a URL associated with it`);
        }

        const couchDbUrl: string = `${microfabEnv.url.replace(/console/, 'couchdb').replace(/\/$/,'')}/_utils/`;
        try {
            await Axios.get(couchDbUrl);
        } catch (error) {
            if (error.response && error.response.status === 404) {
                throw new Error(`This functionality requires microfab v0.0.8 or above: ${error.message}`);
            }
            throw error;
        }

        outputAdapter.log(LogType.INFO, 'Default CouchDB login: Use username \'admin\' and password \'adminpw\'');
        await vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(couchDbUrl));

        outputAdapter.log(LogType.SUCCESS, undefined, 'Successfully opened CouchDB in browser');

    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Error opening CouchDB in browser: ${error.message}`, `Error opening CouchDB in browser: ${error.toString()}`);
    }

}
