// tslint:disable: no-unused-expression
import React from 'react';
import { mount } from 'enzyme';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import App from '../../src/App';
import ITutorialObject from '../../src/interfaces/ITutorialObject';
import IPackageRegistryEntry from '../../src/interfaces/IPackageRegistryEntry';
import ISmartContract from '../../src/interfaces/ISmartContract';
import IRepositoryObject from '../../src/interfaces/IRepositoryObject';

chai.should();
chai.use(sinonChai);

describe('App', () => {

    let mySandBox: sinon.SinonSandbox;

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
    });

    afterEach(async () => {
        mySandBox.restore();
    });

    it('should redirect to the home page', async () => {
        const component: any = mount(<App />);

        const msg: MessageEvent = new MessageEvent('message', {
            data: {
                path: '/home',
                version: '1.0.0'
            }
        });
        dispatchEvent(msg);
        component.state().redirectPath.should.equal('/home');
        component.state().extensionVersion.should.equal('1.0.0');
    });

    it('should redirect to the fabric 2 page', async () => {
        const component: any = mount(<App />);

        const msg: MessageEvent = new MessageEvent('message', {
            data: {
                path: '/fabric2'
            }
        });
        dispatchEvent(msg);
        component.state().redirectPath.should.equal('/fabric2');
    });

    it('should redirect to the tutorial gallery page', async () => {
        const tutorials: Array<{ name: string, tutorials: ITutorialObject[] }> = [
            {
                name: 'Basic tutorials',
                tutorials: [
                    {
                        title: 'a1',
                        series: 'Basic tutorials',
                        length: '4 weeks',
                        objectives: [
                            'objective 1',
                            'objective 2',
                            'objective 3'
                        ],
                        file: 'some/file/path'
                    }
                ]
            },
            {
                name: 'Other tutorials',
                tutorials: [
                    {
                        title: 'something really interesting',
                        series: 'Other tutorials',
                        length: '10 minutes',
                        objectives: [
                            'objective 1',
                            'objective 2',
                            'objective 3'
                        ],
                        file: 'another/file/path'
                    }
                ]
            }
        ];

        const component: any = mount(<App />);

        const msg: MessageEvent = new MessageEvent('message', {
            data: {
                path: '/tutorials',
                tutorialData: {
                    tutorials,
                }
            }
        });
        dispatchEvent(msg);
        component.state().redirectPath.should.equal('/tutorials');
        component.state().tutorialData.should.equal(tutorials);
    });

    it('should redirect to the sample gallery page', async () => {
        const repositories: { repositories: IRepositoryObject[] } = {
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

        const component: any = mount(<App />);

        const msg: MessageEvent = new MessageEvent('message', {
            data: {
                path: '/samples',
                repositoryData: repositories
            }
        });
        dispatchEvent(msg);
        component.state().redirectPath.should.equal('/samples');
        component.state().repositoryData.should.equal(repositories);
    });

    it('should redirect to the tutorial page', async () => {
        const tutorial: ITutorialObject = {
            title: 'a1',
            series: 'Basic tutorials',
            length: '4 weeks',
            objectives: [
                'objective 1',
                'objective 2',
                'objective 3'
            ],
            file: 'some/file/path'
        };

        const tutorials: Array<{ name: string, tutorials: ITutorialObject[] }> = [
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
                        series: 'Other tutorials',
                        length: '10 minutes',
                        objectives: [
                            'objective 1',
                            'objective 2',
                            'objective 3'
                        ],
                        file: 'another/file/path'
                    }
                ]
            }
        ];

        const component: any = mount(<App />);

        const msg: MessageEvent = new MessageEvent('message', {
            data: {
                path: '/viewTutorial',
                tutorialData: {
                    tutorials,
                    activeTutorial: tutorial,
                }
            }
        });
        dispatchEvent(msg);
        component.state().redirectPath.should.equal('/viewTutorial');
        component.state().tutorialData.should.equal(tutorials);
        component.state().activeTutorial.should.equal(tutorial);
    });

    it('should redirect to the deploy page', async () => {
        const component: any = mount(<App />);
        const deployData: { channelName: string, environmentName: string, packageEntries: IPackageRegistryEntry[], workspaceNames: string[], selectedPackage: IPackageRegistryEntry | undefined, committedDefinitions: string[], environmentPeers: string[], discoveredPeers: string[], orgMap: any, orgApprovals: any } = { channelName: 'mychannel', environmentName: 'myEnvironment', packageEntries: [], workspaceNames: [], selectedPackage: undefined, committedDefinitions: [], environmentPeers: ['Org1Peer1'], discoveredPeers: ['Org2Peer1'], orgMap: { Org1MSP: ['Org1Peer1'], Org2MSP: ['Org2Peer1'] }, orgApprovals: { Org1MSP: true, Org2MSP: false } };
        const msg: MessageEvent = new MessageEvent('message', {
            data: {
                path: '/deploy',
                deployData
            }
        });
        dispatchEvent(msg);
        component.state().redirectPath.should.equal('/deploy');
        component.state().deployData.should.equal(deployData);
    });

    it('should redirect to the transaction page', async () => {
        const transactionViewData: {gatewayName: string, smartContract: ISmartContract} = {
            gatewayName: 'myGateway',
            smartContract: {
                name: 'mySmartContract',
                version: '0.0.1',
                channel: 'myChannel',
                label: 'mySmartContract@0.0.1',
                transactions: [],
                namespace: 'My Smart Contract',
                peerNames: ['peer1', 'peer2']
            }
        };

        const component: any = mount(<App/>);

        const msg: MessageEvent = new MessageEvent('message', {
            data: {
                path: '/transaction',
                transactionViewData
            }
        });
        dispatchEvent(msg);
        component.state().redirectPath.should.deep.equal('/transaction');
        component.state().transactionViewData.should.deep.equal(transactionViewData);
    });

    it('should handle receiving a message with transactionOutput', async () => {
        const transactionOutput: string = 'here is some output from a transaction';
        const component: any = mount(<App/>);
        const msg: MessageEvent = new MessageEvent('message', {
            data: {
                transactionOutput,
            }
        });
        dispatchEvent(msg);
        component.state().transactionOutput.should.deep.equal(transactionOutput);
    });
});
