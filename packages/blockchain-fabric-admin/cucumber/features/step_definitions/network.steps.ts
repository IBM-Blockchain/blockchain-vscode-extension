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

import {Given} from 'cucumber';
import {Wallet} from 'fabric-network';
import {NetworkHelper} from '../../helpers/NetworkHelper';
import {Lifecycle} from '../../../src';
import {Helper} from '../../helpers/Helper';

// tslint:disable-next-line:only-arrow-functions
Given(/^the lifecycle is setup( orgOneOnly)?$/, async function(orgOneOnly: string): Promise<void> {
    let onlyOneOrg: boolean = false;
    if (orgOneOnly) {
        onlyOneOrg = true;
    }

    if (!this.lifecycle) {

        const result: { lifecycle: Lifecycle, wallet: Wallet } = await NetworkHelper.setupLifecycle(onlyOneOrg);
        this.lifecycle = result.lifecycle;
        this.wallet = result.wallet;

        this.org1Identity = 'peerAdminOrg1';
        this.org2Identity = 'peerAdminOrg2';

        const channelNames: string[] = await NetworkHelper.getListOfChannels(this.lifecycle, Helper.org1Peer, this.wallet, this.org1Identity);
        channelNames.should.deep.equal(['mychannel']);
        this.channelName = channelNames[0];
    }
});
