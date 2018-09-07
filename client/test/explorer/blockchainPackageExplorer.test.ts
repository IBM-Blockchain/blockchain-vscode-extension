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
import { ExtensionUtil } from '../../src/util/ExtensionUtil';
import { CommandUtil } from '../../src/util/CommandUtil';
import { TestUtil } from '../TestUtil';
import * as fs_extra from 'fs-extra';
import * as homeDir from 'home-dir';

chai.use(sinonChai);
const should = chai.should();

// tslint:disable no-unused-expression
describe('BlockchainPackageExplorer', () => {
    let USER_PACKAGE_DIRECTORY;
    let mySandBox;
    let rootPath: string;
    let errorSpy;
    let blockchainPackageExplorerProvider;
    let infoSpy;

    before(async () => {
        USER_PACKAGE_DIRECTORY = await vscode.workspace.getConfiguration().get('fabric.package.directory');
        await TestUtil.setupTests();
    });

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
        rootPath = path.dirname(__dirname);
        errorSpy = mySandBox.spy(vscode.window, 'showErrorMessage');
        infoSpy = mySandBox.spy(vscode.window, 'showInformationMessage');
        blockchainPackageExplorerProvider = myExtension.getBlockchainPackageExplorerProvider();
    });

    afterEach(() => {
        mySandBox.restore();
    });

    after(async () => {
        await vscode.workspace.getConfiguration().update('fabric.package.directory', USER_PACKAGE_DIRECTORY, vscode.ConfigurationTarget.Global);
    });

    it('should show smart contract packages in the BlockchainPackageExplorer view', async () => {
        const packagesDir: string = path.join(rootPath, '../../test/data/smartContractDir');
        await vscode.workspace.getConfiguration().update('fabric.package.directory', packagesDir, true);

        blockchainPackageExplorerProvider = myExtension.getBlockchainPackageExplorerProvider();

        const commandUtilSpy = mySandBox.spy(CommandUtil, 'getPackages');
        const testPackages: Array<PackageTreeItem> = await blockchainPackageExplorerProvider.getChildren();
        commandUtilSpy.should.have.been.called;

        testPackages.length.should.equal(5);
        testPackages[0].label.should.equal('smartContractPackageGo');
        testPackages[1].label.should.equal('smartContractPackageBlue'); // purposefully doesn't contain package.json
        testPackages[2].label.should.equal('smartContractPackageGreen - v00.01.555');
        testPackages[3].label.should.equal('smartContractPackagePurple - v91.836.0');
        testPackages[4].label.should.equal('smartContractPackageYellow');
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
        await vscode.workspace.getConfiguration().update('fabric.package.directory', packagesDir, true);

        const testPackages: Array<PackageTreeItem> = await blockchainPackageExplorerProvider.getChildren();

        const firstTestPackage: PackageTreeItem = blockchainPackageExplorerProvider.getTreeItem(testPackages[1]) as PackageTreeItem;
        firstTestPackage.label.should.equal('smartContractPackageBlue');
        firstTestPackage.tooltip.should.equal('smartContractPackageBlue');
        errorSpy.should.not.have.been.called;
    });

    it('should show a message if it fails to read a go smart contract package directory', async () => {
        const packagesDir: string = path.join(rootPath, '../../test/data/smartContractDir');
        const goPackagesDir: string = path.join(rootPath, '../../test/data/smartContractDir/go/src');
        const packagesDirContents: string[] = await fs_extra.readdir(packagesDir);
        await vscode.workspace.getConfiguration().update('fabric.package.directory', packagesDir, true);

        const readDirStub = mySandBox.stub(fs_extra, 'readdir');
        readDirStub.onCall(0).resolves(packagesDirContents);
        readDirStub.onCall(1).rejects();
        blockchainPackageExplorerProvider = myExtension.getBlockchainPackageExplorerProvider();
        const testPackages: Array<PackageTreeItem> = await blockchainPackageExplorerProvider.getChildren();
        infoSpy.should.have.been.calledWith('Issue listing go smart contract packages in:' + goPackagesDir);

        testPackages.length.should.equal(4);
        testPackages[0].label.should.equal('smartContractPackageBlue');
        testPackages[1].label.should.equal('smartContractPackageGreen - v00.01.555');
        testPackages[2].label.should.equal('smartContractPackagePurple - v91.836.0');
        testPackages[3].label.should.equal('smartContractPackageYellow');
        errorSpy.should.not.have.been.called;
    });

});
