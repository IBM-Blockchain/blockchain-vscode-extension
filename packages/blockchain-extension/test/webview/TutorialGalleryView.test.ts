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
import { TutorialGalleryView } from '../../extension/webview/TutorialGalleryView';
import { View } from '../../extension/webview/View';
import { ExtensionCommands } from '../../ExtensionCommands';
import { Reporter } from '../../extension/util/Reporter';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';
import { FabricRuntimeUtil } from 'ibm-blockchain-platform-common';

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
                    vscode.Uri.file(path.join(context.extensionPath, 'resources')),
                    vscode.Uri.file(path.join(context.extensionPath, 'build'))
                ]
            }
        );

        createWebviewPanelStub.should.have.been.calledOnce;

        const html: string = filterSpy.getCall(1).thisValue[filterSpy.getCall(1).thisValue.length - 1].webview.html;
        html.should.contain('<h2>Introduction</h2>');
        html.should.contain('<div class="series-description">Series of tutorials that will introduce the basic concepts</div>');

        html.should.contain('<div class="tutorial-number">Tutorial 1</div>');
        html.should.contain('<h3>Local smart contract development</h3>');
        html.should.contain(`<div class="tutorial-description">Follow the typical workflow from generating a new smart contract project, deploying code to the ${FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME} runtime, and testing your transactions via an application gateway.</div>`);

        html.should.contain('<div class="tutorial-number">Tutorial 2</div>');
        html.should.contain('<h3>Create a cloud blockchain deployment</h3>');
        html.should.contain('<div class="tutorial-description">Sign up for the IBM Blockchain Platform service on IBM Cloud, and configure a simple environment ready to deploy your smart contracts to.</div>');

        html.should.contain('<div class="tutorial-number">Tutorial 3</div>');
        html.should.contain('<h3>Deploying and transacting with IBM Cloud</h3>');
        html.should.contain('<div class="tutorial-description">Export smart contracts from VSCode, deploy them in your environment on IBM Cloud, then send transactions from your local machine by creating a gateway.</div>');

        html.should.contain('<h2>Additional Concepts</h2>');
        html.should.contain('<h3 class="tutorial-name">Adding an Environment to connect to IBM Cloud</h3>');
    });

    it('should send telemetry event on openPanelInner', async () => {
        const panel: vscode.WebviewPanel = {
            title: 'Tutorial Gallery'
        } as vscode.WebviewPanel;

        const tutorialGalleryView: TutorialGalleryView = new TutorialGalleryView(context);
        await tutorialGalleryView.openPanelInner(panel);

        reporterStub.should.have.been.calledWith('openedView', {openedView: 'Tutorial Gallery'});

    });

    it('should return string on getHTMLString', async () => {
        const extensionPath: any = ExtensionUtil.getExtensionPath();
        const tutorialsPath: string = path.join(extensionPath, 'tutorials.json');
        const json: any = await fs.readJson(tutorialsPath);
        const allSeries: any = json.series;
        const additionalSeries: any = { name: 'Additional Concepts', tutorials: json.tutorials };

        const tutorialView: TutorialGalleryView = new TutorialGalleryView(context);

        const getTutorialGalleryPage: sinon.SinonSpy = mySandBox.spy(TutorialGalleryView.prototype, 'getTutorialGalleryPage');

        const result: string = await tutorialView['getHTMLString']();
        result.should.contain('<h2>Introduction</h2>');
        result.should.contain('<div class="series-description">Series of tutorials that will introduce the basic concepts</div>');

        result.should.contain('<div class="tutorial-number">Tutorial 1</div>');
        result.should.contain('<h3>Local smart contract development</h3>');
        result.should.contain(`<div class="tutorial-description">Follow the typical workflow from generating a new smart contract project, deploying code to the ${FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME} runtime, and testing your transactions via an application gateway.</div>`);

        result.should.contain('<div class="tutorial-number">Tutorial 2</div>');
        result.should.contain('<h3>Create a cloud blockchain deployment</h3>');
        result.should.contain('<div class="tutorial-description">Sign up for the IBM Blockchain Platform service on IBM Cloud, and configure a simple environment ready to deploy your smart contracts to.</div>');

        result.should.contain('<div class="tutorial-number">Tutorial 3</div>');
        result.should.contain('<h3>Deploying and transacting with IBM Cloud</h3>');
        result.should.contain('<div class="tutorial-description">Export smart contracts from VSCode, deploy them in your environment on IBM Cloud, then send transactions from your local machine by creating a gateway.</div>');

        result.should.contain('<h2>Additional Concepts</h2>');
        result.should.contain('<h3 class="tutorial-name">Adding an Environment to connect to IBM Cloud</h3>');

        getTutorialGalleryPage.should.have.been.calledOnceWithExactly({
            commands : {
                OPEN_TUTORIAL_PAGE: ExtensionCommands.OPEN_TUTORIAL_PAGE,
            },
            images: sinon.match.any,
            allSeries: allSeries,
            additionalSeries: additionalSeries
        });
    });

    it('should throw error if not able to render file', async () => {
        const error: Error = new Error('error happened');
        mySandBox.stub(ejs, 'renderFile').yields(error);
        const tutorialView: TutorialGalleryView = new TutorialGalleryView(context);
        await tutorialView.openView(true).should.be.rejectedWith(error);
    });
});
