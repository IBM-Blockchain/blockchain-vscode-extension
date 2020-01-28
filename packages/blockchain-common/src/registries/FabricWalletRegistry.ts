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
import { FabricWalletRegistryEntry } from './FabricWalletRegistryEntry';
import { FileConfigurations } from './FileConfigurations';
import { FileRegistry } from './FileRegistry';
import { FabricRuntimeUtil } from '../util/FabricRuntimeUtil';

export class FabricWalletRegistry extends FileRegistry<FabricWalletRegistryEntry> {

    public static instance(): FabricWalletRegistry {
        return FabricWalletRegistry._instance;
    }

    private static _instance: FabricWalletRegistry = new FabricWalletRegistry();

    private constructor() {
        super(FileConfigurations.FABRIC_WALLETS);
    }

    public async getAll(showLocalFabric: boolean = true): Promise<FabricWalletRegistryEntry[]> {
        let entries: FabricWalletRegistryEntry[] = await super.getAll();

        const local: FabricWalletRegistryEntry[] = [];

        entries = entries.filter((entry: FabricWalletRegistryEntry) => {
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
}
