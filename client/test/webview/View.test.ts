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
import * as path from 'path';
import * as fs from 'fs-extra';
import { ExtensionUtil } from '../../src/util/ExtensionUtil';
import { View } from '../../src/webview/View';
const should: Chai.Should = chai.should();
chai.use(sinonChai);

class TestView extends View {

    protected async getHTMLString(): Promise<string> {
        return '';
    }

    protected async openPanelInner(): Promise<void> {
        return;
    }
}

// tslint:disable no-unused-expression
describe('View', () => {
    let mySandBox: sinon.SinonSandbox;

    let createWebviewPanelStub: sinon.SinonStub;
    let repositories: any;
    let context: vscode.ExtensionContext;

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();

        context = {
            extensionPath: 'path'
        } as vscode.ExtensionContext;

        mySandBox.spy(vscode.commands, 'executeCommand');

        createWebviewPanelStub = mySandBox.stub(vscode.window, 'createWebviewPanel');
        createWebviewPanelStub.returns({
            title: 'my panel',
            webview: {
                onDidReceiveMessage: mySandBox.stub()
            },
            reveal: (): void => { return; },
            onDidDispose: mySandBox.stub(),
            onDidChangeViewState: mySandBox.stub()

        });

        View['openPanels'].splice(0, View['openPanels'].length);
    });

    afterEach(() => {
        mySandBox.restore();
    });

    it('should register and show test page', async () => {

        const testView: TestView = new TestView(context, 'myPanel', 'my panel');
        await testView.openView(false);
        createWebviewPanelStub.should.have.been.called;
    });

    it('should dispose page', async () => {

        const disposeStub: sinon.SinonStub = mySandBox.stub().yields();

        createWebviewPanelStub.onCall(0).returns({
            title: 'my panel',
            webview: {
                onDidReceiveMessage: mySandBox.stub()
            },
            reveal: (): void => { return; },
            onDidDispose: disposeStub,
            onDidChangeViewState: mySandBox.stub()

        });

        const testView: TestView = new TestView(context, 'myPanel', 'my panel');
        await testView.openView(false);

        createWebviewPanelStub.getCall(0).should.have.been.calledWith(
            'myPanel',
            'my panel',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: false,
                enableCommandUris: true,
                localResourceRoots: [
                    vscode.Uri.file(path.join(context.extensionPath, 'resources'))
                ]
            }
        );

        disposeStub.should.have.been.called;
    });

    it('should reveal panel if open already', async () => {

        const testView: TestView = new TestView(context, 'myPanel', 'my panel');
        await testView.openView(false);
        await testView.openView(false);

        should.equal(createWebviewPanelStub.getCall(1), null);
    });

    it('should keep the context of what was open before', async () => {

        const onDidChangeViewStub: sinon.SinonStub = mySandBox.stub().yields();

        createWebviewPanelStub.onCall(0).returns({
            title: 'my panel',
            webview: {
                onDidReceiveMessage: mySandBox.stub()
            },
            reveal: (): void => { return; },
            onDidDispose: mySandBox.stub(),
            onDidChangeViewState: onDidChangeViewStub
        });

        const testView: TestView = new TestView(context, 'myPanel', 'my panel');
        await testView.openView(true);
        createWebviewPanelStub.should.have.been.called;

        onDidChangeViewStub.should.not.have.been.called;
    });

    it('should update the page when the state changes', async () => {

        const onDidChangeViewStub: sinon.SinonStub = mySandBox.stub().yields();

        createWebviewPanelStub.onCall(0).returns({
            title: 'my panel',
            webview: {
                onDidReceiveMessage: mySandBox.stub()
            },
            reveal: (): void => { return; },
            onDidDispose: mySandBox.stub(),
            onDidChangeViewState: onDidChangeViewStub
        });

        const testView: TestView = new TestView(context, 'myPanel', 'my panel');
        await testView.openView(false);
        createWebviewPanelStub.should.have.been.called;

        onDidChangeViewStub.should.have.been.called;
    });

    describe('getRepositories', () => {
        it('should get repositories', async () => {
            mySandBox.stub(ExtensionUtil, 'getExtensionPath').returns('');
            const fsReadJsonStub: sinon.SinonStub = mySandBox.stub(fs, 'readJson').resolves({
                repositories: [
                    {
                        name: 'other/repository'
                    },
                    {
                        name: 'hyperledger/fabric-samples'
                    }
                ]
            });

            const testView: TestView = new TestView(context, 'myPanel', 'my panel');
            repositories = await testView.getRepositories();
            fsReadJsonStub.should.have.been.calledWith('repositories.json');
            repositories.should.deep.equal([
                {
                    name: 'other/repository'
                },
                {
                    name: 'hyperledger/fabric-samples'
                }
            ]);
        });
    });

    describe('getRepository', () => {
        it('should get repository', async () => {

            mySandBox.stub(ExtensionUtil, 'getExtensionPath').returns('');
            mySandBox.stub(fs, 'readJson').resolves({
                repositories: [
                    {
                        name: 'other/repository'
                    },
                    {
                        name: 'hyperledger/fabric-samples'
                    }
                ]
            });

            const testView: TestView = new TestView(context, 'myPanel', 'my panel');
            const repository: any = await testView.getRepository('other/repository');

            repository.should.deep.equal(repositories[0]);
        });
    });

    describe('getSample', () => {
        it('should get sample', async () => {
            const repository: any = {
                name: 'hyperledger/fabric-samples',
                remote: 'https://github.com/hyperledger/fabric-samples.git',
                samples: [
                    {
                        name: 'Other Sample'
                    },
                    {
                        name: 'FabCar',
                        description: 'Basic sample demonstrating the transfer of vehicle ownership.'
                    }
                ]
            };
            const sampleName: string = 'FabCar';
            const testView: TestView = new TestView(context, 'myPanel', 'my panel');
            const result: any = await testView.getSample(repository, sampleName);

            result.should.deep.equal({
                name: 'FabCar',
                description: 'Basic sample demonstrating the transfer of vehicle ownership.'
            });
        });
    });

    describe('getTutorial', () => {
        it('should get tutorial', async () => {
            const series: any = {
                name: 'Introduction',
                length: '3 hours',
                difficulty: 'simple',
                description: 'Series of tutorials that will introduce the basic concepts',
                tutorials: [
                    {
                        title: 'Local smart contract development',
                        length: '30 mins',
                        source: 'https://developer.ibm.com/tutorials/ibm-blockchain-platform-vscode-smart-contract',
                        description: 'Follow the typical workflow from generating a new smart contract project, deploying code to the local_fabric runtime, and testing your transactions via an application gateway.',
                        file: 'ibm-blockchain-platform-vscode-smart-contract/index.md'
                    }
                ]
            };

            const testView: TestView = new TestView(context, 'myPanel', 'my panel');
            const result: any = await testView.getTutorial(series, 'Local smart contract development');

            result.should.deep.equal({
                title: 'Local smart contract development',
                length: '30 mins',
                source: 'https://developer.ibm.com/tutorials/ibm-blockchain-platform-vscode-smart-contract',
                description: 'Follow the typical workflow from generating a new smart contract project, deploying code to the local_fabric runtime, and testing your transactions via an application gateway.',
                file: 'ibm-blockchain-platform-vscode-smart-contract/index.md'
            });
        });
    });
});
