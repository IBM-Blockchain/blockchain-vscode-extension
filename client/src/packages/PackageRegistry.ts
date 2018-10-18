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
import { PackageRegistryEntry } from './PackageRegistryEntry';
import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import { UserInputUtil } from '../commands/UserInputUtil';
import { Package } from 'fabric-client';

export class PackageRegistry {

    public static instance() {
        return PackageRegistry._instance;
    }

    private static _instance: PackageRegistry = new PackageRegistry();

    private constructor() {
    }

    public async getAll(): Promise<PackageRegistryEntry[]> {
        return await this.getEntries();
    }

    public async delete(packageEntry: PackageRegistryEntry): Promise<void> {
        console.log('delete', packageEntry.name);
        await fs.remove(packageEntry.path);
    }

    private async getEntries(): Promise<PackageRegistryEntry[]> {

        // Determine the directory that will contain the packages and ensure it exists.
        const pkgDir: string = vscode.workspace.getConfiguration().get('fabric.package.directory');
        const resolvedPkgDir: string = await UserInputUtil.getDirPath(pkgDir);
        await fs.ensureDir(resolvedPkgDir);

        // Read the list of files and process them.
        const pkgRegistryEntries: PackageRegistryEntry[] = [];
        const pkgFileNames: string[] = await fs.readdir(resolvedPkgDir);
        for (const pkgFileName of pkgFileNames) {

            // Get the full path to the package file.
            const pkgPath: string = path.join(resolvedPkgDir, pkgFileName);

            // Skip it if it's anything other than a file.
            // This means we can ignore any "old style" packages.
            const stat: fs.Stats = await fs.lstat(pkgPath);
            if (!stat.isFile()) {
                continue;
            }

            // Load the package file.
            const pkgBuffer: Buffer = await fs.readFile(pkgPath);
            const pkg: Package = await Package.fromBuffer(pkgBuffer);

            // Create the package registry entry.
            pkgRegistryEntries.push(new PackageRegistryEntry({
                name: pkg.getName(),
                version: pkg.getVersion(),
                path: pkgPath
            }));

        }

        // Return the list of package registry entries.
        return pkgRegistryEntries;

    }

}
