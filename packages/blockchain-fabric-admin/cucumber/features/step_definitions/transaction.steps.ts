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

import {Given, Then, When} from 'cucumber';
import {TransactionHelper} from '../../helpers/TransactionHelper';
import * as path from 'path';
import * as fs from 'fs-extra';
import {Helper} from '../../helpers/Helper';

import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';

const should: Chai.Should = chai.should();
chai.use(sinonChai);

async function submitTransaction(submit: boolean, transaction: string, orgs: string, args?: string[], transientData?: { [key: string]: Buffer }): Promise<void> {
    const connectionProfilePath: string = path.join(Helper.NETWORK_DIR, 'organizations', 'peerOrganizations', `${this.org}.example.com`, `connection-${this.org}.json`);
    const connectionProfileString: string = await fs.readFile(connectionProfilePath, 'utf8');
    const connectionProfile: any = JSON.parse(connectionProfileString);

    const orgsArray: string[] = orgs.split(',').map((org: string) => {
        return org.trim();
    });

    let identity: string = this.org1Identity;
    if (this.org === 'org2') {
        identity = this.org2Identity;
    }

    try {
        return await TransactionHelper.submitTransaction(submit, this.wallet, identity, connectionProfile, this.label, transaction, args, 'mychannel', orgsArray, transientData);
    } catch (error) {
        this.error = error.message;
    }
}

Given(/^a gateway using '(.*)'$/, function(org: string): void {
    this.org = org;
});

// tslint:disable-next-line:only-arrow-functions
When(/^I submit the transaction '(.*)' with arguments '(.*)' to '(.*)'$/, async function(transaction: string, args: string, orgs: string): Promise<void> {

    const argArray: string[] = args.split(',').map((arg: string) => {
        return arg.trim();
    });

    await submitTransaction.apply(this, [true, transaction, orgs, argArray]);
});

// tslint:disable-next-line:only-arrow-functions
When(/^I evaluate the transaction '(.*)' with arguments '(.*)' to '(.*)'$/, async function(transaction: string, args: string, orgs: string): Promise<void> {

    const argArray: string[] = args.split(',').map((arg: string) => {
        return arg.trim();
    });

    await submitTransaction.apply(this, [false, transaction, orgs, argArray]);
});

// tslint:disable-next-line:only-arrow-functions
When(/^I submit the transaction '(.*)' with transient data '(.*)' to '(.*)'$/, async function(transaction: string, transientDataString: string, orgs: string): Promise<void> {
    transientDataString = transientDataString.trim();
    const transientData: { [key: string]: Buffer } = JSON.parse(transientDataString);
    const keys: Array<string> = Array.from(Object.keys(transientData));

    keys.forEach((key: string) => {
        transientData[key] = Buffer.from(transientData[key]);
    });

    await submitTransaction.apply(this, [true, transaction, orgs, [], transientData]);
});

Then(/^the transaction should be successful$/, function(): void {
    should.not.exist(this.error);
});

Then(/^the transaction should fail$/, function(): void {
    should.exist(this.error);
});
