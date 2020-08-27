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
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';
import { ExtensionCommands } from '../../ExtensionCommands';
import { LogType, FabricGatewayRegistryEntry, FabricGatewayRegistry, ConnectionProfileUtil, FabricWalletRegistryEntry, FabricWalletGeneratorFactory, FabricEnvironmentRegistryEntry, EnvironmentType, FabricEnvironmentRegistry, FabricEnvironment, FabricNode } from 'ibm-blockchain-platform-common';
import { FabricGatewayConnection } from 'ibm-blockchain-platform-gateway-v1';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';
import { TestUtil } from '../TestUtil';
import { FabricGatewayConnectionManager } from '../../extension/fabric/FabricGatewayConnectionManager';
import { BlockchainTreeItem } from '../../extension/explorer/model/BlockchainTreeItem';
import { BlockchainGatewayExplorerProvider } from '../../extension/explorer/gatewayExplorer';
import { ChannelTreeItem } from '../../extension/explorer/model/ChannelTreeItem';
import { InstantiatedTreeItem } from '../../extension/explorer/model/InstantiatedTreeItem';
import { UserInputUtil } from '../../extension/commands/UserInputUtil';
import { InstantiatedContractTreeItem } from '../../extension/explorer/model/InstantiatedContractTreeItem';
import sinonChai = require('sinon-chai');
import { Reporter } from '../../extension/util/Reporter';
import { FabricGatewayHelper } from '../../extension/fabric/FabricGatewayHelper';
import { FabricWallet } from 'ibm-blockchain-platform-wallet';
import { InstantiatedAssociatedTreeItem } from '../../extension/explorer/model/InstantiatedAssociatedTreeItem';
import { InstantiatedAssociatedContractTreeItem } from '../../extension/explorer/model/InstantiatedAssociatedContractTreeItem';
import { ContractTreeItem } from '../../extension/explorer/model/ContractTreeItem';
import { EnvironmentFactory } from '../../extension/fabric/environments/EnvironmentFactory';

chai.use(sinonChai);

// tslint:disable: no-unused-expression
describe('exportAppData', () => {
    let mySandBox: sinon.SinonSandbox;
    const fakeTargetPath: string = path.join('/', 'a', 'fake', 'path');
    let logSpy: sinon.SinonSpy;
    let fabricClientConnectionMock: sinon.SinonStubbedInstance<FabricGatewayConnection>;
    let executeCommandStub: sinon.SinonStub;
    let getConnectionStub: sinon.SinonStub;
    let connectionProfile: any;
    let readProfileStub: sinon.SinonStub;
    let getConnectionProfilePathStub: sinon.SinonStub;
    let showInstantiatedSmartContractsQuickPickStub: sinon.SinonStub;
    let allChildren: Array<BlockchainTreeItem>;
    let blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider;
    let fabricConnectionManager: FabricGatewayConnectionManager;
    let instantiatedSmartContract: InstantiatedContractTreeItem;
    let gatewayRegistryEntry: FabricGatewayRegistryEntry;
    let environmentRegistryEntry: FabricEnvironmentRegistryEntry;
    let getGatewayRegistryStub: sinon.SinonStub;
    let peerNode: FabricNode;
    let caNode: FabricNode;
    let ordererNode: FabricNode;
    let mockRuntime: sinon.SinonStubbedInstance<FabricEnvironment>;
    let channels: Array<ChannelTreeItem>;
    let contracts: Array<InstantiatedTreeItem>;
    let writeFileStub: sinon.SinonStub;
    let showSaveDialogStub: sinon.SinonStub;
    let homeDirStub: sinon.SinonStub;
    let sendTelemetryEventStub: sinon.SinonStub;
    let workspaceFolderStub: sinon.SinonStub;
    let workspaceFolder: any;
    let showQuickPickItemStub: sinon.SinonStub;
    let showIdentitiesQuickPickStub: sinon.SinonStub;
    let walletRegistryEntry: FabricWalletRegistryEntry;
    let exportedData: string;
    let moreFakeMetadata: any;

    before(async () => {
        mySandBox = sinon.createSandbox();
        await TestUtil.setupTests(mySandBox);
    });

    beforeEach(async () => {
        logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');

        executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand');
        executeCommandStub.withArgs(ExtensionCommands.CONNECT_TO_GATEWAY).resolves();
        executeCommandStub.callThrough();

        fabricClientConnectionMock = mySandBox.createStubInstance(FabricGatewayConnection);
        fabricClientConnectionMock.connect.resolves();

        const map: Map<string, Array<string>> = new Map<string, Array<string>>();
        map.set('myChannel', ['peerOne']);
        fabricClientConnectionMock.createChannelMap.resolves({channelMap: map, v2channels: []});
        fabricConnectionManager = FabricGatewayConnectionManager.instance();
        getConnectionStub = mySandBox.stub(FabricGatewayConnectionManager.instance(), 'getConnection').returns(fabricClientConnectionMock);

        gatewayRegistryEntry = new FabricGatewayRegistryEntry({
            name: 'myGateway',
            associatedWallet: '',
            transactionDataDirectories: [{
                chaincodeName: 'myContract',
                channelName: 'myChannel',
                transactionDataPath: 'some/file/path'
            }]
        });

        mockRuntime = mySandBox.createStubInstance(FabricEnvironment);

        getGatewayRegistryStub = mySandBox.stub(fabricConnectionManager, 'getGatewayRegistryEntry');
        getGatewayRegistryStub.resolves(gatewayRegistryEntry);

        await FabricGatewayRegistry.instance().clear();
        await FabricGatewayRegistry.instance().add(gatewayRegistryEntry);

        fabricClientConnectionMock.getInstantiatedChaincode.resolves([
            {
                name: 'myContract',
                version: '0.0.1',
            }
        ]);

        moreFakeMetadata = {
            contracts: {
                myContract: {
                    name: 'myContract',
                    transactions: [
                        {
                            name: 'aLovelyTransaction',
                            parameters: [
                                {
                                    name: 'value',
                                    schema: {
                                        type: 'string'
                                    }
                                },
                            ]
                        },
                    ]
                },
                myOtherContract: {
                    name: 'myOtherContract',
                    transactions: [
                        {
                            name: 'aHappyTransaction',
                            parameters: [
                                {
                                    name: 'value',
                                    schema: {
                                        type: 'string'
                                    }
                                }
                            ]
                        },
                    ]
                }
            }
        };

        blockchainGatewayExplorerProvider = ExtensionUtil.getBlockchainGatewayExplorerProvider();
        allChildren = await blockchainGatewayExplorerProvider.getChildren();
        channels = await blockchainGatewayExplorerProvider.getChildren(allChildren[2]) as Array<ChannelTreeItem>;
        contracts =  await blockchainGatewayExplorerProvider.getChildren(channels[0]) as Array<InstantiatedTreeItem>;
        instantiatedSmartContract = contracts[0];

        showInstantiatedSmartContractsQuickPickStub = mySandBox.stub(UserInputUtil, 'showClientInstantiatedSmartContractsQuickPick').withArgs(sinon.match.any).resolves({
            label: 'myContract@0.0.1',
            data: { name: 'myContract', channel: 'myChannel', version: '0.0.1' }
        });

        workspaceFolder = {
            name: 'myFolder',
            uri: vscode.Uri.file('myPath')
        };
        workspaceFolderStub = mySandBox.stub(UserInputUtil, 'getWorkspaceFolders').returns([workspaceFolder]);
        writeFileStub = mySandBox.stub(fs, 'writeFile');

        showSaveDialogStub = mySandBox.stub(vscode.window, 'showSaveDialog').resolves(vscode.Uri.file(fakeTargetPath));
        homeDirStub = mySandBox.stub(os, 'homedir');
        homeDirStub.returns('homedir');
        readProfileStub = mySandBox.stub(ConnectionProfileUtil, 'readConnectionProfile');

        getConnectionProfilePathStub = mySandBox.stub(FabricGatewayHelper, 'getConnectionProfilePath');
        getConnectionProfilePathStub.resolves(path.join('myPath', 'connection.json'));
        connectionProfile = { name: 'myProfile', wallet: 'myWallet' };
        readProfileStub.resolves(connectionProfile);

        sendTelemetryEventStub = mySandBox.stub(Reporter.instance(), 'sendTelemetryEvent');
        showQuickPickItemStub = mySandBox.stub(UserInputUtil, 'showQuickPickItem').resolves([{
            label: UserInputUtil.GENERATE_ENVIRONMENT_PROFILE,
            data: UserInputUtil.GENERATE_ENVIRONMENT_PROFILE,
            description: UserInputUtil.GENERATE_ENVIRONMENT_PROFILE_DESCRIPTION
        }]);

        environmentRegistryEntry = new FabricEnvironmentRegistryEntry();
        environmentRegistryEntry.name = 'myEnv';
        environmentRegistryEntry.environmentType = EnvironmentType.ANSIBLE_ENVIRONMENT;
        await FabricEnvironmentRegistry.instance().add(environmentRegistryEntry);

        peerNode = FabricNode.newPeer('peerNode', 'Org1Peer1', 'http://localhost:17051', undefined, undefined, 'Org1MSP');
        peerNode.container_name = 'randomText_containerName';
        caNode = FabricNode.newCertificateAuthority('caNodeWithoutCreds', 'Org1CA', 'http://localhost:17054', 'ca.org1.example.com', undefined, undefined, undefined, undefined, undefined);
        caNode.container_name = 'randomText_anotherContainerName';
        ordererNode = FabricNode.newOrderer('ordererNode', 'orderer.example.com', 'http://localhost:17056', undefined, undefined, 'osmsp', undefined);

        mockRuntime.getNodes.returns([ordererNode, peerNode, caNode]);
        mySandBox.stub(EnvironmentFactory, 'getEnvironment').returns(mockRuntime);

        // walletStubs

        const testFabricWallet: FabricWallet = new FabricWallet('some/local/fabric/wallet/path');
        walletRegistryEntry = new FabricWalletRegistryEntry();
        walletRegistryEntry.name = 'myWallet';
        walletRegistryEntry.walletPath = 'walletPath';
        mySandBox.stub(fabricConnectionManager, 'getConnectionWallet').returns(walletRegistryEntry);
        mySandBox.stub(FabricWalletGeneratorFactory.getFabricWalletGenerator(), 'getWallet').resolves(testFabricWallet);
        mySandBox.stub(fabricConnectionManager, 'getConnectionIdentity').returns('someIdentity');
        mySandBox.stub(FabricWallet.prototype, 'getIDs').resolves([
            {
                name: 'someIdentity',
                msp_id: 'someMSP',
                cert: 'base64CertificateHere',
                private_key: 'base64PrivKeyHere'
            },
            {
                name: 'someOtherIdentity',
                msp_id: 'someOtherMSP',
                cert: 'anotherbase64CertificateHere',
                private_key: 'anotherbase64PrivKeyHere'
            }
        ]);

        showIdentitiesQuickPickStub = mySandBox.stub(UserInputUtil, 'showIdentitiesQuickPickBox').resolves(['someIdentity', 'someOtherIdentity']);

        exportedData = `FABRIC_CONNECTION_PROFILE={"name":"myProfile"}\nFABRIC_WALLET_CREDENTIALS=[{"name":"someIdentity","msp_id":"someMSP","cert":"base64CertificateHere","private_key":"base64PrivKeyHere"},{"name":"someOtherIdentity","msp_id":"someOtherMSP","cert":"anotherbase64CertificateHere","private_key":"anotherbase64PrivKeyHere"}]\nFABRIC_DEFAULT_IDENTITY=someIdentity\nFABRIC_CHANNEL=myChannel\nFABRIC_CONTRACT=myContract`;

    });

    afterEach(async () => {
        mySandBox.restore();
        await FabricEnvironmentRegistry.instance().clear();
    });

    it('should export application data through command pallete', async () => {
        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_APP_DATA);

        logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `exportAppData`);
        writeFileStub.should.have.been.calledWithExactly(fakeTargetPath, exportedData);
        logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully exported application data to ${fakeTargetPath}`);
        sendTelemetryEventStub.should.have.been.calledOnceWithExactly('exportAppDataCommand');
    });

    it('should export application data through command pallete when not connected to gateway', async () => {
        getConnectionStub.onCall(3).returns(undefined);
        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_APP_DATA);

        logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `exportAppData`);
        writeFileStub.should.have.been.calledWithExactly(fakeTargetPath, exportedData);
        logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully exported application data to ${fakeTargetPath}`);
        sendTelemetryEventStub.should.have.been.calledOnceWithExactly('exportAppDataCommand');
    });

    it('should handle unsuccessful attempt when to connecting to a gateway', async () => {
        getConnectionStub.returns(undefined);
        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_APP_DATA);

        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `exportAppData`);
        writeFileStub.should.not.have.been.called;
        sendTelemetryEventStub.should.not.have.been.called;
    });

    it('should handle cancellation when choosing an instantiated contract', async () => {
        showInstantiatedSmartContractsQuickPickStub.resolves(undefined);
        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_APP_DATA);

        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `exportAppData`);
        writeFileStub.should.not.have.been.called;
        sendTelemetryEventStub.should.not.have.been.called;
    });

    it('should export application data through the tree', async () => {
        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_APP_DATA, instantiatedSmartContract);

        logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `exportAppData`);
        writeFileStub.should.have.been.calledWithExactly(fakeTargetPath, exportedData);
        logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully exported application data to ${fakeTargetPath}`);
        sendTelemetryEventStub.should.have.been.calledOnceWithExactly('exportAppDataCommand');
    });

    it('should export application data for a ContractTreeItem', async () => {
        fabricClientConnectionMock.getMetadata.resolves(moreFakeMetadata);

        allChildren = await blockchainGatewayExplorerProvider.getChildren();
        const channelChildren: Array<ChannelTreeItem> = await blockchainGatewayExplorerProvider.getChildren(allChildren[2]) as Array<ChannelTreeItem>;
        channelChildren[0].tooltip.should.equal('Associated peers: peerOne');

        const instantiatedAssociatedChainCodes: Array<InstantiatedAssociatedTreeItem> = await blockchainGatewayExplorerProvider.getChildren(channelChildren[0]) as Array<InstantiatedAssociatedTreeItem>;
        await blockchainGatewayExplorerProvider.getChildren(instantiatedAssociatedChainCodes[0]);

        const instantiatedTreeItems: Array<InstantiatedAssociatedContractTreeItem> = await blockchainGatewayExplorerProvider.getChildren(channelChildren[0]) as Array<InstantiatedAssociatedContractTreeItem>;
        const contractTreeItems: Array<ContractTreeItem> = await blockchainGatewayExplorerProvider.getChildren(instantiatedTreeItems[0]) as Array<ContractTreeItem>;

        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_APP_DATA, contractTreeItems[0]);

        logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `exportAppData`);
        writeFileStub.should.have.been.calledWithExactly(fakeTargetPath, exportedData);
        logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully exported application data to ${fakeTargetPath}`);
        sendTelemetryEventStub.should.have.been.calledOnceWithExactly('exportAppDataCommand');
    });

    it('should handle cancellation when choosing type of app assets to generate', async () => {
        showQuickPickItemStub.resolves(undefined);

        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_APP_DATA);

        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `exportAppData`);
        writeFileStub.should.not.have.been.called;
        sendTelemetryEventStub.should.not.have.been.called;
    });

    it('should handle cancellation when choosing identities', async () => {
        showIdentitiesQuickPickStub.resolves(undefined);

        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_APP_DATA);
        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `exportAppData`);
        showSaveDialogStub.should.not.have.been.called;
        writeFileStub.should.not.have.been.called;
        sendTelemetryEventStub.should.not.have.been.called;
    });

    it('should handle user selecting the "Ok" button without choosing type of app asset', async () => {
        showQuickPickItemStub.resolves([]);

        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_APP_DATA);

        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `exportAppData`);
        writeFileStub.should.not.have.been.called;
        sendTelemetryEventStub.should.not.have.been.called;
    });

    it('should handle user selecting the "Ok" button without choosing any identities', async () => {
        const error: Error = new Error('No identities were selected.');
        showIdentitiesQuickPickStub.resolves([]);

        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_APP_DATA);
        logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, `exportAppData`);
        logSpy.getCall(1).should.have.been.calledWithExactly(LogType.ERROR, `Error exporting application data: ${error.message}`, `Error exporting application data: ${error.toString()}`);
        showSaveDialogStub.should.not.have.been.called;
        writeFileStub.should.not.have.been.called;
        sendTelemetryEventStub.should.not.have.been.called;
    });

    it('should throw error if connection profile has localhost in url and unsupported gateway', async () => {
        const anotherConnectionProfile: any = {
            certificateAuthorities: {
                Org1CA: {
                    caName: 'ca',
                    url: 'http://localhost:1245'
                }
            },
            peers: {
                Org1Peer1: {
                    url: 'grpc://localhost:4416'
                }
            },
            wallet: 'myWallet'
        };
        readProfileStub.resolves(anotherConnectionProfile);

        const error: Error = new Error('Gateway not supported');
        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_APP_DATA);
        logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, `exportAppData`);
        logSpy.getCall(1).should.have.been.calledWithExactly(LogType.ERROR, `Error exporting application data: ${error.message}`, `Error exporting application data: ${error.toString()}`);
        showSaveDialogStub.should.not.have.been.called;
        writeFileStub.should.not.have.been.called;
        sendTelemetryEventStub.should.not.have.been.called;
    });

    it('should replace all instances of localhost from url with the correct container names', async () => {
        const anotherConnectionProfile: any = {
            certificateAuthorities: {
                Org1CA: {
                    caName: 'ca',
                    url: 'http://localhost:4415'
                }
            },
            peers: {
                Org1Peer1: {
                    url: 'grpc://localhost:2316'
                }
            },
            wallet: 'myWallet'
        };
        readProfileStub.resolves(anotherConnectionProfile);

        const anotherGatewayRegistryEntry: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry({
            name: 'myGateway',
            associatedWallet: '',
            transactionDataDirectories: [{
                chaincodeName: 'myContract',
                channelName: 'myChannel',
                transactionDataPath: 'some/file/path'
            }],
            fromEnvironment: 'myEnv'
        });
        getGatewayRegistryStub.resolves(anotherGatewayRegistryEntry);

        const dataToExport: string = `FABRIC_CONNECTION_PROFILE={"certificateAuthorities":{"Org1CA":{"caName":"ca","url":"http://anotherContainerName:4415"}},"peers":{"Org1Peer1":{"url":"grpc://containerName:2316"}}}\nFABRIC_WALLET_CREDENTIALS=[{"name":"someIdentity","msp_id":"someMSP","cert":"base64CertificateHere","private_key":"base64PrivKeyHere"},{"name":"someOtherIdentity","msp_id":"someOtherMSP","cert":"anotherbase64CertificateHere","private_key":"anotherbase64PrivKeyHere"}]\nFABRIC_DEFAULT_IDENTITY=someIdentity\nFABRIC_CHANNEL=myChannel\nFABRIC_CONTRACT=myContract`;

        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_APP_DATA);

        writeFileStub.should.have.been.calledWithExactly(fakeTargetPath, dataToExport);

    });

    it('should handle cancellation when choosing where to save the exported file', async () => {
        workspaceFolderStub.resolves([]);
        showSaveDialogStub.resolves(undefined);

        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_APP_DATA);

        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `exportAppData`);
        writeFileStub.should.not.have.been.called;
        sendTelemetryEventStub.should.not.have.been.called;
    });

    it('should show error message if error exporting the data', async () => {
        const error: Error = new Error('someError');
        writeFileStub.throws(error);

        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_APP_DATA);
        logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `exportAppData`);
        logSpy.getCall(1).should.have.been.calledWithExactly(LogType.ERROR, `Error exporting application data: ${error.message}`, `Error exporting application data: ${error.toString()}`);
        sendTelemetryEventStub.should.not.have.been.called;
    });

});
