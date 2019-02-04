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
import * as myExtension from '../../src/extension';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';
import { ChannelTreeItem } from '../../src/explorer/model/ChannelTreeItem';
import { ExtensionUtil } from '../../src/util/ExtensionUtil';
import { BlockchainTreeItem } from '../../src/explorer/model/BlockchainTreeItem';
import { RuntimeTreeItem } from '../../src/explorer/runtimeOps/RuntimeTreeItem';
import { FabricRuntime } from '../../src/fabric/FabricRuntime';
import { FabricRuntimeManager } from '../../src/fabric/FabricRuntimeManager';
import { ConnectionTreeItem } from '../../src/explorer/model/ConnectionTreeItem';
import { VSCodeOutputAdapter } from '../../src/logging/VSCodeOutputAdapter';
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import { TestUtil } from '../../test/TestUtil';
import { IntegrationTestUtil } from '../integrationTestUtil';
import { InstantiatedChaincodeTreeItem } from '../../src/explorer/model/InstantiatedChaincodeTreeItem';

const should: Chai.Should = chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

// tslint:disable no-unused-expression
// Defines a Mocha test suite to group tests of similar kind together
describe('Integration Tests for Fabric and Go/Java Smart Contracts', () => {

    let mySandBox: sinon.SinonSandbox;
    let integrationTestUtil: IntegrationTestUtil;
    const runtimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
    let runtime: FabricRuntime;
    let localFabricItem: RuntimeTreeItem;
    let connectionItems: BlockchainTreeItem[];
    let errorSpy: sinon.SinonSpy;
    let showConfirmationWarningMessageStub: sinon.SinonStub;

    before(async function(): Promise<void> {
        this.timeout(600000);

        await ExtensionUtil.activateExtension();
        await TestUtil.storeConnectionsConfig();
        await TestUtil.storeRuntimesConfig();
        await TestUtil.storeExtensionDirectoryConfig();

        VSCodeOutputAdapter.instance().setConsole(true);

        vscode.workspace.updateWorkspaceFolders(1, vscode.workspace.workspaceFolders.length - 1);

        const extDir: string = path.join(__dirname, '..', '..', '..', 'integrationTest', 'tmp');
        await vscode.workspace.getConfiguration().update('blockchain.ext.directory', extDir, vscode.ConfigurationTarget.Global);
        const packageDir: string = path.join(extDir, 'packages');
        const exists: boolean = await fs.pathExists(packageDir);
        if (exists) {
            await fs.remove(packageDir);
        }
    });

    after(async () => {
        vscode.workspace.updateWorkspaceFolders(1, vscode.workspace.workspaceFolders.length - 1);
        VSCodeOutputAdapter.instance().setConsole(false);
        await TestUtil.restoreConnectionsConfig();
        await TestUtil.restoreRuntimesConfig();
        await TestUtil.restoreExtensionDirectoryConfig();
    });

    beforeEach(async function(): Promise<void> {
        this.timeout(600000);
        delete process.env.GOPATH;
        mySandBox = sinon.createSandbox();
        integrationTestUtil = new IntegrationTestUtil(mySandBox);

        showConfirmationWarningMessageStub = mySandBox.stub(UserInputUtil, 'showConfirmationWarningMessage');
        errorSpy = mySandBox.spy(vscode.window, 'showErrorMessage');

        // Ensure that the Fabric runtime is in the right state.
        runtime = runtimeManager.get('local_fabric');

        let isRunning: boolean = await runtime.isRunning();
        if (isRunning) {
            await vscode.commands.executeCommand('blockchainExplorer.stopFabricRuntime');
            isRunning = await runtime.isRunning();
        }

        isRunning.should.equal(false);
        connectionItems = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren();
        localFabricItem = connectionItems.find((value: BlockchainTreeItem) => value instanceof RuntimeTreeItem && value.label.startsWith('Local fabric runtime is stopped. Click to start.')) as RuntimeTreeItem;
        if (runtime.isDevelopmentMode()) {
            await vscode.commands.executeCommand('blockchainExplorer.toggleFabricRuntimeDevMode', localFabricItem);
        }
        localFabricItem.should.not.be.null;
    });

    afterEach(async () => {
        await vscode.commands.executeCommand('blockchainConnectionsExplorer.disconnectEntry');
        mySandBox.restore();
        delete process.env.GOPATH;
    });

    it('should connect to a real fabric', async () => {
        await integrationTestUtil.createFabricConnection();

        await integrationTestUtil.connectToFabric();

        const allChildren: Array<ChannelTreeItem> = await myExtension.getBlockchainNetworkExplorerProvider().getChildren() as Array<ChannelTreeItem>;

        allChildren.length.should.equal(5);

        allChildren[0].label.should.equal('Connected via gateway: myConnection');
        allChildren[3].label.should.equal('mychannel');
        allChildren[4].label.should.equal('myotherchannel');

        await vscode.commands.executeCommand('blockchainConnectionsExplorer.disconnectEntry');
        connectionItems = await myExtension.getBlockchainNetworkExplorerProvider().getChildren();
        const myConnectionItem: ConnectionTreeItem = connectionItems.find((value: BlockchainTreeItem) => value instanceof ConnectionTreeItem && value.label.startsWith('myConnection')) as ConnectionTreeItem;

        showConfirmationWarningMessageStub.resolves(true);
        await vscode.commands.executeCommand('blockchainConnectionsExplorer.deleteConnectionEntry', myConnectionItem);
        integrationTestUtil.connectionRegistry.exists('myConnection').should.be.false;
    }).timeout(0);

    it('should allow you to start, connect to, open a terminal on and stop the local Fabric in non-development mode', async () => {

        // Start the Fabric runtime, and ensure that it is in the right state.
        await vscode.commands.executeCommand('blockchainExplorer.startFabricRuntime');
        runtime.isRunning().should.eventually.be.true;
        runtime.isDevelopmentMode().should.be.false;

        // Connect to the Fabric runtime.
        await vscode.commands.executeCommand('blockchainConnectionsExplorer.connectEntry', localFabricItem.connection);

        // Ensure that the Fabric runtime is showing a single channel.
        const channelItems: ChannelTreeItem[] = await myExtension.getBlockchainNetworkExplorerProvider().getChildren() as ChannelTreeItem[];
        channelItems.length.should.equal(4);
        channelItems[3].label.should.equal('mychannel');

        // Open a Fabric runtime terminal.
        await vscode.commands.executeCommand('blockchainExplorer.openFabricRuntimeTerminal', localFabricItem);
        const terminal: vscode.Terminal = vscode.window.terminals.find((item: vscode.Terminal) => item.name === 'Fabric runtime - local_fabric');
        terminal.should.not.be.null;

        // Disconnect from the Fabric runtime.
        await vscode.commands.executeCommand('blockchainConnectionsExplorer.disconnectEntry');

        // Stop the Fabric runtime, and ensure that it is in the right state.
        await vscode.commands.executeCommand('blockchainExplorer.stopFabricRuntime');
        runtime.isRunning().should.eventually.be.false;
        runtime.isDevelopmentMode().should.be.false;

    }).timeout(0);

    it('should allow you to start, connect to, and stop the local Fabric in development mode', async () => {

        // Enable development mode for the Fabric runtime.
        await vscode.commands.executeCommand('blockchainExplorer.toggleFabricRuntimeDevMode', localFabricItem);

        // Start the Fabric runtime, and ensure that it is in the right state.
        await vscode.commands.executeCommand('blockchainExplorer.startFabricRuntime');
        runtime.isRunning().should.eventually.be.true;
        runtime.isDevelopmentMode().should.be.true;

        // Connect to the Fabric runtime.
        await vscode.commands.executeCommand('blockchainConnectionsExplorer.connectEntry', localFabricItem.connection);

        // Ensure that the Fabric runtime is showing a single channel.
        const channelItems: ChannelTreeItem[] = await myExtension.getBlockchainNetworkExplorerProvider().getChildren() as ChannelTreeItem[];
        channelItems.length.should.equal(4);
        channelItems[3].label.should.equal('mychannel');

        // Disconnect from the Fabric runtime.
        await vscode.commands.executeCommand('blockchainConnectionsExplorer.disconnectEntry');

        // Stop the Fabric runtime, disable development mode, and ensure that it is in the right state.
        await vscode.commands.executeCommand('blockchainExplorer.stopFabricRuntime');
        await vscode.commands.executeCommand('blockchainExplorer.toggleFabricRuntimeDevMode', localFabricItem);
        runtime.isRunning().should.eventually.be.false;
        runtime.isDevelopmentMode().should.be.false;

    }).timeout(0);

    it('should allow you to restart the local Fabric in non-development mode', async () => {

        // Start the Fabric runtime, and ensure that it is in the right state.
        await vscode.commands.executeCommand('blockchainExplorer.startFabricRuntime');
        runtime.isRunning().should.eventually.be.true;
        runtime.isDevelopmentMode().should.be.false;

        // Connect to the Fabric runtime.
        await vscode.commands.executeCommand('blockchainConnectionsExplorer.connectEntry', localFabricItem.connection);

        // Ensure that the Fabric runtime is showing a single channel.
        let channelItems: ChannelTreeItem[] = await myExtension.getBlockchainNetworkExplorerProvider().getChildren() as ChannelTreeItem[];
        channelItems.length.should.equal(4);
        channelItems[3].label.should.equal('mychannel');

        // Disconnect from the Fabric runtime.
        await vscode.commands.executeCommand('blockchainConnectionsExplorer.disconnectEntry');

        // Restart the Fabric runtime, and ensure that it is in the right state.
        await vscode.commands.executeCommand('blockchainExplorer.restartFabricRuntime');
        runtime.isRunning().should.eventually.be.true;
        runtime.isDevelopmentMode().should.be.false;

        // Connect to the Fabric runtime.
        await vscode.commands.executeCommand('blockchainConnectionsExplorer.connectEntry', localFabricItem.connection);

        // Ensure that the Fabric runtime is showing a single channel.
        channelItems = await myExtension.getBlockchainNetworkExplorerProvider().getChildren() as ChannelTreeItem[];
        channelItems.length.should.equal(4);
        channelItems[3].label.should.equal('mychannel');

        // Disconnect from the Fabric runtime.
        await vscode.commands.executeCommand('blockchainConnectionsExplorer.disconnectEntry');

        // Stop the Fabric runtime, and ensure that it is in the right state.
        await vscode.commands.executeCommand('blockchainExplorer.stopFabricRuntime');
        runtime.isRunning().should.eventually.be.false;
        runtime.isDevelopmentMode().should.be.false;

    }).timeout(0);

    it('should persist local Fabric data across restarts until the local Fabric is torn down', async () => {

        // Start the Fabric runtime, and ensure that it is in the right state.
        await vscode.commands.executeCommand('blockchainExplorer.startFabricRuntime');
        runtime.isRunning().should.eventually.be.true;
        runtime.isDevelopmentMode().should.be.false;

        // Connect to the Fabric runtime.
        await vscode.commands.executeCommand('blockchainConnectionsExplorer.connectEntry', localFabricItem.connection);

        // Ensure that the Fabric runtime is showing a single channel.
        let channelItems: ChannelTreeItem[] = await myExtension.getBlockchainNetworkExplorerProvider().getChildren() as ChannelTreeItem[];
        channelItems.length.should.equal(4);
        channelItems[3].label.should.equal('mychannel');

        // Create a smart contract, package it, install it, and instantiate it.
        await integrationTestUtil.createSmartContract('teardownSmartContract', 'JavaScript');
        await integrationTestUtil.packageSmartContract();
        await integrationTestUtil.installSmartContract('teardownSmartContract', '0.0.1');
        await integrationTestUtil.instantiateSmartContract('teardownSmartContract', '0.0.1');

        // Disconnect from the Fabric runtime.
        await vscode.commands.executeCommand('blockchainConnectionsExplorer.disconnectEntry');

        // Restart the Fabric runtime, and ensure that it is in the right state.
        await vscode.commands.executeCommand('blockchainExplorer.restartFabricRuntime');
        runtime.isRunning().should.eventually.be.true;
        runtime.isDevelopmentMode().should.be.false;

        // Connect to the Fabric runtime.
        await vscode.commands.executeCommand('blockchainConnectionsExplorer.connectEntry', localFabricItem.connection);

        // Ensure that the Fabric runtime is showing a single channel.
        channelItems = await myExtension.getBlockchainNetworkExplorerProvider().getChildren() as ChannelTreeItem[];
        channelItems.length.should.equal(4);
        channelItems[3].label.should.equal('mychannel');

        // Ensure that the instantiated chaincodes are still instantiated.
        let channelChildren: BlockchainTreeItem[] = await myExtension.getBlockchainNetworkExplorerProvider().getChildren(channelItems[3]);
        const instantiatedChaincodesItems: InstantiatedChaincodeTreeItem[] = channelChildren as InstantiatedChaincodeTreeItem[];
        const teardownSmartContractItem: InstantiatedChaincodeTreeItem = instantiatedChaincodesItems.find((instantiatedChaincodesItem: InstantiatedChaincodeTreeItem) => instantiatedChaincodesItem.label === 'teardownSmartContract@0.0.1');
        teardownSmartContractItem.should.not.be.undefined;

        // Disconnect from the Fabric runtime.
        await vscode.commands.executeCommand('blockchainConnectionsExplorer.disconnectEntry');

        // Teardown the Fabric runtime, and ensure that it is in the right state.
        const warningStub: sinon.SinonStub = showConfirmationWarningMessageStub.resolves(true);
        await vscode.commands.executeCommand('blockchainExplorer.teardownFabricRuntime');
        runtime.isRunning().should.eventually.be.false;
        runtime.isDevelopmentMode().should.be.false;
        warningStub.restore();

        // Start the Fabric runtime, and ensure that it is in the right state.
        await vscode.commands.executeCommand('blockchainExplorer.startFabricRuntime');
        runtime.isRunning().should.eventually.be.true;
        runtime.isDevelopmentMode().should.be.false;

        // Connect to the Fabric runtime.
        await vscode.commands.executeCommand('blockchainConnectionsExplorer.connectEntry', localFabricItem.connection);

        // Ensure that the Fabric runtime is showing a single channel.
        channelItems = await myExtension.getBlockchainNetworkExplorerProvider().getChildren() as ChannelTreeItem[];
        channelItems.length.should.equal(4);
        channelItems[3].label.should.equal('mychannel');

        // Ensure that there are no instantiated chaincodes.
        channelChildren = await myExtension.getBlockchainNetworkExplorerProvider().getChildren(channelItems[3]);
        channelChildren.length.should.equal(0);
    }).timeout(0);

    ['Go', 'Java'].forEach((language: string) => {

        it(`should create a ${language} smart contract, package, install and instantiate it on a peer, and upgrade it`, async () => {
            const smartContractName: string = `my${language}SC`;

            await integrationTestUtil.createFabricConnection();

            await integrationTestUtil.connectToFabric();

            await integrationTestUtil.createSmartContract(smartContractName, language);

            await integrationTestUtil.packageSmartContract();

            await integrationTestUtil.installSmartContract(smartContractName, '0.0.1');

            await integrationTestUtil.instantiateSmartContract(smartContractName, '0.0.1');

            await integrationTestUtil.packageSmartContract('0.0.2');

            await integrationTestUtil.installSmartContract(smartContractName, '0.0.2');

            await integrationTestUtil.upgradeSmartContract(smartContractName, '0.0.2');

            const allChildren: Array<ChannelTreeItem> = await myExtension.getBlockchainNetworkExplorerProvider().getChildren() as Array<ChannelTreeItem>;

            const channelChildrenOne: Array<BlockchainTreeItem> = await myExtension.getBlockchainNetworkExplorerProvider().getChildren(allChildren[3]) as Array<BlockchainTreeItem>;

            const instantiatedSmartContract: BlockchainTreeItem = channelChildrenOne.find((_instantiatedSmartContract: BlockchainTreeItem) => {
                return _instantiatedSmartContract.label === `${smartContractName}@0.0.2`;
            });

            instantiatedSmartContract.should.not.be.null;
            errorSpy.should.not.have.been.called;
        }).timeout(0);
    });
});
