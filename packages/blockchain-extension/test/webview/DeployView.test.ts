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
import { FabricRuntimeUtil } from 'ibm-blockchain-platform-common';

chai.use(sinonChai);

// tslint:disable no-unused-expression

describe('DeployView', () => {
    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();
    let context: vscode.ExtensionContext;
    let createWebviewPanelStub: sinon.SinonStub;
    let postMessageStub: sinon.SinonStub;
    let executeCommandStub: sinon.SinonStub;

    const deployData: {channelName: string, environmentName: string} = {channelName: 'mychannel', environmentName: FabricRuntimeUtil.LOCAL_FABRIC};

    const initialMessage: {path: string, deployData: {channelName: string, environmentName: string}} = {
        path: '/deploy',
        deployData
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
});
