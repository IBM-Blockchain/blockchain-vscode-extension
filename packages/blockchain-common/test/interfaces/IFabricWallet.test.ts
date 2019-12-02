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

import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';
import { IFabricWallet } from '../..';

const should: Chai.Should = chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);
// tslint:disable no-unused-expression
describe('IFabricWallet', () => {

    class MyFabricWallet implements IFabricWallet {
        importIdentity(_certificate: string, _privateKey: string, _identityName: string, _mspid: string): Promise<void> {
            throw new Error('Method not implemented.');
        }        delete(_identityName: string): Promise<void> {
            throw new Error('Method not implemented.');
        }
        exists(_identityName: string): Promise<boolean> {
            throw new Error('Method not implemented.');
        }
        getIdentityNames(): Promise<string[]> {
            throw new Error('Method not implemented.');
        }
        getIdentities(): Promise<import('../..').FabricIdentity[]> {
            throw new Error('Method not implemented.');
        }
        getWalletPath(): string {
            throw new Error('Method not implemented.');
        }
    }

    let sandbox: sinon.SinonSandbox;

    beforeEach(async () => {
        sandbox = sinon.createSandbox();
    });

    afterEach(async () => {
        sandbox.restore();
    });

    it('should be able create an instance of a gateway connection', () => {
        const myFabricWallet: MyFabricWallet = new MyFabricWallet();

        should.exist(myFabricWallet);
    });
});
