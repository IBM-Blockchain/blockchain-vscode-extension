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

import {EnvironmentFlags, EnvironmentType, FabricEnvironmentRegistryEntry} from './FabricEnvironmentRegistryEntry';
import {FileConfigurations} from './FileConfigurations';
import {FileRegistry} from './FileRegistry';

export class FabricEnvironmentRegistry extends FileRegistry<FabricEnvironmentRegistryEntry> {

    public static instance(): FabricEnvironmentRegistry {
        return FabricEnvironmentRegistry._instance;
    }

    private static _instance: FabricEnvironmentRegistry = new FabricEnvironmentRegistry();

    private constructor() {
        super(FileConfigurations.FABRIC_ENVIRONMENTS);
    }

    public async getAll(includeFilter: EnvironmentFlags[] = [], excludeFilter: EnvironmentFlags[] = []): Promise<FabricEnvironmentRegistryEntry[]> {
        let entries: FabricEnvironmentRegistryEntry[] = await super.getAll();

        const local: FabricEnvironmentRegistryEntry[] = [];

        entries = this.filterEnvironments(entries, includeFilter, excludeFilter);

        // need to remove any local ones
        entries = entries.filter((entry: FabricEnvironmentRegistryEntry) => {
            if (entry.environmentType === EnvironmentType.LOCAL_MICROFAB_ENVIRONMENT) {
                local.push(entry);
                return false;
            }

            return true;
        });

        entries.unshift(...local);

        return entries;
    }

    private filterEnvironments(environments: FabricEnvironmentRegistryEntry[], includeFilter: EnvironmentFlags[], excludeFilter: EnvironmentFlags[]): FabricEnvironmentRegistryEntry[] {
        return environments.filter((environment: FabricEnvironmentRegistryEntry) => {
            const environmentType: EnvironmentType = environment.environmentType;
            // remove all the excluded ones
            for (const exclude of excludeFilter) {
                const result: number = environmentType & exclude;
                if (result === exclude) {
                    return false;
                }
            }

            // if nothing is included we just return all that is not on the excluded list
            if (includeFilter.length > 0) {
                // check if it's one we want
                let match: boolean = false;
                for (const include of includeFilter) {
                    const result: number = environmentType & include;
                    if (result === include) {
                        match = true;
                        break;
                    }
                }
                return match;
            } else {
                return true;
            }
        });
    }
}
