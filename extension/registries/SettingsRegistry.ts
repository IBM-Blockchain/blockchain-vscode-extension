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
import { RegistryEntry } from './RegistryEntry';
import { IRegistry } from './IRegistry';

export abstract class SettingsRegistry<T extends RegistryEntry> implements IRegistry<RegistryEntry> {

    protected constructor(private registryName: string) {

    }

    public async getAll(): Promise<T[]> {
        const allEntries: T[] = this.getEntries();
        allEntries.sort((entryA: T, entryB: T) => {
            const entryALowerCase: string = entryA.name.toLowerCase();
            const entryBLowerCase: string = entryB.name.toLowerCase();
            if (entryALowerCase > entryBLowerCase) {
                return 1;
            } else if (entryALowerCase < entryBLowerCase) {
                return -1;
            } else {
                return 0;
            }
        });
        return allEntries;
    }

    public async get(name: string): Promise<T> {
        const entries: T[] = this.getEntries();
        const entry: T = entries.find((item: T) => item.name === name);
        if (!entry) {
            throw new Error(`Entry "${name}" in registry "${this.registryName}" does not exist`);
        }
        return entry;
    }

    public async exists(name: string): Promise<boolean> {
        const entries: T[] = this.getEntries();
        return entries.some((item: T) => item.name === name);
    }

    public async add(entry: T): Promise<void> {
        const name: string = entry.name;
        const exists: boolean = await this.exists(name);
        if (exists) {
            throw new Error(`Entry "${name}" in registry "${this.registryName}" already exists`);
        }
        const entries: T[] = this.getEntries();
        entries.push(entry);
        await this.updateEntries(entries);
    }

    public async update(newEntry: T): Promise<void> {
        const name: string = newEntry.name;
        const exists: boolean = await this.exists(name);
        if (!exists) {
            throw new Error(`Entry "${name}" in registry "${this.registryName}" does not exist`);
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

    public async delete(name: string, ignoreNotExists: boolean = false): Promise<void> {
        const exists: boolean = await this.exists(name);
        if (!exists && !ignoreNotExists) {
            throw new Error(`Entry "${name}" in registry "${this.registryName}" does not exist`);
        } else if (!exists && ignoreNotExists) {
            return;
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
