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
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { ExtensionUtil } from '../../../extension/util/ExtensionUtil';
import { InstantiatedTreeItem } from '../../../extension/explorer/model/InstantiatedTreeItem';
import { ChannelTreeItem } from '../../../extension/explorer/model/ChannelTreeItem';

const should: Chai.Should = chai.should();

describe('InstantiatedTreeItem', () => {

    class TestInstantiatedTreeItem extends InstantiatedTreeItem {
        constructor(public readonly name: string, public readonly channels: ChannelTreeItem[], public readonly version: string, public readonly collapsibleState: vscode.TreeItemCollapsibleState, public readonly contracts?: string[], public readonly showIcon?: boolean) {
            super(ExtensionUtil.getBlockchainWalletExplorerProvider(), name, channels, version, collapsibleState, contracts, showIcon );
        }
    }

    let mySandBox: sinon.SinonSandbox;
    let treeItem: InstantiatedTreeItem;

    beforeEach(() => {
        mySandBox = sinon.createSandbox();
    });

    afterEach(() => {
        mySandBox.restore();
    });

    describe('constructor', () => {

        it('should create tree item', () => {
            treeItem = new TestInstantiatedTreeItem('mySmartContract', [new ChannelTreeItem(ExtensionUtil.getBlockchainWalletExplorerProvider(), 'myChannel', [], [], vscode.TreeItemCollapsibleState.Collapsed), new ChannelTreeItem(ExtensionUtil.getBlockchainWalletExplorerProvider(), 'myOtherChannel', [], [], vscode.TreeItemCollapsibleState.Collapsed)], '0.0.1', vscode.TreeItemCollapsibleState.None, [], false);
            treeItem.tooltip.should.equal(`Instantiated on: myChannel, myOtherChannel`);
            should.not.exist(treeItem.iconPath);
        });
    });
});
