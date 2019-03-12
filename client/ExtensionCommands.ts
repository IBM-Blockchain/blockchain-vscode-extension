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
    static readonly OPEN_FABRIC_RUNTIME_TERMINAL: string = 'aRuntimeOpsExplorer.openFabricRuntimeTerminal';
    static readonly REFRESH_LOCAL_OPS: string = 'aRuntimeOpsExplorer.refreshEntry';
    static readonly RESTART_FABRIC: string = 'aRuntimeOpsExplorer.restartFabricRuntime';
    static readonly START_FABRIC: string = 'aRuntimeOpsExplorer.startFabricRuntime';
    static readonly STOP_FABRIC: string = 'aRuntimeOpsExplorer.stopFabricRuntime';
    static readonly TEARDOWN_FABRIC: string = 'aRuntimeOpsExplorer.teardownFabricRuntime';
    static readonly TOGGLE_FABRIC_DEV_MODE: string = 'aRuntimeOpsExplorer.toggleFabricRuntimeDevMode';
    static readonly UPGRADE_SMART_CONTRACT: string = 'aRuntimeOpsExplorer.upgradeSmartContractEntry';
    static readonly CREATE_NEW_IDENTITY: string = 'aRuntimeOpsExplorer.createNewIdentityEntry';
    static readonly EXPORT_CONNECTION_DETAILS: string = 'aRuntimeOpsExplorer.exportConnectionDetailsEntry';

    // GATEWAY VIEW
    static readonly ADD_GATEWAY: string = 'gatewaysExplorer.addGatewayEntry';
    static readonly ADD_GATEWAY_IDENTITY: string = 'gatewaysExplorer.addGatewayIdentityEntry';
    static readonly CONNECT: string = 'gatewaysExplorer.connectEntry';
    static readonly DELETE_GATEWAY: string = 'gatewaysExplorer.deleteGatewayEntry';
    static readonly DISCONNECT: string = 'gatewaysExplorer.disconnectEntry';
    static readonly EDIT_GATEWAY: string = 'gatewaysExplorer.editGatewayEntry';
    static readonly REFRESH_GATEWAYS: string = 'gatewaysExplorer.refreshEntry';
    static readonly SUBMIT_TRANSACTION: string = 'gatewaysExplorer.submitTransactionEntry';
    static readonly EVALUATE_TRANSACTION: string = 'gatewaysExplorer.evaluateTransactionEntry';
    static readonly TEST_SMART_CONTRACT: string = 'gatewaysExplorer.testSmartContractEntry';

    // NO VIEW
    static readonly OPEN_HOME_PAGE: string = 'extensionHome.open';
    static readonly OPEN_SAMPLE_PAGE: string = 'sample.open';
}
