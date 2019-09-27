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

import { FabricGatewayRegistry } from '../../extension/fabric/FabricGatewayRegistry';

import * as chai from 'chai';
import { FabricGatewayRegistryEntry } from '../../extension/fabric/FabricGatewayRegistryEntry';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';
import { TestUtil } from '../TestUtil';

chai.should();

describe('FabricGatewayRegistry', () => {

    const registry: FabricGatewayRegistry = FabricGatewayRegistry.instance();

    before(async () => {
        await TestUtil.storeAll();
    });

    after(async () => {
        await TestUtil.restoreAll();
    });

    beforeEach(async () => {
        await ExtensionUtil.activateExtension();
        await registry.clear();
    });

    afterEach(async () => {
        await registry.clear();
    });

    it('should manage configuration for connections', async () => {
        const gateway: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry({
            name: 'my-fabric-network',
            associatedWallet: ''
        });
        registry.getAll().should.deep.equal([]);
        await registry.add(gateway);
        registry.getAll().should.deep.equal([gateway]);
    });

});
