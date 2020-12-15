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

import {SmartContractType, V1SmartContractPackage, SmartContractPackageBase, V2SmartContractPackage} from '../src';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import {NodePackager} from '../src/packager/Node';

const should: Chai.Should = chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const contractTypes: string[] = ['node', 'java', 'golang'];

const packagesDir: string = path.join(__dirname, 'data', 'packages');

const tests: { title: string, SmartContractPackage: any, packagePath: string, fileNames: string[] }[] = [
    {
        title: 'V1SmartContractPackage',
        SmartContractPackage: V1SmartContractPackage,
        packagePath: path.join(packagesDir, 'typescript-v1-contract.cds'),
        fileNames: [
            'src/.DS_Store', 'src/dist/index.d.ts', 'src/dist/index.js', 'src/dist/index.js.map', 'src/dist/my-asset-contract.d.ts',
            'src/dist/my-asset-contract.js', 'src/dist/my-asset-contract.js.map', 'src/dist/my-asset.d.ts', 'src/dist/my-asset.js',
            'src/dist/my-asset.js.map', 'src/package-lock.json', 'src/package.json', 'src/src/index.ts', 'src/src/my-asset-contract.spec.ts',
            'src/src/my-asset-contract.ts', 'src/src/my-asset.ts', 'src/transaction_data/my-asset-transactions.txdata',
        ],
    },
    {
        title: 'V2SmartContractPackage',
        SmartContractPackage: V2SmartContractPackage,
        packagePath: path.join(packagesDir, 'fabcar-javascript.tar.gz'),
        fileNames: [
            'metadata.json', 'src/.editorconfig', 'src/.eslintignore', 'src/.eslintrc.js', 'src/.gitignore', 'src/index.js',
            'src/lib/fabcar.js', 'src/package.json',
        ],
    }
];

describe('SmartContractPackage', () => {
    tests.forEach(({ SmartContractPackage, title, packagePath, fileNames }) => {
        describe(title, () => {
            describe(`createPackage`, () => {

                let mysandbox: sinon.SinonSandbox;

                beforeEach(() => {
                    delete process.env.GOPATH;
                    mysandbox = sinon.createSandbox();
                });

                afterEach(() => {
                    delete process.env.GOPATH;
                    mysandbox.restore();
                });

                for (const contractType of contractTypes) {
                    it(`should package the contract ${contractType}`, async () => {
                        const isGolangV1: boolean = SmartContractPackage === V1SmartContractPackage && contractType === 'golang';
                        const goPath: string = isGolangV1 ? path.join(__dirname, 'data', 'golang-gopath') : undefined;
                        const contractPath: string = isGolangV1 ? path.join('fab-car-mod') : path.join(__dirname, 'data', contractType);
                        const result: SmartContractPackageBase = await SmartContractPackage.createSmartContractPackage({
                            smartContractPath: contractPath,
                            name: `test-${contractType}`,
                            version: '0.0.1',
                            smartContractType: contractType as SmartContractType,
                            golangPath: goPath
                        });
                        should.exist(result.smartContractPackage);
                    });

                    it(`should package the ${contractType} contract with metadata`, async () => {
                        const isGolangV1: boolean = SmartContractPackage === V1SmartContractPackage && contractType === 'golang';
                        const goPath: string = isGolangV1 ? path.join(__dirname, 'data', 'golang-gopath') : undefined;
                        const contractPath: string = isGolangV1 ? path.join('fab-car-mod') : path.join(__dirname, 'data', contractType);
                        const metaPath: string = isGolangV1 ? path.join(goPath, 'src', 'fab-car-mod') : path.join(contractPath, 'META-INF');
                        const result: SmartContractPackageBase = await SmartContractPackage.createSmartContractPackage({
                            smartContractPath: contractPath,
                            name: `test-${contractType}`,
                            version: '0.0.1',
                            smartContractType: contractType as SmartContractType,
                            metaDataPath: metaPath,
                            golangPath: goPath
                        });
                        should.exist(result.smartContractPackage);
                    });
                }

                it('should give an error if no options', async () => {
                    // @ts-ignore
                    await SmartContractPackage.createSmartContractPackage().should.eventually.be.rejectedWith('Missing options');
                });

                it('should give an error if contractPath is empty', async () => {
                    await SmartContractPackage.createSmartContractPackage({
                        smartContractPath: '',
                        name: `test-node`,
                        version: '0.0.1',
                        smartContractType: SmartContractType.NODE
                    }).should.eventually.be.rejectedWith('Missing option smartContractPath');
                });

                it('should give an error if no name', async () => {
                    const contractPath: string = path.join(__dirname, 'data', 'node');
                    await SmartContractPackage.createSmartContractPackage({
                        name: '',
                        version: '0.0.1',
                        smartContractPath: contractPath,
                        smartContractType: SmartContractType.NODE
                    }).should.eventually.be.rejectedWith('Missing option name');
                });

                it('should give an error if no version', async () => {
                    const contractPath: string = path.join(__dirname, 'data', 'node');
                    await SmartContractPackage.createSmartContractPackage({
                        name: 'test-node',
                        version: '',
                        smartContractPath: contractPath,
                        smartContractType: SmartContractType.NODE
                    }).should.eventually.be.rejectedWith('Missing option version');
                });

                // V1SmartContractPackage has extra validation for name and version
                if (SmartContractPackage === V1SmartContractPackage) {
                    it('should give an error if name is invalid', async () => {
                        const contractPath: string = path.join(__dirname, 'data', 'node');
                        await SmartContractPackage.createSmartContractPackage({
                            name: 'some@me',
                            version: '0.0.1',
                            smartContractPath: contractPath,
                            smartContractType: SmartContractType.NODE
                        }).should.eventually.be.rejectedWith(`Invalid smart contract name 'some@me'. Smart contract names must only consist of alphanumerics, '_', and '-'`);
                    });

                    it('should give an error if version is invalid', async () => {
                        const contractPath: string = path.join(__dirname, 'data', 'node');
                        await SmartContractPackage.createSmartContractPackage({
                            name: 'test-node',
                            version: 'some@me',
                            smartContractPath: contractPath,
                            smartContractType: SmartContractType.NODE
                        }).should.eventually.be.rejectedWith(`Invalid smart contract version 'some@me'. Smart contract versions must only consist of alphanumerics, '_', '-', '+', and '.'`);
                    });
                }

                it('should give an error if no type', async () => {
                    const contractPath: string = path.join(__dirname, 'data', 'node');
                    await SmartContractPackage.createSmartContractPackage({
                        name: 'test-node',
                        version: '0.0.1',
                        smartContractPath: contractPath,
                        smartContractType: '' as SmartContractType
                    }).should.eventually.be.rejectedWith('Missing option smartContractType');
                });

                it('should give an error if type is not valid', async () => {
                    const contractPath: string = path.join(__dirname, 'data', 'node');
                    await SmartContractPackage.createSmartContractPackage({
                        name: 'test-node',
                        version: '0.0.1',
                        smartContractPath: contractPath,
                        smartContractType: 'banana' as SmartContractType
                    }).should.eventually.be.rejectedWith('option smartContractType must be set to one of: golang, node, or java');
                });

                if (SmartContractPackage !== V1SmartContractPackage) {
                    it('should give an error not a module and no go path set', async () => {
                        const contractPath: string = path.join(__dirname, 'data', 'golang');
                        mysandbox.stub(fs, 'pathExists').resolves(false);
                        await SmartContractPackage.createSmartContractPackage({
                            name: 'test-go',
                            version: '0.0.1',
                            smartContractPath: contractPath,
                            smartContractType: SmartContractType.GO
                        }).should.eventually.be.rejectedWith('option goLangPath was not set so tried to use environment variable GOPATH but this was not set either, one of these must be set');
                    });
                }

                it('should package go without a mod file', async () => {
                    const goPath: string = path.join(__dirname, 'data', 'golang-gopath');
                    const contractPath: string = path.join('fab-car');
                    const packagedContract: SmartContractPackageBase = await SmartContractPackage.createSmartContractPackage({
                        name: 'test-go',
                        version: '0.0.1',
                        smartContractPath: contractPath,
                        smartContractType: SmartContractType.GO,
                        golangPath: goPath
                    });

                    should.exist(packagedContract.smartContractPackage);
                });

                it('should package go with a mod file', async () => {
                    const isGolangV1: boolean = SmartContractPackage === V1SmartContractPackage;
                    const goPath: string = isGolangV1 ? path.join(__dirname, 'data', 'golang-gopath') : undefined;
                    const contractPath: string = isGolangV1 ? path.join('fab-car-mod') : path.join(__dirname, 'data', 'golang');
                    mysandbox.stub(fs, 'pathExists').resolves(true);
                    const packagedContract: SmartContractPackageBase = await SmartContractPackage.createSmartContractPackage({
                        name: 'test-go',
                        version: '0.0.1',
                        smartContractPath: contractPath,
                        smartContractType: SmartContractType.GO,
                        golangPath: goPath
                    });

                    should.exist(packagedContract.smartContractPackage);
                });

                it('should handle error from packaging', async () => {
                    mysandbox.stub(NodePackager.prototype, 'package').rejects(new Error('some error'));

                    const contractPath: string = path.join(__dirname, 'data', 'node');
                    await SmartContractPackage.createSmartContractPackage({
                        name: 'test-node',
                        version: '0.0.1',
                        smartContractPath: contractPath,
                        smartContractType: SmartContractType.NODE
                    }).should.eventually.be.rejectedWith('Could not package smart contract, received error: some error');

                })
            });

            describe('getFileNames', () => {
                let mysandbox: sinon.SinonSandbox;

                beforeEach(() => {
                    mysandbox = sinon.createSandbox();
                });

                afterEach(() => {
                    mysandbox.restore();
                });

                it(`should get the file names`, async () => {
                    const packageBuffer: Buffer = await fs.readFile(packagePath);
                    const smartContract: SmartContractPackageBase = new SmartContractPackage(packageBuffer);
                    const result: string[] = await smartContract.getFileNames();
                    result.should.deep.equal(fileNames);
                });

                it('should handle error', async () => {
                    const packageBuffer: Buffer = await fs.readFile(packagePath);
                    const smartContract: SmartContractPackageBase = new SmartContractPackage(packageBuffer);
                    // @ts-ignore
                    mysandbox.stub(smartContract, 'findFileNames').rejects({message: 'some error'});
                    await smartContract.getFileNames().should.eventually.be.rejectedWith(`Could not get file names for package, received error: some error`);
                });
            });

            describe(`getPackageInfo`, () => {
                let mysandbox: sinon.SinonSandbox;

                beforeEach(() => {
                    mysandbox = sinon.createSandbox();
                });

                afterEach(() => {
                    mysandbox.restore();
                });

                it(`should get the package information for v1 contracts`, async () => {
                    if (packagePath.endsWith('.cds')) {
                        const packageBuffer: Buffer = await fs.readFile(packagePath);
                        const pkgInfo: {name: string, version: string} = V1SmartContractPackage.nameAndVersionFromBuffer(packageBuffer);
                        pkgInfo.should.deep.equal({name: 'testv1typescript', version: '0.0.1'});
                    }
                });

            });
        });
    });
});
