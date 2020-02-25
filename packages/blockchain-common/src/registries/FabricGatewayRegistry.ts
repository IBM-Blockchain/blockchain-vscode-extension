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

import * as fs from 'fs-extra';
import * as path from 'path';
import { FabricGatewayRegistryEntry } from './FabricGatewayRegistryEntry';
import { AnsibleEnvironment } from '../environments/AnsibleEnvironment';
import { FabricRuntimeUtil } from '../util/FabricRuntimeUtil';
import { FileConfigurations } from '../registries/FileConfigurations';
import { FileRegistry } from '../registries/FileRegistry';
import { FabricEnvironmentRegistryEntry, EnvironmentType } from '../registries/FabricEnvironmentRegistryEntry';
import { FabricEnvironmentRegistry } from '../registries/FabricEnvironmentRegistry';

export class FabricGatewayRegistry extends FileRegistry<FabricGatewayRegistryEntry> {

    public static instance(): FabricGatewayRegistry {
        return FabricGatewayRegistry._instance;
    }

    private static _instance: FabricGatewayRegistry = new FabricGatewayRegistry();

    private constructor() {
        super(FileConfigurations.FABRIC_GATEWAYS);
    }

    public async getAll(showLocalFabric: boolean = true): Promise<FabricGatewayRegistryEntry[]> {
        let entries: FabricGatewayRegistryEntry[] = await super.getAll();

        const local: FabricGatewayRegistryEntry[] = [];

        entries = entries.filter((entry: FabricGatewayRegistryEntry) => {
            if (entry.displayName && entry.displayName.includes(`${FabricRuntimeUtil.LOCAL_FABRIC} - `)) {
                local.push(entry);
                return false;
            }

            return true;
        });

        if (showLocalFabric && local.length > 0) {
            for (const entry of local) {
                entries.unshift(entry);
            }
        }

        return entries;
    }

    public async getEntries(): Promise<FabricGatewayRegistryEntry[]> {
        const normalEntries: FabricGatewayRegistryEntry[] = await super.getEntries();
        const otherEntries: FabricGatewayRegistryEntry[] = [];

        let environmentEntries: FabricEnvironmentRegistryEntry[] = await FabricEnvironmentRegistry.instance().getAll();

        // just get the ansible ones
        environmentEntries = environmentEntries.filter((entry: FabricEnvironmentRegistryEntry) => {
            return entry.environmentType === EnvironmentType.ANSIBLE_ENVIRONMENT;
        });

        for (const environmentEntry of environmentEntries) {
            const environment: AnsibleEnvironment = new AnsibleEnvironment(environmentEntry.name, environmentEntry.environmentDirectory);
            const gatewayEntries: FabricGatewayRegistryEntry[] = await environment.getGateways();
            otherEntries.push(...gatewayEntries);
        }

        return [...normalEntries, ...otherEntries].sort((a: FabricGatewayRegistryEntry, b: FabricGatewayRegistryEntry): number => {
            const aName: string = a.displayName ? a.displayName : a.name;
            const bName: string = b.displayName ? b.displayName : b.name;
            if (aName > bName) {
                return 1;
            } else {
                return -1;
            }
        });
    }

    public async update(newEntry: FabricGatewayRegistryEntry): Promise<void> {
        if (newEntry.fromEnvironment) {
            const connectionProfilePath: string = newEntry.connectionProfilePath;
            const gatewayFolderPath: string = connectionProfilePath.substr(0, connectionProfilePath.lastIndexOf('/'));
            await fs.writeJson(path.join(gatewayFolderPath, '.config.json'), newEntry);
        }
        await super.update(newEntry);
    }

}
