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

export class ExtensionCommands {

    // PACKAGE VIEW
    static readonly DELETE_SMART_CONTRACT: string = 'aPackagesExplorer.deleteSmartContractPackageEntry';
    static readonly EXPORT_SMART_CONTRACT: string = 'aPackagesExplorer.exportSmartContractPackageEntry';
    static readonly REFRESH_PACKAGES: string = 'aPackagesExplorer.refreshEntry';
    static readonly PACKAGE_SMART_CONTRACT: string = 'aPackagesExplorer.packageSmartContractProjectEntry';
    static readonly IMPORT_SMART_CONTRACT: string = 'aPackagesExplorer.importSmartContractPackageEntry';
    static readonly CREATE_SMART_CONTRACT_PROJECT: string = 'aPackagesExplorer.createSmartContractProjectEntry';
    static readonly VIEW_PACKAGE_INFORMATION: string = 'aPackagesExplorer.viewPackageInformationEntry';

    // ENVIRONMENT VIEW
    static readonly ADD_ENVIRONMENT: string = 'environmentExplorer.addEnvironmentEntry';
    static readonly IMPORT_NODES_TO_ENVIRONMENT: string = 'environmentExplorer.importNodesEntry';
    static readonly EDIT_NODE_FILTERS: string = 'environmentExplorer.editNodeFiltersEntry';
    static readonly DELETE_ENVIRONMENT: string = 'environmentExplorer.deleteEnvironmentEntry';
    static readonly DELETE_ENVIRONMENT_SHORT: string = 'environmentExplorer.deleteEnvironmentEntryShort';
    static readonly ASSOCIATE_IDENTITY_NODE: string = 'environmentExplorer.associateIdentityNodeEntry';
    static readonly REPLACE_ASSOCIATED_IDENTITY: string = 'environmentExplorer.replaceAssociatedIdentityEntry';
    static readonly DELETE_NODE: string = 'environmentExplorer.deleteNodeEntry';
    static readonly HIDE_NODE: string = 'environmentExplorer.hideNodeEntry';
    static readonly CONNECT_TO_ENVIRONMENT: string = 'environmentExplorer.connectEntry';
    static readonly DISCONNECT_ENVIRONMENT: string = 'environmentExplorer.disconnectEntry';
    static readonly INSTALL_SMART_CONTRACT: string = 'environmentExplorer.installSmartContractEntry';
    static readonly INSTANTIATE_SMART_CONTRACT: string = 'environmentExplorer.instantiateSmartContractEntry';
    static readonly REFRESH_ENVIRONMENTS: string = 'environmentExplorer.refreshEntry';
    static readonly RESTART_FABRIC: string = 'environmentExplorer.restartFabricRuntime';
    static readonly RESTART_FABRIC_SHORT: string = 'environmentExplorer.restartFabricRuntimeShort';
    static readonly START_FABRIC: string = 'environmentExplorer.startFabricRuntime';
    static readonly START_FABRIC_SHORT: string = 'environmentExplorer.startFabricRuntimeShort';
    static readonly STOP_FABRIC: string = 'environmentExplorer.stopFabricRuntime';
    static readonly STOP_FABRIC_SHORT: string = 'environmentExplorer.stopFabricRuntimeShort';
    static readonly TEARDOWN_FABRIC: string = 'environmentExplorer.teardownFabricRuntime';
    static readonly TEARDOWN_FABRIC_SHORT: string = 'environmentExplorer.teardownFabricRuntimeShort';
    static readonly UPGRADE_SMART_CONTRACT: string = 'environmentExplorer.upgradeSmartContractEntry';
    static readonly CREATE_NEW_IDENTITY: string = 'environmentExplorer.createNewIdentityEntry';
    static readonly LOG_IN_AND_DISCOVER: string = 'environmentExplorer.logInAndDiscover';
    static readonly OPEN_CONSOLE_IN_BROWSER: string = 'environmentExplorer.openConsoleInBrowserEntry';

    // GATEWAY VIEW
    static readonly ADD_GATEWAY: string = 'gatewaysExplorer.addGatewayEntry';
    static readonly CONNECT_TO_GATEWAY: string = 'gatewaysExplorer.connectEntry';
    static readonly DELETE_GATEWAY: string = 'gatewaysExplorer.deleteGatewayEntry';
    static readonly DISCONNECT_GATEWAY: string = 'gatewaysExplorer.disconnectEntry';
    static readonly EDIT_GATEWAY: string = 'gatewaysExplorer.editGatewayEntry';
    static readonly REFRESH_GATEWAYS: string = 'gatewaysExplorer.refreshEntry';
    static readonly SUBMIT_TRANSACTION: string = 'gatewaysExplorer.submitTransactionEntry';
    static readonly EVALUATE_TRANSACTION: string = 'gatewaysExplorer.evaluateTransactionEntry';
    static readonly TEST_SMART_CONTRACT: string = 'gatewaysExplorer.testSmartContractEntry';
    static readonly TEST_ALL_SMART_CONTRACT: string = 'gatewaysExplorer.testAllSmartContractEntry';
    static readonly ASSOCIATE_WALLET: string = 'gatewaysExplorer.associateWallet';
    static readonly DISSOCIATE_WALLET: string = 'gatewaysExplorer.dissociateWallet';
    static readonly EXPORT_CONNECTION_PROFILE: string = 'gatewaysExplorer.exportConnectionProfileEntry';
    static readonly EXPORT_CONNECTION_PROFILE_CONNECTED: string = 'gatewaysExplorer.exportConnectionProfileConnectedEntry';
    static readonly ASSOCIATE_TRANSACTION_DATA_DIRECTORY: string = 'gatewaysExplorer.associateTransactionDataDirectoryEntry';
    static readonly DISSOCIATE_TRANSACTION_DATA_DIRECTORY: string = 'gatewaysExplorer.dissociateTransactionDataDirectoryEntry';
    static readonly SUBSCRIBE_TO_EVENT: string = 'gatewaysExplorer.subscribeToEventEntry';
    static readonly EXPORT_APP_DATA: string = 'gatewaysExplorer.exportAppData';

    // WALLET VIEW
    static readonly REFRESH_WALLETS: string = 'walletExplorer.refreshEntry';
    static readonly ADD_WALLET: string = 'walletExplorer.addWalletEntry';
    static readonly ADD_WALLET_IDENTITY: string = 'walletExplorer.addWalletIdentityEntry';
    static readonly REMOVE_WALLET: string = 'walletExplorer.removeWalletEntry';
    static readonly DELETE_IDENTITY: string = 'walletExplorer.deleteIdentityEntry';
    static readonly EXPORT_WALLET: string = 'walletExplorer.exportWalletEntry';

    // NO VIEW
    static readonly OPEN_HOME_PAGE: string = 'extensionHome.open';
    static readonly OPEN_PRE_REQ_PAGE: string = 'preReq.open';
    static readonly OPEN_RELEASE_NOTES: string = 'releaseNotes.open';
    static readonly OPEN_SAMPLE_PAGE: string = 'sample.open';
    static readonly OPEN_TUTORIAL_GALLERY: string = 'tutorialGallery.open';
    static readonly OPEN_TUTORIAL_PAGE: string = 'tutorial.open';
    static readonly OPEN_TRANSACTION_PAGE: string = 'transactionPage.open';
    static readonly DEBUG_COMMAND_LIST: string = 'debug.commandList';
    static readonly SAVE_TUTORIAL_AS_PDF: string = 'tutorial.save';
    static readonly MANAGE_FEATURE_FLAGS: string = 'manageFeatureFlags';
    static readonly OPEN_NEW_INSTANCE_LINK: string = 'openNewInstanceLink';
    static readonly DELETE_DIRECTORY: string = 'deleteExtensionDirectory';
}
