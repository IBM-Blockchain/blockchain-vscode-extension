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

import * as path from 'path';
import * as fs from 'fs-extra';
import * as vscode from 'vscode';
import { RegistryEntry } from './RegistryEntry';
import { IRegistry } from './IRegistry';
import { SettingConfigurations } from '../../configurations';
import { FileSystemUtil } from '../util/FileSystemUtil';
import { EventEmitter } from 'events';

export abstract class FileRegistry<T extends RegistryEntry> extends EventEmitter implements IRegistry<RegistryEntry> {

    public static EVENT_NAME: string = 'registryUpdated';

    protected readonly FILE_NAME: string = '.config.json';

    protected constructor(private registryName: string) {
        super();
    }

    public async getAll(): Promise<T[]> {
        return await this.getEntries();
    }

    public async get(name: string): Promise<T> {
        const entries: T[] = await this.getEntries();
        const entry: T = entries.find((item: T) => item.name === name);
        if (!entry) {
            throw new Error(`Entry "${name}" in registry "${this.registryName}" does not exist`);
        }
        return entry;
    }

    public async exists(name: string): Promise<boolean> {
        const entries: T[] = await this.getEntries();
        return entries.some((item: T) => item.name === name);
    }

    public async add(entry: T): Promise<void> {
        const name: string = entry.name;
        const exists: boolean = await this.exists(name);
        if (exists) {
            throw new Error(`Entry "${name}" in registry "${this.registryName}" already exists`);
        }

        await this.updateEntries(entry);
    }

    public async update(newEntry: T): Promise<void> {
        const name: string = newEntry.name;
        const exists: boolean = await this.exists(name);
        if (!exists) {
            throw new Error(`Entry "${name}" in registry "${this.registryName}" does not exist`);
        }

        await this.updateEntries(newEntry);
    }

    public async delete(name: string, ignoreNotExists: boolean = false): Promise<void> {
        const exists: boolean = await this.exists(name);
        if (!exists && !ignoreNotExists) {
            throw new Error(`Entry "${name}" in registry "${this.registryName}" does not exist`);
        } else if (!exists && ignoreNotExists) {
            return;
        }

        const extDir: string = vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_DIRECTORY);
        const homeExtDir: string = FileSystemUtil.getDirPath(extDir);
        const entryPath: string = path.join(homeExtDir, this.registryName, name);

        await fs.remove(entryPath);
        this.emit(FileRegistry.EVENT_NAME, this.registryName);
    }

    public async clear(): Promise<void> {
        const extDir: string = vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_DIRECTORY);
        const homeExtDir: string = FileSystemUtil.getDirPath(extDir);
        const registryPath: string = path.join(homeExtDir, this.registryName);

        await fs.emptyDir(registryPath);
        this.emit(FileRegistry.EVENT_NAME, this.registryName);
    }

    private async getEntries(): Promise<T[]> {
        const extDir: string = vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_DIRECTORY);
        const homeExtDir: string = FileSystemUtil.getDirPath(extDir);
        const registryPath: string = path.join(homeExtDir, this.registryName);

        await fs.ensureDir(registryPath);

        const registryEntryNames: string[] = await fs.readdir(registryPath);

        const entries: T[] = [];
        for (const entryName of registryEntryNames) {
            const entryPath: string = path.join(registryPath, entryName, this.FILE_NAME);
            const exists: boolean = await fs.pathExists(entryPath);
            if (exists) {
                const entry: T = await fs.readJSON(entryPath);
                entries.push(entry);
            }
        }

        return entries;
    }

    private async updateEntries(entry: T): Promise<void> {
        const extDir: string = vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_DIRECTORY);
        const homeExtDir: string = FileSystemUtil.getDirPath(extDir);
        const registryPath: string = path.join(homeExtDir, this.registryName);

        const entryDir: string = path.join(registryPath, entry.name);
        await fs.ensureDir(entryDir);
        const entryPath: string = path.join(entryDir, this.FILE_NAME);
        await fs.writeJSON(entryPath, entry);
        this.emit(FileRegistry.EVENT_NAME, this.registryName);
    }
}
