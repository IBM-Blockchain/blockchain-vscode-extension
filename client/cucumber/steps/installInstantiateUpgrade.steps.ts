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

// tslint:disable:no-unused-expression

chai.use(sinonChai);
chai.use(chaiAsPromised);

module.exports = function(): any {
    /**
     * Given
     */

    this.Given('the package has been installed', this.timeout, async () => {
        await this.smartContractHelper.installSmartContract(this.contractName, this.contractVersion);
    });

    this.Given(/the contract has been instantiated with the transaction '(.*?)' and args '(.*?)', (not )?using private data/, this.timeout, async (transaction: string, args: string, usingPrivateData: string) => {
        let privateData: boolean;
        if (usingPrivateData === 'not ') {
            privateData = false;
        } else {
            privateData = true;
        }

        await this.smartContractHelper.instantiateSmartContract(this.contractName, this.contractVersion, transaction, args, privateData);
    });

    /**
     * When
     */

    this.When('I install the package', this.timeout, async () => {
        await this.smartContractHelper.installSmartContract(this.contractName, this.contractVersion);
    });

    this.When(/I instantiate the installed package with the transaction '(.*?)' and args '(.*?)', (not )?using private data/, this.timeout, async (transaction: string, args: string, usingPrivateData: string) => {
        let privateData: boolean;
        if (usingPrivateData === 'not ') {
            privateData = false;
        } else {
            privateData = true;
        }
        await this.smartContractHelper.instantiateSmartContract(this.contractName, this.contractVersion, transaction, args, privateData);
    });

    this.When(/I upgrade the installed package with the transaction '(.*?)' and args '(.*?)', (not )?using private data/, this.timeout, async (transaction: string, args: string, usingPrivateData: string) => {
        let privateData: boolean;
        if (usingPrivateData === 'not ') {
            privateData = false;
        } else {
            privateData = true;
        }

        await this.smartContractHelper.upgradeSmartContract(this.contractName, this.contractVersion, transaction, args, privateData);
    });
};
