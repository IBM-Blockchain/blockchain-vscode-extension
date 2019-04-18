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

export class PackageRegistry {

    public static instance(): PackageRegistry {
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
        const extDir: string = vscode.workspace.getConfiguration().get('blockchain.ext.directory');
        const pkgDir: string = path.join(extDir, 'packages');
        const resolvedPkgDir: string = UserInputUtil.getDirPath(pkgDir);
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

            // Parse the package. Need to dynamically load the package class
            // from the Fabric SDK to avoid early native module loading.
            const { Package } = await import('fabric-client');
            const pkg: any = await Package.fromBuffer(pkgBuffer);

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
