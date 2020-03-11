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
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { LogType, FileSystemUtil } from 'ibm-blockchain-platform-common';
import { SettingConfigurations } from '../../configurations';

export class PackageRegistry {

    public static instance(): PackageRegistry {
        return PackageRegistry._instance;
    }

    private static _instance: PackageRegistry = new PackageRegistry();

    private constructor() {
    }

    public async get(name: string, version: string): Promise<PackageRegistryEntry> {
        const packages: PackageRegistryEntry[] = await this.getAll();
        const _package: PackageRegistryEntry = packages.find((pkg: PackageRegistryEntry) => {
            return pkg.name === name && pkg.version === version;
        });

        return _package;
    }

    public async getAll(): Promise<PackageRegistryEntry[]> {
        return await this.getEntries();
    }

    public async delete(packageEntry: PackageRegistryEntry): Promise<void> {
        await fs.remove(packageEntry.path);
    }

    public async clear(): Promise<void> {
        const extDir: string = vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_DIRECTORY);
        const pkgDir: string = path.join(extDir, 'packages');
        const resolvedPkgDir: string = FileSystemUtil.getDirPath(pkgDir);
        await fs.emptyDir(resolvedPkgDir);
    }

    private async getEntries(): Promise<PackageRegistryEntry[]> {
        // Determine the directory that will contain the packages and ensure it exists.
        const extDir: string = vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_DIRECTORY);
        const pkgDir: string = path.join(extDir, 'packages');
        const resolvedPkgDir: string = FileSystemUtil.getDirPath(pkgDir);
        await fs.ensureDir(resolvedPkgDir);

        // Read the list of files and process them.
        const pkgRegistryEntries: PackageRegistryEntry[] = [];
        const pkgFileNames: string[] = await fs.readdir(resolvedPkgDir);
        for (const pkgFileName of pkgFileNames) {

            // Skip the file if it's a hidden file.
            if (pkgFileName.startsWith('.')) {
                continue;
            }

            // Get the full path to the package file.
            const pkgPath: string = path.join(resolvedPkgDir, pkgFileName);

            // Skip it if it's anything other than a file.
            // This means we can ignore any "old style" packages.
            const stat: fs.Stats = await fs.lstat(pkgPath);
            if (!stat.isFile()) {
                continue;
            }

            // get size
            const sizeKB: number = Math.round(stat.size / 1000);

            // Catch all errors (can't read file, file is not a valid package, etc) and log
            // them instead of having them break the listing of valid packages.
            try {

                // Load the package file.
                const pkgBuffer: Buffer = await fs.readFile(pkgPath);

                // Parse the package. Need to dynamically load the package class
                // from the Fabric SDK to avoid early native module loading.
                const { PackageSmartContract } = await import('ibm-blockchain-platform-environment-v1');
                const pkgInfo: {name: string, version: string} = await PackageSmartContract.getPackageInfo(pkgBuffer);

                // Create the package registry entry.
                pkgRegistryEntries.push(new PackageRegistryEntry({
                    name: pkgInfo.name,
                    version: pkgInfo.version,
                    path: pkgPath,
                    sizeKB: sizeKB
                }));

            } catch (error) {
                VSCodeBlockchainOutputAdapter.instance().log(LogType.ERROR, null, `Failed to parse package ${pkgFileName}: ${error.message}`);
            }

        }

        // Return the list of package registry entries.
        return pkgRegistryEntries;
    }
}
