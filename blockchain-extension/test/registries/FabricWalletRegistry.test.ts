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
import { TestUtil } from '../TestUtil';
import { FabricWalletRegistryEntry } from '../../extension/registries/FabricWalletRegistryEntry';
import { FabricWalletRegistry } from '../../extension/registries/FabricWalletRegistry';
import { FabricRuntimeManager } from '../../extension/fabric/FabricRuntimeManager';
import { FabricWalletUtil } from '../../extension/fabric/FabricWalletUtil';

chai.should();

describe('FabricWalletRegistry', () => {

    const registry: FabricWalletRegistry = FabricWalletRegistry.instance();

    before(async () => {
        await TestUtil.setupTests();
        await FabricRuntimeManager.instance().getRuntime().create();
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

        await FabricRuntimeManager.instance().getRuntime().importWalletsAndIdentities();

        const localFabricEntry: FabricWalletRegistryEntry = await FabricWalletRegistry.instance().get(FabricWalletUtil.LOCAL_WALLET);

        await registry.add(walletOne);
        await registry.getAll().should.eventually.deep.equal([localFabricEntry, walletOne]);
    });

    it('should get all wallets but not show local fabric', async () => {
        const walletOne: FabricWalletRegistryEntry = new FabricWalletRegistryEntry({
            name: 'walletOne',
            walletPath: 'myPath'
        });

        await registry.getAll().should.eventually.deep.equal([]);

        await FabricRuntimeManager.instance().getRuntime().importWalletsAndIdentities();
        await registry.add(walletOne);
        await registry.getAll(false).should.eventually.deep.equal([walletOne]);
    });

});
