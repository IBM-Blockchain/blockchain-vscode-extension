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
import * as myExtension from '../src/extension';
import * as path from 'path';

import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { ChannelTreeItem } from '../src/explorer/model/ChannelTreeItem';
import { PeerTreeItem } from '../src/explorer/model/PeerTreeItem';
import { PeersTreeItem } from '../src/explorer/model/PeersTreeItem';
import { ExtensionUtil } from '../src/util/ExtensionUtil';

chai.should();
chai.use(sinonChai);

// tslint:disable no-unused-expression
// Defines a Mocha test suite to group tests of similar kind together
describe('Integration Test', () => {

    let mySandBox;
    let keyPath: string;
    let certPath: string;

    before(async function() {
        this.timeout(600000);
        mySandBox = sinon.createSandbox();
        keyPath = path.join(__dirname, `../../integrationTest/hlfv1/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore/key.pem`);
        certPath = path.join(__dirname, `../../integrationTest/hlfv1/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts/Admin@org1.example.com-cert.pem`);

        await ExtensionUtil.activateExtension();
    });

    afterEach(() => {
        mySandBox.restore();
    });

    it('should connect to a real fabric', async () => {
        // reset the available connections
        await vscode.workspace.getConfiguration().update('fabric.connections', [], vscode.ConfigurationTarget.Global);

        const showInputBoxStub = mySandBox.stub(vscode.window, 'showInputBox');

        const rootPath = path.dirname(__dirname);

        showInputBoxStub.onFirstCall().resolves('myConnection');
        showInputBoxStub.onSecondCall().resolves(path.join(rootPath, '../integrationTest/data/connection/connection.json'));
        showInputBoxStub.onThirdCall().resolves(certPath);
        showInputBoxStub.onCall(3).resolves(keyPath);

        await vscode.commands.executeCommand('blockchainExplorer.addConnectionEntry');

        const showQuickPickStub = mySandBox.stub(vscode.window, 'showQuickPick');

        showQuickPickStub.onFirstCall().resolves('myConnection');

        await vscode.commands.executeCommand('blockchainExplorer.connectEntry');

        const allChildren: Array<ChannelTreeItem> = await myExtension.getBlockchainNetworkExplorerProvider().getChildren() as Array<ChannelTreeItem>;

        allChildren.length.should.equal(2);

        allChildren[0].label.should.equal('mychannel');
        allChildren[1].label.should.equal('myotherchannel');

        const channelChildrenOne: Array<PeersTreeItem> = await myExtension.getBlockchainNetworkExplorerProvider().getChildren(allChildren[0]) as Array<PeersTreeItem>;
        const peersChildren: Array<PeerTreeItem> = await myExtension.getBlockchainNetworkExplorerProvider().getChildren(channelChildrenOne[0]) as Array<PeerTreeItem>;

        peersChildren.length.should.equal(1);
        peersChildren[0].label.should.equal('peer0.org1.example.com');
    }).timeout(4000);
});
