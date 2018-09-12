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
import { PackageTreeItem } from './model/PackageTreeItem';
import * as fs from 'fs-extra';
import * as path from 'path';
import { BlockchainExplorerProvider } from './BlockchainExplorerProvider';
import * as homeDir from 'home-dir';
import { CommandUtil } from '../util/CommandUtil';

export class BlockchainPackageExplorerProvider implements BlockchainExplorerProvider {
    public tree: Array<PackageTreeItem> = [];
    private _onDidChangeTreeData: vscode.EventEmitter<any | undefined> = new vscode.EventEmitter<any | undefined>();
    // tslint:disable-next-line member-ordering
    readonly onDidChangeTreeData: vscode.Event<any | undefined> = this._onDidChangeTreeData.event;

    getTreeItem(element: PackageTreeItem): vscode.TreeItem {
        console.log('BlockchainPackageExplorer: getTreeItem', element);
        return element;
    }

    async getChildren(): Promise<PackageTreeItem[]> {
        console.log('BlockchainPackageExplorer: getChildren');

        const packageArray = await CommandUtil.getPackages();

        this.tree = await this.createPackageTree(packageArray as Array<string>);
        return this.tree;
    }

    async refresh(): Promise<void> {
        console.log('BlockchainPackageExplorer: refresh');
        this._onDidChangeTreeData.fire();
    }

    private async createPackageTree(packageArray: Array<string>): Promise<Array<PackageTreeItem>> {
        console.log('createPackageTree', packageArray);
        const tree: Array<PackageTreeItem> = [];
        let packageVersionFile: string;
        let goPackageArray: string[];

        for (const packageFile of packageArray) {
            let packageTitle: string = packageFile;
            if (packageTitle.startsWith('.')) {
                continue;
            }
            if (packageTitle === 'go') {
                // Handle go directory structure: ../package_dir/go/src/
                const goPackageDir: string = path.join(CommandUtil.getPackageDirectory(), packageFile, '/src');
                try {
                    goPackageArray = await fs.readdir(goPackageDir);
                } catch (error) {
                    console.log('Error reading go smart contract package folder:', error.message);
                    vscode.window.showInformationMessage('Issue listing go smart contract packages in:' + goPackageDir);
                    goPackageArray = [];
                }
                for (const goPackageFile of goPackageArray) {
                    tree.push(new PackageTreeItem(this, goPackageFile));
                }
            } else {
                // Grab version from package.json
                packageVersionFile = path.join(CommandUtil.getPackageDirectory(), packageFile, '/package.json');
                try {
                    const packageVersionFileContents: Buffer = await fs.readFile(packageVersionFile);

                    const packageVersionObj: any = JSON.parse(packageVersionFileContents.toString('utf8'));
                    const packageVersion: string = packageVersionObj.version;
                    console.log('printing packageVersion', packageVersion);
                    if (packageVersion !== undefined) {
                        packageTitle = packageFile + ' - v' + packageVersion;
                    }
                } catch (error) {
                    console.log('failed to get smart contract package version', error.message);
                } finally {
                    tree.push(new PackageTreeItem(this, packageTitle));
                }
            }
        }
        return tree;
    }

}
