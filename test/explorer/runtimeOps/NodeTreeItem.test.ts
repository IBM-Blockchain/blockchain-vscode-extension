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

import { getBlockchainGatewayExplorerProvider } from '../../../src/extension';
import { BlockchainGatewayExplorerProvider } from '../../../src/explorer/gatewayExplorer';
import { ExtensionUtil } from '../../../src/util/ExtensionUtil';
import { TestUtil } from '../../TestUtil';

import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { FabricNode } from '../../../src/fabric/FabricNode';
import { NodeTreeItem } from '../../../src/explorer/runtimeOps/connectedTree/NodeTreeItem';
import { BlockchainExplorerProvider } from '../../../src/explorer/BlockchainExplorerProvider';

class TestTreeItem extends NodeTreeItem {

    contextValue: string = 'blockchain-peer-item';

    constructor(provider: BlockchainExplorerProvider, public readonly peerName: string, node: FabricNode, public readonly command?: vscode.Command) {
        super(provider, peerName, node, command);
    }
}

describe('NodeTreeItem', () => {

    const sandbox: sinon.SinonSandbox = sinon.createSandbox();
    let provider: BlockchainGatewayExplorerProvider;
    let node: FabricNode;

    before(async () => {
        await TestUtil.setupTests(sandbox);
        await TestUtil.storeGatewaysConfig();
        await TestUtil.storeRuntimesConfig();
    });

    after(async () => {
        await TestUtil.restoreGatewaysConfig();
        await TestUtil.restoreRuntimesConfig();

    });

    beforeEach(async () => {
        await ExtensionUtil.activateExtension();

        node = FabricNode.newPeer('peer1', 'peer1.org1.example.com', 'http://peer.sample.org', undefined, undefined, undefined);

        provider = getBlockchainGatewayExplorerProvider();
    });

    afterEach(async () => {
        sandbox.restore();
    });

    describe('#constructor', () => {
        it('should have the right properties for a node without identity and wallet', async () => {
            const treeItem: TestTreeItem = new TestTreeItem(provider, 'peer1.org1.example.com', node);

            treeItem.label.should.equal('peer1.org1.example.com   ⚠');
        });

        it('should have the right properties for a node with identity and wallet', async () => {
            node.identity = 'admin';
            node.wallet = 'myWallet';
            const treeItem: TestTreeItem = new TestTreeItem(provider, 'peer1.org1.example.com', node);

            treeItem.label.should.equal('peer1.org1.example.com');
        });
    });
});
