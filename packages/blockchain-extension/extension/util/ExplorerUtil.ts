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
'use strict';
import * as vscode from 'vscode';
import * as path from 'path';
import { FabricEnvironmentRegistryEntry, FabricEnvironmentRegistry, EnvironmentType } from 'ibm-blockchain-platform-common';

export class ExplorerUtil {
    public static async getGroupIcon(environmentName: string): Promise<{ light: string | vscode.Uri; dark: string | vscode.Uri }> {
        let iconName: string;
        const environmentEntry: FabricEnvironmentRegistryEntry = await FabricEnvironmentRegistry.instance().get(environmentName);
        if (environmentEntry.environmentType === EnvironmentType.LOCAL_ENVIRONMENT) {
            iconName = 'laptop.svg';
        } else if (environmentEntry.environmentType === EnvironmentType.OPS_TOOLS_ENVIRONMENT || environmentEntry.environmentType === EnvironmentType.SAAS_OPS_TOOLS_ENVIRONMENT) {
            iconName = 'ibm-cloud.svg';
        } else {
            iconName = 'network--3.svg';
        }

        return {
            light: path.join(__filename, '..', '..', '..', '..', 'resources', 'light', `${iconName}`),
            dark: path.join(__filename, '..', '..', '..', '..', 'resources', 'dark', `${iconName}`)
        };
    }
}
