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
import * as fs from 'fs-extra';
import * as sinon from 'sinon';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import { TutorialGalleryView } from '../../extension/webview/TutorialGalleryView';
import { View } from '../../extension/webview/View';
import { TestUtil } from '../TestUtil';
import { GlobalState } from '../../extension/util/GlobalState';
import { ExtensionCommands } from '../../ExtensionCommands';

chai.use(sinonChai);

describe('TutorialGalleryView', () => {
    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();
    let context: vscode.ExtensionContext;
    let createWebviewPanelStub: sinon.SinonStub;
    let postMessageStub: sinon.SinonStub;
    let executeCommandStub: sinon.SinonStub;
    let onDidReceiveMessagePromises: any[];

    const tutorialData: Array<{seriesName: string, seriesTutorials: any[]}> = [
        {
            seriesName: 'Basic tutorials',
            seriesTutorials: [
                {
                    title: 'a1',
                    length: '4 weeks',
                    file: 'some/file/path'
                }
            ]
        },
        {
            seriesName: 'Other tutorials',
            seriesTutorials: [
                {
                    title: 'something really interesting',
                    length: '10 minutes',
                    file: 'another/file/path'
                }
            ]
        }
    ];

    const initialMessage: {path: string, tutorialData: Array<{seriesName: string, seriesTutorials: any[]}>} = {
        path: '/tutorials',
        tutorialData
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

        mySandBox.stub(fs, 'readJson').resolves(tutorialData);

    });

    afterEach(() => {
        mySandBox.restore();
    });

    it('should register and show the tutorial gallery', async () => {
        createWebviewPanelStub.returns({
            title: 'Tutorial Gallery',
            webview: {
                postMessage: postMessageStub,
                onDidReceiveMessage: mySandBox.stub()
            },
            reveal: mySandBox.stub(),
            dispose: mySandBox.stub(),
            onDidDispose: mySandBox.stub(),
            onDidChangeViewState: mySandBox.stub()
        });

        const tutorialGalleryView: TutorialGalleryView = new TutorialGalleryView(context);
        await tutorialGalleryView.openView(false);
        createWebviewPanelStub.should.have.been.called;
        const call: sinon.SinonSpyCall = postMessageStub.getCall(0);
        call.args[0].should.deep.equal(initialMessage);
    });

    it('should execute a command with args specified in a received message', async () => {
        onDidReceiveMessagePromises = [];

        onDidReceiveMessagePromises.push(new Promise((resolve: any): void => {
            createWebviewPanelStub.returns({
                webview: {
                    postMessage: mySandBox.stub(),
                    onDidReceiveMessage: async (callback: any): Promise<void> => {
                        await callback({
                            command: ExtensionCommands.OPEN_TUTORIAL_PAGE,
                            data: [
                                'my series',
                                'my tutorial'
                            ]
                        });
                        resolve();
                    }
                },
                reveal: (): void => {
                    return;
                },
                onDidDispose: mySandBox.stub(),
                onDidChangeViewState: mySandBox.stub()
            });
        }));

        executeCommandStub.withArgs(ExtensionCommands.OPEN_TUTORIAL_PAGE).resolves();

        const tutorialGalleryView: TutorialGalleryView = new TutorialGalleryView(context);
        await tutorialGalleryView.openView(false);
        await Promise.all(onDidReceiveMessagePromises);

        executeCommandStub.should.have.been.calledWith(ExtensionCommands.OPEN_TUTORIAL_PAGE, 'my series', 'my tutorial');
    });
});
