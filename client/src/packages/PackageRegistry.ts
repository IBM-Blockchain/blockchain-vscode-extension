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

    public static instance() {
        return PackageRegistry._instance;
    }

    private static _instance: PackageRegistry = new PackageRegistry();
    private packageDir: string;

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
        const packageRegistryEntries: Array<PackageRegistryEntry> = [];
        const languageArray: string[] = await this.getLanguageArray();
        for (const packageLanguage of languageArray) {
            console.log('printing packageLanguage', packageLanguage);
            let packageSubDirectory: string;
            let packageSubArray: string[] = [];

            if (packageLanguage.startsWith('.')) {
                continue;
            } else if (packageLanguage === 'go') {
                // Handle go directory structure: ../package_dir/go/src/
                packageSubDirectory = path.join(this.packageDir, packageLanguage, '/src');
            } else {
                packageSubDirectory = path.join(this.packageDir, packageLanguage);
            }

            try {
                // create array of smart contract packages from within the language sub directory
                packageSubArray = await fs.readdir(packageSubDirectory);
            } catch (error) {
                console.log('Error reading smart contract package folder:', error.message);
                vscode.window.showInformationMessage('Issue listing smart contract packages in:' + packageSubDirectory);
                // continue to next packageLanguage
                continue;
            }
            for (const packageSubFile of packageSubArray) {
                if (packageSubFile.startsWith('.')) {
                    continue;
                }

                // add each package to the registry
                const packageRegistryEntry: PackageRegistryEntry = new PackageRegistryEntry();
                packageRegistryEntry.path = path.join(packageSubDirectory, packageSubFile);
                packageRegistryEntry.chaincodeLanguage = packageLanguage;
                if (packageLanguage !== 'go') {
                    try {
                        const packageDetails: { name: string, version: string } = await this.getPackageNameAndVersion(packageSubDirectory, packageSubFile);
                        packageRegistryEntry.name = packageDetails.name;
                        packageRegistryEntry.version = packageDetails.version;
                    } catch (error) {
                        // error getting package version so go on to next package
                        continue;
                    }
                } else {
                    const packageDetails = packageSubFile.split('@');
                    packageRegistryEntry.name = packageDetails[0];
                    packageRegistryEntry.version = packageDetails[1];
                }
                packageRegistryEntries.push(packageRegistryEntry);
            }
        }
        return packageRegistryEntries;

    }

    private async getLanguageArray(): Promise<string[]> {
        let packageLanguageArray: string[] = [];
        this.packageDir = this.getPackageDir();
        console.log('packageDir is:', this.packageDir);

        this.packageDir = await UserInputUtil.getDirPath(this.packageDir);

        try {
            packageLanguageArray = await fs.readdir(this.packageDir);
        } catch (error) {
            if (error.message.includes('no such file or directory')) {
                // if the smart contract package directory doesn't exist, create it
                packageLanguageArray = [];
                try {
                    console.log('creating smart contract package directory:', this.packageDir);
                    await fs.mkdirp(this.packageDir);
                } catch (error) {
                    console.log('Issue creating smart contract package folder:', error.message);
                    vscode.window.showErrorMessage('Issue creating smart contract package folder:' + this.packageDir);
                }
            } else {
                console.log('Error reading smart contract package folder:', error.message);
                vscode.window.showErrorMessage('Issue reading smart contract package folder:' + this.packageDir);
            }
        }
        return packageLanguageArray;
    }

    private getPackageDir(): string {
        console.log('BlockchainPackageExplorer: getPackageDir');
        return vscode.workspace.getConfiguration().get('fabric.package.directory');
    }

    private async getPackageNameAndVersion(packagePath: string, packageFile: string): Promise<{ name: string, version: string }> {
        const packageVersionFile: string = path.join(packagePath, packageFile, '/package.json');
        let packageVersion: string;
        let packageName: string;
        try {
            const packageVersionFileContents: Buffer = await fs.readFile(packageVersionFile);
            const packageVersionObj: any = JSON.parse(packageVersionFileContents.toString('utf8'));
            packageVersion = packageVersionObj.version;
            packageName = packageVersionObj.name;
        } catch (error) {

            vscode.window.showErrorMessage(`Could not read package json file from package ${packageFile}  ${error.message}`);
            throw error;
        }

        return {name: packageName, version: packageVersion};
    }
}
