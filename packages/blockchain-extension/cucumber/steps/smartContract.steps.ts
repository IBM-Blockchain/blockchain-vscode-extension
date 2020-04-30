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
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as fs from 'fs-extra';
import * as path from 'path';

// tslint:disable:no-unused-expression

chai.use(sinonChai);
chai.use(chaiAsPromised);

module.exports = function(): any {
    /**
     * Given
     */

    this.Given(/^a (private )?(.+) smart contract for (.+) assets with the name (.+) and version (.\S+)( and mspid)? ?(.+)?$/, this.timeout, async (privateOrNot: string, language: string, assetType: string, name: string, version: string, _ignore: string, mspid: string) => {
        this.contractLanguage = language;
        if (assetType === 'null') {
            assetType = null;
        }

        if (privateOrNot === 'private ') {
            this.mspid = mspid;
        } else {
            this.mspid = null;
        }

        this.contractAssetType = assetType;
        this.namespace = `${this.contractAssetType}Contract`;
        this.contractName = name;
        this.contractVersion = version;
    });

    this.Given(/a smart contract definition with the name (.+) and version (.\S+)/, this.timeout, async (name: string, version: string) => {
        this.contractDefinitionName = name;
        this.contractDefinitionVersion = version;
    });

    this.Given(/the contract hasn't been created already/, this.timeout, async () => {
        const contractDirectory: string = this.smartContractHelper.getContractDirectory(this.contractName, this.contractLanguage);
        const exists: boolean = await fs.pathExists(contractDirectory);
        if (exists) {
            await fs.remove(contractDirectory);
        }
    });

    this.Given(/the( private)? contract has been created/, this.timeout, async (_privateOrNot: string) => {
        const contractDirectory: string = this.smartContractHelper.getContractDirectory(this.contractName, this.contractLanguage);
        const exists: boolean = await fs.pathExists(contractDirectory);
        if (!exists) {
            if (_privateOrNot === ' private') {
                this.contractDirectory = await this.smartContractHelper.createSmartContract(this.contractLanguage, this.contractAssetType, this.contractName, this.mspid);
            } else {
                this.contractDirectory = await this.smartContractHelper.createSmartContract(this.contractLanguage, this.contractAssetType, this.contractName);
            }
        } else {
            this.contractDirectory = contractDirectory;
        }
    });

    this.Given("the contract version has been updated to '{string}'", this.timeout, async (version: string) => {
        this.contractVersion = version;
        if (this.contractLanguage === 'JavaScript' || this.contractLanguage === 'TypeScript') {
            const contractDirectory: string = this.smartContractHelper.getContractDirectory(this.contractName, this.contractLanguage);

            // Actually write to the package.json
            const fileContents: Buffer = await fs.readFile(path.join(contractDirectory, 'package.json'));
            const packageObject: any = JSON.parse(fileContents.toString());
            packageObject.version = version;
            const packageJsonString: string = JSON.stringify(packageObject, null, 4);
            return fs.writeFile(path.join(contractDirectory, 'package.json'), packageJsonString, 'utf8');
        }
    });

    this.Given(/the contract has been deleted/, this.timeout, async () => {
        const contractDirectory: string = this.smartContractHelper.getContractDirectory(this.contractName, this.contractLanguage);
        const exists: boolean = await fs.pathExists(contractDirectory);
        if (exists) {
            await fs.remove(contractDirectory);
        }
    });

    /**
     * When
     */

    this.When(/I create the( private)? contract/, this.timeout, async (_privateOrNot: string) => {
        if (_privateOrNot === ' private') {
            this.contractDirectory = await this.smartContractHelper.createSmartContract(this.contractLanguage, this.contractAssetType, this.contractName, this.mspid);
        } else {
            this.contractDirectory = await this.smartContractHelper.createSmartContract(this.contractLanguage, this.contractAssetType, this.contractName);
        }
    });

    /**
     * Then
     */

    this.Then('a new contract directory should exist', this.timeout, async () => {
        const exists: boolean = await fs.pathExists(this.contractDirectory);
        exists.should.equal(true);
    });
};
