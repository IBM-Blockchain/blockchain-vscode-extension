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
import { ExtensionUtil } from '../../src/util/ExtensionUtil';
import { TestUtil } from '../TestUtil';
import { RepositoryRegistry } from '../../src/repositories/RepositoryRegistry';
import { RepositoryRegistryEntry } from '../../src/repositories/RepositoryRegistryEntry';

chai.should();

describe('RepositoryRegistryEntry', () => {

    const registry: RepositoryRegistry = new RepositoryRegistry();

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

    it('should manage repository registry', async () => {
        const entry: RepositoryRegistryEntry = new RepositoryRegistryEntry({
            name: 'some-repository',
            path: '/some/path'
        });
        registry.getAll().should.deep.equal([]);
        await registry.add(entry);
        registry.getAll().should.deep.equal([entry]);
    });

});
