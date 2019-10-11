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
import { PackageTreeItem } from '../../extension/explorer/model/PackageTreeItem';
import { TestUtil } from '../TestUtil';
import { BlockchainPackageExplorerProvider } from '../../extension/explorer/packageExplorer';
import { ExtensionCommands } from '../../ExtensionCommands';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../../extension/logging/OutputAdapter';
import { SettingConfigurations } from '../../configurations';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';

chai.use(sinonChai);
chai.should();

// tslint:disable no-unused-expression
describe('packageExplorer', () => {
    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();
    let logSpy: sinon.SinonSpy;
    let blockchainPackageExplorerProvider: BlockchainPackageExplorerProvider;
    const rootPath: string = path.dirname(__dirname);
    const testDir: string = path.join(rootPath, '../../test/data/packageDir');

    before(async () => {
        await TestUtil.setupTests(mySandBox);
    });

    beforeEach(async () => {
        logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
        blockchainPackageExplorerProvider = ExtensionUtil.getBlockchainPackageExplorerProvider();
        await vscode.workspace.getConfiguration().update(SettingConfigurations.EXTENSION_DIRECTORY, testDir, true);
    });

    afterEach(async () => {
        mySandBox.restore();
    });

    after(async () => {
        await vscode.workspace.getConfiguration().update(SettingConfigurations.EXTENSION_DIRECTORY, TestUtil.EXTENSION_TEST_DIR, vscode.ConfigurationTarget.Global);
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
