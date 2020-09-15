// tslint:disable: no-unused-expression
import React from 'react';
import { mount } from 'enzyme';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import App from '../../src/App';
import ITutorialObject from '../../src/interfaces/ITutorialObject';
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
        const component: any = mount(<App/>);

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

    it('should redirect to the tutorial page', async () => {
        const tutorialData: Array<{name: string, tutorials: ITutorialObject[]}> = [
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

        const component: any = mount(<App/>);

        const msg: MessageEvent = new MessageEvent('message', {
            data: {
                path: '/tutorials',
                tutorialData
            }
        });
        dispatchEvent(msg);
        component.state().redirectPath.should.equal('/tutorials');
        component.state().tutorialData.should.equal(tutorialData);
    });

    it('should redirect to the transaction page', async () => {
        const data: {gatewayName: string, smartContract: ISmartContract} = {
            gatewayName: 'myGateway',
            smartContract: {
                name: 'mySmartContract',
                version: '0.0.1',
                channel: 'myChannel',
                label: 'mySmartContract@0.0.1',
                transactions: [],
                namespace: 'My Smart Contract'
            }
        };

        const component: any = mount(<App/>);

        const msg: MessageEvent = new MessageEvent('message', {
            data: {
                path: '/transaction',
                ...data
            }
        });
        dispatchEvent(msg);
        component.state().redirectPath.should.deep.equal('/transaction');
        component.state().gatewayName.should.deep.equal(data.gatewayName);
        component.state().smartContract.should.deep.equal(data.smartContract);
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
