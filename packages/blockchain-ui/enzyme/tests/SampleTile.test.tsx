import React from 'react';
import renderer from 'react-test-renderer';
import { mount, ReactWrapper } from 'enzyme';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import Utils from '../../src/Utils';
import { ExtensionCommands } from '../../src/ExtensionCommands';
import ISampleObject from '../../src/interfaces/ISampleObject';
import SampleTile from '../../src/components/elements/SampleTile/SampleTile';
import { CheckmarkOutline16, MisuseOutline16 } from '@carbon/icons-react';

chai.should();
chai.use(sinonChai);

// tslint:disable no-unused-expression
interface IProps {
    sampleObject: ISampleObject;
    repositoryName: string;
}

describe('SampleTile component', () => {
    let mySandBox: sinon.SinonSandbox;
    let postToVSCodeStub: sinon.SinonStub;

    beforeEach(() => {
        mySandBox = sinon.createSandbox();
        postToVSCodeStub = mySandBox.stub(Utils, 'postToVSCode').resolves();
    });

    afterEach(() => {
        mySandBox.restore();
    });

    const sampleObject: ISampleObject = {
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
    };

    it('should render the expected snapshot', () => {
        const component: any = renderer
            .create(<SampleTile sampleObject={sampleObject} repositoryName='fabric-samples'/>)
            .toJSON();
        expect(component).toMatchSnapshot();
    });

    it(`should post a message to VS Code when the 'Open sample' button is clicked`, () => {
        const component: ReactWrapper<IProps> = mount(<SampleTile sampleObject={sampleObject} repositoryName='fabric-samples'/>);
        component.find('button').at(0).simulate('click');
        postToVSCodeStub.should.have.been.calledOnceWithExactly({
            command: ExtensionCommands.OPEN_SAMPLE_PAGE,
            data: [
                'fabric-samples',
                sampleObject.name
            ]
        });
        component.find('button').at(0).hasClass('bx--btn--primary').should.equal(true);
    });

    it(`should display to user that no smart contract exist`, () => {
        const noContractObject: ISampleObject = {
            name: 'FabCar',
            description: 'Basic sample based on cars: the "hello world" of Hyperledger Fabric samples.',
            readme: 'https://raw.githubusercontent.com/hyperledger/fabric-samples/master/README.md',
            category: {
                contracts: [],
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
        };

        const component: ReactWrapper<IProps> = mount(<SampleTile sampleObject={noContractObject} repositoryName='fabric-samples'/>);
        component.find('.badge-container').at(0).find(CheckmarkOutline16).length.should.equal(0);
        component.find('.badge-container').at(0).find(MisuseOutline16).length.should.equal(1);

        component.find('.badge-container').at(1).find(CheckmarkOutline16).length.should.equal(1);
        component.find('.badge-container').at(1).find(MisuseOutline16).length.should.equal(0);
    });

    it(`should display to user that no applications exist`, () => {
        const noApplicationObject: ISampleObject = {
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
                applications: []
            }
        };

        const component: ReactWrapper<IProps> = mount(<SampleTile sampleObject={noApplicationObject} repositoryName='fabric-samples'/>);
        component.find('.badge-container').at(0).find(CheckmarkOutline16).length.should.equal(1);
        component.find('.badge-container').at(0).find(MisuseOutline16).length.should.equal(0);

        component.find('.badge-container').at(1).find(CheckmarkOutline16).length.should.equal(0);
        component.find('.badge-container').at(1).find(MisuseOutline16).length.should.equal(1);
    });

});
