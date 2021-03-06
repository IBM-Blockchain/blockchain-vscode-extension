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

import * as sinon from 'sinon';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as fs from 'fs-extra';
import * as path from 'path';
import { PackageSmartContract } from '../src/PackageSmartContract';

chai.use(chaiAsPromised);

// tslint:disable no-unused-expression

describe('PackageSmartContract', () => {
    let mySandBox: sinon.SinonSandbox;
    const rootPath: string = path.dirname(__dirname);
    const fileDest: string = path.join(rootPath, 'test', 'tmp', 'packages');
    const testWorkspace: string = path.join(rootPath, 'test', 'tmp', 'testWorkspace');
    const emptyContent: string = '{}';

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
        await fs.mkdirp(fileDest);
    });

    afterEach(async () => {
        mySandBox.restore();
        await fs.remove(path.join(rootPath, 'tmp'));
    });

    async function createTestFiles(packageName: string, version: string, createMetadata: boolean): Promise<void> {
        let projectDir: string;
        const replaceRegex: RegExp = /@.*?\//;
        if (replaceRegex.test(packageName)) {
            projectDir = path.join(testWorkspace, packageName.replace(replaceRegex, ''));
        } else {
            projectDir = path.join(testWorkspace, packageName);
        }

        try {
            await fs.remove(projectDir);
        } catch (error) {
            // tslint:disable no-console
            console.log(error);
        }

        try {
            await fs.mkdirp(projectDir);
        } catch (error) {
            // tslint:disable no-console
            console.log(error);
        }

        const packageJsonFile: string = path.join(projectDir, 'package.json');
        const jsChaincode: string = path.join(projectDir, 'chaincode.js');
        const jsonContent: any = {
            name: `${packageName}`,
            version: version,
            description: 'My Smart Contract',
            author: 'John Doe',
            license: 'Apache-2.0'
        };

        const textFile: string = path.join(projectDir, 'chaincode.ts');
        await fs.writeFile(textFile, emptyContent);

        await fs.writeFile(jsChaincode, emptyContent);
        await fs.writeFile(packageJsonFile, JSON.stringify(jsonContent));

        if (createMetadata) {
            const metadataDir: string = path.join(projectDir, 'META-INF', 'statedb', 'couchdb', 'indexes');
            await fs.mkdirp(metadataDir);
            const indexOwnerFile: string = path.join(metadataDir, 'indexOwner.json');
            await fs.writeJson(indexOwnerFile, {
                index: {
                    fields: ['docType', 'owner']
                },
                ddoc: 'indexOwnerDoc',
                name: 'indexOwner',
                type: 'json'
            });
        }
    }

    describe('packageContract', () => {
        it('should package a smart contract using Fabric version 1', async () => {
            await createTestFiles('myContract', '0.0.1', false);
            const contractPath: string = path.join(testWorkspace, 'myContract');
            const pkgFile: string = path.join(fileDest, 'myContract@0.0.1.cds');
            const files: string[] = await PackageSmartContract.packageContract(1, 'myContract', '0.0.1', contractPath, pkgFile, 'node', null);
            files.should.deep.equal(['src/chaincode.js', 'src/chaincode.ts', 'src/package.json']);
        });
        it('should package a smart contract using Fabric version 2', async () => {
            await createTestFiles('myContract', '0.0.1', false);
            const contractPath: string = path.join(testWorkspace, 'myContract');
            const pkgFile: string = path.join(fileDest, 'myContract@0.0.1.tar.gz');
            const files: string[] = await PackageSmartContract.packageContract(2, 'myContract', '0.0.1', contractPath, pkgFile, 'node', null);
            files.should.deep.equal(['metadata.json', 'src/chaincode.js', 'src/chaincode.ts', 'src/package.json']);
        });

        it('should package a smart contract with meta data using Fabric version 2', async () => {
            await createTestFiles('myContract', '0.0.1', true);
            const contractPath: string = path.join(testWorkspace, 'myContract');
            const pkgFile: string = path.join(fileDest, 'myContract@0.0.1.tar.gz');
            const metadataPath: string = path.join(contractPath, 'META-INF');
            const files: string[] = await PackageSmartContract.packageContract(2, 'myContract', '0.0.1', contractPath, pkgFile, 'node', metadataPath);
            files.should.deep.equal(['metadata.json', 'src/chaincode.js', 'src/chaincode.ts', 'src/META-INF/statedb/couchdb/indexes/indexOwner.json', 'src/package.json', 'META-INF/statedb/couchdb/indexes/indexOwner.json']);
        });

        it('should throw an error when an invalid Fabric version is passed', async () => {
            await createTestFiles('myContract', '0.0.1', false);
            const contractPath: string = path.join(testWorkspace, 'myContract');
            await PackageSmartContract.packageContract(0, 'myContract', '0.0.1', contractPath, 'filepath', 'node', null).should.eventually.be.rejected;
        });
    });

    describe('getPackageInfo', () => {
        it('should return chaincode name and version', async () => {
            await createTestFiles('myContract', '0.0.1', false);
            const pkgFile: string = path.join(fileDest, 'myContract@0.0.1.cds');
            const pkgBuffer: Buffer = await fs.readFile(pkgFile);
            const pkgInfo: {name: string, version: string} = PackageSmartContract.getPackageInfo(pkgBuffer);
            pkgInfo.should.deep.equal({name: 'myContract', version: '0.0.1'});
        });
    });
});
