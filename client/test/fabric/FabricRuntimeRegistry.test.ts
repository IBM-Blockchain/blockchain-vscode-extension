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

import * as vscode from 'vscode';
import { FabricRuntimeRegistry } from '../../src/fabric/FabricRuntimeRegistry';

import * as chai from 'chai';
import { FabricRuntimeRegistryEntry } from '../../src/fabric/FabricRuntimeRegistryEntry';
import { ExtensionUtil } from '../../src/util/ExtensionUtil';

chai.should();

describe('FabricRuntimeRegistry', () => {

    const registry: FabricRuntimeRegistry = FabricRuntimeRegistry.instance();

    beforeEach(async () => {
        await ExtensionUtil.activateExtension();
        await registry.clear();
    });

    afterEach(async () => {
        await registry.clear();
    });

    it('should manage configurations for runtimes', async () => {
        const runtime: FabricRuntimeRegistryEntry = new FabricRuntimeRegistryEntry({
            name: 'my-fabric-runtime',
            developmentMode: true
        });
        registry.getAll().should.deep.equal([]);
        await registry.add(runtime);
        registry.getAll().should.deep.equal([runtime]);
    });

});
