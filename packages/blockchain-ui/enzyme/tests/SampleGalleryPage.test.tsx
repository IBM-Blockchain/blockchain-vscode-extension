import React from 'react';
import renderer from 'react-test-renderer';
import chai from 'chai';
import sinonChai from 'sinon-chai';

import IRepositoryObject from '../../src/interfaces/IRepositoryObject';
import SampleGalleryPage from '../../src/components/pages/SampleGalleryPage/SampleGalleryPage';

chai.should();
chai.use(sinonChai);

describe('SamppleGalleryPage component', () => {

    const repositoryData: {repositories: IRepositoryObject[]} = {
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

    it('should render the expected snapshot', () => {
        const component: any = renderer
            .create(<SampleGalleryPage repositoryData={repositoryData}/>)
            .toJSON();
        expect(component).toMatchSnapshot();
    });
});
