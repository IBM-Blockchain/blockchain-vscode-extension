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
import * as myExtension from '../../src/extension';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { PackageTreeItem } from '../../src/explorer/model/PackageTreeItem';
import { TestUtil } from '../TestUtil';
import { BlockchainPackageExplorerProvider } from '../../src/explorer/packageExplorer';
import { ExtensionCommands } from '../../ExtensionCommands';
import { VSCodeBlockchainOutputAdapter } from '../../src/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../../src/logging/OutputAdapter';

chai.use(sinonChai);
chai.should();

// tslint:disable no-unused-expression
describe('packageExplorer', () => {
    let mySandBox: sinon.SinonSandbox;
    let logSpy: sinon.SinonSpy;
    let blockchainPackageExplorerProvider: BlockchainPackageExplorerProvider;
    const rootPath: string = path.dirname(__dirname);
    const testDir: string = path.join(rootPath, '../../test/data/packageDir');

    before(async () => {
        await TestUtil.setupTests();
        await TestUtil.storeExtensionDirectoryConfig();
        await TestUtil.storeGatewaysConfig();
        await TestUtil.storeRuntimesConfig();
    });

    after(async () => {
        await TestUtil.restoreExtensionDirectoryConfig();
        await TestUtil.restoreGatewaysConfig();
        await TestUtil.restoreRuntimesConfig();

    });

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
        logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
        blockchainPackageExplorerProvider = myExtension.getBlockchainPackageExplorerProvider();
        await vscode.workspace.getConfiguration().update('blockchain.ext.directory', testDir, true);
    });

    afterEach(async () => {
        mySandBox.restore();
    });

    it('should show smart contract packages in the BlockchainPackageExplorer view', async () => {
        const testPackages: Array<PackageTreeItem> = await blockchainPackageExplorerProvider.getChildren() as Array<PackageTreeItem>;
        testPackages.length.should.equal(3);
        testPackages[0].label.should.equal('vscode-pkg-1@0.0.1');
        testPackages[1].label.should.equal('vscode-pkg-2@0.0.2');
        testPackages[2].label.should.equal('vscode-pkg-3@1.2.3');
        logSpy.should.not.have.been.calledWith(LogType.ERROR);
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
        firstTestPackage.label.should.equal('vscode-pkg-1@0.0.1');
        firstTestPackage.tooltip.should.equal('vscode-pkg-1@0.0.1');
        logSpy.should.not.have.been.calledWith(LogType.ERROR);
    });
});
