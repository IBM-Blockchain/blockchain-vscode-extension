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
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { FabricGatewayConnection } from 'ibm-blockchain-platform-gateway-v1';
import { BlockchainTreeItem } from '../../extension/explorer/model/BlockchainTreeItem';
import { BlockchainGatewayExplorerProvider } from '../../extension/explorer/gatewayExplorer';
import { ChannelTreeItem } from '../../extension/explorer/model/ChannelTreeItem';
import { FabricGatewayConnectionManager } from '../../extension/fabric/FabricGatewayConnectionManager';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';
import { TestUtil } from '../TestUtil';
import { LocalEnvironmentManager } from '../../extension/fabric/environments/LocalEnvironmentManager';
import { TransactionTreeItem } from '../../extension/explorer/model/TransactionTreeItem';
import { InstantiatedContractTreeItem } from '../../extension/explorer/model/InstantiatedContractTreeItem';
import { ConnectedTreeItem } from '../../extension/explorer/model/ConnectedTreeItem';
import { ContractTreeItem } from '../../extension/explorer/model/ContractTreeItem';
import { LocalGatewayTreeItem } from '../../extension/explorer/model/LocalGatewayTreeItem';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { ExtensionCommands } from '../../ExtensionCommands';
import { InstantiatedChaincodeTreeItem } from '../../extension/explorer/model/InstantiatedChaincodeTreeItem';
import { GatewayTreeItem } from '../../extension/explorer/model/GatewayTreeItem';
import { GatewayDissociatedTreeItem } from '../../extension/explorer/model/GatewayDissociatedTreeItem';
import { GatewayAssociatedTreeItem } from '../../extension/explorer/model/GatewayAssociatedTreeItem';
import { FabricRuntimeUtil, LogType, FabricGatewayRegistryEntry, FabricGatewayRegistry, FabricEnvironmentRegistry, FabricWalletRegistry, FabricEnvironmentRegistryEntry, EnvironmentType } from 'ibm-blockchain-platform-common';
import { InstantiatedUnknownTreeItem } from '../../extension/explorer/model/InstantiatedUnknownTreeItem';
import { GatewayGroupTreeItem } from '../../extension/explorer/model/GatewayGroupTreeItem';

chai.use(sinonChai);
const should: Chai.Should = chai.should();

// tslint:disable no-unused-expression
describe('gatewayExplorer', () => {

    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();
    let logSpy: sinon.SinonSpy;

    before(async () => {
        await TestUtil.setupTests(mySandBox);
    });

    beforeEach(async () => {
        logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
    });

    afterEach(() => {
        mySandBox.restore();
    });

    describe('constructor', () => {

        it('should register for connected events from the connection manager', async () => {
            const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = ExtensionUtil.getBlockchainGatewayExplorerProvider();
            mySandBox.stub(blockchainGatewayExplorerProvider, 'connect').resolves();
            mySandBox.stub(blockchainGatewayExplorerProvider, 'disconnect').resolves();
            const mockConnection: sinon.SinonStubbedInstance<FabricGatewayConnection> = mySandBox.createStubInstance(FabricGatewayConnection);
            const connectionManager: FabricGatewayConnectionManager = FabricGatewayConnectionManager.instance();
            connectionManager.emit('connected', mockConnection);
            blockchainGatewayExplorerProvider.connect.should.have.been.calledOnce;
        });

        it('should display errors from connected events', async () => {
            const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = ExtensionUtil.getBlockchainGatewayExplorerProvider();
            mySandBox.stub(blockchainGatewayExplorerProvider, 'connect').rejects(new Error('wow such error'));
            mySandBox.stub(blockchainGatewayExplorerProvider, 'disconnect').resolves();
            const mockConnection: sinon.SinonStubbedInstance<FabricGatewayConnection> = mySandBox.createStubInstance(FabricGatewayConnection);
            const connectionManager: FabricGatewayConnectionManager = FabricGatewayConnectionManager.instance();
            connectionManager.emit('connected', mockConnection);
            // Need to ensure the event handler gets a chance to run.
            await new Promise((resolve: any): any => setTimeout(resolve, 50));
            blockchainGatewayExplorerProvider.connect.should.have.been.calledOnce;
            logSpy.should.have.been.calledOnceWithExactly(LogType.ERROR, 'Error handling connected event: wow such error', 'Error handling connected event: Error: wow such error');
        });

        it('should register for disconnected events from the connection manager', async () => {
            const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = ExtensionUtil.getBlockchainGatewayExplorerProvider();
            mySandBox.stub(blockchainGatewayExplorerProvider, 'connect').resolves();
            mySandBox.stub(blockchainGatewayExplorerProvider, 'disconnect').resolves();
            const connectionManager: FabricGatewayConnectionManager = FabricGatewayConnectionManager.instance();
            connectionManager.emit('disconnected');
            blockchainGatewayExplorerProvider.disconnect.should.have.been.calledOnceWithExactly();
        });

        it('should display errors from disconnected events', async () => {
            const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = ExtensionUtil.getBlockchainGatewayExplorerProvider();
            mySandBox.stub(blockchainGatewayExplorerProvider, 'connect').resolves();
            mySandBox.stub(blockchainGatewayExplorerProvider, 'disconnect').rejects(new Error('wow such error'));
            const connectionManager: FabricGatewayConnectionManager = FabricGatewayConnectionManager.instance();
            connectionManager.emit('disconnected');
            // Need to ensure the event handler gets a chance to run.
            await new Promise((resolve: any): any => setTimeout(resolve, 50));
            blockchainGatewayExplorerProvider.disconnect.should.have.been.calledOnceWithExactly();
            logSpy.should.have.been.calledOnceWithExactly(LogType.ERROR, 'Error handling disconnected event: wow such error', 'Error handling disconnected event: Error: wow such error');
        });
    });

    describe('getChildren', () => {
        describe('unconnected tree', () => {

            let getConnectionStub: sinon.SinonStub;

            beforeEach(async () => {
                await TestUtil.setupLocalFabric();
                getConnectionStub = mySandBox.stub(FabricGatewayConnectionManager.instance(), 'getConnection');
            });

            it('should display gateway that has been added in alphabetical order', async () => {
                const gatewayB: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry({
                    name: 'myGatewayB',
                    associatedWallet: ''
                });

                const gatewayC: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry({
                    name: 'myGatewayC',
                    associatedWallet: 'some_wallet'
                });

                const gatewayA: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry({
                    name: 'myGatewayA',
                    associatedWallet: 'some_other_wallet'
                });

                await FabricGatewayRegistry.instance().clear();
                await TestUtil.setupLocalFabric();
                await FabricGatewayRegistry.instance().add(gatewayB);
                await FabricGatewayRegistry.instance().add(gatewayC);
                await FabricGatewayRegistry.instance().add(gatewayA);

                const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = ExtensionUtil.getBlockchainGatewayExplorerProvider();

                const allChildren: BlockchainTreeItem[] = await blockchainGatewayExplorerProvider.getChildren();
                allChildren.length.should.equal(2);

                const groupOne: BlockchainTreeItem[] = await blockchainGatewayExplorerProvider.getChildren(allChildren[0]);
                (groupOne[0] as LocalGatewayTreeItem).name.should.equal('Org1');
                groupOne[0].tooltip.should.include(`ⓘ Associated wallet:\n${FabricRuntimeUtil.LOCAL_FABRIC} - Org1 Wallet`);
                groupOne[0].should.be.an.instanceOf(LocalGatewayTreeItem);

                const groupTwo: BlockchainTreeItem[] = await blockchainGatewayExplorerProvider.getChildren(allChildren[1]);
                groupTwo[0].label.should.equal('myGatewayA ⧉');
                groupTwo[0].tooltip.should.equal('ⓘ Associated wallet:\n    some_other_wallet');
                groupTwo[0].should.be.an.instanceOf(GatewayAssociatedTreeItem);
                groupTwo[1].label.should.equal('myGatewayB');
                groupTwo[1].tooltip.should.equal('No associated wallet');
                groupTwo[1].should.be.an.instanceOf(GatewayDissociatedTreeItem);
                groupTwo[2].label.should.equal('myGatewayC ⧉');
                groupTwo[2].tooltip.should.equal('ⓘ Associated wallet:\n    some_wallet');
                groupTwo[2].should.be.an.instanceOf(GatewayAssociatedTreeItem);
            });

            it('should say that there are no gateways', async () => {
                await FabricEnvironmentRegistry.instance().clear();
                await FabricGatewayRegistry.instance().clear();
                const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = ExtensionUtil.getBlockchainGatewayExplorerProvider();
                const gateways: BlockchainTreeItem[] = await blockchainGatewayExplorerProvider.getChildren();
                gateways.length.should.equal(1);
                gateways[0].label.should.equal(`No gateways found`);
            });

            it('should handle error with tree', async () => {

                const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = ExtensionUtil.getBlockchainGatewayExplorerProvider();

                // @ts-ignore
                mySandBox.stub(blockchainGatewayExplorerProvider, 'createConnectionTree').rejects({ message: 'some error' });

                await blockchainGatewayExplorerProvider.getChildren();

                logSpy.should.have.been.calledWith(LogType.ERROR, 'some error');
            });

            it('should display the managed runtime', async () => {
                await FabricGatewayRegistry.instance().clear();

                mySandBox.stub(LocalEnvironmentManager.instance().getRuntime(FabricRuntimeUtil.LOCAL_FABRIC), 'isRunning').resolves(true);
                const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = ExtensionUtil.getBlockchainGatewayExplorerProvider();
                const allChildren: BlockchainTreeItem[] = await blockchainGatewayExplorerProvider.getChildren();
                const groupChildren: BlockchainTreeItem[] = await blockchainGatewayExplorerProvider.getChildren(allChildren[0]);

                const gateway: FabricGatewayRegistryEntry = await FabricGatewayRegistry.instance().get(`${FabricRuntimeUtil.LOCAL_FABRIC} - Org1`);
                const myCommand: vscode.Command = {
                    command: ExtensionCommands.CONNECT_TO_GATEWAY,
                    title: '',
                    arguments: [gateway]
                };

                allChildren.length.should.equal(1);
                groupChildren.length.should.equal(1);
                groupChildren[0].should.be.an.instanceOf(LocalGatewayTreeItem);
                const localGatewayTreeItem: LocalGatewayTreeItem = groupChildren[0] as LocalGatewayTreeItem;
                localGatewayTreeItem.label.should.equal('Org1  ●');
                localGatewayTreeItem.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                localGatewayTreeItem.gateway.should.deep.equal(gateway);
                localGatewayTreeItem.command.should.deep.equal(myCommand);
                localGatewayTreeItem.tooltip.should.deep.equal(`Org1 is running
ⓘ Associated wallet:
${FabricRuntimeUtil.LOCAL_FABRIC} - Org1 Wallet`);
            });

            it('should display multi-org gateways', async () => {
                await FabricGatewayRegistry.instance().clear();
                await FabricEnvironmentRegistry.instance().clear();
                await FabricWalletRegistry.instance().clear();

                const twoOrgEntry: FabricEnvironmentRegistryEntry = {name: 'twoOrgEnvironment', managedRuntime: true, environmentType: EnvironmentType.LOCAL_ENVIRONMENT, numberOfOrgs: 2, environmentDirectory: ''};
                await FabricEnvironmentRegistry.instance().add(twoOrgEntry);

                const gatewayOne: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry({ name: 'twoOrgEnvironment - Org1', fromEnvironment: 'twoOrgEnvironment', associatedWallet: 'Org1', displayName: `Org1` });
                const gatewayTwo: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry({ name: 'twoOrgEnvironment - Org2', fromEnvironment: 'twoOrgEnvironment', associatedWallet: 'Org2', displayName: `Org2` });

                await FabricGatewayRegistry.instance().add(gatewayOne);
                await FabricGatewayRegistry.instance().add(gatewayTwo);

                const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = ExtensionUtil.getBlockchainGatewayExplorerProvider();
                const allChildren: BlockchainTreeItem[] = await blockchainGatewayExplorerProvider.getChildren();

                const myCommandOne: vscode.Command = {
                    command: ExtensionCommands.CONNECT_TO_GATEWAY,
                    title: '',
                    arguments: [gatewayOne]
                };

                const myCommandTwo: vscode.Command = {
                    command: ExtensionCommands.CONNECT_TO_GATEWAY,
                    title: '',
                    arguments: [gatewayTwo]
                };

                allChildren.length.should.equal(1);
                allChildren[0].should.be.an.instanceOf(GatewayGroupTreeItem);
                const groupOne: GatewayGroupTreeItem = allChildren[0] as GatewayGroupTreeItem;
                groupOne.label.should.equal('twoOrgEnvironment');
                groupOne.gateways.should.deep.equal([gatewayOne, gatewayTwo]);

                const groupGateways: LocalGatewayTreeItem[] = await blockchainGatewayExplorerProvider.getChildren(groupOne) as LocalGatewayTreeItem[];

                groupGateways[0].label.should.equal(`Org1  ○`);
                groupGateways[0].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                groupGateways[0].gateway.should.deep.equal(gatewayOne);
                groupGateways[0].command.should.deep.equal(myCommandOne);
                groupGateways[0].tooltip.should.deep.equal(`Org1 is not running\nⓘ Associated wallet:\ntwoOrgEnvironment - Org1 Wallet`);

                groupGateways[1].label.should.equal(`Org2  ○`);
                groupGateways[1].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                groupGateways[1].gateway.should.deep.equal(gatewayTwo);
                groupGateways[1].command.should.deep.equal(myCommandTwo);
                groupGateways[1].tooltip.should.deep.equal(`Org2 is not running\nⓘ Associated wallet:\ntwoOrgEnvironment - Org2 Wallet`);
            });

            it('should display ops tools gateway', async () => {
                await FabricGatewayRegistry.instance().clear();
                await FabricEnvironmentRegistry.instance().clear();
                await FabricWalletRegistry.instance().clear();

                const opsToolsEnv: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
                opsToolsEnv.name = 'opsToolsEnv';
                opsToolsEnv.environmentType = EnvironmentType.OPS_TOOLS_ENVIRONMENT;

                await FabricEnvironmentRegistry.instance().add(opsToolsEnv);

                const opsToolsGateway: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry({ name: 'someGateway', environmentGroup: 'opsToolsEnv', associatedWallet: 'Org1 Wallet', displayName: `Org1` });

                await FabricGatewayRegistry.instance().add(opsToolsGateway);

                const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = ExtensionUtil.getBlockchainGatewayExplorerProvider();
                const allChildren: BlockchainTreeItem[] = await blockchainGatewayExplorerProvider.getChildren();

                const myCommand: vscode.Command = {
                    command: ExtensionCommands.CONNECT_TO_GATEWAY,
                    title: '',
                    arguments: [opsToolsGateway]
                };

                allChildren.length.should.equal(1);
                allChildren[0].should.be.an.instanceOf(GatewayGroupTreeItem);
                const group: GatewayGroupTreeItem = allChildren[0] as GatewayGroupTreeItem;
                group.label.should.equal(opsToolsEnv.name);
                group.gateways.should.deep.equal([opsToolsGateway]);

                const groupGateways: LocalGatewayTreeItem[] = await blockchainGatewayExplorerProvider.getChildren(group) as LocalGatewayTreeItem[];

                groupGateways[0].label.should.equal(`Org1 ⧉`);
                groupGateways[0].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                groupGateways[0].gateway.should.deep.equal(opsToolsGateway);
                groupGateways[0].command.should.deep.equal(myCommand);
                groupGateways[0].tooltip.should.deep.equal(`ⓘ Associated wallet:\n    Org1 Wallet`);
            });

            it('should display saas ops tools gateway', async () => {
                await FabricGatewayRegistry.instance().clear();
                await FabricEnvironmentRegistry.instance().clear();
                await FabricWalletRegistry.instance().clear();

                const saasEnv: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
                saasEnv.name = 'saasEnv';
                saasEnv.environmentType = EnvironmentType.SAAS_OPS_TOOLS_ENVIRONMENT;

                await FabricEnvironmentRegistry.instance().add(saasEnv);

                const saasGateway: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry({ name: 'someGateway', environmentGroup: 'saasEnv', associatedWallet: 'Org1 Wallet', displayName: `Org1` });

                await FabricGatewayRegistry.instance().add(saasGateway);

                const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = ExtensionUtil.getBlockchainGatewayExplorerProvider();
                const allChildren: BlockchainTreeItem[] = await blockchainGatewayExplorerProvider.getChildren();

                const myCommand: vscode.Command = {
                    command: ExtensionCommands.CONNECT_TO_GATEWAY,
                    title: '',
                    arguments: [saasGateway]
                };

                allChildren.length.should.equal(1);
                allChildren[0].should.be.an.instanceOf(GatewayGroupTreeItem);
                const group: GatewayGroupTreeItem = allChildren[0] as GatewayGroupTreeItem;
                group.label.should.equal(saasEnv.name);
                group.gateways.should.deep.equal([saasGateway]);

                const groupGateways: LocalGatewayTreeItem[] = await blockchainGatewayExplorerProvider.getChildren(group) as LocalGatewayTreeItem[];

                groupGateways[0].label.should.equal(`Org1 ⧉`);
                groupGateways[0].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                groupGateways[0].gateway.should.deep.equal(saasGateway);
                groupGateways[0].command.should.deep.equal(myCommand);
                groupGateways[0].tooltip.should.deep.equal(`ⓘ Associated wallet:\n    Org1 Wallet`);
            });

            it('should still display gateway if its environment has been deleted', async () => {
                await FabricGatewayRegistry.instance().clear();
                await FabricEnvironmentRegistry.instance().clear();
                await FabricWalletRegistry.instance().clear();

                const opsToolsGateway: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry({ name: 'someGateway', environmentGroup: 'opsToolsEnv', associatedWallet: 'Org1 Wallet', displayName: `Org1` });

                await FabricGatewayRegistry.instance().add(opsToolsGateway);

                const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = ExtensionUtil.getBlockchainGatewayExplorerProvider();
                const allChildren: BlockchainTreeItem[] = await blockchainGatewayExplorerProvider.getChildren();

                const myCommand: vscode.Command = {
                    command: ExtensionCommands.CONNECT_TO_GATEWAY,
                    title: '',
                    arguments: [{ name: 'someGateway', associatedWallet: 'Org1 Wallet', displayName: `Org1` }]
                };

                allChildren.length.should.equal(1);
                allChildren[0].should.be.an.instanceOf(GatewayGroupTreeItem);
                const group: GatewayGroupTreeItem = allChildren[0] as GatewayGroupTreeItem;
                group.label.should.equal('Other gateways');
                group.gateways.should.deep.equal([{ name: 'someGateway', associatedWallet: 'Org1 Wallet', displayName: `Org1` }]);

                const groupGateways: LocalGatewayTreeItem[] = await blockchainGatewayExplorerProvider.getChildren(group) as LocalGatewayTreeItem[];

                groupGateways[0].label.should.equal(`Org1 ⧉`);
                groupGateways[0].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                groupGateways[0].gateway.should.deep.equal({ name: 'someGateway', associatedWallet: 'Org1 Wallet', displayName: `Org1` });
                groupGateways[0].command.should.deep.equal(myCommand);
                groupGateways[0].tooltip.should.deep.equal(`ⓘ Associated wallet:\n    Org1 Wallet`);
            });

            it('should display multiple gateway groups', async () => {
                await FabricGatewayRegistry.instance().clear();
                await FabricEnvironmentRegistry.instance().clear();
                await FabricWalletRegistry.instance().clear();

                const gateway1: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry({ name: 'gateway1', environmentGroup: 'someEnvironment', associatedWallet: 'Org1 Wallet', displayName: 'Org1'});
                const gateway2: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry({ name: 'gateway2', environmentGroup: 'someOtherEnvironment', associatedWallet: 'Org1 Wallet', displayName: 'Org1'});
                const gateway3: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry({ name: 'gateway3', associatedWallet: 'Org1 Wallet', displayName: 'Org1'});

                await FabricGatewayRegistry.instance().add(gateway1);
                await FabricGatewayRegistry.instance().add(gateway2);
                await FabricGatewayRegistry.instance().add(gateway3);

                mySandBox.stub(FabricEnvironmentRegistry.instance(), 'exists').resolves(true);
                const getEnvironmentStub: sinon.SinonStub = mySandBox.stub(FabricEnvironmentRegistry.instance(), 'get');
                getEnvironmentStub.withArgs('someEnvironment').resolves({name: 'someEnvironment'});
                getEnvironmentStub.withArgs('someOtherEnvironment').resolves({name: 'someOtherEnvironment'});

                const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = ExtensionUtil.getBlockchainGatewayExplorerProvider();
                const allChildren: BlockchainTreeItem[] = await blockchainGatewayExplorerProvider.getChildren();

                allChildren.length.should.equal(3);

                allChildren[0].should.be.an.instanceOf(GatewayGroupTreeItem);
                const group1: GatewayGroupTreeItem = allChildren[0] as GatewayGroupTreeItem;
                group1.label.should.equal('someEnvironment');
                group1.gateways.should.deep.equal([gateway1]);

                allChildren[1].should.be.an.instanceOf(GatewayGroupTreeItem);
                const group2: GatewayGroupTreeItem = allChildren[1] as GatewayGroupTreeItem;
                group2.label.should.equal('someOtherEnvironment');
                group2.gateways.should.deep.equal([gateway2]);

                allChildren[2].should.be.an.instanceOf(GatewayGroupTreeItem);
                const group3: GatewayGroupTreeItem = allChildren[2] as GatewayGroupTreeItem;
                group3.label.should.equal('Other gateways');
                group3.gateways.should.deep.equal([gateway3]);
            });

            it('should handle errors thrown when connection fails', async () => {
                const fabricConnection: sinon.SinonStubbedInstance<FabricGatewayConnection> = mySandBox.createStubInstance(FabricGatewayConnection);

                const fabricConnectionManager: FabricGatewayConnectionManager = FabricGatewayConnectionManager.instance();

                getConnectionStub.returns(fabricConnection);
                getConnectionStub.onCall(1).throws({ message: 'cannot connect' });

                const disconnnectStub: sinon.SinonStub = mySandBox.stub(fabricConnectionManager, 'disconnect').returns(undefined);
                const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = ExtensionUtil.getBlockchainGatewayExplorerProvider();
                await blockchainGatewayExplorerProvider.getChildren();

                disconnnectStub.should.have.been.calledOnce;
                logSpy.should.have.been.calledWith(LogType.ERROR, `cannot connect`);
            });

            it('should error if createChannelMap fails', async () => {

                const fabricConnection: sinon.SinonStubbedInstance<FabricGatewayConnection> = mySandBox.createStubInstance(FabricGatewayConnection);
                getConnectionStub.returns(fabricConnection);
                const error: Error = new Error('some error');
                fabricConnection.createChannelMap.rejects(error);

                const registryEntry: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
                registryEntry.name = 'myGateway';
                mySandBox.stub(FabricGatewayConnectionManager.instance(), 'getGatewayRegistryEntry').resolves(registryEntry);

                const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = ExtensionUtil.getBlockchainGatewayExplorerProvider();

                const disconnectSpy: sinon.SinonSpy = mySandBox.spy(blockchainGatewayExplorerProvider, 'disconnect');

                const allChildren: Array<BlockchainTreeItem> = await blockchainGatewayExplorerProvider.getChildren();

                await blockchainGatewayExplorerProvider.getChildren(allChildren[2]);

                disconnectSpy.should.have.been.called;
                logSpy.should.have.been.calledWith(LogType.ERROR, `Could not connect to gateway: ${error.message}`);
            });

            it('should error if gRPC cant connect to Fabric', async () => {

                const fabricConnection: sinon.SinonStubbedInstance<FabricGatewayConnection> = mySandBox.createStubInstance(FabricGatewayConnection);
                getConnectionStub.returns(fabricConnection);
                const error: Error = new Error('Cannot connect to Fabric: Received http2 header with status: 503');
                fabricConnection.createChannelMap.rejects(error);

                const registryEntry: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
                registryEntry.name = 'myGateway';
                registryEntry.associatedWallet = 'some_wallet';
                mySandBox.stub(FabricGatewayConnectionManager.instance(), 'getGatewayRegistryEntry').resolves(registryEntry);

                const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = ExtensionUtil.getBlockchainGatewayExplorerProvider();

                const disconnectSpy: sinon.SinonSpy = mySandBox.spy(blockchainGatewayExplorerProvider, 'disconnect');

                const allChildren: Array<BlockchainTreeItem> = await blockchainGatewayExplorerProvider.getChildren();

                await blockchainGatewayExplorerProvider.getChildren(allChildren[2]);

                disconnectSpy.should.have.been.called;
                logSpy.should.have.been.calledWith(LogType.ERROR, `Could not connect to gateway: ${error.message}`);
            });
        });

        describe('connected tree', () => {

            let allChildren: Array<BlockchainTreeItem>;
            let blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider;
            let fabricConnection: sinon.SinonStubbedInstance<FabricGatewayConnection>;
            let registryEntry: FabricGatewayRegistryEntry;
            let getGatewayRegistryEntryStub: sinon.SinonStub;

            beforeEach(async () => {
                fabricConnection = mySandBox.createStubInstance(FabricGatewayConnection);

                fabricConnection.getAllPeerNames.returns(['peerOne', 'peerTwo']);
                fabricConnection.getAllChannelsForPeer.withArgs('peerOne').resolves(['channelOne', 'channelTwo']);
                fabricConnection.getAllChannelsForPeer.withArgs('peerTwo').resolves(['channelTwo']);

                fabricConnection.getInstantiatedChaincode.withArgs('channelOne').resolves([{
                    name: 'biscuit-network',
                    version: '0.7'
                }]);
                fabricConnection.getInstantiatedChaincode.withArgs('channelTwo').resolves([{
                    name: 'cake-network',
                    version: '0.10'
                }, {
                    name: 'legacy-network',
                    version: '2.34'
                }, {
                    name: 'biscuit-network',
                    version: '0.7'
                }]);

                fabricConnection.getMetadata.withArgs('biscuit-network', 'channelOne').resolves(
                    {
                        contracts: {
                            'my-contract': {
                                name: 'my-contract',
                                transactions: [
                                    {
                                        name: 'tradeBiscuits'
                                    },
                                    {
                                        name: 'bourbons'
                                    }
                                ],
                            },
                            'someOtherContract': {
                                name: 'someOtherContract',
                                transactions: [
                                    {
                                        name: 'shortbread'
                                    },
                                    {
                                        name: 'hobnobs'
                                    }
                                ],
                            }
                        }
                    }
                );

                fabricConnection.getMetadata.withArgs('biscuit-network', 'channelTwo').resolves(
                    {
                        contracts: {
                            'my-contract': {
                                name: 'my-contract',
                                transactions: [
                                    {
                                        name: 'tradeBiscuits'
                                    },
                                    {
                                        name: 'bourbons'
                                    }
                                ],
                            },
                            'someOtherContract': {
                                name: 'someOtherContract',
                                transactions: [
                                    {
                                        name: 'shortbread'
                                    },
                                    {
                                        name: 'hobnobs'
                                    }
                                ],
                            }
                        }
                    }
                );

                fabricConnection.getMetadata.withArgs('cake-network', 'channelTwo').resolves(
                    {
                        contracts: {
                            'my-contract': {
                                name: 'my-contract',
                                transactions: [],
                            }
                        }
                    }
                );

                const map: Map<string, Array<string>> = new Map<string, Array<string>>();
                map.set('channelOne', ['peerOne']);
                map.set('channelTwo', ['peerOne', 'peerTwo']);

                fabricConnection.getAllChannelsForPeer.withArgs('peerTwo').resolves(['channelTwo']);
                fabricConnection.createChannelMap.resolves({channelMap: map, v2channels: []});
                fabricConnection.identityName = 'pigeon';

                fabricConnection.getMetadata.withArgs('legacy-network', 'channelTwo').resolves(null);

                blockchainGatewayExplorerProvider = ExtensionUtil.getBlockchainGatewayExplorerProvider();
                const fabricConnectionManager: FabricGatewayConnectionManager = FabricGatewayConnectionManager.instance();
                mySandBox.stub(fabricConnectionManager, 'getConnection').returns((fabricConnection as any) as FabricGatewayConnection);

                registryEntry = new FabricGatewayRegistryEntry();
                registryEntry.name = 'myGateway';
                registryEntry.associatedWallet = 'some_wallet';
                getGatewayRegistryEntryStub = mySandBox.stub(FabricGatewayConnectionManager.instance(), 'getGatewayRegistryEntry').resolves(registryEntry);
                allChildren = await blockchainGatewayExplorerProvider.getChildren();
            });

            afterEach(() => {
                mySandBox.restore();
            });

            it('should create a connected tree if there is a connection', async () => {
                allChildren.length.should.equal(3);

                const connectedItem1: ConnectedTreeItem = allChildren[0] as ConnectedTreeItem;
                connectedItem1.label.should.equal('Connected via gateway: myGateway');
                connectedItem1.contextValue.should.equal('blockchain-connected-item');
                connectedItem1.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                connectedItem1.connection.name.should.equal('myGateway');

                const connectedItem2: ConnectedTreeItem = allChildren[1] as ConnectedTreeItem;
                connectedItem2.label.should.equal('Using ID: pigeon');
                connectedItem2.contextValue.should.equal('blockchain-connected-item');
                connectedItem2.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                connectedItem2.connection.name.should.equal('myGateway');

                const connectedItem3: ConnectedTreeItem = allChildren[2] as ConnectedTreeItem;
                connectedItem3.label.should.equal('Channels');
                connectedItem3.contextValue.should.equal('blockchain-connected-item');
                connectedItem3.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Expanded);
                connectedItem3.connection.name.should.equal('myGateway');

                const channels: Array<ChannelTreeItem> = await blockchainGatewayExplorerProvider.getChildren(allChildren[2]) as Array<ChannelTreeItem>;
                const channelOne: ChannelTreeItem = channels[0];
                channelOne.tooltip.should.equal('Associated peers: peerOne');

                channelOne.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                channelOne.contextValue.should.equal('blockchain-channel-item');
                channelOne.label.should.equal('channelOne');
                channelOne.peers.should.deep.equal(['peerOne']);

                const channelTwo: ChannelTreeItem = channels[1];
                channelTwo.tooltip.should.equal('Associated peers: peerOne, peerTwo');
                channelTwo.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                channelTwo.contextValue.should.equal('blockchain-channel-item');
                channelTwo.label.should.equal('channelTwo');
                channelTwo.peers.should.deep.equal(['peerOne', 'peerTwo']);
            });

            it('should update connected to context value if managed runtime', async () => {
                await TestUtil.setupLocalFabric();

                registryEntry = await FabricGatewayRegistry.instance().get(`${FabricRuntimeUtil.LOCAL_FABRIC} - Org1`);
                getGatewayRegistryEntryStub.resolves(registryEntry);
                allChildren = await ExtensionUtil.getBlockchainGatewayExplorerProvider().getChildren();

                allChildren.length.should.equal(3);

                const connectedItem: ConnectedTreeItem = allChildren[0] as ConnectedTreeItem;
                connectedItem.label.should.equal(`Connected via gateway: ${registryEntry.name}`);
                connectedItem.contextValue.should.equal('blockchain-connected-runtime-item');
                connectedItem.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                connectedItem.connection.name.should.equal(registryEntry.name);

                const channels: Array<ChannelTreeItem> = await blockchainGatewayExplorerProvider.getChildren(allChildren[2]) as Array<ChannelTreeItem>;
                const channelOne: ChannelTreeItem = channels[0];
                channelOne.tooltip.should.equal('Associated peers: peerOne');

                channelOne.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                channelOne.contextValue.should.equal('blockchain-channel-item');
                channelOne.label.should.equal('channelOne');
                channelOne.peers.should.deep.equal(['peerOne']);

                const channelTwo: ChannelTreeItem = channels[1];
                channelTwo.tooltip.should.equal('Associated peers: peerOne, peerTwo');

                channelTwo.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                channelTwo.contextValue.should.equal('blockchain-channel-item');
                channelTwo.label.should.equal('channelTwo');
                channelTwo.peers.should.deep.equal(['peerOne', 'peerTwo']);
            });

            it('should create channel children correctly', async () => {

                allChildren.length.should.equal(3);
                const channels: Array<ChannelTreeItem> = await blockchainGatewayExplorerProvider.getChildren(allChildren[2]) as Array<ChannelTreeItem>;
                channels[0].tooltip.should.equal('Associated peers: peerOne');
                channels[1].tooltip.should.equal('Associated peers: peerOne, peerTwo');

                let instantiatedUnknownChainCodes: Array<InstantiatedUnknownTreeItem> = await blockchainGatewayExplorerProvider.getChildren(channels[0]) as Array<InstantiatedUnknownTreeItem>;
                instantiatedUnknownChainCodes.length.should.equal(1);
                await blockchainGatewayExplorerProvider.getChildren(instantiatedUnknownChainCodes[0]);

                const channelChildrenOne: Array<BlockchainTreeItem> = await blockchainGatewayExplorerProvider.getChildren(channels[0]);
                channelChildrenOne.length.should.equal(1);

                const instantiatedTreeItemOne: InstantiatedContractTreeItem = channelChildrenOne[0] as InstantiatedContractTreeItem;
                instantiatedTreeItemOne.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                instantiatedTreeItemOne.name.should.equal('biscuit-network');
                instantiatedTreeItemOne.version.should.equal('0.7');
                instantiatedTreeItemOne.label.should.equal('biscuit-network@0.7');
                instantiatedTreeItemOne.contextValue.should.equal('blockchain-instantiated-multi-contract-item');
                instantiatedTreeItemOne.channels[0].label.should.equal('channelOne');
                instantiatedTreeItemOne.channels.length.should.equal(1);

                instantiatedUnknownChainCodes = await blockchainGatewayExplorerProvider.getChildren(channels[1]) as Array<InstantiatedUnknownTreeItem>;
                instantiatedUnknownChainCodes.length.should.equal(3);
                await blockchainGatewayExplorerProvider.getChildren(instantiatedUnknownChainCodes[0]);
                await blockchainGatewayExplorerProvider.getChildren(instantiatedUnknownChainCodes[1]);
                await blockchainGatewayExplorerProvider.getChildren(instantiatedUnknownChainCodes[2]);

                const channelChildrenTwo: Array<BlockchainTreeItem> = await blockchainGatewayExplorerProvider.getChildren(channels[1]);
                channelChildrenTwo.length.should.equal(3);

                const instantiatedTreeItemTwo: InstantiatedContractTreeItem = channelChildrenTwo[0] as InstantiatedContractTreeItem;
                instantiatedTreeItemTwo.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                instantiatedTreeItemTwo.name.should.equal('cake-network');
                instantiatedTreeItemTwo.version.should.equal('0.10');
                instantiatedTreeItemTwo.label.should.equal('cake-network@0.10');
                instantiatedTreeItemTwo.contextValue.should.equal('blockchain-instantiated-contract-item');
                instantiatedTreeItemTwo.channels[0].label.should.equal('channelTwo');
                instantiatedTreeItemTwo.channels.length.should.equal(1);

                const instantiatedTreeItemThree: InstantiatedChaincodeTreeItem = channelChildrenTwo[1] as InstantiatedChaincodeTreeItem;
                instantiatedTreeItemThree.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                instantiatedTreeItemThree.name.should.equal('legacy-network');
                instantiatedTreeItemThree.version.should.equal('2.34');
                instantiatedTreeItemThree.label.should.equal('legacy-network@2.34');
                instantiatedTreeItemThree.contextValue.should.equal('blockchain-instantiated-chaincode-item');
                instantiatedTreeItemThree.channels[0].label.should.equal('channelTwo');
                instantiatedTreeItemThree.channels.length.should.equal(1);

                const instantiatedTreeItemFour: InstantiatedContractTreeItem = channelChildrenTwo[2] as InstantiatedContractTreeItem;
                instantiatedTreeItemFour.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                instantiatedTreeItemFour.name.should.equal('biscuit-network');
                instantiatedTreeItemFour.version.should.equal('0.7');
                instantiatedTreeItemFour.label.should.equal('biscuit-network@0.7');
                instantiatedTreeItemFour.contextValue.should.equal('blockchain-instantiated-multi-contract-item');
                instantiatedTreeItemFour.channels[0].label.should.equal('channelTwo');
                instantiatedTreeItemFour.channels.length.should.equal(1);
            });

            it('should not create anything if no peers', async () => {

                fabricConnection.getAllPeerNames.returns([]);

                allChildren = await blockchainGatewayExplorerProvider.getChildren();

                allChildren.length.should.equal(3);
                allChildren[0].label.should.equal('Connected via gateway: myGateway');
            });

            it('should error if problem with instantiate chaincodes', async () => {

                fabricConnection.getInstantiatedChaincode.withArgs('channelOne').rejects({ message: 'some error' });

                allChildren = await blockchainGatewayExplorerProvider.getChildren();
                allChildren.length.should.equal(3);

                const channels: Array<ChannelTreeItem> = await blockchainGatewayExplorerProvider.getChildren(allChildren[2]) as Array<ChannelTreeItem>;

                channels.length.should.equal(2);
                logSpy.should.have.been.calledWith(LogType.ERROR, 'Error getting instantiated smart contracts for channel channelOne some error');

                const channelOne: ChannelTreeItem = channels[0];
                channelOne.tooltip.should.equal('Associated peers: peerOne');

                channelOne.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                const channelChildrenOne: Array<BlockchainTreeItem> = await blockchainGatewayExplorerProvider.getChildren(channelOne);
                channelChildrenOne.length.should.equal(0);
            });

            it('should handle no instantiated chaincodes', async () => {

                fabricConnection.getInstantiatedChaincode.withArgs('channelOne').resolves([]);

                allChildren = await blockchainGatewayExplorerProvider.getChildren();
                allChildren.length.should.equal(3);

                const channels: Array<ChannelTreeItem> = await blockchainGatewayExplorerProvider.getChildren(allChildren[2]) as Array<ChannelTreeItem>;
                channels.length.should.equal(2);

                const channelOne: ChannelTreeItem = channels[0];
                channelOne.tooltip.should.equal('Associated peers: peerOne');
                channelOne.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                channelOne.contextValue.should.equal('blockchain-channel-item');
                channelOne.label.should.equal('channelOne');
                channelOne.peers.should.deep.equal(['peerOne']);
                const channelChildrenOne: Array<BlockchainTreeItem> = await blockchainGatewayExplorerProvider.getChildren(channelOne);
                channelChildrenOne.length.should.equal(0);

                const channelTwo: ChannelTreeItem = channels[1];
                channelTwo.tooltip.should.equal('Associated peers: peerOne, peerTwo');
                channelTwo.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                channelTwo.contextValue.should.equal('blockchain-channel-item');
                channelTwo.label.should.equal('channelTwo');
                channelTwo.peers.should.deep.equal(['peerOne', 'peerTwo']);

                const instantiatedUnknownChainCodes: Array<InstantiatedUnknownTreeItem> = await blockchainGatewayExplorerProvider.getChildren(channelTwo) as Array<InstantiatedUnknownTreeItem>;
                instantiatedUnknownChainCodes.length.should.equal(3);
                await blockchainGatewayExplorerProvider.getChildren(instantiatedUnknownChainCodes[0]);
                await blockchainGatewayExplorerProvider.getChildren(instantiatedUnknownChainCodes[1]);
                await blockchainGatewayExplorerProvider.getChildren(instantiatedUnknownChainCodes[2]);

                const channelChildrenTwo: Array<BlockchainTreeItem> = await blockchainGatewayExplorerProvider.getChildren(channelTwo);
                channelChildrenTwo.length.should.equal(3);

                const instantiatedTreeItemTwo: InstantiatedContractTreeItem = channelChildrenTwo[0] as InstantiatedContractTreeItem;
                instantiatedTreeItemTwo.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                instantiatedTreeItemTwo.name.should.equal('cake-network');
                instantiatedTreeItemTwo.version.should.equal('0.10');
                instantiatedTreeItemTwo.label.should.equal('cake-network@0.10');
                instantiatedTreeItemTwo.contextValue.should.equal('blockchain-instantiated-contract-item');
                instantiatedTreeItemTwo.channels[0].label.should.equal('channelTwo');
                instantiatedTreeItemTwo.channels.length.should.equal(1);

                const instantiatedTreeItemThree: InstantiatedChaincodeTreeItem = channelChildrenTwo[1] as InstantiatedChaincodeTreeItem;
                instantiatedTreeItemThree.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                instantiatedTreeItemThree.name.should.equal('legacy-network');
                instantiatedTreeItemThree.version.should.equal('2.34');
                instantiatedTreeItemThree.label.should.equal('legacy-network@2.34');
                instantiatedTreeItemThree.contextValue.should.equal('blockchain-instantiated-chaincode-item');
                instantiatedTreeItemThree.channels[0].label.should.equal('channelTwo');
                instantiatedTreeItemThree.channels.length.should.equal(1);

                const instantiatedTreeItemFour: InstantiatedContractTreeItem = channelChildrenTwo[2] as InstantiatedContractTreeItem;
                instantiatedTreeItemFour.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                instantiatedTreeItemFour.name.should.equal('biscuit-network');
                instantiatedTreeItemFour.version.should.equal('0.7');
                instantiatedTreeItemFour.label.should.equal('biscuit-network@0.7');
                instantiatedTreeItemFour.contextValue.should.equal('blockchain-instantiated-multi-contract-item');
                instantiatedTreeItemFour.channels[0].label.should.equal('channelTwo');
                instantiatedTreeItemFour.channels.length.should.equal(1);

                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should create instantiated chaincode correctly', async () => {

                allChildren = await blockchainGatewayExplorerProvider.getChildren();
                allChildren.length.should.equal(3);

                const channels: Array<ChannelTreeItem> = await blockchainGatewayExplorerProvider.getChildren(allChildren[2]) as Array<ChannelTreeItem>;

                let instantiatedUnknownChainCodes: Array<InstantiatedUnknownTreeItem> = await blockchainGatewayExplorerProvider.getChildren(channels[0]) as Array<InstantiatedUnknownTreeItem>;
                instantiatedUnknownChainCodes.length.should.equal(1);
                await blockchainGatewayExplorerProvider.getChildren(instantiatedUnknownChainCodes[0]);

                const channelOne: ChannelTreeItem = channels[0];
                channelOne.tooltip.should.equal('Associated peers: peerOne');

                const channelChildrenOne: Array<BlockchainTreeItem> = await blockchainGatewayExplorerProvider.getChildren(channelOne);
                channelChildrenOne.length.should.equal(1);

                const instantiatedChaincodeItemOne: InstantiatedContractTreeItem = channelChildrenOne[0] as InstantiatedContractTreeItem;

                instantiatedChaincodeItemOne.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                instantiatedChaincodeItemOne.contextValue.should.equal('blockchain-instantiated-multi-contract-item');
                instantiatedChaincodeItemOne.label.should.equal('biscuit-network@0.7');
                instantiatedChaincodeItemOne.channels[0].should.equal(channelOne);
                instantiatedChaincodeItemOne.channels.length.should.equal(1);
                instantiatedChaincodeItemOne.version.should.equal('0.7');
                instantiatedChaincodeItemOne.contracts.should.deep.equal(['my-contract', 'someOtherContract']);

                const channelTwo: ChannelTreeItem = channels[1];
                channelTwo.tooltip.should.equal('Associated peers: peerOne, peerTwo');

                instantiatedUnknownChainCodes = await blockchainGatewayExplorerProvider.getChildren(channels[1]) as Array<InstantiatedUnknownTreeItem>;
                instantiatedUnknownChainCodes.length.should.equal(3);
                await blockchainGatewayExplorerProvider.getChildren(instantiatedUnknownChainCodes[0]);
                await blockchainGatewayExplorerProvider.getChildren(instantiatedUnknownChainCodes[1]);
                await blockchainGatewayExplorerProvider.getChildren(instantiatedUnknownChainCodes[2]);

                const channelChildrenTwo: Array<BlockchainTreeItem> = await blockchainGatewayExplorerProvider.getChildren(channelTwo);
                channelChildrenTwo.length.should.equal(3);

                const instantiatedChaincodeItemTwo: InstantiatedContractTreeItem = channelChildrenTwo[0] as InstantiatedContractTreeItem;

                instantiatedChaincodeItemTwo.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                instantiatedChaincodeItemTwo.contextValue.should.equal('blockchain-instantiated-contract-item');
                instantiatedChaincodeItemTwo.label.should.equal('cake-network@0.10');
                instantiatedChaincodeItemTwo.channels[0].should.equal(channelTwo);
                instantiatedChaincodeItemTwo.channels.length.should.equal(1);
                instantiatedChaincodeItemTwo.version.should.equal('0.10');
                instantiatedChaincodeItemTwo.contracts.should.deep.equal([]);

                const instantiatedChaincodeItemThree: InstantiatedChaincodeTreeItem = channelChildrenTwo[1] as InstantiatedChaincodeTreeItem;

                instantiatedChaincodeItemThree.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                instantiatedChaincodeItemThree.contextValue.should.equal('blockchain-instantiated-chaincode-item');
                instantiatedChaincodeItemThree.label.should.equal('legacy-network@2.34');
                instantiatedChaincodeItemThree.channels[0].should.equal(channelTwo);
                instantiatedChaincodeItemThree.channels.length.should.equal(1);
                instantiatedChaincodeItemThree.version.should.equal('2.34');
                should.equal(instantiatedChaincodeItemThree.contracts, undefined);

                const instantiatedTreeItemFour: InstantiatedContractTreeItem = channelChildrenTwo[2] as InstantiatedContractTreeItem;
                instantiatedTreeItemFour.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                instantiatedTreeItemFour.name.should.equal('biscuit-network');
                instantiatedTreeItemFour.version.should.equal('0.7');
                instantiatedTreeItemFour.label.should.equal('biscuit-network@0.7');
                instantiatedTreeItemFour.contextValue.should.equal('blockchain-instantiated-multi-contract-item');
                instantiatedTreeItemFour.channels[0].label.should.equal('channelTwo');
                instantiatedTreeItemFour.channels.length.should.equal(1);

                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should create the contract tree correctly', async () => {
                allChildren = await blockchainGatewayExplorerProvider.getChildren();
                allChildren.length.should.equal(3);

                const channels: Array<ChannelTreeItem> = await blockchainGatewayExplorerProvider.getChildren(allChildren[2]) as Array<ChannelTreeItem>;

                const channelOne: ChannelTreeItem = channels[0];
                channelOne.tooltip.should.equal('Associated peers: peerOne');

                let instantiatedUnknownChainCodes: Array<InstantiatedUnknownTreeItem> = await blockchainGatewayExplorerProvider.getChildren(channelOne) as Array<InstantiatedUnknownTreeItem>;
                instantiatedUnknownChainCodes.length.should.equal(1);
                await blockchainGatewayExplorerProvider.getChildren(instantiatedUnknownChainCodes[0]);

                const channelChildrenOne: Array<BlockchainTreeItem> = await blockchainGatewayExplorerProvider.getChildren(channelOne);
                channelChildrenOne.length.should.equal(1);

                const instantiatedChaincodeItemOne: InstantiatedContractTreeItem = channelChildrenOne[0] as InstantiatedContractTreeItem;

                const contractsOne: Array<ContractTreeItem> = await blockchainGatewayExplorerProvider.getChildren(instantiatedChaincodeItemOne) as Array<ContractTreeItem>;
                contractsOne.length.should.equal(2);
                contractsOne[0].label.should.equal('my-contract');
                contractsOne[0].instantiatedChaincode.name.should.equal('biscuit-network');
                contractsOne[0].instantiatedChaincode.channels[0].label.should.equal('channelOne');
                contractsOne[0].instantiatedChaincode.channels.length.should.equal(1);
                contractsOne[0].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                contractsOne[1].label.should.equal('someOtherContract');
                contractsOne[1].instantiatedChaincode.name.should.equal('biscuit-network');
                contractsOne[1].instantiatedChaincode.channels[0].label.should.equal('channelOne');
                contractsOne[1].instantiatedChaincode.channels.length.should.equal(1);
                contractsOne[1].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);

                const channelTwo: ChannelTreeItem = channels[1];
                channelTwo.tooltip.should.equal('Associated peers: peerOne, peerTwo');

                instantiatedUnknownChainCodes = await blockchainGatewayExplorerProvider.getChildren(channelTwo) as Array<InstantiatedUnknownTreeItem>;
                instantiatedUnknownChainCodes.length.should.equal(3);
                await blockchainGatewayExplorerProvider.getChildren(instantiatedUnknownChainCodes[0]);

                const channelChildrenTwo: Array<BlockchainTreeItem> = await blockchainGatewayExplorerProvider.getChildren(channelTwo);
                channelChildrenTwo.length.should.equal(3);

                const instantiatedChaincodeItemTwo: InstantiatedContractTreeItem = channelChildrenTwo[0] as InstantiatedContractTreeItem;
                const contractsTwo: Array<ContractTreeItem> = await blockchainGatewayExplorerProvider.getChildren(instantiatedChaincodeItemTwo) as Array<ContractTreeItem>;
                contractsTwo.should.deep.equal([]);
                instantiatedChaincodeItemTwo.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);

                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should show the transactions and not contracts if the contract name is empty', async () => {
                fabricConnection.getMetadata.withArgs('biscuit-network', 'channelOne').resolves(
                    {
                        contracts: {
                            '': {
                                name: '',
                                transactions: [
                                    {
                                        name: 'tradeBiscuits'
                                    },
                                    {
                                        name: 'bourbons'
                                    }
                                ],
                            }
                        }
                    }
                );

                allChildren = await blockchainGatewayExplorerProvider.getChildren();
                allChildren.length.should.equal(3);

                const channels: Array<ChannelTreeItem> = await blockchainGatewayExplorerProvider.getChildren(allChildren[2]) as Array<ChannelTreeItem>;

                const channelOne: ChannelTreeItem = channels[0];
                channelOne.tooltip.should.equal('Associated peers: peerOne');

                const instantiatedUnknownChainCodes: Array<InstantiatedUnknownTreeItem> = await blockchainGatewayExplorerProvider.getChildren(channelOne) as Array<InstantiatedUnknownTreeItem>;
                instantiatedUnknownChainCodes.length.should.equal(1);
                await blockchainGatewayExplorerProvider.getChildren(instantiatedUnknownChainCodes[0]);

                const channelChildrenOne: Array<BlockchainTreeItem> = await blockchainGatewayExplorerProvider.getChildren(channelOne);
                channelChildrenOne.length.should.equal(1);

                const instantiatedChaincodeItemOne: InstantiatedContractTreeItem = channelChildrenOne[0] as InstantiatedContractTreeItem;

                const transactions: Array<TransactionTreeItem> = await blockchainGatewayExplorerProvider.getChildren(instantiatedChaincodeItemOne) as Array<TransactionTreeItem>;
                transactions.length.should.equal(2);
                transactions[0].label.should.equal('tradeBiscuits');
                transactions[0].chaincodeName.should.equal('biscuit-network');
                transactions[0].channelName.should.equal('channelOne');
                transactions[0].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                transactions[0].contractName.should.equal('');
                transactions[1].label.should.equal('bourbons');
                transactions[1].chaincodeName.should.equal('biscuit-network');
                transactions[1].channelName.should.equal('channelOne');
                transactions[1].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                transactions[1].contractName.should.equal('');

                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should show the transactions and not contracts if there is only one contract', async () => {
                fabricConnection.getMetadata.withArgs('cake-network', 'channelTwo').resolves(
                    {
                        contracts: {
                            'my-contract': {
                                name: 'my-contract',
                                transactions: [
                                    {
                                        name: 'garabaldi'
                                    },
                                    {
                                        name: 'shortbread'
                                    }
                                ],
                            }
                        }
                    }
                );
                const channels: Array<ChannelTreeItem> = await blockchainGatewayExplorerProvider.getChildren(allChildren[2]) as Array<ChannelTreeItem>;
                channels[0].tooltip.should.equal('Associated peers: peerOne');
                channels[1].tooltip.should.equal('Associated peers: peerOne, peerTwo');

                const instantiatedUnknownChainCodes: Array<InstantiatedUnknownTreeItem> = await blockchainGatewayExplorerProvider.getChildren(channels[1]) as Array<InstantiatedUnknownTreeItem>;
                instantiatedUnknownChainCodes.length.should.equal(3);
                await blockchainGatewayExplorerProvider.getChildren(instantiatedUnknownChainCodes[0]);
                await blockchainGatewayExplorerProvider.getChildren(instantiatedUnknownChainCodes[1]);
                await blockchainGatewayExplorerProvider.getChildren(instantiatedUnknownChainCodes[2]);

                const channelChildren: Array<BlockchainTreeItem> = await blockchainGatewayExplorerProvider.getChildren(channels[1]);

                const instantiatedChaincodeItemOne: InstantiatedContractTreeItem = channelChildren[0] as InstantiatedContractTreeItem;

                const transactions: Array<TransactionTreeItem> = await blockchainGatewayExplorerProvider.getChildren(instantiatedChaincodeItemOne) as Array<TransactionTreeItem>;
                transactions.length.should.equal(2);
                transactions[0].label.should.equal('garabaldi');
                transactions[0].chaincodeName.should.equal('cake-network');
                transactions[0].channelName.should.equal('channelTwo');
                transactions[0].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                transactions[0].contractName.should.equal('my-contract');
                transactions[1].label.should.equal('shortbread');
                transactions[1].chaincodeName.should.equal('cake-network');
                transactions[1].channelName.should.equal('channelTwo');
                transactions[1].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                transactions[1].contractName.should.equal('my-contract');

                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should create the transactions correctly', async () => {

                allChildren = await blockchainGatewayExplorerProvider.getChildren();
                allChildren.length.should.equal(3);

                const channels: Array<ChannelTreeItem> = await blockchainGatewayExplorerProvider.getChildren(allChildren[2]) as Array<ChannelTreeItem>;

                const channelOne: ChannelTreeItem = channels[0];
                channelOne.tooltip.should.equal('Associated peers: peerOne');

                let instantiatedUnknownChainCodes: Array<InstantiatedUnknownTreeItem> = await blockchainGatewayExplorerProvider.getChildren(channelOne) as Array<InstantiatedUnknownTreeItem>;
                instantiatedUnknownChainCodes.length.should.equal(1);
                await blockchainGatewayExplorerProvider.getChildren(instantiatedUnknownChainCodes[0]);

                const channelChildrenOne: Array<BlockchainTreeItem> = await blockchainGatewayExplorerProvider.getChildren(channelOne);
                channelChildrenOne.length.should.equal(1);

                const instantiatedChaincodeItemOne: InstantiatedContractTreeItem = channelChildrenOne[0] as InstantiatedContractTreeItem;

                const contractsOne: Array<ContractTreeItem> = await blockchainGatewayExplorerProvider.getChildren(instantiatedChaincodeItemOne) as Array<ContractTreeItem>;

                const transactionsOneMyContract: Array<TransactionTreeItem> = await blockchainGatewayExplorerProvider.getChildren(contractsOne[0]) as Array<TransactionTreeItem>;

                transactionsOneMyContract.length.should.equal(2);
                transactionsOneMyContract[0].label.should.equal('tradeBiscuits');
                transactionsOneMyContract[0].chaincodeName.should.equal('biscuit-network');
                transactionsOneMyContract[0].channelName.should.equal('channelOne');
                transactionsOneMyContract[0].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                transactionsOneMyContract[0].contractName.should.equal('my-contract');
                transactionsOneMyContract[1].label.should.equal('bourbons');
                transactionsOneMyContract[1].chaincodeName.should.equal('biscuit-network');
                transactionsOneMyContract[1].channelName.should.equal('channelOne');
                transactionsOneMyContract[1].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                transactionsOneMyContract[1].contractName.should.equal('my-contract');

                const transactionsOneSomeOtherContract: Array<TransactionTreeItem> = await blockchainGatewayExplorerProvider.getChildren(contractsOne[1]) as Array<TransactionTreeItem>;
                transactionsOneSomeOtherContract.length.should.equal(2);
                transactionsOneSomeOtherContract[0].label.should.equal('shortbread');
                transactionsOneSomeOtherContract[0].chaincodeName.should.equal('biscuit-network');
                transactionsOneSomeOtherContract[0].channelName.should.equal('channelOne');
                transactionsOneSomeOtherContract[0].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                transactionsOneSomeOtherContract[0].contractName.should.equal('someOtherContract');
                transactionsOneSomeOtherContract[1].label.should.equal('hobnobs');
                transactionsOneSomeOtherContract[1].chaincodeName.should.equal('biscuit-network');
                transactionsOneSomeOtherContract[1].channelName.should.equal('channelOne');
                transactionsOneSomeOtherContract[1].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                transactionsOneSomeOtherContract[1].contractName.should.equal('someOtherContract');

                const channelTwo: ChannelTreeItem = channels[1];
                channelTwo.tooltip.should.equal('Associated peers: peerOne, peerTwo');

                instantiatedUnknownChainCodes = await blockchainGatewayExplorerProvider.getChildren(channelTwo) as Array<InstantiatedUnknownTreeItem>;
                instantiatedUnknownChainCodes.length.should.equal(3);
                await blockchainGatewayExplorerProvider.getChildren(instantiatedUnknownChainCodes[0]);
                await blockchainGatewayExplorerProvider.getChildren(instantiatedUnknownChainCodes[2]);

                const channelChildrenTwo: Array<BlockchainTreeItem> = await blockchainGatewayExplorerProvider.getChildren(channelTwo);
                channelChildrenTwo.length.should.equal(3);

                const instantiatedChaincodeItemTwo: InstantiatedContractTreeItem = channelChildrenTwo[0] as InstantiatedContractTreeItem;
                instantiatedChaincodeItemTwo.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);

                const instantiatedChaincodeItemThree: InstantiatedContractTreeItem = channelChildrenTwo[2] as InstantiatedContractTreeItem;
                const contractsTwo: Array<ContractTreeItem> = await blockchainGatewayExplorerProvider.getChildren(instantiatedChaincodeItemThree) as Array<ContractTreeItem>;
                const transactionsTwoMyContract: Array<TransactionTreeItem> = await blockchainGatewayExplorerProvider.getChildren(contractsTwo[1]) as Array<TransactionTreeItem>;

                transactionsTwoMyContract.length.should.equal(2);
                transactionsTwoMyContract[0].label.should.equal('shortbread');
                transactionsTwoMyContract[0].chaincodeName.should.equal('biscuit-network');
                transactionsTwoMyContract[0].channelName.should.equal('channelTwo');
                transactionsTwoMyContract[0].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                transactionsTwoMyContract[0].contractName.should.equal('someOtherContract');
                transactionsTwoMyContract[1].label.should.equal('hobnobs');
                transactionsTwoMyContract[1].chaincodeName.should.equal('biscuit-network');
                transactionsTwoMyContract[1].channelName.should.equal('channelTwo');
                transactionsTwoMyContract[1].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                transactionsTwoMyContract[1].contractName.should.equal('someOtherContract');

                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it(`should create instantiated chaincode correctly when there are txdata associations`, async () => {
                const gateway: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
                gateway.name = 'myGateway';
                gateway.associatedWallet = 'some_wallet';
                gateway.transactionDataDirectories = [{
                    chaincodeName: 'cake-network',
                    channelName: 'channelTwo',
                    transactionDataPath: 'some/file/path'
                }, {
                    chaincodeName: 'legacy-network',
                    channelName: 'channelTwo',
                    transactionDataPath: 'some/other/file/path'
                }, {
                    chaincodeName: 'biscuit-network',
                    channelName: 'channelOne',
                    transactionDataPath: 'different/file/path'
                }, {
                    chaincodeName: 'biscuit-network',
                    channelName: 'channelTwo',
                    transactionDataPath: 'different/file/path'
                }];
                getGatewayRegistryEntryStub.returns(gateway);

                allChildren = await blockchainGatewayExplorerProvider.getChildren();
                allChildren.length.should.equal(3);

                const channels: Array<ChannelTreeItem> = await blockchainGatewayExplorerProvider.getChildren(allChildren[2]) as Array<ChannelTreeItem>;

                let instantiatedUnknownChainCodes: Array<InstantiatedUnknownTreeItem> = await blockchainGatewayExplorerProvider.getChildren(channels[0]) as Array<InstantiatedUnknownTreeItem>;
                instantiatedUnknownChainCodes.length.should.equal(1);
                await blockchainGatewayExplorerProvider.getChildren(instantiatedUnknownChainCodes[0]);

                const channelOne: ChannelTreeItem = channels[0];
                channelOne.tooltip.should.equal('Associated peers: peerOne');

                const channelChildrenOne: Array<BlockchainTreeItem> = await blockchainGatewayExplorerProvider.getChildren(channelOne);
                channelChildrenOne.length.should.equal(1);

                const instantiatedChaincodeItemOne: InstantiatedContractTreeItem = channelChildrenOne[0] as InstantiatedContractTreeItem;

                instantiatedChaincodeItemOne.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                instantiatedChaincodeItemOne.contextValue.should.equal('blockchain-instantiated-associated-multi-contract-item');
                instantiatedChaincodeItemOne.label.should.equal('biscuit-network@0.7');
                instantiatedChaincodeItemOne.channels[0].should.equal(channelOne);
                instantiatedChaincodeItemOne.channels.length.should.equal(1);
                instantiatedChaincodeItemOne.version.should.equal('0.7');
                instantiatedChaincodeItemOne.contracts.should.deep.equal(['my-contract', 'someOtherContract']);

                const channelTwo: ChannelTreeItem = channels[1];
                channelTwo.tooltip.should.equal('Associated peers: peerOne, peerTwo');

                instantiatedUnknownChainCodes = await blockchainGatewayExplorerProvider.getChildren(channels[1]) as Array<InstantiatedUnknownTreeItem>;
                instantiatedUnknownChainCodes.length.should.equal(3);
                await blockchainGatewayExplorerProvider.getChildren(instantiatedUnknownChainCodes[0]);
                await blockchainGatewayExplorerProvider.getChildren(instantiatedUnknownChainCodes[1]);
                await blockchainGatewayExplorerProvider.getChildren(instantiatedUnknownChainCodes[2]);

                const channelChildrenTwo: Array<BlockchainTreeItem> = await blockchainGatewayExplorerProvider.getChildren(channelTwo);
                channelChildrenTwo.length.should.equal(3);

                const instantiatedChaincodeItemTwo: InstantiatedContractTreeItem = channelChildrenTwo[0] as InstantiatedContractTreeItem;

                instantiatedChaincodeItemTwo.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                instantiatedChaincodeItemTwo.contextValue.should.equal('blockchain-instantiated-associated-contract-item');
                instantiatedChaincodeItemTwo.label.should.equal('cake-network@0.10');
                instantiatedChaincodeItemTwo.channels[0].should.equal(channelTwo);
                instantiatedChaincodeItemTwo.channels.length.should.equal(1);
                instantiatedChaincodeItemTwo.version.should.equal('0.10');
                instantiatedChaincodeItemTwo.contracts.should.deep.equal([]);

                const instantiatedChaincodeItemThree: InstantiatedChaincodeTreeItem = channelChildrenTwo[1] as InstantiatedChaincodeTreeItem;

                instantiatedChaincodeItemThree.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                instantiatedChaincodeItemThree.contextValue.should.equal('blockchain-instantiated-associated-chaincode-item');
                instantiatedChaincodeItemThree.label.should.equal('legacy-network@2.34');
                instantiatedChaincodeItemThree.channels[0].should.equal(channelTwo);
                instantiatedChaincodeItemThree.channels.length.should.equal(1);
                instantiatedChaincodeItemThree.version.should.equal('2.34');
                should.equal(instantiatedChaincodeItemThree.contracts, undefined);

                const instantiatedTreeItemFour: InstantiatedContractTreeItem = channelChildrenTwo[2] as InstantiatedContractTreeItem;
                instantiatedTreeItemFour.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                instantiatedTreeItemFour.name.should.equal('biscuit-network');
                instantiatedTreeItemFour.version.should.equal('0.7');
                instantiatedTreeItemFour.label.should.equal('biscuit-network@0.7');
                instantiatedTreeItemFour.contextValue.should.equal('blockchain-instantiated-associated-multi-contract-item');
                instantiatedTreeItemFour.channels[0].label.should.equal('channelTwo');
                instantiatedTreeItemFour.channels.length.should.equal(1);

                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should show transactions correctly when there is a txdata association', async () => {
                const gateway: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
                gateway.name = 'myGateway';
                gateway.associatedWallet = 'some_wallet';
                gateway.transactionDataDirectories = [{
                    chaincodeName: 'cake-network',
                    channelName: 'channelTwo',
                    transactionDataPath: 'some/file/path'
                }];
                getGatewayRegistryEntryStub.returns(gateway);

                fabricConnection.getMetadata.withArgs('cake-network', 'channelTwo').resolves(
                    {
                        contracts: {
                            'my-contract': {
                                name: 'my-contract',
                                transactions: [
                                    {
                                        name: 'garabaldi'
                                    },
                                    {
                                        name: 'shortbread'
                                    }
                                ],
                            }
                        }
                    }
                );
                const channels: Array<ChannelTreeItem> = await blockchainGatewayExplorerProvider.getChildren(allChildren[2]) as Array<ChannelTreeItem>;
                channels[0].tooltip.should.equal('Associated peers: peerOne');
                channels[1].tooltip.should.equal('Associated peers: peerOne, peerTwo');

                const instantiatedUnknownChainCodes: Array<InstantiatedUnknownTreeItem> = await blockchainGatewayExplorerProvider.getChildren(channels[1]) as Array<InstantiatedUnknownTreeItem>;
                instantiatedUnknownChainCodes.length.should.equal(3);
                await blockchainGatewayExplorerProvider.getChildren(instantiatedUnknownChainCodes[0]);
                await blockchainGatewayExplorerProvider.getChildren(instantiatedUnknownChainCodes[1]);
                await blockchainGatewayExplorerProvider.getChildren(instantiatedUnknownChainCodes[2]);

                const channelChildren: Array<BlockchainTreeItem> = await blockchainGatewayExplorerProvider.getChildren(channels[1]);

                const instantiatedChaincodeItemOne: InstantiatedContractTreeItem = channelChildren[0] as InstantiatedContractTreeItem;

                const transactions: Array<TransactionTreeItem> = await blockchainGatewayExplorerProvider.getChildren(instantiatedChaincodeItemOne) as Array<TransactionTreeItem>;
                transactions.length.should.equal(2);
                transactions[0].label.should.equal('garabaldi');
                transactions[0].chaincodeName.should.equal('cake-network');
                transactions[0].channelName.should.equal('channelTwo');
                transactions[0].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                transactions[0].contractName.should.equal('my-contract');
                transactions[1].label.should.equal('shortbread');
                transactions[1].chaincodeName.should.equal('cake-network');
                transactions[1].channelName.should.equal('channelTwo');
                transactions[1].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                transactions[1].contractName.should.equal('my-contract');

                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });
        });
    });

    describe('refresh', () => {

        beforeEach(async () => {
            await ExtensionUtil.activateExtension();
        });

        afterEach(() => {
            mySandBox.restore();
        });

        it('should test the tree is refreshed when the refresh command is run', async () => {

            const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = ExtensionUtil.getBlockchainGatewayExplorerProvider();

            const onDidChangeTreeDataSpy: sinon.SinonSpy = mySandBox.spy(blockchainGatewayExplorerProvider['_onDidChangeTreeData'], 'fire');

            await vscode.commands.executeCommand(ExtensionCommands.REFRESH_GATEWAYS);

            onDidChangeTreeDataSpy.should.have.been.called;
        });

        it('should test the tree is refreshed when the refresh command is run', async () => {

            const mockTreeItem: sinon.SinonStubbedInstance<GatewayTreeItem> = mySandBox.createStubInstance(GatewayTreeItem);

            const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = ExtensionUtil.getBlockchainGatewayExplorerProvider();

            const onDidChangeTreeDataSpy: sinon.SinonSpy = mySandBox.spy(blockchainGatewayExplorerProvider['_onDidChangeTreeData'], 'fire');

            await vscode.commands.executeCommand(ExtensionCommands.REFRESH_GATEWAYS, mockTreeItem);

            onDidChangeTreeDataSpy.should.have.been.calledOnceWithExactly(mockTreeItem);
        });
    });

    describe('connect', () => {

        beforeEach(async () => {
            await ExtensionUtil.activateExtension();
        });

        afterEach(() => {
            mySandBox.restore();
        });

        it('should set the current client connection', async () => {

            const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = ExtensionUtil.getBlockchainGatewayExplorerProvider();

            const onDidChangeTreeDataSpy: sinon.SinonSpy = mySandBox.spy(blockchainGatewayExplorerProvider['_onDidChangeTreeData'], 'fire');

            const executeCommandSpy: sinon.SinonSpy = mySandBox.spy(vscode.commands, 'executeCommand');

            await blockchainGatewayExplorerProvider.connect();

            onDidChangeTreeDataSpy.should.have.been.called;

            executeCommandSpy.should.have.been.calledOnce;
            executeCommandSpy.getCall(0).should.have.been.calledWith('setContext', 'blockchain-gateway-connected', true);
        });
    });

    describe('disconnect', () => {

        beforeEach(async () => {
            await ExtensionUtil.activateExtension();
        });

        afterEach(() => {
            mySandBox.restore();
        });

        it('should disconnect the client connection', async () => {
            const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = ExtensionUtil.getBlockchainGatewayExplorerProvider();

            const onDidChangeTreeDataSpy: sinon.SinonSpy = mySandBox.spy(blockchainGatewayExplorerProvider['_onDidChangeTreeData'], 'fire');

            const executeCommandSpy: sinon.SinonSpy = mySandBox.spy(vscode.commands, 'executeCommand');

            await blockchainGatewayExplorerProvider.disconnect();

            onDidChangeTreeDataSpy.should.have.been.called;

            executeCommandSpy.should.have.been.calledOnce;
            executeCommandSpy.getCall(0).should.have.been.calledWith('setContext', 'blockchain-gateway-connected', false);
        });
    });

    describe('getTreeItem', () => {
        it('should get a tree item', async () => {
            const myGateway: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry({
                name: 'myGateway',
                associatedWallet: ''
            });

            await FabricEnvironmentRegistry.instance().clear();
            await FabricGatewayRegistry.instance().clear();
            await FabricGatewayRegistry.instance().add(myGateway);

            const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = ExtensionUtil.getBlockchainGatewayExplorerProvider();
            const allChildren: Array<BlockchainTreeItem> = await blockchainGatewayExplorerProvider.getChildren();
            const groupChildren: Array<BlockchainTreeItem>  = await blockchainGatewayExplorerProvider.getChildren(allChildren[0]);

            const result: GatewayTreeItem = blockchainGatewayExplorerProvider.getTreeItem(groupChildren[0]) as GatewayTreeItem;

            result.label.should.equal('myGateway');
        });
    });
});
