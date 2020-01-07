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
import * as sinonChai from 'sinon-chai';
import * as chai from 'chai';
import * as sinon from 'sinon';
import { TestUtil } from '../TestUtil';
import { FabricWalletRegistry, FileConfigurations } from 'ibm-blockchain-platform-common';
import * as path from 'path';
import { FabricWalletHelper } from '../../extension/fabric/FabricWalletHelper';

chai.use(sinonChai);
// tslint:disable no-unused-expression

describe('FabricWalletHelper', () => {

    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();

    before(async () => {
        await TestUtil.setupTests(mySandBox);
        await FabricWalletRegistry.instance().clear();
    });

    describe('getWalletPath', () => {
        it('should get the wallet path', () => {
            const result: string = FabricWalletHelper.getWalletPath('myWallet');

            result.should.equal(path.join(TestUtil.EXTENSION_TEST_DIR, 'v2', FileConfigurations.FABRIC_WALLETS, 'myWallet'));
        });
    });
});
