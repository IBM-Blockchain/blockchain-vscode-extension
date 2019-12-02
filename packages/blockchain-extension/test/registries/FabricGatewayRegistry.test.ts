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

import { FabricGatewayRegistry } from '../../extension/registries/FabricGatewayRegistry';

import * as chai from 'chai';
import { FabricGatewayRegistryEntry } from '../../extension/registries/FabricGatewayRegistryEntry';
import { TestUtil } from '../TestUtil';
import { FabricRuntimeManager } from '../../extension/fabric/FabricRuntimeManager';
import { FabricRuntimeUtil } from 'ibm-blockchain-platform-common';

chai.should();

describe('FabricGatewayRegistry', () => {

    const registry: FabricGatewayRegistry = FabricGatewayRegistry.instance();

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

    it('should get all the gateways and put local fabric first', async () => {
        const gatewayOne: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry({
            name: 'gatewayOne',
            associatedWallet: ''
        });

        await registry.getAll().should.eventually.deep.equal([]);

        await FabricRuntimeManager.instance().getRuntime().importGateways();

        const localFabricEntry: FabricGatewayRegistryEntry = await FabricGatewayRegistry.instance().get(FabricRuntimeUtil.LOCAL_FABRIC);

        await registry.add(gatewayOne);
        await registry.getAll().should.eventually.deep.equal([localFabricEntry, gatewayOne]);
    });

    it('should get all gateways but not show local fabric', async () => {
        const gatewayOne: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry({
            name: 'gatewayOne',
            associatedWallet: ''
        });

        await registry.getAll().should.eventually.deep.equal([]);

        await FabricRuntimeManager.instance().getRuntime().importGateways();
        await registry.add(gatewayOne);
        await registry.getAll(false).should.eventually.deep.equal([gatewayOne]);
    });
});
