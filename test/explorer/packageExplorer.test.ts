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
import * as vscode from 'vscode';
import * as path from 'path';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as fs from 'fs-extra';
import { PackageTreeItem } from '../../extension/explorer/packageModel/PackageTreeItem';
import { TestUtil } from '../TestUtil';
import { BlockchainPackageExplorerProvider } from '../../extension/explorer/packageExplorer';
import { ExtensionCommands } from '../../ExtensionCommands';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../../extension/logging/OutputAdapter';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';
import { PackageFabricVersionTreeItem } from '../../extension/explorer/packageModel/PackageFabricVersionTreeItem';
import { PackageRegistry } from '../../extension/registries/PackageRegistry';

chai.use(sinonChai);
chai.should();

// tslint:disable no-unused-expression
describe('packageExplorer', () => {
    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();
    let logSpy: sinon.SinonSpy;
    let blockchainPackageExplorerProvider: BlockchainPackageExplorerProvider;
    const rootPath: string = path.dirname(__dirname);
    const testDir: string = path.join(rootPath, '../../test/data/packageDir/packages');
    const packageDir: string = path.join(TestUtil.EXTENSION_TEST_DIR, 'packages');

    before(async () => {
        await TestUtil.setupTests(mySandBox);
    });

    beforeEach(async () => {
        logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
        blockchainPackageExplorerProvider = ExtensionUtil.getBlockchainPackageExplorerProvider();
        await fs.copy(testDir, packageDir);
    });

    afterEach(async () => {
        mySandBox.restore();
    });

    it('should show the package fabric versions', async () => {
        await PackageRegistry.instance().clear();
        const packageFabricVersions: PackageFabricVersionTreeItem[] = await blockchainPackageExplorerProvider.getChildren() as Array<PackageFabricVersionTreeItem>;
        packageFabricVersions.length.should.equal(2);
        packageFabricVersions[0].label.should.equal('Fabric 1.4 packages');
        packageFabricVersions[1].label.should.equal('Fabric 2.0 packages');

        let packages: Array<PackageTreeItem> = await blockchainPackageExplorerProvider.getChildren(packageFabricVersions[0]) as Array<PackageTreeItem>;
        packages.length.should.equal(1);
        packages[0].label.should.equal(`No packages found`);

        packages = await blockchainPackageExplorerProvider.getChildren(packageFabricVersions[1]) as Array<PackageTreeItem>;
        packages.length.should.equal(1);
        packages[0].label.should.equal(`No packages found`);
    });

    it('should show smart contract packages in the BlockchainPackageExplorer view', async () => {
        const packageFabricVersions: PackageFabricVersionTreeItem[] = await blockchainPackageExplorerProvider.getChildren() as Array<PackageFabricVersionTreeItem>;
        let testPackages: Array<PackageTreeItem> = await blockchainPackageExplorerProvider.getChildren(packageFabricVersions[0]) as Array<PackageTreeItem>;
        testPackages.length.should.equal(3);
        testPackages[0].label.should.equal('vscode-pkg-1@0.0.1');
        testPackages[1].label.should.equal('vscode-pkg-2@0.0.2');
        testPackages[2].label.should.equal('vscode-pkg-3@1.2.3');

        testPackages = await blockchainPackageExplorerProvider.getChildren(packageFabricVersions[1]) as Array<PackageTreeItem>;
        testPackages.length.should.equal(3);
        testPackages[0].label.should.equal('vscode-pkg-4@1.4.3');
        testPackages[1].label.should.equal('vscode-pkg-5@0.0.2');
        testPackages[2].label.should.equal('vscode-pkg-6@1.2.3');
        logSpy.should.not.have.been.calledWith(LogType.ERROR);
    });

    it('should refresh the smart contract packages view when refresh is called', async () => {
        const onDidChangeTreeDataSpy: sinon.SinonSpy = mySandBox.spy(blockchainPackageExplorerProvider['_onDidChangeTreeData'], 'fire');

        await vscode.commands.executeCommand(ExtensionCommands.REFRESH_PACKAGES);
        onDidChangeTreeDataSpy.should.have.been.called;
        logSpy.should.not.have.been.calledWith(LogType.ERROR);
    });

    it('should get a tree item in BlockchainPackageExplorer', async () => {
        const packageFabricVersions: PackageFabricVersionTreeItem[] = await blockchainPackageExplorerProvider.getChildren() as Array<PackageFabricVersionTreeItem>;
        const testPackages: Array<PackageTreeItem> = await blockchainPackageExplorerProvider.getChildren(packageFabricVersions[0]) as Array<PackageTreeItem>;

        const firstTestPackage: PackageTreeItem = blockchainPackageExplorerProvider.getTreeItem(testPackages[0]) as PackageTreeItem;
        firstTestPackage.label.should.equal('vscode-pkg-1@0.0.1');
        firstTestPackage.tooltip.should.equal('vscode-pkg-1@0.0.1');
        logSpy.should.not.have.been.calledWith(LogType.ERROR);
    });
});
