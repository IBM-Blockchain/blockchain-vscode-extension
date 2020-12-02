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
import { SampleGalleryView } from '../../extension/webview/SampleGalleryView';
import { View } from '../../extension/webview/View';
import { TestUtil } from '../TestUtil';
import { GlobalState } from '../../extension/util/GlobalState';
import { ExtensionCommands } from '../../ExtensionCommands';

chai.use(sinonChai);

describe('SampleGalleryView', () => {
    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();
    let context: vscode.ExtensionContext;
    let createWebviewPanelStub: sinon.SinonStub;
    let postMessageStub: sinon.SinonStub;
    let executeCommandStub: sinon.SinonStub;
    let onDidReceiveMessagePromises: any[];

    const repositories: { repositories: any[] } = {
        repositories: [
            {
                name: 'fabric-samples',
                orgName: 'hyperledger',
                remote: 'https://github.com/hyperledger/fabric-samples.git',
                tutorials: [],
                samples: [
                    {
                        name: 'FabCar',
                        description: 'Basic sample based on cars: the "hello world" of Hyperledger Fabric samples.',
                        readme: 'https://raw.githubusercontent.com/hyperledger/fabric-samples/master/README.md',
                        category: {
                            contracts: [
                                {
                                    name: 'FabCar Contract',
                                    languages: [
                                        {
                                            type: 'Go',
                                            version: '1.0.0',
                                            workspaceLabel: 'fabcar-contract-go',
                                            remote: {
                                                branch: 'master',
                                                path: 'chaincode/fabcar/go'
                                            }
                                        },
                                        {
                                            type: 'Java',
                                            version: '1.0.0',
                                            workspaceLabel: 'fabcar-contract-java',
                                            remote: {
                                                branch: 'master',
                                                path: 'chaincode/fabcar/java'
                                            }
                                        },
                                        {
                                            type: 'JavaScript',
                                            version: '1.0.0',
                                            workspaceLabel: 'fabcar-contract-javascript',
                                            remote: {
                                                branch: 'master',
                                                path: 'chaincode/fabcar/javascript'
                                            },
                                            onOpen: [
                                                {
                                                    message: 'Installing Node.js dependencies ...',
                                                    command: 'npm',
                                                    arguments: ['install']
                                                }
                                            ]
                                        },
                                        {
                                            type: 'TypeScript',
                                            version: '1.0.0',
                                            workspaceLabel: 'fabcar-contract-typescript',
                                            remote: {
                                                branch: 'master',
                                                path: 'chaincode/fabcar/typescript'
                                            },
                                            onOpen: [
                                                {
                                                    message: 'Installing Node.js dependencies ...',
                                                    command: 'npm',
                                                    arguments: ['install']
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ],
                            applications: [
                                {
                                    name: 'Java Application',
                                    type: 'Web',
                                    version: '1.0.0',
                                    language: 'Java',
                                    readme: 'https://github.com/hyperledger/fabric-samples',
                                    workspaceLabel: 'fabcar-app-java',
                                    remote: {
                                        branch: 'master',
                                        path: 'fabcar/java'
                                    }
                                },
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
                                    },
                                    onOpen: [
                                        {
                                            message: 'Installing Node.js dependencies ...',
                                            command: 'npm',
                                            arguments: ['install']
                                        }
                                    ]
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
                                    },
                                    onOpen: [
                                        {
                                            message: 'Installing Node.js dependencies ...',
                                            command: 'npm',
                                            arguments: ['install']
                                        }
                                    ]
                                }
                            ]
                        }
                    },
                    {
                        name: 'Commercial Paper',
                        description: 'Based on a real-world financial use-case, with multiple parties sharing a ledger.',
                        readme: 'https://raw.githubusercontent.com/hyperledger/fabric-samples/master/README.md',
                        category: {
                            contracts: [
                                {
                                    name: 'Digibank Contract',
                                    languages: [
                                        {
                                            type: 'Java',
                                            version: '0.0.1',
                                            workspaceLabel: 'cp-digibank-contract-java',
                                            remote: {
                                                branch: 'master',
                                                path: 'commercial-paper/organization/digibank/contract-java'
                                            }
                                        },
                                        {
                                            type: 'JavaScript',
                                            version: '0.0.1',
                                            workspaceLabel: 'cp-digibank-contract-javascript',
                                            remote: {
                                                branch: 'master',
                                                path: 'commercial-paper/organization/digibank/contract'
                                            },
                                            onOpen: [
                                                {
                                                    message: 'Installing Node.js dependencies ...',
                                                    command: 'npm',
                                                    arguments: ['install']
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    name: 'MagnetoCorp Contract',
                                    languages: [
                                        {
                                            type: 'Java',
                                            version: '0.0.1',
                                            workspaceLabel: 'cp-magnetocorp-contract-java',
                                            remote: {
                                                branch: 'master',
                                                path: 'commercial-paper/organization/magnetocorp/contract-java'
                                            }
                                        },
                                        {
                                            type: 'JavaScript',
                                            version: '0.0.1',
                                            workspaceLabel: 'cp-magnetocorp-contract-java',
                                            remote: {
                                                branch: 'master',
                                                path: 'commercial-paper/organization/magnetocorp/contract'
                                            },
                                            onOpen: [
                                                {
                                                    message: 'Installing Node.js dependencies ...',
                                                    command: 'npm',
                                                    arguments: ['install']
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ],
                            applications: [
                                {
                                    name: 'Digibank Application',
                                    type: 'Web',
                                    version: '1.0.0',
                                    language: 'Java',
                                    readme: 'https://github.com/hyperledger/fabric-samples',
                                    workspaceLabel: 'cp-digibank-app-java',
                                    remote: {
                                        branch: 'master',
                                        path: 'commercial-paper/organization/digibank/application-java'
                                    }
                                },
                                {
                                    name: 'Digibank Application',
                                    type: 'Web',
                                    version: '1.0.0',
                                    language: 'JavaScript',
                                    readme: 'https://github.com/hyperledger/fabric-samples',
                                    workspaceLabel: 'cp-digibank-app-javascript',
                                    remote: {
                                        branch: 'master',
                                        path: 'commercial-paper/organization/digibank/application'
                                    },
                                    onOpen: [
                                        {
                                            message: 'Installing Node.js dependencies ...',
                                            command: 'npm',
                                            arguments: ['install']
                                        }
                                    ]
                                },
                                {
                                    name: 'MagnetoCorp Application',
                                    type: 'Web',
                                    version: '1.0.0',
                                    language: 'Java',
                                    readme: 'https://github.com/hyperledger/fabric-samples',
                                    workspaceLabel: 'cp-magnetocorp-contract-java',
                                    remote: {
                                        branch: 'master',
                                        path: 'commercial-paper/organization/magnetocorp/application-java'
                                    }
                                },
                                {
                                    name: 'MagnetoCorp Application',
                                    type: 'Web',
                                    version: '1.0.0',
                                    language: 'JavaScript',
                                    readme: 'https://github.com/hyperledger/fabric-samples',
                                    workspaceLabel: 'cp-magnetocorp-contract-javascript',
                                    remote: {
                                        branch: 'master',
                                        path: 'commercial-paper/organization/magnetocorp/application'
                                    },
                                    onOpen: [
                                        {
                                            message: 'Installing Node.js dependencies ...',
                                            command: 'npm',
                                            arguments: ['install']
                                        }
                                    ]
                                }
                            ]
                        }
                    }
                ]
            }
        ]
    };

    const initialMessage: {path: string, repositoryData: { repositories: any[]} } = {
        path: '/samples',
        repositoryData: repositories
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

        mySandBox.stub(fs, 'readJson').resolves(repositories);

    });

    afterEach(() => {
        mySandBox.restore();
    });

    it('should register and show the sample gallery', async () => {
        createWebviewPanelStub.returns({
            title: 'Sample Gallery',
            webview: {
                postMessage: postMessageStub,
                onDidReceiveMessage: mySandBox.stub()
            },
            reveal: mySandBox.stub(),
            dispose: mySandBox.stub(),
            onDidDispose: mySandBox.stub(),
            onDidChangeViewState: mySandBox.stub()
        });

        const sampleGalleryView: SampleGalleryView = new SampleGalleryView(context);
        await sampleGalleryView.openView(false);
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
                            command: ExtensionCommands.OPEN_SAMPLE_PAGE,
                            data: [
                                'fabric-samples',
                                'FabCar'
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

        executeCommandStub.withArgs(ExtensionCommands.OPEN_SAMPLE_PAGE).resolves();

        const sampleGalleryView: SampleGalleryView = new SampleGalleryView(context);
        await sampleGalleryView.openView(false);
        await Promise.all(onDidReceiveMessagePromises);

        executeCommandStub.should.have.been.calledWith(ExtensionCommands.OPEN_SAMPLE_PAGE, 'fabric-samples', 'FabCar');
    });
});
