// tslint:disable: no-unused-expression
import React from 'react';
import { mount } from 'enzyme';
import App from '../../src/App';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import ISmartContract from '../../src/interfaces/ISmartContract';
import ITransaction from '../../src/interfaces/ITransaction';
import IOutputObject from '../../src/interfaces/IOutputObject';
import Utils from '../../src/Utils';
chai.should();
chai.use(sinonChai);

describe('App', () => {

    let mySandBox: sinon.SinonSandbox;
    let postToVSCodeStub: sinon.SinonStub;

    const mockTxn: ITransaction = {
        name: 'mockTxn',
        parameters: [{
            description: '',
            name: 'name',
            schema: {}
        }],
        returns: {
            type: ''
        },
        tag: ['submit']
    };

    const greenContract: ISmartContract = {
        name: 'greenContract',
        version: '0.0.1',
        channel: 'mychannel',
        label: 'greenContract@0.0.1',
        transactions: [mockTxn],
        namespace: 'GreenContract'
    };

    const mockState: { gatewayName: string, smartContract: ISmartContract } = {
        gatewayName: 'myGateway',
        smartContract: greenContract
    };

    const mockOutput: IOutputObject = {
        transactionName: 'myTransaction',
        action: 'submitted',
        startTime: '1/7/2020, 9:21:34 AM',
        result: 'SUCCESS',
        endTime: '1/7/2020, 9:21:35 AM',
        args: ['myID'],
        output: 'No output returned from myTransaction'
    };

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
        postToVSCodeStub = mySandBox.stub(Utils, 'postToVSCode').resolves();
    });

    afterEach(async () => {
        mySandBox.restore();
    });

    it('should redirect to the transaction home view', async () => {
        const component: any = mount(<App/>);

        const msg: MessageEvent = new MessageEvent('message', {
            data: {
                path: '/transaction',
                state: mockState
            }
        });
        dispatchEvent(msg);
        component.state().redirectPath.should.equal('/transaction');
    });

    it('should redirect to the transaction create view', async () => {
        const component: any = mount(<App/>);

        const msg: MessageEvent = new MessageEvent('message', {
            data: {
                path: '/transaction/create',
                state: mockState
            }
        });
        dispatchEvent(msg);
        component.state().redirectPath.should.equal('/transaction/create');
    });

    it('does not overwrite state when redirecting to a different page', async () => {
        const component: any = mount(<App/>);

        const msg: MessageEvent = new MessageEvent('message', {
            data: {
                path: '/transaction',
                state: mockState
            }
        });
        dispatchEvent(msg);
        component.state().gatewayName.should.deep.equal(mockState.gatewayName);
        component.state().smartContract.should.deep.equal(mockState.smartContract);

        Utils.changeRoute('/transaction/create');
        component.state().gatewayName.should.deep.equal(mockState.gatewayName);
        component.state().smartContract.should.deep.equal(mockState.smartContract);
    });

    it('attempts to post a message to vscode', async () => {
        const component: any = mount(<App/>);
        component.instance().postMessageHandler('some command', {some: 'data'});
        postToVSCodeStub.should.have.been.calledOnceWithExactly({command: 'some command', data: {some: 'data'}});
    });

    it('posts its state to vscode if no alternate message data is provided', async () => {
        const component: any = mount(<App/>);

        const msg: MessageEvent = new MessageEvent('message', {
            data: {
                path: '/transaction',
                state: mockState
            }
        });
        dispatchEvent(msg);
        component.state().gatewayName.should.deep.equal(mockState.gatewayName);
        component.state().smartContract.should.deep.equal(mockState.smartContract);

        component.instance().postMessageHandler('some command');
        postToVSCodeStub.should.have.been.calledOnceWithExactly({command: 'some command', data: mockState});
    });

    it('handles receiving transaction output from vscode', async () => {
        const component: any = mount (<App/>);

        const msg: MessageEvent = new MessageEvent('message', {
            data: {
                output: mockOutput
            }
        });
        dispatchEvent(msg);
        component.state().transactionOutput.should.deep.equal(mockOutput);
    });
});
