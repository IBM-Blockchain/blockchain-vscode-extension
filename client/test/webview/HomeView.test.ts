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
import { HomeView } from '../../src/webview/HomeView';
import { ExtensionUtil } from '../../src/util/ExtensionUtil';
import * as ejs from 'ejs';
import { SampleView } from '../../src/webview/SampleView';
import { ExtensionCommands } from '../../ExtensionCommands';

const should: Chai.Should = chai.should();
chai.use(sinonChai);

describe('HomeView', () => {
    let mySandBox: sinon.SinonSandbox;
    let extensionPath: string;
    let images: any;

    let getExtensionHomepageStub: sinon.SinonStub;
    let createWebviewPanelStub: sinon.SinonStub;
    let context: vscode.ExtensionContext;
    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
        context = {
            extensionPath: '/some/path'
        } as vscode.ExtensionContext;

        getExtensionHomepageStub = mySandBox.stub(HomeView, 'getExtensionHomepage');
        getExtensionHomepageStub.resolves('<html>HomePage</html>');
        createWebviewPanelStub = mySandBox.stub(vscode.window, 'createWebviewPanel');
        createWebviewPanelStub.returns({
            webview: {
                onDidReceiveMessage: mySandBox.stub(),
                html: ''
            },
            title: 'IBM Blockchain Platform Home',
            onDidDispose: mySandBox.stub(),
            reveal: (): void => { return; }
        });

        const repositories: any = [{ name: 'repo1', samples: [{ name: 'sample1' }] }];
        mySandBox.stub(SampleView, 'getRepositories').resolves(repositories);
        mySandBox.stub(SampleView, 'getRepository').resolves(repositories[0]);
        mySandBox.stub(SampleView, 'getSample').returns(repositories[0].samples[0]);
        await vscode.workspace.getConfiguration().update('extension.home.showOnStartup', true, vscode.ConfigurationTarget.Global);
        extensionPath = ExtensionUtil.getExtensionPath();

        // Images
        const marketplaceIcon: vscode.Uri = vscode.Uri.file(path.join(extensionPath, 'resources', 'blockchain_marketplace.png')).with({ scheme: 'vscode-resource' });
        const githubDark: vscode.Uri = vscode.Uri.file(path.join(extensionPath, 'resources', 'github_dark.svg')).with({ scheme: 'vscode-resource' });
        const documentDark: vscode.Uri = vscode.Uri.file(path.join(extensionPath, 'resources', 'document_dark.svg')).with({ scheme: 'vscode-resource' });
        const searchDark: vscode.Uri = vscode.Uri.file(path.join(extensionPath, 'resources', 'search_dark.svg')).with({ scheme: 'vscode-resource' });
        const githubLight: vscode.Uri = vscode.Uri.file(path.join(extensionPath, 'resources', 'github_light.svg')).with({ scheme: 'vscode-resource' });
        const documentLight: vscode.Uri = vscode.Uri.file(path.join(extensionPath, 'resources', 'document_light.svg')).with({ scheme: 'vscode-resource' });
        const searchLight: vscode.Uri = vscode.Uri.file(path.join(extensionPath, 'resources', 'search_light.svg')).with({ scheme: 'vscode-resource' });

        images = {
            marketplaceIcon: marketplaceIcon,
            githubDark: githubDark,
            documentDark: documentDark,
            searchDark: searchDark,
            githubLight: githubLight,
            documentLight: documentLight,
            searchLight: searchLight
        };
    });

    afterEach(() => {
        mySandBox.restore();
    });

    it('should register and show home page', async () => {

        mySandBox.stub(Array.prototype, 'find').returns(undefined);

        await HomeView.openHomePage(context);
        getExtensionHomepageStub.should.have.been.calledOnce;
    });

    it('should reveal home page if already open', async () => {

        const findStub: sinon.SinonStub = mySandBox.stub(Array.prototype, 'find');
        findStub.callThrough();
        findStub.onCall(0).returns(undefined);

        createWebviewPanelStub.returns({
            webview: {
                onDidReceiveMessage: mySandBox.stub(),
                html: ''
            },
            title: 'IBM Blockchain Platform Home',
            onDidDispose: mySandBox.stub(),
            reveal: (): void => { return; }
        });

        await HomeView.openHomePage(context);
        await HomeView.openHomePage(context);

        getExtensionHomepageStub.should.have.been.calledOnce;

        should.equal(createWebviewPanelStub.getCall(1), null);
    });

    it('should dispose home page', async () => {
        mySandBox.stub(Array.prototype, 'find').returns(undefined);
        const filterSpy: sinon.SinonSpy = mySandBox.spy(Array.prototype, 'filter');

        createWebviewPanelStub.returns({
            webview: {
                onDidReceiveMessage: mySandBox.stub(),
                html: ''
            },
            onDidDispose: mySandBox.stub().yields()
        });

        await HomeView.openHomePage(context);

        createWebviewPanelStub.should.have.been.calledWith(
            'extensionHome',
            'IBM Blockchain Platform Home',
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

        getExtensionHomepageStub.should.have.been.calledOnce;

        filterSpy.getCall(1).thisValue[filterSpy.getCall(1).thisValue.length - 1].webview.html.should.equal('<html>HomePage</html>');
    });

    it('getHomePage', async () => {
        getExtensionHomepageStub.restore();
        const repository: any = [
            {
                name: 'hyperledger/fabric-samples',
                remote: 'https://github.com/hyperledger/fabric-samples.git',
                samples: [
                    {
                        name: 'FabCar',
                        description: 'Sample project demonstrating the transfer of vehicle ownership'
                    }
                ]
            }
        ];
        const options: any = {
            extensionVersion: '0.0.1',
            commands: {
                OPEN_SAMPLE_PAGE: ExtensionCommands.OPEN_SAMPLE_PAGE
            },
            images: images,
            repositories: repository
        };

        mySandBox.stub(ejs, 'renderFile').callThrough();

        const homePageHtml: string = await HomeView.getHomePage(options);
        homePageHtml.should.contain(`<h3 id="sample-header">`);
        homePageHtml.should.contain(`<h4 id="repository-name">hyperledger/fabric-samples</h4>`);
        homePageHtml.should.contain(`<p id="sample-description">Sample project demonstrating the transfer of vehicle ownership</p>`);
    });

    it('should throw error if not able to render file', async () => {
        getExtensionHomepageStub.restore();

        const repository: any = [
            {
                name: 'hyperledger/fabric-samples',
                remote: 'https://github.com/hyperledger/fabric-samples.git',
                samples: [
                    {
                        name: 'FabCar',
                        description: 'Sample project demonstrating the transfer of vehicle ownership'
                    }
                ]
            }
        ];
        const options: any = {
            extensionVersion: '0.0.1',
            commands: {
                OPEN_SAMPLE_PAGE: ExtensionCommands.OPEN_SAMPLE_PAGE
            },
            images: images,
            repositories: repository
        };

        const error: Error = new Error('error happened');
        mySandBox.stub(ejs, 'renderFile').yields(error);

        await HomeView.getHomePage(options).should.be.rejectedWith(error);

    });
});
