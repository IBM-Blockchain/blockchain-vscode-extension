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

import {Given, When, Then} from 'cucumber';

import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';
import {InstallHelper} from '../../helpers/InstallHelper';
import {Helper} from '../../helpers/Helper';

const should: Chai.Should = chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

When('I install the smart contract', {timeout: 100 * 1000}, async function(): Promise<void> {
    this.packageId = await InstallHelper.installPackage(this.lifecycle, Helper.org1Peer, this.packagePath, this.wallet, this.org1Identity);
    this.packageId = await InstallHelper.installPackage(this.lifecycle, Helper.org2Peer, this.packagePath, this.wallet, this.org2Identity);
});

Then(/^the package should be installed on the peer$/, async function(): Promise<void> {
    const resultOrg1: { label: string, packageId: string }[] = await InstallHelper.getInstalledSmartContracts(this.lifecycle, Helper.org1Peer, this.wallet, this.org1Identity);
    let exists: { label: string, packageId: string } = resultOrg1.find((data: { label: string, packageId: string }) => {
        return data.label === this.label;
    });

    should.exist(exists);

    const resultOrg2: { label: string, packageId: string }[] = await InstallHelper.getInstalledSmartContracts(this.lifecycle, Helper.org2Peer, this.wallet, this.org2Identity);
    exists = resultOrg2.find((data ) => {
        return data.label === this.label;
    });

    should.exist(exists);
});

Given(/^the package is installed$/, {timeout: 100 * 1000}, async function(): Promise<void> {
    const resultOrg1: { label: string, packageId: string }[] = await InstallHelper.getInstalledSmartContracts(this.lifecycle, Helper.org1Peer, this.wallet, this.org1Identity);
    let result: { label: string, packageId: string } = resultOrg1.find((data) => data.label === this.label);
    if (!result) {
        this.packageId = await InstallHelper.installPackage(this.lifecycle, Helper.org1Peer, this.packagePath, this.wallet, this.org1Identity);
    } else {
        this.packageId = result.packageId;
    }

    const resultOrg2: { label: string, packageId: string }[] = await InstallHelper.getInstalledSmartContracts(this.lifecycle, Helper.org2Peer, this.wallet, this.org2Identity);
    result = resultOrg2.find((data: { label: string, packageId: string }) => data.label === this.label);
    if (!result) {
        this.packageId = await InstallHelper.installPackage(this.lifecycle, Helper.org2Peer, this.packagePath, this.wallet, this.org2Identity);
    } else {
        this.packageId = result.packageId;
    }

    if (!this.packageId) {
        throw new Error('package was not installed');
    }
});

When(/^I get the installed package$/, async function(): Promise<void> {
    this.packageBuffer = await InstallHelper.getInstalledPackage(this.lifecycle, Helper.org1Peer, this.packageId, this.wallet, this.org1Identity);
    should.exist(this.packageBuffer);
});
