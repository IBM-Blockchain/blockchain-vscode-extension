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
import { BlockchainNetworkExplorerProvider } from './explorer/BlockchainNetworkExplorer';
import { BlockchainPackageExplorerProvider } from './explorer/BlockchainPackageExplorer';
import { addConnection } from './commands/addConnectionCommand';
import { deleteConnection } from './commands/deleteConnectionCommand';
import { addConnectionIdentity } from './commands/addConnectionIdentityCommand';
import { connect } from './commands/connectCommand';
import { createSmartContractProject } from './commands/createSmartContractProjectCommand';

import { VSCodeOutputAdapter } from './logging/VSCodeOutputAdapter';
import { DependencyManager } from './dependencies/DependencyManager';
import { TemporaryCommandRegistry } from './dependencies/TemporaryCommandRegistry';
import { ExtensionUtil } from './util/ExtensionUtil';
import { FabricRuntimeManager } from './fabric/FabricRuntimeManager';

let blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider;
let blockchainPackageExplorerProvider: BlockchainPackageExplorerProvider;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    const outputAdapter: VSCodeOutputAdapter = VSCodeOutputAdapter.instance();
    outputAdapter.log('extension activating');

    try {
        const dependancyManager = DependencyManager.instance();
        if (!dependancyManager.hasNativeDependenciesInstalled()) {
            await dependancyManager.installNativeDependencies();

            registerCommands(context);

            const tempCommandRegistry: TemporaryCommandRegistry = TemporaryCommandRegistry.instance();
            await tempCommandRegistry.executeStoredCommands();
        } else {
            registerCommands(context);
        }

        await ensureLocalFabricExists();

        ExtensionUtil.setExtensionContext(context);
        outputAdapter.log('extension activated');
    } catch (error) {
        console.log(error);
        outputAdapter.error('Failed to activate extension see previous messages for reason');
        const result = await vscode.window.showErrorMessage('Failed to activate extension', 'open output view');
        if (result) {
            outputAdapter.show();
        }
    }
}

export function deactivate(): void {
    const context: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();
    disposeExtension(context);
}

/*
 * Should only be called outside this file in tests
 */
export function registerCommands(context: vscode.ExtensionContext): void {
    blockchainNetworkExplorerProvider = new BlockchainNetworkExplorerProvider();
    blockchainPackageExplorerProvider = new BlockchainPackageExplorerProvider();

    disposeExtension(context);

    context.subscriptions.push(vscode.window.registerTreeDataProvider('blockchainExplorer', blockchainNetworkExplorerProvider));
    context.subscriptions.push(vscode.window.registerTreeDataProvider('blockchainAPackageExplorer', blockchainPackageExplorerProvider));
    context.subscriptions.push(vscode.commands.registerCommand('blockchainExplorer.refreshEntry', (element) => blockchainNetworkExplorerProvider.refresh(element)));
    context.subscriptions.push(vscode.commands.registerCommand('blockchainExplorer.connectEntry', (connectionName, identityName) => connect(connectionName, identityName)));
    context.subscriptions.push(vscode.commands.registerCommand('blockchainExplorer.disconnectEntry', () => blockchainNetworkExplorerProvider.disconnect()));
    context.subscriptions.push(vscode.commands.registerCommand('blockchainExplorer.addConnectionEntry', addConnection));
    context.subscriptions.push(vscode.commands.registerCommand('blockchainExplorer.deleteConnectionEntry', (connection) => deleteConnection(connection)));
    context.subscriptions.push(vscode.commands.registerCommand('blockchainExplorer.addConnectionIdentityEntry', (connection) => addConnectionIdentity(connection)));
    context.subscriptions.push(vscode.commands.registerCommand('blockchain.createSmartContractProjectEntry', createSmartContractProject));
    context.subscriptions.push(vscode.commands.registerCommand('blockchainAPackageExplorer.refreshEntry', () => blockchainPackageExplorerProvider.refresh()));

    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((e) => {

        if (e.affectsConfiguration('fabric.connections') || e.affectsConfiguration('fabric.runtimes')) {
            return vscode.commands.executeCommand('blockchainExplorer.refreshEntry');
        }
    }));
}

export async function ensureLocalFabricExists(): Promise<void> {
    const runtimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
    if (runtimeManager.exists('local_fabric')) {
        return;
    }
    await runtimeManager.add('local_fabric');
}

function disposeExtension(context: vscode.ExtensionContext): void {
    // remove old subscriptions
    context.subscriptions.forEach((item) => {
        if (item) {
            item.dispose();
        }
    });
    context.subscriptions.splice(0, context.subscriptions.length);
}

/*
 * Needed for testing
 */
export function getBlockchainNetworkExplorerProvider(): BlockchainNetworkExplorerProvider {
    return blockchainNetworkExplorerProvider;
}

export function getBlockchainPackageExplorerProvider(): BlockchainPackageExplorerProvider {
    return blockchainPackageExplorerProvider;
}
