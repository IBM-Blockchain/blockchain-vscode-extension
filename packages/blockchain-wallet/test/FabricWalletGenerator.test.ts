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

import * as path from 'path';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { FabricWalletGenerator } from '../src/FabricWalletGenerator';
import { FabricWalletRegistryEntry, IFabricWallet } from 'ibm-blockchain-platform-common';

chai.use(sinonChai);
// tslint:disable no-unused-expression

describe('FabricWalletGenerator', () => {

    const rootPath: string = path.dirname(__dirname);
    let mySandBox: sinon.SinonSandbox;

    describe('getWallet', () => {

        let fabricWalletRegistryEntry: FabricWalletRegistryEntry;

        beforeEach(async () => {
            mySandBox = sinon.createSandbox();

            fabricWalletRegistryEntry  = new FabricWalletRegistryEntry();
            fabricWalletRegistryEntry.managedWallet = false;
            fabricWalletRegistryEntry.name = 'CongaWallet';
            fabricWalletRegistryEntry.walletPath = path.join(rootPath, 'data', 'wallet');
        });

        afterEach(async () => {
            mySandBox.restore();
        });

        it('should get an instance of a wallet', async () => {
            const wallet: IFabricWallet = await FabricWalletGenerator.instance().getWallet(fabricWalletRegistryEntry);
            wallet.getWalletPath().should.equal(path.join(rootPath, 'data', 'wallet'));
        });
    });
});
