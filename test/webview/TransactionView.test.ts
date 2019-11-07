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
import { TransactionView } from '../../extension/webview/TransactionView';
import { View } from '../../extension/webview/View';
import { TestUtil } from '../TestUtil';
import { GlobalState } from '../../extension/util/GlobalState';
import ITransaction from '../../src/interfaces/ITransaction';
import ISmartContract from '../../src/interfaces/ISmartContract';
chai.use(sinonChai);

describe('TransactionView', () => {
    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();
    let context: vscode.ExtensionContext;
    let createWebviewPanelStub: sinon.SinonStub;
    let postMessageStub: sinon.SinonStub;
    let executeCommandStub: sinon.SinonStub;

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

    const blueContract: ISmartContract = {
        name: 'blueContract',
        version: '0.0.1',
        channel: 'mychannel',
        label: 'blueContract@0.0.1',
        transactions: [transactionOne, transactionTwo],
        namespace: 'BlueContract'
    };

    const mockAppState: {smartContracts: Array<ISmartContract>, activeSmartContract: ISmartContract} = {
        smartContracts: [greenContract, blueContract],
        activeSmartContract: greenContract
    };

    before(async () => {
        await TestUtil.setupTests(mySandBox);
    });

    beforeEach(async () => {
        context = GlobalState.getExtensionContext();
        executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand');
        executeCommandStub.callThrough();

        createWebviewPanelStub = mySandBox.stub(vscode.window, 'createWebviewPanel');

        postMessageStub = mySandBox.stub().resolves();

        View['openPanels'].splice(0, View['openPanels'].length);

        createWebviewPanelStub.returns({
            title: 'Transaction Page',
            webview: {
                postMessage: postMessageStub,
                onDidReceiveMessage: mySandBox.stub()
            },
            reveal: mySandBox.stub(),
            dispose: mySandBox.stub(),
            onDidDispose: mySandBox.stub(),
            onDidChangeViewState: mySandBox.stub()

        });
    });

    afterEach(() => {
        mySandBox.restore();
    });

    it('should register and show transaction page', async () => {
        const transactionView: TransactionView = new TransactionView(context, mockAppState);
        await transactionView.openView(false);
        createWebviewPanelStub.should.have.been.called;
        postMessageStub.should.have.been.calledWith({
            path: '/transaction',
            state: mockAppState
        });
    });

});
