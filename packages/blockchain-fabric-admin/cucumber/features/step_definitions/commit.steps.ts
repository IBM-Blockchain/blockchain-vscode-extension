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

import {When} from 'cucumber'
import {Then} from 'cucumber'
import {CommitHelper} from '../../helpers/CommitHelper';
import {Helper} from '../../helpers/Helper';
import {DefinedSmartContract} from '../../../src';

When(/^I commit the contract( with sequence )?(.?)( and policy )?(.*?)$/, async function(_thing: string, sequence: number, _thing2: string, policy: string): Promise<void> {
    if (sequence) {
        this.sequence = sequence;
    } else {
        this.sequence = 1;
    }
    await CommitHelper.commitSmartContract(this.lifecycle, [Helper.org1Peer, Helper.org2Peer], this.label, '0.0.1', this.wallet, this.org1Identity, policy, sequence);
});

Then(/^the smart contract should committed$/, async function(): Promise<void> {
    const result: string[] = await CommitHelper.getCommittedSmartContracts(this.lifecycle, Helper.org1Peer, this.wallet, this.org1Identity);

    result.should.include(this.label);

    const definedContract: DefinedSmartContract = await CommitHelper.getCommittedSmartContract(this.lifecycle, Helper.org1Peer, this.label, this.wallet, this.org1Identity);

    definedContract.smartContractName.should.equal(this.label);
    definedContract.smartContractVersion.should.equal('0.0.1');
    definedContract.sequence.should.equal(parseInt(this.sequence, 10));

    definedContract.approvals!.size.should.equal(2);
    definedContract.approvals!.get('Org1MSP')!.should.equal(true);
    definedContract.approvals!.get('Org2MSP')!.should.equal(true);
});
