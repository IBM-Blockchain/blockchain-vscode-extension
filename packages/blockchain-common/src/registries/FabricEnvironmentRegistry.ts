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

import { FabricEnvironmentRegistryEntry } from './FabricEnvironmentRegistryEntry';
import { FabricRuntimeUtil } from '../util/FabricRuntimeUtil';
import { FileConfigurations} from './FileConfigurations';
import { FileRegistry } from './FileRegistry';

export class FabricEnvironmentRegistry extends FileRegistry<FabricEnvironmentRegistryEntry> {

    public static instance(): FabricEnvironmentRegistry {
        return FabricEnvironmentRegistry._instance;
    }

    private static _instance: FabricEnvironmentRegistry = new FabricEnvironmentRegistry();

    private constructor() {
        super(FileConfigurations.FABRIC_ENVIRONMENTS);
    }

    public async getAll(showLocalFabric: boolean = true, onlyShowManagedEnvironment: boolean = false): Promise<FabricEnvironmentRegistryEntry[]> {
        let entries: FabricEnvironmentRegistryEntry[] = await super.getAll();

        let local: FabricEnvironmentRegistryEntry;

        entries = entries.filter((entry: FabricEnvironmentRegistryEntry) => {
            if (entry.name === FabricRuntimeUtil.LOCAL_FABRIC) {
                local = entry;
                return false;
            }
            if (entry.managedRuntime && onlyShowManagedEnvironment) {
                return true;
            } else if (!entry.managedRuntime && onlyShowManagedEnvironment) {
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
