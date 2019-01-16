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
import { RepositoryRegistry } from '../../src/repositories/RepositoryRegistry';

const should: Chai.Should = chai.should();
chai.use(sinonChai);

describe('HomeView', () => {
    let mySandBox: sinon.SinonSandbox;
    let extensionPath: string;
    let imageUri: vscode.Uri;

    let executeSpy: sinon.SinonSpy;

    let getExtensionHomepageStub: sinon.SinonStub;
    let createWebviewPanelStub: sinon.SinonStub;
    let context: vscode.ExtensionContext;
    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
        context = {
            extensionPath: '/some/path'
        } as vscode.ExtensionContext;
        executeSpy = mySandBox.spy(vscode.commands, 'executeCommand');

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
            reveal: (): void => {return; }
        });

        const repositories: any = [{ name: 'repo1', samples: [{ name: 'sample1' }] }];
        mySandBox.stub(SampleView, 'getRepositories').resolves(repositories);
        mySandBox.stub(SampleView, 'getRepository').resolves(repositories[0]);
        mySandBox.stub(SampleView, 'getSample').returns(repositories[0].samples[0]);
        await vscode.workspace.getConfiguration().update('extension.home.showOnStartup', true, vscode.ConfigurationTarget.Global);
        extensionPath = ExtensionUtil.getExtensionPath();
        imageUri = vscode.Uri.file(path.join(extensionPath, 'resources', 'blockchain_marketplace.png'));
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
            reveal: (): void => {return; }
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
                localResourceRoots: [
                    vscode.Uri.file(path.join(context.extensionPath, 'resources'))
                ]

            }
        );

        getExtensionHomepageStub.should.have.been.calledOnce;

        filterSpy.getCall(1).thisValue[filterSpy.getCall(1).thisValue.length - 1].webview.html.should.equal('<html>HomePage</html>');
    });

    it('should do nothing if command is not recognised from home page', async () => {
        mySandBox.stub(Array.prototype, 'find').returns(undefined);

        const onDidReceiveMessagePromises: any[] = [];
        onDidReceiveMessagePromises.push(new Promise((resolve: any): void => {
            createWebviewPanelStub.returns({
                webview: {
                    onDidReceiveMessage: async (callback: any): Promise<void> => {
                        await callback({command: 'unknown-command'});
                        resolve();
                    }
                },
                reveal: (): void => {return; },
                onDidDispose: mySandBox.stub()
            });
        }));
        await HomeView.openHomePage(context);
        await Promise.all(onDidReceiveMessagePromises);

        createWebviewPanelStub.should.have.been.calledWith(
            'extensionHome',
            'IBM Blockchain Platform Home',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.file(path.join(context.extensionPath, 'resources'))
                ]

            }
        );

        getExtensionHomepageStub.should.have.been.calledOnce;

        should.equal(executeSpy.getCall(2), null); // Command 'unknown-command' shouldn't have been executed

    });

    it('should execute command from home page', async () => {
        executeSpy.restore();
        mySandBox.stub(Array.prototype, 'find').returns(undefined);
        const executeCommand: sinon.SinonStub = mySandBox.stub(vscode.commands, 'executeCommand');
        executeCommand.callThrough();
        executeCommand.withArgs('some.command').resolves();
        const onDidReceiveMessagePromises: any[] = [];
        onDidReceiveMessagePromises.push(new Promise((resolve: any): void => {
            createWebviewPanelStub.onCall(0).returns({
                webview: {
                    onDidReceiveMessage: async (callback: any): Promise<void> => {
                        await callback({command: 'command', executeCommand: 'some.command'});
                        resolve();
                    }
                },
                reveal: (): void => {return; },
                onDidDispose: mySandBox.stub()
            });
        }));
        await HomeView.openHomePage(context);
        await Promise.all(onDidReceiveMessagePromises);

        createWebviewPanelStub.should.have.been.calledWith(
            'extensionHome',
            'IBM Blockchain Platform Home',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.file(path.join(context.extensionPath, 'resources'))
                ]

            }
        );

        getExtensionHomepageStub.should.have.been.calledOnce;

        executeCommand.getCall(0).should.have.been.calledWith('some.command');
    });

    it('should try to open sample from home page', async () => {
        executeSpy.restore();
        const executeCommand: sinon.SinonStub = mySandBox.stub(vscode.commands, 'executeCommand');
        executeCommand.resolves();
        createWebviewPanelStub.onCall(0).returns({
            webview: {
                onDidReceiveMessage: mySandBox.stub().yields({command: 'openSample', repoName: 'repo1', sampleName: 'sample1'}),
                html: ''
            },
            onDidDispose: mySandBox.stub()
        });

        mySandBox.stub(RepositoryRegistry.prototype, 'get').returns({name: 'repo1', path: 'path'});
        const getContractSample: sinon.SinonStub = mySandBox.stub(SampleView, 'getSamplePage').resolves('<html>Sample Page</html>');

        await HomeView.openHomePage(context);

        createWebviewPanelStub.getCall(0).should.have.been.calledWith(
            'extensionHome',
            'IBM Blockchain Platform Home',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.file(path.join(context.extensionPath, 'resources'))
                ]

            }
        );
        getExtensionHomepageStub.should.have.been.calledOnce;

        executeCommand.getCall(0).should.have.been.calledWith('contractSample.open', 'repo1', 'sample1');

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
            marketplaceIcon: imageUri,
            repositories: repository
        };

        mySandBox.stub(ejs, 'renderFile').callThrough();

        const homePageHtml: string = await HomeView.getHomePage(options);
        homePageHtml.should.contain(`<h3 id="sample-header">`);
        homePageHtml.should.contain(`<a href='#' onclick="openSample('hyperledger/fabric-samples','FabCar')">FabCar</a>`);
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
            marketplaceIcon: imageUri,
            repositories: repository
        };

        const error: Error = new Error('error happened');
        mySandBox.stub(ejs, 'renderFile').yields(error);

        await HomeView.getHomePage(options).should.be.rejectedWith(error);

    });
});
