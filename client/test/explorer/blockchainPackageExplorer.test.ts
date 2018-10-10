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
import * as fs from 'fs-extra';

chai.use(sinonChai);
const should = chai.should();

// tslint:disable no-unused-expression
describe('BlockchainPackageExplorer', () => {
    let mySandBox;
    let errorSpy;
    let blockchainPackageExplorerProvider;
    let infoSpy;
    const rootPath: string = path.dirname(__dirname);
    const testDir: string = path.join(rootPath, '../../test/data/smartContractDir');

    async function createTestFiles(dirName: string, packageName, version: string, language, createValid: boolean): Promise<void> {
        const smartContractDir: string = path.join(rootPath, '../../test/data/smartContractDir', language, dirName);

        try {
            await fs.mkdirp(smartContractDir);
        } catch (error) {
            console.log(error);
        }

        if (createValid) {
            if (language !== 'go/src') {
                const packageJsonFile = smartContractDir + '/package.json';
                const content = {
                    name: `${packageName}`,
                    version: version,
                    description: 'My smart contract'
                };
                await fs.writeFile(packageJsonFile, JSON.stringify(content));
            }
        } else {
            const textFile = smartContractDir + '/text.txt';
            const content = 'hello';
            await fs.writeFile(textFile, content);
        }
    }

    before(async () => {
        await TestUtil.setupTests();
        await TestUtil.storePackageDirectoryConfig();
        await TestUtil.storeConnectionsConfig();
        await TestUtil.storeRuntimesConfig();
    });

    after(async () => {
        await TestUtil.restorePackageDirectoryConfig();
        await TestUtil.restoreConnectionsConfig();
        await TestUtil.restoreRuntimesConfig();

    });

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
        errorSpy = mySandBox.spy(vscode.window, 'showErrorMessage');
        infoSpy = mySandBox.spy(vscode.window, 'showInformationMessage');
        blockchainPackageExplorerProvider = myExtension.getBlockchainPackageExplorerProvider();

        await TestUtil.deleteTestFiles(testDir);
    });

    afterEach(async () => {
        mySandBox.restore();
        await TestUtil.deleteTestFiles(testDir);
    });

    it('should show smart contract packages in the BlockchainPackageExplorer view', async () => {
        await createTestFiles('smartContractGo@1.0.0', 'package-go', '1.0.0', 'go/src', true);
        await createTestFiles('smartContractPackageBlue', 'package-blue', '1.0.0', 'javascript', true);
        await createTestFiles('smartContractPackageGreen', 'package-green', '1.0.0', 'javascript', true);

        const packagesDir: string = path.join(rootPath, '../../test/data/smartContractDir');
        await vscode.workspace.getConfiguration().update('fabric.package.directory', packagesDir, true);

        blockchainPackageExplorerProvider = myExtension.getBlockchainPackageExplorerProvider();
        const testPackages: Array<PackageTreeItem> = await blockchainPackageExplorerProvider.getChildren();
        testPackages.length.should.equal(3);
        testPackages[0].label.should.equal('smartContractGo@1.0.0');
        testPackages[1].label.should.equal('package-blue@1.0.0');
        testPackages[2].label.should.equal('package-green@1.0.0');
        errorSpy.should.not.have.been.called;

    });
    it('should refresh the smart contract packages view when refresh is called', async () => {
        const onDidChangeTreeDataSpy = mySandBox.spy(blockchainPackageExplorerProvider['_onDidChangeTreeData'], 'fire');

        await vscode.commands.executeCommand('blockchainAPackageExplorer.refreshEntry');
        onDidChangeTreeDataSpy.should.have.been.called;
        errorSpy.should.not.have.been.called;
    });

    it('should get a tree item in BlockchainPackageExplorer', async () => {
        const packagesDir: string = path.join(rootPath, '../../test/data/smartContractDir');

        await createTestFiles('smartContractPackageBlue', 'my-contract', '1.0.0', 'javascript', true);

        await vscode.workspace.getConfiguration().update('fabric.package.directory', packagesDir, true);

        const testPackages: Array<PackageTreeItem> = await blockchainPackageExplorerProvider.getChildren();

        const firstTestPackage: PackageTreeItem = blockchainPackageExplorerProvider.getTreeItem(testPackages[0]) as PackageTreeItem;
        firstTestPackage.label.should.equal('my-contract@1.0.0');
        firstTestPackage.tooltip.should.equal('my-contract@1.0.0');
        errorSpy.should.not.have.been.called;
    });
});
