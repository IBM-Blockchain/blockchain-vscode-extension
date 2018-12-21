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
import { RuntimeTreeItem } from '../../src/explorer/model/RuntimeTreeItem';
import { FabricRuntime } from '../../src/fabric/FabricRuntime';
import { FabricRuntimeManager } from '../../src/fabric/FabricRuntimeManager';
import { ConnectionTreeItem } from '../../src/explorer/model/ConnectionTreeItem';
import { VSCodeOutputAdapter } from '../../src/logging/VSCodeOutputAdapter';
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import { InstalledChainCodeTreeItem } from '../../src/explorer/model/InstalledChainCodeTreeItem';
import { InstalledChainCodeVersionTreeItem } from '../../src/explorer/model/InstalledChaincodeVersionTreeItem';
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

    beforeEach(async () => {
        delete process.env.GOPATH;
        mySandBox = sinon.createSandbox();
        integrationTestUtil = new IntegrationTestUtil(mySandBox);

        showConfirmationWarningMessageStub = mySandBox.stub(UserInputUtil, 'showConfirmationWarningMessage');
        errorSpy = mySandBox.spy(vscode.window, 'showErrorMessage');

        // Ensure that the Fabric runtime is in the right state.
        runtime = runtimeManager.get('local_fabric');
        runtime.isRunning().should.eventually.be.false;
        connectionItems = await myExtension.getBlockchainNetworkExplorerProvider().getChildren();
        localFabricItem = connectionItems.find((value: BlockchainTreeItem) => value instanceof RuntimeTreeItem && value.label.startsWith('local_fabric')) as RuntimeTreeItem;
        if (runtime.isDevelopmentMode()) {
            await vscode.commands.executeCommand('blockchainExplorer.toggleFabricRuntimeDevMode', localFabricItem);
        }
        localFabricItem.should.not.be.null;

    });

    afterEach(async () => {
        await vscode.commands.executeCommand('blockchainExplorer.disconnectEntry');
        mySandBox.restore();
        delete process.env.GOPATH;
    });

    it('should connect to a real fabric', async () => {
        await integrationTestUtil.createFabricConnection();

        await integrationTestUtil.connectToFabric();

        const allChildren: Array<ChannelTreeItem> = await myExtension.getBlockchainNetworkExplorerProvider().getChildren() as Array<ChannelTreeItem>;

        allChildren.length.should.equal(3);

        allChildren[0].label.should.equal('Connected to: myConnection');
        allChildren[1].label.should.equal('mychannel');
        allChildren[2].label.should.equal('myotherchannel');

        const channelChildrenOne: Array<BlockchainTreeItem> = await myExtension.getBlockchainNetworkExplorerProvider().getChildren(allChildren[1]) as Array<BlockchainTreeItem>;

        channelChildrenOne[0].label.should.equal('peer0.org1.example.com');

        await vscode.commands.executeCommand('blockchainExplorer.disconnectEntry');
        connectionItems = await myExtension.getBlockchainNetworkExplorerProvider().getChildren();
        const myConnectionItem: ConnectionTreeItem = connectionItems.find((value: BlockchainTreeItem) => value instanceof ConnectionTreeItem && value.label.startsWith('myConnection')) as ConnectionTreeItem;

        showConfirmationWarningMessageStub.resolves(true);
        await vscode.commands.executeCommand('blockchainExplorer.deleteConnectionEntry', myConnectionItem);
        integrationTestUtil.connectionRegistry.exists('myConnection').should.be.false;
    }).timeout(0);

    it('should allow you to start, connect to, open a terminal on and stop the local Fabric in non-development mode', async () => {

        // Start the Fabric runtime, and ensure that it is in the right state.
        await vscode.commands.executeCommand('blockchainExplorer.startFabricRuntime', localFabricItem);
        runtime.isRunning().should.eventually.be.true;
        runtime.isDevelopmentMode().should.be.false;

        // Connect to the Fabric runtime.
        await vscode.commands.executeCommand('blockchainExplorer.connectEntry', localFabricItem.connection);

        // Ensure that the Fabric runtime is showing a single channel.
        const channelItems: ChannelTreeItem[] = await myExtension.getBlockchainNetworkExplorerProvider().getChildren() as ChannelTreeItem[];
        channelItems.length.should.equal(2);
        channelItems[1].label.should.equal('mychannel');

        // Open a Fabric runtime terminal.
        await vscode.commands.executeCommand('blockchainExplorer.openFabricRuntimeTerminal', localFabricItem);
        const terminal: vscode.Terminal = vscode.window.terminals.find((item: vscode.Terminal) => item.name === 'Fabric runtime - local_fabric');
        terminal.should.not.be.null;

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

        // Enable development mode for the Fabric runtime.
        await vscode.commands.executeCommand('blockchainExplorer.toggleFabricRuntimeDevMode', localFabricItem);

        // Start the Fabric runtime, and ensure that it is in the right state.
        await vscode.commands.executeCommand('blockchainExplorer.startFabricRuntime', localFabricItem);
        runtime.isRunning().should.eventually.be.true;
        runtime.isDevelopmentMode().should.be.true;

        // Connect to the Fabric runtime.
        await vscode.commands.executeCommand('blockchainExplorer.connectEntry', localFabricItem.connection);

        // Ensure that the Fabric runtime is showing a single channel.
        const channelItems: ChannelTreeItem[] = await myExtension.getBlockchainNetworkExplorerProvider().getChildren() as ChannelTreeItem[];
        channelItems.length.should.equal(2);
        channelItems[1].label.should.equal('mychannel');

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

    it('should allow you to restart the local Fabric in non-development mode', async () => {

        // Start the Fabric runtime, and ensure that it is in the right state.
        await vscode.commands.executeCommand('blockchainExplorer.startFabricRuntime', localFabricItem);
        runtime.isRunning().should.eventually.be.true;
        runtime.isDevelopmentMode().should.be.false;

        // Connect to the Fabric runtime.
        await vscode.commands.executeCommand('blockchainExplorer.connectEntry', localFabricItem.connection);

        // Ensure that the Fabric runtime is showing a single channel.
        let channelItems: ChannelTreeItem[] = await myExtension.getBlockchainNetworkExplorerProvider().getChildren() as ChannelTreeItem[];
        channelItems.length.should.equal(2);
        channelItems[1].label.should.equal('mychannel');

        // Disconnect from the Fabric runtime.
        await vscode.commands.executeCommand('blockchainExplorer.disconnectEntry');

        // Find the Fabric runtime in the connections tree again.
        connectionItems = await myExtension.getBlockchainNetworkExplorerProvider().getChildren();
        localFabricItem = connectionItems.find((value: BlockchainTreeItem) => value instanceof RuntimeTreeItem && value.label.startsWith('local_fabric')) as RuntimeTreeItem;
        localFabricItem.should.not.be.null;

        // Restart the Fabric runtime, and ensure that it is in the right state.
        await vscode.commands.executeCommand('blockchainExplorer.restartFabricRuntime', localFabricItem);
        runtime.isRunning().should.eventually.be.true;
        runtime.isDevelopmentMode().should.be.false;

        // Connect to the Fabric runtime.
        await vscode.commands.executeCommand('blockchainExplorer.connectEntry', localFabricItem.connection);

        // Ensure that the Fabric runtime is showing a single channel.
        channelItems = await myExtension.getBlockchainNetworkExplorerProvider().getChildren() as ChannelTreeItem[];
        channelItems.length.should.equal(2);
        channelItems[1].label.should.equal('mychannel');

        // Disconnect from the Fabric runtime.
        await vscode.commands.executeCommand('blockchainExplorer.disconnectEntry');

        // Stop the Fabric runtime, and ensure that it is in the right state.
        await vscode.commands.executeCommand('blockchainExplorer.stopFabricRuntime', localFabricItem);
        runtime.isRunning().should.eventually.be.false;
        runtime.isDevelopmentMode().should.be.false;

    }).timeout(0);

    it('should persist local Fabric data across restarts until the local Fabric is torn down', async () => {

        // Start the Fabric runtime, and ensure that it is in the right state.
        await vscode.commands.executeCommand('blockchainExplorer.startFabricRuntime', localFabricItem);
        runtime.isRunning().should.eventually.be.true;
        runtime.isDevelopmentMode().should.be.false;

        // Connect to the Fabric runtime.
        await vscode.commands.executeCommand('blockchainExplorer.connectEntry', localFabricItem.connection);

        // Ensure that the Fabric runtime is showing a single channel.
        let channelItems: ChannelTreeItem[] = await myExtension.getBlockchainNetworkExplorerProvider().getChildren() as ChannelTreeItem[];
        channelItems.length.should.equal(2);
        channelItems[1].label.should.equal('mychannel');

        // Create a smart contract, package it, install it, and instantiate it.
        await integrationTestUtil.createSmartContract('teardownSmartContract', 'JavaScript');
        await integrationTestUtil.packageSmartContract();
        await integrationTestUtil.installSmartContract('teardownSmartContract', '0.0.1');
        await integrationTestUtil.instantiateSmartContract('teardownSmartContract', '0.0.1');

        // Disconnect from the Fabric runtime.
        await vscode.commands.executeCommand('blockchainExplorer.disconnectEntry');

        // Find the Fabric runtime in the connections tree again.
        connectionItems = await myExtension.getBlockchainNetworkExplorerProvider().getChildren();
        localFabricItem = connectionItems.find((value: BlockchainTreeItem) => value instanceof RuntimeTreeItem && value.label.startsWith('local_fabric')) as RuntimeTreeItem;
        localFabricItem.should.not.be.null;

        // Restart the Fabric runtime, and ensure that it is in the right state.
        await vscode.commands.executeCommand('blockchainExplorer.restartFabricRuntime', localFabricItem);
        runtime.isRunning().should.eventually.be.true;
        runtime.isDevelopmentMode().should.be.false;

        // Connect to the Fabric runtime.
        await vscode.commands.executeCommand('blockchainExplorer.connectEntry', localFabricItem.connection);

        // Ensure that the Fabric runtime is showing a single channel.
        channelItems = await myExtension.getBlockchainNetworkExplorerProvider().getChildren() as ChannelTreeItem[];
        channelItems.length.should.equal(2);
        channelItems[1].label.should.equal('mychannel');

        // Ensure that the instantiated chaincodes are still instantiated.
        let channelChildren: BlockchainTreeItem[] = await myExtension.getBlockchainNetworkExplorerProvider().getChildren(channelItems[0]);
        const instantiatedChaincodesItems: InstantiatedChaincodeTreeItem[] = await myExtension.getBlockchainNetworkExplorerProvider().getChildren(channelChildren[1]) as InstantiatedChaincodeTreeItem[];
        const teardownSmartContractItem: InstantiatedChaincodeTreeItem = instantiatedChaincodesItems.find((instantiatedChaincodesItem: InstantiatedChaincodeTreeItem) => instantiatedChaincodesItem.label === 'teardownSmartContract@0.0.1');
        teardownSmartContractItem.should.not.be.undefined;

        // Disconnect from the Fabric runtime.
        await vscode.commands.executeCommand('blockchainExplorer.disconnectEntry');

        // Teardown the Fabric runtime, and ensure that it is in the right state.
        const warningStub: sinon.SinonStub = showConfirmationWarningMessageStub.resolves(true);
        await vscode.commands.executeCommand('blockchainExplorer.teardownFabricRuntime', localFabricItem);
        runtime.isRunning().should.eventually.be.false;
        runtime.isDevelopmentMode().should.be.false;
        warningStub.restore();

        // Start the Fabric runtime, and ensure that it is in the right state.
        await vscode.commands.executeCommand('blockchainExplorer.startFabricRuntime', localFabricItem);
        runtime.isRunning().should.eventually.be.true;
        runtime.isDevelopmentMode().should.be.false;

        // Connect to the Fabric runtime.
        await vscode.commands.executeCommand('blockchainExplorer.connectEntry', localFabricItem.connection);

        // Ensure that the Fabric runtime is showing a single channel.
        channelItems = await myExtension.getBlockchainNetworkExplorerProvider().getChildren() as ChannelTreeItem[];
        channelItems.length.should.equal(2);
        channelItems[1].label.should.equal('mychannel');

        // Ensure that there are no instantiated chaincodes.
        channelChildren = await myExtension.getBlockchainNetworkExplorerProvider().getChildren(channelItems[1]);
        // Should be just the peer
        channelChildren.length.should.equal(1);
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

            const channelChildrenOne: Array<BlockchainTreeItem> = await myExtension.getBlockchainNetworkExplorerProvider().getChildren(allChildren[1]) as Array<BlockchainTreeItem>;

            const installedSmartContracts: Array<InstalledChainCodeTreeItem> = await myExtension.getBlockchainNetworkExplorerProvider().getChildren(channelChildrenOne[0]) as Array<InstalledChainCodeTreeItem>;

            const installedSmartContract: InstalledChainCodeTreeItem = installedSmartContracts.find((_installedSmartContract: InstalledChainCodeTreeItem) => {
                return _installedSmartContract.label === smartContractName;
            });

            installedSmartContract.should.not.be.null;

            const versions: Array<InstalledChainCodeVersionTreeItem> = await myExtension.getBlockchainNetworkExplorerProvider().getChildren(installedSmartContract) as Array<InstalledChainCodeVersionTreeItem>;

            versions.length.should.equal(2);

            versions[0].label.should.equal('0.0.1');
            versions[1].label.should.equal('0.0.2');

            const instantiatedSmartContract: BlockchainTreeItem = channelChildrenOne.find((_instantiatedSmartContract: BlockchainTreeItem) => {
                return _instantiatedSmartContract.label === `${smartContractName}@0.0.2`;
            });

            instantiatedSmartContract.should.not.be.null;
            errorSpy.should.not.have.been.called;

        }).timeout(0);

    });

});
