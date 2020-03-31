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
import { FileConfigurations } from '../registries/FileConfigurations';
import { FileRegistry } from '../registries/FileRegistry';
import { FabricEnvironmentRegistryEntry, EnvironmentType, EnvironmentFlags } from '../registries/FabricEnvironmentRegistryEntry';
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
        const entries: FabricGatewayRegistryEntry[] = await super.getAll();

        let gateways: FabricGatewayRegistryEntry[] = [];
        const localGateways: FabricGatewayRegistryEntry[] = [];

        for (const entry of entries) {
            const envName: string = entry.fromEnvironment;
            let environmentType: EnvironmentType;
            if (envName) {
                const environment: FabricEnvironmentRegistryEntry = await FabricEnvironmentRegistry.instance().get(envName);
                environmentType = environment.environmentType;
            }
            if (environmentType === EnvironmentType.LOCAL_ENVIRONMENT) {
                localGateways.push(entry);
                continue;
            }

            gateways.push(entry);
        }

        if (showLocalFabric && localGateways.length > 0) {
            gateways = [...localGateways, ...gateways];
        }

        return gateways;
    }

    public async getEntries(): Promise<FabricGatewayRegistryEntry[]> {
        const normalEntries: FabricGatewayRegistryEntry[] = await super.getEntries();
        const otherEntries: FabricGatewayRegistryEntry[] = [];

         // just get the ansible ones
        const environmentEntries: FabricEnvironmentRegistryEntry[] = await FabricEnvironmentRegistry.instance().getAll([EnvironmentFlags.ANSIBLE]);

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
            this.emit(FileRegistry.EVENT_NAME, FileConfigurations.FABRIC_GATEWAYS); //
        } else {
            await super.update(newEntry);
        }
    }

}
