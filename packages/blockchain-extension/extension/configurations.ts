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

import * as vscode from 'vscode';
import * as path from 'path';

// tslint:disable max-classes-per-file
export class SettingConfigurations {

    // FABRIC CONFIGURATIONS
    static readonly FABRIC_RUNTIME: string = 'ibm-blockchain-platform.v2.fabric.runtime';
    static readonly FABRIC_CLIENT_TIMEOUT: string = 'ibm-blockchain-platform.fabric.client.timeout';
    static readonly FABRIC_CHAINCODE_TIMEOUT: string = 'ibm-blockchain-platform.fabric.chaincode.timeout';

    // EXTENSION CONFIGURATIONS
    static readonly EXTENSION_DIRECTORY: string = 'ibm-blockchain-platform.ext.directory';
    static readonly EXTENSION_BYPASS_PREREQS: string = 'ibm-blockchain-platform.ext.bypassPreReqs';
    static readonly EXTENSION_LOCAL_FABRIC: string = 'ibm-blockchain-platform.ext.enableLocalFabric';
    static readonly EXTENSION_REQUIRE_CLOUD_LOGIN: string = 'ibm-blockchain-platform.ext.requireCloudLogin';

    // HOME CONFIGURATIONS
    static readonly HOME_SHOW_ON_STARTUP: string = 'ibm-blockchain-platform.home.showOnStartup';
    static readonly HOME_SHOW_ON_NEXT_ACTIVATION: string = 'ibm-blockchain-platform.home.showOnNextActivation';

    static getExtensionDir(): string {
        const extDir: string = vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_DIRECTORY);
        return path.join(extDir, 'v2');
    }
}
