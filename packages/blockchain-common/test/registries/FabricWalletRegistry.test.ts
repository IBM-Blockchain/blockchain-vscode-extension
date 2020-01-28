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
import * as path from 'path';
import * as chaiAsPromised from 'chai-as-promised';
import { FabricWalletRegistryEntry } from '../../src/registries/FabricWalletRegistryEntry';
import { FabricWalletRegistry } from '../../src/registries/FabricWalletRegistry';
import { FabricRuntimeUtil } from '../../src/util/FabricRuntimeUtil';

chai.use(chaiAsPromised);
chai.should();

describe('FabricWalletRegistry', () => {

    const registry: FabricWalletRegistry = FabricWalletRegistry.instance();

    before(async () => {
        const registryPath: string = path.join(__dirname, 'tmp', 'registries');
        registry.setRegistryPath(registryPath);
    });

    beforeEach(async () => {
        await registry.clear();
    });

    afterEach(async () => {
        await registry.clear();
    });

    it('should get all the wallets and put local fabric first', async () => {
        const walletOne: FabricWalletRegistryEntry = new FabricWalletRegistryEntry({
            name: 'walletOne',
            walletPath: 'myPath'
        });

        await registry.getAll().should.eventually.deep.equal([]);

        await registry.add(new FabricWalletRegistryEntry({name: 'Org1', managedWallet: true, displayName: `${FabricRuntimeUtil.LOCAL_FABRIC} - Org1 Wallet`, walletPath: 'myOtherPath'}));

        const localFabricEntry: FabricWalletRegistryEntry = await FabricWalletRegistry.instance().get('Org1');

        await registry.add(walletOne);
        await registry.getAll().should.eventually.deep.equal([localFabricEntry, walletOne]);
    });

    it('should get all wallets but not show local fabric', async () => {
        const walletOne: FabricWalletRegistryEntry = new FabricWalletRegistryEntry({
            name: 'walletOne',
            walletPath: 'myPath'
        });

        await registry.getAll().should.eventually.deep.equal([]);

        await registry.add(new FabricWalletRegistryEntry({name: 'Org1', managedWallet: true, displayName: `${FabricRuntimeUtil.LOCAL_FABRIC} - Org1 Wallet`, walletPath: 'myOtherPath'}));
        await registry.add(walletOne);
        await registry.getAll(false).should.eventually.deep.equal([walletOne]);
    });

});
