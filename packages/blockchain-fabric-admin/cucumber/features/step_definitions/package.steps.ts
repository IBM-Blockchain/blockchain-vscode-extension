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

import {Given, When, Then, setDefaultTimeout} from 'cucumber';
import * as path from 'path';
import * as fs from 'fs-extra';

import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';

import {PackageHelper} from '../../helpers/PackageHelper';
import {Helper} from '../../helpers/Helper';
import {SmartContractPackageBase} from '../../../src';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

setDefaultTimeout(60 * 1000);

Given(/^a '(.*)' smart contract of type '(.*)' using '(.*)'( with name )?(.*?)$/, function(language: string, type: string, contract: string, _withName: string, name: string): void {

    if (contract === 'marbles') {
        this.projectPath = path.join(Helper.TMP_DIR, 'fabric-samples', 'chaincode', 'marbles02_private', language);
    } else {
        this.projectPath = path.join(Helper.TMP_DIR, 'fabric-samples', 'chaincode', contract, language);
    }

    this.language = language;
    this.type = type;
    this.name = name || `${contract}-${language}`;
    this.version = '0.0.1';
    this.label = SmartContractPackageBase.getLabel(this.name, this.version);
});

Given(/the (cds|tar\.gz|tgz) package exists$/, {timeout: 120000 * 1000}, async function(_packageFormat: string): Promise<void> {
    const packagedContractPath: string = path.join(Helper.PACKAGE_DIR, `${this.name}.${_packageFormat}`);

    const exists: boolean = await fs.pathExists(packagedContractPath);

    if (!exists) {
        this.packageFormat = _packageFormat;
        this.packagePath = await PackageHelper.packageContract(this.projectPath, this.name, this.version, this.type, this.language, this.packageFormat);
    } else {
        this.packagePath = packagedContractPath;
    }
});

When(/I package the smart contract as a (cds|tar\.gz|tgz)/, async function(_packageFormat: string): Promise<void> {
    this.packageFormat = _packageFormat;
    this.packagePath = await PackageHelper.packageContract(this.projectPath, this.name, this.version, this.type, this.language, this.packageFormat);
});

Then('a package should exist', async function(): Promise<void> {
    await fs.pathExists(this.packagePath).should.eventually.be.true;
});

When(/^I get the list of files from a (.*)$/, async function(method: string): Promise<void> {
    let contractBuffer: Buffer;
    if (method === 'file') {
        contractBuffer = await fs.readFile(this.packagePath);
    } else {
        contractBuffer = this.packageBuffer;
    }
    this.fileList = (this.packageFormat === 'cds') ? await PackageHelper.getV1PackageFileList(contractBuffer) : await PackageHelper.getV2PackageFileList(contractBuffer);
});

// tslint:disable-next-line:only-arrow-functions
Then(/^the file list is correct '(.*)'$/, function(expectedFileListString: string): void {
    const expectedFileList: string[] = expectedFileListString.split(' ');
    this.fileList.should.include.members(expectedFileList);
});
