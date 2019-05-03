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

    // LOCAL OPS VIEW
    static readonly INSTALL_SMART_CONTRACT: string = 'aRuntimeOpsExplorer.installSmartContractEntry';
    static readonly INSTANTIATE_SMART_CONTRACT: string = 'aRuntimeOpsExplorer.instantiateSmartContractEntry';
    static readonly OPEN_NEW_TERMINAL: string = 'aRuntimeOpsExplorer.openNewTerminal';
    static readonly REFRESH_LOCAL_OPS: string = 'aRuntimeOpsExplorer.refreshEntry';
    static readonly RESTART_FABRIC: string = 'aRuntimeOpsExplorer.restartFabricRuntime';
    static readonly START_FABRIC: string = 'aRuntimeOpsExplorer.startFabricRuntime';
    static readonly STOP_FABRIC: string = 'aRuntimeOpsExplorer.stopFabricRuntime';
    static readonly TEARDOWN_FABRIC: string = 'aRuntimeOpsExplorer.teardownFabricRuntime';
    static readonly TOGGLE_FABRIC_DEV_MODE: string = 'aRuntimeOpsExplorer.toggleFabricRuntimeDevMode';
    static readonly UPGRADE_SMART_CONTRACT: string = 'aRuntimeOpsExplorer.upgradeSmartContractEntry';
    static readonly CREATE_NEW_IDENTITY: string = 'aRuntimeOpsExplorer.createNewIdentityEntry';
    static readonly EXPORT_CONNECTION_PROFILE: string = 'aRuntimeOpsExplorer.exportConnectionProfileEntry';

    // GATEWAY VIEW
    static readonly ADD_GATEWAY: string = 'gatewaysExplorer.addGatewayEntry';
    static readonly CONNECT: string = 'gatewaysExplorer.connectEntry';
    static readonly DELETE_GATEWAY: string = 'gatewaysExplorer.deleteGatewayEntry';
    static readonly DISCONNECT: string = 'gatewaysExplorer.disconnectEntry';
    static readonly EDIT_GATEWAY: string = 'gatewaysExplorer.editGatewayEntry';
    static readonly REFRESH_GATEWAYS: string = 'gatewaysExplorer.refreshEntry';
    static readonly SUBMIT_TRANSACTION: string = 'gatewaysExplorer.submitTransactionEntry';
    static readonly EVALUATE_TRANSACTION: string = 'gatewaysExplorer.evaluateTransactionEntry';
    static readonly TEST_SMART_CONTRACT: string = 'gatewaysExplorer.testSmartContractEntry';
    static readonly TEST_ALL_SMART_CONTRACT: string = 'gatewaysExplorer.testAllSmartContractEntry';
    static readonly ASSOCIATE_WALLET: string = 'gatewaysExplorer.associateWallet';
    static readonly DISSOCIATE_WALLET: string = 'gatewaysExplorer.dissociateWallet';

    // WALLET VIEW
    static readonly REFRESH_WALLETS: string = 'walletExplorer.refreshEntry';
    static readonly ADD_WALLET: string = 'walletExplorer.addWalletEntry';
    static readonly ADD_WALLET_IDENTITY: string = 'walletExplorer.addWalletIdentityEntry';
    static readonly EDIT_WALLET: string = 'walletExplorer.editWalletEntry';
    static readonly REMOVE_WALLET: string = 'walletExplorer.removeWalletEntry';
    static readonly DELETE_IDENTITY: string = 'walletExplorer.deleteIdentityEntry';

    // NO VIEW
    static readonly OPEN_HOME_PAGE: string = 'extensionHome.open';
    static readonly OPEN_SAMPLE_PAGE: string = 'sample.open';
    static readonly OPEN_TUTORIAL_GALLERY: string = 'tutorialGallery.open';
    static readonly OPEN_TUTORIAL_PAGE: string = 'tutorial.open';
    static readonly DEBUG_COMMAND_LIST: string = 'debug.commandList';
}
