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

import { AdminIdentityTreeItem } from '../../../src/explorer/model/AdminIdentityTreeItem';

import * as chai from 'chai';
import * as sinon from 'sinon';
import { ExtensionUtil } from '../../../src/util/ExtensionUtil';

chai.should();

describe('AdminIdentityTreeItem', () => {

    class TestAdminIdentityTreeItem extends AdminIdentityTreeItem {
        constructor(label: string, walletName: string, attributes?: any) {
            super(ExtensionUtil.getBlockchainWalletExplorerProvider(), label, walletName, attributes);
        }
    }

    let mySandBox: sinon.SinonSandbox;
    let treeItem: AdminIdentityTreeItem;

    beforeEach(() => {
        mySandBox = sinon.createSandbox();
    });

    afterEach(() => {
        mySandBox.restore();
    });

    describe('constructor', () => {

        it('should create tree item', () => {
            treeItem = new TestAdminIdentityTreeItem('admin', 'myWallet');
            treeItem.label.should.equal('admin ⭑');
            treeItem.tooltip.should.equal(`Attributes:\n\nNone`);
        });

        it('should create tree item and set tooltip if there are attributes', () => {
            treeItem = new TestAdminIdentityTreeItem('admin', 'myWallet', {attr1: 'hello', attr2: 'world'});
            treeItem.label.should.equal('admin ⭑');
            treeItem.tooltip.should.deep.equal(`Attributes:\n\nattr1:hello\nattr2:world`);
        });

    });
});
