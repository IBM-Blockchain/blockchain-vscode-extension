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
import { Fabric2View } from '../../extension/webview/Fabric2View';
import { View } from '../../extension/webview/View';
import { TestUtil } from '../TestUtil';
import { GlobalState } from '../../extension/util/GlobalState';
import { ExtensionCommands } from '../../ExtensionCommands';

const should: Chai.Should = chai.should();
chai.use(sinonChai);

describe('Fabric2View', () => {
    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();
    let context: vscode.ExtensionContext;
    let createWebviewPanelStub: sinon.SinonStub;
    let postMessageStub: sinon.SinonStub;
    let executeCommandStub: sinon.SinonStub;
    let onDidReceiveMessagePromises: any[];

    const initialMessage: {path: string} = {
        path: '/fabric2'
    };

    before(async () => {
        await TestUtil.setupTests(mySandBox);
    });

    beforeEach(async () => {
        context = GlobalState.getExtensionContext();
        executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand');
        executeCommandStub.callThrough();
        executeCommandStub.withArgs(ExtensionCommands.OPEN_TUTORIAL_GALLERY).resolves();
        executeCommandStub.withArgs(ExtensionCommands.OPEN_TUTORIAL_PAGE).resolves();

        createWebviewPanelStub = mySandBox.stub(vscode.window, 'createWebviewPanel');

        postMessageStub = mySandBox.stub().resolves();

        View['openPanels'].splice(0, View['openPanels'].length);
    });

    afterEach(() => {
        mySandBox.restore();
    });

    it('should register and show the fabric 2 page', async () => {
        createWebviewPanelStub.returns({
            title: `What's new with Fabric v2.0`,
            webview: {
                postMessage: postMessageStub,
                onDidReceiveMessage: mySandBox.stub(),
                asWebviewUri: mySandBox.stub()
            },
            reveal: mySandBox.stub(),
            dispose: mySandBox.stub(),
            onDidDispose: mySandBox.stub(),
            onDidChangeViewState: mySandBox.stub(),
            _isDisposed: false
        });

        const fabric2View: Fabric2View = new Fabric2View(context);
        await fabric2View.openView(false);
        createWebviewPanelStub.should.have.been.called;
        postMessageStub.should.have.been.calledWith(initialMessage);
    });

    it('should reveal fabric 2 page if already open', async () => {
        createWebviewPanelStub.returns({
            webview: {
                postMessage: mySandBox.stub(),
                onDidReceiveMessage: mySandBox.stub(),
                asWebviewUri: mySandBox.stub()
            },
            title: `What's new with Fabric v2.0`,
            onDidDispose: mySandBox.stub(),
            reveal: (): void => { return; },
            _isDisposed: false
        });

        const fabric2View: Fabric2View = new Fabric2View(context);
        await fabric2View.openView(true);
        await fabric2View.openView(true);

        createWebviewPanelStub.should.have.been.calledOnce;

        should.equal(createWebviewPanelStub.getCall(1), null);
    });

    it('should execute a command specified in a received message', async () => {
        onDidReceiveMessagePromises = [];

        onDidReceiveMessagePromises.push(new Promise((resolve: any): void => {
            createWebviewPanelStub.returns({
                webview: {
                    postMessage: mySandBox.stub(),
                    onDidReceiveMessage: async (callback: any): Promise<void> => {
                        await callback({
                            command: ExtensionCommands.OPEN_TUTORIAL_GALLERY
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

        const fabric2view: Fabric2View = new Fabric2View(context);
        await fabric2view.openView(false);
        await Promise.all(onDidReceiveMessagePromises);

        executeCommandStub.should.have.been.calledWith(ExtensionCommands.OPEN_TUTORIAL_GALLERY);
    });

    it('should execute a command with additional data specified in a received message', async () => {
        onDidReceiveMessagePromises = [];

        const message: {command: string, data: string[]} = {
            command: ExtensionCommands.OPEN_TUTORIAL_PAGE,
                data: [
                    'Basic tutorials',
                    'A1: Introduction'
                ]
        };

        onDidReceiveMessagePromises.push(new Promise((resolve: any): void => {
            createWebviewPanelStub.returns({
                webview: {
                    postMessage: mySandBox.stub(),
                    onDidReceiveMessage: async (callback: any): Promise<void> => {
                        await callback(message);
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

        const fabric2View: Fabric2View = new Fabric2View(context);
        await fabric2View.openView(false);
        await Promise.all(onDidReceiveMessagePromises);

        executeCommandStub.should.have.been.calledWith(ExtensionCommands.OPEN_TUTORIAL_PAGE, ...message.data);
    });
});
