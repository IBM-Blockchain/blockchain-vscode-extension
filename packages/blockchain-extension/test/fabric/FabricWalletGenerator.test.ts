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
import { FabricWallet } from 'ibm-blockchain-platform-gateway-v1';
import { FabricWalletGenerator } from '../../extension/fabric/FabricWalletGenerator';
import { FabricWalletRegistryEntry } from '../../extension/registries/FabricWalletRegistryEntry';
import { FabricWalletRegistry } from '../../extension/registries/FabricWalletRegistry';

chai.use(sinonChai);
// tslint:disable no-unused-expression

describe('FabricWalletGenerator', () => {

    const rootPath: string = path.dirname(__dirname);
    let mySandBox: sinon.SinonSandbox;

    describe('getWallet', () => {

        beforeEach(async () => {
            mySandBox = sinon.createSandbox();

            await FabricWalletRegistry.instance().clear();

            const fabricWalletRegistryEntry: FabricWalletRegistryEntry = new FabricWalletRegistryEntry();
            fabricWalletRegistryEntry.managedWallet = false;
            fabricWalletRegistryEntry.name = 'CongaWallet';
            fabricWalletRegistryEntry.walletPath = path.join(rootPath, '../../test/data/walletDir/wallets/CongaWallet');

            await FabricWalletRegistry.instance().add(fabricWalletRegistryEntry);
        });

        afterEach(async () => {
            mySandBox.restore();
        });

        it('should get an instance of a wallet', async () => {
            const wallet: FabricWallet = await FabricWalletGenerator.instance().getWallet('CongaWallet');
            wallet.walletPath.should.equal(path.join(rootPath, '../../test/data/walletDir/wallets/CongaWallet'));
        });
    });
});
