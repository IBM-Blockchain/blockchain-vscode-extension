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
import { HomeView } from '../../extension/webview/HomeView';
import { View } from '../../extension/webview/View';
import { Reporter } from '../../extension/util/Reporter';
import { TestUtil } from '../TestUtil';
import { GlobalState } from '../../extension/util/GlobalState';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';
import { ExtensionCommands } from '../../ExtensionCommands';

const should: Chai.Should = chai.should();
chai.use(sinonChai);

describe('HomeView', () => {
    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();
    let context: vscode.ExtensionContext;
    let createWebviewPanelStub: sinon.SinonStub;
    let postMessageStub: sinon.SinonStub;
    let executeCommandStub: sinon.SinonStub;
    let sendTelemetryEventStub: sinon.SinonStub;
    let onDidReceiveMessagePromises: any[];

    const initialMessage: {path: string, version: string} = {
        path: '/home',
        version: '1.0.0'
    };

    before(async () => {
        await TestUtil.setupTests(mySandBox);
    });

    beforeEach(async () => {
        context = GlobalState.getExtensionContext();
        executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand');
        executeCommandStub.callThrough();
        executeCommandStub.withArgs(ExtensionCommands.OPEN_TUTORIAL_GALLERY).resolves();
        executeCommandStub.withArgs(ExtensionCommands.OPEN_SAMPLE_PAGE).resolves();

        createWebviewPanelStub = mySandBox.stub(vscode.window, 'createWebviewPanel');

        postMessageStub = mySandBox.stub().resolves();

        mySandBox.stub(ExtensionUtil, 'getPackageJSON').resolves({
            version: '1.0.0'
        });

        sendTelemetryEventStub = mySandBox.stub(Reporter.instance(), 'sendTelemetryEvent');

        View['openPanels'].splice(0, View['openPanels'].length);
    });

    afterEach(() => {
        mySandBox.restore();
    });

    it('should register and show the home page', async () => {
        createWebviewPanelStub.returns({
            title: 'IBM Blockchain Platform Home',
            webview: {
                postMessage: postMessageStub,
                onDidReceiveMessage: mySandBox.stub()
            },
            reveal: mySandBox.stub(),
            dispose: mySandBox.stub(),
            onDidDispose: mySandBox.stub(),
            onDidChangeViewState: mySandBox.stub(),
            _isDisposed: false
        });

        const homeView: HomeView = new HomeView(context);
        await homeView.openView(false);
        createWebviewPanelStub.should.have.been.called;
        postMessageStub.should.have.been.calledWith(initialMessage);
    });

    it('should reveal home page if already open', async () => {
        createWebviewPanelStub.returns({
            webview: {
                postMessage: mySandBox.stub(),
                onDidReceiveMessage: mySandBox.stub(),
            },
            title: 'IBM Blockchain Platform Home',
            onDidDispose: mySandBox.stub(),
            reveal: (): void => { return; },
            _isDisposed: false
        });

        const homeView: HomeView = new HomeView(context);
        await homeView.openView(true);
        await homeView.openView(true);

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

        const homeView: HomeView = new HomeView(context);
        await homeView.openView(false);
        await Promise.all(onDidReceiveMessagePromises);

        executeCommandStub.should.have.been.calledWith(ExtensionCommands.OPEN_TUTORIAL_GALLERY);
    });

    it('should execute a command with additional data specified in a received message', async () => {
        onDidReceiveMessagePromises = [];

        const message: {command: string, data: string[]} = {
            command: ExtensionCommands.OPEN_SAMPLE_PAGE,
                data: [
                    'fabric-samples',
                    'FabCar'
                ]
        };

        onDidReceiveMessagePromises.push(new Promise((resolve: any): void => {
            createWebviewPanelStub.returns({
                webview: {
                    postMessage: mySandBox.stub(),
                    onDidReceiveMessage: async (callback: any): Promise<void> => {
                        await callback(message);
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

        const homeView: HomeView = new HomeView(context);
        await homeView.openView(false);
        await Promise.all(onDidReceiveMessagePromises);

        executeCommandStub.should.have.been.calledWith(ExtensionCommands.OPEN_SAMPLE_PAGE, ...message.data);
    });

    it('should send a telemetry event if a link was clicked', async () => {
        onDidReceiveMessagePromises = [];

        onDidReceiveMessagePromises.push(new Promise((resolve: any): void => {
            createWebviewPanelStub.returns({
                webview: {
                    postMessage: mySandBox.stub(),
                    onDidReceiveMessage: async (callback: any): Promise<void> => {
                        await callback({
                            command: 'telemetry',
                            data: 'https://cloud.ibm.com/docs/services/blockchain/howto?topic=blockchain-ibp-console-overview&cm_mmc=OSocial_Googleplus-_-Blockchain+and+Watson+Financial+Services_Blockchain-_-WW_WW-_-VS+code+link+-+about+IBM+Blockchain+Platform&cm_mmca1=000026VG&cm_mmca2=10008691'
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

        const homeView: HomeView = new HomeView(context);
        await homeView.openView(false);

        await Promise.all(onDidReceiveMessagePromises);

        sendTelemetryEventStub.should.have.been.calledWith('Referral', {source: 'homepage', destination: 'https://cloud.ibm.com/docs/services/blockchain/howto?topic=blockchain-ibp-console-overview&cm_mmc=OSocial_Googleplus-_-Blockchain+and+Watson+Financial+Services_Blockchain-_-WW_WW-_-VS+code+link+-+about+IBM+Blockchain+Platform&cm_mmca1=000026VG&cm_mmca2=10008691'});
    });

    it('should send telemetry event on openPanelInner', async () => {
        const panel: vscode.WebviewPanel = {
            title: 'IBM Blockchain Platform Home',
            webview: {
                postMessage: mySandBox.stub(),
                onDidReceiveMessage: mySandBox.stub(),
            }
        } as any;

        const homeView: HomeView = new HomeView(context);
        await homeView.openPanelInner(panel);

        sendTelemetryEventStub.should.have.been.calledOnceWithExactly('openedView', {openedView: 'IBM Blockchain Platform Home'});
    });
});
