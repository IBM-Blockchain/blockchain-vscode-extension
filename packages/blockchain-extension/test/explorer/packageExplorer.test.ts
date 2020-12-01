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
import { PackageTreeItem } from '../../extension/explorer/model/PackageTreeItem';
import { TestUtil } from '../TestUtil';
import { BlockchainPackageExplorerProvider } from '../../extension/explorer/packageExplorer';
import { ExtensionCommands } from '../../ExtensionCommands';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from 'ibm-blockchain-platform-common';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';
import { PackageRegistry } from '../../extension/registries/PackageRegistry';
import { PackageRegistryEntry } from '../../extension/registries/PackageRegistryEntry';

chai.use(sinonChai);
chai.should();

// tslint:disable no-unused-expression
describe('packageExplorer', () => {
    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();
    let logSpy: sinon.SinonSpy;
    let blockchainPackageExplorerProvider: BlockchainPackageExplorerProvider;
    const rootPath: string = path.dirname(__dirname);
    const testDir: string = path.join(rootPath, '../../test/data/packageDir/v2/packages');
    const packageDir: string = path.join(TestUtil.EXTENSION_TEST_DIR, 'v2', 'packages');

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

    it('should show smart contract packages in the BlockchainPackageExplorer view', async () => {
        const testPackages: Array<PackageTreeItem> = await blockchainPackageExplorerProvider.getChildren() as Array<PackageTreeItem>;
        testPackages.length.should.equal(5);
        testPackages[0].label.should.equal('fabcar-go.tgz');
        testPackages[1].label.should.equal('fabcar-java.tar.gz');
        testPackages[2].label.should.equal('fabcar-javascript@0.0.1.tar.gz');
        testPackages[3].label.should.equal('fabcar-typescript@0.0.2.tgz');
        testPackages[4].label.should.equal('mypackage@0.0.1.cds');
        logSpy.should.not.have.been.calledWith(LogType.ERROR);
    });

    it('should say that there are no packages', async () => {

        await PackageRegistry.instance().clear();
        const packages: Array<PackageTreeItem> = await blockchainPackageExplorerProvider.getChildren() as Array<PackageTreeItem>;
        packages.length.should.equal(1);
        packages[0].label.should.equal(`No packages found`);
    });

    it('should refresh the smart contract packages view when refresh is called', async () => {
        const onDidChangeTreeDataSpy: sinon.SinonSpy = mySandBox.spy(blockchainPackageExplorerProvider['_onDidChangeTreeData'], 'fire');

        await vscode.commands.executeCommand(ExtensionCommands.REFRESH_PACKAGES);
        onDidChangeTreeDataSpy.should.have.been.called;
        logSpy.should.not.have.been.calledWith(LogType.ERROR);
    });

    it('should get a tree item in BlockchainPackageExplorer', async () => {
        const testPackages: Array<PackageTreeItem> = await blockchainPackageExplorerProvider.getChildren() as Array<PackageTreeItem>;

        const firstTestPackage: PackageTreeItem = blockchainPackageExplorerProvider.getTreeItem(testPackages[0]) as PackageTreeItem;
        firstTestPackage.label.should.equal('fabcar-go.tgz');
        firstTestPackage.tooltip.should.equal('fabcar-go.tgz\nFile size: 2359 KB');
        logSpy.should.not.have.been.calledWith(LogType.ERROR);
    });

    it('should show Fabric V1 contracts (endsWith .cds)', async () => {
        const newPackage: PackageRegistryEntry = new PackageRegistryEntry({
            name: 'smartContractPackageBlue',
            version: '0.0.1',
            path: 'smartContractPackageBlue@0.0.1.cds',
            sizeKB: 12
        });

        mySandBox.stub(PackageRegistry.instance(), 'getAll').resolves([newPackage]);
        const testPackages: Array<PackageTreeItem> = await blockchainPackageExplorerProvider.getChildren() as Array<PackageTreeItem>;
        testPackages.length.should.equal(1);
        testPackages[0].label.should.equal('smartContractPackageBlue@0.0.1.cds');
    });
});
