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
import { ReactView } from '../../extension/webview/ReactView';
import { View } from '../../extension/webview/View';
import { TestUtil } from '../TestUtil';
import { GlobalState } from '../../extension/util/GlobalState';
chai.use(sinonChai);

class TestView extends ReactView {

    protected openPanelInner(): Promise<void> {
        return;
    }

    protected loadComponent(): void {
        return;
    }
}

describe('ReactView', () => {
    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();
    let context: vscode.ExtensionContext;
    let createWebviewPanelStub: sinon.SinonStub;
    let executeCommandStub: sinon.SinonStub;

    before(async () => {
        await TestUtil.setupTests(mySandBox);
    });

    beforeEach(async () => {
        context = GlobalState.getExtensionContext();
        executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand');
        executeCommandStub.callThrough();

        createWebviewPanelStub = mySandBox.stub(vscode.window, 'createWebviewPanel');

        View['openPanels'].splice(0, View['openPanels'].length);

        createWebviewPanelStub.returns({
            title: 'Transaction Page',
            webview: {
                postMessage: mySandBox.stub(),
                onDidReceiveMessage: mySandBox.stub(),
                asWebviewUri: mySandBox.stub()
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

    it('getHTMLString', async () => {
        const testView: TestView = new TestView(context, 'reactView', 'React View');
        const webview: any = { asWebviewUri: mySandBox.stub() };
        const html: string = await testView.getHTMLString(webview);
        html.should.contain(`<div id="root"></div>`);
    });

});
