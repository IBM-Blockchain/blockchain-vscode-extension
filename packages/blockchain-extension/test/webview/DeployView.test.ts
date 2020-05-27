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
import {View} from '../../extension/webview/View';
import {TestUtil} from '../TestUtil';
import {GlobalState} from '../../extension/util/GlobalState';
import {DeployView} from '../../extension/webview/DeployView';
import {
    FabricRuntimeUtil,
    FabricEnvironmentRegistryEntry,
    FabricEnvironmentRegistry,
    LogType,
    FabricSmartContractDefinition
} from 'ibm-blockchain-platform-common';
import {PackageRegistryEntry} from '../../extension/registries/PackageRegistryEntry';
import {FabricEnvironmentManager} from '../../extension/fabric/environments/FabricEnvironmentManager';
import {FabricEnvironmentConnection} from 'ibm-blockchain-platform-environment-v1';
import {ExtensionCommands} from '../../ExtensionCommands';
import {VSCodeBlockchainOutputAdapter} from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { PackageRegistry } from '../../extension/registries/PackageRegistry';
import { UserInputUtil } from '../../extension/commands/UserInputUtil';

chai.use(sinonChai);
const should: Chai.Should = chai.should();
// tslint:disable no-unused-expression

describe('DeployView', () => {
    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();
    let context: vscode.ExtensionContext;
    let createWebviewPanelStub: sinon.SinonStub;
    let postMessageStub: sinon.SinonStub;
    let executeCommandStub: sinon.SinonStub;
    let logStub: sinon.SinonStub;

    const deployData: { channelName: string, environmentName: string } = {
        channelName: 'mychannel',
        environmentName: FabricRuntimeUtil.LOCAL_FABRIC
    };

    const initialMessage: { path: string, deployData: { channelName: string, environmentName: string } } = {
        path: '/deploy',
        deployData
    };

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

    before(async () => {
        await TestUtil.setupTests(mySandBox);
    });

    beforeEach(async () => {
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
        const channelMap: Map<string, string[]> = new Map<string, string[]>();
        channelMap.set('mychannel', ['peer0.org1.example.com', 'peer0.org2.example.com']);
        localEnvironmentConnectionMock.createChannelMap.resolves(channelMap);
        localEnvironmentConnectionMock.getAllOrganizationNames.returns(['Org1', 'Org2', 'Orderer']);
        localEnvironmentConnectionMock.getAllPeerNamesForOrg.withArgs('Org1').returns(['peer0.org1.example.com', 'random.peer']);
        localEnvironmentConnectionMock.getAllPeerNamesForOrg.withArgs('Org2').returns(['peer0.org2.example.com']);
        localEnvironmentConnectionMock.getAllPeerNamesForOrg.withArgs('Orderer').returns([]);
        localEnvironmentConnectionMock.getAllOrdererNames.returns(['orderer.example.com']);
        localEnvironmentConnectionMock.getCommittedSmartContractDefinitions.resolves([]);

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
                onDidReceiveMessage: mySandBox.stub()
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
                    }
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
                onDidReceiveMessage: mySandBox.stub()
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
                                    commitSmartContract: undefined
                                }
                            });
                            resolve();
                        }
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

            deployStub.should.have.been.calledOnceWithExactly('mychannel', FabricRuntimeUtil.LOCAL_FABRIC, packageEntryOne, 'packageOneName', 'packageOneVersion', undefined);
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
            await deployView.deploy('mychannel', FabricRuntimeUtil.LOCAL_FABRIC, packageEntryOne, 'defName', '0.0.1', undefined);
            disposeStub.should.have.been.calledOnce;
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, localEntry);

            localEnvironmentConnectionMock.createChannelMap.should.have.been.calledOnce;
            localEnvironmentConnectionMock.getAllPeerNamesForOrg.should.have.been.calledThrice;
            localEnvironmentConnectionMock.getAllOrdererNames.should.have.been.calledOnce;
            localEnvironmentConnectionMock.getAllOrganizationNames.should.have.been.calledOnce;
            localEnvironmentConnectionMock.getCommittedSmartContractDefinitions.should.have.been.calledWithExactly(['peer0.org1.example.com', 'peer0.org2.example.com'], 'mychannel');

            const orgMap: Map<string, string[]> = new Map<string, string[]>();
            orgMap.set('Org1', ['peer0.org1.example.com']);
            orgMap.set('Org2', ['peer0.org2.example.com']);
            executeCommandStub.should.have.been.calledWithExactly(ExtensionCommands.DEPLOY_SMART_CONTRACT, true, localEntry, 'orderer.example.com', 'mychannel', orgMap, packageEntryOne, new FabricSmartContractDefinition('defName', '0.0.1', 1));
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
            await deployView.deploy('mychannel', FabricRuntimeUtil.LOCAL_FABRIC, packageEntryOne, 'defName', '0.0.1', undefined);

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, localEntry);

            localEnvironmentConnectionMock.createChannelMap.should.have.been.calledOnce;
            localEnvironmentConnectionMock.getAllOrdererNames.should.have.been.calledOnce;
            localEnvironmentConnectionMock.getAllPeerNamesForOrg.should.have.been.calledThrice;
            localEnvironmentConnectionMock.getAllOrganizationNames.should.have.been.calledOnce;
            localEnvironmentConnectionMock.getCommittedSmartContractDefinitions.should.have.been.calledWithExactly(['peer0.org1.example.com', 'peer0.org2.example.com'], 'mychannel');

            const orgMap: Map<string, string[]> = new Map<string, string[]>();
            orgMap.set('Org1', ['peer0.org1.example.com']);
            orgMap.set('Org2', ['peer0.org2.example.com']);

            executeCommandStub.should.have.been.calledWithExactly(ExtensionCommands.DEPLOY_SMART_CONTRACT, true, localEntry, 'orderer.example.com', 'mychannel', orgMap, packageEntryOne, new FabricSmartContractDefinition('defName', '0.0.1', 1));
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
            await deployView.deploy('mychannel', FabricRuntimeUtil.LOCAL_FABRIC, packageEntryOne, 'defName', '0.0.1', undefined);

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, localEntry);

            localEnvironmentConnectionMock.createChannelMap.should.have.been.calledOnce;
            localEnvironmentConnectionMock.getAllOrdererNames.should.have.been.calledOnce;
            localEnvironmentConnectionMock.getAllPeerNamesForOrg.should.have.been.calledThrice;
            localEnvironmentConnectionMock.getAllOrganizationNames.should.have.been.calledOnce;
            localEnvironmentConnectionMock.getCommittedSmartContractDefinitions.should.have.been.calledWithExactly(['peer0.org1.example.com', 'peer0.org2.example.com'], 'mychannel');

            const orgMap: Map<string, string[]> = new Map<string, string[]>();
            orgMap.set('Org1', ['peer0.org1.example.com']);
            orgMap.set('Org2', ['peer0.org2.example.com']);

            executeCommandStub.should.have.been.calledWithExactly(ExtensionCommands.DEPLOY_SMART_CONTRACT, true, localEntry, 'orderer.example.com', 'mychannel', orgMap, packageEntryOne, new FabricSmartContractDefinition('defName', '0.0.1', 1));
        });

        it('should error if unable to connect to environment', async () => {
            getConnectionStub.returns(undefined);

            const disposeStub: sinon.SinonStub = mySandBox.stub();
            const webviewPanel: vscode.WebviewPanel = {
                dispose: disposeStub
            } as unknown as vscode.WebviewPanel;

            const deployView: DeployView = new DeployView(context, deployData);
            DeployView.panel = webviewPanel;
            await deployView.deploy('mychannel', FabricRuntimeUtil.LOCAL_FABRIC, packageEntryOne, 'defName', '0.0.1', undefined);

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, localEntry);

            localEnvironmentConnectionMock.createChannelMap.should.not.have.been.called;
            localEnvironmentConnectionMock.getAllOrdererNames.should.not.have.been.called;
            localEnvironmentConnectionMock.getCommittedSmartContractDefinitions.should.not.have.been.called;

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
            await deployView.deploy('mychannel', FabricRuntimeUtil.LOCAL_FABRIC, packageEntryTwo, 'defName', '0.0.1', undefined);

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, localEntry);

            localEnvironmentConnectionMock.createChannelMap.should.have.been.calledOnce;
            localEnvironmentConnectionMock.getAllOrdererNames.should.have.been.calledOnce;
            localEnvironmentConnectionMock.getAllPeerNamesForOrg.should.have.been.calledThrice;
            localEnvironmentConnectionMock.getAllOrganizationNames.should.have.been.calledOnce;
            localEnvironmentConnectionMock.getCommittedSmartContractDefinitions.should.have.been.calledWithExactly(['peer0.org1.example.com', 'peer0.org2.example.com'], 'mychannel');

            const orgMap: Map<string, string[]> = new Map<string, string[]>();
            orgMap.set('Org1', ['peer0.org1.example.com']);
            orgMap.set('Org2', ['peer0.org2.example.com']);
            executeCommandStub.should.have.been.calledWithExactly(ExtensionCommands.DEPLOY_SMART_CONTRACT, false, localEntry, 'orderer.example.com', 'mychannel', orgMap, packageEntryTwo, new FabricSmartContractDefinition('defName', '0.0.1', 1));
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
            await deployView.deploy('mychannel', FabricRuntimeUtil.LOCAL_FABRIC, packageEntryTwo, 'defName', '0.0.1', true);

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, localEntry);

            localEnvironmentConnectionMock.createChannelMap.should.have.been.calledOnce;
            localEnvironmentConnectionMock.getAllOrdererNames.should.have.been.calledOnce;
            localEnvironmentConnectionMock.getAllPeerNamesForOrg.should.have.been.calledThrice;
            localEnvironmentConnectionMock.getAllOrganizationNames.should.have.been.calledOnce;
            localEnvironmentConnectionMock.getCommittedSmartContractDefinitions.should.have.been.calledWithExactly(['peer0.org1.example.com', 'peer0.org2.example.com'], 'mychannel');

            const orgMap: Map<string, string[]> = new Map<string, string[]>();
            orgMap.set('Org1', ['peer0.org1.example.com']);
            orgMap.set('Org2', ['peer0.org2.example.com']);
            executeCommandStub.should.have.been.calledWithExactly(ExtensionCommands.DEPLOY_SMART_CONTRACT, true, localEntry, 'orderer.example.com', 'mychannel', orgMap, packageEntryTwo, new FabricSmartContractDefinition('defName', '0.0.1', 1));
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
            await deployView.deploy('mychannel', FabricRuntimeUtil.LOCAL_FABRIC, packageEntryOne, 'defName', '0.0.2', undefined);

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, localEntry);

            localEnvironmentConnectionMock.createChannelMap.should.have.been.calledOnce;
            localEnvironmentConnectionMock.getAllOrdererNames.should.have.been.calledOnce;
            localEnvironmentConnectionMock.getAllPeerNamesForOrg.should.have.been.calledThrice;
            localEnvironmentConnectionMock.getAllOrganizationNames.should.have.been.calledOnce;
            localEnvironmentConnectionMock.getCommittedSmartContractDefinitions.should.have.been.calledWithExactly(['peer0.org1.example.com', 'peer0.org2.example.com'], 'mychannel');

            const orgMap: Map<string, string[]> = new Map<string, string[]>();
            orgMap.set('Org1', ['peer0.org1.example.com']);
            orgMap.set('Org2', ['peer0.org2.example.com']);
            executeCommandStub.should.have.been.calledWithExactly(ExtensionCommands.DEPLOY_SMART_CONTRACT, true, localEntry, 'orderer.example.com', 'mychannel', orgMap, packageEntryOne, new FabricSmartContractDefinition('defName', '0.0.2', 2));
        });
    });

    describe('updatePackages', () => {

        it('should update deploy view with new packages', async () => {
            const packageEntry: PackageRegistryEntry = new PackageRegistryEntry();
            packageEntry.name = 'packageOne';
            packageEntry.version = '0.0.1';
            packageEntry.sizeKB = 90000;
            packageEntry.path = '/some/path';
            const getAllStub: sinon.SinonStub = mySandBox.stub(PackageRegistry.instance(), 'getAll').resolves([packageEntry]);

            const webviewPanel: vscode.WebviewPanel = {
                webview: {
                    postMessage: postMessageStub
                }
            } as unknown as vscode.WebviewPanel;
            DeployView.panel = webviewPanel;
            DeployView.appState = {};

            await DeployView.updatePackages();

            DeployView.appState.packageEntries.should.deep.equal([packageEntry]);

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
                                    workspaceName: 'myWorkspace'
                                }
                            });
                            resolve();
                        }
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

            packageStub.should.have.been.calledOnceWithExactly('myWorkspace');
            updatePackagesStub.should.have.been.calledOnce;
        });

        it('should not update packages if packaging workspace failed', async () => {

            const deployView: DeployView = new DeployView(context, deployData);

            const packageStub: sinon.SinonStub = mySandBox.stub(deployView, 'package').resolves();
            const updatePackagesStub: sinon.SinonStub = mySandBox.stub(DeployView, 'updatePackages').resolves();

            await deployView.openView(false);
            await Promise.all(onDidDisposePromises);

            packageStub.should.have.been.calledOnceWithExactly('myWorkspace');
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
            await deployView.package(workspaceTwo.name);

            getWorkspaceFoldersStub.should.have.been.calledOnce;
            executeCommandStub.should.have.been.calledOnceWithExactly(ExtensionCommands.PACKAGE_SMART_CONTRACT, workspaceTwo);
        });
    });
});
