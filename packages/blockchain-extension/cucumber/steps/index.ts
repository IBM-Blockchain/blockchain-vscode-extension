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

// tslint:disable:no-var-requires
const steps: any = require('./steps');
const hooks: any = require('./hooks');
const smartContractSteps: any = require('./smartContract.steps');
const packageContractSteps: any = require('./package.steps');
const deploySteps: any = require('./deploy.steps');
const wallletAndIdentitySteps: any = require('./walletAndIdentity.steps');
const gatewaySteps: any = require('./gateway.steps');
const fabricEnvironmentSteps: any = require('./fabricEnvironment.steps');
const sampleSteps: any = require('./sample.steps');
// We can break up step definitions into multiple files
module.exports = function(): any {
    hooks.call(this);
    steps.call(this);
    smartContractSteps.call(this);
    packageContractSteps.call(this);
    deploySteps.call(this);
    wallletAndIdentitySteps.call(this);
    gatewaySteps.call(this);
    fabricEnvironmentSteps.call(this);
    sampleSteps.call(this);
};
