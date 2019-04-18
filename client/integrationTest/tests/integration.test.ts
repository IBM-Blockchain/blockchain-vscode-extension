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
import { VSCodeBlockchainOutputAdapter } from '../../src/logging/VSCodeBlockchainOutputAdapter';
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import { TestUtil } from '../../test/TestUtil';
import { IntegrationTestUtil } from '../integrationTestUtil';
import { InstantiatedChaincodeTreeItem } from '../../src/explorer/model/InstantiatedChaincodeTreeItem';
import { PeerTreeItem } from '../../src/explorer/runtimeOps/PeerTreeItem';
import { OrgTreeItem } from '../../src/explorer/runtimeOps/OrgTreeItem';
import { SmartContractsTreeItem } from '../../src/explorer/runtimeOps/SmartContractsTreeItem';
import { InstalledTreeItem } from '../../src/explorer/runtimeOps/InstalledTreeItem';
import { IdentityTreeItem } from '../../src/explorer/model/IdentityTreeItem';
import { GatewayTreeItem } from '../../src/explorer/model/GatewayTreeItem';
import { ExtensionCommands } from '../../ExtensionCommands';
import { LogType } from '../../src/logging/OutputAdapter';
import { InstantiatedContractTreeItem } from '../../src/explorer/model/InstantiatedContractTreeItem';
import { LocalWalletTreeItem } from '../../src/explorer/wallets/LocalWalletTreeItem';
import { FabricRuntimeUtil } from '../../src/fabric/FabricRuntimeUtil';
import { FabricWalletUtil } from '../../src/fabric/FabricWalletUtil';
import { WalletTreeItem } from '../../src/explorer/wallets/WalletTreeItem';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

// tslint:disable no-unused-expression
describe('Integration Tests for Fabric and Go/Java Smart Contracts', () => {

    let mySandBox: sinon.SinonSandbox;
    let integrationTestUtil: IntegrationTestUtil;
    const runtimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
    let runtime: FabricRuntime;
    let logSpy: sinon.SinonSpy;
    let showConfirmationWarningMessageStub: sinon.SinonStub;

    before(async function(): Promise<void> {
        this.timeout(600000);

        await ExtensionUtil.activateExtension();
        await TestUtil.storeGatewaysConfig();
        await TestUtil.storeRuntimesConfig();
        await TestUtil.storeExtensionDirectoryConfig();
        await TestUtil.storeWalletsConfig();

        VSCodeBlockchainOutputAdapter.instance().setConsole(true);

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
        VSCodeBlockchainOutputAdapter.instance().setConsole(false);
        await TestUtil.restoreGatewaysConfig();
        await TestUtil.restoreRuntimesConfig();
        await TestUtil.restoreExtensionDirectoryConfig();
        await TestUtil.restoreWalletsConfig();
    });

    describe('Ops View', () => {
        beforeEach(async function(): Promise<void> {
            this.timeout(600000);
            delete process.env.GOPATH;
            mySandBox = sinon.createSandbox();
            integrationTestUtil = new IntegrationTestUtil(mySandBox);

            showConfirmationWarningMessageStub = mySandBox.stub(UserInputUtil, 'showConfirmationWarningMessage');

            logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');

            // Ensure that the Fabric runtime is in the right state.
            runtime = runtimeManager.getRuntime();

            let isRunning: boolean = await runtime.isRunning();
            if (isRunning) {
                await vscode.commands.executeCommand(ExtensionCommands.STOP_FABRIC);
                isRunning = await runtime.isRunning();
            }

            isRunning.should.equal(false);
            const connectionItems: Array<BlockchainTreeItem> = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren();
            const localFabricItem: RuntimeTreeItem = connectionItems.find((value: BlockchainTreeItem) => value instanceof RuntimeTreeItem && value.label.startsWith('Local Fabric runtime is stopped. Click to start.')) as RuntimeTreeItem;
            if (runtime.isDevelopmentMode()) {
                await vscode.commands.executeCommand(ExtensionCommands.TOGGLE_FABRIC_DEV_MODE);
            }
            localFabricItem.should.not.be.null;
            logSpy.should.not.have.been.calledWith(LogType.ERROR);
        });

        afterEach(async () => {
            mySandBox.restore();
            delete process.env.GOPATH;
        });

        it('should show the unconnected view', async () => {
            const allChildren: Array<BlockchainTreeItem> = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren();

            allChildren.length.should.equal(1);
            allChildren[0].label.should.equal('Local Fabric runtime is stopped. Click to start.');
            logSpy.should.not.have.been.calledWith(LogType.ERROR);
        }).timeout(0);

        it('should connect to the ops view', async () => {
            // Start the Fabric runtime, and ensure that it is in the right state.
            await vscode.commands.executeCommand(ExtensionCommands.START_FABRIC);
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

            nodesChildren.length.should.equal(3);
            nodesChildren[0].label.should.equal('peer0.org1.example.com');
            nodesChildren[1].label.should.equal('ca.example.com');
            nodesChildren[2].label.should.equal('orderer.example.com');

            const orgsChildren: Array<OrgTreeItem> = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren(allChildren[3]) as Array<OrgTreeItem>;

            orgsChildren.length.should.equal(2);
            orgsChildren[0].label.should.equal('OrdererMSP');
            orgsChildren[1].label.should.equal('Org1MSP');
            logSpy.should.not.have.been.calledWith(LogType.ERROR);
        }).timeout(0);

        it('should allow you to start, connect to, open a terminal on and stop the local Fabric in non-development mode', async () => {

            // Start the Fabric runtime, and ensure that it is in the right state.
            await vscode.commands.executeCommand(ExtensionCommands.START_FABRIC);
            runtime.isRunning().should.eventually.be.true;
            runtime.isDevelopmentMode().should.be.false;

            // Ensure that the Fabric runtime is showing a single channel.
            const allChildren: Array<BlockchainTreeItem> = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren();
            const channelItems: ChannelTreeItem[] = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren(allChildren[1]) as Array<ChannelTreeItem>;

            channelItems.length.should.equal(1);
            channelItems[0].label.should.equal('mychannel');

            // Open a Fabric runtime terminal.
            await vscode.commands.executeCommand(ExtensionCommands.OPEN_FABRIC_RUNTIME_TERMINAL);
            const terminal: vscode.Terminal = vscode.window.terminals.find((item: vscode.Terminal) => item.name === `Fabric runtime - ${FabricRuntimeUtil.LOCAL_FABRIC}`);
            terminal.should.not.be.null;

            // Disconnect from the Fabric runtime.
            await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT);

            // Stop the Fabric runtime, and ensure that it is in the right state.
            await vscode.commands.executeCommand(ExtensionCommands.STOP_FABRIC);
            runtime.isRunning().should.eventually.be.false;
            runtime.isDevelopmentMode().should.be.false;

            const connectionItems: Array<BlockchainTreeItem> = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren();
            const localFabricItem: RuntimeTreeItem = connectionItems.find((value: BlockchainTreeItem) => value instanceof RuntimeTreeItem && value.label.startsWith('Local Fabric runtime is stopped. Click to start.')) as RuntimeTreeItem;
            localFabricItem.should.not.be.null;
            logSpy.should.not.have.been.calledWith(LogType.ERROR);
        }).timeout(0);

        it('should allow you to start, connect to, and stop the local Fabric in development mode', async () => {

            // Enable development mode for the Fabric runtime.
            await vscode.commands.executeCommand(ExtensionCommands.TOGGLE_FABRIC_DEV_MODE);

            // Start the Fabric runtime, and ensure that it is in the right state.
            await vscode.commands.executeCommand(ExtensionCommands.START_FABRIC);
            runtime.isRunning().should.eventually.be.true;
            runtime.isDevelopmentMode().should.be.true;

            // Ensure that the Fabric runtime is showing a single channel.
            const allChildren: Array<BlockchainTreeItem> = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren();
            const channelItems: ChannelTreeItem[] = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren(allChildren[1]) as Array<ChannelTreeItem>;

            channelItems.length.should.equal(1);
            channelItems[0].label.should.equal('mychannel');

            // Disconnect from the Fabric runtime.
            await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT);

            // Stop the Fabric runtime, disable development mode, and ensure that it is in the right state.
            await vscode.commands.executeCommand(ExtensionCommands.STOP_FABRIC);
            await vscode.commands.executeCommand(ExtensionCommands.TOGGLE_FABRIC_DEV_MODE);
            runtime.isRunning().should.eventually.be.false;
            runtime.isDevelopmentMode().should.be.false;

            const connectionItems: Array<BlockchainTreeItem> = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren();
            const localFabricItem: RuntimeTreeItem = connectionItems.find((value: BlockchainTreeItem) => value instanceof RuntimeTreeItem && value.label.startsWith('Local Fabric runtime is stopped. Click to start.')) as RuntimeTreeItem;
            localFabricItem.should.not.be.null;
            logSpy.should.not.have.been.calledWith(LogType.ERROR);
        }).timeout(0);

        it('should allow you to restart the local Fabric in non-development mode', async () => {

            // Start the Fabric runtime, and ensure that it is in the right state.
            await vscode.commands.executeCommand(ExtensionCommands.START_FABRIC);
            runtime.isRunning().should.eventually.be.true;
            runtime.isDevelopmentMode().should.be.false;

            // Ensure that the Fabric runtime is showing a single channel.
            let allChildren: Array<BlockchainTreeItem> = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren();
            let channelItems: ChannelTreeItem[] = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren(allChildren[1]) as Array<ChannelTreeItem>;

            channelItems.length.should.equal(1);
            channelItems[0].label.should.equal('mychannel');

            // Disconnect from the Fabric runtime.
            await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT);

            // Restart the Fabric runtime, and ensure that it is in the right state.
            await vscode.commands.executeCommand(ExtensionCommands.RESTART_FABRIC);
            runtime.isRunning().should.eventually.be.true;
            runtime.isDevelopmentMode().should.be.false;

            // Ensure that the Fabric runtime is showing a single channel.
            allChildren = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren();
            channelItems = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren(allChildren[1]) as Array<ChannelTreeItem>;

            channelItems.length.should.equal(1);
            channelItems[0].label.should.equal('mychannel');

            // Disconnect from the Fabric runtime.
            await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT);

            // Stop the Fabric runtime, and ensure that it is in the right state.
            await vscode.commands.executeCommand(ExtensionCommands.STOP_FABRIC);
            runtime.isRunning().should.eventually.be.false;
            runtime.isDevelopmentMode().should.be.false;

            const connectionItems: Array<BlockchainTreeItem> = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren();
            const localFabricItem: RuntimeTreeItem = connectionItems.find((value: BlockchainTreeItem) => value instanceof RuntimeTreeItem && value.label.startsWith('Local Fabric runtime is stopped. Click to start.')) as RuntimeTreeItem;
            localFabricItem.should.not.be.null;
            logSpy.should.not.have.been.calledWith(LogType.ERROR);
        }).timeout(0);

        it('should persist local Fabric data across restarts until the local Fabric is torn down', async () => {

            // Start the Fabric runtime, and ensure that it is in the right state.
            await vscode.commands.executeCommand(ExtensionCommands.START_FABRIC);
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
            await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT);

            // Restart the Fabric runtime, and ensure that it is in the right state.
            await vscode.commands.executeCommand(ExtensionCommands.RESTART_FABRIC);
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

            let instantiatedChaincodesItems: InstantiatedContractTreeItem[] = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren(smartContractsChildren[0]) as Array<InstantiatedContractTreeItem>;
            const teardownSmartContractItem: InstantiatedContractTreeItem = instantiatedChaincodesItems.find((instantiatedChaincodesItem: InstantiatedContractTreeItem) => instantiatedChaincodesItem.label === 'teardownSmartContract@0.0.1');
            teardownSmartContractItem.should.not.be.undefined;

            // Disconnect from the Fabric runtime.
            await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT);

            // Teardown the Fabric runtime, and ensure that it is in the right state.
            const warningStub: sinon.SinonStub = showConfirmationWarningMessageStub.resolves(true);
            await vscode.commands.executeCommand(ExtensionCommands.TEARDOWN_FABRIC);
            runtime.isRunning().should.eventually.be.false;
            runtime.isDevelopmentMode().should.be.false;
            warningStub.restore();

            // Start the Fabric runtime, and ensure that it is in the right state.
            await vscode.commands.executeCommand(ExtensionCommands.START_FABRIC);
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

            instantiatedChaincodesItems = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren(smartContractsChildren[0]) as Array<InstantiatedContractTreeItem>;
            // should just be the one to click to instantiate
            instantiatedChaincodesItems.length.should.equal(1);
            logSpy.should.not.have.been.calledWith(LogType.ERROR);
        }).timeout(0);

        it('should create, and connect with, a new identity from the local_fabric CA', async () => {
            // Start the Fabric runtime, and ensure that it is in the right state.
            await vscode.commands.executeCommand(ExtensionCommands.START_FABRIC);
            runtime.isRunning().should.eventually.be.true;
            runtime.isDevelopmentMode().should.be.false;

            // Create a new identity from the certificate authority
            const otherUserName: string = 'otherUser';
            await integrationTestUtil.createCAIdentity(otherUserName);

            // Connect using it
            integrationTestUtil.showIdentitiesQuickPickStub.withArgs('Choose an identity to connect with').resolves(otherUserName);
            await integrationTestUtil.connectToFabric(FabricRuntimeUtil.LOCAL_FABRIC, FabricWalletUtil.LOCAL_WALLET, otherUserName);

            // Confirm the connected view is correct
            const allConnectedTreeItems: Array<GatewayTreeItem> = await myExtension.getBlockchainGatewayExplorerProvider().getChildren() as Array<GatewayTreeItem>;
            allConnectedTreeItems.length.should.equal(3);
            allConnectedTreeItems[0].label.should.equal(`Connected via gateway: ${FabricRuntimeUtil.LOCAL_FABRIC}`);
            allConnectedTreeItems[1].label.should.equal(`Using ID: ${otherUserName}`);
            const channels: Array<ChannelTreeItem> = await myExtension.getBlockchainGatewayExplorerProvider().getChildren(allConnectedTreeItems[2]) as Array<ChannelTreeItem>;
            channels.length.should.equal(1);

            await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT);

            // Create another identity
            const anotherIdentityName: string = 'anotherOne';
            await integrationTestUtil.createCAIdentity(anotherIdentityName);

            const wallets: Array<WalletTreeItem> = await myExtension.getBlockchainWalletExplorerProvider().getChildren() as Array<WalletTreeItem>;
            wallets[0].label.should.equal(FabricWalletUtil.LOCAL_WALLET);

            const identitities: Array<BlockchainTreeItem> = await myExtension.getBlockchainWalletExplorerProvider().getChildren(wallets[0]);
            identitities.length.should.equal(3);
            identitities[0].label.should.equal('Admin@org1.example.com ⭑');
            identitities[1].label.should.equal(anotherIdentityName);
            identitities[2].label.should.equal(otherUserName);

            logSpy.should.not.have.been.calledWith(LogType.ERROR);

        }).timeout(0);

        ['Go', 'Java'].forEach((language: string) => {

            it(`should create a ${language} smart contract, package, install and instantiate it on a peer, and upgrade it`, async () => {
                const smartContractName: string = `my${language}SC`;

                await integrationTestUtil.createSmartContract(smartContractName, language);

                await integrationTestUtil.packageSmartContract();

                await integrationTestUtil.installSmartContract(smartContractName, '0.0.1');

                await integrationTestUtil.instantiateSmartContract(smartContractName, '0.0.1');

                let allChildren: Array<BlockchainTreeItem> = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren();
                let smartContractsChildren: Array<SmartContractsTreeItem> = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren(allChildren[0]) as Array<SmartContractsTreeItem>;

                smartContractsChildren.length.should.equal(2);
                smartContractsChildren[0].label.should.equal('Instantiated');
                smartContractsChildren[1].label.should.equal('Installed');

                const nodesChildren: Array<PeerTreeItem> = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren(allChildren[2]) as Array<PeerTreeItem>;
                nodesChildren.length.should.equal(3);
                nodesChildren[0].label.should.equal('peer0.org1.example.com');
                nodesChildren[1].label.should.equal('ca.example.com');
                nodesChildren[2].label.should.equal('orderer.example.com');

                let instantiatedChaincodesItems: Array<InstantiatedChaincodeTreeItem> = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren(smartContractsChildren[0]) as Array<InstantiatedChaincodeTreeItem>;

                let instantiatedSmartContract: BlockchainTreeItem = instantiatedChaincodesItems.find((_instantiatedSmartContract: BlockchainTreeItem) => {
                    return _instantiatedSmartContract.label === `${smartContractName}@0.0.1`;
                });

                instantiatedSmartContract.should.not.be.null;

                integrationTestUtil.showIdentitiesQuickPickStub.resolves(FabricRuntimeUtil.ADMIN_USER);
                await integrationTestUtil.connectToFabric(FabricRuntimeUtil.LOCAL_FABRIC, FabricWalletUtil.LOCAL_WALLET, 'Admin@org1.example.com');
                await integrationTestUtil.submitTransactionToChaincode(smartContractName, '0.0.1', 'transaction1', 'hello,world');
                await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT);

                let installedChaincodesItems: Array<InstalledTreeItem> = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren(smartContractsChildren[1]);

                let installedSmartContract: BlockchainTreeItem = installedChaincodesItems.find((_installedSmartContract: BlockchainTreeItem) => {
                    return _installedSmartContract.label === `${smartContractName}@0.0.1`;
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
                    return _installedSmartContract.label === `${smartContractName}@0.0.2`;
                });

                installedSmartContract.should.not.be.null;

                logSpy.should.not.have.been.calledWith(LogType.ERROR);

                // Try to add new identity to gateway using enrollment id and secret
                await integrationTestUtil.createFabricConnection();
                await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT);
                await integrationTestUtil.addIdentityToWallet('admin', 'adminpw', FabricWalletUtil.LOCAL_WALLET); // Unlimited enrollments
                const wallets: Array<LocalWalletTreeItem> = await myExtension.getBlockchainWalletExplorerProvider().getChildren() as Array<LocalWalletTreeItem>;
                const identities: Array<IdentityTreeItem> = await myExtension.getBlockchainWalletExplorerProvider().getChildren(wallets[0]) as Array<IdentityTreeItem>;
                identities[1].label.should.equal('anotherOne');
            }).timeout(0);
        });
    });

    describe('gateway view', () => {
        beforeEach(async function(): Promise<void> {
            this.timeout(600000);
            delete process.env.GOPATH;
            mySandBox = sinon.createSandbox();
            integrationTestUtil = new IntegrationTestUtil(mySandBox);

            showConfirmationWarningMessageStub = mySandBox.stub(UserInputUtil, 'showConfirmationWarningMessage');
            logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
        });

        afterEach(async () => {
            await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT);
            mySandBox.restore();
            delete process.env.GOPATH;
        });

        it('should create the unconnected tree', async () => {
            await integrationTestUtil.createFabricConnection();
            const allChildren: Array<GatewayTreeItem> = await myExtension.getBlockchainGatewayExplorerProvider().getChildren() as Array<GatewayTreeItem>;

            allChildren.length.should.equal(2);
            allChildren[0]['name'].should.equal(FabricRuntimeUtil.LOCAL_FABRIC);

            allChildren[1].label.should.equal('myGateway');

            // const localFabricChildren: Array<IdentityTreeItem> = await myExtension.getBlockchainGatewayExplorerProvider().getChildren(allChildren[0]) as Array<IdentityTreeItem>;

            // localFabricChildren.length.should.equal(3);
            // localFabricChildren[0].label.should.equal(FabricRuntimeUtil.ADMIN_USER);

            // const otherChildren: Array<IdentityTreeItem> = await myExtension.getBlockchainGatewayExplorerProvider().getChildren(allChildren[1]) as Array<IdentityTreeItem>;
            // otherChildren.length.should.equal(2);
            // otherChildren[0].label.should.equal('greenConga');
            // otherChildren[1].label.should.equal('redConga');
            // logSpy.should.not.have.been.calledWith(LogType.ERROR);
        });
    });
});
