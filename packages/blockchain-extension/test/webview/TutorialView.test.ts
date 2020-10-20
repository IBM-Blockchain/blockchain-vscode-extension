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
import { TutorialView } from '../../extension/webview/TutorialView';
import { View } from '../../extension/webview/View';
import { Reporter } from '../../extension/util/Reporter';
import { SettingConfigurations } from '../../extension/configurations';
import { GlobalState } from '../../extension/util/GlobalState';
import { ExtensionCommands } from '../../ExtensionCommands';
import { TestUtil } from '../TestUtil';

chai.use(sinonChai);

describe('TutorialView', () => {
    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();
    let context: vscode.ExtensionContext;
    let createWebviewPanelStub: sinon.SinonStub;
    let postMessageStub: sinon.SinonStub;
    let executeCommandStub: sinon.SinonStub;
    let onDidReceiveMessagePromises: any[];

    const dummyMarkdown: string = '# Header\nparagraph';

    const tutorial: { title: string, length: string, file: string } = {
        title: 'a1',
        length: '4 weeks',
        file: 'some/file/path',
    };

    const tutorials: Array<{name: string, tutorials: any[]}> = [
        {
            name: 'Basic tutorials',
            tutorials: [
                tutorial,
            ]
        },
        {
            name: 'Other tutorials',
            tutorials: [
                {
                    title: 'something really interesting',
                    length: '10 minutes',
                    file: 'another/file/path'
                }
            ]
        }
    ];

    const initialMessage: {
        path: string,
        tutorialData: {
            tutorials: Array<{name: string, tutorials: any[]}>,
            activeTutorial: { title: string, length: string, file: string, markdown: string },
        },
    } = {
        path: '/viewTutorial',
        tutorialData: {
            tutorials,
            activeTutorial: {
                ...tutorial,
                markdown: dummyMarkdown,
            },
        }
    };

    before(async () => {
        await TestUtil.setupTests(mySandBox);
    });

    beforeEach(async () => {
        mySandBox.stub(Reporter.instance(), 'sendTelemetryEvent');

        context = GlobalState.getExtensionContext();

        executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand');
        executeCommandStub.callThrough();

        createWebviewPanelStub = mySandBox.stub(vscode.window, 'createWebviewPanel');

        postMessageStub = mySandBox.stub().resolves();

        View['openPanels'].splice(0, View['openPanels'].length);

        mySandBox.stub(fs, 'readJson').resolves(tutorials);
        mySandBox.stub(fs, 'readFile').resolves(dummyMarkdown);
        // mySandBox.stub(TutorialView.prototype, 'getTutorialInfo').resolves(tutorials);

        await vscode.workspace.getConfiguration().update(SettingConfigurations.HOME_SHOW_ON_STARTUP, true, vscode.ConfigurationTarget.Global);
        await vscode.workspace.getConfiguration().update(SettingConfigurations.HOME_SHOW_ON_NEXT_ACTIVATION, false, vscode.ConfigurationTarget.Global);
    });

    afterEach(() => {
        mySandBox.restore();
    });

    it('should register and show the tutorial', async () => {
        createWebviewPanelStub.returns({
            title: 'Tutorial',
            webview: {
                postMessage: postMessageStub,
                onDidReceiveMessage: mySandBox.stub()
            },
            reveal: mySandBox.stub(),
            dispose: mySandBox.stub(),
            onDidDispose: mySandBox.stub(),
            onDidChangeViewState: mySandBox.stub()
        });

        const tutorialView: TutorialView = new TutorialView(context, tutorials[0].name, tutorial.title);
        await tutorialView.openView(true);
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

        const tutorialView: TutorialView = new TutorialView(context, tutorials[0].name, tutorial.title);
        await tutorialView.openView(false);
        await Promise.all(onDidReceiveMessagePromises);

        executeCommandStub.should.have.been.calledWith(ExtensionCommands.OPEN_TUTORIAL_PAGE, 'my series', 'my tutorial');
    });

    it('should load component', async () => {
        const tutorialView: TutorialView = new TutorialView(context, 'Basic tutorials', 'A1: Introduction');
        // tslint:disable-next-line: no-floating-promises
        tutorialView.loadComponent({} as vscode.WebviewPanel);
    });
});
