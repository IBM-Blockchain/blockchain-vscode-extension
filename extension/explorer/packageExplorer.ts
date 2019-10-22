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
import { PackageTreeItem } from './packageModel/PackageTreeItem';
import { BlockchainExplorerProvider } from './BlockchainExplorerProvider';
import { PackageRegistry } from '../registries/PackageRegistry';
import { PackageRegistryEntry } from '../registries/PackageRegistryEntry';
import { BlockchainTreeItem } from './model/BlockchainTreeItem';
import { TextTreeItem } from './model/TextTreeItem';
import { PackageFabricVersionTreeItem } from './packageModel/PackageFabricVersionTreeItem';

export class BlockchainPackageExplorerProvider implements BlockchainExplorerProvider {
    public tree: Array<BlockchainTreeItem> = [];
    private _onDidChangeTreeData: vscode.EventEmitter<any | undefined> = new vscode.EventEmitter<any | undefined>();
    // tslint:disable-next-line member-ordering
    readonly onDidChangeTreeData: vscode.Event<any | undefined> = this._onDidChangeTreeData.event;

    getTreeItem(element: PackageTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: BlockchainTreeItem): Promise<BlockchainTreeItem[]> {

        if (!element) {
            this.tree = await this.createPackageFabricVersionTree();
        } else {
            this.tree = await this.createPackageTree(element as PackageFabricVersionTreeItem);
        }
        return this.tree;
    }

    async refresh(): Promise<void> {
        this._onDidChangeTreeData.fire();
    }

    private async createPackageFabricVersionTree(): Promise<BlockchainTreeItem[]> {
        // Get the packages from the registry manager and create a package tree
        const packageRegistryEntries: PackageRegistryEntry[] = await PackageRegistry.instance().getAll();
        const tree: Array<BlockchainTreeItem> = [];
        const fabric14Packages: PackageRegistryEntry[] = [];
        const fabric20Packages: PackageRegistryEntry[] = [];

        for (const packageRegistryEntry of packageRegistryEntries) {
            if (packageRegistryEntry.fabricVersion === '1.4') {
                fabric14Packages.push(packageRegistryEntry);
            } else {
                fabric20Packages.push(packageRegistryEntry);
            }
        }

        tree.push(new PackageFabricVersionTreeItem(this, 'Fabric 1.4 packages', fabric14Packages));

        tree.push((new PackageFabricVersionTreeItem(this, 'Fabric 2.0 packages', fabric20Packages)));

        return tree;
    }

    private async createPackageTree(element: PackageFabricVersionTreeItem): Promise<BlockchainTreeItem[]> {
        const tree: BlockchainTreeItem[] = [];

        const packageRegistryEntries: PackageRegistryEntry[] = await element.packageEntries;

        if (packageRegistryEntries.length === 0) {
            tree.push(new TextTreeItem(this, 'No packages found'));
        } else {
            for (const packageRegistryEntry of packageRegistryEntries) {
                const nameAndVersion: string = packageRegistryEntry.name + '@' + packageRegistryEntry.version;

                tree.push(new PackageTreeItem(this, nameAndVersion, packageRegistryEntry));
            }
        }

        return tree;
    }
}
