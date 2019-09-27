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
import { BlockchainExplorerProvider } from './BlockchainExplorerProvider';
import { PackageRegistry } from '../packages/PackageRegistry';
import { PackageRegistryEntry } from '../packages/PackageRegistryEntry';
import { BlockchainTreeItem } from './model/BlockchainTreeItem';

export class BlockchainPackageExplorerProvider implements BlockchainExplorerProvider {
    public tree: Array<BlockchainTreeItem> = [];
    private _onDidChangeTreeData: vscode.EventEmitter<any | undefined> = new vscode.EventEmitter<any | undefined>();
    // tslint:disable-next-line member-ordering
    readonly onDidChangeTreeData: vscode.Event<any | undefined> = this._onDidChangeTreeData.event;

    getTreeItem(element: PackageTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(): Promise<BlockchainTreeItem[]> {
        // Get the packages from the registry manager and create a package tree
        const packageArray: PackageRegistryEntry[] = await PackageRegistry.instance().getAll();
        this.tree = await this.createPackageTree(packageArray);
        return this.tree;
    }

    async refresh(): Promise<void> {
        this._onDidChangeTreeData.fire();
    }

    private async createPackageTree(packageRegistryEntries: Array<PackageRegistryEntry>): Promise<BlockchainTreeItem[]> {
        const tree: Array<BlockchainTreeItem> = [];
        // Populate the tree with the name of each package registry entry
        for (const packageRegistryEntry of packageRegistryEntries) {

            const nameAndVersion: string = packageRegistryEntry.name + '@' + packageRegistryEntry.version;

            tree.push(new PackageTreeItem(this, nameAndVersion, packageRegistryEntry));
        }

        return tree;
    }
}
