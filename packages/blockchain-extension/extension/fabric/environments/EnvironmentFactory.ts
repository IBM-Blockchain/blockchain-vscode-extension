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
import { FabricEnvironmentRegistryEntry, EnvironmentType, FabricEnvironment, FileSystemUtil, FileConfigurations, MicrofabEnvironment } from 'ibm-blockchain-platform-common';
import * as path from 'path';
import { SettingConfigurations } from '../../configurations';
import { LocalMicroEnvironment } from './LocalMicroEnvironment';
import { LocalMicroEnvironmentManager } from './LocalMicroEnvironmentManager';
import { LocalEnvironment } from './LocalEnvironment';

export class EnvironmentFactory {

    public static getEnvironment(environmentRegistryEntry: FabricEnvironmentRegistryEntry): FabricEnvironment | LocalMicroEnvironment | MicrofabEnvironment {
        const name: string = environmentRegistryEntry.name;
        if (!name) {
            throw new Error('Unable to get environment, a name must be provided');
        }

        let managedRuntime: boolean = environmentRegistryEntry.managedRuntime;
        if (managedRuntime === undefined) {
            managedRuntime = false;
        }

        const type: EnvironmentType = environmentRegistryEntry.environmentType;

        if (managedRuntime && type === EnvironmentType.LOCAL_ENVIRONMENT) {
            const extDir: string = SettingConfigurations.getExtensionDir();
            const resolvedExtDir: string = FileSystemUtil.getDirPath(extDir);
            const envPath: string = path.join(resolvedExtDir, FileConfigurations.FABRIC_ENVIRONMENTS, name);

            const runtime: LocalEnvironment = new LocalEnvironment(name, envPath);
            return runtime;
        } else if (type === EnvironmentType.LOCAL_MICROFAB_ENVIRONMENT) {
            const runtime: LocalMicroEnvironment = LocalMicroEnvironmentManager.instance().getRuntime(name);
            return runtime;
        } else if (type === EnvironmentType.MICROFAB_ENVIRONMENT) {
            return new MicrofabEnvironment(name, environmentRegistryEntry.environmentDirectory, environmentRegistryEntry.url);
        } else {
            // Safest to assume that it's a non-managed remote environment
            const extDir: string = SettingConfigurations.getExtensionDir();
            const resolvedExtDir: string = FileSystemUtil.getDirPath(extDir);
            const envDir: string = path.join(resolvedExtDir, FileConfigurations.FABRIC_ENVIRONMENTS, name);
            return new FabricEnvironment(name, envDir);
        }
    }
}
