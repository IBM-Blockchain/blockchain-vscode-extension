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

import { FileRegistry } from './FileRegistry';
import { FabricGatewayRegistryEntry } from './FabricGatewayRegistryEntry';
import { FileConfigurations } from '../../configurations';
import { FabricRuntimeUtil } from 'ibm-blockchain-platform-common';

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

        let local: FabricGatewayRegistryEntry;

        entries = entries.filter((entry: FabricGatewayRegistryEntry) => {
            if (entry.name === FabricRuntimeUtil.LOCAL_FABRIC) {
                local = entry;
                return false;
            }

            return true;
        });

        if (showLocalFabric && local) {
            entries.unshift(local);
        }

        return entries;
    }
}
