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
import * as path from 'path';

import { BlockchainTreeItem } from '../../extension/explorer/model/BlockchainTreeItem';
import { BlockchainEnvironmentExplorerProvider } from '../../extension/explorer/environmentExplorer';
import { ChannelTreeItem } from '../../extension/explorer/model/ChannelTreeItem';
import { PeerTreeItem } from '../../extension/explorer/runtimeOps/connectedTree/PeerTreeItem';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';
import { TestUtil } from '../TestUtil';
import { RuntimeTreeItem } from '../../extension/explorer/runtimeOps/disconnectedTree/RuntimeTreeItem';
import { LocalEnvironmentManager } from '../../extension/fabric/environments/LocalEnvironmentManager';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { NodesTreeItem } from '../../extension/explorer/runtimeOps/connectedTree/NodesTreeItem';
import { OrganizationsTreeItem } from '../../extension/explorer/runtimeOps/connectedTree/OrganizationsTreeItem';
import { OrgTreeItem } from '../../extension/explorer/runtimeOps/connectedTree/OrgTreeItem';
import { ExtensionCommands } from '../../ExtensionCommands';
import { MetadataUtil } from '../../extension/util/MetadataUtil';
import { CertificateAuthorityTreeItem } from '../../extension/explorer/runtimeOps/connectedTree/CertificateAuthorityTreeItem';
import { OrdererTreeItem } from '../../extension/explorer/runtimeOps/connectedTree/OrdererTreeItem';
import { FabricEnvironmentConnection } from 'ibm-blockchain-platform-environment-v1';
import { FabricEnvironmentManager, ConnectedState } from '../../extension/fabric/environments/FabricEnvironmentManager';
import { FabricEnvironmentRegistry, FabricEnvironmentRegistryEntry, FabricNode, FabricRuntimeUtil, LogType, EnvironmentType, FabricEnvironment, FabricInstalledSmartContract } from 'ibm-blockchain-platform-common';
import { EnvironmentConnectedTreeItem } from '../../extension/explorer/runtimeOps/connectedTree/EnvironmentConnectedTreeItem';
import { ImportNodesTreeItem } from '../../extension/explorer/runtimeOps/connectedTree/ImportNodesTreeItem';
import { LocalEnvironment } from '../../extension/fabric/environments/LocalEnvironment';
import { ManagedAnsibleEnvironmentManager } from '../../extension/fabric/environments/ManagedAnsibleEnvironmentManager';
import { CommittedContractTreeItem } from '../../extension/explorer/runtimeOps/connectedTree/CommittedSmartContractTreeItem';
import { DeployTreeItem } from '../../extension/explorer/runtimeOps/connectedTree/DeployTreeItem';
import { EnvironmentGroupTreeItem } from '../../extension/explorer/runtimeOps/EnvironmentGroupTreeItem';

chai.use(sinonChai);
const should: Chai.Should = chai.should();

// tslint:disable no-unused-expression
describe('environmentExplorer', () => {
    let mySandBox: sinon.SinonSandbox;

    before(async () => {
        mySandBox = sinon.createSandbox();
        await TestUtil.setupTests(mySandBox);
    });

    after(() => {
        mySandBox.restore();
    });

    describe('getChildren', () => {
        describe('unconnected tree', () => {
            let executeCommandSpy: sinon.SinonSpy;
            let logSpy: sinon.SinonSpy;

            beforeEach(async () => {
                mySandBox.stub(FabricEnvironmentManager.instance(), 'getConnection').returns(undefined);

                logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');

                executeCommandSpy = mySandBox.spy(vscode.commands, 'executeCommand');
            });

            afterEach(() => {
                mySandBox.restore();
            });

            it('should correctly group local environments', async () => {
                await FabricEnvironmentRegistry.instance().clear();

                await TestUtil.setupLocalFabric();

                const mockRuntime: sinon.SinonStubbedInstance<LocalEnvironment> = mySandBox.createStubInstance(LocalEnvironment);
                mySandBox.stub(LocalEnvironmentManager.instance(), 'getRuntime').returns(mockRuntime);
                mockRuntime.isRunning.resolves(false);
                mockRuntime.startLogs.resolves();
                mockRuntime.getName.returns(FabricRuntimeUtil.LOCAL_FABRIC);

                const blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();
                const allChildren: BlockchainTreeItem[] = await blockchainRuntimeExplorerProvider.getChildren();

                allChildren.length.should.equal(1);
                allChildren[0].label.should.equal('Simple local networks');
                allChildren[0].tooltip.should.equal('Simple local networks');
                allChildren[0].contextValue.should.equal('blockchain-environment-group-item');

                const localEnvItems: BlockchainTreeItem[] = await blockchainRuntimeExplorerProvider.getChildren(allChildren[0]);
                localEnvItems.length.should.equal(1);
                localEnvItems[0].label.should.equal(`${FabricRuntimeUtil.LOCAL_FABRIC}  ○ (click to start)`);
                localEnvItems[0].tooltip.should.equal('Creates a local development runtime using Hyperledger Fabric Docker images');
                localEnvItems[0].contextValue.should.equal('blockchain-runtime-item');

                executeCommandSpy.should.have.been.calledWith('setContext', 'blockchain-runtime-connected', false);
            });

            it ('should correctly group ibm cloud environments', async () => {

                const opsToolsEnv: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
                opsToolsEnv.name = 'opsToolsEnv';
                opsToolsEnv.environmentType = EnvironmentType.OPS_TOOLS_ENVIRONMENT;

                const saasEnv: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
                saasEnv.name = 'saasEnv';
                saasEnv.environmentType = EnvironmentType.SAAS_OPS_TOOLS_ENVIRONMENT;

                await FabricEnvironmentRegistry.instance().clear();
                await FabricEnvironmentRegistry.instance().add(opsToolsEnv);
                await FabricEnvironmentRegistry.instance().add(saasEnv);

                const blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();
                const allChildren: BlockchainTreeItem[] = await blockchainRuntimeExplorerProvider.getChildren();

                allChildren.length.should.equal(1);
                allChildren[0].label.should.equal('IBM Cloud');
                allChildren[0].tooltip.should.equal('IBM Cloud');
                allChildren[0].contextValue.should.equal('blockchain-environment-group-item');

                const ibmCloudItems: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(allChildren[0]);
                ibmCloudItems.length.should.equal(2);
                ibmCloudItems[0].label.should.equal(opsToolsEnv.name);
                ibmCloudItems[0].tooltip.should.equal(opsToolsEnv.name);
                ibmCloudItems[0].contextValue.should.equal('blockchain-environment-item');
                ibmCloudItems[1].label.should.equal(saasEnv.name);
                ibmCloudItems[1].tooltip.should.equal(saasEnv.name);
                ibmCloudItems[1].contextValue.should.equal('blockchain-environment-item');
            });

            it(`should correctly group 'other' environments`, async () => {
                const otherEnvOne: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
                otherEnvOne.name = 'myFabric';
                otherEnvOne.managedRuntime = false;

                const otherEnvTwo: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
                otherEnvTwo.name = 'myFabric2';
                otherEnvTwo.environmentType = EnvironmentType.ENVIRONMENT;
                otherEnvTwo.managedRuntime = false;

                const managedAnsible: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
                managedAnsible.name = 'managedAnsible';
                managedAnsible.environmentType = EnvironmentType.ANSIBLE_ENVIRONMENT;
                managedAnsible.managedRuntime = true;
                managedAnsible.environmentDirectory = path.join(__dirname, '..', '..', 'data', 'managedAnsible');

                await FabricEnvironmentRegistry.instance().clear();
                await FabricEnvironmentRegistry.instance().add(otherEnvOne);
                await FabricEnvironmentRegistry.instance().add(otherEnvTwo);
                await FabricEnvironmentRegistry.instance().add(managedAnsible);

                const blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();
                const allChildren: BlockchainTreeItem[] = await blockchainRuntimeExplorerProvider.getChildren();

                allChildren.length.should.equal(1);
                allChildren[0].label.should.equal('Other networks');
                allChildren[0].tooltip.should.equal('Other networks');
                allChildren[0].contextValue.should.equal('blockchain-environment-group-item');

                const otherItems: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(allChildren[0]);
                otherItems.length.should.equal(3);
                otherItems[0].label.should.equal(`${managedAnsible.name}  ○ (click to start)`);
                otherItems[0].tooltip.should.equal(`Creates a local development runtime using Hyperledger Fabric Docker images`);
                otherItems[0].contextValue.should.equal('blockchain-runtime-item');
                otherItems[1].label.should.equal(otherEnvOne.name);
                otherItems[1].tooltip.should.equal(otherEnvOne.name);
                otherItems[1].contextValue.should.equal('blockchain-environment-item');
                otherItems[2].label.should.equal(otherEnvTwo.name);
                otherItems[2].tooltip.should.equal(otherEnvTwo.name);
                otherItems[2].contextValue.should.equal('blockchain-environment-item');
            });

            it('should correctly display all types of groups', async () => {
                const ensureRuntimeLocalSpy: sinon.SinonSpy = mySandBox.spy(LocalEnvironmentManager.instance(), 'ensureRuntime');
                const ensureRuntimeManagedSpy: sinon.SinonSpy = mySandBox.spy(ManagedAnsibleEnvironmentManager.instance(), 'ensureRuntime');

                const localFabricEnv: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
                localFabricEnv.name = 'localFabricEnv';
                localFabricEnv.environmentType = EnvironmentType.LOCAL_ENVIRONMENT;

                const registryEntryOne: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
                registryEntryOne.name = 'myFabric';
                registryEntryOne.managedRuntime = false;

                const registryEntryTwo: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
                registryEntryTwo.name = 'myFabric2';
                registryEntryTwo.managedRuntime = false;

                const managedAnsible: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
                managedAnsible.name = 'managedAnsible';
                managedAnsible.environmentType = EnvironmentType.ANSIBLE_ENVIRONMENT;
                managedAnsible.managedRuntime = true;
                managedAnsible.environmentDirectory = path.join(__dirname, '..', '..', 'data', 'managedAnsible');

                const opsToolsEnv: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
                opsToolsEnv.name = 'opsToolsEnv';
                opsToolsEnv.environmentType = EnvironmentType.OPS_TOOLS_ENVIRONMENT;

                const saasEnv: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
                saasEnv.name = 'saasEnv';
                saasEnv.environmentType = EnvironmentType.SAAS_OPS_TOOLS_ENVIRONMENT;

                await FabricEnvironmentRegistry.instance().clear();
                await FabricEnvironmentRegistry.instance().add(localFabricEnv);
                await FabricEnvironmentRegistry.instance().add(registryEntryOne);
                await FabricEnvironmentRegistry.instance().add(registryEntryTwo);
                await FabricEnvironmentRegistry.instance().add(managedAnsible);
                await FabricEnvironmentRegistry.instance().add(opsToolsEnv);
                await FabricEnvironmentRegistry.instance().add(saasEnv);

                await TestUtil.setupLocalFabric();

                const mockRuntime: sinon.SinonStubbedInstance<LocalEnvironment> = mySandBox.createStubInstance(LocalEnvironment);
                mySandBox.stub(LocalEnvironmentManager.instance(), 'getRuntime').returns(mockRuntime);
                mockRuntime.isRunning.resolves(false);
                mockRuntime.startLogs.resolves();
                mockRuntime.getName.returns(FabricRuntimeUtil.LOCAL_FABRIC);

                const blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();
                const allChildren: BlockchainTreeItem[] = await blockchainRuntimeExplorerProvider.getChildren();

                allChildren.length.should.equal(3);
                allChildren[0].label.should.equal('Simple local networks');
                allChildren[0].tooltip.should.equal('Simple local networks');
                allChildren[0].contextValue.should.equal('blockchain-environment-group-item');
                allChildren[1].label.should.equal('IBM Cloud');
                allChildren[1].tooltip.should.equal('IBM Cloud');
                allChildren[1].contextValue.should.equal('blockchain-environment-group-item');
                allChildren[2].label.should.equal('Other networks');
                allChildren[2].tooltip.should.equal('Other networks');
                allChildren[2].contextValue.should.equal('blockchain-environment-group-item');

                const localEnvItems: BlockchainTreeItem[] = await blockchainRuntimeExplorerProvider.getChildren(allChildren[0]);
                localEnvItems.length.should.equal(2);
                localEnvItems[0].label.should.equal(`${FabricRuntimeUtil.LOCAL_FABRIC}  ○ (click to start)`);
                localEnvItems[0].tooltip.should.equal('Creates a local development runtime using Hyperledger Fabric Docker images');
                localEnvItems[0].contextValue.should.equal('blockchain-runtime-item');
                localEnvItems[1].label.should.equal(localFabricEnv.name);
                localEnvItems[1].tooltip.should.equal(localFabricEnv.name);
                localEnvItems[1].contextValue.should.equal('blockchain-environment-item');

                const opsToolsItems: BlockchainTreeItem[] = await blockchainRuntimeExplorerProvider.getChildren(allChildren[1]);
                opsToolsItems.length.should.equal(2);
                opsToolsItems[0].label.should.equal(opsToolsEnv.name);
                opsToolsItems[0].tooltip.should.equal(opsToolsEnv.name);
                opsToolsItems[0].contextValue.should.equal('blockchain-environment-item');
                opsToolsItems[1].label.should.equal(saasEnv.name);
                opsToolsItems[1].tooltip.should.equal(saasEnv.name);
                opsToolsItems[1].contextValue.should.equal('blockchain-environment-item');

                const otherItems: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(allChildren[2]);
                otherItems.length.should.equal(3);
                otherItems[0].label.should.equal(`${managedAnsible.name}  ○ (click to start)`);
                otherItems[0].tooltip.should.equal(`Creates a local development runtime using Hyperledger Fabric Docker images`);
                otherItems[0].contextValue.should.equal('blockchain-runtime-item');
                otherItems[1].label.should.equal(registryEntryOne.name);
                otherItems[1].tooltip.should.equal(registryEntryOne.name);
                otherItems[1].contextValue.should.equal('blockchain-environment-item');
                otherItems[2].label.should.equal(registryEntryTwo.name);
                otherItems[2].tooltip.should.equal(registryEntryTwo.name);
                otherItems[2].contextValue.should.equal('blockchain-environment-item');

                executeCommandSpy.should.have.been.calledWith('setContext', 'blockchain-runtime-connected', false);
                executeCommandSpy.should.have.been.calledWith('setContext', 'blockchain-environment-connected', false);
                executeCommandSpy.should.have.been.calledWith('setContext', 'blockchain-ansible-connected', false);

                ensureRuntimeLocalSpy.should.have.been.calledOnce;
                ensureRuntimeManagedSpy.should.have.been.calledOnce;
            });

            it('should get correct context value for running local runtime', async () => {
                const ensureRuntimeLocalSpy: sinon.SinonSpy = mySandBox.spy(LocalEnvironmentManager.instance(), 'ensureRuntime');
                const ensureRuntimeManagedSpy: sinon.SinonSpy = mySandBox.spy(ManagedAnsibleEnvironmentManager.instance(), 'ensureRuntime');

                await FabricEnvironmentRegistry.instance().clear();

                await TestUtil.setupLocalFabric();

                const mockRuntime: sinon.SinonStubbedInstance<LocalEnvironment> = mySandBox.createStubInstance(LocalEnvironment);
                mySandBox.stub(LocalEnvironmentManager.instance(), 'getRuntime').returns(mockRuntime);
                mockRuntime.isRunning.resolves(true);
                mockRuntime.startLogs.resolves();
                mockRuntime.getName.returns(FabricRuntimeUtil.LOCAL_FABRIC);

                const blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();
                const allChildren: BlockchainTreeItem[] = await blockchainRuntimeExplorerProvider.getChildren();
                const simpleLocalNetworkItems: BlockchainTreeItem[] = await blockchainRuntimeExplorerProvider.getChildren(allChildren[0]);

                simpleLocalNetworkItems.length.should.equal(1);
                simpleLocalNetworkItems[0].label.should.equal(`${FabricRuntimeUtil.LOCAL_FABRIC}  ●`);
                simpleLocalNetworkItems[0].tooltip.should.equal('The local development runtime is running');
                simpleLocalNetworkItems[0].contextValue.should.equal('blockchain-runtime-item-running');

                executeCommandSpy.should.have.been.calledWith('setContext', 'blockchain-runtime-connected', false);
                executeCommandSpy.should.have.been.calledWith('setContext', 'blockchain-environment-connected', false);
                executeCommandSpy.should.have.been.calledWith('setContext', 'blockchain-ansible-connected', false);

                ensureRuntimeLocalSpy.should.have.been.calledOnce;
                ensureRuntimeManagedSpy.should.not.have.been.called;
            });

            it('should say that there are no environments', async () => {
                await FabricEnvironmentRegistry.instance().clear();
                const blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();
                const environments: BlockchainTreeItem[] = await blockchainRuntimeExplorerProvider.getChildren();
                environments.length.should.equal(1);
                environments[0].label.should.equal(`Click + to add environments`);
                environments[0].command.should.deep.equal({
                    command: ExtensionCommands.ADD_ENVIRONMENT,
                    title: '',
                    arguments: []
                });
            });

            it('should handle errors populating the tree with runtimeTreeItems', async () => {
                const registryEntryOne: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
                registryEntryOne.name = 'myFabric';
                registryEntryOne.managedRuntime = false;

                await FabricEnvironmentRegistry.instance().clear();
                await TestUtil.setupLocalFabric();

                const error: Error = new Error('some error');
                mySandBox.stub(RuntimeTreeItem, 'newRuntimeTreeItem').rejects(error);

                const blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();
                const allChildren: BlockchainTreeItem[] = await blockchainRuntimeExplorerProvider.getChildren();
                await blockchainRuntimeExplorerProvider.getChildren(allChildren[0]);

                logSpy.should.have.been.calledWith(LogType.ERROR, `Error populating Fabric Environment Panel: ${error.message}`, `Error populating Fabric Environment Panel: ${error.toString()}`);
            });

        });

        describe('connecting tree', () => {

            let getConnectionStub: sinon.SinonStub;
            let environmentRegistryStub: sinon.SinonStub;
            let fabricConnection: sinon.SinonStubbedInstance<FabricEnvironmentConnection>;
            let getStateStub: sinon.SinonStub;
            let logSpy: sinon.SinonSpy;
            let commandStub: sinon.SinonStub;

            beforeEach(async () => {
                getConnectionStub = mySandBox.stub(FabricEnvironmentManager.instance(), 'getConnection');
                fabricConnection = mySandBox.createStubInstance(FabricEnvironmentConnection);
                getConnectionStub.returns((fabricConnection as any) as FabricEnvironmentConnection);

                const map: Map<string, Array<string>> = new Map<string, Array<string>>();
                map.set('channelOne', ['peerOne']);
                map.set('channelTwo', ['peerOne', 'peerTwo']);
                fabricConnection.createChannelMap.resolves(map);

                fabricConnection.getCommittedSmartContractDefinitions.withArgs(['peerOne'], 'channelOne').resolves([{
                    name: 'biscuit-network',
                    version: '0.7'
                }]);
                fabricConnection.getCommittedSmartContractDefinitions.withArgs(['peerOne', 'peerTwo'], 'channelTwo').resolves([
                    {
                        name: 'biscuit-network',
                        version: '0.7'
                    }, {
                        name: 'cake-network',
                        version: '0.10'
                    }, {
                        name: 'legacy-network',
                        version: '2.34'
                    }]);

                const environmentRegistry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
                environmentRegistry.name = FabricRuntimeUtil.LOCAL_FABRIC;
                environmentRegistry.managedRuntime = true;
                environmentRegistry.environmentType = EnvironmentType.LOCAL_ENVIRONMENT;

                environmentRegistryStub = mySandBox.stub(FabricEnvironmentManager.instance(), 'getEnvironmentRegistryEntry');
                environmentRegistryStub.returns(environmentRegistry);

                getStateStub = mySandBox.stub(FabricEnvironmentManager.instance(), 'getState');

                logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');

                commandStub = mySandBox.stub(vscode.commands, 'executeCommand');

                await ExtensionUtil.activateExtension();
            });

            afterEach(() => {
                mySandBox.restore();
            });

            it('should display setup tree if not setup', async () => {
                getStateStub.returns(ConnectedState.SETUP);

                const peerNode: FabricNode = FabricNode.newPeer('peer1', 'peer1.org1.example.com', 'http://peer.sample.org', undefined, undefined, undefined);
                const ordererNode: FabricNode = FabricNode.newOrderer('orderer', 'orderer.example.com', 'http://orderer.sample.org', undefined, undefined, undefined, undefined);
                const caNode: FabricNode = FabricNode.newCertificateAuthority('ca1', 'ca1.org1.example.com', 'http://ca.sample.org', undefined, undefined, undefined, undefined, undefined, undefined);

                mySandBox.stub(FabricEnvironment.prototype, 'getNodes').resolves([peerNode, ordererNode, caNode]);

                const environmentRegistry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
                environmentRegistry.name = 'myEnvironment';
                environmentRegistry.managedRuntime = false;

                environmentRegistryStub.returns(environmentRegistry);

                const blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();
                const children: BlockchainTreeItem[] = await blockchainRuntimeExplorerProvider.getChildren();

                commandStub.should.have.been.calledWith('setContext', 'blockchain-environment-setup', true);

                children.length.should.equal(5);
                children[0].label.should.equal(`Setting up: ${environmentRegistry.name}`);
                children[1].label.should.equal(`(Click each node to perform setup)`);
                children[2].label.should.equal('peer1.org1.example.com   ⚠');
                children[2].command.command.should.equal(ExtensionCommands.ASSOCIATE_IDENTITY_NODE);
                children[2].command.arguments.should.deep.equal([environmentRegistry, peerNode]);
                children[2].tooltip.should.equal(peerNode.name);
                children[3].label.should.equal('orderer.example.com   ⚠');
                children[3].command.command.should.equal(ExtensionCommands.ASSOCIATE_IDENTITY_NODE);
                children[3].command.arguments.should.deep.equal([environmentRegistry, ordererNode]);
                children[3].tooltip.should.equal(ordererNode.name);
                children[4].label.should.equal('ca1.org1.example.com   ⚠');
                children[4].command.command.should.equal(ExtensionCommands.ASSOCIATE_IDENTITY_NODE);
                children[4].command.arguments.should.deep.equal([environmentRegistry, caNode]);
                children[4].tooltip.should.equal(caNode.name);
            });

            it('should display setup tree if not setup with orderer cluster name', async () => {
                getStateStub.returns(ConnectedState.SETUP);

                const peerNode: FabricNode = FabricNode.newPeer('peer1', 'peer1.org1.example.com', 'http://peer.sample.org', undefined, undefined, undefined);
                const ordererNode: FabricNode = FabricNode.newOrderer('orderer', 'orderer.example.com', 'http://orderer.sample.org', undefined, undefined, undefined, 'Ordering Service');
                const ordererNode1: FabricNode = FabricNode.newOrderer('orderer1', 'orderer1.example.com', 'http://orderer.sample.org', undefined, undefined, undefined, 'Ordering Service');

                const caNode: FabricNode = FabricNode.newCertificateAuthority('ca1', 'ca1.org1.example.com', 'http://ca.sample.org', undefined, undefined, undefined, undefined, undefined, undefined);

                mySandBox.stub(FabricEnvironment.prototype, 'getNodes').resolves([peerNode, ordererNode, ordererNode1, caNode]);

                const environmentRegistry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
                environmentRegistry.name = 'myEnvironment';
                environmentRegistry.managedRuntime = false;

                environmentRegistryStub.returns(environmentRegistry);

                const blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();
                const children: BlockchainTreeItem[] = await blockchainRuntimeExplorerProvider.getChildren();

                commandStub.should.have.been.calledWith('setContext', 'blockchain-environment-setup', true);
                should.not.exist(blockchainRuntimeExplorerProvider['fabricEnvironmentToSetUp']);

                children.length.should.equal(5);
                children[0].label.should.equal(`Setting up: ${environmentRegistry.name}`);
                children[1].label.should.equal(`(Click each node to perform setup)`);
                children[2].label.should.equal('peer1.org1.example.com   ⚠');
                children[2].command.command.should.equal(ExtensionCommands.ASSOCIATE_IDENTITY_NODE);
                children[2].command.arguments.should.deep.equal([environmentRegistry, peerNode]);
                children[2].tooltip.should.equal(peerNode.name);
                children[3].label.should.equal('Ordering Service   ⚠');
                children[3].command.command.should.equal(ExtensionCommands.ASSOCIATE_IDENTITY_NODE);
                children[3].command.arguments.should.deep.equal([environmentRegistry, ordererNode]);
                children[3].tooltip.should.equal(ordererNode.cluster_name);
                children[4].label.should.equal('ca1.org1.example.com   ⚠');
                children[4].command.command.should.equal(ExtensionCommands.ASSOCIATE_IDENTITY_NODE);
                children[4].command.arguments.should.deep.equal([environmentRegistry, caNode]);
                children[4].tooltip.should.equal(caNode.name);
            });

            it('should display setup tree with multiple ordering services', async () => {
                getStateStub.returns(ConnectedState.SETUP);

                const peerNode: FabricNode = FabricNode.newPeer('peer1', 'peer1.org1.example.com', 'http://peer.sample.org', undefined, undefined, undefined);
                const peerNode2: FabricNode = FabricNode.newPeer('peer2', 'peer2.org1.example.com', 'http://peer.sample.org', 'some wallet', 'some identity', undefined);
                const ordererNode: FabricNode = FabricNode.newOrderer('orderer', 'orderer.example.com', 'http://orderer.sample.org', 'some wallet', undefined, undefined, 'Ordering Service');
                const ordererNode1: FabricNode = FabricNode.newOrderer('orderer1', 'orderer1.example.com', 'http://orderer.sample.org', 'some wallet', undefined, undefined, 'Ordering Service');
                const ordererNode2: FabricNode = FabricNode.newOrderer('orderer2', 'orderer2.example.com', 'http://orderer.sample.org', undefined, 'some identity', undefined, 'Another Ordering Service');
                const ordererNode3: FabricNode = FabricNode.newOrderer('orderer3', 'orderer3.example.com', 'http://orderer.sample.org', undefined, 'some identity', undefined, 'Another Ordering Service');

                const caNode: FabricNode = FabricNode.newCertificateAuthority('ca1', 'ca1.org1.example.com', 'http://ca.sample.org', undefined, undefined, undefined, undefined, undefined, undefined);

                mySandBox.stub(FabricEnvironment.prototype, 'getNodes').resolves([peerNode, peerNode2, ordererNode, ordererNode1, ordererNode2, ordererNode3, caNode]);

                const environmentRegistry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
                environmentRegistry.name = 'myEnvironment';
                environmentRegistry.managedRuntime = false;

                environmentRegistryStub.returns(environmentRegistry);

                const blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();
                const children: BlockchainTreeItem[] = await blockchainRuntimeExplorerProvider.getChildren();

                commandStub.should.have.been.calledWith('setContext', 'blockchain-environment-setup', true);
                should.not.exist(blockchainRuntimeExplorerProvider['fabricEnvironmentToSetUp']);

                children.length.should.equal(7);
                children[0].label.should.equal(`Setting up: ${environmentRegistry.name}`);
                children[1].label.should.equal(`(Click each node to perform setup)`);
                children[2].label.should.equal('peer1.org1.example.com   ⚠');
                children[2].command.command.should.equal(ExtensionCommands.ASSOCIATE_IDENTITY_NODE);
                children[2].command.arguments.should.deep.equal([environmentRegistry, peerNode]);
                children[2].tooltip.should.equal(peerNode.name);
                children[3].label.should.equal('peer2.org1.example.com');
                children[3].command.command.should.equal(ExtensionCommands.ASSOCIATE_IDENTITY_NODE);
                children[3].command.arguments.should.deep.equal([environmentRegistry, peerNode2]);
                children[3].tooltip.should.equal(peerNode2.name);
                children[4].label.should.equal('Ordering Service   ⚠');
                children[4].command.command.should.equal(ExtensionCommands.ASSOCIATE_IDENTITY_NODE);
                children[4].command.arguments.should.deep.equal([environmentRegistry, ordererNode]);
                children[4].tooltip.should.equal(ordererNode.cluster_name);
                children[5].label.should.equal('Another Ordering Service   ⚠');
                children[5].command.command.should.equal(ExtensionCommands.ASSOCIATE_IDENTITY_NODE);
                children[5].command.arguments.should.deep.equal([environmentRegistry, ordererNode2]);
                children[5].tooltip.should.equal(ordererNode2.cluster_name);
                children[6].label.should.equal('ca1.org1.example.com   ⚠');
                children[6].command.command.should.equal(ExtensionCommands.ASSOCIATE_IDENTITY_NODE);
                children[6].command.arguments.should.deep.equal([environmentRegistry, caNode]);
                children[6].tooltip.should.equal(caNode.name);
            });

            it('should error if gRPC cant connect to Fabric', async () => {
                getStateStub.returns(ConnectedState.CONNECTED);

                fabricConnection.getAllPeerNames.returns(['peerOne']);
                const error: Error = new Error('Cannot connect to Fabric: Received http2 header with status: 503');
                fabricConnection.createChannelMap.rejects(error);
                const blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();
                await blockchainRuntimeExplorerProvider.getChildren();

                logSpy.should.have.been.calledOnceWith(LogType.ERROR, `Error populating channel view: ${error.message}`, `Error populating channel view: ${error.toString()}`);
            });

            it('should error if getAllChannelsForPeer errors with message when populating channels view', async () => {
                getStateStub.returns(ConnectedState.CONNECTED);

                fabricConnection.getAllPeerNames.returns(['peerOne']);
                const error: Error = new Error('Error creating channel map: some error');
                fabricConnection.createChannelMap.rejects(error);

                const blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();
                await blockchainRuntimeExplorerProvider.getChildren();

                logSpy.should.have.been.calledOnceWith(LogType.ERROR, `Error populating channel view: ${error.message}`, `Error populating channel view: ${error.toString()}`);
            });

            it('should error if populating nodes view fails', async () => {
                getStateStub.returns(ConnectedState.CONNECTED);

                fabricConnection.getAllPeerNames.throws({ message: 'some error' });

                const blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();
                const allChildren: BlockchainTreeItem[] = await blockchainRuntimeExplorerProvider.getChildren();
                await blockchainRuntimeExplorerProvider.getChildren(allChildren[allChildren.length - 2]);

                logSpy.should.have.been.calledOnceWith(LogType.ERROR, 'Error populating nodes view: some error');
            });
        });

        describe('connected tree', () => {

            let allChildren: Array<BlockchainTreeItem>;
            let blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider;
            let fabricConnection: sinon.SinonStubbedInstance<FabricEnvironmentConnection>;
            let logSpy: sinon.SinonSpy;
            let executeCommandStub: sinon.SinonStub;
            let environmentStub: sinon.SinonStub;
            let connectedStateStub: sinon.SinonStub;
            let environmentRegistry: FabricEnvironmentRegistryEntry;

            beforeEach(async () => {

                logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');

                await ExtensionUtil.activateExtension();

                connectedStateStub = mySandBox.stub(FabricEnvironmentManager.instance(), 'getState').returns(ConnectedState.CONNECTED);

                executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand');
                executeCommandStub.callThrough();

                fabricConnection = mySandBox.createStubInstance(FabricEnvironmentConnection);

                fabricConnection.getAllPeerNames.returns(['peerOne', 'peerTwo']);

                const installedChaincodeMapOne: FabricInstalledSmartContract[] = [{ label: 'sample-car-network', packageId: '1.0' }, { label: 'sample-car-network', packageId: '1.2' }, { label: 'sample-food-network', packageId: '0.6' }];

                fabricConnection.getInstalledSmartContracts.withArgs('peerOne').returns(installedChaincodeMapOne);

                const installedChaincodeMapTwo: FabricInstalledSmartContract[] = [{ label: 'biscuit-network', packageId: '0.7' }, { label: 'sample-food-network', packageId: '0.6' }];

                fabricConnection.getInstalledSmartContracts.withArgs('peerTwo').returns(installedChaincodeMapTwo);

                fabricConnection.getCommittedSmartContractDefinitions.withArgs(['peerOne'], 'channelOne').resolves([{
                    name: 'biscuit-network',
                    version: '0.7'
                }]);
                fabricConnection.getCommittedSmartContractDefinitions.withArgs(['peerOne', 'peerTwo'], 'channelTwo').resolves([
                    {
                        name: 'biscuit-network',
                        version: '0.7'
                    }, {
                        name: 'cake-network',
                        version: '0.10'
                    }, {
                        name: 'legacy-network',
                        version: '2.34'
                    }]);

                fabricConnection.getCommittedSmartContractDefinitions.withArgs(['peerOne'], 'channelThree').resolves([]);

                fabricConnection.getAllOrganizationNames.returns(['Org1', 'Org2']);

                fabricConnection.getAllOrdererNames.returns(['orderer1', 'orderer2']);

                const map: Map<string, Array<string>> = new Map<string, Array<string>>();
                map.set('channelOne', ['peerOne']);
                map.set('channelTwo', ['peerOne', 'peerTwo']);
                map.set('channelThree', ['peerOne']);
                fabricConnection.createChannelMap.resolves(map);

                environmentRegistry = new FabricEnvironmentRegistryEntry();
                environmentRegistry.name = FabricRuntimeUtil.LOCAL_FABRIC;
                environmentRegistry.managedRuntime = true;
                environmentRegistry.environmentType = EnvironmentType.LOCAL_ENVIRONMENT;

                environmentStub = mySandBox.stub(FabricEnvironmentManager.instance(), 'getEnvironmentRegistryEntry').returns(environmentRegistry);

                blockchainRuntimeExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();
                const fabricRuntimeManager: LocalEnvironmentManager = LocalEnvironmentManager.instance();
                mySandBox.stub(FabricEnvironmentManager.instance(), 'getConnection').returns((fabricConnection as any) as FabricEnvironmentConnection);
                mySandBox.stub(fabricRuntimeManager.getRuntime(FabricRuntimeUtil.LOCAL_FABRIC), 'isRunning').resolves(true);
                allChildren = await blockchainRuntimeExplorerProvider.getChildren();

                const getTransactionNamesStub: sinon.SinonStub = mySandBox.stub(MetadataUtil, 'getTransactionNames');
                getTransactionNamesStub.withArgs(sinon.match.any, 'biscuit-network', sinon.match.any).resolves(new Map<string, string[]>());
                getTransactionNamesStub.withArgs(sinon.match.any, 'cake-network', sinon.match.any).resolves(new Map<string, string[]>());
                getTransactionNamesStub.withArgs(sinon.match.any, 'legacy-network', sinon.match.any).resolves(null);
            });

            afterEach(() => {
                mySandBox.restore();
            });

            it('should create a connected tree if there is a connection', async () => {

                allChildren.length.should.equal(6);

                const connectedTo: EnvironmentConnectedTreeItem = allChildren[0] as EnvironmentConnectedTreeItem;
                connectedTo.label.should.equal(`Connected to environment: ${FabricRuntimeUtil.LOCAL_FABRIC}`);

                const channelOne: ChannelTreeItem = allChildren[1] as ChannelTreeItem;
                channelOne.tooltip.should.equal('Associated peers: peerOne');
                channelOne.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                channelOne.contextValue.should.equal('blockchain-channel-item');
                channelOne.label.should.equal('channelOne');

                const channelTwo: ChannelTreeItem = allChildren[2] as ChannelTreeItem;
                channelTwo.tooltip.should.equal('Associated peers: peerOne, peerTwo');
                channelTwo.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                channelTwo.contextValue.should.equal('blockchain-channel-item');
                channelTwo.label.should.equal('channelTwo');

                const channelThree: ChannelTreeItem = allChildren[3] as ChannelTreeItem;
                channelThree.tooltip.should.equal('Associated peers: peerOne');
                channelThree.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                channelThree.contextValue.should.equal('blockchain-channel-item');
                channelThree.label.should.equal('channelThree');

                const nodes: NodesTreeItem = allChildren[4] as NodesTreeItem;
                nodes.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                nodes.contextValue.should.equal('blockchain-runtime-nodes-item');
                nodes.label.should.equal('Nodes');

                const orgs: OrganizationsTreeItem = allChildren[5] as OrganizationsTreeItem;
                orgs.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Collapsed);
                orgs.contextValue.should.equal('blockchain-runtime-organizations-item');
                orgs.label.should.equal('Organizations');

                executeCommandStub.should.have.been.calledWith('setContext', 'blockchain-runtime-connected', true);
                executeCommandStub.should.have.been.calledWith('setContext', 'blockchain-environment-connected', true);
                executeCommandStub.should.have.been.calledWith('setContext', 'blockchain-ansible-connected', true);
            });

            it('should set correct context if not local runtime and not ansible', async () => {
                const otherEnvironmentRegistry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
                otherEnvironmentRegistry.name = 'myFabric';
                otherEnvironmentRegistry.managedRuntime = false;
                otherEnvironmentRegistry.environmentType = EnvironmentType.ENVIRONMENT;

                environmentStub.returns(otherEnvironmentRegistry);

                allChildren = await blockchainRuntimeExplorerProvider.getChildren();

                const connectedTo: EnvironmentConnectedTreeItem = allChildren[0] as EnvironmentConnectedTreeItem;
                connectedTo.label.should.equal(`Connected to environment: myFabric`);

                executeCommandStub.should.have.been.calledWith('setContext', 'blockchain-environment-connected', true);
                executeCommandStub.should.have.been.calledWith('setContext', 'blockchain-runtime-connected', false);
                executeCommandStub.should.have.been.calledWith('setContext', 'blockchain-ansible-connected', false);
            });

            it('should set correct context if ansible', async () => {
                const otherEnvironmentRegistry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
                otherEnvironmentRegistry.name = 'myAnsibleFabric';
                otherEnvironmentRegistry.managedRuntime = false;
                otherEnvironmentRegistry.environmentType = EnvironmentType.ANSIBLE_ENVIRONMENT;

                environmentStub.returns(otherEnvironmentRegistry);

                allChildren = await blockchainRuntimeExplorerProvider.getChildren();

                const connectedTo: EnvironmentConnectedTreeItem = allChildren[0] as EnvironmentConnectedTreeItem;
                connectedTo.label.should.equal(`Connected to environment: myAnsibleFabric`);

                executeCommandStub.should.have.been.calledWith('setContext', 'blockchain-environment-connected', true);
                executeCommandStub.should.have.been.calledWith('setContext', 'blockchain-runtime-connected', false);
                executeCommandStub.should.have.been.calledWith('setContext', 'blockchain-ansible-connected', true);
            });

            it('should show the committed smart contracts', async () => {
                allChildren = await blockchainRuntimeExplorerProvider.getChildren();
                allChildren.length.should.equal(6);

                const smartContractsChannelOne: Array<CommittedContractTreeItem | DeployTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(allChildren[1]);

                smartContractsChannelOne.length.should.equal(2);

                smartContractsChannelOne[0].label.should.equal('biscuit-network@0.7');
                smartContractsChannelOne[0].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                smartContractsChannelOne[0].tooltip.should.equal('biscuit-network@0.7');

                smartContractsChannelOne[1].label.should.equal('+ Deploy smart contract');
                smartContractsChannelOne[1].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                smartContractsChannelOne[1].tooltip.should.equal('+ Deploy smart contract');
                smartContractsChannelOne[1].command.command.should.equal(ExtensionCommands.OPEN_DEPLOY_PAGE);
                smartContractsChannelOne[1].command.arguments.should.deep.equal([environmentRegistry, 'channelOne']);

                const smartContractsChannelTwo: Array<CommittedContractTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(allChildren[2]);

                smartContractsChannelTwo.length.should.equal(4);

                smartContractsChannelTwo[0].label.should.equal('biscuit-network@0.7');
                smartContractsChannelTwo[0].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                smartContractsChannelTwo[0].tooltip.should.equal('biscuit-network@0.7');

                smartContractsChannelTwo[1].label.should.equal('cake-network@0.10');
                smartContractsChannelTwo[1].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                smartContractsChannelTwo[1].tooltip.should.equal('cake-network@0.10');

                smartContractsChannelTwo[2].label.should.equal('legacy-network@2.34');
                smartContractsChannelTwo[2].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                smartContractsChannelTwo[2].tooltip.should.equal('legacy-network@2.34');

                smartContractsChannelTwo[3].label.should.equal('+ Deploy smart contract');
                smartContractsChannelTwo[3].collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                smartContractsChannelTwo[3].tooltip.should.equal('+ Deploy smart contract');
                smartContractsChannelTwo[3].command.command.should.equal(ExtensionCommands.OPEN_DEPLOY_PAGE);
                smartContractsChannelTwo[3].command.arguments.should.deep.equal([environmentRegistry, 'channelTwo']);
            });

            it('should show peers, certificate authorities, and orderer nodes correctly', async () => {
                fabricConnection.getAllCertificateAuthorityNames.returns(['ca-name']);
                fabricConnection.getNode.withArgs('peerOne').returns(FabricNode.newPeer('peerOne', 'peerOne', 'grpc://localhost:7051', 'wallet', 'identity', 'Org1MSP'));
                fabricConnection.getNode.withArgs('peerTwo').returns(FabricNode.newPeer('peerTwo', 'peerTwo', 'grpc://localhost:8051', 'wallet', 'identity', 'Org1MSP'));
                fabricConnection.getNode.withArgs('ca-name').returns(FabricNode.newCertificateAuthority('ca-name', 'ca-name', 'http://localhost:7054', 'ca_name', 'wallet', 'identity', 'Org1MSP', 'admin', 'adminpw'));
                fabricConnection.getNode.withArgs('orderer1').returns(FabricNode.newOrderer('orderer1', 'orderer1', 'grpc://localhost:7050', 'wallet', 'identity', 'Org1MSP', undefined));
                fabricConnection.getNode.withArgs('orderer2').returns(FabricNode.newOrderer('orderer2', 'orderer2', 'grpc://localhost:7050', 'wallet', 'identity', 'Org1MSP', undefined));

                allChildren = await blockchainRuntimeExplorerProvider.getChildren();
                allChildren.length.should.equal(6);

                const items: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(allChildren[allChildren.length - 2]);
                items.length.should.equal(5);
                const peerOne: PeerTreeItem = items[0] as PeerTreeItem;
                peerOne.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                peerOne.contextValue.should.equal('blockchain-peer-item');
                peerOne.label.should.equal('peerOne');
                peerOne.node.api_url.should.equal('grpc://localhost:7051');
                let tooltip: string = `Name: ${peerOne.node.name}\nMSPID: ${peerOne.node.msp_id}\nAssociated Identity:\n${peerOne.node.identity}`;
                peerOne.tooltip.should.equal(tooltip);

                const peerTwo: PeerTreeItem = items[1] as PeerTreeItem;
                peerTwo.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                peerTwo.contextValue.should.equal('blockchain-peer-item');
                peerTwo.label.should.equal('peerTwo');
                peerTwo.node.api_url.should.equal('grpc://localhost:8051');
                tooltip = `Name: ${peerTwo.node.name}\nMSPID: ${peerTwo.node.msp_id}\nAssociated Identity:\n${peerTwo.node.identity}`;
                peerTwo.tooltip.should.equal(tooltip);

                const ca: CertificateAuthorityTreeItem = items[2] as CertificateAuthorityTreeItem;
                ca.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                ca.contextValue.should.equal('blockchain-runtime-certificate-authority-item');
                ca.label.should.equal('ca-name');
                ca.node.api_url.should.equal('http://localhost:7054');
                tooltip = `Name: ${ca.node.name}\nAssociated Identity:\n${ca.node.identity}`;
                ca.tooltip.should.equal(tooltip);

                const orderer: OrdererTreeItem = items[3] as OrdererTreeItem;
                orderer.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                orderer.contextValue.should.equal('blockchain-runtime-orderer-item');
                orderer.label.should.equal('orderer1');
                orderer.node.api_url.should.equal('grpc://localhost:7050');
                tooltip = `Name: ${orderer.node.name}\nMSPID: ${orderer.node.msp_id}\nAssociated Identity:\n${orderer.node.identity}`;
                orderer.tooltip.should.equal(tooltip);

                const orderer2: OrdererTreeItem = items[4] as OrdererTreeItem;
                orderer2.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                orderer2.contextValue.should.equal('blockchain-runtime-orderer-item');
                orderer2.label.should.equal('orderer2');
                orderer2.node.api_url.should.equal('grpc://localhost:7050');
                tooltip = `Name: ${orderer2.node.name}\nMSPID: ${orderer2.node.msp_id}\nAssociated Identity:\n${orderer2.node.identity}`;
                orderer2.tooltip.should.equal(tooltip);

                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should show peers, certificate authorities, and orderer nodes correctly with none local fabric', async () => {
                const anotherEnvironmentRegistry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
                anotherEnvironmentRegistry.name = 'myEnvironment';

                environmentStub.returns(anotherEnvironmentRegistry);

                fabricConnection.getAllCertificateAuthorityNames.returns(['ca-name']);
                fabricConnection.getNode.withArgs('peerOne').returns(FabricNode.newPeer('peerOne', 'peerOne', 'grpc://localhost:7051', 'wallet', 'identity', 'Org1MSP'));
                fabricConnection.getNode.withArgs('peerTwo').returns(FabricNode.newPeer('peerTwo', 'peerTwo', 'grpc://localhost:8051', 'wallet', 'identity', 'Org1MSP'));
                fabricConnection.getNode.withArgs('ca-name').returns(FabricNode.newCertificateAuthority('ca-name', 'ca-name', 'http://localhost:7054', 'ca_name', 'wallet', 'identity', 'Org1MSP', 'admin', 'adminpw'));
                fabricConnection.getNode.withArgs('orderer1').returns(FabricNode.newOrderer('orderer1', 'orderer1', 'grpc://localhost:7050', 'wallet', 'identity', 'Org1MSP', undefined));
                fabricConnection.getNode.withArgs('orderer2').returns(FabricNode.newOrderer('orderer2', 'orderer2', 'grpc://localhost:7050', 'wallet', 'identity', 'Org1MSP', undefined));

                allChildren = await blockchainRuntimeExplorerProvider.getChildren();
                allChildren.length.should.equal(6);

                const items: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(allChildren[allChildren.length - 2]);
                items.length.should.equal(6);
                const peerOne: PeerTreeItem = items[0] as PeerTreeItem;
                peerOne.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                peerOne.contextValue.should.equal('blockchain-peer-item');
                peerOne.label.should.equal('peerOne');
                peerOne.node.api_url.should.equal('grpc://localhost:7051');
                let tooltip: string = `Name: ${peerOne.node.name}\nMSPID: ${peerOne.node.msp_id}\nAssociated Identity:\n${peerOne.node.identity}`;
                peerOne.tooltip.should.equal(tooltip);

                const peerTwo: PeerTreeItem = items[1] as PeerTreeItem;
                peerTwo.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                peerTwo.contextValue.should.equal('blockchain-peer-item');
                peerTwo.label.should.equal('peerTwo');
                peerTwo.node.api_url.should.equal('grpc://localhost:8051');
                tooltip = `Name: ${peerTwo.node.name}\nMSPID: ${peerTwo.node.msp_id}\nAssociated Identity:\n${peerTwo.node.identity}`;
                peerTwo.tooltip.should.equal(tooltip);

                const ca: CertificateAuthorityTreeItem = items[2] as CertificateAuthorityTreeItem;
                ca.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                ca.contextValue.should.equal('blockchain-runtime-certificate-authority-item');
                ca.label.should.equal('ca-name');
                ca.node.api_url.should.equal('http://localhost:7054');
                tooltip = `Name: ${ca.node.name}\nAssociated Identity:\n${ca.node.identity}`;
                ca.tooltip.should.equal(tooltip);

                const orderer: OrdererTreeItem = items[3] as OrdererTreeItem;
                orderer.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                orderer.contextValue.should.equal('blockchain-runtime-orderer-item');
                orderer.label.should.equal('orderer1');
                orderer.node.api_url.should.equal('grpc://localhost:7050');
                tooltip = `Name: ${orderer.node.name}\nMSPID: ${orderer.node.msp_id}\nAssociated Identity:\n${orderer.node.identity}`;
                orderer.tooltip.should.equal(tooltip);

                const orderer2: OrdererTreeItem = items[4] as OrdererTreeItem;
                orderer2.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                orderer2.contextValue.should.equal('blockchain-runtime-orderer-item');
                orderer2.label.should.equal('orderer2');
                orderer2.node.api_url.should.equal('grpc://localhost:7050');
                tooltip = `Name: ${orderer2.node.name}\nMSPID: ${orderer2.node.msp_id}\nAssociated Identity:\n${orderer2.node.identity}`;
                orderer2.tooltip.should.equal(tooltip);

                const importNodes: ImportNodesTreeItem = items[5] as ImportNodesTreeItem;
                importNodes.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                importNodes.contextValue.should.equal('blockchain-import-nodes-item');
                importNodes.label.should.equal('+ Import Nodes');

                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should show peers, certificate authorities, and orderer nodes correctly with OpsTool instance', async () => {
                // For an Ops Tools instance the behaviour is different if we are finishing the connection, or if we are
                // reconnecting (this is dealt with in 'refresh' test section), hence the state must be CONNECTING.
                connectedStateStub.returns(ConnectedState.CONNECTING);
                const setStateStub: sinon.SinonStub = mySandBox.stub(FabricEnvironmentManager.instance(), 'setState');
                const anotherEnvironmentRegistry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
                anotherEnvironmentRegistry.name = 'myEnvironment';
                anotherEnvironmentRegistry.url = 'someURL';
                anotherEnvironmentRegistry.environmentType = EnvironmentType.OPS_TOOLS_ENVIRONMENT;

                const connectCommandStub: sinon.SinonStub = executeCommandStub.withArgs(ExtensionCommands.CONNECT_TO_ENVIRONMENT, anotherEnvironmentRegistry).resolves();
                environmentStub.returns(anotherEnvironmentRegistry);

                fabricConnection.getAllCertificateAuthorityNames.returns(['ca-name']);
                fabricConnection.getNode.withArgs('peerOne').returns(FabricNode.newPeer('peerOne', 'peerOne', 'grpc://localhost:7051', 'wallet', 'identity', 'Org1MSP'));
                fabricConnection.getNode.withArgs('peerTwo').returns(FabricNode.newPeer('peerTwo', 'peerTwo', 'grpc://localhost:8051', 'wallet', 'identity', 'Org1MSP'));
                fabricConnection.getNode.withArgs('ca-name').returns(FabricNode.newCertificateAuthority('ca-name', 'ca-name', 'http://localhost:7054', 'ca_name', 'wallet', 'identity', 'Org1MSP', 'admin', 'adminpw'));
                fabricConnection.getNode.withArgs('orderer1').returns(FabricNode.newOrderer('orderer1', 'orderer1', 'grpc://localhost:7050', 'wallet', 'identity', 'Org1MSP', undefined));
                fabricConnection.getNode.withArgs('orderer2').returns(FabricNode.newOrderer('orderer2', 'orderer2', 'grpc://localhost:7050', 'wallet', 'identity', 'Org1MSP', undefined));

                allChildren = await blockchainRuntimeExplorerProvider.getChildren();
                allChildren.length.should.equal(6);

                const items: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(allChildren[allChildren.length - 2]);
                items.length.should.equal(6);
                const peerOne: PeerTreeItem = items[0] as PeerTreeItem;
                peerOne.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                peerOne.contextValue.should.equal('blockchain-peer-item');
                peerOne.label.should.equal('peerOne');
                peerOne.node.api_url.should.equal('grpc://localhost:7051');
                let tooltip: string = `Name: ${peerOne.node.name}\nMSPID: ${peerOne.node.msp_id}\nAssociated Identity:\n${peerOne.node.identity}`;
                peerOne.tooltip.should.equal(tooltip);

                const peerTwo: PeerTreeItem = items[1] as PeerTreeItem;
                peerTwo.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                peerTwo.contextValue.should.equal('blockchain-peer-item');
                peerTwo.label.should.equal('peerTwo');
                peerTwo.node.api_url.should.equal('grpc://localhost:8051');
                tooltip = `Name: ${peerTwo.node.name}\nMSPID: ${peerTwo.node.msp_id}\nAssociated Identity:\n${peerTwo.node.identity}`;
                peerTwo.tooltip.should.equal(tooltip);

                const ca: CertificateAuthorityTreeItem = items[2] as CertificateAuthorityTreeItem;
                ca.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                ca.contextValue.should.equal('blockchain-runtime-certificate-authority-item');
                ca.label.should.equal('ca-name');
                ca.node.api_url.should.equal('http://localhost:7054');
                tooltip = `Name: ${ca.node.name}\nAssociated Identity:\n${ca.node.identity}`;
                ca.tooltip.should.equal(tooltip);

                const orderer: OrdererTreeItem = items[3] as OrdererTreeItem;
                orderer.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                orderer.contextValue.should.equal('blockchain-runtime-orderer-item');
                orderer.label.should.equal('orderer1');
                orderer.node.api_url.should.equal('grpc://localhost:7050');
                tooltip = `Name: ${orderer.node.name}\nMSPID: ${orderer.node.msp_id}\nAssociated Identity:\n${orderer.node.identity}`;
                orderer.tooltip.should.equal(tooltip);

                const orderer2: OrdererTreeItem = items[4] as OrdererTreeItem;
                orderer2.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                orderer2.contextValue.should.equal('blockchain-runtime-orderer-item');
                orderer2.label.should.equal('orderer2');
                orderer2.node.api_url.should.equal('grpc://localhost:7050');
                tooltip = `Name: ${orderer2.node.name}\nMSPID: ${orderer2.node.msp_id}\nAssociated Identity:\n${orderer2.node.identity}`;
                orderer2.tooltip.should.equal(tooltip);

                const importNodes: ImportNodesTreeItem = items[5] as ImportNodesTreeItem;
                importNodes.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                importNodes.contextValue.should.equal('blockchain-filter-nodes-item');
                importNodes.label.should.equal('Edit Filters');

                executeCommandStub.should.have.been.calledWith('setContext', 'blockchain-opstool-connected', true);
                executeCommandStub.should.have.been.calledWith('setContext', 'blockchain-environment-connected', true);
                executeCommandStub.should.have.been.calledWith('setContext', 'blockchain-runtime-connected', false);
                executeCommandStub.should.have.been.calledWith('setContext', 'blockchain-environment-setup', false);
                executeCommandStub.should.have.been.called;
                connectCommandStub.should.have.not.been.called;
                setStateStub.should.have.been.calledWith(ConnectedState.CONNECTED);
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should show peers, certificate authorities, and orderer nodes correctly with cluster name', async () => {
                fabricConnection.getAllCertificateAuthorityNames.returns(['ca-name']);
                fabricConnection.getNode.withArgs('peerOne').returns(FabricNode.newPeer('peerOne', 'peerOne', 'grpc://localhost:7051', 'wallet', 'identity', 'Org1MSP'));
                fabricConnection.getNode.withArgs('peerTwo').returns(FabricNode.newPeer('peerTwo', 'peerTwo', 'grpc://localhost:8051', 'wallet', 'identity', 'Org1MSP'));
                fabricConnection.getNode.withArgs('ca-name').returns(FabricNode.newCertificateAuthority('ca-name', 'ca-name', 'http://localhost:7054', 'ca_name', 'wallet', 'identity', 'Org1MSP', 'admin', 'adminpw'));
                fabricConnection.getNode.withArgs('orderer1').returns(FabricNode.newOrderer('orderer1', 'orderer1', 'grpc://localhost:7050', 'wallet', 'identity', 'Org1MSP', 'my ordering service'));
                fabricConnection.getNode.withArgs('orderer2').returns(FabricNode.newOrderer('orderer2', 'orderer2', 'grpc://localhost:7050', 'wallet', 'identity', 'Org1MSP', 'my ordering service'));

                allChildren = await blockchainRuntimeExplorerProvider.getChildren();
                allChildren.length.should.equal(6);

                const items: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(allChildren[allChildren.length - 2]);
                items.length.should.equal(4);
                const peerOne: PeerTreeItem = items[0] as PeerTreeItem;
                peerOne.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                peerOne.contextValue.should.equal('blockchain-peer-item');
                peerOne.label.should.equal('peerOne');
                peerOne.node.api_url.should.equal('grpc://localhost:7051');
                let tooltip: string = `Name: ${peerOne.node.name}\nMSPID: ${peerOne.node.msp_id}\nAssociated Identity:\n${peerOne.node.identity}`;
                peerOne.tooltip.should.equal(tooltip);

                const peerTwo: PeerTreeItem = items[1] as PeerTreeItem;
                peerTwo.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                peerTwo.contextValue.should.equal('blockchain-peer-item');
                peerTwo.label.should.equal('peerTwo');
                peerTwo.node.api_url.should.equal('grpc://localhost:8051');
                tooltip = `Name: ${peerTwo.node.name}\nMSPID: ${peerTwo.node.msp_id}\nAssociated Identity:\n${peerTwo.node.identity}`;
                peerTwo.tooltip.should.equal(tooltip);

                const ca: CertificateAuthorityTreeItem = items[2] as CertificateAuthorityTreeItem;
                ca.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                ca.contextValue.should.equal('blockchain-runtime-certificate-authority-item');
                ca.label.should.equal('ca-name');
                ca.node.api_url.should.equal('http://localhost:7054');
                tooltip = `Name: ${ca.node.name}\nAssociated Identity:\n${ca.node.identity}`;
                ca.tooltip.should.equal(tooltip);

                const orderer: OrdererTreeItem = items[3] as OrdererTreeItem;
                orderer.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                orderer.contextValue.should.equal('blockchain-runtime-orderer-item');
                orderer.label.should.equal('my ordering service');
                orderer.node.api_url.should.equal('grpc://localhost:7050');
                tooltip = `Name: ${orderer.node.cluster_name}\nMSPID: ${orderer.node.msp_id}\nAssociated Identity:\n${orderer.node.identity}`;
                orderer.tooltip.should.equal(tooltip);

                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should show peers, certificate authorities, and multiple orderer nodes correctly with cluster name', async () => {
                fabricConnection.getAllCertificateAuthorityNames.returns(['ca-name']);
                fabricConnection.getAllOrdererNames.returns(['orderer1', 'orderer2', 'orderer3', 'orderer4']);
                fabricConnection.getNode.withArgs('peerOne').returns(FabricNode.newPeer('peerOne', 'peerOne', 'grpc://localhost:7051', 'wallet', 'identity', 'Org1MSP'));
                fabricConnection.getNode.withArgs('peerTwo').returns(FabricNode.newPeer('peerTwo', 'peerTwo', 'grpc://localhost:8051', 'wallet', 'identity', 'Org1MSP'));
                fabricConnection.getNode.withArgs('ca-name').returns(FabricNode.newCertificateAuthority('ca-name', 'ca-name', 'http://localhost:7054', 'ca_name', 'wallet', 'identity', 'Org1MSP', 'admin', 'adminpw'));
                fabricConnection.getNode.withArgs('orderer1').returns(FabricNode.newOrderer('orderer1', 'orderer1', 'grpc://localhost:7050', 'wallet', 'identity', 'Org1MSP', 'my ordering service'));
                fabricConnection.getNode.withArgs('orderer2').returns(FabricNode.newOrderer('orderer2', 'orderer2', 'grpc://localhost:7050', 'wallet', 'identity', 'Org1MSP', 'my ordering service'));
                fabricConnection.getNode.withArgs('orderer3').returns(FabricNode.newOrderer('orderer3', 'orderer3', 'grpc://localhost:7050', 'wallet', 'identity', 'Org1MSP', 'my other ordering service'));
                fabricConnection.getNode.withArgs('orderer4').returns(FabricNode.newOrderer('orderer4', 'orderer4', 'grpc://localhost:7050', 'wallet', 'identity', 'Org1MSP', 'my other ordering service'));

                allChildren = await blockchainRuntimeExplorerProvider.getChildren();
                allChildren.length.should.equal(6);

                const items: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(allChildren[allChildren.length - 2 ]);
                items.length.should.equal(5);
                const peerOne: PeerTreeItem = items[0] as PeerTreeItem;
                peerOne.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                peerOne.contextValue.should.equal('blockchain-peer-item');
                peerOne.label.should.equal('peerOne');
                peerOne.node.api_url.should.equal('grpc://localhost:7051');
                let tooltip: string = `Name: ${peerOne.node.name}\nMSPID: ${peerOne.node.msp_id}\nAssociated Identity:\n${peerOne.node.identity}`;
                peerOne.tooltip.should.equal(tooltip);

                const peerTwo: PeerTreeItem = items[1] as PeerTreeItem;
                peerTwo.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                peerTwo.contextValue.should.equal('blockchain-peer-item');
                peerTwo.label.should.equal('peerTwo');
                peerTwo.node.api_url.should.equal('grpc://localhost:8051');
                tooltip = `Name: ${peerTwo.node.name}\nMSPID: ${peerTwo.node.msp_id}\nAssociated Identity:\n${peerTwo.node.identity}`;
                peerTwo.tooltip.should.equal(tooltip);

                const ca: CertificateAuthorityTreeItem = items[2] as CertificateAuthorityTreeItem;
                ca.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                ca.contextValue.should.equal('blockchain-runtime-certificate-authority-item');
                ca.label.should.equal('ca-name');
                ca.node.api_url.should.equal('http://localhost:7054');
                tooltip = `Name: ${ca.node.name}\nAssociated Identity:\n${ca.node.identity}`;
                ca.tooltip.should.equal(tooltip);

                const orderer: OrdererTreeItem = items[3] as OrdererTreeItem;
                orderer.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                orderer.contextValue.should.equal('blockchain-runtime-orderer-item');
                orderer.label.should.equal('my ordering service');
                orderer.node.api_url.should.equal('grpc://localhost:7050');
                tooltip = `Name: ${orderer.node.cluster_name}\nMSPID: ${orderer.node.msp_id}\nAssociated Identity:\n${orderer.node.identity}`;
                orderer.tooltip.should.equal(tooltip);

                const orderer2: OrdererTreeItem = items[4] as OrdererTreeItem;
                orderer2.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                orderer2.contextValue.should.equal('blockchain-runtime-orderer-item');
                orderer2.label.should.equal('my other ordering service');
                orderer2.node.api_url.should.equal('grpc://localhost:7050');
                tooltip = `Name: ${orderer2.node.cluster_name}\nMSPID: ${orderer2.node.msp_id}\nAssociated Identity:\n${orderer2.node.identity}`;
                orderer2.tooltip.should.equal(tooltip);

                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it('should show organizations correctly', async () => {

                allChildren = await blockchainRuntimeExplorerProvider.getChildren();
                allChildren.length.should.equal(6);

                const orgs: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren(allChildren[allChildren.length - 1]);
                orgs.length.should.equal(2);
                const orgOne: OrgTreeItem = orgs[0] as OrgTreeItem;
                orgOne.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                orgOne.contextValue.should.equal('blockchain-runtime-org-item');
                orgOne.label.should.equal('Org1');

                const orgTwo: OrgTreeItem = orgs[1] as OrgTreeItem;
                orgTwo.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.None);
                orgTwo.contextValue.should.equal('blockchain-runtime-org-item');
                orgTwo.label.should.equal('Org2');

                logSpy.should.not.have.been.called;
            });
        });
    });

    describe('refresh', () => {

        let registryEntry: FabricEnvironmentRegistryEntry;
        let getEnvRegEntryStub: sinon.SinonStub;
        let commandStub: sinon.SinonStub;

        beforeEach(async () => {

            await ExtensionUtil.activateExtension();

            registryEntry = new FabricEnvironmentRegistryEntry();
            registryEntry.name = FabricRuntimeUtil.LOCAL_FABRIC;
            registryEntry.managedRuntime = true;

            mySandBox.stub(LocalEnvironment.prototype, 'startLogs').resolves();
            mySandBox.stub(LocalEnvironment.prototype, 'stopLogs').returns(undefined);

            commandStub = mySandBox.stub(vscode.commands, 'executeCommand');
            commandStub.callThrough();

            registryEntry.environmentType = EnvironmentType.LOCAL_ENVIRONMENT;
            getEnvRegEntryStub = mySandBox.stub(FabricEnvironmentManager.instance(), 'getEnvironmentRegistryEntry');
            getEnvRegEntryStub.returns(registryEntry);

            const map: Map<string, Array<string>> = new Map<string, Array<string>>();
            map.set('channelOne', ['peerOne']);
            map.set('channelTwo', ['peerOne', 'peerTwo']);
            const fabricConnection: sinon.SinonStubbedInstance<FabricEnvironmentConnection> = mySandBox.createStubInstance(FabricEnvironmentConnection);
            fabricConnection.createChannelMap.resolves(map);

            fabricConnection.getCommittedSmartContractDefinitions.withArgs(['peerOne'], 'channelOne').resolves([{
                name: 'biscuit-network',
                version: '0.7'
            }]);
            fabricConnection.getCommittedSmartContractDefinitions.withArgs(['peerOne', 'peerTwo'], 'channelTwo').resolves([
                {
                    name: 'biscuit-network',
                    version: '0.7'
                }, {
                    name: 'cake-network',
                    version: '0.10'
                }, {
                    name: 'legacy-network',
                    version: '2.34'
                }]);

            const getConnectionStub: sinon.SinonStub = mySandBox.stub(FabricEnvironmentManager.instance(), 'getConnection');
            getConnectionStub.returns((fabricConnection as any) as FabricEnvironmentConnection);

        });

        afterEach(() => {
            mySandBox.restore();
        });

        it('should test the tree is refreshed when the refresh command is run', async () => {

            const blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();

            const onDidChangeTreeDataSpy: sinon.SinonSpy = mySandBox.spy(blockchainRuntimeExplorerProvider['_onDidChangeTreeData'], 'fire');

            await vscode.commands.executeCommand(ExtensionCommands.REFRESH_ENVIRONMENTS);

            onDidChangeTreeDataSpy.should.have.been.called;
        });

        it('should test the tree is refreshed when the refresh command is run', async () => {

            const mockTreeItem: sinon.SinonStubbedInstance<ChannelTreeItem> = mySandBox.createStubInstance(ChannelTreeItem);

            const blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();

            const onDidChangeTreeDataSpy: sinon.SinonSpy = mySandBox.spy(blockchainRuntimeExplorerProvider['_onDidChangeTreeData'], 'fire');

            await vscode.commands.executeCommand(ExtensionCommands.REFRESH_ENVIRONMENTS, mockTreeItem);

            onDidChangeTreeDataSpy.should.have.been.calledOnceWithExactly(mockTreeItem);
        });

        it('should refresh on connect event', async () => {
            const blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();

            const connectStub: sinon.SinonStub = mySandBox.stub(blockchainRuntimeExplorerProvider, 'connect').resolves();

            FabricEnvironmentManager.instance().emit('connected');

            connectStub.should.have.been.called;
        });

        it('should refresh on disconnect event', async () => {
            const blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();

            const disconnectStub: sinon.SinonStub = mySandBox.stub(blockchainRuntimeExplorerProvider, 'disconnect').resolves();

            FabricEnvironmentManager.instance().emit('disconnected');

            disconnectStub.should.have.been.called;
        });

        it('should try to reconnect if refreshing a connected Ops Tools environment, and return current tree', async () => {
            const getStateStub: sinon.SinonStub = mySandBox.stub(FabricEnvironmentManager.instance(), 'getState').returns(ConnectedState.CONNECTED);
            const registryEntryOpsTools: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
            registryEntryOpsTools.name = 'myOpsToolsFabric';
            registryEntryOpsTools.managedRuntime = false;
            registryEntryOpsTools.url = '/some/url:port';
            registryEntryOpsTools.environmentType = EnvironmentType.OPS_TOOLS_ENVIRONMENT;
            getEnvRegEntryStub.returns(registryEntryOpsTools);

            const blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();
            const connectCommandStub: sinon.SinonStub = commandStub.withArgs(ExtensionCommands.CONNECT_TO_ENVIRONMENT, registryEntryOpsTools).resolves();

            const allChildren: BlockchainTreeItem[] = await blockchainRuntimeExplorerProvider.getChildren();

            allChildren.length.should.equal(5);
            commandStub.should.have.not.been.calledWith('setContext', 'blockchain-opstool-connected', true);
            commandStub.should.have.not.been.calledWith('setContext', 'blockchain-environment-connected', true);
            commandStub.should.have.not.been.calledWith('setContext', 'blockchain-runtime-connected', false);
            commandStub.should.have.not.been.calledWith('setContext', 'blockchain-environment-setup', false);
            getStateStub.should.have.been.called;
            connectCommandStub.should.have.been.called;
        });

        it('should handle disconnect when refreshing a connected Ops Tools environment, and return current tree', async () => {
            const getStateStub: sinon.SinonStub = mySandBox.stub(FabricEnvironmentManager.instance(), 'getState');
            getStateStub.returns(ConnectedState.CONNECTED);
            getStateStub.onCall(4).returns(ConnectedState.DISCONNECTED);

            const registryEntryOpsTools: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
            registryEntryOpsTools.name = 'myOpsToolsFabric';
            registryEntryOpsTools.managedRuntime = false;
            registryEntryOpsTools.url = '/some/url:port';
            registryEntryOpsTools.environmentType = EnvironmentType.OPS_TOOLS_ENVIRONMENT;
            getEnvRegEntryStub.returns(registryEntryOpsTools);

            const getAllStub: sinon.SinonStub = mySandBox.stub(FabricEnvironmentRegistry.instance(), 'getAll').resolves([registryEntry, registryEntryOpsTools]);

            const blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();
            const connectCommandStub: sinon.SinonStub = commandStub.withArgs(ExtensionCommands.CONNECT_TO_ENVIRONMENT, registryEntryOpsTools).resolves();

            const allChildren: BlockchainTreeItem[] = await blockchainRuntimeExplorerProvider.getChildren();

            allChildren.length.should.equal(2);
            getAllStub.should.have.been.called;
            commandStub.should.have.not.been.calledWith('setContext', 'blockchain-opstool-connected', true);
            commandStub.should.have.not.been.calledWith('setContext', 'blockchain-environment-connected', true);
            commandStub.should.have.not.been.calledWith('setContext', 'blockchain-runtime-connected', false);
            commandStub.should.have.not.been.calledWith('setContext', 'blockchain-environment-setup', false);
            getStateStub.should.have.been.called;
            connectCommandStub.should.have.been.called;
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

            const blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();

            const onDidChangeTreeDataSpy: sinon.SinonSpy = mySandBox.spy(blockchainRuntimeExplorerProvider['_onDidChangeTreeData'], 'fire');

            await blockchainRuntimeExplorerProvider.connect();

            onDidChangeTreeDataSpy.should.have.been.called;
        });
    });

    describe('disconnect', () => {

        beforeEach(async () => {
            await ExtensionUtil.activateExtension();
        });

        afterEach(() => {
            mySandBox.restore();
        });

        it('should disconnect the runtime connection', async () => {
            const blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();

            const onDidChangeTreeDataSpy: sinon.SinonSpy = mySandBox.spy(blockchainRuntimeExplorerProvider['_onDidChangeTreeData'], 'fire');

            const executeCommandSpy: sinon.SinonSpy = mySandBox.spy(vscode.commands, 'executeCommand');

            await blockchainRuntimeExplorerProvider.disconnect();

            onDidChangeTreeDataSpy.should.have.been.called;

            executeCommandSpy.should.have.been.calledOnce;
            executeCommandSpy.getCall(0).should.have.been.calledWith('setContext', 'blockchain-environment-connected', false);
        });
    });

    describe('getTreeItem', () => {

        it('should get a tree item', async () => {

            await TestUtil.setupLocalFabric();
            await ExtensionUtil.activateExtension();

            mySandBox.stub(LocalEnvironmentManager.instance().getRuntime(FabricRuntimeUtil.LOCAL_FABRIC), 'isRunning').resolves(false);
            mySandBox.stub(LocalEnvironmentManager.instance().getRuntime(FabricRuntimeUtil.LOCAL_FABRIC), 'getName').returns(FabricRuntimeUtil.LOCAL_FABRIC);
            const blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();
            const allChildren: Array<BlockchainTreeItem> = await blockchainRuntimeExplorerProvider.getChildren();

            const result: EnvironmentGroupTreeItem = blockchainRuntimeExplorerProvider.getTreeItem(allChildren[0]) as EnvironmentGroupTreeItem;

            result.label.should.equal('Simple local networks');
        });
    });
});
