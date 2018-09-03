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

import * as vscode from 'vscode';
import { FabricRegistryEntry } from './FabricRegistryEntry';

export abstract class FabricRegistry<T extends FabricRegistryEntry> {

    protected constructor(private registryName: string) {

    }

    public getAll(): T[] {
        return this.getEntries();
    }

    public get(name: string): T {
        const entries: T[] = this.getEntries();
        const entry: T = entries.find((item: T) => item.name === name);
        if (!entry) {
            throw new Error(`Entry "${name}" in Fabric registry "${this.registryName}" does not exist`);
        }
        return entry;
    }

    public exists(name: string): boolean {
        const entries: T[] = this.getEntries();
        return entries.some((item) => item.name === name);
    }

    public async add(entry: T): Promise<void> {
        const name: string = entry.name;
        if (this.exists(name)) {
            throw new Error(`Entry "${name}" in Fabric registry "${this.registryName}" already exists`);
        }
        const entries: T[] = this.getEntries();
        entries.push(entry);
        await this.updateEntries(entries);
    }

    public async update(newEntry: T): Promise<void> {
        const name: string = newEntry.name;
        if (!this.exists(name)) {
            throw new Error(`Entry "${name}" in Fabric registry "${this.registryName}" does not exist`);
        }
        const oldEntries: T[] = this.getEntries();
        const newEntries: T[] = oldEntries.map((oldEntry: T) => {
            if (oldEntry.name === name) {
                return newEntry;
            } else {
                return oldEntry;
            }
        });
        await this.updateEntries(newEntries);
    }

    public async delete(name: string): Promise<void> {
        if (!this.exists(name)) {
            throw new Error(`Entry "${name}" in Fabric registry "${this.registryName}" does not exist`);
        }
        const oldEntries: T[] = this.getEntries();
        const newEntries: T[] = oldEntries.filter((oldEntry: T) => oldEntry.name !== name);
        await this.updateEntries(newEntries);
    }

    public async clear(): Promise<void> {
        await this.updateEntries([]);
    }

    private getEntries(): T[] {
        return vscode.workspace.getConfiguration().get(this.registryName) as T[];
    }

    private async updateEntries(entries: T[]): Promise<void> {
        await vscode.workspace.getConfiguration().update(this.registryName, entries, vscode.ConfigurationTarget.Global);
    }

}
