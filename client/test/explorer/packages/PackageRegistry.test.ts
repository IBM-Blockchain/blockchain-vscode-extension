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
import * as myExtension from '../../../src/extension';

import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { TestUtil } from '../../TestUtil';
import * as fs_extra from 'fs-extra';
import * as homeDir from 'home-dir';
import * as tmp from 'tmp';
import { PackageRegistry } from '../../../src/explorer/packages/PackageRegistry';
import { PackageRegistryEntry } from '../../../src/explorer/packages/PackageRegistryEntry';

chai.use(sinonChai);
const should = chai.should();

// tslint:disable no-unused-expression
describe('BlockchainPackageExplorer', () => {
    let mySandBox;
    let rootPath: string;
    let errorSpy;
    let infoSpy;

    before(async () => {
        await TestUtil.setupTests();
    });

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
        rootPath = path.dirname(__dirname);
        errorSpy = mySandBox.spy(vscode.window, 'showErrorMessage');
        infoSpy = mySandBox.spy(vscode.window, 'showInformationMessage');
    });

    afterEach(() => {
        mySandBox.restore();
    });

    it('should create the smart contract package directory if it doesn\'t exist', async () => {
        const packagesDir: string = tmp.dirSync().name;
        await vscode.workspace.getConfiguration().update('fabric.package.directory', packagesDir, true);

        const packageRegistry: PackageRegistry = PackageRegistry.instance();
        const packageRegistryEntries: PackageRegistryEntry[] = await packageRegistry.getAll();
        errorSpy.should.not.have.been.called;
        const smartContactPackageDirExists: boolean = await fs_extra.pathExists(packagesDir);
        smartContactPackageDirExists.should.be.true;
        packageRegistryEntries.length.should.equal(0);
    });

    it('should understand the users home directory', async () => {
        const tildaTestDir: string = '~/test_dir';
        const homeTestDir: string = homeDir('~/test_dir'.replace('~', ''));
        await vscode.workspace.getConfiguration().update('fabric.package.directory', tildaTestDir, true);

        const readDirStub = mySandBox.stub(fs_extra, 'readdir');
        readDirStub.onCall(0).rejects();
        const packageRegistry: PackageRegistry = PackageRegistry.instance();
        await packageRegistry.getAll();
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
        const packageRegistry: PackageRegistry = PackageRegistry.instance();
        await packageRegistry.getAll();
        errorSpy.should.have.been.calledWith('Issue creating smart contract package folder:' + packagesDir);
    });

    it('should show a message if it fails to read a go smart contract package directory', async () => {
        const packagesDir: string = path.join(rootPath, '../../../test/data/smartContractDir');
        const goPackagesDir: string = path.join(rootPath, '../../../test/data/smartContractDir/go/src');
        const javascriptPackagesDir: string = path.join(rootPath, '../../../test/data/smartContractDir/javascript');
        const typescriptPackagesDir: string = path.join(rootPath, '../../../test/data/smartContractDir/typescript');
        const packagesDirContents: string[] = await fs_extra.readdir(packagesDir);
        const javascriptPackagesDirContents: string[] = await fs_extra.readdir(javascriptPackagesDir);
        const typescriptPackagesDirContents: string[] = await fs_extra.readdir(typescriptPackagesDir);
        await vscode.workspace.getConfiguration().update('fabric.package.directory', packagesDir, true);

        const readDirStub = mySandBox.stub(fs_extra, 'readdir');
        readDirStub.onCall(0).resolves(packagesDirContents);
        readDirStub.onCall(1).rejects();
        readDirStub.onCall(2).resolves(javascriptPackagesDirContents);
        readDirStub.onCall(3).resolves(typescriptPackagesDirContents);
        const packageRegistry: PackageRegistry = PackageRegistry.instance();
        const packageRegistryEntries: PackageRegistryEntry[] = await packageRegistry.getAll();
        infoSpy.should.have.been.calledWith('Issue listing smart contract packages in:' + goPackagesDir);

        packageRegistryEntries.length.should.equal(4);
        packageRegistryEntries[0].name.should.equal('smartContractPackageBlue');
        packageRegistryEntries[1].name.should.equal('smartContractPackageGreen');
        packageRegistryEntries[2].name.should.equal('smartContractPackagePurple');
        packageRegistryEntries[3].name.should.equal('smartContractPackageYellow');
        errorSpy.should.not.have.been.called;
    });

    it('should correctly determine the version and chaincode language of smart contract packages', async () => {
        const packagesDir: string = path.join(rootPath, '../../../test/data/smartContractDir');
        await vscode.workspace.getConfiguration().update('fabric.package.directory', packagesDir, true);

        const packageRegistry: PackageRegistry = PackageRegistry.instance();
        const packageRegistryEntries: PackageRegistryEntry[] = await packageRegistry.getAll();
        packageRegistryEntries.length.should.equal(5);
        packageRegistryEntries[0].version.should.equal(''); // smartContractPackageGo
        packageRegistryEntries[0].chaincodeLanguage.should.equal('go');
        packageRegistryEntries[1].version.should.equal(''); // smartContractPackageBlue
        packageRegistryEntries[1].chaincodeLanguage.should.equal('javascript');
        packageRegistryEntries[2].version.should.equal('00.01.555'); // smartContractPackageGreen
        packageRegistryEntries[2].chaincodeLanguage.should.equal('javascript');
        packageRegistryEntries[3].version.should.equal('91.836.0'); // smartContractPackagePurple
        packageRegistryEntries[3].chaincodeLanguage.should.equal('typescript');
        packageRegistryEntries[4].version.should.equal(''); // smartContractPackageYellow
        packageRegistryEntries[4].chaincodeLanguage.should.equal('typescript');
        errorSpy.should.not.have.been.called;
    });
});
