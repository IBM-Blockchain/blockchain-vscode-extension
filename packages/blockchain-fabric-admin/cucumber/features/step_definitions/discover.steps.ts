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
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';
import {Helper} from '../../helpers/Helper';
import {DiscoverHelper} from '../../helpers/DiscoverHelper';

chai.use(sinonChai);
chai.use(chaiAsPromised);

// tslint:disable-next-line:only-arrow-functions
When(/^I discover peers$/, async function(): Promise<void> {

    this.discoveredPeerNames = await DiscoverHelper.getDiscoveredPeers(this.lifecycle, [Helper.org1Peer], this.wallet, this.org1Identity);
});

// tslint:disable-next-line:only-arrow-functions
Then(/^the list of discovered peers should be '(.*)'$/, function(expectedPeerNamesString: string): void {
    const expectedPeerNames: string[] = expectedPeerNamesString.split(' ');

    this.discoveredPeerNames.should.deep.equal(expectedPeerNames);
});
