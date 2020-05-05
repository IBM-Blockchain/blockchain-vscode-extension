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

import {Then, When} from 'cucumber';
import {TransactionHelper} from '../../helpers/TransactionHelper';
import * as path from 'path';
import * as fs from 'fs-extra';
import {Helper} from '../../helpers/Helper';

import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
const should: Chai.Should = chai.should();
chai.use(sinonChai);

When(/^I submit the transaction '(.*)' with arguments '(.*)' to '(.*)'$/, async function(transaction: string, args: string, orgs: string): Promise<void> {
    const connectionProfilePath: string = path.join(Helper.NETWORK_DIR, 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
    const connectionProfileString: string = await fs.readFile(connectionProfilePath, 'utf8');
    const connectionProfile: any = JSON.parse(connectionProfileString);

    const argArray: string[] = args.split(',').map((arg: string) => {
        return arg.trim();
    });

    const orgsArray: string[] = orgs.split(',').map((org: string) => {
        return org.trim();
    });

    try {
        await TransactionHelper.submitTransaction(this.wallet, this.org1Identity, connectionProfile, this.label, transaction, argArray, 'mychannel', orgsArray);
    } catch (error) {
        this.error = error.message;
    }
});

Then(/^the transaction should be successful$/, function(): void {
    should.not.exist(this.error);
});
