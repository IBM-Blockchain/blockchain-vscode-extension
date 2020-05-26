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

import { BlockchainGatewayExplorerProvider } from '../../../extension/explorer/gatewayExplorer';
import { ExtensionUtil } from '../../../extension/util/ExtensionUtil';
import { TestUtil } from '../../TestUtil';

import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { FabricEnvironmentRegistryEntry, FabricNode } from 'ibm-blockchain-platform-common';
import { NodeTreeItem } from '../../../extension/explorer/runtimeOps/connectedTree/NodeTreeItem';
import { BlockchainExplorerProvider } from '../../../extension/explorer/BlockchainExplorerProvider';

class TestTreeItem extends NodeTreeItem {

    contextValue: string = 'blockchain-peer-item';

    constructor(provider: BlockchainExplorerProvider, public readonly peerName: string, public readonly tooltip: string, environmentRegistryEntry: FabricEnvironmentRegistryEntry, node: FabricNode, public readonly command?: vscode.Command) {
        super(provider, peerName, tooltip, environmentRegistryEntry, node, command);
    }
}

describe('NodeTreeItem', () => {

    const sandbox: sinon.SinonSandbox = sinon.createSandbox();
    let provider: BlockchainGatewayExplorerProvider;
    let node: FabricNode;

    before(async () => {
        await TestUtil.setupTests(sandbox);
    });

    beforeEach(async () => {
        await ExtensionUtil.activateExtension();

        node = FabricNode.newPeer('peer1', 'peer1.org1.example.com', 'http://peer.sample.org', 'admin', 'myWallet', 'Org1MSP');

        provider = ExtensionUtil.getBlockchainGatewayExplorerProvider();
    });

    afterEach(async () => {
        sandbox.restore();
    });

    describe('#constructor', () => {
        it('should have the right properties for a node', async () => {
            const tooltip: string = `Name: ${node.name}\nMSPID: ${node.msp_id}\nAssociated Identity:\n${node.identity}`;
            const treeItem: TestTreeItem = new TestTreeItem(provider, 'peer1.org1.example.com', tooltip, new FabricEnvironmentRegistryEntry(), node);

            treeItem.label.should.equal('peer1.org1.example.com');
            treeItem.tooltip.should.equal(tooltip);
        });
    });
});
