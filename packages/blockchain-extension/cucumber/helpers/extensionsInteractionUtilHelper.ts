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
import * as sinon from 'sinon';
import { ExtensionsInteractionUtil } from '../../extension/util/ExtensionsInteractionUtil';
import Axios from 'axios';

export class ExtensionsInteractionUtilHelper {

    mySandBox: sinon.SinonSandbox;
    accessToken: string;
    cloudAccountGetAccessTokenStub: sinon.SinonStub;

    constructor(sandbox: sinon.SinonSandbox) {
        this.mySandBox = sandbox;
        this.accessToken = undefined;
        this.cloudAccountGetAccessTokenStub = this.mySandBox.stub(ExtensionsInteractionUtil, 'cloudAccountGetAccessToken').callsFake(this.getTokenDirectly);
    }

    private async getTokenDirectly(): Promise<string> {
        // Access tokens last 1hr, so there is no need to request multiple times.
        if (!this.accessToken) {
            const options: any = {
                method: 'post',
                url: 'https://iam.cloud.ibm.com/identity/token',
                headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
                params: { grant_type: 'urn:ibm:params:oauth:grant-type:apikey', apikey: `${process.env.MAP_OPSTOOLS_SAAS_API_KEY}`},
            };
            const result: any = await Axios(options);
            this.accessToken = result.data.access_token;
        }

        return this.accessToken;
    }
}
