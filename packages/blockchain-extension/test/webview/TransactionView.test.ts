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
// tslint:disable no-unused-expression

import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as fs from 'fs-extra';
import * as path from 'path';
import { TransactionView } from '../../extension/webview/TransactionView';
import { View } from '../../extension/webview/View';
import { TestUtil } from '../TestUtil';
import { GlobalState } from '../../extension/util/GlobalState';
import { ExtensionCommands } from '../../ExtensionCommands';
type ITransaction = any;
type ISmartContract = any;
chai.use(sinonChai);

const should: Chai.Should = chai.should();

interface ICreateTransactionViewAndSendMessageParams {
    mySandBox: sinon.SinonSandbox;
    createWebviewPanelStub: sinon.SinonStub;
    postMessageStub: sinon.SinonStub;
    context: vscode.ExtensionContext;
    mockAppState: { gatewayName: string, smartContract: ISmartContract, associatedTxdata?: {chaincodeName: string, channelName: string, transactionDataPath: string} };
    command: string | undefined;
    data: object | undefined;
}

interface ITransactionData {
    transactionName: string;
    transactionLabel?: string;
    arguments: string[];
    transientData: any;
}

async function createTransactionViewAndSendMessage({ mySandBox, createWebviewPanelStub, postMessageStub, context, mockAppState, command, data }: ICreateTransactionViewAndSendMessageParams): Promise<any> {
    const onDidReceiveMessagePromises: any[] = [];

    onDidReceiveMessagePromises.push(new Promise((resolve: any): void => {
        createWebviewPanelStub.returns({
            webview: {
                postMessage: postMessageStub,
                onDidReceiveMessage: async (callback: any): Promise<void> => {
                    await callback({
                        command,
                        data,
                    });
                    resolve();
                },
                asWebviewUri: mySandBox.stub()
            },
            reveal: (): void => {
                return;
            },
            onDidDispose: mySandBox.stub(),
            onDidChangeViewState: mySandBox.stub()
        });
    }));

    const transactionCreateView: TransactionView = new TransactionView(context, mockAppState);
    await transactionCreateView.openView(false);
    return Promise.all(onDidReceiveMessagePromises);
}

describe('TransactionView', () => {
    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();
    let context: vscode.ExtensionContext;
    let createWebviewPanelStub: sinon.SinonStub;
    let postMessageStub: sinon.SinonStub;
    let executeCommandStub: sinon.SinonStub;
    let fsReaddirStub: sinon.SinonStub;
    let fsReadJsonStub: sinon.SinonStub;
    let createTransactionViewAndSendMessageDefaults: ICreateTransactionViewAndSendMessageParams;

    const transactionOne: ITransaction = {
        name: 'transactionOne',
        parameters: [{
            description: '',
            name: 'name',
            schema: {}
        }],
        returns: {
            type: ''
        },
        tag: ['submit']
    };

    const transactionTwo: ITransaction = {
        name: 'transactionTwo',
        parameters: [{
            description: '',
            name: 'size',
            schema: {}
        }],
        returns: {
            type: ''
        },
        tag: ['submit']
    };

    const greenContract: ISmartContract = {
        name: 'greenContract',
        version: '0.0.1',
        channel: 'mychannel',
        label: 'greenContract@0.0.1',
        transactions: [transactionOne, transactionTwo],
        namespace: 'GreenContract'
    };

    const mockAppState: {gatewayName: string, smartContract: ISmartContract} = {
        gatewayName: 'my gateway',
        smartContract: greenContract
    };

    const transactionObject: any = {
        smartContract: 'greenContract',
        transactionName: 'transactionOne',
        channelName: 'mychannel',
        args: '["arg1", "arg2", "arg3"]',
        namespace: 'GreenContract',
        transientData: undefined,
        peerTargetNames: undefined
    };

    const chaincodeDetails: {label: string, name: string, channel: string} = {
        label: greenContract.label,
        name: greenContract.name,
        channel: greenContract.channel,
    };

    const dummyPath: string = '/dummyPath';
    const dummyTxdataFile: string = 'file.txdata';
    const badTxdataFile: string = 'throwerror.txdata';

    const associateTransactionDataDirectoryResponse: {chaincodeName: string, channelName: string, transactionDataPath: string} = {
        chaincodeName: chaincodeDetails.name,
        channelName: chaincodeDetails.channel,
        transactionDataPath: dummyPath,
    };

    const dummyTxdataFileContents: ITransactionData[] = [
        {transactionName: 'myTransaction', transactionLabel: 'This is my transaction', arguments: ['arg1', 'arg2'], transientData: {} },
        {transactionName: 'anotherTransaction', transactionLabel: 'This is another transaction', arguments: [JSON.stringify({ key: 'value' })], transientData: undefined },
    ];

    before(async () => {
        await TestUtil.setupTests(mySandBox);
    });

    beforeEach(async () => {
        context = GlobalState.getExtensionContext();
        executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand');
        executeCommandStub.callThrough();
        executeCommandStub.withArgs(ExtensionCommands.SUBMIT_TRANSACTION).resolves();
        executeCommandStub.withArgs(ExtensionCommands.EVALUATE_TRANSACTION).resolves();
        executeCommandStub.withArgs(ExtensionCommands.ASSOCIATE_TRANSACTION_DATA_DIRECTORY).resolves(associateTransactionDataDirectoryResponse);
        executeCommandStub.withArgs(ExtensionCommands.DISSOCIATE_TRANSACTION_DATA_DIRECTORY ).resolves(undefined);

        fsReaddirStub = mySandBox.stub(fs, 'readdir');
        fsReaddirStub.withArgs(dummyPath).resolves([dummyTxdataFile, badTxdataFile]);

        fsReadJsonStub = mySandBox.stub(fs, 'readJSON').resolves();

        createWebviewPanelStub = mySandBox.stub(vscode.window, 'createWebviewPanel');

        postMessageStub = mySandBox.stub().resolves();

        View['openPanels'].splice(0, View['openPanels'].length);

        // Make sure this is last in the beforeEach loop
        createTransactionViewAndSendMessageDefaults = {
            mySandBox,
            createWebviewPanelStub,
            postMessageStub,
            mockAppState,
            context,
            command: undefined,
            data: undefined,
        };
    });

    afterEach(() => {
        mySandBox.restore();
    });

    it('should register and show the transaction page', async () => {
        createWebviewPanelStub.returns({
            title: 'Transaction Page',
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

        const transactionView: TransactionView = new TransactionView(context, mockAppState);
        await transactionView.openView(false);
        createWebviewPanelStub.should.have.been.called;
        postMessageStub.should.have.been.calledWith({
            path: '/transaction',
            transactionViewData: mockAppState
        });
    });

    it(`should handle a 'submit' message`, async () => {
        await createTransactionViewAndSendMessage({
            ...createTransactionViewAndSendMessageDefaults,
            command: ExtensionCommands.SUBMIT_TRANSACTION,
            data: transactionObject,
        });

        executeCommandStub.should.have.been.calledWith(ExtensionCommands.SUBMIT_TRANSACTION, undefined, undefined, undefined, transactionObject);
    });

    it(`should handle an 'evaluate' message`, async () => {
        await createTransactionViewAndSendMessage({
            ...createTransactionViewAndSendMessageDefaults,
            command: ExtensionCommands.EVALUATE_TRANSACTION,
            data: transactionObject,
        });

        executeCommandStub.should.have.been.calledWith(ExtensionCommands.EVALUATE_TRANSACTION, undefined, undefined, undefined, transactionObject);
    });

    it(`should handle an 'ASSOCIATE_TRANSACTION_DATA_DIRECTORY' message and calls postMessage with associatedTxData`, async () => {
        fsReadJsonStub.withArgs(path.join(dummyPath, dummyTxdataFile)).resolves(dummyTxdataFileContents);

        await createTransactionViewAndSendMessage({
            ...createTransactionViewAndSendMessageDefaults,
            command: ExtensionCommands.ASSOCIATE_TRANSACTION_DATA_DIRECTORY,
            data: chaincodeDetails,
        });

        executeCommandStub.should.have.been.calledWith(ExtensionCommands.ASSOCIATE_TRANSACTION_DATA_DIRECTORY, undefined, chaincodeDetails);
        const txDataFile: string = path.join(dummyPath, dummyTxdataFile);
        const expectedParameters: any = {
            transactionViewData: {
                gatewayName: mockAppState.gatewayName,
                smartContract: mockAppState.smartContract,
                associatedTxdata: associateTransactionDataDirectoryResponse,
                txdataTransactions: [
                    {
                        ...dummyTxdataFileContents[0],
                        txDataFile,
                    },
                    {
                        ...dummyTxdataFileContents[1],
                        txDataFile,
                    }
                ],
            },
        };
        postMessageStub.should.have.been.calledWith(expectedParameters);
    });

    it(`should handle an 'ASSOCIATE_TRANSACTION_DATA_DIRECTORY' message when the data directory is empty`, async () => {
        fsReaddirStub.withArgs(dummyPath).resolves([]);
        await createTransactionViewAndSendMessage({
            ...createTransactionViewAndSendMessageDefaults,
            command: ExtensionCommands.ASSOCIATE_TRANSACTION_DATA_DIRECTORY,
            data: chaincodeDetails,
        });

        executeCommandStub.should.have.been.calledWith(ExtensionCommands.ASSOCIATE_TRANSACTION_DATA_DIRECTORY, undefined, chaincodeDetails);
        postMessageStub.should.have.been.calledWith({
            transactionViewData: {
                gatewayName: mockAppState.gatewayName,
                smartContract: mockAppState.smartContract,
                associatedTxdata: associateTransactionDataDirectoryResponse,
                txdataTransactions: [],
            },
        });
    });

    it(`should handle an 'ASSOCIATE_TRANSACTION_DATA_DIRECTORY' message when no .txdata files are found in the transaction directory`, async () => {
        fsReaddirStub.withArgs(dummyPath).resolves(['invalidfile.txt']);
        await createTransactionViewAndSendMessage({
            ...createTransactionViewAndSendMessageDefaults,
            command: ExtensionCommands.ASSOCIATE_TRANSACTION_DATA_DIRECTORY,
            data: chaincodeDetails,
        });

        executeCommandStub.should.have.been.calledWith(ExtensionCommands.ASSOCIATE_TRANSACTION_DATA_DIRECTORY, undefined, chaincodeDetails);
        postMessageStub.should.have.been.calledWith({
            transactionViewData: {
                gatewayName: mockAppState.gatewayName,
                smartContract: mockAppState.smartContract,
                associatedTxdata: associateTransactionDataDirectoryResponse,
                txdataTransactions: [],
            },
        });
    });

    it(`should handle an 'DISSOCIATE_TRANSACTION_DATA_DIRECTORY' message and calls postMessage with no associatedTxData`, async () => {
        await createTransactionViewAndSendMessage({
            ...createTransactionViewAndSendMessageDefaults,
            command: ExtensionCommands.DISSOCIATE_TRANSACTION_DATA_DIRECTORY,
            data: chaincodeDetails,
        });

        executeCommandStub.should.have.been.calledWith(ExtensionCommands.DISSOCIATE_TRANSACTION_DATA_DIRECTORY, undefined, chaincodeDetails);
        postMessageStub.should.have.been.calledWith({
            transactionViewData: {
                gatewayName: mockAppState.gatewayName,
                smartContract: mockAppState.smartContract,
                associatedTxdata: undefined,
                txdataTransactions: [],
            },
        });
    });

    it(`should handle an unexpected command and pass through the parameters`, async () => {
        const command: string = ExtensionCommands.OPEN_TUTORIAL_PAGE;
        executeCommandStub.withArgs(command).resolves();
        const data: string[] = ['Basic Tutorials', 'A4: A Tutorial'];
        await createTransactionViewAndSendMessage({
            ...createTransactionViewAndSendMessageDefaults,
            command,
            data,
        });

        executeCommandStub.should.have.been.calledWith(command, ...data);
    });

    it('should get txdataTransactions when there is a transaction data directory in the appState in loadComponent', async () => {
        fsReadJsonStub.withArgs(path.join(dummyPath, dummyTxdataFile)).resolves(dummyTxdataFileContents);
        createWebviewPanelStub.returns({
            webview: {
                postMessage: postMessageStub,
                onDidReceiveMessage: mySandBox.stub().resolves(),
                asWebviewUri: mySandBox.stub()
            },
            reveal: (): void => {
                return;
            },
            onDidDispose: mySandBox.stub(),
            onDidChangeViewState: mySandBox.stub()
        });
        const transactionCreateView: TransactionView = new TransactionView(context, {
            ...mockAppState,
            associatedTxdata: associateTransactionDataDirectoryResponse,
        });
        await transactionCreateView.openView(false);
        const txDataFile: string = path.join(dummyPath, dummyTxdataFile);
        const expectedParameters: any = {
            path: '/transaction',
            transactionViewData: {
                associatedTxdata: associateTransactionDataDirectoryResponse,
                gatewayName: mockAppState.gatewayName,
                smartContract: greenContract,
                txdataTransactions: [
                    {
                        ...dummyTxdataFileContents[0],
                        txDataFile,
                    },
                    {
                        ...dummyTxdataFileContents[1],
                        txDataFile,
                    }
                ],
            },
        };

        postMessageStub.should.have.been.calledWith(expectedParameters);
    });

    it('should update a smartContract', async () => {
        createWebviewPanelStub.returns({
            title: 'Transaction Page',
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

        const transactionView: TransactionView = new TransactionView(context, mockAppState);
        await transactionView.openView(false);
        createWebviewPanelStub.should.have.been.called;
        postMessageStub.should.have.been.calledWith({
            path: '/transaction',
            transactionViewData: mockAppState,
        });

        const updatedContract: ISmartContract = { ...greenContract, name: 'updatedContract' };
        await TransactionView.updateSmartContract(updatedContract);
        postMessageStub.should.have.been.calledWith({
            path: '/transaction',
            transactionViewData: { ...mockAppState, smartContract: updatedContract },
        });
    });

    it('should dispose of the TransactionView', async () => {
        const disposeStub: sinon.SinonStub = mySandBox.stub();
        createWebviewPanelStub.returns({
            title: 'Transaction Page',
            webview: {
                postMessage: postMessageStub,
                onDidReceiveMessage: mySandBox.stub(),
                asWebviewUri: mySandBox.stub()
            },
            reveal: mySandBox.stub(),
            dispose: disposeStub,
            onDidDispose: mySandBox.stub(),
            onDidChangeViewState: mySandBox.stub()
        });

        const transactionView: TransactionView = new TransactionView(context, mockAppState);
        await transactionView.openView(false);
        TransactionView.closeView();
        disposeStub.should.have.been.called;
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

        const deployView: TransactionView = new TransactionView(context, mockAppState);

        await deployView.openView(false);
        should.not.exist(TransactionView.panel);

    });

    it('Should call postMessage when openView is called and TransactionView.panel exists', async () => {
        createWebviewPanelStub.returns({
            title: 'Transaction Page',
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

        const transactionView: TransactionView = new TransactionView(context, mockAppState);
        await transactionView.openView(false);
        createWebviewPanelStub.should.have.been.called;
        postMessageStub.should.have.been.calledWith({
            path: '/transaction',
            transactionViewData: mockAppState,
        });

        const updatedContract: ISmartContract = { ...greenContract, name: 'updatedContract' };
        const newTransactionView: TransactionView = new TransactionView(context, { ...mockAppState, smartContract: updatedContract });
        await newTransactionView.openView(false);
        createWebviewPanelStub.should.have.been.called;
        postMessageStub.should.have.been.calledWith({
            path: '/transaction',
            transactionViewData: { ...mockAppState, smartContract: updatedContract },
        });
    });
});
