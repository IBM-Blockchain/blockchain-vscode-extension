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
import { TestUtil } from '../TestUtil';
import * as fs from 'fs-extra';
import * as homeDir from 'home-dir';
import * as tmp from 'tmp';
import { PackageRegistry } from '../../src/packages/PackageRegistry';
import { PackageRegistryEntry } from '../../src/packages/PackageRegistryEntry';

chai.use(sinonChai);

// tslint:disable no-unused-expression
describe('PackageRegistry', () => {
    let mySandBox;
    let rootPath: string;
    let errorSpy;
    let infoSpy;

    const TEST_PACKAGE_DIRECTORY = path.join(path.dirname(__dirname), '../../test/data/smartContractDir');

    before(async () => {
        await TestUtil.setupTests();
        await TestUtil.storePackageDirectoryConfig();
        await vscode.workspace.getConfiguration().update('fabric.package.directory', TEST_PACKAGE_DIRECTORY, vscode.ConfigurationTarget.Global);
    });
    after(async () => {
        await TestUtil.restorePackageDirectoryConfig();
    });

    async function createTestFiles(dirName: string, packageName, version: string, language, createValid: boolean): Promise<void> {
        const smartContractDir = path.join(TEST_PACKAGE_DIRECTORY, language, dirName);

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

    async function checkFileDeleted(name: string, version: string, language: string) {
        await fs.stat(`${TEST_PACKAGE_DIRECTORY}/${language}/${name}`);
    }

    async function deleteTestFiles() {
        try {
            await fs.remove(TEST_PACKAGE_DIRECTORY);
        } catch (error) {
            if (!error.message.contains('ENOENT: no such file or directory')) {
                throw error;
            }
        }
    }

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
        rootPath = path.dirname(__dirname);
        errorSpy = mySandBox.spy(vscode.window, 'showErrorMessage');
        infoSpy = mySandBox.spy(vscode.window, 'showInformationMessage');

        await deleteTestFiles();
    });

    afterEach(async () => {
        mySandBox.restore();
        await deleteTestFiles();
    });

    it('should create the smart contract package directory if it doesn\'t exist', async () => {
        const packagesDir: string = tmp.dirSync().name;
        await vscode.workspace.getConfiguration().update('fabric.package.directory', packagesDir, true);

        const packageRegistry: PackageRegistry = PackageRegistry.instance();
        const packageRegistryEntries: PackageRegistryEntry[] = await packageRegistry.getAll();
        errorSpy.should.not.have.been.called;
        const smartContactPackageDirExists: boolean = await fs.pathExists(packagesDir);
        smartContactPackageDirExists.should.be.true;
        packageRegistryEntries.length.should.equal(0);
    });

    it('should understand the users home directory', async () => {
        const tildaTestDir: string = '~/test_dir';
        const homeTestDir: string = homeDir('~/test_dir'.replace('~', ''));
        await vscode.workspace.getConfiguration().update('fabric.package.directory', tildaTestDir, true);

        const readDirStub = mySandBox.stub(fs, 'readdir');
        readDirStub.onCall(0).rejects();
        const packageRegistry: PackageRegistry = PackageRegistry.instance();
        await packageRegistry.getAll();
        errorSpy.should.have.been.calledWith('Issue reading smart contract package folder:' + homeTestDir);
        // Check ~/test_dir isn't created
        const smartContactPackageDirExists: boolean = await fs.pathExists(tildaTestDir);
        smartContactPackageDirExists.should.be.false;
    });

    it('should throw an error if it fails to create the smart contract package directory', async () => {
        const packagesDir: string = path.join(rootPath, '../test/data/cake');
        await vscode.workspace.getConfiguration().update('fabric.package.directory', packagesDir, true);

        const readDirStub = mySandBox.stub(fs, 'readdir');
        readDirStub.onCall(0).rejects({message: 'no such file or directory'});
        const mkdirpStub = mySandBox.stub(fs, 'mkdirp');
        mkdirpStub.onCall(0).rejects();
        const packageRegistry: PackageRegistry = PackageRegistry.instance();
        await packageRegistry.getAll();
        errorSpy.should.have.been.calledWith('Issue creating smart contract package folder:' + packagesDir);
    });

    it('should ignore . packages', async () => {
        const packagesDir: string = path.join(rootPath, '../../test/data/smartContractDir');

        await vscode.workspace.getConfiguration().update('fabric.package.directory', packagesDir, true);

        await createTestFiles('.ignoreDirectory', 'ignore-directory', '1.0.0', 'javascript', true);

        const packages: Array<PackageRegistryEntry> = await PackageRegistry.instance().getAll();

        packages.length.should.equal(0);
    });

    it('should ignore . languages', async () => {
        const packagesDir: string = path.join(rootPath, '../../test/data/smartContractDir');

        await vscode.workspace.getConfiguration().update('fabric.package.directory', packagesDir, true);

        await createTestFiles('ignoreDirectory', 'ignore-directory', '1.0.0', '.ignore', true);

        const packages: Array<PackageRegistryEntry> = await PackageRegistry.instance().getAll();

        packages.length.should.equal(0);
    });

    it('should be able to read javascript packages', async () => {
        const packagesDir: string = path.join(rootPath, '../../test/data/smartContractDir');

        await vscode.workspace.getConfiguration().update('fabric.package.directory', packagesDir, true);

        await createTestFiles('packageOne', 'package-one', '1.0.0', 'javascript', true);
        await createTestFiles('packageTwo', 'package-two', '1.0.0', 'javascript', true);

        const packages: Array<PackageRegistryEntry> = await PackageRegistry.instance().getAll();

        packages.length.should.equal(2);

        packages[0].name.should.equal('packageOne');
        packages[0].chaincodeLanguage.should.equal('javascript');
        packages[0].version.should.equal('1.0.0');
        packages[0].path.should.equal(path.join(packagesDir, packages[0].chaincodeLanguage, packages[0].name));

        packages[1].name.should.equal('packageTwo');
        packages[1].chaincodeLanguage.should.equal('javascript');
        packages[1].version.should.equal('1.0.0');
        packages[1].path.should.equal(path.join(packagesDir, packages[1].chaincodeLanguage, packages[1].name));
    });

    it('should be able to read typescript packages', async () => {
        const packagesDir: string = path.join(rootPath, '../../test/data/smartContractDir');

        await vscode.workspace.getConfiguration().update('fabric.package.directory', packagesDir, true);

        await createTestFiles('packageOne', 'package-one', '1.0.0', 'typescript', true);
        await createTestFiles('packageTwo', 'package-two', '1.0.0', 'typescript', true);

        const packages: Array<PackageRegistryEntry> = await PackageRegistry.instance().getAll();

        packages.length.should.equal(2);

        packages[0].name.should.equal('packageOne');
        packages[0].chaincodeLanguage.should.equal('typescript');
        packages[0].version.should.equal('1.0.0');
        packages[0].path.should.equal(path.join(packagesDir, packages[0].chaincodeLanguage, packages[0].name));

        packages[1].name.should.equal('packageTwo');
        packages[1].chaincodeLanguage.should.equal('typescript');
        packages[1].version.should.equal('1.0.0');
        packages[1].path.should.equal(path.join(packagesDir, packages[1].chaincodeLanguage, packages[1].name));
    });

    it('should be able to read go packages', async () => {
        const packagesDir: string = path.join(rootPath, '../../test/data/smartContractDir');

        await vscode.workspace.getConfiguration().update('fabric.package.directory', packagesDir, true);

        await createTestFiles('packageOne', 'package-one', '1.0.0', 'go/src', true);
        await createTestFiles('packageTwo', 'package-two', '1.0.0', 'go/src', true);

        const packages: Array<PackageRegistryEntry> = await PackageRegistry.instance().getAll();

        packages.length.should.equal(2);

        packages[0].name.should.equal('packageOne');
        packages[0].chaincodeLanguage.should.equal('go');
        // TODO: put this back in once got proper packaging
        // packages[0].version.should.equal('1.0.0');
        packages[0].path.should.equal(path.join(packagesDir, packages[0].chaincodeLanguage, 'src', packages[0].name));

        packages[1].name.should.equal('packageTwo');
        packages[1].chaincodeLanguage.should.equal('go');
        // TODO: put this back in once got proper packaging
        //  packages[1].version.should.equal('1.0.0');
        packages[1].path.should.equal(path.join(packagesDir, packages[1].chaincodeLanguage, 'src', packages[1].name));
    });

    it('should show a message if it fails to read a go smart contract package directory', async () => {
        const packagesDir: string = path.join(rootPath, '../../test/data/smartContractDir');

        const goPackagesDir: string = path.join(rootPath, '../../test/data/smartContractDir/go/src');
        await fs.mkdirp(goPackagesDir);

        await createTestFiles('myPackage', 'my-package', '1.0.0', 'javascript', true);

        const packagesDirContents: string[] = await fs.readdir(packagesDir);
        const javascriptContents: string[] = await fs.readdir(packagesDir + '/javascript');
        await vscode.workspace.getConfiguration().update('fabric.package.directory', packagesDir, true);

        const readDirStub = mySandBox.stub(fs, 'readdir');
        readDirStub.onCall(0).resolves(packagesDirContents);
        readDirStub.onCall(1).rejects();
        readDirStub.onCall(2).resolves(javascriptContents);

        const packageRegistry: PackageRegistry = PackageRegistry.instance();
        const packageRegistryEntries: PackageRegistryEntry[] = await packageRegistry.getAll();
        infoSpy.should.have.been.calledWith('Issue listing smart contract packages in:' + goPackagesDir);
        errorSpy.should.not.have.been.called;

        packageRegistryEntries.length.should.equal(1);

        packageRegistryEntries[0].name.should.equal('myPackage');
        packageRegistryEntries[0].chaincodeLanguage.should.equal('javascript');
        packageRegistryEntries[0].version.should.equal('1.0.0');
        packageRegistryEntries[0].path.should.equal(path.join(packagesDir, packageRegistryEntries[0].chaincodeLanguage, packageRegistryEntries[0].name));
    });

    it('should show error if no package json in javascript package', async () => {
        const packagesDir: string = path.join(rootPath, '../../test/data/smartContractDir');

        await vscode.workspace.getConfiguration().update('fabric.package.directory', packagesDir, true);

        await createTestFiles('packageOne', 'package-one', '1.0.0', 'javascript', false);

        const packages: Array<PackageRegistryEntry> = await PackageRegistry.instance().getAll();

        packages.length.should.equal(0);
    });

    it('should delete package', async () => {
        await createTestFiles('DeleteThisDirectory', 'delete-this-directory', '1.0.0', 'javascript', true);

        const packageRegistry: PackageRegistry = PackageRegistry.instance();

        const packages: Array<PackageRegistryEntry> = await packageRegistry.getAll();

        const packageEntry: PackageRegistryEntry = packages[0];

        await packageRegistry.delete(packageEntry);

        await checkFileDeleted('DeleteThisDirectory', '1.0.0', 'javascript').should.be.rejected;
    });

    it('should delete Go packages', async () => {
        await createTestFiles('DeleteThisDirectory', 'delete-this-directory', '1.0.0', 'go/src', true);

        const packageRegistry: PackageRegistry = PackageRegistry.instance();

        const packageEntries: Array<PackageRegistryEntry> = await packageRegistry.getAll();

        const packageEntry = packageEntries[0];

        await packageRegistry.delete(packageEntry);

        await checkFileDeleted('DeleteThisDirectory', '', 'go/src').should.be.rejected;
    });
});
