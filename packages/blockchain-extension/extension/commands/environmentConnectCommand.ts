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
import { UserInputUtil, IBlockchainQuickPickItem } from './UserInputUtil';
import { FabricConnectionFactory } from '../fabric/FabricConnectionFactory';
import { Reporter } from '../util/Reporter';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { ExtensionUtil } from '../util/ExtensionUtil';
import * as vscode from 'vscode';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricEnvironment } from '../fabric/environments/FabricEnvironment';
import { FabricEnvironmentManager, ConnectedState } from '../fabric/environments/FabricEnvironmentManager';
import { FabricEnvironmentRegistryEntry, FabricRuntimeUtil, IFabricEnvironmentConnection, FabricNode, LogType } from 'ibm-blockchain-platform-common';
import { ManagedAnsibleEnvironment } from '../fabric/environments/ManagedAnsibleEnvironment';
import { LocalEnvironment } from '../fabric/environments/LocalEnvironment';
import { EnvironmentFactory } from '../fabric/environments/EnvironmentFactory';
import { AnsibleEnvironment } from '../fabric/environments/AnsibleEnvironment';

export async function fabricEnvironmentConnect(fabricEnvironmentRegistryEntry: FabricEnvironmentRegistryEntry): Promise<void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, `connecting to fabric environment`);

    let fabricEnvironment: FabricEnvironment | AnsibleEnvironment | ManagedAnsibleEnvironment | LocalEnvironment;

    try {
        if (!fabricEnvironmentRegistryEntry) {
            const chosenEntry: IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry> = await UserInputUtil.showFabricEnvironmentQuickPickBox('Choose an environment to connect with', false, true, true) as IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>;
            if (!chosenEntry) {
                return;
            }

            fabricEnvironmentRegistryEntry = chosenEntry.data;
        }

        fabricEnvironment = EnvironmentFactory.getEnvironment(fabricEnvironmentRegistryEntry);
        if (fabricEnvironmentRegistryEntry.managedRuntime) {

            let running: boolean = await (fabricEnvironment as LocalEnvironment | ManagedAnsibleEnvironment).isRunning();
            if (!running) {
                await vscode.commands.executeCommand(ExtensionCommands.START_FABRIC, fabricEnvironmentRegistryEntry);
                running = await (fabricEnvironment as LocalEnvironment | ManagedAnsibleEnvironment).isRunning();
                if (!running) {
                    // failed to start local fabric so return
                    return;
                }
            }
        }

        // need to check if the environment is setup
        const requireSetup: boolean = await fabricEnvironment.requireSetup();

        if (requireSetup && !(fabricEnvironment instanceof LocalEnvironment || fabricEnvironment instanceof ManagedAnsibleEnvironment)) {
            await FabricEnvironmentManager.instance().connect(undefined, fabricEnvironmentRegistryEntry, ConnectedState.SETUP);
            VSCodeBlockchainOutputAdapter.instance().log(LogType.IMPORTANT, 'You must complete setup for this environment to enable install, instantiate and register identity operations on the nodes. Click each node in the list to perform the required setup steps');
            return;
        }

        const connection: IFabricEnvironmentConnection = FabricConnectionFactory.createFabricEnvironmentConnection();

        const nodes: FabricNode[] = await fabricEnvironment.getNodes();
        await connection.connect(nodes);

        try {
            await connection.createChannelMap();
        } catch (error) {
            outputAdapter.log(LogType.ERROR, `Error connecting to environment ${fabricEnvironment.getDisplayName()}: ${error.message}`, `Error connecting to environment ${fabricEnvironment.getDisplayName()}: ${error.toString()}`);
            await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            return;
        }

        FabricEnvironmentManager.instance().connect(connection, fabricEnvironmentRegistryEntry, ConnectedState.CONNECTED);

        const environmentName: string = fabricEnvironment.getDisplayName();

        outputAdapter.log(LogType.SUCCESS, `Connected to ${environmentName}`);

        let environmentData: string = 'managed environment';
        if (!fabricEnvironmentRegistryEntry.managedRuntime) {
            environmentData = 'user environment';
        }

        const isIBMer: boolean = ExtensionUtil.checkIfIBMer();
        Reporter.instance().sendTelemetryEvent('fabricEnvironmentConnectCommand', { environmentData: environmentData, connectEnvironmentIBM: isIBMer + '' });
    } catch (error) {
        outputAdapter.log(LogType.ERROR, error.message, error.toString());
        return;
    }
}
