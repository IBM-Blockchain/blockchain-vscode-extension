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
import * as path from 'path';
import { ConnectedTreeItem } from '../../../src/explorer/model/ConnectedTreeItem';
import { getBlockchainGatewayExplorerProvider } from '../../../src/extension';
import { FabricGatewayRegistryEntry } from '../../../src/fabric/FabricGatewayRegistryEntry';

import * as chai from 'chai';
import * as sinon from 'sinon';

chai.should();
const should: Chai.Should = chai.should();

describe('ConnectedTreeItem', () => {

    let gatewayRegistryEntry: FabricGatewayRegistryEntry;
    const rootPath: string = path.dirname(__dirname);

    class TestConnectedTreeItem extends ConnectedTreeItem {
        constructor(label: string) {
            super(getBlockchainGatewayExplorerProvider(), label, gatewayRegistryEntry, vscode.TreeItemCollapsibleState.None);
        }
    }

    let sandbox: sinon.SinonSandbox;
    let treeItem: ConnectedTreeItem;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        gatewayRegistryEntry = new FabricGatewayRegistryEntry();
        gatewayRegistryEntry.name = 'testGateway';
        gatewayRegistryEntry.connectionProfilePath = 'testPath';
        gatewayRegistryEntry.managedRuntime = true;
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('#iconPath', () => {

        it('should set the iconPath to null if tree item is connected via gateway', () => {
            treeItem = new TestConnectedTreeItem('test label Connected via gateway');
            should.not.exist(treeItem.iconPath);
        });

        it('should set the iconPath to null if tree item is using ID', () => {
            treeItem = new TestConnectedTreeItem('test label Using ID');
            should.not.exist(treeItem.iconPath);
        });

        it('should have an iconPath if the tree item is neither connected via gateway or using ID', () => {
            treeItem = new TestConnectedTreeItem('test label');
            treeItem.iconPath.should.deep.equal({
                light: path.join(rootPath, '..', '..', '..', 'resources', 'light', 'channel.svg'),
                dark: path.join(rootPath, '..', '..', '..', 'resources', 'dark', 'channel.svg')
            });
        });
    });
});
