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
import * as path from 'path';
import * as ejs from 'ejs';
import * as fs from 'fs-extra';
import { TutorialGalleryView } from '../../src/webview/TutorialGalleryView';
import { View } from '../../src/webview/View';
import { ExtensionCommands } from '../../ExtensionCommands';
import { Reporter } from '../../src/util/Reporter';
import { ExtensionUtil } from '../../src/util/ExtensionUtil';

const should: Chai.Should = chai.should();
chai.use(sinonChai);

describe('TutorialGalleryView', () => {
    let mySandBox: sinon.SinonSandbox;
    let context: vscode.ExtensionContext;
    let createWebviewPanelStub: sinon.SinonStub;
    let reporterStub: sinon.SinonStub;
    beforeEach(async () => {
        mySandBox = sinon.createSandbox();

        context = {
            extensionPath: 'path'
        } as vscode.ExtensionContext;
        mySandBox.spy(vscode.commands, 'executeCommand');

        createWebviewPanelStub = mySandBox.stub(vscode.window, 'createWebviewPanel');
        createWebviewPanelStub.returns({
            webview: {
                onDidReceiveMessage: mySandBox.stub()
            },
            reveal: (): void => {
                return;
            },
            title: 'Tutorial Gallery',
            onDidDispose: mySandBox.stub(),
            onDidChangeViewState: mySandBox.stub()
        });

        View['openPanels'].splice(0, View['openPanels'].length);

        reporterStub = mySandBox.stub(Reporter.instance(), 'sendTelemetryEvent');
    });

    afterEach(() => {
        mySandBox.restore();
    });

    it('should register and show tutorial gallery page', async () => {

        const sampleView: TutorialGalleryView = new TutorialGalleryView(context);
        await sampleView.openView(false);
        createWebviewPanelStub.should.have.been.called;
    });

    it('should reveal tutorial gallery page if already open', async () => {

        const tutorialGalleryView: TutorialGalleryView = new TutorialGalleryView(context);
        await tutorialGalleryView.openView(true);
        await tutorialGalleryView.openView(true);

        createWebviewPanelStub.should.have.been.calledOnce;

        should.equal(createWebviewPanelStub.getCall(1), null);
    });

    it('should dispose tutorial gallery page', async () => {
        const filterSpy: sinon.SinonSpy = mySandBox.spy(Array.prototype, 'filter');

        createWebviewPanelStub.returns({
            webview: {
                onDidReceiveMessage: mySandBox.stub()
            },
            reveal: (): void => {
                return;
            },
            title: 'Tutorial Gallery',
            onDidDispose: mySandBox.stub().yields(),
            onDidChangeViewState: mySandBox.stub()
        });

        const tutorialGalleryView: TutorialGalleryView = new TutorialGalleryView(context);

        mySandBox.stub(tutorialGalleryView, 'getHTMLString').resolves('<html>Tutorial Gallery</html>');
        await tutorialGalleryView.openView(true);

        createWebviewPanelStub.should.have.been.calledWith(
            'tutorialGallery',
            'Tutorial Gallery',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                enableCommandUris: true,
                localResourceRoots: [
                    vscode.Uri.file(path.join(context.extensionPath, 'resources'))
                ]
            }
        );

        createWebviewPanelStub.should.have.been.calledOnce;

        filterSpy.getCall(1).thisValue[filterSpy.getCall(1).thisValue.length - 1].webview.html.should.equal('<html>Tutorial Gallery</html>');
    });

    it('should send telemetry event on openPanelInner', async () => {
        const panel: vscode.WebviewPanel = {
            title: 'Tutorial Gallery'
        } as vscode.WebviewPanel;

        const tutorialGalleryView: TutorialGalleryView = new TutorialGalleryView(context);
        await tutorialGalleryView.openPanelInner(panel);

        reporterStub.should.have.been.calledWith('openedView', {name: 'Tutorial Gallery'});

    });

    it('should return string on getHTMLString', async () => {
        const extensionPath: any = ExtensionUtil.getExtensionPath();
        const tutorialsPath: string = path.join(extensionPath, 'tutorials.json');
        const json: any = await fs.readJson(tutorialsPath);
        const allSeries: any = json.series;

        const tutorialView: TutorialGalleryView = new TutorialGalleryView(context);

        const getTutorialGalleryPage: sinon.SinonStub = mySandBox.stub(TutorialGalleryView.prototype, 'getTutorialGalleryPage').resolves('<html>Tutorial Gallery</html>');

        const result: string = await tutorialView['getHTMLString']();
        result.should.equal('<html>Tutorial Gallery</html>');

        getTutorialGalleryPage.should.have.been.calledOnceWithExactly({
            commands : {
                OPEN_TUTORIAL_PAGE: ExtensionCommands.OPEN_TUTORIAL_PAGE,
            },
            images: sinon.match.any,
            allSeries: allSeries
        });
    });

    it('should throw error if not able to render file', async () => {
        const error: Error = new Error('error happened');
        mySandBox.stub(ejs, 'renderFile').yields(error);
        const tutorialView: TutorialGalleryView = new TutorialGalleryView(context);
        await tutorialView.openView(true).should.be.rejectedWith(error);
    });
});
