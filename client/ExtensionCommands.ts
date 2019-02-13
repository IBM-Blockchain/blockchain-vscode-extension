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
    static readonly DELETE_SMART_CONTRACT: string = 'blockchainAPackageExplorer.deleteSmartContractPackageEntry';
    static readonly EXPORT_SMART_CONTRACT: string = 'blockchainAPackageExplorer.exportSmartContractPackageEntry';
    static readonly REFRESH_PACKAGES: string = 'blockchainAPackageExplorer.refreshEntry';
    static readonly PACKAGE_SMART_CONTRACT: string = 'blockchainAPackageExplorer.packageSmartContractProjectEntry';

    // LOCAL OPS VIEW
    static readonly INSTALL_SMART_CONTRACT: string = 'blockchainExplorer.installSmartContractEntry';
    static readonly INSTANTIATE_SMART_CONTRACT: string = 'blockchainExplorer.instantiateSmartContractEntry';
    static readonly OPEN_FABRIC_RUNTIME_TERMINAL: string = 'blockchainExplorer.openFabricRuntimeTerminal';
    static readonly REFRESH_LOCAL_OPS: string = 'blockchainARuntimeExplorer.refreshEntry';
    static readonly RESTART_FABRIC: string = 'blockchainExplorer.restartFabricRuntime';
    static readonly START_FABRIC: string = 'blockchainExplorer.startFabricRuntime';
    static readonly STOP_FABRIC: string = 'blockchainExplorer.stopFabricRuntime';
    static readonly TEARDOWN_FABRIC: string = 'blockchainExplorer.teardownFabricRuntime';
    static readonly TOGGLE_FABRIC_DEV_MODE: string = 'blockchainExplorer.toggleFabricRuntimeDevMode';
    static readonly UPGRADE_SMART_CONTRACT: string = 'blockchainExplorer.upgradeSmartContractEntry';

    // GATEWAY VIEW
    static readonly ADD_GATEWAY: string = 'blockchainConnectionsExplorer.addGatewayEntry';
    static readonly ADD_GATEWAY_IDENTITY: string = 'blockchainConnectionsExplorer.addGatewayIdentityEntry';
    static readonly CONNECT: string = 'blockchainConnectionsExplorer.connectEntry';
    static readonly DELETE_GATEWAY: string = 'blockchainConnectionsExplorer.deleteGatewayEntry';
    static readonly DISCONNECT: string = 'blockchainConnectionsExplorer.disconnectEntry';
    static readonly EDIT_GATEWAY: string = 'blockchainConnectionsExplorer.editGatewayEntry';
    static readonly EXPORT_CONNECTION_DETAILS: string = 'blockchainConnectionsExplorer.exportConnectionDetailsEntry';
    static readonly REFRESH_GATEWAYS: string = 'blockchainConnectionsExplorer.refreshEntry';
    static readonly SUBMIT_TRANSACTION: string = 'blockchainConnectionsExplorer.submitTransactionEntry';
    static readonly TEST_SMART_CONTRACT: string = 'blockchainConnectionsExplorer.testSmartContractEntry';

    // NO VIEW
    static readonly CREATE_SMART_CONTRACT_PROJECT: string = 'blockchain.createSmartContractProjectEntry';
    static readonly OPEN_HOME_PAGE: string = 'extensionHome.open';
    static readonly OPEN_SAMPLE_PAGE: string = 'sample.open';
}
