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
import { BlockchainTreeItem } from '../../../src/explorer/model/BlockchainTreeItem';

import * as chai from 'chai';
import * as sinon from 'sinon';
import { BlockchainGatewayExplorerProvider } from '../../../src/explorer/gatewayExplorer';
import { TestUtil } from '../../TestUtil';
import { ExtensionUtil } from '../../../src/util/ExtensionUtil';

chai.should();

describe('BlockchainTreeItem', () => {
    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();
    class TestBlockchainTreeItem extends BlockchainTreeItem {

        constructor(label: string) {
            super(ExtensionUtil.getBlockchainGatewayExplorerProvider(), label, vscode.TreeItemCollapsibleState.None);
        }
    }

    let treeItem: TestBlockchainTreeItem;

    before(async () => {
        await TestUtil.setupTests(mySandBox);
    });

    afterEach(() => {
        mySandBox.restore();
    });

    describe('#tooltip', () => {

        it('should have the tooltip', () => {
            treeItem = new TestBlockchainTreeItem('test label');
            treeItem.tooltip.should.equal('test label');
        });
    });

    describe('#refresh', () => {

        it('should refresh the tree data provider', () => {
            treeItem = new TestBlockchainTreeItem('test label');
            const treeDataProvider: BlockchainGatewayExplorerProvider = ExtensionUtil.getBlockchainGatewayExplorerProvider();
            const refreshStub: sinon.SinonStub = mySandBox.stub(treeDataProvider, 'refresh');
            treeItem.refresh();
            refreshStub.should.have.been.calledOnceWithExactly(treeItem);
        });
    });
});
