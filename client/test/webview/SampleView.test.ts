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
import Axios from 'axios';
import * as fs from 'fs-extra';
import * as shell from 'shelljs';
import * as path from 'path';
import { SampleView } from '../../src/webview/SampleView';
import { ExtensionUtil } from '../../src/util/ExtensionUtil';
import { VSCodeOutputAdapter } from '../../src/logging/VSCodeOutputAdapter';
import { CommandUtil } from '../../src/util/CommandUtil';
import { TestUtil } from '../TestUtil';
import { RepositoryRegistry } from '../../src/repositories/RepositoryRegistry';
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import * as ejs from 'ejs';
import { LogType } from '../../src/logging/OutputAdapter';
const should: Chai.Should = chai.should();
chai.use(sinonChai);

// tslint:disable no-unused-expression
describe('SampleView', () => {
    let mySandBox: sinon.SinonSandbox;

    let repositoryName: string;
    const sample: any = {
        name: 'FabCar',
        description: 'Sample project demonstrating the transfer of vehicle ownership',
        readme: 'https://raw.githubusercontent.com/hyperledger/fabric-samples/master/README.md',
        category: {
            contracts: [
                {
                    name: 'FabCar Contract',
                    languages: [
                        {
                            type: 'GoLang',
                            version: '0.0.1',
                            workspaceLabel: 'fabcar-contract-go',
                            remote: {
                                branch: 'master',
                                path: 'chaincode/fabcar/go'
                            }
                        },
                        {
                            type: 'JavaScript',
                            version: '1.0.0',
                            workspaceLabel: 'fabcar-contract-javascript',
                            remote: {
                                branch: 'master',
                                path: 'chaincode/fabcar/javascript'
                            }
                        },
                        {
                            type: 'TypeScript',
                            version: '1.0.0',
                            workspaceLabel: 'fabcar-contract-typescript',
                            remote: {
                                branch: 'master',
                                path: 'chaincode/fabcar/typescript'
                            }
                        }
                    ]
                }
            ],
            applications: [
                {
                    name: 'JavaScript Application',
                    type: 'Web',
                    version: '1.0.0',
                    language: 'JavaScript',
                    readme: 'https://github.com/hyperledger/fabric-samples',
                    workspaceLabel: 'fabcar-app-javascript',
                    remote: {
                        branch: 'master',
                        path: 'fabcar/javascript'
                    }
                },
                {
                    name: 'TypeScript Application',
                    type: 'Web',
                    version: '1.0.0',
                    language: 'TypeScript',
                    readme: 'https://github.com/hyperledger/fabric-samples',
                    workspaceLabel: 'fabcar-app-typescript',
                    remote: {
                        branch: 'master',
                        path: 'fabcar/typescript'
                    }
                }
            ]
        }
    };
    let repositoryConfig: any;
    let images: any;
    let executeSpy: sinon.SinonSpy;
    let createWebviewPanelStub: sinon.SinonStub;
    let context: vscode.ExtensionContext;
    let getSamplePageStub: sinon.SinonStub;
    let getRepositories: sinon.SinonStub;
    let getRepository: sinon.SinonStub;
    let getSample: sinon.SinonStub;
    let getContract: sinon.SinonStub;
    let repositories: any;
    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
        repositoryName = 'hyperledger/fabric-samples';
        repositoryConfig = undefined;
        images = {
            marketplaceIcon: '',
            contractsIconWhite: '',
            contractsIconBlack: '',
            applicationsIconWhite: '',
            applicationsIconBlack: '',
        };
        context = {
            extensionPath: 'path'
        } as vscode.ExtensionContext;
        executeSpy = mySandBox.spy(vscode.commands, 'executeCommand');

        createWebviewPanelStub = mySandBox.stub(vscode.window, 'createWebviewPanel');
        createWebviewPanelStub.returns({
            webview: {
                onDidReceiveMessage: mySandBox.stub().yields({command: 'openSample', repoName: 'Repo One', sampleName: 'Sample One'}),
                html: ''
            },
            onDidDispose: mySandBox.stub()
        });

        getSamplePageStub = mySandBox.stub(SampleView, 'getSamplePage');
        getSamplePageStub.resolves('<html>Sample Page</html>');

        repositories = [{ name: 'Repo One', samples: [sample]}];
        getRepositories = mySandBox.stub(SampleView, 'getRepositories');
        getRepositories.resolves(repositories);
        getRepository = mySandBox.stub(SampleView, 'getRepository');
        getRepository.resolves(repositories[0]);
        getSample = mySandBox.stub(SampleView, 'getSample');
        getSample.returns(repositories[0].samples[0]);

        getContract = mySandBox.stub(SampleView, 'getContract');
        getContract.returns(repositories[0].samples[0].category['contracts'][0]);

    } );

    afterEach(() => {
        mySandBox.restore();
    });

    it('should clone repository', async () => {
        const findStub: sinon.SinonStub = mySandBox.stub(Array.prototype, 'find');
        findStub.callThrough();
        findStub.onCall(0).returns(undefined);
        findStub.onCall(1).returns(undefined);

        const cloneRepositoryStub: sinon.SinonStub = mySandBox.stub(SampleView, 'cloneRepository');
        cloneRepositoryStub.resolves('test');
        mySandBox.stub(RepositoryRegistry.prototype, 'get').returns({name: 'Repo One', path: 'path'});

        const onDidReceiveMessagePromises: any[] = [];

        onDidReceiveMessagePromises.push(new Promise((resolve: any): void => {
            createWebviewPanelStub.onCall(0).returns({
                webview: {
                    onDidReceiveMessage: async (callback: any): Promise<void> => {
                        await callback({ command: 'clone', repository: 'https://github.com/hyperledger/fabric-samples.git' });
                        resolve();
                    }
                },
                reveal: (): void => {return; },
                onDidDispose: mySandBox.stub(),
                onDidChangeViewState: mySandBox.stub()

            });
        }));

        await SampleView.openContractSample(context, 'Repo One', 'Sample One');
        console.log('calls', createWebviewPanelStub.getCalls());
        await Promise.all(onDidReceiveMessagePromises);

        createWebviewPanelStub.getCall(0).should.have.been.calledWith(
            'Sample One',
            'Sample One Sample',
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

        getSamplePageStub.getCall(0).should.have.been.calledWith({
            repositoryName: 'Repo One',
            sample: sample,
            repositoryConfig: {name: 'Repo One', path: 'path'},
            images: sinon.match.any
        });

        cloneRepositoryStub.should.have.been.calledOnceWithExactly('https://github.com/hyperledger/fabric-samples.git', undefined);
    });

    it('should open file', async () => {
        const findStub: sinon.SinonStub = mySandBox.stub(Array.prototype, 'find');
        findStub.callThrough();
        findStub.onCall(0).returns(undefined);
        findStub.onCall(1).returns(undefined);

        mySandBox.stub(RepositoryRegistry.prototype, 'get').returns({name: 'Repo One', path: 'path'});

        const onDidReceiveMessagePromises: any[] = [];

        onDidReceiveMessagePromises.push(new Promise((resolve: any): void => {
            createWebviewPanelStub.onCall(0).returns({
                webview: {
                    onDidReceiveMessage: async (callback: any): Promise<void> => {
                        await callback({ command: 'open', fileType: 'contract', fileName: 'Contract One', language: 'GoLang' });
                        resolve();
                    }
                },
                reveal: (): void => {return; },
                onDidDispose: mySandBox.stub(),
                onDidChangeViewState: mySandBox.stub()

            });
        }));

        const openFileStub: sinon.SinonStub = mySandBox.stub(SampleView, 'openFile').returns(undefined);

        await SampleView.openContractSample(context, 'Repo One', 'Sample One');
        await Promise.all(onDidReceiveMessagePromises);

        createWebviewPanelStub.getCall(0).should.have.been.calledWith(
            'Sample One',
            'Sample One Sample',
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

        getSamplePageStub.getCall(0).should.have.been.calledWith({
            repositoryName: 'Repo One',
            sample: sample,
            repositoryConfig: {name: 'Repo One', path: 'path'},
            images: sinon.match.any
        });

        openFileStub.should.have.been.calledOnceWithExactly('Repo One', 'Sample One', 'contract', 'Contract One', 'GoLang');

    });

    it('should update language version', async () => {
        const findStub: sinon.SinonStub = mySandBox.stub(Array.prototype, 'find');
        findStub.callThrough();
        findStub.onCall(0).returns(undefined);
        findStub.onCall(1).returns(undefined);

        mySandBox.stub(RepositoryRegistry.prototype, 'get').returns({name: 'Repo One', path: 'path'});

        const onDidReceiveMessagePromises: any[] = [];

        onDidReceiveMessagePromises.push(new Promise((resolve: any): void => {
            createWebviewPanelStub.onCall(0).returns({
                webview: {
                    onDidReceiveMessage: async (callback: any): Promise<void> => {
                        await callback({ command: 'getLanguageVersion', contractName: 'Contract One', languageType: 'GoLang' });
                        resolve();
                    },
                    postMessage: mySandBox.stub().resolves()
                },
                reveal: (): void => {return; },
                onDidDispose: mySandBox.stub(),
                onDidChangeViewState: mySandBox.stub()

            });
        }));

        const getLanguageVersionStub: sinon.SinonStub = mySandBox.stub(SampleView, 'getLanguageVersion').resolves('0.0.1');

        await SampleView.openContractSample(context, 'Repo One', 'Sample One');
        await Promise.all(onDidReceiveMessagePromises);

        createWebviewPanelStub.getCall(0).should.have.been.calledWith(
            'Sample One',
            'Sample One Sample',
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

        getSamplePageStub.should.have.been.calledOnceWithExactly({
            repositoryName: 'Repo One',
            sample: sample,
            repositoryConfig: {name: 'Repo One', path: 'path'},
            images: sinon.match.any
        });

        getLanguageVersionStub.should.have.been.calledOnceWithExactly('Repo One', 'Sample One', 'Contract One', 'GoLang');

    });

    it('should do nothing if command not recognised', async () => {
        const findStub: sinon.SinonStub = mySandBox.stub(Array.prototype, 'find');
        findStub.callThrough();
        findStub.onCall(0).returns(undefined);
        findStub.onCall(1).returns(undefined);

        mySandBox.stub(RepositoryRegistry.prototype, 'get').throws(new Error('Could not get repository'));

        const onDidReceiveMessagePromises: any[] = [];

        onDidReceiveMessagePromises.push(new Promise((resolve: any): void => {
            createWebviewPanelStub.onCall(0).returns({
                webview: {
                    onDidReceiveMessage: async (callback: any): Promise<void> => {
                        await callback({ command: 'unknown-command' });
                        resolve();
                    },
                    postMessage: mySandBox.stub().resolves()
                },
                reveal: (): void => {return; },
                onDidDispose: mySandBox.stub(),
                onDidChangeViewState: mySandBox.stub()

            });
        }));

        const getLanguageVersionStub: sinon.SinonStub = mySandBox.stub(SampleView, 'getLanguageVersion');
        const openFileStub: sinon.SinonStub = mySandBox.stub(SampleView, 'openFile');
        const cloneRepositoryStub: sinon.SinonStub = mySandBox.stub(SampleView, 'cloneRepository');

        await SampleView.openContractSample(context, 'Repo One', 'Sample One');
        await Promise.all(onDidReceiveMessagePromises);

        createWebviewPanelStub.getCall(0).should.have.been.calledWith(
            'Sample One',
            'Sample One Sample',
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

        getSamplePageStub.should.have.been.calledOnceWithExactly({
            repositoryName: 'Repo One',
            sample: sample,
            repositoryConfig: undefined,
            images: sinon.match.any
        });

        getLanguageVersionStub.should.not.have.been.called;
        openFileStub.should.not.have.been.called;
        cloneRepositoryStub.should.not.have.been.called;

    });

    it('should dispose sample page', async () => {
        const findStub: sinon.SinonStub = mySandBox.stub(Array.prototype, 'find');
        findStub.callThrough();
        findStub.onCall(0).returns(undefined);
        findStub.onCall(1).returns(undefined);

        mySandBox.stub(RepositoryRegistry.prototype, 'get').returns({name: 'Repo One', path: 'path'});

        const getLanguageVersionStub: sinon.SinonStub = mySandBox.stub(SampleView, 'getLanguageVersion');
        const openFileStub: sinon.SinonStub = mySandBox.stub(SampleView, 'openFile');
        const cloneRepositoryStub: sinon.SinonStub = mySandBox.stub(SampleView, 'cloneRepository');

        const onDidReceiveMessagePromises: any[] = [];

        onDidReceiveMessagePromises.push(new Promise((resolve: any): void => {
            createWebviewPanelStub.onCall(0).returns({
                title: 'Sample One Sample',
                webview: {
                    onDidReceiveMessage: async (callback: any): Promise<void> => {
                        await callback({ command: 'unknown-command' });
                        resolve();
                    },
                    postMessage: mySandBox.stub().resolves()
                },
                reveal: (): void => {return; },
                onDidDispose: mySandBox.stub().yields(),
                onDidChangeViewState: mySandBox.stub()

            });
        }));

        await SampleView.openContractSample(context, 'Repo One', 'Sample One');
        await Promise.all(onDidReceiveMessagePromises);
        createWebviewPanelStub.getCall(0).should.have.been.calledWith(
            'Sample One',
            'Sample One Sample',
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

        getSamplePageStub.should.have.been.calledOnceWithExactly({
            repositoryName: 'Repo One',
            sample: sample,
            repositoryConfig: {name: 'Repo One', path: 'path'},
            images: sinon.match.any
        });

        getLanguageVersionStub.should.not.have.been.called;
        openFileStub.should.not.have.been.called;
        cloneRepositoryStub.should.not.have.been.called;
    });

    it('should reveal panel if open already', async () => {
        const findStub: sinon.SinonStub = mySandBox.stub(Array.prototype, 'find');
        findStub.callThrough();
        findStub.onCall(0).returns(undefined);
        // findStub.onCall(1).returns({title: 'Sample One Sample', reveal: mySandBox.stub().returns(undefined)});

        mySandBox.stub(RepositoryRegistry.prototype, 'get').returns({name: 'Repo One', path: 'path'});

        const onDidReceiveMessagePromises: any[] = [];
        onDidReceiveMessagePromises.push(new Promise((resolve: any): void => {
            createWebviewPanelStub.onCall(0).returns({
                webview: {
                    onDidReceiveMessage: async (callback: any): Promise<void> => {
                        await callback({ command: 'openSample', repoName: 'Repo One', sampleName: 'Sample One' });
                        resolve();
                    }
                },
                title: 'Sample One Sample',
                reveal: (): void => {return; },
                onDidDispose: mySandBox.stub(),
                onDidChangeViewState: mySandBox.stub()
            });
        }));

        await SampleView.openContractSample(context, 'Repo One', 'Sample One');
        await SampleView.openContractSample(context, 'Repo One', 'Sample One');

        await Promise.all(onDidReceiveMessagePromises);

        should.equal(createWebviewPanelStub.getCall(1), null);
        should.equal(getSamplePageStub.getCall(1), null);

    });

    it('should receive onDidChangeViewState events', async () => {
        const findStub: sinon.SinonStub = mySandBox.stub(Array.prototype, 'find');
        findStub.callThrough();
        findStub.onCall(0).returns(undefined);
        findStub.onCall(1).returns(undefined);

        mySandBox.stub(RepositoryRegistry.prototype, 'get').returns({name: 'Repo One', path: 'path'});

        const onDidReceiveMessagePromises: any[] = [];

        onDidReceiveMessagePromises.push(new Promise((resolve: any): void => {
            createWebviewPanelStub.onCall(0).returns({
                webview: {
                    onDidReceiveMessage: async (callback: any): Promise<void> => {
                        await callback({ command: 'open', fileType: 'contract', fileName: 'Contract One', language: 'GoLang' });
                        resolve();
                    }
                },
                reveal: (): void => {return; },
                onDidDispose: mySandBox.stub(),
                onDidChangeViewState: mySandBox.stub().yields()

            });
        }));

        const openFileStub: sinon.SinonStub = mySandBox.stub(SampleView, 'openFile').returns(undefined);

        await SampleView.openContractSample(context, 'Repo One', 'Sample One');
        await Promise.all(onDidReceiveMessagePromises);

        createWebviewPanelStub.getCall(0).should.have.been.calledWith(
            'Sample One',
            'Sample One Sample',
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

        getSamplePageStub.getCall(0).should.have.been.calledWith({
            repositoryName: 'Repo One',
            sample: sample,
            repositoryConfig: {name: 'Repo One', path: 'path'},
            images: sinon.match.any
        });
        getSamplePageStub.getCalls().length.should.equal(3);
        openFileStub.should.have.been.calledOnceWithExactly('Repo One', 'Sample One', 'contract', 'Contract One', 'GoLang');
    });

    describe('getSamplePage', () => {

        it('should get correct html when not cloned', async () => {

            getSamplePageStub.restore();

            const readme: string = `# FabCar README

            This is the readme`;

            const AxiosStub: sinon.SinonStub = mySandBox.stub(Axios, 'get').resolves({data: readme});
            const options: any = {
                repositoryName: repositoryName,
                sample: sample,
                repositoryConfig: repositoryConfig,
                images: images
            };

            mySandBox.stub(ejs, 'renderFile').callThrough();
            const samplePageHtml: string = await SampleView.getSamplePage(options);
            console.log('AxiosStub', AxiosStub.getCalls());
            AxiosStub.should.have.been.calledWith('https://raw.githubusercontent.com/hyperledger/fabric-samples/master/README.md');

            samplePageHtml.should.contain(`<h1 id="sample-title">FabCar Sample</h1>`);
            samplePageHtml.should.contain(`<button class="clone-button" onclick="cloneRepository('hyperledger/fabric-samples')">Clone</button>`);
            samplePageHtml.should.contain(`<h1 id="fabcarreadme">FabCar README</h1>`); // Comes from MD to HTML generation
            samplePageHtml.should.contain(`<div class="cell">FabCar Contract</div>`); // Row in Contracts table
            samplePageHtml.should.contain(`<button disabled class="open-button" onclick="openFile('FabCar','contracts','FabCar Contract','GoLang')">Open Locally</button>`); // Disabled open button
            samplePageHtml.should.contain(`<button disabled class="open-button" onclick="openFile('FabCar','applications','JavaScript Application')">Open Locally</button>`); // Disabled open button
            samplePageHtml.should.contain(`<button disabled class="open-button" onclick="openFile('FabCar','applications','TypeScript Application')">Open Locally</button>`); // Disabled open button
        });

        it('should throw error if not able to render file', async () => {

            getSamplePageStub.restore();

            const readme: string = `# FabCar README

            This is the readme`;

            const options: any = {
                repositoryName: repositoryName,
                sample: sample,
                repositoryConfig: repositoryConfig,
                images: images
            };

            const AxiosStub: sinon.SinonStub = mySandBox.stub(Axios, 'get').resolves({data: readme});

            const error: Error = new Error('error happened');
            mySandBox.stub(ejs, 'renderFile').yields(error);

            await SampleView.getSamplePage(options).should.be.rejectedWith(error);

        });

        it('should get correct html when cloned', async () => {
            getSamplePageStub.restore();

            const readme: string = `# FabCar README

            This is the readme`;

            const AxiosStub: sinon.SinonStub = mySandBox.stub(Axios, 'get').resolves({data: readme});
            repositoryConfig = { name: repositoryName, path: '/some/path'};
            const options: any = {
                repositoryName: repositoryName,
                sample: sample,
                repositoryConfig: repositoryConfig,
                images: images
            };

            const samplePageHtml: string = await SampleView.getSamplePage(options);

            AxiosStub.should.have.been.calledWith('https://raw.githubusercontent.com/hyperledger/fabric-samples/master/README.md');

            samplePageHtml.should.contain(`<h1 id="sample-title">FabCar Sample</h1>`);
            samplePageHtml.should.contain(`<div class="repository-config-item">Cloned to: /some/path</div>`); // Cloned, so shows the location
            samplePageHtml.should.contain(`<div class="repository-config-item"><a href="#" onclick="cloneRepository('hyperledger/fabric-samples',true)">Clone again</a></div>`); // Can clone again
            samplePageHtml.should.contain(`<h1 id="fabcarreadme">FabCar README</h1>`); // Comes from MD to HTML generation
            samplePageHtml.should.contain(`<div class="cell">FabCar Contract</div>`); // Row in Contracts table
            samplePageHtml.should.contain(`<button class="open-button" onclick="openFile('FabCar','contracts','FabCar Contract','GoLang')">Open Locally</button>`); // Disabled open button
            samplePageHtml.should.contain(`<button class="open-button" onclick="openFile('FabCar','applications','JavaScript Application')">Open Locally</button>`); // Disabled open button
            samplePageHtml.should.contain(`<button class="open-button" onclick="openFile('FabCar','applications','TypeScript Application')">Open Locally</button>`); // Disabled open button
        });

    });

    describe('getLanguageVersion', () => {
        it('should get version of a contract, depending on the language', async () => {
            getSamplePageStub.restore();

            const versionGo: string = await SampleView.getLanguageVersion(repositoryName, 'FabCar', 'FabCar Contract', 'GoLang');
            versionGo.should.equal('0.0.1');

            const versionJavaScript: string = await SampleView.getLanguageVersion(repositoryName, 'FabCar', 'FabCar Contract', 'JavaScript');
            versionJavaScript.should.equal('1.0.0');

            const versionTypeScript: string = await SampleView.getLanguageVersion(repositoryName, 'FabCar', 'FabCar Contract', 'TypeScript');
            versionTypeScript.should.equal('1.0.0');
        });
    });

    describe('cloneRepository', () => {

        before(async () => {
            await TestUtil.storeRepositoriesConfig();
        });

        after(async () => {
            await TestUtil.restoreRepositoriesConfig();
        });

        it('should clone a repository and save to disk', async () => {

            const outputAdapterStub: sinon.SinonStub = mySandBox.stub(VSCodeOutputAdapter.instance(), 'log').resolves();
            const showInformationMessageStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showInformationMessage').returns(undefined);
            const repositoryRegistryStub: sinon.SinonStub = mySandBox.stub(RepositoryRegistry.prototype, 'add').resolves();

            mySandBox.stub(vscode.window, 'showSaveDialog').resolves({fsPath: '/some/path'});
            mySandBox.stub(CommandUtil, 'sendCommandWithProgress').resolves();

            getRepository.resolves({
                name: 'hyperledger/fabric-samples',
                remote: 'https://github.com/hyperledger/fabric-samples.git'
            });

            await SampleView.cloneRepository(repositoryName);

            outputAdapterStub.should.have.been.calledTwice;
            repositoryRegistryStub.should.have.been.calledOnceWithExactly({name: repositoryName, path: '/some/path'});
            outputAdapterStub.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, 'Successfully cloned repository!');
        });

        it('should stop if user cancels dialog', async () => {

            const outputAdapterStub: sinon.SinonStub = mySandBox.stub(VSCodeOutputAdapter.instance(), 'log').resolves();
            const showInformationMessageStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showInformationMessage');
            const repositoryRegistryStub: sinon.SinonStub = mySandBox.stub(RepositoryRegistry.prototype, 'add');

            mySandBox.stub(vscode.window, 'showSaveDialog').resolves();
            const sendCommandWithProgressStub: sinon.SinonStub = mySandBox.stub(CommandUtil, 'sendCommandWithProgress').resolves();
            getRepository.resolves({
                name: 'hyperledger/fabric-samples',
                remote: 'https://github.com/hyperledger/fabric-samples.git'
            });
            await SampleView.cloneRepository(repositoryName);

            outputAdapterStub.should.not.have.been.called;
            sendCommandWithProgressStub.should.not.have.been.called;
            repositoryRegistryStub.should.not.have.been.called;
            showInformationMessageStub.should.not.have.been.called;
        });

        it('should throw an error if repository cannot be cloned', async () => {

            const outputAdapterStub: sinon.SinonStub = mySandBox.stub(VSCodeOutputAdapter.instance(), 'log').resolves();

            mySandBox.stub(vscode.window, 'showSaveDialog').resolves({fsPath: '/some/path'});

            const error: Error = new Error('problem cloning');
            mySandBox.stub(CommandUtil, 'sendCommandWithProgress').throws(error);
            getRepository.resolves({
                name: 'hyperledger/fabric-samples',
                remote: 'https://github.com/hyperledger/fabric-samples.git'
            });

            await SampleView.cloneRepository(repositoryName);

            outputAdapterStub.should.have.been.calledOnceWithExactly(LogType.ERROR, `Could not clone sample: ${error.message}`);
        });

        it('should reclone a repository and update the repository registry', async () => {

            const outputAdapterStub: sinon.SinonStub = mySandBox.stub(VSCodeOutputAdapter.instance(), 'log').resolves();
            const showInformationMessageStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showInformationMessage').returns(undefined);
            const repositoryRegistryStub: sinon.SinonStub = mySandBox.stub(RepositoryRegistry.prototype, 'update').resolves();

            mySandBox.stub(vscode.window, 'showSaveDialog').resolves({fsPath: '/some/path'});
            mySandBox.stub(CommandUtil, 'sendCommandWithProgress').resolves();
            getRepository.resolves({
                name: 'hyperledger/fabric-samples',
                remote: 'https://github.com/hyperledger/fabric-samples.git'
            });

            await SampleView.cloneRepository(repositoryName, true);

            outputAdapterStub.should.have.been.calledTwice;
            repositoryRegistryStub.should.have.been.calledOnceWithExactly({name: repositoryName, path: '/some/path'});
            outputAdapterStub.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, 'Successfully cloned repository!');
        });

    });

    describe('openFile', () => {

        let repositoryRegistryGetStub: sinon.SinonStub;
        let cloneAndOpenRepositorySpy: sinon.SinonSpy;
        before(async () => {
            repositories = {
                repositories: [
                    {
                        name: 'hyperledger/fabric-samples',
                        remote: 'https://github.com/hyperledger/fabric-samples.git',
                        samples: [
                            sample
                        ]
                    }
                ]
            };
            await TestUtil.storeRepositoriesConfig();
        });

        after(async () => {
            await TestUtil.restoreRepositoriesConfig();
        });

        beforeEach(async () => {
            repositoryRegistryGetStub = mySandBox.stub(RepositoryRegistry.prototype, 'get').returns({name: repositoryName, path: '/some/path'});
            cloneAndOpenRepositorySpy = mySandBox.spy(SampleView, 'cloneAndOpenRepository');
        });

        it('should open contract', async () => {

            getRepository.resolves({
                name: 'hyperledger/fabric-samples',
                remote: 'https://github.com/hyperledger/fabric-samples.git',
                samples: [
                    sample
                ]
            });
            getSample.returns(sample);
            getContract.returns(sample.category.contracts[0]);
            const pathExistsStub: sinon.SinonStub = mySandBox.stub(fs, 'pathExists').resolves(true);
            const shellCdStub: sinon.SinonStub = mySandBox.stub(shell, 'cd').returns(undefined);
            const sendCommandStub: sinon.SinonStub = mySandBox.stub(CommandUtil, 'sendCommand').resolves();
            mySandBox.stub(UserInputUtil, 'delayWorkaround').resolves();
            mySandBox.stub(UserInputUtil, 'showFolderOptions').resolves(UserInputUtil.ADD_TO_WORKSPACE);
            const openNewProjectStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'openNewProject').resolves();

            await SampleView.openFile(repositoryName, 'FabCar', 'contracts', 'FabCar Contract', 'TypeScript');

            repositoryRegistryGetStub.should.have.been.calledOnceWithExactly(repositoryName);
            pathExistsStub.should.have.been.calledOnceWithExactly('/some/path');
            shellCdStub.should.have.been.calledOnceWithExactly('/some/path');
            sendCommandStub.should.have.been.calledOnceWithExactly('git checkout -b master origin/master');
            openNewProjectStub.should.have.been.calledOnce;
            cloneAndOpenRepositorySpy.should.have.been.calledOnceWithExactly(repositoryName, 'chaincode/fabcar/typescript', 'master', 'fabcar-contract-typescript');

        });

        it(`should show error if the repository isn't in the user settings`, async () => {

            repositoryRegistryGetStub.returns(undefined);

            const showErrorMessageStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showErrorMessage');

            getRepository.resolves({
                name: 'hyperledger/fabric-samples',
                remote: 'https://github.com/hyperledger/fabric-samples.git',
                samples: [
                    sample
                ]
            });
            getSample.returns(sample);
            getContract.returns(sample.category.contracts[0]);
            mySandBox.stub(UserInputUtil, 'delayWorkaround').resolves();
            mySandBox.stub(UserInputUtil, 'showFolderOptions').resolves(UserInputUtil.ADD_TO_WORKSPACE);

            await SampleView.openFile(repositoryName, 'FabCar', 'contracts', 'FabCar Contract', 'TypeScript');

            repositoryRegistryGetStub.should.have.been.calledOnceWithExactly(repositoryName);
            showErrorMessageStub.should.have.been.calledOnceWithExactly('The location of the cloned repository on the disk is unknown. Try re-cloning the sample repository.');
            cloneAndOpenRepositorySpy.should.have.been.calledOnceWithExactly(repositoryName, 'chaincode/fabcar/typescript', 'master', 'fabcar-contract-typescript');
        });

        it('should delete the repository from the user settings if the directory cannot be found on disk', async () => {
            const repositoryRegistryDeleteStub: sinon.SinonStub = mySandBox.stub(RepositoryRegistry.prototype, 'delete').resolves();
            const showErrorMessageStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showErrorMessage');

            getRepository.resolves({
                name: 'hyperledger/fabric-samples',
                remote: 'https://github.com/hyperledger/fabric-samples.git',
                samples: [
                    sample
                ]
            });
            getSample.returns(sample);
            getContract.returns(sample.category.contracts[0]);
            const pathExistsStub: sinon.SinonStub = mySandBox.stub(fs, 'pathExists').resolves(false);

            await SampleView.openFile(repositoryName, 'FabCar', 'contracts', 'FabCar Contract', 'JavaScript');

            repositoryRegistryGetStub.should.have.been.calledOnceWithExactly(repositoryName);
            pathExistsStub.should.have.been.calledOnceWithExactly('/some/path');
            repositoryRegistryDeleteStub.should.have.been.calledOnceWithExactly(repositoryName);
            showErrorMessageStub.should.have.been.calledOnceWithExactly(`The location of the file(s) you're trying to open is unknown. The sample repository has either been deleted or moved. Try re-cloning the sample repository.`);
            cloneAndOpenRepositorySpy.should.have.been.calledOnceWithExactly(repositoryName, 'chaincode/fabcar/javascript', 'master', 'fabcar-contract-javascript');

        });

        it('should return if user doesnt select how to open files', async () => {

            getRepository.resolves({
                name: 'hyperledger/fabric-samples',
                remote: 'https://github.com/hyperledger/fabric-samples.git',
                samples: [
                    sample
                ]
            });
            getSample.returns(sample);
            getContract.returns(sample.category.contracts[0]);
            const pathExistsStub: sinon.SinonStub = mySandBox.stub(fs, 'pathExists').resolves(true);
            const shellCdStub: sinon.SinonStub = mySandBox.stub(shell, 'cd').returns(undefined);
            const sendCommandStub: sinon.SinonStub = mySandBox.stub(CommandUtil, 'sendCommand').resolves();
            mySandBox.stub(UserInputUtil, 'delayWorkaround').resolves();
            mySandBox.stub(UserInputUtil, 'showFolderOptions').resolves();
            const openNewProjectStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'openNewProject').resolves();

            await SampleView.openFile(repositoryName, 'FabCar', 'contracts', 'FabCar Contract', 'TypeScript');

            repositoryRegistryGetStub.should.have.been.calledOnceWithExactly(repositoryName);
            pathExistsStub.should.have.been.calledOnceWithExactly('/some/path');
            shellCdStub.should.have.been.calledOnceWithExactly('/some/path');
            sendCommandStub.should.have.been.calledOnceWithExactly('git checkout -b master origin/master');
            openNewProjectStub.should.have.not.have.been.called;
            cloneAndOpenRepositorySpy.should.have.been.calledOnceWithExactly(repositoryName, 'chaincode/fabcar/typescript', 'master', 'fabcar-contract-typescript');

        });

        it('should handle if the local branch already exists', async () => {

            getRepository.resolves({
                name: 'hyperledger/fabric-samples',
                remote: 'https://github.com/hyperledger/fabric-samples.git',
                samples: [
                    sample
                ]
            });
            getSample.returns(sample);
            getContract.returns(sample.category.contracts[0]);
            const pathExistsStub: sinon.SinonStub = mySandBox.stub(fs, 'pathExists').resolves(true);
            const shellCdStub: sinon.SinonStub = mySandBox.stub(shell, 'cd').returns(undefined);
            const sendCommandStub: sinon.SinonStub = mySandBox.stub(CommandUtil, 'sendCommand');

            const errorOne: Error = new Error('already exists');
            sendCommandStub.onCall(0).throws(errorOne);
            sendCommandStub.onCall(1).resolves();

            mySandBox.stub(UserInputUtil, 'delayWorkaround').resolves();
            mySandBox.stub(UserInputUtil, 'showFolderOptions').resolves(UserInputUtil.ADD_TO_WORKSPACE);
            const openNewProjectStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'openNewProject').resolves();

            await SampleView.openFile(repositoryName, 'FabCar', 'contracts', 'FabCar Contract', 'TypeScript');

            repositoryRegistryGetStub.should.have.been.calledOnceWithExactly(repositoryName);
            pathExistsStub.should.have.been.calledOnceWithExactly('/some/path');
            shellCdStub.should.have.been.calledOnceWithExactly('/some/path');
            sendCommandStub.getCall(1).should.have.been.calledWithExactly('git checkout master');
            openNewProjectStub.should.have.been.calledOnce;
            cloneAndOpenRepositorySpy.should.have.been.calledOnceWithExactly(repositoryName, 'chaincode/fabcar/typescript', 'master', 'fabcar-contract-typescript');

        });

        it('should handle other errors', async () => {

            getRepository.resolves({
                name: 'hyperledger/fabric-samples',
                remote: 'https://github.com/hyperledger/fabric-samples.git',
                samples: [
                    sample
                ]
            });
            getSample.returns(sample);
            getContract.returns(sample.category.contracts[0]);
            const pathExistsStub: sinon.SinonStub = mySandBox.stub(fs, 'pathExists').resolves(true);
            const shellCdStub: sinon.SinonStub = mySandBox.stub(shell, 'cd').returns(undefined);
            const sendCommandStub: sinon.SinonStub = mySandBox.stub(CommandUtil, 'sendCommand');

            const errorOne: Error = new Error('some other error');
            sendCommandStub.onCall(0).throws(errorOne);
            sendCommandStub.onCall(1).resolves();

            const openNewProjectStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'openNewProject').resolves();

            await SampleView.openFile(repositoryName, 'FabCar', 'contracts', 'FabCar Contract', 'TypeScript').should.be.rejectedWith(`Could not retrieve file(s) from repository: ${errorOne.message}`);

            repositoryRegistryGetStub.should.have.been.calledOnceWithExactly(repositoryName);
            pathExistsStub.should.have.been.calledOnceWithExactly('/some/path');
            shellCdStub.should.have.been.calledOnceWithExactly('/some/path');
            openNewProjectStub.should.have.not.have.been.called;
            cloneAndOpenRepositorySpy.should.have.been.calledOnceWithExactly(repositoryName, 'chaincode/fabcar/typescript', 'master', 'fabcar-contract-typescript');

        });

        it('should throw an error if a second error is thrown and repository cant be checked out automatically', async () => {

            getRepository.resolves({
                name: 'hyperledger/fabric-samples',
                remote: 'https://github.com/hyperledger/fabric-samples.git',
                samples: [
                    sample
                ]
            });
            getSample.returns(sample);
            getContract.returns(sample.category.contracts[0]);
            const pathExistsStub: sinon.SinonStub = mySandBox.stub(fs, 'pathExists').resolves(true);
            const shellCdStub: sinon.SinonStub = mySandBox.stub(shell, 'cd').returns(undefined);
            const sendCommandStub: sinon.SinonStub = mySandBox.stub(CommandUtil, 'sendCommand');

            const errorOne: Error = new Error('already exists');
            const errorTwo: Error = new Error('couldnt checkout for some reason');
            sendCommandStub.onCall(0).throws(errorOne);
            sendCommandStub.onCall(1).throws(errorTwo);

            mySandBox.stub(UserInputUtil, 'delayWorkaround').resolves();
            mySandBox.stub(UserInputUtil, 'showFolderOptions').resolves(UserInputUtil.ADD_TO_WORKSPACE);
            const openNewProjectStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'openNewProject').resolves();

            await SampleView.openFile(repositoryName, 'FabCar', 'contracts', 'FabCar Contract', 'TypeScript').should.be.rejectedWith(`Couldn't automatically checkout 'master' branch. Please checkout branch manually. Error: ${errorTwo.message}`);

            repositoryRegistryGetStub.should.have.been.calledOnceWithExactly(repositoryName);
            pathExistsStub.should.have.been.calledOnceWithExactly('/some/path');
            shellCdStub.should.have.been.calledOnceWithExactly('/some/path');
            sendCommandStub.getCall(1).should.have.been.calledWithExactly('git checkout master');
            openNewProjectStub.should.not.have.been.called;
            cloneAndOpenRepositorySpy.should.have.been.calledOnceWithExactly(repositoryName, 'chaincode/fabcar/typescript', 'master', 'fabcar-contract-typescript');

        });

        it('should open application', async () => {

            getRepository.resolves({
                name: 'hyperledger/fabric-samples',
                remote: 'https://github.com/hyperledger/fabric-samples.git',
                samples: [
                    sample
                ]
            });
            getSample.returns(sample);
            mySandBox.stub(SampleView, 'getApplication').returns(sample.category.applications[1]);
            const pathExistsStub: sinon.SinonStub = mySandBox.stub(fs, 'pathExists').resolves(true);
            const shellCdStub: sinon.SinonStub = mySandBox.stub(shell, 'cd').returns(undefined);
            const sendCommandStub: sinon.SinonStub = mySandBox.stub(CommandUtil, 'sendCommand').resolves();
            mySandBox.stub(UserInputUtil, 'delayWorkaround').resolves();
            mySandBox.stub(UserInputUtil, 'showFolderOptions').resolves(UserInputUtil.ADD_TO_WORKSPACE);
            const openNewProjectStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'openNewProject').resolves();

            await SampleView.openFile(repositoryName, 'FabCar', 'applications', 'TypeScript Application');

            repositoryRegistryGetStub.should.have.been.calledOnceWithExactly(repositoryName);
            pathExistsStub.should.have.been.calledOnceWithExactly('/some/path');
            shellCdStub.should.have.been.calledOnceWithExactly('/some/path');
            sendCommandStub.should.have.been.calledOnceWithExactly('git checkout -b master origin/master');
            openNewProjectStub.should.have.been.calledOnce;
            cloneAndOpenRepositorySpy.should.have.been.calledOnceWithExactly(repositoryName, 'fabcar/typescript', 'master', 'fabcar-app-typescript');

        });

        it('should throw an error if fileType not recognised', async () => {

            getRepository.resolves({
                name: 'hyperledger/fabric-samples',
                remote: 'https://github.com/hyperledger/fabric-samples.git',
                samples: [
                    sample
                ]
            });
            getSample.returns(sample);
            getContract.returns(sample.category.applications[1]);

            const openNewProjectStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'openNewProject');

            await SampleView.openFile(repositoryName, 'FabCar', 'Something Else', 'TypeScript Application').should.be.rejectedWith('File type not supported');

            openNewProjectStub.should.not.have.been.called;
            cloneAndOpenRepositorySpy.should.not.have.been.called;

        });

        it('should error if attempting to open files not coming from a Git repository', async () => {

            getRepository.resolves({
                name: 'hyperledger/fabric-samples',
                remote: 'https://github.com/hyperledger/fabric-samples.NOTGIT',
                samples: [
                    sample
                ]
            });
            getSample.returns(sample);
            getContract.returns(sample.category.applications[1]);
            const openNewProjectStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'openNewProject');

            await SampleView.openFile(repositoryName, 'FabCar', 'applications', 'TypeScript Application').should.be.rejectedWith(`Currently there is no support for opening files unless they're from a Git repository`);

            openNewProjectStub.should.not.have.been.called;
            cloneAndOpenRepositorySpy.should.not.have.been.calledOnceWith(repositoryName, 'chaincode/fabcar/typescript', 'master', 'fabcar-app-typescript');

        });
    });

    describe('getRepositories', () => {
        it('should get repositories', async () => {
            getRepositories.restore();
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

            repositories = await SampleView.getRepositories();
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
            getRepository.restore();
            getRepositories.resolves(repositories);

            const repository: any = await SampleView.getRepository('Repo One');

            repository.should.deep.equal(repositories[0]);
        });
    });

    describe('getSample', () => {
        it('should get sample', async () => {
            getSample.restore();
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
            const result: any = await SampleView.getSample(repository, sampleName);

            result.should.deep.equal({
                name: 'FabCar',
                description: 'Basic sample demonstrating the transfer of vehicle ownership.'
            });
        });
    });

    describe('getContract', () => {
        it('should get contract', async () => {
            getContract.restore();
            const _sample: any = {
                name: 'FabCar',
                description: 'Basic sample demonstrating the transfer of vehicle ownership.',
                readme: 'https://raw.githubusercontent.com/hyperledger/fabric-samples/master/README.md',
                category: {
                    contracts: [
                        {
                            name: 'Other Contract'
                        },
                        {
                            name: 'FabCar Contract',
                            languages: []
                        }
                    ]
                }
            };
            const contractName: string = 'FabCar Contract';
            const result: any = await SampleView.getContract(_sample, contractName);

            result.should.deep.equal({
                name: 'FabCar Contract',
                languages: []
            });
        });
    });

    describe('getApplication', () => {
        it('should get application', async () => {
            const _sample: any = {
                name: 'FabCar',
                description: 'Basic sample demonstrating the transfer of vehicle ownership.',
                readme: 'https://raw.githubusercontent.com/hyperledger/fabric-samples/master/README.md',
                category: {
                    applications: [
                        {
                            name: 'Other Application',
                        },
                        {
                            name: 'JavaScript Application',
                            type: 'Web'
                        }
                    ]
                }
            };
            const applicationName: string = 'JavaScript Application';
            const result: any = await SampleView.getApplication(_sample, applicationName);

            result.should.deep.equal({
                name: 'JavaScript Application',
                type: 'Web'
            });
        });
    });

});
