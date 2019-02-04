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
import { VSCodeOutputAdapter } from '../../src/logging/VSCodeOutputAdapter';
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import { TestUtil } from '../../test/TestUtil';
import { IntegrationTestUtil } from '../integrationTestUtil';
import { InstantiatedChaincodeTreeItem } from '../../src/explorer/model/InstantiatedChaincodeTreeItem';
import { PeerTreeItem } from '../../src/explorer/runtimeOps/PeerTreeItem';
import { OrgTreeItem } from '../../src/explorer/runtimeOps/OrgTreeItem';
import { SmartContractsTreeItem } from '../../src/explorer/runtimeOps/SmartContractsTreeItem';
import { InstalledTreeItem } from '../../src/explorer/runtimeOps/InstalledTreeItem';
import { ConnectionTreeItem } from '../../src/explorer/model/ConnectionTreeItem';

const should: Chai.Should = chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

// tslint:disable no-unused-expression
describe('Integration Tests for Fabric and Go/Java Smart Contracts', () => {

    let mySandBox: sinon.SinonSandbox;
    let integrationTestUtil: IntegrationTestUtil;
    const runtimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
    let runtime: FabricRuntime;
    let connectionItems: BlockchainTreeItem[];
    let errorSpy: sinon.SinonSpy;
    let showConfirmationWarningMessageStub: sinon.SinonStub;

    before(async function(): Promise<void> {
        this.timeout(600000);

        await ExtensionUtil.activateExtension();
        await TestUtil.storeGatewaysConfig();
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
        await TestUtil.restoreGatewaysConfig();
        await TestUtil.restoreRuntimesConfig();
        await TestUtil.restoreExtensionDirectoryConfig();
    });

    describe('Ops View', () => {
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
            const localFabricItem: RuntimeTreeItem = connectionItems.find((value: BlockchainTreeItem) => value instanceof RuntimeTreeItem && value.label.startsWith('Local fabric runtime is stopped. Click to start.')) as RuntimeTreeItem;
            if (runtime.isDevelopmentMode()) {
                await vscode.commands.executeCommand('blockchainExplorer.toggleFabricRuntimeDevMode');
            }
            localFabricItem.should.not.be.null;
        });

        afterEach(async () => {
            mySandBox.restore();
            delete process.env.GOPATH;
        });

        it('should show the unconnected view', async () => {
            const allChildren: Array<BlockchainTreeItem> = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren();

            allChildren.length.should.equal(1);
            allChildren[0].label.should.equal('Local fabric runtime is stopped. Click to start.');
        }).timeout(0);

        it('should connect to the ops view', async () => {
            // Start the Fabric runtime, and ensure that it is in the right state.
            await vscode.commands.executeCommand('blockchainExplorer.startFabricRuntime');
            runtime.isRunning().should.eventually.be.true;
            runtime.isDevelopmentMode().should.be.false;

            const allChildren: Array<BlockchainTreeItem> = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren();
            allChildren.length.should.equal(4);

            allChildren[0].label.should.equal('Smart Contracts');
            allChildren[1].label.should.equal('Channels');
            allChildren[2].label.should.equal('Nodes');
            allChildren[3].label.should.equal('Organizations');

            const smartContractsChildren: Array<SmartContractsTreeItem> = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren(allChildren[0]) as Array<SmartContractsTreeItem>;

            smartContractsChildren.length.should.equal(2);
            smartContractsChildren[0].label.should.equal('Instantiated');
            smartContractsChildren[1].label.should.equal('Installed');

            const instantiatedChildren: Array<BlockchainTreeItem> = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren(smartContractsChildren[0]);
            instantiatedChildren.length.should.equal(1);
            instantiatedChildren[0].label.should.equal('+ Instantiate');

            const installedChildren: Array<BlockchainTreeItem> = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren(smartContractsChildren[1]);
            installedChildren.length.should.equal(1);
            installedChildren[0].label.should.equal('+ Install');

            const channelChildren: Array<ChannelTreeItem> = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren(allChildren[1]) as Array<ChannelTreeItem>;

            channelChildren.length.should.equal(1);
            channelChildren[0].label.should.equal('mychannel');

            const nodesChildren: Array<PeerTreeItem> = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren(allChildren[2]) as Array<PeerTreeItem>;

            nodesChildren.length.should.equal(1);
            nodesChildren[0].label.should.equal('peer0.org1.example.com');

            const orgsChildren: Array<OrgTreeItem> = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren(allChildren[3]) as Array<OrgTreeItem>;

            orgsChildren.length.should.equal(1);
            orgsChildren[0].label.should.equal('Org1MSP');
        }).timeout(0);

        it('should allow you to start, connect to, open a terminal on and stop the local Fabric in non-development mode', async () => {

            // Start the Fabric runtime, and ensure that it is in the right state.
            await vscode.commands.executeCommand('blockchainExplorer.startFabricRuntime');
            runtime.isRunning().should.eventually.be.true;
            runtime.isDevelopmentMode().should.be.false;

            // Ensure that the Fabric runtime is showing a single channel.
            const allChildren: Array<BlockchainTreeItem> = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren();
            const channelItems: ChannelTreeItem[] = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren(allChildren[1]) as Array<ChannelTreeItem>;

            channelItems.length.should.equal(1);
            channelItems[0].label.should.equal('mychannel');

            // Open a Fabric runtime terminal.
            await vscode.commands.executeCommand('blockchainExplorer.openFabricRuntimeTerminal');
            const terminal: vscode.Terminal = vscode.window.terminals.find((item: vscode.Terminal) => item.name === 'Fabric runtime - local_fabric');
            terminal.should.not.be.null;

            // Disconnect from the Fabric runtime.
            await vscode.commands.executeCommand('blockchainConnectionsExplorer.disconnectEntry');

            // Stop the Fabric runtime, and ensure that it is in the right state.
            await vscode.commands.executeCommand('blockchainExplorer.stopFabricRuntime');
            runtime.isRunning().should.eventually.be.false;
            runtime.isDevelopmentMode().should.be.false;

            connectionItems = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren();
            const localFabricItem: RuntimeTreeItem = connectionItems.find((value: BlockchainTreeItem) => value instanceof RuntimeTreeItem && value.label.startsWith('Local fabric runtime is stopped. Click to start.')) as RuntimeTreeItem;
            localFabricItem.should.not.be.null;

        }).timeout(0);

        it('should allow you to start, connect to, and stop the local Fabric in development mode', async () => {

            // Enable development mode for the Fabric runtime.
            await vscode.commands.executeCommand('blockchainExplorer.toggleFabricRuntimeDevMode');

            // Start the Fabric runtime, and ensure that it is in the right state.
            await vscode.commands.executeCommand('blockchainExplorer.startFabricRuntime');
            runtime.isRunning().should.eventually.be.true;
            runtime.isDevelopmentMode().should.be.true;

            // Ensure that the Fabric runtime is showing a single channel.
            const allChildren: Array<BlockchainTreeItem> = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren();
            const channelItems: ChannelTreeItem[] = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren(allChildren[1]) as Array<ChannelTreeItem>;

            channelItems.length.should.equal(1);
            channelItems[0].label.should.equal('mychannel');

            // Disconnect from the Fabric runtime.
            await vscode.commands.executeCommand('blockchainConnectionsExplorer.disconnectEntry');

            // Stop the Fabric runtime, disable development mode, and ensure that it is in the right state.
            await vscode.commands.executeCommand('blockchainExplorer.stopFabricRuntime');
            await vscode.commands.executeCommand('blockchainExplorer.toggleFabricRuntimeDevMode');
            runtime.isRunning().should.eventually.be.false;
            runtime.isDevelopmentMode().should.be.false;

            connectionItems = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren();
            const localFabricItem: RuntimeTreeItem = connectionItems.find((value: BlockchainTreeItem) => value instanceof RuntimeTreeItem && value.label.startsWith('Local fabric runtime is stopped. Click to start.')) as RuntimeTreeItem;
            localFabricItem.should.not.be.null;

        }).timeout(0);

        it('should allow you to restart the local Fabric in non-development mode', async () => {

            // Start the Fabric runtime, and ensure that it is in the right state.
            await vscode.commands.executeCommand('blockchainExplorer.startFabricRuntime');
            runtime.isRunning().should.eventually.be.true;
            runtime.isDevelopmentMode().should.be.false;

            // Ensure that the Fabric runtime is showing a single channel.
            let allChildren: Array<BlockchainTreeItem> = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren();
            let channelItems: ChannelTreeItem[] = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren(allChildren[1]) as Array<ChannelTreeItem>;

            channelItems.length.should.equal(1);
            channelItems[0].label.should.equal('mychannel');

            // Disconnect from the Fabric runtime.
            await vscode.commands.executeCommand('blockchainConnectionsExplorer.disconnectEntry');

            // Restart the Fabric runtime, and ensure that it is in the right state.
            await vscode.commands.executeCommand('blockchainExplorer.restartFabricRuntime');
            runtime.isRunning().should.eventually.be.true;
            runtime.isDevelopmentMode().should.be.false;

            // Ensure that the Fabric runtime is showing a single channel.
            allChildren = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren();
            channelItems = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren(allChildren[1]) as Array<ChannelTreeItem>;

            channelItems.length.should.equal(1);
            channelItems[0].label.should.equal('mychannel');

            // Disconnect from the Fabric runtime.
            await vscode.commands.executeCommand('blockchainConnectionsExplorer.disconnectEntry');

            // Stop the Fabric runtime, and ensure that it is in the right state.
            await vscode.commands.executeCommand('blockchainExplorer.stopFabricRuntime');
            runtime.isRunning().should.eventually.be.false;
            runtime.isDevelopmentMode().should.be.false;

            connectionItems = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren();
            const localFabricItem: RuntimeTreeItem = connectionItems.find((value: BlockchainTreeItem) => value instanceof RuntimeTreeItem && value.label.startsWith('Local fabric runtime is stopped. Click to start.')) as RuntimeTreeItem;
            localFabricItem.should.not.be.null;

        }).timeout(0);

        it('should persist local Fabric data across restarts until the local Fabric is torn down', async () => {

            // Start the Fabric runtime, and ensure that it is in the right state.
            await vscode.commands.executeCommand('blockchainExplorer.startFabricRuntime');
            runtime.isRunning().should.eventually.be.true;
            runtime.isDevelopmentMode().should.be.false;

            // Ensure that the Fabric runtime is showing a single channel.
            let allChildren: Array<BlockchainTreeItem> = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren();
            let channelItems: Array<ChannelTreeItem> = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren(allChildren[1]) as Array<ChannelTreeItem>;

            channelItems.length.should.equal(1);
            channelItems[0].label.should.equal('mychannel');

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

            // Ensure that the Fabric runtime is showing a single channel.
            allChildren = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren();
            channelItems = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren(allChildren[1]) as Array<ChannelTreeItem>;

            channelItems.length.should.equal(1);
            channelItems[0].label.should.equal('mychannel');

            // Ensure that the instantiated chaincodes are still instantiated.
            let smartContractsChildren: BlockchainTreeItem[] = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren(allChildren[0]);

            smartContractsChildren.length.should.equal(2);
            smartContractsChildren[0].label.should.equal('Instantiated');

            let instantiatedChaincodesItems: InstantiatedChaincodeTreeItem[] = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren(smartContractsChildren[0]) as Array<InstantiatedChaincodeTreeItem>;
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

            // Ensure that the Fabric runtime is showing a single channel.
            allChildren = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren();
            channelItems = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren(allChildren[1]) as Array<ChannelTreeItem>;

            channelItems.length.should.equal(1);
            channelItems[0].label.should.equal('mychannel');

            // Ensure that there are no instantiated chaincodes.
            smartContractsChildren = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren(allChildren[0]);

            smartContractsChildren.length.should.equal(2);
            smartContractsChildren[0].label.should.equal('Instantiated');

            instantiatedChaincodesItems = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren(smartContractsChildren[0]) as Array<InstantiatedChaincodeTreeItem>;
            // should just be the one to click to instantiate
            instantiatedChaincodesItems.length.should.equal(1);
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

                let allChildren: Array<BlockchainTreeItem> = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren();
                let smartContractsChildren: Array<SmartContractsTreeItem> = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren(allChildren[0]) as Array<SmartContractsTreeItem>;

                smartContractsChildren.length.should.equal(2);
                smartContractsChildren[0].label.should.equal('Instantiated');
                smartContractsChildren[1].label.should.equal('Installed');

                let instantiatedChaincodesItems: Array<InstantiatedChaincodeTreeItem> = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren(smartContractsChildren[0]) as Array<InstantiatedChaincodeTreeItem>;

                let instantiatedSmartContract: BlockchainTreeItem = instantiatedChaincodesItems.find((_instantiatedSmartContract: BlockchainTreeItem) => {
                    return _instantiatedSmartContract.label === `${smartContractName}@0.0.1`;
                });

                instantiatedSmartContract.should.not.be.null;

                let installedChaincodesItems: Array<InstalledTreeItem> = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren(smartContractsChildren[1]);

                let installedSmartContract: BlockchainTreeItem = installedChaincodesItems.find((_installedSmartContract: BlockchainTreeItem) => {
                    return _installedSmartContract.label === `${smartContractName} v0.0.1`;
                });

                installedSmartContract.should.not.be.null;

                await integrationTestUtil.packageSmartContract('0.0.2');

                await integrationTestUtil.installSmartContract(smartContractName, '0.0.2');

                await integrationTestUtil.upgradeSmartContract(smartContractName, '0.0.2');

                allChildren = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren();

                smartContractsChildren = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren(allChildren[0]) as Array<SmartContractsTreeItem>;

                smartContractsChildren.length.should.equal(2);
                smartContractsChildren[0].label.should.equal('Instantiated');
                smartContractsChildren[1].label.should.equal('Installed');

                instantiatedChaincodesItems = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren(smartContractsChildren[0]) as Array<InstantiatedChaincodeTreeItem>;

                instantiatedSmartContract = instantiatedChaincodesItems.find((_instantiatedSmartContract: BlockchainTreeItem) => {
                    return _instantiatedSmartContract.label === `${smartContractName}@0.0.2`;
                });

                instantiatedSmartContract.should.not.be.null;

                installedChaincodesItems = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren(smartContractsChildren[1]);

                installedSmartContract = installedChaincodesItems.find((_installedSmartContract: BlockchainTreeItem) => {
                    return _installedSmartContract.label === `${smartContractName} v0.0.2`;
                });

                installedSmartContract.should.not.be.null;

                errorSpy.should.not.have.been.called;
            }).timeout(0);
        });
    });

    xdescribe('gateway view', () => {
        beforeEach(async function(): Promise<void> {
            this.timeout(600000);
            delete process.env.GOPATH;
            mySandBox = sinon.createSandbox();
            integrationTestUtil = new IntegrationTestUtil(mySandBox);

            showConfirmationWarningMessageStub = mySandBox.stub(UserInputUtil, 'showConfirmationWarningMessage');
            errorSpy = mySandBox.spy(vscode.window, 'showErrorMessage');
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

            allChildren[0].label.should.equal('Connected via gateway: myGateway');
            allChildren[3].label.should.equal('mychannel');
            allChildren[4].label.should.equal('myotherchannel');

            await vscode.commands.executeCommand('blockchainConnectionsExplorer.disconnectEntry');
            connectionItems = await myExtension.getBlockchainNetworkExplorerProvider().getChildren();
            const myConnectionItem: ConnectionTreeItem = connectionItems.find((value: BlockchainTreeItem) => value instanceof ConnectionTreeItem && value.label.startsWith('myGateway')) as ConnectionTreeItem;

            showConfirmationWarningMessageStub.resolves(true);
            await vscode.commands.executeCommand('blockchainConnectionsExplorer.deleteConnectionEntry', myConnectionItem);
            integrationTestUtil.gatewayRegistry.exists('myGateway').should.be.false;
        }).timeout(0);
    });
});
