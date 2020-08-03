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
// tslint:disable:member-ordering

import * as vscode from 'vscode';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { LogType } from 'ibm-blockchain-platform-common';

export class ExtensionData {
    public activationCount: number;
    public version: string;
    public migrationCheck: number;
    public generatorVersion: string;
    public preReqPageShown: boolean;
    public dockerForWindows: boolean;
    public createOneOrgLocalFabric: boolean;
    public deletedOneOrgLocalFabric: boolean;
}

export const EXTENSION_DATA_KEY: string = 'ibm-blockchain-platform-extension-data';

export const DEFAULT_EXTENSION_DATA: ExtensionData = {
    activationCount: 0,
    version: null,
    migrationCheck: 0,
    generatorVersion: null, // Used to check if the generator needs updating
    preReqPageShown: false, // The very first time the extension is installed, the prereq page should be shown,
    dockerForWindows: false, // Has the user agreed to configure Windows containers to use Linux (default)
    createOneOrgLocalFabric: true, // Should we create the '1 Org Local Fabric' environment?
    deletedOneOrgLocalFabric: false // Has the user deleted the '1 Org Local Fabric' environment?
};

// tslint:disable-next-line: max-classes-per-file
export class GlobalState {
    public static context: vscode.ExtensionContext;

    public static getExtensionContext(): vscode.ExtensionContext {
        return GlobalState.context;
    }

    public static setExtensionContext(context: vscode.ExtensionContext): void {
        GlobalState.context = context;
    }

    public static get(): ExtensionData {
        try {
            const extensionData: ExtensionData = GlobalState.context.globalState.get<ExtensionData>(EXTENSION_DATA_KEY, DEFAULT_EXTENSION_DATA);
            return extensionData;
        } catch (error) {
            const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
            outputAdapter.log(LogType.ERROR, `Unable to get extension's global state: ${error.message}`, `Unable to get extension's global state: ${error.toString()}`);
            throw error;
        }
    }

    public static async update(extensionData: ExtensionData): Promise<void> {
        try {
            await GlobalState.context.globalState.update(EXTENSION_DATA_KEY, extensionData);
        } catch (error) {
            const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
            outputAdapter.log(LogType.ERROR, `Unable to update extension's global state: ${error.message}`, `Unable to update extension's global state: ${error.toString()}`);
            throw error;
        }
    }

    public static async reset(): Promise<void> {
        await this.update(DEFAULT_EXTENSION_DATA);
    }
}
