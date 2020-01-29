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
import { FabricRuntimeManager } from '../fabric/FabricRuntimeManager';
import { ExtensionUtil } from '../util/ExtensionUtil';
import * as vscode from 'vscode';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricEnvironment } from '../fabric/FabricEnvironment';
import { FabricEnvironmentManager, ConnectedState } from '../fabric/FabricEnvironmentManager';
import { FabricEnvironmentRegistryEntry, FabricRuntimeUtil, IFabricEnvironmentConnection, FabricNode, LogType } from 'ibm-blockchain-platform-common';

export async function fabricEnvironmentConnect(fabricEnvironmentRegistryEntry: FabricEnvironmentRegistryEntry): Promise<void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, `connecting to fabric environment`);

    let fabricEnvironment: FabricEnvironment;

    try {
        if (!fabricEnvironmentRegistryEntry) {
            const chosenEntry: IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry> = await UserInputUtil.showFabricEnvironmentQuickPickBox('Choose an environment to connect with', false, true, true) as IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>;
            if (!chosenEntry) {
                return;
            }

            fabricEnvironmentRegistryEntry = chosenEntry.data;
        }

        if (fabricEnvironmentRegistryEntry.managedRuntime) {
            let running: boolean = await FabricRuntimeManager.instance().getRuntime().isRunning();
            if (!running) {
                await vscode.commands.executeCommand(ExtensionCommands.START_FABRIC);
                running = await FabricRuntimeManager.instance().getRuntime().isRunning();
                if (!running) {
                    // failed to start local fabric so return
                    return;
                }
            }

            fabricEnvironment = FabricRuntimeManager.instance().getRuntime();
        } else {
            fabricEnvironment = new FabricEnvironment(fabricEnvironmentRegistryEntry.name);
        }

        let nodes: FabricNode[] = await fabricEnvironment.getNodes();

        if (fabricEnvironmentRegistryEntry.url) {
            let informOfChanges: boolean = true;
            if (nodes.length === 0) {
                const importNodes: boolean = await UserInputUtil.showConfirmationWarningMessage(`Error connecting to environment ${fabricEnvironmentRegistryEntry.name}: no visible nodes. Would you like to filter nodes?`);
                if (!importNodes) {
                    return;
                }
                informOfChanges = false;
            }
            await vscode.commands.executeCommand(ExtensionCommands.EDIT_NODE_FILTERS, fabricEnvironmentRegistryEntry, false, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS, informOfChanges);
            nodes = await fabricEnvironment.getNodes();
            if (nodes.length === 0) {
                if (FabricEnvironmentManager.instance().getState() !== ConnectedState.DISCONNECTED) {
                    await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT_ENVIRONMENT);
                }
                return;
            }
        }

        // need to check if the environment is setup
        const requireSetup: boolean = await fabricEnvironment.requireSetup();

        if (requireSetup && fabricEnvironmentRegistryEntry.name !== FabricRuntimeUtil.LOCAL_FABRIC) {
            FabricEnvironmentManager.instance().connect(undefined, fabricEnvironmentRegistryEntry, ConnectedState.SETUP);
            VSCodeBlockchainOutputAdapter.instance().log(LogType.IMPORTANT, 'You must complete setup for this environment to enable install, instantiate and register identity operations on the nodes. Click each node in the list to perform the required setup steps');
            return;
        }

        const connection: IFabricEnvironmentConnection = FabricConnectionFactory.createFabricEnvironmentConnection();

        await connection.connect(nodes);

        try {
            await connection.createChannelMap();
        } catch (error) {
            outputAdapter.log(LogType.ERROR, `Error connecting to environment ${fabricEnvironmentRegistryEntry.name}: ${error.message}`, `Error connecting to environment ${fabricEnvironmentRegistryEntry.name}: ${error.toString()}`);
            await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            return;
        }

        FabricEnvironmentManager.instance().connect(connection, fabricEnvironmentRegistryEntry, ConnectedState.CONNECTING);

        let environmentName: string;
        if (fabricEnvironmentRegistryEntry.name === FabricRuntimeUtil.LOCAL_FABRIC) {
            environmentName = FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME;
        } else {
            environmentName = fabricEnvironmentRegistryEntry.name;
        }

        outputAdapter.log(LogType.SUCCESS, `Connected to ${environmentName}`);

        let environmentData: string = 'managed environment';
        if (!fabricEnvironmentRegistryEntry.managedRuntime) {
            environmentData = 'user environment';
        }

        const isIBMer: boolean = ExtensionUtil.checkIfIBMer();
        Reporter.instance().sendTelemetryEvent('fabricEnvironmentConnectCommand', { environmentData: environmentData, connectEnvironmentIBM: isIBMer + '' });
    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Cannot connect to environment: ${error.message}`, `Cannot connect to environment: ${error.toString()}`);
        return;
    }
}
