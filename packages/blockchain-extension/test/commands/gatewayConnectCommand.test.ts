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
'use strict';
import * as vscode from 'vscode';
import * as path from 'path';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { FabricGatewayConnection } from 'ibm-blockchain-platform-gateway-v1';
import { FabricWallet } from 'ibm-blockchain-platform-wallet';
import { BlockchainTreeItem } from '../../extension/explorer/model/BlockchainTreeItem';
import { TestUtil } from '../TestUtil';
import { FabricConnectionFactory } from '../../extension/fabric/FabricConnectionFactory';
import { Reporter } from '../../extension/util/Reporter';
import { BlockchainGatewayExplorerProvider } from '../../extension/explorer/gatewayExplorer';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { FabricWalletGenerator } from 'ibm-blockchain-platform-wallet';
import { GatewayDissociatedTreeItem } from '../../extension/explorer/model/GatewayDissociatedTreeItem';
import { GatewayAssociatedTreeItem } from '../../extension/explorer/model/GatewayAssociatedTreeItem';
import { ExtensionCommands } from '../../ExtensionCommands';
import { UserInputUtil } from '../../extension/commands/UserInputUtil';
import { LocalGatewayTreeItem } from '../../extension/explorer/model/LocalGatewayTreeItem';
import { FabricRuntimeUtil, FabricWalletRegistry, FabricWalletRegistryEntry, LogType, FabricGatewayRegistry, FabricGatewayRegistryEntry, FabricEnvironmentRegistry, EnvironmentType } from 'ibm-blockchain-platform-common';
import { SettingConfigurations } from '../../configurations';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';
import { FabricGatewayHelper } from '../../extension/fabric/FabricGatewayHelper';
import { LocalEnvironment } from '../../extension/fabric/environments/LocalEnvironment';
import { EnvironmentFactory } from '../../extension/fabric/environments/EnvironmentFactory';
import { ManagedAnsibleEnvironment } from '../../extension/fabric/environments/ManagedAnsibleEnvironment';

chai.use(sinonChai);
// tslint:disable-next-line no-var-requires
chai.use(require('chai-as-promised'));

// tslint:disable no-unused-expression
describe('GatewayConnectCommand', () => {
    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();

    before(async () => {
        await TestUtil.setupTests(mySandBox);
    });

    describe('connect', () => {

        let rootPath: string;
        let mockConnection: sinon.SinonStubbedInstance<FabricGatewayConnection>;
        let mockRuntime: sinon.SinonStubbedInstance<LocalEnvironment>;

        let logSpy: sinon.SinonSpy;
        let connectionMultiple: FabricGatewayRegistryEntry;
        let connectionSingle: FabricGatewayRegistryEntry;
        let connectionAssociated: FabricGatewayRegistryEntry;
        let connectionMultipleWallet: FabricWalletRegistryEntry;
        let connectionSingleWallet: FabricWalletRegistryEntry;
        let connectionAssociatedWallet: FabricWalletRegistryEntry;
        let managedGateway: FabricGatewayRegistryEntry;
        let managedWallet: FabricWalletRegistryEntry;
        let emptyWallet: FabricWalletRegistryEntry;
        let choseIdentityQuickPick: sinon.SinonStub;
        let chosenGatewayQuickPick: sinon.SinonStub;
        let chosenWalletQuickPick: sinon.SinonStub;
        let identity: any;
        let walletGenerator: FabricWalletGenerator;
        let sendTelemetryEventStub: sinon.SinonStub;
        let getEnvironmentStub: sinon.SinonStub;
        const timeout: number = 120;

        beforeEach(async () => {

            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_CLIENT_TIMEOUT, timeout, vscode.ConfigurationTarget.Global);

            mockConnection = mySandBox.createStubInstance(FabricGatewayConnection);
            mockConnection.connect.resolves();
            mockConnection.isIBPConnection.returns(false);

            mySandBox.stub(FabricConnectionFactory, 'createFabricGatewayConnection').returns(mockConnection);

            rootPath = path.dirname(__dirname);

            connectionSingle = new FabricGatewayRegistryEntry({
                name: 'myGatewayA',
                associatedWallet: undefined
            });

            connectionMultiple = new FabricGatewayRegistryEntry({
                name: 'myGatewayB',
                associatedWallet: undefined
            });

            connectionAssociated = new FabricGatewayRegistryEntry({
                name: 'myGatewayC',
                associatedWallet: 'myGatewayCWallet'
            });

            await FabricGatewayRegistry.instance().clear();
            await FabricGatewayRegistry.instance().add(connectionSingle);
            await FabricGatewayRegistry.instance().add(connectionMultiple);
            await FabricGatewayRegistry.instance().add(connectionAssociated);

            await TestUtil.setupLocalFabric();

            mySandBox.stub(FabricGatewayHelper, 'getConnectionProfilePath').resolves(path.join('myPath'));

            connectionSingleWallet = new FabricWalletRegistryEntry({
                name: 'myGatewayAWallet',
                walletPath: path.join(rootPath, '../../test/data/walletDir/otherWallet')
            });

            connectionMultipleWallet = new FabricWalletRegistryEntry({
                name: 'myGatewayBWallet',
                walletPath: path.join(rootPath, '../../test/data/walletDir/wallet')
            });

            connectionAssociatedWallet = new FabricWalletRegistryEntry({
                name: 'myGatewayCWallet',
                walletPath: path.join(rootPath, '../../test/data/walletDir/wallet')
            });

            emptyWallet = new FabricWalletRegistryEntry({
                name: 'emptyWallet',
                walletPath: path.join(rootPath, '../../test/data/walletDir/emptyWallet')
            });

            await FabricWalletRegistry.instance().clear();
            await FabricWalletRegistry.instance().add(connectionSingleWallet);
            await FabricWalletRegistry.instance().add(connectionMultipleWallet);
            await FabricWalletRegistry.instance().add(connectionAssociatedWallet);
            await FabricWalletRegistry.instance().add(emptyWallet);

            mockRuntime = mySandBox.createStubInstance(LocalEnvironment);
            mockRuntime.getName.returns(FabricRuntimeUtil.LOCAL_FABRIC);
            mockRuntime.isBusy.returns(false);
            mockRuntime.isRunning.resolves(true);
            mockRuntime.start.resolves();
            mockRuntime.create.resolves();
            getEnvironmentStub = mySandBox.stub(EnvironmentFactory, 'getEnvironment').returns(mockRuntime);

            logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
            walletGenerator = FabricWalletGenerator.instance();

            identity = {
                label: FabricRuntimeUtil.ADMIN_USER,
                identifier: 'identifier',
                mspId: 'Org1MSP'
            };
            choseIdentityQuickPick = mySandBox.stub(UserInputUtil, 'showIdentitiesQuickPickBox').resolves(identity.label);

            chosenGatewayQuickPick = mySandBox.stub(UserInputUtil, 'showGatewayQuickPickBox').resolves({
                label: 'myGatewayA',
                data: connectionSingle
            });

            chosenWalletQuickPick = mySandBox.stub(UserInputUtil, 'showWalletsQuickPickBox').resolves({
                label: 'myGatewayAWallet',
                data: connectionSingleWallet
            });

            sendTelemetryEventStub = mySandBox.stub(Reporter.instance(), 'sendTelemetryEvent');

            await FabricEnvironmentRegistry.instance().add({name: 'managedEnvironment', environmentType: EnvironmentType.ANSIBLE_ENVIRONMENT, managedRuntime: true, environmentDirectory: '/some/path'});
        });

        afterEach(async () => {
            await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT_GATEWAY);
            mySandBox.restore();
            await FabricEnvironmentRegistry.instance().clear();
        });

        describe('no wallet associated and non-local fabric', () => {
            it('should test a fabric gateway can be connected to from the command', async () => {
                const connectStub: sinon.SinonStub = mySandBox.stub(ExtensionUtil.getBlockchainGatewayExplorerProvider(), 'connect');

                await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_GATEWAY);

                connectStub.should.have.been.calledOnce;
                choseIdentityQuickPick.should.not.have.been.called;
                mockConnection.connect.should.have.been.calledOnceWithExactly(sinon.match.instanceOf(FabricWallet), identity.label, timeout);
                sendTelemetryEventStub.should.have.been.calledOnceWithExactly('connectCommand', { runtimeData: 'user runtime', connectIBM: sinon.match.string });
            });

            it('should test that a fabric gateway with multiple identities can be connected to from the quick pick', async () => {
                const gatewayB: FabricGatewayRegistryEntry = await FabricGatewayRegistry.instance().get('myGatewayB');
                chosenGatewayQuickPick.resolves({
                    label: 'myGatewayB',
                    data: gatewayB
                });

                const walletB: FabricWalletRegistryEntry = await FabricWalletRegistry.instance().get('myGatewayBWallet');
                chosenWalletQuickPick.resolves({
                    label: 'myGatewayBWallet',
                    data: walletB
                });

                const connectStub: sinon.SinonStub = mySandBox.stub(ExtensionUtil.getBlockchainGatewayExplorerProvider(), 'connect');

                await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_GATEWAY);

                connectStub.should.have.been.calledOnce;
                choseIdentityQuickPick.should.have.been.calledOnce;
                mockConnection.connect.should.have.been.calledOnceWithExactly(sinon.match.instanceOf(FabricWallet), identity.label, timeout);
                sendTelemetryEventStub.should.have.been.calledOnceWithExactly('connectCommand', { runtimeData: 'user runtime', connectIBM: sinon.match.string });
            });

            it('should do nothing if the user cancels choosing a gateway', async () => {
                const refreshSpy: sinon.SinonSpy = mySandBox.spy(vscode.commands, 'executeCommand');

                chosenGatewayQuickPick.resolves();

                await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_GATEWAY);

                refreshSpy.callCount.should.equal(1);
                refreshSpy.getCall(0).should.have.been.calledWith(ExtensionCommands.CONNECT_TO_GATEWAY);
                chosenWalletQuickPick.should.not.have.been.called;
                mockConnection.connect.should.not.have.been.called;
            });

            it('should display an error if there are no wallets to connect with', async () => {
                const refreshSpy: sinon.SinonSpy = mySandBox.spy(vscode.commands, 'executeCommand');

                await FabricWalletRegistry.instance().clear();

                await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_GATEWAY);

                refreshSpy.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_GATEWAY);
                chosenWalletQuickPick.should.not.have.been.called;
                mockConnection.connect.should.not.have.been.called;
                logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `You must first add a wallet with identities to connect to this gateway`);
            });

            it('should do nothing if the user cancels choosing a wallet to connect with', async () => {
                const refreshSpy: sinon.SinonSpy = mySandBox.spy(vscode.commands, 'executeCommand');

                chosenWalletQuickPick.resolves();

                await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_GATEWAY);

                refreshSpy.callCount.should.equal(1);
                refreshSpy.getCall(0).should.have.been.calledWith(ExtensionCommands.CONNECT_TO_GATEWAY);
                choseIdentityQuickPick.should.not.have.been.called;
                mockConnection.connect.should.not.have.been.called;
            });

            it('should do nothing if the user cancels choosing the identity to connect with', async () => {
                const gatewayB: FabricGatewayRegistryEntry = await FabricGatewayRegistry.instance().get('myGatewayB');
                chosenGatewayQuickPick.resolves({
                    label: 'myGatewayB',
                    data: gatewayB
                });

                const walletB: FabricWalletRegistryEntry = await FabricWalletRegistry.instance().get('myGatewayBWallet');
                chosenWalletQuickPick.resolves({
                    label: 'myGatewayBWallet',
                    data: walletB
                });
                choseIdentityQuickPick.resolves();

                await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_GATEWAY);
                mockConnection.connect.should.not.have.been.called;
            });

            it('should test that a fabric gateway with a single identity can be connected to from the tree', async () => {
                const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = ExtensionUtil.getBlockchainGatewayExplorerProvider();
                const allChildren: Array<BlockchainTreeItem> = await blockchainGatewayExplorerProvider.getChildren();

                const myConnectionItem: GatewayDissociatedTreeItem = allChildren[1] as GatewayDissociatedTreeItem;

                const connectStub: sinon.SinonStub = mySandBox.stub(ExtensionUtil.getBlockchainGatewayExplorerProvider(), 'connect');

                await vscode.commands.executeCommand(myConnectionItem.command.command, ...myConnectionItem.command.arguments);

                connectStub.should.have.been.calledOnce;
                choseIdentityQuickPick.should.not.have.been.called;
                mockConnection.connect.should.have.been.calledOnceWithExactly(sinon.match.instanceOf(FabricWallet), identity.label, timeout);
                sendTelemetryEventStub.should.have.been.calledOnceWithExactly('connectCommand', { runtimeData: 'user runtime', connectIBM: sinon.match.string });
            });

            it('should test that a fabric gateway with multiple identities can be connected to from the tree', async () => {
                const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = ExtensionUtil.getBlockchainGatewayExplorerProvider();
                const allChildren: Array<BlockchainTreeItem> = await blockchainGatewayExplorerProvider.getChildren();
                chosenWalletQuickPick.resolves({ label: connectionMultipleWallet.name, data: connectionMultipleWallet });
                choseIdentityQuickPick.resolves(FabricRuntimeUtil.ADMIN_USER);

                const myConnectionItem: GatewayDissociatedTreeItem = allChildren[2] as GatewayDissociatedTreeItem;

                const connectStub: sinon.SinonStub = mySandBox.stub(ExtensionUtil.getBlockchainGatewayExplorerProvider(), 'connect');

                await vscode.commands.executeCommand(myConnectionItem.command.command, ...myConnectionItem.command.arguments);

                connectStub.should.have.been.calledOnce;
                choseIdentityQuickPick.should.have.been.called;
                mockConnection.connect.should.have.been.calledOnceWithExactly(sinon.match.instanceOf(FabricWallet), FabricRuntimeUtil.ADMIN_USER, timeout);
                sendTelemetryEventStub.should.have.been.calledOnceWithExactly('connectCommand', { runtimeData: 'user runtime', connectIBM: sinon.match.string });
            });

            it('should handle no identities found in wallet', async () => {

                // Populate the quick pick box with the updated wallet registry entry
                const wallet: FabricWalletRegistryEntry = await FabricWalletRegistry.instance().get(emptyWallet.name);
                chosenWalletQuickPick.resolves({
                    label: emptyWallet.name,
                    data: wallet
                });

                await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_GATEWAY);

                mockConnection.connect.should.not.have.been.called;
                logSpy.should.have.been.calledWith(LogType.ERROR, 'No identities found in wallet: ' + emptyWallet.name);
            });

            it('should handle error from connecting', async () => {
                const error: Error = new Error('some error');

                mockConnection.connect.rejects(error);

                await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_GATEWAY);

                mockRuntime.isRunning.should.not.have.been.called;
                logSpy.should.have.been.calledTwice;
                logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, `connect`);
                logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `${error.message}`, `${error.toString()}`);
                sendTelemetryEventStub.should.not.have.been.called;
            });
        });

        describe('wallet associated and local fabric', () => {
            let connectStub: sinon.SinonStub;
            let testFabricWallet: FabricWallet;
            let connection: FabricGatewayRegistryEntry;

            beforeEach(async () => {
                connection = await FabricGatewayRegistry.instance().get(`${FabricRuntimeUtil.LOCAL_FABRIC} - Org1`);

                const walletRegistryEntry: FabricWalletRegistryEntry = await FabricWalletRegistry.instance().get('Org1', FabricRuntimeUtil.LOCAL_FABRIC);

                testFabricWallet = new FabricWallet(walletRegistryEntry.walletPath);

                chosenGatewayQuickPick.resolves({
                    label: `${FabricRuntimeUtil.LOCAL_FABRIC} - Org1`,
                    data: connection
                });

                chosenWalletQuickPick.resolves({
                    label: `${FabricRuntimeUtil.LOCAL_FABRIC} - Org1 Wallet`,
                    data: walletRegistryEntry
                });

                connectStub = mySandBox.stub(ExtensionUtil.getBlockchainGatewayExplorerProvider(), 'connect');
            });

            it('should connect to a managed runtime using a quick pick', async () => {
                mySandBox.stub(testFabricWallet, 'getIdentityNames').resolves(identity.label);
                await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_GATEWAY);

                connectStub.should.have.been.calledOnce;
                choseIdentityQuickPick.should.have.been.calledOnceWithExactly;
                mockConnection.connect.should.have.been.calledOnceWithExactly(testFabricWallet, identity.label, timeout);
                sendTelemetryEventStub.should.have.been.calledOnceWithExactly('connectCommand', { runtimeData: 'managed runtime', connectIBM: sinon.match.string });
            });

            it('should connect to a managed runtime with multiple identities, using a quick pick', async () => {
                choseIdentityQuickPick.resolves(identity.label);

                await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_GATEWAY);

                connectStub.should.have.been.calledOnce;
                choseIdentityQuickPick.should.have.been.called;
                mockConnection.connect.should.have.been.calledWith(testFabricWallet, identity.label, timeout);
                sendTelemetryEventStub.should.have.been.calledOnceWithExactly('connectCommand', { runtimeData: 'managed runtime', connectIBM: sinon.match.string });
            });

            it('should connect to a managed runtime from the tree', async () => {

                const blockchainNetworkExplorerProvider: BlockchainGatewayExplorerProvider = ExtensionUtil.getBlockchainGatewayExplorerProvider();
                const allChildren: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren();
                const myConnectionItem: LocalGatewayTreeItem = allChildren[0] as LocalGatewayTreeItem;

                await vscode.commands.executeCommand(myConnectionItem.command.command, ...myConnectionItem.command.arguments);

                connectStub.should.have.been.calledOnce;
                mockConnection.connect.should.have.been.calledWith(testFabricWallet, identity.label, timeout);
                sendTelemetryEventStub.should.have.been.calledOnceWithExactly('connectCommand', { runtimeData: 'managed runtime', connectIBM: sinon.match.string });
                logSpy.should.have.been.calledWith(LogType.SUCCESS, `Connecting to ${FabricRuntimeUtil.LOCAL_FABRIC} - Org1`);
            });

            it('should connect to a managed ansible', async () => {
                managedGateway = new FabricGatewayRegistryEntry({
                    name: 'myGatewayD',
                    associatedWallet: 'myGatewayDWallet',
                    fromEnvironment: 'managedEnvironment',
                    displayName: 'managedEnvironment - Org1'
                });

                await FabricGatewayRegistry.instance().add(managedGateway);

                managedWallet = new FabricWalletRegistryEntry({
                    name: 'myGatewayDWallet',
                    walletPath: path.join(rootPath, '../../test/data/walletDir/wallet'),
                    fromEnvironment: 'managedEnvironment',
                    managedWallet: true
                });

                await FabricWalletRegistry.instance().add(managedWallet);

                const managedAnsible: ManagedAnsibleEnvironment = new ManagedAnsibleEnvironment('managedEnvironment', '/some/path');
                mySandBox.stub(managedAnsible, 'isRunning').resolves(true);
                getEnvironmentStub.returns(managedAnsible);

                testFabricWallet = new FabricWallet(managedWallet.walletPath);

                const blockchainNetworkExplorerProvider: BlockchainGatewayExplorerProvider = ExtensionUtil.getBlockchainGatewayExplorerProvider();
                const allChildren: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren();
                const myConnectionItem: LocalGatewayTreeItem = allChildren[1] as LocalGatewayTreeItem;

                await vscode.commands.executeCommand(myConnectionItem.command.command, ...myConnectionItem.command.arguments);

                connectStub.should.have.been.calledOnce;
                mockConnection.connect.should.have.been.calledWith(testFabricWallet, identity.label, timeout);
                sendTelemetryEventStub.should.have.been.calledOnceWithExactly('connectCommand', { runtimeData: 'managed ansible runtime', connectIBM: sinon.match.string });
                logSpy.should.have.been.calledWith(LogType.SUCCESS, `Connecting to managedEnvironment - Org1`);
            });

            it('should handle the user cancelling an identity to choose from when connecting to a fabric runtime', async () => {
                choseIdentityQuickPick.resolves();

                await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_GATEWAY);

                choseIdentityQuickPick.should.have.been.called;
                mockConnection.connect.should.not.have.been.called;
            });

            it(`should show error if ${FabricRuntimeUtil.LOCAL_FABRIC} is not started`, async () => {
                mockRuntime.isRunning.resolves(false);
                await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_GATEWAY);

                logSpy.should.have.been.calledWith(LogType.ERROR, `${FabricRuntimeUtil.LOCAL_FABRIC} has not been started, please start it before connecting.`);
            });

        });

        describe('wallet associated and non-local fabric', () => {
            let connectStub: sinon.SinonStub;
            let testFabricWallet: FabricWallet;
            let getIdentitiesStub: sinon.SinonStub;

            beforeEach(async () => {

                const gateway: FabricGatewayRegistryEntry = await FabricGatewayRegistry.instance().get('myGatewayC');
                chosenGatewayQuickPick.resolves({
                    label: 'myGatewayC',
                    data: gateway
                });

                const wallet: FabricWalletRegistryEntry = await FabricWalletRegistry.instance().get('myGatewayCWallet');
                chosenWalletQuickPick.resolves({
                    label: 'myGatewayCWallet',
                    data: wallet
                });

                testFabricWallet = new FabricWallet('some/new/wallet/path');
                const getWalletStub: sinon.SinonStub = mySandBox.stub(walletGenerator, 'getWallet');
                getWalletStub.callThrough();
                getWalletStub.withArgs(wallet).returns(testFabricWallet);

                getIdentitiesStub = mySandBox.stub(testFabricWallet, 'getIdentityNames').resolves([identity.label]);

                connectStub = mySandBox.stub(ExtensionUtil.getBlockchainGatewayExplorerProvider(), 'connect');
            });

            it('should connect to a non-local fabric using a quick pick', async () => {
                await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_GATEWAY);

                connectStub.should.have.been.calledOnce;
                choseIdentityQuickPick.should.have.been.calledOnceWithExactly;
                mockConnection.connect.should.have.been.calledOnceWithExactly(sinon.match.instanceOf(FabricWallet), identity.label, timeout);
                sendTelemetryEventStub.should.have.been.calledOnceWithExactly('connectCommand', { runtimeData: 'user runtime', connectIBM: sinon.match.string });
                logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Connecting to myGatewayC');
            });

            it('should connect to a non-local fabric with multiple identities, using a quick pick', async () => {
                const testIdentityName: string = 'tester2';
                getIdentitiesStub.resolves([identity.label, 'tester', testIdentityName]);

                choseIdentityQuickPick.resolves(testIdentityName);

                await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_GATEWAY);

                connectStub.should.have.been.calledOnce;
                choseIdentityQuickPick.should.have.been.called;
                mockConnection.connect.should.have.been.calledWith(testFabricWallet, testIdentityName, timeout);
                sendTelemetryEventStub.should.have.been.calledOnceWithExactly('connectCommand', { runtimeData: 'user runtime', connectIBM: sinon.match.string });
            });

            it('should connect to a non-local runtime from the tree', async () => {
                getIdentitiesStub.resolves([identity.label]);
                const blockchainNetworkExplorerProvider: BlockchainGatewayExplorerProvider = ExtensionUtil.getBlockchainGatewayExplorerProvider();
                const allChildren: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren();
                const myConnectionItem: GatewayAssociatedTreeItem = allChildren[2] as GatewayAssociatedTreeItem;

                await vscode.commands.executeCommand(myConnectionItem.command.command, ...myConnectionItem.command.arguments);

                connectStub.should.have.been.calledOnce;
                choseIdentityQuickPick.should.not.have.been.called;
                mockConnection.connect.should.have.been.calledWith(testFabricWallet, identity.label, timeout);
                sendTelemetryEventStub.should.have.been.calledOnceWithExactly('connectCommand', { runtimeData: 'user runtime', connectIBM: sinon.match.string });
            });

            it('should handle the user cancelling an identity to choose from when connecting to a fabric runtime', async () => {
                getIdentitiesStub.resolves([identity.label, 'otherOne', 'anotherOne']);
                choseIdentityQuickPick.resolves();

                await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_GATEWAY);

                choseIdentityQuickPick.should.have.been.called;
                mockConnection.connect.should.not.have.been.called;
            });

        });

        it('should send a connectCommand telemetry event if connecting to IBP', async () => {
            mockConnection.isIBPConnection.returns(true);
            mySandBox.stub(ExtensionUtil.getBlockchainGatewayExplorerProvider(), 'connect');

            await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_GATEWAY);

            sendTelemetryEventStub.should.have.been.calledWith('connectCommand', { runtimeData: 'IBP instance', connectIBM: sinon.match.string });
        });
    });
});
