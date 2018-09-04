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

import { FabricRuntime } from './FabricRuntime';
import { FabricRuntimeRegistry } from './FabricRuntimeRegistry';
import { FabricRuntimeRegistryEntry } from './FabricRuntimeRegistryEntry';
import { FabricConnectionRegistry } from './FabricConnectionRegistry';
import { FabricConnectionRegistryEntry } from './FabricConnectionRegistryEntry';

export class FabricRuntimeManager {

    public static instance(): FabricRuntimeManager {
        return this._instance;
    }

    private static _instance = new FabricRuntimeManager();

    private connectionRegistry: FabricConnectionRegistry = FabricConnectionRegistry.instance();
    private runtimeRegistry: FabricRuntimeRegistry = FabricRuntimeRegistry.instance();
    private runtimes: Map<string, FabricRuntime> = new Map<string, FabricRuntime>();

    private constructor() {

    }

    public getAll(): FabricRuntime[] {
        const runtimeRegistryEntries: FabricRuntimeRegistryEntry[] = this.runtimeRegistry.getAll();
        return runtimeRegistryEntries.map((runtimeRegistryEntry: FabricRuntimeRegistryEntry) => {
            const name: string = runtimeRegistryEntry.name;
            let runtime: FabricRuntime = this.runtimes.get(name);
            if (!runtime) {
                runtime = new FabricRuntime(runtimeRegistryEntry);
                this.runtimes.set(name, runtime);
            }
            return runtime;
        });
    }

    public get(name: string): FabricRuntime {
        const runtimeRegistryEntry: FabricRuntimeRegistryEntry = this.runtimeRegistry.get(name);
        let runtime: FabricRuntime = this.runtimes.get(name);
        if (!runtime) {
            runtime = new FabricRuntime(runtimeRegistryEntry);
            this.runtimes.set(name, runtime);
        }
        return runtime;
    }

    public exists(name: string): boolean {
        return this.runtimeRegistry.exists(name);
    }

    public async add(name: string): Promise<void> {
        let runtimeRegistryAdded: boolean = false;
        try {

            // Add the Fabric runtime to the runtime registry.
            const runtimeRegistryEntry: FabricRuntimeRegistryEntry = new FabricRuntimeRegistryEntry();
            runtimeRegistryEntry.name = name;
            runtimeRegistryEntry.developmentMode = false;
            await this.runtimeRegistry.add(runtimeRegistryEntry);
            runtimeRegistryAdded = true;

            // Add the Fabric connection to the connection entry.
            const connectionRegistryEntry: FabricConnectionRegistryEntry = new FabricConnectionRegistryEntry();
            connectionRegistryEntry.name = name;
            connectionRegistryEntry.managedRuntime = true;
            await this.connectionRegistry.add(connectionRegistryEntry);

            // Add the Fabric runtime to the internal cache.
            const runtime: FabricRuntime = new FabricRuntime(runtimeRegistryEntry);
            this.runtimes.set(name, runtime);

        } catch (error) {

            // Clear up any registry entries we may have created.
            if (runtimeRegistryAdded) {
                await this.runtimeRegistry.delete(name);
            }
            throw error;

        }
    }

    public async delete(name: string): Promise<void> {

        // Remove the Fabric runtime.
        await this.runtimeRegistry.delete(name);

        // Remove the Fabric connection.
        if (this.connectionRegistry.exists(name)) {
            await this.connectionRegistry.delete(name);
        }

        // Delete the Fabric runtime from the internal cache.
        this.runtimes.delete(name);

    }

    public async clear(): Promise<void> {
        this.runtimes.clear();
    }

}
