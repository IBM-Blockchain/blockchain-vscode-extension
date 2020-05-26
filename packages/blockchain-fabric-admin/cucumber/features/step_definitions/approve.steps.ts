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

import {When, Then} from 'cucumber';
import {ApproveHelper} from '../../helpers/ApproveHelper';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';
import {Helper} from '../../helpers/Helper';
import {Given} from 'cucumber';
import {Collection} from '../../../src';

chai.use(sinonChai);
chai.use(chaiAsPromised);

async function approveContract(policy?: string, sequence?: number, collectionConfig?: Collection[]): Promise<void> {
    const result: boolean = await ApproveHelper.checkCommitReadiness(this.lifecycle, Helper.org1Peer, this.label, '0.0.1', this.wallet, this.org1Identity, policy, sequence, collectionConfig);

    if (!result) {
        await ApproveHelper.approveSmartContract(this.lifecycle, Helper.org1Peer, this.label, '0.0.1', this.packageId, this.wallet, this.org1Identity, policy, sequence, collectionConfig);
        await ApproveHelper.approveSmartContract(this.lifecycle, Helper.org2Peer, this.label, '0.0.1', this.packageId, this.wallet, this.org2Identity, policy, sequence, collectionConfig);
    }
}

When(/^I approve the smart contract$/, async function(): Promise<void> {
    await ApproveHelper.approveSmartContract(this.lifecycle, Helper.org1Peer, this.label, '0.0.1', this.packageId, this.wallet, this.org1Identity);
    await ApproveHelper.approveSmartContract(this.lifecycle, Helper.org2Peer, this.label, '0.0.1', this.packageId, this.wallet, this.org2Identity);
});

Then(/^the smart contract should be approved$/, async function(): Promise<void> {
    await ApproveHelper.checkCommitReadiness(this.lifecycle, Helper.org1Peer, this.label, '0.0.1', this.wallet, this.org1Identity).should.eventually.be.true;
});

// tslint:disable-next-line:only-arrow-functions
Given(/^the contract is approved$/, async function(): Promise<void> {
    await approveContract.apply(this);
});

// tslint:disable-next-line:only-arrow-functions
Given(/^the contract is approved with collection config and policy '(.*)'$/, async function(policy: string): Promise<void> {
    const collectionConfig: Collection[] = await Helper.getCollectionConfig();

    await approveContract.apply(this, [policy, undefined, collectionConfig]);
});

// tslint:disable-next-line:only-arrow-functions
Given(/^the contract is approved with sequence '(.*)' and policy '(.*)'$/, async function(sequence: number, policy: string): Promise<void> {
    await approveContract.apply(this, [policy, sequence]);
});
