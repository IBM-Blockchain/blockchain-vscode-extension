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
import { Reporter } from './util/Reporter';
import { BlockchainNetworkExplorerProvider } from './explorer/BlockchainNetworkExplorer';
import { BlockchainPackageExplorerProvider } from './explorer/BlockchainPackageExplorer';
import { addGateway } from './commands/addGatewayCommand';
import { deleteGateway } from './commands/deleteGatewayCommand';
import { addGatewayIdentity } from './commands/addGatewayIdentityCommand';
import { connect } from './commands/connectCommand';
import { createSmartContractProject } from './commands/createSmartContractProjectCommand';
import { packageSmartContract } from './commands/packageSmartContractCommand';

import { VSCodeBlockchainOutputAdapter } from './logging/VSCodeBlockchainOutputAdapter';
import { DependencyManager } from './dependencies/DependencyManager';
import { TemporaryCommandRegistry } from './dependencies/TemporaryCommandRegistry';
import { ExtensionUtil } from './util/ExtensionUtil';
import { FabricRuntimeManager } from './fabric/FabricRuntimeManager';
import { startFabricRuntime } from './commands/startFabricRuntime';
import { stopFabricRuntime } from './commands/stopFabricRuntime';
import { restartFabricRuntime } from './commands/restartFabricRuntime';
import { toggleFabricRuntimeDevMode } from './commands/toggleFabricRuntimeDevMode';
import { BlockchainTreeItem } from './explorer/model/BlockchainTreeItem';
import { deleteSmartContractPackage } from './commands/deleteSmartContractPackageCommand';
import { PeerTreeItem } from './explorer/runtimeOps/PeerTreeItem';
import { installSmartContract } from './commands/installCommand';
import { ChannelTreeItem } from './explorer/model/ChannelTreeItem';
import { instantiateSmartContract } from './commands/instantiateCommand';
import { editGatewayCommand } from './commands/editGatewayCommand';
import { teardownFabricRuntime } from './commands/teardownFabricRuntime';
import { exportSmartContractPackage } from './commands/exportSmartContractPackageCommand';
import { PackageTreeItem } from './explorer/model/PackageTreeItem';
import { FabricDebugConfigurationProvider } from './debug/FabricDebugConfigurationProvider';
import { FabricConnectionManager } from './fabric/FabricConnectionManager';
import { PackageRegistryEntry } from './packages/PackageRegistryEntry';
import { testSmartContract } from './commands/testSmartContractCommand';
import { TransactionTreeItem } from './explorer/model/TransactionTreeItem';
import { submitTransaction } from './commands/submitTransaction';
import { upgradeSmartContract } from './commands/upgradeCommand';
import { openFabricRuntimeTerminal } from './commands/openFabricRuntimeTerminal';
import { exportConnectionDetails } from './commands/exportConnectionDetailsCommand';
import { LogType } from './logging/OutputAdapter';

import { HomeView } from './webview/HomeView';
import { SampleView } from './webview/SampleView';
import { BlockchainRuntimeExplorerProvider } from './explorer/BlockchainRuntimeExplorer';
import { FabricGatewayRegistryEntry } from './fabric/FabricGatewayRegistryEntry';
import { GatewayPropertyTreeItem } from './explorer/model/GatewayPropertyTreeItem';
import { GatewayTreeItem } from './explorer/model/GatewayTreeItem';
import { ExtensionCommands } from '../ExtensionCommands';
import { version as currentExtensionVersion } from '../package.json';
import { InstantiatedContractTreeItem } from './explorer/model/InstantiatedContractTreeItem';
import { InstantiatedTreeItem } from './explorer/model/InstantiatedTreeItem';

let blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider;
let blockchainPackageExplorerProvider: BlockchainPackageExplorerProvider;
let blockchainRuntimeExplorerProvider: BlockchainRuntimeExplorerProvider;

class ExtensionData {
    public activationCount: number;
    public version: string;
}

export const EXTENSION_DATA_KEY: string = 'ibm-blockchain-platform-extension-data';
export const DEFAULT_EXTENSION_DATA: ExtensionData = {
    activationCount: 0,
    version: null
};

export async function activate(context: vscode.ExtensionContext): Promise<void> {

    const originalExtensionData: ExtensionData = context.globalState.get<ExtensionData>(EXTENSION_DATA_KEY, DEFAULT_EXTENSION_DATA);
    const newExtensionData: ExtensionData = {
        activationCount: originalExtensionData.activationCount + 1,
        version: currentExtensionVersion
    };
    await context.globalState.update(EXTENSION_DATA_KEY, newExtensionData);
    const extensionUpdated: boolean = newExtensionData.version !== originalExtensionData.version;

    const packageJson: any = ExtensionUtil.getPackageJSON();

    if (packageJson.production !== true) {
        await Reporter.instance().dispose();
    }

    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    // Show the output adapter if the extension has been updated.
    if (extensionUpdated) {
        outputAdapter.show();
    }

    // At the moment, the 'Open Log File' doesn't display extension log files to open. https://github.com/Microsoft/vscode/issues/43064
    outputAdapter.log(LogType.IMPORTANT, undefined, 'Log files can be found by running the `Developer: Open Logs Folder` command from the palette', true); // Let users know how to get the log file

    outputAdapter.log(LogType.INFO, undefined, 'Starting IBM Blockchain Platform Extension');

    try {
        const dependancyManager: DependencyManager = DependencyManager.instance();
        const hasNativeDependenciesInstalled: boolean = await dependancyManager.hasNativeDependenciesInstalled();
        if (!hasNativeDependenciesInstalled) {
            await dependancyManager.installNativeDependencies();
        }
        outputAdapter.log(LogType.INFO, undefined, 'Migrating local fabric configuration');
        await migrateLocalFabricConfiguration();

        outputAdapter.log(LogType.INFO, undefined, 'Ensuring local fabric exists in runtime manager');
        await ensureLocalFabricExists();

        outputAdapter.log(LogType.INFO, undefined, 'Registering commands');
        await registerCommands(context);

        if (!hasNativeDependenciesInstalled) {
            outputAdapter.log(LogType.INFO, undefined, 'Execute stored commands in the registry');
            const tempCommandRegistry: TemporaryCommandRegistry = TemporaryCommandRegistry.instance();
            await tempCommandRegistry.executeStoredCommands();
        }

        ExtensionUtil.setExtensionContext(context);

        // Only popup if the extension has been updated.
        if (extensionUpdated) {
            outputAdapter.log(LogType.INFO, 'IBM Blockchain Platform Extension activated');
        } else {
            outputAdapter.log(LogType.INFO, null, 'IBM Blockchain Platform Extension activated');
        }

        // Detects if the user wants to have the Home page appear the first time they click on the extension's icon
        // Only do this if the extension has been updated.
        const showPage: boolean = vscode.workspace.getConfiguration().get('extension.home.showOnStartup');
        if (extensionUpdated && showPage) {
            // Open the Home page
            await vscode.commands.executeCommand(ExtensionCommands.OPEN_HOME_PAGE);
        }
    } catch (error) {
        console.log(error);
        outputAdapter.log(LogType.ERROR, 'Failed to activate extension: open output view', 'Failed to activate extension see previous messages for reason');
    }
}

export async function deactivate(): Promise<void> {
    const context: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();
    await Reporter.instance().dispose();
    disposeExtension(context);
}

/*
 * Should only be called outside this file in tests
 */
export async function registerCommands(context: vscode.ExtensionContext): Promise<void> {
    blockchainNetworkExplorerProvider = new BlockchainNetworkExplorerProvider();
    blockchainPackageExplorerProvider = new BlockchainPackageExplorerProvider();
    blockchainRuntimeExplorerProvider = new BlockchainRuntimeExplorerProvider();

    disposeExtension(context);

    const provider: FabricDebugConfigurationProvider = new FabricDebugConfigurationProvider();
    context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('fabric:node', provider));
    context.subscriptions.push(provider);

    context.subscriptions.push(vscode.window.registerTreeDataProvider('blockchainExplorer', blockchainNetworkExplorerProvider));
    context.subscriptions.push(vscode.window.registerTreeDataProvider('blockchainARuntimeExplorer', blockchainRuntimeExplorerProvider));
    context.subscriptions.push(vscode.window.registerTreeDataProvider('blockchainAPackageExplorer', blockchainPackageExplorerProvider));
    context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.REFRESH_GATEWAYS, (element: BlockchainTreeItem) => blockchainNetworkExplorerProvider.refresh(element)));
    context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.CONNECT, (gateway: FabricGatewayRegistryEntry, identityName: string) => connect(gateway, identityName)));
    context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.DISCONNECT, () => FabricConnectionManager.instance().disconnect()));
    context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.ADD_GATEWAY, addGateway));
    context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.DELETE_GATEWAY, (gateway: GatewayTreeItem) => deleteGateway(gateway)));
    context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.ADD_GATEWAY_IDENTITY, (gateway: GatewayTreeItem) => addGatewayIdentity(gateway)));
    context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.CREATE_SMART_CONTRACT_PROJECT, createSmartContractProject));
    context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT, (workspace?: vscode.WorkspaceFolder, version?: string) => packageSmartContract(workspace, version)));
    context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.REFRESH_PACKAGES, () => blockchainPackageExplorerProvider.refresh()));
    context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.REFRESH_LOCAL_OPS, (element: BlockchainTreeItem) => blockchainRuntimeExplorerProvider.refresh(element)));
    context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.START_FABRIC, () => startFabricRuntime()));
    context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.STOP_FABRIC, () => stopFabricRuntime()));
    context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.RESTART_FABRIC, () => restartFabricRuntime()));
    context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.TEARDOWN_FABRIC, () => teardownFabricRuntime()));
    context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.TOGGLE_FABRIC_DEV_MODE, () => toggleFabricRuntimeDevMode()));
    context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.OPEN_FABRIC_RUNTIME_TERMINAL, () => openFabricRuntimeTerminal()));
    context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.EXPORT_CONNECTION_DETAILS, () => exportConnectionDetails()));
    context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.DELETE_SMART_CONTRACT, (project: PackageTreeItem) => deleteSmartContractPackage(project)));
    context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.EXPORT_SMART_CONTRACT, (project: PackageTreeItem) => exportSmartContractPackage(project)));
    context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.INSTALL_SMART_CONTRACT, (peerTreeItem?: PeerTreeItem, peerNames?: Set<string>, chosenPackge?: PackageRegistryEntry) => installSmartContract(peerTreeItem, peerNames, chosenPackge)));
    context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT, (channelTreeItem?: ChannelTreeItem) => instantiateSmartContract(channelTreeItem)));
    context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.EDIT_GATEWAY, (treeItem: GatewayPropertyTreeItem | GatewayTreeItem) => editGatewayCommand(treeItem)));
    context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.TEST_SMART_CONTRACT, (chaincode: InstantiatedContractTreeItem) => testSmartContract(chaincode)));
    context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.SUBMIT_TRANSACTION, (transactionTreeItem?: InstantiatedTreeItem | TransactionTreeItem) => submitTransaction(transactionTreeItem)));
    context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT, (instantiatedChainCodeTreeItem?: InstantiatedTreeItem) => upgradeSmartContract(instantiatedChainCodeTreeItem)));

    context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.OPEN_HOME_PAGE, async () => await HomeView.openHomePage(context)));
    context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.OPEN_SAMPLE_PAGE, async (repoName: string, sampleName: string) => await SampleView.openContractSample(context, repoName, sampleName)));

    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(async (e: any) => {

        if (e.affectsConfiguration('fabric.gateways') || e.affectsConfiguration('fabric.runtimes')) {
            try {
                await vscode.commands.executeCommand(ExtensionCommands.REFRESH_GATEWAYS);
            } catch (error) {
                // ignore error this only happens in tests
            }
        }
    }));

    vscode.debug.onDidChangeActiveDebugSession(async (e: vscode.DebugSession) => {
        // Listen for any changes to the debug state.
        if (e) {
            // Show any new transactions added to a contract, after 'reload debug' is executed.
            await vscode.commands.executeCommand(ExtensionCommands.REFRESH_GATEWAYS);
        }
    });

    const packageJson: any = ExtensionUtil.getPackageJSON();

    if (packageJson.production === true) {
        context.subscriptions.push(Reporter.instance());
    }
}

export async function migrateLocalFabricConfiguration(): Promise<void> {
    const runtimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
    await runtimeManager.migrate();
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
    context.subscriptions.forEach((item: vscode.Disposable) => {
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

export function getBlockchainRuntimeExplorerProvider(): BlockchainRuntimeExplorerProvider {
    return blockchainRuntimeExplorerProvider;
}

export function getBlockchainPackageExplorerProvider(): BlockchainPackageExplorerProvider {
    return blockchainPackageExplorerProvider;
}
