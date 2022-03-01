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
import { FabricEnvironmentManager, ConnectedState } from '../fabric/environments/FabricEnvironmentManager';
import { FabricEnvironmentRegistryEntry, IFabricEnvironmentConnection, FabricNode, LogType, FabricEnvironment, EnvironmentType, MicrofabEnvironment } from 'ibm-blockchain-platform-common';
import { EnvironmentFactory } from '../fabric/environments/EnvironmentFactory';
import { LocalMicroEnvironment } from '../fabric/environments/LocalMicroEnvironment';


// Development Note: This `fabricEnvironmentConnect` is triggered from a number of UI events, but also from other parts of the base
// it has a double duty - both connect, but also to act as a form of 'state refresh'. eg if a Node (say a CA or Peer) has been deleted
// this will be called to act as a 'refresh'
//
// However it has been found that if the environment tab has more than a few channels, then it is very easy to get so many 'refresh'
// events that this method gets swamped - as it's not that quick to reconnect. The system 'live locks' in effect.
//
// There are a number of manager and factory classes, that cache various things, but the 'EnvironmentConnection' isn't one of them.
// Therefore the `fabricEnviromentRegistryEntry` has an added entry to cache the connection. This is check early on in this function
// and returns early. This speeds up UI responsiveness.
//
// The risk is that the refresh may be hindered; hence in the deleteNodeCommand function specifically clears out this cached connection
//
// In the interests of full disclosure - the above is how I *think* this works, but I've not spent long enough with the code
// to be completely certain. 

export async function fabricEnvironmentConnect(fabricEnvironmentRegistryEntry: FabricEnvironmentRegistryEntry, showSuccess: boolean = true): Promise<void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    let startRefresh: boolean = true;
    if (showSuccess) {
        outputAdapter.log(LogType.INFO, undefined, `connecting to fabric environment`);
    }

    let fabricEnvironment: FabricEnvironment | LocalMicroEnvironment;

    try {
        if (!fabricEnvironmentRegistryEntry) {
            const chosenEntry: IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry> = await UserInputUtil.showFabricEnvironmentQuickPickBox('Choose an environment to connect with', false, true) as IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>;
            if (!chosenEntry) {
                return;
            }

            fabricEnvironmentRegistryEntry = chosenEntry.data;
        }

        // if connection has already been made, do not reconnect.
        if (fabricEnvironmentRegistryEntry.environmentConnection){
            return;
        }

        fabricEnvironment = EnvironmentFactory.getEnvironment(fabricEnvironmentRegistryEntry);

        if (fabricEnvironmentRegistryEntry.environmentType === EnvironmentType.MICROFAB_ENVIRONMENT) {
            const isAlive: boolean = await (fabricEnvironment as MicrofabEnvironment).isAlive();
            if (!isAlive) {
                outputAdapter.log(LogType.ERROR, `Unable to connect to Microfab runtime ${(fabricEnvironment as MicrofabEnvironment).getURL()}`);
                return;
            }
        }

        // TODO JAKE: Should we just check type === LocalMicrofabEnvironment?
        if (fabricEnvironmentRegistryEntry.managedRuntime) {

            let running: boolean = await (fabricEnvironment as LocalMicroEnvironment).isRunning();
            if (!running) {
                try {
                    await vscode.commands.executeCommand(ExtensionCommands.START_FABRIC, fabricEnvironmentRegistryEntry);
                } catch (error) {
                    // Starting fabric failed
                    outputAdapter.log(LogType.ERROR, `Unable to connect as starting the Fabric failed`);
                    return;
                }
                running = await (fabricEnvironment as LocalMicroEnvironment).isRunning();
                if (!running) {
                    // failed to start local fabric so return
                    return;
                }
            }

            const isAlive: boolean = await (fabricEnvironment as LocalMicroEnvironment).waitFor();
            if (!isAlive) {
                // Network isn't alive.
                return;
            }
        }

        let nodes: FabricNode[] = await fabricEnvironment.getNodes();

        if (fabricEnvironmentRegistryEntry.environmentType === EnvironmentType.OPS_TOOLS_ENVIRONMENT || fabricEnvironmentRegistryEntry.environmentType === EnvironmentType.SAAS_OPS_TOOLS_ENVIRONMENT) {
            let informOfChanges: boolean = true;
            if (nodes.length === 0) {
                const importNodes: boolean = await UserInputUtil.showConfirmationWarningMessage(`Problem connecting to environment ${fabricEnvironmentRegistryEntry.name}: no visible nodes. Would you like to filter nodes?`);
                if (!importNodes) {
                    return;
                }
                informOfChanges = false;
            }
            try {
                await ExtensionUtil.executeCommandInternal(ExtensionCommands.EDIT_NODE_FILTERS, fabricEnvironmentRegistryEntry, false, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS, informOfChanges, showSuccess, true);
            } catch (error) {
                if (error.message.match(/might be out of date/) !== null) {
                    startRefresh = false;
                } else {
                    throw error;
                }
            }
            nodes = await fabricEnvironment.getNodes();
            if (nodes.length === 0) {
                FabricEnvironmentManager.instance().disconnect();
                return;
            }
        }

        // need to check if the environment is setup
        const requireSetup: boolean = await fabricEnvironment.requireSetup();

        if (requireSetup && !(fabricEnvironment instanceof LocalMicroEnvironment)) {
            FabricEnvironmentManager.instance().connect(undefined, fabricEnvironmentRegistryEntry, ConnectedState.SETUP);
            VSCodeBlockchainOutputAdapter.instance().log(LogType.IMPORTANT, 'You must complete setup for this environment to enable deploy and register identity operations on the nodes. Click each node in the list to perform the required setup steps');
            FabricEnvironmentManager.instance().stopEnvironmentRefresh();
            return;
        }
   
        const connection: IFabricEnvironmentConnection = FabricConnectionFactory.createFabricEnvironmentConnection(fabricEnvironmentRegistryEntry.name);
        await connection.connect(nodes);

        try {
            await connection.createChannelMap();
        } catch (error) {
            outputAdapter.log(LogType.ERROR, `Error connecting to environment ${fabricEnvironment.getName()}: ${error.message}`, `Error connecting to environment ${fabricEnvironment.getName()}: ${error.toString()}`);
            await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            return;
        }

        // cache the connection in the registry entry for future use
        fabricEnvironmentRegistryEntry.environmentConnection = connection;
        
        FabricEnvironmentManager.instance().connect(connection, fabricEnvironmentRegistryEntry, ConnectedState.CONNECTING, startRefresh);

        const environmentName: string = fabricEnvironment.getName();

        // we shouldn't show the success message if we are auto refreshing
        if (showSuccess) {
            outputAdapter.log(LogType.SUCCESS, `Connected to ${environmentName}`);
        }

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
