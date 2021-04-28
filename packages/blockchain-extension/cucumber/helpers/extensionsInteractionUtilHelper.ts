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
    refreshToken: string;
    cloudAccountGetAccessTokenStub: sinon.SinonStub;
    cloudAccountGetRefreshTokenStub: sinon.SinonStub;
    cloudAccountIsLoggedInStub: sinon.SinonStub;
    cloudAccountHasSelectedAccountStub: sinon.SinonStub;
    cloudAccountGetIbpResourcesStub: sinon.SinonStub;

    constructor(sandbox: sinon.SinonSandbox) {
        this.mySandBox = sandbox;
        this.accessToken = undefined;
        this.refreshToken = undefined;
        this.cloudAccountGetAccessTokenStub = this.mySandBox.stub(ExtensionsInteractionUtil, 'cloudAccountGetAccessToken').callsFake(this.getAccessTokenDirectly);
        this.cloudAccountGetAccessTokenStub = this.mySandBox.stub(ExtensionsInteractionUtil, 'cloudAccountGetRefreshToken').callsFake(this.getRefreshTokenDirectly);
        this.cloudAccountIsLoggedInStub = this.mySandBox.stub(ExtensionsInteractionUtil, 'cloudAccountIsLoggedIn').callsFake(this.resolveFalse);
        this.cloudAccountHasSelectedAccountStub = this.mySandBox.stub(ExtensionsInteractionUtil, 'cloudAccountHasSelectedAccount').callsFake(this.resolveFalse);
        this.cloudAccountGetIbpResourcesStub = this.mySandBox.stub(ExtensionsInteractionUtil, 'cloudAccountGetIbpResources').callThrough();
    }

    private async resolveFalse(): Promise<boolean> {
        return false;
    }

    private async getAccessTokenDirectly(): Promise<string> {
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

    private async getRefreshTokenDirectly(): Promise<string> {
        // Access tokens last 1hr, so there is no need to request multiple times.
        if (!this.refreshToken) {
            const options: any = {
                method: 'post',
                url: 'https://iam.cloud.ibm.com/identity/token',
                headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
                params: { grant_type: 'urn:ibm:params:oauth:grant-type:apikey', apikey: `${process.env.MAP_OPSTOOLS_SAAS_API_KEY}`},
            };
            const result: any = await Axios(options);
            this.refreshToken = result.data.refresh_token;
        }

        return this.refreshToken;
    }
}
