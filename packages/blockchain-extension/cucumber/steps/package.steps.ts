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
import { PackageRegistryEntry } from '../../extension/registries/PackageRegistryEntry';
import { PackageRegistry } from '../../extension/registries/PackageRegistry';

// tslint:disable:no-unused-expression

chai.use(sinonChai);
chai.use(chaiAsPromised);

module.exports = function(): any {
    /**
     * Given
     */

    this.Given('the contract has been packaged', this.timeout, async () => {
        await this.smartContractHelper.packageSmartContract(this.contractName, this.contractVersion, this.contractLanguage, this.contractDirectory);
    });

    /**
     * When
     */

    this.When('I package the contract', this.timeout, async () => {
        await this.smartContractHelper.packageSmartContract(this.contractName, this.contractVersion, this.contractLanguage, this.contractDirectory);
    });

    this.When(/I run the command View package Information for package with name (.*) and version (.\S+)/, this.timeout, async (packagedName: string, version: string) => {
        await this.smartContractHelper.viewContractInformation(packagedName, version);
    });

    /**
     * Then
     */

    this.Then('a new package should be created with the name {string} and version {string}', this.timeout, async (packageName: string, packageVersion: string) => {
        const _package: PackageRegistryEntry = await PackageRegistry.instance().get(packageName, packageVersion);
        _package.should.exist;
    });
};
