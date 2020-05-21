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
    this.Given(/the contract has been deployed on channel '(.*?)'/, this.timeout, async (channel: string) => {
        await this.smartContractHelper.deploySmartContract(channel, this.contractDefinitionName, this.contractDefinitionVersion, this.packageRegistryEntry);
    });

    /**
     * When
     */
    this.When(/^I deploy the contract on channel '(.*?)' with sequence '(.*?)'( with private data)?$/, this.timeout, async (channel: string, sequence: string, privateDataString: string) => {
        let privateData: boolean = false;
        if (privateDataString) {
            privateData = true;
        }
        await this.smartContractHelper.deploySmartContract(channel, this.contractDefinitionName, this.contractDefinitionVersion, this.packageRegistryEntry, sequence, privateData, true);
    });
};
