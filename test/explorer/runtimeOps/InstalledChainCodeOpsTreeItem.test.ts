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

import { InstalledChainCodeOpsTreeItem } from '../../../src/explorer/runtimeOps/connectedTree/InstalledChainCodeOpsTreeItem';

import * as chai from 'chai';
import * as sinon from 'sinon';
import { ExtensionUtil } from '../../../src/util/ExtensionUtil';

chai.should();

describe('InstalledChainCodeOpsTreeItem', () => {

    class TestInstalledChainCodeOpsTreeItem extends InstalledChainCodeOpsTreeItem {
        constructor(name: string, version: string, peerName: string) {
            super(ExtensionUtil.getBlockchainGatewayExplorerProvider(), name, version, [peerName]);
        }
    }

    let sandbox: sinon.SinonSandbox;
    let treeItem: TestInstalledChainCodeOpsTreeItem;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('#tooltip', () => {

        it('should show correct tooltip', () => {
            treeItem = new TestInstalledChainCodeOpsTreeItem('test name', 'test version', 'test peerName');
            treeItem.tooltip.should.equal('Installed on: test peerName');
        });
    });
});
