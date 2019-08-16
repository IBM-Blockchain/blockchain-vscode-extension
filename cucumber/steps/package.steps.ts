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
import { PackageRegistryEntry } from '../../src/packages/PackageRegistryEntry';
import { PackageRegistry } from '../../src/packages/PackageRegistry';

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

    /**
     * Then
     */

    this.Then('a new package should be created with the name {string} and verison {string}', this.timeout, async (packageName: string, packageVersion: string) => {
        const _package: PackageRegistryEntry = await PackageRegistry.instance().get(packageName, packageVersion);
        _package.should.exist;
    });
};
