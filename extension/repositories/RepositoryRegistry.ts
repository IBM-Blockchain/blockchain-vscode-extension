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

import { FabricRegistry } from '../fabric/FabricRegistry';
import { RepositoryRegistryEntry } from './RepositoryRegistryEntry';
import { SettingConfigurations } from '../../SettingConfigurations';

export class RepositoryRegistry extends FabricRegistry<RepositoryRegistryEntry> {

    public static instance(): RepositoryRegistry {
        return RepositoryRegistry._instance;
    }

    private static _instance: RepositoryRegistry = new RepositoryRegistry();

    private constructor() {
        super(SettingConfigurations.EXTENSION_REPOSITORIES);
    }

    public get(name: string): RepositoryRegistryEntry {
        try {
            return super.get(name);
        } catch (error) {
            throw new Error(`Entry "${name}" in blockchain repositories does not exist`);
        }

    }

    public async add(entry: RepositoryRegistryEntry): Promise<void> {
        try {
            await super.add(entry);
        } catch (error) {
            throw new Error(`Entry "${entry.name}" in blockchain repositories already exists`);
        }
    }

    public async update(newEntry: RepositoryRegistryEntry): Promise<void> {
        try {
            await super.update(newEntry);
        } catch (error) {
            throw new Error(`Entry "${newEntry.name}" in blockchain repositories does not exist`);

        }
    }

    public async delete(name: string): Promise<void> {

        try {
            await super.delete(name);
        } catch (error) {
            throw new Error(`Entry "${name}" in blockchain repositories does not exist`);
        }
    }
}
