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
import * as sinon from 'sinon';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as fs from 'fs-extra';
import { View } from '../../extension/webview/View';
import { TestUtil } from '../TestUtil';
import { GlobalState } from '../../extension/util/GlobalState';
import { DeployView } from '../../extension/webview/DeployView';
import {
    FabricRuntimeUtil,
    FabricEnvironmentRegistryEntry,
    FabricEnvironmentRegistry,
    LogType,
    FabricSmartContractDefinition,
    FabricCollectionDefinition
} from 'ibm-blockchain-platform-common';
import { PackageRegistryEntry } from '../../extension/registries/PackageRegistryEntry';
import { FabricEnvironmentManager } from '../../extension/fabric/environments/FabricEnvironmentManager';
import { FabricEnvironmentConnection } from 'ibm-blockchain-platform-environment-v1';
import { ExtensionCommands } from '../../ExtensionCommands';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { PackageRegistry } from '../../extension/registries/PackageRegistry';
import { UserInputUtil } from '../../extension/commands/UserInputUtil';
import IInstantiateFunction from '../../extension/interfaces/IDeployV1InstantiateFunction';

chai.use(sinonChai);
const should: Chai.Should = chai.should();
// tslint:disable no-unused-expression
// tslint:disable: quotemark
// tslint:disable: object-literal-key-quotes

describe('DeployView', () => {
    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();
    let context: vscode.ExtensionContext;
    let createWebviewPanelStub: sinon.SinonStub;
    let postMessageStub: sinon.SinonStub;
    let executeCommandStub: sinon.SinonStub;
    let logStub: sinon.SinonStub;

    let deployData: { channelName: string, environmentName: string };

    let initialMessage: { path: string, deployData: { channelName: string, environmentName: string } };

    let fabricEnvironmentManager: FabricEnvironmentManager;
    let getConnectionStub: sinon.SinonStub;
    let localEnvironmentConnectionMock: sinon.SinonStubbedInstance<FabricEnvironmentConnection>;
    let otherEnvironmentConnectionMock: sinon.SinonStubbedInstance<FabricEnvironmentConnection>;
    const packageEntryOne: PackageRegistryEntry = new PackageRegistryEntry({
        name: 'packageOne',
        version: '0.0.1',
        path: '',
        sizeKB: 90001
    });
    const packageEntryTwo: PackageRegistryEntry = new PackageRegistryEntry({
        name: 'packageOne',
        version: '0.0.2',
        path: '',
        sizeKB: 80000
    });

    let localEntry: FabricEnvironmentRegistryEntry;

    const installApproveMap: Map<string, string[]> = new Map();
    const commitMap: Map<string, string[]> = new Map();
    before(async () => {
        await TestUtil.setupTests(mySandBox);
    });

    beforeEach(async () => {
        deployData = {
            channelName: 'mychannel',
            environmentName: FabricRuntimeUtil.LOCAL_FABRIC
        };

        initialMessage = {
            path: '/deploy',
            deployData
        };

        context = GlobalState.getExtensionContext();

        localEntry = await FabricEnvironmentRegistry.instance().get(FabricRuntimeUtil.LOCAL_FABRIC);

        executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand');
        executeCommandStub.callThrough();
        executeCommandStub.withArgs(ExtensionCommands.CONNECT_TO_ENVIRONMENT).resolves();
        executeCommandStub.withArgs(ExtensionCommands.DISCONNECT_ENVIRONMENT).resolves();
        executeCommandStub.withArgs(ExtensionCommands.DEPLOY_SMART_CONTRACT).resolves();
        executeCommandStub.withArgs(ExtensionCommands.PACKAGE_SMART_CONTRACT).resolves();

        createWebviewPanelStub = mySandBox.stub(vscode.window, 'createWebviewPanel');

        postMessageStub = mySandBox.stub().resolves();

        View['openPanels'].splice(0, View['openPanels'].length);

        localEnvironmentConnectionMock = mySandBox.createStubInstance(FabricEnvironmentConnection);
        localEnvironmentConnectionMock.environmentName = FabricRuntimeUtil.LOCAL_FABRIC;

        localEnvironmentConnectionMock.getAllOrdererNames.returns(['orderer.example.com']);
        localEnvironmentConnectionMock.getCommittedSmartContractDefinitions.resolves([]);

        installApproveMap.set('Org1MSP', ['Org1Peer1', 'Org1Peer2']);
        commitMap.set('Org1MSP', ['Org1Peer1', 'Org1Peer2']);
        commitMap.set('Org2MSP', ['Org2Peer1', 'Org2Peer2']);
        commitMap.set('Org3MSP', ['Org3Peer1']);
        localEnvironmentConnectionMock.getDiscoveredOrgs.resolves(commitMap);

        const channelMap: Map<string, string[]> = new Map();
        channelMap.set('mychannel', ['Org1Peer1', 'Org1Peer2']);
        localEnvironmentConnectionMock.createChannelMap.resolves(channelMap);

        const orgApproval: Map<string, boolean> = new Map();
        orgApproval.set('Org1MSP', true);
        orgApproval.set('Org2MSP', false);
        localEnvironmentConnectionMock.getOrgApprovals.resolves(orgApproval);

        otherEnvironmentConnectionMock = mySandBox.createStubInstance(FabricEnvironmentConnection);
        otherEnvironmentConnectionMock.environmentName = 'otherEnvironment';

        fabricEnvironmentManager = FabricEnvironmentManager.instance();
        getConnectionStub = mySandBox.stub(fabricEnvironmentManager, 'getConnection');
        logStub = mySandBox.stub(VSCodeBlockchainOutputAdapter.instance(), 'log').resolves();

    });

    afterEach(() => {
        mySandBox.restore();
    });

    it('should register and show the deploy page', async () => {
        createWebviewPanelStub.returns({
            title: 'Deploy Smart Contract',
            webview: {
                postMessage: postMessageStub,
                onDidReceiveMessage: mySandBox.stub(),
                asWebviewUri: mySandBox.stub()
            },
            reveal: mySandBox.stub(),
            dispose: mySandBox.stub(),
            onDidDispose: mySandBox.stub(),
            onDidChangeViewState: mySandBox.stub()
        });

        const deployView: DeployView = new DeployView(context, deployData);
        await deployView.openView(false);
        createWebviewPanelStub.should.have.been.calledOnce;
        const call: sinon.SinonSpyCall = postMessageStub.getCall(0);
        call.args[0].should.deep.equal(initialMessage);
    });

    it('should do nothing if receiving an unknown message', async () => {

        const onDidDisposePromises: any[] = [];

        onDidDisposePromises.push(new Promise((resolve: any): void => {
            createWebviewPanelStub.returns({
                title: 'Deploy Smart Contract',
                webview: {
                    postMessage: postMessageStub,
                    onDidReceiveMessage: async (callback: any): Promise<void> => {
                        await callback({
                            command: 'unknownMessage'
                        });
                        resolve();
                    },
                    asWebviewUri: mySandBox.stub()
                },
                reveal: (): void => {
                    return;
                },
                onDidDispose: mySandBox.stub(),
                onDidChangeViewState: mySandBox.stub(),
                _isDisposed: false
            });
        }));

        const deployView: DeployView = new DeployView(context, deployData);

        const deployStub: sinon.SinonStub = mySandBox.stub(deployView, 'deploy').resolves();

        await deployView.openView(false);
        await Promise.all(onDidDisposePromises);

        deployStub.should.not.have.been.called;
    });

    it('should set panel to undefined if disposed', async () => {
        const disposeStub: sinon.SinonStub = mySandBox.stub().yields();

        createWebviewPanelStub.returns({
            title: 'Deploy Smart Contract',
            webview: {
                postMessage: postMessageStub,
                onDidReceiveMessage: mySandBox.stub(),
                asWebviewUri: mySandBox.stub()
            },
            reveal: (): void => {
                return;
            },
            onDidDispose: disposeStub,
            onDidChangeViewState: mySandBox.stub(),
            _isDisposed: false
        });

        const deployView: DeployView = new DeployView(context, deployData);

        await deployView.openView(false);
        should.not.exist(DeployView.panel);

    });

    describe('deploy message', () => {

        it('should receive deploy message', async () => {

            const onDidDisposePromises: any[] = [];

            onDidDisposePromises.push(new Promise((resolve: any): void => {
                createWebviewPanelStub.returns({
                    title: 'Deploy Smart Contract',
                    webview: {
                        postMessage: postMessageStub,
                        onDidReceiveMessage: async (callback: any): Promise<void> => {
                            await callback({
                                command: 'deploy',
                                data: {
                                    channelName: 'mychannel',
                                    environmentName: FabricRuntimeUtil.LOCAL_FABRIC,
                                    selectedPackage: packageEntryOne,
                                    definitionName: 'packageOneName',
                                    definitionVersion: 'packageOneVersion',
                                    commitSmartContract: undefined,
                                    endorsmentPolicy: undefined,
                                    collectionConfig: '',
                                    selectedPeers: ['Org2Peer1', 'Org2Peer2']
                                }
                            });
                            resolve();
                        },
                        asWebviewUri: mySandBox.stub()
                    },
                    reveal: (): void => {
                        return;
                    },
                    onDidDispose: mySandBox.stub(),
                    onDidChangeViewState: mySandBox.stub(),
                    _isDisposed: false
                });
            }));

            const deployView: DeployView = new DeployView(context, deployData);

            const deployStub: sinon.SinonStub = mySandBox.stub(deployView, 'deploy').resolves();

            await deployView.openView(false);
            await Promise.all(onDidDisposePromises);

            deployStub.should.have.been.calledOnceWithExactly('mychannel', FabricRuntimeUtil.LOCAL_FABRIC, packageEntryOne, 'packageOneName', 'packageOneVersion', undefined, undefined, '', ['Org2Peer1', 'Org2Peer2']);
        });

    });

    describe('deploy', () => {

        it('should commit new contract if already connected', async () => {

            getConnectionStub.returns(localEnvironmentConnectionMock);

            const disposeStub: sinon.SinonStub = mySandBox.stub();
            const webviewPanel: vscode.WebviewPanel = {
                dispose: disposeStub
            } as unknown as vscode.WebviewPanel;

            const deployView: DeployView = new DeployView(context, deployData);
            DeployView.panel = webviewPanel;
            await deployView.deploy('mychannel', FabricRuntimeUtil.LOCAL_FABRIC, packageEntryOne, 'defName', '0.0.1', undefined, undefined, undefined, ['Org2Peer1', 'Org2Peer2']);
            disposeStub.should.have.been.calledOnce;
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, localEntry);

            localEnvironmentConnectionMock.getAllOrdererNames.should.have.been.calledOnce;
            localEnvironmentConnectionMock.createChannelMap.should.have.been.calledOnce;
            localEnvironmentConnectionMock.getCommittedSmartContractDefinitions.should.have.been.calledWithExactly(['Org1Peer1', 'Org1Peer2'], 'mychannel');
            localEnvironmentConnectionMock.getDiscoveredOrgs.should.have.been.calledOnceWithExactly('mychannel');

            executeCommandStub.should.have.been.calledWithExactly(ExtensionCommands.DEPLOY_SMART_CONTRACT, true, localEntry, 'orderer.example.com', 'mychannel', installApproveMap, packageEntryOne, new FabricSmartContractDefinition('defName', '0.0.1', 1), commitMap);
        });

        it('should disconnect, connect to correct environment and commit new contract', async () => {
            getConnectionStub.onCall(0).returns(otherEnvironmentConnectionMock);
            getConnectionStub.onCall(1).returns(localEnvironmentConnectionMock);

            const disposeStub: sinon.SinonStub = mySandBox.stub();
            const webviewPanel: vscode.WebviewPanel = {
                dispose: disposeStub
            } as unknown as vscode.WebviewPanel;

            const deployView: DeployView = new DeployView(context, deployData);
            DeployView.panel = webviewPanel;
            await deployView.deploy('mychannel', FabricRuntimeUtil.LOCAL_FABRIC, packageEntryOne, 'defName', '0.0.1', undefined, undefined, undefined, ['Org2Peer1', 'Org2Peer2']);

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, localEntry);

            localEnvironmentConnectionMock.getAllOrdererNames.should.have.been.calledOnce;
            localEnvironmentConnectionMock.createChannelMap.should.have.been.calledOnce;
            localEnvironmentConnectionMock.getCommittedSmartContractDefinitions.should.have.been.calledWithExactly(['Org1Peer1', 'Org1Peer2'], 'mychannel');
            localEnvironmentConnectionMock.getDiscoveredOrgs.should.have.been.calledOnceWithExactly('mychannel');

            executeCommandStub.should.have.been.calledWithExactly(ExtensionCommands.DEPLOY_SMART_CONTRACT, true, localEntry, 'orderer.example.com', 'mychannel', installApproveMap, packageEntryOne, new FabricSmartContractDefinition('defName', '0.0.1', 1), commitMap);
        });

        it('should connect to environment if disconnected and commit new contract', async () => {
            getConnectionStub.onCall(0).returns(undefined);
            getConnectionStub.onCall(1).returns(localEnvironmentConnectionMock);

            const disposeStub: sinon.SinonStub = mySandBox.stub();
            const webviewPanel: vscode.WebviewPanel = {
                dispose: disposeStub
            } as unknown as vscode.WebviewPanel;

            const deployView: DeployView = new DeployView(context, deployData);
            DeployView.panel = webviewPanel;
            await deployView.deploy('mychannel', FabricRuntimeUtil.LOCAL_FABRIC, packageEntryOne, 'defName', '0.0.1', undefined, undefined, undefined, ['Org2Peer1', 'Org2Peer2']);

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, localEntry);

            localEnvironmentConnectionMock.getAllOrdererNames.should.have.been.calledOnce;
            localEnvironmentConnectionMock.createChannelMap.should.have.been.calledOnce;
            localEnvironmentConnectionMock.getCommittedSmartContractDefinitions.should.have.been.calledWithExactly(['Org1Peer1', 'Org1Peer2'], 'mychannel');
            localEnvironmentConnectionMock.getDiscoveredOrgs.should.have.been.calledOnceWithExactly('mychannel');

            executeCommandStub.should.have.been.calledWithExactly(ExtensionCommands.DEPLOY_SMART_CONTRACT, true, localEntry, 'orderer.example.com', 'mychannel', installApproveMap, packageEntryOne, new FabricSmartContractDefinition('defName', '0.0.1', 1), commitMap);
        });

        it('should error if unable to connect to environment', async () => {
            getConnectionStub.returns(undefined);

            const disposeStub: sinon.SinonStub = mySandBox.stub();
            const webviewPanel: vscode.WebviewPanel = {
                dispose: disposeStub
            } as unknown as vscode.WebviewPanel;

            const deployView: DeployView = new DeployView(context, deployData);
            DeployView.panel = webviewPanel;
            await deployView.deploy('mychannel', FabricRuntimeUtil.LOCAL_FABRIC, packageEntryOne, 'defName', '0.0.1', undefined, undefined, undefined, ['Org2Peer1', 'Org2Peer2']);

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, localEntry);
            localEnvironmentConnectionMock.createChannelMap.should.not.have.been.called;
            localEnvironmentConnectionMock.getAllOrdererNames.should.not.have.been.called;
            localEnvironmentConnectionMock.getCommittedSmartContractDefinitions.should.not.have.been.called;
            localEnvironmentConnectionMock.getDiscoveredOrgs.should.not.have.been.called;

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.DEPLOY_SMART_CONTRACT);

            const error: Error = new Error(`Unable to deploy, cannot connect to environment: ${FabricRuntimeUtil.LOCAL_FABRIC}`);
            logStub.should.have.been.calledOnceWithExactly(LogType.ERROR, error.message, error.toString());
        });

        it('should be able to change the package for a committed definition and default to not comitting', async () => {
            getConnectionStub.returns(localEnvironmentConnectionMock);

            const disposeStub: sinon.SinonStub = mySandBox.stub();
            const webviewPanel: vscode.WebviewPanel = {
                dispose: disposeStub
            } as unknown as vscode.WebviewPanel;

            localEnvironmentConnectionMock.getCommittedSmartContractDefinitions.resolves([{
                name: 'defName',
                version: '0.0.1',
                sequence: 1
            }]);

            const deployView: DeployView = new DeployView(context, deployData);
            DeployView.panel = webviewPanel;
            await deployView.deploy('mychannel', FabricRuntimeUtil.LOCAL_FABRIC, packageEntryTwo, 'defName', '0.0.1', undefined, undefined, undefined, ['Org2Peer1', 'Org2Peer2']);

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, localEntry);

            localEnvironmentConnectionMock.getAllOrdererNames.should.have.been.calledOnce;
            localEnvironmentConnectionMock.createChannelMap.should.have.been.calledOnce;
            localEnvironmentConnectionMock.getCommittedSmartContractDefinitions.should.have.been.calledWithExactly(['Org1Peer1', 'Org1Peer2'], 'mychannel');
            localEnvironmentConnectionMock.getDiscoveredOrgs.should.have.been.calledOnceWithExactly('mychannel');

            executeCommandStub.should.have.been.calledWithExactly(ExtensionCommands.DEPLOY_SMART_CONTRACT, false, localEntry, 'orderer.example.com', 'mychannel', installApproveMap, packageEntryTwo, new FabricSmartContractDefinition('defName', '0.0.1', 1), commitMap);
        });

        it('should be able to change the package for a committed definition and commit', async () => {
            getConnectionStub.returns(localEnvironmentConnectionMock);
            localEnvironmentConnectionMock.getCommittedSmartContractDefinitions.resolves([{
                name: 'defName',
                version: '0.0.1',
                sequence: 1
            }]);

            const disposeStub: sinon.SinonStub = mySandBox.stub();
            const webviewPanel: vscode.WebviewPanel = {
                dispose: disposeStub
            } as unknown as vscode.WebviewPanel;

            const deployView: DeployView = new DeployView(context, deployData);
            DeployView.panel = webviewPanel;
            await deployView.deploy('mychannel', FabricRuntimeUtil.LOCAL_FABRIC, packageEntryTwo, 'defName', '0.0.1', true, undefined, undefined, ['Org2Peer1', 'Org2Peer2']);

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, localEntry);

            localEnvironmentConnectionMock.getAllOrdererNames.should.have.been.calledOnce;
            localEnvironmentConnectionMock.createChannelMap.should.have.been.calledOnce;
            localEnvironmentConnectionMock.getCommittedSmartContractDefinitions.should.have.been.calledWithExactly(['Org1Peer1', 'Org1Peer2'], 'mychannel');
            localEnvironmentConnectionMock.getDiscoveredOrgs.should.have.been.calledOnceWithExactly('mychannel');

            executeCommandStub.should.have.been.calledWithExactly(ExtensionCommands.DEPLOY_SMART_CONTRACT, true, localEntry, 'orderer.example.com', 'mychannel', installApproveMap, packageEntryTwo, new FabricSmartContractDefinition('defName', '0.0.1', 1), commitMap);
        });

        it('should update sequence number if definition version has changed', async () => {
            getConnectionStub.returns(localEnvironmentConnectionMock);
            localEnvironmentConnectionMock.getCommittedSmartContractDefinitions.resolves([{
                name: 'defName',
                version: '0.0.1',
                sequence: 1
            }]);

            const disposeStub: sinon.SinonStub = mySandBox.stub();
            const webviewPanel: vscode.WebviewPanel = {
                dispose: disposeStub
            } as unknown as vscode.WebviewPanel;

            const deployView: DeployView = new DeployView(context, deployData);
            DeployView.panel = webviewPanel;
            await deployView.deploy('mychannel', FabricRuntimeUtil.LOCAL_FABRIC, packageEntryOne, 'defName', '0.0.2', undefined, undefined, undefined, ['Org2Peer1', 'Org2Peer2']);

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, localEntry);

            localEnvironmentConnectionMock.getAllOrdererNames.should.have.been.calledOnce;
            localEnvironmentConnectionMock.createChannelMap.should.have.been.calledOnce;
            localEnvironmentConnectionMock.getCommittedSmartContractDefinitions.should.have.been.calledWithExactly(['Org1Peer1', 'Org1Peer2'], 'mychannel');
            localEnvironmentConnectionMock.getDiscoveredOrgs.should.have.been.calledOnceWithExactly('mychannel');

            executeCommandStub.should.have.been.calledWithExactly(ExtensionCommands.DEPLOY_SMART_CONTRACT, true, localEntry, 'orderer.example.com', 'mychannel', installApproveMap, packageEntryOne, new FabricSmartContractDefinition('defName', '0.0.2', 2), commitMap);
        });

        it('should be able to pass endorsement policy and bump sequence number', async () => {
            getConnectionStub.returns(localEnvironmentConnectionMock);
            localEnvironmentConnectionMock.getCommittedSmartContractDefinitions.resolves([{
                name: 'defName',
                version: '0.0.1',
                sequence: 1
            }]);

            const disposeStub: sinon.SinonStub = mySandBox.stub();
            const webviewPanel: vscode.WebviewPanel = {
                dispose: disposeStub
            } as unknown as vscode.WebviewPanel;

            const deployView: DeployView = new DeployView(context, deployData);
            DeployView.panel = webviewPanel;

            await deployView.deploy('mychannel', FabricRuntimeUtil.LOCAL_FABRIC, packageEntryOne, 'defName', '0.0.2', undefined, `OR('Org1.member','Org2.member')`, undefined, ['Org2Peer1', 'Org2Peer2']);

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, localEntry);

            localEnvironmentConnectionMock.getAllOrdererNames.should.have.been.calledOnce;
            localEnvironmentConnectionMock.createChannelMap.should.have.been.calledOnce;
            localEnvironmentConnectionMock.getCommittedSmartContractDefinitions.should.have.been.calledWithExactly(['Org1Peer1', 'Org1Peer2'], 'mychannel');
            localEnvironmentConnectionMock.getDiscoveredOrgs.should.have.been.calledOnceWithExactly('mychannel');

            executeCommandStub.should.have.been.calledWithExactly(ExtensionCommands.DEPLOY_SMART_CONTRACT, true, localEntry, 'orderer.example.com', 'mychannel', installApproveMap, packageEntryOne, new FabricSmartContractDefinition('defName', '0.0.2', 2, undefined, `OR('Org1.member','Org2.member')`, undefined), commitMap);
        });

        it('should be able to pass endorsement policy and replace double quotes', async () => {
            getConnectionStub.returns(localEnvironmentConnectionMock);
            localEnvironmentConnectionMock.getCommittedSmartContractDefinitions.resolves([{
                name: 'defName',
                version: '0.0.1',
                sequence: 1
            }]);

            const disposeStub: sinon.SinonStub = mySandBox.stub();
            const webviewPanel: vscode.WebviewPanel = {
                dispose: disposeStub
            } as unknown as vscode.WebviewPanel;

            const deployView: DeployView = new DeployView(context, deployData);
            DeployView.panel = webviewPanel;

            await deployView.deploy('mychannel', FabricRuntimeUtil.LOCAL_FABRIC, packageEntryOne, 'defName', '0.0.2', undefined, `OR("Org1.member","Org2.member")`, undefined, ['Org2Peer1', 'Org2Peer2']);

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, localEntry);

            localEnvironmentConnectionMock.getAllOrdererNames.should.have.been.calledOnce;
            localEnvironmentConnectionMock.createChannelMap.should.have.been.calledOnce;
            localEnvironmentConnectionMock.getCommittedSmartContractDefinitions.should.have.been.calledWithExactly(['Org1Peer1', 'Org1Peer2'], 'mychannel');
            localEnvironmentConnectionMock.getDiscoveredOrgs.should.have.been.calledOnceWithExactly('mychannel');

            executeCommandStub.should.have.been.calledWithExactly(ExtensionCommands.DEPLOY_SMART_CONTRACT, true, localEntry, 'orderer.example.com', 'mychannel', installApproveMap, packageEntryOne, new FabricSmartContractDefinition('defName', '0.0.2', 2, undefined, `OR('Org1.member','Org2.member')`, undefined), commitMap);
        });

        it('should be able to include collection file and bump sequence number', async () => {
            getConnectionStub.returns(localEnvironmentConnectionMock);
            localEnvironmentConnectionMock.getCommittedSmartContractDefinitions.resolves([{
                name: 'defName',
                version: '0.0.1',
                sequence: 1
            }]);

            const disposeStub: sinon.SinonStub = mySandBox.stub();
            const webviewPanel: vscode.WebviewPanel = {
                dispose: disposeStub
            } as unknown as vscode.WebviewPanel;

            const deployView: DeployView = new DeployView(context, deployData);
            DeployView.panel = webviewPanel;

            const collection: FabricCollectionDefinition[] = [
                {
                    "name": "CollectionOne",
                    "policy": "OR('Org1MSP.member')",
                    "requiredPeerCount": 1,
                    "maxPeerCount": 1,
                    "blockToLive": 0,
                    "memberOnlyRead": true
                }
            ];

            await deployView.deploy('mychannel', FabricRuntimeUtil.LOCAL_FABRIC, packageEntryOne, 'defName', '0.0.2', undefined, undefined, JSON.stringify(collection), ['Org2Peer1', 'Org2Peer2']);

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, localEntry);

            localEnvironmentConnectionMock.getAllOrdererNames.should.have.been.calledOnce;
            localEnvironmentConnectionMock.createChannelMap.should.have.been.calledOnce;
            localEnvironmentConnectionMock.getCommittedSmartContractDefinitions.should.have.been.calledWithExactly(['Org1Peer1', 'Org1Peer2'], 'mychannel');
            localEnvironmentConnectionMock.getDiscoveredOrgs.should.have.been.calledOnceWithExactly('mychannel');

            executeCommandStub.should.have.been.calledWithExactly(ExtensionCommands.DEPLOY_SMART_CONTRACT, true, localEntry, 'orderer.example.com', 'mychannel', installApproveMap, packageEntryOne, new FabricSmartContractDefinition('defName', '0.0.2', 2, undefined, undefined, collection), commitMap);
        });

        it('should include collection file and set sequence number if not previously committed', async () => {
            getConnectionStub.returns(localEnvironmentConnectionMock);
            localEnvironmentConnectionMock.getCommittedSmartContractDefinitions.resolves([]);

            const disposeStub: sinon.SinonStub = mySandBox.stub();
            const webviewPanel: vscode.WebviewPanel = {
                dispose: disposeStub
            } as unknown as vscode.WebviewPanel;

            const deployView: DeployView = new DeployView(context, deployData);
            DeployView.panel = webviewPanel;

            const collection: FabricCollectionDefinition[] = [
                {
                    "name": "CollectionOne",
                    "policy": "OR('Org1MSP.member')",
                    "requiredPeerCount": 1,
                    "maxPeerCount": 1,
                    "blockToLive": 0,
                    "memberOnlyRead": true
                }
            ];

            await deployView.deploy('mychannel', FabricRuntimeUtil.LOCAL_FABRIC, packageEntryOne, 'defName', '0.0.1', undefined, undefined, JSON.stringify(collection), ['Org2Peer1', 'Org2Peer2']);

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, localEntry);

            localEnvironmentConnectionMock.getAllOrdererNames.should.have.been.calledOnce;
            localEnvironmentConnectionMock.createChannelMap.should.have.been.calledOnce;
            localEnvironmentConnectionMock.getCommittedSmartContractDefinitions.should.have.been.calledWithExactly(['Org1Peer1', 'Org1Peer2'], 'mychannel');
            localEnvironmentConnectionMock.getDiscoveredOrgs.should.have.been.calledOnceWithExactly('mychannel');

            executeCommandStub.should.have.been.calledWithExactly(ExtensionCommands.DEPLOY_SMART_CONTRACT, true, localEntry, 'orderer.example.com', 'mychannel', installApproveMap, packageEntryOne, new FabricSmartContractDefinition('defName', '0.0.1', 1, undefined, undefined, collection), commitMap);
        });

    });

    describe('updatePackages', () => {

        beforeEach(() => {
            packageEntryOne.path = 'some/path.tgz';
            packageEntryTwo.path = 'some/path.cds';
        });

        it('should update deploy view with new packages [v2]', async () => {
            const getAllStub: sinon.SinonStub = mySandBox.stub(PackageRegistry.instance(), 'getAll').resolves([packageEntryOne, packageEntryTwo]);

            const webviewPanel: vscode.WebviewPanel = {
                webview: {
                    postMessage: postMessageStub
                }
            } as unknown as vscode.WebviewPanel;
            DeployView.panel = webviewPanel;
            DeployView.appState = { hasV1Capabilities: false };

            await DeployView.updatePackages();

            DeployView.appState.packageEntries.should.deep.equal([packageEntryOne]);

            getAllStub.should.have.been.calledOnce;
            postMessageStub.should.have.been.calledOnceWithExactly({
                path: '/deploy',
                deployData: DeployView.appState
            });

        });

        it('should update deploy view with new packages [v1]', async () => {
            const getAllStub: sinon.SinonStub = mySandBox.stub(PackageRegistry.instance(), 'getAll').resolves([packageEntryOne, packageEntryTwo]);

            const webviewPanel: vscode.WebviewPanel = {
                webview: {
                    postMessage: postMessageStub
                }
            } as unknown as vscode.WebviewPanel;
            DeployView.panel = webviewPanel;
            DeployView.appState = { hasV1Capabilities: true };

            await DeployView.updatePackages();

            DeployView.appState.packageEntries.should.deep.equal([packageEntryTwo]);

            getAllStub.should.have.been.calledOnce;
            postMessageStub.should.have.been.calledOnceWithExactly({
                path: '/deploy',
                deployData: DeployView.appState
            });

        });
    });

    describe('package message', () => {

        const onDidDisposePromises: any[] = [];
        beforeEach(async () => {

            onDidDisposePromises.push(new Promise((resolve: any): void => {
                createWebviewPanelStub.returns({
                    title: 'Deploy Smart Contract',
                    webview: {
                        postMessage: postMessageStub,
                        onDidReceiveMessage: async (callback: any): Promise<void> => {
                            await callback({
                                command: 'package',
                                data: {
                                    workspaceName: 'myWorkspace',
                                    packageName: 'packageName',
                                    packageVersion: '0.0.1',
                                    versionNumber: 2
                                }
                            });
                            resolve();
                        },
                        asWebviewUri: mySandBox.stub()
                    },
                    reveal: (): void => {
                        return;
                    },
                    onDidDispose: mySandBox.stub(),
                    onDidChangeViewState: mySandBox.stub(),
                    _isDisposed: false
                });
            }));
        });

        it('should update packages after packaging workspace', async () => {

            const deployView: DeployView = new DeployView(context, deployData);

            const packageEntry: PackageRegistryEntry = new PackageRegistryEntry();
            packageEntry.name = 'packageName';
            packageEntry.version = '0.0.1';
            packageEntry.sizeKB = 20000;
            packageEntry.path = '/some/path';

            const packageStub: sinon.SinonStub = mySandBox.stub(deployView, 'package').resolves(packageEntry);
            const updatePackagesStub: sinon.SinonStub = mySandBox.stub(DeployView, 'updatePackages').resolves();

            await deployView.openView(false);
            await Promise.all(onDidDisposePromises);

            packageStub.should.have.been.calledOnceWithExactly('myWorkspace', 'packageName', '0.0.1', 2);
            updatePackagesStub.should.have.been.calledOnce;
        });

        it('should not update packages if packaging workspace failed', async () => {

            const deployView: DeployView = new DeployView(context, deployData);

            const packageStub: sinon.SinonStub = mySandBox.stub(deployView, 'package').resolves();
            const updatePackagesStub: sinon.SinonStub = mySandBox.stub(DeployView, 'updatePackages').resolves();

            await deployView.openView(false);
            await Promise.all(onDidDisposePromises);

            packageStub.should.have.been.calledOnceWithExactly('myWorkspace', 'packageName', '0.0.1', 2);
            updatePackagesStub.should.not.have.been.called;
        });

    });

    describe('package', () => {
        it('should package a workspace', async () => {
            const workspaceOne: vscode.WorkspaceFolder = {
                name: 'workspaceOne',
                uri: vscode.Uri.file('myPath'),
                index: 0
            };
            const workspaceTwo: vscode.WorkspaceFolder = {
                name: 'workspaceTwo',
                uri: vscode.Uri.file('otherPath'),
                index: 1
            };
            const getWorkspaceFoldersStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'getWorkspaceFolders').returns([workspaceOne, workspaceTwo]);

            const deployView: DeployView = new DeployView(context, deployData);
            await deployView.package(workspaceTwo.name, 'packageName', '0.0.1', 2);

            getWorkspaceFoldersStub.should.have.been.calledOnce;
            executeCommandStub.should.have.been.calledOnceWithExactly(ExtensionCommands.PACKAGE_SMART_CONTRACT, workspaceTwo, 'packageName', '0.0.1', 2);
        });
    });

    describe('getOrgApprovals message', () => {

        const onDidDisposePromises: any[] = [];
        beforeEach(async () => {

            onDidDisposePromises.push(new Promise((resolve: any): void => {
                createWebviewPanelStub.returns({
                    title: 'Deploy Smart Contract',
                    webview: {
                        postMessage: postMessageStub,
                        onDidReceiveMessage: async (callback: any): Promise<void> => {
                            await callback({
                                command: 'getOrgApprovals',
                                data: {
                                    channelName: 'mychannel',
                                    environmentName: FabricRuntimeUtil.LOCAL_FABRIC,
                                    definitionName: 'packageOneName',
                                    definitionVersion: 'packageOneVersion',
                                    endorsmentPolicy: undefined,
                                    collectionConfig: '',
                                }
                            });
                            resolve();
                        },
                        asWebviewUri: mySandBox.stub()
                    },
                    reveal: (): void => {
                        return;
                    },
                    onDidDispose: mySandBox.stub(),
                    onDidChangeViewState: mySandBox.stub(),
                    _isDisposed: false
                });
            }));
        });

        it('should get commit approval', async () => {

            const deployView: DeployView = new DeployView(context, deployData);

            const getOrgApprovalsStub: sinon.SinonStub = mySandBox.stub(deployView, 'getOrgApprovals').resolves();

            await deployView.openView(false);
            await Promise.all(onDidDisposePromises);

            getOrgApprovalsStub.should.have.been.calledOnceWithExactly(FabricRuntimeUtil.LOCAL_FABRIC, 'mychannel', 'packageOneName', 'packageOneVersion', undefined, '');
        });

    });

    describe('getOrgApprovals', () => {

        beforeEach(() => {
            try {
                // Reset
                DeployView.appState.orgApprovals = {};
            } catch (err) {
                // Ignore
            }
        });

        it('should get org approvals if already connected', async () => {

            getConnectionStub.returns(localEnvironmentConnectionMock);

            const webviewPanel: vscode.WebviewPanel = {
                webview: {
                    postMessage: postMessageStub,
                    asWebviewUri: mySandBox.stub()
                }
            } as unknown as vscode.WebviewPanel;

            const deployView: DeployView = new DeployView(context, deployData);
            DeployView.panel = webviewPanel;

            const channelMap: Map<string, string[]> = new Map();
            channelMap.set('mychannel', ['Org1Peer1', 'Org2Peer1']);
            localEnvironmentConnectionMock.createChannelMap.resolves(channelMap);

            await deployView.getOrgApprovals(FabricRuntimeUtil.LOCAL_FABRIC, 'mychannel', 'defName', '0.0.1', undefined, undefined);
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, localEntry);

            localEnvironmentConnectionMock.createChannelMap.should.have.been.calledOnce;
            localEnvironmentConnectionMock.getCommittedSmartContractDefinitions.should.have.been.calledWithExactly(['Org1Peer1', 'Org2Peer1'], 'mychannel');

            const definition: FabricSmartContractDefinition = new FabricSmartContractDefinition('defName', '0.0.1', 1);
            localEnvironmentConnectionMock.getOrgApprovals.should.have.been.calledOnceWithExactly('mychannel', 'Org1Peer1', definition);
            DeployView.appState.orgApprovals.should.deep.equal({
                'Org1MSP': true,
                'Org2MSP': false
            });
            postMessageStub.should.have.been.calledOnceWithExactly({
                path: '/deploy',
                deployData: DeployView.appState
            });

        });

        it('should not return org approvals if deploy view is no longer open whilst running', async () => {

            getConnectionStub.returns(localEnvironmentConnectionMock);

            const deployView: DeployView = new DeployView(context, deployData);
            DeployView.panel = undefined;

            const channelMap: Map<string, string[]> = new Map();
            channelMap.set('mychannel', ['Org1Peer1', 'Org2Peer1']);
            localEnvironmentConnectionMock.createChannelMap.resolves(channelMap);

            await deployView.getOrgApprovals(FabricRuntimeUtil.LOCAL_FABRIC, 'mychannel', 'defName', '0.0.1', undefined, undefined);
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, localEntry);

            localEnvironmentConnectionMock.createChannelMap.should.have.been.calledOnce;
            localEnvironmentConnectionMock.getCommittedSmartContractDefinitions.should.have.been.calledWithExactly(['Org1Peer1', 'Org2Peer1'], 'mychannel');

            const definition: FabricSmartContractDefinition = new FabricSmartContractDefinition('defName', '0.0.1', 1);
            localEnvironmentConnectionMock.getOrgApprovals.should.have.been.calledOnceWithExactly('mychannel', 'Org1Peer1', definition);
            DeployView.appState.orgApprovals.should.deep.equal({
                'Org1MSP': true,
                'Org2MSP': false
            });
            postMessageStub.should.not.have.been.called;

        });

        it('should disconnect, connect to correct environment and get org approvals', async () => {
            getConnectionStub.onCall(0).returns(otherEnvironmentConnectionMock);
            getConnectionStub.onCall(1).returns(localEnvironmentConnectionMock);

            const webviewPanel: vscode.WebviewPanel = {
                webview: {
                    postMessage: postMessageStub
                }
            } as unknown as vscode.WebviewPanel;

            const deployView: DeployView = new DeployView(context, deployData);
            DeployView.panel = webviewPanel;

            const channelMap: Map<string, string[]> = new Map();
            channelMap.set('mychannel', ['Org1Peer1', 'Org2Peer1']);
            localEnvironmentConnectionMock.createChannelMap.resolves(channelMap);

            await deployView.getOrgApprovals(FabricRuntimeUtil.LOCAL_FABRIC, 'mychannel', 'defName', '0.0.1', undefined, undefined);

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, localEntry);

            localEnvironmentConnectionMock.createChannelMap.should.have.been.calledOnce;
            localEnvironmentConnectionMock.getCommittedSmartContractDefinitions.should.have.been.calledWithExactly(['Org1Peer1', 'Org2Peer1'], 'mychannel');

            const definition: FabricSmartContractDefinition = new FabricSmartContractDefinition('defName', '0.0.1', 1);
            localEnvironmentConnectionMock.getOrgApprovals.should.have.been.calledOnceWithExactly('mychannel', 'Org1Peer1', definition);
            DeployView.appState.orgApprovals.should.deep.equal({
                'Org1MSP': true,
                'Org2MSP': false
            });
            postMessageStub.should.have.been.calledOnceWithExactly({
                path: '/deploy',
                deployData: DeployView.appState
            });
        });

        it('should connect to environment if disconnected and get org approvals', async () => {
            getConnectionStub.onCall(0).returns(undefined);
            getConnectionStub.onCall(1).returns(localEnvironmentConnectionMock);

            const webviewPanel: vscode.WebviewPanel = {
                webview: {
                    postMessage: postMessageStub
                }
            } as unknown as vscode.WebviewPanel;

            const deployView: DeployView = new DeployView(context, deployData);
            DeployView.panel = webviewPanel;

            const channelMap: Map<string, string[]> = new Map();
            channelMap.set('mychannel', ['Org1Peer1', 'Org2Peer1']);
            localEnvironmentConnectionMock.createChannelMap.resolves(channelMap);

            await deployView.getOrgApprovals(FabricRuntimeUtil.LOCAL_FABRIC, 'mychannel', 'defName', '0.0.1', undefined, undefined);

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, localEntry);

            localEnvironmentConnectionMock.createChannelMap.should.have.been.calledOnce;
            localEnvironmentConnectionMock.getCommittedSmartContractDefinitions.should.have.been.calledWithExactly(['Org1Peer1', 'Org2Peer1'], 'mychannel');

            const definition: FabricSmartContractDefinition = new FabricSmartContractDefinition('defName', '0.0.1', 1);
            localEnvironmentConnectionMock.getOrgApprovals.should.have.been.calledOnceWithExactly('mychannel', 'Org1Peer1', definition);
            DeployView.appState.orgApprovals.should.deep.equal({
                'Org1MSP': true,
                'Org2MSP': false
            });
            postMessageStub.should.have.been.calledOnceWithExactly({
                path: '/deploy',
                deployData: DeployView.appState
            });
        });

        it('should error if unable to connect to environment', async () => {
            getConnectionStub.returns(undefined);

            const webviewPanel: vscode.WebviewPanel = {
                webview: {
                    postMessage: postMessageStub
                }
            } as unknown as vscode.WebviewPanel;

            const deployView: DeployView = new DeployView(context, deployData);
            DeployView.panel = webviewPanel;

            const channelMap: Map<string, string[]> = new Map();
            channelMap.set('mychannel', ['Org1Peer1', 'Org2Peer1']);
            localEnvironmentConnectionMock.createChannelMap.resolves(channelMap);

            await deployView.getOrgApprovals(FabricRuntimeUtil.LOCAL_FABRIC, 'mychannel', 'defName', '0.0.1', undefined, undefined);

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, localEntry);
            localEnvironmentConnectionMock.createChannelMap.should.not.have.been.called;
            localEnvironmentConnectionMock.getCommittedSmartContractDefinitions.should.not.have.been.called;

            localEnvironmentConnectionMock.getOrgApprovals.should.not.have.been.called;
            postMessageStub.should.not.have.been.called;
            const error: Error = new Error(`Unable to deploy, cannot connect to environment: ${FabricRuntimeUtil.LOCAL_FABRIC}`);
            logStub.should.have.been.calledOnceWithExactly(LogType.ERROR, error.message, error.toString());
        });

        it('should get org approvals if contract with same name already exists', async () => {

            getConnectionStub.returns(localEnvironmentConnectionMock);

            const webviewPanel: vscode.WebviewPanel = {
                webview: {
                    postMessage: postMessageStub
                }
            } as unknown as vscode.WebviewPanel;

            const deployView: DeployView = new DeployView(context, deployData);
            DeployView.panel = webviewPanel;

            const channelMap: Map<string, string[]> = new Map();
            channelMap.set('mychannel', ['Org1Peer1', 'Org2Peer1']);
            localEnvironmentConnectionMock.createChannelMap.resolves(channelMap);
            localEnvironmentConnectionMock.getCommittedSmartContractDefinitions.resolves([{ name: 'defName', version: '0.0.1', sequence: 1 }]);

            await deployView.getOrgApprovals(FabricRuntimeUtil.LOCAL_FABRIC, 'mychannel', 'defName', '0.0.2', undefined, undefined);
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, localEntry);

            localEnvironmentConnectionMock.createChannelMap.should.have.been.calledOnce;
            localEnvironmentConnectionMock.getCommittedSmartContractDefinitions.should.have.been.calledWithExactly(['Org1Peer1', 'Org2Peer1'], 'mychannel');

            const definition: FabricSmartContractDefinition = new FabricSmartContractDefinition('defName', '0.0.2', 2);
            localEnvironmentConnectionMock.getOrgApprovals.should.have.been.calledOnceWithExactly('mychannel', 'Org1Peer1', definition);
            DeployView.appState.orgApprovals.should.deep.equal({
                'Org1MSP': true,
                'Org2MSP': false
            });
            postMessageStub.should.have.been.calledOnceWithExactly({
                path: '/deploy',
                deployData: DeployView.appState
            });

        });

        it(`shouldn't get org approvals if contract with same name and version already exists`, async () => {

            getConnectionStub.returns(localEnvironmentConnectionMock);

            const webviewPanel: vscode.WebviewPanel = {
                webview: {
                    postMessage: postMessageStub
                }
            } as unknown as vscode.WebviewPanel;

            const deployView: DeployView = new DeployView(context, deployData);
            DeployView.panel = webviewPanel;

            const channelMap: Map<string, string[]> = new Map();
            channelMap.set('mychannel', ['Org1Peer1', 'Org2Peer1']);
            localEnvironmentConnectionMock.createChannelMap.resolves(channelMap);
            localEnvironmentConnectionMock.getCommittedSmartContractDefinitions.resolves([{ name: 'defName', version: '0.0.2', sequence: 1 }]);
            localEnvironmentConnectionMock.getOrgApprovals.rejects('sequenece needs incrementing'); // Not the exact error that would be shown

            await deployView.getOrgApprovals(FabricRuntimeUtil.LOCAL_FABRIC, 'mychannel', 'defName', '0.0.2', undefined, undefined);
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, localEntry);

            localEnvironmentConnectionMock.createChannelMap.should.have.been.calledOnce;
            localEnvironmentConnectionMock.getCommittedSmartContractDefinitions.should.have.been.calledWithExactly(['Org1Peer1', 'Org2Peer1'], 'mychannel');

            const definition: FabricSmartContractDefinition = new FabricSmartContractDefinition('defName', '0.0.2', 1);
            localEnvironmentConnectionMock.getOrgApprovals.should.have.been.calledOnceWithExactly('mychannel', 'Org1Peer1', definition);
            DeployView.appState.orgApprovals.should.deep.equal({});
            postMessageStub.should.have.been.calledOnceWithExactly({
                path: '/deploy',
                deployData: DeployView.appState
            });

        });

        it('should get org approvals if passing an endorsement policy', async () => {

            getConnectionStub.returns(localEnvironmentConnectionMock);

            const webviewPanel: vscode.WebviewPanel = {
                webview: {
                    postMessage: postMessageStub
                }
            } as unknown as vscode.WebviewPanel;

            const deployView: DeployView = new DeployView(context, deployData);
            DeployView.panel = webviewPanel;

            const channelMap: Map<string, string[]> = new Map();
            channelMap.set('mychannel', ['Org1Peer1', 'Org2Peer1']);
            localEnvironmentConnectionMock.createChannelMap.resolves(channelMap);

            await deployView.getOrgApprovals(FabricRuntimeUtil.LOCAL_FABRIC, 'mychannel', 'defName', '0.0.1', 'OR("Org1MSP.member","Org2MSP.member")', undefined);
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, localEntry);

            localEnvironmentConnectionMock.createChannelMap.should.have.been.calledOnce;
            localEnvironmentConnectionMock.getCommittedSmartContractDefinitions.should.have.been.calledWithExactly(['Org1Peer1', 'Org2Peer1'], 'mychannel');

            const definition: FabricSmartContractDefinition = new FabricSmartContractDefinition('defName', '0.0.1', 1, undefined, `OR('Org1MSP.member','Org2MSP.member')`);
            localEnvironmentConnectionMock.getOrgApprovals.should.have.been.calledOnceWithExactly('mychannel', 'Org1Peer1', definition);
            DeployView.appState.orgApprovals.should.deep.equal({
                'Org1MSP': true,
                'Org2MSP': false
            });
            postMessageStub.should.have.been.calledOnceWithExactly({
                path: '/deploy',
                deployData: DeployView.appState
            });

        });

        it('should get org approvals if passing a collections file', async () => {

            getConnectionStub.returns(localEnvironmentConnectionMock);

            const webviewPanel: vscode.WebviewPanel = {
                webview: {
                    postMessage: postMessageStub
                }
            } as unknown as vscode.WebviewPanel;

            const deployView: DeployView = new DeployView(context, deployData);
            DeployView.panel = webviewPanel;

            const channelMap: Map<string, string[]> = new Map();
            channelMap.set('mychannel', ['Org1Peer1', 'Org2Peer1']);
            localEnvironmentConnectionMock.createChannelMap.resolves(channelMap);

            const collection: FabricCollectionDefinition[] = [
                {
                    "name": "CollectionOne",
                    "policy": "OR('Org1MSP.member')",
                    "requiredPeerCount": 1,
                    "maxPeerCount": 1,
                    "blockToLive": 0,
                    "memberOnlyRead": true
                }
            ];

            await deployView.getOrgApprovals(FabricRuntimeUtil.LOCAL_FABRIC, 'mychannel', 'defName', '0.0.1', undefined, JSON.stringify(collection));
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, localEntry);

            localEnvironmentConnectionMock.createChannelMap.should.have.been.calledOnce;
            localEnvironmentConnectionMock.getCommittedSmartContractDefinitions.should.have.been.calledWithExactly(['Org1Peer1', 'Org2Peer1'], 'mychannel');

            const definition: FabricSmartContractDefinition = new FabricSmartContractDefinition('defName', '0.0.1', 1, undefined, undefined, collection);
            localEnvironmentConnectionMock.getOrgApprovals.should.have.been.calledOnceWithExactly('mychannel', 'Org1Peer1', definition);
            DeployView.appState.orgApprovals.should.deep.equal({
                'Org1MSP': true,
                'Org2MSP': false
            });
            postMessageStub.should.have.been.calledOnceWithExactly({
                path: '/deploy',
                deployData: DeployView.appState
            });

        });

    });

    describe('instantiate / upgrade message', () => {
        const onDidDisposePromises: any[] = [];

        it('should handle instantiate message', async () => {
            onDidDisposePromises.push(new Promise((resolve: any): void => {
                createWebviewPanelStub.returns({
                    title: 'Deploy Smart Contract',
                    webview: {
                        postMessage: postMessageStub,
                        onDidReceiveMessage: async (callback: any): Promise<void> => {
                            await callback({
                                command: 'instantiate',
                                data: {
                                    channelName: 'mychannel',
                                    environmentName: FabricRuntimeUtil.LOCAL_FABRIC,
                                    selectedPackage: packageEntryOne,
                                    instantiateFunctionName: '',
                                    instantiateFunctionArgs: '',
                                    endorsmentPolicy: undefined,
                                    collectionConfig: '',
                                }
                            });
                            resolve();
                        },
                        asWebviewUri: mySandBox.stub()
                    },
                    reveal: (): void => {
                        return;
                    },
                    onDidDispose: mySandBox.stub(),
                    onDidChangeViewState: mySandBox.stub(),
                    _isDisposed: false
                });
            }));

            const deployView: DeployView = new DeployView(context, deployData);
            const deployV1Stub: sinon.SinonStub = mySandBox.stub(deployView, 'deployV1').resolves();
            await deployView.openView(false);
            await Promise.all(onDidDisposePromises);
            deployV1Stub.should.have.been.calledWith('instantiate', 'mychannel', FabricRuntimeUtil.LOCAL_FABRIC, packageEntryOne, { name: '', args: '' }, undefined, '');
        });

        it('should handle instantiate message', async () => {
            onDidDisposePromises.push(new Promise((resolve: any): void => {
                createWebviewPanelStub.returns({
                    title: 'Deploy Smart Contract',
                    webview: {
                        postMessage: postMessageStub,
                        onDidReceiveMessage: async (callback: any): Promise<void> => {
                            await callback({
                                command: 'upgrade',
                                data: {
                                    channelName: 'mychannel',
                                    environmentName: FabricRuntimeUtil.LOCAL_FABRIC,
                                    selectedPackage: packageEntryOne,
                                    instantiateFunctionName: '',
                                    instantiateFunctionArgs: '',
                                    endorsmentPolicy: undefined,
                                    collectionConfig: '',
                                }
                            });
                            resolve();
                        },
                        asWebviewUri: mySandBox.stub()
                    },
                    reveal: (): void => {
                        return;
                    },
                    onDidDispose: mySandBox.stub(),
                    onDidChangeViewState: mySandBox.stub(),
                    _isDisposed: false
                });
            }));

            const deployView: DeployView = new DeployView(context, deployData);
            const deployV1Stub: sinon.SinonStub = mySandBox.stub(deployView, 'deployV1').resolves();
            await deployView.openView(false);
            await Promise.all(onDidDisposePromises);
            deployV1Stub.should.have.been.calledWith('upgrade', 'mychannel', FabricRuntimeUtil.LOCAL_FABRIC, packageEntryOne, { name: '', args: '' }, undefined, '');
        });
    });

    describe('deployV1', () => {
        const instantiateFunction: IInstantiateFunction = {
            name: '',
            args: '',
        };

        it('should instantiate new contract if already connected', async () => {
            getConnectionStub.returns(localEnvironmentConnectionMock);

            const disposeStub: sinon.SinonStub = mySandBox.stub();
            const webviewPanel: vscode.WebviewPanel = {
                dispose: disposeStub
            } as unknown as vscode.WebviewPanel;

            const deployView: DeployView = new DeployView(context, deployData);
            DeployView.panel = webviewPanel;
            await deployView.deployV1('instantiate', 'mychannel', FabricRuntimeUtil.LOCAL_FABRIC, packageEntryOne, instantiateFunction, undefined, undefined);
            disposeStub.should.have.been.calledOnce;
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, localEntry);

            executeCommandStub.should.have.been.calledWithExactly(ExtensionCommands.INSTANTIATE_SMART_CONTRACT, 'mychannel', ["Org1Peer1", "Org1Peer2"], packageEntryOne, '', [], undefined, undefined);
        });

        it('should disconnect, connect to correct environment and instantiate new contract', async () => {
            getConnectionStub.onCall(0).returns(otherEnvironmentConnectionMock);
            getConnectionStub.onCall(1).returns(localEnvironmentConnectionMock);

            const disposeStub: sinon.SinonStub = mySandBox.stub();
            const webviewPanel: vscode.WebviewPanel = {
                dispose: disposeStub
            } as unknown as vscode.WebviewPanel;

            const deployView: DeployView = new DeployView(context, deployData);
            DeployView.panel = webviewPanel;
            await deployView.deployV1('instantiate', 'mychannel', FabricRuntimeUtil.LOCAL_FABRIC, packageEntryOne, instantiateFunction, undefined, undefined);

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, localEntry);

            executeCommandStub.should.have.been.calledWithExactly(ExtensionCommands.INSTANTIATE_SMART_CONTRACT, 'mychannel', ["Org1Peer1", "Org1Peer2"], packageEntryOne, '', [], undefined, undefined);
        });

        it('should connect to environment if disconnected and instantiate new contract', async () => {
            getConnectionStub.onCall(0).returns(undefined);
            getConnectionStub.onCall(1).returns(localEnvironmentConnectionMock);

            const disposeStub: sinon.SinonStub = mySandBox.stub();
            const webviewPanel: vscode.WebviewPanel = {
                dispose: disposeStub
            } as unknown as vscode.WebviewPanel;

            const deployView: DeployView = new DeployView(context, deployData);
            DeployView.panel = webviewPanel;
            await deployView.deployV1('instantiate', 'mychannel', FabricRuntimeUtil.LOCAL_FABRIC, packageEntryOne, instantiateFunction, undefined, undefined);

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, localEntry);

            executeCommandStub.should.have.been.calledWithExactly(ExtensionCommands.INSTANTIATE_SMART_CONTRACT, 'mychannel', ["Org1Peer1", "Org1Peer2"], packageEntryOne, '', [], undefined, undefined);
        });

        it('should error if unable to connect to environment', async () => {
            getConnectionStub.returns(undefined);

            const disposeStub: sinon.SinonStub = mySandBox.stub();
            const webviewPanel: vscode.WebviewPanel = {
                dispose: disposeStub
            } as unknown as vscode.WebviewPanel;

            const deployView: DeployView = new DeployView(context, deployData);
            DeployView.panel = webviewPanel;

            await deployView.deployV1('instantiate', 'mychannel', FabricRuntimeUtil.LOCAL_FABRIC, packageEntryOne, instantiateFunction, undefined, undefined);

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, localEntry);

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.INSTANTIATE_SMART_CONTRACT);

            const error: Error = new Error(`Unable to deploy, cannot connect to environment: ${FabricRuntimeUtil.LOCAL_FABRIC}`);
            logStub.should.have.been.calledOnceWithExactly(LogType.ERROR, error.message, error.toString());
        });

        it('should parse instantiate function arguments', async () => {
            getConnectionStub.returns(localEnvironmentConnectionMock);

            const disposeStub: sinon.SinonStub = mySandBox.stub();
            const webviewPanel: vscode.WebviewPanel = {
                dispose: disposeStub
            } as unknown as vscode.WebviewPanel;

            const deployView: DeployView = new DeployView(context, deployData);
            DeployView.panel = webviewPanel;
            await deployView.deployV1('instantiate', 'mychannel', FabricRuntimeUtil.LOCAL_FABRIC, packageEntryOne, { name: 'myFunction', args: '["arg1", "arg2"]' }, undefined, undefined);
            disposeStub.should.have.been.calledOnce;
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, localEntry);

            executeCommandStub.should.have.been.calledWithExactly(ExtensionCommands.INSTANTIATE_SMART_CONTRACT, 'mychannel', ["Org1Peer1", "Org1Peer2"], packageEntryOne, 'myFunction', ['arg1', 'arg2'], undefined, undefined);
        });

        it(`should throw error if instantiate arguments aren't valid`, async () => {
            getConnectionStub.returns(localEnvironmentConnectionMock);

            const disposeStub: sinon.SinonStub = mySandBox.stub();
            const webviewPanel: vscode.WebviewPanel = {
                dispose: disposeStub
            } as unknown as vscode.WebviewPanel;

            const deployView: DeployView = new DeployView(context, deployData);
            DeployView.panel = webviewPanel;
            await deployView.deployV1('instantiate', 'mychannel', FabricRuntimeUtil.LOCAL_FABRIC, packageEntryOne, { name: 'myFunction', args: '["arg1", "arg2"' }, undefined, undefined);
            disposeStub.should.have.been.calledOnce;
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, localEntry);

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.INSTANTIATE_SMART_CONTRACT);

            const error: Error = new Error('instantiate function arguments should be in the format ["arg1", {"key" : "value"}]');
            logStub.should.have.been.calledOnceWithExactly(LogType.ERROR, error.message, error.toString());
        });

        it('should be able to pass endorsement policy and replace double quotes', async () => {
            getConnectionStub.returns(localEnvironmentConnectionMock);
            const disposeStub: sinon.SinonStub = mySandBox.stub();
            const webviewPanel: vscode.WebviewPanel = {
                dispose: disposeStub
            } as unknown as vscode.WebviewPanel;

            const deployView: DeployView = new DeployView(context, deployData);
            DeployView.panel = webviewPanel;

            await deployView.deployV1('instantiate', 'mychannel', FabricRuntimeUtil.LOCAL_FABRIC, packageEntryOne, instantiateFunction, `OR("Org1.member","Org2.member")`, undefined);

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, localEntry);

            executeCommandStub.should.have.been.calledWithExactly(ExtensionCommands.INSTANTIATE_SMART_CONTRACT, 'mychannel', ["Org1Peer1", "Org1Peer2"], packageEntryOne, '', [], `OR('Org1.member','Org2.member')`, undefined);
        });

        it('should upgrade a smart contract', async () => {
            getConnectionStub.returns(localEnvironmentConnectionMock);

            const disposeStub: sinon.SinonStub = mySandBox.stub();
            const webviewPanel: vscode.WebviewPanel = {
                dispose: disposeStub
            } as unknown as vscode.WebviewPanel;

            const deployView: DeployView = new DeployView(context, deployData);
            DeployView.panel = webviewPanel;
            await deployView.deployV1('upgrade', 'mychannel', FabricRuntimeUtil.LOCAL_FABRIC, packageEntryOne, instantiateFunction, undefined, undefined);
            disposeStub.should.have.been.calledOnce;
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, localEntry);

            executeCommandStub.should.have.been.calledWithExactly(ExtensionCommands.UPGRADE_SMART_CONTRACT, 'mychannel', ["Org1Peer1", "Org1Peer2"], packageEntryOne, '', [], undefined, undefined);
        });
    });

    describe('getPackageLanguage message', () => {
        const onDidDisposePromises: any[] = [];

        beforeEach(async () => {
            onDidDisposePromises.push(new Promise((resolve: any): void => {
                createWebviewPanelStub.returns({
                    title: 'Deploy Smart Contract',
                    webview: {
                        postMessage: postMessageStub,
                        onDidReceiveMessage: async (callback: any): Promise<void> => {
                            await callback({
                                command: 'getPackageLanguage',
                                data: {
                                    workspaceName: 'myWorkspace'
                                }
                            });
                            resolve();
                        },
                        asWebviewUri: mySandBox.stub()
                    },
                    reveal: (): void => {
                        return;
                    },
                    onDidDispose: mySandBox.stub(),
                    onDidChangeViewState: mySandBox.stub(),
                    _isDisposed: false
                });
            }));
        });

        it('should get the language of a node project', async () => {
            const deployView: DeployView = new DeployView(context, deployData);
            const getWorkspaceStub: sinon.SinonStub = mySandBox.stub(deployView, 'getWorkspace').returns({ uri: { fsPath: 'some/file/path' } });
            const getLanguageStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'getLanguage').resolves('node');

            const mockWorkspaceString: string = '{"name": "packageName", "version": "0.0.1"}';
            mySandBox.stub(fs, 'readFile').resolves(Buffer.from(mockWorkspaceString));

            await deployView.openView(false);
            await Promise.all(onDidDisposePromises);

            getWorkspaceStub.should.have.been.calledOnceWithExactly('myWorkspace');
            getLanguageStub.should.have.been.calledOnce;
            postMessageStub.should.have.been.calledWith({
                path: 'deploy',
                deployData: ({
                    channelName: 'mychannel',
                    environmentName: FabricRuntimeUtil.LOCAL_FABRIC,
                    selectedPackage: undefined,
                    selectedWorkspace: "myWorkspace",
                    chosenWorkspaceData: {
                        language: 'node',
                        name: 'packageName',
                        version: '0.0.1'
                    }
                })
            });
        });

        it('should get the language of any other project', async () => {
            const deployView: DeployView = new DeployView(context, deployData);
            const getWorkspaceStub: sinon.SinonStub = mySandBox.stub(deployView, 'getWorkspace');
            const getLanguageStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'getLanguage').resolves('go');
            await deployView.openView(false);
            await Promise.all(onDidDisposePromises);

            getWorkspaceStub.should.have.been.calledOnceWithExactly('myWorkspace');
            getLanguageStub.should.have.been.calledOnce;
            postMessageStub.should.have.been.calledWith({
                path: 'deploy',
                deployData: ({
                    channelName: 'mychannel',
                    environmentName: FabricRuntimeUtil.LOCAL_FABRIC,
                    selectedPackage: undefined,
                    selectedWorkspace: "myWorkspace",
                    chosenWorkspaceData: {
                        language: 'go',
                        name: '',
                        version: ''
                    }
                })
            });
        });

    });

});
