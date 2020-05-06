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
import { View } from '../../extension/webview/View';
import { TestUtil } from '../TestUtil';
import { GlobalState } from '../../extension/util/GlobalState';
import { DeployView } from '../../extension/webview/DeployView';
import { FabricRuntimeUtil, FabricEnvironmentRegistryEntry, FabricEnvironmentRegistry, LogType } from 'ibm-blockchain-platform-common';
import { PackageRegistryEntry } from '../../extension/registries/PackageRegistryEntry';
import { FabricEnvironmentManager } from '../../extension/fabric/environments/FabricEnvironmentManager';
import { FabricEnvironmentConnection } from 'ibm-blockchain-platform-environment-v1';
import { ExtensionCommands } from '../../ExtensionCommands';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';

chai.use(sinonChai);

// tslint:disable no-unused-expression

describe('DeployView', () => {
    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();
    let context: vscode.ExtensionContext;
    let createWebviewPanelStub: sinon.SinonStub;
    let postMessageStub: sinon.SinonStub;
    let executeCommandStub: sinon.SinonStub;
    let logStub: sinon.SinonStub;

    const deployData: {channelName: string, environmentName: string} = {channelName: 'mychannel', environmentName: FabricRuntimeUtil.LOCAL_FABRIC};

    const initialMessage: {path: string, deployData: {channelName: string, environmentName: string}} = {
        path: '/deploy',
        deployData
    };

    let fabricEnvironmentManager: FabricEnvironmentManager;
    let getConnectionStub: sinon.SinonStub;
    let localEnvironmentConnectionMock: sinon.SinonStubbedInstance<FabricEnvironmentConnection>;
    let otherEnvironmentConnectionMock: sinon.SinonStubbedInstance<FabricEnvironmentConnection>;
    const packageEntryOne: PackageRegistryEntry = new PackageRegistryEntry({name: 'packageOne', version: '0.0.1', path: '', sizeKB: 90001});
    const packageEntryTwo: PackageRegistryEntry = new PackageRegistryEntry({name: 'packageOne', version: '0.0.2', path: '', sizeKB: 80000});

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

        createWebviewPanelStub = mySandBox.stub(vscode.window, 'createWebviewPanel');

        postMessageStub = mySandBox.stub().resolves();

        View['openPanels'].splice(0, View['openPanels'].length);

        localEnvironmentConnectionMock = mySandBox.createStubInstance(FabricEnvironmentConnection);
        localEnvironmentConnectionMock.environmentName = FabricRuntimeUtil.LOCAL_FABRIC;
        localEnvironmentConnectionMock.getAllPeerNames.returns(['peer0.org1.example.com']);
        localEnvironmentConnectionMock.getAllOrdererNames.returns(['orderer.example.com']);
        localEnvironmentConnectionMock.getCommittedSmartContracts.resolves([]);

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

            const deployView: DeployView = new DeployView(context, deployData);
            await deployView.deploy('mychannel', FabricRuntimeUtil.LOCAL_FABRIC, packageEntryOne, 'defName', '0.0.1', undefined);

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, localEntry);

            localEnvironmentConnectionMock.getAllPeerNames.should.have.been.calledOnce;
            localEnvironmentConnectionMock.getAllOrdererNames.should.have.been.calledOnce;
            localEnvironmentConnectionMock.getCommittedSmartContracts.should.have.been.calledWithExactly(['peer0.org1.example.com'], 'mychannel');

            executeCommandStub.should.have.been.calledWithExactly(ExtensionCommands.DEPLOY_SMART_CONTRACT, true, localEntry, 'orderer.example.com', 'mychannel', ['peer0.org1.example.com'], 'defName', '0.0.1', 1, packageEntryOne);
        });

        it('should disconnect, connect to correct environment and commit new contract', async () => {
            getConnectionStub.onCall(0).returns(otherEnvironmentConnectionMock);
            getConnectionStub.onCall(1).returns(localEnvironmentConnectionMock);

            const deployView: DeployView = new DeployView(context, deployData);
            await deployView.deploy('mychannel', FabricRuntimeUtil.LOCAL_FABRIC, packageEntryOne, 'defName', '0.0.1', undefined);

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, localEntry);

            localEnvironmentConnectionMock.getAllPeerNames.should.have.been.calledOnce;
            localEnvironmentConnectionMock.getAllOrdererNames.should.have.been.calledOnce;
            localEnvironmentConnectionMock.getCommittedSmartContracts.should.have.been.calledWithExactly(['peer0.org1.example.com'], 'mychannel');

            executeCommandStub.should.have.been.calledWithExactly(ExtensionCommands.DEPLOY_SMART_CONTRACT, true, localEntry, 'orderer.example.com', 'mychannel', ['peer0.org1.example.com'], 'defName', '0.0.1', 1, packageEntryOne);
        });

        it('should connect to environment if disconnected and commit new contract', async () => {
            getConnectionStub.onCall(0).returns(undefined);
            getConnectionStub.onCall(1).returns(localEnvironmentConnectionMock);

            const deployView: DeployView = new DeployView(context, deployData);
            await deployView.deploy('mychannel', FabricRuntimeUtil.LOCAL_FABRIC, packageEntryOne, 'defName', '0.0.1', undefined);

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, localEntry);

            localEnvironmentConnectionMock.getAllPeerNames.should.have.been.calledOnce;
            localEnvironmentConnectionMock.getAllOrdererNames.should.have.been.calledOnce;
            localEnvironmentConnectionMock.getCommittedSmartContracts.should.have.been.calledWithExactly(['peer0.org1.example.com'], 'mychannel');

            executeCommandStub.should.have.been.calledWithExactly(ExtensionCommands.DEPLOY_SMART_CONTRACT, true, localEntry, 'orderer.example.com', 'mychannel', ['peer0.org1.example.com'], 'defName', '0.0.1', 1, packageEntryOne);
        });

        it('should error if unable to connect to environment', async () => {
            getConnectionStub.returns(undefined);

            const deployView: DeployView = new DeployView(context, deployData);
            await deployView.deploy('mychannel', FabricRuntimeUtil.LOCAL_FABRIC, packageEntryOne, 'defName', '0.0.1', undefined);

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, localEntry);

            localEnvironmentConnectionMock.getAllPeerNames.should.not.have.been.called;
            localEnvironmentConnectionMock.getAllOrdererNames.should.not.have.been.called;
            localEnvironmentConnectionMock.getCommittedSmartContracts.should.not.have.been.called;

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.DEPLOY_SMART_CONTRACT);

            const error: Error = new Error(`Unable to deploy, cannot connect to environment: ${FabricRuntimeUtil.LOCAL_FABRIC}`);
            logStub.should.have.been.calledOnceWithExactly(LogType.ERROR, error.message, error.toString());
        });

        it('should be able to change the package for a committed definition and default to not comitting', async () => {
            getConnectionStub.returns(localEnvironmentConnectionMock);
            localEnvironmentConnectionMock.getCommittedSmartContracts.resolves([{
                name: 'defName',
                version: '0.0.1',
                sequence: 1
            }]);

            const deployView: DeployView = new DeployView(context, deployData);
            await deployView.deploy('mychannel', FabricRuntimeUtil.LOCAL_FABRIC, packageEntryTwo, 'defName', '0.0.1', undefined);

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, localEntry);

            localEnvironmentConnectionMock.getAllPeerNames.should.have.been.calledOnce;
            localEnvironmentConnectionMock.getAllOrdererNames.should.have.been.calledOnce;
            localEnvironmentConnectionMock.getCommittedSmartContracts.should.have.been.calledWithExactly(['peer0.org1.example.com'], 'mychannel');

            executeCommandStub.should.have.been.calledWithExactly(ExtensionCommands.DEPLOY_SMART_CONTRACT, false, localEntry, 'orderer.example.com', 'mychannel', ['peer0.org1.example.com'], 'defName', '0.0.1', 1, packageEntryTwo);
        });

        it('should be able to change the package for a committed definition and commit', async () => {
            getConnectionStub.returns(localEnvironmentConnectionMock);
            localEnvironmentConnectionMock.getCommittedSmartContracts.resolves([{
                name: 'defName',
                version: '0.0.1',
                sequence: 1
            }]);

            const deployView: DeployView = new DeployView(context, deployData);
            await deployView.deploy('mychannel', FabricRuntimeUtil.LOCAL_FABRIC, packageEntryTwo, 'defName', '0.0.1', true);

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, localEntry);

            localEnvironmentConnectionMock.getAllPeerNames.should.have.been.calledOnce;
            localEnvironmentConnectionMock.getAllOrdererNames.should.have.been.calledOnce;
            localEnvironmentConnectionMock.getCommittedSmartContracts.should.have.been.calledWithExactly(['peer0.org1.example.com'], 'mychannel');

            executeCommandStub.should.have.been.calledWithExactly(ExtensionCommands.DEPLOY_SMART_CONTRACT, true, localEntry, 'orderer.example.com', 'mychannel', ['peer0.org1.example.com'], 'defName', '0.0.1', 1, packageEntryTwo);
        });

        it('should update sequence number if definition version has changed', async () => {
            getConnectionStub.returns(localEnvironmentConnectionMock);
            localEnvironmentConnectionMock.getCommittedSmartContracts.resolves([{
                name: 'defName',
                version: '0.0.1',
                sequence: 1
            }]);

            const deployView: DeployView = new DeployView(context, deployData);
            await deployView.deploy('mychannel', FabricRuntimeUtil.LOCAL_FABRIC, packageEntryOne, 'defName', '0.0.2', undefined);

            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, localEntry);

            localEnvironmentConnectionMock.getAllPeerNames.should.have.been.calledOnce;
            localEnvironmentConnectionMock.getAllOrdererNames.should.have.been.calledOnce;
            localEnvironmentConnectionMock.getCommittedSmartContracts.should.have.been.calledWithExactly(['peer0.org1.example.com'], 'mychannel');

            executeCommandStub.should.have.been.calledWithExactly(ExtensionCommands.DEPLOY_SMART_CONTRACT, true, localEntry, 'orderer.example.com', 'mychannel', ['peer0.org1.example.com'], 'defName', '0.0.2', 2, packageEntryOne);
        });
    });
});
