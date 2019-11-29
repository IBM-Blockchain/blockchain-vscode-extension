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
import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { ExtensionCommands } from '../../ExtensionCommands';
import { SettingConfigurations } from '../../configurations';
import { addGateway } from '../commands/addGatewayCommand';
import { addWallet } from '../commands/addWalletCommand';
import { addWalletIdentity } from '../commands/addWalletIdentityCommand';
import { associateWallet } from '../commands/associateWalletCommand';
import { createNewIdentity } from '../commands/createNewIdentityCommand';
import { createSmartContractProject } from '../commands/createSmartContractProjectCommand';
import { debugCommandList } from '../commands/debugCommandListCommand';
import { deleteGateway } from '../commands/deleteGatewayCommand';
import { deleteIdentity } from '../commands/deleteIdentityCommand';
import { deleteSmartContractPackage } from '../commands/deleteSmartContractPackageCommand';
import { dissociateWallet } from '../commands/dissociateWalletCommand';
import { exportConnectionProfile } from '../commands/exportConnectionProfileCommand';
import { exportSmartContractPackage } from '../commands/exportSmartContractPackageCommand';
import { exportWallet } from '../commands/exportWalletCommand';
import { importSmartContractPackageCommand } from '../commands/importSmartContractPackageCommand';
import { installSmartContract } from '../commands/installCommand';
import { instantiateSmartContract } from '../commands/instantiateCommand';
import { openNewTerminal } from '../commands/openNewTerminal';
import { packageSmartContract } from '../commands/packageSmartContractCommand';
import { removeWallet } from '../commands/removeWalletCommand';
import { restartFabricRuntime } from '../commands/restartFabricRuntime';
import { startFabricRuntime } from '../commands/startFabricRuntime';
import { stopFabricRuntime } from '../commands/stopFabricRuntime';
import { submitTransaction } from '../commands/submitTransaction';
import { teardownFabricRuntime } from '../commands/teardownFabricRuntime';
import { testSmartContract } from '../commands/testSmartContractCommand';
import { upgradeSmartContract } from '../commands/upgradeCommand';
import { FabricGoDebugConfigurationProvider } from '../debug/FabricGoDebugConfigurationProvider';
import { FabricJavaDebugConfigurationProvider } from '../debug/FabricJavaDebugConfigurationProvider';
import { FabricNodeDebugConfigurationProvider } from '../debug/FabricNodeDebugConfigurationProvider';
import { BlockchainGatewayExplorerProvider } from '../explorer/gatewayExplorer';
import { BlockchainTreeItem } from '../explorer/model/BlockchainTreeItem';
import { ChannelTreeItem } from '../explorer/model/ChannelTreeItem';
import { ContractTreeItem } from '../explorer/model/ContractTreeItem';
import { GatewayAssociatedTreeItem } from '../explorer/model/GatewayAssociatedTreeItem';
import { GatewayDissociatedTreeItem } from '../explorer/model/GatewayDissociatedTreeItem';
import { GatewayTreeItem } from '../explorer/model/GatewayTreeItem';
import { IdentityTreeItem } from '../explorer/model/IdentityTreeItem';
import { InstantiatedContractTreeItem } from '../explorer/model/InstantiatedContractTreeItem';
import { InstantiatedTreeItem } from '../explorer/model/InstantiatedTreeItem';
import { PackageTreeItem } from '../explorer/model/PackageTreeItem';
import { TransactionTreeItem } from '../explorer/model/TransactionTreeItem';
import { BlockchainPackageExplorerProvider } from '../explorer/packageExplorer';
import { CertificateAuthorityTreeItem } from '../explorer/runtimeOps/connectedTree/CertificateAuthorityTreeItem';
import { NodeTreeItem } from '../explorer/runtimeOps/connectedTree/NodeTreeItem';
import { PeerTreeItem } from '../explorer/runtimeOps/connectedTree/PeerTreeItem';
import { BlockchainWalletExplorerProvider } from '../explorer/walletExplorer';
import { WalletTreeItem } from '../explorer/wallets/WalletTreeItem';
import { FabricGatewayConnectionManager } from '../fabric/FabricGatewayConnectionManager';
import { FabricGatewayRegistryEntry } from '../registries/FabricGatewayRegistryEntry';
import { FabricRuntimeManager } from '../fabric/FabricRuntimeManager';
import { LogType } from '../logging/OutputAdapter';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { PackageRegistryEntry } from '../registries/PackageRegistryEntry';
import { HomeView } from '../webview/HomeView';
import { SampleView } from '../webview/SampleView';
import { TutorialGalleryView } from '../webview/TutorialGalleryView';
import { TutorialView } from '../webview/TutorialView';
import { Reporter } from './Reporter';
import { PreReqView } from '../webview/PreReqView';
import { BlockchainEnvironmentExplorerProvider } from '../explorer/environmentExplorer';
import { gatewayConnect } from '../commands/gatewayConnectCommand';
import { RuntimeTreeItem } from '../explorer/runtimeOps/disconnectedTree/RuntimeTreeItem';
import { addEnvironment } from '../commands/addEnvironmentCommand';
import { FabricEnvironmentTreeItem } from '../explorer/runtimeOps/disconnectedTree/FabricEnvironmentTreeItem';
import { deleteEnvironment } from '../commands/deleteEnvironmentCommand';
import { FabricEnvironmentRegistryEntry } from '../registries/FabricEnvironmentRegistryEntry';
import { FabricNode } from '../fabric/FabricNode';
import { associateIdentityWithNode } from '../commands/associateIdentityWithNode';
import { fabricEnvironmentConnect } from '../commands/environmentConnectCommand';
import { FabricEnvironmentManager } from '../fabric/FabricEnvironmentManager';
import { DependencyManager } from '../dependencies/DependencyManager';
import { GlobalState, ExtensionData } from './GlobalState';
import { TemporaryCommandRegistry } from '../dependencies/TemporaryCommandRegistry';
import { version as currentExtensionVersion, dependencies } from '../../package.json';
import { FabricRuntime } from '../fabric/FabricRuntime';
import { UserInputUtil } from '../commands/UserInputUtil';
import { FabricChaincode, FabricRuntimeUtil } from 'ibm-blockchain-platform-common';
import { FabricDebugConfigurationProvider } from '../debug/FabricDebugConfigurationProvider';
import { importNodesToEnvironment } from '../commands/importNodesToEnvironmentCommand';
import { deleteNode } from '../commands/deleteNodeCommand';
import { FileRegistry } from '../registries/FileRegistry';
import { FabricWalletRegistry } from '../registries/FabricWalletRegistry';
import { FabricWalletRegistryEntry } from '../registries/FabricWalletRegistryEntry';
import { FabricGatewayRegistry } from '../registries/FabricGatewayRegistry';
import { FabricEnvironmentRegistry } from '../registries/FabricEnvironmentRegistry';
import { RepositoryRegistryEntry } from '../registries/RepositoryRegistryEntry';
import { RepositoryRegistry } from '../registries/RepositoryRegistry';
import { openTransactionView } from '../commands/openTransactionViewCommand';
import { FabricWalletUtil } from '../fabric/FabricWalletUtil';

let blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider;
let blockchainPackageExplorerProvider: BlockchainPackageExplorerProvider;
let blockchainEnvironmentExplorerProvider: BlockchainEnvironmentExplorerProvider;
let blockchainWalletExplorerProvider: BlockchainWalletExplorerProvider;

export const FABRIC_CLIENT_VERSION: string = '1.4.4';
export const FABRIC_NETWORK_VERSION: string = '1.4.4';
export const EXTENSION_ID: string = 'IBMBlockchain.ibm-blockchain-platform';

// tslint:disable-next-line: max-classes-per-file
export class ExtensionUtil {

    static readonly DEBUG_PACKAGE_PREFIX: string = 'vscode-debug';

    public static getPackageJSON(): any {
        return this.getExtension().packageJSON;
    }

    public static isActive(): boolean {
        return this.getExtension().isActive;
    }

    public static activateExtension(): Thenable<void> {
        return this.getExtension().activate();
    }

    public static getExtensionPath(): string {
        return this.getExtension().extensionPath;
    }

    public static async getContractNameAndVersion(folder: vscode.WorkspaceFolder): Promise<FabricChaincode> {
        try {
            const packageJson: any = await this.loadJSON(folder, 'package.json');
            return { name: packageJson.name, version: packageJson.version };
        } catch (error) {
            return;
        }
    }

    public static async loadJSON(folder: vscode.WorkspaceFolder, file: string): Promise<any> {
        try {
            const workspacePackage: string = path.join(folder.uri.fsPath, file);
            const workspacePackageContents: string = await fs.readFile(workspacePackage, 'utf8');
            return JSON.parse(workspacePackageContents);
        } catch (error) {
            throw new Error('error reading package.json from project ' + error.message);
        }
    }

    // Migrate user setting configurations
    public static async migrateSettingConfigurations(): Promise<any> {
        // No need to handle migrating 'fabric.runtime' to the new configuration as this is handled in FabricRuntimeManager

        // Migrate Fabric gateways
        const oldGateways: any = vscode.workspace.getConfiguration().get('fabric.gateways');
        if (oldGateways !== undefined) {
            const newGateways: any = vscode.workspace.getConfiguration().get(SettingConfigurations.OLD_FABRIC_GATEWAYS);
            if (oldGateways && newGateways.length === 0) {
                await vscode.workspace.getConfiguration().update(SettingConfigurations.OLD_FABRIC_GATEWAYS, oldGateways, vscode.ConfigurationTarget.Global);
            }
        }

        // Migrate Fabric wallets
        const oldWallets: any = vscode.workspace.getConfiguration().get('fabric.wallets');
        if (oldWallets !== undefined) {
            const newWallets: any = vscode.workspace.getConfiguration().get(SettingConfigurations.OLD_FABRIC_WALLETS);
            if (oldWallets && newWallets.length === 0) {
                await vscode.workspace.getConfiguration().update(SettingConfigurations.OLD_FABRIC_WALLETS, oldWallets, vscode.ConfigurationTarget.Global);
            }
        }

        // Migrate extension repositories
        const oldRepositories: any = vscode.workspace.getConfiguration().get('blockchain.repositories');
        if (oldRepositories !== undefined) {
            const newRepositories: any = vscode.workspace.getConfiguration().get(SettingConfigurations.OLD_EXTENSION_REPOSITORIES);
            if (oldRepositories && newRepositories.length === 0) {
                await vscode.workspace.getConfiguration().update(SettingConfigurations.OLD_EXTENSION_REPOSITORIES, oldRepositories, vscode.ConfigurationTarget.Global);
            }
        }

        // Migrate extension directory
        const oldDirectory: any = vscode.workspace.getConfiguration().get('blockchain.ext.directory');
        if (oldDirectory !== undefined) {
            await vscode.workspace.getConfiguration().update(SettingConfigurations.EXTENSION_DIRECTORY, oldDirectory, vscode.ConfigurationTarget.Global);
        }
    }

    public static async migrateEnvironments(): Promise<void> {
        const oldEnvironments: FabricEnvironmentRegistryEntry[] = vscode.workspace.getConfiguration().get(SettingConfigurations.OLD_ENVIRONMENTS);

        for (const environment of oldEnvironments) {
            const entry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry({
                name: environment.name
            });

            const exists: boolean = await FabricEnvironmentRegistry.instance().exists(environment.name);

            if (!exists) {
                await FabricEnvironmentRegistry.instance().add(entry);
            }
        }

        await vscode.workspace.getConfiguration().update(SettingConfigurations.OLD_ENVIRONMENTS, [], vscode.ConfigurationTarget.Global);
    }

    public static async migrateRepositories(): Promise<void> {
        const oldRepositories: RepositoryRegistryEntry[] = vscode.workspace.getConfiguration().get(SettingConfigurations.OLD_EXTENSION_REPOSITORIES);

        for (const repository of oldRepositories) {
            // need to do this otherwise it creates the wrong dir structure
            const info: string[] = repository.name.split('/');

            const entry: RepositoryRegistryEntry = new RepositoryRegistryEntry({
                name: info[1],
                path: repository.path
            });

            const exists: boolean = await RepositoryRegistry.instance().exists(entry.name);

            if (!exists) {
                await RepositoryRegistry.instance().add(entry);
            }
        }

        await vscode.workspace.getConfiguration().update(SettingConfigurations.OLD_EXTENSION_REPOSITORIES, [], vscode.ConfigurationTarget.Global);
    }

    public static skipNpmInstall(): boolean {
        return false; // We should never skip npm install, except for unit tests
    }

    public static checkIfIBMer(): boolean {
        let isIBMer: boolean = false;
        const networkInterfaces: { [index: string]: os.NetworkInterfaceInfo[] } = os.networkInterfaces();
        const keys: string[] = Object.keys(networkInterfaces);
        keys.forEach((key: string) => {
            const interfaces: os.NetworkInterfaceInfo[] = networkInterfaces[key];
            const foundInterfaces: os.NetworkInterfaceInfo[] = interfaces.filter((_interface: os.NetworkInterfaceInfo) => {
                return _interface.family === 'IPv4' && _interface.address.startsWith('9.');
            });

            if (foundInterfaces.length > 0) {
                isIBMer = true;
            }
        });
        return isIBMer;
    }

    /*
    * Should only be called outside this file in tests
    */
    public static async registerCommands(context: vscode.ExtensionContext): Promise<vscode.ExtensionContext> {
        blockchainGatewayExplorerProvider = new BlockchainGatewayExplorerProvider();
        blockchainPackageExplorerProvider = new BlockchainPackageExplorerProvider();
        blockchainEnvironmentExplorerProvider = new BlockchainEnvironmentExplorerProvider();
        blockchainWalletExplorerProvider = new BlockchainWalletExplorerProvider();

        this.disposeExtension(context);

        const goDebugProvider: FabricGoDebugConfigurationProvider = new FabricGoDebugConfigurationProvider();
        const javaDebugProvider: FabricJavaDebugConfigurationProvider = new FabricJavaDebugConfigurationProvider();
        const nodeDebugProvider: FabricNodeDebugConfigurationProvider = new FabricNodeDebugConfigurationProvider();
        context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('fabric:go', goDebugProvider));
        context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('fabric:java', javaDebugProvider));
        context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('fabric:node', nodeDebugProvider));
        context.subscriptions.push(vscode.window.registerTreeDataProvider('environmentExplorer', blockchainEnvironmentExplorerProvider));

        context.subscriptions.push(vscode.window.registerTreeDataProvider('gatewaysExplorer', blockchainGatewayExplorerProvider));
        context.subscriptions.push(vscode.window.registerTreeDataProvider('aPackagesExplorer', blockchainPackageExplorerProvider));
        context.subscriptions.push(vscode.window.registerTreeDataProvider('walletExplorer', blockchainWalletExplorerProvider));
        context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.REFRESH_GATEWAYS, (element: BlockchainTreeItem) => blockchainGatewayExplorerProvider.refresh(element)));
        context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.CONNECT_TO_GATEWAY, (gateway: FabricGatewayRegistryEntry, identityName: string) => gatewayConnect(gateway, identityName)));
        context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.DISCONNECT_GATEWAY, () => FabricGatewayConnectionManager.instance().disconnect()));
        context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.ADD_GATEWAY, () => addGateway()));
        context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.DELETE_GATEWAY, (gateway: GatewayTreeItem) => deleteGateway(gateway)));
        context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.ADD_WALLET_IDENTITY, (walletItem: WalletTreeItem | FabricWalletRegistryEntry, mspid: string) => addWalletIdentity(walletItem, mspid)));
        context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.CREATE_SMART_CONTRACT_PROJECT, createSmartContractProject));
        context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT, (workspace?: vscode.WorkspaceFolder, overrideName?: string, overrideVersion?: string) => packageSmartContract(workspace, overrideName, overrideVersion)));
        context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.REFRESH_PACKAGES, () => blockchainPackageExplorerProvider.refresh()));
        context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.REFRESH_ENVIRONMENTS, (element: BlockchainTreeItem) => blockchainEnvironmentExplorerProvider.refresh(element)));
        context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.START_FABRIC, () => startFabricRuntime()));
        context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.STOP_FABRIC, () => stopFabricRuntime()));
        context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.RESTART_FABRIC, () => restartFabricRuntime()));
        context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.TEARDOWN_FABRIC, (treeItem: RuntimeTreeItem, force: boolean = false) => teardownFabricRuntime(treeItem, force)));
        context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.OPEN_NEW_TERMINAL, (nodeItem: NodeTreeItem) => openNewTerminal(nodeItem)));
        context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.EXPORT_CONNECTION_PROFILE, (gatewayItem: GatewayTreeItem, isConnected?: boolean) => exportConnectionProfile(gatewayItem, isConnected)));
        context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.EXPORT_CONNECTION_PROFILE_CONNECTED, (gatewayItem: GatewayTreeItem, isConnected: boolean = true) => exportConnectionProfile(gatewayItem, isConnected)));
        context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.DELETE_SMART_CONTRACT, (project: PackageTreeItem) => deleteSmartContractPackage(project)));
        context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.EXPORT_SMART_CONTRACT, (project: PackageTreeItem) => exportSmartContractPackage(project)));
        context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.IMPORT_SMART_CONTRACT, () => importSmartContractPackageCommand()));
        context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.ADD_ENVIRONMENT, () => addEnvironment()));
        context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.DELETE_ENVIRONMENT, (environmentTreeItem: FabricEnvironmentTreeItem, force: boolean = false) => deleteEnvironment(environmentTreeItem, force)));
        context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.ASSOCIATE_IDENTITY_NODE, (environmentRegistryEntry: FabricEnvironmentRegistryEntry, node: FabricNode) => associateIdentityWithNode(false, environmentRegistryEntry, node)));
        context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.IMPORT_NODES_TO_ENVIRONMENT, (environmentRegistryEntry: FabricEnvironmentRegistryEntry, fromAddEnvironment: boolean = false) => importNodesToEnvironment(environmentRegistryEntry, fromAddEnvironment)));
        context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.REPLACE_ASSOCIATED_IDENTITY, async (nodeTreeItem: NodeTreeItem) => {
            if (nodeTreeItem) {
                await associateIdentityWithNode(true, nodeTreeItem.environmentRegistryEntry, nodeTreeItem.node);
            } else {
                await associateIdentityWithNode(true, undefined, undefined);
            }
        }));
        context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.DELETE_NODE, (nodeTreeItem: NodeTreeItem) => deleteNode(nodeTreeItem)));
        context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT, (fabricEnvironmentRegistryEntry: FabricEnvironmentRegistryEntry) => fabricEnvironmentConnect(fabricEnvironmentRegistryEntry)));
        context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.DISCONNECT_ENVIRONMENT, () => FabricEnvironmentManager.instance().disconnect()));
        context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.INSTALL_SMART_CONTRACT, (peerTreeItem?: PeerTreeItem, peerNames?: Set<string>, chosenPackge?: PackageRegistryEntry) => installSmartContract(peerTreeItem, peerNames, chosenPackge)));
        context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT, (channelTreeItem?: ChannelTreeItem, channelName?: string, peerNames?: Array<string>) => instantiateSmartContract(channelTreeItem, channelName, peerNames)));
        context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.TEST_ALL_SMART_CONTRACT, (chaincode: InstantiatedContractTreeItem) => testSmartContract(true, chaincode)));
        context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.TEST_SMART_CONTRACT, (treeItem: ContractTreeItem | InstantiatedTreeItem) => testSmartContract(false, treeItem)));
        context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.SUBMIT_TRANSACTION, (transactionTreeItem?: InstantiatedTreeItem | TransactionTreeItem, channelName?: string, smartContract?: string, transactionObject?: any) => submitTransaction(false, transactionTreeItem, channelName, smartContract, transactionObject)));
        context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.EVALUATE_TRANSACTION, (transactionTreeItem?: InstantiatedTreeItem | TransactionTreeItem, channelName?: string, smartContract?: string, transactionObject?: any) => submitTransaction(true, transactionTreeItem, channelName, smartContract, transactionObject)));
        context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT, (instantiatedChainCodeTreeItem?: InstantiatedTreeItem, channelName?: string, peerNames?: Array<string>) => upgradeSmartContract(instantiatedChainCodeTreeItem, channelName, peerNames)));
        context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.CREATE_NEW_IDENTITY, (certificateAuthorityTreeItem?: CertificateAuthorityTreeItem) => createNewIdentity(certificateAuthorityTreeItem)));
        context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.REFRESH_WALLETS, (element: BlockchainTreeItem) => blockchainWalletExplorerProvider.refresh(element)));
        context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.ADD_WALLET, (createIdentity: boolean) => addWallet(createIdentity)));
        context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.DEBUG_COMMAND_LIST, (commandName?: string) => debugCommandList(commandName)));
        context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.REMOVE_WALLET, (treeItem: WalletTreeItem) => removeWallet(treeItem)));
        context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.DELETE_IDENTITY, (treeItem: IdentityTreeItem) => deleteIdentity(treeItem)));
        context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.ASSOCIATE_WALLET, (treeItem: GatewayDissociatedTreeItem) => associateWallet(treeItem)));
        context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.DISSOCIATE_WALLET, (treeItem: GatewayAssociatedTreeItem) => dissociateWallet(treeItem)));
        context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.EXPORT_WALLET, (treeItem?: WalletTreeItem) => exportWallet(treeItem)));

        context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.OPEN_HOME_PAGE, async () => {
            const homeView: HomeView = new HomeView(context);
            await homeView.openView(true);
        }));

        context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.OPEN_SAMPLE_PAGE, async (repoName: string, sampleName: string) => {
            const sampleView: SampleView = new SampleView(context, repoName, sampleName);
            await sampleView.openView(false);
        }));

        context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.OPEN_TUTORIAL_GALLERY, async () => {
            const tutorialGalleryView: TutorialGalleryView = new TutorialGalleryView(context);
            await tutorialGalleryView.openView(true);
        }));

        context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.OPEN_TUTORIAL_PAGE, async (repoName: string, tutorialName: string) => {
            const tutorialView: TutorialView = new TutorialView(repoName, tutorialName);
            await tutorialView.openView();
        }));

        context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.OPEN_TRANSACTION_PAGE, async (treeItem: InstantiatedTreeItem) => {
            await openTransactionView(treeItem);
        }));

        FabricWalletRegistry.instance().on(FileRegistry.EVENT_NAME, (async (): Promise<void> => {
            try {
                await vscode.commands.executeCommand(ExtensionCommands.REFRESH_WALLETS);
            } catch (error) {
                // ignore error this only happens in tests
            }
        }));

        FabricGatewayRegistry.instance().on(FileRegistry.EVENT_NAME, (async (): Promise<void> => {
            try {
                await vscode.commands.executeCommand(ExtensionCommands.REFRESH_GATEWAYS);
            } catch (error) {
                // ignore error this only happens in tests
            }
        }));

        FabricEnvironmentRegistry.instance().on(FileRegistry.EVENT_NAME, (async (): Promise<void> => {
            try {
                await vscode.commands.executeCommand(ExtensionCommands.REFRESH_ENVIRONMENTS);
            } catch (error) {
                // ignore error this only happens in tests
            }
        }));

        // We need to do context.subscriptions.push, otherwise this handler will register multiple times
        context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(async (e: any) => {

            if (e.affectsConfiguration(SettingConfigurations.EXTENSION_LOCAL_FABRIC)) {

                const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();

                const localFabricEnabled: boolean = ExtensionUtil.getExtensionLocalFabricSetting();
                const runtime: FabricRuntime = FabricRuntimeManager.instance().getRuntime();

                let isGenerated: boolean;

                if (runtime) {
                    isGenerated = await runtime.isGenerated();
                } else {
                    isGenerated = false;
                }

                if (!localFabricEnabled) {
                    // Just got set to false
                    outputAdapter.log(LogType.INFO, `${FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME} functionality set to 'false'.`);
                    try {
                        // If Local Fabric is running, warn the user that it will be torndown
                        let isRunning: boolean = false;
                        if (runtime) {
                            isRunning = await FabricRuntimeManager.instance().getRuntime().isRunning();
                        }
                        if (isRunning || isGenerated) {
                            const reallyDoIt: boolean = await UserInputUtil.showConfirmationWarningMessage(`Toggling this feature will remove the world state and ledger data for the ${FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME} runtime. Do you want to continue?`);
                            if (!reallyDoIt) {
                                // log setting variable back
                                outputAdapter.log(LogType.WARNING, `Changed ${FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME} functionality back to 'true'.`);
                                await vscode.workspace.getConfiguration().update(SettingConfigurations.EXTENSION_LOCAL_FABRIC, true, vscode.ConfigurationTarget.Global);
                                return;
                            }
                            await vscode.commands.executeCommand(ExtensionCommands.TEARDOWN_FABRIC, undefined, true);
                        }

                        // If disabled, delete the local environment, gateway and wallet
                        await FabricEnvironmentRegistry.instance().delete(FabricRuntimeUtil.LOCAL_FABRIC, true);
                        await FabricGatewayRegistry.instance().delete(FabricRuntimeUtil.LOCAL_FABRIC, true);
                        await FabricWalletRegistry.instance().delete(FabricWalletUtil.LOCAL_WALLET, true);
                        await vscode.commands.executeCommand('setContext', 'local-fabric-enabled', false);

                    } catch (error) {
                        outputAdapter.log(LogType.ERROR, `Error whilst toggling ${FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME} functionality to false: ${error.message}`, `Error whilst toggling ${FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME} functionality to false: ${error.toString()}`);
                    }

                } else {
                    // Just got set to true
                    outputAdapter.log(LogType.INFO, `${FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME} functionality set to 'true'.`);
                    try {
                        const bypassPreReqs: boolean = vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_BYPASS_PREREQS);
                        let dependenciesInstalled: boolean = true;

                        if (!bypassPreReqs) {
                            const dependencyManager: DependencyManager = DependencyManager.instance();
                            dependenciesInstalled = await dependencyManager.hasPreReqsInstalled();
                            if (!dependenciesInstalled) {

                                const ctx: vscode.ExtensionContext = GlobalState.getExtensionContext();

                                this.disposeExtension(ctx);
                                await this.registerOpenPreReqsCommand(ctx);
                                const tempCommandRegistry: TemporaryCommandRegistry = TemporaryCommandRegistry.instance();

                                tempCommandRegistry.createTempCommands(false, ExtensionCommands.OPEN_PRE_REQ_PAGE);
                                await vscode.commands.executeCommand(ExtensionCommands.OPEN_PRE_REQ_PAGE);
                                return;
                            }
                        }

                        if (!isGenerated && dependenciesInstalled) {
                            outputAdapter.log(LogType.INFO, undefined, 'Initializing local runtime manager');
                            await FabricRuntimeManager.instance().initialize();
                        }
                        await vscode.commands.executeCommand('setContext', 'local-fabric-enabled', true);
                    } catch (error) {
                        outputAdapter.log(LogType.ERROR, `Error whilst toggling ${FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME} functionality to true: ${error.message}`, `Error whilst toggling ${FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME} functionality to true: ${error.toString()}`);
                    }
                }

                // Show/Hide Local Fabric tree items
                await vscode.commands.executeCommand(ExtensionCommands.REFRESH_ENVIRONMENTS);
                await vscode.commands.executeCommand(ExtensionCommands.REFRESH_GATEWAYS);
                await vscode.commands.executeCommand(ExtensionCommands.REFRESH_WALLETS);
            }
        }));

        vscode.debug.onDidChangeActiveDebugSession(async (e: vscode.DebugSession) => {
            // Listen for any changes to the debug state.
            if (e && e.configuration && e.configuration.debugEvent === FabricDebugConfigurationProvider.debugEvent) {
                await vscode.commands.executeCommand('setContext', 'blockchain-debug', true);
                if (e.configuration.env && e.configuration.env.CORE_CHAINCODE_ID_NAME) {
                    const smartContractName: string = e.configuration.env.CORE_CHAINCODE_ID_NAME.split(':')[0];
                    const smartContractVersion: string = e.configuration.env.CORE_CHAINCODE_ID_NAME.split(':')[1];
                    const instantiatedSmartContract: FabricChaincode = await FabricDebugConfigurationProvider.getInstantiatedChaincode(smartContractName);

                    if (!instantiatedSmartContract) {
                        await vscode.commands.executeCommand(ExtensionCommands.DEBUG_COMMAND_LIST, ExtensionCommands.INSTANTIATE_SMART_CONTRACT);
                    } else if (smartContractVersion !== instantiatedSmartContract.version) {
                        await vscode.commands.executeCommand(ExtensionCommands.DEBUG_COMMAND_LIST, ExtensionCommands.UPGRADE_SMART_CONTRACT);
                    }
                }
                // Show any new transactions added to a contract, after 'reload debug' is executed.
                await vscode.commands.executeCommand(ExtensionCommands.REFRESH_GATEWAYS);
            } else {
                // debug has stopped so set the context to false
                await vscode.commands.executeCommand('setContext', 'blockchain-debug', false);
            }
        });

        context = await this.registerOpenPreReqsCommand(context);

        const packageJson: any = ExtensionUtil.getPackageJSON();

        if (packageJson.production === true) {
            context.subscriptions.push(Reporter.instance());
        }

        return context;
    }

    public static async setupLocalRuntime(version: string): Promise<void> {
        const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
        outputAdapter.log(LogType.INFO, undefined, 'Migrating local runtime manager');
        await FabricRuntimeManager.instance().migrate(version);

        outputAdapter.log(LogType.INFO, undefined, 'Initializing local runtime manager');
        await FabricRuntimeManager.instance().initialize();
    }

    public static async setupCommands(): Promise<void> {
        const dependencyManager: DependencyManager = DependencyManager.instance();
        const hasNativeDependenciesInstalled: boolean = await dependencyManager.hasNativeDependenciesInstalled();
        const packageJSON: any = await ExtensionUtil.getPackageJSON();
        if (hasNativeDependenciesInstalled && packageJSON.activationEvents.length === 1) {
            await dependencyManager.rewritePackageJson();
        }
        if (!hasNativeDependenciesInstalled) {
            await dependencyManager.installNativeDependencies();
        }

        const extensionData: ExtensionData = GlobalState.get();
        const localFabricEnabled: boolean = this.getExtensionLocalFabricSetting();
        if (localFabricEnabled) {
            await ExtensionUtil.setupLocalRuntime(extensionData.version);
        } else {
            await FabricEnvironmentRegistry.instance().delete(FabricRuntimeUtil.LOCAL_FABRIC, true);
            await FabricGatewayRegistry.instance().delete(FabricRuntimeUtil.LOCAL_FABRIC, true);
            await FabricWalletRegistry.instance().delete(FabricWalletUtil.LOCAL_WALLET, true);
        }

        const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();

        const tempCommandRegistry: TemporaryCommandRegistry = TemporaryCommandRegistry.instance();
        outputAdapter.log(LogType.INFO, undefined, 'Restoring command registry');
        tempCommandRegistry.restoreCommands();

        outputAdapter.log(LogType.INFO, undefined, 'Registering commands');
        const context: vscode.ExtensionContext = GlobalState.getExtensionContext();
        await ExtensionUtil.registerCommands(context);

        outputAdapter.log(LogType.INFO, undefined, 'Execute stored commands in the registry');
        await tempCommandRegistry.executeStoredCommands();
    }

    public static async completeActivation(extensionUpdated?: boolean): Promise<void> {
        const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();

        const extensionData: ExtensionData = GlobalState.get();

        if (extensionUpdated === undefined) {
            extensionUpdated = currentExtensionVersion !== extensionData.version;
        }

        // Only popup if the extension has been updated.
        if (extensionUpdated) {
            outputAdapter.log(LogType.INFO, 'IBM Blockchain Platform Extension activated');
        } else {
            outputAdapter.log(LogType.INFO, null, 'IBM Blockchain Platform Extension activated');
        }

        // Detects if the user wants to have the Home page appear the first time they click on the extension's icon
        // Only do this if the extension has been updated.
        const showPage: boolean = vscode.workspace.getConfiguration().get(SettingConfigurations.HOME_SHOW_ON_STARTUP);
        if (extensionUpdated && showPage) {
            // Open the Home page
            await vscode.commands.executeCommand(ExtensionCommands.OPEN_HOME_PAGE);
        }

        // If necessary, we want to open up the release notes last, so they show first.
        if (extensionUpdated) {
            try {

                // Open up Release Notes markdown
                const getExtensionPath: string = this.getExtensionPath();
                const releaseNotes: string = path.join(getExtensionPath, 'RELEASE-NOTES.md');
                const uri: vscode.Uri = vscode.Uri.file(releaseNotes);

                await vscode.commands.executeCommand('markdown.showPreview', uri);
            } catch (error) {
                outputAdapter.log(LogType.ERROR, `Unable to open release notes: ${error.toString()}`);
            }
        }

        // Check if there is a newer version of the generator available
        // This needs to be done as a seperate call to make sure the dependencies have been installed
        const generatorVersion: string = dependencies['generator-fabric'];
        if (generatorVersion !== extensionData.generatorVersion) {
            // If the latest generator version is not equal to the previous used version

            const runtime: FabricRuntime = FabricRuntimeManager.instance().getRuntime();
            let generated: boolean = false;
            if (runtime) {
                generated = await runtime.isGenerated();
            }

            let updateGeneratorVersion: boolean = true;
            if (generated) {
                // We know the user has a generated Fabric using an older version, so we should give the user the option to teardown either now or later
                const response: boolean = await UserInputUtil.showConfirmationWarningMessage(`The ${FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME} configuration is out of date and must be torn down before updating. Do you want to teardown your ${FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME} now?`);
                if (response) {
                    const isRunning: boolean = await runtime.isRunning();

                    // Teardown and remove generated Fabric
                    await vscode.commands.executeCommand(ExtensionCommands.TEARDOWN_FABRIC, undefined, true);

                    if (isRunning) {
                        // Start the Fabric again
                        await vscode.commands.executeCommand(ExtensionCommands.START_FABRIC);
                    }
                } else {
                    // Assume they will teardown later
                    updateGeneratorVersion = false;
                }
            }
            // If they don't have a Fabric generated, we can update the version immediately

            // Update the generator version
            if (updateGeneratorVersion) {
                extensionData.generatorVersion = generatorVersion;
                await GlobalState.update(extensionData);
            }
        }

        const localFabricEnabled: boolean = this.getExtensionLocalFabricSetting();
        if (localFabricEnabled) {
            await vscode.commands.executeCommand('setContext', 'local-fabric-enabled', true);
        } else {
            await vscode.commands.executeCommand('setContext', 'local-fabric-enabled', false);
        }
    }

    /*
 * Needed for testing
 */
    public static getBlockchainGatewayExplorerProvider(): BlockchainGatewayExplorerProvider {
        return blockchainGatewayExplorerProvider;
    }

    public static getBlockchainEnvironmentExplorerProvider(): BlockchainEnvironmentExplorerProvider {
        return blockchainEnvironmentExplorerProvider;
    }

    public static getBlockchainPackageExplorerProvider(): BlockchainPackageExplorerProvider {
        return blockchainPackageExplorerProvider;
    }

    public static getBlockchainWalletExplorerProvider(): BlockchainWalletExplorerProvider {
        return blockchainWalletExplorerProvider;
    }

    public static disposeExtension(context: vscode.ExtensionContext): void {
        // remove old subscriptions
        context.subscriptions.forEach((item: vscode.Disposable) => {
            if (item) {
                item.dispose();
            }
        });
        context.subscriptions.splice(0, context.subscriptions.length);
    }

    public static async registerOpenPreReqsCommand(context: vscode.ExtensionContext): Promise<vscode.ExtensionContext> {
        context.subscriptions.push(vscode.commands.registerCommand(ExtensionCommands.OPEN_PRE_REQ_PAGE, async () => {
            const preReqView: PreReqView = new PreReqView(context);
            await preReqView.openView(true);
        }));

        return context;
    }

    public static getExtensionLocalFabricSetting(): boolean {
        return vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_LOCAL_FABRIC);
    }

    private static getExtension(): vscode.Extension<any> {
        return vscode.extensions.getExtension(EXTENSION_ID);
    }
}
