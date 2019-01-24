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

import { FabricConnectionRegistry } from '../../src/fabric/FabricConnectionRegistry';

import * as chai from 'chai';
import { FabricConnectionRegistryEntry } from '../../src/fabric/FabricConnectionRegistryEntry';
import { ExtensionUtil } from '../../src/util/ExtensionUtil';
import { TestUtil } from '../TestUtil';

chai.should();

describe('FabricConnectionRegistry', () => {

    const registry: FabricConnectionRegistry = FabricConnectionRegistry.instance();

    before(async () => {
        await TestUtil.storeConnectionsConfig();
    });

    after(async () => {
        await TestUtil.restoreConnectionsConfig();
    });

    beforeEach(async () => {
        await ExtensionUtil.activateExtension();
        await registry.clear();
    });

    afterEach(async () => {
        await registry.clear();
    });

    it('should manage configuration for connections', async () => {
        const connection: FabricConnectionRegistryEntry = new FabricConnectionRegistryEntry({
            name: 'my-fabric-network',
            connectionProfilePath: '/tmp/connection.json',
            walletPath: 'tmp/wallet',
            managedRuntime: false
        });
        registry.getAll().should.deep.equal([]);
        await registry.add(connection);
        registry.getAll().should.deep.equal([connection]);
    });

});
