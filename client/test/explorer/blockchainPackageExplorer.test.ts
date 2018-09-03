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
import { TestUtil } from '../TestUtil';
import * as fs_extra from 'fs-extra';
import * as homeDir from 'home-dir';
import * as tmp from 'tmp';

chai.use(sinonChai);
const should = chai.should();

// tslint:disable no-unused-expression
describe('BlockchainPackageExplorer', () => {
    let mySandBox;
    let rootPath: string;
    let errorSpy;
    let blockchainPackageExplorerProvider;
    let infoSpy;

    before(async () => {
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

    it('should show smart contract packages in the BlockchainPackageExplorer view', async () => {
        const packagesDir: string = path.join(rootPath, '../../test/data/smartContractDir');
        await vscode.workspace.getConfiguration().update('fabric.package.directory', packagesDir, true);

        blockchainPackageExplorerProvider = myExtension.getBlockchainPackageExplorerProvider();
        const testPackages: Array<PackageTreeItem> = await blockchainPackageExplorerProvider.getChildren();

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

    it('should create the smart contract package directory if it doesn\'t exist', async () => {
        const packagesDir: string = tmp.dirSync().name;
        await vscode.workspace.getConfiguration().update('fabric.package.directory', packagesDir, true);

        blockchainPackageExplorerProvider = myExtension.getBlockchainPackageExplorerProvider();
        const testPackages: Array<PackageTreeItem> = await blockchainPackageExplorerProvider.getChildren();
        errorSpy.should.not.have.been.called;
        const smartContactPackageDirExists: boolean = await fs_extra.pathExists(packagesDir);
        smartContactPackageDirExists.should.be.true;
        testPackages.length.should.equal(0);
    });

    it('should understand the users home directory', async () => {
        const tildaTestDir: string = '~/test_dir';
        const homeTestDir: string = homeDir('~/test_dir'.replace('~', ''));
        await vscode.workspace.getConfiguration().update('fabric.package.directory', tildaTestDir, true);

        const readDirStub = mySandBox.stub(fs_extra, 'readdir');
        readDirStub.onCall(0).rejects();
        await blockchainPackageExplorerProvider.getChildren();
        errorSpy.should.have.been.calledWith('Issue reading smart contract package folder:' + homeTestDir);
        // Check ~/test_dir isn't created
        const smartContactPackageDirExists: boolean = await fs_extra.pathExists(tildaTestDir);
        smartContactPackageDirExists.should.be.false;
    });

    it('should throw an error if it fails to create the smart contract package directory', async () => {
        const packagesDir: string = path.join(rootPath, '../../test/data/cake');
        await vscode.workspace.getConfiguration().update('fabric.package.directory', packagesDir, true);

        const readDirStub = mySandBox.stub(fs_extra, 'readdir');
        readDirStub.onCall(0).rejects({message: 'no such file or directory'});
        const mkdirpStub = mySandBox.stub(fs_extra, 'mkdirp');
        mkdirpStub.onCall(0).rejects();
        await blockchainPackageExplorerProvider.getChildren();
        errorSpy.should.have.been.calledWith('Issue creating smart contract package folder:' + packagesDir);
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
