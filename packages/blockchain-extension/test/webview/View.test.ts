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
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';
import { View } from '../../extension/webview/View';
const should: Chai.Should = chai.should();
chai.use(sinonChai);

class TestView extends View {

    protected async getHTMLString(): Promise<string> {
        return '';
    }

    protected async openPanelInner(): Promise<void> {
        return;
    }

    protected loadComponent(): void {
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
            onDidChangeViewState: mySandBox.stub(),
            _isDisposed: false

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
            onDidChangeViewState: mySandBox.stub(),
            _isDisposed: false
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
                    vscode.Uri.file(path.join(context.extensionPath, 'resources')),
                    vscode.Uri.file(path.join(context.extensionPath, 'build'))
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

    it('should reveal panel if open already (VS Code 1.44.x)', async () => {
        createWebviewPanelStub.returns({
            title: 'my panel',
            webview: {
                onDidReceiveMessage: mySandBox.stub()
            },
            reveal: (): void => { return; },
            onDidDispose: mySandBox.stub(),
            onDidChangeViewState: mySandBox.stub(),
            _store: {
                _isDisposed: false // 1.44.x support
            }

        });

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
            onDidChangeViewState: onDidChangeViewStub,
            _isDisposed: false
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
            onDidChangeViewState: onDidChangeViewStub,
            _isDisposed: false
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
                name: 'Other tutorials',
                tutorials: [
                    {
                        title: 'Getting Started with Private Data',
                        series: 'Other tutorials',
                        length: '30-40 mins',
                        objectives:
                        [
                          'Understand what private data is and how it can be a beneficial addition to smart contracts',
                          'Implement private data so that you can use it in your smart contracts'
                        ],
                        file: 'developer-tutorials/privateData.md'
                      }
                ]
            };

            const testView: TestView = new TestView(context, 'myPanel', 'my panel');
            const result: any = await testView.getTutorial(series, 'Getting Started with Private Data');

            result.should.deep.equal({
                title: 'Getting Started with Private Data',
                series: 'Other tutorials',
                length: '30-40 mins',
                objectives:
                [
                    'Understand what private data is and how it can be a beneficial addition to smart contracts',
                    'Implement private data so that you can use it in your smart contracts'
                ],
                file: 'developer-tutorials/privateData.md'
            });
        });
    });

    describe('getSeries', () => {
        it('should get a series', async () => {
            const testView: TestView = new TestView(context, 'myPanel', 'my panel');
            const result: any = await testView.getSeries('Basic tutorials');
            result.should.deep.equal({
                name: 'Basic tutorials',
                tutorialDescription: 'The basic tutorials explain key blockchain technical concepts and take you through how to develop a Hyperledger Fabric smart contract and application using IBM Blockchain Platform.',
                tutorialFolder: 'basic-tutorials',
                tutorials: [
                    {
                        title: 'A1: Introduction',
                        series: 'Basic tutorials',
                        length: '10 minutes',
                        firstInSeries: true,
                        objectives:
                        [
                          'Learn what blockchain is and why it is important',
                          'Learn about the Linux Foundation Hyperledger Project and Hyperledger Fabric',
                          'Learn about IBM Blockchain Platform and the VS Code extension'
                        ],
                        badge: true,
                        file: 'new-tutorials/basic-tutorials/a1.md'
                    },
                    {
                        title: 'A2: Creating a smart contract',
                        series: 'Basic tutorials',
                        length: '10 minutes',
                        objectives:
                        [
                          'Create a new smart contract project',
                          'Implement a basic smart contract using a standard template',
                          'Understand what the smart contract does'
                        ],
                        file: 'new-tutorials/basic-tutorials/a2.md'
                    },
                    {
                        title: 'A3: Deploying a smart contract',
                        series: 'Basic tutorials',
                        length: '10 minutes',
                        objectives:
                        [
                          'Start an instance of a Hyperledger Fabric network in the local workspace',
                          'Package the smart contract we previously created',
                          'Deploy the smart contract to the running Hyperledger Fabric network'
                        ],
                        file: 'new-tutorials/basic-tutorials/a3.md'
                    },
                    {
                        title: 'A4: Invoking a smart contract from VS Code',
                        series: 'Basic tutorials',
                        length: '15 minutes',
                        objectives:
                        [
                          'Learn about identities, wallets and gateways',
                          'Exercise a smart contract directly from VS Code',
                          'Understand the difference between evaluating and submitting transactions'
                        ],
                        file: 'new-tutorials/basic-tutorials/a4.md'
                    },
                    {
                        title: 'A5: Invoking a smart contract from an external application',
                        series: 'Basic tutorials',
                        length: '45 minutes',
                        objectives:
                        [
                          'Build a new TypeScript application that interacts with Hyperledger Fabric',
                          'Run the application to submit a new transaction',
                          'Modify the application and test the changes'
                        ],
                        file: 'new-tutorials/basic-tutorials/a5.md'
                    },
                    {
                        title: 'A6: Upgrading a smart contract',
                        series: 'Basic tutorials',
                        length: '20 minutes',
                        objectives:
                        [
                          'Make a change to a smart contract',
                          'Package, install and instantiate the new smart contract',
                          'Try out the new smart contract'
                        ],
                        file: 'new-tutorials/basic-tutorials/a6.md'
                    },
                    {
                        title: 'A7: Debugging a smart contract',
                        series: 'Basic tutorials',
                        length: '15 minutes',
                        objectives:
                        [
                          'Understand the tools to debug smart contracts',
                          'Use the VS Code debugger to step through our newly added transaction to see how it works',
                          "Use 'watches' to monitor variables in smart contracts"
                        ],
                        file: 'new-tutorials/basic-tutorials/a7.md'
                    },
                    {
                        title: 'A8: Testing a smart contract',
                        series: 'Basic tutorials',
                        length: '20 minutes',
                        objectives:
                        [
                          'Look at the features for generating functional tests',
                          'Generate functional tests for our smart contract',
                          'Customize and run a sample test'
                        ],
                        file: 'new-tutorials/basic-tutorials/a8.md'
                    },
                    {
                        title: 'A9: Publishing an event',
                        series: 'Basic tutorials',
                        length: '30 minutes',
                        objectives:
                        [
                          'Update a smart contract to emit an event',
                          'Subscribe to an event notification in the IBM Blockchain Platform VS Code extension',
                          'Submit a transaction and receive the resulting event notification'
                        ],
                        file: 'new-tutorials/basic-tutorials/a9.md'
                    },
                    {
                        title: 'A10: Claim your badge!',
                        series: 'Basic tutorials',
                        length: '60 minutes',
                        objectives:
                        [
                          'Summarize what you have learned so far',
                          'Identify some additional resources that you might find interesting and helpful',
                          'Invite you to test your learning and gain a badge'
                        ],
                        badge: true,
                        file: 'new-tutorials/basic-tutorials/a10.md'
                    }
                ]
            });
        });
    });
});
