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
import { getBlockchainGatewayExplorerProvider } from '../../../src/extension';
import { PeerTreeItem } from '../../../src/explorer/runtimeOps/PeerTreeItem';
import { BlockchainGatewayExplorerProvider } from '../../../src/explorer/gatewayExplorer';
import { FabricRuntimeManager } from '../../../src/fabric/FabricRuntimeManager';
import { FabricRuntime } from '../../../src/fabric/FabricRuntime';
import { ExtensionUtil } from '../../../src/util/ExtensionUtil';
import { TestUtil } from '../../TestUtil';
import { VSCodeBlockchainOutputAdapter } from '../../../src/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../../../src/logging/OutputAdapter';

import * as chai from 'chai';
import * as sinon from 'sinon';

const should: Chai.Should = chai.should();

describe('PeerTreeItem', () => {

    const runtimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();

    let sandbox: sinon.SinonSandbox;
    let provider: BlockchainGatewayExplorerProvider;
    let runtime: FabricRuntime;

    before(async () => {
        await TestUtil.setupTests();
        await TestUtil.storeGatewaysConfig();
        await TestUtil.storeRuntimesConfig();
    });

    after(async () => {
        await TestUtil.restoreGatewaysConfig();
        await TestUtil.restoreRuntimesConfig();

    });

    beforeEach(async () => {
        await ExtensionUtil.activateExtension();

        provider = getBlockchainGatewayExplorerProvider();
        await runtimeManager.add();
        runtime = runtimeManager.getRuntime();
        sandbox = sinon.createSandbox();
    });

    afterEach(async () => {
        sandbox.restore();
    });

    describe('#constructor', () => {
        it('should have the right properties for a runtime that is not running in development mode', async () => {
            sandbox.stub(runtime, 'isDevelopmentMode').returns(false);

            const treeItem: PeerTreeItem = await PeerTreeItem.newPeerTreeItem(provider, 'myPeer.org1.example.com', new Map<string, Array<string>>(), vscode.TreeItemCollapsibleState.None, false);

            treeItem.label.should.equal('myPeer.org1.example.com');

            treeItem.contextValue.should.equal('blockchain-peer-item');
        });

        it('should have the right properties for a runtime that is running in development mode', async () => {
            sandbox.stub(runtime, 'isDevelopmentMode').returns(true);

            const treeItem: PeerTreeItem = await PeerTreeItem.newPeerTreeItem(provider, 'myPeer.org1.example.com', new Map<string, Array<string>>(), vscode.TreeItemCollapsibleState.None, false);

            treeItem.label.should.equal('myPeer.org1.example.com   ∞');

            treeItem.contextValue.should.equal('blockchain-peer-item');
        });

        it('should display an error if it fails to update the properties', async () => {
            const logSpy: sinon.SinonSpy = sandbox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
            sandbox.stub(runtime, 'isDevelopmentMode').onCall(0).throws({message: 'some error'});

            const treeItem: PeerTreeItem = await PeerTreeItem.newPeerTreeItem(provider, 'myPeer.org1.example.com', new Map<string, Array<string>>(), vscode.TreeItemCollapsibleState.None, false);

            treeItem.label.should.equal('myPeer.org1.example.com');

            treeItem.contextValue.should.equal('blockchain-peer-item');
            logSpy.should.have.been.calledWith(LogType.ERROR, 'some error');
        });
    });
});
