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
        const transactionData: {gatewayName: string, smartContract: ISmartContract} = {
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
                transactionData
            }
        });
        dispatchEvent(msg);
        component.state().redirectPath.should.deep.equal('/transaction');
        component.state().transactionData.should.deep.equal(transactionData);
    });

    it('should handle receiving a message with transactionOutput', async () => {
        const transactionOutput: string = 'here is some output from a transaction';
        const component: any = mount(<App/>);
        const msg: MessageEvent = new MessageEvent('message', {
            data: {
                transactionOutput
            }
        });
        dispatchEvent(msg);
        component.state().transactionOutput.should.deep.equal(transactionOutput);
    });
});
