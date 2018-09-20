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
import * as chaiAsPromised from 'chai-as-promised';
import { ChannelTreeItem } from '../src/explorer/model/ChannelTreeItem';
import { PeerTreeItem } from '../src/explorer/model/PeerTreeItem';
import { PeersTreeItem } from '../src/explorer/model/PeersTreeItem';
import { ExtensionUtil } from '../src/util/ExtensionUtil';
import { FabricConnectionRegistry } from '../src/fabric/FabricConnectionRegistry';
import { FabricConnectionRegistryEntry } from '../src/fabric/FabricConnectionRegistryEntry';
import { BlockchainTreeItem } from '../src/explorer/model/BlockchainTreeItem';
import { RuntimeTreeItem } from '../src/explorer/model/RuntimeTreeItem';
import { FabricRuntime } from '../src/fabric/FabricRuntime';
import { FabricRuntimeManager } from '../src/fabric/FabricRuntimeManager';
import { ConnectionTreeItem } from '../src/explorer/model/ConnectionTreeItem';
import { VSCodeOutputAdapter } from '../src/logging/VSCodeOutputAdapter';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

// tslint:disable no-unused-expression
// Defines a Mocha test suite to group tests of similar kind together
describe('Integration Test', () => {

    const runtimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
    const connectionRegistry: FabricConnectionRegistry = FabricConnectionRegistry.instance();

    let mySandBox: sinon.SinonSandbox;
    let keyPath: string;
    let certPath: string;

    before(async function() {
        this.timeout(600000);
        keyPath = path.join(__dirname, `../../integrationTest/hlfv1/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore/key.pem`);
        certPath = path.join(__dirname, `../../integrationTest/hlfv1/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts/Admin@org1.example.com-cert.pem`);

        await ExtensionUtil.activateExtension();

        VSCodeOutputAdapter.instance().setConsole(true);
    });

    after(() => {
        VSCodeOutputAdapter.instance().setConsole(false);
    });

    beforeEach(() => {
        mySandBox = sinon.createSandbox();
    });

    afterEach(() => {
        mySandBox.restore();
    });

    it('should connect to a real fabric', async () => {
        if (connectionRegistry.exists('myConnection')) {
            await connectionRegistry.delete('myConnection');
        }

        const showInputBoxStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showInputBox');

        const rootPath: string = path.dirname(__dirname);

        showInputBoxStub.onFirstCall().resolves('myConnection');
        showInputBoxStub.onSecondCall().resolves(path.join(rootPath, '../integrationTest/data/connection/connection.json'));
        showInputBoxStub.onThirdCall().resolves(certPath);
        showInputBoxStub.onCall(3).resolves(keyPath);

        await vscode.commands.executeCommand('blockchainExplorer.addConnectionEntry');

        connectionRegistry.exists('myConnection').should.be.true;

        const showQuickPickStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showQuickPick');

        const connection: FabricConnectionRegistryEntry = connectionRegistry.get('myConnection');

        showQuickPickStub.onFirstCall().resolves({label: 'myConnection', data: connection});

        await vscode.commands.executeCommand('blockchainExplorer.connectEntry');

        const allChildren: Array<ChannelTreeItem> = await myExtension.getBlockchainNetworkExplorerProvider().getChildren() as Array<ChannelTreeItem>;

        allChildren.length.should.equal(2);

        allChildren[0].label.should.equal('mychannel');
        allChildren[1].label.should.equal('myotherchannel');

        const channelChildrenOne: Array<PeersTreeItem> = await myExtension.getBlockchainNetworkExplorerProvider().getChildren(allChildren[0]) as Array<PeersTreeItem>;
        const peersChildren: Array<PeerTreeItem> = await myExtension.getBlockchainNetworkExplorerProvider().getChildren(channelChildrenOne[0]) as Array<PeerTreeItem>;

        peersChildren.length.should.equal(1);
        peersChildren[0].label.should.equal('peer0.org1.example.com');

        await vscode.commands.executeCommand('blockchainExplorer.disconnectEntry');
        const connectionItems: BlockchainTreeItem[] = await myExtension.getBlockchainNetworkExplorerProvider().getChildren();
        const myConnectionItem: ConnectionTreeItem = connectionItems.find((value: BlockchainTreeItem) => value instanceof ConnectionTreeItem && value.label.startsWith('myConnection')) as ConnectionTreeItem;
        await vscode.commands.executeCommand('blockchainExplorer.deleteConnectionEntry', myConnectionItem);
        connectionRegistry.exists('myConnection').should.be.false;
    }).timeout(4000);

    it('should allow you to start, connect to, and stop the local Fabric in non-development mode', async () => {

        // Ensure that the Fabric runtime is in the right state.
        const runtime: FabricRuntime = runtimeManager.get('local_fabric');
        runtime.isRunning().should.eventually.be.false;
        runtime.isDevelopmentMode().should.be.false;

        // Find the Fabric runtime in the connections tree.
        let connectionItems: BlockchainTreeItem[] = await myExtension.getBlockchainNetworkExplorerProvider().getChildren();
        let localFabricItem: RuntimeTreeItem = connectionItems.find((value: BlockchainTreeItem) => value instanceof RuntimeTreeItem && value.label.startsWith('local_fabric')) as RuntimeTreeItem;
        localFabricItem.should.not.be.null;

        // Start the Fabric runtime, and ensure that it is in the right state.
        await vscode.commands.executeCommand('blockchainExplorer.startFabricRuntime', localFabricItem);
        runtime.isRunning().should.eventually.be.true;
        runtime.isDevelopmentMode().should.be.false;

        // Connect to the Fabric runtime.
        const connection: FabricConnectionRegistryEntry = connectionRegistry.get('local_fabric');
        await vscode.commands.executeCommand('blockchainExplorer.connectEntry', connection);

        // Ensure that the Fabric runtime is showing a single channel.
        const channelItems: ChannelTreeItem[] = await myExtension.getBlockchainNetworkExplorerProvider().getChildren() as ChannelTreeItem[];
        channelItems.length.should.equal(1);
        channelItems[0].label.should.equal('mychannel');

        // Disconnect from the Fabric runtime.
        await vscode.commands.executeCommand('blockchainExplorer.disconnectEntry');

        // Find the Fabric runtime in the connections tree again.
        connectionItems = await myExtension.getBlockchainNetworkExplorerProvider().getChildren();
        localFabricItem = connectionItems.find((value: BlockchainTreeItem) => value instanceof RuntimeTreeItem && value.label.startsWith('local_fabric')) as RuntimeTreeItem;
        localFabricItem.should.not.be.null;

        // Stop the Fabric runtime, and ensure that it is in the right state.
        await vscode.commands.executeCommand('blockchainExplorer.stopFabricRuntime', localFabricItem);
        runtime.isRunning().should.eventually.be.false;
        runtime.isDevelopmentMode().should.be.false;

    }).timeout(0);

    it('should allow you to start, connect to, and stop the local Fabric in development mode', async () => {

        // Ensure that the Fabric runtime is in the right state.
        const runtime: FabricRuntime = runtimeManager.get('local_fabric');
        runtime.isRunning().should.eventually.be.false;
        runtime.isDevelopmentMode().should.be.false;

        // Find the Fabric runtime in the connections tree.
        let connectionItems: BlockchainTreeItem[] = await myExtension.getBlockchainNetworkExplorerProvider().getChildren();
        let localFabricItem: RuntimeTreeItem = connectionItems.find((value: BlockchainTreeItem) => value instanceof RuntimeTreeItem && value.label.startsWith('local_fabric')) as RuntimeTreeItem;
        localFabricItem.should.not.be.null;

        // Enable development mode for the Fabric runtime.
        await vscode.commands.executeCommand('blockchainExplorer.toggleFabricRuntimeDevMode', localFabricItem);

        // Start the Fabric runtime, and ensure that it is in the right state.
        await vscode.commands.executeCommand('blockchainExplorer.startFabricRuntime', localFabricItem);
        runtime.isRunning().should.eventually.be.true;
        runtime.isDevelopmentMode().should.be.true;

        // Connect to the Fabric runtime.
        const connection: FabricConnectionRegistryEntry = connectionRegistry.get('local_fabric');
        await vscode.commands.executeCommand('blockchainExplorer.connectEntry', connection);

        // Ensure that the Fabric runtime is showing a single channel.
        const channelItems: ChannelTreeItem[] = await myExtension.getBlockchainNetworkExplorerProvider().getChildren() as ChannelTreeItem[];
        channelItems.length.should.equal(1);
        channelItems[0].label.should.equal('mychannel');

        // Disconnect from the Fabric runtime.
        await vscode.commands.executeCommand('blockchainExplorer.disconnectEntry');

        // Find the Fabric runtime in the connections tree again.
        connectionItems = await myExtension.getBlockchainNetworkExplorerProvider().getChildren();
        localFabricItem = connectionItems.find((value: BlockchainTreeItem) => value instanceof RuntimeTreeItem && value.label.startsWith('local_fabric')) as RuntimeTreeItem;
        localFabricItem.should.not.be.null;

        // Stop the Fabric runtime, disable development mode, and ensure that it is in the right state.
        await vscode.commands.executeCommand('blockchainExplorer.stopFabricRuntime', localFabricItem);
        await vscode.commands.executeCommand('blockchainExplorer.toggleFabricRuntimeDevMode', localFabricItem);
        runtime.isRunning().should.eventually.be.false;
        runtime.isDevelopmentMode().should.be.false;

    }).timeout(0);

});
