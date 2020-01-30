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
import { ManagedAnsibleEnvironment } from './ManagedAnsibleEnvironment';
import { FabricRuntimeUtil, FabricEnvironmentRegistryEntry, EnvironmentType, FabricEnvironment, FileSystemUtil, AnsibleEnvironment, FileConfigurations } from 'ibm-blockchain-platform-common';
import { LocalEnvironment } from './LocalEnvironment';
import { LocalEnvironmentManager } from './LocalEnvironmentManager';
import * as vscode from 'vscode';
import * as path from 'path';
import { SettingConfigurations } from '../../../configurations';
import { ManagedAnsibleEnvironmentManager } from './ManagedAnsibleEnvironmentManager';

export class EnvironmentFactory {

    public static getEnvironment(environmentRegistryEntry: FabricEnvironmentRegistryEntry): FabricEnvironment | AnsibleEnvironment | ManagedAnsibleEnvironment | LocalEnvironment {
        const name: string = environmentRegistryEntry.name;
        if (!name) {
            throw new Error('Unable to get environment, a name must be provided');
        }

        let managedRuntime: boolean = environmentRegistryEntry.managedRuntime;
        if (managedRuntime === undefined) {
            managedRuntime = false;
        }

        const type: EnvironmentType = environmentRegistryEntry.environmentType;

        if (managedRuntime && type === EnvironmentType.ANSIBLE_ENVIRONMENT && name === FabricRuntimeUtil.LOCAL_FABRIC) {
            return LocalEnvironmentManager.instance().getRuntime();
        } else if (managedRuntime && type === EnvironmentType.ANSIBLE_ENVIRONMENT) {
            return ManagedAnsibleEnvironmentManager.instance().ensureRuntime(name, environmentRegistryEntry.environmentDirectory);
        } else if (!managedRuntime && type === EnvironmentType.ANSIBLE_ENVIRONMENT) {
            return new AnsibleEnvironment(name, environmentRegistryEntry.environmentDirectory);
        } else {
            // Safest to assume that it's a non-managed remote environment
            const extDir: string = vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_DIRECTORY);
            const resolvedExtDir: string = FileSystemUtil.getDirPath(extDir);
            const envDir: string = path.join(resolvedExtDir, FileConfigurations.FABRIC_ENVIRONMENTS, name);
            return new FabricEnvironment(name, envDir);
        }
    }
}
